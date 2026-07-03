# Recent PRs — Code Quality & UX Review (#556–#560)

**Date:** 2026-07-03
**Project:** DataSlope (`dataslope/dataslope`)
**Scope:** The five most recent merged PRs, reviewed from their squash-merge commits.
**Reviewed at commit:** `aa306d4` (main tip) — each PR reviewed against the commit it merged as.

> Review-only report. No code was changed. Findings are grounded in the actual diffs and surrounding
> code (file:line), each with a concrete failure/frustration scenario. A prioritized fix backlog is at
> the end. The one item worth fast-tracking is **#556-A (gzip decompression cap)** — a stored,
> weaponizable DoS on the sharing surface.

| PR | Title | Size | Squash commit |
| --- | --- | --- | --- |
| #556 | Playground cloud saves + sharing (R2/D1, `/s/` share pages) | +4419 / −155 | `57d400a` |
| #557 | UI polish + unified workspace/cloud menu | +2183 / −1159 | `aa306d4` |
| #558 | Courses page redesign + route restructure | +1677 / −535 (mostly content moves) | `5effeaf` |
| #559 | Global corner navigation loading badge | +210 | `2ffa212` |
| #560 | Give Ask AI awareness of what the user is looking at | +2312 / −39 | `283ea1c` |

---

## TL;DR

1. **Overall quality is high.** These PRs are careful and well-tested: crypto-random share slugs with modulo-bias rejection, layered upload validation, untrusted-context framing for the LLM, thorough Playwright verification, reduced-motion done properly, and clean refactors with zero dangling references. The items below are the exceptions.

