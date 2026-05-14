import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分`;
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  approved: "承認済み",
  in_production: "制作中",
  completed: "完成",
  pending: "待機中",
  generating: "生成中",
  failed: "失敗",
  todo: "未着手",
  in_progress: "進行中",
  review: "レビュー",
  done: "完了",
  scheduled: "予約済み",
  posted: "投稿済み",
  cancelled: "キャンセル",
  active: "アクティブ",
  archived: "アーカイブ",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-green-100 text-green-700",
  in_production: "bg-blue-100 text-blue-700",
  completed: "bg-purple-100 text-purple-700",
  pending: "bg-yellow-100 text-yellow-700",
  generating: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-orange-100 text-orange-700",
  done: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  posted: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-700",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  twitter: "X (Twitter)",
};

export const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-black text-white",
  youtube: "bg-red-100 text-red-700",
  instagram: "bg-pink-100 text-pink-700",
  twitter: "bg-sky-100 text-sky-700",
};
