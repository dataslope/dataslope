/**
 * Config-admin role promotion, the write half of the ADMIN_EMAILS /
 * ADMIN_USER_IDS bootstrap.
 *
 * The env allowlists let the first admin exist before anyone holds the
 * `role = 'admin'` column (see resolveAdminUserIds in lib/auth/server.ts).
 * But the column is what the rest of the product reads: the avatar menu's
 * /admin shortcut (app/_components/auth/AuthMenu.tsx), the account page's
 * "Pro (admin)" display, and the Pro tier itself (lib/ai/tier.ts) all key off
 * the session's `role`. So on sign-in requests the hook in lib/auth/server.ts
 * calls this to finish the bootstrap: config-listed users get their `role`
 * column set to 'admin', and from then on the role behaves as if an existing
 * admin had granted it.
 *
 * One conditional UPDATE per sign-in request, nothing on the hot get-session
 * path, and a no-op (zero rows written) when every listed admin already holds
 * the role. Deliberately one-way: removing someone from the env lists revokes
 * their *allowlist* access but does not demote the column, demotion stays an
 * explicit admin action.
 *
 * This module stays off the Better Auth import chain so it can be unit-tested
 * directly (see __tests__/adminPromotion.test.ts).
 */
import type { D1Database } from "@cloudflare/workers-types";

export interface AdminBootstrapConfig {
  /** Literal Better Auth user ids (parsed ADMIN_USER_IDS). */
  adminUserIds: string[];
  /** Admin email addresses (parsed ADMIN_EMAILS); matched case-insensitively. */
  adminEmails: string[];
}

/**
 * Set `role = 'admin'` on every config-listed user who doesn't hold it yet.
 * `role` is NOT NULL DEFAULT 'user' (migrations/auth/0002), so the
 * `role <> 'admin'` guard never trips over NULL. The allowlists are a
 * handful of operators at most, so promoting them all in one statement is
 * as cheap as targeting one, and it means the promotion can run *before*
 * a sign-in handler reads the user row, keeping the session response (and
 * the cookie cache seeded from it) fresh.
 */
export async function promoteConfiguredAdmins(
  db: D1Database,
  { adminUserIds, adminEmails }: AdminBootstrapConfig,
): Promise<void> {
  const emails = adminEmails.map((e) => e.toLowerCase());
  if (adminUserIds.length === 0 && emails.length === 0) return;

  const matchers: string[] = [];
  const binds: string[] = [];
  if (adminUserIds.length > 0) {
    matchers.push(`id IN (${adminUserIds.map(() => "?").join(", ")})`);
    binds.push(...adminUserIds);
  }
  if (emails.length > 0) {
    matchers.push(`lower(email) IN (${emails.map(() => "?").join(", ")})`);
    binds.push(...emails);
  }

  await db
    .prepare(
      `UPDATE user SET role = 'admin'
       WHERE role <> 'admin' AND (${matchers.join(" OR ")})`,
    )
    .bind(...binds)
    .run();
}
