"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "../_components/Link";
import { resetPassword } from "@/lib/auth/client";

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

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--ds-gray-200)] bg-white px-3.5 py-2.5 text-sm text-[var(--ds-gray-900)] outline-none transition-colors placeholder:text-[var(--ds-gray-400)] focus:border-[var(--ds-blue-500)] dark:border-white/15 dark:bg-white/5 dark:text-white";

const MIN_PASSWORD = 8;

/** Landing page for the reset link emailed by Better Auth. The `/api/auth`
 *  endpoint validates the token, then redirects here as
 *  `/reset-password?token=…` (or `?error=…` for an expired/invalid token). We
 *  read those from the URL on the client (no `useSearchParams`, so the route
 *  stays a simple static shell), collect a new password, and submit it. */
export function ResetPasswordClient() {
  const router = useRouter();
  const search = useLocationSearch();
  const ready = search !== null;
  const params = new URLSearchParams(ready ? search : "");
  const token = params.get("token");
  // An expired/invalid token redirects here with `?error=…`, and a bare visit
  // has no token at all — both are dead links.
  const linkError = ready && (!token || Boolean(params.get("error")));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) return;
    setSubmitting(true);
    const { error } = await resetPassword({ newPassword: password, token });
    if (error) {
      setError(error.message ?? "Couldn't reset your password. Request a new link.");
      setSubmitting(false);
      return;
    }
    setDone(true);
  }

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--ds-gray-500)]">Loading…</p>
    );
  }

  if (linkError) {
    return (
      <div className="text-center">
        <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
          This reset link is invalid or has expired.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)]"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
          Your password has been updated.
        </p>
        <button
          type="button"
          onClick={() => {
            router.push("/sign-in");
            router.refresh();
          }}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)]"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        required
        minLength={MIN_PASSWORD}
        autoComplete="new-password"
        placeholder={`New password (${MIN_PASSWORD}+ characters)`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
        className={INPUT_CLASS}
      />
      <input
        type="password"
        required
        minLength={MIN_PASSWORD}
        autoComplete="new-password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={submitting}
        className={INPUT_CLASS}
      />
      {error && (
        <p role="alert" className="text-sm text-[var(--ds-red-600,#dc2626)]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
