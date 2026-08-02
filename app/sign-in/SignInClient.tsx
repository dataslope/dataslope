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

/** Where to land after a successful sign-in when we don't know where
 *  the visitor came from (direct /sign-in loads, private mode). The
 *  usual case resolves to the page they were on instead, see
 *  `resolveCallbackUrl` below and _components/auth/returnTo.ts. */
const FALLBACK_CALLBACK_URL = "/dashboard/account";

/**
 * The post-sign-in destination: an explicit, validated `?next=` param
 * wins, then the tracked "page the user came from" (recorded per-tab by
 * ReturnToTracker in the root layout, it sees client-side navigations,
 * which document.referrer misses), then /account. Read via
 * window.location (not useSearchParams) so the page keeps prerendering
 * statically without a Suspense boundary.
 */
function resolveCallbackUrl(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  if (isSafeReturnPath(next)) return next;
  return readReturnTo() ?? FALLBACK_CALLBACK_URL;
}

/**
 * Friendly copy for the `?error=<code>` a failed OAuth callback forwards here
 * (see `onAPIError` in lib/auth/server.ts). The dominant code,
 * `state_mismatch`, has two known shapes:
 *
 *   - The one-time `state` cookie didn't make it back to the callback host.
 *     This used to fail *every* sign-in started on www.dataslope.com (the
 *     host-only cookie stayed on www while Google returned to the apex);
 *     fixed by domain-scoping the cookie, see `oauthStateCookieDomain` in
 *     lib/auth/server.ts. It still happens on hosts no cookie can bridge,
 *     e.g. a workers.dev preview, where retrying (now from the apex this
 *     error page landed on) is genuinely the fix.
 *   - A *duplicate* callback request whose state was already consumed by the
 *     request that signed the user in, a session exists, and the signed-in
 *     redirect below whisks the visitor to /account before any copy renders.
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

/** Browser-tab title per mode, mirroring the dedicated routes' metadata
 *  (the root layout appends "· DataSlope"). Kept in step client-side because
 *  switching modes doesn't navigate, so Next never re-runs the route metadata. */
const DOC_TITLE: Record<Mode, string> = {
  signin: "Sign in",
  signup: "Create your account",
  forgot: "Reset your password",
};

/**
 * Auth card spanning three modes, sign in, create account, and request a
 * password reset, styled on the shadcn UI login block (social buttons up
 * top, an "Or continue with" divider, then email + password).
 *
 * Success paths (destination = resolveCallbackUrl(): the page the user
 * came from, else /account):
 *   - sign in → session set, redirect to the destination
 *   - sign up → if verification is required, show a "check your email" notice
 *               and switch to sign-in; otherwise redirect to the destination
 *   - forgot  → always show a neutral "if an account exists…" notice
 *
 * Verification + reset only do anything once RESEND_API_KEY is configured
 * server-side; until then those calls surface a friendly error.
 *
 * There is no name field: Better Auth's `user.name` column is required (social
 * logins fill it from the provider profile), so for email sign-ups we derive a
 * name from the email's local-part rather than asking for it.
 */
export function SignInClient({
  /** Which form to open on first render. The dedicated /sign-up and
   *  /forgot-password routes pass "signup"/"forgot"; /sign-in defaults to
   *  "signin". */
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

  // A signed-in visitor has no reason to be on the sign-in/registration screen
  //, send them back where they came from (or to their account).
  useEffect(() => {
    if (!isPending && session) router.replace(resolveCallbackUrl());
  }, [isPending, session, router]);

  // Surface a forwarded OAuth-callback failure (`/sign-in?error=<code>`) and
  // scrub the code from the address bar so it doesn't linger through reloads,
  // bookmarks, or copied links. Read via window.location (not useSearchParams)
  // so the page keeps prerendering statically without a Suspense boundary,
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

  // A browser Back from the OAuth provider can restore this page from the
  // bfcache with `socialPending`/`submitting` still set from before the
  // navigation, which would leave every control disabled with no request in
  // flight. `pageshow` with `persisted` fires exactly on that restore.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      setSocialPending(null);
      setSubmitting(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Keep the browser-tab title tracking the visible form. `go()` swaps the
  // URL with replaceState (no navigation), so Next doesn't re-apply the
  // route's metadata title, do it here.
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
  // Leading glyph for the primary button, matched to the action (same 14px
  // size as the shared header's Sign in button).
  const SubmitIcon = isForgot ? Mail : isSignup ? UserPlus : LogIn;

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    // Keep the address bar in step with the visible form (the dedicated
    // /sign-in, /sign-up and /forgot-password routes) without a full
    // navigation, so a reload or shared link lands on the same screen while
    // the typed email + password survive the switch.
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
    // Full-page redirect to the provider, returning to the resolved
    // callback URL. On success the client's redirect plugin navigates
    // away, so the button staying "pending" is right. Server-side
    // failures resolve with {error} (they do NOT reject), e.g. the
    // provider isn't configured in this environment, and must
    // re-enable the card; a rejection is a network failure and must too.
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
        // The server already answers 200 with a neutral body for unknown
        // emails, so the form can't probe which addresses are registered.
        // A returned error is therefore always a genuine failure (sender not
        // configured, Resend outage), surfacing it leaks nothing, and
        // pretending the link was sent would leave the user waiting forever.
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

    // `user.name` is NOT NULL and required by Better Auth; for email sign-ups we
    // derive it from the email rather than prompting for it.
    const derivedName = email.split("@")[0]?.trim() || email;

    // Server-side failures resolve with {error}; only a network-level failure
    // rejects, catch it so the form doesn't stay disabled at "Signing in…".
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
        // When verification is required, an unverified sign-in is rejected and a
        // fresh verification email is sent, tell the user to check their inbox.
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setNotice(
            "Please verify your email first. We've sent you a new verification link.",
          );
        } else if (isSignup && error.code === "USER_ALREADY_EXISTS") {
          // Sign-up never attaches a password to an existing account, it only
          // ever creates a new user, so a same-email sign-up is a collision.
          // The most common cause is someone who first signed in with Google or
          // GitHub and doesn't realize they already have an account. Point them
          // at signing in (including socially) or the reset flow to set a
          // password, rather than the bare "User already exists". (This branch
          // only runs where Better Auth surfaces the collision as an error;
          // when email verification is on it instead returns a neutral success
          // to prevent enumeration, handled below.)
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

      // Sign-up with verification required returns no active session, prompt to
      // verify rather than redirecting into a gated page. The copy is kept
      // honest for BOTH outcomes this branch covers without leaking which one
      // happened: a genuinely new sign-up (a link really is on its way) and a
      // same-email collision, where Better Auth returns this same neutral
      // success to prevent user enumeration and no account or password was
      // created. So it avoids claiming "account created" and nudges an existing
      // (often social) user to just sign in.
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

    // Session is set; return to the originating page (and re-render the
    // header so it shows the signed-in state).
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
