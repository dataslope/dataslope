/**
 * The shared review queue: which generated artefacts an admin wants redone,
 * and the brief for each. Two queues (illustrations, charts) bind this module
 * to their own table via lib/illustrations/regenMarks.ts and
 * lib/charts/regenMarks.ts. Storage is the ILLUSTRATIONS_DB D1 database —
 * authoring/review state, deliberately separate from `dataslope-auth`. Table
 * names come only from this module's constants, never a caller's string: D1
 * cannot bind an identifier, so the set of tables is closed and lives here.
 */
import type { D1Database } from "@cloudflare/workers-types";

/** Longest note stored. A note is a one-sentence brief; the cap keeps a
 *  whole queue one cheap read. */
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
  /** ISO-8601 UTC stamped when someone asked for this artefact to be deleted
   *  from the repository, null when no request is outstanding. */
  deleteRequestedAt: string | null;
  /** Why deletion was asked for, "" when no reason was given. */
  deleteReason: string;
}

interface MarkRow {
  prompt_id: string;
  marked: number;
  note: string | null;
  updated_at: string;
  regenerated_at: string | null;
  approved_at: string | null;
  delete_requested_at: string | null;
  delete_reason: string | null;
}

function toMark(row: MarkRow): RegenMark {
  return {
    promptId: row.prompt_id,
    marked: row.marked === 1,
    note: row.note ?? "",
    updatedAt: row.updated_at,
    regeneratedAt: row.regenerated_at,
    approvedAt: row.approved_at,
    deleteRequestedAt: row.delete_requested_at,
    deleteReason: row.delete_reason ?? "",
  };
}

/**
 * Redone since last sign-off? Comparing timestamps (rather than a flag) is
 * what makes a second redo of an already-approved artefact come back: the
 * fresh `regeneratedAt` overtakes the stale `approvedAt`.
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
 * Every row in a queue, marked ones first and oldest mark first (the order a
 * regeneration run works through them). Cleared rows come back too: their
 * note records what was asked for last time.
 */
export async function listRegenMarks(
  db: D1Database,
  queue: QueueName,
): Promise<RegenMark[]> {
  const { results } = await db
    .prepare(
      `SELECT prompt_id, marked, note, updated_at, regenerated_at, approved_at,
              delete_requested_at, delete_reason
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
      `SELECT prompt_id, marked, note, updated_at, regenerated_at, approved_at,
              delete_requested_at, delete_reason
         FROM ${queueTable(queue)} WHERE prompt_id = ?`,
    )
    .bind(promptId)
    .first<MarkRow>();
  return row ? toMark(row) : null;
}

/**
 * Set (or clear) the mark on one artefact. Upsert rather than
 * insert-or-delete: unmarking must not throw away the note. An empty note
 * means flagged with no reason given — no canned brief is substituted.
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
      deleteRequestedAt: null,
      deleteReason: "",
    }
  );
}

/**
 * Sign off a redo: stamp `approved_at`. A no-op on something never
 * regenerated, hence returning the row rather than assuming a state change.
 * Deliberately does not touch `marked`: a fresh mark outranks the approval.
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

/**
 * Ask for an artefact to be deleted from the repository, or withdraw the ask.
 * The gallery only records the decision — the artefacts live in git, so the
 * deletion itself is a commit made by a person or agent. A separate field
 * from `marked` because the two mean opposite futures and can coexist; the
 * gallery shows the deletion, which supersedes. Upsert, so an artefact with
 * no review history can still be requested.
 */
export async function requestDeletion(
  db: D1Database,
  queue: QueueName,
  input: {
    promptId: string;
    requested: boolean;
    reason: string;
    requestedBy?: string | null;
  },
): Promise<RegenMark> {
  const now = new Date().toISOString();
  const reason = input.requested ? normalizeNote(input.reason) : "";
  const requestedAt = input.requested ? now : null;
  await db
    .prepare(
      `INSERT INTO ${queueTable(queue)}
         (prompt_id, marked, note, created_at, updated_at,
          delete_requested_at, delete_requested_by, delete_reason)
       VALUES (?, 0, '', ?, ?, ?, ?, ?)
       ON CONFLICT(prompt_id) DO UPDATE SET
         delete_requested_at = excluded.delete_requested_at,
         delete_requested_by = excluded.delete_requested_by,
         delete_reason       = excluded.delete_reason,
         updated_at          = excluded.updated_at`,
    )
    .bind(
      input.promptId,
      now,
      now,
      requestedAt,
      input.requested ? (input.requestedBy ?? null) : null,
      reason,
    )
    .run();

  const row = await readMark(db, queue, input.promptId);
  return (
    row ?? {
      promptId: input.promptId,
      marked: false,
      note: "",
      updatedAt: now,
      regeneratedAt: null,
      approvedAt: null,
      deleteRequestedAt: requestedAt,
      deleteReason: reason,
    }
  );
}
