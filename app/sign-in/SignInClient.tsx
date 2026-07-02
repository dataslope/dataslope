"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitHubIcon } from "../_components/home/icons";
import {
  requestPasswordReset,
  signIn,
  signUp,
  useSession,
} from "@/lib/auth/client";
import { EyeIcon } from "../_components/auth/authIcons";
import styles from "../_components/auth/authCard.module.css";

/** Where to land after a successful sign-in. */
const CALLBACK_URL = "/account";

/**
 * Friendly copy for the `?error=<code>` a failed OAuth callback forwards here
 * (see `onAPIError` in lib/auth/server.ts). The dominant code,
 * `state_mismatch`, is usually a *duplicate* callback request whose one-time
 * state was already consumed by the request that signed the user in — in that
 * case a session exists and the signed-in redirect below whisks the visitor to
 * /account before any copy renders. When one of these does render, the sign-in
 * genuinely failed and retrying is the fix.
 */
const STALE_ATTEMPT_COPY =
  "That sign-in attempt expired or was already used. Please try again.";
const AUTH_ERROR_COPY: Record<string, string> = {
  state_mismatch: STALE_ATTEMPT_COPY,
  state_not_found: STALE_ATTEMPT_COPY,
  state_invalid: STALE_ATTEMPT_COPY,
  access_denied: "Sign-in was cancelled before it completed. Please try again.",
};
const AUTH_ERROR_FALLBACK =
  "Something went wrong during sign-in. Please try again.";

/** Minimum password length — mirrors Better Auth's default (`minPasswordLength`). */
const MIN_PASSWORD = 8;

/** Lazy email check — matches the design's validation regex exactly. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Mode = "signin" | "signup" | "forgot";

const COPY: Record<
  Mode,
  { title: string; subtitle: string; cta: [idle: string, busy: string] }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to continue to Dataslope.",
    cta: ["Sign in", "Signing in…"],
  },
  signup: {
    title: "Create your account",
    subtitle: "Every course and playground is free, forever.",
    cta: ["Create account", "Creating account…"],
  },
  forgot: {
    title: "Reset your password",
    subtitle: "We'll email you a secure reset link.",
    cta: ["Send reset link", "Sending…"],
  },
};

function GoogleGlyph() {
  // Google "G" mark, inline so it needs no extra icon dependency.
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
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

/**
 * Auth card spanning three modes — sign in, create account, and request a
 * password reset — as a single flat, borderless component (design option "2a").
 *
 * Success paths:
 *   - sign in → session set, redirect to /account
 *   - sign up → if verification is required, show a "check your email" notice
 *               and switch to sign-in; otherwise redirect to /account
 *   - forgot  → always show a neutral "if an account exists…" notice
 *
 * Verification + reset only do anything once RESEND_API_KEY is configured
 * server-side; until then those calls surface a friendly error.
 *
 * There is no name field: Better Auth's `user.name` column is required (social
 * logins fill it from the provider profile), so for email sign-ups we derive a
 * name from the email's local-part rather than asking for it.
 */
