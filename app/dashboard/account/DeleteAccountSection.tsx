"use client";

/**
 * Self-service account deletion via Better Auth's `deleteUser`. With a mailer
 * configured the server emails a confirmation link and deletes nothing until
 * clicked; without one deletion is immediate but requires a fresh session
 * (stale → SESSION_EXPIRED, translated to a "sign out and back in" prompt).
 * Deletion cascades to sessions, accounts, saves, shares, and custom content;
 * the beforeDelete hook purges the R2 payloads.
 */

import { useState } from "react";

import { deleteUser } from "@/lib/auth/client";

export function DeleteAccountSection({
  email,
  isPaidPro,
}: {
  email: string;
  /** True only for an actually-billed Pro plan (not admins treated as Pro). */
  isPaidPro: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Emailed-confirmation path: the account isn't gone yet, show a notice.
  const [emailSent, setEmailSent] = useState(false);

  const confirmed = confirmText.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: apiError } = await deleteUser({ callbackURL: "/" });
      if (apiError) {
        if (apiError.code === "SESSION_EXPIRED") {
          setError(
            "For your security, deleting your account needs a recent sign-in. " +
              "Please sign out, sign back in, and try again.",
          );
        } else {
          setError(
            apiError.message ??
              "Couldn't delete your account. Please try again.",
          );
        }
        setBusy(false);
        return;
      }
      // An email-ish message means a confirmation link was sent and nothing is
      // deleted yet; anything else means the row is gone, so leave for home.
      if (typeof data?.message === "string" && /email/i.test(data.message)) {
        setEmailSent(true);
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError(
        "Couldn't reach the server. Please check your connection and try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 dark:border-red-500/25 dark:bg-white/5">
      <h2 className="text-base font-semibold text-red-700 dark:text-red-300">
        Delete account
      </h2>
      <p className="mt-1 text-sm text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
        Permanently delete your account and everything tied to it, your
        sign-in methods, cloud saves, share links, and custom challenges. This
        can&rsquo;t be undone.
      </p>

      {isPaidPro && (
        <p className="mt-4 rounded-xl bg-amber-500/[0.10] px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/[0.12] dark:text-amber-200">
          You have an active Pro subscription. Deleting your account here
          doesn&rsquo;t cancel billing, cancel it first with{" "}
          <span className="font-medium">Manage subscription</span> above, or you
          may continue to be charged.
        </p>
      )}

      {emailSent ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-[var(--ds-blue-600)]/10 px-4 py-3 text-sm text-[var(--ds-blue-600)]"
        >
          Check your email, we&rsquo;ve sent a confirmation link. Your account
          stays active until you open it, and the link expires in 24 hours.
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className="mt-5 inline-flex items-center justify-center rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          Delete account
        </button>
      ) : (
        <div className="mt-5">
          <label
            htmlFor="delete-confirm"
            className="block text-sm text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]"
          >
            Type <span className="font-semibold">{email}</span> to confirm.
          </label>
          <input
            id="delete-confirm"
            type="email"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-[var(--ds-gray-200)] bg-white px-3 py-2 text-sm text-[var(--ds-gray-900)] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/30 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white"
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-500/[0.08] px-4 py-3 text-sm text-red-700 dark:bg-red-500/[0.12] dark:text-red-300"
            >
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={!confirmed || busy}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--ds-gray-200)] px-4 py-2.5 text-sm font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
