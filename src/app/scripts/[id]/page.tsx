"use client";
import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Save, Clock, Hash, Layers, ImageIcon, Download,
  ChevronDown, ChevronUp, Loader2, Copy, Check,
  Sparkles, Video, BookOpen, Music, Plus,
  Play, Pause, Trash2, FileText,
  CheckCircle2, AlertCircle, Wand2, Smile,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDuration } from "@/lib/utils";
import { LearnDialog } from "@/components/learning/learn-dialog";

// ── Types ──────────────────────────────────────────────────────────────────
interface Scene {
  id: string;
  order: number;
  text: string;
  visualNote: string | null;
  duration: number | null;
}

interface ScriptFields {
  title: string; topic: string; hook: string | null; body: string | null;
  callToAction: string | null; hashtags: string | null; duration: number | null; status: string;
}

interface Script extends ScriptFields {
  id: string; aiModel: string | null; scenes: Scene[];
  project: { title: string } | null;
}

interface AudioAsset {
  id: string; sceneId: string | null; title: string; status: string;
  service: string; audioUrl: string | null; voice: string | null; duration: number | null;
}

interface ImageAsset {
  id: string; title: string; status: string; imageUrl: string | null;
  prompt: string; style: string | null;
}

interface VideoAsset {
  id: string; title: string; service: string; status: string;
  videoUrl: string | null; thumbnailUrl: string | null; duration: number | null;
  notes: string | null; createdAt: string;
  image: { title: string; imageUrl: string | null } | null;
  audio: { title: string; audioUrl: string | null } | null;
}

// ── Constants ──────────────────────────────────────────────────────────────
const AUDIO_SERVICE_LABELS: Record<string, string> = {
  "eleven-labs": "ElevenLabs", "openai-tts": "OpenAI TTS",
  "google-tts": "Google TTS", "voicevox": "VOICEVOX", "other": "その他",
};
const AUDIO_SERVICE_VOICES: Record<string, { id: string; label: string }[]> = {
  "eleven-labs": [
    { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel（女性）" },
    { id: "AZnzlk1XvdvUeBnXmlld", label: "Domi（女性）" },
    { id: "ErXwobaYiN019PkySvjV", label: "Antoni（男性）" },
    { id: "VR6AewLTigWG4xSOukaG", label: "Arnold（男性）" },
  ],
  "openai-tts": [
    { id: "alloy", label: "Alloy" }, { id: "echo", label: "Echo" },
    { id: "nova", label: "Nova" }, { id: "shimmer", label: "Shimmer" },
    { id: "onyx", label: "Onyx" }, { id: "fable", label: "Fable" },
  ],
};
const AUDIO_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "待機中",  color: "text-yellow-600",  bg: "bg-yellow-50 border-yellow-200" },
  generating: { label: "生成中",  color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
  completed:  { label: "完了",    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  failed:     { label: "失敗",    color: "text-red-500",     bg: "bg-red-50 border-red-200" },
};
const VIDEO_SERVICE_LABELS: Record<string, string> = {
  "d-id": "D-ID", "heygen": "HeyGen", "runway": "Runway ML",
  "pika": "Pika Labs", "kling": "Kling AI", "other": "その他",
};

// ── AudioPlayer ────────────────────────────────────────────────────────────
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
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  };
  return (
    <button onClick={toggle} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-500 transition-colors" title={playing ? "一時停止" : "再生"}>
      {playing ? <Pause size={13} /> : <Play size={13} />}
    </button>
  );
}

