"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "../_components/Link";
import { signOut, useSession } from "@/lib/auth/client";
import {
  type CheckoutPeriod,
  openBillingPortal,
  startProCheckout,
  takeCheckoutPeriod,
  waitForProActivation,
} from "../_components/billing/proCheckout";
import { CloudStorageSection } from "./CloudStorageSection";
import { ConnectedAccountsSection } from "./ConnectedAccountsSection";

/**
 * The account area is the canonical example of the report's rule: auth gates
 * *actions/areas*, never *content*. This page is personalized and so is read
 * client-side from the session, it does not turn any lesson dynamic.
 *
 * Membership: the plan comes off the session (`user.plan`, flipped by the
 * Polar webhook, lib/billing/polar.ts). Free members get an Upgrade button
 * (Polar hosted checkout); Pro members get the billing portal. Returning
 * from checkout (`?checkout=success`) polls the session with the cookie
 * cache bypassed until the webhook's plan flip is visible, then reloads.
 */
export function AccountClient() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  // "idle" → not returning from checkout; "waiting" → polling for the
  // webhook's plan flip; "slow" → gave up polling (it'll show up shortly).
  const [activation, setActivation] = useState<"idle" | "waiting" | "slow">(
    "idle",
  );
  // Billing period picked on the pricing page while signed out, the sign-in
  // detour lands here, and the Upgrade button must honor the original choice
  // (an annual pick must not silently become a monthly checkout).
  const [period, setPeriod] = useState<CheckoutPeriod>("monthly");

  useEffect(() => {
    const stashed = takeCheckoutPeriod();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage only exists client-side
    if (stashed) setPeriod(stashed);
  }, []);

  // Detect the checkout return via window.location (not useSearchParams, so
  // the page keeps prerendering statically without a Suspense boundary).
  // Require the exact value Polar sends (lib/billing/polar.ts), a stale or
  // hand-typed `?checkout=` must not flash a "payment received" notice.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("checkout");
    if (value !== "success") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- driven by the URL, which only exists client-side
    setActivation("waiting");
    let cancelled = false;
    void waitForProActivation().then((activated) => {
      if (cancelled) return;
      if (activated) {
        // Session cookie now carries the new plan, reload with a clean URL.
        window.location.replace("/account");
      } else {
        setActivation("slow");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
  // `plan` is a server-defined additional field, not on the client's user
  // type. Admins are treated as Pro everywhere (lib/ai/tier.ts), reflect
  // that here rather than offering them a pointless upgrade.
  const plan = ((user as { plan?: string }).plan ?? "free").toLowerCase();
  const isAdmin = (user as { role?: string }).role === "admin";
  const isPro = plan === "pro" || isAdmin;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.refresh();
    } catch {
      // Network failure, leave the session as-is; the button re-enables.
    }
    setSigningOut(false);
  }

  async function handleUpgrade() {
    setBillingBusy(true);
    setBillingError(null);
    const error = await startProCheckout(period);
    // On success the browser navigates to Polar; we only get here on failure.
    if (error) setBillingError(error);
    setBillingBusy(false);
  }

  async function handlePortal() {
    setBillingBusy(true);
    setBillingError(null);
    const error = await openBillingPortal();
    if (error) setBillingError(error);
    setBillingBusy(false);
  }

  return (
    <>
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
            {isPro ? (plan === "pro" ? "Pro" : "Pro (admin)") : "Free"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ds-gray-500)]">Email verified</dt>
          <dd className="font-medium text-[var(--ds-gray-900)] dark:text-white">
            {user.emailVerified ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      {activation !== "idle" && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-[var(--ds-blue-600)]/10 px-4 py-3 text-sm text-[var(--ds-blue-600)]"
        >
          {activation === "waiting"
            ? "Thanks for upgrading! Finalizing your Pro membership…"
            : "Payment received, your Pro membership will be active within a few minutes. Feel free to keep browsing."}
        </p>
      )}

      {billingError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-500/[0.08] px-4 py-3 text-sm text-red-700 dark:bg-red-500/[0.12] dark:text-red-300"
        >
          {billingError}
        </p>
      )}

      {!isPro && activation === "idle" && (
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={billingBusy}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)] disabled:opacity-60"
        >
          {billingBusy
            ? "Opening checkout…"
            : period === "annual"
              ? "Upgrade to Pro, $40/year"
              : "Upgrade to Pro, $4.99/month"}
        </button>
      )}

      {plan === "pro" && (
        <button
          type="button"
          onClick={handlePortal}
          disabled={billingBusy}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[var(--ds-gray-200)] px-4 py-2.5 text-sm font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        >
          {billingBusy ? "Opening…" : "Manage subscription"}
        </button>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[var(--ds-gray-200)] px-4 py-2.5 text-sm font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>

    {/* Connected sign-in methods (Google / GitHub), plus the guard against
        removing a user's only way back in. */}
    <ConnectedAccountsSection />

    {/* Cloud saves + share links (all playgrounds), the quota is
        account-wide, so this is where users see and free up everything. */}
    <CloudStorageSection />
    </>
  );
}
