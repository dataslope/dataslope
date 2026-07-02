/**
 * Admin authorization for custom `/api/admin/*` routes.
 *
 * Better Auth's own `admin.*` endpoints authorize themselves (the plugin in
 * lib/auth/server.ts), but routes we write by hand — e.g. the AI usage
 * report — need the same check. A user is an admin when ANY of these hold,
 * mirroring `resolveAdminUserIds` in lib/auth/server.ts:
 *   - their `role` column is 'admin' (set by an existing admin);
 *   - their email is in the ADMIN_EMAILS allowlist;
 *   - their id is in the ADMIN_USER_IDS allowlist.
 */
import { createAuth, parseList } from "./server";

interface AdminUserShape {
  id: string;
  email?: string | null;
  role?: string | null;
}

export function isAdminUser(user: AdminUserShape, env: CloudflareEnv): boolean {
  if ((user.role ?? "") === "admin") return true;
  const email = (user.email ?? "").toLowerCase();
  if (
    email &&
    parseList(env.ADMIN_EMAILS)
      .map((e) => e.toLowerCase())
      .includes(email)
  ) {
    return true;
  }
  return parseList(env.ADMIN_USER_IDS).includes(user.id);
}

export type AdminGate =
  | { ok: true; user: AdminUserShape }
  | { ok: false; status: 401 | 403; message: string };

/** Resolve the request's session and require an admin. 401 = no session,
 *  403 = signed in but not an admin. The cookie cache is bypassed so a
 *  demotion or ban takes effect immediately instead of after the cache's
 *  five-minute maxAge — matching Better Auth's own admin endpoints, which
 *  force an authoritative session read. Admin routes are rare, so the extra
 *  D1 read costs nothing that matters. */
export async function requireAdmin(
  env: CloudflareEnv,
  request: Request,
): Promise<AdminGate> {
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) {
    return { ok: false, status: 401, message: "Sign in required." };
  }
  const user = session.user as AdminUserShape;
  if (!isAdminUser(user, env)) {
    return { ok: false, status: 403, message: "Admin access required." };
  }
  return { ok: true, user };
}
