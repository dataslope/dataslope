// /admin, Users section (the dashboard index). Shell + sidebar live in
// layout.tsx; this page only renders the section content.
import type { Metadata } from "next";
import { UsersClient } from "./UsersClient";

export const metadata: Metadata = {
  title: "Users",
};

export default function AdminUsersPage() {
  return <UsersClient />;
}
