"use client";

/**
 * A graded Git challenge. Keeps the existing card grammar (header badge,
 * instructions, test rail, Show Solution, Reset) with two changes the design
 * calls for:
 *
 * - **The tall element is a terminal, not a code editor.** The transcript is
 *   the work product, so the learner types real commands.
 * - **The rail is live.** Repo state is cheap to read after every command, so
 *   each objective flips the instant the repository satisfies it and the
 *   learner sees *which command* did it. No other card in the codebase can do
 *   this; Check Answer stays for the finality moment.
 *
 * The command palette is deliberately absent: grading measures composition,
 * so a card should not hand over the command.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Lightbulb, CheckCircle2 } from "lucide-react";
import { TestResultsRail, renderInstructions, type TestRailEntry } from "../challengeShared";
import { useGitSession } from "./gitRuntime";
import { GitTerminal, type TranscriptEntry } from "./GitTerminal";
import { StateStrip } from "./StateStrip";
import { DEFAULT_SCENARIO } from "./scenarios";
import {
  explainGitExpect,
  gitExpectSummary,
  satisfiesGitExpect,
  type GitObjective,
} from "./gitExpect";
import type { FileStatus } from "./protocol";
import "../shell/embeddedShell.css";

const fileKey = (f: FileStatus) => `${f.path}:${f.head}${f.workdir}${f.stage}`;

export interface GitChallengeCardProps {
  title: string;
  instructions: string;
  objectives: GitObjective[];
  scenario?: string;
  /** Commands that solve it, revealed by Show Solution. */
  solution?: string;
  hint?: string;
  /** Open the state panels on mount. Defaults on: on a challenge the state is
   *  the feedback channel (the inverse of a demo block). */
  expandState?: boolean;
}

export default function GitChallengeCard({
  title,
  instructions,
  objectives,
  scenario = DEFAULT_SCENARIO,
  solution,
  hint,
  expandState = true,
}: GitChallengeCardProps) {
  const { state, ready, error, exec, reset } = useGitSession(scenario);
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

  // The live evaluation: every objective, re-read after every command.
  const results = useMemo(
    () =>
      objectives.map((objective) => ({
        objective,
        passed: satisfiesGitExpect(objective.expect, state),
        detail: explainGitExpect(objective.expect, state),
      })),
    [objectives, state],
  );
  const solved = results.length > 0 && results.every((r) => r.passed);

  const rail: TestRailEntry[] = results.map((r) => ({
    id: r.objective.id,
    name: r.objective.name,
    description: r.objective.description ?? null,
    // Before Check, a failing objective reads as "not yet" rather than
    // "wrong": nothing has been submitted.
    state: r.passed ? "pass" : checked ? "fail" : "pending",
    detail: r.passed ? null : r.detail,
    code: gitExpectSummary(r.objective.expect),
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
    <div className="scard-shell ds-striped-shell">
      <div className={solved ? "scard solved" : "scard"}>
        <div className="scard-head">
          <span className="scard-badge">Git challenge</span>
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
                inlineInput
                placeholderHint={
                  <p className="git-terminal-hint">
                    Type the commands that solve this. Objectives tick as soon as the repository
                    satisfies them.
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
                <button
                  type="button"
                  className="sblock-btn"
                  onClick={() => setShowSolution((v) => !v)}
                >
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
            {showSolution && solution && (
              <pre className="scard-solution">{solution.trim()}</pre>
            )}
            {checked && !solved && (
              <p className="scard-verdict">
                Not there yet. The unticked objectives above say what is still missing.
              </p>
            )}
          </div>

          <div className="scard-right">
            <TestResultsRail tests={rail} codeLabel="Checks" />
            <StateStrip
              state={state}
              open={open}
              onToggle={() => setOpen((v) => !v)}
              changed={changed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
