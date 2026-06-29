// Reuse the home route's Tailwind + Magic UI bundle and the `.ds-home`-scoped
// chrome (HomeNav / HomeFooter), matching the /pricing page's composition.
import "@/app/magicui.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { SignInClient } from "./SignInClient";

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
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home flex min-h-screen flex-col bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-sm">
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
                Sign in to Dataslope
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
                Continue with a provider below.
              </p>
            </div>
            <div className="mt-8">
              <SignInClient />
            </div>
          </div>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
