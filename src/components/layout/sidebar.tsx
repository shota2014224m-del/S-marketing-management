"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Image,
  Video,
  Calendar,
  BarChart3,
  Settings,
  Zap,
  Hash,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "ダッシュボード" },
  { href: "/scripts", icon: FileText, label: "台本・スクリプト" },
  { href: "/images", icon: Image, label: "画像生成" },
  { href: "/videos", icon: Video, label: "動画生成" },
  { href: "/schedule", icon: Calendar, label: "スケジュール" },
  { href: "/templates", icon: LayoutTemplate, label: "テンプレート" },
  { href: "/hashtags", icon: Hash, label: "ハッシュタグ" },
  { href: "/analytics", icon: BarChart3, label: "アナリティクス" },
  { href: "/settings", icon: Settings, label: "設定" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-950 flex flex-col z-40">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">SNS動画</div>
          <div className="text-xs text-gray-400 leading-tight">マネジメント</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-5">
        <div className="rounded-lg bg-gray-800 px-3 py-3">
          <p className="text-xs text-gray-400 font-medium">AIクレジット</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-700">
            <div className="h-full w-3/5 rounded-full bg-indigo-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">60% 残り</p>
        </div>
      </div>
    </aside>
  );
}
