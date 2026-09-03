"use client";

/**
 * A shell you type into, inside lesson prose.
 *
 * Not a textarea with a Run button: a prompt. The reader types a line, presses
 * Enter, reads the output, and types the next one, and the session remembers
 * where they are — `cd src` then `ls` lists `src`, a variable set on one line
 * is there on the next, a function they define stays defined. That state lives
 * in `ShellSession` in the worker, because just-bash scopes each `exec` to a
 * single call.
 *
 * `commands` is optional scaffolding rather than the point of the component:
 * a starting script the block plays for itself once the session is up, so the
 * reader arrives at a session already in progress and carries on from the
 * prompt at the bottom of it. There is no Run button to press first.
 *
 * It is played, not pasted. Each line goes through the same `exec` a typed
 * line does, so `mkdir myfolder` really creates the directory and the `cd
 * myfolder` after it really lands in it. A transcript hard-coded into the
 * page would show the same text and leave the reader in an empty shell.
 *
 * Blocks are isolated unless they share a `dir` id, so exploring in one block
 * cannot disturb another.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { SiGnubash } from "react-icons/si";
import { useGitSession } from "../git/gitRuntime";
import { GitTerminal, type TranscriptEntry } from "../git/GitTerminal";
import { ShellToolsMenu } from "../shell/ShellToolsMenu";
import { DEFAULT_BASH_SCENARIO } from "./bashScenarios";
import { HOME, displayCwd } from "./prompt";
import { makePathCompleter } from "../git/pathCompleter";
import "../shell/embeddedShell.css";
import "./bashPanels.css";

/** Commands offered by tab-completion, on top of whatever is in the tree. */
const SHELL_COMMANDS = [
  "ls", "cd", "pwd", "cat", "echo", "printf", "touch", "mkdir", "rmdir", "rm",
  "cp", "mv", "head", "tail", "wc", "grep", "sed", "awk", "sort", "uniq", "cut",
  "tr", "find", "xargs", "diff", "jq", "tee", "du", "tree", "stat", "clear",
  "basename", "dirname", "seq", "date", "which", "help",
];

export interface BashBlockProps {
  /** Optional starting script, played once the session is ready, either as
   *  one newline-separated string or as a list of lines. The prompt stays live
   *  afterwards, so a reader keeps going from where it left them. */
  commands?: string | string[];
  /** Starting filesystem, by scenario id. */
  scenario?: string;
  /** Share a working directory with other blocks carrying the same id. */
  dir?: string;
  /** Rows the terminal shows before it scrolls. */
  rows?: number;
}

