# Expanding DataSlope — Accounts, Interview Prep, SEO, Paid AI, and Cloud Workspace Persistence

**Date:** 2026-06-21
**Project:** DataSlope (`dataslope/dataslope`)
**Stack:** Next.js 16.2.4 (App Router) + Fumadocs MDX · ~800 prerendered `/learn` lessons · 11 in-browser WASM playgrounds · deployed to **Cloudflare Workers via OpenNext** (`@opennextjs/cloudflare`), with an R2 incremental-cache bucket and a standalone CORS-proxy Worker.
**Scope:** Six product/architecture questions about making the site more attractive without breaking the "everything is free and static" model.

> Companion to two existing reports that this one builds on directly:
> - `agent-outputs/20260620-1545-cloudflare-migration-and-cost-review.md` — establishes that the site's cost model is "static content served free, all heavy bytes off-host," and explicitly flags D1/R2/AI Gateway as the planned backend.
> - `agent-outputs/20260611-0516-remote-datasets-loading-ux-ask-ai.md` — already designed the "Ask AI" feature, including **per-user daily token budgets and rate limits** (§4.7), which is the technical backbone of the paid tier in Q4.

---

## TL;DR

| # | Question | Short answer |
| --- | --- | --- |
| **Q1** | Auth on Cloudflare | **Better Auth + D1** is the most Cloudflare-native path (self-hosted, free, D1 is first-class). Clerk if you want to ship in a day and migrate later. Use **OAuth social login first**. One caveat: keep auth out of `middleware.ts` on OpenNext. Gate *only* Save/AI — never content. |
| **Q2** | Interview Prep section | **Strong yes.** Reuses your Fumadocs + playground infra almost verbatim (a second `defineDocs` collection), is your single best **SEO** lever (high-intent long-tail search), and feeds the paid-AI funnel. Keep it interactive-first to avoid being a LeetCode clone. |
| **Q3** | SEO | You have great fundamentals (≈800 fast static pages) but were missing the basics. **✅ Phases 1 & 2 are now implemented on this branch:** sitemap, `metadataBase`, title template, canonical + OG/Twitter, a 1200×630 OG image, and JSON-LD (Organization/WebSite + BreadcrumbList + Course) — see §3.4–3.5. Next: content hygiene + `FAQPage` once Interview Prep lands. Keep pages static — SEO and your cost model want the same thing. |
| **Q4** | Paid AI, all content free | **Sound strategy** — you're charging for the one thing that has real marginal cost (inference) while serving zero-marginal-cost content free. The risk is *perception*, solved by **messaging + a genuinely useful free allowance + never gating anything educational**, not by changing the model. |
| **Q5** | Save non-SQL playgrounds to D1 | **Yes, ideal.** Code workspaces are tiny text files (`files: PlaygroundFile[]`). Mind D1's **2 MB per-row cap** (irrelevant for code). Tiers via an `expires_at` column + a Cron sweep. Debounce writes (you already do this for OPFS). Sharing = a `share_id` → public read route. |
| **Q6** | Save SQL playgrounds cheaply | **Don't put DB binaries in D1** (they blow the 2 MB row cap). Two tiers: **(1) store only the SQL + seed reference and replay to rebuild** (effectively free — the default), **(2) snapshot the binary to R2** for non-reproducible DBs (10 GB free, **zero egress**). Gate binaries + long retention behind paid. |

A unifying theme runs through Q1/Q4/Q5/Q6: **you already own the right platform.** You have a Worker, R2, and the cost discipline; adding D1 + an auth library + AI Gateway is an extension of the existing architecture, not a new platform. And the paywall lands exactly on the two features that carry real variable cost (AI inference, long-term storage) — never on content.

---

## Q1 — User management (sign-up / login) on Cloudflare

### 1.1 The good news: you're already in the right shape

The Cloudflare migration report (§Part 2) explicitly anticipated this: *"when you add the planned accounts / workspace DB / Ask AI, the same Worker can call D1 / R2 / AI Gateway, no second platform needed."* You have a single OpenNext Worker (`wrangler.jsonc`) already bound to R2. Adding accounts means adding **D1** (a SQLite database at the edge) + an auth library that runs inside that Worker. No new infrastructure category.

### 1.2 Options, ranked for your situation

