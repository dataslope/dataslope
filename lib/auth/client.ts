"use client";

/**
 * Browser-side Better Auth client.
 *
 * Used to read the session *client-side* and to start/stop sign-in, this is
 * what lets `/learn` and every other page stay statically prerendered: the
 * server renders the same anonymous HTML for everyone, and the UI personalizes
 * after hydration via `useSession()`. The auth API itself lives at
 * `/api/auth/*` (same origin), which `createAuthClient` targets by default, so
 * no `baseURL` is needed here.
 */
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Mirrors the server-side `admin` plugin (lib/auth/server.ts): adds the
  // `admin.*` actions (listUsers / removeUser / banUser / …) used by the
  // /admin dashboard and the `role`/`banned` fields on the session user.
  plugins: [adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  // Connected sign-in methods, surfaced on the account page: list the user's
  // linked providers, attach another (OAuth redirect), or detach one. These hit
  // Better Auth's built-in /api/auth/{list-accounts,link-social,unlink-account}
  // endpoints, already served by the catch-all handler, so no server code is
  // added. Better Auth refuses to unlink a user's only account (lockout guard).
  listAccounts,
  linkSocial,
  unlinkAccount,
  // Self-service account deletion (the account page's danger zone). Hits Better
  // Auth's /api/auth/delete-user; server-side (lib/auth/server.ts) this cleans
  // up the user's R2 objects and, when a mailer is configured, requires an
  // emailed confirmation link before the row is actually removed.
  deleteUser,
} = authClient;
