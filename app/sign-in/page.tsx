// Self-contained flat auth page: no home Tailwind bundle or HomeNav/HomeFooter
// chrome, just the AuthPageShell (theme bootstrap + brand lockup + card)
// shared across the auth routes, styled with a local CSS module.
import type { Metadata } from "next";
import { SignInClient } from "./SignInClient";
import { AuthPageShell } from "../_components/auth/AuthPageShell";

const PAGE_DESCRIPTION =
  "Sign in to Dataslope with Google or GitHub to sync your playground workspaces across devices, share them, and use AI. All courses and playgrounds stay free without an account.";

export const metadata: Metadata = {
  title: "Sign in",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/sign-in" },
  // A sign-in screen has no SEO value and shouldn't appear in search results.
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthPageShell>
      <SignInClient />
    </AuthPageShell>
  );
}