| Option | Where data lives | Cost | Cloudflare fit | Verdict |
| --- | --- | --- | --- | --- |
| **Better Auth + D1** | Your D1 (you own the tables) | Free (library) + D1 usage | **Native** — D1 is a first-class adapter since Better Auth 1.5; community `better-auth-cloudflare` package wires D1/KV/R2/geo | **Recommended.** Most Cloudflare-native, full data ownership, OAuth + email + passkeys built in. |
| **Auth.js v5 (NextAuth) + D1 adapter** | Your D1 | Free | Works (official D1 adapter exists) | Solid, battle-tested, 40+ providers — but heavier App-Router/Workers edge cases; see the `cookies()` caveat below. |
| **Clerk** | Clerk's servers (US only) | Free tier, then ~$25/mo + MAU | Drop-in; runs fine in front of a Worker | **Best if you want to ship in a day.** Common pattern: launch on Clerk, migrate to Better Auth around ~50K MAU when the bill grows. User data leaves Cloudflare. |
| **Supabase Auth** | Supabase (Postgres) | Free tier, then usage | Fine, but adds a second platform + a Postgres you don't otherwise need | Good if you also want Supabase's DB/storage; otherwise redundant with D1/R2. |
| **Cloudflare Access (Zero Trust)** | Cloudflare | Free up to 50 users | Native, but it's **SSO gating for teams**, not consumer sign-up | **Not a fit** for public end-user accounts. Don't use it for this. |
| **Roll-your-own (OAuth/WebAuthn on Workers)** | Your D1 | Free | Native but you own all the security surface | **Avoid.** Session fixation, CSRF, token rotation, password reset — use a library. |

### 1.3 The one real caveat on OpenNext/Workers

`cookies()` from `next/headers` and middleware-based session handling have rough edges on the Workers runtime (this is a known OpenNext limitation, not a DataSlope bug). **Mitigation:** do auth work in **route handlers and server components / server actions**, not in `middleware.ts`. Better Auth documents Cloudflare-specific patterns (notably: create **one D1/Drizzle instance per request** at the top of the handler — sharing a connection across requests is the classic Workers footgun). This is a small constraint, not a blocker.

### 1.4 Concrete recommendation

1. **Better Auth + D1**, social login first (**Google + GitHub** OAuth). Social login means you store *no passwords* and skip the entire reset/verification flow on day one — the right starting scope.
2. **Sessions** in D1 (or KV for cheaper, eventually-consistent session reads). Add email magic-links later via a transactional provider (Resend/Postmark) or Cloudflare Email Routing.
3. **Keep auth optional and progressive.** This is the most important architectural rule, and it protects the cost model from the migration report: **do not turn `/learn` pages dynamic just because accounts exist.** Lesson pages stay statically prerendered (served as free assets); read the session **client-side** (or in the Save/AI route handlers), so an anonymous reader still gets the exact same cached static HTML. Auth gates *actions* (Save, Share, Ask AI), never *content*.

This directly serves your "all content still accessible" requirement: an account unlocks persistence and AI, not reading.

---

## Q2 — An "Interview Prep" section on the same Fumadocs setup

**Opinion: do it — it's one of the highest-leverage additions on this list.** It's cheap to build (your infra already does 95% of it), it's your best organic-growth channel, and it strengthens every other feature here.

### 2.1 Why it fits so well

- **Near-zero new infrastructure.** It's a second Fumadocs collection. Mirror `source.config.ts`'s `defineDocs({ dir: "content/interview" })` and add a second `loader({ baseUrl: "/interview" })` alongside `lib/source.ts`. You reuse `mdx-components.tsx`, `ChallengeCard`, `SqlChallengeCard`, `MultipleChoice`, and every runtime as-is. Keep `dynamic: true` so build cost stays flat (the same reason §source.config.ts gives for the lessons).
- **Interactivity is your moat.** The web is saturated with static "Top 50 SQL interview questions" lists. Yours can have a **runnable** answer to every question — write the query, run it against a seed dataset, see it pass. That is genuinely differentiated and nobody is doing it well.
- **It's the SEO growth engine (see Q3).** "data engineer SQL interview questions," "pandas interview questions," "SQL window function interview" are high-intent, high-volume, long-tail queries. Interview content ranks and converts far better than tutorial content.
- **It funnels into the paid tier (Q4).** "Ask AI to explain this answer," "grade my approach," or a future "mock interviewer" mode is a natural premium hook on exactly the pages where users are most motivated.

### 2.2 Structure

Organize on **two axes** and cross-link to existing courses:

