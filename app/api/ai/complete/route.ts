/**
 * AI inline code completion endpoint (pro members only).
 *
 * POST — one fill-in-the-middle suggestion for the editor's ghost text
 * (app/_components/ai/inlineCompletion.ts). The tier gate is enforced HERE,
 * not just in the client: guests get 401, signed-in free members get 403.
 * Suggestions are non-streaming (a few lines at most), use the same
 * OpenAI-compatible provider as Ask AI (OpenRouter → DeepSeek V4 Flash today;
 * see lib/ai/models.ts + wrangler.jsonc), and bill against completion-specific
 * daily budgets (migration 0004) plus the shared global token ceiling.
 *
 * GET — a cheap capability probe: `{ enabled: boolean }`. The editor extension
 * calls it once per page load to avoid firing doomed POSTs for guests/free
 * members. It's advisory only — POST re-checks the session and tier itself.
 *
 * `force-dynamic` for the same reason as app/api/ai/chat/route.ts: reads the
 * session, talks to an external API, must run per request.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import { resolveModel } from "@/lib/ai/models";
import {
  COMPLETION_LIMITS,
  buildCompletionMessages,
  postProcessCompletion,
  trimContext,
} from "@/lib/ai/completion";
import { estimateTokens } from "@/lib/ai/context";
import { checkCompletionBudget, recordCompletionUsage, utcDay } from "@/lib/ai/limits";
import { completeChat } from "@/lib/ai/provider";
import type { AiCompleteAccess, AiCompleteRequest, AiCompleteResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** How long we'll wait on the provider. An inline suggestion that arrives
 *  after this is stale anyway — the user has moved on. */
const PROVIDER_TIMEOUT_MS = 12_000;

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  const tier = session ? resolveTier(session.user, env) : "free";
  const enabled = tier === "pro" && resolveModel("pro", env) !== null;
  return json({ enabled } satisfies AiCompleteAccess);
}

export async function POST(request: Request): Promise<Response> {
  const { env, ctx } = getCloudflareContext();

  // --- Auth gate: guests are blocked outright. ---
  // Cookie cache bypassed: this endpoint spends provider tokens per request,
  // and the cached session outlives bans/plan changes by up to five minutes.
  // (The advisory GET probe above stays on the cheap cached path — the POST
  // re-checks everything anyway.)
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) {
    return json({ error: "Sign in to use AI autocomplete." }, 401);
  }
  const user = session.user;
  if (user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  // --- Tier gate: completions are a pro feature, enforced server-side. ---
  const tier = resolveTier(user, env);
  if (tier !== "pro") {
    return json({ error: "AI autocomplete requires a Pro membership." }, 403);
  }

  // --- Parse + validate the request body. ---
  let body: AiCompleteRequest;
  try {
    body = (await request.json()) as AiCompleteRequest;
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  const language = (body?.language ?? "").toString().trim();
  if (!language || language.length > COMPLETION_LIMITS.languageMaxLength) {
    return json({ error: "Malformed request." }, 400);
  }
  if (typeof body.prefix !== "string" || typeof body.suffix !== "string") {
    return json({ error: "Malformed request." }, 400);
  }
  const filename =
    typeof body.filename === "string" &&
    body.filename.length <= COMPLETION_LIMITS.filenameMaxLength
      ? body.filename
      : undefined;
  const { prefix, suffix } = trimContext(body.prefix, body.suffix);
  // Nothing typed yet → nothing to complete; don't burn a provider call.
  if (!prefix.trim() && !suffix.trim()) {
    return json({ text: "" } satisfies AiCompleteResponse);
  }

  // --- Provider config (pro tier). ---
  const model = resolveModel("pro", env);
  if (!model) {
    return json({ error: "AI autocomplete isn't configured yet." }, 503);
  }

  // --- Budgets (completion-specific per-user counters + global ceiling). ---
  const day = utcDay(Date.now());
  const decision = await checkCompletionBudget(
    env,
    user.id,
    COMPLETION_LIMITS,
    day,
  );
  if (!decision.ok) {
    return json({ error: decision.message }, decision.status ?? 429);
  }

  // --- Call the provider (bounded — a late suggestion is a useless one). ---
  const messages = buildCompletionMessages({ language, filename, prefix, suffix });
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), PROVIDER_TIMEOUT_MS);
  let result;
  try {
    result = await completeChat(
      {
        messages,
        model: model.model,
        maxTokens: COMPLETION_LIMITS.maxTokens,
        signal: abort.signal,
      },
      { baseUrl: model.baseUrl, apiKey: model.apiKey },
    );
  } catch {
    return json({ error: "AI autocomplete is unavailable right now." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  const text = postProcessCompletion(result.text, prefix);

  // Bill exact usage when reported, else the char/4 estimate.
  const approxInput = messages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0,
  );
  const inTok = result.inputTokens || approxInput;
  const outTok = result.outputTokens || estimateTokens(result.text);
  // A failed write undercounts usage against the daily budgets — it must not
  // fail the response, but log it so undercounting is visible in the Worker
  // logs rather than silent.
  const write = recordCompletionUsage(env, user.id, day, inTok, outTok).catch(
    (err) => console.error("ai/complete: usage write failed", err),
  );
  if (ctx?.waitUntil) ctx.waitUntil(write);

  return json({ text } satisfies AiCompleteResponse);
}
