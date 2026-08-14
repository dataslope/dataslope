/**
 * Admin-only endpoint behind the illustration-prompts review gallery. The page
 * is a static shell; all data (prompt entries, cut-outs, regen marks) comes
 * from GET here, so a non-admin never receives the prompt corpus. PUT sets or
 * clears a mark, or (`approve: true`) signs off a redraw. Marks live in D1
 * `dataslope-illustrations`.`illustration_regen_marks` (ILLUSTRATIONS_DB,
 * optional binding): without it GET reports `marksAvailable: false` and PUT
 * answers 503, degrading to a read-only gallery.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
// Manifest + created-at arrive as a static asset (emitted by build-images.mjs)
// rather than imports, which would bundle a private copy into the Worker.
import type { ImageManifestEntry } from "@/lib/generated/images";
import { readPublicAsset } from "@/lib/serverAssets";
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

/** Shape of public/_gen/illustration-gallery.json (build-images.mjs). */
interface GalleryData {
  images: Record<string, ImageManifestEntry>;
  illustrationsCreatedAt: Record<string, string>;
}

/** Cached per isolate: the JSON is immutable for the life of a deploy. */
let galleryDataPromise: Promise<GalleryData | null> | null = null;
function getGalleryData(): Promise<GalleryData | null> {
  galleryDataPromise ??= readPublicAsset("_gen/illustration-gallery.json").then(
    (text) => {
      if (!text) return null;
      try {
        return JSON.parse(text) as GalleryData;
      } catch {
        return null;
      }
    },
  );
  return galleryDataPromise;
}

/** A prompt plus the cut-out (the only image the gallery shows). `hasOriginal`
 *  lets the gallery tell "never generated" from "generated, but background
 *  removal never ran" — a real and silent pipeline failure. */
export interface GalleryEntry extends IllustrationPromptEntry {
  cutout: { src: string; width: number; height: number } | null;
  hasOriginal: boolean;
  /** ISO-8601 UTC of the commit that added the cut-out, null if never
   *  committed (see scripts/build-created-at.mjs). */
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
function cutoutFor(
  images: Record<string, ImageManifestEntry>,
  id: string,
): GalleryEntry["cutout"] {
  const slug = `${id}${CUTOUT_SUFFIX}`;
  const entry = images[slug];
  if (!entry) return null;
  // Take whatever format the manifest recorded rather than assuming .webp.
  const ext = entry.formats[entry.formats.length - 1];
  return { src: `/images/${slug}.${ext}`, width: entry.width, height: entry.height };
}

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  // A missing/unparseable asset means a broken deploy; say so rather than
  // render a gallery of blanks that reads as "nothing generated".
  const gallery = await getGalleryData();
  if (!gallery) {
    return json({ error: "Illustration gallery data is unavailable." }, 503);
  }

  const data = getIllustrationPrompts();
  const db = env.ILLUSTRATIONS_DB;

  let marks: RegenMark[] = [];
  let marksAvailable = false;
  if (db) {
    try {
      marks = await listRegenMarks(db);
      marksAvailable = true;
    } catch (err) {
      // A missing table (migration not applied) must not take the gallery down.
      console.error("illustration marks read failed", err);
    }
  }

  const payload: IllustrationGallery = {
    entries: data.entries.map((e) => ({
      ...e,
      cutout: cutoutFor(gallery.images, e.id),
      hasOriginal: Boolean(gallery.images[e.id]),
      createdAt: gallery.illustrationsCreatedAt[e.id] ?? null,
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
  // Only known prompt ids can be marked, so the queue never accumulates rows
  // pointing at nothing.
  if (!id || !getIllustrationPromptById(id)) {
    return json({ error: "Unknown illustration id." }, 400);
  }

  try {
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
