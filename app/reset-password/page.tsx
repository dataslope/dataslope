// Reuse the home route's bundle and `.ds-home`-scoped chrome, like /sign-in.
import "@/app/magicui.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { ResetPasswordClient } from "./ResetPasswordClient";

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
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home flex min-h-screen flex-col bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-sm">
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
                Reset your password
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
                Choose a new password for your account.
              </p>
            </div>
            <div className="mt-8">
              <ResetPasswordClient />
            </div>
          </div>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
