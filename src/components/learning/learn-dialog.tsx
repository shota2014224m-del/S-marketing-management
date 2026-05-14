"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, BookOpen, CheckCircle2, FolderOpen } from "lucide-react";

export interface LearnPayload {
  type: "script" | "image" | "video";
  title: string;
  topic?: string;
  genre?: string;
  keywords?: string;
  viralScore?: number;
  hook?: string;
  structure?: string;
  promptCore?: string;
  outputSample?: string;
  learnings?: string;
  sourceId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaults: LearnPayload;
  onSaved?: () => void;
}

export function LearnDialog({ open, onOpenChange, defaults, onSaved }: Props) {
  const [form, setForm] = useState<LearnPayload>(defaults);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [obsidianWritten, setObsidianWritten] = useState(false);

  // Reset when defaults change (new item opened)
  const handleOpen = (v: boolean) => {
    if (v) { setForm(defaults); setSaved(false); }
    onOpenChange(v);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setObsidianWritten(!!data.obsidianPath);
      onSaved?.();
      setTimeout(() => { onOpenChange(false); setSaved(false); }, 1800);
    }
  };

  const typeLabel = defaults.type === "script" ? "台本" : defaults.type === "image" ? "画像プロンプト" : "動画設定";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-500" />
            {typeLabel}パターンを学習する
          </DialogTitle>
          <DialogDescription>
            このアウトプットをナレッジとして保存します。次回の生成時に自動参照されます。
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <p className="font-semibold text-gray-900">学習しました！</p>
            <p className="text-sm text-gray-500">次回の{typeLabel}生成時に自動で参照されます</p>
            {obsidianWritten && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-600">
                <FolderOpen size={12} />
                Obsidian vaultにも書き出しました
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 text-sm">
              <div>
                <Label>タイトル（このパターンの名前）</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              {defaults.type === "script" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>トピック</Label>
                      <Input value={form.topic ?? ""} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                    </div>
                    <div>
                      <Label>ジャンル</Label>
                      <Input value={form.genre ?? ""} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>フックパターン（冒頭の型）</Label>
                    <Textarea
                      placeholder="例：「〇〇できない人必見」型、ビフォーアフター型..."
                      value={form.hook ?? ""}
                      onChange={(e) => setForm({ ...form, hook: e.target.value })}
                      className="h-16 text-sm"
                    />
                  </div>
                  <div>
                    <Label>構成パターン</Label>
                    <Textarea
                      placeholder="例：問題提起→共感→解決策×3→まとめ→CTA"
                      value={form.structure ?? ""}
                      onChange={(e) => setForm({ ...form, structure: e.target.value })}
                      className="h-16 text-sm"
                    />
                  </div>
                  <div>
                    <Label>出力サンプル（フック文など抜粋）</Label>
                    <Textarea
                      placeholder="実際に生成された優秀なフックや本文の一部を貼り付け"
                      value={form.outputSample ?? ""}
                      onChange={(e) => setForm({ ...form, outputSample: e.target.value })}
                      className="h-20 text-sm"
                    />
                  </div>
                </>
              )}

              {defaults.type === "image" && (
                <>
                  <div>
                    <Label>効果的だったプロンプト</Label>
                    <Textarea
                      placeholder="このスタイルや品質を出すためのプロンプトのコア部分"
                      value={form.promptCore ?? ""}
                      onChange={(e) => setForm({ ...form, promptCore: e.target.value })}
                      className="h-24 text-sm"
                    />
                  </div>
                  <div>
                    <Label>構成メモ（構図・スタイル・ライティングなど）</Label>
                    <Textarea
                      placeholder="例：「cinematic lighting, shallow depth of field, 9:16」"
                      value={form.structure ?? ""}
                      onChange={(e) => setForm({ ...form, structure: e.target.value })}
                      className="h-16 text-sm"
                    />
                  </div>
                </>
              )}

              {defaults.type === "video" && (
                <>
                  <div>
                    <Label>効果的だった設定・パラメータ</Label>
                    <Textarea
                      placeholder="使用サービス・設定値・プロンプト等"
                      value={form.promptCore ?? ""}
                      onChange={(e) => setForm({ ...form, promptCore: e.target.value })}
                      className="h-20 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="text-indigo-700 font-semibold">なぜこれが機能したか（最重要）★</Label>
                <Textarea
                  placeholder="例：数字を使ったフックが刺さった。ターゲットの痛点を具体的に言語化したことで視聴維持率が高かった..."
                  value={form.learnings ?? ""}
                  onChange={(e) => setForm({ ...form, learnings: e.target.value })}
                  className="h-24 text-sm border-indigo-200 focus:border-indigo-400"
                />
              </div>

              <div>
                <Label>検索キーワード（カンマ区切り）</Label>
                <Input
                  placeholder="例：筋トレ,ダイエット,ビフォーアフター"
                  value={form.keywords ?? ""}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
              <Button onClick={handleSave} disabled={!form.title || !form.learnings || saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                学習して保存
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
