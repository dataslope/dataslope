import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
// Opt the home route into Tailwind + the Magic UI components. Importing the
// shared stylesheet here scopes it to the home page bundle (see app/magicui.css).
import "@/app/magicui.css";
// Home-only hardening against /learn's global styles leaking in after a
// client-side back-navigation (see app/home.css).
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeClient } from "./_components/home/HomeClient";
import type { Course, CourseTags } from "./_components/home/CoursesSection";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const HOME_TITLE = "Dataslope — Learn Python, SQL, C++ in your browser";
const HOME_DESCRIPTION =
  "Interactive, no sign-up, free. Browser-based playgrounds and courses for Python, SQL, C++, and more — all running on WebAssembly.";

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
// `dark`/`light` class on <html>, shared with the Fumadocs-powered /learn
// route) before first paint, so a returning dark-mode visitor never sees a
// light flash. The explicit `light` class also stops scheme-detecting
// components (e.g. the challenge-card editor) from falling back to the OS
// preference. A missing/"light" value leaves the page in its light default.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

interface CourseMeta {
  title: string;
  root?: boolean;
  tags?: CourseTags;
}

async function getCourses(): Promise<Course[]> {
  const learnDir = path.join(process.cwd(), "content", "learn");
  const entries = await readdir(learnDir, { withFileTypes: true });

  const courses: Course[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(
        path.join(learnDir, entry.name, "meta.json"),
        "utf-8",
      );
      const meta = JSON.parse(raw) as CourseMeta;
      if (meta.root && meta.title) {
        courses.push({
          slug: entry.name,
          title: meta.title,
          tags: meta.tags ?? {},
        });
      }
    } catch {
      // No meta.json or unreadable — skip
    }
  }

  return courses.sort((a, b) => a.title.localeCompare(b.title));
}

export default async function Home() {
  const courses = await getCourses();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <HomeClient courses={courses} />
    </>
  );
}
