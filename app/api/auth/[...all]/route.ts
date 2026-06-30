/**
 * Better Auth catch-all handler — serves every `/api/auth/*` endpoint
 * (sign-in, OAuth callbacks, session, sign-out, …).
 *
 * The Better Auth instance is built per request (`createAuth(env, request)`)
 * because the D1 binding only exists at request time and must not be shared
 * across requests on the Workers runtime (see lib/auth/server.ts). The request
 * is passed through so the admin plugin can resolve `ADMIN_EMAILS` → user ids
 * against D1 only on its own endpoints. `getCloudflareContext()` surfaces the
 * binding inside the handler.
 *
 * `force-dynamic` keeps these endpoints off the incremental cache — they set
 * cookies and read D1, so they must run on every request, never be prerendered.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

async function handler(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  return auth.handler(request);
}

export { handler as GET, handler as POST };
