"use client";

/**
 * Floating "Ask AI" launcher + chat panel. Shared by the /learn and /playground
 * surfaces, they differ only in the `collectContext` they pass in. Signed-in
 * only: signed-out users get a sign-in CTA (auth gates the *action*, never the
 * page, so the host page stays statically prerendered).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Popover } from "@base-ui/react/popover";
import {
  Sparkles,
  X,
  Send,
  Square,
  RotateCcw,
  LogIn,
  Code2,
  ListChecks,
  HelpCircle,
  Database,
  Terminal,
  TextSelect,
  Pin,
  Eye,
  BookOpen,
  FileCode,
  FileDiff,
  Info,
  Settings,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import type {
  AskAiClientContext,
  AskAiSurface,
  AskAiUsageResponse,
} from "@/lib/ai/types";
import { useAskAi } from "./useAskAi";
import { useSuggestedQuestions } from "./useSuggestedQuestions";
import { countSchemaEntities } from "./sqlSchemaText";
import {
  hasAiEditHandler,
  parseAiEditSuggestions,
  requestAiEdit,
  type AiEditSuggestion,
} from "./editSuggestions";
import {
  collectAskAiWidgets,
  findAskAiSourceLabelFor,
  getAskAiSources,
  getAskAiSourcesServer,
  subscribeAskAiSources,
  type AskAiSourceKind,
} from "./contextRegistry";
import styles from "./AskAiPanel.module.css";

/** Where the closed-state launcher sits, user-configurable from the panel's
 *  settings: the floating pill in the bottom-right corner (default), or a
 *  slim vertical tab hugging the right viewport edge that stays out of the
 *  content's way. Persisted in localStorage. */
type LauncherPlacement = "floating" | "tab";
const LAUNCHER_PLACEMENT_KEY = "dataslope:ask-ai-placement";

interface Props {
  surface: AskAiSurface;
  /** What the user is looking at, for display copy only, "lesson" on course
   *  pages, "question set" on interview-prep (which mounts as surface
   *  "learn" but isn't a lesson), "playground" elsewhere. */
  subjectNoun?: string;
  collectContext: () => AskAiClientContext;
}

