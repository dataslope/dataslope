"use client";

/**
 * A runnable Git block for lesson prose. Structurally `<CodeBlock>` with the
 * editor holding a command script instead of source: same Run button, same
 * output area, plus the state strip.
 *
 * Two rules from the design carry weight here:
 *
 * - **One repo per block by default.** Blocks sharing a `repo` id continue
 *   each other in document order; everything else is isolated, so re-running
 *   block 1 cannot corrupt block 4.
 * - **A reader who runs step 3 first is not an error.** The block says which
 *   step to run first and offers to catch up, replaying the earlier blocks'
 *   commands before its own.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, ExternalLink } from "lucide-react";
import Link from "../Link";
import { useGitSession } from "./gitRuntime";
import { GitTerminal, type TranscriptEntry } from "./GitTerminal";
import { StateStrip } from "./StateStrip";
import { DEFAULT_SCENARIO } from "./scenarios";
import type { FileStatus } from "./protocol";
import "./gitEmbedded.css";

/** Ordered command lists per shared repo id, so a later block can replay the
 *  earlier ones when a reader runs it out of order. */
const chains = new Map<string, string[][]>();

function registerInChain(repo: string | undefined, commands: string[]): number {
  if (!repo) return 0;
  const steps = chains.get(repo) ?? [];
  const existing = steps.findIndex((s) => s.join("\n") === commands.join("\n"));
  if (existing !== -1) return existing;
  steps.push(commands);
  chains.set(repo, steps);
  return steps.length - 1;
}

const fileKey = (f: FileStatus) => `${f.path}:${f.head}${f.workdir}${f.stage}`;

export interface GitBlockProps {
  /** Newline-separated commands. Editable before running. */
  commands: string;
  /** Starting repository, by scenario id. */
  scenario?: string;
  /** Share a repository with other blocks carrying the same id. */
  repo?: string;
  /** Open the state panels on mount, for blocks where the state is the lesson. */
  expandState?: boolean;
  /** Caption in the block header. */
  label?: string;
  /** Hide the link out to the full playground. */
  hideOpenInPlayground?: boolean;
}

export default function GitBlock({
  commands,
  scenario = DEFAULT_SCENARIO,
  repo,
  expandState = false,
  label,
  hideOpenInPlayground = false,
}: GitBlockProps) {
  const script = useMemo(
    () => commands.split("\n").map((l) => l.trim()).filter(Boolean),
    [commands],
  );
  const stepIndex = useMemo(() => registerInChain(repo, script), [repo, script]);

  const { state, ready, error, exec, reset } = useGitSession(scenario, repo);
  const [draft, setDraft] = useState(script.join("\n"));
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [open, setOpen] = useState(expandState);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const entryId = useRef(0);
  const previous = useRef<Map<string, string>>(new Map());
  const ranSteps = useRef<Set<number>>(new Set());

  useEffect(() => {
    const next = new Map(state.files.map((f) => [f.path, fileKey(f)]));
    const moved = new Set<string>();
    for (const [path, key] of next) {
      if (previous.current.get(path) !== key) moved.add(path);
    }
    if (previous.current.size > 0) setChanged(moved);
    previous.current = next;
    if (moved.size) {
      const timer = setTimeout(() => setChanged(new Set()), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.files]);

  const runLines = useCallback(
    async (lines: string[]) => {
      for (const command of lines) {
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
    [exec],
  );

  const run = useCallback(async () => {
    setBusy(true);
    setTranscript([]);
    try {
      await runLines(draft.split("\n").map((l) => l.trim()).filter(Boolean));
      setHasRun(true);
      if (repo) ranSteps.current.add(stepIndex);
    } catch (e) {
      setTranscript((t) => [
        ...t,
        { id: (entryId.current += 1), command: "", stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 },
      ]);
    } finally {
      setBusy(false);
    }
  }, [draft, repo, runLines, stepIndex]);

  /** Replay every earlier block in this chain, then run this one. */
  const catchUp = useCallback(async () => {
    if (!repo) return;
    setBusy(true);
    setTranscript([]);
    try {
      await reset();
      const steps = chains.get(repo) ?? [];
      for (let i = 0; i < stepIndex; i += 1) await runLines(steps[i] ?? []);
      await runLines(draft.split("\n").map((l) => l.trim()).filter(Boolean));
      for (let i = 0; i <= stepIndex; i += 1) ranSteps.current.add(i);
      setHasRun(true);
    } finally {
      setBusy(false);
    }
  }, [repo, reset, runLines, stepIndex, draft]);

  // A later step in a shared chain, run before its predecessors.
  const needsCatchUp =
    Boolean(repo) && stepIndex > 0 && !hasRun && state.commits.length === 0 && !state.initialized;

  const disabled = busy || !ready;

  return (
    <div className="gitblock">
      <div className="gitblock-head">
        <span className="gitblock-tag">git</span>
        {label && <span className="gitblock-label">{label}</span>}
        {repo && <span className="gitblock-chain">{`${repo} · step ${stepIndex + 1}`}</span>}
        <span className="gitblock-head-sep" />
        {!hideOpenInPlayground && (
          <Link
            href="/playground/git"
            className="gitblock-open"
            title="Open the full Git playground"
          >
            <ExternalLink size={12} aria-hidden="true" />
            <span>Playground</span>
          </Link>
        )}
        <button
          type="button"
          className="gitblock-btn"
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
        <button type="button" className="gitblock-run" onClick={() => void run()} disabled={disabled}>
          <Play size={12} aria-hidden="true" />
          <span>{busy ? "Running" : "Run"}</span>
        </button>
      </div>

      <textarea
        className="gitblock-script"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        rows={Math.min(8, Math.max(1, draft.split("\n").length))}
        aria-label="Git commands to run"
        disabled={busy}
      />

      {needsCatchUp && (
        <div className="gitblock-notice">
          <span>
            This continues from step {stepIndex} of <code>{repo}</code>.
          </span>
          <button type="button" className="gitblock-btn" onClick={() => void catchUp()} disabled={disabled}>
            Catch me up
          </button>
        </div>
      )}

      {error && <div className="gitblock-notice error">{error}</div>}

      {(transcript.length > 0 || busy) && (
        <div className="gitblock-output">
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

      <StateStrip state={state} open={open} onToggle={() => setOpen((v) => !v)} changed={changed} />
    </div>
  );
}
