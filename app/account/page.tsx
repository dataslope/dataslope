// Reuse the home route's bundle and `.ds-home`-scoped chrome, like /pricing
// and /sign-in.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Dataslope account.",
  // Personalized, behind sign-in — keep it out of search results.
  robots: { index: false, follow: false },
};

const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function AccountPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home flex min-h-screen flex-col bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="flex flex-1 items-start justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
              Account
            </h1>
            <div className="mt-8">
              <AccountClient />
            </div>
          </div>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
