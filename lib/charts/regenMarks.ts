/**
 * The chart review queue: the chart binding of the shared mechanics in
 * lib/review/marks.ts (table `chart_regen_marks` in the ILLUSTRATIONS_DB D1
 * database, schema in migrations/illustrations/0003). A chart is regenerated
 * by editing `charts/<slug>.mjs` and running `npm run build:charts`; whoever
 * does that stamps `regenerated_at`. `prompt_id` is the chart slug — the file
 * stem, the key in lib/generated/charts.js, and the `slug` prop on
 * `<Chart />` — so one mark points at spec, SVG, and every lesson using it.
 * An empty note means flagged, no reason given.
 */
import type { D1Database } from "@cloudflare/workers-types";
import {
  approveRegenMark as approveMark,
  listRegenMarks as listMarks,
  readMark as readOneMark,
  requestDeletion as requestDelete,
  upsertRegenMark as upsertMark,
} from "@/lib/review/marks";

export { MAX_NOTE_LENGTH, isAwaitingApproval, normalizeNote } from "@/lib/review/marks";
export type { RegenMark } from "@/lib/review/marks";

const QUEUE = "charts" as const;

/** Every row in the queue, marked ones first and oldest mark first within
 *  each group. */
export function listRegenMarks(db: D1Database) {
  return listMarks(db, QUEUE);
}

/** One row by slug, or null when the chart has never been marked. */
export function readMark(db: D1Database, promptId: string) {
  return readOneMark(db, QUEUE, promptId);
}

/** Set (or clear) the mark on one chart, keeping the note either way. */
export function upsertRegenMark(
  db: D1Database,
  input: { promptId: string; marked: boolean; note: string; markedBy?: string | null },
) {
  return upsertMark(db, QUEUE, input);
}

/** Sign off a redraw, so the chart stops showing as waiting for a look. */
export function approveRegenMark(
  db: D1Database,
  input: { promptId: string; approvedBy?: string | null },
) {
  return approveMark(db, QUEUE, input);
}

/** Ask for this chart to be deleted from the repository, or withdraw the ask.
 *  The gallery records the decision; the deletion itself is a commit, made by
 *  whoever reads the queue back (see migrations/illustrations/0004_…). */
export function requestDeletion(
  db: D1Database,
  input: { promptId: string; requested: boolean; reason: string; requestedBy?: string | null },
) {
  return requestDelete(db, QUEUE, input);
}
