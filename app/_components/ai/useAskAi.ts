"use client";

/**
 * Client hook driving an "Ask AI" conversation against `/api/ai/chat`.
 *
 * The endpoint streams Server-Sent Events over a POST response (not an
 * EventSource, since we POST a body), so we read `res.body` and parse `data:`
 * lines ourselves, appending each `delta` to the in-progress assistant message.
 */
import { useCallback, useRef, useState } from "react";
import type {
  AskAiAnswerLength,
  AskAiClientContext,
  AskAiStreamEvent,
  AskAiTurn,
  MemberTier,
} from "@/lib/ai/types";

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UseAskAi {
  messages: UiMessage[];
  streaming: boolean;
  error: string | null;
  /** Tier that served the last answer (from the `done` event). */
  tier: MemberTier | null;
  /** Set when the server returns 401, the caller should show a sign-in CTA. */
  needsSignIn: boolean;
  /** Resolves true once the server ACCEPTED the request (2xx, stream opened),
   *  i.e. the moment a prompt is actually consumed; false on any failure or
   *  no-op. Callers use this to keep their local quota display accurate. */
  send: (question: string) => Promise<boolean>;
  stop: () => void;
  reset: () => void;
}

export function useAskAi(
  collectContext: () => AskAiClientContext,
  /** Read at send time so the latest Settings choice rides with each request. */
  getAnswerLength?: () => AskAiAnswerLength,
): UseAskAi {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<MemberTier | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setNeedsSignIn(false);
  }, []);

  const send = useCallback(
    async (question: string): Promise<boolean> => {
      const q = question.trim();
      if (!q || streaming) return false;
      setError(null);
      setNeedsSignIn(false);

      // History = prior turns (before this question), capped; the server caps
      // again. Snapshot from current state before we mutate it.
      const history: AskAiTurn[] = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: "" },
      ]);
      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;

      const appendDelta = (text: string) =>
        setMessages((prev) => {
          const next = prev.slice();
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + text };
          }
          return next;
        });

      let accepted = false;
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            context: collectContext(),
            history,
            ...(getAnswerLength ? { answerLength: getAnswerLength() } : {}),
          }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          let message = "Something went wrong. Please try again.";
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) message = j.error;
          } catch {
            // non-JSON error body
          }
          if (res.status === 401) setNeedsSignIn(true);
          setError(message);
          // Drop the empty assistant placeholder we optimistically added.
          setMessages((prev) => prev.slice(0, -1));
          return false;
        }

        // From here the server has accepted the request and the prompt is
        // consumed (usage is recorded as the answer streams), even if the
        // user stops or the connection drops mid-stream.
        accepted = true;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
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
            if (!data) continue;
            try {
              const ev = JSON.parse(data) as AskAiStreamEvent;
              if (ev.type === "delta") appendDelta(ev.text);
              else if (ev.type === "done") setTier(ev.tier);
              else if (ev.type === "error") setError(ev.message);
            } catch {
              // partial line, ignore
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Connection lost. Please try again.");
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
      return accepted;
    },
    [messages, streaming, collectContext, getAnswerLength],
  );

  return { messages, streaming, error, tier, needsSignIn, send, stop, reset };
}
