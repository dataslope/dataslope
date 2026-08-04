/**
 * The illustration regeneration queue: which generated images an admin wants
 * redrawn, and the brief to write each replacement prompt from.
 *
 * Storage is D1 database **`dataslope-illustrations`**, table
 * **`illustration_regen_marks`**, reached through the `ILLUSTRATIONS_DB`
 * binding (schema in `migrations-illustrations/0001_…`). It is deliberately a
 * different database from `dataslope-auth`: this is authoring state, so the
 * whole queue can be read, dumped, or wiped by a coding agent without touching
 * accounts or sessions.
 *
 * Marks are written from `/illustration-prompts` (admin-only) via
 * `/api/admin/illustration-prompts`, and read back by whoever regenerates the
 * art. The full workflow is written up in
 * `agent-outputs/20260803-0900-illustration-regeneration-queue.md`.
 *
 * `prompt_id` is the illustration id from `data/illustration-prompts.json`,
 * which is also the file stem (`<id>.webp`, `<id>-cutout.webp`), so a mark
 * points at a prompt, a served file, and an R2 candidate all at once.
 */
import type { D1Database } from "@cloudflare/workers-types";

/** Longest note stored. A note is the brief for a prompt written from scratch
 *  (see the runbook), not the replacement prompt itself, so a sentence is
 *  always enough and the cap keeps the whole queue one cheap read. */
export const MAX_NOTE_LENGTH = 500;

/**
 * Guidance applied when an illustration is marked with no note of its own.
 *
 * Empty was the wrong default. The usual reason to redraw is that the picture
 * came back cluttered — decorative dots strewn over the objects, faint lines
 * webbing them together, speckles in the background — and the fix for that is
 * always the same: keep the scene, lose the debris.
 *
 * It asks for a redraw *from scratch* rather than a simpler illustration,
 * because "simpler" was read as an edit to the old prompt: clauses came off the
 * end of the existing `subject` and the same picture came back with fewer
 * objects in it. The composition is what failed, so the composition is what a
 * redraw has to replace.
 *
 * It no longer says "fewer, larger shapes". That phrasing was read as *flatten*
 * — the redraws it produced traded the house 3D isometric style for flat slabs
 * and discs, which is a different illustration, not a cleaner one. "Simplify"
 * here has only ever meant removing decoration, so the note says that and says
 * to keep the solid isometric rendering while doing it.
 */
export const DEFAULT_REGEN_NOTE =
  "redraw this from scratch as a solid 3D isometric scene built from a few " +
  "large objects, dropping the decorative dots, speckles, and connecting lines " +
  "that cluttered it; simplify by removing decoration, not by flattening it";

/** One row of the queue, as the API and the gallery exchange it. */
export interface RegenMark {
  /** Illustration id (= prompt id = file stem). */
  promptId: string;
  /** Whether this illustration is currently queued for regeneration. */
  marked: boolean;
  /** The brief for the redraw's new prompt, "" when none was given. */
  note: string;
  /** ISO-8601 UTC of the last change to this row. */
  updatedAt: string;
  /** ISO-8601 UTC stamped when the art was last redrawn, null if never. */
  regeneratedAt: string | null;
  /** ISO-8601 UTC stamped when a redraw was last signed off, null if never. */
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
 * Whether this illustration has been redrawn since anyone last signed it off,
 * so the gallery should surface it for a look.
 *
 * Comparing the timestamps (rather than treating approval as a flag) is what
 * makes a *second* redraw of an already-approved illustration come back: the
 * fresh `regeneratedAt` overtakes the stale `approvedAt`.
 */
export function isAwaitingApproval(mark: RegenMark): boolean {
  if (!mark.regeneratedAt) return false;
  return !mark.approvedAt || mark.approvedAt < mark.regeneratedAt;
}

/** Clean a note as typed: control characters (newlines included) collapse to a
 *  space, then trim and cap. A note is one line of guidance read by whoever
 *  writes the next prompt, so it never needs to carry line structure. */
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
 * Every row in the queue, marked ones first and oldest mark first within each
 * group, which is the order a regeneration run should work through them.
 *
 * Cleared rows come back too: their note is the record of what was asked for
 * last time, and the gallery shows it in the input rather than losing it.
 */
export async function listRegenMarks(db: D1Database): Promise<RegenMark[]> {
  const { results } = await db
    .prepare(
      `SELECT prompt_id, marked, note, updated_at, regenerated_at, approved_at
         FROM illustration_regen_marks
        ORDER BY marked DESC, updated_at ASC`,
    )
    .all<MarkRow>();
  return (results ?? []).map(toMark);
}

/**
 * Set (or clear) the mark on one illustration, keeping the note either way.
 *
 * Upsert rather than insert-or-delete: unmarking an image should not throw
 * away the note written about it, so the next review round starts from what
 * was already observed.
 */
export async function upsertRegenMark(
  db: D1Database,
  input: {
    promptId: string;
    marked: boolean;
    note: string;
    markedBy?: string | null;
  },
): Promise<RegenMark> {
  const now = new Date().toISOString();
  // Marking with nothing typed means "the usual problem", so store the usual
  // instruction rather than an empty note. Clearing a mark keeps whatever is
  // there, including nothing.
  const note = normalizeNote(input.note) || (input.marked ? DEFAULT_REGEN_NOTE : "");
  await db
    .prepare(
      `INSERT INTO illustration_regen_marks
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

  const row = await readMark(db, input.promptId);

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

/** One row by id, or null when the illustration has never been marked. */
export async function readMark(
  db: D1Database,
  promptId: string,
): Promise<RegenMark | null> {
  const row = await db
    .prepare(
      `SELECT prompt_id, marked, note, updated_at, regenerated_at, approved_at
         FROM illustration_regen_marks WHERE prompt_id = ?`,
    )
    .bind(promptId)
    .first<MarkRow>();
  return row ? toMark(row) : null;
}

/**
 * Sign off a redraw: stamp `approved_at` so the illustration stops showing as
 * "regenerated, waiting to be looked at" and the card goes back to normal.
 *
 * A no-op on an illustration that was never regenerated (nothing to approve),
 * which is why this returns the row rather than assuming a state change.
 * Approval deliberately does not touch `marked`: an admin who wants another
 * pass marks it again, and that mark outranks the approval visually.
 */
export async function approveRegenMark(
  db: D1Database,
  input: { promptId: string; approvedBy?: string | null },
): Promise<RegenMark | null> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE illustration_regen_marks
          SET approved_at = ?, approved_by = ?, updated_at = ?
        WHERE prompt_id = ? AND regenerated_at IS NOT NULL`,
    )
    .bind(now, input.approvedBy ?? null, now, input.promptId)
    .run();
  return readMark(db, input.promptId);
}
