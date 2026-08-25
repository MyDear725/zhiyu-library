import assert from "node:assert/strict";
import test from "node:test";

import { books, findBooks, recommendLowExposureBook } from "../lib/libraryos/catalog.js";
import { buildLocalPlan, normalizeGoal } from "../lib/libraryos/planner.js";
import { sanitizeActivityMetadata } from "../lib/libraryos/activity-metadata.js";
import { buildKnowledgeTwin } from "../lib/libraryos/knowledge-twin.js";

test("catalog search and low-exposure discovery only return real books", () => {
  const matches = findBooks("RAG 黑客松");
  assert.ok(matches.length > 0);
  assert.ok(matches.every((book) => books.some((item) => item.id === book.id)));

  const rediscovered = recommendLowExposureBook(["人工智能", "竞赛项目"], matches.map((book) => book.id));
  assert.ok(rediscovered);
  assert.ok(books.some((book) => book.id === rediscovered.id));
});

test("local librarian plan trims a goal and returns catalog-backed actions", () => {
  assert.equal(normalizeGoal("  今晚准备 Agent 黑客松，了解 RAG  "), "今晚准备 Agent 黑客松，了解 RAG");
  assert.throws(() => normalizeGoal(" "), /2—500/);

  const plan = buildLocalPlan({ goal: "今晚准备 Agent 黑客松，了解 RAG", peerCount: 3 });
  assert.equal(plan.mode, "local");
  assert.ok(plan.books.length > 0);
  assert.ok(plan.books.every((book) => books.some((item) => item.id === book.bookId)));
  assert.equal(plan.peerSignal.count, 3);
});

test("activity metadata retains safe signals and drops identity and private text", () => {
  assert.deepEqual(
    sanitizeActivityMetadata({ topic: "人工智能", bookId: 11, studentId: "20260001", token: "secret", password: "secret", question: "我的私人问题" }),
    { topic: "人工智能", bookId: 11 },
  );
});

test("knowledge twin is empty without behavior and grows from real book IDs", () => {
  assert.deepEqual(buildKnowledgeTwin({ borrowedBookIds: [], events: [] }).topics, []);
  const twin = buildKnowledgeTwin({ borrowedBookIds: [11], events: [{ eventType: "book_search", metadata: { bookId: 4, topic: "半导体" } }] });
  assert.ok(twin.topics.length > 0);
  assert.ok(twin.books.every((book) => books.some((item) => item.id === book.id)));
});
