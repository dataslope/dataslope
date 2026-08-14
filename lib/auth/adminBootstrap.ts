/**
 * Config-admin role promotion, the write half of the ADMIN_EMAILS /
 * ADMIN_USER_IDS bootstrap (see resolveAdminUserIds in lib/auth/server.ts).
 * The `role` column is what the product reads, so the sign-in hook calls this
 * to set it for config-listed users: one conditional UPDATE per sign-in,
 * nothing on the hot get-session path, a no-op when everyone already holds
 * the role. Deliberately one-way — removing someone from the env lists does
 * not demote the column. Off the Better Auth import chain so it unit-tests
 * directly.
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
 * `role <> 'admin'` guard never trips over NULL. One statement, so the
 * promotion can run before a sign-in handler reads the user row, keeping the
 * cookie cache seeded from that read fresh.
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
