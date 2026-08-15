"use client";

/**
 * Client hook driving an "Ask AI" conversation against `/api/ai/chat`. The
 * endpoint streams SSE over a POST response (no EventSource — we POST a body),
 * so `data:` lines are parsed by hand. Questions asked mid-stream queue rather
 * than being locked out; `drain` runs one request at a time so answers stay
 * ordered. Stop clears the queue as well as aborting the in-flight answer.
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
  /** Stable turn id. Ratings key on it (`/api/ai/feedback`), so it must
   *  survive streaming re-renders — an array index would not. */
  id: string;
  /** Model that produced this answer, from the stream's `done` event. Rides
   *  along with a rating so a downvote says which tier produced it. */
  model?: string;
}

let turnCounter = 0;
/** `crypto.randomUUID` needs a secure context; the counter is the fallback,
 *  and either way the id only has to be unique within one conversation. */
function newTurnId(): string {
  turnCounter += 1;
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `turn-${turnCounter}-${String(Math.trunc(performance.now()))}`;
}

/** What broke, when the stream did not complete normally. `interrupted` means
 *  the answer had already started — the partial text is kept and is worth
 *  reading — where `failed` means nothing arrived at all. */
export type AskAiFailure = "interrupted" | "failed";

export interface AskAiError {
  message: string;
  kind: AskAiFailure;
  /** The question to re-send, when retrying is the obvious next move. */
  retry: string | null;
}

export interface UseAskAi {
  messages: UiMessage[];
  /** Questions accepted while an answer was streaming, oldest first. */
  queued: string[];
  streaming: boolean;
  error: AskAiError | null;
  /** Tier that served the last answer (from the `done` event). */
  tier: MemberTier | null;
  /** Set when the server returns 401, the caller should show a sign-in CTA. */
  needsSignIn: boolean;
  /** Resolves true once the server ACCEPTED the request (prompt consumed);
   *  false on failure/no-op. Queued questions resolve when their turn comes. */
  send: (question: string) => Promise<boolean>;
  stop: () => void;
  reset: () => void;
}

interface QueueItem {
  question: string;
  resolve: (accepted: boolean) => void;
}