2. **One security item to fast-track:** `gunzipBundle` decompresses shared bundles with no output-size cap, so a ~5 MB gzip payload that expands to multiple GB passes every server check and crashes the tab of every recipient who opens the `/s/` link (#556-A).

3. **A recurring backend anti-pattern:** rate-limits / quotas are "read counter → check → write via `waitUntil` after the response," which is non-atomic and TOCTOU-bypassable under concurrency. It appears in **#556** (guest shares, member quota) and **#560** (suggest daily cap).

4. **A recurring UX anti-pattern:** three trust-building features contain a small defect that makes them *lose* trust — #557's amber "opened since" false alarm, #560's wrong table count in the "What AI can see" panel, and #560's raw-JSON-blob suggested-question pill.

5. **Mobile parity gaps** in #557 (a fresh mobile user can't name/back up their draft) and #558 (the catalog buries the course list below the filter sidebar and hides difficulty/language on rows).

6. **No Critical/blocking correctness bugs** remain (all PRs are merged). Treat this as a fix-forward backlog.

---

## Method

Each PR was squash-merged as a single commit, so every diff is reviewable in isolation via `git show <sha>`. Five independent reviewers each read one PR's full diff plus the surrounding working-tree code, first through a **code-correctness** lens (bugs, security, races, error handling), then a **UX** lens (flows, states, copy, discoverability, accessibility, mobile). The two headline code findings (#556-A gzip, #560 parser) were additionally verified by hand against the current source.

---

## Cross-cutting themes

### Theme 1 — Non-atomic rate limits / quotas (TOCTOU)

The pattern `read counter → check threshold → ctx.waitUntil(increment)` defers the write until *after* the response, so N concurrent requests all read the same pre-increment value and all pass.

- **#556 guest share budget** (`app/api/shares/route.ts:102`): the documented "10/IP/day + 500 global/day" caps are bypassable by concurrency, letting one IP push GBs of 30-day R2 objects. (CF-Connecting-IP itself isn't spoofable behind Cloudflare — this is purely the TOCTOU + deferral.)
- **#556 member storage/share quota** (`app/api/workspaces/[id]/route.ts:124`): concurrent uploads each see the same `bytesUsed`; the 100 MB / 10 GB plan quota can be overshot.
- **#560 suggest daily cap** (`app/api/ai/suggest/route.ts:126` + `lib/ai/limits.ts`): the 300/day per-user cap is overrun by concurrent bursts; only the global 5M-token ceiling is a hard backstop. Worse here because the client **auto-fires** this endpoint (panel open, after every answer, after reset) with no user-typed question.

**Fix:** check-and-increment atomically (`INSERT … ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`, reject on the returned value) *before* doing the work. A per-minute limiter (Durable Object / CF Rate Limiting binding) is already flagged as a follow-up in `limits.ts`.

### Theme 2 — Trust-building features that quietly betray trust

A feature whose entire purpose is to reassure the user, undermined by a small defect. Highest UX leverage because a signal users learn to distrust is worse than no signal.

- **#557 amber "opened since" backup warning** — a false alarm on every reopen (details in #557-U1 / code #557-1).
- **#560 "What AI can see" panel** — displays a wrong table count in the one UI built to earn trust (#560-4).
- **#560 suggested questions** — a malformed reply can surface as a raw JSON blob pill that burns a real chat turn (#560-2).

### Theme 3 — Mobile parity gaps

- **#558** catalog buries the list below ~14 filter controls and hides the level meter + language badge on phone-width rows.
- **#557** a first-time mobile user can't name or back up their (draft) workspace at all.
- **#559** the nav badge floats over the near-full-width AskAi panel on mobile.

---

## PR #556 — Playground cloud saves + sharing

### Code quality

- **[High] #556-A — Unbounded gzip decompression (stored "gzip bomb").** `app/_components/cloud/cloudApi.ts:51` `gunzipBundle` does `JSON.parse(await new Response(stream).text())` with no decompressed-size cap; server upload (`lib/workspaces/server.ts`) validates only gzip magic bytes + *compressed* size. A guest can store a ~5 MB gzip that expands to multiple GB; any recipient who opens the `/s/` link (or the SQL replay path, which re-gunzips) tries to allocate a multi-GB string and crashes the tab. **Fix:** read the `DecompressionStream` in a reader loop and abort past ~150–200 MB before `JSON.parse`, in both `gunzipBundle` and the SQL replay path. *(Hand-verified.)*
- **[Medium] #556-B — Guest share rate-limit bypassable** (see Theme 1). `app/api/shares/route.ts:102`.
- **[Low–Med] #556-C — Member storage/share quota TOCTOU** (see Theme 1). `app/api/workspaces/[id]/route.ts:124`.
- **[Low] #556-D — Orphaned R2 objects / dangling rows on partial failure.** `app/api/shares/route.ts:175` writes `bucket.put` before the D1 insert (and `insertShareRow` has no conflict handling → 500 on slug PK collision), leaving unreferenced R2 bytes no sweep reclaims. Deletes are R2-then-D1, so a failed D1 delete on a *non-expired* row leaves a workspace that 404s on download yet still counts against quota. **Fix:** rely on the README's R2 lifecycle rule and/or write the D1 row first for creates.
- **[Low] #556-E — `isSameOrigin` treats a missing `Origin` header as same-origin** — the sole CSRF defense on cookie-auth mutations. Deliberate and low real-world risk, but a single point of failure; consider also accepting `Sec-Fetch-Site: same-origin`.

*Verified correct:* owner-scoping everywhere, ISO-timestamp lexicographic expiry, ban enforcement, path-traversal-safe R2 keys, React-escaped manifests, crypto-random rejection-sampled slugs (~82 bits).

### UX

- **[High] #556-U1 — Expired/revoked/mistyped share links dead-end on a bare 404.** `app/s/[shareId]/page.tsx:162` calls `notFound()`; there is no `app/s/[shareId]/not-found.tsx` and no `app/not-found.tsx`, so recipients get Next's unbranded "This page could not be found" — no "expired or revoked," no branding, no CTA. This is the most common negative moment in a sharing feature, on the product's viral surface. **Fix:** branded not-found with copy like *"This shared playground has expired or been revoked. Shared links last 30 days. Start your own playground →."*
- **[High] #556-U2 — Delete and Revoke fire instantly, no confirmation.** `app/account/CloudStorageSection.tsx:139,167`. Both irreversible; Revoke silently breaks links others are using. Inconsistent with the thoughtful confirm the PR *does* add for the far-less-destructive "replace local copy" on open. **Fix:** reuse the existing confirm dialog; Revoke copy should name the stakes.
- **[Medium] #556-U3 — Users can't see how close a save/link is to deletion.** `CloudStorageSection.tsx` shows `saved {updatedAt}` / `shared {createdAt}` but retention runs off `last_used_at` / `last_viewed_at`, which are never surfaced — so no per-item countdown, and the shown date understates remaining life for a recently-opened item. **Fix:** show "expires in N days" per row; base recency on the retention clock.
- **[Medium] #556-U4 — Provisioning failures show buttons that always fail (playground only).** The account card self-hides on a 503, but the in-playground Share/Cloud buttons render whenever the browser supports compression, so a user only discovers "Sharing isn't configured yet" after clicking. **Fix:** probe availability / catch the first 503 and disable with a tooltip, matching the account card.
- **[Medium] #556-U5 — Network errors leak raw browser messages.** The friendly fallback only triggers for non-`Error` throws, so a dropped connection surfaces raw `"Failed to fetch"` / `"Load failed"`. **Fix:** branch on `CloudApiError` (show `err.message`) vs everything else (friendly copy).
- **[Low] #556-U6/U7/U8** — "Cloud" button label under-descriptive vs "Share"; 413 copy says "workspace" even in the Share flow; usage shown as text with no bar/near-full cue.

*UX done well:* the save-vs-share mental model is defused directly in copy ("open their own copy — no one can edit yours"); fork-on-open is crystal clear to recipients; guest/member split and upsell are honest and non-nagging; pricing copy (guest "Share playgrounds", footnote 6, hero) is accurate.

---

## PR #557 — UI polish + unified workspace/cloud menu

### Code quality

- **[Medium] #557-1 — "Opened since" backup status is a false positive on every reopen.** `workspaceCloud.tsx:127` `isBackupStale` compares `lastUsedAt > updatedAt`, but `openWorkspace`/`switchActiveWorkspace` bump `lastUsedAt` on every open/reload — not on edits. A just-backed-up workspace turns amber ("may be missing recent changes") on essentially every visit. **Fix:** track a real dirty/edit timestamp (or content hash); soften the copy.
- **[Medium] #557-2 — Expired server session → stuck on "Checking backups…" forever.** `workspaceCloud.tsx:81` sets `setItems(null)` on 401 with a "fall back to signed-out" comment, but `signedOut` is derived from the still-truthy *client* session, so nothing falls back; the popover spins indefinitely and swallows the error. **Fix:** set an auth-lost flag that forces the sign-in row.
- **[Medium] #557-3 — `isSqlPlayground` duplicated with a divergent second source of truth.** `WorkspaceBadge.tsx:128` (local set) vs `workspaceCloud.tsx:22` (imported from `lib/workspaces/types`). The UI decision and action decision use different copies; identical today, latent mismatch when a future SQL dialect is added to one and not the other. **Fix:** delete the local set, import the shared one.
- **[Low] #557-4/5/6** — `refresh()` has no request-ordering/cancellation guard; unguarded `Date.parse(meta.updatedAt)` (NaN → "Invalid Date"; client-vs-server clock skew); facade launch region is a non-semantic clickable `<div>` relying on click-bubbling from the inner button.

*Verified clean:* `CloudShareControls`→`ShareControls` refactor has zero dangling refs, `.brand-name` CSS fully removed, entry-focus policy sound, effects clean up properly.

### UX

- **[High] #557-U1 — The amber "opened since" warning erodes trust** (user face of #557-1). "Backed up 2h ago · opened since — may be missing recent changes" appears before the user types a character. Users either re-upload identical snapshots forever or learn the amber dot is noise. **Fix:** base staleness on edits, or use neutral muted "· reopened since" and drop "may be missing recent changes" unless a real edit occurred.
- **[High] #557-U2 — The "Save" menu contradicts the app's own auto-save story and is mostly disabled once saved.** The button says "Save" though the product message is that local persistence is automatic (`:438,636`); for a registered workspace, 2/3 of the destinations are disabled. **Fix:** rename to "Back up" for registered workspaces, reserve "Name this workspace…" for unnamed drafts, and make backup a checkbox in the name dialog rather than a third row.
- **[Medium] #557-U3 — Mobile users can't name or back up their (draft) workspace at all.** The Save menu + badge are `display:none` on mobile (`playground.css:2771`); the manager drawer only lists *registered* workspaces, and a fresh draft isn't one. **Fix:** surface "Name & save" and "Back up" for the active draft in the mobile manager drawer header.
- **[Medium] #557-U4 — The info explainer is the best legibility asset in the PR but hidden by default** and silent on how Save / Back up / Share relate. **Fix:** show it inline on first open (dismissible); add one line distinguishing Back up (private, editable) from Share (public, immutable).
- **[Medium] #557-U5 — Restore-confirms / Open-backup-doesn't asymmetry is invisible.** Visually the same chip; the label doesn't encode "one overwrites, one doesn't." **Fix:** "Restore — replaces local files" vs "Load into session (doesn't change this workspace)".
- **[Low] #557-U6/U7** — Facade could tempt typing into a mock (low, since any click launches); three slightly different sign-in phrasings for the same action.

*UX done well:* the unify-two-lists IA bet is the right direction; entry-focus policy (mobile no-autofocus, desktop cursor-at-end) is a felt improvement; explainer copy quality; destructive workspace actions are guarded; guests get zero cloud clutter.

---

## PR #558 — Courses page redesign + route restructure

### Code quality

Cleanest of the batch — no correctness bugs; the `/learn`→`/courses`, `/interview`→`/interview-prep`, demos→`/fumadocs-dev` split is applied consistently across loaders, sitemap, robots, `.md` mirrors, AI context, and search index. Three Lows:

- **[Low] #558-1 — Dev-only `/fumadocs-dev` pages leak into learner-facing search.** `scripts/build-search-index.mjs:50` indexes `content/fumadocs-dev` into the global Orama index the course search dialog queries — they're `noindex` + robots-disallowed but still internally searchable. **Fix:** drop that section from `SECTIONS` or filter it from the course search UI.
- **[Low] #558-2 — Stale `/learn` and `/interview` text in dev-gallery UI** (`IllustrationPromptsClient.tsx:182`, `SvgGalleryClient.tsx:175`, `magicui-demo/page.tsx:28` + `layout.tsx:9`) — display text, not links, so no broken nav; note `/illustration-prompts` isn't robots-disallowed so its stale text is crawlable.
- **[Low] #558-3 — Empty-catalog case renders neither list nor empty-state** (`CoursesCatalog.tsx`) — not reachable today (27 valid courses), latent gap.

*Verified correct:* `POPULARITY_ORDER` covers all 27 folders; filters/sorts/counts/tie-breakers consistent; `/courses` stays custom via the `[...slug]` catch-all; `/fumadocs-dev` excluded from sitemap + noindex + robots-disallowed; `.md` rewrites map correctly; AI-context allowlist matches; dropped `/_dotnet` redirect is safe (bundle fetched from jsDelivr).

### UX

- **[High] #558-U1 — On mobile, the filter sidebar pushes the entire course list below the fold.** `CoursesCatalog.tsx:229` grid collapses to one column below `md`, stacking the `<aside>` (~14 tap targets) above the list, with no collapse/drawer. **Fix:** collapse the sidebar into a "Filters" toggle/bottom-sheet or a horizontal chip row on small screens.
- **[High] #558-U2 — On phones, course rows hide the level meter *and* language badge.** `CoursesCatalog.tsx:336` is `hidden … sm:flex`, so below 640px a learner can't tell a beginner course from advanced, or Python from Java, at a glance — the two attributes the sidebar filters on. **Fix:** keep a compact level label + language tag on mobile rows.
- **[High] #558-U3 — Old `/learn/*` and `/interview/*` URLs hard-404 with no redirects** — right after the prior release deliberately indexed ~800 of them. SERP clicks and bookmarks now dead-end. **Fix:** keep cheap 307/308 redirects through the indexing-decay window (they were written, then removed).
- **[Medium] #558-U4 — "Most popular" is a hand-curated stand-in presented as data-driven.** `CoursesCatalog.tsx:305` + `lib/courseCatalog.ts` (which says so explicitly). Also drives the homepage's "four most popular." **Fix:** relabel "Recommended"/"Featured" until analytics exist.
- **[Medium] #558-U5 — Faceted counts are whole-catalog totals and never reflect the active filter.** After picking "Java", Level rows still show catalog-wide numbers, so a user can pick a combination that reads "5" but yields the empty state. **Fix:** compute counts against the other-facets-applied set; grey out zero rows.
- **[Low] #558-U6 — Level meter** dual-encodes difficulty (bar count + color + text label), so it's reasonably colorblind-safe — but the bars are tiny and `aria-hidden`, and on mobile rows where the text label is hidden (U2) difficulty becomes fully unavailable. Red conventionally reads as "error" rather than "advanced." Mostly resolved by fixing U2.

*UX done well:* solid, scannable catalog IA (search + faceted filters + 3-way sort over hairline rows); the empty state is a model (plain recovery copy + inline reset); a11y baseline (`aria-pressed`, `aria-current`, correct pluralization); no theme flash.

---

## PR #559 — Global corner navigation loading badge

### Code quality

Solid small PR — capture-phase rationale is correct, no listener leaks, tight timer discipline, right Suspense boundary, edge cases (modified/middle-click, `target=_blank`, `download`, cross-origin, hash-only) all covered. Two related items in tension:

- **[Medium] #559-1 — Phantom 12s badge on any detected click that never commits.** `NavigationLoadingIndicator.tsx:106`. A same-origin `<a href="/export">` whose `onClick` calls `preventDefault()` (modal, client download), or a link the server answers with `Content-Disposition: attachment`, trips `isPageNavigation` → badge shows at 250ms and stays the full 12s. **Fix:** shorten the safety timeout to ~3–5s.
- **[Low–Med] #559-2 — Safety timeout hides the badge during a genuinely slow (>12s) navigation** (`:89`) — the exact heavy routes this targets. In tension with #559-1; a top bar that stays until commit sidesteps both.
- **[Low] #559-3 — No `aria-live` region** (`:138`), so screen readers get no navigation-progress feedback.

### UX

- **[High] #559-U1 — A bottom-left corner badge is too peripheral to reassure.** After clicking a nav link, attention is at the click point or center, not the least-scanned corner. The pattern this mimics (top-loader libs) uses a **thin full-width top bar** precisely because it's caught in peripheral vision from any origin. **Fix:** make an indeterminate top progress bar the primary signal; keep the diamond badge as an optional flourish.
- **[High] #559-U2 — Screen-reader users get zero navigation feedback** (user face of #559-3). They can't fall back on subtle visuals, so they get the worst version of the original problem. **Fix:** always-mounted `role="status" aria-live="polite"` region toggling its text.
- **[High] #559-U3 — Programmatic navigations show nothing.** `router.push`/`replace` produce no badge, and the slowest "did my click register?" cases (Open playground, Start course, Next lesson) are often buttons. **Fix:** emit a shared "navigation starting" event from the primary CTA buttons or wrap the router.
- **[Medium] #559-U4 — Phantom badge (see #559-1) teaches users to ignore the indicator;** **#559-U5 — the 12s vanish (see #559-2) reads as "it failed"** on genuinely slow loads and may prompt a reload; **#559-U6 — mobile overlap** with the open AskAi panel reads as a rendering glitch.

*UX done well:* reduced-motion swaps spin for a calm pulse (not nothing); deliberate light/dark theming so the loader never dissolves into content; the 250ms delay is the right instinct; `pointer-events: none` can't steal taps; opposite-corner-from-AskAi on desktop.

---

## PR #560 — Give Ask AI awareness of what the user is looking at

### Code quality

- **[Medium] #560-1 — Packing order contradicts the stated resolution order.** `lib/ai/context.ts:157–206`. The system prompt tells the model to resolve "this" as highlighted text → referenced widget → most-visible, but those two highest-signal blocks (selection, pinned widgets) are packed *last* and dropped when `budget <= 0`. On a context-rich page they never reach the model. **Fix:** reserve budget off the top for selection + `referenced:true` widgets.
- **[Medium] #560-2 — `parseSuggestedQuestions` breaks on `[`/`]` in questions.** `lib/ai/suggest.ts:91` matcher `/\[[\s\S]*?\]/` is non-greedy, so `["Why does arr[0] throw?", …]` matches only to the first `]`, fails `JSON.parse`, and the line fallback emits the *entire raw JSON array* as one clickable pill. **Fix:** greedy match (`/\[[\s\S]*\]/`); in the fallback skip structural lines and `trim()` before stripping quotes. *(Hand-verified.)*
- **[Medium] #560-3 — Suggest per-user daily cap bypassable via concurrent bursts** (see Theme 1). `app/api/ai/suggest/route.ts:126`.
- **[Low] #560-4 — "What AI can see" panel entity/table count is wrong.** `sqlSchemaText.ts:36` off-by-one (`entities.length - lines.length + 1`) and `AskAiWidget.tsx:413` counts the "…N more" trailer as a table. **Fix:** drop the `+1`; compute the panel count from actual entity lines.
- **[Low] #560-5 — `useAskAiSource` reads the element once**; a tracked element that mounts late registers as element-less and is treated as always-visible. `contextRegistry.ts:240`. Current consumers are safe; latent trap. Also the module-level `IntersectionObserver` is never `disconnect()`ed.

*Verified strong:* server-side widget bounding (count/label/kind), `(DATA)` framing, allowlisted lesson fetch resists SSRF/traversal, proper auth/ban/timeout on the suggest route.

### UX

- **[High] #560-U1 — The two flagship interactions are undiscoverable after the first message.** Highlight-to-ask and pin are taught only in the empty-state blurb (`AskAiWidget.tsx:340`), which vanishes after one question and never shows for a restored conversation; nothing on the *page* hints that selecting text feeds the assistant. **Fix:** persistent low-weight footer hint + a one-time "Ask AI about this?" tooltip on first selection.
- **[High] #560-U2 — Selection auto-clears after send with no signal.** `AskAiWidget.tsx:230`. A follow-up "explain that more" silently loses its highlighted anchor while the user still believes they're talking about it. **Fix:** keep it sticky until dismissed, or echo the consumed selection on the sent user message.
- **[Medium] #560-U3 — Ambient capture is opt-out-of-*viewing*, not opt-in.** Your code, output, and which MCQ answer you picked are attached by default behind a collapsed "Context" toggle (whose visible label is inconsistent with its `aria-label` "What AI can see"). **Fix:** rename to "What AI can see"; show a one-line inline summary ("Sees: your code + this quiz").
- **[Medium] #560-U4 — The transparency panel shows a wrong table count** (user face of #560-4) — in the one UI built to earn trust. **Fix:** fix the count; degrade gracefully when truncated.
- **[Medium] #560-U5 — Three chip states (ambient / pinned / highlighted) are weakly differentiated, and the pin affordance isn't signposted** (invisible on touch, no hover title). **Fix:** distinct visual language per state; an explicit pin glyph on *unpinned* chips; a first-use legend.
- **[Medium] #560-U6 — Suggested-questions failures** surface as a raw JSON blob pill (see #560-2), and regenerating under *every* answer adds churn/latency signal. **Fix:** parser yields zero pills on malformed replies; consider on-demand follow-ups rather than after every answer.
- **[Low] #560-U7 — Cross-surface copy mismatch:** interview-prep mounts as `surface: "learn"`, so the empty state says "Ask about the **lesson**" on a question bank. **Fix:** parametrize the noun ("lesson" vs "question set").

*UX done well:* the transparency panel is architecturally honest (derived from the same `buildContext()` that builds the payload — can't drift); honest empty-state disclosure; interview-prep correctly suppresses the lesson-text claim; dismissible selection chip and `aria-pressed` on pins.

---

## Prioritized fix backlog

Ranked by value-to-effort, combining both lenses. **Nothing is a merge-blocker** (all merged); this is fix-forward.

| # | Item | PR | Type | Effort |
| --- | --- | --- | --- | --- |
| 1 | Cap gzip decompression output (gzip-bomb) | #556-A | Security | S |
| 2 | "Opened since" false alarm — track edits, not opens (or soften copy) | #557-1/U1 | Bug + UX trust | S–M |
| 3 | Branded `not-found.tsx` for expired shares + confirm dialogs on Delete/Revoke | #556-U1/U2 | UX | S |
| 4 | Greedy array match + entity-count fix (kills JSON-blob pill & wrong count) | #560-2/4 | Bug + UX trust | S |
| 5 | Atomic check-and-increment for share/quota/suggest limits | #556-B/C, #560-3 | Security | M |
| 6 | `aria-live` navigation announcement (+ consider top-bar swap) | #559-3/U1/U2 | UX/a11y | S (bar: M) |
| 7 | Mobile catalog: filter drawer + level/language on rows | #558-U1/U2 | UX | M |
| 8 | Mobile draft name/back-up parity in the manager drawer | #557-U3 | UX | M |
| 9 | Rename "Save" → "Back up"; collapse the 3-destination menu | #557-U2 | UX | M |
| 10 | Redirects for old `/learn`/`/interview` URLs through indexing decay | #558-U3 | UX/SEO | S |
| 11 | Relabel "Most popular" → "Recommended"; faceted counts reflect filters | #558-U4/U5 | UX honesty | S |
| 12 | Reserve budget for selection + pinned widgets before lesson/files | #560-1 | Bug | S |

**Suggested first batch** (small, self-contained, low-risk): #1, #2, #3, #4, #6 — plus the shared error-copy cleanups (#556-U5). The larger design calls (#559 top-bar redesign, #558 mobile layout, #557 Save-menu restructure) are better as separate follow-ups.
