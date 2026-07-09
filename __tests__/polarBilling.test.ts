/**
 * Polar billing: plan derivation from a `customer.state_changed` snapshot.
 *
 * Pure function (no D1, no network), same posture as aiModels.test.ts. The
 * webhook route itself (signature verification → D1 plan write) is exercised
 * end-to-end against a dev server with a standardwebhooks-signed payload; see
 * the PR notes.
 */
import { describe, it, expect } from "vitest";
import { derivePlanFromCustomerState } from "../lib/billing/polar";

const PRO = "prod_pro_monthly";
const PRO_ANNUAL = "prod_pro_annual";

function state(productIds: string[]) {
  return {
    externalId: "user-1",
    activeSubscriptions: productIds.map((productId) => ({ productId })),
  };
}

describe("derivePlanFromCustomerState", () => {
  it("is free with no active subscriptions", () => {
    expect(derivePlanFromCustomerState(state([]), [PRO])).toBe("free");
    expect(
      derivePlanFromCustomerState({ externalId: "u", activeSubscriptions: null }, [PRO]),
    ).toBe("free");
    expect(derivePlanFromCustomerState({ externalId: "u" }, [PRO])).toBe(
      "free",
    );
  });

  it("is pro with an active subscription for the configured product", () => {
    expect(derivePlanFromCustomerState(state([PRO]), [PRO])).toBe("pro");
  });

  it("matches the annual product when configured", () => {
    expect(
      derivePlanFromCustomerState(state([PRO_ANNUAL]), [PRO, PRO_ANNUAL]),
    ).toBe("pro");
  });

  it("ignores subscriptions for other products", () => {
    expect(derivePlanFromCustomerState(state(["prod_other"]), [PRO])).toBe(
      "free",
    );
    expect(
      derivePlanFromCustomerState(state(["prod_other", PRO]), [PRO]),
    ).toBe("pro");
  });

  it("treats any active subscription as pro when no product ids are configured", () => {
    expect(derivePlanFromCustomerState(state(["prod_other"]), [])).toBe("pro");
    expect(derivePlanFromCustomerState(state([]), [])).toBe("free");
  });
});
