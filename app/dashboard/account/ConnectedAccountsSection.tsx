"use client";

/**
 * Account-page management for connected sign-in methods (social integrations).
 *
 * Every login method a user has is one row in the `account` table, keyed by
 * `providerId` ("google" / "github" for OAuth, "credential" for email +
 * password). This section reads them back with Better Auth's `listAccounts`
 * and lets the user attach another provider (`linkSocial`, an OAuth redirect)
 * or detach one (`unlinkAccount`). All three are Better Auth's own
 * `/api/auth/*` endpoints, already served by the catch-all handler
 * (app/api/auth/[...all]/route.ts), so no server code is added here.
 *
 * Lockout guard: Better Auth refuses to unlink a user's *only* account (it
 * would leave them with no way back in). We mirror that in the UI, the Remove
 * button is disabled with an explanation when a provider is the last remaining
 * method, rather than firing a call that comes back 400.
 *
 * Provider availability: like the sign-in card (app/sign-in/SignInClient.tsx),
 * both Google and GitHub are always offered. A provider that isn't configured
 * in this environment simply surfaces an error when Connect is pressed, the
 * same behavior as that card, kept deliberately consistent.
 */

import { useCallback, useEffect, useState } from "react";

import { GitHubIcon, GoogleIcon } from "@/app/_components/home/icons";
import { linkSocial, listAccounts, unlinkAccount } from "@/lib/auth/client";

/** The subset of a Better Auth account row this section reads. */
interface LinkedAccount {
  providerId: string;
  accountId?: string;
  createdAt?: string | Date;
}

/** The social providers offered here, in display order. `credential` (email +
 *  password) is intentionally not listed, it's counted toward the lockout
 *  guard below but managed via the password/reset flow, not connect/disconnect. */
const PROVIDERS: {
  id: string;
  label: string;
  Icon: ({ size }: { size?: number }) => React.ReactElement;
}[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
];

const actionClass =
  "rounded-lg border border-[var(--ds-gray-200)] px-2.5 py-1 text-xs font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10";
const dangerActionClass =
  "rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10";

export function ConnectedAccountsSection() {
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error: apiError } = await listAccounts();
      if (apiError) {
        setError(apiError.message ?? "Couldn't load your sign-in methods.");
        return;
      }
      setAccounts((data ?? []) as LinkedAccount[]);
      setError(null);
    } catch {
      setError("Couldn't load your sign-in methods. Please try again.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state lands asynchronously after the fetch, not in the effect body
    void refresh();
  }, [refresh]);

  const handleConnect = useCallback(async (id: string, label: string) => {
    setBusy(id);
    setError(null);
    // Full-page redirect to the provider on success (the browser leaves this
    // page, so keeping the button "busy" is right), returning to /account where
    // the mount re-fetches and shows the newly-linked provider. A server-side
    // failure resolves with {error} (it does NOT reject), e.g. the provider
    // isn't configured here, or the OAuth email doesn't match the account, and
    // must re-enable the button; a rejection is a network failure and must too.
    try {
      const { error: apiError } = await linkSocial({
        provider: id,
        callbackURL: "/dashboard/account",
      });
      if (apiError) {
        setError(apiError.message ?? `Couldn't connect ${label}.`);
        setBusy(null);
      }
    } catch {
      setError(
        "Couldn't reach the server. Please check your connection and try again.",
      );
      setBusy(null);
    }
  }, []);

  const handleRemove = useCallback(
    async (id: string, label: string) => {
      if (
        !window.confirm(
          `Disconnect ${label} from your account? You'll no longer be able ` +
            `to sign in with ${label}. This doesn't delete your account or ` +
            `your saved work.`,
        )
      ) {
        return;
      }
      setBusy(id);
      setError(null);
      try {
        const { error: apiError } = await unlinkAccount({ providerId: id });
        if (apiError) {
          setError(apiError.message ?? `Couldn't disconnect ${label}.`);
        } else {
          await refresh();
        }
      } catch {
        setError(
          "Couldn't reach the server. Please check your connection and try again.",
        );
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  // Total sign-in methods, including email + password ("credential"). Removing
  // the last one would lock the user out, so Better Auth blocks it and so do we.
  const methodCount = accounts?.length ?? 0;
  const hasPassword = accounts?.some((a) => a.providerId === "credential");

  return (
    <div className="mt-6 rounded-2xl border border-[var(--ds-gray-200)] bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <h2 className="text-base font-semibold text-[var(--ds-gray-900)] dark:text-white">
        Sign-in methods
      </h2>
      <p className="mt-1 text-sm text-[var(--ds-gray-500)]">
        Connect Google or GitHub to sign in with one tap. Removing a method
        doesn&rsquo;t delete your account or your saved work.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-500/[0.08] px-4 py-3 text-sm text-red-700 dark:bg-red-500/[0.12] dark:text-red-300"
        >
          {error}
        </p>
      )}

      {accounts === null ? (
        <p className="mt-4 text-sm text-[var(--ds-gray-500)]">Loading…</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--ds-gray-100)] dark:divide-white/5">
          {PROVIDERS.map(({ id, label, Icon }) => {
            const linked = accounts.some((a) => a.providerId === id);
            // Disconnect is blocked when this is the account's only sign-in
            // method (Better Auth would reject it), guiding the user to add
            // another method — or a password — before removing this one.
            const isOnlyMethod = linked && methodCount <= 1;
            return (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-100)] dark:bg-white/10">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--ds-gray-900)] dark:text-white">
                      {label}
                    </div>
                    <div className="text-xs text-[var(--ds-gray-500)]">
                      {linked ? "Connected" : "Not connected"}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isOnlyMethod && (
                    <span className="text-xs text-[var(--ds-gray-500)]">
                      Only sign-in method
                    </span>
                  )}
                  {linked ? (
                    <button
                      type="button"
                      className={dangerActionClass}
                      disabled={busy !== null || isOnlyMethod}
                      title={
                        isOnlyMethod
                          ? "Add another sign-in method before removing this one."
                          : undefined
                      }
                      onClick={() => void handleRemove(id, label)}
                    >
                      {busy === id ? "Removing…" : "Remove"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={actionClass}
                      disabled={busy !== null}
                      onClick={() => void handleConnect(id, label)}
                    >
                      {busy === id ? "Redirecting…" : "Connect"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {accounts !== null && !hasPassword && (
        <p className="mt-4 border-t border-[var(--ds-gray-200)] pt-4 text-xs leading-relaxed text-[var(--ds-gray-500)] dark:border-white/10">
          You sign in with a social provider only. To add an email &amp;
          password, use{" "}
          <span className="font-medium">Forgot password?</span> on the sign-in
          page to set one for your email address.
        </p>
      )}
    </div>
  );
}
