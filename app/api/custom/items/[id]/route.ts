/**
 * One custom item.
 *
 * GET    /api/custom/items/:id, public: metadata + payload (used by the
 *          editor's prefill and the quiz-set builder's id lookup; the
 *          public /c/:id page reads D1 directly). Expired rows 404.
 * PUT    /api/custom/items/:id, owner only: update title + payload. The
 *          item's kind is fixed at creation.
 * DELETE /api/custom/items/:id, owner only. Guest items have no owner and
 *          age out on their fixed TTL.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { isSameOrigin, json } from "@/lib/workspaces/server";
import { isValidCustomId } from "@/lib/custom-content/policy";
import {
  normalizeCustomTitle,
  validateItemPayload,
} from "@/lib/custom-content/schema";
import {
  deleteItemRow,
  getLiveItemRow,
  parseItemPayload,
  updateItemRow,
} from "@/lib/custom-content/store";
import type { CustomItemView } from "@/lib/custom-content/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!isValidCustomId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const row = await getLiveItemRow(env, id, Date.now());
  if (!row) return json({ error: "Not found." }, 404);
  const payload = parseItemPayload(row.payload);
  if (!payload) return json({ error: "Not found." }, 404);

  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  const owned = !!session && !!row.user_id && session.user.id === row.user_id;

  const item: CustomItemView = {
    id: row.id,
    kind: row.kind,
    title: row.title,
    payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    owned,
  };
  return json({ item });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidCustomId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to edit this challenge." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const nowMs = Date.now();
  const row = await getLiveItemRow(env, id, nowMs);
  if (!row) return json({ error: "Not found." }, 404);
  if (!row.user_id || row.user_id !== session.user.id) {
    return json({ error: "Only the creator can edit this." }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be valid JSON." }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json({ error: "Body must be a JSON object." }, 400);
  }
  const rec = body as Record<string, unknown>;

  // Kind is immutable: the stored kind, not the client's, picks the
  // validator, so a payload can never be re-labelled across kinds.
  const validated = validateItemPayload(row.kind, rec.payload);
  if (!validated.ok) return json({ error: validated.message }, 400);

  const updated = await updateItemRow(env, session.user.id, id, {
    title: normalizeCustomTitle(rec.title, row.title),
    payload: JSON.stringify(validated.payload),
    updated_at: new Date(nowMs).toISOString(),
  });
  if (!updated) return json({ error: "Only the creator can edit this." }, 403);

  return json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidCustomId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to delete this." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const deleted = await deleteItemRow(env, session.user.id, id);
  if (!deleted) return json({ error: "Not found." }, 404);
  return json({ ok: true });
}
