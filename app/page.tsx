import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
// Opt the home route into Tailwind + the Magic UI components. Importing the
// shared stylesheet here scopes it to the home page bundle (see app/tailwind.css).
import "@/app/tailwind.css";
// Home-only hardening against /learn's global styles leaking in after a
// client-side back-navigation (see app/home.css).
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeClient } from "./_components/home/HomeClient";
import { getCourseCatalog, type CatalogCourse } from "@/lib/courseCatalog";
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

// Recursively read every MDX lesson under a content directory so the home
// page's stats reflect the live corpus instead of a hand-maintained number.
async function readMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await readMdxFiles(full)));
    } else if (entry.name.endsWith(".mdx")) {
      out.push(await readFile(full, "utf-8"));
    }
  }
  return out;
}

function countMatches(haystacks: string[], pattern: RegExp): number {
  return haystacks.reduce(
    (total, text) => total + (text.match(pattern)?.length ?? 0),
    0,
  );
}

// Build-time figures shown in the home page's Magic UI bento grid. Computed by
// scanning the MDX corpus so they never drift from reality, then floored to a
// round number for display (the grid renders them with a trailing "+").
async function getHomeStats(courses: CatalogCourse[]): Promise<HomeStats> {
  const contentDir = path.join(process.cwd(), "content");
  // Courses + the fumadocs-dev demo pages + interview prep, the same corpus
  // that lived under content/learn + content/interview before the split, so
  // the figures stay comparable across the route restructuring.
  const [courseMdx, devMdx, interviewMdx] = await Promise.all([
    readMdxFiles(path.join(contentDir, "courses")),
    readMdxFiles(path.join(contentDir, "fumadocs-dev")),
    readMdxFiles(path.join(contentDir, "interview")),
  ]);
  const allMdx = [...courseMdx, ...devMdx, ...interviewMdx];

  // Runnable blocks: executable `<CodeBlock>` (non-SQL) + `<SqlCodeBlock>`.
  const runnableCodeBlocks =
    countMatches(allMdx, /<CodeBlock[\s/>]/g) +
    countMatches(allMdx, /<SqlCodeBlock[\s/>]/g);
  // Auto-graded challenges: `<ChallengeCard>` (non-SQL) + `<SqlChallengeCard>`.
  const codeChallenges =
    countMatches(allMdx, /<ChallengeCard[\s/>]/g) +
    countMatches(allMdx, /<SqlChallengeCard[\s/>]/g);

  // Interview-prep role tracks: top-level directories under content/interview.
  const interviewEntries = await readdir(path.join(contentDir, "interview"), {
    withFileTypes: true,
  });
  const interviewRoles = interviewEntries.filter((e) =>
    e.isDirectory(),
  ).length;

  // Floor to a tidy round number; the grid appends "+" so the figure stays
  // honest as the corpus grows between builds.
  const floorTo = (n: number, step: number) => Math.floor(n / step) * step;

  return {
    runnableCodeBlocks: floorTo(runnableCodeBlocks, 100),
    codeChallenges: floorTo(codeChallenges, 50),
    interviewRoles,
    courses: courses.length,
  };
}

export default async function Home() {
  // Popularity-sorted catalog (shared with /courses), the Courses section
  // shows the top four and filters by topic client-side.
  const courses = await getCourseCatalog();
  const stats = await getHomeStats(courses);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <JsonLd data={[organizationLd(), websiteLd()]} />
      <HomeClient courses={courses} stats={stats} />
    </>
  );
}
