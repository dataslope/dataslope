# "Ask AI" on Cloudflare — implementation spec & abuse-control design

**Date:** 2026-07-01
**Status:** P0 IMPLEMENTED (streaming chat + per-tier model selection). See "Implemented" below.
**Supersedes:** §4 ("Ask AI") of `agent-outputs/20260611-0516-remote-datasets-loading-ux-ask-ai.md`.

### Implemented (this PR)

- **Streaming endpoint** `app/api/ai/chat/route.ts` (`force-dynamic`): signed-in-only, OpenAI-compatible SSE piped straight through, upstream aborted on client disconnect.
- **Per-tier model selection** (`lib/ai/models.ts`, `lib/ai/tier.ts`): free members → a cheaper **OpenRouter** model, pro members → an **OpenAI** model. Tier comes from the new `plan` column (migration `0003`), with a `PRO_USER_EMAILS` allowlist + admins as bootstrap. If only one provider key is set, both tiers degrade to it.
- **Membership field**: `plan` column + Better Auth `additionalFields` so `session.user.plan` is available.
- **Budgets** (`lib/ai/limits.ts`, `ai_usage_*` tables in `0003`): per-user daily request + token caps and a global daily token ceiling (`AI_DAILY_GLOBAL_TOKEN_CAP`); output capped per tier.
- **Context** (`lib/ai/context.ts`): learn = server-fetched `${slug}.md` (slug-guarded); playground = live Zustand store (files + recent output); priority-tiered token packing.
- **Client**: `app/_components/ai/` — a floating chat pane (`AskAiWidget`) mounted once from the root layout, pathname-gated to `/learn` + `/playground`, heavy deps dynamically imported. Renders streamed Markdown, Stop, new-conversation, sign-in CTA, tier badge.
- **Config/docs**: `wrangler.jsonc` vars, `cloudflare-env.d.ts`, README "Ask AI" section.
- **Tests**: `__tests__/aiModels.test.ts`, `__tests__/aiContext.test.ts` (tier/model resolution, packing, slug guard).

**Deferred** (still accurate below): per-widget MCQ/challenge/code-block context capture (v1 uses page-level lesson markdown, which already contains all of them); per-minute rate limiting via a Durable Object / Rate Limiting binding (v1 has daily + global caps only); SQL-playground file context; Turnstile/anonymous tier; conversation persistence; embeddings retrieval.

**Operational note:** apply migration `0003` (`wrangler d1 migrations apply dataslope-auth [--remote]`) and set `AI_FREE_API_KEY` / `AI_PRO_API_KEY` secrets; until at least one key is set the endpoint returns 503 and the pane shows an error.

That earlier section is still correct on the *context model* and *token packing*, but it
predates two things that change the plan: **(a)** auth now exists (Better Auth + D1),
and **(b)** the app now runs on **Cloudflare via OpenNext**, not Node/Vercel. The single
biggest correction: **there is no filesystem at request time** — see §3.2.

**Scope of this doc:** a streaming, context-aware "Ask AI" chat for the `/learn` pages
(content, code blocks, challenge cards, MCQs) and the `/playground/*` surfaces, backed by
an OpenAI-compatible provider (OpenRouter / OpenAI / etc.), plus a concrete abuse-control
design answering "can't they rotate IPs / emails?".

---

## 1. Verdict

Feasible and low-risk. Streaming works *natively* on the Cloudflare Workers runtime (it's
actually a better fit than Node for this), and most prerequisites already exist: Better Auth
for gating, D1 for bookkeeping, `wrangler secret` for keys, and `react-markdown` +
`rehype-highlight` for rendering. The net new work is one streaming route handler, a thin
provider adapter, two context collectors, and rate-limit/usage bookkeeping.

---

## 2. Architecture

```
[AskAiPanel (client component)]
   │  POST /api/ai/chat  { surface, slug?, widget?, workspace?, question, history }
   │  (fetch with ReadableStream response; renders markdown incrementally; Stop = AbortController)
   ▼
[app/api/ai/chat/route.ts]   export const dynamic = "force-dynamic"
   ├─ getCloudflareContext() → env (bindings, secrets)
   ├─ auth gate: createAuth(env, request) → session; 401 if signed out
   ├─ abuse gate (§5): trust-tier quota + hot rate-limit + global daily ceiling
   ├─ context assembly (§3): server-fetched lesson .md + client widget/workspace state,
   │                          packed into a fixed token budget (reuse June §4.4 tiers)
   ├─ provider adapter (§4): fetch(<provider>/chat/completions, { stream: true })
   ▼
   return new Response(upstream.body, { headers: { "Content-Type": "text/event-stream" } })
   (pipe SSE straight through, or through a TransformStream to reshape → plain text deltas)
```

