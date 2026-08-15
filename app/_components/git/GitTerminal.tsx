"use client";

/**
 * The console. A scrollback of `{command, output}` blocks plus a single-line
 * input — no xterm.js, because there is no TTY to emulate and rich blocks
 * inside the transcript are worth more than ANSI fidelity.
 *
 * The input is controlled from above so the command palette can compose into
 * it without executing: clicking a palette entry fills the prompt and the
 * learner presses Enter.
 */

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";

export interface TranscriptEntry {
  id: number;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface Props {
  transcript: TranscriptEntry[];
  value: string;
  onValueChange: (next: string) => void;
  onSubmit: (command: string) => void;
  history: string[];
  busy: boolean;
  completions: string[];
}

export function GitTerminal({
  transcript,
  value,
  onValueChange,
  onSubmit,
  history,
  busy,
  completions,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyIndex = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const command = value.trim();
      if (!command || busy) return;
      historyIndex.current = null;
      onSubmit(command);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (!history.length) return;
      event.preventDefault();
      const current = historyIndex.current;
      let next: number | null;
      if (event.key === "ArrowUp") {
        next = current === null ? history.length - 1 : Math.max(0, current - 1);
      } else {
        next = current === null ? null : current + 1;
        if (next !== null && next >= history.length) next = null;
      }
      historyIndex.current = next;
      onValueChange(next === null ? "" : history[next]);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const parts = value.split(/\s+/);
      const prefix = parts[parts.length - 1] ?? "";
      const matches = completions.filter((c) => c.startsWith(prefix) && c !== prefix);
      if (matches.length === 1) {
        parts[parts.length - 1] = matches[0];
        onValueChange(parts.join(" "));
      }
      return;
    }

    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      onSubmit("clear");
    }
  }

  return (
    <div className="git-terminal">
      <div className="git-terminal-scroll" ref={scrollRef}>
        {transcript.length === 0 && (
          <p className="git-terminal-hint">
            Type a Git command, or pick one from the panel on the right: it fills the prompt and
            you press Enter. <code>ls</code>, <code>cat</code> and friends work too, so{" "}
            <code>cat .git/HEAD</code> shows you what a branch really is.
          </p>
        )}
        {transcript.map((entry) => (
          <div key={entry.id} className="git-terminal-block">
            <div className="git-terminal-command">
              <span className="git-terminal-prompt" aria-hidden="true">
                $
              </span>
              <span>{entry.command}</span>
            </div>
            {entry.stdout && <pre className="git-terminal-out">{entry.stdout.replace(/\n$/, "")}</pre>}
            {entry.stderr && (
              <pre className={entry.exitCode === 0 ? "git-terminal-out" : "git-terminal-err"}>
                {entry.stderr.replace(/\n$/, "")}
              </pre>
            )}
          </div>
        ))}
        {busy && <div className="git-terminal-busy">working…</div>}
      </div>

      <form
        className="git-terminal-inputrow"
        onSubmit={(e) => {
          e.preventDefault();
          const command = value.trim();
          if (command && !busy) onSubmit(command);
        }}
      >
        <span className="git-terminal-prompt" aria-hidden="true">
          $
        </span>
        <input
          ref={inputRef}
          className="git-terminal-input"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          aria-label="Git command"
          placeholder={busy ? "" : "git status"}
        />
      </form>
    </div>
  );
}
