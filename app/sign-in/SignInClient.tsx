"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "../_components/Link";
import { GitHubIcon } from "../_components/home/icons";
import {
  requestPasswordReset,
  signIn,
  signUp,
  useSession,
} from "@/lib/auth/client";

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

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--ds-gray-200)] bg-white px-3.5 py-2.5 text-sm text-[var(--ds-gray-900)] outline-none transition-colors placeholder:text-[var(--ds-gray-400)] focus:border-[var(--ds-blue-500)] dark:border-white/15 dark:bg-white/5 dark:text-white";

/** Minimum password length — mirrors Better Auth's default (`minPasswordLength`). */
const MIN_PASSWORD = 8;

type Mode = "signin" | "signup" | "forgot";

const SUBMIT_LABEL: Record<Mode, [idle: string, busy: string]> = {
  signin: ["Sign in", "Signing in…"],
  signup: ["Create account", "Creating account…"],
  forgot: ["Send reset link", "Sending…"],
};

/** Email + password form spanning three modes: sign in, create account, and
 *  request a password reset. Sign-up also collects a name (the user table
 *  requires it). Success paths:
 *   - sign in   → session set, redirect to /account
 *   - sign up   → if verification is required, show a "check your email" notice
 *                 and switch to sign-in; otherwise redirect to /account
 *   - forgot    → always show a neutral "if an account exists…" notice
 *  Verification + reset only do anything once RESEND_API_KEY is configured
 *  server-side; until then those calls surface a friendly error. */
function EmailPasswordForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    if (mode === "forgot") {
      // Fire-and-forget: show the same neutral message whether or not the email
      // exists, so the form can't be used to probe which addresses are registered.
      await requestPasswordReset({ email, redirectTo: "/reset-password" });
      setNotice("If an account exists for that email, a reset link is on its way.");
      setSubmitting(false);
      return;
    }

    const { data, error } =
      mode === "signup"
        ? await signUp.email({ name, email, password, callbackURL: CALLBACK_URL })
        : await signIn.email({ email, password, callbackURL: CALLBACK_URL });

    if (error) {
      // When verification is required, an unverified sign-in is rejected and a
      // fresh verification email is sent — tell the user to check their inbox.
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setNotice(
          "Please verify your email first. We've sent you a new verification link.",
        );
      } else {
        setError(error.message ?? "Something went wrong. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    // Sign-up with verification required returns no active session — prompt to
    // verify rather than redirecting into a gated page.
    if (mode === "signup" && data && !("token" in data && data.token)) {
      setPassword("");
      switchMode("signin"); // clears notice…
      setNotice(
        "Account created. Check your email for a verification link, then sign in.",
      ); // …so set it after the switch
      setSubmitting(false);
      return;
    }

    // Session is set; surface it on /account (and re-render the header).
    router.push(CALLBACK_URL);
    router.refresh();
  }

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const [idleLabel, busyLabel] = SUBMIT_LABEL[mode];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {isSignup && (
        <input
          type="text"
          required
          autoComplete="name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled || submitting}
          className={INPUT_CLASS}
        />
      )}
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={disabled || submitting}
        className={INPUT_CLASS}
      />
      {!isForgot && (
        <input
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder={
            isSignup ? `Password (${MIN_PASSWORD}+ characters)` : "Password"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={disabled || submitting}
          className={INPUT_CLASS}
        />
      )}

      {mode === "signin" && (
        <button
          type="button"
          onClick={() => switchMode("forgot")}
          className="-mt-1 self-end text-xs font-medium text-[var(--ds-blue-600)] hover:underline dark:text-[var(--ds-blue-400)]"
        >
          Forgot password?
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--ds-red-600,#dc2626)]">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-[var(--ds-blue-50,#eff6ff)] px-3 py-2 text-sm text-[var(--ds-blue-700)] dark:bg-[var(--ds-blue-400)]/10 dark:text-[var(--ds-blue-300)]"
        >
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || submitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? busyLabel : idleLabel}
      </button>

      <p className="text-center text-sm text-[var(--ds-gray-500)]">
        {isForgot ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="font-medium text-[var(--ds-blue-600)] hover:underline dark:text-[var(--ds-blue-400)]"
          >
            Back to sign in
          </button>
        ) : (
          <>
            {isSignup ? "Already have an account?" : "New to Dataslope?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "signin" : "signup")}
              className="font-medium text-[var(--ds-blue-600)] hover:underline dark:text-[var(--ds-blue-400)]"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </>
        )}
      </p>
    </form>
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

      <div className="my-1 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--ds-gray-200)] dark:bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--ds-gray-400)]">
          or
        </span>
        <span className="h-px flex-1 bg-[var(--ds-gray-200)] dark:bg-white/10" />
      </div>

      {/* Disable the email form while a social redirect is in flight. */}
      <EmailPasswordForm disabled={pending !== null} />

      <p className="mt-2 text-center text-xs leading-relaxed text-[var(--ds-gray-500)]">
        Signing in only unlocks cloud saves, sharing, and AI. Every course,
        exercise, and playground stays free — no account needed.
      </p>
    </div>
  );
}
