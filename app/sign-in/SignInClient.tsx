"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { GitHubIcon, GoogleIcon } from "../_components/home/icons";
import {
  requestPasswordReset,
  signIn,
  signUp,
  useSession,
} from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthCard,
  AuthLinkButton,
  AuthSeparator,
  PasswordInput,
  Spinner,
  TermsNote,
} from "../_components/auth/authBlocks";
import { isSafeReturnPath, readReturnTo } from "../_components/auth/returnTo";

/** Post-sign-in destination when no return path is known; see resolveCallbackUrl. */
const FALLBACK_CALLBACK_URL = "/dashboard/account";

/**
 * Post-sign-in destination: validated `?next=` param, else the tracked
 * return-to page, else /account. Reads window.location (not useSearchParams)
 * so the page keeps prerendering statically without a Suspense boundary.
 */
function resolveCallbackUrl(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  if (isSafeReturnPath(next)) return next;
  return readReturnTo() ?? FALLBACK_CALLBACK_URL;
}

/**
 * Friendly copy for the `?error=<code>` a failed OAuth callback forwards here
 * (see `onAPIError` in lib/auth/server.ts). `state_mismatch` means the state
 * cookie didn't reach the callback host or a duplicate callback already
 * consumed it; retrying is the fix.
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

/** Minimum password length, mirrors Better Auth's default (`minPasswordLength`). */
const MIN_PASSWORD = 8;

/** Lazy email check, matches the design's validation regex exactly. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Mode = "signin" | "signup" | "forgot";

const COPY: Record<
  Mode,
  { title: string; subtitle: string; cta: [idle: string, busy: string] }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in with your Google or GitHub account",
    cta: ["Sign in", "Signing in…"],
  },
  signup: {
    title: "Create your account",
    subtitle: "Sign up with your Google or GitHub account",
    cta: ["Create account", "Creating account…"],
  },
  forgot: {
    title: "Reset your password",
    subtitle: "We'll email you a secure reset link",
    cta: ["Send reset link", "Sending…"],
  },
};

/** Browser-tab title per mode; switching modes doesn't navigate, so Next
 *  never re-applies the route metadata (root layout appends "· DataSlope"). */
const DOC_TITLE: Record<Mode, string> = {
  signin: "Sign in",
  signup: "Create your account",
  forgot: "Reset your password",
};

/**
 * Auth card spanning sign in, create account, and password reset, styled on
 * the shadcn UI login block. Verification + reset emails require
 * RESEND_API_KEY server-side; until then those calls surface a friendly error.
 */
