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
 *   DELETE → remove a chart's spec file. Development only; see below.
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
 * ── Why DELETE is development-only ─────────────────────────────────────────
 *
 * A chart is not a record; it is `charts/<slug>.mjs`, a source file in this
 * repository, compiled to SVG by scripts/build-charts.mjs and baked into the
 * deployed bundle. The Worker serving production holds the rendered markup and
 * nothing else: no filesystem, no copy of the spec, no way to change what the
 * next build produces. So a delete button that "worked" in production could
 * only ever record an intention, and the chart would still be there on the
 * next deploy.
 *
 * Deleting the file is the real operation, and it is available in exactly the
 * place it means something: `next dev`, running from a checkout, which is also
 * where someone is reviewing figures and deciding one is not worth keeping.
 * Outside development this handler 404s before doing anything, so the surface
 * does not exist in the deployed app.
 *
 * That also settles the authorization question. In development the request
 * comes from the developer's own machine and touches their own working tree,
 * which is why the tools band is reachable on localhost without a session at
 * all (app/dashboard/_studio/nav.ts); requiring an admin login to delete a
 * file the caller could equally well `rm` would be theatre. In production
 * there is no route to authorize.
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

export interface ChartDeletePayload {
  /** Repo-relative path of the spec that was removed. */
  removed: string;
  /** Placements the chart still had, so the caller can say what now needs
   *  editing. A deleted spec leaves `<Chart slug="…">` tags behind, and the
   *  next build would render them as the dev-only "no chart with this slug"
   *  notice rather than failing. */
  usedBy: string[];
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

/**
 * Delete one chart's spec file from the working tree.
 *
 * Development only, for the reasons in the header comment. Three guards, in
 * this order:
 *
 *   1. Not production → 404, so the surface simply does not exist in the
 *      deployed app rather than existing and refusing.
 *   2. The slug has to be a key of the generated manifest. That is a stricter
 *      check than a path pattern and it is free: the manifest is built from
 *      the directory listing, so a slug in it is a file that was there at
 *      build time and cannot contain a separator or a `..`.
 *   3. The resolved path has to still be inside `charts/`. Belt and braces
 *      against the manifest ever carrying something exotic.
 *
 * The `node:fs` import sits *after* the production check and is dynamic, so it
 * is only ever evaluated under `next dev`, where the route runs in Node. It is
 * safe in the Worker build too: `nodejs_compat` resolves `node:fs/promises`
 * through unenv, which ships a stub for it, so the bundle links and the stub is
 * simply never called.
 */
export async function DELETE(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return json({ error: "Not found." }, 404);
  }

  let body: { slug?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const chart = slug ? chartManifest[slug] : undefined;
  if (!chart) return json({ error: "Unknown chart slug." }, 400);

  const { unlink } = await import("node:fs/promises");
  const { join, resolve, sep } = await import("node:path");

  const dir = resolve(process.cwd(), "charts");
  const file = resolve(join(dir, `${slug}.mjs`));
  if (!file.startsWith(dir + sep)) {
    return json({ error: "Refusing to delete outside charts/." }, 400);
  }

  try {
    await unlink(file);
  } catch (err) {
    // Already gone is the outcome the caller wanted, so it is not an error;
    // anything else is.
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error("chart spec delete failed", err);
      return json({ error: "Couldn't delete that spec file." }, 500);
    }
  }

  const payload: ChartDeletePayload = {
    removed: `charts/${slug}.mjs`,
    usedBy: chart.usedBy.map((use) => use.url),
  };
  return json(payload);
}
