/**
 * Build-time data for the `/interview-prep` catalog page.
 *
 * Reads the interview collection's `meta.json` files under `content/interview/`
 * (the same source of truth the Fumadocs sidebar uses) into one array of role
 * "tracks", each with its human title and the ordered list of topics it
 * covers. The role order comes from the root `content/interview/meta.json`
 * `pages` array; each role's title and topic order come from its own
 * `meta.json`; each topic's display title is the topic page's frontmatter
 * title, resolved through `interviewSource` so it always matches what renders
 * on the topic page itself.
 *
 * The per-role presentation (tagline, icon, banner illustration) lives with
 * the catalog UI in `app/interview-prep/_components/InterviewCatalog.tsx`,
 * keyed by the `slug` this returns, so "what exists" (content) stays separate
 * from "how it looks" (design). Mirrors `getCourseCatalog` in
 * `lib/courseCatalog.ts`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { interviewSource } from "@/lib/source";

export interface InterviewTopic {
  slug: string;
  /** Frontmatter title of the topic page (e.g. "Statistics & Communication"). */
  title: string;
  /** Route to the topic page, e.g. `/interview-prep/data-analyst/sql`. */
  url: string;
}

export interface InterviewTrack {
  /** Role folder name, e.g. `data-analyst`. */
  slug: string;
  /** Human role name from the role's meta.json, e.g. "Data Analyst". */
  title: string;
  /** Route to the role landing page, e.g. `/interview-prep/data-analyst`. */
  url: string;
  topics: InterviewTopic[];
}

interface MetaFile {
  title?: unknown;
  pages?: unknown;
}

/** A `meta.json` "pages" entry that names a real child page: a plain string
 *  that isn't the folder's own index or a `---separator---` divider. */
function pageSlugs(meta: MetaFile): string[] {
  if (!Array.isArray(meta.pages)) return [];
  return meta.pages.filter(
    (p): p is string =>
      typeof p === "string" && p !== "index" && !p.startsWith("---"),
  );
}

/** Every interview role track, in the order declared by the root meta.json. */
export async function getInterviewTracks(): Promise<InterviewTrack[]> {
  // Resolved inside the try below for the same reason blockOutputs.ts does:
  // `process.cwd` is not guaranteed on every runtime, and a throw outside the
  // fallback is a 500 rather than an empty catalog.
  let dir: string;
  let root: MetaFile;
  try {
    dir = path.join(process.cwd(), "content", "interview");
    root = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf-8"));
  } catch {
    return [];
  }

  const tracks: InterviewTrack[] = [];
  for (const slug of pageSlugs(root)) {
    let roleMeta: MetaFile;
    try {
      roleMeta = JSON.parse(
        await readFile(path.join(dir, slug, "meta.json"), "utf-8"),
      );
    } catch {
      // Not a role folder (no meta.json), skip.
      continue;
    }
    if (typeof roleMeta.title !== "string") continue;

    const topics: InterviewTopic[] = [];
    for (const topicSlug of pageSlugs(roleMeta)) {
      // Frontmatter (title/url) is available on `page.data` without loading the
      // compiled body, so this stays cheap at build time.
      const page = interviewSource.getPage([slug, topicSlug]);
      if (!page) continue;
      topics.push({ slug: topicSlug, title: page.data.title, url: page.url });
    }

    tracks.push({
      slug,
      title: roleMeta.title,
      url: `/interview-prep/${slug}`,
      topics,
    });
  }

  return tracks;
}
