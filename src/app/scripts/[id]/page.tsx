"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Save, Clock, Hash, Layers, ImageIcon,
  ChevronDown, ChevronUp, Loader2, Copy, Check,
  Sparkles, Video, BookOpen, Plus, ExternalLink,
  CheckCircle2, AlertCircle, RefreshCw, Wand2,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDuration } from "@/lib/utils";
import { LearnDialog } from "@/components/learning/learn-dialog";

interface ImageAsset {
  id: string;
  sceneId: string | null;
  status: string;
  imageUrl: string | null;
  title: string;
}

interface Scene {
  id: string;
  order: number;
  text: string;
  visualNote: string | null;
  duration: number | null;
}

interface ScriptFields {
  title: string;
  topic: string;
  hook: string | null;
  body: string | null;
  callToAction: string | null;
  hashtags: string | null;
  duration: number | null;
  status: string;
}

interface Script extends ScriptFields {
  id: string;
  aiModel: string | null;
  scenes: Scene[];
  imageAssets: ImageAsset[];
  project: { title: string } | null;
}

const IMAGE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ size: number; className?: string }> }> = {
  pending:    { label: "待機中",   color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200",   icon: Clock },
  generating: { label: "生成中",   color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",       icon: Loader2 },
  completed:  { label: "完了",     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  failed:     { label: "失敗",     color: "text-red-500",    bg: "bg-red-50 border-red-200",          icon: AlertCircle },
};

export default function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [script, setScript] = useState<Script | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedScenes, setExpandedScenes] = useState(true);
  const [form, setForm] = useState<ScriptFields>({ title: "", topic: "", hook: "", body: "", callToAction: "", hashtags: "", duration: null, status: "draft" });
  const [editedScenes, setEditedScenes] = useState<Scene[]>([]);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [addingSceneId, setAddingSceneId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLearnDialog, setShowLearnDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadScript = async (scriptId: string) => {
    const res = await fetch(`/api/scripts/${scriptId}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<Script>;
  };

  useEffect(() => {
    loadScript(id).then((data) => {
      if (!data) return;
      setScript(data);
      setForm({ title: data.title, topic: data.topic, hook: data.hook, body: data.body, callToAction: data.callToAction, hashtags: data.hashtags, duration: data.duration, status: data.status });
      setEditedScenes(data.scenes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = () => {
    if (!script) return;
    setEditedScenes([...script.scenes]);
    setSaveError("");
    setEditing(true);
  };

  const handleCancel = () => {
    if (!script) return;
    setForm({ title: script.title, topic: script.topic, hook: script.hook, body: script.body, callToAction: script.callToAction, hashtags: script.hashtags, duration: script.duration, status: script.status });
    setEditedScenes([...script.scenes]);
    setSaveError("");
    setEditing(false);
  };

  const handleSave = async () => {
    console.log("[handleSave] called, id=", id, "form=", form);
    setSaving(true);
    setSaveError("");
    try {
      const patchRes = await fetch(`/api/scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, topic: form.topic, hook: form.hook, body: form.body,
          callToAction: form.callToAction, hashtags: form.hashtags,
          duration: form.duration, status: form.status,
          scenes: editedScenes,
        }),
      });
      console.log("[handleSave] PATCH response status=", patchRes.status);
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        throw new Error(err?.error || `保存に失敗しました (${patchRes.status})`);
      }
      const saved: Script = await patchRes.json();
      console.log("[handleSave] save succeeded, title=", saved.title);
      setScript(saved);
      setForm({ title: saved.title, topic: saved.topic, hook: saved.hook, body: saved.body, callToAction: saved.callToAction, hashtags: saved.hashtags, duration: saved.duration, status: saved.status });
      setEditedScenes(saved.scenes);
      setSaveError("");
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      console.error("[handleSave] error:", e);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateScenes = async () => {
    if (!confirm("AIがスクリプト本文を解析してシーンを再生成します。既存のシーン割り当てはリセットされます。続けますか？")) return;
    setRegenerating(true);
    setRegenError("");
    try {
      const res = await fetch(`/api/scripts/${id}/regenerate-scenes`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "再生成に失敗しました");
      }
      const data: Script = await res.json();
      setScript(data);
      setForm({ title: data.title, topic: data.topic, hook: data.hook, body: data.body, callToAction: data.callToAction, hashtags: data.hashtags, duration: data.duration, status: data.status });
      setEditedScenes(data.scenes);
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : "再生成に失敗しました");
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddSceneImage = async (scene: Scene) => {
    if (!script || !scene.visualNote) return;
    setAddingSceneId(scene.id);
    await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scriptId: id,
        sceneId: scene.id,
        title: `${script.title} - シーン${scene.order}`,
        prompt: scene.visualNote,
        service: "dall-e-3",
        status: "pending",
        aspectRatio: "9:16",
      }),
    });
    setAddingSceneId(null);
    loadScript(id).then((data) => { if (data) { setScript(data); setEditedScenes(data.scenes); } });
  };

  const handleBulkAddImages = async () => {
    if (!script) return;
    const registeredSceneIds = new Set(script.imageAssets.map((a) => a.sceneId));
    const targets = script.scenes.filter((s) => s.visualNote && !registeredSceneIds.has(s.id));
    if (targets.length === 0) { alert("すべてのシーンに画像ジョブが登録済みです"); return; }
    setBulkAdding(true);
    await Promise.all(
      targets.map((scene) =>
        fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptId: id,
            sceneId: scene.id,
            title: `${script.title} - シーン${scene.order}`,
            prompt: scene.visualNote,
            service: "dall-e-3",
            status: "pending",
            aspectRatio: "9:16",
          }),
        })
      )
    );
    setBulkAdding(false);
    loadScript(id).then((data) => { if (data) { setScript(data); setEditedScenes(data.scenes); } });
  };

  const handleCopy = async (sceneId: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(sceneId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateScene = (sceneId: string, field: keyof Scene, value: string | number | null) => {
    setEditedScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, [field]: value } : s));
  };

  if (!script) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const imageByScene = new Map<string, ImageAsset>();
  for (const img of script.imageAssets) {
    if (img.sceneId) imageByScene.set(img.sceneId, img);
  }

  const scenesWithNote = script.scenes.filter((s) => s.visualNote);
  const registeredCount = scenesWithNote.filter((s) => imageByScene.has(s.id)).length;
  const completedCount = script.imageAssets.filter((a) => a.status === "completed").length;
  const pendingCount = script.imageAssets.filter((a) => a.status === "pending").length;
  const unregistered = scenesWithNote.filter((s) => !imageByScene.has(s.id)).length;

  // In edit mode, work with editedScenes; in view mode, work with script.scenes
  const displayScenes = editing ? editedScenes : script.scenes;

  return (
    <div className="flex-1">
      <Header
        title={script.title}
        description={script.project?.title}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/scripts")}>
              <ArrowLeft size={14} /> 一覧に戻る
            </Button>
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>キャンセル</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "保存中..." : "保存"}
                </Button>
              </>
            ) : (
              <>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 size={13} /> 保存しました
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowLearnDialog(true)}>
                  <BookOpen size={14} /> 学習する
                </Button>
                <Button size="sm" onClick={handleEdit}>編集</Button>
              </>
            )}
          </div>
        }
      />
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {saveError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle size={14} />{saveError}
            </div>
          )}

          {/* Meta */}
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">ステータス</p>
                  {editing ? (
                    <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-8 text-xs">
                      <option value="draft">下書き</option>
                      <option value="approved">承認済み</option>
                      <option value="in_production">制作中</option>
                      <option value="completed">完成</option>
                    </Select>
                  ) : (
                    <Badge className={STATUS_COLORS[script.status]}>{STATUS_LABELS[script.status]}</Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1"><Clock size={11} />動画尺</p>
                  {editing ? (
                    <Input type="number" value={form.duration ?? ""} onChange={(e) => setForm({ ...form, duration: e.target.value ? Number(e.target.value) : null })} className="h-8 text-xs" placeholder="秒数" />
                  ) : (
                    <p className="text-sm font-medium">{script.duration ? formatDuration(script.duration) : "未設定"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1"><Layers size={11} />シーン数</p>
                  <p className="text-sm font-medium">{script.scenes.length}シーン</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">AIモデル</p>
                  <p className="text-sm font-medium text-gray-600">{script.aiModel || "手動作成"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              {editing && (
                <div>
                  <Label className="text-xs text-gray-500">タイトル</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
                </div>
              )}

              <Card>
                <CardHeader><CardTitle className="text-sm text-orange-600">フック（冒頭3秒）</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.hook ?? ""} onChange={(e) => setForm({ ...form, hook: e.target.value })} placeholder="視聴者を引きつけるフック" rows={2} />
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{script.hook || "未設定"}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">メイン台本</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="メインの台本テキスト" rows={10} />
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{script.body || "未設定"}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm text-indigo-600">CTA（行動喚起）</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.callToAction ?? ""} onChange={(e) => setForm({ ...form, callToAction: e.target.value })} placeholder="フォロー・いいね・コメント誘導" rows={2} />
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{script.callToAction || "未設定"}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-1"><Hash size={14} />ハッシュタグ</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.hashtags ?? ""} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#tag1 #tag2 ..." rows={4} />
                  ) : (
                    <p className="text-sm text-indigo-500 leading-relaxed">{script.hashtags || "未設定"}</p>
                  )}
                </CardContent>
              </Card>

              {/* 画像生成進捗カード */}
              <Card className="border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <ImageIcon size={14} />画像生成の進捗
                    </span>
                    <button onClick={() => loadScript(id).then((data) => { if (data) { setScript(data); setEditedScenes(data.scenes); } })} className="text-gray-400 hover:text-gray-600">
                      <RefreshCw size={12} />
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>登録済み</span>
                      <span className="font-medium">{registeredCount} / {scenesWithNote.length} シーン</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-400 transition-all"
                        style={{ width: scenesWithNote.length > 0 ? `${(registeredCount / scenesWithNote.length) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>

                  {script.imageAssets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pendingCount > 0 && <Badge className="bg-yellow-50 text-yellow-700 text-xs">待機中 {pendingCount}</Badge>}
                      {script.imageAssets.filter((a) => a.status === "generating").length > 0 && (
                        <Badge className="bg-blue-50 text-blue-700 text-xs">生成中 {script.imageAssets.filter((a) => a.status === "generating").length}</Badge>
                      )}
                      {completedCount > 0 && <Badge className="bg-emerald-50 text-emerald-700 text-xs">完了 {completedCount}</Badge>}
                      {script.imageAssets.filter((a) => a.status === "failed").length > 0 && (
                        <Badge className="bg-red-50 text-red-700 text-xs">失敗 {script.imageAssets.filter((a) => a.status === "failed").length}</Badge>
                      )}
                    </div>
                  )}

                  {unregistered > 0 ? (
                    <Button size="sm" className="w-full" onClick={handleBulkAddImages} disabled={bulkAdding}>
                      {bulkAdding
                        ? <><Loader2 size={13} className="animate-spin" /> 追加中...</>
                        : <><Sparkles size={13} /> 未登録 {unregistered}シーンを一括追加</>
                      }
                    </Button>
                  ) : scenesWithNote.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 justify-center py-1">
                      <CheckCircle2 size={12} /> すべてのシーンに登録済み
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center">ビジュアルノートがあるシーンがありません</p>
                  )}

                  <Button
                    variant="outline" size="sm" className="w-full"
                    onClick={() => router.push(`/images?scriptId=${id}`)}
                  >
                    <ImageIcon size={13} /> このスクリプトの画像を管理
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="w-full text-purple-600 hover:bg-purple-50"
                    onClick={() => router.push(`/videos?scriptId=${id}`)}
                  >
                    <Video size={13} /> 動画管理へ
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Scenes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers size={16} />シーン構成
                  <Badge className="bg-gray-100 text-gray-600">{script.scenes.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={handleRegenerateScenes}
                    disabled={regenerating}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    {regenerating
                      ? <><Loader2 size={13} className="animate-spin" /> 再生成中...</>
                      : <><Wand2 size={13} /> AIでシーン再生成</>
                    }
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setExpandedScenes(!expandedScenes)}>
                    {expandedScenes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
              </div>
              {regenError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />{regenError}
                </p>
              )}
            </CardHeader>
            {expandedScenes && (
              <CardContent className="pt-0">
                {displayScenes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">シーンがありません</p>
                ) : (
                  <div className="space-y-3">
                    {displayScenes.map((scene) => {
                      const img = imageByScene.get(scene.id);
                      const imgCfg = img ? IMAGE_STATUS_CONFIG[img.status] : null;
                      const ImgIcon = imgCfg?.icon;
                      return (
                        <div key={scene.id} className={`flex gap-3 p-3 rounded-lg border transition-colors ${img ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}>
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {scene.order}
                          </div>
                          <div className="flex-1 min-w-0">
                            {editing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={scene.text}
                                  onChange={(e) => updateScene(scene.id, "text", e.target.value)}
                                  placeholder="シーンのセリフ・ナレーション"
                                  rows={2}
                                  className="text-sm"
                                />
                                <div className="relative">
                                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={10} />ビジュアルノート（英語）</p>
                                  <Textarea
                                    value={scene.visualNote ?? ""}
                                    onChange={(e) => updateScene(scene.id, "visualNote", e.target.value || null)}
                                    placeholder="Photorealistic shot of..."
                                    rows={2}
                                    className="text-xs text-gray-600"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={scene.duration ?? ""}
                                    onChange={(e) => updateScene(scene.id, "duration", e.target.value ? Number(e.target.value) : null)}
                                    placeholder="秒数"
                                    className="h-7 w-20 text-xs"
                                  />
                                  <span className="text-xs text-gray-400">秒</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-800 leading-relaxed">{scene.text}</p>

                                {scene.visualNote && (
                                  <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                        <ImageIcon size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-gray-500 italic leading-relaxed">{scene.visualNote}</p>
                                      </div>
                                      <button
                                        onClick={() => handleCopy(scene.id, scene.visualNote!)}
                                        className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                                        title="プロンプトをコピー"
                                      >
                                        {copiedId === scene.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {img && imgCfg && ImgIcon ? (
                                  <div className={`mt-2 flex items-center justify-between px-2 py-1.5 rounded border text-xs ${imgCfg.bg}`}>
                                    <span className={`flex items-center gap-1 font-medium ${imgCfg.color}`}>
                                      <ImgIcon size={11} className={img.status === "generating" ? "animate-spin" : ""} />
                                      画像 {imgCfg.label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {img.imageUrl && (
                                        <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                          <ExternalLink size={11} />
                                        </a>
                                      )}
                                      <button
                                        className="text-gray-400 hover:text-indigo-600"
                                        onClick={() => router.push(`/images?scriptId=${id}`)}
                                        title="画像ページで管理"
                                      >
                                        <ImageIcon size={11} />
                                      </button>
                                    </div>
                                  </div>
                                ) : scene.visualNote ? (
                                  <button
                                    className="mt-2 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                    onClick={() => handleAddSceneImage(scene)}
                                    disabled={addingSceneId === scene.id}
                                  >
                                    {addingSceneId === scene.id
                                      ? <Loader2 size={11} className="animate-spin" />
                                      : <Plus size={11} />
                                    }
                                    画像ジョブを追加
                                  </button>
                                ) : null}

                                {scene.duration && (
                                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <Clock size={10} />{formatDuration(scene.duration)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </main>

      {script && (
        <LearnDialog
          open={showLearnDialog}
          onOpenChange={setShowLearnDialog}
          defaults={{
            type: "script",
            title: script.title,
            topic: script.topic,
            hook: script.hook ?? "",
            outputSample: script.body ? script.body.slice(0, 300) : "",
            sourceId: script.id,
          }}
        />
      )}
    </div>
  );
}
