"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "../_components/Link";
import { signOut, useSession } from "@/lib/auth/client";

/**
 * The account area is the canonical example of the report's rule: auth gates
 * *actions/areas*, never *content*. This page is personalized and so is read
 * client-side from the session — it does not turn any lesson dynamic.
 */
export function AccountClient() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return (
      <p className="text-center text-sm text-[var(--ds-gray-500)]">Loading…</p>
    );
  }

  // Not signed in: prompt rather than redirect, so a shared/bookmarked link
  // lands somewhere intelligible.
  if (!session) {
    return (
      <div className="text-center">
        <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
          Sign in to view your account.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { user } = session;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.refresh();
    setSigningOut(false);
  }

  return (
    <div className="rounded-2xl border border-[var(--ds-gray-200)] bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            aria-hidden="true"
            className="size-14 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-[var(--ds-blue-600)] text-xl font-semibold text-white"
          >
            {(user.name?.trim()?.[0] ?? "?").toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-[var(--ds-gray-900)] dark:text-white">
            {user.name}
          </div>
          <div className="truncate text-sm text-[var(--ds-gray-500)]">
            {user.email}
          </div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-[var(--ds-gray-200)] pt-6 text-sm dark:border-white/10">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ds-gray-500)]">Plan</dt>
          <dd className="font-medium text-[var(--ds-gray-900)] dark:text-white">
            Free
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ds-gray-500)]">Email verified</dt>
          <dd className="font-medium text-[var(--ds-gray-900)] dark:text-white">
            {user.emailVerified ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[var(--ds-gray-200)] px-4 py-2.5 text-sm font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
