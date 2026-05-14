import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FileText,
  ImageIcon,
  Video,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  formatDateTime,
} from "@/lib/utils";

async function getDashboardData() {
  const [
    scriptCount,
    imageCount,
    videoCount,
    recentScripts,
    pendingTasks,
    upcomingPosts,
    analyticsTotal,
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
  ]);
  return {
    scriptCount,
    imageCount,
    videoCount,
    recentScripts,
    pendingTasks,
    upcomingPosts,
    analyticsTotal,
  };
}

export default async function DashboardPage() {
  const {
    scriptCount,
    imageCount,
    videoCount,
    recentScripts,
    pendingTasks,
    upcomingPosts,
    analyticsTotal,
  } = await getDashboardData();

  const stats = [
    {
      label: "台本数",
      value: scriptCount,
      icon: FileText,
      href: "/scripts",
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "画像アセット",
      value: imageCount,
      icon: ImageIcon,
      href: "/images",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "動画アセット",
      value: videoCount,
      icon: Video,
      href: "/videos",
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "総再生数",
      value: (analyticsTotal._sum.views || 0).toLocaleString(),
      icon: TrendingUp,
      href: "/analytics",
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div className="flex-1">
      <Header
        title="ダッシュボード"
        description="SNS動画マネジメントシステム"
      />
      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, href, color }) => (
            <Link key={label} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        {label}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {value}
                      </p>
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
                <Link
                  href="/scripts"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  すべて見る <ArrowRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentScripts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">台本がまだありません</p>
                  <Link
                    href="/scripts"
                    className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                  >
                    台本を作成する
                  </Link>
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
                            {script.project?.title} ·{" "}
                            {formatDateTime(script.createdAt)}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[script.status]}>
                          {STATUS_LABELS[script.status]}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>未完了タスク</CardTitle>
                <Link
                  href="/schedule"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
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
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-tight">
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDateTime(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <Badge className={PRIORITY_COLORS[task.priority]}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>今後の投稿予定</CardTitle>
              <Link
                href="/schedule"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                カレンダーを見る <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">予定された投稿がありません</p>
                <Link
                  href="/schedule"
                  className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                >
                  スケジュールを追加する
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {post.platform} · {formatDateTime(post.scheduledAt)}
                      </p>
                    </div>
                    <AlertCircle
                      size={14}
                      className="text-orange-400 flex-shrink-0"
                    />
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
