"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, ImageIcon, Loader2, ExternalLink, Trash2,
  Clock, CheckCircle2, AlertCircle, RotateCcw, BookOpen, X, FileText,
  Upload, Sparkles,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from "@/lib/utils";
import { LearnDialog, LearnPayload } from "@/components/learning/learn-dialog";

interface ImageAsset {
  id: string;
  scriptId: string | null;
  title: string;
  prompt: string;
  negativePrompt: string | null;
  service: string;
  status: string;
  imageUrl: string | null;
  style: string | null;
  aspectRatio: string | null;
  notes: string | null;
  createdAt: string;
  script: { title: string } | null;
  scene: { order: number; text: string } | null;
}

interface Script {
  id: string;
  title: string;
  scenes: { id: string; order: number; text: string; visualNote: string | null }[];
}

const SERVICE_LABELS: Record<string, string> = {
  "dall-e-3": "DALL-E 3",
  "stable-diffusion": "Stable Diffusion",
  "midjourney": "Midjourney",
  "adobe-firefly": "Adobe Firefly",
  "other": "その他",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={12} />,
  generating: <Loader2 size={12} className="animate-spin" />,
  completed: <CheckCircle2 size={12} />,
  failed: <AlertCircle size={12} />,
};

function ImagesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scriptIdParam = searchParams.get("scriptId") ?? "";

  const [images, setImages] = useState<ImageAsset[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [scriptIdFilter, setScriptIdFilter] = useState(scriptIdParam);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [learnTarget, setLearnTarget] = useState<LearnPayload | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const [form, setForm] = useState({
    title: "", prompt: "", negativePrompt: "", service: "dall-e-3",
    status: "pending", imageUrl: "", style: "", aspectRatio: "9:16",
    notes: "", scriptId: scriptIdParam, sceneId: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const imgUrl = scriptIdFilter ? `/api/images?scriptId=${encodeURIComponent(scriptIdFilter)}` : "/api/images";
      const [imgRes, scriptRes] = await Promise.all([fetch(imgUrl), fetch("/api/scripts")]);
      if (imgRes.ok) setImages(await imgRes.json());
      if (scriptRes.ok) setScripts(await scriptRes.json());
    } catch (e) {
      console.error("[fetchData images]", e);
    } finally {
      setLoading(false);
    }
  }, [scriptIdFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedScript = scripts.find((s) => s.id === form.scriptId);

  const handleCreate = async () => {
    if (!form.title || !form.prompt) return;
    await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scriptId: form.scriptId || null, sceneId: form.sceneId || null }),
    });
    setShowDialog(false);
    setForm({ title: "", prompt: "", negativePrompt: "", service: "dall-e-3", status: "pending", imageUrl: "", style: "", aspectRatio: "9:16", notes: "", scriptId: "", sceneId: "" });
    fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この画像アセットを削除しますか？")) return;
    await fetch(`/api/images/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleUpload = async (id: string, file: File) => {
    setUploadingId(id);
    setActionError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/images/${id}/upload`, { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setActionError({ id, msg: err.error || "アップロードに失敗しました" });
    }
    setUploadingId(null);
    fetchData();
  };

  const handleGenerate = async (id: string) => {
    setGeneratingId(id);
    setActionError(null);
    const res = await fetch(`/api/images/${id}/generate`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setActionError({ id, msg: err.error || "生成に失敗しました" });
    }
    setGeneratingId(null);
    fetchData();
  };

  const activeScriptFilter = scripts.find((s) => s.id === scriptIdFilter);

  const filtered = images.filter((img) => {
    const matchSearch = !search || img.title.toLowerCase().includes(search.toLowerCase()) || img.prompt.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || img.status === statusFilter;
    const matchService = !serviceFilter || img.service === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const stats = {
    total: images.length,
    pending: images.filter((i) => i.status === "pending").length,
    generating: images.filter((i) => i.status === "generating").length,
    completed: images.filter((i) => i.status === "completed").length,
    failed: images.filter((i) => i.status === "failed").length,
  };

  return (
    <div className="flex-1">
      <Header
        title="画像生成管理"
        description="AI画像生成のプロンプトと進捗を管理"
        actions={
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus size={14} /> 画像を追加
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {/* Script filter banner */}
        {activeScriptFilter && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
            <FileText size={14} className="text-indigo-500 flex-shrink-0" />
            <span className="text-indigo-700 font-medium">台本フィルター中:</span>
            <span className="text-indigo-600 flex-1 truncate">{activeScriptFilter.title}</span>
            <button
              className="text-indigo-400 hover:text-indigo-600 flex-shrink-0"
              onClick={() => {
                setScriptIdFilter("");
                router.replace("/images");
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-sm">
          {[
            { label: "合計", value: stats.total, color: "text-gray-700" },
            { label: "待機中", value: stats.pending, color: "text-yellow-600" },
            { label: "生成中", value: stats.generating, color: "text-blue-600" },
            { label: "完了", value: stats.completed, color: "text-green-600" },
            { label: "失敗", value: stats.failed, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`font-bold ${color}`}>{value}</span>
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="タイトル・プロンプトで検索..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
            <option value="">すべて</option>
            <option value="pending">待機中</option>
            <option value="generating">生成中</option>
            <option value="completed">完了</option>
            <option value="failed">失敗</option>
          </Select>
          <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-44">
            <option value="">すべてのサービス</option>
            {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">画像アセットがありません</p>
            <p className="text-sm mt-1">「画像を追加」から画像生成ジョブを登録してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((img) => (
              <Card key={img.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                {/* Image preview / placeholder */}
                <div className="aspect-[9/16] max-h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  {img.imageUrl ? (
                    <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <div className={`p-3 rounded-full ${img.status === "generating" ? "bg-blue-100" : img.status === "failed" ? "bg-red-100" : "bg-gray-100"}`}>
                        {STATUS_ICONS[img.status] || <ImageIcon size={20} className="text-gray-400" />}
                      </div>
                      <p className="text-xs text-gray-400">{STATUS_LABELS[img.status]}</p>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={`${STATUS_COLORS[img.status]} text-xs`}>
                      <span className="flex items-center gap-1">{STATUS_ICONS[img.status]}{STATUS_LABELS[img.status]}</span>
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">{img.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{img.prompt}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{SERVICE_LABELS[img.service] || img.service}</span>
                      {img.aspectRatio && <span className="text-xs text-gray-400">{img.aspectRatio}</span>}
                    </div>
                  </div>
                  {img.script && (
                    <p className="text-xs text-indigo-500 truncate mt-1">{img.script.title}{img.scene ? ` #${img.scene.order}` : ""}</p>
                  )}
                  {actionError?.id === img.id && (
                    <p className="text-xs text-red-500 mt-1 truncate">{actionError.msg}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                    <Select
                      value={img.status}
                      onChange={(e) => handleStatusChange(img.id, e.target.value)}
                      className="flex-1 h-7 text-xs"
                    >
                      <option value="pending">待機中</option>
                      <option value="generating">生成中</option>
                      <option value="completed">完了</option>
                      <option value="failed">失敗</option>
                    </Select>
                    {/* DALL-E 3 生成ボタン */}
                    {img.service === "dall-e-3" && (img.status === "pending" || img.status === "failed") && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-purple-400 hover:text-purple-600"
                        title="DALL-E 3で生成"
                        disabled={generatingId === img.id}
                        onClick={() => handleGenerate(img.id)}
                      >
                        {generatingId === img.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Sparkles size={12} />}
                      </Button>
                    )}
                    {/* Finderからアップロード */}
                    <label
                      className="inline-flex items-center justify-center h-7 w-7 rounded text-blue-400 hover:text-blue-600 hover:bg-accent cursor-pointer"
                      title="ファイルをアップロード"
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingId === img.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(img.id, file);
                          e.target.value = "";
                        }}
                      />
                      {uploadingId === img.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Upload size={12} />}
                    </label>
                    {img.imageUrl && (
                      <a href={img.imageUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink size={12} />
                        </Button>
                      </a>
                    )}
                    {img.status === "completed" && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-indigo-400 hover:text-indigo-600"
                        title="学習する"
                        onClick={() => setLearnTarget({ type: "image", title: img.title, promptCore: img.prompt, sourceId: img.id, keywords: img.style ?? "" })}
                      >
                        <BookOpen size={12} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(img.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Image Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>画像アセットを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>タイトル *</Label>
                <Input placeholder="シーン1のビジュアル" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>サービス</Label>
                <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>プロンプト * （英語推奨）</Label>
              <Textarea placeholder="A cinematic shot of... photorealistic, 4K" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>ネガティブプロンプト</Label>
              <Textarea placeholder="blurry, low quality, distorted..." value={form.negativePrompt} onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>アスペクト比</Label>
                <Select value={form.aspectRatio} onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })}>
                  <option value="9:16">9:16 (縦)</option>
                  <option value="1:1">1:1 (正方形)</option>
                  <option value="16:9">16:9 (横)</option>
                </Select>
              </div>
              <div>
                <Label>スタイル</Label>
                <Select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
                  <option value="">選択</option>
                  <option value="realistic">リアル</option>
                  <option value="anime">アニメ</option>
                  <option value="illustration">イラスト</option>
                  <option value="3d">3D</option>
                  <option value="watercolor">水彩</option>
                </Select>
              </div>
              <div>
                <Label>ステータス</Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">待機中</option>
                  <option value="generating">生成中</option>
                  <option value="completed">完了</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>画像URL（生成済みの場合）</Label>
              <Input placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>関連台本</Label>
                <Select value={form.scriptId} onChange={(e) => setForm({ ...form, scriptId: e.target.value, sceneId: "" })}>
                  <option value="">なし</option>
                  {scripts.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
              </div>
              <div>
                <Label>シーン</Label>
                <Select value={form.sceneId} onChange={(e) => setForm({ ...form, sceneId: e.target.value })} disabled={!form.scriptId}>
                  <option value="">なし</option>
                  {selectedScript?.scenes.map((sc) => <option key={sc.id} value={sc.id}>シーン{sc.order}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>メモ</Label>
              <Textarea placeholder="補足情報..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.prompt}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {learnTarget && (
        <LearnDialog
          open={!!learnTarget}
          onOpenChange={(v) => { if (!v) setLearnTarget(null); }}
          defaults={learnTarget}
        />
      )}
    </div>
  );
}

export default function ImagesPage() {
  return (
    <Suspense>
      <ImagesPageInner />
    </Suspense>
  );
}
