// Challenge catalog (/dashboard/challenges).
//
// Lives under /dashboard so it inherits the Studio shell from
// `app/dashboard/layout.tsx`: sidebar, top bar, theme bootstrap and the
// 1280px content container. The page body is `ChallengesList`.
//
// Static: the catalog is a module (`lib/challenges`), and the
// filtering and paging are client state over the full list, so there is no
// server work per request. Progress (solved / in progress / not started) is
// part of those fixtures today; it becomes a per-user read when challenges
// get real submissions.

import type { Metadata } from "next";
import { getChallengeIndex } from "@/lib/challenges";
import { ChallengesList } from "./ChallengesList";

const PAGE_DESCRIPTION =
  "Short problems with instant feedback, from single queries to multi-step challenges that unlock as you pass them.";

export const metadata: Metadata = {
  // Bare string so the root template renders "Challenges · DataSlope".
  title: "Challenges",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/dashboard/challenges" },
};

export default function ChallengesPage() {
  // Read on the server and handed over as a prop, so the client bundle carries
  // the 52 catalog rows rather than the whole catalog module (which also holds
  // every workspace's instructions, schema and source). This is also where a
  // per-user progress read would go.
  return <ChallengesList entries={getChallengeIndex()} />;
}
