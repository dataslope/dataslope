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
 * a starting script the reader can run in one click before continuing by hand.
 *
 * Blocks are isolated unless they share a `dir` id, so exploring in one block
 * cannot disturb another.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useGitSession } from "../git/gitRuntime";
import { GitTerminal, type TranscriptEntry } from "../git/GitTerminal";
import { BashStateStrip } from "./FileTreePanel";
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

/** `/repo` is an implementation detail; the reader sees a home-ish prompt. */
const PROMPT_ROOT = "/repo";
const displayCwd = (cwd: string) =>
  cwd === PROMPT_ROOT ? "~" : `~${cwd.slice(PROMPT_ROOT.length)}`;

export interface BashBlockProps {
  /** Optional starting script, run by the Run button. The prompt stays live
   *  afterwards, so a reader can keep going from wherever it left them. */
  commands?: string;
  /** Starting filesystem, by scenario id. */
  scenario?: string;
  /** Share a working directory with other blocks carrying the same id. */
  dir?: string;
  /** Open the file listing on mount. */
  expandState?: boolean;
  /** Caption in the block header. */
  label?: string;
  /** Rows the terminal shows before it scrolls. */
  rows?: number;
}

export default function BashBlock({
  commands,
  scenario = DEFAULT_BASH_SCENARIO,
  dir,
  expandState = false,
  label,
  rows = 10,
}: BashBlockProps) {
  const script = useMemo(
    () => (commands ?? "").split("\n").filter((l) => l.trim() !== ""),
    [commands],
  );

  const { state, ready, error, exec, reset } = useGitSession(scenario, dir, "bash");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ranScript, setRanScript] = useState(false);
  const [open, setOpen] = useState(expandState);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const entryId = useRef(0);
  const previous = useRef<Map<string, string>>(new Map());
  /** The prompt each entry was run under, so scrollback shows where it ran. */
  const promptAt = useRef<Map<number, string>>(new Map());

  // Flag paths whose contents moved, so a pipeline's effect on disk is visible.
  useEffect(() => {
    const next = new Map(Object.entries(state.contents ?? {}));
    for (const path of state.tree) if (!next.has(path)) next.set(path, "");
    const moved = new Set<string>();
    for (const [path, body] of next) {
      if (previous.current.get(path) !== body) moved.add(path);
    }
    if (previous.current.size > 0) setChanged(moved);
    previous.current = next;
    if (moved.size) {
      const timer = setTimeout(() => setChanged(new Set()), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.contents, state.tree]);

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
      const at = displayCwd(state.cwd);
      try {
        append(command, await exec(command), at);
      } catch (e) {
        append(command, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at);
      }
    },
    [append, exec, state.cwd],
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
      setRanScript(true);
    } finally {
      setBusy(false);
    }
  }, [script, runOne]);

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

  const disabled = busy || !ready;

  return (
    <div className="sblock">
      <div className="sblock-head">
        <span className="sblock-tag">bash</span>
        {label && <span className="sblock-label">{label}</span>}
        {dir && <span className="sblock-chain">{dir}</span>}
        <span className="sblock-head-sep" />
        <button
          type="button"
          className="sblock-btn"
          onClick={() => {
            setTranscript([]);
            setInput("");
            setHistory([]);
            setRanScript(false);
            promptAt.current = new Map();
            previous.current = new Map();
            void reset();
          }}
          disabled={disabled}
        >
          <RotateCcw size={12} aria-hidden="true" />
          <span>Reset</span>
        </button>
        {script.length > 0 && (
          <button
            type="button"
            className="sblock-run"
            onClick={() => void runScript()}
            disabled={disabled}
            title={script.join("\n")}
          >
            <Play size={12} aria-hidden="true" />
            <span>{busy ? "Running" : ranScript ? "Run again" : "Run"}</span>
          </button>
        )}
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
          prompt={displayCwd(state.cwd)}
          placeholder="ls"
          inlineInput
          onListCompletions={listCompletions}
          promptFor={(entry) => promptAt.current.get(entry.id)}
          placeholderHint={
            <p className="git-terminal-hint">
              {script.length > 0 ? (
                <>
                  Press <strong>Run</strong> for the example, or type your own commands. Try{" "}
                  <code>ls</code>, then <code>cd</code> somewhere.
                </>
              ) : (
                <>
                  A real shell. Try <code>ls</code>, then <code>cd src</code>, then{" "}
                  <code>pwd</code>: it remembers where you are.
                </>
              )}
            </p>
          }
        />
      </div>

      <BashStateStrip state={state} open={open} onToggle={() => setOpen((v) => !v)} changed={changed} />
    </div>
  );
}
