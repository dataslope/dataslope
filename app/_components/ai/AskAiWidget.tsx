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
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Popover } from "@base-ui/react/popover";
import {
  Sparkles,
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
import { useAskAi } from "./useAskAi";
import { useSuggestedQuestions } from "./useSuggestedQuestions";
import {
  collectAskAiLiveSources,
  findAskAiSourceLabelFor,
  getAskAiSources,
  getAskAiSourcesServer,
  subscribeAskAiSources,
  type AskAiSourceKind,
} from "./contextRegistry";
import {
  hasAiEditHandler,
  parseAiEditSuggestions,
  requestAiEdit,
  type AiEditSuggestion,
} from "./editSuggestions";
import styles from "./AskAiPanel.module.css";

/** Where the closed-state launcher sits, chosen from Settings → "Where the
 *  button lives": the floating pill in the bottom-right corner (default), or a
 *  slim tab docked to the right viewport edge. Persisted in localStorage. */
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

// Lesson bases that have a raw-Markdown mirror the server can fetch (mirrors
// LESSON_BASES in lib/ai/context.ts), used to know whether "Lesson text" is a
// real, offerable source on this route.
const LESSON_MD_BASES = new Set(["courses", "fumadocs-dev"]);

// Hard cap on lesson-text tokens, mirrors LESSON_TEXT_MAX_TOKENS in
// lib/ai/context.ts. Shown to the user and used as the lesson estimate.
const LESSON_TEXT_CAP_TOKENS = 4000;

const ANSWER_LENGTHS: { id: AskAiAnswerLength; label: string }[] = [
  { id: "concise", label: "Concise" },
  { id: "balanced", label: "Balanced" },
  { id: "detailed", label: "Detailed" },
];

/** A source group, drives its icon, default toggle, and where it maps in the
 *  request payload. */
type SourceGroup = "lesson" | "code" | "output" | "selection";

/** One on-screen context source as shown in the sheet + counted by the chip.
 *  `id` is stable across renders so Custom toggles can key off it. */
interface PanelSource {
  id: string;
  group: SourceGroup;
  kind?: AskAiSourceKind;
  label: string;
  /** Char length of the source's content, for the token estimate. Absent for
   *  lesson text (its length lives server-side; we show the hard cap). */
  chars?: number;
}

const estimateTokens = (chars: number): number => Math.ceil(chars / 4);
/** "0.6k", "1.1k" — matches the mock's compact token labels. */
const fmtK = (tokens: number): string => `${(tokens / 1000).toFixed(1)}k`;

/** Tokens a source contributes to the estimate (its content, or the lesson cap). */
function sourceTokens(s: PanelSource): number {
  if (s.group === "lesson") return LESSON_TEXT_CAP_TOKENS;
  return estimateTokens(s.chars ?? 0);
}

function sourceSubline(s: PanelSource): string {
  switch (s.group) {
    case "lesson":
      return "Trimmed to fit · up to 4k tokens";
    case "output":
      return `Last run · ${fmtK(sourceTokens(s))} tokens`;
    case "selection":
      return `Selected on page · ${fmtK(sourceTokens(s))} tokens`;
    default:
      return `On screen · ${fmtK(sourceTokens(s))} tokens`;
  }
}

function sourceIconFor(s: PanelSource): typeof CodeXml {
  if (s.group === "lesson") return BookOpen;
  if (s.group === "output") return Terminal;
  if (s.group === "selection") return TextSelect;
  return s.kind ? (KIND_ICONS[s.kind] ?? CodeXml) : CodeXml;
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
  collectContext,
}: Props) {
  const subject =
    subjectNoun ?? (surface === "learn" ? "lesson" : "playground");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);

  // ── Remembered preferences (global) ────────────────────────────────
  const [placement, setPlacement] = useState<LauncherPlacement>(() =>
    readStored(LAUNCHER_PLACEMENT_KEY) === "tab" ? "tab" : "floating",
  );
  const [contextMode, setContextMode] = useState<ContextMode>(() => {
    const v = readStored(CONTEXT_MODE_KEY);
    return v === "full" || v === "custom" ? v : "auto";
  });
  const [answerLength, setAnswerLength] = useState<AskAiAnswerLength>(() => {
    const v = readStored(ANSWER_LENGTH_KEY);
    return v === "concise" || v === "detailed" ? v : "balanced";
  });
  const choosePlacement = useCallback((next: LauncherPlacement) => {
    setPlacement(next);
    writeStored(LAUNCHER_PLACEMENT_KEY, next);
  }, []);
  const chooseAnswerLength = useCallback((next: AskAiAnswerLength) => {
    setAnswerLength(next);
    writeStored(ANSWER_LENGTH_KEY, next);
  }, []);

  // Custom per-source overrides (id → on/off). NOT persisted: they reset per
  // page (see the pathname effect below). Absent id ⇒ the group default.
  const [customOverrides, setCustomOverrides] = useState<
    Record<string, boolean>
  >({});
  const chooseContextMode = useCallback((next: ContextMode) => {
    setContextMode(next);
    writeStored(CONTEXT_MODE_KEY, next);
  }, []);

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

  // Whether this route has lesson text the server can actually fetch.
  const routeHasLessonText = useMemo(() => {
    const base = collectContext();
    return (
      base.surface === "learn" && LESSON_MD_BASES.has(base.slug?.[0] ?? "")
    );
  }, [collectContext]);

  // A stable key for the current page. When it changes we reset the per-page
  // Custom toggles (the preset itself is a global preference, left alone) using
  // React's endorsed "adjust state during render" pattern rather than an effect.
  const routeKey = useMemo(() => {
    const base = collectContext();
    return base.surface === "learn"
      ? `learn:${base.slug?.join("/") ?? ""}`
      : `pg:${base.adapterId ?? ""}`;
  }, [collectContext]);
  const [prevRouteKey, setPrevRouteKey] = useState(routeKey);
  if (routeKey !== prevRouteKey) {
    setPrevRouteKey(routeKey);
    setCustomOverrides({});
  }

  // ── On-screen sources (for the sheet + the chip count) ──────────────
  // Cheap enumeration (no widget snapshotting): registry sources that are
  // visible, plus the playground's open files, outputs, lesson text, and any
  // captured selection. Widget token estimates are filled in lazily when the
  // sheet is open (see `widgetChars`).
  const panelSources = useMemo<PanelSource[]>(() => {
    const base = collectContext();
    const list: PanelSource[] = [];
    if (routeHasLessonText) {
      list.push({ id: "lesson", group: "lesson", label: "Lesson text" });
    }
    for (const f of base.files ?? []) {
      if (!f.content.trim()) continue;
      list.push({
        id: `file:${f.filename}`,
        group: "code",
        kind: "code-block",
        label: f.filename,
        chars: f.content.length,
      });
    }
    for (const s of sources) {
      if (s.visibility > 0) {
        list.push({ id: s.id, group: "code", kind: s.kind, label: s.label });
      }
    }
    if ((base.outputs?.length ?? 0) > 0) {
      list.push({
        id: "outputs",
        group: "output",
        label: "Recent output",
        chars: (base.outputs ?? []).join("\n").length,
      });
    }
    if (selection) {
      list.push({
        id: "selection",
        group: "selection",
        label: "Highlighted text",
        chars: selection.text.length,
      });
    }
    return list;
  }, [collectContext, sources, selection, routeHasLessonText]);

  // Snapshot widget content lengths only while the sheet is open (so per-widget
  // token estimates are live without snapshotting on every scroll/keystroke).
  const widgetChars = useMemo<Map<string, number>>(() => {
    if (!contextSheetOpen) return new Map();
    const map = new Map<string, number>();
    for (const s of collectAskAiLiveSources()) map.set(s.id, s.content.length);
    return map;
    // `sources` re-snapshots when the visible set changes, not just on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSheetOpen, sources]);

  const withWidgetChars = useCallback(
    (s: PanelSource): PanelSource =>
      s.group === "code" && s.chars === undefined
        ? { ...s, chars: widgetChars.get(s.id) ?? 0 }
        : s,
    [widgetChars],
  );

  // Is a source on for the current preset? Auto: everything but lesson text.
  // Full: everything. Custom: the override, else the group default.
  const isSourceEnabled = useCallback(
    (s: PanelSource): boolean => {
      if (contextMode === "full") return true;
      if (contextMode === "auto") return s.group !== "lesson";
      const def = s.group !== "lesson";
      return customOverrides[s.id] ?? def;
    },
    [contextMode, customOverrides],
  );

  // Flipping any switch drops into Custom and records the override.
  const toggleSource = useCallback(
    (s: PanelSource, next: boolean) => {
      setCustomOverrides((prev) => {
        // Seed overrides from the *effective* set so switching Auto→Custom
        // keeps every other source where it visibly was.
        const seeded: Record<string, boolean> = { ...prev };
        for (const src of panelSources) {
          if (!(src.id in seeded)) {
            seeded[src.id] =
              contextMode === "full"
                ? true
                : contextMode === "auto"
                  ? src.group !== "lesson"
                  : (prev[src.id] ?? src.group !== "lesson");
          }
        }
        seeded[s.id] = next;
        return seeded;
      });
      if (contextMode !== "custom") chooseContextMode("custom");
    },
    [contextMode, panelSources, chooseContextMode],
  );

  const resetCustom = useCallback(() => {
    setCustomOverrides({});
    chooseContextMode("auto");
  }, [chooseContextMode]);

  const enabledSources = panelSources.filter(isSourceEnabled);
  const enabledCount = enabledSources.length;
  // "Reading main.py and your last output…" — a short, honest status shown
  // while the request is in flight, built from the sources actually attached.
  const readingStatus = useMemo(() => {
    const names = enabledSources
      .filter((s) => s.group !== "lesson")
      .map((s) =>
        s.group === "output"
          ? "your last output"
          : s.group === "selection"
            ? "your highlight"
            : s.label,
      );
    if (names.length === 0) return "Thinking…";
    return `Reading ${names.slice(0, 2).join(" and ")}…`;
  }, [enabledSources]);
  const estimateTokensTotal =
    enabledSources.reduce((n, s) => n + sourceTokens(withWidgetChars(s)), 0) +
    estimateTokens((draft.trim() || "your question").length);

  // Final per-question context: filter the live payload by the enabled set.
  const buildContext = useCallback((): AskAiClientContext => {
    const base = collectContext();
    const live = collectAskAiLiveSources();
    const enabled = (id: string, group: SourceGroup): boolean => {
      if (contextMode === "full") return true;
      if (contextMode === "auto") return group !== "lesson";
      const def = group !== "lesson";
      return customOverrides[id] ?? def;
    };

    const widgets: NonNullable<AskAiClientContext["widgets"]> = [];
    let schema: string | undefined;
    for (const s of live) {
      if (!enabled(s.id, "code")) continue;
      widgets.push({ kind: s.kind, label: s.label, content: s.content });
      if (s.schema && !schema) schema = s.schema;
    }
    const files = (base.files ?? []).filter((f) =>
      enabled(`file:${f.filename}`, "code"),
    );
    const outputsOn =
      (base.outputs?.length ?? 0) > 0 && enabled("outputs", "output");
    const selectionOn = selection && enabled("selection", "selection");
    const lessonOn =
      base.surface === "learn" &&
      LESSON_MD_BASES.has(base.slug?.[0] ?? "") &&
      enabled("lesson", "lesson");

    return {
      surface: base.surface,
      ...(base.slug ? { slug: base.slug } : {}),
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

  const { messages, streaming, error, tier, needsSignIn, send, stop, reset } =
    useAskAi(buildContext);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const signedIn = Boolean(session) && !isPending && !needsSignIn;

  // ── Daily prompt quota ─────────────────────────────────────────────
  const [usage, setUsage] = useState<AskAiUsageResponse | null>(null);
  const [sentSinceUsageFetch, setSentSinceUsageFetch] = useState(0);
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
  }, [open, signedIn]);
  const promptsLeft = usage
    ? Math.max(0, usage.requestsRemaining - sentSinceUsageFetch)
    : null;
  const isFreeTier = usage?.tier !== "pro";
  const outOfPrompts = isFreeTier && promptsLeft === 0 && usage !== null;

  // Live "resets in H h M m" countdown to the next UTC midnight (only shown in
  // the out-of-prompts state). Refreshed on open and once a minute; the clock
  // read happens in scheduled callbacks, never synchronously during render.
  const [resetsInMs, setResetsInMs] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => setResetsInMs(msToUtcMidnight(Date.now()));
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [open]);

  // ── AI edit suggestions → the playground editor ────────────────────
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const handleReviewEdit = useCallback(
    (s: AiEditSuggestion) => {
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
    },
    [collectContext],
  );
  const canApplyEdits =
    surface === "playground" &&
    !streaming &&
    messages.some((m) => m.role === "assistant" && m.content) &&
    hasAiEditHandler(collectContext().adapterId);

  // ── Suggested follow-ups ("Keep going") ────────────────────────────
  const { suggestions, suggestLoading, clearSuggestions } =
    useSuggestedQuestions({
      active: open && signedIn && !streaming && messages.length > 0,
      turnKey: messages.length,
      buildContext,
      history: messages,
    });

  const sendQuestion = useCallback(
    (q: string) => {
      send(q);
      clearSuggestions();
      setSentSinceUsageFetch((n) => n + 1);
      setEditStatus(null);
      setContextSheetOpen(false);
      // The highlighted text answered this question; don't let it leak into
      // unrelated follow-ups. Re-selecting re-captures it.
      setSelection(null);
    },
    [send, clearSuggestions],
  );

  const submit = useCallback(() => {
    const q = draft.trim();
    if (!q) return;
    sendQuestion(q);
    setDraft("");
  }, [draft, sendQuestion]);

  // ── Message actions (copy + reactions) ─────────────────────────────
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Record<number, "up" | "down">>({});
  const copyAnswer = useCallback((idx: number, text: string) => {
    try {
      void navigator.clipboard?.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      /* clipboard blocked, no-op */
    }
  }, []);
  const react = useCallback((idx: number, kind: "up" | "down") => {
    setReactions((prev) => {
      const next = { ...prev };
      if (next[idx] === kind) delete next[idx];
      else next[idx] = kind;
      return next;
    });
  }, []);

  // Close the context sheet on outside click / Esc.
  const sheetRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!contextSheetOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (sheetRef.current?.contains(t) || chipRef.current?.contains(t)) return;
      setContextSheetOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setContextSheetOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [contextSheetOpen]);

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
          <Sparkles size={18} />
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
        <Sparkles size={16} />
        Ask AI
      </button>
    );
  }

  const userTurns = messages.filter((m) => m.role === "user").length;
  const disclaimer =
    userTurns % 2 === 0 ? "AI can make mistakes." : "Verify important answers.";
  const modeLabel =
    contextMode === "full" ? "Full page" : contextMode === "custom" ? "Custom" : "Auto";

  // ── Settings view (replaces the chat) ──────────────────────────────
  if (settingsOpen) {
    return (
      <div className={styles.panel} role="dialog" aria-label="Ask AI settings" ref={panelRef}>
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
                Pick Auto, Full page, or Custom from the Context chip next to the
                message box. Your last choice is remembered.
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
                {isFreeTier ? "Free plan" : "Pro plan"} · resets at midnight UTC
              </span>
            </div>
          )}
          <span className={styles.prefsNote}>Preferences save automatically</span>
        </div>
      </div>
    );
  }

  // ── Main chat view ─────────────────────────────────────────────────
  return (
    <div className={styles.panel} role="dialog" aria-label="Ask AI" ref={panelRef}>
      <div
        className={`${styles.chatArea} ${contextSheetOpen ? styles.dimmed : ""}`}
      >
        <div className={styles.header}>
          <Sparkles className={styles.sparkle} size={17} />
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
              onClick={reset}
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
                <Sparkles size={20} />
              </span>
              <p>Sign in to ask AI about this {subject}.</p>
              {/* target="_top" breaks out of the home page's embedded
                  playground iframe so sign-in loads in the top-level window. */}
              <a className={styles.signInLink} href="/sign-in" target="_top">
                <LogIn size={15} />
                Sign in
              </a>
            </div>
          ) : outOfPrompts && messages.length === 0 ? (
            <div className={styles.outWrap}>
              <span className={`${styles.emptyBadge} ${styles.outBadge}`}>
                <Hourglass size={21} />
              </span>
              <div className={styles.emptyText}>
                <span className={styles.emptyTitle}>
                  That&apos;s all your prompts for today
                </span>
                <span className={styles.emptyBody}>
                  Your {usage?.requestsLimit ?? 20} free prompts reset at
                  midnight UTC. Come back tomorrow to keep asking.
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
                <Sparkles size={20} />
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
                          {readingStatus}
                        </span>
                      </>
                    ) : (
                      <div className={styles.answer}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
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
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            reactions[i] === "up" ? styles.actionBtnOn : ""
                          }`}
                          onClick={() => react(i, "up")}
                          aria-label="Good answer"
                          aria-pressed={reactions[i] === "up"}
                          title="Good answer"
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            reactions[i] === "down" ? styles.actionBtnOn : ""
                          }`}
                          onClick={() => react(i, "down")}
                          aria-label="Bad answer"
                          aria-pressed={reactions[i] === "down"}
                          title="Bad answer"
                        >
                          <ThumbsDown size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!streaming &&
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
                            <Sparkles size={12} aria-hidden />
                            <span>{q}</span>
                          </button>
                        ))}
                  </div>
                )}
            </>
          )}
          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>

      {/* Context sheet (bottom sheet inside the panel). */}
      {signedIn && contextSheetOpen && (
        <div className={styles.sheet} ref={sheetRef} aria-label="Question context">
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
                {mode === "auto" ? "Auto" : mode === "full" ? "Full page" : "Custom"}
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
            {panelSources.map((raw) => {
              const s = withWidgetChars(raw);
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
              ≈ {fmtK(estimateTokensTotal)} tokens with your question
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
        <div className={styles.composer}>
          {!contextSheetOpen && (
            <div className={styles.chipRow}>
              <button
                type="button"
                ref={chipRef}
                className={styles.contextChip}
                onClick={() => setContextSheetOpen(true)}
                aria-expanded={contextSheetOpen}
                title="Choose what's sent with your question"
              >
                <Eye size={12} aria-hidden />
                <span className={styles.chipLabel}>
                  {modeLabel} · {enabledCount} source{enabledCount === 1 ? "" : "s"}
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
              disabled={streaming || outOfPrompts}
            />
            {streaming ? (
              <button
                type="button"
                className={styles.sendBtn}
                onClick={stop}
                aria-label="Stop"
                title="Stop"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="button"
                className={styles.sendBtn}
                onClick={submit}
                disabled={!draft.trim() || outOfPrompts}
                aria-label="Send"
                title="Send"
              >
                <Send size={15} />
              </button>
            )}
          </div>
          {!contextSheetOpen && (
            <div className={styles.footerLine}>
              <span className={styles.disclaimer}>
                {outOfPrompts ? "Your conversation is saved." : disclaimer}
              </span>
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
