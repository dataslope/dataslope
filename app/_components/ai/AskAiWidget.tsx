"use client";

/**
 * Floating "Ask AI" launcher + chat panel. Shared by the /learn and /playground
 * surfaces, they differ only in the `collectContext` they pass in. Signed-in
 * only: signed-out users get a sign-in CTA (auth gates the *action*, never the
 * page, so the host page stays statically prerendered).
 *
 * Context model (redesign): the full page is no longer always sent. A single
 * "Auto · N sources" chip above the composer opens a bottom sheet where the
 * user picks a preset — Auto / Full page / Custom — and, in Custom, toggles the
 * individual on-screen sources. "Auto" (the default) sends only what's on
 * screen; lesson text is opt-in and hard-capped server-side. The chosen preset
 * is a remembered global preference; the Custom per-source toggles reset per
 * page. Answer length lives in Settings and is also remembered.
 *
 * One source is on before the reader touches anything: "Page you're on", a
 * ~20-token line naming the page and its course. Without it a question asked
 * with every switch off reached the model with no indication of the page at
 * all — `slug` is used server-side only to resolve the Markdown and never
 * reaches the prompt — so answers came back generic. It is a listed, countable,
 * toggleable source like any other, which is what keeps the chip's count an
 * honest description of the request.
 *
 * The sheet's rows, the chip count, and the send payload are all derived from
 * the same enumeration (`collectPanelSources` + `sourceEnabled`), so what the
 * user sees is what is sent: the widget cap is applied AFTER the per-source
 * toggles, ranked by visibility.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
// Token colours for the code blocks rehype-highlight marks up. The panel floats
// over lessons (which inline the same theme via docs.css) but also over the
// playground and the dashboard, which do not — so it brings its own rather than
// relying on whatever page it happens to be open on. KaTeX's stylesheet is here
// for the same reason: an answer can contain a formula anywhere the panel opens.
import "@/app/hljs.css";
import "katex/dist/katex.min.css";
import { normalizeMathDelimiters } from "./mathDelimiters";
import Link from "@/app/_components/Link";
import { Popover } from "@base-ui/react/popover";
import { Dialog } from "@base-ui/react/dialog";
import {
  guestWorkNeedsSignInWarning,
  stashActiveWorkspaceForResume,
} from "../opfs/activeWorkspace";
import {
  Sparkle,
  X,
  Send,
  RotateCcw,
  LogIn,
  Settings,
  Eye,
  ChevronDown,
  ChevronLeft,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  CornerDownRight,
  BookOpen,
  Compass,
  CodeXml,
  Terminal,
  Hourglass,
  Clock,
  ListChecks,
  HelpCircle,
  Database,
  TextSelect,
  FileDiff,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import type {
  AskAiAnswerLength,
  AskAiClientContext,
  AskAiSurface,
  AskAiUsageResponse,
} from "@/lib/ai/types";
import {
  estimateTokens,
  estimateTokensForChars,
  LESSON_BASES,
  LESSON_TEXT_MAX_TOKENS,
} from "@/lib/ai/context";
import { useAskAi } from "./useAskAi";
import { useSuggestedQuestions } from "./useSuggestedQuestions";
import {
  collectAskAiLiveSources,
  findAskAiSourceLabelFor,
  getAskAiSources,
  getAskAiSourcesServer,
  subscribeAskAiSources,
  MAX_ASKAI_WIDGETS,
  type AskAiLiveSource,
  type AskAiSourceKind,
} from "./contextRegistry";
import {
  hasAiEditHandler,
  parseAiEditSuggestions,
  requestAiEdit,
  type AiEditSuggestion,
} from "./editSuggestions";
import styles from "./AskAiPanel.module.css";
import { useDraggablePanel } from "./useDraggablePanel";

/** Where the closed-state launcher sits, chosen from Settings → "Where the
 *  button lives": a slim square tab docked to the right viewport edge (default),
 *  or the floating pill in the bottom-right corner. Persisted in localStorage. */
type LauncherPlacement = "floating" | "tab";
const LAUNCHER_PLACEMENT_KEY = "dataslope:ask-ai-placement";

/** Global context preset (remembered across pages). "Auto" sends only what's
 *  on screen; "full" adds the lesson text; "custom" honors per-source toggles. */
type ContextMode = "auto" | "full" | "custom";
const CONTEXT_MODE_KEY = "dataslope:ask-ai-context-mode";
const ANSWER_LENGTH_KEY = "dataslope:ask-ai-answer-length";

interface Props {
  surface: AskAiSurface;
  /** What the user is looking at, for display copy only, "lesson" on course
   *  pages, "question set" on interview-prep (which mounts as surface
   *  "learn" but isn't a lesson), "playground" elsewhere. */
  subjectNoun?: string;
  /** Active playground id (e.g. "sqlite") when on a playground surface, so the
   *  sign-in CTA can preserve the guest's unsaved workspace across auth. */
  playgroundId?: string;
  collectContext: () => AskAiClientContext;
}

const KIND_ICONS: Record<AskAiSourceKind, typeof CodeXml> = {
  challenge: ListChecks,
  "code-block": CodeXml,
  mcq: HelpCircle,
  "sql-playground": Database,
  playground: Terminal,
};

// Selection caps: ignore accidental micro-selections, and keep the request
// body small, the server re-clips against the token budget anyway.
const MIN_SELECTION_CHARS = 3;
const MAX_SELECTION_CHARS = 2000;

interface CapturedSelection {
  text: string;
  /** Label of the widget the selection fell inside, if any. */
  sourceLabel?: string;
}

const ANSWER_LENGTHS: { id: AskAiAnswerLength; label: string }[] = [
  { id: "concise", label: "Concise" },
  { id: "balanced", label: "Balanced" },
  { id: "detailed", label: "Detailed" },
];

const MODE_LABELS: Record<ContextMode, string> = {
  auto: "Auto",
  full: "Full page",
  custom: "Custom",
};

/** A source group, drives its icon, default toggle, and where it maps in the
 *  request payload. */
type SourceGroup = "page" | "lesson" | "code" | "output" | "selection";

/** One on-screen context source as shown in the sheet + counted by the chip.
 *  `id` is a STABLE key (group name, `file:<name>`, or `w:<kind>:<label>` for
 *  registry widgets), so Custom toggles survive widget remounts. */
