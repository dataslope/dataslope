# Code Quality & UX Audit — Full Project (with fixes applied)

**Date:** 2026-07-05
**Project:** DataSlope (`dataslope/dataslope`)
**Audited at:** `a85b3a3` (main tip). Fixes applied on `claude/code-quality-ux-audit-uo1ot0`.
**Prior report:** `agent-outputs/20260703-1600-recent-prs-code-quality-ux-review.md` (PRs #556–#560).

> Unlike the prior report, this one comes **with a fix batch attached**. Method: (1) re-verify every
> finding from the prior report against HEAD, (2) independently review the four commits merged after
> it (#562, #555, #564, #563), (3) run a fresh backend/API + shared-library audit, and (4) run a
> fresh UX/accessibility audit — four independent reviewers, findings verified against source before
> being acted on. Everything marked ✅ below is fixed in this branch; ⏭ items are documented
> follow-ups with the reasoning for deferring them.

---

## TL;DR

1. **Every code finding from the 2026-07-03 report was still present at HEAD** — none of the five
   commits since touched the flagged files. The report's "suggested first batch" is now implemented,
   plus most of its medium items (atomic rate limits, redirects, mobile-adjacent copy fixes).
2. **The fresh audit found real new items**, the biggest being: no `error.tsx`/`not-found.tsx`
   anywhere in `app/` (unbranded white-screen failures site-wide), auth form inputs with no
   programmatic labels, client-supplied chat history able to inject `system`-role messages into the
   LLM call, AI spend routes missing the same-origin gate the storage routes have, and a lazy-purge
   race that could silently destroy a just-saved workspace. All fixed.
3. **The newest four commits are in good shape.** The OAuth state-cookie fix (#564) was verified
   against the installed better-auth source — attribute merging, `__Secure-` prefix, and lifetime
   alignment all hold up. The one substantive issue was marketing copy: the hero called DataSlope a
   "100% free platform" two clicks from a paid Pro plan (fixed — the accurate claim is that every
   course and playground is free).
4. **Scale of the fix batch:** 27 findings fixed across security, correctness, UX, and a11y;
   13 new unit tests; typecheck, lint, and the full vitest suite (774 tests) green.

---

## Part 1 — Fixes from the prior report (verified still present, now fixed)

### Security / correctness

- ✅ **Gzip-bomb cap** (#556-A, High). `gunzipBundle` now reads the `DecompressionStream` through a
  reader loop and aborts past 200 MB decompressed. All untrusted decompression paths (share open,
  SQL replay, cloud open) funnel through this one function — verified via repo-wide
  `DecompressionStream` search. `app/_components/cloud/cloudApi.ts`.
- ✅ **Guest share rate-limit TOCTOU** (#556-B). Replaced read-check-then-`waitUntil`-increment with
  a single conditional upsert (`ON CONFLICT DO UPDATE SET count = count + 1 WHERE count < ? RETURNING`).
  Concurrent bursts can no longer all read the same pre-increment value, and — deliberately — a
  capped request updates nothing, so spam from an already-capped IP can't inflate (and exhaust) the
  shared global counter. Per-IP is reserved before global for the same reason.
  `lib/workspaces/store.ts` (`reserveGuestShare`), `app/api/shares/route.ts`.
- ✅ **Suggest daily-cap TOCTOU** (#560-3). Same treatment: the request slot is claimed atomically
  up front (`reserveSuggestRequest`), tokens recorded after the model call. This endpoint is
  auto-fired by the client, so it was the worst of the three TOCTOUs.
  `lib/ai/limits.ts`, `app/api/ai/suggest/route.ts`.
- ✅ **Context packing order** (#560-1). Selection and pinned ("referenced") widgets are now
  budget-reserved off the top, so a long lesson + many files can never crowd out the two blocks the
  system prompt tells the model to prioritize. Message *order* is unchanged (stable prefix preserved
  for provider prompt caching). `lib/ai/context.ts` + tests.
- ✅ **Suggested-questions parser** (#560-2). Greedy array match first (questions may contain `]`),
  non-greedy as a second candidate (prose after the array may contain `]`), and the line-based
  fallback now skips JSON-structural lines — a malformed reply yields zero pills instead of a raw
  JSON blob pill that burned a chat turn. `lib/ai/suggest.ts` + 4 new tests.
- ✅ **Schema count off-by-one + trailer miscount** (#560-4). The "… and N more entities" arithmetic
  is fixed (and suppressed at 0), and the "What AI can see" panel now counts entities via
  `countSchemaEntities` (which folds the trailer's remainder in) instead of counting raw lines.
  `app/_components/ai/sqlSchemaText.ts`, `AskAiWidget.tsx` + new test file.
- ✅ **`isSqlPlayground` triplication** (#557-3). The local copies in `WorkspaceBadge.tsx` and
  `AskAi.tsx` (`SQL_SEGMENTS`) are gone; both import the shared guard from `lib/workspaces/types`.
- ✅ **401 → infinite "Checking backups…"** (#557-2). An `authLost` flag now forces the signed-out
  sign-in row when the server 401s while the client session cookie still looks valid.
  `app/_components/workspace/workspaceCloud.tsx`.
- ✅ **`isSameOrigin` hardening** (#556-E). When `Origin` is missing, `Sec-Fetch-Site` is consulted
  (reject `cross-site`/`same-site`); requests with neither header behave as before.
  `lib/workspaces/server.ts`.
- ✅ **fumadocs-dev leaked into learner search** (#558-1). Dropped from the search-index `SECTIONS`;
  dev pages were already noindex + robots-disallowed. `scripts/build-search-index.mjs`.

### UX

- ✅ **Branded not-found for share links** (#556-U1, High). `app/s/[shareId]/not-found.tsx` reuses
  the share page's exact shell (HomeNav/HomeFooter, theme bootstrap) and explains
  expired/revoked/mistyped with "Start your own playground" + home CTAs.
- ✅ **Delete/Revoke confirmations** (#556-U2, High). Both now confirm, using the same
  `window.confirm` idiom the file already uses for the local-overwrite guard; the Revoke copy names
  the stakes ("Anyone who has the link will lose access immediately"). Also: the busy row's Open
  button now reads "Opening…". `app/account/CloudStorageSection.tsx`.
- ✅ **Raw "Failed to fetch" leaks** (#556-U5). `cloudApi` now wraps every fetch in `apiFetch`,
  which rewrites network-level failures into friendly `CloudApiError` copy — fixing all six UI
  surfaces (account card, share dialog, workspace menu, share page) at the source.
- ✅ **Amber "opened since" false alarm** (#557-1/U1, High). The registry tracks opens, not edits,
  so the amber dot fired on essentially every visit. The badge dot now only distinguishes "backed
  up" from "not backed up"; "· opened since" remains as a neutral informational note with softened
  hover copy. (The *real* fix — an edit timestamp — needs bumps in every editor write path across
  playground families; deferred, see follow-ups.) `WorkspaceBadge.tsx`, `playground.css`.
- ✅ **Navigation badge a11y** (#559-3/U2, High). Always-mounted `role="status" aria-live="polite"`
  region announces "Loading page…"; the visual badge is `aria-hidden` so it isn't double-announced.
  `NavigationLoadingIndicator.tsx`.
- ✅ **`/learn` + `/interview` hard-404s** (#558-U3, High). `next.config.ts` now 307-redirects
  `/learn(/:path*)` → `/courses(/:path*)` and `/interview(/:path*)` → `/interview-prep(/:path*)`
  through the indexing-decay window (slugs moved 1:1).
- ✅ **"Most popular" mislabel** (#558-U4). Renamed to "Recommended" in the catalog sort and the
  homepage topic pill — `lib/courseCatalog.ts` says explicitly the ranking is a hand-curated
  stand-in with no analytics behind it.
- ✅ **Interview-prep "lesson" copy** (#560-U7). The widget takes a `subjectNoun` prop; interview
  prep now says "question set" / "the questions on screen, your answer, or the underlying concept".
  `AskAi.tsx`, `AskAiWidget.tsx`.

---

## Part 2 — New findings from the fresh audit (fixed)

### Security / correctness (backend sweep)

- ✅ **History role injection** (Medium). `buildMessages` forwarded client-supplied history turns
  verbatim, so a tampered client could send `role: "system"` messages that defeat the prompt's
  "DATA, never instructions" hardening (e.g. the hints-before-solutions rule). Only
  `user`/`assistant` turns with string content pass now; malformed `files`/`outputs`/`slug`/`focus`
  values are also type-guarded instead of throwing 500s. `lib/ai/context.ts` + tests.
- ✅ **AI routes missing the same-origin gate** (Low). `/api/ai/chat`, `/api/ai/complete`,
  `/api/ai/suggest` spend provider money on cookie auth but lacked the `isSameOrigin` check the
  storage mutations have. Added, plus `console.error` on swallowed provider failures so production
  502s are diagnosable.
- ✅ **Lazy-purge race destroying a fresh save** (Medium). A free-tier user re-saving a >30-day-idle
  workspace triggered a background purge of the *same R2 key* the PUT was writing — if the delete
  landed after the put, the fresh save was silently destroyed. The PUT now excludes the id being
  written from the purge (`skipPurgeOfWorkspaceId`). `lib/workspaces/server.ts`,
  `app/api/workspaces/[id]/route.ts`.
- ✅ **Bundle downloads served without download hardening** (Low). Both bundle routes (public share
  + owner download) now send `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`
  — a guest-uploaded arbitrary gzip can no longer be repurposed as browser-rendered content hosted
  on the product domain.
- ✅ **Chunked-upload memory bypass** (Low). `readBundleUpload` rejected oversized Content-Length
  but accepted a *missing* one, letting a chunked body buffer unbounded bytes into the isolate
  before the size check. Non-positive/absent Content-Length now 411s (browsers always send one for
  FormData). `lib/workspaces/server.ts`.
- ✅ **Unbounded bundle file lists** (Low). `validateBundle` now caps files/tabs at 200 and
  filenames at 512 chars — a hostile share could otherwise declare unbounded entries and wedge the
  recipient's OPFS/localStorage on materialize. `lib/workspaces/types.ts` + test.
- ✅ **SSE tail loss** (Low). The chat stream transform now flushes the decoder and processes an
  unterminated final line — the provider's usage chunk could otherwise be dropped, silently falling
  back to estimated billing. `app/api/ai/chat/route.ts`.
- ✅ **Dead code**: unused `usageForUser`/`StoredUsage` removed from `lib/workspaces/store.ts`.

### UX / a11y (fresh sweep)

- ✅ **No `error.tsx` / `not-found.tsx` anywhere** (High). Any uncaught server error showed Next's
  unbranded "Application error" white page; any typo'd URL site-wide got the bare default 404. Added
  a branded root `app/not-found.tsx` (home shell + courses/playground/home CTAs) and a deliberately
  dependency-light `app/error.tsx` (reset button + home link + error digest).
- ✅ **No skip-to-content link** (High). Keyboard/SR users tabbed through the full header on every
  page (~10 stops on playgrounds before the editor). Added a `SkipToContent` first tab stop in the
  root layout that focuses the page's main landmark (h1 fallback), visually hidden until focused.
- ✅ **Auth inputs had no programmatic labels** (High). The floating labels were unassociated
  siblings with placeholder `" "` — screen readers announced "edit text, blank" for every field on
  sign-in and reset-password. All fields now have `id`/`htmlFor`, and inline errors/hints are wired
  via `aria-describedby` + `aria-invalid`. The sign-in/create-account tabs also expose
  `aria-pressed`. `SignInClient.tsx`, `ResetPasswordClient.tsx`.
- ✅ **Run output never announced** (Medium). The playground output pane is now
  `role="log" aria-live="polite"` — a blind user pressing Cmd+Enter hears results/errors land
  instead of silence. `Playground.tsx`.
- ✅ **Home page had no `h1`, marquee read 4×** (Medium). Marquee clones beyond the first are
  `aria-hidden` (generic fix in `components/ui/marquee.tsx`), and the hero has an sr-only `h1`.
- ✅ **Six playgrounds had no page titles** (Medium). `c`, `cpp`, `java`, `javascript`, `php`,
  `typescript` now have the same metadata `layout.tsx` the other six playgrounds had — tabs and
  search snippets are no longer the generic site title.
- ✅ **Internal dev pages in the public footer** (Medium). The "Development" column
  (`/color-test`, `/svg-gallery`, …) is now gated to non-production builds; `/illustration-prompts`
  added to the robots disallow list (the other four were already there).
- ✅ **Stale/wrong copy** (Medium): account empty-state pointed at a "Cloud button" that no longer
  exists (now "use Back up in a playground's workspace menu"); the `/playground` index called the
  Postgres playground "the mocked Postgres playground shell" (it's a full PGlite implementation);
  the index itself was a dead end with zero site navigation (added home/courses/pricing links).
- ✅ **Toolbar tooltip/label mismatches** (Low). "Available Packages"/"Packages" and
  "Export code"/"Export" pairs unified (voice-control users speak the visible tooltip).
- ✅ **Expired reset link dead-ended on the sign-in tab** (Low). `/sign-in?mode=forgot` is now
  supported and the "Request a new link" CTA uses it.

### From the four newest commits (#562, #555, #564, #563)

- ✅ **"100% free platform" hero claim** (Medium) — the only substantive finding. Reworded to the
  accurate claim: *"every course and playground is 100% free"* (the Pro plan sells AI/cloud extras,
  not content). `HomeClient.tsx`. Also fixed nearby: the "11 languages" heading listed 12 items
  (now "12 playgrounds"), and "Javascript, Typescript" casing.
- **Verified solid, no action:** the OAuth state-cookie domain-scoping (#564) — attribute merge
  semantics checked against the installed better-auth 1.6.22 (Secure/HttpOnly/SameSite preserved,
  `__Secure-` prefix correct, 600s maxAge matches the server verification window); the build-comment
  workflow (#562) has no shell-injection surface (single `actions/github-script` step,
  least-privilege permissions); the SVG illustrations (#555) have consistent `role="img"` +
  `aria-label` coverage across 200+ files and zero hardcoded colors.

---

## Part 3 — Follow-ups (documented, not fixed here)

Ranked; each was deliberately deferred as a larger design/product call or a riskier change than
this batch should carry.

1. **Member storage-quota TOCTOU** (#556-C). Unlike the two counter-based limits fixed above,
   member usage is computed by summing live rows, so the fix needs a conditional
   `INSERT … SELECT … WHERE` batch or a maintained usage counter — a schema/write-path decision.
   Overshoot is bounded by per-item caps and only affects the member's own quota.
2. **Real edit tracking for backup staleness** (#557-1 root cause). Add `lastEditedAt` to
   `WorkspaceEntry`, bumped (debounced) from the editor write paths in `Playground.tsx` and the SQL
   playgrounds; then "opened since" can become an honest "edited since last backup" warning again.
3. **Top progress bar for navigation** (#559-U1). The corner badge is too peripheral to reassure,
   the 12s safety timeout both lingers on phantom clicks and vanishes during genuinely slow loads,
   and `router.push` navigations show nothing. A thin indeterminate top bar driven from the primary
   CTAs sidesteps all three; note next/link itself calls `preventDefault`, so click-time heuristics
   cannot distinguish phantom clicks — this needs the redesign, not a timeout tweak.
4. **R2 orphans on user deletion** (backend M2). `removeUser` cascades D1 rows but nothing deletes
   `usr/<id>/*.bundle.gz` — the admin remove flow should enumerate and delete via the existing
   `deleteWorkspaces`/`deleteShares` helpers, or an R2 lifecycle rule should sweep.
5. **Mobile courses catalog** (#558-U1/U2): filter sidebar pushes the list below the fold
   (~14 controls); rows hide level + language below 640px. Needs a filter drawer/chip-row design.
6. **Mobile draft naming/backup parity** (#557-U3) and the **"Save" menu restructure** (#557-U2)
   — the report's larger workspace-menu IA changes.
7. **Faceted counts** (#558-U5): sidebar counts are whole-catalog and can lead into empty states.
8. **Retention countdown** (#556-U3): surface "expires in N days" per cloud item (needs
   `last_used_at`/`last_viewed_at` in the list API responses).
9. **Ask AI discoverability** (#560-U1/U2): persistent hint for highlight-to-ask/pin; make the
   consumed selection visible on the sent message.
10. **Smaller items:** `ai_usage_daily` unbounded growth (prune piggyback), duplicated `json()`
    helper (5 files) and `DEFAULT_GLOBAL_CAP` mirror, `useAskAiSource` late-mount registration +
    never-disconnected IntersectionObserver, resend-verification button on the account page,
    keyboard-accessible pane resizer, CodeMirror tab-trap hint, `<main>` landmark in playground
    shells, "DataSlope" vs "Dataslope" brand casing (pick one; metadata says DataSlope, the
    wordmark says Dataslope), sticky (edited) build comment instead of 2+ comments per push in the
    Cloudflare build workflow.

---

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no errors (49 pre-existing warnings untouched).
- `npm run test` — 53 files, **774 passed** (761 baseline + 13 new: parser bracket/malformed-array
  cases, schema-count arithmetic, context budget-reservation + role-filtering + malformed-input
  tolerance, bundle caps).
- `npm run build` — production build passes.
