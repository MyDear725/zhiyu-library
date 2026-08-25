import { books, relatedBookIds } from "./catalog.js";

export function buildKnowledgeTwin({ borrowedBookIds = [], events = [] } = {}) {
  const weights = new Map();
  const touchedIds = new Set(borrowedBookIds.filter(Number.isInteger));
  for (const event of events) {
    const metadata = event.metadata ?? {};
    if (Number.isInteger(metadata.bookId)) touchedIds.add(metadata.bookId);
    if (typeof metadata.topic === "string" && metadata.topic) weights.set(metadata.topic, (weights.get(metadata.topic) ?? 0) + 2);
  }
  const selectedBooks = books.filter((book) => touchedIds.has(book.id));
  for (const book of selectedBooks) for (const topic of book.topics) weights.set(topic, (weights.get(topic) ?? 0) + 1);
  const topics = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([label, weight]) => ({ id: `topic-${label}`, label, weight, sourceCount: weight }));
  const edges = selectedBooks.flatMap((book) => book.topics.filter((topic) => topics.some((item) => item.label === topic)).map((topic) => ({ source: `book-${book.id}`, target: `topic-${topic}`, type: "book-topic" })));
  for (const book of selectedBooks) for (const relatedId of relatedBookIds[book.id] ?? []) if (touchedIds.has(relatedId)) edges.push({ source: `book-${book.id}`, target: `book-${relatedId}`, type: "related" });
  return { topics, books: selectedBooks.map(({ id, title }) => ({ id, title })), edges, recentGrowth: topics.slice(0, 3).map((topic) => topic.label), empty: topics.length === 0 };
}
