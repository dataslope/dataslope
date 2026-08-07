// /admin/test-users, create disposable, pre-verified accounts on either
// plan for exercising member-gated features (AI autocomplete, Ask AI tiers).
import type { Metadata } from "next";
import { AdminNarrow } from "../_components/shared";
import { TestUsersClient } from "./TestUsersClient";

export const metadata: Metadata = {
  title: "Test Users",
};

export default function AdminTestUsersPage() {
  return (
    <AdminNarrow>
      <TestUsersClient />
    </AdminNarrow>
  );
}
