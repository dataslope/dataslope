// A self-contained, flat auth page (design option "2a"). Unlike /pricing and
// friends, it does NOT pull in the home route's Tailwind bundle (tailwind.css)
// or the HomeNav/HomeFooter chrome, the whole screen is a single centered
// card plus a top-left brand lockup, styled with a local CSS module. Global
// resets come from app/globals.css (imported in the root layout). The page
// chrome (theme bootstrap + brand lockup + card) is shared across the auth
// routes via AuthPageShell.
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
