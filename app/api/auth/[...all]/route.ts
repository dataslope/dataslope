/**
 * Better Auth catch-all handler — serves every `/api/auth/*` endpoint
 * (sign-in, OAuth callbacks, session, sign-out, …).
 *
 * The Better Auth instance is built per request (`createAuth(env)`) because the
 * D1 binding only exists at request time and must not be shared across requests
 * on the Workers runtime (see lib/auth/server.ts). `getCloudflareContext()`
 * surfaces that binding inside the handler.
 *
 * `force-dynamic` keeps these endpoints off the incremental cache — they set
 * cookies and read D1, so they must run on every request, never be prerendered.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

function handler(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  return createAuth(env).handler(request);
}

export { handler as GET, handler as POST };
