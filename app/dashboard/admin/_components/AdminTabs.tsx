"use client";

// Section tabs for the admin area, replacing the old standalone AdminSidebar
// now that /dashboard provides the sidebar. A horizontal, studio-styled tab
// row; add a section by adding a route folder + one NAV entry. Styled with the
// shell's semantic tokens so it matches the rest of the dashboard in both
// themes.
import { usePathname } from "next/navigation";
import { FlaskConical, Sparkles, Users, type LucideIcon } from "lucide-react";
import Link from "@/app/_components/Link";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/admin", label: "Users", icon: Users },
  { href: "/dashboard/admin/test-users", label: "Test users", icon: FlaskConical },
  { href: "/dashboard/admin/ai-usage", label: "AI usage", icon: Sparkles },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="-mx-1 mt-5 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard/admin"
            ? pathname === "/dashboard/admin"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap"
            style={{
              background: active ? "var(--side-active)" : "transparent",
              color: active ? "var(--ink)" : "var(--muted)",
            }}
          >
            <Icon
              className="size-4 shrink-0"
              aria-hidden="true"
              style={{ color: active ? "var(--green-text)" : "var(--muted)" }}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
