"use client";

/**
 * Runs and grades a challenge, in the browser.
 *
 * One hook over two very different engines, so the workspace never branches
 * on which kind of challenge it is showing:
 *
 *  - **SQL** boots an in-browser engine through `useSqlEngineBoot` (the same
 *    lifecycle `<SqlChallengeCard>` uses), executes the learner's statements,
 *    and grades the last result set with `evaluateSqlTest`.
 *  - **Code** boots a WASM language runtime through `getSharedRuntime`,
 *    appends the native test harness from `challengeHarness`, and grades the
 *    parsed sentinel lines plus any stdout expectations.
 *
 * Nothing is sent anywhere. There is no execution backend and no grading
 * endpoint; a challenge that passes here passed on the learner's machine.
 *
 * Run vs Submit: Run executes only what the learner wrote and shows the
 * output. Submit additionally appends the harness (code) or runs the
 * reference solution for comparison (SQL), then evaluates every check.
 */

import { useCallback, useRef, useState } from "react";
import {
  buildHarness,
  evaluateStdoutExpect,
  isNativeTest,
  isStdoutTest,
  parseHarnessOutput,
  type ChallengeTest as CodeTest,
  type ParsedTestResult,
} from "@/app/_components/challengeHarness";
import {
  evaluateSqlTest,
  type SqlChallengeTest,
  type SqlEngineLike,
  type SqlResult,
} from "@/app/_components/sqlChallengeHarness";
import { useSqlEngineBoot } from "@/app/_components/SqlChallengeCard";
import { appendOutputCell } from "@/app/_components/outputCells";
import { getAdapterById } from "@/app/_components/runtime/adapters";
import {
  getSharedRuntime,
  isRuntimeReady,
  RuntimeScope,
} from "@/app/_components/runtimeRegistry";
import type { LanguageRuntime, OutputCell } from "@/app/_components/types";
import type {
  Challenge,
  ChallengeLanguage,
  ChallengeTask,
  OutputPanel,
  TestOutcome,
} from "@/lib/challenges/types";

/** How many result rows the Output tab renders before truncating. */
const MAX_OUTPUT_ROWS = 200;

export type RunMode = "run" | "submit";

export interface RunOutcome {
  mode: RunMode;
  output: OutputPanel;
  /** Graded checks. Empty for a plain Run. */
  tests: TestOutcome[];
  /** Mono line for the editor header, e.g. "sqlite · 0.42s · 8 rows". */
  meta: string;
  /** True when every check passed. Always false for a plain Run. */
  accepted: boolean;
  /** Wall-clock ms the run took. */
  elapsedMs: number;
}

/** Progress while a runtime downloads and boots, for the pane's notice. */
export interface RunnerBootState {
  message: string;
  /** True on a cold boot, when a WASM toolchain is still downloading. */
  cold: boolean;
}

function formatElapsed(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

/** Render a SQL value the way the result grid does. */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Uint8Array) return `<${v.byteLength} bytes>`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** The last statement that actually returned columns. */
function lastResultSet(results: SqlResult[]): SqlResult | null {
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]?.columns.length) return results[i];
  }
  return null;
}

function sqlOutputPanel(result: SqlResult | null): OutputPanel {
  if (!result) {
    return {
      kind: "stdio",
      stdout: "Statement completed with no result set.",
      footer: ["ok"],
    };
  }
  const shown = result.values.slice(0, MAX_OUTPUT_ROWS);
  return {
    kind: "table",
    columns: result.columns.map((c) => ({ key: c, label: c })),
    rows: shown.map((row) => {
      const out: Record<string, string> = {};
      result.columns.forEach((c, i) => {
        out[c] = cellText(row[i]);
      });
      return out;
    }),
    footer:
      result.values.length > shown.length
        ? `Showing ${shown.length} of ${result.values.length} rows`
        : `${result.values.length} row${result.values.length === 1 ? "" : "s"}`,
  };
}

