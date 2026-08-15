// Imported here (not app/layout.tsx) so the stylesheet scopes to the home
// page bundle (see app/tailwind.css).
import "@/app/tailwind.css";
// Hardening against /learn's global styles leaking in after a client-side
// back-navigation (see app/home.css).
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
  // `absolute` opts out of the root layout's "%s · DataSlope" template.
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

// Applies the persisted theme before first paint so a returning dark-mode
// visitor never sees a light flash. The explicit `light` class also stops
// scheme-detecting components from falling back to the OS preference.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

// Figures for the home page's bento grid. Raw counts come from
// `scripts/build-home-stats.mjs` at build time — keep this path free of
// `node:fs`, which does not exist on Cloudflare Workers. Flooring is a
// display choice; the grid appends "+" so the figure stays honest.
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
  // Popularity-sorted catalog (shared with /courses).
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
