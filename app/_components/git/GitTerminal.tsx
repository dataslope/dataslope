"use client";

/**
 * The console. A scrollback of `{command, output}` blocks plus a prompt — no
 * xterm.js, because there is no TTY to emulate and rich blocks inside the
 * transcript are worth more than ANSI cursor fidelity.
 *
 * Three things make it read as a terminal rather than a form:
 *
 * - **A block cursor.** The real `<input>` is visually hidden and only holds
 *   the value and the caret; the line you see is rendered text with a blinking
 *   block over the character under the caret. Same approach justbash.dev uses.
 * - **ANSI output.** just-bash passes escape sequences straight through, so
 *   anything a learner writes with `printf` or `echo -e` has to render as
 *   color rather than as escape-code text.
 * - **Tab completion that behaves.** Longest common prefix first, then a
 *   listing when the choice is genuinely ambiguous, as bash does.
 *
 * The input is controlled from above so a command palette can compose into it
 * without executing.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { hasAnsi, parseAnsi } from "./ansi";

export interface TranscriptEntry {
  id: number;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  /** Rendered as bare output with no prompt line, for completion listings. */
  note?: boolean;
}

interface Props {
  transcript: TranscriptEntry[];
  value: string;
  onValueChange: (next: string) => void;
  /** The line the reader pressed Enter on, trimmed. `""` for a blank line,
   *  which a shell answers with a fresh prompt rather than by ignoring it. */
  onSubmit: (command: string) => void;
  history: string[];
  busy: boolean;
  /** Command names, offered for the first word of a line. */
  completions: string[];
  /** Paths, offered for every word after the first — as bash does, where the
   *  first word completes against PATH and the rest against the filesystem. */
  pathCompletions?: string[];
  /** Transcript only, no prompt: a block that runs a fixed script. */
  readOnly?: boolean;
  /** Replaces the default empty-state copy. `null` suppresses it entirely,
   *  for a terminal that should open as a bare prompt and nothing else. */
  placeholderHint?: ReactNode;
  /** Directory shown before the `$`, the way a real prompt does. */
  prompt?: string;
  /** Per-entry prompt, so a `cd` mid-session is visible in the scrollback. */
  promptFor?: (entry: TranscriptEntry) => string | undefined;
  /** Ghost text in the empty prompt. */
  placeholder?: string;
  /**
   * Render the prompt as the last line of the scrollback rather than as a
   * separate footer, so the cursor sits where the next output will appear and
   * clicking anywhere in the terminal focuses it.
   */
  inlineInput?: boolean;
  /** Called with the candidates when Tab cannot narrow further, so the host
   *  can print them the way bash does. */
  onListCompletions?: (matches: string[]) => void;
}

