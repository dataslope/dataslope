// Admin section of the dashboard. Chrome comes from the Studio shell; width
// is a per-page decision, so this layout caps nothing. Pages stay statically
// prerendered — authorization happens server-side on the endpoints each page
// calls, and the build/design tools are deliberately open (see _studio/nav.ts).
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
