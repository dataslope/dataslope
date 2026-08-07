// Admin section of the dashboard. All chrome (sidebar, top bar, breadcrumb)
// comes from the /dashboard layout's Studio shell — including the section
// navigation, which used to be a row of tabs here (`_components/AdminTabs.tsx`)
// and is now the Admin group in the sidebar, so a section is one click away
// from anywhere in the dashboard instead of two.
//
// Width is a per-page decision (<AdminNarrow> for the table pages, the full
// column for the galleries), so this layout caps nothing.
//
// Pages stay statically prerendered; all authorization happens server-side on
// the endpoints each page calls (the codebase's "auth gates actions, not
// content" rule), and a non-admin who opens an admin *data* page just sees an
// access-denied notice. The build/design tools in this section (charts, color
// test, email preview) call no such endpoint: they render generated artifacts
// from this repo and are deliberately open, see the note in _studio/nav.ts.
import "@/app/tailwind.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  description: "Manage Dataslope users.",
  // Internal tooling, keep it out of search results.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-w-0">{children}</main>;
}
