/**
 * The illustration regeneration queue: the illustration binding of the shared
 * mechanics in lib/review/marks.ts (table `illustration_regen_marks` in the
 * ILLUSTRATIONS_DB D1 database, schema in migrations/illustrations/0001 —
 * deliberately separate from `dataslope-auth`). `prompt_id` is the
 * illustration id from data/illustration-prompts.json, which is also the file
 * stem, so a mark points at a prompt, a served file, and an R2 candidate at
 * once. An empty note means flagged, no reason given.
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
