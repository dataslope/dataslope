"use client";

/**
 * Shared helpers for `<ChallengeCard>` and `<SqlChallengeCard>`: instructions
 * rendering, in-card toasts, and shared icon glyphs.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// ─── Boot progress smoothing ─────────────────────────────────────────

/** Smooth coarse stage-floor boot fractions (0.05, 0.55, …) into a creeping
 *  display value (capped pseudo-progress; never reaches 1 — completion is the
 *  boot UI unmounting). Returns null until the first fraction arrives; resets
 *  when `active` goes false. */
export function useCreepingBootFraction(
  target: number | null,
  active: boolean,
): number | null {
  const [display, setDisplay] = useState<number | null>(null);

  useEffect(() => {
    if (!active || target == null) {
      // Reset for the next boot; scheduled, not set synchronously in the effect.
      const reset = window.setTimeout(() => setDisplay(null), 0);
      return () => window.clearTimeout(reset);
    }
    const ceiling = Math.min(target + 0.18, 0.97);
    const advance = () =>
      setDisplay((prev) => {
        const base = Math.max(prev ?? 0, target);
        return base + (ceiling - base) * 0.045;
      });
    // Apply the new stage floor on the next macrotask, then keep creeping.
    const kick = window.setTimeout(advance, 0);
    const tick = window.setInterval(advance, 180);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(tick);
    };
  }, [target, active]);

  return active ? display : null;
}

// ─── Mid-run "preparing" wait ─────────────────────────────────────────
// Turns `RunOptions.onStatus(message, preparing)` reports (e.g. Python/R
// installing packages mid-run) into a `preparing` flag. Becoming visible is
// debounced so an all-cached run never flashes the notice.

const PREPARING_SHOW_DELAY_MS = 150;

export interface MidRunPreparing {
  /** True once a blocking wait has lasted past the debounce window. */
  preparing: boolean;
  /** Latest preparing status message (for the notice title). */
  message: string;
  /** Feed every `onStatus(message, preparing)` from a run here. */
  report: (message: string, preparing?: boolean) => void;
  /** Clear all state, call at the start of each run. */
  reset: () => void;
}

export function useMidRunPreparing(): MidRunPreparing {
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const report = useCallback(
    (msg: string, isPreparing?: boolean) => {
      if (isPreparing) {
        setMessage(msg);
        // Debounce becoming visible so a fast (all-cached) wait is silent.
        if (timerRef.current === null) {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            setPreparing(true);
          }, PREPARING_SHOW_DELAY_MS);
        }
      } else {
        clearTimer();
        setPreparing(false);
      }
    },
    [clearTimer],
  );

  const reset = useCallback(() => {
    clearTimer();
    setPreparing(false);
    setMessage("");
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { preparing, message, report, reset };
}

// ─── Dark mode detection ─────────────────────────────────────────────
// Fumadocs toggles a `dark` class on <html>; fall back to the OS preference
// outside /learn.

function detectIsDark(): boolean {
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return true;
}

/** Subscribe to the document's color scheme. SSR snapshot defaults to dark
 *  to match the site's dark default. */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof document === "undefined") return () => {};
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      const mql =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(prefers-color-scheme: dark)")
          : null;
      mql?.addEventListener?.("change", notify);
      return () => {
        observer.disconnect();
        mql?.removeEventListener?.("change", notify);
      };
    },
    () => detectIsDark(),
    () => true,
  );
}

/** Map dark/light to the matching CodeMirror theme name. */
export function cmThemeNameFor(isDark: boolean): string {
  return isDark ? "github-dark" : "github-light";
}

// ─── Instructions: ReactNode | markdown string ───────────────────────

/**
 * Label every unlabelled opening fence `text`. Safety net only — content
 * fences name their language and a test enforces it. Unlabelled fences are
 * almost always program output, which highlight.js would mislabel as code,
 * so plain `text` beats guessing. Only opening fences are touched.
 */
