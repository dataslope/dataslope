// What to tell the reader when one statement of a multi-statement script
// fails.
//
// The three engines treat such a script differently, and none of the
// differences is visible in the engine's own error: SQLite and DuckDB run
// statement by statement, so everything before the failure has already been
// applied and everything after it has not run; Postgres runs the script as
// one transaction, so nothing was applied at all. A bare "relation … does
// not exist" hides which of those just happened, and a reader who assumes
// the wrong one either re-runs inserts that already landed or goes looking
// for a table that was rolled back.
//
// Single-statement scripts are left alone: there the note would be noise.

/** Statements ran one at a time; the ones before `index` (1-based) stuck. */
export function describePartialScriptFailure(
  message: string,
  index: number,
  applied: number,
): string {
  if (index <= 1) return message;
  const ran = applied === 1 ? "1 statement" : `${applied} statements`;
  return `Statement ${index} failed: ${message}\n(${ran} before it already ran; the rest of the script did not.)`;
}

/** The script ran as one transaction and was rolled back. `index` is the
 *  failing statement (1-based) when it could be identified. */
export function describeAtomicScriptFailure(
  message: string,
  index: number | null,
  total: number,
): string {
  if (total <= 1) return message;
  const which = index ? `Statement ${index} of ${total} failed. ` : "";
  return `${message}\n(${which}PostgreSQL ran the script as one transaction, so none of it was applied.)`;
}

/** Whether a script manages its own transaction, in which case "none of it
 *  was applied" may not be true and no claim should be made. */
export function hasExplicitTransactionControl(statements: readonly string[]): boolean {
  return statements.some((statement) =>
    /^\s*(BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION)\b/i.test(
      statement,
    ),
  );
}

/** DuckDB-wasm reports a parse error's `LINE n: ... ^` excerpt twice, once
 *  from the engine and once from its own wrapper. Blank-line-separated
 *  blocks that repeat the one before them are dropped. */
export function dropRepeatedErrorBlocks(message: string): string {
  const kept: string[] = [];
  for (const block of message.split(/\n{2,}/)) {
    if (kept.length > 0 && kept[kept.length - 1].trimEnd() === block.trimEnd()) continue;
    kept.push(block);
  }
  return kept.join("\n\n");
}
