// Builder page for a custom multiple-choice question, with a live preview
// of the real <MultipleChoiceQuestion> card (hence the katex + hljs
// styles). Suspense wraps the client builder for useSearchParams.
import "@/app/tailwind.css";
import "@/app/home.css";
import "@/app/hljs.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatePageShell } from "../_components/CreatePageShell";
import McqBuilder from "./McqBuilder";

export const metadata: Metadata = {
  title: "Create a multiple-choice question",
  description:
    "Build a multiple-choice question with per-choice feedback, Markdown, code, and math, then share it with a link.",
};

export default function CreateMcqPage() {
  return (
    <CreatePageShell
      eyebrow="Create · Multiple choice"
      title="New multiple-choice question"
      lede="Write the question and choices, mark the correct answer, and add feedback. The preview below updates as you type."
    >
      <Suspense fallback={null}>
        <McqBuilder />
      </Suspense>
    </CreatePageShell>
  );
}
