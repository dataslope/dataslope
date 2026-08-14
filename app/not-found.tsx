// Branded site-wide 404. Catches every unmatched URL and notFound() call
// that has no closer boundary (course/lesson typos, stale bookmarks), which
// previously fell through to Next's unstyled default with no way back.
import "@/app/tailwind.css";
import "@/app/home.css";
import Link from "next/link";

import { GraduationCap, House, SquareTerminal } from "lucide-react";

import imageManifest from "@/lib/generated/images";
import { HomeNav } from "@/app/_components/home/HomeNav";
import { HomeFooter } from "@/app/_components/home/HomeFooter";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";

/** Illustration above the message, authored through the same pipeline as the
 *  course art (`data/illustration-prompts.json`) and promoted into
 *  `public/images/`. Every surface asks for the `-cutout` slug. */
const ART_SLUG = "error-404-cutout";

/** Renders nothing when the slug has no manifest entry, so a tree without the
 *  promoted asset shows the page without art rather than a broken image. */
function NotFoundArt() {
  const entry = imageManifest[ART_SLUG];
  if (!entry) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/${ART_SLUG}.${entry.formats[entry.formats.length - 1]}`}
      width={entry.width}
      height={entry.height}
      alt=""
      aria-hidden="true"
      decoding="async"
      className="w-[clamp(5.5rem,26vw,300px)] shrink-0"
    />
  );
}

export default function NotFound() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />
        <main className="overflow-x-clip">
          <section className="px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
            <div className="mx-auto max-w-4xl">
              {/* The number and the chipmunk read as one band: the art sits at
                  the tip of the last 4, so `items-end` lines its platform up
                  with the digits' baseline. Both sides scale with the viewport
                  (`clamp`) rather than switching at a breakpoint, which keeps
                  that alignment at every width instead of only two of them. */}
              <div className="flex items-end gap-1 sm:gap-3">
                <p className="select-none text-[clamp(4.5rem,23vw,260px)] font-bold leading-[0.85] tracking-[-0.049em] text-neutral-200 dark:text-neutral-700">
                  404
                </p>
                <NotFoundArt />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
                No page here. Just acorns.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                The address may be mistyped, or the page may have moved.
                Everything on DataSlope is reachable from the courses catalog
                and the playgrounds below.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--ds-green-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)]"
                >
                  {/* The icons the home page already uses for these three
                      destinations, so the same journey looks the same here. */}
                  <GraduationCap size={16} aria-hidden="true" />
                  Browse courses
                </Link>
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--ds-gray-200)] px-4 py-2 text-sm font-semibold text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/5"
                >
                  <SquareTerminal size={16} aria-hidden="true" />
                  Open a playground
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--ds-gray-200)] px-4 py-2 text-sm font-semibold text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/5"
                >
                  <House size={16} aria-hidden="true" />
                  Home
                </Link>
              </div>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
