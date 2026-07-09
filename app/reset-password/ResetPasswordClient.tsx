"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "../_components/Link";
import { resetPassword } from "@/lib/auth/client";
import { EyeIcon } from "../_components/auth/authIcons";
import styles from "../_components/auth/authCard.module.css";

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
 *  card matches the flat "2a" sign-in design (shared auth CSS module). */
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
  const [showPw, setShowPw] = useState(false);
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
    return <p className={styles.redirecting}>Loading…</p>;
  }

  if (linkError) {
    return (
      <div className={styles.stack}>
        <div>
          <h1 className={styles.title}>Link expired</h1>
          <p className={styles.subtitle}>
            This reset link is invalid or has expired.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // Deep-link straight into the "Reset your password" form,
            // landing on the sign-in tab would make the user rediscover
            // "Forgot password?" themselves.
            router.push("/forgot-password");
            router.refresh();
          }}
          className={styles.primary}
        >
          Request a new link
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.stack}>
        <div>
          <h1 className={styles.title}>Password updated</h1>
          <p className={styles.subtitle}>
            You can now sign in with your new password.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            router.push("/sign-in");
            router.refresh();
          }}
          className={styles.primary}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>Choose a new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div>
          <div className={styles.field}>
            <input
              id="reset-password"
              type={showPw ? "text" : "password"}
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              aria-describedby="reset-password-hint"
              className={`${styles.input} ${styles.inputPw}`}
            />
            <label htmlFor="reset-password" className={styles.label}>
              New password
            </label>
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className={styles.eyeBtn}
            >
              <EyeIcon />
            </button>
          </div>
          <div className={styles.pwRow}>
            <span
              id="reset-password-hint"
              className={`${styles.pwHint} ${pwOk ? styles.pwHintOk : ""}`}
            >
              {pwOk ? "Strong enough, looks good." : "At least 8 characters."}
            </span>
          </div>
        </div>

        <div className={`${styles.field} ${mismatch ? styles.fieldError : ""}`}>
          <input
            id="reset-confirm"
            type={showPw ? "text" : "password"}
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            placeholder=" "
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            disabled={submitting}
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? "reset-confirm-error" : undefined}
            className={styles.input}
          />
          <label htmlFor="reset-confirm" className={styles.label}>
            Confirm new password
          </label>
          {mismatch && (
            <p id="reset-confirm-error" className={styles.errorText}>
              Passwords don&apos;t match
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className={styles.formError}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={styles.primary}
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className={styles.switch}>
        <Link href="/sign-in" className={styles.link}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
