"use client";

import { FormEvent, useState } from "react";

type Plan = {
  mode: "local" | "llm";
  goal: string;
  summary: string;
  steps: Array<{ type: string; title: string; reason: string }>;
  books: Array<{ bookId: number; title: string; location: string; available: number; reason: string; discovery: boolean }>;
  space: { floor: string; zone: string; zoneName: string; reason: string };
  peerSignal: { topic: string; count: number; privacy?: string };
};

export function LibrarianView({ onNavigate }: { onNavigate: (view: "books" | "seats" | "community") => void }) {
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/libraryos/librarian/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) });
      const data = await response.json() as { plan?: Plan; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error || "暂时无法生成行动计划");
      setPlan(data.plan);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法生成行动计划");
    } finally {
      setLoading(false);
    }
  }

  return <main className="page libraryos-page">
    <section className="libraryos-hero">
      <span>LIBRARYOS / ACTION AI LIBRARIAN</span>
      <h1>告诉图书馆，你今天想完成什么。</h1>
      <p>AI 馆员会把目标编排成知识、空间与同伴三条可执行路径；系统事实来自馆藏与座位数据。</p>
      <form className="librarian-form" onSubmit={submit}>
        <textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={500} placeholder="例如：今晚有三个小时，想准备 Agent 黑客松，先了解 RAG，最好找一个可以讨论的地方。" aria-label="输入学习目标" />
        <button disabled={loading}>{loading ? "正在编排…" : "生成行动计划"}</button>
      </form>
      {error && <p className="libraryos-error" role="alert">{error}</p>}
    </section>
    {plan && <section className="librarian-plan" aria-live="polite">
      <header><span>你的学习目标</span><h2>{plan.goal}</h2><p>{plan.summary}</p><small>解释由 AI 馆员组织；馆藏、空间和人数均由系统数据提供。</small></header>
      <div className="plan-step-grid">{plan.steps.map((step, index) => <article key={step.type}><i>{String(index + 1).padStart(2, "0")}</i><h3>{step.title}</h3><p>{step.reason}</p></article>)}</div>
      <div className="plan-action-grid">
        <section><span>系统数据 / 馆藏</span><h3>从这些书开始</h3>{plan.books.map((book) => <button key={book.bookId} onClick={() => onNavigate("books")}><b>{book.discovery ? "重新发现" : "馆藏匹配"}</b><strong>《{book.title}》</strong><small>{book.location} · {book.available > 0 ? `可借 ${book.available} 本` : "当前需预约"}<br />{book.reason}</small></button>)}</section>
        <section><span>系统数据 / 空间</span><h3>{plan.space.floor} · {plan.space.zoneName}</h3><p>{plan.space.reason}</p><button onClick={() => onNavigate("seats")}>去选座</button></section>
        <section><span>匿名聚合 / 同伴</span><h3>{plan.peerSignal.topic}</h3><p>当前有 {plan.peerSignal.count} 个同方向学习意图。{plan.peerSignal.privacy}</p><button onClick={() => onNavigate("community")}>进入同伴广场</button></section>
      </div>
    </section>}
  </main>;
}
