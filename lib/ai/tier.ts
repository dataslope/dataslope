// Resolve a signed-in user's membership tier for model selection.
//
// A user is "pro" when ANY of these hold:
//   - their `user.plan` column is 'pro' (the real membership field, set by a
//     future billing webhook, or manually by an admin);
//   - their email is in the `PRO_USER_EMAILS` allowlist (bootstrap before a
//     billing system exists, mirroring how ADMIN_EMAILS grants admin);
//   - they're an admin (role 'admin' or in the ADMIN_EMAILS allowlist), admins
//     get the better model for free.
// Everyone else (including users with no session) is "free".
import type { MemberTier } from "./types";

/** Minimal shape read off the Better Auth session user. */
export interface TierUser {
  email?: string | null;
  role?: string | null;
  plan?: string | null;
}

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveTier(
  user: TierUser | null | undefined,
  env: CloudflareEnv,
): MemberTier {
  if (!user) return "free";

  if ((user.plan ?? "").toLowerCase() === "pro") return "pro";
  if ((user.role ?? "") === "admin") return "pro";

  const email = (user.email ?? "").toLowerCase();
  if (email) {
    if (parseEmails(env.PRO_USER_EMAILS).includes(email)) return "pro";
    if (parseEmails(env.ADMIN_EMAILS).includes(email)) return "pro";
  }

  return "free";
}
