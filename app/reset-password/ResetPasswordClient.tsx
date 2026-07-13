"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LogIn, Mail } from "lucide-react";
import { resetPassword } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AUTH_LINK_CLS,
  AuthCard,
  PasswordInput,
  Spinner,
} from "../_components/auth/authBlocks";
import Link from "../_components/Link";

/** Brand-blue primary button (matches the sign-in card's CTA). */
const SUBMIT_CLS =
  "w-full bg-[var(--ds-blue-500)] text-white hover:bg-[var(--ds-blue-550)]";

/** Minimum password length, mirrors Better Auth's default (`minPasswordLength`). */
const MIN_PASSWORD = 8;

/** Read `window.location.search` without a setState-in-effect: the server
 *  snapshot is `null` (so we render a loading state during prerender/hydration),
 *  and the client snapshot is the real query string. The URL doesn't change
 *  while this page is mounted, so the subscription is a no-op. */
function useLocationSearch(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => null,
  );
}

/** Landing page for the reset link emailed by Better Auth. The `/api/auth`
 *  endpoint validates the token, then redirects here as
 *  `/reset-password?token=…` (or `?error=…` for an expired/invalid token). We
 *  read those from the URL on the client (no `useSearchParams`, so the route
 *  stays a simple static shell), collect a new password, and submit it. The
 *  card matches the shadcn auth block used by /sign-in. */
export function ResetPasswordClient() {
  const router = useRouter();
  const search = useLocationSearch();
  const ready = search !== null;
  const params = new URLSearchParams(ready ? search : "");
  const token = params.get("token");
  // An expired/invalid token redirects here with `?error=…`, and a bare visit
  // has no token at all, both are dead links.
  const linkError = ready && (!token || Boolean(params.get("error")));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const pwOk = password.length >= MIN_PASSWORD;
  // Lazy mismatch check, only after the confirm field has been touched.
  const mismatch =
    confirmTouched && confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setConfirmTouched(true);
      setError("Passwords don't match.");
      return;
    }
    if (!token) return;
    setSubmitting(true);
    // Server-side failures resolve with {error}; a network failure rejects,
    // catch it so the form doesn't stay disabled at "Updating…".
    try {
      const { error } = await resetPassword({ newPassword: password, token });
      if (error) {
        setError(
          error.message ?? "Couldn't reset your password. Request a new link.",
        );
        setSubmitting(false);
        return;
      }
    } catch {
      setError(
        "Couldn't reach the server. Please check your connection and try again.",
      );
      setSubmitting(false);
      return;
    }
    setDone(true);
  }

  if (!ready) {
    return (
      <p className="text-muted-foreground text-center text-sm">Loading…</p>
    );
  }

  if (linkError) {
    return (
      <AuthCard
        title="Link expired"
        description="This reset link is invalid or has expired"
      >
        <Button
          type="button"
          className={SUBMIT_CLS}
          onClick={() => {
            // Deep-link straight into the "Reset your password" form,
            // landing on the sign-in tab would make the user rediscover
            // "Forgot password?" themselves.
            router.push("/forgot-password");
            router.refresh();
          }}
        >
          <Mail size={14} aria-hidden="true" />
          Request a new link
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        description="You can now sign in with your new password"
      >
        <Button
          type="button"
          className={SUBMIT_CLS}
          onClick={() => {
            router.push("/sign-in");
            router.refresh();
          }}
        >
          <LogIn size={14} aria-hidden="true" />
          Sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Choose a new password for your account"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="reset-password">New password</Label>
            <PasswordInput
              id="reset-password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              aria-describedby="reset-password-hint"
            />
            <p
              id="reset-password-hint"
              className={`text-sm ${pwOk ? "text-[var(--ds-green-700,#008b03)]" : "text-muted-foreground"}`}
            >
              {pwOk ? "Strong enough, looks good." : "At least 8 characters."}
            </p>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="reset-confirm">Confirm new password</Label>
            <PasswordInput
              id="reset-confirm"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              disabled={submitting}
              aria-invalid={mismatch || undefined}
              aria-describedby={mismatch ? "reset-confirm-error" : undefined}
            />
            {mismatch && (
              <p id="reset-confirm-error" className="text-destructive text-sm">
                Passwords don&apos;t match
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}

          <Button type="submit" className={SUBMIT_CLS} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner />
                Updating…
              </>
            ) : (
              <>
                <KeyRound size={14} aria-hidden="true" />
                Update password
              </>
            )}
          </Button>

          <div className="text-center text-sm">
            <Link href="/sign-in" className={AUTH_LINK_CLS}>
              <ArrowLeft size={14} aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        </div>
      </form>
    </AuthCard>
  );
}
