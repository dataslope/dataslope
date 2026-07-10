/**
 * Custom items (code challenges, SQL challenges, MCQs).
 *
 * POST /api/custom/items, create an item and mint its /c/<id> link. Works
 *   for BOTH signed-in members and guests, mirroring POST /api/shares:
 *   - members: counts against a per-tier item cap; the row never expires.
 *   - guests: fixed ~30-day expiry + per-IP and global daily creation
 *     budgets (salted-hash counters, no raw IPs stored).
 * GET /api/custom/items, list the signed-in member's items (metadata only,
 *   payloads are fetched per-item by the editor).
 *
 * JSON body: { kind: "code"|"sql"|"mcq", title, payload }, where `payload`
 * is the kind-specific document validated by lib/custom-content/schema.ts.
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
import {
  isCustomItemKind,
  normalizeCustomTitle,
  validateItemPayload,
} from "@/lib/custom-content/schema";
import {
  countItemRows,
  insertItemRow,
  itemRowToMeta,
  listItemRows,
  reserveGuestCustomContent,
  type CustomItemRow,
} from "@/lib/custom-content/store";

export const dynamic = "force-dynamic";

/** Request bodies are small JSON documents; refuse anything larger before
 *  parsing (the payload itself is re-measured after validation). */
const MAX_BODY_BYTES = 512 * 1024;

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to list your creations." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }
  const rows = await listItemRows(env, session.user.id);
  return json({ items: rows.map(itemRowToMeta) });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env } = getCloudflareContext();

  // Session is OPTIONAL: guests can create too (with tighter limits below).
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

  // Guest budget gate BEFORE reading the body (the reserveGuestShare
  // pattern): a rate-limited guest shouldn't cost a body parse. The
  // reservation is an atomic check-and-increment; a slot is consumed even
  // if validation later fails (fail-closed).
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
    const tier = resolveTier(user, env);
    const limits = customLimitsForTier(tier);
    const count = await countItemRows(env, user.id);
    if (count >= limits.maxItems) {
      return json(
        {
          error: `You've reached the limit of ${limits.maxItems} custom challenges. Delete one from the Create page to add another.`,
        },
        403,
      );
    }
  }

  const body = await readJsonBody(request);
  if (!body.ok) return json({ error: body.message }, 400);
  const { kind, title: rawTitle, payload: rawPayload } = body.value;

  if (!isCustomItemKind(kind)) {
    return json({ error: "Unknown item kind." }, 400);
  }
  const validated = validateItemPayload(kind, rawPayload);
  if (!validated.ok) return json({ error: validated.message }, 400);

  const nowIso = new Date(nowMs).toISOString();
  const row: CustomItemRow = {
    id: newCustomId(),
    user_id: user?.id ?? null,
    kind,
    title: normalizeCustomTitle(rawTitle, "Untitled"),
    payload: JSON.stringify(validated.payload),
    created_at: nowIso,
    updated_at: nowIso,
    expires_at: expiresAt,
  };
  await insertItemRow(env, row);

  const origin = new URL(request.url).origin;
  return json({
    item: itemRowToMeta(row),
    url: `${origin}/c/${row.id}`,
  });
}

interface ParsedBody {
  kind: unknown;
  title: unknown;
  payload: unknown;
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: ParsedBody } | { ok: false; message: string }> {
  const length = Number(request.headers.get("Content-Length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    return { ok: false, message: "The challenge is too large to save." };
  }
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return { ok: false, message: "The challenge is too large to save." };
    }
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, message: "Body must be a JSON object." };
    }
    const rec = parsed as Record<string, unknown>;
    return {
      ok: true,
      value: { kind: rec.kind, title: rec.title, payload: rec.payload },
    };
  } catch {
    return { ok: false, message: "Body must be valid JSON." };
  }
}
