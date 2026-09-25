/**
 * The `/playground` landing page: hero, language chooser, and a recent-
 * workspaces preview, wrapped in the shared home chrome. Signed-in state and
 * the recent list are client islands so the shell stays a static prerender;
 * the dashboard page holds the full, paginated workspace view.
 */
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { JsonLd } from "../_components/JsonLd";
import { PLAYGROUNDS } from "../_components/playgrounds";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { absUrl, breadcrumbLd } from "@/lib/structuredData";
import { LanguageCategories } from "./_components/LanguageCategories";
import { PlaygroundHero } from "./_components/PlaygroundHero";
import { RecentWorkspaces } from "./_components/RecentWorkspaces";

const PAGE_TITLE = `Playground · ${SITE_NAME}`;
// Named from the registry, like the count on the page, so neither can fall
// behind when a playground is added.
const PLAYGROUND_NAMES = new Intl.ListFormat("en", {
  type: "conjunction",
}).format(PLAYGROUNDS.map((p) => p.label));
const PAGE_DESCRIPTION = `Free online coding playgrounds that run entirely in your browser: ${PLAYGROUND_NAMES}. No sign-up, no install, powered by WebAssembly.`;

export const metadata: Metadata = {
  // Bare string so the root layout's template renders "Playground · Dataslope".
  title: "Playground",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/playground" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/playground`,
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

// Applies the persisted light/dark choice before first paint (same contract
// as the home page) so returning dark-mode visitors see no light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default function PlaygroundPage() {
  // BreadcrumbList + an ItemList of the language playgrounds, for the
  // "online <lang> playground" queries these pages target.
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

        {/* <main> clips, the wrapper caps the width. The hero's full-bleed
            `w-screen` escape counts a classic scrollbar the viewport doesn't
            offer, which would scroll the page sideways — the clip must live
            here, one level above the width cap, or it would cut the band back
            to the column. Same shape as /pricing and the home page. */}
        <main className="overflow-x-clip">
          <div className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
                Playground
              </h1>
              <p className="mt-6 text-base text-[var(--ds-gray-900)] [text-wrap:pretty] sm:text-lg dark:text-white">
                Full code editors for {PLAYGROUNDS.length} languages and
                tools, running entirely in your browser. Free, no setup, no
                sign-up.
              </p>
            </div>

            <PlaygroundHero />

            <LanguageCategories />

            <RecentWorkspaces />
          </div>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
