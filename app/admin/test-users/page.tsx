// /admin/test-users, create disposable, pre-verified accounts on either
// plan for exercising member-gated features (AI autocomplete, Ask AI tiers).
import type { Metadata } from "next";
import { TestUsersClient } from "./TestUsersClient";

export const metadata: Metadata = {
  title: "Test users",
};

export default function AdminTestUsersPage() {
  return <TestUsersClient />;
}
