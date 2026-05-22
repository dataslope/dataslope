"use client";

/**
 * Shared helpers used by both `<ChallengeCard>` and `<SqlChallengeCard>`:
 *
 *   - `renderInstructions(input)`  — accepts either a React node (used
 *     verbatim) or a markdown string (rendered via a tiny inline parser).
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

// ─── Instructions: ReactNode | markdown string ───────────────────────

type InlineToken =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string };

/** Tokenise a single line of inline markdown. Supports inline `code`,
 *  **bold**, and *italic* / _italic_. Unknown sequences fall through as
 *  plain text. */
function parseInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Scan left-to-right; the first match wins so we don't try to nest.
  const re =
    /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_/g;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > i) tokens.push({ type: "text", value: line.slice(i, m.index) });
    if (m[1] !== undefined) tokens.push({ type: "code", value: m[1] });
    else if (m[2] !== undefined) tokens.push({ type: "bold", value: m[2] });
    else if (m[3] !== undefined) tokens.push({ type: "italic", value: m[3] });
    else if (m[4] !== undefined) tokens.push({ type: "italic", value: m[4] });
    i = m.index + m[0].length;
  }
  if (i < line.length) tokens.push({ type: "text", value: line.slice(i) });
  return tokens;
}

function renderInline(line: string, keyBase: string): ReactNode[] {
  return parseInline(line).map((tok, i) => {
    const key = `${keyBase}-${i}`;
    if (tok.type === "code") return <code key={key}>{tok.value}</code>;
    if (tok.type === "bold") return <strong key={key}>{tok.value}</strong>;
    if (tok.type === "italic") return <em key={key}>{tok.value}</em>;
    return <span key={key}>{tok.value}</span>;
  });
}

/** Parse a markdown string into a flat array of block elements. Handles
 *  paragraphs (blank-line-separated) and bullet lists (`-` / `*` lines).
 *  Aimed at "what an author would write for instructions" — not the full
 *  CommonMark spec. */
export function renderMarkdownInstructions(source: string): ReactNode {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`b-${key++}`}>
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // Gather a paragraph: until a blank line or the start of a list.
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`b-${key++}`}>{renderInline(para.join(" "), `p-${key}`)}</p>,
    );
  }
  return <>{blocks}</>;
}

/** Accepts either a React node or a markdown string. Strings are run
 *  through the tiny markdown renderer; nodes pass through unchanged so
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
