"use client";

/**
 * A graded shell challenge: a terminal, a live objective checklist, and the
 * working directory beside it.
 *
 * The difference from `<GitChallengeCard>` is what counts as the answer. A Git
 * objective reads the repository; a shell objective often reads the
 * *transcript*, because for "show the three largest files" the printed output
 * is the deliverable. `BashExpect` covers both, and the card re-evaluates
 * after every command so objectives tick as the learner works.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Lightbulb, CheckCircle2 } from "lucide-react";
import { TestResultsRail, renderInstructions, type TestRailEntry } from "../challengeShared";
import { useGitSession } from "../git/gitRuntime";
import { GitTerminal, type TranscriptEntry } from "../git/GitTerminal";
import { BashStateStrip } from "./FileTreePanel";
import { DEFAULT_BASH_SCENARIO } from "./bashScenarios";
import {
  bashExpectSummary,
  explainBashExpect,
  satisfiesBashExpect,
  type BashObjective,
} from "./bashExpect";
import "../shell/embeddedShell.css";
import "./bashPanels.css";

export interface BashChallengeCardProps {
  title: string;
  instructions: string;
  objectives: BashObjective[];
  scenario?: string;
  /** Commands that solve it, revealed by Show solution. */
  solution?: string;
  hint?: string;
  /** Open the file listing on mount. On a challenge the filesystem is part of
   *  the feedback, so this defaults on. */
  expandState?: boolean;
}

export default function BashChallengeCard({
  title,
  instructions,
  objectives,
  scenario = DEFAULT_BASH_SCENARIO,
  solution,
  hint,
  expandState = true,
}: BashChallengeCardProps) {
  const { state, ready, error, exec, reset } = useGitSession(scenario, undefined, "bash");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(expandState);
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const entryId = useRef(0);
  const previous = useRef<Map<string, string>>(new Map());

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

  const context = useMemo(
    () => ({
      state,
      transcript: transcript.map((t) => ({
        command: t.command,
        stdout: t.stdout,
        stderr: t.stderr,
        exitCode: t.exitCode,
      })),
    }),
    [state, transcript],
  );

  const results = useMemo(
    () =>
      objectives.map((objective) => ({
        objective,
        passed: satisfiesBashExpect(objective.expect, context),
        detail: explainBashExpect(objective.expect, context),
      })),
    [objectives, context],
  );
  const solved = results.length > 0 && results.every((r) => r.passed);

  const rail: TestRailEntry[] = results.map((r) => ({
    id: r.objective.id,
    name: r.objective.name,
    description: r.objective.description ?? null,
    // Before Check, an unmet objective reads as "not yet" rather than "wrong".
    state: r.passed ? "pass" : checked ? "fail" : "pending",
    detail: r.passed ? null : r.detail,
    code: bashExpectSummary(r.objective.expect),
  }));

  const run = useCallback(
    async (command: string) => {
      if (command === "clear") {
        setTranscript([]);
        setInput("");
        return;
      }
      setBusy(true);
      setInput("");
      setHistory((h) => [...h, command]);
      try {
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
      } catch (e) {
        setTranscript((t) => [
          ...t,
          { id: (entryId.current += 1), command, stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [exec],
  );

  const passCount = results.filter((r) => r.passed).length;

  return (
    <div className={solved ? "scard solved" : "scard"}>
      <div className="scard-head">
        <span className="scard-badge">Shell challenge</span>
        <h3 className="scard-title">{title}</h3>
        <span className="sblock-head-sep" />
        <span className={solved ? "scard-progress solved" : "scard-progress"}>
          {solved ? (
            <>
              <CheckCircle2 size={13} aria-hidden="true" /> Solved
            </>
          ) : (
            `${passCount} of ${results.length}`
          )}
        </span>
      </div>

      <div className="scard-body">
        <div className="scard-left">
          <div className="scard-instructions">{renderInstructions(instructions)}</div>

          <div className="scard-terminal">
            <GitTerminal
              transcript={transcript}
              value={input}
              onValueChange={setInput}
              onSubmit={(c) => void run(c)}
              history={history}
              busy={busy || !ready}
              completions={[]}
              placeholderHint={
                <p className="git-terminal-hint">
                  Type the commands that solve this. Objectives tick as soon as the output or the
                  files satisfy them.
                </p>
              }
            />
          </div>

          {error && <div className="sblock-notice error">{error}</div>}

          <div className="scard-actions">
            <button
              type="button"
              className="sblock-btn"
              onClick={() => {
                setTranscript([]);
                setInput("");
                setHistory([]);
                setChecked(false);
                setShowSolution(false);
                previous.current = new Map();
                void reset();
              }}
              disabled={busy}
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>Reset</span>
            </button>
            {hint && (
              <button type="button" className="sblock-btn" onClick={() => setShowHint((v) => !v)}>
                <Lightbulb size={12} aria-hidden="true" />
                <span>{showHint ? "Hide hint" : "Hint"}</span>
              </button>
            )}
            {solution && (
              <button type="button" className="sblock-btn" onClick={() => setShowSolution((v) => !v)}>
                {showSolution ? "Hide solution" : "Show solution"}
              </button>
            )}
            <button
              type="button"
              className="sblock-run"
              onClick={() => setChecked(true)}
              disabled={busy || !ready}
            >
              Check answer
            </button>
          </div>

          {showHint && hint && <p className="scard-hint">{hint}</p>}
          {showSolution && solution && <pre className="scard-solution">{solution.trim()}</pre>}
          {checked && !solved && (
            <p className="scard-verdict">
              Not there yet. The unticked objectives above say what is still missing.
            </p>
          )}
        </div>

        <div className="scard-right">
          <TestResultsRail tests={rail} codeLabel="Checks" />
          <BashStateStrip
            state={state}
            open={open}
            onToggle={() => setOpen((v) => !v)}
            changed={changed}
          />
        </div>
      </div>
    </div>
  );
}
