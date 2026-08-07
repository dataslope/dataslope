// /admin, Users section (the dashboard index). Shell + sidebar live in
// layout.tsx; this page only renders the section content.
import type { Metadata } from "next";
import { AdminNarrow } from "./_components/shared";
import { UsersClient } from "./UsersClient";

export const metadata: Metadata = {
  title: "Users",
};

export default function AdminUsersPage() {
  return (
    <AdminNarrow>
      <UsersClient />
    </AdminNarrow>
  );
}
