"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Twin = { empty: boolean; topics: Array<{ id: string; label: string; weight: number }>; books: Array<{ id: number; title: string }>; recentGrowth: string[] };

export function KnowledgeTwin() {
  const [twin, setTwin] = useState<Twin | null>(null);
  useEffect(() => { fetch("/api/libraryos/knowledge-twin").then(async (response) => response.ok ? (await response.json() as { twin: Twin }).twin : null).then(setTwin).catch(() => setTwin(null)); }, []);
  if (!twin) return <section className="knowledge-twin"><span>KNOWLEDGE TWIN</span><h2>正在读取你的知识地图…</h2></section>;
  if (twin.empty) return <section className="knowledge-twin"><span>KNOWLEDGE TWIN / 仅本人可见</span><h2>你的知识地图，正等待第一条线索。</h2><p>搜索馆藏、加入借阅清单或请 AI 馆员规划一次学习目标，地图就会开始生长。</p></section>;
  return <section className="knowledge-twin"><header><span>KNOWLEDGE TWIN / 仅本人可见</span><h2>我的知识地图</h2><p>这些节点只来自你的借阅与已授权的系统行为。</p></header><div className="twin-map">{twin.topics.slice(0, 10).map((topic, index) => <i key={topic.id} style={{ "--x": `${12 + (index * 29) % 76}%`, "--y": `${18 + (index * 41) % 64}%`, "--size": `${42 + Math.min(topic.weight, 5) * 8}px` } as CSSProperties}>{topic.label}</i>)}</div><div className="twin-summary"><p><b>正在形成：</b>{twin.recentGrowth.join(" · ")}</p><p><b>连接馆藏：</b>{twin.books.map((book) => `《${book.title}》`).join("、")}</p></div></section>;
}
