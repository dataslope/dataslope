/**
 * Admin-only read/write endpoint behind the review queue on
 * `/dashboard/admin/charts`.
 *
 * The page itself stays statically prerendered and unauthenticated, because
 * what it renders is a build artefact from this repo rather than anyone's data
 * (see the tools band note in app/dashboard/_studio/nav.ts). Only the *queue*
 * is gated, and it lives here:
 *
 *   GET    → every mark, so the gallery can colour its figures and list what
 *            is outstanding.
 *   PUT    → set or clear one chart's mark, with an optional note, or, with
 *            `approve: true`, sign off a redraw so it stops showing as waiting
 *            to be looked at.
 *   DELETE → record (or withdraw) a request to delete a chart from the
 *            repository. It does not delete anything; see below.
 *
 * That split is why this endpoint returns no chart data: the SVG is already on
 * the page. A non-admin gets the gallery and a 403 from this route, which is
 * the correct outcome — they can look at the figures and cannot queue work.
 *
 * Marks live in D1 `dataslope-illustrations`, table `chart_regen_marks`
 * (binding `ILLUSTRATIONS_DB`; see lib/charts/regenMarks.ts). The binding is
 * optional: without it GET answers with `available: false` and PUT answers
 * 503, so a deployment that has not run the migration yet degrades to a
 * read-only gallery instead of erroring.
 *
 * ── What DELETE does, and why it is not a delete ───────────────────────────
 *
 * A chart is not a record. It is `charts/<slug>.mjs`, a source file in this
 * repository, compiled to SVG by scripts/build-charts.mjs and baked into the
 * deployed bundle; the Worker serving this endpoint holds the rendered markup
 * and nothing else. Removing a chart is a commit, and a commit is something a
 * person or a coding agent makes.
 *
 * So DELETE records the *decision* rather than performing it: it stamps
 * `delete_requested_at` on the chart's row, and the repository work reads that
 * back and does the removal. That is the same split `marked` already uses for
 * redraws, and for the same reason: the reviewer is in a browser looking at the
 * figure, and the work happens in a checkout. The SQL for reading the queue and
 * clearing a request once the deletion has landed is in
 * `migrations/illustrations/0004_…`.
 *
 * It is a toggle, so a request made by mistake can be withdrawn from the same
 * button rather than needing a hand-written UPDATE.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import chartManifest from "@/lib/generated/charts";
import {
  approveRegenMark,
  listRegenMarks,
  requestDeletion,
  upsertRegenMark,
  MAX_NOTE_LENGTH,
  type RegenMark,
} from "@/lib/charts/regenMarks";

export const dynamic = "force-dynamic";

/**
 * Why the queue is read-only, when it is.
 *
 * These are two different problems with two different fixes and they used to
 * arrive as one boolean, so the gallery reported "not bound" for both. That is
 * the wrong sentence in the commoner case by far: the binding is declared in
 * wrangler.jsonc and is almost always present, while the *table* is missing on
 * any deployment where `db:migrate:illustrations:remote` has not been run since
 * the chart queue landed. Someone reading "not bound" goes looking at bindings
 * and finds nothing wrong.
 */
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
      // Almost always the migration not having been applied to this database:
      // `chart_regen_marks` arrived after `dataslope-illustrations` already
      // existed, so a deployment that never re-ran the migration has a bound
      // binding and no table. Either way, reviewing the figures is still
      // useful without the queue, so this degrades rather than throws.
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
  // Only slugs that exist in the generated manifest can be marked, so the queue
  // can never accumulate rows pointing at a chart that was deleted or renamed.
  if (!slug || !chartManifest[slug]) {
    return json({ error: "Unknown chart slug." }, 400);
  }

  try {
    // Two writes share this endpoint because they are two halves of one round
    // trip: `approve: true` signs off a redraw, anything else sets the mark.
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

/**
 * Record (or withdraw) a request to delete one chart from the repository.
 *
 * Admin-gated and available everywhere, unlike the filesystem delete this
 * replaced: writing a row is something the Worker can actually do, and the
 * decision is worth recording from wherever the reviewer happens to be.
 *
 * The slug still has to be a key of the generated manifest, so the queue can
 * never accumulate requests pointing at a chart that does not exist.
 */
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
  if (!slug || !chartManifest[slug]) {
    return json({ error: "Unknown chart slug." }, 400);
  }

  try {
    const mark = await requestDeletion(db, {
      promptId: slug,
      // Absent means "request it": the button that sends no flag is the one
      // asking for deletion, and withdrawing is the explicit `false`.
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
