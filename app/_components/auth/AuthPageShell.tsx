// Shared chrome for the standalone auth routes (/sign-in, /sign-up,
// /forgot-password, /reset-password): the pre-paint theme bootstrap, a
// top-left brand lockup, and a single centered card. Self-contained
// styling via the shared auth CSS module, no tailwind.css / HomeNav /
// HomeFooter (global resets come from app/globals.css in the root layout).
import type { ReactNode } from "react";
import Link from "../Link";
import styles from "./authCard.module.css";

// Applies the persisted light/dark choice before first paint (same contract
// as the home and pricing pages) so a returning dark-mode visitor sees no
// flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export function AuthPageShell({ children }: { children: ReactNode }) {
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
          <div className={styles.card}>{children}</div>
        </main>
      </div>
    </>
  );
}
