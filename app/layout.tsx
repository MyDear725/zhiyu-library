import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知遇图书馆 · 阅读、空间与社区",
  description: "大连理工大学图书馆馆藏发现、场景选座、社区补给、同伴交流与知识问答服务。",
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
