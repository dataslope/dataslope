// Builder page for a quiz set (an ordered, shareable collection of custom
// items). Suspense wraps the client builder for useSearchParams.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatePageShell } from "../_components/CreatePageShell";
import QuizSetBuilder from "./QuizSetBuilder";

export const metadata: Metadata = {
  title: "Create a quiz set",
  description:
    "Bundle coding challenges, SQL exercises, and multiple-choice questions into one ordered quiz with a single shareable link.",
};

export default function CreateQuizSetPage() {
  return (
    <CreatePageShell
      eyebrow="Create · Quiz set"
      title="New quiz set"
      lede="Pick the challenges and questions, put them in order, and share one link to the whole quiz."
    >
      <Suspense fallback={null}>
        <QuizSetBuilder />
      </Suspense>
    </CreatePageShell>
  );
}
