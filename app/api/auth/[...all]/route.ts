/**
 * Better Auth catch-all handler for every `/api/auth/*` endpoint. The
 * instance is built per request (`createAuth(env, request)`): the D1 binding
 * only exists at request time and must not be shared across requests on the
 * Workers runtime (see lib/auth/server.ts). `force-dynamic` — these set
 * cookies and read D1, so they must never be prerendered.
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
