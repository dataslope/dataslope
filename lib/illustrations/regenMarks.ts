/**
 * The illustration regeneration queue: which generated images an admin wants
 * redrawn, and the brief to write each replacement prompt from.
 *
 * Storage is D1 database **`dataslope-illustrations`**, table
 * **`illustration_regen_marks`**, reached through the `ILLUSTRATIONS_DB`
 * binding (schema in `migrations/illustrations/0001_…`). It is deliberately a
 * different database from `dataslope-auth`: this is authoring state, so the
 * whole queue can be read, dumped, or wiped by a coding agent without touching
 * accounts or sessions.
 *
 * Marks are written from `/dashboard/admin/illustration-prompts` (admin-only) via
 * `/api/admin/illustration-prompts`, and read back by whoever regenerates the
 * art. The full workflow is written up in
 * `agent-outputs/20260803-0900-illustration-regeneration-queue.md`.
 *
 * `prompt_id` is the illustration id from `data/illustration-prompts.json`,
 * which is also the file stem (`<id>.webp`, `<id>-cutout.webp`), so a mark
 * points at a prompt, a served file, and an R2 candidate all at once.
 *
 * The mechanics live in `lib/review/marks.ts`, which the chart review queue
 * shares: the two tables have the same shape, and a bug fixed in one should
 * not have to be found twice. This module is the illustration binding of it,
 * which is to say the table and nothing else.
 *
 * The note is optional and has no default. Marking with nothing typed stores
 * an empty note, and means only that: flagged, no reason given.
 */
import type { D1Database } from "@cloudflare/workers-types";
import {
  approveRegenMark as approveMark,
  listRegenMarks as listMarks,
  readMark as readOneMark,
  upsertRegenMark as upsertMark,
} from "@/lib/review/marks";

export { MAX_NOTE_LENGTH, isAwaitingApproval, normalizeNote } from "@/lib/review/marks";
export type { RegenMark } from "@/lib/review/marks";

const QUEUE = "illustrations" as const;

/** Every row in the queue, marked ones first and oldest mark first within
 *  each group. */
export function listRegenMarks(db: D1Database) {
  return listMarks(db, QUEUE);
}

/** One row by id, or null when the illustration has never been marked. */
export function readMark(db: D1Database, promptId: string) {
  return readOneMark(db, QUEUE, promptId);
}

/** Set (or clear) the mark on one illustration, keeping the note either way. */
export function upsertRegenMark(
  db: D1Database,
  input: { promptId: string; marked: boolean; note: string; markedBy?: string | null },
) {
  return upsertMark(db, QUEUE, input);
}

/** Sign off a redraw, so the illustration stops showing as waiting for a look. */
export function approveRegenMark(
  db: D1Database,
  input: { promptId: string; approvedBy?: string | null },
) {
  return approveMark(db, QUEUE, input);
}