export function useChallengeRunner(challenge: Challenge) {
  const spec = challenge.runtime;
  const isSql = spec.kind === "sql";

  const [busy, setBusy] = useState<RunMode | null>(null);
  const [boot, setBoot] = useState<RunnerBootState | null>(null);
  // Only the newest run may write results; a second click supersedes the first.
  const seqRef = useRef(0);
  // Keyed by adapter id: a challenge offering Python and JavaScript must not
  // hand the JavaScript runtime code that Python just wrote.
  const codeRuntimes = useRef(new Map<string, LanguageRuntime>());

  // Hooks are unconditional, so a code challenge instantiates this too — it
  // simply never calls `ensureEngine`, and nothing boots.
  const sql = useSqlEngineBoot({
    dialect: isSql ? spec.dialect : "sqlite",
    initSql: isSql ? spec.initSql : undefined,
  });
  const { ensureEngine, engineLabel, resetEngine, destroyEngine } = sql;

  // ─── SQL ───────────────────────────────────────────────────────────

  const executeSql = useCallback(
    async (code: string, mode: RunMode, task: ChallengeTask): Promise<RunOutcome> => {
      const engine: SqlEngineLike = await ensureEngine();
      const started = performance.now();
      const results = await engine.exec(code);
      const elapsedMs = performance.now() - started;
      const finalResult = lastResultSet(results);

      let tests: TestOutcome[] = [];
      if (mode === "submit") {
        // The reference solution runs too, so tests that compare result sets
        // have something to compare against. Every pilot challenge grades a
        // SELECT, so this cannot disturb what the learner just ran.
        let solutionResult: SqlResult | null = null;
        try {
          solutionResult = lastResultSet(await engine.exec(task.solutionCode));
        } catch {
          // A solution that cannot run is an authoring bug, not a learner
          // error; tests that need it will fail and say so.
        }
        const specs = task.tests as SqlChallengeTest[];
        tests = await Promise.all(
          specs.map(async (t) => {
            const { pass, detail } = await evaluateSqlTest(t, {
              engine,
              finalResult,
              solutionResult,
            });
            return {
              name: t.name,
              detail: t.description ?? "",
              got: pass ? undefined : (detail ?? undefined),
              pass,
            };
          }),
        );
      }

      const rows = finalResult?.values.length ?? 0;
      return {
        mode,
        output: sqlOutputPanel(finalResult),
        tests,
        meta: `${engineLabel.toLowerCase()} · ${formatElapsed(elapsedMs)} · ${rows} row${rows === 1 ? "" : "s"}`,
        accepted: tests.length > 0 && tests.every((t) => t.pass),
        elapsedMs,
      };
    },
    [ensureEngine, engineLabel],
  );

  // ─── Code ──────────────────────────────────────────────────────────

  const executeCode = useCallback(
    async (
      code: string,
      mode: RunMode,
      task: ChallengeTask,
      lang: ChallengeLanguage,
    ): Promise<RunOutcome> => {
      // The picked language is the adapter: a challenge offering Python and
      // JavaScript boots only the one on screen.
      const adapterId = lang.id;
      const adapter = getAdapterById(adapterId);
      if (!adapter) throw new Error(`Unknown runtime "${adapterId}".`);

      let runtime = codeRuntimes.current.get(adapterId);
      if (!runtime) {
        setBoot({
          message: "Starting the runtime…",
          cold: !isRuntimeReady(RuntimeScope.Fumadocs, adapter.id),
        });
        runtime = await getSharedRuntime(
          RuntimeScope.Fumadocs,
          adapter,
          (message) => setBoot((b) => (b ? { ...b, message } : b)),
        );
        codeRuntimes.current.set(adapterId, runtime);
        setBoot(null);
      }

      // Submit appends the native harness; Run executes exactly what the
      // learner wrote, so the Output tab shows their own prints only.
      const specs = task.tests as CodeTest[];
      const harness = mode === "submit" ? buildHarness(adapterId, specs) : "";
      const combined = harness ? `${code}\n${harness}` : code;

      // `appendOutputCell` owns the append/seq rule. Getting it wrong splits
      // one printed line across two cells, which then fails `stdoutEquals`.
      let cells: OutputCell[] = [];
      let nextId = 0;
      const started = performance.now();
      await runtime.run(combined, (cell, seq, append) => {
        cells = appendOutputCell(cells, cell, {
          seq,
          append,
          elapsed: "",
          nextId: () => nextId++,
        });
      });
      const elapsedMs = performance.now() - started;

      // Split harness sentinel lines out of stdout so the learner never sees
      // them, and keep stderr for the stdout-based expectations.
      const parsed: ParsedTestResult[] = [];
      let stdout = "";
      let stderr = "";
      for (const cell of cells) {
        if (cell.type === "stderr") {
          stderr += (stderr ? "\n" : "") + cell.content;
          continue;
        }
        if (cell.type !== "stdout") continue;
        const { clean, results } = parseHarnessOutput(cell.content);
        parsed.push(...results);
        if (clean.length > 0) stdout += (stdout ? "\n" : "") + clean;
      }

      let tests: TestOutcome[] = [];
      if (mode === "submit") {
        for (const t of specs) {
          if (isStdoutTest(t)) parsed.push(evaluateStdoutExpect(t, stdout, stderr));
        }
        const byId = new Map(parsed.map((r) => [r.id, r]));
        tests = specs.map((t) => {
          const r = byId.get(t.id);
          return {
            name: t.name,
            detail: t.description ?? "",
            got: r?.pass
              ? undefined
              : (r?.detail ??
                (isNativeTest(t)
                  ? "This check produced no result. The program may have errored before reaching it."
                  : "This check did not run.")),
            pass: r?.pass ?? false,
          };
        });
      }

      // A challenge starter defines a function and calls nothing, so Run on a
      // fresh buffer produces nothing and reads as a broken button. Say what
      // happened and what the two buttons are actually for.
      const emptyRunHint =
        mode === "run"
          ? "(no output)\n\nYour code ran, but nothing printed. The starter defines a function without calling it.\nAdd a call to see a value, or press Submit to run the checks."
          : "(no output)";

      return {
        mode,
        output: {
          kind: "stdio",
          stdout: stdout || emptyRunHint,
          stderr: stderr || undefined,
          footer: [stderr ? "exited with errors" : "exit 0", formatElapsed(elapsedMs)],
        },
        tests,
        meta: `${lang.label.toLowerCase()} · ${formatElapsed(elapsedMs)}`,
        accepted: tests.length > 0 && tests.every((t) => t.pass),
        elapsedMs,
      };
    },
    [],
  );

  // ─── Public surface ────────────────────────────────────────────────

  const execute = useCallback(
    async (
      code: string,
      mode: RunMode,
      task: ChallengeTask,
      lang: ChallengeLanguage,
    ): Promise<RunOutcome> => {
      const mine = ++seqRef.current;
      setBusy(mode);
      try {
        const outcome = isSql
          ? await executeSql(code, mode, task)
          : await executeCode(code, mode, task, lang);
        // A newer run started while this one was in flight: drop this result
        // rather than letting it overwrite the newer one.
        if (seqRef.current !== mine) return { ...outcome, mode };
        return outcome;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          mode,
          output: { kind: "error", message },
          tests: [],
          meta: "error",
          accepted: false,
          elapsedMs: 0,
        };
      } finally {
        if (seqRef.current === mine) {
          setBusy(null);
          setBoot(null);
        }
      }
    },
    [executeCode, executeSql, isSql],
  );

  /** Throw away the engine so the next run re-seeds a clean database. */
  const reset = useCallback(() => {
    if (isSql) resetEngine();
  }, [isSql, resetEngine]);

  /** Free WASM workers on unmount. */
  const dispose = useCallback(() => {
    if (isSql) destroyEngine();
    codeRuntimes.current.clear();
  }, [isSql, destroyEngine]);

  return {
    execute,
    reset,
    dispose,
    busy,
    /** Boot progress: the SQL hook's own state, or the code runtime's. */
    boot: isSql
      ? sql.bootState
        ? { message: sql.bootState.message, cold: sql.bootState.cold }
        : null
      : boot,
    engineLabel: isSql ? engineLabel : undefined,
  };
}
