// The membership plan a user has: which storage limits apply on the server
// (lib/workspaces/policy.ts) and which label every surface shows.
//
// A user is "pro" when their `plan` column says so (set by the billing
// webhook, or by an admin) or when they are an admin. `effectivePlan` is that
// rule on its own, safe to call in the browser: the Studio sidebar footer, the
// account page and the pricing CTAs all read it, so they cannot disagree.
// `resolveTier` is the server's version, which also honours the
// PRO_USER_EMAILS / ADMIN_EMAILS allowlists; those are server env, invisible
// to the browser, and an allowlisted admin already carries role "admin" on
// the session.

export type MemberTier = "free" | "pro";
/** Alias kept for the display helpers below. */
export type EffectivePlan = MemberTier;

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

// ─── Server side ─────────────────────────────────────────────────────

/** What the server knows about a user: the session fields plus the email the
 *  allowlists are keyed by. */
export interface TierUser extends PlanUser {
  email?: string | null;
}

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The tier the server enforces. Everything `effectivePlan` grants, plus the
 * PRO_USER_EMAILS allowlist (a bootstrap before billing existed, mirroring
 * how ADMIN_EMAILS grants admin) and ADMIN_EMAILS itself, for an admin whose
 * role column has not been promoted yet.
 */
export function resolveTier(
  user: TierUser | null | undefined,
  env: CloudflareEnv,
): MemberTier {
  if (!user) return "free";
  if (effectivePlan(user) === "pro") return "pro";

  const email = (user.email ?? "").toLowerCase();
  if (email) {
    if (parseEmails(env.PRO_USER_EMAILS).includes(email)) return "pro";
    if (parseEmails(env.ADMIN_EMAILS).includes(email)) return "pro";
  }

  return "free";
}
