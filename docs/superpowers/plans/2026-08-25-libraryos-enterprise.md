# LibraryOS Enterprise Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explainable, privacy-preserving LibraryOS layer that turns a learning goal into knowledge, space and people actions.

**Architecture:** Shared domain logic lives in `lib/libraryos`; authenticated route handlers compose it with D1 data. The existing client shell receives minimal new views and navigation hooks. Activity events are best-effort and the source for personal and anonymized aggregate views.

**Tech Stack:** React 19, TypeScript, Vinext, Cloudflare D1 / SQLite, native CSS, Node test runner.

## Global Constraints

- Commit directly to `main` only, as explicitly authorized by the user.
- Do not overwrite or recreate the teammate's unuploaded learning-climate map or anonymous question wall.
- No new frontend dependency or chart library.
- Facts about catalog, seats and people come from local data/D1, never from model output.
- Event metadata must exclude password, session token, student ID and raw private text.
- Existing core flows must remain available if event writes or OpenAI calls fail.

---

### Task 1: Shared LibraryOS domain and catalog

**Files:**
- Create: `lib/libraryos/types.ts`, `lib/libraryos/catalog.ts`, `lib/libraryos/space-engine.ts`, `lib/libraryos/people-engine.ts`, `tests/libraryos-domain.test.mjs`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces `books`, `knowledgeThreads`, `relatedBookIds`, `findBooks(query)`, `recommendLowExposureBook(topic, excludedIds)`.
- Produces `recommendSpace(input)` and `buildPeerSignal(input)` contracts consumed by the librarian route.

- [ ] **Step 1: Write failing tests** for an RAG/hackathon query returning existing catalog IDs and a low-exposure recommendation whose ID is in the catalog.
- [ ] **Step 2: Run** `node --test tests/libraryos-domain.test.mjs`; expect failure because the domain module is missing.
- [ ] **Step 3: Implement** the catalog and pure engine contracts with deterministic, non-networked logic.
- [ ] **Step 4: Run** `node --test tests/libraryos-domain.test.mjs`; expect pass.
- [ ] **Step 5: Move** the duplicated client catalog constants to the shared module without changing current BooksView behavior.

### Task 2: Event persistence and safe instrumentation

**Files:**
- Create: `lib/libraryos/activity.ts`, `drizzle/0005_libraryos_activity_events.sql`
- Modify: `db/schema.ts`, `db/runtime.ts`, `app/api/borrow-list/route.ts`, `app/api/study-intent/route.ts`, `app/api/reservations/route.ts`, `app/api/community/messages/route.ts`
- Test: `tests/libraryos-domain.test.mjs`

**Interfaces:**
- Produces `recordActivity(input): Promise<void>` with `eventType`, optional entity details and sanitized metadata.

- [ ] **Step 1: Write a failing test** showing metadata removes `studentId`, `token`, `password` and question text while retaining topic and book ID.
- [ ] **Step 2: Run** the focused Node test; expect failure because the sanitizer is missing.
- [ ] **Step 3: Implement** the schema migration, runtime `CREATE TABLE/INDEX IF NOT EXISTS`, sanitizer and non-throwing recorder.
- [ ] **Step 4: Instrument** successful borrow, study intent, reservation and community-message paths after their core write succeeds.
- [ ] **Step 5: Run** the focused test and project test command; expect both pass.

### Task 3: Action AI Librarian API and plan UI

**Files:**
- Create: `lib/libraryos/librarian.ts`, `app/api/libraryos/librarian/plan/route.ts`, `components/libraryos/LibrarianView.tsx`
- Modify: `app/page.tsx`, `app/redesign.css`
- Test: `tests/libraryos-domain.test.mjs`

**Interfaces:**
- `createLibrarianPlan(input): LibrarianPlan` returns `goal`, `summary`, `steps`, `books`, `space`, `peerSignal`, `actions`, `mode`.
- Route accepts `{ goal: string, timeSlot?: string, bookingDate?: string }` and requires a session.

- [ ] **Step 1: Write failing tests** for valid 2–500-character goals, empty-goal rejection and a plan containing catalog-backed book IDs.
- [ ] **Step 2: Run** focused tests; expect failures for missing planner/validation.
- [ ] **Step 3: Implement** deterministic planner, authenticated route, optional OpenAI summary enhancement with local fallback, and `librarian_plan_created` event.
- [ ] **Step 4: Implement** the client form, loading/error state, fact/explanation labels and action callbacks to existing books/seats/community views.
- [ ] **Step 5: Run** focused tests and `npm test`; expect pass.

### Task 4: Knowledge Twin and Intelligence APIs/views

**Files:**
- Create: `lib/libraryos/knowledge-twin.ts`, `lib/libraryos/intelligence.ts`, `app/api/libraryos/knowledge-twin/route.ts`, `app/api/libraryos/intelligence/route.ts`, `components/libraryos/KnowledgeTwin.tsx`, `components/libraryos/IntelligenceView.tsx`
- Modify: `app/page.tsx`, `app/redesign.css`
- Test: `tests/libraryos-domain.test.mjs`

**Interfaces:**
- Knowledge Twin returns `{ topics, books, edges, recentGrowth, empty }` only for the session user.
- Intelligence returns anonymous KPI and ranked aggregate objects without identifying fields.

- [ ] **Step 1: Write failing tests** for empty twin, topic growth from event/borrow inputs, and intelligence response projection without raw user data.
- [ ] **Step 2: Run** focused tests; expect missing module failures.
- [ ] **Step 3: Implement** data transformations and authenticated endpoints; display a bounded 8–15 node SVG/CSS graph and explicit no-data states.
- [ ] **Step 4: Implement** a clearly labelled “演示运营视图” with four KPI cards and CSS-only ranking bars.
- [ ] **Step 5: Run** focused and full tests; expect pass.

### Task 5: Regression tests, documentation and release verification

**Files:**
- Modify: `tests/rendered-html.test.mjs`, `README.md`, `app/page.tsx`, `app/redesign.css`

- [ ] **Step 1: Write failing source/render assertions** for the LibraryOS entry, Knowledge Twin, anonymity copy and fallback disclosure.
- [ ] **Step 2: Run** `npm test`; expect assertion failures before UI/documentation completion.
- [ ] **Step 3: Add** concise README architecture, demo path, fallback and privacy sections; keep only minimal app-shell wiring.
- [ ] **Step 4: Run** `npm test`, `npm run build` and `npm run lint`; expect zero failures.
- [ ] **Step 5: Inspect** `git diff --check`, `git status --short`, secret patterns and push the verified `main` commit without force.
