/**
 * Provider layer: calls an OpenAI-compatible `/chat/completions` endpoint
 * and returns a validated {@link AutocompleteResponse}.
 *
 * Responses are cached by prompt key + schema version so repeated identical
 * requests skip the network round-trip entirely.
 */

import {
  AUTOCOMPLETE_RESPONSE_FORMAT,
  isAutocompleteResponse,
  type AutocompleteResponse,
} from "./aiAutocompleteSchema";
import { getCachedResponse, setCachedResponse } from "./aiAutocompleteCache";

/** Default model — configurable per-source via AiCompletionProviderOptions. */
export const DEFAULT_AI_MODEL = "gpt-5.4-nano";

export interface AiCompletionProviderOptions {
  /** OpenAI-compatible API base URL, e.g. `"https://api.openai.com/v1"`. */
  apiBaseUrl: string;
  /** API key passed as `Authorization: Bearer <key>`. */
  apiKey: string;
  /**
   * Model identifier. Defaults to {@link DEFAULT_AI_MODEL}.
   * Exposed so callers can swap the model client-side without touching
   * the core provider logic.
   */
  model?: string;
  /** System-turn content describing the completion task. */
  systemPrompt: string;
}

/**
 * Fetch autocomplete suggestions from an OpenAI-compatible endpoint.
 *
 * The call is made with `response_format: json_schema` so the API must
 * return a JSON object conforming to {@link AutocompleteResponse}.
 *
 * @param userPrompt     - The user-turn message (query context).
 * @param promptCacheKey - Stable key for caching; caller is responsible for
 *                         uniqueness within a schema version.
 * @param options        - API credentials and model selection.
 * @param signal         - Optional AbortSignal for request cancellation.
 * @throws If the network request fails, the response is not OK, or the
 *         returned JSON does not conform to the schema.
 */
export async function fetchAiCompletions(
  userPrompt: string,
  promptCacheKey: string,
  options: AiCompletionProviderOptions,
  signal?: AbortSignal,
): Promise<AutocompleteResponse> {
  const cached = getCachedResponse(promptCacheKey);
  if (cached) return cached;

  const model = options.model ?? DEFAULT_AI_MODEL;
  const endpoint = options.apiBaseUrl.replace(/\/$/, "") + "/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: AUTOCOMPLETE_RESPONSE_FORMAT,
      max_tokens: 512,
      temperature: 0,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI API returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI API returned malformed JSON");
  }

  if (!isAutocompleteResponse(parsed)) {
    throw new Error("AI API response failed schema validation");
  }

  setCachedResponse(promptCacheKey, parsed);
  return parsed;
}
