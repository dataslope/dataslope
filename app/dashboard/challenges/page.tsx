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
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { ChallengesList, ChallengesListFallback } from "./ChallengesList";

const PAGE_TITLE = `Challenges · ${SITE_NAME}`;
const PAGE_DESCRIPTION =
  "Short problems with instant feedback, from single queries to multi-step challenges that unlock as you pass them.";

export const metadata: Metadata = {
  // Bare string so the root template renders "Challenges · Dataslope".
  title: "Challenges",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/dashboard/challenges" },
  // Without these the share card fell back to the home page's title.
  openGraph: {
    type: "website",
    url: `${SITE_URL}/dashboard/challenges`,
    siteName: SITE_NAME,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function ChallengesPage() {
  // Read on the server and handed over as a prop, so the client bundle carries
  // the catalog rows rather than the whole catalog module (which also holds
  // every workspace's instructions, schema and source). This is also where a
  // per-user progress read would go.
  const entries = getChallengeIndex();
  // The Suspense boundary is what `useSearchParams` needs to keep this page
  // statically rendered: filters live in the query string, and without it
  // Next bails the whole route out to dynamic rendering at build time. The
  // prerendered HTML is the fallback, so the fallback is the real first page
  // with real links, not nothing: crawlers read this HTML and never run the
  // list.
  return (
    <Suspense fallback={<ChallengesListFallback entries={entries} />}>
      <ChallengesList entries={entries} />
    </Suspense>
  );
}
