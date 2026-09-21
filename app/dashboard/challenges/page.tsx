// Challenge catalog (/dashboard/challenges).
//
// Lives under /dashboard so it inherits the Studio shell from
// `app/dashboard/layout.tsx`: sidebar, top bar, theme bootstrap and the
// 1280px content container. The page body is `ChallengesList`.
//
// Static: the catalog is a module (`lib/challenges`), and the filtering and
// paging happen in the browser over the full list, so there is no server work
// per request. Progress (solved / in progress / not started) is read from
// localStorage after hydration.

import { Suspense } from "react";
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
  // the catalog rows rather than the whole catalog module (which also holds
  // every workspace's instructions, schema and source). This is also where a
  // per-user progress read would go.
  //
  // The Suspense boundary is what `useSearchParams` needs to keep this page
  // statically rendered: filters live in the query string, and without it
  // Next bails the whole route out to dynamic rendering at build time.
  return (
    <Suspense fallback={null}>
      <ChallengesList entries={getChallengeIndex()} />
    </Suspense>
  );
}
