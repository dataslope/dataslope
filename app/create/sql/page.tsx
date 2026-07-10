// Builder page for a custom SQL challenge (SQLite / DuckDB / PostgreSQL,
// all in-browser). Suspense wraps the client builder for useSearchParams.
import "@/app/tailwind.css";
import "@/app/home.css";
import "@/app/hljs.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatePageShell } from "../_components/CreatePageShell";
import SqlChallengeBuilder from "./SqlChallengeBuilder";

export const metadata: Metadata = {
  title: "Create a SQL challenge",
  description:
    "Build a SQL exercise with your own tables, seed data, and checks, then share it with a link.",
};

export default function CreateSqlChallengePage() {
  return (
    <CreatePageShell
      eyebrow="Create · SQL challenge"
      title="New SQL challenge"
      lede="Define the tables and seed data, write the task, and pick the checks. Recipients query a real database in their browser."
    >
      <Suspense fallback={null}>
        <SqlChallengeBuilder />
      </Suspense>
    </CreatePageShell>
  );
}
