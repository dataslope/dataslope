/**
 * The shared review queue: which generated artefacts an admin wants redone,
 * and the brief to redo each one from.
 *
 * There are two of these queues, one for illustrations and one for charts, and
 * they are the same queue twice: an id, a mark, a note, and a pair of
 * timestamps that turn "redrawn" and "signed off" into a round trip. Rather
 * than keep two copies of that logic, both wrappers
 * (`lib/illustrations/regenMarks.ts`, `lib/charts/regenMarks.ts`) bind this
 * module to their own table.
 *
 * Storage is D1 **`dataslope-illustrations`** through the `ILLUSTRATIONS_DB`
 * binding. Despite the name, that database is *authoring and review state*
 * rather than illustration state — deliberately separate from
 * `dataslope-auth`, so the whole thing can be read, dumped, or wiped by a
 * coding agent without touching accounts or sessions. A second review queue
 * belongs in it for exactly that reason.
 *
 * Table names come from this module's own constants, never from a caller's
 * string, because they are interpolated into SQL. D1 cannot bind an
 * identifier, so the only safe rule is that the set of tables is closed and
 * lives here.
 */
import type { D1Database } from "@cloudflare/workers-types";

/** Longest note stored. A note is the brief for a prompt or spec written from
 *  scratch, not the replacement itself, so a sentence is always enough and the
 *  cap keeps a whole queue one cheap read. */
export const MAX_NOTE_LENGTH = 500;

/** The review tables, as a closed set. `queueTable()` is the only way to reach
 *  a name, so no caller-supplied string ever reaches the SQL. */
export const QUEUE_TABLES = {
  illustrations: "illustration_regen_marks",
  charts: "chart_regen_marks",
} as const;

export type QueueName = keyof typeof QUEUE_TABLES;

function queueTable(queue: QueueName): string {
  const table = QUEUE_TABLES[queue];
  // Defensive: a queue name that isn't in the map would otherwise interpolate
  // `undefined` into the statement and fail with a confusing syntax error.
  if (!table) throw new Error(`Unknown review queue: ${String(queue)}`);
  return table;
}

/** One row of a queue, as an API and its gallery exchange it. */
export interface RegenMark {
  /** The artefact's id: an illustration prompt id, or a chart slug. */
  promptId: string;
  /** Whether this artefact is currently queued to be redone. */
  marked: boolean;
  /** The brief for the redo, "" when none was given. */
  note: string;
  /** ISO-8601 UTC of the last change to this row. */
  updatedAt: string;
  /** ISO-8601 UTC stamped when the artefact was last redone, null if never. */
  regeneratedAt: string | null;
  /** ISO-8601 UTC stamped when a redo was last signed off, null if never. */
  approvedAt: string | null;
}

interface MarkRow {
  prompt_id: string;
  marked: number;
  note: string | null;
  updated_at: string;
  regenerated_at: string | null;
  approved_at: string | null;
}

function toMark(row: MarkRow): RegenMark {
  return {
    promptId: row.prompt_id,
    marked: row.marked === 1,
    note: row.note ?? "",
    updatedAt: row.updated_at,
    regeneratedAt: row.regenerated_at,
    approvedAt: row.approved_at,
  };
}

/**
 * Whether this artefact has been redone since anyone last signed it off, so
 * the gallery should surface it for a look.
 *
 * Comparing the timestamps (rather than treating approval as a flag) is what
 * makes a *second* redo of an already-approved artefact come back: the fresh
 * `regeneratedAt` overtakes the stale `approvedAt`.
 */
export function isAwaitingApproval(mark: RegenMark): boolean {
  if (!mark.regeneratedAt) return false;
  return !mark.approvedAt || mark.approvedAt < mark.regeneratedAt;
}

/** Clean a note as typed: control characters (newlines included) collapse to a
 *  space, then trim and cap. A note is one line of guidance read by whoever
 *  does the redo, so it never needs to carry line structure. */