Key idea: the Worker takes the provider's streamed response body (a `ReadableStream`) and
returns it directly. No buffering, no Node APIs, no AI SDK required. OpenNext passes streamed
`Response` objects from route handlers through unchanged.

---

## 3. Cloudflare-specific constraints (read this before coding)

### 3.1 Streaming — works, use `force-dynamic`
- Workers stream `ReadableStream` response bodies natively. Set
  `export const dynamic = "force-dynamic"` on the route so it bypasses the R2 incremental
  cache and runs per request — same pattern as `app/api/auth/[...all]/route.ts`.
- `wrangler.jsonc` already sets `global_fetch_strictly_public`, so the Worker's outbound
  `fetch()` to the provider (and to our own `.md` assets, see below) goes to the public
  internet correctly.
- No hard duration cap while bytes are flowing; a chat stream is well within limits.

### 3.2 ⚠ No filesystem at request time (the correction to the June doc)
`open-next.config.ts` documents this: `node:fs` **throws** in the Worker at request time.
The existing `/learn/*.md` route (`app/llms/learn/[[...slug]]/route.ts`) only uses `readFile`
because it is `force-static` — the read happens at **build** time and is served as a static
asset. A `force-dynamic` AI route **cannot** read lesson files from disk.

Get lesson content one of these ways (recommended order):
1. **Fetch the prerendered `.md` asset.** The lesson markdown already exists at
   `${page.url}.md` as a static asset. From the Worker:
   `fetch(new URL(`/learn/${slug.join("/")}.md`, request.url))`. Zero new build steps,
   already CDN-cached. **Preferred.**
2. **Bundle a build-time index into the Worker** — the exact pattern
   `app/api/search/route.ts` uses (`lib/generated/search-index.js` via
   `scripts/build-search-index.mjs`). Add a lesson-text index the same way if we want
   in-process access without a fetch hop.
3. **Client sends the text** — simplest but least trustworthy for lesson content; fine as a
   fallback.

### 3.3 Request signals available in the Worker
- Real client IP: `request.headers.get("cf-connecting-ip")` — set by Cloudflare at the edge,
  **not** spoofable by the client (unlike raw `X-Forwarded-For`).
- Geo / ASN: the request's `cf` properties (`IncomingRequestCfProperties`) — exposed via
  `getCloudflareContext()` (verify exact accessor when wiring; it carries `country`, `asn`,
  `asOrganization`).
- These feed the abuse controls in §5. Confirm the OpenNext accessors at implementation time.

---

## 4. Provider adapter (OpenAI-compatible)

Keep it ~30 lines behind one interface so OpenRouter ↔ OpenAI ↔ others is a config change:

```ts
// lib/ai/provider.ts (sketch)
interface ChatArgs { messages: Msg[]; model: string; maxTokens: number; signal?: AbortSignal }
async function streamChat({ messages, model, maxTokens, signal }: ChatArgs, env: CloudflareEnv) {
  const res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`,
      // OpenRouter-only niceties (ignored by OpenAI): app attribution headers
      ...(env.AI_BASE_URL.includes("openrouter") && {
        "HTTP-Referer": "https://dataslope.com", "X-Title": "DataSlope",
      }),
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, stream: true,
      stream_options: { include_usage: true } }),
  });
  if (!res.ok || !res.body) throw new Error(`AI provider ${res.status}`);
  return res.body; // ReadableStream of SSE
}
```

- `AI_BASE_URL` (var) + `AI_API_KEY` (secret) + `AI_MODEL` (var) select the provider/model.
- `stream_options.include_usage` returns token counts on the final chunk → log for budgets.
- Recommendation: **OpenRouter** to A/B a cheap default model without new accounts, OR
  **OpenAI direct** for fewest moving parts. Either is fine; the adapter isolates the choice.
- Start with a small/fast/cheap model — this workload is context-heavy, not reasoning-heavy.
- The AI SDK (`ai` / `@ai-sdk/openai`) is optional; a fetch-based pass-through is lighter and
  streams fine on Workers. Prefer the thin adapter unless we want the SDK's client helpers.

---

## 5. Abuse control (the "rotate IPs / emails" problem)

**Framing (be honest about this in code review too):** Sybil abuse has no clean fix without
a scarce identity anchor. You cannot *prevent* IP or email rotation — you raise the
attacker's cost, cap your own downside so rotation buys them almost nothing, and tighten
reactively. Defense in depth + bounded exposure, not a wall.

### 5.1 Anonymous users / IP rotation
- **Primary decision: AI is signed-in only.** This matches the repo rule "auth gates
  *actions*, not content." It converts "rotate free, infinite IPs" into "create accounts"
  (§5.2), which is strictly harder. **Recommended — do this first.**
- IP limits are a speed bump, not a wall: residential proxies, CGNAT (many real users share
  one IP → false positives), VPNs, and IPv6 (2⁶⁴ addrs per attacker) all defeat naive per-IP
  limits. If used at all:
  - Bucket **IPv6 by /64 prefix** (or /48), never the full address.
  - Read IP from `CF-Connecting-IP`; use ASN from `cf` to downgrade/deny datacenter & known
    proxy ASNs (kills the cheap cloud-IP path).
- If an anonymous "one free question" tier is ever wanted: gate the first call behind
  **Cloudflare Turnstile** (free proof-of-humanity token; verify server-side at
  `https://challenges.cloudflare.com/turnstile/v0/siteverify`), and put **edge WAF
  rate-limiting rules** on `/api/ai/*` — these run *before* the Worker (no Worker invocation,
  no D1 write) and use Cloudflare's network-wide bot ML.

