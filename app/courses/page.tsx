// Same Tailwind bundle + home-route hardening as the home page, so the reused
// HomeNav/HomeFooter (`.ds-home`-scoped rules) lay out correctly.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { HomeNav } from "../_components/home/HomeNav";
import { HomeFooter } from "../_components/home/HomeFooter";
import { getCourseCatalog } from "@/lib/courseCatalog";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { CoursesCatalog } from "./_components/CoursesCatalog";

const PAGE_TITLE = "Courses, Dataslope";
const PAGE_DESCRIPTION =
  "Hands-on, browser-based tracks across data and engineering. Every lesson runs live, no setup, no sign-up.";

export const metadata: Metadata = {
  // Bare string so the root template renders "Courses · DataSlope".
  title: "Courses",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/courses" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/courses`,
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
// the home page) so a returning dark-mode visitor never sees a light flash.
const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`;

export default async function CoursesPage() {
  const courses = await getCourseCatalog();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />

        <main className="mx-auto w-full max-w-[1120px] px-4 pt-12 sm:px-6 sm:pt-16">
          {/* Centered heading, matching the /pricing page's title block. */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
              Free Courses
            </h1>
            <p className="mt-6 text-base text-[var(--ds-gray-900)] [text-wrap:pretty] sm:text-lg dark:text-white">
              Hands-on, browser-based tracks across data and engineering. Every
              lesson runs live, no setup, no sign-up.
            </p>
          </div>

          <CoursesCatalog courses={courses} />
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