const KIND_ICONS: Record<AskAiSourceKind, typeof Code2> = {
  challenge: ListChecks,
  "code-block": Code2,
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
// LESSON_BASES in lib/ai/context.ts), used only to describe the context
// honestly in the "What AI can see" panel.
const LESSON_MD_BASES = new Set(["courses", "fumadocs-dev"]);

/** Three clickable suggested questions (or pulsing placeholders while they
 *  generate). Renders nothing when there's nothing to show. */
function SuggestionList({
  suggestions,
  loading,
  onPick,
}: {
  suggestions: string[];
  loading: boolean;
  onPick: (q: string) => void;
}) {
  if (loading) {
    return (
      <div className={styles.suggestList} aria-hidden>
        <span className={styles.suggestSkeleton} />
        <span className={styles.suggestSkeleton} />
        <span className={styles.suggestSkeleton} />
      </div>
    );
  }
  if (suggestions.length === 0) return null;
  return (
    <div className={styles.suggestList} aria-label="Suggested questions">
      {suggestions.map((q) => (
        <button
          key={q}
          type="button"
          className={styles.suggestButton}
          onClick={() => onPick(q)}
        >
          <Sparkles size={12} aria-hidden />
          <span>{q}</span>
        </button>
      ))}
    </div>
  );
}

/** One line in the "What AI can see" panel. */
function ContextItem({
  icon: Icon,
  children,
}: {
  icon: typeof Eye;
  children: ReactNode;
}) {
  return (
    <li className={styles.contextItem}>
      <Icon size={13} aria-hidden />
      <span>{children}</span>
    </li>
  );
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
  // Launcher placement, set from the panel's settings. Persists across
  // pages/reloads (this widget is client-only, so reading localStorage in the
  // initializer is SSR-safe).
  const [placement, setPlacement] = useState<LauncherPlacement>(() => {
    if (typeof window === "undefined") return "floating";
    try {
      return window.localStorage.getItem(LAUNCHER_PLACEMENT_KEY) === "tab"
        ? "tab"
        : "floating";
    } catch {
      return "floating";
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const choosePlacement = useCallback((next: LauncherPlacement) => {
    setPlacement(next);
    try {
      window.localStorage.setItem(LAUNCHER_PLACEMENT_KEY, next);
    } catch {
      /* private mode, preference just won't persist */
    }
  }, []);
  const { data: session, isPending } = useSession();

  // ── Context sources ────────────────────────────────────────────────
  // Widgets registered on the page (challenge cards, code blocks, MCQs,
  // playground shells). Visible ones are attached automatically; clicking a
  // chip pins the widget so it stays attached even off-screen and is marked
  // "referenced by the user" for the model.
  const sources = useSyncExternalStore(
    subscribeAskAiSources,
    getAskAiSources,
    getAskAiSourcesServer,
  );
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(new Set());
  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  // Chips: sources currently in view, plus pinned ones that scrolled away.
  const chipSources = sources.filter(
    (s) => s.visibility > 0 || pinnedIds.has(s.id),
  );

  // ── Selection capture ──────────────────────────────────────────────
  // Keep the last non-collapsed selection made outside the panel (clicking
  // into the panel collapses the document selection, so "current selection
  // at send time" would almost always be empty). The chip's ✕ dismisses it.
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

  // Final per-question context: page/base context from the route, plus the
  // registry's widget snapshots and the captured selection.
  const buildContext = useCallback((): AskAiClientContext => {
    const base = collectContext();
    const { widgets, schema } = collectAskAiWidgets(pinnedIds);
    return {
      ...base,
      ...(widgets.length ? { widgets } : {}),
      ...(schema && !base.schema ? { schema } : {}),
      ...(selection
        ? { selection: selection.text, selectionLabel: selection.sourceLabel }
        : {}),
    };
  }, [collectContext, pinnedIds, selection]);

  const { messages, streaming, error, tier, needsSignIn, send, stop, reset } =
    useAskAi(buildContext);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Keep the newest content in view as it streams in.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const signedIn = Boolean(session) && !isPending && !needsSignIn;

  // ── Daily prompt quota ─────────────────────────────────────────────
  // Fetched when the panel opens; decremented locally per send. Usage is
  // recorded server-side AFTER each answer streams (via waitUntil), so an
  // immediate refetch would race the write, the local decrement stays
  // accurate until the next open. Display-only: the chat endpoint is the
  // enforcement point.
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

  // ── AI edit suggestions → the playground editor ────────────────────
  // Feedback line under a suggestion's action buttons after clicking one.
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
  // Whether a playground editor that can host the diff review is mounted.
  // SQL playgrounds (and lesson pages) share this surface but register no
  // handler, so their answers never grow the review buttons. Evaluated only
  // once a completed answer exists, the handler registry is module state,
  // and any completed answer implies the playground has long since mounted.
  const canApplyEdits =
    surface === "playground" &&
    !streaming &&
    messages.some((m) => m.role === "assistant" && m.content) &&
    hasAiEditHandler(collectContext().adapterId);

  // ── Suggested questions ────────────────────────────────────────────
  // Three context-grounded follow-up questions after each answer. Deliberately
  // NOT shown on the empty panel (the `messages.length > 0` gate), so the first
  // thing the user sees is their own blank slate rather than pre-filled
  // prompts, suggestions only appear once there's a conversation to follow up
  // on. Free for the member (tracked on suggestion-specific counters
  // server-side); failures just hide the section.
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

  // ── "What AI can see" panel ────────────────────────────────────────
  // Expanded view of the exact payload the next question would carry,
  // computed from buildContext() itself so it can't drift from reality.
  const [contextOpen, setContextOpen] = useState(false);
  const contextPreview = useMemo(
    () => (contextOpen ? buildContext() : null),
    // `sources` re-derives the preview when widgets scroll in/out of view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contextOpen, buildContext, sources],
  );
  // Whether the server can actually fetch this page's markdown (mirrors the
  // LESSON_BASES allowlist), interview-prep has no mirror, so don't claim it.
  const hasLessonText =
    contextPreview?.surface === "learn" &&
    LESSON_MD_BASES.has(contextPreview.slug?.[0] ?? "");

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  if (!open) {
    if (placement === "tab") {
      // Slim vertical tab hugging the right viewport edge (the classic
      // "Feedback" tab pattern), for users who found the pill covered
      // page content.
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

  return (
    <div
      className={styles.panel}
      role="dialog"
      aria-label="Ask AI"
      ref={panelRef}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          <Sparkles size={16} />
          Ask AI
          {tier && (
            <span
              className={`${styles.badge} ${tier === "pro" ? styles.badgePro : ""}`}
            >
              {tier}
            </span>
          )}
        </span>
        <span className={styles.headerSpacer} />
        {messages.length > 0 && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={reset}
            aria-label="New conversation"
            title="New conversation"
          >
            <RotateCcw size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label="Ask AI settings"
          aria-expanded={settingsOpen}
          title="Settings"
        >
          <Settings size={16} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setOpen(false)}
          aria-label="Close"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {settingsOpen && (
        <div className={styles.settings} role="group" aria-label="Ask AI settings">
          <div className={styles.settingsLabel}>Ask AI button position</div>
          <label className={styles.settingsOption}>
            <input
              type="radio"
              name="askai-placement"
              checked={placement === "floating"}
              onChange={() => choosePlacement("floating")}
            />
            <span>
              Floating button
              <small>Round button in the bottom-right corner</small>
            </span>
          </label>
          <label className={styles.settingsOption}>
            <input
              type="radio"
              name="askai-placement"
              checked={placement === "tab"}
              onChange={() => choosePlacement("tab")}
            />
            <span>
              Sidebar tab
              <small>Slim tab pinned to the right edge, out of the way</small>
            </span>
          </label>
        </div>
      )}

      <div className={styles.messages} ref={listRef}>
        {!signedIn ? (
          <div className={styles.signedOut}>
            <Sparkles size={22} />
            <p>Sign in to ask AI about this {subject}.</p>
            {/* target="_top" breaks out of the home page's embedded
                playground iframe so sign-in loads in the top-level window,
                not inside the preview. A no-op when not framed. */}
            <a className={styles.signInLink} href="/sign-in" target="_top">
              <LogIn size={15} />
              Sign in
            </a>
          </div>
        ) : messages.length === 0 ? (
          // Empty panel: no suggested questions here by design, they only
          // appear as follow-ups after an answer (see the SuggestionList below
          // the conversation, and the `messages.length > 0` gate on
          // useSuggestedQuestions).
          <div className={styles.emptyWrap}>
            <div className={styles.empty}>
              Ask about the{" "}
              {subject === "question set"
                ? "questions on screen, your answer, or the underlying concept"
                : surface === "learn"
                  ? "lesson, a code block, or a question"
                  : "code, an error, or the language"}{" "}
, I can see what&apos;s on your screen. Highlight text on the
              page to ask about it, or pin a card below to reference it
              directly.
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} className={`${styles.msg} ${styles.user}`}>
                    {m.content}
                  </div>
                );
              }
              const isLast = i === messages.length - 1;
              // Only a COMPLETED answer that actually contains `file=`-tagged
              // code blocks gets the "review in editor" actions, a plain
              // Q&A answer renders exactly as before (see editSuggestions.ts).
              const editSuggestions =
                canApplyEdits && m.content && !(streaming && isLast)
                  ? parseAiEditSuggestions(m.content)
                  : [];
              return (
                <div key={i} className={`${styles.msg} ${styles.assistant}`}>
                  {m.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  ) : streaming && isLast ? (
                    <span className={styles.caret} />
                  ) : null}
                  {editSuggestions.length > 0 && (
                    <div className={styles.editActions}>
                      {editSuggestions.map((s) => (
                        <button
                          key={s.filename}
                          type="button"
                          className={styles.editActionButton}
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
                </div>
              );
            })}
            {/* Follow-up suggestions once an answer has fully streamed in. */}
            {!streaming &&
              messages[messages.length - 1]?.role === "assistant" &&
              messages[messages.length - 1].content && (
                <SuggestionList
                  suggestions={suggestions}
                  loading={suggestLoading}
                  onPick={sendQuestion}
                />
              )}
          </>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>

      {signedIn && (
        <div className={styles.footer}>
          {contextOpen && contextPreview && (
            <div className={styles.contextPanel} aria-label="What AI can see">
              <div className={styles.contextPanelTitle}>
                Sent with your next question
              </div>
              <ul className={styles.contextList}>
                {hasLessonText && (
                  <ContextItem icon={BookOpen}>
                    This lesson&apos;s full text
                  </ContextItem>
                )}
                {(contextPreview.files?.length ?? 0) > 0 && (
                  <ContextItem icon={FileCode}>
                    Your files:{" "}
                    {contextPreview.files!.map((f) => f.filename).join(", ")}
                  </ContextItem>
                )}
                {(contextPreview.outputs?.length ?? 0) > 0 && (
                  <ContextItem icon={Terminal}>
                    Recent program output / errors
                  </ContextItem>
                )}
                {contextPreview.schema && (
                  <ContextItem icon={Database}>
                    Database schema (
                    {countSchemaEntities(contextPreview.schema)} tables/views)
                  </ContextItem>
                )}
                {(contextPreview.widgets ?? []).map((w, i) => {
                  const Icon =
                    KIND_ICONS[w.kind as AskAiSourceKind] ?? Code2;
                  return (
                    <ContextItem key={i} icon={Icon}>
                      {w.label}{" "}
                      <em className={styles.contextState}>
                        {w.referenced ? "(pinned)" : "(on screen)"}
                      </em>
                    </ContextItem>
                  );
                })}
                {contextPreview.selection && (
                  <li className={styles.contextItem}>
                    <TextSelect size={13} aria-hidden />
                    <span>
                      Highlighted text
                      {contextPreview.selectionLabel
                        ? ` in ${contextPreview.selectionLabel}`
                        : ""}
                      :
                      <span className={styles.contextQuote}>
                        “{contextPreview.selection.replace(/\s+/g, " ").slice(0, 160)}
                        {contextPreview.selection.length > 160 ? "…" : ""}”
                      </span>
                    </span>
                  </li>
                )}
                {!hasLessonText &&
                  !contextPreview.files?.length &&
                  !contextPreview.schema &&
                  !contextPreview.widgets?.length &&
                  !contextPreview.selection && (
                    <ContextItem icon={Eye}>
                      Only your question and this page&apos;s type
                    </ContextItem>
                  )}
              </ul>
            </div>
          )}
          <div className={styles.contextRow} aria-label="Question context">
            <button
              type="button"
              className={`${styles.chip} ${styles.chipButton} ${
                contextOpen ? styles.chipPinned : ""
              }`}
              onClick={() => setContextOpen((v) => !v)}
              aria-expanded={contextOpen}
              title="See exactly what will be sent with your question"
            >
              <Eye size={12} aria-hidden />
              <span className={styles.chipLabel}>Context</span>
            </button>
            {selection && (
              <span
                className={`${styles.chip} ${styles.chipSelection}`}
                title={
                  selection.sourceLabel
                    ? `Highlighted in ${selection.sourceLabel}`
                    : "Highlighted text will be sent with your question"
                }
              >
                <TextSelect size={12} aria-hidden />
                <span className={styles.chipLabel}>
                  “{selection.text.replace(/\s+/g, " ").slice(0, 40)}
                  {selection.text.length > 40 ? "…" : ""}”
                </span>
                <button
                  type="button"
                  className={styles.chipDismiss}
                  onClick={() => setSelection(null)}
                  aria-label="Remove highlighted text from context"
                  title="Remove from context"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {chipSources.map((s) => {
              const Icon = KIND_ICONS[s.kind] ?? Code2;
              const pinned = pinnedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.chip} ${styles.chipButton} ${
                    pinned ? styles.chipPinned : ""
                  }`}
                  onClick={() => togglePin(s.id)}
                  aria-pressed={pinned}
                  title={
                    pinned
                      ? "Pinned, always sent with your question. Click to unpin."
                      : "On screen, sent with your question. Click to pin it as the thing you're asking about."
                  }
                >
                  <Icon size={12} aria-hidden />
                  <span className={styles.chipLabel}>{s.label}</span>
                  {pinned && <Pin size={11} aria-hidden />}
                </button>
              );
            })}
          </div>
          <div className={styles.inputRow}>
            <textarea
              className={styles.textarea}
              rows={1}
              placeholder="Ask a question…"
              aria-label="Ask a question"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
            />
            {streaming ? (
              <button
                type="button"
                className={styles.sendButton}
                onClick={stop}
                aria-label="Stop"
                title="Stop"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.sendButton}
                onClick={submit}
                disabled={!draft.trim()}
                aria-label="Send"
                title="Send"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <div className={styles.hintRow}>
            <p className={styles.hint}>
              AI can make mistakes. Verify important answers.
            </p>
            {usage && usage.tier !== "pro" && promptsLeft !== null && (
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={100}
                  closeDelay={150}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={`${styles.quota} ${
                        promptsLeft <= 5 ? styles.quotaLow : ""
                      }`}
                      aria-label={`${promptsLeft} Ask AI prompts left today, details`}
                    >
                      <Info size={12} aria-hidden />
                      {promptsLeft} prompt{promptsLeft === 1 ? "" : "s"} left
                      today
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner side="top" align="end" sideOffset={8}>
                    <Popover.Popup className={styles.quotaPopover}>
                      Free accounts include {usage.requestsLimit} Ask AI
                      prompts per day, resetting at midnight UTC.{" "}
                      <strong>Pro</strong> members get unlimited prompts, a
                      smarter model, and AI autocomplete.
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
