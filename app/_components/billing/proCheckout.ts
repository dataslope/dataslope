"use client";

/**
 * Client helpers for Polar billing (Pro subscriptions). Server side lives in
 * lib/billing/polar.ts, which mounts the endpoints these call under
 * /api/auth/*.
 *
 * Deliberately NOT using @polar-sh/better-auth's `polarClient()` plugin: its
 * only runtime action is the embedded checkout overlay, which would pull
 * @polar-sh/checkout into the shared auth-client bundle loaded by every page
 * (HomeNav reads the session everywhere). The hosted-checkout redirect flow
 * below is one `authClient.$fetch` call and adds nothing to the bundle.
 *
 * Both helpers navigate away on success and return an error message on
 * failure (null = navigating).
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
 * Start a Pro checkout for the signed-in user: asks the server for a Polar
 * checkout session (slug "pro", or "pro-annual" when annual billing is
 * requested and configured) and redirects the browser to Polar's hosted
 * checkout. Polar returns the buyer to /account?checkout=success, where the
 * plan flip (written by the webhook) is picked up.
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
    // $fetch can throw (network failures / configured-to-throw clients)
    // instead of returning {error} — either way the caller gets a message.
    const status = (err as { status?: number })?.status;
    return billingError(status, "Couldn't start checkout. Please try again.");
  }
}

/**
 * Open Polar's customer portal (invoices, payment method, cancel/renew) for
 * the signed-in user. Only works for users who actually have a Polar
 * customer record — i.e. they've been through checkout; comped/admin Pro
 * users get an error message instead.
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

/**
 * After returning from checkout, the webhook that flips `plan` to 'pro' can
 * land a moment after the redirect — and the session cookie cache can lag up
 * to five minutes on top. Poll the session with the cookie cache bypassed
 * (each poll also refreshes the cookie) until the plan reads 'pro' or we
 * give up. Returns true once Pro is active.
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
      // transient — keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