// ── AddAudioDialog ─────────────────────────────────────────────────────────
interface AddAudioDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  scriptId: string; sceneId: string; sceneOrder: number;
  sceneText: string; scriptTitle: string; onSaved: () => void;
}
function AddAudioDialog({ open, onOpenChange, scriptId, sceneId, sceneOrder, sceneText, scriptTitle, onSaved }: AddAudioDialogProps) {
  const [form, setForm] = useState({ service: "eleven-labs", voice: "", language: "ja", audioUrl: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const voices = AUDIO_SERVICE_VOICES[form.service] ?? [];

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId, sceneId,
          title: `${scriptTitle} - シーン${sceneOrder}`,
          text: sceneText, service: form.service,
          voice: form.voice || null, language: form.language,
          status: form.audioUrl ? "completed" : "pending",
          audioUrl: form.audioUrl || null, notes: form.notes || null,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "保存に失敗しました"); }
      onSaved(); onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Music size={14} className="text-emerald-500" />シーン{sceneOrder}の音声タスクを追加
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">読み上げテキスト（シーンから自動取得）</p>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{sceneText}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">サービス</Label>
              <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value, voice: "" })}>
                {Object.entries(AUDIO_SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">ボイス</Label>
              {voices.length > 0 ? (
                <Select value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}>
                  <option value="">デフォルト</option>
                  {voices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
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
            <Input placeholder="https://..." value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} className="text-sm" />
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
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} 追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
type TabId = "script" | "audio" | "images" | "videos";

export default function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("script");

  // Script state
  const [script, setScript] = useState<Script | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<ScriptFields>({ title: "", topic: "", hook: "", body: "", callToAction: "", hashtags: "", duration: null, status: "draft" });
  const [editedScenes, setEditedScenes] = useState<Scene[]>([]);
  const [expandedScenes, setExpandedScenes] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLearnDialog, setShowLearnDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Audio tab state
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [addAudioScene, setAddAudioScene] = useState<Scene | null>(null);
  const [audioConfirmDeleteId, setAudioConfirmDeleteId] = useState<string | null>(null);

  // Images tab state
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [showCharDialog, setShowCharDialog] = useState(false);
  const [charSubject, setCharSubject] = useState("");
  const [charExpression, setCharExpression] = useState("");
  const [charBackground, setCharBackground] = useState("");
  const [charDetails, setCharDetails] = useState("");
  const [charGenerating, setCharGenerating] = useState(false);
  const [charResult, setCharResult] = useState<{ prompt: string; imageId: string } | null>(null);
  const [charImaging, setCharImaging] = useState(false);
  const [charError, setCharError] = useState("");
  const [imgConfirmDeleteId, setImgConfirmDeleteId] = useState<string | null>(null);

  // Videos tab state
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: "", service: "d-id", notes: "", videoUrl: "", imageId: "", audioId: "" });
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [vidConfirmDeleteId, setVidConfirmDeleteId] = useState<string | null>(null);

  // ─ Data loaders
  const loadScript = useCallback(async () => {
    const res = await fetch(`/api/scripts/${id}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data: Script = await res.json();
    setScript(data);
    setForm({ title: data.title, topic: data.topic, hook: data.hook, body: data.body, callToAction: data.callToAction, hashtags: data.hashtags, duration: data.duration, status: data.status });
    setEditedScenes(data.scenes);
  }, [id]);

  const loadAudio = useCallback(async () => {
    setAudioLoading(true);
    try {
      const res = await fetch(`/api/audio?scriptId=${id}`);
      if (res.ok) setAudioAssets(await res.json());
    } finally { setAudioLoading(false); setAudioLoaded(true); }
  }, [id]);

  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const res = await fetch(`/api/images?scriptId=${id}`);
      if (res.ok) setImages(await res.json());
    } finally { setImagesLoading(false); setImagesLoaded(true); }
  }, [id]);

  const loadVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const res = await fetch(`/api/videos?scriptId=${id}`);
      if (res.ok) setVideos(await res.json());
    } finally { setVideosLoading(false); setVideosLoaded(true); }
  }, [id]);

  useEffect(() => { loadScript(); }, [loadScript]);

  useEffect(() => {
    if (tab === "audio" && !audioLoaded) loadAudio();
    if (tab === "images" && !imagesLoaded) loadImages();
    if (tab === "videos" && !videosLoaded) { loadVideos(); if (!imagesLoaded) loadImages(); }
  }, [tab, audioLoaded, imagesLoaded, videosLoaded, loadAudio, loadImages, loadVideos]);

  // ─ Script handlers
  const handleEdit = () => { if (!script) return; setEditedScenes([...script.scenes]); setSaveError(""); setEditing(true); };
  const handleCancel = () => {
    if (!script) return;
    setForm({ title: script.title, topic: script.topic, hook: script.hook, body: script.body, callToAction: script.callToAction, hashtags: script.hashtags, duration: script.duration, status: script.status });
    setEditedScenes([...script.scenes]); setSaveError(""); setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scenes: editedScenes }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `保存に失敗しました (${res.status})`); }
      const data: Script = await res.json();
      setScript(data);
      setForm({ title: data.title, topic: data.topic, hook: data.hook, body: data.body, callToAction: data.callToAction, hashtags: data.hashtags, duration: data.duration, status: data.status });
      setEditedScenes(data.scenes);
      setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally { setSaving(false); }
  };

  const handleRegenerateScenes = async () => {
    setShowRegenConfirm(false); setRegenerating(true); setRegenError("");
    try {
      const res = await fetch(`/api/scripts/${id}/regenerate-scenes`, { method: "POST" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "再生成に失敗しました"); }
      const data: Script = await res.json();
      setScript(data);
      setForm({ title: data.title, topic: data.topic, hook: data.hook, body: data.body, callToAction: data.callToAction, hashtags: data.hashtags, duration: data.duration, status: data.status });
      setEditedScenes(data.scenes);
    } catch (e) { setRegenError(e instanceof Error ? e.message : "再生成に失敗しました"); }
    finally { setRegenerating(false); }
  };

  const handleCopy = async (sceneId: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(sceneId); setTimeout(() => setCopiedId(null), 2000);
  };

  const updateScene = (sceneId: string, field: keyof Scene, value: string | number | null) => {
    setEditedScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, [field]: value } : s));
  };

  // ─ Audio handlers
  const handleAudioStatusChange = async (audioId: string, status: string) => {
    await fetch(`/api/audio/${audioId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadAudio();
  };

  const handleAudioDelete = async (audioId: string) => {
    setAudioConfirmDeleteId(null);
    await fetch(`/api/audio/${audioId}`, { method: "DELETE" });
    loadAudio();
  };

  const handleAudioDownload = async (a: AudioAsset, sceneOrder: number) => {
    const url = a.audioUrl!;
    const filename = `${script?.title ?? "audio"}_scene${sceneOrder}.mp3`;
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

  // ─ Image handlers
  const handleOpenCharDialog = () => {
    if (!script) return;
    setCharSubject(script.topic); setCharExpression(""); setCharBackground(""); setCharDetails(""); setCharResult(null); setCharError(""); setShowCharDialog(true);
  };

  const handleGenerateCharPrompt = async () => {
    if (!script || !charSubject.trim()) return;
    setCharGenerating(true); setCharError(""); setCharResult(null);
    try {
      const res = await fetch("/api/images/character-prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: charSubject, expression: charExpression || undefined, background: charBackground || undefined, details: charDetails || undefined, scriptId: id, title: `${script.title} - キャラクター` }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "プロンプト生成に失敗しました"); }
      const data = await res.json();
      setCharResult({ prompt: data.prompt, imageId: data.image.id });
    } catch (e) { setCharError(e instanceof Error ? e.message : "生成に失敗しました"); }
    finally { setCharGenerating(false); }
  };

  const handleGenerateCharImage = async () => {
    if (!charResult) return;
    setCharImaging(true); setCharError("");
    try {
      const res = await fetch(`/api/images/${charResult.imageId}/generate`, { method: "POST" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "画像生成に失敗しました"); }
      await loadImages(); setShowCharDialog(false); setCharResult(null);
    } catch (e) { setCharError(e instanceof Error ? e.message : "画像生成に失敗しました"); }
    finally { setCharImaging(false); }
  };

  const handleImageDelete = async (imgId: string) => {
    setImgConfirmDeleteId(null);
    const res = await fetch(`/api/images/${imgId}`, { method: "DELETE" });
    if (res.ok) loadImages();
  };

  const handleImageDownload = async (img: ImageAsset) => {
    const url = img.imageUrl!;
    const filename = `${img.title.replace(/\s+/g, "_")}.png`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const el = document.createElement("a"); el.href = blobUrl; el.download = filename; el.click();
      URL.revokeObjectURL(blobUrl);
    } catch { window.open(url, "_blank"); }
  };

  // ─ Video handlers
  const handleAddVideo = async () => {
    if (!videoForm.title.trim()) return;
    setVideoSaving(true); setVideoError("");
    try {
      const res = await fetch("/api/videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: id, title: videoForm.title, service: videoForm.service,
          notes: videoForm.notes || null, videoUrl: videoForm.videoUrl || null,
          imageId: videoForm.imageId || null, audioId: videoForm.audioId || null,
          status: "pending",
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "追加に失敗しました"); }
      await loadVideos();
      setShowAddVideo(false);
      setVideoForm({ title: "", service: "d-id", notes: "", videoUrl: "", imageId: "", audioId: "" });
    } catch (e) { setVideoError(e instanceof Error ? e.message : "追加に失敗しました"); }
    finally { setVideoSaving(false); }
  };

  const handleVideoDelete = async (vidId: string) => {
    setVidConfirmDeleteId(null);
    const res = await fetch(`/api/videos/${vidId}`, { method: "DELETE" });
    if (res.ok) loadVideos();
  };

  if (!script) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const displayScenes = editing ? editedScenes : script.scenes;
  const audioByScene = new Map<string, AudioAsset>();
  audioAssets.forEach((a) => { if (a.sceneId) audioByScene.set(a.sceneId, a); });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "script", label: "台本・シーン構成", icon: <FileText size={14} /> },
    { id: "audio",  label: "音声管理",         icon: <Music size={14} /> },
    { id: "images", label: "画像管理",         icon: <ImageIcon size={14} /> },
    { id: "videos", label: "動画管理",         icon: <Video size={14} /> },
  ];

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
            {tab === "script" && !editing && (
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
            {tab === "script" && editing && (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>キャンセル</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "保存中..." : "保存"}
                </Button>
              </>
            )}
            {tab === "images" && (
              <Button size="sm" onClick={handleOpenCharDialog} className="bg-pink-600 hover:bg-pink-700">
                <Smile size={14} /> キャラ画像を生成
              </Button>
            )}
            {tab === "videos" && (
              <Button size="sm" onClick={() => setShowAddVideo(true)}>
                <Plus size={14} /> 動画を追加
              </Button>
            )}
            {tab === "audio" && (
              <Button variant="outline" size="sm" onClick={loadAudio}>
                <Loader2 size={14} className={audioLoading ? "animate-spin" : "opacity-0 w-0"} />
                更新
              </Button>
            )}
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="flex px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="p-6">

        {/* ────────────────────────────────────────────────────────
            Tab 1: 台本・シーン構成
        ──────────────────────────────────────────────────────── */}
        {tab === "script" && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm text-indigo-600">CTA（行動喚起）</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {editing ? (
                    <Textarea value={form.callToAction ?? ""} onChange={(e) => setForm({ ...form, callToAction: e.target.value })} placeholder="フォロー・いいね・コメント誘導" rows={3} />
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{script.callToAction || "未設定"}</p>
                  )}
                </CardContent>
              </Card>
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
                    {showRegenConfirm ? (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                        <AlertCircle size={12} />
                        既存シーンをリセットします
                        <button className="font-semibold underline hover:text-orange-900" onClick={handleRegenerateScenes}>実行</button>
                        <button className="text-gray-400 hover:text-gray-600 ml-1" onClick={() => setShowRegenConfirm(false)}>✕</button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setShowRegenConfirm(true)} disabled={regenerating} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                        {regenerating ? <><Loader2 size={13} className="animate-spin" /> 再生成中...</> : <><Wand2 size={13} /> AIでシーン再生成</>}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedScenes(!expandedScenes)}>
                      {expandedScenes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                  </div>
                </div>
                {regenError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{regenError}</p>}
              </CardHeader>
              {expandedScenes && (
                <CardContent className="pt-0">
                  {displayScenes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">シーンがありません</p>
                  ) : (
                    <div className="space-y-3">
                      {displayScenes.map((scene) => (
                        <div key={scene.id} className="flex gap-3 p-3 rounded-lg border bg-gray-50 border-gray-100">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {scene.order}
                          </div>
                          <div className="flex-1 min-w-0">
                            {editing ? (
                              <div className="space-y-2">
                                <Textarea value={scene.text} onChange={(e) => updateScene(scene.id, "text", e.target.value)} placeholder="セリフ・ナレーション" rows={2} className="text-sm" />
                                <div>
                                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={10} />ビジュアルノート（英語）</p>
                                  <Textarea value={scene.visualNote ?? ""} onChange={(e) => updateScene(scene.id, "visualNote", e.target.value || null)} placeholder="Photorealistic shot of..." rows={2} className="text-xs text-gray-600" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input type="number" value={scene.duration ?? ""} onChange={(e) => updateScene(scene.id, "duration", e.target.value ? Number(e.target.value) : null)} placeholder="秒数" className="h-7 w-20 text-xs" />
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
                                      <button onClick={() => handleCopy(scene.id, scene.visualNote!)} className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors" title="コピー">
                                        {copiedId === scene.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {scene.duration && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} />{formatDuration(scene.duration)}</p>}
                              </>
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
        )}

        {/* ────────────────────────────────────────────────────────
            Tab 2: 音声管理
        ──────────────────────────────────────────────────────── */}
        {tab === "audio" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {!audioLoading && (
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700">{script.scenes.length}</span>
                  <span className="text-gray-400">総シーン数</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-600">{audioAssets.filter((a) => a.status === "completed").length}</span>
                  <span className="text-gray-400">完了</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-yellow-600">{audioAssets.filter((a) => a.status === "pending" || a.status === "generating").length}</span>
                  <span className="text-gray-400">待機中</span>
                </div>
                <div className="ml-auto">
                  <div className="h-2 w-40 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: script.scenes.length > 0 ? `${(audioAssets.filter((a) => a.status === "completed").length / script.scenes.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {audioLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Music size={15} className="text-emerald-500" />シーン別音声タスク
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {script.scenes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Music size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">シーンがありません</p>
                      <p className="text-xs mt-1">「台本・シーン構成」タブでシーンを作成してください</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {script.scenes.map((scene) => {
                        const audio = audioByScene.get(scene.id) ?? null;
                        const cfg = audio ? (AUDIO_STATUS[audio.status] ?? AUDIO_STATUS.pending) : null;
                        return (
                          <div key={scene.id} className="flex items-start gap-3 py-3 px-2 hover:bg-gray-50 transition-colors group">
                            <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${audio ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                              {scene.order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{scene.text}</p>
                              {scene.duration && <p className="text-xs text-gray-400 mt-0.5">{scene.duration}秒</p>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {audio && cfg ? (
                                <>
                                  <Badge className={`${cfg.bg} ${cfg.color} text-xs flex items-center gap-1 border`}>
                                    {audio.status === "generating" && <Loader2 size={10} className="animate-spin" />}
                                    {cfg.label}
                                  </Badge>
                                  <Select value={audio.status} onChange={(e) => handleAudioStatusChange(audio.id, e.target.value)} className="h-6 text-xs w-20">
                                    <option value="pending">待機中</option>
                                    <option value="generating">生成中</option>
                                    <option value="completed">完了</option>
                                    <option value="failed">失敗</option>
                                  </Select>
                                  {audio.audioUrl && <AudioPlayer url={audio.audioUrl} />}
                                  {audio.audioUrl && (
                                    <button onClick={() => handleAudioDownload(audio, scene.order)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="ダウンロード">
                                      <Download size={12} />
                                    </button>
                                  )}
                                  {audioConfirmDeleteId === audio.id ? (
                                    <div className="flex items-center gap-1">
                                      <button className="text-xs text-red-600 font-medium px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100" onClick={() => handleAudioDelete(audio.id)}>削除</button>
                                      <button className="text-xs text-gray-400 hover:text-gray-600 px-1" onClick={() => setAudioConfirmDeleteId(null)}>✕</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setAudioConfirmDeleteId(audio.id)} className="p-1.5 rounded hover:bg-red-50 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" title="削除">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button onClick={() => setAddAudioScene(scene)} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                                  <Plus size={11} /> 音声を追加
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            Tab 3: 画像管理
        ──────────────────────────────────────────────────────── */}
        {tab === "images" && (
          <div className="max-w-4xl mx-auto space-y-4">
            {imagesLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : images.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">画像がありません</p>
                <p className="text-sm mt-1 mb-4">「キャラ画像を生成」からディズニー風キャラクター画像を作成できます</p>
                <Button size="sm" onClick={handleOpenCharDialog} className="bg-pink-600 hover:bg-pink-700">
                  <Smile size={14} /> キャラ画像を生成
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{images.length}件の画像</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="rounded-lg border border-gray-200 overflow-hidden bg-white group relative">
                      <div className="aspect-[9/16] max-h-52 bg-gray-100 relative">
                        {img.imageUrl ? (
                          <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {img.status === "generating" || img.status === "pending"
                              ? <Loader2 size={20} className="animate-spin text-gray-400" />
                              : <ImageIcon size={20} className="text-gray-300" />}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.imageUrl && (
                            <button onClick={() => handleImageDownload(img)} className="p-1.5 rounded bg-white/90 hover:bg-white text-gray-600 shadow-sm" title="ダウンロード">
                              <Download size={12} />
                            </button>
                          )}
                          {imgConfirmDeleteId === img.id ? (
                            <div className="flex items-center gap-1 bg-white/90 rounded px-1.5 py-1 shadow-sm">
                              <button className="text-xs text-red-600 font-medium hover:text-red-800" onClick={() => handleImageDelete(img.id)}>削除</button>
                              <button className="text-xs text-gray-400 hover:text-gray-600 ml-1" onClick={() => setImgConfirmDeleteId(null)}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setImgConfirmDeleteId(img.id)} className="p-1.5 rounded bg-white/90 hover:bg-red-50 text-red-400 hover:text-red-600 shadow-sm" title="削除">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 truncate">{img.title}</p>
                        {img.style && <p className="text-xs text-pink-500 mt-0.5">{img.style}</p>}
                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{img.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            Tab 4: 動画管理
        ──────────────────────────────────────────────────────── */}
        {tab === "videos" && (
          <div className="max-w-4xl mx-auto space-y-4">
            {videosLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Video size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">動画がありません</p>
                <p className="text-sm mt-1 mb-4">「動画を追加」から動画生成タスクを作成できます</p>
                <Button size="sm" onClick={() => setShowAddVideo(true)}><Plus size={14} /> 動画を追加</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{videos.length}件の動画</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {videos.map((vid) => (
                    <Card key={vid.id} className="overflow-hidden group">
                      <div className="aspect-video bg-gray-100 relative">
                        {vid.thumbnailUrl ? (
                          <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover" />
                        ) : vid.image?.imageUrl ? (
                          <img src={vid.image.imageUrl} alt={vid.title} className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video size={24} className="text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {vidConfirmDeleteId === vid.id ? (
                            <div className="flex items-center gap-1 bg-white/90 rounded px-1.5 py-1 shadow-sm">
                              <button className="text-xs text-red-600 font-medium" onClick={() => handleVideoDelete(vid.id)}>削除</button>
                              <button className="text-xs text-gray-400 ml-1" onClick={() => setVidConfirmDeleteId(null)}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setVidConfirmDeleteId(vid.id)} className="p-1.5 rounded bg-white/90 hover:bg-red-50 text-red-400 hover:text-red-600 shadow-sm" title="削除">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm text-gray-800 truncate">{vid.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={STATUS_COLORS[vid.status] ?? "bg-gray-100 text-gray-600"}>
                            {STATUS_LABELS[vid.status] ?? vid.status}
                          </Badge>
                          <span className="text-xs text-gray-400">{VIDEO_SERVICE_LABELS[vid.service] ?? vid.service}</span>
                        </div>
                        {vid.image && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><ImageIcon size={10} />{vid.image.title}</p>}
                        {vid.audio && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Music size={10} />{vid.audio.title}</p>}
                        {vid.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{vid.notes}</p>}
                        {vid.videoUrl && (
                          <a href={vid.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700">
                            <Play size={11} /> 動画を見る
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Dialogs ─────────────────────────────────────────────── */}

      {/* Learn dialog */}
      {script && (
        <LearnDialog
          open={showLearnDialog}
          onOpenChange={setShowLearnDialog}
          defaults={{ type: "script", title: script.title, topic: script.topic, hook: script.hook ?? "", outputSample: script.body ? script.body.slice(0, 300) : "", sourceId: script.id }}
        />
      )}

      {/* Add audio dialog */}
      {addAudioScene && (
        <AddAudioDialog
          open={!!addAudioScene}
          onOpenChange={(v) => { if (!v) setAddAudioScene(null); }}
          scriptId={id}
          sceneId={addAudioScene.id}
          sceneOrder={addAudioScene.order}
          sceneText={addAudioScene.text}
          scriptTitle={script.title}
          onSaved={() => { setAddAudioScene(null); loadAudio(); }}
        />
      )}

      {/* Character image dialog */}
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
              <Input value={charSubject} onChange={(e) => setCharSubject(e.target.value)} placeholder="例: 枕カバー、スマートフォン..." className="mt-1 text-sm" />
              <p className="text-xs text-gray-400 mt-1">キャラクター化したいモノを入力してください</p>
            </div>
            <div>
              <Label className="text-xs font-medium">表情</Label>
              <Input value={charExpression} onChange={(e) => setCharExpression(e.target.value)} placeholder="例: 笑顔、驚き、ウィンク..." className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium">背景</Label>
              <Input value={charBackground} onChange={(e) => setCharBackground(e.target.value)} placeholder="例: 白背景、パステルグラデーション..." className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium">その他の指定</Label>
              <Input value={charDetails} onChange={(e) => setCharDetails(e.target.value)} placeholder="例: 星のアクセサリー..." className="mt-1 text-sm" />
            </div>
            {charResult && (
              <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                <p className="text-xs font-medium text-pink-700 mb-1">生成されたプロンプト</p>
                <p className="text-xs text-gray-600 leading-relaxed">{charResult.prompt}</p>
                <button className="text-xs text-pink-500 mt-2 underline hover:text-pink-700" onClick={() => setCharResult(null)}>やり直す</button>
              </div>
            )}
            {charError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{charError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCharDialog(false)}>キャンセル</Button>
            {!charResult ? (
              <Button onClick={handleGenerateCharPrompt} disabled={charGenerating || !charSubject.trim()} className="bg-pink-600 hover:bg-pink-700">
                {charGenerating ? <><Loader2 size={14} className="animate-spin" /> 生成中...</> : <><Sparkles size={14} /> プロンプトを生成</>}
              </Button>
            ) : (
              <Button onClick={handleGenerateCharImage} disabled={charImaging} className="bg-pink-600 hover:bg-pink-700">
                {charImaging ? <><Loader2 size={14} className="animate-spin" /> 画像生成中...</> : <><ImageIcon size={14} /> 画像を生成</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add video dialog */}
      <Dialog open={showAddVideo} onOpenChange={(v) => { setShowAddVideo(v); if (!v) setVideoError(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Video size={14} className="text-indigo-500" />動画タスクを追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">タイトル <span className="text-red-400">*</span></Label>
              <Input value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} placeholder="動画タイトル" className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">生成サービス</Label>
              <Select value={videoForm.service} onChange={(e) => setVideoForm({ ...videoForm, service: e.target.value })}>
                {Object.entries(VIDEO_SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            {images.filter((img) => img.imageUrl).length > 0 && (
              <div>
                <Label className="text-xs">使用する画像（任意）</Label>
                <Select value={videoForm.imageId} onChange={(e) => setVideoForm({ ...videoForm, imageId: e.target.value })}>
                  <option value="">選択なし</option>
                  {images.filter((img) => img.imageUrl).map((img) => (
                    <option key={img.id} value={img.id}>{img.title}</option>
                  ))}
                </Select>
              </div>
            )}
            {audioAssets.length > 0 && (
              <div>
                <Label className="text-xs">使用する音声（任意）</Label>
                <Select value={videoForm.audioId} onChange={(e) => setVideoForm({ ...videoForm, audioId: e.target.value })}>
                  <option value="">選択なし</option>
                  {audioAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">動画URL（生成済みなら入力）</Label>
              <Input value={videoForm.videoUrl} onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })} placeholder="https://..." className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">メモ</Label>
              <Textarea value={videoForm.notes} onChange={(e) => setVideoForm({ ...videoForm, notes: e.target.value })} rows={2} className="text-sm" placeholder="補足情報..." />
            </div>
            {videoError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{videoError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddVideo(false)}>キャンセル</Button>
            <Button size="sm" onClick={handleAddVideo} disabled={videoSaving || !videoForm.title.trim()}>
              {videoSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} 追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
