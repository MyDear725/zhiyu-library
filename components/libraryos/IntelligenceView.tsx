"use client";

import { useEffect, useState } from "react";

type Data = { isDemo: boolean; kpis: Array<{ label: string; value: number }>; topics: Array<{ label: string; count: number }> };

export function IntelligenceView() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/libraryos/intelligence").then(async (response) => response.ok ? (await response.json() as Data) : null).then(setData).catch(() => setData(null)); }, []);
  return <main className="page intelligence-page"><header><span>LIBRARY INTELLIGENCE / 演示运营视图</span><h1>让图书馆看见需求，而非看见个人。</h1><p>以下数据均为匿名聚合，不含姓名、学号或原始对话。</p></header>{!data ? <p>正在加载匿名运营指标…</p> : <><div className="intelligence-kpis">{data.kpis.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{data.isDemo ? "演示聚合数据" : "匿名聚合数据"}</small></article>)}</div><section className="topic-ranking"><span>知识需求热度</span><h2>近期关注主题</h2>{data.topics.length ? data.topics.map((topic, index) => <div key={topic.label}><b>{String(index + 1).padStart(2, "0")}</b><strong>{topic.label}</strong><i style={{ width: `${Math.max(14, Math.min(100, topic.count * 20))}%` }} /><small>{topic.count}</small></div>) : <p>暂无足够匿名行为数据；完成一次学习目标或馆藏探索后，这里会出现聚合趋势。</p>}</section></>}</main>;
}
