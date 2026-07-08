"use client";

/**
 * Fetch three suggested questions from `/api/ai/suggest` whenever a new
 * "conversation point" is reached: panel opened on an empty conversation, an
 * answer finished streaming, or the conversation was reset. Suggestions are a
 * nicety, any failure resolves to an empty list and the UI hides the section.
 *
 * `turnKey` (the caller passes `messages.length`) identifies the conversation
 * point; a fetch happens at most once per key. Context/history are read
 * through refs at fetch time so selection changes, pinning, and scrolling
 * don't retrigger requests.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AskAiClientContext,
  AskAiSuggestResponse,
  AskAiTurn,
} from "@/lib/ai/types";

interface Args {
  /** Fetch only while this is true (panel open, signed in, not streaming). */
  active: boolean;
  /** Conversation point id, one fetch per distinct value. */
  turnKey: number;
  buildContext: () => AskAiClientContext;
  history: AskAiTurn[];
}

export function useSuggestedQuestions({
  active,
  turnKey,
  buildContext,
  history,
}: Args): {
  suggestions: string[];
  suggestLoading: boolean;
  clearSuggestions: () => void;
} {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const lastKeyRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Read at fetch time via refs so they aren't effect dependencies.
  const buildContextRef = useRef(buildContext);
  const historyRef = useRef(history);
  useEffect(() => {
    buildContextRef.current = buildContext;
    historyRef.current = history;
  });

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  useEffect(() => {
    if (!active) return;
    if (lastKeyRef.current === turnKey) return;
    lastKeyRef.current = turnKey;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setSuggestions([]);
    setSuggestLoading(true);

    void (async () => {
      try {
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: buildContextRef.current(),
            history: historyRef.current.slice(-4),
          }),
          signal: ac.signal,
        });
        if (!res.ok) return;
        const parsed = (await res.json()) as AskAiSuggestResponse;
        if (ac.signal.aborted) return;
        if (Array.isArray(parsed?.questions)) {
          setSuggestions(
            parsed.questions.filter((q) => typeof q === "string").slice(0, 3),
          );
        }
      } catch {
        // Silently no suggestions.
      } finally {
        if (!ac.signal.aborted) setSuggestLoading(false);
      }
    })();

    return () => ac.abort();
  }, [active, turnKey]);

  return { suggestions, suggestLoading, clearSuggestions };
}
