"use client";

// Dashboard navigation for /admin. To add a section, add a route folder
// under app/admin/ and one entry to NAV below, the layout handles the rest.
//
// Desktop: a sticky vertical rail. Mobile: the same items as a horizontally
// scrollable chip row above the content (the "Admin" caption is desktop-only).
import { usePathname } from "next/navigation";
import { FlaskConical, Sparkles, Users } from "lucide-react";
import Link from "../../_components/Link";

const NAV = [
  { href: "/admin", label: "Users", icon: Users },
  { href: "/admin/test-users", label: "Test users", icon: FlaskConical },
  { href: "/admin/ai-usage", label: "AI usage", icon: Sparkles },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="md:w-52 md:shrink-0">
      <div className="md:sticky md:top-24">
        <div className="hidden px-3 pb-2 text-xs font-semibold tracking-wide text-[var(--ds-gray-500)] uppercase md:block dark:text-[var(--ds-gray-500)]">
          Admin
        </div>
        <nav
          aria-label="Admin sections"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            // Exact match for the index; prefix match for nested sections so
            // future sub-pages (e.g. /admin/ai-usage/2026-07-01) stay lit.
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors md:gap-2.5 md:rounded-lg md:px-3 md:py-2 " +
                  (active
                    ? "bg-zinc-500/[0.09] text-[var(--ds-gray-900)] dark:bg-white/10 dark:text-white"
                    : "text-[var(--ds-gray-600)] hover:bg-zinc-500/[0.06] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-400)] dark:hover:bg-white/5 dark:hover:text-white")
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