### 5.2 Email / account rotation
Ordered by value:
1. **OAuth-first.** Google + GitHub are already configured. Real Google/GitHub accounts are
   far harder to mass-create than emails — those providers fight fakes for us, free. Make
   social login the primary path.
2. **Require email verification** (already available: Better Auth + Resend, gated on
   `RESEND_API_KEY`) — blocks fake-address signups, but **not** disposable inboxes. So pair
   with a **disposable-domain blocklist** enforced in Better Auth's before-create-user hook
   (`databaseHooks.user.create.before`). Reject known temp-mail domains (mailinator,
   10minutemail, guerrillamail, …).
3. **Trust tiers by account age/activity** (§5.4). Fresh accounts get a *tiny* quota that
   grows with age + verified email + real lesson activity. Farming now requires *warming*
   accounts, which doesn't scale.
4. **Keep IP-prefix/ASN limits active for signed-in users too**, so an attacker must rotate
   *both* accounts and network to make progress.
5. **Payment is the real Sybil anchor** (later stage): a paid plan / card-on-file (even a $1
   auth) is the strongest anti-farm signal. Ties into the pricing model — free tier is a
   deliberately small taste; heavy use is paid.

### 5.3 The backstop that makes rotation not matter
- **Global daily spend/token ceiling** on the endpoint, independent of per-user limits. When
  breached, degrade to "AI is busy, try later" — no surprise bill regardless of rotation.
- **Cheap model + small `max_tokens`** (~1k output) → each abusive call costs a fraction of a
  cent; the attacker does huge work for trivial damage.
- **Context/system-prompt lock-in** → we're useless as a general free ChatGPT proxy, which
  removes most *motivation* to farm us.
- **Log usage keyed by user + IP-prefix + ASN**; alert on anomalies; tighten *reactively*
  rather than front-loading friction that punishes real learners.

### 5.4 Where to keep counters (don't hammer D1)
D1's write budget is tight — do **not** do a per-request D1 write for hot counters.
- **Hot path (per-minute / per-request rate limit):** a **Durable Object** counter keyed by
  user id and by IP-prefix, **or** Cloudflare's native **Rate Limiting binding**
  (`.limit({ key })` → `{ success }`). Verify current wrangler binding syntax at
  implementation time (it has been under an `unsafe`/beta namespace).
- **Durable budget (daily tokens, trust tier, usage history):** D1, one upsert per request is
  acceptable here (or batch via the DO and flush periodically). Suggested schema:

```sql
-- migrations/000X_ai_usage.sql (sketch)
CREATE TABLE ai_usage_daily (
  user_id     TEXT NOT NULL,
  day         TEXT NOT NULL,              -- 'YYYY-MM-DD' (UTC)
  requests    INTEGER NOT NULL DEFAULT 0,
  input_tok   INTEGER NOT NULL DEFAULT 0,
  output_tok  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE ai_usage_global (          -- single-row (or day-keyed) global ceiling
  day         TEXT PRIMARY KEY,
  total_tok   INTEGER NOT NULL DEFAULT 0
);
```

Trust-tier resolution (illustrative):

```ts
// tier from session.user: age since createdAt + emailVerified + (optional) activity
function dailyTokenBudget(user): number {
  const ageDays = daysSince(user.createdAt);
  if (!user.emailVerified) return 0;          // must verify to use AI
  if (ageDays < 1)  return 20_000;            // brand-new: a taste
  if (ageDays < 7)  return 100_000;
  return 400_000;                             // established free user
  // paid plans override this entirely
}
```

---

