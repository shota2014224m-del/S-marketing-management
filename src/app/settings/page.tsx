"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save, Key, Globe, Sparkles, Video, ImageIcon, Database,
  CheckCircle2, Loader2, Eye, EyeOff, Plus, Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProjectForm {
  title: string;
  description: string;
  genre: string;
  targetAudience: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  targetAudience: string | null;
  status: string;
  _count: { scripts: number };
}

const API_SECTIONS = [
  {
    key: "ai",
    icon: Sparkles,
    title: "AI・スクリプト生成",
    color: "text-purple-600",
    fields: [
      { key: "anthropic_api_key", label: "Anthropic API Key", placeholder: "sk-ant-...", isSecret: true, description: "台本の自動生成に使用（Claude AI）" },
      { key: "openai_api_key", label: "OpenAI API Key", placeholder: "sk-...", isSecret: true, description: "DALL-E 3 画像生成に使用" },
    ],
  },
  {
    key: "image",
    icon: ImageIcon,
    title: "画像生成サービス",
    color: "text-emerald-600",
    fields: [
      { key: "stability_api_key", label: "Stability AI API Key", placeholder: "sk-...", isSecret: true, description: "Stable Diffusion画像生成" },
      { key: "replicate_api_key", label: "Replicate API Key", placeholder: "r8_...", isSecret: true, description: "各種オープンソースモデル" },
    ],
  },
  {
    key: "video",
    icon: Video,
    title: "動画生成サービス",
    color: "text-blue-600",
    fields: [
      { key: "did_api_key", label: "D-ID API Key", placeholder: "Basic ...", isSecret: true, description: "リップシンク動画生成" },
      { key: "heygen_api_key", label: "HeyGen API Key", placeholder: "...", isSecret: true, description: "AIアバター動画生成" },
      { key: "runway_api_key", label: "Runway ML API Key", placeholder: "...", isSecret: true, description: "テキスト/画像→動画変換" },
    ],
  },
  {
    key: "sns",
    icon: Globe,
    title: "SNSプラットフォーム",
    color: "text-orange-600",
    fields: [
      { key: "tiktok_access_token", label: "TikTok Access Token", placeholder: "...", isSecret: true, description: "TikTok自動投稿連携" },
      { key: "youtube_api_key", label: "YouTube API Key", placeholder: "AIza...", isSecret: true, description: "YouTube Shorts投稿" },
      { key: "instagram_access_token", label: "Instagram Access Token", placeholder: "...", isSecret: true, description: "Instagram Reels連携" },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>({ title: "", description: "", genre: "", targetAudience: "" });

  const fetchData = useCallback(async () => {
    const [settingsRes, projectsRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/projects"),
    ]);
    const settingsData = await settingsRes.json();
    setSettings(settingsData);
    setEditValues(settingsData);
    setProjects(await projectsRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const toSave: Record<string, string> = {};
    for (const [k, v] of Object.entries(editValues)) {
      if (!v.includes("••••")) toSave[k] = v;
    }
    if (Object.keys(toSave).length > 0) {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    fetchData();
  };

  const handleProjectCreate = async () => {
    if (!projectForm.title) return;
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectForm),
    });
    setShowProjectDialog(false);
    setProjectForm({ title: "", description: "", genre: "", targetAudience: "" });
    fetchData();
  };

  const handleProjectDelete = async (id: string) => {
    if (!confirm("プロジェクトを削除しますか？関連する台本も削除されます。")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="flex-1">
      <Header
        title="設定"
        description="APIキー・プロジェクト・連携サービスの設定"
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} className="text-green-500" /> : <Save size={14} />}
            {saved ? "保存しました" : "保存"}
          </Button>
        }
      />
      <main className="p-6 space-y-6 max-w-3xl">
        {/* Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-indigo-600" />
                <div>
                  <CardTitle>プロジェクト管理</CardTitle>
                  <CardDescription>動画チャンネル・シリーズのプロジェクトを管理</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowProjectDialog(true)}>
                <Plus size={14} /> 新規
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">プロジェクトがありません。まずプロジェクトを作成してください。</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {project.genre && `${project.genre} · `}台本 {project._count.scripts}件
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => handleProjectDelete(project.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Keys */}
        {API_SECTIONS.map(({ key, icon: Icon, title, color, fields }) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon size={18} className={color} />
                <div>
                  <CardTitle>{title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map(({ key: fieldKey, label, placeholder, isSecret, description }) => (
                <div key={fieldKey}>
                  <Label>{label}</Label>
                  {description && <p className="text-xs text-gray-400 mb-1">{description}</p>}
                  <div className="relative">
                    <Input
                      type={isSecret && !showValues[fieldKey] ? "password" : "text"}
                      placeholder={placeholder}
                      value={editValues[fieldKey] || ""}
                      onChange={(e) => setEditValues({ ...editValues, [fieldKey]: e.target.value })}
                      className="pr-10"
                    />
                    {isSecret && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowValues({ ...showValues, [fieldKey]: !showValues[fieldKey] })}
                      >
                        {showValues[fieldKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Usage Guide */}
        <Card className="bg-indigo-50 border-indigo-100">
          <CardHeader>
            <CardTitle className="text-indigo-700 text-sm">使い方ガイド</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-indigo-600 space-y-2">
            <p>1. <strong>プロジェクトを作成</strong> → チャンネルやシリーズを登録</p>
            <p>2. <strong>台本・スクリプト</strong> → AIで台本を自動生成（Anthropic API Key必要）</p>
            <p>3. <strong>画像生成</strong> → 各シーンの画像プロンプトを管理・DALL-E等で生成</p>
            <p>4. <strong>動画生成</strong> → D-ID/HeyGenなどでリップシンク動画を作成</p>
            <p>5. <strong>スケジュール</strong> → 投稿日時を管理してSNSに投稿</p>
            <p>6. <strong>アナリティクス</strong> → 再生数・収益を記録して効果測定</p>
          </CardContent>
        </Card>
      </main>

      {/* Project Create Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>プロジェクトを作成</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>プロジェクト名 *</Label>
              <Input placeholder="例：筋トレ解説チャンネル" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
            </div>
            <div>
              <Label>説明</Label>
              <Textarea placeholder="プロジェクトの概要..." value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>ジャンル</Label>
              <Select value={projectForm.genre} onChange={(e) => setProjectForm({ ...projectForm, genre: e.target.value })}>
                <option value="">選択してください</option>
                <option value="教育・解説">教育・解説</option>
                <option value="エンタメ">エンタメ</option>
                <option value="商品紹介">商品紹介</option>
                <option value="ライフスタイル">ライフスタイル</option>
                <option value="ビジネス・お金">ビジネス・お金</option>
                <option value="健康・美容">健康・美容</option>
              </Select>
            </div>
            <div>
              <Label>ターゲット層</Label>
              <Input placeholder="例：20〜35歳の働く女性" value={projectForm.targetAudience} onChange={(e) => setProjectForm({ ...projectForm, targetAudience: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>キャンセル</Button>
            <Button onClick={handleProjectCreate} disabled={!projectForm.title}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