export default function BashBlock({
  commands,
  scenario = DEFAULT_BASH_SCENARIO,
  dir,
  rows = 10,
}: BashBlockProps) {
  const script = useMemo(() => {
    const lines = Array.isArray(commands) ? commands : (commands ?? "").split("\n");
    return lines.map((line) => line.trim()).filter((line) => line !== "");
  }, [commands]);

  const { state, ready, error, exec, reset } = useGitSession(scenario, dir, "bash");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const entryId = useRef(0);
  /** The directory each entry ran in, so scrollback shows a `cd` taking
   *  effect on the line after it rather than rewriting the whole history. */
  const promptAt = useRef<Map<number, string>>(new Map());
  /** Where the session is right now. Read from each result rather than from
   *  React state, which cannot keep up inside a run of commands. */
  const cwdRef = useRef(HOME);
  /** Bumped by Reset, so the starting script plays again on a fresh tree. */
  const [runToken, setRunToken] = useState(0);
  /** Shades the header once the scrollback has content above the fold. */
  const [scrolled, setScrolled] = useState(false);
  const played = useRef(-1);

  const append = useCallback(
    (command: string, result: { stdout: string; stderr: string; exitCode: number }, at: string) => {
      const id = (entryId.current += 1);
      promptAt.current.set(id, at);
      setTranscript((t) => [...t, { id, command, ...result }]);
    },
    [],
  );

  const runOne = useCallback(
    async (command: string) => {
      // The directory as it was before the command ran: a `cd` belongs to the
      // prompt of the *next* line, exactly as in a terminal.
      const at = cwdRef.current;
      try {
        const result = await exec(command);
        cwdRef.current = result.cwd;
        append(command, result, at);
      } catch (e) {
        append(command, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at);
      }
    },
    [append, exec],
  );

  const submit = useCallback(
    async (command: string) => {
      if (command === "clear") {
        setTranscript([]);
        setInput("");
        setHistory((h) => [...h, command]);
        return;
      }
      // A blank line is not a no-op in a shell: it echoes the prompt and
      // hands back a fresh one. Nothing runs and nothing joins the history,
      // which is also how bash treats it.
      if (command === "") {
        const id = (entryId.current += 1);
        promptAt.current.set(id, cwdRef.current);
        setTranscript((t) => [
          ...t,
          { id, command: "", stdout: "", stderr: "", exitCode: 0 },
        ]);
        setInput("");
        return;
      }
      setBusy(true);
      setInput("");
      setHistory((h) => [...h, command]);
      try {
        await runOne(command);
      } finally {
        setBusy(false);
      }
    },
    [runOne],
  );

  const runScript = useCallback(async () => {
    setBusy(true);
    try {
      for (const line of script) {
        setHistory((h) => [...h, line]);
        await runOne(line);
      }
    } finally {
      setBusy(false);
    }
  }, [script, runOne]);

  // The starting script plays itself, so the reader lands on a session already
  // in progress rather than on a Run button. `played` guards StrictMode's
  // double effect and `runScript` changing identity mid-play, either of which
  // would run the example twice into one transcript.
  useEffect(() => {
    if (!ready || script.length === 0 || played.current === runToken) return;
    played.current = runToken;
    void runScript();
  }, [ready, runToken, script.length, runScript]);

  /**
   * Whatever the line editor wants in the scrollback: a completion listing, or
   * the question it asks before a very long one.
   *
   * `echo` reprints the line the reader was editing, which is what puts the
   * listing *below* their command rather than above it. A `null` echo is bare
   * output, the way bash prints a list after you answer its question.
   */
  const write = useCallback(({ echo, text }: { echo: string | null; text: string }) => {
    const id = (entryId.current += 1);
    if (echo !== null) promptAt.current.set(id, cwdRef.current);
    setTranscript((t) => [
      ...t,
      {
        id,
        command: echo ?? "",
        stdout: text,
        stderr: "",
        exitCode: 0,
        note: echo === null,
      },
    ]);
  }, []);

  /** Paths as the reader would type them, relative to where they are. */
  const pathCompletions = useMemo(
    () => makePathCompleter(state.tree, state.dirs, state.cwd, HOME),
    [state.tree, state.dirs, state.cwd],
  );

  /** The scrollback as text: every prompt line and everything it printed,
   *  which is what a reader who wants to keep a session is actually after. */
  const copyTranscript = useCallback(() => {
    const lines: string[] = [];
    for (const entry of transcript) {
      if (!entry.note) {
        const at = displayCwd(promptAt.current.get(entry.id) ?? HOME);
        for (const line of entry.command.split("\n")) lines.push(`${at} $ ${line}`);
      }
      if (entry.stdout) lines.push(entry.stdout.replace(/\n$/, ""));
      if (entry.stderr) lines.push(entry.stderr.replace(/\n$/, ""));
    }
    return lines.join("\n");
  }, [transcript]);

  const resetBlock = useCallback(() => {
    setTranscript([]);
    setInput("");
    setHistory([]);
    promptAt.current = new Map();
    cwdRef.current = HOME;
    setRunToken((n) => n + 1);
    void reset();
  }, [reset]);

  const disabled = busy || !ready;

  return (
    <div className="sblock-shell ds-striped-shell">
      <div className="sblock">
        <div className={scrolled ? "sblock-head scrolled" : "sblock-head"}>
          <span className="sblock-tag">
            <Terminal aria-hidden="true" /> Terminal
          </span>
          {dir && <span className="sblock-chain">{dir}</span>}
          <span className="sblock-head-sep" />
          <div className="sblock-head-meta">
            <span className="sblock-runtime">
              <SiGnubash aria-hidden="true" /> Bash
            </span>
            <ShellToolsMenu
              onReset={resetBlock}
              getCopyText={copyTranscript}
              copyLabel="transcript"
              copyNote="Every command in this session and what it printed"
              disabled={disabled}
            />
          </div>
        </div>

        {error && <div className="sblock-notice error">{error}</div>}

        <div className="sblock-terminal" style={{ height: `${rows * 1.55 + 3.2}em` }}>
          <GitTerminal
            transcript={transcript}
            value={input}
            onValueChange={setInput}
            onSubmit={(c) => void submit(c)}
            history={history}
            busy={disabled}
            completions={SHELL_COMMANDS}
            pathCompletions={pathCompletions}
            // bash's own `\w$`: the working directory in full, then the `$`.
            prompt={displayCwd(state.cwd || HOME)}
            promptFor={(entry) => displayCwd(promptAt.current.get(entry.id) ?? HOME)}
            placeholder=""
            inlineInput
            onWrite={write}
            onScrolledChange={setScrolled}
            placeholderHint={null}
          />
        </div>
      </div>
    </div>
  );
}
