/**
 * Admin-only endpoint behind the chart review queue. GET returns every mark,
 * PUT sets/clears a mark or (`approve: true`) signs off a redraw, DELETE
 * toggles `delete_requested_at` — it records the decision, never deletes:
 * a chart is a source file, so removal happens as a commit in a checkout
 * (see migrations/illustrations/0004_…). Marks live in D1
 * `dataslope-illustrations`.`chart_regen_marks` (binding ILLUSTRATIONS_DB);
 * without the binding GET answers `available: false` and PUT 503, degrading
 * to a read-only gallery.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
// The slug index, NOT the full manifest: importing charts.js here would ship
// a second copy of every chart's SVG in the Worker (~891 KiB gzipped).
import chartSlugs from "@/lib/generated/chart-slugs";
import {
  approveRegenMark,
  listRegenMarks,
  requestDeletion,
  upsertRegenMark,
  MAX_NOTE_LENGTH,
  type RegenMark,
} from "@/lib/charts/regenMarks";

export const dynamic = "force-dynamic";

const knownSlugs = new Set<string>(chartSlugs);

/** Why the queue is read-only: `unbound` (missing binding) and `unreadable`
 *  (usually the migration not applied) have different fixes, so they are
 *  reported separately. */
export type ChartQueueState = "ok" | "unbound" | "unreadable";

export interface ChartMarksPayload {
  marks: RegenMark[];
  /** False when the queue cannot be written: see `state` for which reason. */
  available: boolean;
  /** Which of the two failures happened, so the gallery can name it. */
  state: ChartQueueState;
  maxNoteLength: number;
}

export interface ChartDeletePayload {
  /** The row after the write, so the gallery can render the new state without
   *  refetching the whole queue. */
  mark: RegenMark;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const db = env.ILLUSTRATIONS_DB;
  let marks: RegenMark[] = [];
  let state: ChartQueueState = "unbound";
  if (db) {
    try {
      marks = await listRegenMarks(db);
      state = "ok";
    } catch (err) {
      // Almost always the `chart_regen_marks` migration not applied to this
      // database; degrade to read-only rather than throw.
      console.error("chart marks read failed", err);
      state = "unreadable";
    }
  }

  const payload: ChartMarksPayload = {
    marks,
    available: state === "ok",
    state,
    maxNoteLength: MAX_NOTE_LENGTH,
  };
  return json(payload);
}

export async function PUT(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const db = env.ILLUSTRATIONS_DB;
  if (!db) return json({ error: "Chart review database is not configured." }, 503);

  let body: { slug?: unknown; marked?: unknown; note?: unknown; approve?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  // Only manifest slugs can be marked, so the queue never accumulates rows
  // for deleted or renamed charts.
  if (!slug || !knownSlugs.has(slug)) {
    return json({ error: "Unknown chart slug." }, 400);
  }

  try {
    const mark = body.approve
      ? await approveRegenMark(db, { promptId: slug, approvedBy: gate.user.id })
      : await upsertRegenMark(db, {
          promptId: slug,
          marked: body.marked === true,
          note: typeof body.note === "string" ? body.note : "",
          markedBy: gate.user.id,
        });
    return json({ mark });
  } catch (err) {
    console.error("chart mark write failed", err);
    return json({ error: "Couldn't save that mark." }, 500);
  }
}

/** Record (or withdraw) a request to delete one chart from the repository. */
export async function DELETE(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const db = env.ILLUSTRATIONS_DB;
  if (!db) return json({ error: "Chart review database is not configured." }, 503);

  let body: { slug?: unknown; requested?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug || !knownSlugs.has(slug)) {
    return json({ error: "Unknown chart slug." }, 400);
  }

  try {
    const mark = await requestDeletion(db, {
      promptId: slug,
      // Absent means "request it"; withdrawing is the explicit `false`.
      requested: body.requested !== false,
      reason: typeof body.reason === "string" ? body.reason : "",
      requestedBy: gate.user.id,
    });
    const payload: ChartDeletePayload = { mark };
    return json(payload);
  } catch (err) {
    console.error("chart deletion request failed", err);
    return json({ error: "Couldn't record that request." }, 500);
  }
}
