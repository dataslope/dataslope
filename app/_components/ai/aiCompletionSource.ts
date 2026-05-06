/**
 * Reusable CodeMirror CompletionSource factory backed by an AI provider.
 *
 * Designed to be language-agnostic: callers supply a `buildPrompt` function
 * that translates the CodeMirror CompletionContext into a user-turn message
 * and a stable cache key.  The rest of the logic (debouncing, caching,
 * cancellation, graceful fallback) is handled here.
 *
 * Usage example (SQL):
 *   const source = createAiCompletionSource({
 *     apiBaseUrl, apiKey,
 *     systemPrompt: "You are a SQL autocomplete engine…",
 *     buildPrompt: (ctx) => buildSqlPrompt(ctx, schema),
 *     fallback: createSqlCompletionSource(schema),
 *   });
 */

import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";
import {
  fetchAiCompletions,
  type AiCompletionProviderOptions,
} from "./aiCompletionProvider";
import type { AutocompleteSuggestion } from "./aiAutocompleteSchema";

/** Milliseconds to wait after the user stops typing before firing an API call. */
const AI_DEBOUNCE_MS = 300;

export interface AiCompletionSourceOptions extends AiCompletionProviderOptions {
  /**
   * Translate a CodeMirror completion context into a user prompt + cache key.
   *
   * Return `null` to skip the AI call entirely for this context (e.g. cursor
   * is inside a string literal or a comment).
   */
  buildPrompt: (context: CompletionContext) => {
    /** User-turn message sent to the AI. */
    userPrompt: string;
    /**
     * Stable cache key for this prompt.  Must be unique across meaningfully
     * different prompts within the same schema version.
     */
    cacheKey: string;
    /** Document position where completions should begin (the `from` field
     *  returned in the CodeMirror CompletionResult). */
    from: number;
  } | null;
  /** Override the default debounce delay (ms). */
  debounceMs?: number;
  /**
   * Fallback CompletionSource invoked when:
   *   - the AI call fails (network error, bad response, schema mismatch), or
   *   - the AI returns an empty suggestion list.
   */
  fallback?: CompletionSource;
}

/** Promisified sleep that respects an AbortSignal. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function suggestionsToCompletions(
  suggestions: AutocompleteSuggestion[],
): Completion[] {
  return suggestions.map((s) => ({
    label: s.label,
    ...(s.apply !== undefined ? { apply: s.apply } : {}),
    ...(s.detail !== undefined ? { detail: s.detail } : {}),
    type: s.type,
    boost: 100,
  }));
}

/**
 * Create a CodeMirror CompletionSource backed by an OpenAI-compatible API.
 *
 * The returned source:
 *  - Debounces requests by {@link AiCompletionSourceOptions.debounceMs}
 *    (default 300 ms) to avoid excessive API calls during rapid typing.
 *  - Cancels in-flight requests when a newer completion is triggered.
 *  - Serves cached responses when available (keyed by schema version + cacheKey).
 *  - Falls back to {@link AiCompletionSourceOptions.fallback} on any error or
 *    empty result, keeping the autocomplete experience intact.
 */
export function createAiCompletionSource(
  options: AiCompletionSourceOptions,
): CompletionSource {
  let abortController: AbortController | null = null;
  const debounceMs = options.debounceMs ?? AI_DEBOUNCE_MS;

  return async (
    context: CompletionContext,
  ): Promise<CompletionResult | null> => {
    const promptInfo = options.buildPrompt(context);
    if (!promptInfo) {
      return options.fallback
        ? (options.fallback(context) as CompletionResult | null)
        : null;
    }

    // Cancel any in-flight request and debounce timer from the previous call.
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    try {
      await sleep(debounceMs, controller.signal);

      const aiResponse = await fetchAiCompletions(
        promptInfo.userPrompt,
        promptInfo.cacheKey,
        options,
        controller.signal,
      );

      const completions = suggestionsToCompletions(aiResponse.suggestions);
      if (completions.length === 0) {
        return options.fallback
          ? (options.fallback(context) as CompletionResult | null)
          : null;
      }

      return {
        from: promptInfo.from,
        options: completions,
        // Disable incremental filtering — each AI response is context-specific.
        filter: false,
      } satisfies CompletionResult;
    } catch (err: unknown) {
      // Silently swallow abort errors — the caller triggered a newer request.
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      // Any other error (network failure, bad JSON, schema mismatch, …) →
      // fall back to the non-AI source so the user still sees completions.
      return options.fallback
        ? (options.fallback(context) as CompletionResult | null)
        : null;
    }
  };
}
