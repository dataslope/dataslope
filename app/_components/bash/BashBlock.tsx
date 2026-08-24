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
import "../shell/embeddedShell.css";
import "./bashPanels.css";

/** Commands offered by tab-completion, on top of whatever is in the tree. */
const SHELL_COMMANDS = [
  "ls", "cd", "pwd", "cat", "echo", "printf", "touch", "mkdir", "rmdir", "rm",
  "cp", "mv", "head", "tail", "wc", "grep", "sed", "awk", "sort", "uniq", "cut",
  "tr", "find", "xargs", "diff", "jq", "tee", "du", "tree", "stat", "clear",
  "basename", "dirname", "seq", "date", "which", "help",
];

/** Where a session starts. Never shown: the prompt is a bare `$`, so this
 *  only ever serves to make tab-completion paths relative. */
const PROMPT_ROOT = "/repo";

export interface BashBlockProps {
  /** Optional starting script, played once the session is ready, either as
   *  one newline-separated string or as a list of lines. The prompt stays live
   *  afterwards, so a reader keeps going from where it left them. */
  commands?: string | string[];
  /** Starting filesystem, by scenario id. */
  scenario?: string;
  /** Share a working directory with other blocks carrying the same id. */
  dir?: string;
  /** Caption in the block header. */
  label?: string;
  /** Rows the terminal shows before it scrolls. */
  rows?: number;
}

export default function BashBlock({
  commands,
  scenario = DEFAULT_BASH_SCENARIO,
  dir,
  label,
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
  /** Bumped by Reset, so the starting script plays again on a fresh tree. */
  const [runToken, setRunToken] = useState(0);
  const played = useRef(-1);

  const append = useCallback(
    (command: string, result: { stdout: string; stderr: string; exitCode: number }) => {
      const id = (entryId.current += 1);
      setTranscript((t) => [...t, { id, command, ...result }]);
    },
    [],
  );

  const runOne = useCallback(
    async (command: string) => {
      try {
        append(command, await exec(command));
      } catch (e) {
        append(command, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 });
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

  /** Bash prints the candidates when Tab cannot narrow further; the listing is
   *  scrollback, not a command, so it carries no prompt line. */
  const listCompletions = useCallback((matches: string[]) => {
    const id = (entryId.current += 1);
    setTranscript((t) => [
      ...t,
      { id, command: "", stdout: matches.join("   "), stderr: "", exitCode: 0, note: true },
    ]);
  }, []);

  /** Paths as the learner would type them: relative to where they actually
   *  are, so after `cd src` a bare `b.txt` completes and `src/b.txt` does not. */
  const pathCompletions = useMemo(() => {
    const rel = state.cwd.startsWith(PROMPT_ROOT) ? state.cwd.slice(PROMPT_ROOT.length + 1) : "";
    const prefix = rel ? `${rel}/` : "";
    const words = new Set<string>();
    for (const path of state.tree) {
      if (!path.startsWith(prefix)) continue;
      const under = path.slice(prefix.length);
      // Only the next segment: a directory completes to `lib/`, not to every
      // file beneath it, the way bash walks one level at a time.
      const slash = under.indexOf("/");
      words.add(slash === -1 ? under : `${under.slice(0, slash)}/`);
    }
    return [...words];
  }, [state.tree, state.cwd]);

  /** The scrollback as text: every prompt line and everything it printed,
   *  which is what a reader who wants to keep a session is actually after. */
  const copyTranscript = useCallback(() => {
    const lines: string[] = [];
    for (const entry of transcript) {
      if (!entry.note) {
        for (const line of entry.command.split("\n")) lines.push(`$ ${line}`);
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
    setRunToken((n) => n + 1);
    void reset();
  }, [reset]);

  const disabled = busy || !ready;

  return (
    <div className="sblock-shell ds-striped-shell">
      <div className="sblock">
        <div className="sblock-head">
          <span className="sblock-tag">
            <Terminal aria-hidden="true" /> Terminal
          </span>
          {label && <span className="sblock-label">{label}</span>}
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
            // A bare `$` and nothing else, the way just-bash's own terminal
            // prompts. `pwd` is one keystroke away for a reader who wants to
            // know where they are.
            placeholder=""
            inlineInput
            onListCompletions={listCompletions}
            placeholderHint={null}
          />
        </div>
      </div>
    </div>
  );
}
