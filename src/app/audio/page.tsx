"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Trash2, Clock, CheckCircle2, AlertCircle,
  Music, Play, Pause, Plus, ChevronDown, ChevronRight,
  Download, RefreshCw, FileText,
} from "lucide-react";

// ─── 型定義 ───────────────────────────────────────────────
interface SceneAudio {
  id: string;
  title: string;
  status: string;
  service: string;
  audioUrl: string | null;
  voice: string | null;
  duration: number | null;
}

interface SceneWithAudio {
  id: string;
  order: number;
  text: string;
  duration: number | null;
  audioAssets: SceneAudio[];
}

interface ScriptOverview {
  id: string;
  title: string;
  topic: string;
  status: string;
  totalScenes: number;
  completedScenes: number;
  pendingScenes: number;
  scenes: SceneWithAudio[];
}

// ─── 定数 ─────────────────────────────────────────────────
const SERVICE_LABELS: Record<string, string> = {
  "eleven-labs": "ElevenLabs",
  "openai-tts":  "OpenAI TTS",
  "google-tts":  "Google Cloud TTS",
  "azure-tts":   "Azure Speech",
  "voicevox":    "VOICEVOX",
  "other":       "その他",
};

const SERVICE_VOICES: Record<string, { id: string; label: string }[]> = {
  "eleven-labs": [
    { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel（女性）" },
    { id: "AZnzlk1XvdvUeBnXmlld", label: "Domi（女性）" },
    { id: "ErXwobaYiN019PkySvjV", label: "Antoni（男性）" },
    { id: "VR6AewLTigWG4xSOukaG", label: "Arnold（男性）" },
  ],
  "openai-tts": [
    { id: "alloy", label: "Alloy（中性）" },
    { id: "echo", label: "Echo（男性）" },
    { id: "nova", label: "Nova（女性）" },
    { id: "shimmer", label: "Shimmer（女性）" },
    { id: "onyx", label: "Onyx（低音）" },
    { id: "fable", label: "Fable（男性）" },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "待機中", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200",   icon: <Clock size={11} /> },
  generating: { label: "生成中", color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",       icon: <Loader2 size={11} className="animate-spin" /> },
  completed:  { label: "完了",   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={11} /> },
  failed:     { label: "失敗",   color: "text-red-500",    bg: "bg-red-50 border-red-200",          icon: <AlertCircle size={11} /> },
};

// ─── AudioPlayer ──────────────────────────────────────────
function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => setPlaying(false);
    return () => { a.pause(); };
  }, [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <button onClick={toggle} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors" title={playing ? "一時停止" : "再生"}>
      {playing ? <Pause size={13} /> : <Play size={13} />}
    </button>
  );
}

// ─── AddAudioDialog ────────────────────────────────────────
interface AddAudioDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scriptId: string;
  sceneId: string;
  sceneOrder: number;
  sceneText: string;
  scriptTitle: string;
  onSaved: () => void;
}

