"use client";

import { useState } from "react";
import Link from "../_components/Link";
import { GitHubIcon } from "../_components/home/icons";
import { signIn, useSession } from "@/lib/auth/client";

/** Where to land after a successful sign-in. */
const CALLBACK_URL = "/account";

function GoogleGlyph() {
  // Google "G" mark, inline so it needs no extra icon dependency.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function ProviderButton({
  provider,
  label,
  icon,
  pending,
  onClick,
}: {
  provider: string;
  label: string;
  icon: React.ReactNode;
  pending: string | null;
  onClick: (provider: string) => void;
}) {
  const isThis = pending === provider;
  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={pending !== null}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--ds-gray-200)] bg-white px-4 py-3 text-sm font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-50)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
    >
      {icon}
      {isThis ? "Redirecting…" : label}
    </button>
  );
}

export function SignInClient() {
  const { data: session, isPending } = useSession();
  const [pending, setPending] = useState<string | null>(null);

  function start(provider: string) {
    setPending(provider);
    // Full-page redirect to the provider, returning to CALLBACK_URL.
    void signIn
      .social({ provider, callbackURL: CALLBACK_URL })
      .catch(() => setPending(null));
  }

  // Already signed in: don't re-prompt, just point at the account area.
  if (!isPending && session) {
    return (
      <div className="text-center">
        <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
          You&apos;re signed in as{" "}
          <span className="font-medium text-[var(--ds-gray-900)] dark:text-white">
            {session.user.email}
          </span>
          .
        </p>
        <Link
          href="/account"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)]"
        >
          Go to your account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ProviderButton
        provider="google"
        label="Continue with Google"
        icon={<GoogleGlyph />}
        pending={pending}
        onClick={start}
      />
      <ProviderButton
        provider="github"
        label="Continue with GitHub"
        icon={<GitHubIcon size={18} />}
        pending={pending}
        onClick={start}
      />
      <p className="mt-2 text-center text-xs leading-relaxed text-[var(--ds-gray-500)]">
        Signing in only unlocks cloud saves, sharing, and AI. Every course,
        exercise, and playground stays free — no account needed.
      </p>
    </div>
  );
}
