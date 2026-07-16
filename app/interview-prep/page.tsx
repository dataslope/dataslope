/**
 * The `/interview-prep` landing page: a centered header over a grid of role
 * tracks. Implements the "4a" mockup from the interview-prep redesign and
 * replaces the old MDX index (`content/interview/index.mdx`) that rendered
 * inside the Fumadocs docs chrome.
 *
 * Structured exactly like `/courses` (`app/courses/page.tsx`): the shared
 * home-page nav/footer wrap a `max-w-[1120px]` main, the centered title block
 * matches the pricing/courses header, and the grid of cards is delegated to a
 * catalog component. The role/topic docs pages still live under
 * `app/interview-prep/[...slug]/`, wrapped in `DocsLayout` there; this bare
 * `/interview-prep` route is the catalog, so it is not.
 */
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { SparklesText } from "@/components/ui/sparkles-text";
import { JsonLd } from "../_components/JsonLd";
import { getInterviewTracks } from "@/lib/interviewCatalog";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { absUrl, breadcrumbLd } from "@/lib/structuredData";
import { InterviewCatalog } from "./_components/InterviewCatalog";

const PAGE_TITLE = "Interview Prep, Dataslope";
const PAGE_DESCRIPTION =
  "Free, hands-on interview prep for six data and software roles. Every SQL, coding, and concept question runs live in your browser, no setup, no sign-up.";

export const metadata: Metadata = {
  // A bare string here lets the root layout's "%s · DataSlope" template render
  // the tab title as "Interview Prep · DataSlope".
  title: "Interview Prep",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/interview-prep" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/interview-prep`,
    siteName: "DataSlope",
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

// Applies the persisted light/dark choice before first paint (same contract as
// the home + courses pages) so a returning dark-mode visitor never sees a
// light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default async function InterviewPrepPage() {
  const tracks = await getInterviewTracks();

  // BreadcrumbList + an ItemList of the role tracks, the SEO the old MDX index
  // carried, rebuilt for the catalog.
  const structuredData = [
    breadcrumbLd([{ name: "Interview Prep", url: absUrl("/interview-prep") }]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Interview Prep tracks",
      itemListElement: tracks.map((track, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: track.title,
        url: absUrl(track.url),
      })),
    },
  ];

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <JsonLd data={structuredData} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="mx-auto w-full max-w-[1120px] px-4 pt-12 sm:px-6 sm:pt-16">
          {/* Centered heading, matching the /courses + /pricing title block. */}
          <div className="mx-auto max-w-2xl text-center">
            <SparklesText
              as="h1"
              className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white"
            >
              Interview Prep
            </SparklesText>
            <p className="mt-6 text-base text-[var(--ds-gray-900)] [text-wrap:pretty] sm:text-lg dark:text-white">
              Six role tracks where every question executes. Free, in your
              browser, no sign-up. Stop recognizing answers and start producing
              them.
            </p>
          </div>

          <InterviewCatalog tracks={tracks} />
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
