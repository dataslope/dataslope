"use client";

/**
 * Shared helpers used by both `<ChallengeCard>` and `<SqlChallengeCard>`:
 *
 *   - `renderInstructions(input)`, accepts either a React node (used
 *     verbatim) or a markdown string (rendered via react-markdown + GFM).
 *   - `useChallengeToasts()`, minimal in-card toast manager. Each
 *     card mounts its own viewport so toasts feel attached to the card
 *     even when many are on the page.
 *   - `FormatIcon` / `CopyIcon` / `PlayIcon`, icon glyphs reused by
 *     both cards.
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
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// ─── Boot progress smoothing ─────────────────────────────────────────
// Adapters report coarse stage *floors* (0.05, 0.55, 0.85, …) during a
// runtime boot. A bar that only moves on those few events looks stuck
// for the long middle of a download, so this hook animates the
// displayed fraction asymptotically toward a ceiling a little above
// the latest report, classic capped pseudo-progress. It never reaches
// 1: completion is signalled by the boot UI unmounting, not the bar.

/** Smooth a stage-floor boot fraction for display. Returns null (render
 *  an indeterminate spinner) until the first fraction arrives; resets
 *  when `active` goes false so the next boot starts clean.
 *
 *  All state writes happen inside timer callbacks (a 0 ms kick plus the
 *  creep interval) with functional updaters: the kick jumps the value
 *  up to a freshly reported stage floor (never backwards), and each
 *  interval tick eases it toward just shy of the next stage so the bar
 *  never looks stuck mid-download. */
export function useCreepingBootFraction(
  target: number | null,
  active: boolean,
): number | null {
  const [display, setDisplay] = useState<number | null>(null);

  useEffect(() => {
    if (!active || target == null) {
      // Reset for the next boot, scheduled, not set synchronously in
      // the effect body.
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
// Some runtimes block *inside* a run to download/install something before
// the user's code executes, Python's two-phase data-package install, its
// on-demand `loadPackagesFromImports`, R installing a `library()` on
// demand. Those arrive via `RunOptions.onStatus(message, preparing)`.
// This hook turns that stream into a `preparing` flag the surface uses to
// show the runtime boot notice for the duration. The transition to
// visible is debounced (~150 ms) so an all-cached run, which reports
// preparing→done almost instantly, never flashes the notice.

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
// Mirrors the logic in CodeBlock.tsx: Fumadocs toggles a `dark` class
// on <html> when the user switches themes; we fall back to the OS
// preference when outside the /learn route.

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

/** Subscribe to the document's colour-scheme so components can react
 *  to the Fumadocs theme toggle without polling. SSR-safe: the server
 *  snapshot defaults to `true` (dark) to match the site's dark default. */
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

/** Map dark/light to the matching CodeMirror theme name.
 *  Dark → GitHub Dark, light → GitHub Light. */
export function cmThemeNameFor(isDark: boolean): string {
  return isDark ? "github-dark" : "github-light";
}

// ─── Instructions: ReactNode | markdown string ───────────────────────

/** Renders an instructions string as Markdown using react-markdown, with
 *  GFM and math.
 *
 *  Supports the full CommonMark + GitHub-Flavored Markdown surface
 *  (headings, lists, tables, code, autolinks, …) so authors can write
 *  natural Markdown instead of nested JSX.
 *
 *  **Math is not optional here.** A lesson body gets `remarkMath` +
 *  `rehypeKatex` from `source.config.ts`, and a `<MultipleChoice>` gets them
 *  from its own pipeline, but an `instructions` string never reaches either:
 *  it is a *prop*, so the MDX compiler passes it through as a plain string and
 *  this component is the only thing that ever parses it. Without the two
 *  plugins the card printed the source verbatim, so
 *  `numerical-calculus`'s π challenge read
 *  `Recall that $\int_{-1}^{1} \sqrt{1 - x^2},dx = \pi/2$` on the page.
 *  Eighteen challenges across the scientific-computing and statistics courses
 *  were doing the same thing.
 *
 *  The plugin list matches `MultipleChoiceQuestion`'s deliberately: the two
 *  are the site's markdown-in-a-prop surfaces, and an author should not have
 *  to remember which of them supports what. KaTeX's stylesheet is already
 *  loaded on every route that can host a card, by `app/docs.css` for lessons
 *  and interview pages and by a direct import in `/c/[id]`, `/quiz/[id]` and
 *  the dashboard authoring pages. */
export function renderMarkdownInstructions(source: string): ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#ef4444" }]]}
    >
      {source}
    </ReactMarkdown>
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

/** Tiny self-contained toast manager, one queue per card. Toasts
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

// ─── Test results rail ───────────────────────────────────────────────
// Shared by `<ChallengeCard>` and `<SqlChallengeCard>`: a minimal
// pass/fail readout. A vertical rail runs down the left; each test is a
// circle on the rail, green (--ds-green-500) with a white check for a
// pass, red (--ds-red-500) with a white ✕ for a fail, and the rail
// segment below each circle is painted in that test's colour. Rows are
// just the test name; the description, the test's code/checks, and the
// exact error message live in a click-popover so the list stays clean.

import { Info } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import railStyles from "./ChallengeCard.module.css";

export interface TestRailEntry {
  id: string;
  name: string;
  description?: string | null;
  state: "pass" | "fail" | "pending";
  detail?: string | null;
  /** Code (or a readable summary of declarative checks) shown in the
   *  details popover under `codeLabel`. */
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
  /** Heading for the code section of the popover (e.g. "Checks" for
   *  SQL's declarative expectations). */
  codeLabel?: string;
}) {
  return (
    <div className={railStyles.testRail}>
      {tests.map((t, i) => (
        <div key={t.id} className={railStyles.testRailRow}>
          <div className={railStyles.testRailTrack} aria-hidden>
            <span className={railStyles.testRailNode} data-state={t.state}>
              {/* Failures keep the ✕ for emphasis; passing/pending
                  circles carry the 1-based test number. */}
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
// (ChallengeCard, SqlChallengeCard, CodeBlock, SqlCodeBlock). Each of those
// files used to carry a byte-identical private copy of everything below.

import { lineNumbers as lineNumbersExt } from "@codemirror/view";
import type { LanguageAdapter } from "./types";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "./languageIcons";

/** Lifecycle of an executable block's runtime. */
export type Status = "idle" | "loading" | "ready" | "running" | "error";
/** Lifecycle of a single challenge test row. */
export type TestState = "pending" | "pass" | "fail";

/** One row in the test-results rail, as rendered (name resolved, state
 *  computed, failure detail attached). */
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

// Minimum time (ms) the "running" overlay is held visible after a run
// completes. Matches the playground's MIN_ANIMATION_MS so a fast run
// (e.g. a few-line JS challenge that finishes in 20ms) doesn't blink
// the wave animation in and back out within a single frame.
export const MIN_RUN_OVERLAY_MS = 300;

// Build a line-numbers extension whose gutter starts after `offset`
// lines, so the editable region's numbering continues from where a
// file's read-only init code left off. Stored in a compartment so the
// offset can be reconfigured when the active file (hence its init)
// changes, without remounting the editor.
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

/** Short, stable, human-readable block id ("PythonBlock-3f2a") derived from
 *  React's useId, used to label runtimes/workspaces in the registry. */
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
