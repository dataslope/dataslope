/**
 * Admin-only read/write endpoint behind the review queue on
 * `/dashboard/admin/charts`.
 *
 * The page itself stays statically prerendered and unauthenticated, because
 * what it renders is a build artefact from this repo rather than anyone's data
 * (see the tools band note in app/dashboard/_studio/nav.ts). Only the *queue*
 * is gated, and it lives here:
 *
 *   GET  → every mark, so the gallery can colour its figures and list what is
 *          outstanding.
 *   PUT  → set or clear one chart's mark, with an optional note, or, with
 *          `approve: true`, sign off a redraw so it stops showing as waiting
 *          to be looked at.
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
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import chartManifest from "@/lib/generated/charts";
import {
  approveRegenMark,
  listRegenMarks,
  upsertRegenMark,
  MAX_NOTE_LENGTH,
  type RegenMark,
} from "@/lib/charts/regenMarks";

export const dynamic = "force-dynamic";

export interface ChartMarksPayload {
  marks: RegenMark[];
  /** False when ILLUSTRATIONS_DB isn't bound: the gallery renders read-only. */
  available: boolean;
  maxNoteLength: number;
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
  let available = false;
  if (db) {
    try {
      marks = await listRegenMarks(db);
      available = true;
    } catch (err) {
      // A missing table (migration not applied) must not take the gallery down
      // with it; reviewing the figures is still useful without the queue.
      console.error("chart marks read failed", err);
    }
  }

  const payload: ChartMarksPayload = {
    marks,
    available,
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
