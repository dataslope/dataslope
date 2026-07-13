// Admin section of the dashboard. Chrome (sidebar + top bar) comes from the
// /dashboard layout's Studio shell; this layout adds the admin section tabs
// above each page's content. Pages stay statically prerendered; all
// authorization happens server-side on the endpoints each page calls (the
// codebase's "auth gates actions, not content" rule), and a non-admin who
// opens any admin page just sees an access-denied notice.
import "@/app/tailwind.css";
import type { Metadata } from "next";
import { AdminTabs } from "./_components/AdminTabs";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  description: "Manage Dataslope users.",
  // Internal tool behind admin auth, keep it out of search results.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <AdminTabs />
      <main className="mt-6 min-w-0">{children}</main>
    </div>
  );
}
