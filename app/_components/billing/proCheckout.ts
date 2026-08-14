"use client";

/**
 * Client helpers for Polar billing (server side: lib/billing/polar.ts).
 * Deliberately NOT using @polar-sh/better-auth's `polarClient()` plugin — it
 * would pull @polar-sh/checkout into the shared auth-client bundle loaded by
 * every page; the hosted-checkout redirect is one `$fetch` call. Helpers
 * navigate away on success and return an error message on failure.
 */
import { authClient } from "@/lib/auth/client";

interface RedirectResponse {
  url: string;
  redirect: boolean;
}

/** Human message for the ways billing endpoints fail. A 404 means the Polar
 *  plugin isn't registered (billing not configured in this environment). */
function billingError(status: number | undefined, fallback: string): string {
  if (status === 404) return "Billing isn't configured yet.";
  if (status === 401) return "Please sign in first.";
  return fallback;
}

/**
 * Starts a Pro checkout: asks the server for a Polar checkout session and
 * redirects to Polar's hosted checkout, which returns the buyer to
 * /account?checkout=success.
 */
export async function startProCheckout(
  period: "monthly" | "annual" = "monthly",
): Promise<string | null> {
  try {
    const { data, error } = await authClient.$fetch<RedirectResponse>(
      "/checkout",
      {
        method: "POST",
        body: {
          slug: period === "annual" ? "pro-annual" : "pro",
          redirect: false,
        },
      },
    );
    if (error || !data?.url) {
      return billingError(
        error?.status,
        // A 400 here usually means the annual product isn't configured.
        "Couldn't start checkout. Please try again.",
      );
    }
    window.location.assign(data.url);
    return null;
  } catch (err) {
    // $fetch can throw (network failures) instead of returning {error}.
    const status = (err as { status?: number })?.status;
    return billingError(status, "Couldn't start checkout. Please try again.");
  }
}

/**
 * Opens Polar's customer portal. Only works for users with a Polar customer
 * record (i.e. been through checkout); comped/admin Pro users get an error.
 */
export async function openBillingPortal(): Promise<string | null> {
  try {
    const { data, error } = await authClient.$fetch<RedirectResponse>(
      "/customer/portal",
      {
        method: "POST",
        body: { redirect: false },
      },
    );
    if (error || !data?.url) {
      return billingError(
        error?.status,
        "Couldn't open the billing portal. Please try again.",
      );
    }
    window.location.assign(data.url);
    return null;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return billingError(
      status,
      "Couldn't open the billing portal. Please try again.",
    );
  }
}

/** sessionStorage key remembering the billing period a signed-out visitor
 *  picked on the pricing page before being detoured through /sign-in. */
const PENDING_PERIOD_KEY = "pending-checkout-period";

export type CheckoutPeriod = "monthly" | "annual";

/** Remember the chosen billing period across the sign-in detour. Same-tab
 *  only (sessionStorage), so a stashed choice can't leak into another
 *  visitor's session on a shared machine. */
export function stashCheckoutPeriod(period: CheckoutPeriod): void {
  try {
    sessionStorage.setItem(PENDING_PERIOD_KEY, period);
  } catch {
    // Storage unavailable, the buyer just defaults to monthly on /account.
  }
}

/** Read-and-clear the stashed billing period (single-use by design: it
 *  should only influence the immediately-following upgrade offer). */
export function takeCheckoutPeriod(): CheckoutPeriod | null {
  try {
    const value = sessionStorage.getItem(PENDING_PERIOD_KEY);
    sessionStorage.removeItem(PENDING_PERIOD_KEY);
    return value === "annual" || value === "monthly" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Polls the session (cookie cache bypassed) until the plan reads 'pro' or we
 * give up — the webhook's plan flip can land after the checkout redirect.
 * Returns true once Pro is active.
 */
export async function waitForProActivation(
  attempts = 10,
  intervalMs = 2000,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const { data } = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      const plan = (data?.user as { plan?: string } | undefined)?.plan;
      if ((plan ?? "").toLowerCase() === "pro") return true;
    } catch {
      // transient, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
