// Shared chrome for the standalone auth routes (/sign-in, /sign-up,
// /forgot-password, /reset-password), rebuilt on the shadcn UI auth block
// layout: a centered column on a muted page background with the brand
// lockup above a single card. Pulls in the shared Tailwind root (scoped by
// Next.js to the routes that import this component); the pre-paint theme
// bootstrap keeps the same contract as the rest of the site.
import "@/app/tailwind.css";
import type { ReactNode } from "react";
import Link from "../Link";

// Applies the persisted light/dark choice before first paint (same contract
// as the home and pricing pages) so a returning dark-mode visitor sees no
// flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-md flex-col gap-6">
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
