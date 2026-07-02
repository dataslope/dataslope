"use client";

/**
 * Client-side building blocks shared by the /admin pages: the gating states
 * (sign-in prompt, access denied), plan + test-user helpers, and the
 * impersonation actions used by both the Users and Test users sections.
 *
 * Security model (unchanged from the original single-page dashboard): these
 * are presentation-only — every action hits a server-authorized endpoint
 * (Better Auth `admin.*`, or requireAdmin on our own /api/admin routes), so
 * a non-admin who opens any /admin page just sees an access-denied notice
 * and can't read or mutate anything.
 */
import { useState } from "react";
import { CircleAlert, Loader2, LogOut } from "lucide-react";
import Link from "../../_components/Link";
import { authClient } from "@/lib/auth/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Page chrome ──────────────────────────────────────────────────────────

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-[15px] text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
        {description}
      </p>
    </header>
  );
}

export function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-sm text-[var(--ds-gray-500)]">{children}</p>
  );
}

export function SignInPrompt() {
  return (
    <div className="text-center">
      <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
        Sign in to access the admin dashboard.
      </p>
      <Link
        href="/sign-in"
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)]"
      >
        Sign in
      </Link>
    </div>
  );
}

/**
 * "You don't have admin access" card. When the current session is an
 * impersonation session (the admin became a test user and came back here),
 * offer the way out — otherwise an impersonating admin would be locked out
 * of the dashboard until the impersonation session expires.
 */
export function AccessDeniedCard({
  email,
  impersonated,
}: {
  email: string;
  impersonated: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CircleAlert className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">You don&apos;t have admin access</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {impersonated
              ? `You're currently impersonating ${email}.`
              : `Signed in as ${email}. Ask an existing admin to grant you access.`}
          </p>
        </div>
        {impersonated && (
          <Button
            onClick={() => {
              setBusy(true);
              void authClient.admin.stopImpersonating().finally(() => {
                window.location.reload();
              });
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
            Stop impersonating
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Whether the session record was created by admin impersonation. The admin
 *  plugin adds `impersonatedBy`, which isn't on the base session type. */
export function isImpersonatedSession(session: unknown): boolean {
  return Boolean(
    (session as { session?: { impersonatedBy?: string | null } })?.session
      ?.impersonatedBy,
  );
}

// ─── Plans + test users ───────────────────────────────────────────────────

/**
 * Domain for admin-created test accounts. `.test` is an RFC 6761 reserved
 * TLD: it can never resolve or receive mail, so these addresses can't
 * collide with a real person or leak verification emails. Test users are
 * recognized (badged, listed, bulk-removed) purely by this suffix.
 */
export const TEST_EMAIL_DOMAIN = "dataslope.test";

export function isTestEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${TEST_EMAIL_DOMAIN}`);
}

export function PlanBadge({ plan }: { plan: string | null | undefined }) {
  const isPro = (plan ?? "").toLowerCase() === "pro";
  return isPro ? (
    <Badge className="bg-[var(--ds-blue-600)] text-white dark:bg-[var(--ds-blue-600)]">
      Pro
    </Badge>
  ) : (
    <Badge variant="outline">Free</Badge>
  );
}

/**
 * Flip a user's plan via Better Auth's admin update endpoint (server-side
 * admin check included). Returns an error message, or null on success.
 * Note: an already-signed-in session may keep the old plan for up to five
 * minutes (the session cookie cache) — impersonation and fresh sign-ins see
 * the new plan immediately.
 */
export async function setUserPlan(
  userId: string,
  plan: "free" | "pro",
): Promise<string | null> {
  const { error } = await authClient.admin.updateUser({
    userId,
    data: { plan },
  });
  return error ? (error.message ?? "Couldn't update that user's plan.") : null;
}

/**
 * Become `userId` in this browser (Better Auth impersonation; server-side
 * admin check, refuses admin targets). On success, hard-navigates to the
 * site root as that user so every AI feature behaves exactly as it would
 * for them. Returning to /admin shows a "Stop impersonating" button.
 * Returns an error message, or navigates away on success.
 */
export async function impersonateUser(userId: string): Promise<string | null> {
  const { error } = await authClient.admin.impersonateUser({ userId });
  if (error) return error.message ?? "Couldn't impersonate that user.";
  window.location.assign("/");
  return null;
}

export function formatJoined(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}
