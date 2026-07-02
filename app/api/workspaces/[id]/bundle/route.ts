/**
 * Bundle download for one cloud-saved workspace ("pull").
 *
 * GET /api/workspaces/:id/bundle → the gzipped JSON bundle bytes, streamed
 * straight from R2 (owner-only). Downloading counts as activity, so the
 * free-tier retention clock (`last_used_at`) is refreshed in the background.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import { json, workspacesBucket } from "@/lib/workspaces/server";
import { isExpired, isValidWorkspaceId } from "@/lib/workspaces/policy";
import {
  deleteWorkspaces,
  getWorkspaceRow,
  touchWorkspaceRow,
} from "@/lib/workspaces/store";
import { BUNDLE_CONTENT_TYPE } from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!isValidWorkspaceId(id)) return json({ error: "Not found." }, 404);

  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) {
    return json({ error: "Cloud saves aren't configured yet." }, 503);
  }
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to use cloud saves." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const row = await getWorkspaceRow(env, session.user.id, id);
  if (!row) return json({ error: "Not found." }, 404);

  const nowMs = Date.now();
  const tier = resolveTier(session.user, env);
  if (isExpired({ tier, lastActiveAt: row.last_used_at, nowMs })) {
    const purge = deleteWorkspaces(env, bucket, session.user.id, [row]).catch(
      (err) => console.error("workspaces: purge failed", err),
    );
    if (ctx?.waitUntil) ctx.waitUntil(purge);
    return json({ error: "Not found." }, 404);
  }

  const object = await bucket.get(row.r2_key);
  if (!object) return json({ error: "Not found." }, 404);

  const touch = touchWorkspaceRow(
    env,
    session.user.id,
    id,
    new Date(nowMs).toISOString(),
  ).catch((err) => console.error("workspaces: touch failed", err));
  if (ctx?.waitUntil) ctx.waitUntil(touch);

  return new Response(object.body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": BUNDLE_CONTENT_TYPE,
      "Content-Length": String(object.size),
      "Cache-Control": "private, no-store",
    },
  });
}
