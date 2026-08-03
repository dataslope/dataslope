/**
 * `/illustration-prompts`, the admin-only review surface for the generated
 * illustrations.
 *
 * It is where the art gets judged: a grid of the background-removed cut-outs
 * over the live page background (flip it with the docked theme pill), each with
 * the exact GPT Image 2 prompt that produced it, a link to the lesson it
 * renders on, and a control to queue it for regeneration with a note.
 *
 * This file is only the shell. The page stays statically prerendered and holds
 * no prompt data at all: the client fetches everything from
 * `GET /api/admin/illustration-prompts`, which enforces the admin check. That
 * is the codebase's "auth gates actions, not content" rule applied to a page
 * whose content is itself the thing being gated — a non-admin gets this shell
 * and an access-denied notice, never the corpus.
 *
 * The footer link stays public on purpose; following it just shows the notice.
 */
import type { Metadata } from "next";
import { IllustrationPromptsClient } from "./IllustrationPromptsClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Illustration prompts",
  description:
    "Admin review gallery for the generated illustrations across the Dataslope courses and interview prep.",
  robots: { index: false, follow: false },
};

export default function IllustrationPromptsPage() {
  return <IllustrationPromptsClient />;
}
