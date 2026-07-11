// The `/playground` index: the shared home nav/footer wrap a centered title
// block over the "Start something new" language grid, matching the courses /
// interview-prep landing pattern (`app/courses/page.tsx`). Opt into the same
// Tailwind + home-route hardening those pages use so the reused HomeNav /
// HomeFooter (which rely on `.ds-home`-scoped rules in home.css) lay out
// correctly.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import Link from "../_components/Link";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { PLAYGROUNDS } from "../_components/playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../_components/languageIcons";
import { PlaygroundWorkspaces } from "./PlaygroundWorkspaces";
import { OG_IMAGE } from "@/lib/site";

const PLAYGROUND_DESCRIPTION =
  "Free online coding playgrounds that run entirely in your browser, Python, R, SQL, JavaScript, TypeScript, HTML/CSS, React, PHP, C, C++, Java, and C#. No sign-up, no install, powered by WebAssembly.";

export const metadata: Metadata = {
  title: "Online Coding Playgrounds",
  description: PLAYGROUND_DESCRIPTION,
  alternates: { canonical: "/playground" },
  openGraph: {
    type: "website",
    url: "/playground",
    siteName: "DataSlope",
    title: "Online Coding Playgrounds · DataSlope",
    description: PLAYGROUND_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Coding Playgrounds · DataSlope",
    description: PLAYGROUND_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Applies the persisted light/dark choice before first paint (same contract as
// the home / courses / interview-prep pages) so a returning dark-mode visitor
// never sees a light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

/** Monochrome language glyph for the "Start something new" grid. Renders in
 *  `currentColor` so it tracks the link's text colour (and its hover), rather
 *  than the brand tint used elsewhere, matching the index design. */
function LanguageIcon({ id }: { id: string }) {
  const Icon = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span
      className="inline-flex size-[18px] shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <Icon size={Math.round(18 * factor)} />
    </span>
  );
}

export default function PlaygroundIndexPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="mx-auto w-full max-w-[1120px] px-4 pt-12 sm:px-6 sm:pt-16">
          {/* Centered heading, matching the courses / interview-prep header. */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
              Playground
            </h1>
            <p className="mt-6 text-base text-[var(--ds-gray-900)] [text-wrap:pretty] sm:text-lg dark:text-white">
              Browser-based playgrounds across data and engineering. Everything
              runs live in your browser, no setup, no sign-up.
            </p>
          </div>

          {/* Start something new, one link per language playground. */}
          <section className="mt-16">
            <h2 className="mb-[18px] text-xs font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-400)]">
              Start something new
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {PLAYGROUNDS.map((p) => (
                // Dense index grid, don't viewport-prefetch every link (see the
                // opt-out note in app/_components/Link.tsx).
                <Link
                  key={p.id}
                  href={p.href}
                  prefetch={false}
                  className="flex items-center gap-2.5 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]"
                >
                  <LanguageIcon id={p.id} />
                  {p.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Your workspaces, a client island (reads localStorage + the
              signed-in user's cloud backups). Always rendered, empty and
              signed-out states included. */}
          <PlaygroundWorkspaces />
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
