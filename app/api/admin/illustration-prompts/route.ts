/**
 * Admin-only data + write endpoint behind the `/dashboard/admin/illustration-prompts` review
 * gallery.
 *
 * The page itself stays a statically prerendered shell (the codebase's "auth
 * gates actions, not content" rule); everything it renders comes from here, so
 * a non-admin who opens the URL gets the shell and a 403 rather than the
 * prompt corpus. That is the difference from the old build-time page, which
 * inlined all ~900 prompts into public HTML.
 *
 *   GET  → the whole gallery: every built prompt entry, its background-removed
 *          WebP (the only image the gallery shows), and the current
 *          regeneration marks.
 *   PUT  → set or clear one illustration's regeneration mark, with an optional
 *          note (the brief the redraw's new prompt gets written from), or, with
 *          `approve: true`, sign off a redraw so it stops showing as waiting to
 *          be looked at.
 *
 * Marks live in D1 `dataslope-illustrations`, table `illustration_regen_marks`
 * (binding `ILLUSTRATIONS_DB`; see lib/illustrations/regenMarks.ts and
 * agent-outputs/20260803-0900-illustration-regeneration-queue.md). That binding
 * is optional: without it GET still returns the gallery with
 * `marksAvailable: false` and PUT answers 503, so a deployment that has not run
 * the migration yet degrades to a read-only gallery instead of erroring.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import createdAt from "@/lib/generated/created-at";
import imageManifest from "@/lib/generated/images";
import {
  getIllustrationPrompts,
  getIllustrationPromptById,
  type IllustrationPromptEntry,
} from "@/lib/illustrationPromptsGallery";
import {
  approveRegenMark,
  listRegenMarks,
  upsertRegenMark,
  MAX_NOTE_LENGTH,
  type RegenMark,
} from "@/lib/illustrations/regenMarks";

export const dynamic = "force-dynamic";

/** Suffix on the background-removed variant's slug, mirroring the pipeline
 *  (`scripts/remove-background-kie.mjs` writes `<id>-cutout`). */
const CUTOUT_SUFFIX = "-cutout";

/** A prompt plus the one image the gallery renders for it: the cut-out. The
 *  original is deliberately not shown, since reviewing is about how the art
 *  reads once its background is gone; `hasOriginal` is still reported so the
 *  gallery can tell "never generated" apart from "generated, but background
 *  removal never ran", which is a real and silent pipeline failure. */
export interface GalleryEntry extends IllustrationPromptEntry {
  cutout: { src: string; width: number; height: number } | null;
  hasOriginal: boolean;
  /** ISO-8601 UTC of the commit that added this illustration's cut-out, or
   *  null when it has never been committed (or the clone has no history to
   *  read). The cut-out is the file the site serves, so its birth is the
   *  illustration's; see scripts/build-created-at.mjs. */
  createdAt: string | null;
}

export interface IllustrationGallery {
  entries: GalleryEntry[];
  totalIllustrations: number;
  totalCourses: number;
  /** Current queue state, keyed off the prompt id. */
  marks: RegenMark[];
  /** False when ILLUSTRATIONS_DB isn't bound: the gallery renders read-only. */
  marksAvailable: boolean;
  maxNoteLength: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** The served cut-out for an id, or null when the background-removal step
 *  hasn't produced one (or the art doesn't exist yet). */
function cutoutFor(id: string): GalleryEntry["cutout"] {
  const slug = `${id}${CUTOUT_SUFFIX}`;
  const entry = imageManifest[slug];
  if (!entry) return null;
  // Illustrations are single-format WebP (see AGENTS.md); take whatever the
  // manifest recorded rather than assuming the extension.
  const ext = entry.formats[entry.formats.length - 1];
  return { src: `/images/${slug}.${ext}`, width: entry.width, height: entry.height };
}

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const data = getIllustrationPrompts();
  const db = env.ILLUSTRATIONS_DB;

  let marks: RegenMark[] = [];
  let marksAvailable = false;
  if (db) {
    try {
      marks = await listRegenMarks(db);
      marksAvailable = true;
    } catch (err) {
      // A missing table (migration not applied) must not take the gallery
      // down with it; reviewing the art is still useful without the queue.
      console.error("illustration marks read failed", err);
    }
  }

  const payload: IllustrationGallery = {
    entries: data.entries.map((e) => ({
      ...e,
      cutout: cutoutFor(e.id),
      hasOriginal: Boolean(imageManifest[e.id]),
      createdAt: createdAt.illustrations[e.id] ?? null,
    })),
    totalIllustrations: data.totalIllustrations,
    totalCourses: data.totalCourses,
    marks,
    marksAvailable,
    maxNoteLength: MAX_NOTE_LENGTH,
  };
  return json(payload);
}

export async function PUT(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const db = env.ILLUSTRATIONS_DB;
  if (!db) {
    return json(
      { error: "Illustration review database is not configured." },
      503,
    );
  }

  let body: {
    id?: unknown;
    marked?: unknown;
    note?: unknown;
    approve?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }

  const id = typeof body.id === "string" ? body.id : "";
  // Only ids that exist in data/illustration-prompts.json can be marked, so
  // the queue can never accumulate rows pointing at nothing.
  if (!id || !getIllustrationPromptById(id)) {
    return json({ error: "Unknown illustration id." }, 400);
  }

  try {
    // Two writes share this endpoint because they are two halves of one round
    // trip: `approve: true` signs off a redraw, anything else sets the mark.
    const mark = body.approve
      ? await approveRegenMark(db, { promptId: id, approvedBy: gate.user.id })
      : await upsertRegenMark(db, {
          promptId: id,
          marked: body.marked === true,
          note: typeof body.note === "string" ? body.note : "",
          markedBy: gate.user.id,
        });
    return json({ mark });
  } catch (err) {
    console.error("illustration mark write failed", err);
    return json({ error: "Couldn't save that mark." }, 500);
  }
}
