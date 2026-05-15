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
  Sparkles, Video, BookOpen, ExternalLink, Music,
  CheckCircle2, AlertCircle, Wand2, Smile,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDuration } from "@/lib/utils";
import { LearnDialog } from "@/components/learning/learn-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  project: { title: string } | null;
}


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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLearnDialog, setShowLearnDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showCharDialog, setShowCharDialog] = useState(false);
  const [charSubject, setCharSubject] = useState("");
  const [charExpression, setCharExpression] = useState("");
  const [charBackground, setCharBackground] = useState("");
  const [charDetails, setCharDetails] = useState("");
  const [charGenerating, setCharGenerating] = useState(false);
  const [charResult, setCharResult] = useState<{ prompt: string; imageId: string } | null>(null);
  const [charError, setCharError] = useState("");
  const [charImaging, setCharImaging] = useState(false);
  const [charImages, setCharImages] = useState<Array<{ id: string; title: string; status: string; imageUrl: string | null; prompt: string }>>([]);

  const loadCharImages = useCallback(async (scriptId: string) => {
    const res = await fetch(`/api/images?scriptId=${scriptId}`);
    if (!res.ok) return;
    const all = await res.json() as Array<{ id: string; title: string; status: string; imageUrl: string | null; prompt: string; style: string | null }>;
    setCharImages(all.filter((img) => img.style === "disney"));
  }, []);

  const handleOpenCharDialog = () => {
    if (!script) return;
    setCharSubject(script.topic);
    setCharExpression("");
    setCharBackground("");
    setCharDetails("");
    setCharResult(null);
    setCharError("");
    setShowCharDialog(true);
  };

  const handleGenerateCharPrompt = async () => {
    if (!script || !charSubject.trim()) return;
    setCharGenerating(true);
    setCharError("");
    setCharResult(null);
    try {
      const res = await fetch("/api/images/character-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: charSubject,
          expression: charExpression || undefined,
          background: charBackground || undefined,
          details: charDetails || undefined,
          scriptId: id,
          title: `${script.title} - キャラクター`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "プロンプト生成に失敗しました");
      }
      const data = await res.json();
      setCharResult({ prompt: data.prompt, imageId: data.image.id });
    } catch (e) {
      setCharError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setCharGenerating(false);
    }
  };

  const handleGenerateCharImage = async () => {
    if (!charResult) return;
    setCharImaging(true);
    setCharError("");
    try {
      const res = await fetch(`/api/images/${charResult.imageId}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "画像生成に失敗しました");
      }
      await loadCharImages(id);
      setShowCharDialog(false);
      setCharResult(null);
    } catch (e) {
      setCharError(e instanceof Error ? e.message : "画像生成に失敗しました");
    } finally {
      setCharImaging(false);
    }
  };

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
    loadCharImages(id);
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
                <Button variant="outline" size="sm" onClick={handleOpenCharDialog} className="text-pink-600 border-pink-200 hover:bg-pink-50">
                  <Smile size={14} /> キャラ画像を生成
                </Button>
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

              <Card>
                <CardContent className="p-3 space-y-2">
                  <Button
                    variant="outline" size="sm" className="w-full text-pink-600 border-pink-200 hover:bg-pink-50"
                    onClick={handleOpenCharDialog}
                  >
                    <Smile size={13} /> キャラ画像を生成
                  </Button>
                  <Button
                    variant="outline" size="sm" className="w-full"
                    onClick={() => router.push(`/images?scriptId=${id}`)}
                  >
                    <ImageIcon size={13} /> 画像を管理
                  </Button>
                  <Button
                    variant="outline" size="sm" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => router.push(`/audio?scriptId=${id}`)}
                  >
                    <Music size={13} /> 音声を管理
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
                      return (
                        <div key={scene.id} className="flex gap-3 p-3 rounded-lg border transition-colors bg-gray-50 border-gray-100">
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
          {/* キャラクター画像 */}
          {charImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600">
                  <Smile size={16} />ディズニー風キャラクター画像
                  <Badge className="bg-pink-50 text-pink-600">{charImages.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {charImages.map((img) => (
                    <div key={img.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="aspect-[9/16] max-h-40 bg-gray-100 relative">
                        {img.imageUrl ? (
                          <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {img.status === "generating"
                              ? <Loader2 size={20} className="animate-spin text-gray-400" />
                              : <Smile size={20} className="text-gray-300" />}
                          </div>
                        )}
                        {img.imageUrl && (
                          <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute top-1 right-1 p-1 bg-white/80 rounded">
                            <ExternalLink size={10} className="text-gray-500" />
                          </a>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500 line-clamp-2">{img.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full text-pink-600 border-pink-200" onClick={() => router.push(`/images?scriptId=${id}`)}>
                  <ImageIcon size={13} /> すべての画像を管理
                </Button>
              </CardContent>
            </Card>
          )}
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

      {/* キャラクター画像生成ダイアログ */}
      <Dialog open={showCharDialog} onOpenChange={setShowCharDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pink-600">
              <Smile size={16} /> ディズニー風キャラクター画像を生成
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">主題 <span className="text-red-400">*</span></Label>
              <Input
                value={charSubject}
                onChange={(e) => setCharSubject(e.target.value)}
                placeholder="例: 枕カバー、スマートフォン、コーヒーカップ..."
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">キャラクター化したいモノを入力してください</p>
            </div>
            <div>
              <Label className="text-xs font-medium">表情</Label>
              <Input
                value={charExpression}
                onChange={(e) => setCharExpression(e.target.value)}
                placeholder="例: 笑顔、驚き、ウィンク、困り顔..."
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">背景</Label>
              <Input
                value={charBackground}
                onChange={(e) => setCharBackground(e.target.value)}
                placeholder="例: 白背景、パステルグラデーション、夜空、森..."
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">その他の指定（任意）</Label>
              <Input
                value={charDetails}
                onChange={(e) => setCharDetails(e.target.value)}
                placeholder="例: 星のアクセサリー、キラキラした光..."
                className="mt-1 text-sm"
              />
            </div>
            {charResult && (
              <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                <p className="text-xs font-medium text-pink-700 mb-1">生成されたプロンプト</p>
                <p className="text-xs text-gray-600 leading-relaxed">{charResult.prompt}</p>
                <button
                  className="text-xs text-pink-500 mt-2 underline hover:text-pink-700"
                  onClick={() => setCharResult(null)}
                >
                  やり直す
                </button>
              </div>
            )}
            {charError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />{charError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCharDialog(false)}>キャンセル</Button>
            {!charResult ? (
              <Button
                onClick={handleGenerateCharPrompt}
                disabled={charGenerating || !charSubject.trim()}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {charGenerating
                  ? <><Loader2 size={14} className="animate-spin" /> 生成中...</>
                  : <><Sparkles size={14} /> プロンプトを生成</>
                }
              </Button>
            ) : (
              <Button
                onClick={handleGenerateCharImage}
                disabled={charImaging}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {charImaging
                  ? <><Loader2 size={14} className="animate-spin" /> 画像生成中...</>
                  : <><ImageIcon size={14} /> 画像を生成</>
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
