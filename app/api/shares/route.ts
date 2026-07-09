/**
 * Playground share links.
 *
 * POST /api/shares, mint a share: uploads an immutable snapshot bundle and
 *   returns { share, url }. Works for BOTH signed-in members and guests:
 *   - members: counts against their storage quota + share cap; the link obeys
 *     the free-tier inactivity retention (pro links don't expire).
 *   - guests: smaller size cap, fixed ~30-day expiry, and per-IP + global
 *     daily creation budgets (salted-hash counters, no raw IPs stored).
 * GET /api/shares, list the signed-in member's live share links.
 *
 * Multipart body identical to PUT /api/workspaces/:id (`meta` + `bundle`).
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import {
  isSameOrigin,
  json,
  loadLiveUserState,
  readBundleUpload,
  shareRowToMeta,
  workspacesBucket,
} from "@/lib/workspaces/server";
import {
  GUEST_SHARES_GLOBAL_PER_DAY,
  GUEST_SHARES_PER_IP_PER_DAY,
  GUEST_SHARE_MAX_BYTES,
  guestShareExpiryIso,
  limitsForTier,
  newShareId,
  shareObjectKey,
} from "@/lib/workspaces/policy";
import {
  hashIp,
  insertShareRow,
  reserveGuestShare,
  sweepExpiredGuestShares,
  type ShareRow,
} from "@/lib/workspaces/store";
import { utcDay } from "@/lib/ai/limits";
import {
  BUNDLE_CONTENT_TYPE,
  type CreateShareResponse,
} from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) return json({ error: "Sharing isn't configured yet." }, 503);

  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to list your shares." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const tier = resolveTier(session.user, env);
  const state = await loadLiveUserState(
    env,
    bucket,
    session.user.id,
    tier,
    Date.now(),
    ctx?.waitUntil ? (p) => ctx.waitUntil(p) : undefined,
  );
  return json({
    shares: state.shares.map(shareRowToMeta),
    usage: state.usage,
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) return json({ error: "Sharing isn't configured yet." }, 503);

  // Session is OPTIONAL: guests can share too (with tighter limits below).
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (session?.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const nowMs = Date.now();
  const user = session?.user ?? null;
  const tier = user ? resolveTier(user, env) : "free";
  const maxItemBytes = user
    ? limitsForTier(tier).maxItemBytes
    : GUEST_SHARE_MAX_BYTES;

  // Guest budget gate BEFORE buffering the upload, a rate-limited guest
  // shouldn't cost a multi-MB body read. The reservation is an atomic
  // check-and-increment, so concurrent requests can't slip past the caps;
  // a slot is consumed even if the upload later fails (fail-closed).
  let isGuest = false;
  if (!user) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const ipHash = await hashIp(ip, env.BETTER_AUTH_SECRET ?? "dataslope");
    const day = utcDay(nowMs);
    const decision = await reserveGuestShare(env, ipHash, day, {
      perIp: GUEST_SHARES_PER_IP_PER_DAY,
      global: GUEST_SHARES_GLOBAL_PER_DAY,
    });
    if (!decision.ok) return json({ error: decision.message }, 429);
    isGuest = true;
  }

  const parsed = await readBundleUpload(request, maxItemBytes);
  if (!parsed.ok) return json({ error: parsed.message }, parsed.status);
  const { upload } = parsed;

  let expiresAt: string | null = null;

  if (user) {
    // Member path: shares live in the same quota pool as cloud saves.
    const limits = limitsForTier(tier);
    const state = await loadLiveUserState(
      env,
      bucket,
      user.id,
      tier,
      nowMs,
      ctx?.waitUntil ? (p) => ctx.waitUntil(p) : undefined,
    );
    if (state.usage.shareCount >= limits.maxShares) {
      return json(
        {
          error: `You've reached the limit of ${limits.maxShares} share links. Revoke one from your account page to create another.`,
        },
        403,
      );
    }
    if (state.usage.bytesUsed + upload.bytes.byteLength > limits.totalBytes) {
      return json(
        {
          error:
            tier === "pro"
              ? "This share would exceed your 10 GB cloud storage quota."
              : "This share would exceed your 100 MB cloud storage quota. Free up space or upgrade to Pro for 10 GB.",
        },
        403,
      );
    }
  } else if (isGuest) {
    // Guest path: fixed link TTL (the daily counters were reserved above).
    expiresAt = guestShareExpiryIso(nowMs);

    // Guest shares are the only rows nobody ever lists, so their expired
    // remains are swept here, amortized over new share creations.
    const sweep = sweepExpiredGuestShares(
      env,
      bucket,
      new Date(nowMs).toISOString(),
    ).catch((err) => console.error("shares: guest sweep failed", err));
    if (ctx?.waitUntil) ctx.waitUntil(sweep);
  }

  const shareId = newShareId();
  const key = shareObjectKey(shareId);
  await bucket.put(key, upload.bytes, {
    httpMetadata: { contentType: BUNDLE_CONTENT_TYPE },
  });

  const nowIso = new Date(nowMs).toISOString();
  const row: ShareRow = {
    id: shareId,
    user_id: user?.id ?? null,
    name: upload.name,
    playground: upload.playground,
    size_bytes: upload.bytes.byteLength,
    manifest: upload.manifestJson,
    r2_key: key,
    created_at: nowIso,
    last_viewed_at: nowIso,
    expires_at: expiresAt,
  };
  await insertShareRow(env, row);

  const origin = new URL(request.url).origin;
  return json({
    share: shareRowToMeta(row),
    url: `${origin}/s/${shareId}`,
  } satisfies CreateShareResponse);
}
