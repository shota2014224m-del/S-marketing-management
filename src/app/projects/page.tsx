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
  FolderOpen,
  Trash2,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  targetAudience: string | null;
  status: string;
  createdAt: string;
  _count: { scripts: number; scheduleTasks: number };
}

const GENRE_OPTIONS = ["教育・解説", "エンタメ", "商品紹介", "ライフスタイル", "ビジネス・お金", "健康・美容", "料理・グルメ", "旅行"];

const EMPTY_FORM = { title: "", description: "", genre: "", targetAudience: "" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowDialog(false);
    setForm(EMPTY_FORM);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このプロジェクトを削除しますか？\n関連する台本・タスクもすべて削除されます。")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="flex-1">
      <Header
        title="プロジェクト"
        description="動画制作プロジェクトの管理"
        actions={
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus size={14} /> 新規プロジェクト
          </Button>
        }
      />
      <main className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">プロジェクトがありません</p>
            <p className="text-sm mt-1 mb-6">台本・タスク・投稿をまとめて管理するプロジェクトを作成してください</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus size={14} /> 最初のプロジェクトを作成
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 truncate text-base">{p.title}</h3>
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                      )}
                    </div>
                    <Badge className={p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                      {p.status === "active" ? "進行中" : "完了"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.genre && (
                      <Badge className="bg-indigo-50 text-indigo-600 text-xs">{p.genre}</Badge>
                    )}
                    {p.targetAudience && (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">{p.targetAudience}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText size={11} /> 台本 {p._count.scripts}件
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> タスク {p._count.scheduleTasks}件
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Link href={`/scripts?project=${p.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        <FileText size={11} /> 台本を見る
                      </Button>
                    </Link>
                    <div className="flex gap-1">
                      <Link href={`/scripts?autoopen=generate&projectId=${p.id}`}>
                        <Button size="sm" className="text-xs h-7">
                          <ChevronRight size={11} /> AI生成
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新規プロジェクト作成</DialogTitle>
            <DialogDescription>台本・タスク・投稿をまとめて管理するプロジェクトを作成します</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>プロジェクト名 *</Label>
              <Input
                placeholder="例：筋トレ系TikTokチャンネル"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>説明（任意）</Label>
              <Textarea
                placeholder="このプロジェクトの概要・目標など"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-20 text-sm"
              />
            </div>
            <div>
              <Label>ジャンル</Label>
              <Select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
                <option value="">選択してください</option>
                {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
            <div>
              <Label>ターゲット層</Label>
              <Input
                placeholder="例：20〜35歳の働く男性"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!form.title || saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
