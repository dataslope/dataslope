// The registration route, its own unique URL rather than /sign-in?mode=signup.
// Reuses the shared auth chrome and the same SignInClient card, opened straight
// into its "Create account" mode.
import type { Metadata } from "next";
import { SignInClient } from "../sign-in/SignInClient";
import { AuthPageShell } from "../_components/auth/AuthPageShell";

const PAGE_DESCRIPTION =
  "Create a free Dataslope account to save your playground workspaces across devices, share them, and use AI. All courses and playgrounds stay free without an account.";

export const metadata: Metadata = {
  title: "Create your account",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/sign-up" },
  // A registration screen has no SEO value and shouldn't appear in results.
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthPageShell>
      <SignInClient initialMode="signup" />
    </AuthPageShell>
  );
}
