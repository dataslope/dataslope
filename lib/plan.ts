// The membership plan a signed-in user effectively has, for display.
//
// One rule, read by every surface that names a plan (the Studio sidebar
// footer, the account page, the pricing CTAs), so they cannot disagree: a
// user is "pro" when their `plan` column says so or when they are an admin.
// That is the client-visible half of `resolveTier` (lib/ai/tier.ts), which
// additionally honours the PRO_USER_EMAILS / ADMIN_EMAILS allowlists. Those
// are server env, invisible here, and an allowlisted admin already carries
// role "admin" on the session.

export type EffectivePlan = "free" | "pro";

/** Minimal shape read off the Better Auth session user. `plan` and `role`
 *  are server-defined additional fields, absent from the client's user type. */
export interface PlanUser {
  plan?: string | null;
  role?: string | null;
}

export function isAdminUser(user: PlanUser | null | undefined): boolean {
  return (user?.role ?? "") === "admin";
}

export function effectivePlan(user: PlanUser | null | undefined): EffectivePlan {
  if (!user) return "free";
  if ((user.plan ?? "").toLowerCase() === "pro") return "pro";
  if (isAdminUser(user)) return "pro";
  return "free";
}

/** "Pro", "Pro (admin)" or "Free": the label the account page shows. */
export function planLabel(user: PlanUser | null | undefined): string {
  if (effectivePlan(user) === "free") return "Free";
  return (user?.plan ?? "").toLowerCase() === "pro" ? "Pro" : "Pro (admin)";
}
