// Builder page for a custom code challenge. The builder itself is a
// client component (form state + on-demand preview of the real
// <ChallengeCard>); useSearchParams (?edit=<id>) requires the Suspense
// boundary.
import "@/app/tailwind.css";
import "@/app/home.css";
import "@/app/hljs.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatePageShell } from "../_components/CreatePageShell";
import CodeChallengeBuilder from "./CodeChallengeBuilder";

export const metadata: Metadata = {
  title: "Create a code challenge",
  description:
    "Build an executable coding challenge with starter code, tests, and a reference solution, then share it with a link.",
};

export default function CreateChallengePage() {
  return (
    <CreatePageShell
      eyebrow="Create · Code challenge"
      title="New code challenge"
      lede="Write the instructions, starter code, and tests. Recipients solve it right in their browser, no setup, no server."
    >
      <Suspense fallback={null}>
        <CodeChallengeBuilder />
      </Suspense>
    </CreatePageShell>
  );
}
