// The "request a password reset link" route, its own unique URL rather than
// /sign-in?mode=forgot. Reuses the shared auth chrome and the same SignInClient
// card, opened straight into its "Reset your password" mode. (The separate
// /reset-password route is where a user sets a new password from the emailed
// link.)
import type { Metadata } from "next";
import { SignInClient } from "../sign-in/SignInClient";
import { AuthPageShell } from "../_components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a secure link to reset your Dataslope password.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <SignInClient initialMode="forgot" />
    </AuthPageShell>
  );
}
