/**
 * Signed-in challenge progress.
 *
 *   GET → { progress: ProgressMap }   everything this account has recorded
 *   PUT { progress: ProgressMap }     merge these records in; answers with
 *                                     the merged rows it wrote
 *
 * The browser owns the moment of solving; this is where that fact is kept so
 * it follows the learner to another device. Writes merge (see
 * lib/challenges/progressSync.ts), so an upload can never undo progress
 * recorded elsewhere. Schema: migrations/auth/0010.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { getChallengeSlugs } from "@/lib/challenges";
import type { ChallengeProgress, ProgressMap } from "@/lib/challenges/progress";
import {
  mergeProgress,
  sanitizeProgressMap,
} from "@/lib/challenges/progressSync";
import { isSameOrigin, json } from "@/lib/workspaces/server";

export const dynamic = "force-dynamic";

interface ProgressRow {
  slug: string;
  passed_steps: string;
  solved: number;
  attempted: number;
}

let knownSlugs: Set<string> | null = null;
function isKnownSlug(slug: string): boolean {
  knownSlugs ??= new Set(getChallengeSlugs());
  return knownSlugs.has(slug);
}

function rowToProgress(row: ProgressRow): ChallengeProgress {
  let steps: unknown = [];
  try {
    steps = JSON.parse(row.passed_steps);
  } catch {
    /* a damaged row reads as no steps; the next upload repairs it */
  }
  return {
    passedSteps: Array.isArray(steps)
      ? steps.filter((s): s is string => typeof s === "string")
      : [],
    solved: row.solved === 1,
    attempted: row.attempted === 1,
  };
}

async function signedInUser(request: Request) {
  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { env, error: json({ error: "Sign in to sync challenge progress." }, 401) };
  }
  if (session.user.banned) {
    return { env, error: json({ error: "This account is suspended." }, 403) };
  }
  return { env, userId: session.user.id };
}

export async function GET(request: Request): Promise<Response> {
  const { env, userId, error } = await signedInUser(request);
  if (error) return error;
  try {
    const res = await env.DB.prepare(
      `SELECT slug, passed_steps, solved, attempted
         FROM challenge_progress WHERE user_id = ?`,
    )
      .bind(userId)
      .all<ProgressRow>();
    const progress: ProgressMap = {};
    for (const row of res.results) progress[row.slug] = rowToProgress(row);
    return json({ progress });
  } catch (err) {
    // Most likely the migration has not been applied to this database yet.
    // The browser keeps working from its local copy either way.
    console.error("[challenges/progress] read failed", err);
    return json({ error: "Progress sync is unavailable right now." }, 503);
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: "Cross-origin request refused." }, 403);
  }
  const { env, userId, error } = await signedInUser(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }
  const incoming = sanitizeProgressMap(
    (body as { progress?: unknown } | null)?.progress,
    isKnownSlug,
  );
  const slugs = Object.keys(incoming);
  if (slugs.length === 0) return json({ progress: {} });

  try {
    // Read what is there so the write can merge rather than overwrite. D1
    // binds at most 100 parameters per statement, so read in chunks.
    const existing: ProgressMap = {};
    for (let i = 0; i < slugs.length; i += 90) {
      const chunk = slugs.slice(i, i + 90);
      const res = await env.DB.prepare(
        `SELECT slug, passed_steps, solved, attempted
           FROM challenge_progress
          WHERE user_id = ? AND slug IN (${chunk.map(() => "?").join(", ")})`,
      )
        .bind(userId, ...chunk)
        .all<ProgressRow>();
      for (const row of res.results) existing[row.slug] = rowToProgress(row);
    }

    const now = new Date().toISOString();
    const written: ProgressMap = {};
    const statements = [];
    for (const slug of slugs) {
      const before = existing[slug];
      const merged = before ? mergeProgress(before, incoming[slug]) : incoming[slug];
      if (before && merged === before) continue;
      written[slug] = merged;
      statements.push(
        env.DB.prepare(
          `INSERT INTO challenge_progress
             (user_id, slug, passed_steps, solved, attempted, solved_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id, slug) DO UPDATE SET
             passed_steps = excluded.passed_steps,
             solved       = excluded.solved,
             attempted    = excluded.attempted,
             solved_at    = COALESCE(challenge_progress.solved_at, excluded.solved_at),
             updated_at   = excluded.updated_at`,
        ).bind(
          userId,
          slug,
          JSON.stringify(merged.passedSteps),
          merged.solved ? 1 : 0,
          merged.attempted ? 1 : 0,
          merged.solved ? now : null,
          now,
        ),
      );
    }
    if (statements.length > 0) await env.DB.batch(statements);
    return json({ progress: written });
  } catch (err) {
    console.error("[challenges/progress] write failed", err);
    return json({ error: "Progress sync is unavailable right now." }, 503);
  }
}
