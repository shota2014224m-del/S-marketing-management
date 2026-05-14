"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Loader2, Trash2, GripVertical, Calendar,
  Clock, Tag, ChevronDown, ChevronUp, CalendarDays
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  PLATFORM_LABELS, PLATFORM_COLORS, formatDateTime
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
  script: "台本", image: "画像", video: "動画", post: "投稿", research: "リサーチ", other: "その他"
};

export default function SchedulePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [posts, setPosts] = useState<PostSchedule[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"kanban" | "calendar">("kanban");
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
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "kanban" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("kanban")}
          >
            カンバン
          </button>
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "calendar" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("calendar")}
          >
            投稿スケジュール
          </button>
        </div>

        {activeTab === "kanban" ? (
          /* Kanban Board */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TASK_COLUMNS.map(({ key, label, color }) => {
              const colTasks = tasks.filter((t) => t.status === key);
              return (
                <div key={key}>
                  <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${color}`}>
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    <Badge className="bg-gray-100 text-gray-600 text-xs">{colTasks.length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="group cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="text-sm font-medium text-gray-900 leading-tight flex-1">{task.title}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0"
                              onClick={() => handleTaskDelete(task.id)}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`${PRIORITY_COLORS[task.priority]} text-xs`}>
                              {PRIORITY_LABELS[task.priority]}
                            </Badge>
                            {task.category && (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">
                                {CATEGORY_LABELS[task.category] || task.category}
                              </Badge>
                            )}
                          </div>
                          {task.dueDate && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              <Clock size={10} /> {formatDateTime(task.dueDate)}
                            </p>
                          )}
                          {task.project && (
                            <p className="text-xs text-indigo-500 mt-1 truncate">{task.project.title}</p>
                          )}
                          {/* Status change */}
                          <Select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="mt-2 h-6 text-xs"
                          >
                            {TASK_COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                    <button
                      className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                      onClick={() => { setTaskForm({ ...taskForm, status: key }); setShowTaskDialog(true); }}
                    >
                      + タスクを追加
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Post Schedule List */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {["scheduled", "posted", "failed", "cancelled"].map((status) => (
                <div key={status} className="flex items-center gap-1.5 text-sm">
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
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10} />{formatDateTime(post.scheduledAt)}</p>
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
