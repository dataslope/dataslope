/**
 * "Ask AI" streaming chat endpoint.
 *
 * Signed-in only. Selects the model by membership tier (see lib/ai/models.ts
 * for the per-tier provider/model config), assembles page/playground context,
 * enforces per-user + global budgets, then streams the provider's answer
 * straight through as Server-Sent Events.
 *
 * `force-dynamic` keeps it off the incremental cache — it reads the session,
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
import { checkBudget, recordUsage, utcDay } from "@/lib/ai/limits";
import { streamChat } from "@/lib/ai/provider";
import type { AskAiRequest, AskAiStreamEvent } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const { env, ctx } = getCloudflareContext();

  // --- Auth gate: Ask AI is an action, so it requires a session. ---
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to use Ask AI." }, 401);
  const user = session.user;

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
  const lessonMarkdown =
    context.surface === "learn"
      ? await fetchLessonMarkdown(context.slug, request.url)
      : null;
  const { messages, approxInputTokens } = buildMessages({
    surface: context.surface === "playground" ? "playground" : "learn",
    question,
    lessonMarkdown,
    context,
    history: Array.isArray(body.history) ? body.history : [],
    contextBudget: model.contextBudget,
  });

  // --- Call the provider. `upstreamAbort` lets us stop paying for tokens the
  // moment the client disconnects (Stop button / navigation) — see cancel(). ---
  const upstreamAbort = new AbortController();
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await streamChat(
      {
        messages,
        model: model.model,
        maxTokens: model.maxTokens,
        signal: upstreamAbort.signal,
      },
      { baseUrl: model.baseUrl, apiKey: model.apiKey },
    );
  } catch {
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
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
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
              // keepalive / partial JSON line — ignore.
            }
          }
        }
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
        const write = recordUsage(env, user.id, day, inTok, outTok).catch(
          () => {},
        );
        if (ctx?.waitUntil) ctx.waitUntil(write);
      }
    },
    cancel() {
      // Client disconnected (Stop button / navigation): abort the provider
      // fetch so we stop streaming — and stop being billed — immediately.
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
