"use client";
import { useState, useEffect, useCallback } from "react";
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
  Plus, Search, Video, Loader2, ExternalLink, Trash2,
  Clock, CheckCircle2, AlertCircle, Play, BookOpen,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDateTime, formatDuration } from "@/lib/utils";
import { LearnDialog, LearnPayload } from "@/components/learning/learn-dialog";

interface VideoAsset {
  id: string;
  title: string;
  service: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  aspectRatio: string | null;
  notes: string | null;
  jobId: string | null;
  createdAt: string;
  script: { title: string } | null;
  image: { title: string; imageUrl: string | null } | null;
}

interface Script { id: string; title: string; }
interface ImageAsset { id: string; title: string; }

const SERVICE_LABELS: Record<string, string> = {
  "d-id": "D-ID",
  "heygen": "HeyGen",
  "runway": "Runway ML",
  "pika": "Pika Labs",
  "kling": "Kling AI",
  "other": "その他",
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "d-id": "リップシンク・アバター動画",
  "heygen": "AIアバター・多言語対応",
  "runway": "テキスト/画像→動画生成",
  "pika": "高品質動画生成",
  "kling": "高解像度動画生成",
};

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [learnTarget, setLearnTarget] = useState<LearnPayload | null>(null);

  const [form, setForm] = useState({
    title: "", service: "d-id", status: "pending", videoUrl: "",
    thumbnailUrl: "", duration: "", notes: "", jobId: "", scriptId: "", imageId: "",
  });

  const fetchData = useCallback(async () => {
    const [vidRes, scriptRes, imgRes] = await Promise.all([
      fetch("/api/videos"),
      fetch("/api/scripts"),
      fetch("/api/images"),
    ]);
    setVideos(await vidRes.json());
    setScripts(await scriptRes.json());
    setImages(await imgRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.title) return;
    await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scriptId: form.scriptId || null, imageId: form.imageId || null, duration: form.duration ? Number(form.duration) : null }),
    });
    setShowDialog(false);
    setForm({ title: "", service: "d-id", status: "pending", videoUrl: "", thumbnailUrl: "", duration: "", notes: "", jobId: "", scriptId: "", imageId: "" });
    fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この動画アセットを削除しますか？")) return;
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    fetchData();
  };

  const filtered = videos.filter((v) => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchService = !serviceFilter || v.service === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const stats = {
    pending: videos.filter((v) => v.status === "pending").length,
    generating: videos.filter((v) => v.status === "generating").length,
    completed: videos.filter((v) => v.status === "completed").length,
  };

  return (
    <div className="flex-1">
      <Header
        title="動画生成管理"
        description="リップシンク・AI動画生成の進捗管理"
        actions={
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus size={14} /> 動画を追加
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {/* Service cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(SERVICE_LABELS).filter(([k]) => k !== "other").map(([key, label]) => (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setServiceFilter(serviceFilter === key ? "" : key)}>
              <CardContent className={`p-3 text-center ${serviceFilter === key ? "ring-2 ring-indigo-500" : ""}`}>
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{SERVICE_DESCRIPTIONS[key]}</p>
                <p className="text-lg font-bold text-indigo-600 mt-1">
                  {videos.filter((v) => v.service === key).length}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span><span className="font-bold text-gray-700">{videos.length}</span> <span className="text-gray-400">合計</span></span>
          <span><span className="font-bold text-yellow-600">{stats.pending}</span> <span className="text-gray-400">待機中</span></span>
          <span><span className="font-bold text-blue-600">{stats.generating}</span> <span className="text-gray-400">生成中</span></span>
          <span><span className="font-bold text-green-600">{stats.completed}</span> <span className="text-gray-400">完了</span></span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="タイトルで検索..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
            <option value="">すべて</option>
            <option value="pending">待機中</option>
            <option value="generating">生成中</option>
            <option value="completed">完了</option>
            <option value="failed">失敗</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Video size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">動画アセットがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vid) => (
              <Card key={vid.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-900 relative group">
                  {vid.thumbnailUrl ? (
                    <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={32} className="text-gray-600" />
                    </div>
                  )}
                  {vid.videoUrl && (
                    <a href={vid.videoUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={16} className="text-gray-900 ml-0.5" />
                      </div>
                    </a>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={STATUS_COLORS[vid.status]}>{STATUS_LABELS[vid.status]}</Badge>
                  </div>
                  {vid.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(vid.duration)}
                    </div>
                  )}
                </div>

                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">{vid.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{SERVICE_LABELS[vid.service] || vid.service}</span>
                    {vid.script && <span className="text-xs text-indigo-500 truncate">{vid.script.title}</span>}
                  </div>
                  {vid.jobId && (
                    <p className="text-xs text-gray-400 mt-1 truncate font-mono">Job: {vid.jobId}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                    <Select value={vid.status} onChange={(e) => handleStatusChange(vid.id, e.target.value)} className="flex-1 h-7 text-xs">
                      <option value="pending">待機中</option>
                      <option value="generating">生成中</option>
                      <option value="completed">完了</option>
                      <option value="failed">失敗</option>
                    </Select>
                    {vid.videoUrl && (
                      <a href={vid.videoUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink size={12} /></Button>
                      </a>
                    )}
                    {vid.status === "completed" && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-indigo-400 hover:text-indigo-600"
                        title="学習する"
                        onClick={() => setLearnTarget({ type: "video", title: vid.title, promptCore: vid.notes ?? "", sourceId: vid.id })}
                      >
                        <BookOpen size={12} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(vid.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>動画アセットを追加</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>タイトル *</Label>
                <Input placeholder="動画タイトル" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>サービス</Label>
                <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ステータス</Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">待機中</option>
                  <option value="generating">生成中</option>
                  <option value="completed">完了</option>
                </Select>
              </div>
              <div>
                <Label>尺（秒）</Label>
                <Input type="number" placeholder="60" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>動画URL（完成済みの場合）</Label>
              <Input placeholder="https://..." value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
            </div>
            <div>
              <Label>サムネイルURL</Label>
              <Input placeholder="https://..." value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} />
            </div>
            <div>
              <Label>ジョブID（API管理用）</Label>
              <Input placeholder="外部APIのジョブID" value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>関連台本</Label>
                <Select value={form.scriptId} onChange={(e) => setForm({ ...form, scriptId: e.target.value })}>
                  <option value="">なし</option>
                  {scripts.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
              </div>
              <div>
                <Label>元画像</Label>
                <Select value={form.imageId} onChange={(e) => setForm({ ...form, imageId: e.target.value })}>
                  <option value="">なし</option>
                  {images.map((img) => <option key={img.id} value={img.id}>{img.title}</option>)}
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
            <Button onClick={handleCreate} disabled={!form.title}>追加</Button>
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
