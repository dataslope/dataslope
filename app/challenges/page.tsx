// Challenge catalog (/challenges).
//
// Part of the main site, like /courses and /interview-prep: the shared
// HomeNav / HomeFooter around a centered content column. It used to live
// under /dashboard inside the Studio shell, which swapped the whole page
// chrome out from under anyone who clicked "Challenges" in the header;
// `/dashboard/challenges` now redirects here (next.config.ts). The page body
// is `ChallengesList`.
//
// Static: the catalog is a module (`lib/challenges`), and the filtering and
// paging happen in the browser over the full list, so there is no server work
// per request. Progress (solved / in progress / not started) is read from
// localStorage after hydration.

// Same Tailwind bundle + home-route hardening as the home page, so the reused
// HomeNav/HomeFooter (`.ds-home`-scoped rules) lay out correctly. The list
// brings its own tokens in `_components/ChallengesList.module.css`.
import "@/app/tailwind.css";
import "@/app/home.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getChallengeIndex } from "@/lib/challenges";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { HomeNav } from "@/app/_components/home/HomeNav";
import { HomeFooter } from "@/app/_components/home/HomeFooter";
import { ChallengesList, ChallengesListFallback } from "./_components/ChallengesList";

const PAGE_TITLE = `Challenges · ${SITE_NAME}`;
const PAGE_DESCRIPTION =
  "Short problems with instant feedback, from single queries to multi-step challenges that unlock as you pass them.";

export const metadata: Metadata = {
  // Bare string so the root template renders "Challenges · Dataslope".
  title: "Challenges",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/challenges" },
  // Without these the share card fell back to the home page's title.
  openGraph: {
    type: "website",
    url: `${SITE_URL}/challenges`,
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
    <>
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main
          id="main"
          className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16"
        >
          <Suspense fallback={<ChallengesListFallback entries={entries} />}>
            <ChallengesList entries={entries} />
          </Suspense>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
