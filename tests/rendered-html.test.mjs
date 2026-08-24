import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the library application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>知遇图书馆 · 阅读、空间与社区<\/title>/i);
  assert.match(html, /大连理工大学图书馆馆藏发现、场景选座、社区补给/);
  assert.match(html, /class="app-loading"/);
  assert.match(html, /正在进入图书馆/);
  assert.match(html, /\/icons\/books\.svg/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the approved design direction and core flows in source", async () => {
  const [page, layout, motion, globalsCss, redesign, packageJson, seatsRoute, reservationsRoute, studyIntentRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/motion-stage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/redesign.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/seats/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reservations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/study-intent/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /import "\.\/redesign\.css"/);
  assert.match(page, /className="portal-primary-grid"/);
  assert.match(page, /className="portal-community"/);
  assert.match(page, /借一本书/);
  assert.match(page, /选一个座位/);
  assert.match(page, /连接与补给/);
  assert.match(page, /anonymous-message/);
  assert.match(page, /CheckoutCelebration/);
  assert.doesNotMatch(page, /2026-08-20/);
  assert.doesNotMatch(page, /今天 · 8月20日/);
  assert.match(page, /libraryDate/);
  assert.match(page, /libraryDateLabel/);
  assert.match(page, /new URLSearchParams\(\{ floor, bookingDate, timeSlot: time \}\)/);
  assert.match(page, /15_000/);
  assert.match(page, /AbortController/);
  assert.match(page, /type SeatStatus = "free" \| "using" \| "away" \| "reserved"/);
  assert.match(page, /match-factors/);
  assert.match(page, /match-alternatives/);
  assert.match(page, /match-demo-baseline/);
  assert.match(page, /seat-refresh-time/);
  assert.match(motion, /useGSAP/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(redesign, /library-atrium\.png/);
  assert.match(redesign, /library-shelves\.png/);
  assert.match(packageJson, /"@gsap\/react": "2\.1\.2"/);
  assert.match(packageJson, /"gsap": "3\.15\.0"/);
  assert.match(seatsRoute, /searchParams\.get\("bookingDate"\)/);
  assert.match(seatsRoute, /searchParams\.get\("timeSlot"\)/);
  assert.match(seatsRoute, /effectiveSeatStatus/);
  assert.match(reservationsRoute, /isLibraryToday/);
  assert.match(reservationsRoute, /isLibraryTimeSlot/);
  assert.match(studyIntentRoute, /recommendStudyZones/);
  assert.doesNotMatch(studyIntentRoute, /const recommendations:/);
  assert.match(studyIntentRoute, /loadZoneAvailability/);
  assert.match(studyIntentRoute, /loadLivePeerCounts/);
  assert.match(studyIntentRoute, /recommendation: candidates\[0\]/);
  assert.match(studyIntentRoute, /alternatives/);
  assert.match(studyIntentRoute, /generatedAt/);
  const seatUpgradeStyles = `${globalsCss}\n${redesign}`;
  assert.match(seatUpgradeStyles, /\.cluster-seat\.reserved/);
  assert.match(seatUpgradeStyles, /\.match-score/);
  assert.match(seatUpgradeStyles, /\.match-factors/);
  assert.match(seatUpgradeStyles, /\.match-alternatives/);
  assert.match(seatUpgradeStyles, /\.match-demo-baseline/);
  assert.match(seatUpgradeStyles, /\.seat-refresh-time/);

  await Promise.all([
    access(new URL("../public/images/library-atrium.png", import.meta.url)),
    access(new URL("../public/images/library-shelves.png", import.meta.url)),
    access(new URL("../public/icons/books.svg", import.meta.url)),
  ]);
});
