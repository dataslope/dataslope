/**
 * One cloud-saved workspace.
 *
 * PUT    /api/workspaces/:id — create or replace the save ("push"). Multipart:
 *                              `meta` JSON ({ name, playground, manifest }) +
 *                              `bundle` (gzipped JSON, lib/workspaces/types.ts).
 * GET    /api/workspaces/:id — metadata row.
 * DELETE /api/workspaces/:id — remove the save (R2 object first, then row).
 *
 * The row key is (user id, workspace id): the id is the client-generated
 * ws_… id, so the same workspace pairs with its cloud copy by id equality on
 * every device, and ids can never collide across accounts. All verbs are
 * owner-only; sessions are read with the cookie cache bypassed because these
 * are storage mutations gated by plan quotas.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import {
  isSameOrigin,
  json,
  loadLiveUserState,
  readBundleUpload,
  workspaceRowToMeta,
  workspacesBucket,
} from "@/lib/workspaces/server";
import {
  isExpired,
  isValidWorkspaceId,
  limitsForTier,
  workspaceObjectKey,
} from "@/lib/workspaces/policy";
import {
  deleteWorkspaces,
  getWorkspaceRow,
  upsertWorkspaceRow,
  type WorkspaceRow,
} from "@/lib/workspaces/store";
import { BUNDLE_CONTENT_TYPE } from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireOwner(request: Request, fresh: boolean) {
  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) {
    return {
      ok: false as const,
      response: json({ error: "Cloud saves aren't configured yet." }, 503),
    };
  }
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    ...(fresh ? { query: { disableCookieCache: true } } : {}),
  });
  if (!session) {
    return {
      ok: false as const,
      response: json({ error: "Sign in to use cloud saves." }, 401),
    };
  }
  if (session.user.banned) {
    return {
      ok: false as const,
      response: json({ error: "This account is suspended." }, 403),
    };
  }
  return { ok: true as const, env, ctx, bucket, user: session.user };
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  if (!isValidWorkspaceId(id)) return json({ error: "Not found." }, 404);
  const gate = await requireOwner(request, false);
  if (!gate.ok) return gate.response;
  const { env, ctx, bucket, user } = gate;

  const row = await getWorkspaceRow(env, user.id, id);
  if (!row) return json({ error: "Not found." }, 404);

  const tier = resolveTier(user, env);
  if (
    isExpired({ tier, lastActiveAt: row.last_used_at, nowMs: Date.now() })
  ) {
    const purge = deleteWorkspaces(env, bucket, user.id, [row]).catch((err) =>
      console.error("workspaces: purge failed", err),
    );
    if (ctx?.waitUntil) ctx.waitUntil(purge);
    return json({ error: "Not found." }, 404);
  }

  return json({ workspace: workspaceRowToMeta(row) });
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidWorkspaceId(id)) {
    return json({ error: "Invalid workspace id." }, 400);
  }
  const gate = await requireOwner(request, true);
  if (!gate.ok) return gate.response;
  const { env, ctx, bucket, user } = gate;

  const tier = resolveTier(user, env);
  const limits = limitsForTier(tier);

  const parsed = await readBundleUpload(request, limits.maxItemBytes);
  if (!parsed.ok) return json({ error: parsed.message }, parsed.status);
  const { upload } = parsed;

  // Quota check against the *live* footprint (expired rows purge here too, so
  // freeing space is as simple as letting old drafts age out). The workspace
  // being written is excluded from the purge — its background delete targets
  // the same R2 key this PUT is about to write.
  const nowMs = Date.now();
  const state = await loadLiveUserState(
    env,
    bucket,
    user.id,
    tier,
    nowMs,
    ctx?.waitUntil ? (p) => ctx.waitUntil(p) : undefined,
    { skipPurgeOfWorkspaceId: id },
  );
  const existing = state.workspaces.find((w) => w.id === id);
  if (!existing && state.usage.workspaceCount >= limits.maxWorkspaces) {
    return json(
      {
        error: `You've reached the limit of ${limits.maxWorkspaces} cloud workspaces. Delete one to save another.`,
      },
      403,
    );
  }
  const nextTotal =
    state.usage.bytesUsed - (existing?.size_bytes ?? 0) + upload.bytes.byteLength;
  if (nextTotal > limits.totalBytes) {
    return json(
      {
        error:
          tier === "pro"
            ? "This save would exceed your 10 GB cloud storage quota."
            : "This save would exceed your 100 MB cloud storage quota. Free up space or upgrade to Pro for 10 GB.",
      },
      403,
    );
  }

  const key = workspaceObjectKey(user.id, id);
  await bucket.put(key, upload.bytes, {
    httpMetadata: { contentType: BUNDLE_CONTENT_TYPE },
  });

  const nowIso = new Date(nowMs).toISOString();
  const row: WorkspaceRow = {
    user_id: user.id,
    id,
    name: upload.name,
    playground: upload.playground,
    size_bytes: upload.bytes.byteLength,
    manifest: upload.manifestJson,
    r2_key: key,
    created_at: existing?.created_at ?? nowIso,
    updated_at: nowIso,
    last_used_at: nowIso,
  };
  await upsertWorkspaceRow(env, row);

  return json({ workspace: workspaceRowToMeta(row) });
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidWorkspaceId(id)) return json({ error: "Not found." }, 404);
  const gate = await requireOwner(request, true);
  if (!gate.ok) return gate.response;
  const { env, bucket, user } = gate;

  const row = await getWorkspaceRow(env, user.id, id);
  if (!row) return json({ error: "Not found." }, 404);
  await deleteWorkspaces(env, bucket, user.id, [row]);
  return json({ ok: true });
}
