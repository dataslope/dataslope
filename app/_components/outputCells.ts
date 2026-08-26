/**
 * How a run's output cells accumulate, shared by `<CodeBlock>` and
 * `<ChallengeCard>` so the two lesson surfaces cannot disagree about what a
 * program printed. `Playground.tsx` has its own copy of this shape because
 * it addresses cells by index into a sparse array it re-renders from; the
 * rule below is the same one.
 */
import type { EmitOutput, OutputCell } from "./types";

/** The extras `EmitOutput` supplies alongside the cell. */
export interface AppendOptions {
  /** Cell address from an addressing runtime, `undefined` from the rest. */
  seq?: Parameters<EmitOutput>[1];
  /** True when this write continues the cell the runtime just wrote. */
  append?: Parameters<EmitOutput>[2];
  /** Formatted run time, stamped on whichever cell ends up holding the text. */
  elapsed: string;
  /** Id source for a genuinely new cell. */
  nextId: () => number;
}

/**
 * Fold one emitted cell into the list so far, returning a new list.
 *
 * Two runtimes, two rules, and picking the wrong one corrupts the output.
 *
 * A runtime that passes `seq` is *addressing* its output, and `append` means
 * "this continues the cell you already have" — so the pieces join with
 * nothing. C is the case that proves it matters: one
 * `printf("You are %d years old.\n", age)` reaches the WASI shim as two
 * `fd_write` calls, `"You are 30"` and `" years old.\n"`, and a newline
 * invented between them chops a single line of output in half. On a
 * `<ChallengeCard>` that is not cosmetic, because these cells become the
 * stdout that `stdoutEquals` grades: a correct C answer failed its own test.
 *
 * Everything else (Python, R, the JS runners) emits one cell per statement,
 * where a newline between consecutive stdout cells is exactly right — it is
 * the line `console.log` implies, and without it a loop of logs runs together
 * into one smear.
 */
export function appendOutputCell(
  prev: readonly OutputCell[],
  cell: Parameters<EmitOutput>[0],
  { seq, append, elapsed, nextId }: AppendOptions,
): OutputCell[] {
  const last = prev[prev.length - 1];

  if (seq !== undefined) {
    if (append && last && last.type === cell.type) {
      const joined: OutputCell = {
        ...last,
        content: last.content + cell.content,
        elapsed,
      };
      return [...prev.slice(0, -1), joined];
    }
    return [...prev, { id: nextId(), elapsed, ...cell }];
  }

  if (cell.type === "stdout" && last && last.type === "stdout") {
    const merged: OutputCell = {
      ...last,
      content: last.content + "\n" + cell.content,
      elapsed,
    };
    return [...prev.slice(0, -1), merged];
  }
  return [...prev, { id: nextId(), elapsed, ...cell }];
}
