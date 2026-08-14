/**
 * Admin → Illustration Prompts: review surface for the generated
 * illustrations. This file is only the statically prerendered shell — the
 * client fetches everything from GET /api/admin/illustration-prompts, which
 * enforces the admin check, so a non-admin never receives the corpus.
 */
import type { Metadata } from "next";
import { AdminPageHeader } from "../_components/shared";
import { IllustrationPromptsClient } from "./IllustrationPromptsClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Illustration Prompts",
  description:
    "Admin review gallery for the generated illustrations across the Dataslope courses and interview prep.",
  robots: { index: false, follow: false },
};

export default function IllustrationPromptsPage() {
  return (
    <>
      <AdminPageHeader
        title="Illustration Prompts"
        description="Every generated illustration as the site serves it, with the prompt that produced it and a queue for redraws."
      />
      <IllustrationPromptsClient />
    </>
  );
}
