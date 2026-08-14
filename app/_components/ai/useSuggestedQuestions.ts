"use client";

/**
 * Fetch three suggested questions from `/api/ai/suggest` per "conversation
 * point" (answer finished, or reset). A nicety: any failure resolves to an
 * empty list and the section hides. One fetch per `turnKey`, so the key must
 * be unique for the life of the panel — the caller passes the assistant turn's
 * id (never reused), NOT `messages.length` (repeats across conversations). An
 * unfinished run releases its key so the next activation retries. Context and
 * history are read via refs at fetch time so their changes don't retrigger.
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
  /** Conversation point id, one fetch per distinct value: the id of the
   *  assistant turn these suggestions follow, or "" when there is none. */
  turnKey: string;
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
  const lastKeyRef = useRef<string | null>(null);
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
    if (!active || !turnKey) return;
    if (lastKeyRef.current === turnKey) return;
    lastKeyRef.current = turnKey;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setSuggestions([]);
    setSuggestLoading(true);
    // Whether this run reached a conclusion. A run that did not must release
    // its key on the way out, or the once-per-key guard locks the section off
    // for that answer permanently.
    let settled = false;

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
        settled = true;
        if (!res.ok) {
          // The section just hides; warn so the silent failure is diagnosable.
          console.warn(`Ask AI: no follow-up suggestions (HTTP ${res.status})`);
          return;
        }
        const parsed = (await res.json()) as AskAiSuggestResponse;
        if (ac.signal.aborted) return;
        const questions = Array.isArray(parsed?.questions)
          ? parsed.questions.filter((q) => typeof q === "string").slice(0, 3)
          : [];
        if (!questions.length) {
          console.warn("Ask AI: the model returned no usable follow-ups");
        }
        setSuggestions(questions);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          settled = true;
          console.warn("Ask AI: follow-up suggestions failed", err);
        }
      } finally {
        // Only the CURRENT run owns the flag (a superseded one would hide the
        // newer run's skeletons). Deliberately not keyed off `aborted`: an
        // aborted run with no successor must still clear the loading state.
        if (abortRef.current === ac) setSuggestLoading(false);
      }
    })();

    return () => {
      ac.abort();
      if (!settled && lastKeyRef.current === turnKey) lastKeyRef.current = null;
    };
  }, [active, turnKey]);

  return { suggestions, suggestLoading, clearSuggestions };
}
