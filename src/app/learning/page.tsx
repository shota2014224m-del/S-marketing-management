"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  BookOpen, Loader2, Search, Trash2, TrendingUp, FileText,
  ImageIcon, Video, FolderOpen, Hash, Sparkles,
} from "lucide-react";

interface Pattern {
  id: string;
  type: string;
  title: string;
  topic: string | null;
  genre: string | null;
  keywords: string | null;
  viralScore: number | null;
  hook: string | null;
  structure: string | null;
  learnings: string | null;
  outputSample: string | null;
  obsidianPath: string | null;
  usageCount: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size: number; className?: string }>; color: string; bg: string }> = {
  script: { label: "台本", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  image: { label: "画像", icon: ImageIcon, color: "text-emerald-600", bg: "bg-emerald-50" },
  video: { label: "動画", icon: Video, color: "text-purple-600", bg: "bg-purple-50" },
};

export default function LearningPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/learning");
      if (!res.ok) {
        console.error("[fetchData] API error:", res.status);
        setLoading(false);
        return;
      }
      setPatterns(await res.json());
    } catch (e) {
      console.error("[fetchData] failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("このパターンを削除しますか？Obsidianのファイルも削除されます。")) return;
    await fetch(`/api/learning/${id}`, { method: "DELETE" });
    fetchData();
  };

  const filtered = patterns.filter((p) => {
    const matchSearch = !search || [p.title, p.topic, p.genre, p.keywords, p.learnings].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchType = !typeFilter || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const stats = {
    script: patterns.filter((p) => p.type === "script").length,
    image: patterns.filter((p) => p.type === "image").length,
    video: patterns.filter((p) => p.type === "video").length,
    obsidian: patterns.filter((p) => p.obsidianPath).length,
  };

  return (
    <div className="flex-1">
      <Header
        title="学習ナレッジ"
        description="AIが参照する学習済みパターンライブラリ"
      />
      <main className="p-6 space-y-5">
        {/* How it works banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
          <Sparkles size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-indigo-800 space-y-0.5">
            <p className="font-semibold">学習システムの仕組み</p>
            <p className="text-indigo-600">台本・画像・動画の詳細ページで「学習する」を押すと、このライブラリに蓄積されます。次回AI生成時に関連パターンが自動的にプロンプトに注入され、過去の成功体験を再現します。</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "台本パターン", value: stats.script, icon: FileText, color: "text-indigo-600" },
            { label: "画像パターン", value: stats.image, icon: ImageIcon, color: "text-emerald-600" },
            { label: "動画パターン", value: stats.video, icon: Video, color: "text-purple-600" },
            { label: "Obsidian同期済", value: stats.obsidian, icon: FolderOpen, color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon size={18} className={`${color} flex-shrink-0`} />
                <div>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="タイトル・キーワードで検索..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-32">
            <option value="">すべて</option>
            <option value="script">台本</option>
            <option value="image">画像</option>
            <option value="video">動画</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">学習済みパターンがありません</p>
            <p className="text-sm mt-1">台本・画像・動画の詳細ページで「学習する」ボタンを押してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.script;
              const Icon = cfg.icon;
              const isExpanded = expanded === p.id;
              return (
                <Card key={p.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0`}>
                        <Icon size={16} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{p.title}</h3>
                          <Badge className={`${cfg.bg} ${cfg.color} text-xs`}>{cfg.label}</Badge>
                          {p.genre && <Badge className="bg-gray-100 text-gray-600 text-xs">{p.genre}</Badge>}
                          {p.viralScore && (
                            <Badge className="bg-orange-50 text-orange-600 text-xs flex items-center gap-0.5">
                              <TrendingUp size={9} />{p.viralScore}
                            </Badge>
                          )}
                          {p.obsidianPath && (
                            <Badge className="bg-green-50 text-green-600 text-xs flex items-center gap-0.5">
                              <FolderOpen size={9} />Obsidian
                            </Badge>
                          )}
                        </div>

                        {p.learnings && (
                          <p className={`text-xs text-gray-600 ${isExpanded ? "" : "line-clamp-2"} leading-relaxed`}>
                            <span className="font-medium text-indigo-600">なぜ機能したか: </span>{p.learnings}
                          </p>
                        )}

                        {isExpanded && (
                          <div className="mt-3 space-y-2 text-xs text-gray-600">
                            {p.hook && (
                              <div className="bg-amber-50 rounded p-2">
                                <p className="font-medium text-amber-700 mb-0.5">フックパターン</p>
                                <p>{p.hook}</p>
                              </div>
                            )}
                            {p.structure && (
                              <div className="bg-blue-50 rounded p-2">
                                <p className="font-medium text-blue-700 mb-0.5">構成パターン</p>
                                <p>{p.structure}</p>
                              </div>
                            )}
                            {p.outputSample && (
                              <div className="bg-gray-50 rounded p-2">
                                <p className="font-medium text-gray-700 mb-0.5">出力サンプル</p>
                                <p className="whitespace-pre-wrap">{p.outputSample}</p>
                              </div>
                            )}
                            {p.keywords && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.keywords.split(/[,\s]+/).filter(Boolean).map((k) => (
                                  <span key={k} className="flex items-center gap-0.5 text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">
                                    <Hash size={9} />{k}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-gray-400 flex items-center gap-1">
                              <TrendingUp size={10} /> 生成時に参照済み {p.usageCount}回
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            className="text-xs text-indigo-500 hover:text-indigo-700"
                            onClick={() => setExpanded(isExpanded ? null : p.id)}
                          >
                            {isExpanded ? "折りたたむ" : "詳細を見る"}
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 flex-shrink-0"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