/** Longest string every candidate starts with. */
function commonPrefix(items: string[]): string {
  if (!items.length) return "";
  let prefix = items[0];
  for (const item of items.slice(1)) {
    while (prefix && !item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function Output({ text, className }: { text: string; className: string }) {
  const body = text.replace(/\n$/, "");
  if (!hasAnsi(body)) return <pre className={className}>{body}</pre>;
  return (
    <pre className={className}>
      {parseAnsi(body).map((span, i) => (
        <span key={i} className={span.classes.map((c) => `ansi-${c}`).join(" ")}>
          {span.text}
        </span>
      ))}
    </pre>
  );
}

export function GitTerminal({
  transcript,
  value,
  onValueChange,
  onSubmit,
  history,
  busy,
  completions,
  pathCompletions,
  readOnly = false,
  placeholderHint,
  prompt,
  promptFor,
  placeholder = "git status",
  inlineInput = false,
  onListCompletions,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyIndex = useRef<number | null>(null);
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, busy, value]);

  useEffect(() => {
    // `preventScroll` matters: the real input is visually hidden, and without
    // it the browser scrolls the page to wherever that hidden element sits
    // every time a command finishes and focus comes back.
    if (!busy && !readOnly) inputRef.current?.focus({ preventScroll: true });
  }, [busy, readOnly]);

  const syncCaret = useCallback(() => {
    setCaret(inputRef.current?.selectionStart ?? 0);
  }, []);

  const moveCaret = useCallback((to: number) => {
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(to, to);
      setCaret(to);
    });
  }, []);

  function complete() {
    const upto = value.slice(0, caret);
    const parts = upto.split(/\s+/);
    const word = parts[parts.length - 1] ?? "";
    // The first word is a command; everything after it is a path. Without this
    // `cat <Tab>` would offer every command in the shell.
    const pool =
      parts.length <= 1 ? completions : (pathCompletions ?? completions);
    const matches = [...new Set(pool.filter((c) => c.startsWith(word)))].sort();
    if (!matches.length) return;

    const shared = commonPrefix(matches);
    if (shared.length > word.length) {
      // One match is finished, so bash adds a space; a directory is not, so it
      // does not.
      const finished = matches.length === 1 && !shared.endsWith("/");
      const insert = shared + (finished ? " " : "");
      onValueChange(value.slice(0, caret - word.length) + insert + value.slice(caret));
      moveCaret(caret - word.length + insert.length);
      return;
    }
    // Nothing more in common: show the choices, as a second Tab does in bash.
    if (matches.length > 1) onListCompletions?.(matches);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (busy) return;
      historyIndex.current = null;
      // An empty line is something a shell runs: it echoes the prompt and
      // gives you a fresh one. Hosts get "" and append the bare line.
      onSubmit(value.trim());
      setCaret(0);
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
      const line = next === null ? "" : history[next];
      onValueChange(line);
      moveCaret(line.length);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      complete();
      return;
    }

    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      onSubmit("clear");
      return;
    }

    // Ctrl-C abandons the line rather than running it, as in a real shell.
    if (event.key === "c" && event.ctrlKey && value) {
      event.preventDefault();
      historyIndex.current = null;
      onValueChange("");
      setCaret(0);
      return;
    }

    // Let the browser move the caret first, then mirror where it landed.
    requestAnimationFrame(syncCaret);
  }

  const promptSpan = useMemo(
    () => (
      <span className="git-terminal-prompt" aria-hidden="true">
        {prompt ? <span className="git-terminal-cwd">{prompt}</span> : null}$
      </span>
    ),
    [prompt],
  );

  const atEnd = caret >= value.length;
  const under = atEnd ? " " : value[caret];
  const cursorClass =
    !busy && focused ? "git-terminal-cursor blink" : "git-terminal-cursor idle";

  const inputRow = readOnly ? null : (
    <form
      className={inlineInput ? "git-terminal-inputrow inline" : "git-terminal-inputrow"}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit(value.trim());
      }}
    >
      {promptSpan}

      {/* The visible line. The real input sits off to the side holding the
          value and the caret; this is what the reader sees, so the cursor can
          be a block that blinks the way a terminal's does. */}
      <span className="git-terminal-line" aria-hidden="true">
        <span>{value.slice(0, caret)}</span>
        <span className={cursorClass}>{under}</span>
        <span>{atEnd ? "" : value.slice(caret + 1)}</span>
        {value === "" && !busy && <span className="git-terminal-ghost">{placeholder}</span>}
      </span>

      <input
        ref={inputRef}
        className="git-terminal-input"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          requestAnimationFrame(syncCaret);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onSelect={syncCaret}
        onFocus={() => {
          setFocused(true);
          syncCaret();
        }}
        onBlur={() => setFocused(false)}
        disabled={busy}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        aria-label={placeholder === "git status" ? "Git command" : "Shell command"}
      />
    </form>
  );

  return (
    <div className="git-terminal">
      <div
        className="git-terminal-scroll"
        ref={scrollRef}
        // Clicking dead space in a terminal puts the cursor back on the
        // prompt; without this the inline prompt is easy to lose.
        onMouseUp={() => {
          if (inlineInput && !window.getSelection()?.toString())
            inputRef.current?.focus({ preventScroll: true });
        }}
      >
        {transcript.length === 0 &&
          (placeholderHint === undefined ? (
            <p className="git-terminal-hint">
              Type a Git command, or pick one from the panel on the right: it fills the prompt and
              you press Enter. <code>ls</code>, <code>cat</code> and friends work too, so{" "}
              <code>cat .git/HEAD</code> shows you what a branch really is.
            </p>
          ) : (
            placeholderHint
          ))}
        {transcript.map((entry) => (
          <div key={entry.id} className="git-terminal-block">
            {/* A script entry carries several lines; each gets its own prompt
                so the transcript still reads like a terminal. */}
            {!entry.note &&
              entry.command.split("\n").map((line, i) => (
                <div className="git-terminal-command" key={i}>
                  <span className="git-terminal-prompt" aria-hidden="true">
                    {i === 0 && promptFor?.(entry) ? (
                      <span className="git-terminal-cwd">{promptFor(entry)}</span>
                    ) : null}
                    $
                  </span>
                  <span>{line}</span>
                </div>
              ))}
            {entry.stdout && <Output text={entry.stdout} className="git-terminal-out" />}
            {entry.stderr && (
              <Output
                text={entry.stderr}
                className={entry.exitCode === 0 ? "git-terminal-out" : "git-terminal-err"}
              />
            )}
          </div>
        ))}
        {busy && <div className="git-terminal-busy">working…</div>}
        {inlineInput && inputRow}
      </div>

      {!inlineInput && inputRow}
    </div>
  );
}