interface PanelSource {
  id: string;
  group: SourceGroup;
  kind?: AskAiSourceKind;
  label: string;
  /** Char length of the source's content, for the token estimate. Absent for
   *  lesson text (its length lives server-side; we show the hard cap). */
  chars?: number;
}

/** Stable override key for a registry widget. Registry ids (`s{n}`) are
 *  reminted on every re-registration, so keying user toggles on them would
 *  silently drop an explicit OFF when the widget remounts. */
const widgetKey = (kind: string, label: string): string => `w:${kind}:${label}`;

/**
 * The page's own heading, as the reader sees it.
 *
 * The rendered `<h1>` rather than `document.title`, which carries the site
 * suffix from the root layout's title template ("Variables · DataSlope") and
 * would put our own brand into the model's context for no reason. Falls back to
 * the document title with that suffix stripped when a page has no heading.
 *
 * The course name is NOT read here: the server resolves it from the slug
 * against the course catalog, so the collection a path belongs to stays our
 * claim rather than the page's.
 */
function readPageTitle(): string {
  const heading = document.querySelector("main h1, article h1, h1");
  const text = heading?.textContent?.trim();
  if (text) return text.slice(0, 120);
  return document.title.replace(/\s*·\s*DataSlope\s*$/i, "").trim().slice(0, 120);
}

/** Group default: everything on screen is in by default; lesson text is the
 *  one opt-in source. Single source of truth for the sheet UI, the payload
 *  filter, and Custom-override seeding. */
const defaultSourceOn = (group: SourceGroup): boolean => group !== "lesson";

function sourceEnabled(
  id: string,
  group: SourceGroup,
  mode: ContextMode,
  overrides: Record<string, boolean>,
): boolean {
  if (mode === "full") return true;
  if (mode === "auto") return defaultSourceOn(group);
  return overrides[id] ?? defaultSourceOn(group);
}

/** "0.6k", "1.1k" — the mock's compact token labels, floored at 0.1k so tiny
 *  real sources never read as an empty "0.0k". */
const fmtK = (tokens: number): string =>
  `${(Math.max(tokens, 100) / 1000).toFixed(1)}k`;

/** Roughly what `pageIdentityLine` costs: one sentence naming the page, the
 *  course and the path. Fixed rather than measured, because the client does not
 *  build that sentence — the server does (lib/ai/context.ts). */
const PAGE_IDENTITY_TOKENS = 20;

/** Tokens a source contributes to the estimate (its content, or the lesson cap). */
function sourceTokens(s: PanelSource): number {
  if (s.group === "lesson") return LESSON_TEXT_MAX_TOKENS;
  if (s.group === "page") return PAGE_IDENTITY_TOKENS;
  return estimateTokensForChars(s.chars ?? 0);
}

function sourceSubline(s: PanelSource): string {
  switch (s.group) {
    case "page":
      return `Which lesson you're on · ~${PAGE_IDENTITY_TOKENS} tokens`;
    case "lesson":
      return `Trimmed to fit · up to ${Math.round(LESSON_TEXT_MAX_TOKENS / 1000)}k tokens`;
    case "output":
      return `Last run · ${fmtK(sourceTokens(s))} tokens`;
    case "selection":
      return `Selected on page · ${fmtK(sourceTokens(s))} tokens`;
    default:
      return `On screen · ${fmtK(sourceTokens(s))} tokens`;
  }
}

function sourceIconFor(s: PanelSource): typeof CodeXml {
  if (s.group === "page") return Compass;
  if (s.group === "lesson") return BookOpen;
  if (s.group === "output") return Terminal;
  if (s.group === "selection") return TextSelect;
  return s.kind ? (KIND_ICONS[s.kind] ?? CodeXml) : CodeXml;
}

/** "Reading main.py and your last output…" — status line for an in-flight
 *  question, built from the sources attached to THAT question. */
function readingStatusFor(list: PanelSource[]): string {
  const names = list
    .filter((s) => s.group !== "lesson" && s.group !== "page")
    .map((s) =>
      s.group === "output"
        ? "your last output"
        : s.group === "selection"
          ? "your highlight"
          : s.label,
    );
  if (names.length === 0) return "Thinking…";
  return `Reading ${names.slice(0, 2).join(" and ")}…`;
}

/** Circular quota ring (mirrors the mock's 12px, r=6, circumference 37.7 SVG).
 *  `remaining/total` drives the dash offset; `out` swaps to the red palette. */
function QuotaRing({
  remaining,
  total,
  out,
}: {
  remaining: number;
  total: number;
  out?: boolean;
}) {
  const frac = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const offset = 37.7 * (1 - frac);
  return (
    <svg
      className={`${styles.ring} ${out ? styles.ringOut : ""}`}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <circle
        className={styles.ringTrack}
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2.5"
      />
      <circle
        className={styles.ringProgress}
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2.5"
        strokeDasharray="37.7"
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}

/** Filled rounded-square "stop" glyph (Lucide's Square is outline-only). */
function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

/** 34×20 pill switch, matching the mock. Controlled. */
function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`${styles.switch} ${on ? styles.switchOn : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className={styles.switchKnob} />
    </button>
  );
}

/** Milliseconds from `now` to the next 00:00 UTC. */
function msToUtcMidnight(now: number): number {
  const d = new Date(now);
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, next - now);
}

function formatResetsIn(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} h ${m} m`;
  return `${m} m`;
}