export function labelBareFences(source: string): string {
  if (!source.includes("```") && !source.includes("~~~")) return source;
  let open = false;
  return source
    .split("\n")
    .map((line) => {
      const m = /^(\s{0,3})(`{3,}|~{3,})(\s*)(\S*)(.*)$/.exec(line);
      if (!m) return line;
      const wasOpen = open;
      open = !open;
      if (wasOpen || m[4]) return line;
      return `${m[1]}${m[2]}text${m[5]}`;
    })
    .join("\n");
}

/** Render an instructions string as Markdown (GFM + math + highlight.js).
 *  Math plugins are required: `instructions` is a prop, so it bypasses the MDX
 *  pipeline and this is the only parser it ever reaches — without them `$…$`
 *  prints verbatim. `rehypeKatex` before `rehypeHighlight` matches the lesson
 *  pipeline's order; `detect: false` so the language is always the one the
 *  fence names. */
export function renderMarkdownInstructions(source: string): ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { throwOnError: false, errorColor: "#ef4444" }],
        [rehypeHighlight, { detect: false, ignoreMissing: true }],
      ]}
    >
      {labelBareFences(source)}
    </ReactMarkdown>
  );
}

/** Strings render as markdown; React nodes pass through unchanged. */
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

/** Per-card toast manager; toasts auto-dismiss after 2.4s. */
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

/** Toast stack; must sit inside a position-relative ancestor (the card root). */
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
// lucide-react glyphs, except Play: a solid triangle to match the
// playgrounds' filled glyph (lucide's stroke reads too thin at this size).

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

/** Format glyph; same wand icon as `<Playground>`'s Format button. */
export function FormatIcon() {
  return <Wand2 size={13} aria-hidden />;
}

/** Stable, deterministic short id for a card, derived from React useId(). */
export function useShortId(prefix: string): string {
  const reactId = useId();
  let h = 0;
  for (let i = 0; i < reactId.length; i++) {
    h = (h * 31 + reactId.charCodeAt(i)) >>> 0;
  }
  const suffix = h.toString(16).slice(0, 4).padStart(4, "0");
  return `${prefix}-${suffix}`;
}

// ─── Test results rail ───────────────────────────────────────────────
// Shared pass/fail readout: circles on a vertical rail, with details
// (description, code/checks, error) in a click-popover per row.

import { Info } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import railStyles from "./ChallengeCard.module.css";

export interface TestRailEntry {
  id: string;
  name: string;
  description?: string | null;
  state: "pass" | "fail" | "pending";
  detail?: string | null;
  /** Code (or summary of declarative checks) shown in the details popover. */
  code?: string;
}

const TEST_STATE_LABEL: Record<TestRailEntry["state"], string> = {
  pass: "Passed",
  fail: "Failed",
  pending: "Pending",
};

export function TestResultsRail({
  tests,
  codeLabel = "Test code",
}: {
  tests: TestRailEntry[];
  /** Heading for the popover's code section (e.g. "Checks" for SQL). */
  codeLabel?: string;
}) {
  return (
    <div className={railStyles.testRail}>
      {tests.map((t, i) => (
        <div key={t.id} className={railStyles.testRailRow}>
          <div className={railStyles.testRailTrack} aria-hidden>
            <span className={railStyles.testRailNode} data-state={t.state}>
              {/* Failures show ✕; passing/pending show the 1-based number. */}
              {t.state === "fail" ? (
                <X size={11} strokeWidth={3.2} aria-hidden />
              ) : (
                i + 1
              )}
            </span>
            {i < tests.length - 1 && (
              <span className={railStyles.testRailSeg} data-state={t.state} />
            )}
          </div>
          <Popover.Root>
            <Popover.Trigger
              className={railStyles.testRailItemBtn}
              aria-label={`${t.name}, ${TEST_STATE_LABEL[t.state]}. View details`}
            >
              <span className={railStyles.testRailName}>{t.name}</span>
              <Info size={13} className={railStyles.testRailInfoIcon} aria-hidden />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                side="bottom"
                align="start"
                sideOffset={6}
                className={railStyles.testPopoverPositioner}
              >
                <Popover.Popup className={railStyles.testPopover}>
                  <div className={railStyles.testPopoverHead}>
                    <span
                      className={railStyles.testPopoverStateDot}
                      data-state={t.state}
                      aria-hidden
                    />
                    <span className={railStyles.testPopoverName}>{t.name}</span>
                    <span
                      className={railStyles.testPopoverState}
                      data-state={t.state}
                    >
                      {TEST_STATE_LABEL[t.state]}
                    </span>
                  </div>
                  {t.description && (
                    <p className={railStyles.testPopoverDesc}>{t.description}</p>
                  )}
                  {t.code && (
                    <>
                      <div className={railStyles.testPopoverSectionLabel}>
                        {codeLabel}
                      </div>
                      <pre className={railStyles.testPopoverCode}>{t.code}</pre>
                    </>
                  )}
                  {t.state === "fail" && t.detail && (
                    <>
                      <div className={railStyles.testPopoverSectionLabel}>
                        Error
                      </div>
                      <pre className={railStyles.testPopoverError}>{t.detail}</pre>
                    </>
                  )}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Run-state primitives + editor helpers shared by the executable-block family
// (ChallengeCard, SqlChallengeCard, CodeBlock, SqlCodeBlock).

import { lineNumbers as lineNumbersExt } from "@codemirror/view";
import type { LanguageAdapter } from "./types";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "./languageIcons";

/** Lifecycle of an executable block's runtime. */
export type Status = "idle" | "loading" | "ready" | "running" | "error";
/** Lifecycle of a single challenge test row. */
export type TestState = "pending" | "pass" | "fail";

/** One rendered row in the test-results rail. */
export interface DisplayedTest {
  id: string;
  name: string;
  description?: string;
  state: TestState;
  detail: string | null;
}

export function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPod/.test(platform) || /Macintosh/.test(ua);
}

// Minimum ms the "running" overlay stays visible; matches the playground's
// MIN_ANIMATION_MS so a 20ms run doesn't blink the wave animation.
export const MIN_RUN_OVERLAY_MS = 300;

// Line-numbers gutter starting after `offset` lines, so numbering continues
// from a file's read-only init code. Held in a compartment for reconfiguration.
export function lineNumbersWithOffset(offset: number) {
  return lineNumbersExt({
    formatNumber: offset ? (n) => String(n + offset) : undefined,
  });
}

export function LanguageGlyph({ adapter }: { adapter: LanguageAdapter }) {
  const Icon = LANGUAGE_ICONS[adapter.id];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[adapter.id] ?? 1;
  if (!Icon) return <span aria-hidden>{adapter.logoText}</span>;
  return (
    <Icon
      style={{
        width: `${Math.round(14 * factor)}px`,
        height: `${Math.round(14 * factor)}px`,
      }}
      aria-hidden
    />
  );
}

/** Short stable block id ("PythonBlock-3f2a") used to label runtimes/workspaces. */
export function useBlockId(adapter: LanguageAdapter): string {
  const reactId = useId();
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < reactId.length; i++) {
      h = (h * 31 + reactId.charCodeAt(i)) >>> 0;
    }
    const suffix = h.toString(16).slice(0, 4).padStart(4, "0");
    const prefix =
      adapter.logoText.charAt(0).toUpperCase() +
      adapter.logoText.slice(1).toLowerCase();
    return `${prefix}Block-${suffix}`;
  }, [reactId, adapter.logoText]);
}
