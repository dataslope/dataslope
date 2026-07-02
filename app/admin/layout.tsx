// Shared shell for every /admin page: site nav on top, dashboard sidebar on
// the left, page content on the right. Adding a new admin section = one new
// route folder + one entry in AdminSidebar's NAV list.
//
// Reuses the home route's bundle and `.ds-home`-scoped chrome, like /account
// and /sign-in. `tailwind.css` also supplies the shadcn design tokens the
// dashboard's UI primitives (components/ui) are styled against. Pages stay
// statically prerendered; all authorization happens server-side on the
// endpoints each page calls (the codebase's "auth gates actions, not
// content" rule).
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { AdminSidebar } from "./_components/AdminSidebar";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  description: "Manage Dataslope users.",
  // Internal tool behind admin auth — keep it out of search results.
  robots: { index: false, follow: false },
};

const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home flex min-h-screen flex-col bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 md:flex-row md:gap-10 md:py-10">
          <AdminSidebar />
          <main className="min-w-0 flex-1 pb-10">{children}</main>
        </div>
      </div>
    </>
  );
}
