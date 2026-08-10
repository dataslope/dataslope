"use client";

/**
 * Fetch three suggested questions from `/api/ai/suggest` whenever a new
 * "conversation point" is reached: an answer finished streaming, or the
 * conversation was reset. Suggestions are a nicety, any failure resolves to an
 * empty list and the UI hides the section.
 *
 * `turnKey` identifies the conversation point and a fetch happens at most once
 * per key, so the key has to be unique for the life of the panel. The caller
 * passes the **id of the assistant turn** the suggestions would follow.
 *
 * It used to pass `messages.length`, which is not unique: "New conversation"
 * sends the count back to zero, so the second conversation's first answer had
 * key 2 again, the once-per-key guard recognised it, and no suggestions were
 * ever fetched again for the rest of the session. Every conversation after the
 * first silently had no follow-ups. Turn ids are minted per answer and never
 * repeat, so a reset produces new keys by construction.
 *
 * The other half of that bug: a run aborted before it finished (closing the
 * panel mid-fetch — `active` is false while it is shut) used to leave the key
 * marked as done AND `suggestLoading` stuck true, so reopening showed three
 * skeletons that pulsed forever and never resolved. An unfinished run now
 * releases its key so the next activation retries it.
 *
 * Context/history are read through refs at fetch time so selection changes,
 * pinning, and scrolling don't retrigger requests.
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
          // The section just hides — a missing nicety is not worth an error
          // message. But it hid *silently*, which made "the follow-ups stopped
          // working" impossible to diagnose from the browser, so say why here.
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
        // Only the CURRENT run owns the flag; a superseded one leaving it
        // false would hide the newer run's skeletons. Note this no longer
        // keys off `ac.signal.aborted`: an aborted run with no successor left
        // `suggestLoading` true forever, which is what made the skeletons
        // pulse indefinitely after the panel was closed mid-fetch.
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
