// Reuse the home route's bundle and `.ds-home`-scoped chrome, like /account
// and /sign-in. `magicui.css` also supplies the shadcn design tokens the
// dashboard's UI primitives (components/ui) are styled against.
import "@/app/magicui.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage Dataslope users.",
  // Internal tool behind admin auth — keep it out of search results.
  robots: { index: false, follow: false },
};

const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function AdminPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home flex min-h-screen flex-col bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="flex flex-1 items-start justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
              Admin
            </h1>
            <p className="mt-2 text-[15px] text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
              Manage user accounts.
            </p>
            <div className="mt-8">
              <AdminClient />
            </div>
          </div>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
