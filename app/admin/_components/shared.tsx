"use client";

/**
 * Client-side building blocks shared by the /admin pages: the dashboard's
 * soft design kit (borderless tinted panels, hairline table styles, quiet
 * actions), the gating states (sign-in prompt, access denied), and the plan
 * + test-user + impersonation helpers used by several sections.
 *
 * Design language: surfaces are flat tinted panels (no borders, no shadows)
 * on the page background, tables separate rows with hairline dividers, and
 * row actions are quiet ghost buttons — the only loud elements are primary
 * CTAs and the Pro badge. Everything is styled for both themes and collapses
 * to single-column layouts on mobile (tables become card lists at the call
 * sites).
 *
 * Security model (unchanged): these are presentation-only — every action
 * hits a server-authorized endpoint (Better Auth `admin.*`, or requireAdmin
 * on our own /api/admin routes), so a non-admin who opens any /admin page
 * just sees an access-denied notice and can't read or mutate anything.
 */
import { useState } from "react";
import { CircleAlert, Loader2, LogOut } from "lucide-react";
import Link from "../../_components/Link";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Soft design kit ──────────────────────────────────────────────────────
//
// zinc-500 at low alpha reads as "a step off the page" on the white light
// surface and, paired with white-alpha in dark, keeps one visual system in
// both themes without borders.

/** Flat, borderless card surface. */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-zinc-500/[0.06] dark:bg-white/[0.045]",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Panel title row: heading + optional description, action cluster right. */
export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-5 pb-0 sm:p-6 sm:pb-0">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("p-5 pt-4 sm:p-6 sm:pt-4", className)}>{children}</div>
  );
}

/** Filled input styling (no border) — pass via `className` on ui/Input. */
export const softInputClass =
  "rounded-lg border-transparent bg-zinc-500/[0.07] shadow-none dark:bg-white/[0.07] dark:border-transparent";

/** Column header cells: small caps, muted, no heavy rule. */
export const theadClass =
  "h-9 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase";

/** Header row: hairline rule only, no hover tint. */
export const headRowClass =
  "border-zinc-500/10 hover:bg-transparent dark:border-white/[0.07]";

/** Body rows: hairline divider + a whisper of hover. */
export const rowClass =
  "border-zinc-500/[0.07] hover:bg-zinc-500/[0.04] dark:border-white/[0.05] dark:hover:bg-white/[0.03]";

/** Body cells: a touch more breathing room than the ui default. */
export const cellClass = "px-3 py-3";

/** Quiet row action (neutral): ghost button, muted until hovered. */
export const quietActionClass = "text-muted-foreground hover:text-foreground";

/** Quiet row action (destructive): red ghost, no solid fill. */
export const dangerActionClass =
  "text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300";

/** Borderless inline error note. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-lg bg-red-500/[0.08] px-3 py-2 text-sm text-red-700 dark:bg-red-500/[0.12] dark:text-red-300"
    >
      <CircleAlert className="size-4 shrink-0" />
      {children}
    </p>
  );
}

// ─── Page chrome ──────────────────────────────────────────────────────────

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-3xl dark:text-white">
        {title}
      </h1>
      <p className="mt-1.5 text-[15px] text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
        {description}
      </p>
    </header>
  );
}

export function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-16 text-center text-sm text-[var(--ds-gray-500)]">
      {children}
    </p>
  );
}

export function SignInPrompt() {
  return (
    <div className="py-12 text-center">
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
 * "You don't have admin access" panel. When the current session is an
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
    <Panel>
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
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
      </div>
    </Panel>
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
    <Badge variant="secondary">Free</Badge>
  );
}

/** Soft status badge — state is carried by tint AND the label, never color
 *  alone. */
export function StatusBadge({ banned }: { banned: boolean | null | undefined }) {
  return banned ? (
    <Badge className="border-transparent bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300">
      Banned
    </Badge>
  ) : (
    <Badge className="border-transparent bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      Active
    </Badge>
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
