import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知遇图书馆 · 选座与借阅服务",
  description: "大连理工大学图书馆座位预约、馆藏检索与借阅服务。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