export function SignInClient({
  /** Initial form; /sign-up and /forgot-password pass "signup"/"forgot". */
  initialMode = "signin",
}: {
  initialMode?: Mode;
} = {}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [socialPending, setSocialPending] = useState<string | null>(null);

  // Signed-in visitors don't belong here, send them back.
  useEffect(() => {
    if (!isPending && session) router.replace(resolveCallbackUrl());
  }, [isPending, session, router]);

  // Surface a forwarded OAuth-callback failure (`?error=<code>`) and scrub it
  // from the URL. window.location (not useSearchParams) keeps the page
  // statically prerendered.
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

  // Back from the OAuth provider can restore this page from the bfcache with
  // pending flags still set, leaving every control disabled; `pageshow` with
  // `persisted` fires exactly on that restore.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      setSocialPending(null);
      setSubmitting(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // `go()` swaps the URL with replaceState (no navigation), so Next won't
  // re-apply the route's metadata title, do it here.
  useEffect(() => {
    document.title = `${DOC_TITLE[mode]} · DataSlope`;
  }, [mode]);

  if (!isPending && session) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        You&apos;re signed in, redirecting…
      </p>
    );
  }

  const isSignin = mode === "signin";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const emailError =
    emailTouched && email.length > 0 && !EMAIL_RE.test(email);
  const pwOk = password.length >= MIN_PASSWORD;
  const { title, subtitle, cta } = COPY[mode];
  const busy = submitting || socialPending !== null;
  const SubmitIcon = isForgot ? Mail : isSignup ? UserPlus : LogIn;

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    // Swap the URL without navigating so reloads and shared links land on the
    // same screen while the typed email + password survive the switch.
    const path =
      next === "signup"
        ? "/sign-up"
        : next === "forgot"
          ? "/forgot-password"
          : "/sign-in";
    window.history.replaceState(
      window.history.state,
      "",
      `${path}${window.location.search}${window.location.hash}`,
    );
  }

  async function startSocial(provider: string) {
    setSocialPending(provider);
    setError(null);
    // On success the redirect plugin navigates away, so the button stays
    // "pending". Server-side failures resolve with {error} (they do NOT
    // reject); a rejection is a network failure. Both must re-enable the card.
    try {
      const { error } = await signIn.social({
        provider,
        callbackURL: resolveCallbackUrl(),
      });
      if (error) {
        setError(
          error.message ?? "Couldn't start sign-in with that provider.",
        );
        setSocialPending(null);
      }
    } catch {
      setError(
        "Couldn't reach the server. Please check your connection and try again.",
      );
      setSocialPending(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (isForgot) {
      setSubmitting(true);
      try {
        // The server answers neutrally for unknown emails, so a returned
        // error is always a genuine failure (e.g. sender not configured);
        // surfacing it leaks nothing.
        const { error } = await requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (error) {
          setError(
            error.message ?? "Couldn't send the reset link. Please try again.",
          );
        } else {
          setNotice(
            "If an account exists for that email, a reset link is on its way.",
          );
        }
      } catch {
        setError(
          "Couldn't reach the server. Please check your connection and try again.",
        );
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    // Better Auth requires user.name; derive it rather than prompting.
    const derivedName = email.split("@")[0]?.trim() || email;

    // Server-side failures resolve with {error}; only network failures reject.
    const callbackUrl = resolveCallbackUrl();
    try {
      const { data, error } = isSignup
        ? await signUp.email({
            name: derivedName,
            email,
            password,
            callbackURL: callbackUrl,
          })
        : await signIn.email({ email, password, callbackURL: callbackUrl });

      if (error) {
        // Unverified sign-in is rejected and a fresh verification email sent.
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setNotice(
            "Please verify your email first. We've sent you a new verification link.",
          );
        } else if (isSignup && error.code === "USER_ALREADY_EXISTS") {
          // Usually a prior social sign-in, point at signing in or the reset
          // flow. (With email verification on, Better Auth instead returns a
          // neutral success to prevent enumeration, handled below.)
          setError(
            "An account already exists for that email. Try signing in below. " +
              "including with Google or GitHub if that's how you first signed " +
              "up. You can also use “Forgot password?” to set a password.",
          );
        } else {
          setError(error.message ?? "Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      // No session means verification is required. This same neutral success
      // also covers a same-email collision (anti-enumeration), so the copy
      // must not claim an account was created.
      if (isSignup && data && !("token" in data && data.token)) {
        setPassword("");
        go("signin"); // clears notice…
        setNotice(
          "Almost there. Check your email for a verification link, then sign " +
            "in. Already have an account (including with Google or GitHub)? " +
            "Just sign in instead.",
        ); // …so set it after the switch
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

    // Refresh so the header re-renders with the signed-in state.
    router.push(callbackUrl);
    router.refresh();
  }

  const socialVerb = isSignup ? "Sign up" : "Login";

  return (
    <div className="flex flex-col gap-6">
      <AuthCard title={title} description={subtitle}>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {!isForgot && (
              <>
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    className="border-border w-full"
                    disabled={busy}
                    onClick={() => void startSocial("google")}
                  >
                    {socialPending === "google" ? (
                      <>
                        <Spinner />
                        Redirecting…
                      </>
                    ) : (
                      <>
                        <GoogleIcon size={16} />
                        {socialVerb} with Google
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    className="border-border w-full"
                    disabled={busy}
                    onClick={() => void startSocial("github")}
                  >
                    {socialPending === "github" ? (
                      <>
                        <Spinner />
                        Redirecting…
                      </>
                    ) : (
                      <>
                        <GitHubIcon size={16} />
                        {socialVerb} with GitHub
                      </>
                    )}
                  </Button>
                </div>
                <AuthSeparator>Or continue with</AuthSeparator>
              </>
            )}

            <div className="grid gap-3">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                disabled={busy}
                aria-invalid={emailError || undefined}
                aria-describedby={emailError ? "auth-email-error" : undefined}
              />
              {emailError && (
                <p id="auth-email-error" className="text-destructive text-sm">
                  Enter a valid email address
                </p>
              )}
            </div>

            {!isForgot && (
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="auth-password">Password</Label>
                  {isSignin && (
                    <button
                      type="button"
                      onClick={() => go("forgot")}
                      className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--ds-blue-500)] underline-offset-4 hover:underline"
                    >
                      <KeyRound size={14} aria-hidden="true" />
                      Forgot your password?
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="auth-password"
                  required
                  minLength={MIN_PASSWORD}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  aria-describedby={isSignup ? "auth-password-hint" : undefined}
                />
                {isSignup && (
                  <p
                    id="auth-password-hint"
                    className={`text-sm ${pwOk ? "text-[var(--ds-green-700,#008b03)]" : "text-muted-foreground"}`}
                  >
                    {pwOk ? "Strong enough, looks good." : "At least 8 characters."}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="bg-muted text-foreground rounded-md px-3 py-2 text-sm"
              >
                {notice}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-[var(--ds-blue-500)] text-white hover:bg-[var(--ds-blue-550)]"
              disabled={busy}
            >
              {submitting ? (
                <>
                  <Spinner />
                  {cta[1]}
                </>
              ) : (
                <>
                  <SubmitIcon size={14} aria-hidden="true" />
                  {cta[0]}
                </>
              )}
            </Button>

            <div className="text-center text-sm">
              {isForgot ? (
                <AuthLinkButton
                  onClick={() => go("signin")}
                  icon={<ArrowLeft size={14} aria-hidden="true" />}
                >
                  Back to sign in
                </AuthLinkButton>
              ) : (
                <>
                  {isSignup
                    ? "Already have an account? "
                    : "Don't have an account? "}
                  <AuthLinkButton
                    onClick={() => go(isSignup ? "signin" : "signup")}
                    icon={
                      isSignup ? (
                        <LogIn size={14} aria-hidden="true" />
                      ) : (
                        <UserPlus size={14} aria-hidden="true" />
                      )
                    }
                  >
                    {isSignup ? "Sign in" : "Sign up"}
                  </AuthLinkButton>
                </>
              )}
            </div>
          </div>
        </form>
      </AuthCard>

      {!isForgot && <TermsNote />}
    </div>
  );
}
