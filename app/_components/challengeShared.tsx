"use client";

/**
 * Shared helpers used by both `<ChallengeCard>` and `<SqlChallengeCard>`:
 *
 *   - `renderInstructions(input)`  — accepts either a React node (used
 *     verbatim) or a markdown string (rendered via react-markdown + GFM).
 *   - `useChallengeToasts()`       — minimal in-card toast manager. Each
 *     card mounts its own viewport so toasts feel attached to the card
 *     even when many are on the page.
 *   - `FormatIcon` / `CopyIcon` / `PlayIcon` — icon glyphs reused by
 *     both cards.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Instructions: ReactNode | markdown string ───────────────────────

/** Renders an instructions string as Markdown using react-markdown + GFM.
 *  Supports the full CommonMark + GitHub-Flavored Markdown surface
 *  (headings, lists, tables, code, autolinks, …) so authors can write
 *  natural Markdown instead of nested JSX. */
export function renderMarkdownInstructions(source: string): ReactNode {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
  );
}

/** Accepts either a React node or a markdown string. Strings are
 *  rendered with react-markdown; nodes pass through unchanged so
 *  existing JSX-based call sites are unaffected. */
export function renderInstructions(input: ReactNode | string): ReactNode {
  if (typeof input === "string") return renderMarkdownInstructions(input);
  return input;
}

// ─── In-card toasts ───────────────────────────────────────────────────

export interface ChallengeToast {
  id: number;
  message: string;
  kind: "info" | "warn";
}

export interface ChallengeToastApi {
  toasts: ChallengeToast[];
  show: (message: string, kind?: "info" | "warn") => void;
  dismiss: (id: number) => void;
}

/** Tiny self-contained toast manager — one queue per card. Toasts
 *  auto-dismiss after 2.4s; the user can also click the close button. */
export function useChallengeToasts(): ChallengeToastApi {
  const [toasts, setToasts] = useState<ChallengeToast[]>([]);
  const seqRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, kind: "info" | "warn" = "info") => {
      const id = ++seqRef.current;
      setToasts((prev) => [...prev, { id, message, kind }]);
      const timer = setTimeout(() => dismiss(id), 2400);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return { toasts, show, dismiss };
}

/** Renders a toast stack at the bottom-right of the containing card.
 *  Expects to be placed inside a position-relative ancestor (the card
 *  root). */
export function ChallengeToastViewport({
  toasts,
  onDismiss,
  className,
  itemClassName,
}: {
  toasts: ChallengeToast[];
  onDismiss: (id: number) => void;
  className: string;
  itemClassName: string;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className={className} role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={itemClassName} data-kind={t.kind}>
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <X size={12} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Shared SVG glyphs ────────────────────────────────────────────────
// We use lucide-react glyphs so the challenge cards share an icon
// language with the playgrounds and code-blocks. `Play` ships with a
// thin stroke that reads small; we keep a tiny solid-triangle here for
// the primary Run button so it matches the playgrounds' filled glyph.

import { Copy as LucideCopy, Wand2 } from "lucide-react";

export function CopyIcon() {
  return <LucideCopy size={13} aria-hidden />;
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden>
      <path d="M2 1l9 5-9 5V1z" fill="currentColor" />
    </svg>
  );
}

/** Format code glyph. Matches the wand icon used by `<Playground>`'s
 *  Format button so the two surfaces feel like one product. */
export function FormatIcon() {
  return <Wand2 size={13} aria-hidden />;
}

/** Stable, deterministic short-id for a card given a React useId() seed.
 *  Pulled out so both card flavours can share the implementation. */
export function useShortId(prefix: string): string {
  const reactId = useId();
  let h = 0;
  for (let i = 0; i < reactId.length; i++) {
    h = (h * 31 + reactId.charCodeAt(i)) >>> 0;
  }
  const suffix = h.toString(16).slice(0, 4).padStart(4, "0");
  return `${prefix}-${suffix}`;
}