export default function AskAiWidget({
  surface,
  subjectNoun,
  playgroundId,
  collectContext,
}: Props) {
  const subject =
    subjectNoun ?? (surface === "learn" ? "lesson" : "playground");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);
  // Confirmation shown when signing in would discard guest work this browser
  // can't persist (no OPFS / storage blocked).
  const [signInConfirmOpen, setSignInConfirmOpen] = useState(false);

  // Navigate to sign-in. `target="_top"` semantics: break out of the home
  // page's embedded playground iframe so auth loads in the top-level window.
  const goToSignIn = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      (window.top ?? window).location.href = "/sign-in";
    } catch {
      window.location.href = "/sign-in";
    }
  }, []);

  // Intercept the sign-in CTA on playground surfaces: stash the active
  // workspace so it resumes after auth, or, when it can't be persisted, confirm
  // before leaving. Learn surfaces (no workspace) fall through to the plain
  // link, as do modified clicks (open-in-new-tab, etc.).
  const handleSignInClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (!playgroundId) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      if (guestWorkNeedsSignInWarning(playgroundId)) {
        setSignInConfirmOpen(true);
        return;
      }
      stashActiveWorkspaceForResume(playgroundId);
      goToSignIn();
    },
    [playgroundId, goToSignIn],
  );

  // ── Remembered preferences (global) ────────────────────────────────
  const [placement, setPlacement] = useState<LauncherPlacement>(() =>
    readStored(LAUNCHER_PLACEMENT_KEY) === "floating" ? "floating" : "tab",
  );
  const [contextMode, setContextMode] = useState<ContextMode>(() => {
    const v = readStored(CONTEXT_MODE_KEY);
    return v === "full" || v === "custom" ? v : "auto";
  });
  const [answerLength, setAnswerLength] = useState<AskAiAnswerLength>(() => {
    const v = readStored(ANSWER_LENGTH_KEY);
    return v === "concise" || v === "detailed" ? v : "balanced";
  });
  const choosePlacement = (next: LauncherPlacement) => {
    setPlacement(next);
    writeStored(LAUNCHER_PLACEMENT_KEY, next);
  };
  const chooseAnswerLength = (next: AskAiAnswerLength) => {
    setAnswerLength(next);
    writeStored(ANSWER_LENGTH_KEY, next);
  };
  const chooseContextMode = (next: ContextMode) => {
    setContextMode(next);
    writeStored(CONTEXT_MODE_KEY, next);
  };

  // Custom per-source overrides (stable source id → on/off). NOT persisted:
  // they reset per page (see the route-change adjustment below). Absent id ⇒
  // the group default.
  const [customOverrides, setCustomOverrides] = useState<
    Record<string, boolean>
  >({});

  const { data: session, isPending } = useSession();

  // ── Context sources ────────────────────────────────────────────────
  const sources = useSyncExternalStore(
    subscribeAskAiSources,
    getAskAiSources,
    getAskAiSourcesServer,
  );

  // ── Selection capture ──────────────────────────────────────────────
  // Keep the last non-collapsed selection made outside the panel (clicking
  // into the panel collapses the document selection). Highlight-to-ask stays a
  // first-class feature; the selection shows up as a source in the sheet.
  const panelRef = useRef<HTMLDivElement>(null);
  // Desktop-only drag-to-reposition, handled from the panel header.
  const drag = useDraggablePanel(panelRef);
  const [selection, setSelection] = useState<CapturedSelection | null>(null);
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return; // sticky
      if (panelRef.current?.contains(sel.anchorNode)) return;
      const text = sel.toString().trim();
      if (text.length < MIN_SELECTION_CHARS) return;
      setSelection((prev) =>
        prev?.text === text
          ? prev
          : {
              text: text.slice(0, MAX_SELECTION_CHARS),
              sourceLabel: findAskAiSourceLabelFor(sel.anchorNode),
            },
      );
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // A stable key for the current page, plus whether the server can actually
  // fetch lesson text for it (mirrors the LESSON_BASES allowlist, imported
  // from lib/ai/context so the two can't drift).
  const routeMeta = useMemo(() => {
    const base = collectContext();
    const hasLessonText =
      base.surface === "learn" && LESSON_BASES.has(base.slug?.[0] ?? "");
    const key =
      base.surface === "learn"
        ? `learn:${base.slug?.join("/") ?? ""}`
        : `pg:${base.adapterId ?? ""}`;
    return { key, hasLessonText };
  }, [collectContext]);

  // Route changed: reset the per-page Custom toggles AND drop any captured
  // highlight — a selection from the previous page must not ride along
  // invisibly. (React's "adjust state during render" pattern.)
  const [prevRouteKey, setPrevRouteKey] = useState(routeMeta.key);
  if (routeMeta.key !== prevRouteKey) {
    setPrevRouteKey(routeMeta.key);
    setCustomOverrides({});
    setSelection(null);
  }

  // Final per-question context: the SAME enumeration/enablement rules as the
  // sheet, applied to fresh snapshots at send time. The widget cap is applied
  // after the user's toggles, ranked by visibility (most-visible survive),
  // so disabling sources frees slots and the model sees what the user sees.
  const buildContext = useCallback((): AskAiClientContext => {
      const base = collectContext();
      const on = (id: string, group: SourceGroup) =>
        sourceEnabled(id, group, contextMode, customOverrides);

      const live = collectAskAiLiveSources();
      const enabledLive = live.filter((s) =>
        on(widgetKey(s.kind, s.label), "code"),
      );
      const capped: AskAiLiveSource[] =
        enabledLive.length > MAX_ASKAI_WIDGETS
          ? enabledLive
              .map((s, i) => ({ s, i }))
              .sort((a, b) => b.s.visibility - a.s.visibility)
              .slice(0, MAX_ASKAI_WIDGETS)
              .sort((a, b) => a.i - b.i)
              .map(({ s }) => s)
          : enabledLive;

      const widgets: NonNullable<AskAiClientContext["widgets"]> = [];
      let schema: string | undefined;
      for (const s of capped) {
        widgets.push({ kind: s.kind, label: s.label, content: s.content });
        if (s.schema && !schema) schema = s.schema;
      }
      const files = (base.files ?? []).filter(
        (f) => f.content.trim() && on(`file:${f.filename}`, "code"),
      );
      const outputsOn =
        (base.outputs?.length ?? 0) > 0 && on("outputs", "output");
      const selectionOn = selection && on("selection", "selection");
      const lessonOn =
        base.surface === "learn" &&
        LESSON_BASES.has(base.slug?.[0] ?? "") &&
        on("lesson", "lesson");
      // Where the reader is. On by default, and the only source that is: with
      // everything off the model otherwise had nothing identifying the page,
      // because `slug` never reaches the prompt — it only resolves the Markdown
      // fetch server-side. Toggleable like any other source, so the chip's count
      // stays the truth about what is sent.
      const pageOn =
        base.surface === "learn" && (base.slug?.length ?? 0) > 0 && on("page", "page");

      return {
        surface: base.surface,
        ...(base.slug ? { slug: base.slug } : {}),
        ...(pageOn ? { page: { title: readPageTitle() } } : {}),
        ...(base.adapterId ? { adapterId: base.adapterId } : {}),
        includeLessonText: lessonOn,
        ...(files.length ? { files } : {}),
        ...(outputsOn ? { outputs: base.outputs } : {}),
        ...(widgets.length ? { widgets } : {}),
        ...(schema ? { schema } : {}),
        ...(selectionOn && selection
          ? { selection: selection.text, selectionLabel: selection.sourceLabel }
          : {}),
      };
  }, [collectContext, contextMode, customOverrides, selection]);

  const getAnswerLength = useCallback(() => answerLength, [answerLength]);

  const {
    messages,
    queued,
    streaming,
    error,
    tier,
    needsSignIn,
    send,
    stop,
    reset,
  } = useAskAi(buildContext, getAnswerLength);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const signedIn = Boolean(session) && !isPending && !needsSignIn;
  const sheetOpen = contextSheetOpen && signedIn;

  // ── On-screen sources (sheet rows + chip count) ────────────────────
  // Display snapshot of the registry widgets. Recomputed on registration /
  // visibility changes; the send path re-snapshots fresh in buildContext.
  const liveSources = useMemo(
    () => (open && signedIn ? collectAskAiLiveSources() : []),
    // `sources` re-snapshots when the visible set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, signedIn, sources],
  );

  // Built fresh each render while the panel is open, so playground file edits
  // and new outputs show up immediately (the old memo went stale — the store
  // has no change signal the widget can subscribe to).
  const panelSources: PanelSource[] = [];
  if (open && signedIn) {
    const seen = new Set<string>();
    const push = (s: PanelSource) => {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        panelSources.push(s);
      }
    };
    const base = collectContext();
    // Listed first, because it is the one source that is on before the reader
    // does anything, and a sheet that did not show it would be describing a
    // smaller request than the one actually sent.
    if (base.surface === "learn" && (base.slug?.length ?? 0) > 0) {
      push({ id: "page", group: "page", label: "Page you're on" });
    }
    if (routeMeta.hasLessonText) {
      push({ id: "lesson", group: "lesson", label: "Lesson text" });
    }
    for (const f of base.files ?? []) {
      if (!f.content.trim()) continue;
      push({
        id: `file:${f.filename}`,
        group: "code",
        kind: "code-block",
        label: f.filename,
        chars: f.content.length,
      });
    }
    for (const s of liveSources) {
      push({
        id: widgetKey(s.kind, s.label),
        group: "code",
        kind: s.kind,
        label: s.label,
        chars: s.content.length,
      });
    }
    if ((base.outputs?.length ?? 0) > 0) {
      push({
        id: "outputs",
        group: "output",
        label: "Recent output",
        chars: (base.outputs ?? []).join("\n").length,
      });
    }
    if (selection) {
      push({
        id: "selection",
        group: "selection",
        label: "Highlighted text",
        chars: selection.text.length,
      });
    }
  }

  const isSourceEnabled = (s: PanelSource): boolean =>
    sourceEnabled(s.id, s.group, contextMode, customOverrides);

  const enabledSources = panelSources.filter(isSourceEnabled);
  const enabledCount = enabledSources.length;
  const sheetTokens =
    enabledSources.reduce((n, s) => n + sourceTokens(s), 0) +
    estimateTokens(draft.trim() || "your question");

  // Flipping a switch drops into Custom and records the override — except the
  // highlight, where "off" means dismiss the capture (the old ✕ semantics): a
  // future highlight should re-attach rather than being silently excluded.
  const toggleSource = (s: PanelSource, next: boolean) => {
    if (s.group === "selection" && !next) {
      setSelection(null);
      return;
    }
    setCustomOverrides((prev) => {
      // Seed overrides from the *effective* set so switching Auto/Full→Custom
      // keeps every other source where it visibly was.
      const seeded: Record<string, boolean> = { ...prev };
      for (const src of panelSources) {
        if (!(src.id in seeded)) {
          seeded[src.id] = sourceEnabled(src.id, src.group, contextMode, prev);
        }
      }
      seeded[s.id] = next;
      return seeded;
    });
    if (contextMode !== "custom") chooseContextMode("custom");
  };

  const resetCustom = () => {
    setCustomOverrides({});
    chooseContextMode("auto");
  };

  // ── Daily prompt quota ─────────────────────────────────────────────
  const [usage, setUsage] = useState<AskAiUsageResponse | null>(null);
  const [sentSinceUsageFetch, setSentSinceUsageFetch] = useState(0);
  // Bumped when UTC midnight passes while the panel is open, so the quota
  // (and any out-of-prompts lockout) refreshes without a close/reopen.
  const [usageEpoch, setUsageEpoch] = useState(0);
  useEffect(() => {
    if (!open || !signedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/ai/usage");
        if (!res.ok) return;
        const body = (await res.json()) as AskAiUsageResponse;
        if (!cancelled) {
          setUsage(body);
          setSentSinceUsageFetch(0);
        }
      } catch {
        // display-only, the counter just doesn't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, usageEpoch]);
  const promptsLeft = usage
    ? Math.max(0, usage.requestsRemaining - sentSinceUsageFetch)
    : null;
  const isFreeTier = usage?.tier !== "pro";
  const outOfPrompts = isFreeTier && promptsLeft === 0 && usage !== null;

  // Live "resets in H h M m" countdown to the next UTC midnight (only shown in
  // the out-of-prompts state). Refreshed on open and once a minute; when the
  // remaining time WRAPS (midnight passed), the day's quota reset server-side,
  // so bump usageEpoch to refetch and release any lockout.
  const [resetsInMs, setResetsInMs] = useState<number | null>(null);
  const prevResetsMsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const next = msToUtcMidnight(Date.now());
      const prev = prevResetsMsRef.current;
      prevResetsMsRef.current = next;
      setResetsInMs(next);
      if (prev !== null && next > prev) setUsageEpoch((e) => e + 1);
    };
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [open]);

  // ── AI edit suggestions → the playground editor ────────────────────
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const handleReviewEdit = (s: AiEditSuggestion) => {
    const res = requestAiEdit(collectContext().adapterId, s);
    if (res.ok) {
      setEditStatus(
        `Review the ${s.filename} diff in the editor, accept or reject the changes there.`,
      );
    } else if (res.reason === "unchanged") {
      setEditStatus(`${s.filename} already matches this suggestion.`);
    } else if (res.reason === "busy") {
      setEditStatus("Finish the diff review already open in the editor first.");
    } else {
      setEditStatus("The editor isn't available to apply changes right now.");
    }
  };
  const canApplyEdits =
    surface === "playground" &&
    !streaming &&
    messages.some((m) => m.role === "assistant" && m.content) &&
    hasAiEditHandler(collectContext().adapterId);

  // ── Suggested follow-ups ("Keep going") ────────────────────────────
  // Keyed on the id of the answer they would follow, not on `messages.length`:
  // the count repeats across conversations ("New conversation" resets it to
  // zero), and the hook fetches at most once per key, so every conversation
  // after the first was silently left without follow-ups. See the hook.
  const lastTurn = messages[messages.length - 1];
  const answeredTurnId =
    lastTurn?.role === "assistant" && lastTurn.content ? lastTurn.id : "";
  const { suggestions, suggestLoading, clearSuggestions } =
    useSuggestedQuestions({
      active: open && signedIn && !streaming,
      turnKey: answeredTurnId,
      buildContext,
      history: messages,
    });

  // Status line for the in-flight question, frozen at send time (the live
  // enabled set changes the moment the selection is cleared below).
  const [sendingStatus, setSendingStatus] = useState("Thinking…");

  // ── Message actions (copy + reactions) ─────────────────────────────
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Record<number, "up" | "down">>({});

  const sendQuestion = (q: string) => {
    setSendingStatus(readingStatusFor(enabledSources));
    // Count the prompt only once the server ACCEPTS it — failed sends are
    // never billed, and decrementing on them would falsely lock the composer.
    void send(q).then((ok) => {
      if (ok) setSentSinceUsageFetch((n) => n + 1);
    });
    clearSuggestions();
    setEditStatus(null);
    setContextSheetOpen(false);
    // The highlighted text answered this question; don't let it leak into
    // unrelated follow-ups. Re-selecting re-captures it.
    setSelection(null);
  };

  const submit = () => {
    const q = draft.trim();
    if (!q) return;
    sendQuestion(q);
    setDraft("");
  };

  const newConversation = () => {
    reset();
    setReactions({});
    setCopiedIdx(null);
    setEditStatus(null);
  };

  const copyAnswer = (idx: number, text: string) => {
    // Show the checkmark only once the write actually succeeded; a rejected
    // promise (permission denied, unfocused document) keeps the button as-is.
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedIdx(idx);
        window.setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
      },
      () => {
        /* copy failed, no feedback to fake */
      },
    );
  };
  /**
   * Rate an answer, and store the exchange it refers to.
   *
   * Optimistic: the icon fills immediately and stays filled, because a rating
   * is the user's own opinion and a network hiccup is no reason to appear to
   * take it back. The write is best-effort for the same reason — a failed
   * POST is logged, not surfaced, since there is nothing useful to ask of
   * someone who just told us an answer was bad.
   *
   * Clicking the filled thumb withdraws the rating, which deletes the row: an
   * answer nobody rated and one whose rating was withdrawn are the same thing.
   *
   * Rated turns are the ONLY Ask AI content that leaves the browser for our
   * storage — see app/api/ai/feedback/route.ts and the notice under each
   * answer, which says exactly this.
   */
  const react = (idx: number, kind: "up" | "down") => {
    const message = messages[idx];
    if (!message) return;
    const rating = reactions[idx] === kind ? null : kind;
    setReactions((prev) => {
      const next = { ...prev };
      if (rating === null) delete next[idx];
      else next[idx] = rating;
      return next;
    });

    // The question this answer replied to is the user turn just before it.
    const question = messages[idx - 1]?.role === "user" ? messages[idx - 1].content : "";
    const ctx = buildContext();
    void fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turnId: message.id,
        rating,
        question,
        answer: message.content,
        surface: ctx.surface,
        // `slug` is the lesson's path *segments* (["courses", "python-basics",
        // "variables"]); joined here so what is stored is the page a reviewer
        // can open, not an array.
        slug:
          ctx.surface === "playground"
            ? (ctx.adapterId ?? "")
            : (ctx.slug ?? []).join("/"),
        model: message.model ?? "",
      }),
    }).catch((err) => console.error("Ask AI: rating not saved", err));
  };

  // ── Context-sheet interactions ─────────────────────────────────────
  // Outside click / Esc close it. The composer is EXCLUDED from outside-close:
  // closing on mousedown would shift Send/Stop before mouseup and swallow the
  // click (mousedown and mouseup landing on different elements fires no click).
  const sheetRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sheetOpen) return;
    const onDown = (e: globalThis.MouseEvent) => {
      const t = e.target as Node;
      if (
        sheetRef.current?.contains(t) ||
        composerRef.current?.contains(t)
      ) {
        return;
      }
      setContextSheetOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Claim the keypress so overlays underneath don't also close.
      e.preventDefault();
      setContextSheetOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  // Dialog-style focus management: the chip unmounts while the sheet is open
  // (per the design), so move focus into the sheet on open and hand it back
  // to the chip on close.
  useEffect(() => {
    if (!sheetOpen) return;
    sheetRef.current?.focus();
    return () => {
      // Deliberately read at CLEANUP time: the chip is unmounted while the
      // sheet is open (ref is null during setup) and remounts in the same
      // commit that closes it — cleanup runs after that DOM update, which is
      // exactly when the chip exists to receive focus back.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      chipRef.current?.focus();
    };
  }, [sheetOpen]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // ── Closed launcher ────────────────────────────────────────────────
  if (!open) {
    if (placement === "tab") {
      return (
        <button
          type="button"
          className={styles.launcherTab}
          onClick={() => setOpen(true)}
          aria-label="Ask AI"
          title="Ask AI"
        >
          <Sparkle size={18} />
        </button>
      );
    }
    return (
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-label="Ask AI"
      >
        <Sparkle size={16} />
        Ask AI
      </button>
    );
  }

  const userTurns = messages.filter((m) => m.role === "user").length;
  const disclaimer =
    userTurns % 2 === 0 ? "AI can make mistakes." : "Verify important answers.";

  return (
    <div
      className={`${styles.panel} ${
        drag.dragging || drag.resizing ? styles.dragging : ""
      }`}
      style={drag.style}
      role="dialog"
      aria-label="Ask AI"
      ref={panelRef}
    >
      {/* Resize grips on the two edges that grow away from the docked corner
          (see useDraggablePanel). Pointer-only affordances — the panel has a
          sensible default size and every control in it is reachable without
          resizing — so they are hidden from assistive tech rather than
          announced as controls that cannot be operated. */}
      {drag.enabled && (
        <>
          <span
            className={styles.gripLeft}
            {...drag.resizeProps("left")}
            aria-hidden
          />
          <span
            className={styles.gripTop}
            {...drag.resizeProps("top")}
            aria-hidden
          />
          <span
            className={styles.gripCorner}
            {...drag.resizeProps("corner")}
            aria-hidden
          />
        </>
      )}
      <div className={`${styles.chatArea} ${sheetOpen ? styles.dimmed : ""}`}>
        {/* The header doubles as the drag handle on desktop (see
            useDraggablePanel); its own buttons are excluded, so only the
            empty space and the title move the panel. Double-click sends it
            back to the docked corner. */}
        <div
          className={`${styles.header} ${drag.enabled ? styles.headerDraggable : ""}`}
          {...drag.handleProps}
          onDoubleClick={drag.moved ? drag.reset : undefined}
          title={drag.enabled ? "Drag to move" : undefined}
        >
          <Sparkle className={styles.sparkle} size={17} />
          <span className={styles.title}>Ask AI</span>
          {tier && (
            <span
              className={`${styles.tierBadge} ${tier === "pro" ? styles.tierBadgePro : ""}`}
            >
              {tier}
            </span>
          )}
          <span className={styles.headerSpacer} />
          {messages.length > 0 && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={newConversation}
              aria-label="New conversation"
              title="New conversation"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnTight}`}
            onClick={() => setSettingsOpen(true)}
            aria-label="Ask AI settings"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnTight}`}
            onClick={() => setOpen(false)}
            aria-label="Close"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className={styles.messages} ref={listRef}>
          {!signedIn ? (
            <div className={styles.signedOut}>
              <span className={styles.emptyBadge}>
                <Sparkle size={20} />
              </span>
              <p>Sign in to ask AI about this {subject}.</p>
              {/* target="_top" breaks out of the home page's embedded
                  playground iframe so sign-in loads in the top-level window.
                  On playground surfaces, onClick first preserves the guest's
                  workspace (or confirms, when it can't be persisted). */}
              <a
                className={styles.signInLink}
                href="/sign-in"
                target="_top"
                onClick={handleSignInClick}
              >
                <LogIn size={15} />
                Sign in
              </a>
            </div>
          ) : usage && outOfPrompts && messages.length === 0 ? (
            <div className={styles.outWrap}>
              <span className={`${styles.emptyBadge} ${styles.outBadge}`}>
                <Hourglass size={21} />
              </span>
              <div className={styles.emptyText}>
                <span className={styles.emptyTitle}>
                  That&apos;s all your prompts for today
                </span>
                <span className={styles.emptyBody}>
                  Your {usage.requestsLimit} free prompts reset at midnight
                  UTC. Come back tomorrow to keep asking.
                </span>
              </div>
              {resetsInMs !== null && (
                <span className={styles.outResets}>
                  <Clock size={12} aria-hidden />
                  Resets in {formatResetsIn(resetsInMs)}
                </span>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyWrap}>
              <span className={styles.emptyBadge}>
                <Sparkle size={20} />
              </span>
              <div className={styles.emptyText}>
                <span className={styles.emptyTitle}>
                  Ask about anything on this page
                </span>
                <span className={styles.emptyBody}>
                  I can see the lesson, your code, and its output. Highlight text
                  on the page to ask about just that part.
                </span>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => {
                if (m.role === "user") {
                  return (
                    <div key={i} className={styles.msgUser}>
                      {m.content}
                    </div>
                  );
                }
                const isLast = i === messages.length - 1;
                const streamingHere = streaming && isLast;
                const editSuggestions =
                  canApplyEdits && m.content && !streamingHere
                    ? parseAiEditSuggestions(m.content)
                    : [];
                return (
                  <div key={i} className={styles.answerBlock}>
                    {streamingHere && !m.content ? (
                      <>
                        <div className={styles.typing} aria-label="Thinking">
                          <span className={styles.typingDot} />
                          <span className={styles.typingDot} />
                          <span className={styles.typingDot} />
                        </div>
                        <span className={styles.readingStatus}>
                          {sendingStatus}
                        </span>
                      </>
                    ) : (
                      <div className={styles.answer}>
                        {/* `detect: false` so only fenced blocks that named a
                            language are highlighted. Auto-detection on a
                            half-streamed block guesses from whatever few
                            characters have arrived, and re-guesses per token,
                            which shows up as code changing colour while it is
                            still being written. */}
                        {/* Math before highlighting, matching how the MCQ
                            renderer orders them: KaTeX claims its nodes first,
                            so a formula is never handed to the code
                            highlighter. `normalizeMathDelimiters` runs before
                            Markdown parses, because Markdown reads a model's
                            `\[` as an escaped bracket and the delimiter is
                            gone by the time any plugin could see it. */}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[
                            rehypeKatex,
                            [rehypeHighlight, { detect: false }],
                          ]}
                        >
                          {normalizeMathDelimiters(m.content)}
                        </ReactMarkdown>
                        {streamingHere && <span className={styles.caret} />}
                      </div>
                    )}
                    {editSuggestions.length > 0 && (
                      <div className={styles.editActions}>
                        {editSuggestions.map((s) => (
                          <button
                            key={s.filename}
                            type="button"
                            className={styles.editActionBtn}
                            onClick={() => handleReviewEdit(s)}
                          >
                            <FileDiff size={13} aria-hidden />
                            Review changes to <code>{s.filename}</code>
                          </button>
                        ))}
                        {isLast && editStatus && (
                          <span className={styles.editStatus} role="status">
                            {editStatus}
                          </span>
                        )}
                      </div>
                    )}
                    {m.content && !streamingHere && (
                      <div className={styles.answerActions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => copyAnswer(i, m.content)}
                          aria-label="Copy answer"
                          title="Copy"
                        >
                          {copiedIdx === i ? (
                            <Check size={13} />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        {/* `fill` on the selected glyph: colour alone carries
                            the state otherwise, and a filled vs outlined icon
                            survives both themes and colour-blindness. */}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            reactions[i] === "up" ? styles.actionBtnOn : ""
                          }`}
                          onClick={() => react(i, "up")}
                          aria-label="Good answer"
                          aria-pressed={reactions[i] === "up"}
                          title={reactions[i] === "up" ? "Rated good" : "Good answer"}
                        >
                          <ThumbsUp
                            size={13}
                            fill={reactions[i] === "up" ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            reactions[i] === "down" ? styles.actionBtnOnNegative : ""
                          }`}
                          onClick={() => react(i, "down")}
                          aria-label="Bad answer"
                          aria-pressed={reactions[i] === "down"}
                          title={reactions[i] === "down" ? "Rated bad" : "Bad answer"}
                        >
                          <ThumbsDown
                            size={13}
                            fill={reactions[i] === "down" ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    )}
                    {/* The disclaimer belongs to the answer, so it sits with
                        the answer's own controls rather than pinned to the
                        composer, where it read as a property of the panel. Once
                        per conversation, under the newest answer: repeating it
                        under every one turns it into furniture nobody reads.
                        The second line is directly about the buttons above it —
                        rating is what causes an exchange to be stored, so the
                        sentence saying so belongs where the thumbs are, not
                        only in the Privacy Policy. */}
                    {isLast && m.content && !streamingHere && (
                      <p className={styles.answerNote}>
                        {disclaimer} Rating an answer saves that exchange so we
                        can improve the assistant, handled as described in our{" "}
                        {/* New tab on purpose: the panel floats over a lesson,
                            and following a link in place would throw away the
                            conversation the reader is in the middle of. */}
                        <Link
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.answerNoteLink}
                        >
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                );
              })}
              {/* Questions asked while an answer was still streaming. They are
                  already accepted — showing them as dimmed turns is what makes
                  that legible, rather than the composer swallowing them. */}
              {queued.map((q, i) => (
                <div key={`q${i}`} className={styles.msgQueued}>
                  {q}
                </div>
              ))}
              {/* Follow-ups: hidden once the quota is spent — clicking one
                  could only produce a guaranteed 429. */}
              {!streaming &&
                !outOfPrompts &&
                messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1].content &&
                (suggestLoading || suggestions.length > 0) && (
                  <div className={styles.keepGoing}>
                    <span className={styles.keepGoingLabel}>
                      <CornerDownRight size={11} aria-hidden />
                      Keep going
                    </span>
                    {suggestLoading
                      ? [0, 1, 2].map((n) => (
                          <span key={n} className={styles.followupSkeleton} />
                        ))
                      : suggestions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className={styles.followupBtn}
                            onClick={() => sendQuestion(q)}
                          >
                            <Sparkle size={12} aria-hidden />
                            <span>{q}</span>
                          </button>
                        ))}
                  </div>
                )}
            </>
          )}
          {error && (
            <div
              className={`${styles.error} ${
                error.kind === "interrupted" ? styles.errorSoft : ""
              }`}
              role="status"
            >
              <span>{error.message}</span>
              {error.retry && !streaming && (
                <button
                  type="button"
                  className={styles.errorRetry}
                  onClick={() => sendQuestion(error.retry as string)}
                >
                  <RotateCcw size={12} aria-hidden />
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context sheet (bottom sheet inside the panel). */}
      {sheetOpen && (
        <div
          className={styles.sheet}
          ref={sheetRef}
          role="dialog"
          aria-label="Question context"
          tabIndex={-1}
        >
          <div className={styles.sheetHeader}>
            <span className={styles.sheetTitle}>Sent with your next question</span>
            <span className={styles.headerSpacer} />
            <button
              type="button"
              className={styles.sheetClose}
              onClick={() => setContextSheetOpen(false)}
              aria-label="Close"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
          <div className={styles.segmentedSheet} role="group" aria-label="Context preset">
            {(["auto", "full", "custom"] as ContextMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles.segment} ${
                  contextMode === mode ? styles.segmentActive : ""
                }`}
                onClick={() => chooseContextMode(mode)}
                aria-pressed={contextMode === mode}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          <p className={styles.sheetCaption}>
            Auto sends only what&apos;s on your screen. Flip a switch to override;
            your choice is remembered.
          </p>
          <div className={styles.sourceList}>
            {panelSources.length === 0 && (
              <div className={styles.sourceEmpty}>
                Nothing on screen to attach yet, just your question is sent.
              </div>
            )}
            {panelSources.map((s) => {
              const Icon = sourceIconFor(s);
              const on = isSourceEnabled(s);
              return (
                <div key={s.id} className={styles.sourceRow}>
                  <Icon
                    className={`${styles.sourceIcon} ${on ? styles.sourceIconOn : ""}`}
                    size={15}
                    aria-hidden
                  />
                  <span className={styles.sourceText}>
                    <span
                      className={`${styles.sourceTitle} ${on ? styles.sourceTitleOn : ""}`}
                    >
                      {s.label}
                    </span>
                    <span
                      className={`${styles.sourceSub} ${on ? "" : styles.sourceSubOff}`}
                    >
                      {sourceSubline(s)}
                    </span>
                  </span>
                  <Switch
                    on={on}
                    onChange={(next) => toggleSource(s, next)}
                    label={`${on ? "Remove" : "Add"} ${s.label}`}
                  />
                </div>
              );
            })}
          </div>
          <div className={styles.sheetFooter}>
            <span className={styles.sheetEstimate}>
              ≈ {fmtK(sheetTokens)} tokens with your question
            </span>
            <button
              type="button"
              className={styles.resetLink}
              onClick={resetCustom}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Composer. */}
      {signedIn && (
        <div className={styles.composer} ref={composerRef}>
          {!sheetOpen && (
            <div className={styles.chipRow}>
              <button
                type="button"
                ref={chipRef}
                className={styles.contextChip}
                onClick={() => setContextSheetOpen(true)}
                aria-haspopup="dialog"
                title="Choose what's sent with your question"
              >
                <Eye size={12} aria-hidden />
                <span className={styles.chipLabel}>
                  {/* Singular at 0 as well as 1: "0 sources" is the usual
                      English, but the chip is a running count that ticks
                      0 → 1 → 2 as toggles change, and holding the noun
                      singular until it genuinely goes plural keeps the label
                      from flipping its last letter under the pointer. */}
                  {MODE_LABELS[contextMode]} · {enabledCount} source
                  {enabledCount <= 1 ? "" : "s"}
                </span>
                <ChevronDown size={11} aria-hidden />
              </button>
            </div>
          )}
          <div
            className={`${styles.inputRow} ${outOfPrompts ? styles.inputRowDisabled : ""}`}
          >
            <textarea
              className={styles.input}
              rows={1}
              placeholder={
                messages.length > 0 ? "Ask a follow-up…" : "Ask a question…"
              }
              aria-label="Ask a question"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              // Deliberately NOT disabled while streaming: a question thought
              // of mid-answer is queued (see useAskAi), so the composer has no
              // reason to lock the user out of writing it down.
              disabled={outOfPrompts}
            />
            {/* Stop stays reachable while an answer streams, even mid-typing,
                so Send appears beside it rather than replacing it. */}
            {streaming && (
              <button
                type="button"
                className={styles.stopBtn}
                onClick={stop}
                aria-label="Stop"
                title={queued.length ? "Stop and clear the queue" : "Stop"}
              >
                <StopIcon />
              </button>
            )}
            <button
              type="button"
              className={styles.sendBtn}
              onClick={submit}
              disabled={!draft.trim() || outOfPrompts}
              aria-label={streaming ? "Send when the answer finishes" : "Send"}
              title={streaming ? "Send when the answer finishes" : "Send"}
            >
              <Send size={15} />
            </button>
          </div>
          {!sheetOpen && (
            <div className={styles.footerLine}>
              {/* The "AI can make mistakes" line used to live here; it now sits
                  under the answer it qualifies (see `.answerNote`). What is
                  left is composer state, which is the composer's own business. */}
              {outOfPrompts && messages.length > 0 && (
                <span className={styles.disclaimer}>
                  Your conversation is saved.
                </span>
              )}
              {usage && isFreeTier && promptsLeft !== null && (
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={100}
                    closeDelay={150}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className={`${styles.quota} ${outOfPrompts ? styles.quotaOut : ""}`}
                        aria-label={`${promptsLeft} Ask AI prompts left today, details`}
                      >
                        <QuotaRing
                          remaining={promptsLeft}
                          total={usage.requestsLimit}
                          out={outOfPrompts}
                        />
                        {promptsLeft} left today
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner side="top" align="end" sideOffset={8}>
                      <Popover.Popup className={styles.quotaPopover}>
                        Free accounts include {usage.requestsLimit} Ask AI
                        prompts per day, resetting at midnight UTC.
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings: an overlay INSIDE the panel, so the chat (and any
          in-flight stream, plus the list's scroll position) stays mounted
          underneath instead of being torn down and reset. */}
      {settingsOpen && (
        <div
          className={styles.settingsOverlay}
          role="dialog"
          aria-label="Ask AI settings"
        >
          <div className={styles.headerSettings}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setSettingsOpen(false)}
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft size={17} />
            </button>
            <span className={styles.settingsTitle}>
              <Settings size={13} />
              Settings
            </span>
            <span className={styles.headerSpacer} />
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label="Close"
              title="Close"
            >
              <X size={17} />
            </button>
          </div>
          <div className={styles.settingsBody}>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionTitle}>Where the button lives</span>
                <span className={styles.sectionSub}>
                  How Ask AI appears when it&apos;s closed
                </span>
              </div>
              <div className={styles.launcherCards}>
                <button
                  type="button"
                  className={`${styles.launcherCard} ${
                    placement === "floating" ? styles.launcherCardSelected : ""
                  }`}
                  onClick={() => choosePlacement("floating")}
                  aria-pressed={placement === "floating"}
                >
                  {placement === "floating" && (
                    <span className={styles.launcherCheck}>
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                  <span className={styles.launcherPreview}>
                    <span className={styles.previewLine} />
                    <span className={`${styles.previewLine} ${styles.previewLine2}`} />
                    <span className={styles.previewPill} />
                  </span>
                  <span className={styles.launcherCardLabel}>
                    <span className={styles.launcherCardTitle}>Floating button</span>
                    <span className={styles.launcherCardSub}>
                      Bottom corner of the page
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.launcherCard} ${
                    placement === "tab" ? styles.launcherCardSelected : ""
                  }`}
                  onClick={() => choosePlacement("tab")}
                  aria-pressed={placement === "tab"}
                >
                  {placement === "tab" && (
                    <span className={styles.launcherCheck}>
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                  <span className={styles.launcherPreview}>
                    <span className={styles.previewLine} />
                    <span className={`${styles.previewLine} ${styles.previewLine2}`} />
                    <span className={styles.previewTab} />
                  </span>
                  <span className={styles.launcherCardLabel}>
                    <span className={styles.launcherCardTitle}>Edge tab</span>
                    <span className={styles.launcherCardSub}>
                      Docked to the side, out of the way
                    </span>
                  </span>
                </button>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionTitle}>Context</span>
                <span className={styles.sectionSub}>
                  What&apos;s sent with your questions
                </span>
              </div>
              <div className={styles.infoCard}>
                <Eye size={14} aria-hidden />
                <span>
                  Pick Auto, Full page, or Custom from the Context chip next to
                  the message box. Your last choice is remembered.
                </span>
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionTitle}>Answer length</span>
              <div className={styles.segmented}>
                {ANSWER_LENGTHS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`${styles.segment} ${
                      answerLength === l.id ? styles.segmentActive : ""
                    }`}
                    onClick={() => chooseAnswerLength(l.id)}
                    aria-pressed={answerLength === l.id}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </section>

            {usage && (
              <div className={styles.quotaCard}>
                <span className={styles.quotaCardTitle}>
                  {isFreeTier
                    ? `${promptsLeft ?? usage.requestsRemaining} of ${usage.requestsLimit} prompts left today`
                    : "Unlimited prompts"}
                </span>
                <span className={styles.quotaCardSub}>
                  {isFreeTier ? "Free plan" : "Pro plan"} · resets at midnight
                  UTC
                </span>
              </div>
            )}
            <span className={styles.prefsNote}>Preferences save automatically</span>
          </div>
        </div>
      )}

      {/* Confirm before signing in when this browser can't persist the guest's
          work (no OPFS / storage blocked), so it isn't lost without warning.
          When it *can* be persisted, the CTA stashes + navigates directly and
          this never opens. Uses the shared confirm-dialog styles from
          playground.css (loaded on every playground route). */}
      <Dialog.Root
        open={signInConfirmOpen}
        onOpenChange={setSignInConfirmOpen}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup" role="alertdialog">
            <Dialog.Title className="confirm-title">
              Sign in without saving your work?
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              This browser can&apos;t save your {subject} work, so it will be
              lost when you sign in. Continue anyway?
            </Dialog.Description>
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Keep working
              </Dialog.Close>
              <Dialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={goToSignIn}
              >
                Sign in anyway
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/** SSR-safe localStorage read/write (this widget is client-only, but guard
 *  anyway so a private-mode throw never breaks a render). */
function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode, preference just won't persist */
  }
}
