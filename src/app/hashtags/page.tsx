"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Search,
  Hash,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  TrendingUp,
  Tag,
} from "lucide-react";

interface Hashtag {
  id: string;
  tag: string;
  category: string | null;
  platform: string | null;
  notes: string | null;
  usageCount: number;
  createdAt: string;
}

const CATEGORY_OPTIONS = ["エンタメ", "教育・解説", "ビジネス", "健康・美容", "ライフスタイル", "料理", "旅行", "その他"];
const PLATFORM_OPTIONS = ["TikTok", "YouTube", "Instagram", "全プラットフォーム"];
const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "bg-black text-white",
  YouTube: "bg-red-500 text-white",
  Instagram: "bg-pink-500 text-white",
  "全プラットフォーム": "bg-indigo-500 text-white",
};

export default function HashtagsPage() {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ tag: "", category: "", platform: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/hashtags");
      if (!res.ok) { setLoading(false); return; }
      setHashtags(await res.json());
    } catch (e) {
      console.error("[fetchData hashtags]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.tag) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAddDialog(false);
      setForm({ tag: "", category: "", platform: "", notes: "" });
      fetchData();
    } else {
      const d = await res.json();
      setError(d.error || "エラーが発生しました");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このタグを削除しますか？")) return;
    await fetch(`/api/hashtags/${id}`, { method: "DELETE" });
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    fetchData();
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      if (res.ok) {
        const d = await res.json();
        alert(`${d.added}件のハッシュタグをスキャンしました`);
        fetchData();
      }
    } catch (e) {
      console.error("[handleScan]", e);
    } finally {
      setScanning(false);
    }
  };

  const handleCopySelected = async () => {
    const tags = hashtags.filter((h) => selected.has(h.id)).map((h) => h.tag).join(" ");
    await navigator.clipboard.writeText(tags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = hashtags.filter((h) => {
    const matchSearch = !search || h.tag.toLowerCase().includes(search.toLowerCase()) || (h.notes ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || h.category === categoryFilter;
    const matchPlatform = !platformFilter || h.platform === platformFilter;
    return matchSearch && matchCat && matchPlatform;
  });

  return (
    <div className="flex-1">
      <Header
        title="ハッシュタグ管理"
        description="SNS投稿用ハッシュタグのライブラリ管理"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              台本からスキャン
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus size={14} /> タグを追加
            </Button>
          </div>
        }
      />
      <main className="p-6 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "登録タグ数", value: hashtags.length, color: "text-indigo-600" },
            { label: "カテゴリ数", value: new Set(hashtags.map((h) => h.category).filter(Boolean)).size, color: "text-emerald-600" },
            { label: "高使用率タグ", value: hashtags.filter((h) => h.usageCount >= 3).length, color: "text-orange-500" },
            { label: "選択中", value: selected.size, color: "text-purple-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters + actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="タグ検索..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-36">
            <option value="">全カテゴリ</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="w-40">
            <option value="">全プラットフォーム</option>
            {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleCopySelected}>
              {copied ? <><Check size={13} className="text-emerald-500" /> コピー済み</> : <><Copy size={13} /> {selected.size}件をコピー</>}
            </Button>
          )}
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setSelected(new Set())}>
              選択解除
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Hash size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">ハッシュタグがありません</p>
            <p className="text-sm mt-1">「タグを追加」または「台本からスキャン」で登録できます</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((h) => {
              const isSelected = selected.has(h.id);
              return (
                <Card
                  key={h.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-indigo-400 bg-indigo-50/30" : ""}`}
                  onClick={() => toggleSelect(h.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300"}`}>
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-sm font-bold text-indigo-700 truncate">{h.tag}</span>
                      </div>
                      <button
                        className="text-red-300 hover:text-red-500 flex-shrink-0 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {h.category && (
                        <Badge className="bg-gray-100 text-gray-600 text-xs"><Tag size={9} className="mr-0.5" />{h.category}</Badge>
                      )}
                      {h.platform && (
                        <Badge className={`${PLATFORM_COLORS[h.platform] ?? "bg-gray-200 text-gray-700"} text-xs`}>{h.platform}</Badge>
                      )}
                    </div>
                    {h.notes && <p className="text-xs text-gray-400 line-clamp-2 mb-2">{h.notes}</p>}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <TrendingUp size={10} />
                      <span>使用 {h.usageCount}回</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Selected hashtags preview bar */}
        {selected.size > 0 && (
          <div className="sticky bottom-4 bg-white border border-indigo-200 rounded-xl shadow-lg p-3 flex items-center gap-3">
            <Hash size={16} className="text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-gray-700 flex-1 truncate">
              {hashtags.filter((h) => selected.has(h.id)).map((h) => h.tag).join(" ")}
            </p>
            <Button size="sm" onClick={handleCopySelected}>
              {copied ? <><Check size={13} /> コピー済み</> : <><Copy size={13} /> コピー</>}
            </Button>
          </div>
        )}
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ハッシュタグを追加</DialogTitle>
            <DialogDescription>新しいハッシュタグをライブラリに登録します</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>タグ * （例: #ダイエット）</Label>
              <Input
                placeholder="#タグ名"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
              />
            </div>
            <div>
              <Label>カテゴリ</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">選択してください</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <Label>プラットフォーム</Label>
              <Select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="">選択してください</option>
                {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <div>
              <Label>メモ（任意）</Label>
              <Input placeholder="このタグの特徴・用途メモ" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setError(""); }}>キャンセル</Button>
            <Button onClick={handleAdd} disabled={!form.tag || saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
