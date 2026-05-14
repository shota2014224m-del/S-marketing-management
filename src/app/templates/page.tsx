"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  LayoutTemplate,
  Trash2,
  Clock,
  Target,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  genre: string | null;
  targetAudience: string | null;
  duration: number;
  tone: string | null;
  keywords: string | null;
  structure: string | null;
  hookTemplate: string | null;
  ctaTemplate: string | null;
  notes: string | null;
  usageCount: number;
  createdAt: string;
}

const GENRE_OPTIONS = ["教育・解説", "エンタメ", "商品紹介", "ライフスタイル", "ビジネス・お金", "健康・美容", "料理・グルメ", "旅行"];

const EMPTY_FORM = {
  name: "", genre: "", targetAudience: "", duration: "60",
  tone: "", keywords: "", structure: "", hookTemplate: "", ctaTemplate: "", notes: "",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/templates");
    setTemplates(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (t: Template) => {
    setEditTarget(t);
    setForm({
      name: t.name, genre: t.genre ?? "", targetAudience: t.targetAudience ?? "",
      duration: String(t.duration), tone: t.tone ?? "", keywords: t.keywords ?? "",
      structure: t.structure ?? "", hookTemplate: t.hookTemplate ?? "",
      ctaTemplate: t.ctaTemplate ?? "", notes: t.notes ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload = { ...form, duration: Number(form.duration) };
    if (editTarget) {
      await fetch(`/api/templates/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowDialog(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このテンプレートを削除しますか？")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleCopy = async (t: Template) => {
    const text = [
      t.genre && `ジャンル: ${t.genre}`,
      t.targetAudience && `対象: ${t.targetAudience}`,
      `尺: ${t.duration}秒`,
      t.tone && `トーン: ${t.tone}`,
      t.keywords && `KW: ${t.keywords}`,
      t.hookTemplate && `フック: ${t.hookTemplate}`,
      t.ctaTemplate && `CTA: ${t.ctaTemplate}`,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1">
      <Header
        title="動画テンプレート"
        description="台本生成に再利用できる設定テンプレートを管理"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> テンプレート作成
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {/* hint banner */}
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <Sparkles size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-indigo-700">
            テンプレートを作成すると、台本生成ダイアログで設定を一括読み込みできます。
            ジャンル・ターゲット・フックの型・CTAなどを保存して効率化しましょう。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <LayoutTemplate size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">テンプレートがありません</p>
            <p className="text-sm mt-1">「テンプレート作成」からよく使う設定を登録してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {t.genre && <Badge className="bg-indigo-50 text-indigo-600 text-xs">{t.genre}</Badge>}
                        <Badge className="bg-gray-100 text-gray-500 text-xs flex items-center gap-0.5">
                          <Clock size={9} />{t.duration}秒
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(t)}>
                        {copiedId === t.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <ChevronRight size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    {t.targetAudience && (
                      <div className="flex items-center gap-1.5">
                        <Target size={11} className="flex-shrink-0" />
                        <span className="truncate">{t.targetAudience}</span>
                      </div>
                    )}
                    {t.tone && (
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={11} className="flex-shrink-0" />
                        <span className="truncate">{t.tone}</span>
                      </div>
                    )}
                    {t.hookTemplate && (
                      <div className="bg-amber-50 rounded p-2 mt-1">
                        <p className="text-amber-700 font-medium text-xs mb-0.5">フックテンプレ</p>
                        <p className="text-amber-600 line-clamp-2">{t.hookTemplate}</p>
                      </div>
                    )}
                    {t.keywords && (
                      <p className="text-indigo-400 truncate">{t.keywords}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-300">使用 {t.usageCount}回</span>
                    <Link href={`/scripts?template=${t.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        <Sparkles size={11} /> このテンプレで生成
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "テンプレートを編集" : "テンプレートを作成"}</DialogTitle>
            <DialogDescription>台本生成で使い回せる設定を保存します</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>テンプレート名 *</Label>
              <Input placeholder="例：健康系・教育動画60秒" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ジャンル</Label>
                <Select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
                  <option value="">選択してください</option>
                  {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </div>
              <div>
                <Label>動画尺（秒）</Label>
                <Select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                  <option value="30">30秒</option>
                  <option value="60">60秒</option>
                  <option value="90">90秒</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>ターゲット層</Label>
              <Input placeholder="例：20〜35歳の働く女性" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
            </div>
            <div>
              <Label>トーン・スタイル</Label>
              <Input placeholder="例：テンポ良く、親しみやすく" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
            </div>
            <div>
              <Label>デフォルトキーワード</Label>
              <Input placeholder="例：筋トレ,ダイエット,初心者" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
            </div>
            <div>
              <Label>フックテンプレート</Label>
              <Textarea
                placeholder="例：「〇〇を知らずに△△しているあなたへ」"
                value={form.hookTemplate}
                onChange={(e) => setForm({ ...form, hookTemplate: e.target.value })}
                className="h-20 text-sm"
              />
            </div>
            <div>
              <Label>CTAテンプレート</Label>
              <Input placeholder="例：フォロー＆保存で後から見返せます！" value={form.ctaTemplate} onChange={(e) => setForm({ ...form, ctaTemplate: e.target.value })} />
            </div>
            <div>
              <Label>構成メモ（任意）</Label>
              <Textarea
                placeholder="例：①問題提起→②共感→③解決策×3→④まとめ→⑤CTA"
                value={form.structure}
                onChange={(e) => setForm({ ...form, structure: e.target.value })}
                className="h-20 text-sm"
              />
            </div>
            <div>
              <Label>その他メモ</Label>
              <Input placeholder="このテンプレの用途・注意点など" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={!form.name || saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {editTarget ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
