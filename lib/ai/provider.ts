// OpenAI-compatible streaming provider adapter. Both OpenRouter (free tier) and
// OpenAI (pro tier) implement the same `/chat/completions` streaming API, so one
// fetch drives either. Returns the upstream SSE ReadableStream untouched; the
// route transforms it into our own event stream and captures usage.
import type { ChatMessage } from "./types";

export interface StreamChatArgs {
  messages: ChatMessage[];
  model: string;
  maxTokens: number;
  signal?: AbortSignal;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
}

export async function streamChat(
  args: StreamChatArgs,
  provider: ProviderConfig,
): Promise<ReadableStream<Uint8Array>> {
  const base = provider.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal: args.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
      // OpenRouter attribution headers (ignored by OpenAI): identify the app so
      // it appears on the OpenRouter dashboard / rankings.
      ...(base.includes("openrouter")
        ? { "HTTP-Referer": "https://dataslope.com", "X-Title": "DataSlope" }
        : {}),
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      max_tokens: args.maxTokens,
      temperature: 0.3,
      stream: true,
      // Ask the provider to emit a final usage chunk so we can bill exact tokens
      // (falls back to a char/4 estimate when a provider ignores this).
      stream_options: { include_usage: true },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI provider ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.body as ReadableStream<Uint8Array>;
}
