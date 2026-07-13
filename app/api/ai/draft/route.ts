/**
 * "Fill with AI" endpoint for the /create builders.
 *
 * POST { kind, prompt } → a normalized draft (lib/ai/draft.ts) the builder
 * applies to its form. Signed-in only (it spends provider tokens) and billed
 * against the member's shared Ask AI daily budget via the same request/token
 * counters as chat (checkBudget / recordUsage), so drafting can't dodge the
 * abuse caps. The draft is validated and clamped server-side to the same
 * limits the save endpoint enforces; code/SQL solutions are still verified
 * against their tests when the user saves, so a wrong draft fails at publish,
 * it never silently ships.
 *
 * `force-dynamic` for the same reason as app/api/ai/chat: reads the session,
 * talks to an external API, must run per request.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveModel } from "@/lib/ai/models";
import { resolveTier } from "@/lib/ai/tier";
import { checkBudget, recordUsage, utcDay } from "@/lib/ai/limits";
import { completeChat } from "@/lib/ai/provider";
import { estimateTokens } from "@/lib/ai/context";
import { isSameOrigin } from "@/lib/workspaces/server";
import {
  DRAFT_MAX_TOKENS,
  DRAFT_PROMPT_MAX,
  draftSystemPrompt,
  draftUserPrompt,
  isDraftKind,
  parseDraft,
  type AiDraftRequest,
  type AiDraftResponse,
} from "@/lib/ai/draft";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Drafting a whole item is a bigger generation than a chat turn; give the
 *  provider a generous but bounded window. */
const PROVIDER_TIMEOUT_MS = 30_000;

export async function POST(request: Request): Promise<Response> {
  // Cookie-authenticated mutation that spends provider tokens, same cross-site
  // posture as the chat / suggest routes.
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env, ctx } = getCloudflareContext();

  // --- Auth gate. Cookie cache bypassed: this endpoint spends provider
  // tokens per request (same posture as /api/ai/chat). ---
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to draft with AI." }, 401);
  const user = session.user;
  if (user.banned) return json({ error: "This account is suspended." }, 403);

  // --- Parse + validate the request body. ---
  let body: AiDraftRequest;
  try {
    body = (await request.json()) as AiDraftRequest;
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  if (!isDraftKind(body?.kind)) {
    return json({ error: "Unknown builder." }, 400);
  }
  const prompt =
    typeof body.prompt === "string" ? body.prompt.slice(0, DRAFT_PROMPT_MAX) : "";

  // --- Resolve the member's model, and their daily budget. ---
  const tier = resolveTier(user, env);
  const model = resolveModel(tier, env);
  if (!model) return json({ error: "AI drafting isn't configured yet." }, 503);

  const day = utcDay(Date.now());
  const decision = await checkBudget(env, user.id, model, day);
  if (!decision.ok) {
    return json({ error: decision.message }, decision.status ?? 429);
  }

  // --- Call the provider for a single JSON draft. ---
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), PROVIDER_TIMEOUT_MS);
  let result;
  try {
    result = await completeChat(
      {
        messages: [
          { role: "system", content: draftSystemPrompt(body.kind) },
          { role: "user", content: draftUserPrompt(body.kind, prompt) },
        ],
        model: model.model,
        maxTokens: DRAFT_MAX_TOKENS,
        signal: abort.signal,
      },
      { baseUrl: model.baseUrl, apiKey: model.apiKey },
    );
  } catch (err) {
    console.error("ai/draft: provider request failed", err);
    return json({ error: "The assistant is unavailable right now." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  // --- Bill usage (best-effort; a failed write never fails the response). The
  // request slot + tokens count against the shared Ask AI daily budget. ---
  const inTok = result.inputTokens || estimateTokens(draftUserPrompt(body.kind, prompt));
  const outTok = result.outputTokens || estimateTokens(result.text);
  const write = recordUsage(env, user.id, day, inTok, outTok).catch((err) =>
    console.error("ai/draft: usage write failed", err),
  );
  if (ctx?.waitUntil) ctx.waitUntil(write);

  const draft = parseDraft(body.kind, result.text);
  if (!draft) {
    return json(
      { error: "Couldn't draft that, try rephrasing your description." },
      422,
    );
  }

  return json({ draft } satisfies AiDraftResponse);
}
