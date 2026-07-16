/**
 * The `/playground` landing page: the public, indexable entry point to the
 * browser-based playgrounds. A centered hero over the language chooser
 * (`LanguageCategories`) and a preview of the visitor's most recent
 * workspaces (`RecentWorkspaces`), wrapped in the shared home-page chrome
 * (`HomeNav` / `HomeFooter`), matching the "Playground Page" design handoff.
 *
 * Structured like `/courses` and `/interview-prep`: the shared nav/footer wrap
 * a centered title block and the page's content sections. Signed-in state
 * (account menu, cloud usage) and the recent-workspace list are client islands
 * (`AuthMenu` inside `HomeNav`, `RecentWorkspaces`) so the shell stays a static
 * prerender.
 *
 * History: this route used to 308-redirect to `/dashboard/playground`. The
 * dashboard page remains the full, paginated "all workspaces" view (linked
 * from the recent-workspaces preview here); this page is the marketing/landing
 * surface the header's "Playground" link points at.
 */
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { JsonLd } from "../_components/JsonLd";
import { SparklesText } from "@/components/ui/sparkles-text";
import { PLAYGROUNDS } from "../_components/playgrounds";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { absUrl, breadcrumbLd } from "@/lib/structuredData";
import { LanguageCategories } from "./_components/LanguageCategories";
import { RecentWorkspaces } from "./_components/RecentWorkspaces";

const PAGE_TITLE = "Playground, Dataslope";
const PAGE_DESCRIPTION =
  "Free online coding playgrounds that run entirely in your browser: Python, R, SQL, JavaScript, TypeScript, HTML/CSS, React, PHP, C, C++, Java, and C#. No sign-up, no install, powered by WebAssembly.";

export const metadata: Metadata = {
  // A bare string lets the root layout's "%s · DataSlope" template render the
  // tab title as "Playground · DataSlope".
  title: "Playground",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/playground" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/playground`,
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
// the home / courses pages) so a returning dark-mode visitor never sees a
// light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function PlaygroundPage() {
  // BreadcrumbList + an ItemList of the language playgrounds, the SEO for the
  // "online <lang> playground" queries these landing pages target.
  const structuredData = [
    breadcrumbLd([{ name: "Playground", url: absUrl("/playground") }]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Dataslope playgrounds",
      itemListElement: PLAYGROUNDS.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.label,
        url: absUrl(p.href),
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

        <main className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          {/* Centered heading, matching the /courses + /interview-prep title
              block. */}
          <div className="mx-auto max-w-2xl text-center">
            {/* Magic UI sparkles on the title, in the brand palette. */}
            <SparklesText
              as="h1"
              className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white"
            >
              Playground
            </SparklesText>
            <p className="mt-6 text-base text-[var(--ds-gray-900)] [text-wrap:pretty] sm:text-lg dark:text-white">
              Full code editors that run entirely in your browser. Fourteen
              languages, free, no setup, no sign-up.
            </p>
          </div>

          <LanguageCategories />

          <RecentWorkspaces />
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
