"use client";

/**
 * Browser-side Better Auth client.
 *
 * Used to read the session *client-side* and to start/stop sign-in — this is
 * what lets `/learn` and every other page stay statically prerendered: the
 * server renders the same anonymous HTML for everyone, and the UI personalizes
 * after hydration via `useSession()`. The auth API itself lives at
 * `/api/auth/*` (same origin), which `createAuthClient` targets by default, so
 * no `baseURL` is needed here.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
