import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";

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
      <body>
        {children}
        {process.env.NODE_ENV === "development" ? (
          <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
        ) : null}
      </body>
    </html>
  );
}
