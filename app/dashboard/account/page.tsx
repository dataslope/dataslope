// Account section of the dashboard. Chrome (sidebar + top bar) comes from the
// /dashboard layout's Studio shell; this page renders the studio-styled
// heading + the account client.
import "@/app/tailwind.css";
import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Dataslope account.",
  // Personalized, behind sign-in, keep it out of search results.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="ds-h1">Account</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Your sign-in details, membership, and saved work.
      </p>
      <div className="mt-6">
        <AccountClient />
      </div>
    </div>
  );
}
