// Builder page for a quiz set (an ordered, shareable collection of custom
// items). Suspense wraps the client builder for useSearchParams. Chrome comes
// from the /create layout; this page renders the heading + form.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BuilderHeader } from "../_studio/BuilderHeader";
import QuizSetBuilder from "./QuizSetBuilder";

export const metadata: Metadata = {
  title: "Create a quiz set",
  description:
    "Bundle coding challenges, SQL exercises, and multiple-choice questions into one ordered quiz with a single shareable link.",
};

export default function CreateQuizSetPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <BuilderHeader
        title="New quiz set"
        lede="Pick the challenges and questions, put them in order, and share one link to the whole quiz."
        aiPlaceholder="Describe the quiz and AI drafts a title and description"
      />
      <Suspense fallback={null}>
        <QuizSetBuilder />
      </Suspense>
    </div>
  );
}
