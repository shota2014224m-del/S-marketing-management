import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FileText, ImageIcon, Video, Calendar, TrendingUp,
  ArrowRight, Clock, CheckCircle2, AlertCircle,
  Zap, Loader, TriangleAlert,
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS,
  PLATFORM_LABELS, formatDateTime,
} from "@/lib/utils";
import { RevenueTracker } from "@/components/revenue/revenue-tracker";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const [
    scriptCount, imageCount, videoCount,
    recentScripts, pendingTasks, upcomingPosts, analyticsTotal,
    // ④ 今日やること用データ
    urgentTasks, overdueTasksCount, generatingVideos,
    pendingImages, todayPosts,
  ] = await Promise.all([
    prisma.script.count(),
    prisma.imageAsset.count(),
    prisma.videoAsset.count(),
    prisma.script.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { project: { select: { title: true } } },
    }),
    prisma.scheduleTask.findMany({
      where: { status: { not: "done" } },
      take: 5,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.postSchedule.findMany({
      where: { status: "scheduled", scheduledAt: { gte: new Date() } },
      take: 6,
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.analytics.aggregate({
      _sum: { views: true, likes: true, revenue: true },
    }),
    // 期限が3日以内の未完了タスク
    prisma.scheduleTask.findMany({
      where: { status: { not: "done" }, dueDate: { gte: today, lte: threeDaysLater } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // 期限切れタスク数
    prisma.scheduleTask.count({
      where: { status: { not: "done" }, dueDate: { lt: today } },
    }),
    // 生成中の動画
    prisma.videoAsset.findMany({
      where: { status: "generating" },
      include: { script: { select: { title: true } } },
      take: 3,
    }),
    // 待機中の画像
    prisma.imageAsset.count({ where: { status: "pending" } }),
    // 今日の投稿予定
    prisma.postSchedule.findMany({
      where: { status: "scheduled", scheduledAt: { gte: today, lt: tomorrow } },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  return {
    scriptCount, imageCount, videoCount,
    recentScripts, pendingTasks, upcomingPosts, analyticsTotal,
    urgentTasks, overdueTasksCount, generatingVideos, pendingImages, todayPosts,
  };
}

export default async function DashboardPage() {
  const {
    scriptCount, imageCount, videoCount,
    recentScripts, pendingTasks, upcomingPosts, analyticsTotal,
    urgentTasks, overdueTasksCount, generatingVideos, pendingImages, todayPosts,
  } = await getDashboardData();

  const stats = [
    { label: "台本数", value: scriptCount, icon: FileText, href: "/scripts", color: "text-indigo-600 bg-indigo-50" },
    { label: "画像アセット", value: imageCount, icon: ImageIcon, href: "/images", color: "text-emerald-600 bg-emerald-50" },
    { label: "動画アセット", value: videoCount, icon: Video, href: "/videos", color: "text-purple-600 bg-purple-50" },
    { label: "総再生数", value: (analyticsTotal._sum.views || 0).toLocaleString(), icon: TrendingUp, href: "/analytics", color: "text-orange-600 bg-orange-50" },
  ];

  // ④ アラートアイテムを生成
  const alerts: { type: "error" | "warning" | "info"; label: string; href: string }[] = [];
  if (overdueTasksCount > 0)
    alerts.push({ type: "error", label: `期限切れのタスクが ${overdueTasksCount} 件あります`, href: "/schedule" });
  if (generatingVideos.length > 0)
    alerts.push({ type: "info", label: `動画を生成中: ${generatingVideos.map((v) => v.script?.title || v.title).join("、")}`, href: "/videos" });
  if (pendingImages > 0)
    alerts.push({ type: "warning", label: `待機中の画像が ${pendingImages} 件あります`, href: "/images" });
  if (todayPosts.length > 0)
    alerts.push({ type: "warning", label: `今日の投稿予定が ${todayPosts.length} 件あります`, href: "/schedule" });

  return (
    <div className="flex-1">
      <Header title="ダッシュボード" description="SNS動画マネジメントシステム" />
      <main className="p-6 space-y-6">

        {/* ④ 今日やること */}
        {(alerts.length > 0 || urgentTasks.length > 0 || todayPosts.length > 0) && (
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Zap size={16} className="fill-indigo-500 text-indigo-500" />
                今日やること
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* アラート */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  {alerts.map((alert, i) => (
                    <Link key={i} href={alert.href}>
                      <div className={`flex items-center gap-2.5 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                        alert.type === "error"
                          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                          : alert.type === "warning"
                          ? "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                      }`}>
                        {alert.type === "error" && <TriangleAlert size={14} className="flex-shrink-0" />}
                        {alert.type === "warning" && <AlertCircle size={14} className="flex-shrink-0" />}
                        {alert.type === "info" && <Loader size={14} className="flex-shrink-0 animate-spin" />}
                        <span className="flex-1">{alert.label}</span>
                        <ArrowRight size={12} className="flex-shrink-0 opacity-60" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* 期限が近いタスク */}
              {urgentTasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">期限が近いタスク</p>
                  <div className="space-y-1.5">
                    {urgentTasks.map((task) => (
                      <Link key={task.id} href="/schedule">
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all group">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            task.priority === "urgent" ? "bg-red-500" :
                            task.priority === "high" ? "bg-orange-400" : "bg-blue-400"
                          }`} />
                          <p className="text-sm text-gray-800 flex-1 group-hover:text-indigo-600 transition-colors">{task.title}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge className={`${PRIORITY_COLORS[task.priority]} text-xs`}>{PRIORITY_LABELS[task.priority]}</Badge>
                            {task.dueDate && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Clock size={10} />
                                {new Date(task.dueDate).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 今日の投稿 */}
              {todayPosts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">今日の投稿予定</p>
                  <div className="flex flex-wrap gap-2">
                    {todayPosts.map((post) => (
                      <Link key={post.id} href="/schedule">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all text-sm">
                          <Calendar size={12} className="text-indigo-500" />
                          <span className="font-medium text-gray-800">{post.title}</span>
                          <span className="text-xs text-gray-400">{PLATFORM_LABELS[post.platform] || post.platform}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(post.scheduledAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {alerts.length === 0 && urgentTasks.length === 0 && todayPosts.length === 0 && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">今日のタスクはすべて完了しています！</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, href, color }) => (
            <Link key={label} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">{label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${color}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Scripts */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>最近の台本</CardTitle>
                <Link href="/scripts" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  すべて見る <ArrowRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentScripts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">台本がまだありません</p>
                  <Link href="/scripts" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">台本を作成する</Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentScripts.map((script) => (
                    <Link key={script.id} href={`/scripts/${script.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                            {script.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {script.project?.title} · {formatDateTime(script.createdAt)}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[script.status]}>{STATUS_LABELS[script.status]}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: tasks + revenue */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>未完了タスク</CardTitle>
                  <Link href="/schedule" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    すべて <ArrowRight size={12} />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <CheckCircle2 size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">すべて完了！</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 leading-tight">{task.title}</p>
                          {task.dueDate && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock size={10} />
                              {formatDateTime(task.dueDate)}
                            </p>
                          )}
                        </div>
                        <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* ⑩ 収益目標トラッカー */}
            <RevenueTracker />
          </div>
        </div>

        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>今後の投稿予定</CardTitle>
              <Link href="/schedule" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                カレンダーを見る <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">予定された投稿がありません</p>
                <Link href="/schedule" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                  スケジュールを追加する
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                      <p className="text-xs text-gray-500">{post.platform} · {formatDateTime(post.scheduledAt)}</p>
                    </div>
                    <AlertCircle size={14} className="text-orange-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
