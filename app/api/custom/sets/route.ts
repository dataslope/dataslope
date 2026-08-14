/**
 * Quiz sets (ordered collections of custom items). POST creates a set and
 * mints its /quiz/<id> link — same member/guest split as /api/custom/items,
 * sharing the same "ci:" guest counter pool. GET lists the member's sets.
 * Body: { title, description?, itemIds }; every id must resolve to a live
 * item at save time, so a typo'd id errors here rather than leaving a hole.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import { utcDay } from "@/lib/ai/limits";
import { isSameOrigin, json } from "@/lib/workspaces/server";
import { hashIp } from "@/lib/workspaces/store";
import {
  GUEST_CUSTOM_GLOBAL_PER_DAY,
  GUEST_CUSTOM_PER_IP_PER_DAY,
  customLimitsForTier,
  guestCustomExpiryIso,
  newCustomId,
} from "@/lib/custom-content/policy";
import { validateSetInput } from "@/lib/custom-content/schema";
import {
  countSetRows,
  getLiveItemRows,
  insertSetRow,
  listSetRows,
  reserveGuestCustomContent,
  setRowToMeta,
  type CustomSetRow,
} from "@/lib/custom-content/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to list your quiz sets." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }
  const rows = await listSetRows(env, session.user.id);
  return json({ sets: rows.map(setRowToMeta) });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env } = getCloudflareContext();

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

  let expiresAt: string | null = null;
  if (!user) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const ipHash = await hashIp(ip, env.BETTER_AUTH_SECRET ?? "dataslope");
    const decision = await reserveGuestCustomContent(env, ipHash, utcDay(nowMs), {
      perIp: GUEST_CUSTOM_PER_IP_PER_DAY,
      global: GUEST_CUSTOM_GLOBAL_PER_DAY,
    });
    if (!decision.ok) return json({ error: decision.message }, 429);
    expiresAt = guestCustomExpiryIso(nowMs);
  } else {
    const limits = customLimitsForTier(resolveTier(user, env));
    const count = await countSetRows(env, user.id);
    if (count >= limits.maxSets) {
      return json(
        {
          error: `You've reached the limit of ${limits.maxSets} quiz sets. Delete one from the Create page to add another.`,
        },
        403,
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be valid JSON." }, 400);
  }
  const validated = validateSetInput(body);
  if (!validated.ok) return json({ error: validated.message }, 400);
  const { title, description, itemIds } = validated.payload;

  const liveRows = await getLiveItemRows(env, itemIds, nowMs);
  if (liveRows.length !== itemIds.length) {
    const live = new Set(liveRows.map((r) => r.id));
    const missing = itemIds.filter((id) => !live.has(id));
    return json(
      {
        error: `These items don't exist (or have expired): ${missing.join(", ")}.`,
      },
      400,
    );
  }

  const nowIso = new Date(nowMs).toISOString();
  const row: CustomSetRow = {
    id: newCustomId(),
    user_id: user?.id ?? null,
    title,
    description,
    item_ids: JSON.stringify(itemIds),
    created_at: nowIso,
    updated_at: nowIso,
    expires_at: expiresAt,
  };
  await insertSetRow(env, row);

  const origin = new URL(request.url).origin;
  return json({
    set: setRowToMeta(row),
    url: `${origin}/quiz/${row.id}`,
  });
}
