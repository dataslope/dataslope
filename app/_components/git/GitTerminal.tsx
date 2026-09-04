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
 * without executing. A value that arrives from above lands with the caret at
 * its end (or on a selection the host asks for), because a chip that fills
 * the prompt and leaves the caret on its first character makes the next
 * keystroke land in front of `git`.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
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
  /** Rendered as bare output with no prompt line: the answer to a
   *  "Display all N possibilities?" question, which bash prints on its own. */
  note?: boolean;
  /** A line typed at the `>` continuation prompt, finishing a command that
   *  began on an earlier line. Drawn with that prompt rather than `$`. */
  continuation?: boolean;
}

/** Where a host wants the caret after it sets the value: the end (the
 *  default), or a selection, so a placeholder message inside quotes can be
 *  typed over. */
export interface FocusOptions {
  select?: [number, number];
}

/** What a host can ask the terminal to do from outside: put focus back on
 *  the prompt after composing a command, or press Tab for a keyboard that
 *  has no Tab key. */
export interface GitTerminalHandle {
  focus: (options?: FocusOptions) => void;
  complete: () => void;
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
  /** Second words for commands that take one, so `git a<Tab>` offers `add`
   *  rather than the files in the directory. */
  subcommands?: Record<string, string[]>;
  /**
   * Candidates for a partly typed path, resolved by the host because only it
   * knows the filesystem. Called with the word under the caret exactly as
   * typed (`src/ut`) and expected to answer in the same form
   * (`["src/util.txt"]`), so completion can walk into a directory the way
   * bash does rather than stopping at the current one.
   */
  pathCompletions?: (word: string) => string[];
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
  /**
   * Bash writes into the scrollback while you are still editing a line: the
   * candidates when Tab cannot narrow further, and the question it asks
   * before printing a very long list. The host owns the transcript, so it
   * appends what it is handed.
   *
   * `echo` is the line to reprint above the text, the way bash reprints what
   * you had typed before answering you, or `null` for bare output.
   */
  onWrite?: (out: { echo: string | null; text: string }) => void;
  /** True once the scrollback is scrolled off its top, so a host can shade
   *  the header it sits under. */
  onScrolledChange?: (scrolled: boolean) => void;
  /**
   * The previous line was not finished (an open `if`, a quote, a trailing
   * `|`), so this prompt is bash's `>`: what is typed here continues it.
   */
  continuation?: boolean;
  /** Ctrl-C: the reader abandons the line (handed over, so the host can
   *  echo it with the `^C` a terminal prints), and any continuation with it. */
  onCancel?: (abandoned: string) => void;
  /**
   * Enter while a command is running hands the line to the host, which runs
   * it next, as a real shell would. Off by default: a host that has no
   * queue would otherwise run two commands at once. Hosts pass their
   * `ready` flag, so the prompt stays disabled until the runtime is up: a
   * line sent ahead of the seed would land in an empty session.
   */
  queueWhileBusy?: boolean;
}

/** How many candidates bash will print without asking first. Readline calls
 *  it `completion-query-items`; 100 is its default. */
const QUERY_ITEMS = 100;

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

