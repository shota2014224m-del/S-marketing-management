"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Search, Loader2, Trash2, Clock, CheckCircle2, AlertCircle,
  FileText, X, Download, Music, Play, Pause,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AudioAsset {
  id: string;
  scriptId: string | null;
  title: string;
  text: string;
  service: string;
  status: string;
  audioUrl: string | null;
  duration: number | null;
  voice: string | null;
  language: string | null;
  notes: string | null;
  createdAt: string;
  script: { title: string } | null;
}

interface Script {
  id: string;
  title: string;
  body: string | null;
  hook: string | null;
}

const SERVICE_LABELS: Record<string, string> = {
  "eleven-labs":  "ElevenLabs",
  "openai-tts":   "OpenAI TTS",
  "google-tts":   "Google Cloud TTS",
  "azure-tts":    "Azure Speech",
  "voicevox":     "VOICEVOX",
  "other":        "その他",
};

const SERVICE_VOICES: Record<string, { id: string; label: string }[]> = {
  "eleven-labs": [
    { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel（女性・英語）" },
    { id: "AZnzlk1XvdvUeBnXmlld", label: "Domi（女性・英語）" },
    { id: "ErXwobaYiN019PkySvjV", label: "Antoni（男性・英語）" },
    { id: "VR6AewLTigWG4xSOukaG", label: "Arnold（男性・英語）" },
  ],
  "openai-tts": [
    { id: "alloy", label: "Alloy（中性）" },
    { id: "echo", label: "Echo（男性）" },
    { id: "fable", label: "Fable（男性）" },
    { id: "onyx", label: "Onyx（男性・低音）" },
    { id: "nova", label: "Nova（女性）" },
    { id: "shimmer", label: "Shimmer（女性）" },
  ],
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:    <Clock size={12} />,
  generating: <Loader2 size={12} className="animate-spin" />,
  completed:  <CheckCircle2 size={12} />,
  failed:     <AlertCircle size={12} />,
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  generating: "bg-blue-50 text-blue-700 border-blue-200",
  completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待機中", generating: "生成中", completed: "完了", failed: "失敗",
};

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => new Audio(url));

  useEffect(() => {
    audio.onended = () => setPlaying(false);
    return () => { audio.pause(); audio.onended = null; };
  }, [audio]);

  const toggle = () => {
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center h-7 w-7 rounded text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
      title={playing ? "一時停止" : "再生"}
    >
      {playing ? <Pause size={13} /> : <Play size={13} />}
    </button>
  );
}

function AudioPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scriptIdParam = searchParams.get("scriptId") ?? "";

  const [audios, setAudios] = useState<AudioAsset[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [scriptIdFilter, setScriptIdFilter] = useState(scriptIdParam);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const [form, setForm] = useState({
    title: "", text: "", service: "eleven-labs", voice: "",
    language: "ja", status: "pending", audioUrl: "", notes: "", scriptId: scriptIdParam,
  });

  const fetchData = useCallback(async () => {
    try {
      const audioUrl = scriptIdFilter ? `/api/audio?scriptId=${encodeURIComponent(scriptIdFilter)}` : "/api/audio";
      const [audioRes, scriptRes] = await Promise.all([fetch(audioUrl), fetch("/api/scripts")]);
      if (audioRes.ok) setAudios(await audioRes.json());
      if (scriptRes.ok) {
        const data = await scriptRes.json();
        setScripts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("[fetchData audio]", e);
    } finally {
      setLoading(false);
    }
  }, [scriptIdFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.title || !form.text) return;
    const res = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scriptId: form.scriptId || null, audioUrl: form.audioUrl || null }),
    });
    if (!res.ok) return;
    setShowDialog(false);
    setForm({ title: "", text: "", service: "eleven-labs", voice: "", language: "ja", status: "pending", audioUrl: "", notes: "", scriptId: "" });
    fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/audio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setActionError(null);
    const res = await fetch(`/api/audio/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setActionError({ id, msg: err.error || "削除に失敗しました" });
      return;
    }
    fetchData();
  };

  const handleDownload = async (audio: AudioAsset) => {
    const url = audio.audioUrl!;
    const filename = `${audio.title.replace(/[^\w぀-鿿]/g, "_")}.mp3`;
    if (url.startsWith("/")) {
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename; a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const fillFromScript = (scriptId: string) => {
    const s = scripts.find((sc) => sc.id === scriptId);
    if (!s) return;
    const text = [s.hook, s.body].filter(Boolean).join("\n\n").slice(0, 2000);
    setForm((f) => ({ ...f, scriptId, title: `${s.title} - ナレーション`, text }));
  };

  const activeScriptFilter = scripts.find((s) => s.id === scriptIdFilter);

  const filtered = audios.filter((a) => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.text.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    const matchService = !serviceFilter || a.service === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const stats = {
    total: audios.length,
    pending: audios.filter((a) => a.status === "pending").length,
    generating: audios.filter((a) => a.status === "generating").length,
    completed: audios.filter((a) => a.status === "completed").length,
    failed: audios.filter((a) => a.status === "failed").length,
  };

  const availableVoices = SERVICE_VOICES[form.service] ?? [];

  return (
    <div className="flex-1">
      <Header
        title="音声生成管理"
        description="AI音声合成のテキストと進捗を管理"
        actions={
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus size={14} /> 音声を追加
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
            <button className="text-indigo-400 hover:text-indigo-600" onClick={() => { setScriptIdFilter(""); router.replace("/audio"); }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Stats */}
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
            <Input placeholder="タイトル・テキストで検索..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Music size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">音声アセットがありません</p>
            <p className="text-sm mt-1">「音声を追加」からナレーションを登録してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((audio) => (
              <Card key={audio.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${audio.status === "completed" ? "bg-emerald-100" : audio.status === "generating" ? "bg-blue-100" : audio.status === "failed" ? "bg-red-100" : "bg-gray-100"}`}>
                      <Music size={18} className={audio.status === "completed" ? "text-emerald-600" : audio.status === "generating" ? "text-blue-600" : audio.status === "failed" ? "text-red-500" : "text-gray-400"} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{audio.title}</h3>
                        <Badge className={`${STATUS_COLORS[audio.status]} text-xs flex items-center gap-1`}>
                          {STATUS_ICONS[audio.status]}{STATUS_LABELS[audio.status]}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{audio.text}</p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{SERVICE_LABELS[audio.service] || audio.service}</span>
                        {audio.voice && <span className="text-xs text-gray-400">{audio.voice}</span>}
                        {audio.language && <span className="text-xs text-gray-400">{audio.language}</span>}
                        {audio.duration && <span className="text-xs text-gray-400">{audio.duration}秒</span>}
                        {audio.script && <span className="text-xs text-indigo-500 truncate">{audio.script.title}</span>}
                        <span className="text-xs text-gray-300">{formatDateTime(audio.createdAt)}</span>
                      </div>

                      {actionError?.id === audio.id && (
                        <p className="text-xs text-red-500 mt-1">{actionError.msg}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Select
                        value={audio.status}
                        onChange={(e) => handleStatusChange(audio.id, e.target.value)}
                        className="h-7 text-xs w-24"
                      >
                        <option value="pending">待機中</option>
                        <option value="generating">生成中</option>
                        <option value="completed">完了</option>
                        <option value="failed">失敗</option>
                      </Select>

                      {audio.audioUrl && <AudioPlayer url={audio.audioUrl} />}

                      {audio.audioUrl && (
                        <button
                          onClick={() => handleDownload(audio)}
                          className="flex items-center justify-center h-7 w-7 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="ダウンロード"
                        >
                          <Download size={13} />
                        </button>
                      )}

                      {confirmDeleteId === audio.id ? (
                        <div className="flex items-center gap-1">
                          <button className="text-xs text-red-600 font-medium px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100" onClick={() => handleDelete(audio.id)}>削除</button>
                          <button className="text-xs text-gray-400 px-1 py-0.5 hover:text-gray-600" onClick={() => setConfirmDeleteId(null)}>✕</button>
                        </div>
                      ) : (
                        <button
                          className="flex items-center justify-center h-7 w-7 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setConfirmDeleteId(audio.id)}
                          title="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music size={16} className="text-indigo-500" /> 音声アセットを追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>タイトル <span className="text-red-400">*</span></Label>
                <Input placeholder="ナレーション1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>関連台本</Label>
                <Select value={form.scriptId} onChange={(e) => { setForm({ ...form, scriptId: e.target.value }); if (e.target.value) fillFromScript(e.target.value); }}>
                  <option value="">なし</option>
                  {scripts.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>読み上げテキスト <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder="ここに読み上げるテキストを入力..."
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-gray-400 mt-0.5">{form.text.length} 文字</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>サービス</Label>
                <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value, voice: "" })}>
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div>
                <Label>ボイス</Label>
                {availableVoices.length > 0 ? (
                  <Select value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}>
                    <option value="">デフォルト</option>
                    {availableVoices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </Select>
                ) : (
                  <Input placeholder="ボイスID" value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>言語</Label>
                <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="ja">日本語</option>
                  <option value="en">英語</option>
                  <option value="zh">中国語</option>
                  <option value="ko">韓国語</option>
                </Select>
              </div>
              <div>
                <Label>ステータス</Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">待機中</option>
                  <option value="completed">完了（URL入力）</option>
                </Select>
              </div>
            </div>
            {form.status === "completed" && (
              <div>
                <Label>音声URL</Label>
                <Input placeholder="https://... または /uploads/audio/..." value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
              </div>
            )}
            <div>
              <Label>メモ</Label>
              <Textarea placeholder="補足情報..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.text}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AudioPage() {
  return (
    <Suspense>
      <AudioPageInner />
    </Suspense>
  );
}
