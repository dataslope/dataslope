"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { isSessionUnavailable, signOut, useSession } from "@/lib/auth/client";
import { SessionUnavailable } from "@/app/_components/auth/SessionUnavailable";
import { effectivePlan, planLabel, type PlanUser } from "@/lib/plan";
import {
  type CheckoutPeriod,
  openBillingPortal,
  startProCheckout,
  takeCheckoutPeriod,
  waitForProActivation,
} from "@/app/_components/billing/proCheckout";
import { CloudStorageSection } from "./CloudStorageSection";
import { ConnectedAccountsSection } from "./ConnectedAccountsSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { GuestAccount } from "./GuestAccount";

/**
 * Account page, read client-side from the session. Plan comes off
 * `user.plan` (flipped by the Polar webhook): free members get an Upgrade
 * button, Pro members the billing portal. Returning from checkout
 * (`?checkout=success`) polls until the webhook's plan flip is visible.
 */
/** Nothing to subscribe to: the value only differs between server and client. */
const noSubscribe = () => () => {};

export function AccountClient() {
  const { data: session, isPending, error: sessionError } = useSession();
  /**
   * False on the server and during hydration, true after. The session can
   * settle before React hydrates (a fast or failed `get-session`), so the
   * first client render would show the guest or profile card where the
   * server rendered the loading card, and React would throw the markup away.
   * Holding the loading card until hydration has finished keeps the two in
   * step.
   */
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  // "idle" → not returning from checkout; "waiting" → polling for the
  // webhook's plan flip; "slow" → gave up polling (it'll show up shortly).
  const [activation, setActivation] = useState<"idle" | "waiting" | "slow">(
    "idle",
  );
  // Billing period stashed on the pricing page while signed out; the Upgrade
  // button must honor the original choice.
  const [period, setPeriod] = useState<CheckoutPeriod>("monthly");

  useEffect(() => {
    const stashed = takeCheckoutPeriod();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage only exists client-side
    if (stashed) setPeriod(stashed);
  }, []);

  // Detect the checkout return via window.location (not useSearchParams, so
  // the page keeps prerendering statically). Require the exact value Polar
  // sends: a hand-typed `?checkout=` must not flash "payment received".
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
        window.location.replace("/dashboard/account");
      } else {
        setActivation("slow");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The session resolves on the client, so hold the profile card's place
  // rather than printing "Loading…" and then pushing the page down.
  if (isPending || !hydrated) {
    return (
      <div
        role="status"
        aria-label="Loading your account"
        className="rounded-2xl p-6"
        style={{ background: "var(--panel)" }}
      >
        <div className="ds-pulse flex items-center gap-4" aria-hidden="true">
          <span className="size-14 shrink-0 rounded-full" style={{ background: "var(--panel-hover)" }} />
          <div className="flex-1">
            <span className="block h-4 w-40 rounded" style={{ background: "var(--panel-hover)" }} />
            <span className="mt-2 block h-3 w-56 max-w-full rounded" style={{ background: "var(--panel-hover)" }} />
          </div>
        </div>
      </div>
    );
  }

  // The session read failed: we do not know who this is, so neither the guest
  // pitch nor a sign-in prompt is honest. Offer a retry.
  if (!session && isSessionUnavailable(sessionError)) {
    return (
      <div className="rounded-2xl p-6" style={{ background: "var(--panel)" }}>
        <SessionUnavailable />
      </div>
    );
  }

  // Not signed in: explain what an account adds rather than redirect, so a
  // shared or bookmarked link lands somewhere intelligible.
  if (!session) return <GuestAccount />;

  const { user } = session;
  // `plan` is a server-defined additional field, not on the client's user
  // type. Admins are treated as Pro everywhere (lib/plan.ts).
  const plan = ((user as PlanUser).plan ?? "free").toLowerCase();
  const isPro = effectivePlan(user as PlanUser) === "pro";

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
    <div className="rounded-2xl p-6" style={{ background: "var(--panel)" }}>
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

      <dl
        className="mt-6 grid grid-cols-1 gap-3 pt-6 text-sm"
        style={{ borderTop: "1px solid var(--divider)" }}
      >
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--ds-gray-500)]">Plan</dt>
          <dd className="font-medium text-[var(--ds-gray-900)] dark:text-white">
            {planLabel(user as PlanUser)}
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

    <ConnectedAccountsSection />

    <CloudStorageSection />

    {/* `plan === "pro"` (not admin-as-Pro) is what carries a real Polar
        subscription to warn about. */}
    <DeleteAccountSection email={user.email} isPaidPro={plan === "pro"} />
    </>
  );
}
