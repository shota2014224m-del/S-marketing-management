"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Loader2, Trash2, Calendar, Clock, CalendarDays,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { KanbanBoard } from "@/components/schedule/kanban-board";
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  PLATFORM_LABELS, PLATFORM_COLORS, formatDateTime,
} from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  tags: string | null;
  project: { title: string } | null;
}

interface PostSchedule {
  id: string;
  platform: string;
  title: string;
  caption: string | null;
  hashtags: string | null;
  scheduledAt: string;
  status: string;
  project: { title: string } | null;
  video: { title: string } | null;
}

interface Project { id: string; title: string; }
interface VideoAsset { id: string; title: string; }

const TASK_COLUMNS = [
  { key: "todo", label: "未着手", color: "border-gray-300" },
  { key: "in_progress", label: "進行中", color: "border-blue-400" },
  { key: "review", label: "レビュー", color: "border-orange-400" },
  { key: "done", label: "完了", color: "border-green-400" },
];

const CATEGORY_OPTIONS = ["script", "image", "video", "post", "research", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  script: "台本", image: "画像", video: "動画", post: "投稿", research: "リサーチ", other: "その他",
};

// ⑤ カレンダーコンポーネント
function MonthCalendar({ posts }: { posts: PostSchedule[] }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 日付ごとに投稿をグループ化
  const postsByDay: Record<number, PostSchedule[]> = {};
  for (const post of posts) {
    const d = new Date(post.scheduledAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(post);
    }
  }

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const platformDotColor: Record<string, string> = {
    tiktok: "bg-gray-900",
    youtube: "bg-red-500",
    instagram: "bg-pink-500",
    twitter: "bg-sky-500",
  };

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-base font-semibold text-gray-800">
          {year}年 {month + 1}月
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-px">
        {weekdays.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-1.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="bg-gray-50 min-h-[80px]" />;
          const cellDate = new Date(year, month, day);
          cellDate.setHours(0, 0, 0, 0);
          const isToday = cellDate.getTime() === today.getTime();
          const dayPosts = postsByDay[day] || [];
          const isSun = i % 7 === 0;
          const isSat = i % 7 === 6;

          return (
            <div
              key={day}
              className={`bg-white min-h-[80px] p-1.5 ${isToday ? "ring-2 ring-inset ring-indigo-400" : ""}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                isToday ? "bg-indigo-600 text-white" :
                isSun ? "text-red-400" :
                isSat ? "text-blue-400" :
                "text-gray-700"
              }`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    title={`${post.title} (${PLATFORM_LABELS[post.platform] || post.platform})`}
                    className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${
                      post.status === "posted" ? "bg-green-50 text-green-700" :
                      post.status === "cancelled" ? "bg-gray-100 text-gray-400 line-through" :
                      "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${platformDotColor[post.platform] || "bg-gray-400"}`} />
                    <span className="truncate">{post.title}</span>
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-xs text-gray-400 px-1">+{dayPosts.length - 3}件</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
        {Object.entries({ tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram", twitter: "X" }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${platformDotColor[k]}`} />
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [posts, setPosts] = useState<PostSchedule[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"kanban" | "calendar" | "list">("kanban");
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "", description: "", status: "todo", priority: "medium",
    category: "", dueDate: "", tags: "", projectId: "",
  });
  const [postForm, setPostForm] = useState({
    platform: "tiktok", title: "", caption: "", hashtags: "",
    scheduledAt: "", notes: "", projectId: "", videoId: "",
  });

  const fetchData = useCallback(async () => {
    const [taskRes, postRes, projRes, vidRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/schedule"),
      fetch("/api/projects"),
      fetch("/api/videos"),
    ]);
    setTasks(await taskRes.json());
    setPosts(await postRes.json());
    setProjects(await projRes.json());
    setVideos(await vidRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTaskCreate = async () => {
    if (!taskForm.title) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, projectId: taskForm.projectId || null, dueDate: taskForm.dueDate || null }),
    });
    setShowTaskDialog(false);
    setTaskForm({ title: "", description: "", status: "todo", priority: "medium", category: "", dueDate: "", tags: "", projectId: "" });
    fetchData();
  };

  const handlePostCreate = async () => {
    if (!postForm.title || !postForm.scheduledAt) return;
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...postForm, projectId: postForm.projectId || null, videoId: postForm.videoId || null }),
    });
    setShowPostDialog(false);
    setPostForm({ platform: "tiktok", title: "", caption: "", hashtags: "", scheduledAt: "", notes: "", projectId: "", videoId: "" });
    fetchData();
  };

  const handleTaskStatusChange = async (id: string, status: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleTaskDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handlePostDelete = async (id: string) => {
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handlePostStatusChange = async (id: string, status: string) => {
    await fetch(`/api/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

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
        title="スケジュール管理"
        description="タスクのカンバンボードと投稿スケジュール"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPostDialog(true)}>
              <Calendar size={14} /> 投稿を予約
            </Button>
            <Button size="sm" onClick={() => setShowTaskDialog(true)}>
              <Plus size={14} /> タスク追加
            </Button>
          </div>
        }
      />
      <main className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: "kanban", label: "カンバン" },
            { key: "calendar", label: "カレンダー" },
            { key: "list", label: "投稿リスト" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab(key as typeof activeTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ===== ⑥ KANBAN (Drag & Drop) ===== */}
        {activeTab === "kanban" && (
          <KanbanBoard
            tasks={tasks}
            onDelete={handleTaskDelete}
            onStatusChange={handleTaskStatusChange}
            onAddTask={(status) => { setTaskForm({ ...taskForm, status }); setShowTaskDialog(true); }}
          />
        )}

        {/* ===== ⑤ CALENDAR ===== */}
        {activeTab === "calendar" && (
          <Card>
            <CardContent className="p-5">
              <MonthCalendar posts={posts} />
            </CardContent>
          </Card>
        )}

        {/* ===== LIST ===== */}
        {activeTab === "list" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              {["scheduled", "posted", "failed", "cancelled"].map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`font-bold ${STATUS_COLORS[status].split(" ")[1]}`}>
                    {posts.filter((p) => p.status === status).length}
                  </span>
                  <span className="text-gray-400">{STATUS_LABELS[status]}</span>
                </div>
              ))}
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">投稿スケジュールがありません</p>
                <p className="text-sm mt-1">「投稿を予約」から投稿予定を追加してください</p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <Card key={post.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`px-2 py-1 rounded text-xs font-bold ${PLATFORM_COLORS[post.platform] || "bg-gray-100 text-gray-700"}`}>
                            {PLATFORM_LABELS[post.platform] || post.platform}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                            {post.project && <p className="text-xs text-indigo-500">{post.project.title}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar size={10} />{formatDateTime(post.scheduledAt)}
                            </p>
                            {post.video && <p className="text-xs text-gray-400">{post.video.title}</p>}
                          </div>
                          <Badge className={STATUS_COLORS[post.status]}>{STATUS_LABELS[post.status]}</Badge>
                          <Select value={post.status} onChange={(e) => handlePostStatusChange(post.id, e.target.value)} className="h-7 text-xs w-28">
                            <option value="scheduled">予約済み</option>
                            <option value="posted">投稿済み</option>
                            <option value="failed">失敗</option>
                            <option value="cancelled">キャンセル</option>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handlePostDelete(post.id)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      {post.hashtags && (
                        <p className="text-xs text-indigo-400 mt-2 truncate">{post.hashtags}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>タスクを追加</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>タイトル *</Label>
              <Input placeholder="タスクのタイトル" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div>
              <Label>説明</Label>
              <Textarea placeholder="詳細説明..." value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ステータス</Label>
                <Select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                  {TASK_COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </Select>
              </div>
              <div>
                <Label>優先度</Label>
                <Select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">緊急</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>カテゴリ</Label>
                <Select value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}>
                  <option value="">なし</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </Select>
              </div>
              <div>
                <Label>期限</Label>
                <Input type="datetime-local" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>プロジェクト</Label>
              <Select value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}>
                <option value="">なし</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>タグ（カンマ区切り）</Label>
              <Input placeholder="TikTok,緊急,月曜" value={taskForm.tags} onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>キャンセル</Button>
            <Button onClick={handleTaskCreate} disabled={!taskForm.title}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Schedule Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>投稿を予約</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>プラットフォーム</Label>
                <Select value={postForm.platform} onChange={(e) => setPostForm({ ...postForm, platform: e.target.value })}>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube Shorts</option>
                  <option value="instagram">Instagram Reels</option>
                  <option value="twitter">X (Twitter)</option>
                </Select>
              </div>
              <div>
                <Label>投稿予定日時 *</Label>
                <Input type="datetime-local" value={postForm.scheduledAt} onChange={(e) => setPostForm({ ...postForm, scheduledAt: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>タイトル *</Label>
              <Input placeholder="投稿タイトル・管理名" value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} />
            </div>
            <div>
              <Label>キャプション</Label>
              <Textarea placeholder="投稿本文..." value={postForm.caption} onChange={(e) => setPostForm({ ...postForm, caption: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>ハッシュタグ</Label>
              <Input placeholder="#tag1 #tag2 ..." value={postForm.hashtags} onChange={(e) => setPostForm({ ...postForm, hashtags: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>プロジェクト</Label>
                <Select value={postForm.projectId} onChange={(e) => setPostForm({ ...postForm, projectId: e.target.value })}>
                  <option value="">なし</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </div>
              <div>
                <Label>動画アセット</Label>
                <Select value={postForm.videoId} onChange={(e) => setPostForm({ ...postForm, videoId: e.target.value })}>
                  <option value="">なし</option>
                  {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostDialog(false)}>キャンセル</Button>
            <Button onClick={handlePostCreate} disabled={!postForm.title || !postForm.scheduledAt}>予約</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
