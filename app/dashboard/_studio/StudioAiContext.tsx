"use client";

/**
 * Shared state for the Studio "Fill with AI" feature.
 *
 * A builder registers its kind + an `applyDraft` handler (the function that
 * writes a drafted item into that builder's form). The in-form "Fill with AI"
 * bar just opens the AI Assist panel; the panel's composer calls `draft(prompt)`
 * once the user submits a description, which POSTs to /api/ai/draft and, on
 * success, hands the validated draft to whatever builder is currently
 * registered. Keeping this at the shell level lets the assist panel live in the
 * chrome (full-height, beside the content) while still driving the form the
 * user is looking at.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AiDraftResponse, DraftKind, DraftResult } from "@/lib/ai/draft";

export type ApplyDraft = (draft: DraftResult) => void;

interface ChatMessage {
  who: "user" | "ai";
  text: string;
}

interface StudioAiValue {
  /** Whether the assist panel is open. */
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  /** Provider request in flight. */
  busy: boolean;
  /** Conversation shown in the assist panel for the active builder. */
  messages: ChatMessage[];
  /** The builder currently able to receive a draft, or null on non-builder routes. */
  activeKind: DraftKind | null;
  /** Draft the active builder's item from a free-text description. Resolves to
   *  `true` when the request was billed against the daily Ask AI budget (the
   *  provider was actually invoked), so callers can optimistically decrement a
   *  quota display. */
  draft: (prompt: string) => Promise<boolean>;
  /** Builders call this (in an effect) to register themselves. */
  register: (kind: DraftKind, apply: ApplyDraft) => void;
  unregister: (kind: DraftKind) => void;
}

const StudioAiContext = createContext<StudioAiValue | null>(null);

const DONE_MESSAGE: Record<DraftKind, string> = {
  code: "Drafted the challenge: title, instructions, starter, solution, and tests are in the form. Review each field, then Verify & get link.",
  sql: "Drafted the challenge: schema, seed data, solution query, and checks are filled in. Review the seed data especially, then Verify & get link.",
  mcq: "Drafted the question, choices, and explanations. Check the distractors are plausible but clearly wrong, then Save.",
  quiz: "Drafted a title and description. Add your questions below, then Save.",
};

export function StudioAiProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeKind, setActiveKind] = useState<DraftKind | null>(null);

  // The active builder's apply handler. A ref (not state) so `draft` always
  // sees the latest without re-creating the callback on every keystroke.
  const applyRef = useRef<{ kind: DraftKind; apply: ApplyDraft } | null>(null);

  const register = useCallback((kind: DraftKind, apply: ApplyDraft) => {
    applyRef.current = { kind, apply };
    setActiveKind(kind);
    // A fresh builder starts a fresh conversation.
    setMessages([]);
    setBusy(false);
  }, []);

  const unregister = useCallback((kind: DraftKind) => {
    if (applyRef.current?.kind === kind) {
      applyRef.current = null;
      setActiveKind(null);
      setOpen(false);
    }
  }, []);

  const draft = useCallback(async (prompt: string): Promise<boolean> => {
    const active = applyRef.current;
    if (!active) return false;
    // Generation only starts once the user actually enters a message. An empty
    // prompt (e.g. opening the panel) must never spend a provider request, so
    // it can't surface a spurious "assistant is unavailable" error before the
    // user has asked for anything.
    const trimmed = prompt.trim();
    if (!trimmed) {
      setOpen(true);
      return false;
    }
    setOpen(true);
    setBusy(true);
    setMessages((m) => [...m, { who: "user", text: trimmed }]);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: active.kind, prompt: trimmed }),
      });
      const body = (await res.json().catch(() => null)) as
        | (AiDraftResponse & { error?: string })
        | null;
      // The server bills the daily Ask AI budget whenever it actually reached
      // the provider — a drafted 200 or an unparseable 422. Pre-provider
      // rejections (429 over-budget, 401/403, 502 provider-down) are not billed.
      const counted = res.ok || res.status === 422;
      if (!res.ok || !body?.draft) {
        const message =
          body && typeof body.error === "string"
            ? body.error
            : "Couldn't draft that, try again.";
        setMessages((m) => [...m, { who: "ai", text: message }]);
        return counted;
      }
      // Only apply if the same builder is still mounted (the user may have
      // navigated away mid-request).
      if (applyRef.current?.kind === active.kind) {
        applyRef.current.apply(body.draft);
        setMessages((m) => [...m, { who: "ai", text: DONE_MESSAGE[active.kind] }]);
      }
      return counted;
    } catch {
      setMessages((m) => [
        ...m,
        { who: "ai", text: "Network error reaching the assistant, try again." },
      ]);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const value: StudioAiValue = {
    open,
    openPanel: useCallback(() => setOpen(true), []),
    closePanel: useCallback(() => setOpen(false), []),
    busy,
    messages,
    activeKind,
    draft,
    register,
    unregister,
  };

  return (
    <StudioAiContext.Provider value={value}>{children}</StudioAiContext.Provider>
  );
}

export function useStudioAi(): StudioAiValue {
  const ctx = useContext(StudioAiContext);
  if (!ctx) {
    throw new Error("useStudioAi must be used within a StudioAiProvider");
  }
  return ctx;
}

/**
 * Register this builder as the target for AI drafts while it's mounted. `apply`
 * is stored in a ref, so it's fine to pass a fresh closure each render.
 */
export function useRegisterBuilderDraft(kind: DraftKind, apply: ApplyDraft) {
  const { register, unregister } = useStudioAi();
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    register(kind, (draft) => applyRef.current(draft));
    return () => unregister(kind);
  }, [kind, register, unregister]);
}
