/**
 * One share link.
 *
 * GET    /api/shares/:id, public metadata (the /s/:id page + open-a-copy
 *                          flow). Expired links 404. A view refreshes the
 *                          free-tier inactivity clock (throttled, hot links
 *                          don't turn every read into a D1 write).
 * DELETE /api/shares/:id, revoke; owner only. Guest shares have no owner and
 *                          can't be revoked, they age out on their fixed TTL.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import {
  isSameOrigin,
  json,
  loadLiveShare,
  shareRowToMeta,
  workspacesBucket,
} from "@/lib/workspaces/server";
import { isValidShareId } from "@/lib/workspaces/policy";
import {
  deleteShares,
  getShareRowWithOwner,
  touchShareRow,
} from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

/** A view only refreshes `last_viewed_at` when it's at least this stale. */
const TOUCH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!isValidShareId(id)) return json({ error: "Not found." }, 404);

  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) return json({ error: "Sharing isn't configured yet." }, 503);

  const nowMs = Date.now();
  const row = await loadLiveShare(
    env,
    bucket,
    id,
    nowMs,
    ctx?.waitUntil ? (p) => ctx.waitUntil(p) : undefined,
  );
  if (!row) return json({ error: "Not found." }, 404);

  if (Date.parse(row.last_viewed_at) < nowMs - TOUCH_INTERVAL_MS) {
    const touch = touchShareRow(env, id, new Date(nowMs).toISOString()).catch(
      (err) => console.error("shares: touch failed", err),
    );
    if (ctx?.waitUntil) ctx.waitUntil(touch);
  }

  return json({ share: shareRowToMeta(row) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidShareId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) return json({ error: "Sharing isn't configured yet." }, 503);

  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to revoke a share." }, 401);

  const row = await getShareRowWithOwner(env, id);
  if (!row || row.user_id !== session.user.id) {
    return json({ error: "Not found." }, 404);
  }
  await deleteShares(env, bucket, [row]);
  return json({ ok: true });
}