function AddAudioDialog({ open, onOpenChange, scriptId, sceneId, sceneOrder, sceneText, scriptTitle, onSaved }: AddAudioDialogProps) {
  const [form, setForm] = useState({ service: "eleven-labs", voice: "", language: "ja", audioUrl: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableVoices = SERVICE_VOICES[form.service] ?? [];

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scriptId,
        sceneId,
        title: `${scriptTitle} - シーン${sceneOrder}`,
        text: sceneText,
        service: form.service,
        voice: form.voice || null,
        language: form.language,
        status: form.audioUrl ? "completed" : "pending",
        audioUrl: form.audioUrl || null,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "保存に失敗しました");
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Music size={15} className="text-emerald-500" />
            シーン{sceneOrder}の音声を追加
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">読み上げテキスト（シーンから自動取得）</p>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{sceneText}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">サービス</Label>
              <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value, voice: "" })}>
                {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">ボイス</Label>
              {availableVoices.length > 0 ? (
                <Select value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}>
                  <option value="">デフォルト</option>
                  {availableVoices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              ) : (
                <Input placeholder="ボイスID" value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} className="h-9 text-sm" />
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">言語</Label>
            <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="ja">日本語</option>
              <option value="en">英語</option>
              <option value="zh">中国語</option>
              <option value="ko">韓国語</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">音声URL（生成済みの場合）</Label>
            <Input placeholder="https://... または /uploads/audio/..." value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Textarea placeholder="補足情報..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="text-sm" />
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SceneRow ──────────────────────────────────────────────
interface SceneRowProps {
  scene: SceneWithAudio;
  scriptId: string;
  scriptTitle: string;
  onRefresh: () => void;
}

function SceneRow({ scene, scriptId, scriptTitle, onRefresh }: SceneRowProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const audio = scene.audioAssets[0] ?? null;
  const cfg = audio ? (STATUS_CONFIG[audio.status] ?? STATUS_CONFIG.pending) : null;

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    await fetch(`/api/audio/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/audio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  };

  const handleDownload = async (a: SceneAudio) => {
    const url = a.audioUrl!;
    const filename = `${scriptTitle}_scene${scene.order}.mp3`;
    if (url.startsWith("/")) {
      const el = document.createElement("a"); el.href = url; el.download = filename; el.click(); return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const el = document.createElement("a"); el.href = blobUrl; el.download = filename; el.click();
      URL.revokeObjectURL(blobUrl);
    } catch { window.open(url, "_blank"); }
  };

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
      {/* Scene number */}
      <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${audio ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
        {scene.order}
      </div>

      {/* Scene text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{scene.text}</p>
        {scene.duration && <p className="text-xs text-gray-400 mt-0.5">{scene.duration}秒</p>}
      </div>

      {/* Audio status & actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {audio && cfg ? (
          <>
            <Badge className={`${cfg.bg} ${cfg.color} text-xs flex items-center gap-1 border`}>
              {cfg.icon}{cfg.label}
            </Badge>
            <Select
              value={audio.status}
              onChange={(e) => handleStatusChange(audio.id, e.target.value)}
              className="h-6 text-xs w-20"
            >
              <option value="pending">待機中</option>
              <option value="generating">生成中</option>
              <option value="completed">完了</option>
              <option value="failed">失敗</option>
            </Select>
            {audio.audioUrl && <AudioPlayer url={audio.audioUrl} />}
            {audio.audioUrl && (
              <button onClick={() => handleDownload(audio)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="ダウンロード">
                <Download size={12} />
              </button>
            )}
            {confirmDeleteId === audio.id ? (
              <div className="flex items-center gap-1">
                <button className="text-xs text-red-600 font-medium px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100" onClick={() => handleDelete(audio.id)}>削除</button>
                <button className="text-xs text-gray-400 px-1 py-0.5 hover:text-gray-600" onClick={() => setConfirmDeleteId(null)}>✕</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteId(audio.id)} className="p-1.5 rounded hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="削除">
                <Trash2 size={12} />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
          >
            <Plus size={11} /> 音声を追加
          </button>
        )}
      </div>

      {showAdd && (
        <AddAudioDialog
          open={showAdd}
          onOpenChange={setShowAdd}
          scriptId={scriptId}
          sceneId={scene.id}
          sceneOrder={scene.order}
          sceneText={scene.text}
          scriptTitle={scriptTitle}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ─── ScriptCard ────────────────────────────────────────────
function ScriptCard({ script, onRefresh }: { script: ScriptOverview; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const rate = script.totalScenes > 0 ? (script.completedScenes / script.totalScenes) * 100 : 0;
  const barColor = rate >= 100 ? "bg-emerald-500" : rate >= 60 ? "bg-indigo-500" : rate > 0 ? "bg-yellow-400" : "bg-gray-200";

  return (
    <Card className="overflow-hidden">
      {/* Script header row */}
      <button
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-indigo-400 flex-shrink-0" />
              <h3 className="font-semibold text-sm text-gray-900 truncate">{script.title}</h3>
              <span className="text-xs text-gray-400 flex-shrink-0 truncate max-w-xs hidden sm:block">{script.topic}</span>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${rate}%` }} />
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 w-28 text-right">
                {script.completedScenes} / {script.totalScenes} シーン完了
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {script.pendingScenes > 0 && (
              <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 border text-xs">{script.pendingScenes} 待機中</Badge>
            )}
            {script.completedScenes === script.totalScenes && script.totalScenes > 0 && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">すべて完了</Badge>
            )}
            {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {/* Scenes list */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50 px-2">
          {script.scenes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">シーンがありません</p>
          ) : (
            script.scenes.map((scene) => (
              <SceneRow
                key={scene.id}
                scene={scene}
                scriptId={script.id}
                scriptTitle={script.title}
                onRefresh={onRefresh}
              />
            ))
          )}
        </div>
      )}
    </Card>
  );
}

// ─── メインページ ───────────────────────────────────────────
function AudioPageInner() {
  const [scripts, setScripts] = useState<ScriptOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/audio/overview");
      if (res.ok) {
        const data = await res.json();
        setScripts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("[fetchData audio overview]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = scripts.filter((s) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.topic.toLowerCase().includes(search.toLowerCase())
  );

  const totalCompleted = scripts.reduce((sum, s) => sum + s.completedScenes, 0);
  const totalScenes = scripts.reduce((sum, s) => sum + s.totalScenes, 0);
  const totalPending = scripts.reduce((sum, s) => sum + s.pendingScenes, 0);

  return (
    <div className="flex-1">
      <Header
        title="音声生成管理"
        description="台本ごとのシーン音声を一元管理"
        actions={
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="更新">
            <RefreshCw size={16} />
          </button>
        }
      />
      <main className="p-6 space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-700">{scripts.length}</span>
            <span className="text-gray-400">台本</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-emerald-600">{totalCompleted}</span>
            <span className="text-gray-400">シーン完了</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-yellow-600">{totalPending}</span>
            <span className="text-gray-400">待機中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500">{totalScenes}</span>
            <span className="text-gray-400">総シーン数</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="台本を検索..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Script cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Music size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "該当する台本がありません" : "台本がありません"}</p>
            <p className="text-sm mt-1">台本・スクリプトページから台本を作成してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((script) => (
              <ScriptCard key={script.id} script={script} onRefresh={fetchData} />
            ))}
          </div>
        )}
      </main>
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