## 6. Context model (unchanged from June §4.3–4.4 — still valid)
- **Server-resolved lesson content:** fetch `${page.url}.md` (§3.2), don't trust the client
  for it.
- **Client-collected live state:**
  - Learning widgets (`CodeBlock`, `ChallengeCard`, MCQ, and SQL variants under
    `app/_components/`) hold their own state — a **per-widget "Ask AI" button** captures that
    block's files, init code, last output/error, and (MCQ) question + chosen answer. Precise,
    small payloads; beats a page-level panel that must guess which block you mean.
  - Playground state lives in the Zustand store (`app/_components/stores/createPlaygroundStore.ts`:
    `dirtyBuffers`, `outputsByFile`, `files`, `activeFileId`) — collect active file + recent
    output + active tab.
- **Token packing:** reuse the priority-tiered budget from June §4.4 (~12k input tokens,
  per-tier caps, head/tail truncation with in-band elision markers). Order messages
  stable-prefix-first (system → lesson → widget files → history → question) to exploit
  provider prompt caching.
- **Prompt-injection posture:** system prompt must state that file contents, program output,
  and lesson text are **data, not instructions**.

---

## 7. Files to add / touch

New:
- `app/api/ai/chat/route.ts` — streaming, `force-dynamic`, auth + abuse gates.
- `lib/ai/provider.ts` — OpenAI-compatible streaming adapter.
- `lib/ai/context.ts` — server-side `.md` fetch + token packing.
- `lib/ai/limits.ts` — trust tiers, rate-limit + daily-budget + global-ceiling checks.
- `lib/ai/prompt.ts` — system prompts per surface.
- `app/_components/ai/AskAiPanel.tsx` — shared client panel (stream render, Stop, context chips).
- `app/_components/ai/collectContext.ts` — per-surface collectors (widget / playground).
- `migrations/000X_ai_usage.sql` — D1 usage/budget tables.
- (optional) a Durable Object class + binding for hot counters.

Touch:
- `CodeBlock.tsx`, `ChallengeCard.tsx`, `MultipleChoiceQuestion.tsx`, SQL variants → add the
  per-widget "Ask AI" affordance + context capture.
- `Playground.tsx` (or shared shell) → mount the panel + wire the store collector.
- `wrangler.jsonc` → add `AI_BASE_URL` / `AI_MODEL` vars, the RL/DO binding; keep `AI_API_KEY`
  as a **secret**.
- `cloudflare-env.d.ts` → declare the new vars/secrets/bindings (hand-maintained, per its note).
- `lib/auth/server.ts` → add the disposable-domain before-create hook (§5.2).
- `.env.example` / `.dev.vars` → document the new keys for local dev.

---

## 8. Config & secrets
- Secret (never in `wrangler.jsonc`): `AI_API_KEY` → `wrangler secret put AI_API_KEY`.
- Vars (`wrangler.jsonc`): `AI_BASE_URL` (e.g. `https://openrouter.ai/api/v1` or
  `https://api.openai.com/v1`), `AI_MODEL`, optional `AI_DAILY_GLOBAL_TOKEN_CAP`.
- Local dev: mirror into `.dev.vars` (works with `initOpenNextCloudflareForDev()` already in
  `next.config.ts`).
- If Turnstile is used: `TURNSTILE_SECRET` (secret) + a public site key.

---

## 9. Phased plan
| Phase | Scope |
| --- | --- |
| P0 | `/api/ai/chat` streaming + `force-dynamic`; **signed-in-only** gate; provider adapter; per-widget Ask AI on CodeBlock/ChallengeCard/MCQ; server `.md` context; token packing; small model + capped `max_tokens`; **global daily ceiling**. |
| P1 | Playground surface + store collector; trust tiers + per-user daily budget in D1; hot rate-limit via DO/RL binding; disposable-domain blocklist; verified-email requirement; usage logging + context chips. |
| P2 | Conversation persistence; cross-course embeddings retrieval; model-escalation ("think harder"); Turnstile + WAF rules if an anonymous tier is introduced; payment-tier quotas. |

---

## 10. Open decisions (pick before/while implementing)
1. **Provider:** OpenRouter (flexible model routing) vs OpenAI direct (simplest). Adapter makes
   it reversible.
2. **Default model** + free-tier `max_tokens`.
3. **Anonymous tier?** Recommend **no** at launch (signed-in only). If yes → Turnstile + WAF.
4. **Hot-counter mechanism:** Durable Object vs native Rate Limiting binding.
5. **Trust-tier thresholds** and the **global daily token cap** number.
6. **Email/password or OAuth-only** for AI-eligible accounts (OAuth-first strongly preferred).
