/**
 * Polar billing for the Pro plan (merchant of record — Polar is the seller,
 * handles global VAT/sales tax, and pays out; we never touch card data).
 *
 * Built on the official Better Auth plugin (@polar-sh/better-auth), which
 * mounts three endpoints under the existing /api/auth/* catch-all:
 *
 *   POST /api/auth/checkout          — creates a Polar checkout session for
 *                                      the signed-in user (slug "pro") and
 *                                      returns its URL; the client redirects.
 *   GET|POST /api/auth/customer/portal — customer portal URL (invoices,
 *                                      cancel/renew) for the signed-in user.
 *   POST /api/auth/polar/webhooks    — Polar → us. Signature-verified
 *                                      (standardwebhooks HMAC, pure-JS crypto
 *                                      → Workers-safe); this is the ONLY
 *                                      writer that flips `user.plan` from
 *                                      billing.
 *
 * The link between the two systems is Better Auth's user id: checkout is
 * created with `externalCustomerId = user.id` (done by the plugin), so every
 * webhook's customer carries `externalId = user.id` and plan updates are one
 * indexed D1 UPDATE. No extra tables, no schema change — `user.plan` +
 * lib/ai/tier.ts already treat the column as the source of truth, exactly as
 * the "future billing webhook" comments in migrations/0003 anticipated.
 *
 * We deliberately key everything off the `customer.state_changed` event: it
 * fires on every subscription transition (created, renewed, canceled at
 * period end, revoked, past-due grace expiry) and carries the FULL current
 * state, so plan derivation is a pure function of the latest event — no
 * event-ordering bookkeeping. An admin's manual plan switch for a paying
 * customer is therefore overwritten by the next state event, which is the
 * correct precedence (billing owns paid status).
 *
 * Config (all optional — billing is inert until set, matching how social
 * login / email / AI degrade):
 *   POLAR_ACCESS_TOKEN   secret — org access token (sandbox or production).
 *   POLAR_WEBHOOK_SECRET secret — from the webhook endpoint you create in
 *                        Polar pointing at /api/auth/polar/webhooks.
 *   POLAR_PRO_PRODUCT_ID var    — the Polar product that grants Pro.
 *   POLAR_SERVER         var    — "sandbox" while testing; anything else
 *                        (including unset) means production.
 */
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

/** Slugs the client passes to POST /api/auth/checkout to buy Pro. Monthly is
 *  the required product; annual is optional (see POLAR_PRO_ANNUAL_PRODUCT_ID). */
export const PRO_PRODUCT_SLUG = "pro";
export const PRO_ANNUAL_PRODUCT_SLUG = "pro-annual";

/** Where Polar sends the buyer after a completed checkout. The account page
 *  sees `?checkout=success` and polls the session (cookie-cache bypassed)
 *  until the webhook has landed the plan flip. */
export const CHECKOUT_SUCCESS_URL = "/account?checkout=success";

/** The slice of Polar's CustomerState that plan derivation reads. The SDK's
 *  parsed CustomerState is structurally assignable to this. */
export interface CustomerStateLike {
  externalId?: string | null;
  activeSubscriptions?: { productId: string }[] | null;
}

/**
 * Pure plan derivation from a customer-state snapshot: Pro while any active
 * subscription is for one of the configured Pro products (monthly/annual).
 * With no product ids configured, any active subscription counts (Pro is the
 * only thing we sell); an empty/absent list is always free.
 */
export function derivePlanFromCustomerState(
  state: CustomerStateLike,
  proProductIds: readonly string[],
): "free" | "pro" {
  const subs = state.activeSubscriptions ?? [];
  if (subs.length === 0) return "free";
  if (proProductIds.length === 0) return "pro";
  return subs.some((s) => proProductIds.includes(s.productId))
    ? "pro"
    : "free";
}

/** The configured Pro product ids (monthly required, annual optional). */
function proProductIds(env: CloudflareEnv): string[] {
  return [env.POLAR_PRO_PRODUCT_ID, env.POLAR_PRO_ANNUAL_PRODUCT_ID].filter(
    (id): id is string => Boolean(id),
  );
}

/** Apply one customer-state snapshot to the user's `plan` column. Customers
 *  without an externalId were not created through our checkout — nothing to
 *  update. */
export async function applyCustomerState(
  env: CloudflareEnv,
  state: CustomerStateLike,
): Promise<void> {
  const userId = state.externalId;
  if (!userId) return;
  const plan = derivePlanFromCustomerState(state, proProductIds(env));
  await env.DB.prepare("UPDATE user SET plan = ? WHERE id = ?")
    .bind(plan, userId)
    .run();
}

/**
 * Build the Polar Better Auth plugin for this request, or null when billing
 * isn't configured (token + product id are the minimum for checkout). The
 * webhook endpoint additionally needs its secret; until that's set the
 * endpoint isn't mounted at all, so a misconfigured half rejects loudly
 * (404) rather than accepting unverified payloads.
 */
export function polarPlugin(env: CloudflareEnv) {
  if (!env.POLAR_ACCESS_TOKEN || !env.POLAR_PRO_PRODUCT_ID) return null;

  const client = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
  });

  const checkoutPlugin = checkout({
    products: [
      { productId: env.POLAR_PRO_PRODUCT_ID, slug: PRO_PRODUCT_SLUG },
      ...(env.POLAR_PRO_ANNUAL_PRODUCT_ID
        ? [
            {
              productId: env.POLAR_PRO_ANNUAL_PRODUCT_ID,
              slug: PRO_ANNUAL_PRODUCT_SLUG,
            },
          ]
        : []),
    ],
    successUrl: CHECKOUT_SUCCESS_URL,
    // The webhook maps customers to users via externalCustomerId, which only
    // exists for signed-in checkouts — so anonymous checkout is off.
    authenticatedUsersOnly: true,
  });
  // Portal return lands the user back on their account page.
  const portalPlugin = portal({ returnUrl: undefined });

  // Customer creation happens lazily at first checkout (the plugin passes
  // externalCustomerId), NOT on sign-up: createCustomerOnSignUp would put a
  // Polar API round-trip — and Polar availability — on the sign-up path.
  if (env.POLAR_WEBHOOK_SECRET) {
    return polar({
      client,
      createCustomerOnSignUp: false,
      use: [
        checkoutPlugin,
        portalPlugin,
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onCustomerStateChanged: async (payload) => {
            await applyCustomerState(env, payload.data);
          },
        }),
      ],
    });
  }
  return polar({
    client,
    createCustomerOnSignUp: false,
    use: [checkoutPlugin, portalPlugin],
  });
}