export function SignInClient() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [socialPending, setSocialPending] = useState<string | null>(null);

  // A signed-in visitor has no reason to be on the sign-in/registration screen
  // — send them straight to their account.
  useEffect(() => {
    if (!isPending && session) router.replace(CALLBACK_URL);
  }, [isPending, session, router]);

  // Surface a forwarded OAuth-callback failure (`/sign-in?error=<code>`) and
  // scrub the code from the address bar so it doesn't linger through reloads,
  // bookmarks, or copied links. Read via window.location (not useSearchParams)
  // so the page keeps prerendering statically without a Suspense boundary —
  // same pattern as the checkout return in app/account/AccountClient.tsx.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (!code) return;
    params.delete("error");
    params.delete("error_description");
    const rest = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- driven by the URL, which only exists client-side
    setError(AUTH_ERROR_COPY[code] ?? AUTH_ERROR_FALLBACK);
  }, []);

  if (!isPending && session) {
    return <p className={styles.redirecting}>Redirecting to your account…</p>;
  }

  const isSignin = mode === "signin";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const emailError =
    emailTouched && email.length > 0 && !EMAIL_RE.test(email);
  const pwOk = password.length >= MIN_PASSWORD;
  const { title, subtitle, cta } = COPY[mode];
  const busy = submitting || socialPending !== null;

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  function startSocial(provider: string) {
    setSocialPending(provider);
    // Full-page redirect to the provider, returning to CALLBACK_URL.
    void signIn
      .social({ provider, callbackURL: CALLBACK_URL })
      .catch(() => setSocialPending(null));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (isForgot) {
      // Fire-and-forget: show the same neutral message whether or not the email
      // exists, so the form can't be used to probe which addresses are registered.
      setSubmitting(true);
      await requestPasswordReset({ email, redirectTo: "/reset-password" });
      setNotice(
        "If an account exists for that email, a reset link is on its way.",
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    // `user.name` is NOT NULL and required by Better Auth; for email sign-ups we
    // derive it from the email rather than prompting for it.
    const derivedName = email.split("@")[0]?.trim() || email;

    const { data, error } = isSignup
      ? await signUp.email({
          name: derivedName,
          email,
          password,
          callbackURL: CALLBACK_URL,
        })
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
    if (isSignup && data && !("token" in data && data.token)) {
      setPassword("");
      go("signin"); // clears notice…
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

  return (
    <div className={styles.stack}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {!isForgot && (
        <div className={styles.tabs}>
          <button
            type="button"
            onClick={() => go("signin")}
            className={`${styles.tab} ${isSignin ? styles.tabActive : ""}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => go("signup")}
            className={`${styles.tab} ${isSignup ? styles.tabActive : ""}`}
          >
            Create account
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={`${styles.field} ${emailError ? styles.fieldError : ""}`}>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder=" "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            disabled={busy}
            className={styles.input}
          />
          <label className={styles.label}>Email address</label>
          {emailError && (
            <p className={styles.errorText}>Enter a valid email address</p>
          )}
        </div>

        {!isForgot && (
          <div>
            <div className={styles.field}>
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={MIN_PASSWORD}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className={`${styles.input} ${styles.inputPw}`}
              />
              <label className={styles.label}>Password</label>
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
              {isSignup ? (
                <span
                  className={`${styles.pwHint} ${pwOk ? styles.pwHintOk : ""}`}
                >
                  {pwOk ? "Strong enough — looks good." : "At least 8 characters."}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => go("forgot")}
                  className={styles.link}
                >
                  Forgot password?
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className={styles.formError}>
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className={styles.formNotice}>
            {notice}
          </p>
        )}

        <button type="submit" disabled={busy} className={styles.primary}>
          {submitting ? cta[1] : cta[0]}
        </button>
      </form>

      {!isForgot && (
        <div className={styles.social}>
          <p className={styles.orText}>or continue with</p>
          <div className={styles.socialGrid}>
            <button
              type="button"
              onClick={() => startSocial("google")}
              disabled={busy}
              className={styles.socialBtn}
            >
              <GoogleGlyph />
              {socialPending === "google" ? "Redirecting…" : "Google"}
            </button>
            <button
              type="button"
              onClick={() => startSocial("github")}
              disabled={busy}
              className={styles.socialBtn}
            >
              <GitHubIcon size={16} />
              {socialPending === "github" ? "Redirecting…" : "GitHub"}
            </button>
          </div>
        </div>
      )}

      <p className={styles.switch}>
        {isForgot ? (
          <button
            type="button"
            onClick={() => go("signin")}
            className={styles.link}
          >
            Back to sign in
          </button>
        ) : (
          <>
            {isSignup ? "Already have an account? " : "New to Dataslope? "}
            <button
              type="button"
              onClick={() => go(isSignup ? "signin" : "signup")}
              className={styles.link}
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
