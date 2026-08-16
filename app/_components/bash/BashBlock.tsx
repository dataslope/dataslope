"use client";

/**
 * A runnable shell block for lesson prose: a command script, its transcript,
 * and a strip showing what the working directory now holds.
 *
 * The same two rules as `<GitBlock>` apply. Blocks are isolated unless they
 * share a `dir` id, so re-running block 1 cannot corrupt block 4; and a reader
 * who runs step 3 first is offered a catch-up rather than an error.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useGitSession } from "../git/gitRuntime";
import { GitTerminal, type TranscriptEntry } from "../git/GitTerminal";
import { BashStateStrip } from "./FileTreePanel";
import { DEFAULT_BASH_SCENARIO } from "./bashScenarios";
import "../shell/embeddedShell.css";
import "./bashPanels.css";

/** Ordered command lists per shared dir id, so a later block can replay the
 *  earlier ones when a reader runs it out of order. */
const chains = new Map<string, string[][]>();

function registerInChain(dir: string | undefined, commands: string[]): number {
  if (!dir) return 0;
  const steps = chains.get(dir) ?? [];
  const existing = steps.findIndex((s) => s.join("\n") === commands.join("\n"));
  if (existing !== -1) return existing;
  steps.push(commands);
  chains.set(dir, steps);
  return steps.length - 1;
}

export interface BashBlockProps {
  /** Newline-separated commands. Editable before running. */
  commands: string;
  /** Starting filesystem, by scenario id. */
  scenario?: string;
  /** Share a working directory with other blocks carrying the same id. */
  dir?: string;
  /** Open the file listing on mount, for blocks where the filesystem is the lesson. */
  expandState?: boolean;
  /** Caption in the block header. */
  label?: string;
  /**
   * How the lines are run.
   *
   * - `"commands"` (default) runs each line as its own command, so the
   *   transcript pairs every line with its own output. Right for a sequence of
   *   independent commands.
   * - `"script"` runs the whole block as one script, so variables and
   *   functions defined on one line are still there on the next. Required for
   *   anything that spans lines or carries state.
   */
  mode?: "commands" | "script";
}

export default function BashBlock({
  commands,
  scenario = DEFAULT_BASH_SCENARIO,
  dir,
  expandState = false,
  label,
  mode = "commands",
}: BashBlockProps) {
  const script = useMemo(
    () => commands.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== ""),
    [commands],
  );
  const stepIndex = useMemo(() => registerInChain(dir, script), [dir, script]);

  const { state, ready, error, exec, reset } = useGitSession(scenario, dir, "bash");
  const [draft, setDraft] = useState(script.join("\n"));
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [open, setOpen] = useState(expandState);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const entryId = useRef(0);
  const previous = useRef<Map<string, string>>(new Map());

  // Flag paths whose contents moved, so a pipeline's actual effect is visible.
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

  const runLines = useCallback(
    async (lines: string[]) => {
      // In script mode the block is one program: a separate exec per line
      // would give each its own shell, so `count=0` on one line and
      // `echo $count` on the next would not see each other.
      const chunks = mode === "script" ? [lines.join("\n")] : lines;
      for (const command of chunks) {
        const result = await exec(command);
        setTranscript((t) => [
          ...t,
          {
            id: (entryId.current += 1),
            command,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        ]);
      }
    },
    [exec, mode],
  );

  const run = useCallback(async () => {
    setBusy(true);
    setTranscript([]);
    try {
      await runLines(draft.split("\n").filter((l) => l.trim() !== ""));
      setHasRun(true);
    } catch (e) {
      setTranscript((t) => [
        ...t,
        { id: (entryId.current += 1), command: "", stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 },
      ]);
    } finally {
      setBusy(false);
    }
  }, [draft, runLines]);

  const catchUp = useCallback(async () => {
    if (!dir) return;
    setBusy(true);
    setTranscript([]);
    try {
      await reset();
      const steps = chains.get(dir) ?? [];
      for (let i = 0; i < stepIndex; i += 1) await runLines(steps[i] ?? []);
      await runLines(draft.split("\n").filter((l) => l.trim() !== ""));
      setHasRun(true);
    } finally {
      setBusy(false);
    }
  }, [dir, reset, runLines, stepIndex, draft]);

  // A later step in a shared chain, run before its predecessors. The signal is
  // an untouched directory: nothing the earlier steps would have created.
  const needsCatchUp = Boolean(dir) && stepIndex > 0 && !hasRun && transcript.length === 0;

  const disabled = busy || !ready;

  return (
    <div className="sblock">
      <div className="sblock-head">
        <span className="sblock-tag">bash</span>
        {label && <span className="sblock-label">{label}</span>}
        {dir && <span className="sblock-chain">{`${dir} · step ${stepIndex + 1}`}</span>}
        <span className="sblock-head-sep" />
        <button
          type="button"
          className="sblock-btn"
          onClick={() => {
            setTranscript([]);
            setHasRun(false);
            setDraft(script.join("\n"));
            previous.current = new Map();
            void reset();
          }}
          disabled={disabled}
        >
          <RotateCcw size={12} aria-hidden="true" />
          <span>Reset</span>
        </button>
        <button type="button" className="sblock-run" onClick={() => void run()} disabled={disabled}>
          <Play size={12} aria-hidden="true" />
          <span>{busy ? "Running" : "Run"}</span>
        </button>
      </div>

      <textarea
        className="sblock-script"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        rows={Math.min(10, Math.max(1, draft.split("\n").length))}
        aria-label="Shell commands to run"
        disabled={busy}
      />

      {needsCatchUp && (
        <div className="sblock-notice">
          <span>
            This continues from step {stepIndex} of <code>{dir}</code>.
          </span>
          <button type="button" className="sblock-btn" onClick={() => void catchUp()} disabled={disabled}>
            Catch me up
          </button>
        </div>
      )}

      {error && <div className="sblock-notice error">{error}</div>}

      {(transcript.length > 0 || busy) && (
        <div className="sblock-output">
          <GitTerminal
            transcript={transcript}
            value=""
            onValueChange={() => {}}
            onSubmit={() => {}}
            history={[]}
            busy={busy}
            completions={[]}
            readOnly
          />
        </div>
      )}

      <BashStateStrip state={state} open={open} onToggle={() => setOpen((v) => !v)} changed={changed} />
    </div>
  );
}
