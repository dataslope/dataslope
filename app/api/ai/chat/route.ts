/**
 * "Ask AI" streaming chat endpoint.
 *
 * Signed-in only. Selects the model by membership tier (see lib/ai/models.ts
 * for the per-tier provider/model config), assembles page/playground context,
 * enforces per-user + global budgets, then streams the provider's answer
 * straight through as Server-Sent Events.
 *
 * `force-dynamic` keeps it off the incremental cache, it reads the session,
 * calls an external API, and streams, so it must run per request (same posture
 * as app/api/auth/[...all]/route.ts). Streaming works natively on the Workers
 * runtime: we return a ReadableStream and pipe the upstream SSE through it.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import { resolveModel } from "@/lib/ai/models";
import {
  buildMessages,
  estimateTokens,
  fetchLessonMarkdown,
} from "@/lib/ai/context";
import { systemPrompt } from "@/lib/ai/prompt";
import { checkBudget, recordUsage, utcDay } from "@/lib/ai/limits";
import { streamChat } from "@/lib/ai/provider";
import { isSameOrigin } from "@/lib/workspaces/server";
import type {
  AskAiAnswerLength,
  AskAiRequest,
  AskAiStreamEvent,
} from "@/lib/ai/types";

/** Output-token multiplier per answer-length preference. Never exceeds the
 *  tier's own `maxTokens` cap (that stays the cost ceiling); "concise" just
 *  spends less. */
const ANSWER_LENGTH_SCALE: Record<AskAiAnswerLength, number> = {
  concise: 0.55,
  balanced: 1,
  detailed: 1,
};

function resolveAnswerLength(value: unknown): AskAiAnswerLength {
  return value === "concise" || value === "detailed" || value === "balanced"
    ? value
    : "balanced";
}

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  // Cookie-authenticated mutation that spends provider tokens, same
  // cross-site posture as the shares/workspaces routes.
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env, ctx } = getCloudflareContext();

  // --- Auth gate: Ask AI is an action, so it requires a session. ---
  // The cookie cache is bypassed here: this route spends provider tokens per
  // request, and the cached session outlives bans/plan changes by up to five
  // minutes (banUser revokes DB sessions, but the signed cookie stays valid
  // until its maxAge). One extra D1 read is noise next to the model call.
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to use Ask AI." }, 401);
  const user = session.user;
  if (user.banned) return json({ error: "This account is suspended." }, 403);

  // --- Parse + validate the request body. ---
  let body: AskAiRequest;
  try {
    body = (await request.json()) as AskAiRequest;
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  const question = (body?.question ?? "").toString().trim();
  if (!question) return json({ error: "Please enter a question." }, 400);
  if (question.length > 4000) {
    return json({ error: "That question is too long." }, 400);
  }
  const context = body.context ?? { surface: "learn" };
  const answerLength = resolveAnswerLength(body.answerLength);

  // --- Tier → model/provider. ---
  const tier = resolveTier(user, env);
  const model = resolveModel(tier, env);
  if (!model) {
    return json({ error: "The assistant isn't configured yet." }, 503);
  }

  // --- Budgets (per-user daily + global ceiling). ---
  const day = utcDay(Date.now());
  const decision = await checkBudget(env, user.id, model, day);
  if (!decision.ok) {
    return json({ error: decision.message }, decision.status ?? 429);
  }

  // --- Context assembly. ---
  // Lesson text is opt-in: fetch it only when the user's context mode asked
  // for it (Full page / a Custom "Lesson text" toggle). "Auto" sends only
  // what's on screen, so we skip the fetch entirely, saving latency + tokens.
  const surface = context.surface === "playground" ? "playground" : "learn";
  const lessonMarkdown =
    surface === "learn" && context.includeLessonText
      ? await fetchLessonMarkdown(context.slug, request.url)
      : null;
  const { messages, approxInputTokens } = buildMessages({
    surface,
    question,
    lessonMarkdown,
    context,
    history: Array.isArray(body.history) ? body.history : [],
    contextBudget: model.contextBudget,
    system: systemPrompt(surface, answerLength),
  });
  const maxTokens = Math.max(
    1,
    Math.round(model.maxTokens * ANSWER_LENGTH_SCALE[answerLength]),
  );

  // --- Call the provider. `upstreamAbort` lets us stop paying for tokens the
  // moment the client disconnects (Stop button / navigation), see cancel(). ---
  const upstreamAbort = new AbortController();
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await streamChat(
      {
        messages,
        model: model.model,
        maxTokens,
        signal: upstreamAbort.signal,
      },
      { baseUrl: model.baseUrl, apiKey: model.apiKey },
    );
  } catch (err) {
    console.error("ai/chat: provider request failed", err);
    return json({ error: "The assistant is unavailable right now." }, 502);
  }

  // --- Transform upstream OpenAI SSE → our event stream; capture usage. ---
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let usageIn = 0;
  let usageOut = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AskAiStreamEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const handleLine = (line: string) => {
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const delta: unknown = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length) {
            answer += delta;
            emit({ type: "delta", text: delta });
          }
          if (parsed?.usage) {
            usageIn = parsed.usage.prompt_tokens ?? usageIn;
            usageOut = parsed.usage.completion_tokens ?? usageOut;
          }
        } catch {
          // keepalive / partial JSON line, ignore.
        }
      };
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            handleLine(line);
          }
        }
        // Flush the decoder and process any unterminated final line, the
        // provider's usage chunk may arrive without a trailing newline, and
        // dropping it would silently fall back to estimated billing.
        buffer += decoder.decode();
        handleLine(buffer.trim());
        emit({ type: "done", tier: model.tier, model: model.model });
      } catch {
        try {
          emit({ type: "error", message: "The answer was interrupted." });
        } catch {
          // controller already closed (e.g. client disconnected)
        }
      } finally {
        reader.releaseLock();
        try {
          controller.close();
        } catch {
          // already closed
        }
        // Bill the tokens actually consumed (exact usage if the provider sent
        // it, else a char/4 estimate of what streamed before any interruption).
        const inTok = usageIn || approxInputTokens;
        const outTok = usageOut || estimateTokens(answer);
        // A failed write undercounts usage against the daily budgets, it
        // must not fail the (already-streamed) response, but log it so
        // undercounting is visible in the Worker logs rather than silent.
        const write = recordUsage(env, user.id, day, inTok, outTok).catch(
          (err) => console.error("ai/chat: usage write failed", err),
        );
        if (ctx?.waitUntil) ctx.waitUntil(write);
      }
    },
    cancel() {
      // Client disconnected (Stop button / navigation): abort the provider
      // fetch so we stop streaming, and stop being billed, immediately.
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      // Defense-in-depth against any proxy that might buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