- **By role:** Data Analyst, Data Engineer, Data Scientist, ML Engineer, Backend/SWE, Analytics Engineer.
- **By topic:** SQL, Python/pandas, statistics & probability, DSA, system/data-modeling design, and language-specific (you already have C/C++/Java/C#/R/TS content to lean on).

Each question = a `ChallengeCard` (runnable) or a `MultipleChoice` (concept check) — both already exist. Tag questions by difficulty and role; link each back to the relevant `/learn` course that teaches the concept (internal linking is also an SEO win).

### 2.3 Risks to manage

- **Content quality & maintenance** is the real cost, not engineering. Start narrow (e.g., SQL + pandas for Data Analyst/Engineer) and go deep rather than shipping shallow lists for ten roles.
- **Don't become a LeetCode clone.** Your wedge is *interactive + explained*, woven into a learning path — lean into that, not raw problem volume.
- **Brand coherence:** keep it under the same nav/theme so it reads as "DataSlope also preps you for the interview," not a bolt-on.

> Note the `AGENTS.md` rule about `<MultipleChoice>` explanations (never start with "Correct!"/"Right!") — it applies to interview MCQs too, since explanations are shown to all submitters.

---

## Q3 — SEO: how to approach it

You're starting from a **strong technical base** (≈800 fast, prerendered, static pages — exactly what crawlers and Core Web Vitals reward) but the **discoverability metadata is mostly missing.** Here's what the repo has and lacks today, then a prioritized plan.

### 3.1 Current baseline (from the repo)

| Signal | Status | Evidence |
| --- | --- | --- |
| Static, fast pages | ✅ Excellent | ~800 prerendered lessons (`app/learn/[[...slug]]/page.tsx`, `generateStaticParams`) |
| `robots.txt` | ✅ Present | `app/robots.ts` — sensibly disallows `/api/`, `/llms/`, `*.md`, `/playground`, demo routes |
| Per-page title/description | ⚠️ Minimal | `generateMetadata` returns only `title` + `description` (`page.tsx:93`) |
| **`sitemap.xml`** | ❌ **Missing** | no `app/sitemap.ts` anywhere |
| **`metadataBase`** | ❌ **Missing** | not set in `app/layout.tsx` → OG/canonical URLs can't resolve to absolute |
| **Canonical URLs** | ❌ Missing | no `alternates.canonical` |
| **OpenGraph / Twitter cards** | ❌ Missing | no social preview metadata or OG image |
| **Structured data (JSON-LD)** | ❌ Missing | no `Course`/`LearningResource`/`BreadcrumbList`/`FAQPage` |
| Home metadata | ✅ Decent | `app/page.tsx` — "Dataslope — Learn Python, SQL, C++ in your browser" |
| Breadcrumbs | ✅ Present | Fumadocs `DocsPage breadcrumb={{ includeRoot: true }}` |

### 3.2 Prioritized roadmap

**Phase 1 — Foundations (highest impact ÷ effort).** ✅ **Implemented on this branch — details in §3.4.**
1. ✅ **`app/sitemap.ts`** generating an entry per page from `source.getPages()` (and the interview collection when it lands). This was the biggest single gap — ~800 pages with no sitemap means slow/incomplete indexing.
2. ✅ **`metadataBase`** in `app/layout.tsx` (`new URL(SITE_URL)`) so all relative OG/canonical URLs resolve.
3. ✅ **Enrich `generateMetadata`** on lessons: add `alternates.canonical`, `openGraph` (title/description/type/url), and `twitter` card — a small change in one file that fixes every lesson.
4. ✅ **A default OG image** — wired site-wide via `lib/site.ts`. (A dedicated 1200×630 social card + per-course images remain a polish follow-up; the current default reuses an existing brand asset.)
5. ✅ **Fix the home/root metadata** — `app/layout.tsx`'s root metadata was `title: "Playground"`; now a real default + `%s · DataSlope` title template, and the home title opts out of the template via `absolute`.

**Phase 2 — Structured data (rich results) + a real OG image.** ✅ **Implemented on this branch — details in §3.5.**
- ✅ `Course` JSON-LD on course landing pages (marked free), `BreadcrumbList` on every `/learn` page, `Organization` + `WebSite` on the home page.
- ✅ A dedicated **1200×630 OpenGraph image** (`public/og-default.png`), generated on-brand from the logo + a "data slope" motif and now the site-wide share card.
- ⏳ **`FAQPage` JSON-LD on the interview Q&A pages (Q2)** — deferred until the Interview Prep section exists; that's how you win the "interview questions" SERP features.

**Phase 3 — Content & IA hygiene.**
- Audit lesson frontmatter so **every page has a unique, descriptive `title` + `description`** (these become the SERP snippet). Many lessons likely inherit thin descriptions.
- Strengthen internal linking: course index pages as topic hubs; cross-link interview ↔ lessons.
- Reconsider the blanket `disallow: "/playground"` in `robots.ts`: the **playground landing pages** ("Online Python Playground," "Online SQL Editor") are legitimately indexable, high-intent content. Consider allowing the language landing pages while keeping the heavy app states out. (Keep `*.md` and `/llms/` disallowed — that's correct.)

**Phase 4 — Measurement & AI discoverability.**
- Verify in **Google Search Console** + **Bing Webmaster Tools**; submit the sitemap; watch impressions/CTR/coverage.
- You already expose raw Markdown (`/learn/*.md`) and "Open in ChatGPT/Claude" buttons — lean into **AI-crawler discoverability**: consider an `llms.txt` index. As LLMs become a discovery channel, your machine-readable mirror is an asset most sites lack.

### 3.3 The cost/SEO alignment

Your migration report's whole thesis — *keep content static, served as free assets* — is also the #1 SEO requirement (fast, cacheable, crawlable). They reinforce each other. The one trap to avoid (restating Q1): **don't let accounts/personalization push lesson pages into dynamic rendering.** Personalize client-side; keep the crawlable HTML static.

### 3.4 Phase 1 — implementation status (shipped on this branch)

Phase 1 is implemented and committed on `claude/clever-tesla-16t45x`. It's metadata-only — no content, runtime, or rendering-mode changes, so the static-asset cost model is untouched.

| Change | File(s) | What it does |
| --- | --- | --- |
| Shared site constants | **`lib/site.ts`** (new) | Exports `SITE_URL` (`https://dataslope.com`, overridable via `NEXT_PUBLIC_SITE_URL`) and the default `OG_IMAGE`, so layout/pages/sitemap/robots never drift. |
| `metadataBase` + title template + default OG/Twitter | **`app/layout.tsx`** | Sets `metadataBase` (relative OG/canonical URLs now resolve to absolute), replaces the weak `title: "Playground"` default with `default` + `template: "%s · DataSlope"`, and adds a site-level OpenGraph + Twitter card. Routes without their own social tags (playground layouts, `/terms`, `/privacy`) now inherit a shareable card. |
| Home metadata | **`app/page.tsx`** | Adds `alternates.canonical: "/"`, OpenGraph, and Twitter; uses `title: { absolute }` so the template doesn't append a redundant second "Dataslope". |
| Per-lesson metadata | **`app/learn/[[...slug]]/page.tsx`** | `generateMetadata` now returns `alternates.canonical` (the lesson's `page.url`), `openGraph` (`type: "article"`, url, title, description, image), and a `twitter` card — applied to all ~800 lessons. |
| Sitemap | **`app/sitemap.ts`** (new) | Emits `/sitemap.xml` from `source.getPages()` (home + `/learn` index + every lesson), deduped, built statically. The single biggest indexing win. `/playground` and `*.md` omitted to stay consistent with robots. |
| Robots → sitemap | **`app/robots.ts`** | Adds the `sitemap:` directive pointing at `/sitemap.xml`. Disallow rules unchanged. |

**Verification:** `npx tsc --noEmit` and `eslint` on the changed files both pass clean; the production `next build` was run to confirm the sitemap route and `generateMetadata` render. **Left as-is (deliberately):** the title casing inconsistency ("Dataslope" on the home page vs "DataSlope" elsewhere) — to avoid changing brand copy unilaterally.

**Post-merge follow-ups for you:** point Google Search Console + Bing Webmaster Tools at the deployed `/sitemap.xml`; if the production origin ever differs from `https://dataslope.com`, set `NEXT_PUBLIC_SITE_URL`.

### 3.5 Phase 2 — implementation status (shipped on this branch)

JSON-LD structured data and a real OpenGraph image. Still no rendering-mode change — the JSON-LD is emitted into the already-prerendered HTML, and the OG image is a committed static PNG (no runtime `next/og`), so the cost model is untouched.

| Change | File(s) | What it does |
| --- | --- | --- |
| JSON-LD builders | **`lib/structuredData.ts`** (new) | `organizationLd`, `websiteLd`, `breadcrumbLd`, `courseLd` (all absolute-URL'd against `SITE_URL`; `Course` carries `isAccessibleForFree` + a free `Offer`). |
| JSON-LD renderer | **`app/_components/JsonLd.tsx`** (new) | Server component that emits `<script type="application/ld+json">`, with the `<` → escape guard against `</script>` breakout. |
| Course-name resolver | **`lib/courseMeta.ts`** (new) | Reads a course folder's `meta.json` for the human course name/description (the index page's frontmatter title is "Welcome", not the course name). |
| Home structured data | **`app/page.tsx`** | Renders `Organization` + `WebSite`. |
| Lesson structured data | **`app/learn/[[...slug]]/page.tsx`** | `BreadcrumbList` on every page (Learn → Course → Lesson) and `Course` on course landing pages. |
| OG image | **`public/og-default.png`** (new, 1200×630) + **`scripts/build-og-image.mjs`** (new) + `build:og-image` script + `@resvg/resvg-js` devDep | On-brand social card (real logo + "data slope" motif + headline + language chips), rendered SVG→PNG with system fonts. Standalone script (not in the build chain — the card changes ~as often as the logo). `lib/site.ts`'s `OG_IMAGE` now points at it. |

**Verification:** `tsc --noEmit` ✅ and `eslint` ✅ clean; production `next build` ✅ with the JSON-LD present in prerendered HTML (Organization/WebSite on home; BreadcrumbList + Course on a course page; BreadcrumbList on a lesson). The PNG was visually checked (1200×630, logo + text render correctly).

**Deferred to Phase 3+:** per-course OG images; `FAQPage` JSON-LD once the interview section exists; richer `Course` fields (`hasCourseInstance`, workload) if you pursue the Course rich result aggressively.

---

## Q4 — Paid membership where ALL content is free and AI is the premium feature

**Opinion: this is a genuinely sound, well-aligned strategy — and it's effectively the model the Ask AI report already designed.** Your instinct to worry about perception is right, but the fix is *positioning*, not abandoning the model.

### 4.1 Why the economics are right

- **You're charging for the only thing with real marginal cost.** Per the migration report, content is zero-marginal-cost to serve (static assets, unlimited free bandwidth). The thing that costs actual money per use is **LLM inference**. Putting the paywall on inference — and *only* there — is honest and structurally sustainable: revenue scales with the cost it funds.
- **The free tier still delivers the feature.** A daily allowance lets free users *experience* Ask AI (the conversion driver), not just see a locked door. The Ask AI report (§4.7) already specifies "per-user daily token budget with a friendly 'come back tomorrow / upgrade' message" — that mechanism *is* this product.
- **"Unlimited (fair use)" for paid is safe** because the server-side controls already designed (`max_tokens` cap, tiered context packing, per-minute rate limits — §4.4/§4.7) bound the true cost of even a heavy user.

### 4.2 Directly addressing your fear ("feels like the site is mainly for paid users")

The perception risk is real, and it's won or lost on **framing and restraint**, not on the paywall's existence:

1. **Lead with "free forever."** Put "100% free, forever — every lesson, every exercise, every playground" front and center. Position AI as an *optional accelerant*, not the main event. The membership is "support the project / power-user mode," not "unlock the real site."
2. **Never gate anything educational.** No paywall on lessons, exercises, solutions, or running code. The instant a user sees "upgrade to run this," trust is gone. Your moat is the free interactive content; protect it absolutely.
3. **Make the free AI allowance genuinely useful** (e.g., ~5–10 quality chats/day, not 1). A teaser-grade allowance reads as bait; a useful one reads as generous and converts better.
4. **Show the upsell only at the point of value.** No nag modals mid-lesson. Surface the upgrade *when a free user hits their daily limit*, with the friendly copy already specified — that's the one moment the offer is welcome.
5. **Be transparent about usage.** The "context chips" + usage display from the Ask AI report (§4.8) double as a trust signal: users see exactly what they get.

### 4.3 Implementation notes (Cloudflare-native)

- **Put Cloudflare AI Gateway in front** of OpenAI/OpenRouter: it adds caching, rate limiting, per-user analytics, and spend caps — Cloudflare-native cost visibility for exactly this billing model. (The migration report already names AI Gateway as part of the planned backend.)
- **Billing:** Stripe works fine from a Worker (REST + webhooks); store subscription status on the user row in D1, check it in the `/api/ai/chat` handler before spending tokens.
- **Entitlements:** a single `plan` field (`free | member`) gates both the AI daily budget *and* the storage retention from Q5/Q6 — see §7. Bundling "unlimited AI + permanent workspaces" into **one membership** is cleaner than two SKUs and makes the value obvious.

### 4.4 Verdict

Yes — proceed. The model is defensible and increasingly standard ("free content, metered compute"). Success hinges on three things: **(1)** "free forever" is the loudest message on the site, **(2)** the free AI allowance is real, not a teaser, and **(3)** you gate only the variable-cost features (AI, long-term storage), never content. Get those right and the paywall reads as "I can support a project I already love," which is the opposite of "the free users only get a glimpse."

---

## Q5 — Saving (and sharing) non-SQL playground workspaces in D1

**Yes — D1 is close to ideal for non-SQL workspaces, and the cost is negligible.**

### 5.1 Why D1 fits non-SQL workspaces

A non-SQL workspace is just **small text files**. The store shape confirms it (`app/_components/stores/createPlaygroundStore.ts`): `files: PlaygroundFile[]` plus a `dirtyBuffers: Map<fileId, string>`. A Python/JS/C++ workspace is a handful of KB. That's the easiest possible thing to persist in a SQLite-shaped store.

The one D1 limit to respect: **maximum row / string / BLOB value size is 2 MB.** Code never approaches that, so it's a non-issue here (it *does* matter for SQL — see Q6).

### 5.2 Data model

Reuse your existing `WorkspaceEntry` registry shape (`app/_components/opfs/workspace.ts`) almost verbatim as the cloud schema:

```sql
-- one row per saved workspace
CREATE TABLE workspaces (
  id          TEXT PRIMARY KEY,         -- your existing ws_… id
  user_id     TEXT NOT NULL,            -- FK to the auth user (Q1)
  name        TEXT NOT NULL,
  playground  TEXT NOT NULL,            -- "python" | "javascript" | …
  doc         TEXT NOT NULL,            -- JSON: { files:[{filename,content}], activeFile }
  share_id    TEXT UNIQUE,              -- null until shared; random slug for /p/:shareId
  visibility  TEXT DEFAULT 'private',   -- private | unlisted | public
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  expires_at  INTEGER                   -- null = permanent (paid); set = free-tier TTL
);
CREATE INDEX idx_ws_user ON workspaces(user_id);
CREATE INDEX idx_ws_expiry ON workspaces(expires_at);
```

Storing the whole workspace as one JSON `doc` column (one row per workspace) is simplest and keeps you trivially under 2 MB. If you ever expect a workspace > 2 MB (you won't, for code), split into a child `files` table instead. Your `workspaceArchive.ts` already serializes a workspace to a portable bundle — the cloud format is the same idea minus the ZIP.

### 5.3 Cost — this is the cheap part

- **Storage:** 5 GB on the D1 free tier holds *millions* of code workspaces. Effectively free for a long time.
- **The real lever is writes, not storage.** Free tier ≈ 5M rows read/day but only ~100K rows written/day. So **debounce saves** — which you already do for OPFS DB writes in `databaseStorage.ts` (idle-callback + flush on `pagehide`/`visibilitychange`). Reuse that exact discipline: write to D1 on **explicit Save** and on `pagehide`, never per keystroke. That keeps you inside the free tier at meaningful scale, and even paid writes are ~$1/million rows.

### 5.4 Retention tiers (free = ~1 week, paid = permanent)

The `expires_at` column does it:
- **Free:** `expires_at = now + 7 days`, refreshed each time the workspace is opened (so active work doesn't vanish; only abandoned drafts age out).
- **Paid:** `expires_at = NULL` (permanent).
- **Sweep with a Workers Cron Trigger** — a daily `DELETE FROM workspaces WHERE expires_at < now`. This mirrors the pattern you already run for the R2 incremental-cache cleanup (the scheduled GitHub Action in the README), just inside the Worker. One cheap scheduled query.

### 5.5 Sharing

- Minting a share = generate a random `share_id`, set `visibility`. A **public read route** `/p/:shareId` (or `/s/:id`) does a single indexed D1 read and hydrates a read-only playground. Reads are the cheap operation, so shared links scale fine.
- Add **OpenGraph meta** on the share route so links unfurl nicely (ties into Q3).
- Consider **fork-on-open** (viewer clicks "Make a copy" → new workspace under their account) — the natural collaboration model and a nice growth loop.
- **Abuse control:** cap workspace count per free user; keep `visibility` private by default; rate-limit share creation.

### 5.6 Sync model (how it meshes with what you have)

Treat **OPFS as the local cache / offline copy and D1 as the cloud source of truth.** On Save → serialize the store → `PUT /api/workspaces/:id` → D1 (+ keep the OPFS copy). On Open → fetch from D1 → hydrate the Zustand store and OPFS. Use `updated_at` for last-write-wins / stale-tab detection — the cross-*device* analogue of today's single-tab `acquireWorkspaceLock()` (Web Locks). You're extending the existing local model outward, not replacing it.

---

## Q6 — Persisting SQL playground workspaces cost-effectively

This is the one case where "just store it in D1" is the **wrong** answer — and there's a cheaper, more elegant approach that your codebase is already structured for.

### 6.1 The catch with SQL workspaces

A SQL workspace isn't just text — it includes a **database binary**. `app/_components/opfs/databaseStorage.ts` already persists SQLite/DuckDB files to OPFS locally, and those binaries can be **MB to tens of MB**. Two reasons not to put them in D1:
1. **They exceed D1's 2 MB per-row/BLOB cap** outright.
2. Even chunked, storing many multi-MB binaries in D1 bloats storage and burns the tight write budget. D1 is a *relational* store, not a blob store.

### 6.2 The key insight: the database is *derived state* — store the source, not the bytes

Most SQL-playground databases are reconstructible from **(a)** a known seed dataset + **(b)** the user's own SQL. Your code already works this way: `remoteDatasets.ts` / `fetchRemoteInitSql` seed engines from `dataslope/datasets`, and the SQL blocks carry `remoteInitSql`. So:

**Tier 1 — Reproducible workspaces (the default): store only SQL text + a seed reference.**
Persist the user's queries/scripts (tiny text — goes in D1 exactly like Q5) plus the dataset id/tag. On open, **replay** seed + user SQL to rebuild the database locally in WASM. Storage cost ≈ that of a text file; **no binaries in the cloud at all.** This is just an extension of the seed-replay model you already ship.

```sql
-- SQL workspace = scripts + which seed to rebuild from
CREATE TABLE sql_workspaces (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  engine     TEXT NOT NULL,            -- "sqlite" | "duckdb" | "postgres"
  scripts    TEXT NOT NULL,            -- JSON: the user's tabs/queries (text)
  seed_ref   TEXT,                     -- dataset id + tag, or "none"/"blank"
  snapshot_key TEXT,                   -- R2 object key, only for Tier 2 below
  expires_at INTEGER,                  -- same tiering as Q5
  -- … name, share_id, visibility, timestamps as in Q5 …
);
```

**Tier 2 — Non-reproducible workspaces: snapshot the binary to R2 (not D1).**
When the DB *can't* be cheaply rebuilt — the user imported their own CSV/Parquet/`.sqlite`, or the build is expensive — snapshot the binary to **R2**, which is purpose-built for blobs:
- **10 GB free**, then **$0.015/GB/month**, and — the structural win — **zero egress fees, always.** Opening or sharing a workspace re-downloads its DB with **no bandwidth bill**. That's the same property the migration report praises for static assets, applied to user data.
- One object per workspace, keyed like OPFS already keys it: `workspaces/{id}/db/main.sqlite`.
- **Gzip before upload** — SQLite/DuckDB files compress well, cutting both storage and transfer.
- D1 stores only the *pointer* (`snapshot_key`) + metadata; R2 stores the bytes. D1 and R2 each do what they're good at.

### 6.3 Why R2 over D1 for the binaries (cost framing)

| | D1 (BLOB) | R2 (object) |
| --- | --- | --- |
| Per-item size cap | **2 MB** (kills it) | 5 GB+ — fine |
| Free storage | 5 GB | **10 GB** |
| Egress on open/share | charged via Worker round-trips | **free, always** |
| Built for | relational rows | **large blobs** |
| Verdict | metadata + small text only | **DB snapshots** |

### 6.4 Tiering and retention

- **Free users:** Tier 1 only (script replay) — or allow Tier 2 with a small size cap and the same ~1-week TTL as Q5. Cheapest path, and it nudges toward reproducible workspaces.
- **Paid users:** Tier 2 binary snapshots + permanent retention + larger size caps.
- **Expiry:** R2 **object lifecycle rules** can auto-delete free-tier snapshots after N days (or reuse the Cron sweep from §5.4 to delete both the D1 row and its R2 object together).

### 6.5 Net answer

Yes, you can persist SQL workspaces cheaply — by **not storing the database itself in most cases.** Default to **storing the SQL + seed reference in D1 and replaying** (effectively free); fall back to an **R2 snapshot** only for user-imported/non-reproducible databases (cheap, and zero-egress so opens/shares don't cost bandwidth). Gate binary snapshots and long retention behind the paid tier — which is exactly the "AI + permanent storage" membership from Q4.

---

## How it all fits together (one architecture, phased)

These six features share one backend that bolts onto your existing Worker:

```
                ┌──────────────── Cloudflare ─────────────────┐
  Browser ─────►│  OpenNext Worker (existing)                 │
  (OPFS = local │   ├─ Auth routes ── Better Auth ──► D1 (users, sessions)   [Q1]
   cache)       │   ├─ /api/workspaces ───────────► D1 (workspace docs)      [Q5]
                │   │                              └► R2 (SQL DB snapshots)   [Q6]
                │   ├─ /api/ai/chat ── AI Gateway ─► OpenAI/OpenRouter        [Q4]
                │   │      (daily budget in D1/KV, Stripe plan check)
                │   └─ static /learn + /interview (free assets, unchanged)   [Q2/Q3]
                └─────────────────────────────────────────────┘
```

- **Free tier surfaces:** D1 (5 GB), R2 (10 GB, zero egress), KV (sessions/rate-limit counters), Workers Cron (sweeps). Plenty of runway before any of this costs more than the $5/mo Workers Paid plan you'll likely already be on for AI.
- **Entitlement is one `plan` field** shared by Q4 (AI budget) and Q5/Q6 (retention) — bundle them as a single membership.
- **The static content model is untouched** (Q2/Q3): accounts personalize client-side; lessons stay prerendered free assets.

### Suggested sequence

| Phase | Ships | Why first |
| --- | --- | --- |
| **0** | SEO foundations: `sitemap.ts`, `metadataBase`, canonical/OG, fix home metadata (Q3 Phase 1) | Pure upside, no backend, compounds while you build the rest |
| **1** | Interview Prep collection (Q2) + its FAQ JSON-LD (Q3) | Growth engine; no auth needed; reuses all existing components |
| **2** | Better Auth + D1 (Q1); non-SQL workspace save/share (Q5) | Foundation for everything metered |
| **3** | SQL persistence: D1 script-replay + R2 snapshots (Q6) | Builds on Phase 2's storage layer |
| **4** | Paid membership: AI Gateway + daily budgets + Stripe (Q4), bundling permanent storage | Monetize once the value (AI + storage) exists |

---

## Sources

**Cloudflare pricing & limits (verified 2026-06-21):**
- [Cloudflare D1 — Pricing](https://developers.cloudflare.com/d1/platform/pricing/) — free tier ~5 GB storage, ~5M rows read/day & ~100K rows written/day; Workers Paid ($5/mo) raises allowances dramatically.
- [Cloudflare D1 — Limits](https://developers.cloudflare.com/d1/platform/limits/) — **max string/BLOB/row size = 2 MB**, max SQL statement 100 KB, per-DB size caps.
- [Cloudflare R2 — Pricing](https://developers.cloudflare.com/r2/pricing/) — free 10 GB + 1M Class A + 10M Class B ops/month; **zero egress**; $0.015/GB/mo beyond.
- [Cloudflare Workers KV — Limits](https://developers.cloudflare.com/kv/platform/limits/) & [Pricing](https://developers.cloudflare.com/kv/platform/pricing/) — free 100K reads/day, 1K writes/day, 1 GB; value size up to 25 MB.
- [Cloudflare Workers — Pricing](https://developers.cloudflare.com/workers/platform/pricing/) — Workers Paid $5/mo.

**Auth on Cloudflare / Next.js:**
- [Next.js on Cloudflare Workers (OpenNext)](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [OpenNext — Cloudflare](https://opennext.js.org/cloudflare) — supported features and the `cookies()`-in-middleware caveat.
- [better-auth-cloudflare (D1/KV/R2 integration)](https://github.com/zpg6/better-auth-cloudflare) and [Better Auth 1.5 release](https://better-auth.com/blog/1-5) — native D1 support.
- [Auth.js — Cloudflare D1 adapter](https://authjs.dev/getting-started/adapters/d1).
- [Cloudflare tutorial — Full-stack auth with Next.js + D1](https://developers.cloudflare.com/developer-spotlight/tutorials/fullstack-authentication-with-next-js-and-cloudflare-d1/).
- [better-auth vs NextAuth vs Clerk (2026 comparison)](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk).

**Repo evidence (DataSlope):**
- Deployment & cost model: `wrangler.jsonc`, `open-next.config.ts`, `README.md`, and `agent-outputs/20260620-1545-cloudflare-migration-and-cost-review.md`.
- Ask AI design + per-user budgets: `agent-outputs/20260611-0516-remote-datasets-loading-ux-ask-ai.md` (§4).
- Workspace persistence: `app/_components/opfs/workspace.ts`, `databaseStorage.ts`, `workspaceArchive.ts`, `app/_components/stores/createPlaygroundStore.ts`.
- Content/SEO surfaces: `source.config.ts`, `lib/source.ts`, `app/learn/[[...slug]]/page.tsx` (`generateMetadata`), `app/layout.tsx`, `app/page.tsx`, `app/robots.ts`.
- SQL seed-replay model: `app/_components/runtime/remoteDatasets.ts`, `SqlChallengeCard.tsx`/`SqlCodeBlock.tsx` (`remoteInitSql`).
