// Opt the home route into Tailwind + the Magic UI components. Importing the
// shared stylesheet here scopes it to the home page bundle (see app/tailwind.css).
import "@/app/tailwind.css";
// Home-only hardening against /learn's global styles leaking in after a
// client-side back-navigation (see app/home.css).
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeClient } from "./_components/home/HomeClient";
import { getCourseCatalog, type CatalogCourse } from "@/lib/courseCatalog";
import generatedStats from "@/lib/generated/home-stats";
import type { HomeStats } from "./_components/home/StatsBento";
import { JsonLd } from "./_components/JsonLd";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { organizationLd, websiteLd } from "@/lib/structuredData";

const HOME_TITLE = "Dataslope, Learn Python, SQL, C++ in your browser";
const HOME_DESCRIPTION =
  "Interactive, no sign-up, free. Browser-based playgrounds and courses for Python, SQL, C++, and more, all running on WebAssembly.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s · DataSlope" template so the
  // home title isn't suffixed with a redundant second "Dataslope".
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "DataSlope",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Applies the persisted theme (the `theme` localStorage key + an explicit
// `dark`/`light` class on <html>, shared with the Fumadocs-powered docs
// routes) before first paint, so a returning dark-mode visitor never sees a
// light flash. The explicit `light` class also stops scheme-detecting
// components (e.g. the challenge-card editor) from falling back to the OS
// preference. A missing/"light" value leaves the page in its light default.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

// Figures shown in the home page's Magic UI bento grid.
//
// The raw counts come from `scripts/build-home-stats.mjs`, which scans the MDX
// corpus at build time so they never drift from reality. They used to be
// scanned HERE, reading ~800 files per render — which cannot work on
// Cloudflare Workers, where there is no filesystem, so any `/` that had to
// render on demand instead of coming from the incremental cache returned a
// 500 (see `open-next.config.ts`, and the 2026-08-05 incident where a cache
// cleanup deleted the folder a preview was serving). Keep this path free of
// `node:fs`.
//
// The flooring stays here: it is a display choice, and the grid appends "+"
// so the figure stays honest as the corpus grows between builds.
function getHomeStats(courses: CatalogCourse[]): HomeStats {
  const floorTo = (n: number, step: number) => Math.floor(n / step) * step;

  return {
    runnableCodeBlocks: floorTo(generatedStats.runnableCodeBlocks, 100),
    codeChallenges: floorTo(generatedStats.codeChallenges, 50),
    interviewRoles: generatedStats.interviewRoles,
    courses: courses.length,
  };
}

export default async function Home() {
  // Popularity-sorted catalog (shared with /courses), the Courses section
  // shows the top four and filters by topic client-side.
  const courses = await getCourseCatalog();
  const stats = getHomeStats(courses);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <JsonLd data={[organizationLd(), websiteLd()]} />
      <HomeClient courses={courses} stats={stats} />
    </>
  );
}
