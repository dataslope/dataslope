// A self-contained, flat auth page (design option "2a"). Unlike /pricing and
// friends, it does NOT pull in the home route's Tailwind bundle (tailwind.css)
// or the HomeNav/HomeFooter chrome, the whole screen is a single centered
// card plus a top-left brand lockup, styled with a local CSS module. Global
// resets come from app/globals.css (imported in the root layout).
import type { Metadata } from "next";
import Link from "../_components/Link";
import { SignInClient } from "./SignInClient";
import styles from "../_components/auth/authCard.module.css";

const PAGE_DESCRIPTION =
  "Sign in to Dataslope with Google or GitHub to sync your playground workspaces across devices, share them, and use AI. All courses and playgrounds stay free without an account.";

export const metadata: Metadata = {
  title: "Sign in",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/sign-in" },
  // A sign-in screen has no SEO value and shouldn't appear in search results.
  robots: { index: false, follow: false },
};

// Applies the persisted light/dark choice before first paint (same contract as
// the home and pricing pages) so a returning dark-mode visitor sees no flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function SignInPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div className={styles.page}>
        {/* Blue Dataslope logo, top-left of the page (not inside the card). */}
        <header className={styles.brandBar}>
          <Link href="/" aria-label="Dataslope home" className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dataslope-logo-blue.svg"
              alt=""
              aria-hidden="true"
              className={styles.brandLogo}
            />
            <span className={styles.brandWord}>Dataslope</span>
          </Link>
        </header>

        <main className={styles.main}>
          <div className={styles.card}>
            <SignInClient />
          </div>
        </main>
      </div>
    </>
  );
}
