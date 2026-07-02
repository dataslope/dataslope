/**
 * Cloud-saved workspaces — list endpoint.
 *
 * GET /api/workspaces → { workspaces: CloudWorkspaceMeta[], usage: CloudUsage }
 *
 * Signed-in users only (cloud saves require an account; sharing does not —
 * see /api/shares). Retention is evaluated at read time: rows the policy
 * says are expired are never returned and are purged in the background
 * (lib/workspaces/server.ts loadLiveUserState).
 *
 * `force-dynamic` like every session-reading route (app/api/ai/*).
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import {
  json,
  loadLiveUserState,
  workspaceRowToMeta,
  workspacesBucket,
} from "@/lib/workspaces/server";
import type { CloudWorkspaceList } from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) {
    return json({ error: "Cloud saves aren't configured yet." }, 503);
  }

  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ error: "Sign in to use cloud saves." }, 401);
  }
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
    workspaces: state.workspaces.map(workspaceRowToMeta),
    usage: state.usage,
  } satisfies CloudWorkspaceList);
}
