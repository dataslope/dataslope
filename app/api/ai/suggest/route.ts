/**
 * Ask AI suggested-questions endpoint.
 *
 * POST, three context-grounded questions for the panel's empty state and
 * after each answer. Signed-in only (it spends provider tokens), but tracked
 * on suggestion-specific daily counters (migration 0006) so it never consumes
 * the member's Ask AI chat budget. Always served by the cheapest configured
 * provider (free tier config first) regardless of the member's tier,
 * suggestions are a UI nicety, not the answer itself.
 *
 * Failures return an error status and the client silently hides the section;
 * nothing here should ever surface as a blocking error to the user.
 *
 * `force-dynamic` for the same reason as app/api/ai/chat/route.ts: reads the
 * session, talks to an external API, must run per request.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveModel } from "@/lib/ai/models";
import {
  buildMessages,
  estimateTokens,
  fetchLessonMarkdown,
} from "@/lib/ai/context";
import {
  SUGGEST_LIMITS,
  parseSuggestedQuestions,
  suggestInstruction,
  suggestSystemPrompt,
} from "@/lib/ai/suggest";
import {
  recordSuggestUsage,
  reserveSuggestRequest,
  utcDay,
} from "@/lib/ai/limits";
import { completeChat } from "@/lib/ai/provider";
import { isSameOrigin } from "@/lib/workspaces/server";
import type { AskAiSuggestRequest, AskAiSuggestResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** How long we'll wait on the provider. Suggestions that arrive after this
 *  are stale, the user has started typing their own question. */
const PROVIDER_TIMEOUT_MS = 10_000;

export async function POST(request: Request): Promise<Response> {
  // Cookie-authenticated mutation that spends provider tokens, same
  // cross-site posture as the shares/workspaces routes.
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env, ctx } = getCloudflareContext();

  // --- Auth gate. Cookie cache bypassed: this endpoint spends provider
  // tokens per request (same posture as /api/ai/chat). ---
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to use Ask AI." }, 401);
  const user = session.user;
  if (user.banned) return json({ error: "This account is suspended." }, 403);

  // --- Parse the request body. ---
  let body: AskAiSuggestRequest;
  try {
    body = (await request.json()) as AskAiSuggestRequest;
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  const context = body?.context ?? { surface: "learn" as const };
  const history = Array.isArray(body?.history) ? body.history.slice(-4) : [];

  // --- Cheapest configured provider, regardless of the member's tier. ---
  const model = resolveModel("free", env) ?? resolveModel("pro", env);
  if (!model) return json({ error: "Not configured." }, 503);

  // --- Budgets (suggestion-specific per-user counters + global ceiling).
  // The request slot is reserved atomically up front, this endpoint is
  // auto-fired by the client, so a deferred count would let concurrent
  // bursts through the daily cap. ---
  const day = utcDay(Date.now());
  const decision = await reserveSuggestRequest(env, user.id, SUGGEST_LIMITS, day);
  if (!decision.ok) {
    return json({ error: decision.message }, decision.status ?? 429);
  }

  // --- Context assembly: same pipeline as chat, smaller budget, and the
  // suggestion instruction takes the place of the user's question. ---
  const surface = context.surface === "playground" ? "playground" : "learn";
  const lessonMarkdown =
    surface === "learn"
      ? await fetchLessonMarkdown(context.slug, request.url)
      : null;
  const { messages, approxInputTokens } = buildMessages({
    surface,
    question: suggestInstruction(history.length > 0),
    lessonMarkdown,
    context,
    history,
    contextBudget: SUGGEST_LIMITS.contextBudget,
    system: suggestSystemPrompt(surface),
  });

  // --- Call the provider (bounded, late suggestions are useless). ---
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), PROVIDER_TIMEOUT_MS);
  let result;
  try {
    result = await completeChat(
      {
        messages,
        model: model.model,
        maxTokens: SUGGEST_LIMITS.maxTokens,
        signal: abort.signal,
      },
      { baseUrl: model.baseUrl, apiKey: model.apiKey },
    );
  } catch (err) {
    console.error("ai/suggest: provider request failed", err);
    return json({ error: "Unavailable." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  const questions = parseSuggestedQuestions(result.text);

  // Bill exact usage when reported, else the char/4 estimate. Best-effort,
  // a failed write must not fail the response, but log the undercount.
  const inTok = result.inputTokens || approxInputTokens;
  const outTok = result.outputTokens || estimateTokens(result.text);
  const write = recordSuggestUsage(env, user.id, day, inTok, outTok).catch(
    (err) => console.error("ai/suggest: usage write failed", err),
  );
  if (ctx?.waitUntil) ctx.waitUntil(write);

  return json({ questions } satisfies AskAiSuggestResponse);
}