export const GitTerminal = forwardRef<GitTerminalHandle, Props>(function GitTerminal({
  transcript,
  value,
  onValueChange,
  onSubmit,
  history,
  busy,
  completions,
  subcommands,
  pathCompletions,
  readOnly = false,
  placeholderHint,
  prompt,
  promptFor,
  placeholder = "git status",
  inlineInput = false,
  onWrite,
  onScrolledChange,
  continuation = false,
  onCancel,
  queueWhileBusy = false,
}: Props, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const historyIndex = useRef<number | null>(null);
  /** Consecutive Tab presses, so the second one can list what the first
   *  could not narrow. */
  const tabRun = useRef(0);
  /** Candidates held back behind "Display all N possibilities?", waiting on a
   *  y or an n. Non-null means the next keystroke is that answer. */
  const [pendingList, setPendingList] = useState<string[] | null>(null);
  const [caret, setCaret] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [focused, setFocused] = useState(false);
  /** The last value the reader typed or this component set itself. A
   *  `value` that differs arrived from the host (a chip, a palette row), and
   *  the caret has to be placed for it. */
  const known = useRef(value);
  /** Where the host asked the caret to go with its next value. */
  const requested = useRef<FocusOptions | null>(null);

  const scrolled = useRef(false);
  const reportScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = el.scrollTop > 0;
    if (next === scrolled.current) return;
    scrolled.current = next;
    onScrolledChange?.(next);
  }, [onScrolledChange]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    reportScroll();
  }, [transcript, busy, value, reportScroll]);

  // A value set from outside lands with the caret at its end, or on the
  // selection the host asked for. Typed values are left where the browser
  // put the caret.
  useLayoutEffect(() => {
    if (known.current === value) return;
    known.current = value;
    const [start, end] = requested.current?.select ?? [value.length, value.length];
    requested.current = null;
    const el = inputRef.current;
    if (el) {
      try {
        el.setSelectionRange(start, end);
      } catch {
        /* an input that is not focusable right now; the mirror still shows the caret */
      }
    }
    setCaret(start);
    setSelectionEnd(end);
  }, [value]);

  useEffect(() => {
    if (busy || readOnly) return;
    // Several terminals can share a page. One finishing a command takes the
    // keyboard back unless someone is typing somewhere else: another
    // terminal's prompt, an editor, a search box.
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      !rootRef.current?.contains(active) &&
      active.matches("input, textarea, select, [contenteditable]")
    )
      return;
    // `preventScroll` matters: the real input is visually hidden, and without
    // it the browser scrolls the page to wherever that hidden element sits
    // every time a command finishes and focus comes back.
    inputRef.current?.focus({ preventScroll: true });
  }, [busy, readOnly]);

  const syncCaret = useCallback(() => {
    const el = inputRef.current;
    setCaret(el?.selectionStart ?? 0);
    setSelectionEnd(el?.selectionEnd ?? el?.selectionStart ?? 0);
  }, []);

  const moveCaret = useCallback((to: number) => {
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(to, to);
      setCaret(to);
      setSelectionEnd(to);
    });
  }, []);

  /** Set the value from inside, so the placement effect leaves the caret
   *  where the caller puts it. */
  const setValue = useCallback(
    (next: string) => {
      known.current = next;
      onValueChange(next);
    },
    [onValueChange],
  );

  /**
   * One press of Tab.
   *
   * `run` is how many Tabs came immediately before this one, because bash
   * splits the work across two: the first completes as far as the candidates
   * agree, and the second prints them. There is no terminal bell here, so
   * that listing is the only signal a reader gets that the choice was
   * ambiguous.
   */
  function complete(run: number) {
    const upto = value.slice(0, caret);
    // A pipe or a `;` starts a new command, so the word after one completes
    // against commands again rather than against the filesystem.
    const segment = upto.split(/[|;&]+/).pop() ?? "";
    const parts = segment.trimStart().split(/\s+/);
    const word = parts[parts.length - 1] ?? "";

    // The first word of a command is a command; everything after it is a
    // path, unless the command has subcommands and this is its second word.
    // Without this, `cat <Tab>` would offer every command in the shell.
    const subs = parts.length === 2 ? subcommands?.[parts[0]] : undefined;
    const pool =
      parts.length <= 1
        ? completions.filter((c) => c.startsWith(word))
        : subs
          ? subs.filter((c) => c.startsWith(word))
          : (pathCompletions?.(word) ?? []);
    const matches = [...new Set(pool)].sort();
    if (!matches.length) return;

    // A lone match is finished, so bash appends a space and moves you on. A
    // directory is not finished: the caret stays after the slash so the next
    // Tab can walk into it.
    const shared = commonPrefix(matches);
    const insert =
      matches.length === 1 && !shared.endsWith("/") ? `${shared} ` : shared;

    if (insert.length > word.length) {
      setValue(value.slice(0, caret - word.length) + insert + value.slice(caret));
      moveCaret(caret - word.length + insert.length);
      return;
    }

    // Nothing left to add. Print the candidates by their last segment, which
    // is the column of names bash shows rather than a column of full paths.
    if (matches.length <= 1 || run < 1) return;
    const names = matches.map((m) => m.slice(m.lastIndexOf("/", m.length - 2) + 1));

    // A list long enough to bury the session gets a question first, which is
    // bash's `completion-query-items` and its default of 100.
    if (names.length > QUERY_ITEMS) {
      setPendingList(names);
      onWrite?.({
        echo: value,
        text: `Display all ${names.length} possibilities? (y or n)`,
      });
      return;
    }
    onWrite?.({ echo: value, text: names.join("   ") });
  }

  useImperativeHandle(ref, () => ({
    focus: (options) => {
      const el = inputRef.current;
      if (!el) return;
      if (options) requested.current = options;
      el.focus({ preventScroll: true });
      // Place the caret after focusing, not before: a range set on an
      // unfocused input does not survive the focus that follows. The end of
      // whatever is on the line, unless the host asked for a selection.
      const [start, end] = options?.select ?? [el.value.length, el.value.length];
      requested.current = null;
      el.setSelectionRange(start, end);
      setCaret(start);
      setSelectionEnd(end);
    },
    complete: () => {
      complete(tabRun.current);
      tabRun.current += 1;
    },
  }));

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Waiting on an answer to "Display all N possibilities?". Bash takes one
    // key here and echoes neither it nor a fresh prompt, so every key is
    // swallowed and only `y` prints the list.
    if (pendingList) {
      event.preventDefault();
      if (event.key === "y" || event.key === "Y") {
        onWrite?.({ echo: null, text: pendingList.join("   ") });
      }
      setPendingList(null);
      tabRun.current = 0;
      return;
    }

    // Only a run of Tabs with nothing between them earns the listing.
    if (event.key !== "Tab") tabRun.current = 0;

    if (event.key === "Enter") {
      event.preventDefault();
      if (busy && !queueWhileBusy) return;
      historyIndex.current = null;
      // An empty line is something a shell runs: it echoes the prompt and
      // gives you a fresh one. Hosts get "" and append the bare line. While
      // a command is still running the host queues the line, as a real
      // shell would, rather than dropping it.
      onSubmit(value.trim());
      setCaret(0);
      setSelectionEnd(0);
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
      setValue(line);
      moveCaret(line.length);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      complete(tabRun.current);
      tabRun.current += 1;
      return;
    }

    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      onSubmit("clear");
      return;
    }

    // Ctrl-C abandons the line rather than running it, as in a real shell,
    // and with it any lines waiting at a continuation prompt.
    if (event.key === "c" && event.ctrlKey && (value || continuation)) {
      event.preventDefault();
      historyIndex.current = null;
      const abandoned = value;
      setValue("");
      setCaret(0);
      setSelectionEnd(0);
      onCancel?.(abandoned);
      return;
    }

    // Let the browser move the caret first, then mirror where it landed.
    requestAnimationFrame(syncCaret);
  }

  const promptSpan = useMemo(
    () =>
      continuation ? (
        <span className="git-terminal-prompt continuation" aria-hidden="true">
          &gt;
        </span>
      ) : (
        <span className="git-terminal-prompt" aria-hidden="true">
          {prompt ? <span className="git-terminal-cwd">{prompt}</span> : null}$
        </span>
      ),
    [prompt, continuation],
  );

  const atEnd = caret >= value.length;
  const under = atEnd ? " " : value[caret];
  const selected = selectionEnd > caret + 1 ? value.slice(caret + 1, selectionEnd) : "";
  const cursorClass =
    !busy && focused ? "git-terminal-cursor blink" : "git-terminal-cursor idle";

  const inputRow = readOnly ? null : (
    <form
      className={inlineInput ? "git-terminal-inputrow inline" : "git-terminal-inputrow"}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy || queueWhileBusy) onSubmit(value.trim());
      }}
    >
      {promptSpan}

      {/* The visible line. The real input sits off to the side holding the
          value and the caret; this is what the reader sees, so the cursor can
          be a block that blinks the way a terminal's does. */}
      <span className="git-terminal-line" aria-hidden="true">
        <span>{value.slice(0, caret)}</span>
        <span className={cursorClass}>{under}</span>
        {selected && <span className="git-terminal-selection">{selected}</span>}
        <span>{atEnd ? "" : value.slice(caret + 1 + selected.length)}</span>
        {value === "" && !busy && !continuation && (
          <span className="git-terminal-ghost">{placeholder}</span>
        )}
      </span>

      <input
        ref={inputRef}
        className="git-terminal-input"
        value={value}
        onChange={(e) => {
          known.current = e.target.value;
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
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        enterKeyHint="go"
        disabled={busy && !queueWhileBusy}
        aria-label={placeholder === "git status" ? "Git command" : "Shell command"}
        aria-busy={busy || undefined}
      />
    </form>
  );

  return (
    <div className="git-terminal" ref={rootRef}>
      <div
        className="git-terminal-scroll"
        ref={scrollRef}
        onScroll={reportScroll}
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
                so the transcript still reads like a terminal. A continuation
                line gets bash's `>` instead. */}
            {!entry.note &&
              entry.command.split("\n").map((line, i) => (
                <div className="git-terminal-command" key={i}>
                  {entry.continuation ? (
                    <span className="git-terminal-prompt continuation" aria-hidden="true">
                      &gt;
                    </span>
                  ) : (
                    <span className="git-terminal-prompt" aria-hidden="true">
                      {i === 0 && promptFor?.(entry) ? (
                        <span className="git-terminal-cwd">{promptFor(entry)}</span>
                      ) : null}
                      $
                    </span>
                  )}
                  <span>{line}</span>
                </div>
              ))}
            {entry.stdout && <Output text={entry.stdout} className="git-terminal-out" />}
            {/* Standard error is coloured by the descriptor it came from, not
                by whether the command failed: red for a failure, a quieter
                warning tone for what a successful command said on stderr. */}
            {entry.stderr && (
              <Output
                text={entry.stderr}
                className={entry.exitCode === 0 ? "git-terminal-stderr" : "git-terminal-err"}
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
});
