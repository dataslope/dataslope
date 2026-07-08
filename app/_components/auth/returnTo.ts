"use client";

/**
 * "Return to where you were" support for the sign-in flow.
 *
 * Every sign-in entry point (header button, Ask AI CTA, workspace badge,
 * pricing upsell, …) used to dump the user on /account after
 * authenticating. The fix has two halves:
 *
 *   1. `ReturnToTracker` (mounted once in the root layout) records the
 *      last non-auth page the user visited in sessionStorage. It relies
 *      on `usePathname`, so it sees BOTH full page loads and client-side
 *      navigations — `document.referrer` misses the latter entirely.
 *   2. The sign-in page resolves its post-auth destination as:
 *      explicit `?next=` param → tracked page → `/account`.
 *
 * sessionStorage is deliberate: it is per-tab (two tabs signing in
 * return to their own pages) and doesn't outlive the browsing session.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "ds:sign-in-return-to";

/** Pages that must never be a post-sign-in destination: bouncing back
 *  into the auth flow would loop, and the reset page is single-use. */
const AUTH_PATHS = ["/sign-in", "/reset-password"];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** True for the internal, non-auth relative paths we're willing to
 *  redirect to after sign-in. Rejects absolute/protocol-relative URLs
 *  (`https://…`, `//evil.example`) so a crafted ?next= can't bounce the
 *  user off-site. */
export function isSafeReturnPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !isAuthPath(path)
  );
}

/** The tracked "last page before sign-in", or null. */
export function readReturnTo(): string | null {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return isSafeReturnPath(stored) ? stored : null;
  } catch {
    return null; // private mode — fall back to the default destination
  }
}

/**
 * Invisible tracker mounted once in the root layout. Records the
 * current page (path + query + hash) on every route change, skipping
 * the auth pages themselves so landing on /sign-in doesn't overwrite
 * the page the user came from.
 */
export function ReturnToTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || isAuthPath(pathname)) return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        `${pathname}${window.location.search}${window.location.hash}`,
      );
    } catch {
      /* private mode / quota — sign-in falls back to /account. */
    }
  }, [pathname]);
  return null;
}