export function useAskAi(
  collectContext: () => AskAiClientContext,
  /** Read at send time so the latest Settings choice rides with each request. */
  getAnswerLength?: () => AskAiAnswerLength,
): UseAskAi {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [queued, setQueued] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<AskAiError | null>(null);
  const [tier, setTier] = useState<MemberTier | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Read at request time so neither is a dependency of the engine below,
  // which must keep a stable identity — re-creating it mid-drain would loop.
  const depsRef = useRef({ collectContext, getAnswerLength });
  depsRef.current = { collectContext, getAnswerLength };

  // Mirrored into a ref: a request needs the history as of the moment it
  // starts, which mid-drain is newer than the `messages` this render sees.
  const messagesRef = useRef<UiMessage[]>([]);
  const applyMessages = useCallback((fn: (prev: UiMessage[]) => UiMessage[]) => {
    messagesRef.current = fn(messagesRef.current);
    setMessages(messagesRef.current);
  }, []);

  const queueRef = useRef<QueueItem[]>([]);
  const drainingRef = useRef(false);

  const publishQueue = useCallback(() => {
    setQueued(queueRef.current.map((item) => item.question));
  }, []);

  /** Drop everything waiting, telling each caller its prompt was never spent. */
  const clearQueue = useCallback(() => {
    const dropped = queueRef.current;
    queueRef.current = [];
    publishQueue();
    for (const item of dropped) item.resolve(false);
  }, [publishQueue]);

  /** One question, start to finish. Resolves the accepted/not answer for the
   *  caller's quota display; never throws. */
  const runOne = useCallback(
    async (item: QueueItem): Promise<void> => {
      const { collectContext: getContext, getAnswerLength: getLength } =
        depsRef.current;
      setError(null);
      setNeedsSignIn(false);

      // History = prior turns (before this question), capped; the server caps
      // again.
      const history: AskAiTurn[] = messagesRef.current
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      applyMessages((prev) => [
        ...prev,
        { role: "user", content: item.question, id: newTurnId() },
        { role: "assistant", content: "", id: newTurnId() },
      ]);

      const ac = new AbortController();
      abortRef.current = ac;

      const appendDelta = (text: string) =>
        applyMessages((prev) => {
          const next = prev.slice();
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + text };
          }
          return next;
        });

      let accepted = false;
      // Server said the answer was complete; a socket drop after this is not
      // a failure worth surfacing.
      let completed = false;
      let streamedAny = false;
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: item.question,
            context: getContext(),
            history,
            ...(getLength ? { answerLength: getLength() } : {}),
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
          setError({
            message,
            kind: "failed",
            // Signing in or waiting out a quota reset is the fix for these;
            // a Retry button would just reproduce the same refusal.
            retry: res.status === 401 || res.status === 429 ? null : item.question,
          });
          // Drop the empty assistant placeholder we optimistically added.
          applyMessages((prev) => prev.slice(0, -1));
          // Whatever is queued behind this would hit the same wall.
          if (res.status === 401 || res.status === 429) clearQueue();
          return;
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
            // `:` lines are SSE keepalive comments; they carry nothing.
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            try {
              const ev = JSON.parse(data) as AskAiStreamEvent;
              if (ev.type === "delta") {
                streamedAny = true;
                appendDelta(ev.text);
              } else if (ev.type === "done") {
                completed = true;
                setTier(ev.tier);
                applyMessages((prev) => {
                  const next = prev.slice();
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, model: ev.model };
                  }
                  return next;
                });
              } else if (ev.type === "error") {
                setError({
                  message: ev.message,
                  kind: streamedAny ? "interrupted" : "failed",
                  retry: item.question,
                });
              }
            } catch {
              // partial line, ignore
            }
          }
        }
        // A stream ending without a `done` event ended early — the answer on
        // screen is a fragment, and the reader must be told so.
        if (!completed) {
          setError({
            message: streamedAny
              ? "That answer stopped early."
              : "Couldn't reach the assistant. Please try again.",
            kind: streamedAny ? "interrupted" : "failed",
            retry: item.question,
          });
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // The user pressed Stop. Their own decision needs no error banner.
        } else if (completed) {
          // The connection dropped after the answer was already complete —
          // nothing was lost, so nothing is worth saying.
        } else {
          setError({
            message: streamedAny
              ? "The connection dropped mid-answer."
              : "Couldn't reach the assistant. Please try again.",
            kind: streamedAny ? "interrupted" : "failed",
            retry: item.question,
          });
        }
      } finally {
        abortRef.current = null;
        item.resolve(accepted);
      }
    },
    [applyMessages, clearQueue],
  );

  /** Work the queue down, one answer at a time, until it is empty. */
  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setStreaming(true);
    try {
      for (;;) {
        const next = queueRef.current[0];
        if (!next) break;
        queueRef.current = queueRef.current.slice(1);
        publishQueue();
        await runOne(next);
      }
    } finally {
      drainingRef.current = false;
      setStreaming(false);
    }
  }, [publishQueue, runOne]);

  const send = useCallback(
    (question: string): Promise<boolean> => {
      const q = question.trim();
      if (!q) return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        queueRef.current = [...queueRef.current, { question: q, resolve }];
        publishQueue();
        void drain();
      });
    },
    [drain, publishQueue],
  );

  const stop = useCallback(() => {
    clearQueue();
    abortRef.current?.abort();
  }, [clearQueue]);

  const reset = useCallback(() => {
    clearQueue();
    abortRef.current?.abort();
    applyMessages(() => []);
    setError(null);
    setNeedsSignIn(false);
  }, [applyMessages, clearQueue]);

  return {
    messages,
    queued,
    streaming,
    error,
    tier,
    needsSignIn,
    send,
    stop,
    reset,
  };
}
