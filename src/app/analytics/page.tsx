"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, TrendingUp, Heart, MessageCircle, Share2, Users, DollarSign, Eye, Loader2, Plus } from "lucide-react";
import { PLATFORM_LABELS, PLATFORM_COLORS, formatDateTime } from "@/lib/utils";

interface AnalyticsRecord {
  id: string;
  postScheduleId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  follows: number;
  revenue: number;
  updatedAt: string;
  postSchedule: { platform: string; title: string; scheduledAt: string; postedAt: string | null };
}

interface AnalyticsData {
  analytics: AnalyticsRecord[];
  totals: { views?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; follows?: number | null; revenue?: number | null };
  byPlatform: { platform: string; _sum: { views: number | null; likes: number | null; revenue: number | null } }[];
}

interface PostSchedule {
  id: string;
  title: string;
  platform: string;
  status: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [posts, setPosts] = useState<PostSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    postScheduleId: "", platform: "tiktok", views: "", likes: "", comments: "",
    shares: "", follows: "", reach: "", impressions: "", revenue: "",
  });

  const fetchData = useCallback(async () => {
    const [analyticsRes, postsRes] = await Promise.all([
      fetch("/api/analytics"),
      fetch("/api/schedule"),
    ]);
    setData(await analyticsRes.json());
    const postsData = await postsRes.json();
    setPosts(postsData.filter((p: PostSchedule) => p.status === "posted"));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.postScheduleId) return;
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        views: Number(form.views) || 0,
        likes: Number(form.likes) || 0,
        comments: Number(form.comments) || 0,
        shares: Number(form.shares) || 0,
        follows: Number(form.follows) || 0,
        reach: Number(form.reach) || 0,
        impressions: Number(form.impressions) || 0,
        revenue: Number(form.revenue) || 0,
      }),
    });
    setShowDialog(false);
    fetchData();
  };

  const totals = data?.totals || {};
  const analytics = data?.analytics || [];
  const byPlatform = data?.byPlatform || [];

  const statCards = [
    { label: "総再生数", value: (totals.views || 0).toLocaleString(), icon: Eye, color: "text-blue-600 bg-blue-50" },
    { label: "総いいね", value: (totals.likes || 0).toLocaleString(), icon: Heart, color: "text-pink-600 bg-pink-50" },
    { label: "コメント", value: (totals.comments || 0).toLocaleString(), icon: MessageCircle, color: "text-purple-600 bg-purple-50" },
    { label: "シェア", value: (totals.shares || 0).toLocaleString(), icon: Share2, color: "text-indigo-600 bg-indigo-50" },
    { label: "フォロワー増", value: (totals.follows || 0).toLocaleString(), icon: Users, color: "text-emerald-600 bg-emerald-50" },
    { label: "収益 (円)", value: `¥${((totals.revenue || 0) * 150).toLocaleString()}`, icon: DollarSign, color: "text-orange-600 bg-orange-50" },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <Header
        title="アナリティクス"
        description="動画パフォーマンスと収益追跡"
        actions={
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus size={14} /> データを入力
          </Button>
        }
      />
      <main className="p-6 space-y-6">
        {/* Total Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={18} />
                </div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By Platform */}
        {byPlatform.length > 0 && (
          <Card>
            <CardHeader><CardTitle>プラットフォーム別パフォーマンス</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {byPlatform.map((p) => (
                  <div key={p.platform} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-3 ${PLATFORM_COLORS[p.platform] || "bg-gray-100 text-gray-700"}`}>
                      {PLATFORM_LABELS[p.platform] || p.platform}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">再生数</span>
                        <span className="font-semibold">{(p._sum.views || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">いいね</span>
                        <span className="font-semibold">{(p._sum.likes || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">収益</span>
                        <span className="font-semibold text-green-600">${(p._sum.revenue || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>投稿別データ</CardTitle>
              <p className="text-xs text-gray-500">{analytics.length}件</p>
            </div>
          </CardHeader>
          <CardContent>
            {analytics.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">アナリティクスデータがありません</p>
                <p className="text-sm mt-1">「データを入力」から投稿済み動画のデータを記録してください</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">動画</th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">再生</th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">いいね</th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">コメント</th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">シェア</th>
                      <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500">フォロワー</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500">収益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((a) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 pr-4">
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-48">{a.postSchedule.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PLATFORM_COLORS[a.platform] || "bg-gray-100"}`}>
                                {PLATFORM_LABELS[a.platform] || a.platform}
                              </span>
                              {a.postSchedule.postedAt && (
                                <span className="text-xs text-gray-400">{formatDateTime(a.postSchedule.postedAt)}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-medium">{a.views.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-pink-600">{a.likes.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-purple-600">{a.comments.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-indigo-600">{a.shares.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-emerald-600">+{a.follows.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-medium text-orange-600">${a.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Data Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>アナリティクスデータを入力</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>投稿を選択 *</Label>
                <Select value={form.postScheduleId} onChange={(e) => {
                  const post = posts.find((p) => p.id === e.target.value);
                  setForm({ ...form, postScheduleId: e.target.value, platform: post?.platform || "tiktok" });
                }}>
                  <option value="">投稿を選択してください</option>
                  {posts.map((p) => <option key={p.id} value={p.id}>{p.title} ({PLATFORM_LABELS[p.platform] || p.platform})</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "views", label: "再生数" },
                { key: "likes", label: "いいね" },
                { key: "comments", label: "コメント" },
                { key: "shares", label: "シェア" },
                { key: "follows", label: "フォロワー増" },
                { key: "revenue", label: "収益 ($)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    step={key === "revenue" ? "0.01" : "1"}
                    placeholder="0"
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!form.postScheduleId}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
