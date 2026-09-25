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
import { forgetProgressOwner } from "@/lib/challenges/progress";

/** Session reads that failed on the server's side rather than ours. */
function isRetryableSessionResponse(response: Response | null): boolean {
  if (!response) return false;
  const transient = response.status >= 500 || response.status === 429;
  if (!transient) return false;
  try {
    return new URL(response.url).pathname.endsWith("/get-session");
  } catch {
    return false;
  }
}

export const authClient = createAuthClient({
  // Mirrors the server-side `admin` plugin (lib/auth/server.ts): adds the
  // `admin.*` actions (listUsers / removeUser / banUser / …) used by the
  // /admin dashboard and the `role`/`banned` fields on the session user.
  plugins: [adminClient()],
  fetchOptions: {
    // A 503 from get-session (a D1 hiccup or a cold isolate) used to settle
    // the shared session atom as "signed out" for the rest of the page: the
    // Studio sidebar dropped the Admin group and the user footer, and admin
    // pages sat on their loading note. Retry just that read, a few times with
    // backoff. Only get-session: a sign-in or sign-out POST is not ours to
    // repeat behind the user's back.
    retry: {
      type: "exponential",
      attempts: 3,
      baseDelay: 400,
      maxDelay: 3_000,
      shouldRetry: isRetryableSessionResponse,
    },
  },
});

/**
 * True when the session could not be read, as opposed to being read and
 * found empty. A 401 is a real "signed out"; anything else (a 5xx that
 * outlived the retries above, a network failure) means we do not know, and
 * the page should offer a retry instead of a sign-in prompt or a spinner.
 */
export function isSessionUnavailable(error: unknown): boolean {
  if (!error) return false;
  const status = (error as { status?: unknown }).status;
  return status !== 401;
}

export const {
  signIn,
  signUp,
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

/**
 * Sign out, and stop showing the signed-in learner's challenge progress in
 * this browser straight away. Every sign-out button goes through here, so a
 * shared computer never opens the next person's challenge page on the
 * previous learner's solved list or saved code (lib/challenges/progress.ts).
 */
export const signOut: typeof authClient.signOut = ((
  ...args: Parameters<typeof authClient.signOut>
) => {
  forgetProgressOwner();
  return authClient.signOut(...args);
}) as typeof authClient.signOut;
