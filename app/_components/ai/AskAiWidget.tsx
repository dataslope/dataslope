"use client";

/**
 * Floating "Ask AI" launcher + chat panel. Shared by the /learn and /playground
 * surfaces — they differ only in the `collectContext` they pass in. Signed-in
 * only: signed-out users get a sign-in CTA (auth gates the *action*, never the
 * page, so the host page stays statically prerendered).
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import type { AskAiClientContext, AskAiSurface } from "@/lib/ai/types";
import { useAskAi } from "./useAskAi";
import {
  collectAskAiWidgets,
  findAskAiSourceLabelFor,
  getAskAiSources,
  getAskAiSourcesServer,
  subscribeAskAiSources,
  type AskAiSourceKind,
} from "./contextRegistry";
import styles from "./AskAiPanel.module.css";

interface Props {
  surface: AskAiSurface;
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
// body small — the server re-clips against the token budget anyway.
const MIN_SELECTION_CHARS = 3;
const MAX_SELECTION_CHARS = 2000;

interface CapturedSelection {
  text: string;
  /** Label of the widget the selection fell inside, if any. */
  sourceLabel?: string;
}

export default function AskAiWidget({ surface, collectContext }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
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

  const submit = useCallback(() => {
    const q = draft.trim();
    if (!q) return;
    send(q);
    setDraft("");
    // The highlighted text answered this question; don't let it leak into
    // unrelated follow-ups. Re-selecting re-captures it.
    setSelection(null);
  }, [draft, send]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  if (!open) {
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
          onClick={() => setOpen(false)}
          aria-label="Close"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.messages} ref={listRef}>
        {!signedIn ? (
          <div className={styles.signedOut}>
            <Sparkles size={22} />
            <p>Sign in to ask AI about this {surface === "learn" ? "lesson" : "playground"}.</p>
            <a className={styles.signInLink} href="/sign-in">
              <LogIn size={15} />
              Sign in
            </a>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            Ask about the {surface === "learn" ? "lesson, a code block, or a question" : "code, an error, or the language"} — I can see what&apos;s on your screen. Highlight text on the page to ask about it, or pin a card below to reference it directly.
          </div>
        ) : (
          messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className={`${styles.msg} ${styles.user}`}>
                  {m.content}
                </div>
              );
            }
            const isLast = i === messages.length - 1;
            return (
              <div key={i} className={`${styles.msg} ${styles.assistant}`}>
                {m.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                ) : streaming && isLast ? (
                  <span className={styles.caret} />
                ) : null}
              </div>
            );
          })
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>

      {signedIn && (
        <div className={styles.footer}>
          {(selection || chipSources.length > 0) && (
            <div className={styles.contextRow} aria-label="Question context">
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
                        ? "Pinned — always sent with your question. Click to unpin."
                        : "On screen — sent with your question. Click to pin it as the thing you're asking about."
                    }
                  >
                    <Icon size={12} aria-hidden />
                    <span className={styles.chipLabel}>{s.label}</span>
                    {pinned && <Pin size={11} aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
          <div className={styles.inputRow}>
            <textarea
              className={styles.textarea}
              rows={1}
              placeholder="Ask a question…"
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
          <p className={styles.hint}>
            AI can make mistakes. Verify important answers.
          </p>
        </div>
      )}
    </div>
  );
}
