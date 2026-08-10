"use client";

/**
 * Client hook driving an "Ask AI" conversation against `/api/ai/chat`.
 *
 * The endpoint streams Server-Sent Events over a POST response (not an
 * EventSource, since we POST a body), so we read `res.body` and parse `data:`
 * lines ourselves, appending each `delta` to the in-progress assistant message.
 *
 * ── Questions queue rather than being locked out ───────────────────────────
 *
 * A question asked while an answer is still streaming is *accepted*, not
 * dropped: it joins `queued`, shows in the transcript as a waiting turn, and is
 * sent the moment the current answer finishes. This is the behaviour every
 * assistant UI has converged on — a thought had mid-answer is not worth losing,
 * and the alternative (a disabled composer) makes the user hold it in their
 * head until the stream ends.
 *
 * Answers stay strictly ordered: `drain` runs one request at a time, so each
 * question still sees the full conversation before it as history. Stop clears
 * the queue as well as aborting the answer in flight — it is the one "stop
 * everything" control, and having it cancel an answer only for the next queued
 * question to start would read as ignoring the button.
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
  /** Stable id for this turn, for the life of the conversation. Assistant
   *  turns are rated by it (`/api/ai/feedback`), so it has to survive the
   *  re-renders a streaming answer causes — an array index would not, and a
   *  rating would follow the position rather than the answer. */
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
  /** Resolves true once the server ACCEPTED the request (2xx, stream opened),
   *  i.e. the moment a prompt is actually consumed; false on any failure or
   *  no-op. Callers use this to keep their local quota display accurate.
   *  A queued question resolves when its turn comes, not when it is queued. */
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

  // Read at request time, so neither of these has to be a dependency of the
  // engine below (which must keep a stable identity across renders — it is
  // driven by refs, and re-creating it mid-drain would be a second loop).
  const depsRef = useRef({ collectContext, getAnswerLength });
  depsRef.current = { collectContext, getAnswerLength };

  // The transcript is mirrored into a ref because a request needs the history
  // *as of the moment it starts*, which during a drain is several setState
  // calls newer than the `messages` this render closed over.
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
      // Whether the server said the answer was complete. A socket that drops
      // *after* this is not a failure the user needs to hear about — the answer
      // on screen is the whole answer.
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
            // `:` lines are SSE comments — the server's keepalive. They carry
            // nothing, and their whole job is to have been sent.
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
        // A stream that ends without a `done` event ended early — the answer on
        // screen is a fragment, and saying so is the difference between the
        // reader trusting it and re-reading it looking for the rest.
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
