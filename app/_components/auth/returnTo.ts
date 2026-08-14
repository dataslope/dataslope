"use client";

/**
 * "Return to where you were" support for sign-in. `ReturnToTracker` (root
 * layout) records the last non-auth page in sessionStorage via `usePathname`
 * (which, unlike document.referrer, sees client-side navigations); the
 * sign-in page resolves its destination as `?next=` → tracked page →
 * /account. sessionStorage is deliberate: per-tab, doesn't outlive the
 * session.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "ds:sign-in-return-to";

/** Never post-sign-in destinations: auth pages loop, reset is single-use. */
const AUTH_PATHS = ["/sign-in", "/reset-password"];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** True for internal, non-auth relative paths. Rejects absolute and
 *  protocol-relative URLs so a crafted ?next= can't bounce the user off-site. */
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
    return null; // private mode, fall back to the default destination
  }
}

/**
 * Invisible tracker mounted once in the root layout: records the current
 * page on every route change, skipping auth pages so /sign-in doesn't
 * overwrite the page the user came from.
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
      /* private mode / quota, sign-in falls back to /account. */
    }
  }, [pathname]);
  return null;
}
