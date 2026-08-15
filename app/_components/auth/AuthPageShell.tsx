// Shared chrome for the standalone auth routes: centered column, brand
// lockup above a single card, decorative globe behind it in dark mode.
// Mobile is deliberately plainer — no globe (never created there) and no
// card, so the form sits directly on a flat surface and narrow phones get
// the horizontal room back.
import "@/app/tailwind.css";
import type { ReactNode } from "react";
import Link from "../Link";
import { ThemePillToggle } from "../ThemePillToggle";
import { AuthGlobe } from "./AuthGlobe";

// Applies the persisted light/dark choice before first paint (no flash).
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      {/* `dark:[--ui-card:#121212]` repaints every `bg-card` descendant (the
          card body + the "or continue with" separator) so they match the page,
          keeping the dark surface seamless.

          Light mode does the same thing at mobile widths from the other side:
          the card is already white, so painting the *page* white (rather than
          the muted grey) below `md` is what dissolves it. Both themes then
          have a single flat surface on mobile, and `bg-card` keeps working
          unchanged for the "or continue with" separator's knockout. */}
      <div className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-white px-5 py-8 md:bg-muted md:p-10 dark:bg-[#121212] dark:[--ui-card:#121212]">
        {/* Shared light/dark toggle, same control as the site header. */}
        <div className="absolute right-4 top-4 z-20">
          <ThemePillToggle />
        </div>

        {/* Decorative globe backdrop, bottom-centre, behind the card. */}
        <AuthGlobe />

        <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
          {/* Brand lockup, same style as the home page's shared header. */}
          <Link
            href="/"
            aria-label="Dataslope home"
            className="group flex items-center justify-center gap-2 self-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dataslope-logo-blue.svg"
              alt=""
              aria-hidden="true"
              className="relative top-px h-[13px] w-auto transition-transform duration-200 group-hover:rotate-[8deg]"
            />
            <span className="text-lg font-semibold tracking-tight text-[#121212] transition-transform duration-200 group-hover:translate-x-0.5 dark:text-white">
              Dataslope
            </span>
          </Link>
          {children}
        </div>
      </div>
    </>
  );
}
