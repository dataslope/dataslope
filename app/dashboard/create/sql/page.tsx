// Builder page for a custom SQL challenge (SQLite / DuckDB / PostgreSQL,
// all in-browser). Suspense wraps the client builder for useSearchParams.
// Chrome comes from the /create layout; this page renders the heading + form.
import "@/app/tailwind.css";
import "@/app/home.css";
import "@/app/hljs.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import SqlChallengeBuilder from "./SqlChallengeBuilder";

export const metadata: Metadata = {
  title: "Create a SQL challenge",
  description:
    "Build a SQL exercise with your own tables, seed data, and checks, then share it with a link.",
};

export default function CreateSqlChallengePage() {
  return (
    <Suspense fallback={null}>
      <SqlChallengeBuilder />
    </Suspense>
  );
}
