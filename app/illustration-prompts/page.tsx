/**
 * `/illustration-prompts`, a build-time review page for the custom risograph
 * illustrations authored across the courses and interview prep.
 *
 * The prompt definitions live in `data/illustration-prompts.json`; each one
 * gets a card here with its target PNG file name (e.g.
 * `python-basics-thumbnail.png`), the exact GPT Image 2 generation prompt and a
 * copy button, and a deep link to the lesson that embeds it, so the full set of
 * illustrations to draw can be skimmed and copied from one place, or generated
 * in bulk with `scripts/generate-illustrations.mjs`.
 *
 * The payload is tiny, so the data is built at request time and prerendered
 * straight into this static page. Interactivity (theme toggle, copy buttons)
 * lives in the client child.
 */
import type { Metadata } from "next";
import { getIllustrationPrompts } from "@/lib/illustrationPromptsGallery";
import { IllustrationPromptsClient } from "./IllustrationPromptsClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Illustration prompts",
  description:
    "GPT Image 2 prompts for the custom risograph illustrations across the Dataslope courses and interview prep.",
  robots: { index: false, follow: false },
};

export default function IllustrationPromptsPage() {
  const data = getIllustrationPrompts();
  return <IllustrationPromptsClient data={data} />;
}
