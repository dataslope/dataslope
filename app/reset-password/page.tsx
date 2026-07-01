// Same self-contained, flat auth chrome as /sign-in (design option "2a"): a
// top-left brand lockup plus a single centered card, styled with the shared
// auth CSS module — no magicui.css / HomeNav / HomeFooter. Global resets come
// from app/globals.css (imported in the root layout).
import type { Metadata } from "next";
import Link from "../_components/Link";
import { ResetPasswordClient } from "./ResetPasswordClient";
import styles from "../_components/auth/authCard.module.css";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your Dataslope account.",
  robots: { index: false, follow: false },
};

const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function ResetPasswordPage() {
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
            <ResetPasswordClient />
          </div>
        </main>
      </div>
    </>
  );
}
