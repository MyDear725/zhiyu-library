import { findBooks, inferTopics, recommendLowExposureBook } from "./catalog.js";

export function normalizeGoal(value) {
  const goal = String(value ?? "").trim().replace(/\s+/g, " ");
  if (goal.length < 2 || goal.length > 500) throw new Error("学习目标需为 2—500 个字符");
  return goal;
}

export function buildLocalPlan({ goal, peerCount = 0, space } = {}) {
  const normalizedGoal = normalizeGoal(goal);
  const topics = inferTopics(normalizedGoal);
  const matchedBooks = findBooks(normalizedGoal).slice(0, 2);
  const rediscovered = recommendLowExposureBook(topics, matchedBooks.map((book) => book.id));
  const selectedBooks = rediscovered ? [...matchedBooks, rediscovered].slice(0, 3) : matchedBooks;
  const recommendation = space ?? { floor: "4F", zone: "B", zoneName: "项目研讨区", reason: "现有座位与学习意图表明这里适合需要讨论和电源支持的项目学习。" };
  const topic = topics[0] ?? "学习探索";
  return {
    mode: "local",
    goal: normalizedGoal,
    summary: `先用馆藏建立「${topic}」的基础框架，再到合适空间开展实践；是否进入交流由你自己决定。`,
    steps: [
      { type: "knowledge", title: "先建立主题框架", reason: "从当前馆藏选择与目标相关的起点。" },
      { type: "space", title: "进入适合当前任务的区域", reason: recommendation.reason },
      { type: "people", title: "查看同方向的匿名信号", reason: "只显示聚合人数，不展示任何同学身份。" },
    ],
    books: selectedBooks.map((book, index) => ({ bookId: book.id, title: book.title, location: book.location, available: book.available, reason: index === selectedBooks.length - 1 && book.id === rediscovered?.id ? "低曝光探索推荐：它与当前主题相关，同时较少被主动发现。" : `系统馆藏匹配：与「${topic}」相关。`, discovery: book.id === rediscovered?.id })),
    space: { ...recommendation },
    peerSignal: { topic, count: Math.max(0, Number(peerCount) || 0), privacy: "仅匿名聚合，进入交流由用户自主决定" },
    actions: ["查看馆藏", "前往选座", "进入同伴广场"],
  };
}
