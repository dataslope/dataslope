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
  // Connected sign-in methods (account page): list/link/unlink providers via
  // Better Auth's built-in endpoints. Better Auth refuses to unlink a user's
  // only account (lockout guard).
  listAccounts,
  linkSocial,
  unlinkAccount,
  // Self-service account deletion; server-side cleanup + confirmation rules
  // in lib/auth/server.ts.
  deleteUser,
} = authClient;
