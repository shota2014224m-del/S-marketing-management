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
  ArrowLeft,
  Save,
  Clock,
  Hash,
  Layers,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDuration } from "@/lib/utils";

interface Scene {
  id: string;
  order: number;
  text: string;
  visualNote: string | null;
  duration: number | null;
}

interface Script {
  id: string;
  title: string;
  topic: string;
  hook: string | null;
  body: string | null;
  callToAction: string | null;
  hashtags: string | null;
  duration: number | null;
  status: string;
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
  const [expandedScenes, setExpandedScenes] = useState(true);
  const [form, setForm] = useState<Partial<Script>>({});

  const fetchScript = useCallback(async () => {
    const res = await fetch(`/api/scripts/${id}`);
    const data = await res.json();
    setScript(data);
    setForm(data);
  }, [id]);

  useEffect(() => { fetchScript(); }, [fetchScript]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/scripts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(false);
    fetchScript();
  };

  if (!script) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

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
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(script); }}>キャンセル</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  保存
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>編集</Button>
            )}
          </div>
        }
      />
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Meta */}
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">ステータス</p>
                  {editing ? (
                    <Select value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-8 text-xs">
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
                    <Input type="number" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className="h-8 text-xs" placeholder="秒数" />
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
              {/* Hook */}
              <Card>
                <CardHeader><CardTitle className="text-sm text-orange-600">フック（冒頭3秒）</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.hook || ""} onChange={(e) => setForm({ ...form, hook: e.target.value })} placeholder="視聴者を引きつけるフック" rows={2} />
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{script.hook || "未設定"}</p>
                  )}
                </CardContent>
              </Card>

              {/* Body */}
              <Card>
                <CardHeader><CardTitle className="text-sm">メイン台本</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="メインの台本テキスト" rows={10} />
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{script.body || "未設定"}</p>
                  )}
                </CardContent>
              </Card>

              {/* CTA */}
              <Card>
                <CardHeader><CardTitle className="text-sm text-indigo-600">CTA（行動喚起）</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.callToAction || ""} onChange={(e) => setForm({ ...form, callToAction: e.target.value })} placeholder="フォロー・いいね・コメント誘導" rows={2} />
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
                    <Textarea value={form.hashtags || ""} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#tag1 #tag2 ..." rows={4} />
                  ) : (
                    <p className="text-sm text-indigo-500 leading-relaxed">{script.hashtags || "未設定"}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-1"><ImageIcon size={14} />画像生成のヒント</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-500 mb-3">各シーンのビジュアルノートを元に画像生成ページで作業できます。</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/images?scriptId=${id}`)}>
                    <ImageIcon size={14} /> 画像管理へ
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
                <Button variant="ghost" size="sm" onClick={() => setExpandedScenes(!expandedScenes)}>
                  {expandedScenes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </div>
            </CardHeader>
            {expandedScenes && (
              <CardContent className="pt-0">
                {script.scenes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">シーンがありません</p>
                ) : (
                  <div className="space-y-3">
                    {script.scenes.map((scene) => (
                      <div key={scene.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {scene.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-relaxed">{scene.text}</p>
                          {scene.visualNote && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <ImageIcon size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-400 italic">{scene.visualNote}</p>
                            </div>
                          )}
                          {scene.duration && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Clock size={10} />{formatDuration(scene.duration)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
