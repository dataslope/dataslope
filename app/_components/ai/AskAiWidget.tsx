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
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, X, Send, Square, RotateCcw, LogIn } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import type { AskAiClientContext, AskAiSurface } from "@/lib/ai/types";
import { useAskAi } from "./useAskAi";
import styles from "./AskAiPanel.module.css";

interface Props {
  surface: AskAiSurface;
  collectContext: () => AskAiClientContext;
}

export default function AskAiWidget({ surface, collectContext }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { data: session, isPending } = useSession();
  const { messages, streaming, error, tier, needsSignIn, send, stop, reset } =
    useAskAi(collectContext);

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
    <div className={styles.panel} role="dialog" aria-label="Ask AI">
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
            Ask about the {surface === "learn" ? "lesson, a code block, or a question" : "code, an error, or the language"} — I can see what&apos;s on your screen.
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
