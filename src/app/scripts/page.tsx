"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Sparkles,
  Search,
  FileText,
  Clock,
  ChevronRight,
  Trash2,
  Loader2,
  ImageIcon,
  Video,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
interface GeneratedScript {
  title: string;
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string;
  estimatedDuration: number;
  viralScore?: number;
  viralReason?: string;
  improvements?: string[];
  scenes: { text: string; visualNote: string; duration: number }[];
}

import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatDateTime,
  formatDuration,
} from "@/lib/utils";
import Link from "next/link";

interface Script {
  id: string;
  title: string;
  topic: string;
  status: string;
  duration: number | null;
  hashtags: string | null;
  createdAt: string;
  project: { title: string } | null;
  _count: { imageAssets: number; videoAssets: number };
  scenesWithNote: number;
  imageCompletedCount: number;
  videoCompletedCount: number;
}

interface Project {
  id: string;
  title: string;
}

export default function ScriptsPage() {
  const searchParams = useSearchParams();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  // ⑦ A/Bテスト結果
  const [abResult, setAbResult] = useState<{ variantA: GeneratedScript; variantB: GeneratedScript } | null>(null);
  const [savingVariant, setSavingVariant] = useState<"A" | "B" | null>(null);
  const [genError, setGenError] = useState("");

  const [newScript, setNewScript] = useState({ title: "", topic: "", projectId: "", status: "draft" });
  const [genForm, setGenForm] = useState({
    topic: "", genre: "", targetAudience: "", duration: "60", tone: "", keywords: "", projectId: "", abTest: false,
  });

  const fetchData = useCallback(async () => {
    const [scriptsRes, projectsRes] = await Promise.all([
      fetch("/api/scripts"),
      fetch("/api/projects"),
    ]);
    setScripts(await scriptsRes.json());
    setProjects(await projectsRes.json());
    setLoading(false);
  }, []);

  // プロジェクトページからの直接遷移 (?autoopen=generate&projectId=xxx)
  useEffect(() => {
    const autoopen = searchParams.get("autoopen");
    const projectId = searchParams.get("projectId");
    if (autoopen === "generate" && projectId) {
      setGenForm((f) => ({ ...f, projectId }));
      setGenError("");
      setGenerating(false);
      setShowGenerateDialog(true);
    }
  }, [searchParams]);

  // ⑨ テンプレートURLパラメータで自動プリフィル
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;
    fetch(`/api/templates`)
      .then((r) => r.json())
      .then((templates: Array<{ id: string; genre: string | null; targetAudience: string | null; duration: number; tone: string | null; keywords: string | null }>) => {
        const t = templates.find((t) => t.id === templateId);
        if (!t) return;
        setGenForm((f) => ({
          ...f,
          genre: t.genre ?? f.genre,
          targetAudience: t.targetAudience ?? f.targetAudience,
          duration: String(t.duration),
          tone: t.tone ?? f.tone,
          keywords: t.keywords ?? f.keywords,
        }));
        setGenError("");
        setGenerating(false);
        setShowGenerateDialog(true);
      });
  }, [searchParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newScript.title || !newScript.topic || !newScript.projectId) return;
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newScript),
    });
    setShowNewDialog(false);
    setNewScript({ title: "", topic: "", projectId: "", status: "draft" });
    fetchData();
  };

  const handleGenerate = async () => {
    if (!genForm.topic || !genForm.projectId) return;
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const data = await res.json().catch(() => ({ error: `サーバーエラー (${res.status})` }));
      if (!res.ok || data.error) {
        setGenError(data.error || "生成に失敗しました");
        return;
      }
      if (data.abTest) {
        setAbResult({ variantA: data.variantA, variantB: data.variantB });
        return;
      }
      setShowGenerateDialog(false);
      setGenForm({ topic: "", genre: "", targetAudience: "", duration: "60", tone: "", keywords: "", projectId: "", abTest: false });
      fetchData();
    } finally {
      setGenerating(false);
    }
  };

  // ⑦ A/Bの採用したバリアントを保存
  const handleSaveVariant = async (variant: "A" | "B") => {
    if (!abResult) return;
    setSavingVariant(variant);
    const g = variant === "A" ? abResult.variantA : abResult.variantB;
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: genForm.projectId,
        title: g.title,
        topic: genForm.topic,
        hook: g.hook,
        body: g.body,
        callToAction: g.callToAction,
        hashtags: g.hashtags,
        duration: g.estimatedDuration,
        status: "draft",
        aiModel: "claude-opus-4-7",
        scenes: g.scenes,
      }),
    });
    setSavingVariant(null);
    setAbResult(null);
    setShowGenerateDialog(false);
    setGenForm({ topic: "", genre: "", targetAudience: "", duration: "60", tone: "", keywords: "", projectId: "", abTest: false });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この台本を削除しますか？")) return;
    await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    fetchData();
  };

  const filtered = scripts.filter((s) => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.topic.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1">
      <Header
        title="台本・スクリプト"
        description="ショート動画の台本管理と生成"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setGenError(""); setGenerating(false); setShowGenerateDialog(true); }}>
              <Sparkles size={14} /> AI生成
            </Button>
            <Button size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus size={14} /> 新規作成
            </Button>
          </div>
        }
      />
      <main className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="タイトル・トピックで検索..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
            <option value="">すべてのステータス</option>
            <option value="draft">下書き</option>
            <option value="approved">承認済み</option>
            <option value="in_production">制作中</option>
            <option value="completed">完成</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">台本がありません</p>
            <p className="text-sm mt-1">「AI生成」または「新規作成」から台本を追加してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((script) => (
              <Card key={script.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/scripts/${script.id}`}>
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors leading-tight">
                          {script.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{script.topic}</p>
                    </div>
                    <Badge className={`${STATUS_COLORS[script.status]} flex-shrink-0`}>
                      {STATUS_LABELS[script.status]}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1 mb-3">
                    {script.project && (
                      <div className="flex items-center gap-1">
                        <FileText size={11} /> {script.project.title}
                      </div>
                    )}
                    {script.duration && (
                      <div className="flex items-center gap-1">
                        <Clock size={11} /> {formatDuration(script.duration)}
                      </div>
                    )}
                    <div className="text-gray-300">{formatDateTime(script.createdAt)}</div>
                  </div>

                  {script.hashtags && (
                    <p className="text-xs text-indigo-500 truncate mb-3">{script.hashtags}</p>
                  )}

                  {/* ③ 進捗バー */}
                  <div className="space-y-1.5 mb-3">
                    {/* 画像進捗 */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <ImageIcon size={10} />画像
                        </span>
                        <span className="text-xs text-gray-400">
                          {script.imageCompletedCount}/{script._count.imageAssets}
                          {script._count.imageAssets === 0 && script.scenesWithNote > 0 && (
                            <span className="text-yellow-500 ml-1">未追加</span>
                          )}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                        {script._count.imageAssets > 0 && (
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all"
                            style={{ width: `${(script.imageCompletedCount / script._count.imageAssets) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                    {/* 動画進捗 */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Video size={10} />動画
                        </span>
                        <span className="text-xs text-gray-400">
                          {script.videoCompletedCount}/{script._count.videoAssets}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                        {script._count.videoAssets > 0 && (
                          <div
                            className="h-full rounded-full bg-purple-400 transition-all"
                            style={{ width: `${(script.videoCompletedCount / script._count.videoAssets) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-300">{formatDateTime(script.createdAt)}</div>
                    <div className="flex gap-1">
                      <Link href={`/scripts/${script.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronRight size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(script.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Script Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>台本を新規作成</DialogTitle>
            <DialogDescription>手動で台本情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>プロジェクト *</Label>
              <Select value={newScript.projectId} onChange={(e) => setNewScript({ ...newScript, projectId: e.target.value })}>
                <option value="">プロジェクトを選択</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>タイトル *</Label>
              <Input placeholder="動画タイトル" value={newScript.title} onChange={(e) => setNewScript({ ...newScript, title: e.target.value })} />
            </div>
            <div>
              <Label>トピック *</Label>
              <Input placeholder="動画のテーマ・トピック" value={newScript.topic} onChange={(e) => setNewScript({ ...newScript, topic: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!newScript.title || !newScript.topic || !newScript.projectId}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ⑦ A/B Test Results Modal */}
      <Dialog open={!!abResult} onOpenChange={(open) => { if (!open) setAbResult(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              A/Bテスト結果 — バリアントを比較して採用する
            </DialogTitle>
            <DialogDescription>バイラルスコアと改善提案を参考に、採用する台本を選んでください</DialogDescription>
          </DialogHeader>
          {abResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {(["A", "B"] as const).map((variant) => {
                const g = variant === "A" ? abResult.variantA : abResult.variantB;
                const score = g.viralScore ?? 0;
                const scoreColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-yellow-600" : "text-red-500";
                const scoreBg = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
                return (
                  <div key={variant} className={`rounded-xl border-2 p-4 space-y-3 ${scoreBg}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Variant {variant}</span>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={14} className={scoreColor} />
                        <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="h-2 rounded-full bg-white/80 overflow-hidden border border-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    {/* Title & viral reason */}
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{g.title}</h3>
                      {g.viralReason && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{g.viralReason}"</p>
                      )}
                    </div>
                    {/* Hook */}
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">フック（冒頭3秒）</p>
                      <p className="text-sm text-gray-800">{g.hook}</p>
                    </div>
                    {/* Improvements */}
                    {g.improvements && g.improvements.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">改善提案</p>
                        <ul className="space-y-1">
                          {g.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <CheckCircle2 size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Hashtags */}
                    {g.hashtags && (
                      <p className="text-xs text-indigo-500 truncate">{g.hashtags}</p>
                    )}
                    {/* Adopt button */}
                    <Button
                      className="w-full mt-1"
                      onClick={() => handleSaveVariant(variant)}
                      disabled={savingVariant !== null}
                    >
                      {savingVariant === variant ? (
                        <><Loader2 size={14} className="animate-spin" /> 保存中...</>
                      ) : (
                        <>このバリアントを採用する</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAbResult(null)} disabled={savingVariant !== null}>
              キャンセル（破棄）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={(open) => { if (!open) { setGenError(""); setGenerating(false); } setShowGenerateDialog(open); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>AIで台本を生成</DialogTitle>
            <DialogDescription>条件を入力してClaude AIが台本を自動生成します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>プロジェクト *</Label>
              <Select value={genForm.projectId} onChange={(e) => setGenForm({ ...genForm, projectId: e.target.value })}>
                <option value="">プロジェクトを選択</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>トピック * （例：筋トレで痩せる方法）</Label>
              <Input placeholder="動画のテーマ・トピック" value={genForm.topic} onChange={(e) => setGenForm({ ...genForm, topic: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ジャンル</Label>
                <Select value={genForm.genre} onChange={(e) => setGenForm({ ...genForm, genre: e.target.value })}>
                  <option value="">選択してください</option>
                  <option value="教育・解説">教育・解説</option>
                  <option value="エンタメ">エンタメ</option>
                  <option value="商品紹介">商品紹介</option>
                  <option value="ライフスタイル">ライフスタイル</option>
                  <option value="ビジネス・お金">ビジネス・お金</option>
                  <option value="健康・美容">健康・美容</option>
                  <option value="料理・グルメ">料理・グルメ</option>
                  <option value="旅行">旅行</option>
                </Select>
              </div>
              <div>
                <Label>動画尺（秒）</Label>
                <Select value={genForm.duration} onChange={(e) => setGenForm({ ...genForm, duration: e.target.value })}>
                  <option value="30">30秒</option>
                  <option value="60">60秒</option>
                  <option value="90">90秒</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>ターゲット層</Label>
              <Input placeholder="例：20〜35歳の働く女性" value={genForm.targetAudience} onChange={(e) => setGenForm({ ...genForm, targetAudience: e.target.value })} />
            </div>
            <div>
              <Label>トーン・スタイル</Label>
              <Input placeholder="例：テンポ良く、親しみやすく" value={genForm.tone} onChange={(e) => setGenForm({ ...genForm, tone: e.target.value })} />
            </div>
            <div>
              <Label>キーワード（任意）</Label>
              <Input placeholder="例：筋トレ,ダイエット,初心者" value={genForm.keywords} onChange={(e) => setGenForm({ ...genForm, keywords: e.target.value })} />
            </div>
            {/* A/Bテストトグル */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 cursor-pointer hover:bg-indigo-50 transition-colors">
              <input
                type="checkbox"
                checked={genForm.abTest}
                onChange={(e) => setGenForm({ ...genForm, abTest: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <div>
                <p className="text-sm font-medium text-indigo-900">A/Bテストモード</p>
                <p className="text-xs text-indigo-600">2パターンを同時生成してバイラルスコアで比較できます</p>
              </div>
              <TrendingUp size={18} className="ml-auto text-indigo-400 flex-shrink-0" />
            </label>
          </div>
          {genError && (
            <div className="mx-1 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 leading-relaxed">
              {genError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowGenerateDialog(false); setGenError(""); }}>キャンセル</Button>
            <Button onClick={handleGenerate} disabled={!genForm.topic || !genForm.projectId || generating}>
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> {genForm.abTest ? "2パターン生成中..." : "生成中..."}</>
              ) : (
                <><Sparkles size={14} /> {genForm.abTest ? "A/B生成する" : "生成する"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
