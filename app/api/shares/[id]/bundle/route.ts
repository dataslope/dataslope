/**
 * Bundle download for a share link (public — the slug is the capability).
 *
 * GET /api/shares/:id/bundle → the gzipped snapshot bytes streamed from R2.
 * Used by the "Open a copy" flow on /s/:id and by the playgrounds when they
 * materialize a forked copy. Expired links 404 like the metadata route.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  json,
  loadLiveShare,
  workspacesBucket,
} from "@/lib/workspaces/server";
import { isValidShareId } from "@/lib/workspaces/policy";
import { touchShareRow } from "@/lib/workspaces/store";
import { BUNDLE_CONTENT_TYPE } from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

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

  const object = await bucket.get(row.r2_key);
  if (!object) return json({ error: "Not found." }, 404);

  if (Date.parse(row.last_viewed_at) < nowMs - TOUCH_INTERVAL_MS) {
    const touch = touchShareRow(env, id, new Date(nowMs).toISOString()).catch(
      (err) => console.error("shares: touch failed", err),
    );
    if (ctx?.waitUntil) ctx.waitUntil(touch);
  }

  return new Response(object.body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": BUNDLE_CONTENT_TYPE,
      "Content-Length": String(object.size),
      "Cache-Control": "private, no-store",
      // The payload is user-uploaded bytes served from our origin: force
      // download semantics and forbid sniffing so a hostile "bundle" can't
      // be repurposed as hosted content.
      "Content-Disposition": 'attachment; filename="workspace.bundle.gz"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