export function normalizeNote(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    // C0/C1 control characters (newlines and tabs included) become a space.
    out += code < 0x20 || (code >= 0x7f && code <= 0x9f) ? " " : ch;
  }
  return out.replace(/ {2,}/g, " ").trim().slice(0, MAX_NOTE_LENGTH);
}

/**
 * Every row in a queue, marked ones first and oldest mark first within each
 * group, which is the order a regeneration run should work through them.
 *
 * Cleared rows come back too: their note is the record of what was asked for
 * last time, and the gallery shows it in the input rather than losing it.
 */
export async function listRegenMarks(
  db: D1Database,
  queue: QueueName,
): Promise<RegenMark[]> {
  const { results } = await db
    .prepare(
      `SELECT prompt_id, marked, note, updated_at, regenerated_at, approved_at
         FROM ${queueTable(queue)}
        ORDER BY marked DESC, updated_at ASC`,
    )
    .all<MarkRow>();
  return (results ?? []).map(toMark);
}

/** One row by id, or null when the artefact has never been marked. */
export async function readMark(
  db: D1Database,
  queue: QueueName,
  promptId: string,
): Promise<RegenMark | null> {
  const row = await db
    .prepare(
      `SELECT prompt_id, marked, note, updated_at, regenerated_at, approved_at
         FROM ${queueTable(queue)} WHERE prompt_id = ?`,
    )
    .bind(promptId)
    .first<MarkRow>();
  return row ? toMark(row) : null;
}

/**
 * Set (or clear) the mark on one artefact, keeping the note either way.
 *
 * Upsert rather than insert-or-delete: unmarking something should not throw
 * away the note written about it, so the next review round starts from what
 * was already observed.
 *
 * The note is optional and stays empty when nothing is typed. Marking used to
 * substitute a canned brief for a blank note, which made the common case (flag
 * it, look at it later) write a paragraph nobody had asked for and then read
 * back as if someone had. An empty note now means what it says: flagged, no
 * reason given.
 */
export async function upsertRegenMark(
  db: D1Database,
  queue: QueueName,
  input: {
    promptId: string;
    marked: boolean;
    note: string;
    markedBy?: string | null;
  },
): Promise<RegenMark> {
  const now = new Date().toISOString();
  const note = normalizeNote(input.note);
  await db
    .prepare(
      `INSERT INTO ${queueTable(queue)}
         (prompt_id, marked, note, marked_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(prompt_id) DO UPDATE SET
         marked     = excluded.marked,
         note       = excluded.note,
         marked_by  = excluded.marked_by,
         updated_at = excluded.updated_at`,
    )
    .bind(input.promptId, input.marked ? 1 : 0, note, input.markedBy ?? null, now, now)
    .run();

  const row = await readMark(db, queue, input.promptId);

  // The read-back can only be null if the row vanished between the two
  // statements; fall back to what was just written rather than throwing.
  return (
    row ?? {
      promptId: input.promptId,
      marked: input.marked,
      note,
      updatedAt: now,
      regeneratedAt: null,
      approvedAt: null,
    }
  );
}

/**
 * Sign off a redo: stamp `approved_at` so the artefact stops showing as
 * "regenerated, waiting to be looked at" and its card goes back to normal.
 *
 * A no-op on something that was never regenerated (nothing to approve), which
 * is why this returns the row rather than assuming a state change. Approval
 * deliberately does not touch `marked`: an admin who wants another pass marks
 * it again, and that mark outranks the approval visually.
 */
export async function approveRegenMark(
  db: D1Database,
  queue: QueueName,
  input: { promptId: string; approvedBy?: string | null },
): Promise<RegenMark | null> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE ${queueTable(queue)}
          SET approved_at = ?, approved_by = ?, updated_at = ?
        WHERE prompt_id = ? AND regenerated_at IS NOT NULL`,
    )
    .bind(now, input.approvedBy ?? null, now, input.promptId)
    .run();
  return readMark(db, queue, input.promptId);
}
