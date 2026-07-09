/**
 * `/illustration-prompts`, a build-time review page for the custom line-art
 * illustration placeholders (`<IllustrationPrompt>`) authored across the
 * `/courses`, `/fumadocs-dev`, and `/interview-prep` pages.
 *
 * Each distinct illustration gets one card with its semantic target file name
 * (e.g. `leland-wilkinson-portrait.svg`), the exact generation prompt and a
 * copy button, and deep links to every lesson that uses it, so the full set of
 * illustrations to draw can be skimmed and copied from one place.
 *
 * Unlike `/svg-gallery`, the payload is tiny (~80 short prompts), so the data
 * is collected at build time and prerendered straight into this static page
 * (no separate JSON asset / client fetch needed). Interactivity (theme toggle,
 * copy buttons) lives in the client child.
 */
import type { Metadata } from "next";
import { getIllustrationPrompts } from "@/lib/illustrationPromptsGallery";
import { IllustrationPromptsClient } from "./IllustrationPromptsClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Illustration prompts",
  description:
    "Placeholder prompts for the custom line-art illustrations across the Dataslope courses and interview prep.",
  robots: { index: false, follow: false },
};

export default function IllustrationPromptsPage() {
  const data = getIllustrationPrompts();
  return <IllustrationPromptsClient data={data} />;
}
