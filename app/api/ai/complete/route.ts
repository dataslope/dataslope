/**
 * AI inline code completion (pro members only). POST returns one
 * fill-in-the-middle suggestion; the tier gate is enforced HERE (guests 401,
 * free members 403), billed against completion-specific daily budgets plus
 * the global ceiling. GET is a cheap advisory capability probe
 * (`{ enabled }`); POST re-checks session and tier itself.
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
import { isSameOrigin } from "@/lib/workspaces/server";
import type { AiCompleteAccess, AiCompleteRequest, AiCompleteResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Provider wait cap; a suggestion arriving later is stale anyway. */
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
  // Cookie-authenticated mutation that spends provider tokens, same
  // cross-site posture as the shares/workspaces routes.
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env, ctx } = getCloudflareContext();

  // Cookie cache bypassed: this endpoint spends provider tokens, and the
  // cached session outlives bans/plan changes by up to five minutes. (The GET
  // probe stays on the cheap cached path.)
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

  // --- Call the provider (bounded, a late suggestion is a useless one). ---
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
  } catch (err) {
    console.error("ai/complete: provider request failed", err);
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
  // A failed write must not fail the response; log so the undercounting is
  // visible.
  const write = recordCompletionUsage(env, user.id, day, inTok, outTok).catch(
    (err) => console.error("ai/complete: usage write failed", err),
  );
  if (ctx?.waitUntil) ctx.waitUntil(write);

  return json({ text } satisfies AiCompleteResponse);
}
