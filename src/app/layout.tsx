import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SNS動画マネジメント",
  description: "生成AIを使ったショート動画制作・マネタイズ管理システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 text-gray-900">
        <Sidebar />
        <div className="ml-60 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
