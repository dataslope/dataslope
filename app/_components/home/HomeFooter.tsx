import type { ReactNode } from "react";
import Link from "../Link";
import { GitHubIcon } from "./icons";
import { FooterPattern } from "./FooterPattern";
import { PLAYGROUNDS } from "../playgrounds";
import { LangIcon } from "../languageIcons";
import {
  COURSE_LANGUAGES,
  courseLanguageHref,
} from "@/app/courses/_components/catalogFilters";
import { formatTagLabel } from "@/lib/tagLabels";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

// The header's destinations plus the home page's FAQ.
const EXPLORE_LINKS = [
  { href: "/courses", label: "Courses", external: false },
  { href: "/interview-prep", label: "Interview Prep", external: false },
  { href: "/playground", label: "Playgrounds", external: false },
  { href: "/pricing", label: "Pricing", external: false },
  { href: "/#faq", label: "FAQ", external: false },
];

const RESOURCE_LINKS = [
  { href: "/privacy", label: "Privacy Policy", external: false },
  { href: "/terms", label: "Terms", external: false },
  // On-site license summary (code, content, third-party runtimes), not the
  // raw LICENSE file on GitHub.
  { href: "/license", label: "License", external: false },
  {
    href: "https://github.com/dataslope/dataslope/issues",
    label: "Report Bugs",
    external: true,
  },
  {
    href: "https://github.com/dataslope/dataslope/discussions",
    label: "Support",
    external: true,
  },
];

// One row per /courses sidebar language, in the sidebar's own order.
// `documentNav` is load-bearing: the catalog reads its filter via a
// `popstate`-subscribed store, and a Next <Link> pushState fires no
// `popstate` — on /courses itself a <Link> would change the URL and leave
// the unfiltered list on screen. A document navigation re-mounts the page.
// It also avoids viewport-prefetching /courses eleven extra times.
const COURSE_LINKS = COURSE_LANGUAGES.map((lang) => ({
  id: lang,
  href: courseLanguageHref(lang),
  label: `${formatTagLabel(lang)} Courses`,
  external: false,
  documentNav: true,
}));

// One row per playground, from the same registry the header switcher reads,
// so new playgrounds appear automatically. Labels spelled out ("Python
// Playground") to disambiguate from the Courses column.
const PLAYGROUND_LINKS = PLAYGROUNDS.map((p) => ({
  id: p.id,
  href: p.href,
  label: `${p.label} Playground`,
  external: false,
}));

// `inline-flex w-fit` so each link shrinks to its text — as a stretched flex
// item the trailing whitespace across the column was clickable too.
const linkClass =
  "inline-flex w-fit items-center gap-2 py-1.5 text-sm text-[#121212] transition-[color,translate] hover:translate-x-0.5 hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]";

// `mb-2` so the heading reads as a label, not another list item.
const headingClass =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]";

function FooterLink({
  href,
  label,
  external,
  icon,
  documentNav,
}: {
  href: string;
  label: string;
  external: boolean;
  /** Optional lead-in glyph (the language columns' icons). */
  icon?: ReactNode;
  /** Navigate as a document load (same tab). The Courses rows need this to
   *  work at all; see `COURSE_LINKS`. */
  documentNav?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {icon}
        {label}
      </a>
    );
  }
  if (documentNav) {
    return (
      <a href={href} className={linkClass}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={linkClass}>
      {icon}
      {label}
    </Link>
  );
}

export function HomeFooter() {
  return (
    <footer className="mt-24">
      {/* Full-bleed, so it sits outside the max-w-6xl content column below.
          Living here rather than in any one page means every route that
          renders HomeFooter gets it — the home page, /courses, /pricing,
          /playground, /interview-prep, the dashboard, the share and quiz
          routes, and the error/not-found pages. */}
      <FooterPattern />
      {/* The pattern above still needs clear air beneath it, or the links read
          as part of the band rather than as the footer proper — but less of it
          than the pt-20/24 this used to carry: the band now fades out over its
          last 64px (see `FooterPattern`), so a chunk of that separation is
          drawn rather than padded. */}
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
        <div className="ds-footer-grid">
          {/* Column 1, logo (no wordmark) + GitHub.
              One row on mobile — logo left, GitHub hard right — rather than
              two stacked lines that left the icon orphaned on its own row.
              From `sm`, where the grid splits into columns, they stack again.
              The negative margins cancel the icon button's own padding (a 28px
              glyph in a 40px hit target) so the mark, not the box, lines up
              with the edge the logo sits on: the right edge of the column on
              mobile, the left edge of the column once it stacks. */}
          <div className="flex flex-row items-center justify-between gap-8 sm:flex-col sm:items-start sm:justify-start sm:gap-6">
            <Link
              href="/"
              aria-label="Dataslope home"
              className="ds-logo-hover inline-flex"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-files/SVG/dataslope-logo-black.svg"
                alt="Dataslope"
                className="ds-logo-mark block h-5 w-auto dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-files/SVG/dataslope-logo-white.svg"
                alt="Dataslope"
                className="ds-logo-mark hidden h-5 w-auto dark:block"
              />
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              title="GitHub"
              className="-mr-1.5 inline-flex size-10 items-center justify-center rounded-lg text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] sm:-ml-1.5 sm:mr-0 dark:text-white dark:hover:bg-white/[0.06]"
            >
              {/* 28px, so the mark carries the same weight on the row as the
                  h-5 logo beside it (which is ~32px wide at its 1.59:1). */}
              <GitHubIcon size={28} />
            </a>
          </div>

          {/* Column 2, the two short lists: where to go next on the site, then
              the legal/support rows under it.

              Stacked in one column rather than sitting side by side, because
              the two lists that follow are eleven and fourteen rows long. Two
              five-row columns beside them left the footer reading as two
              full-height columns and two stubs; paired vertically they make
              one column of comparable weight. `gap-10` between the groups
              matches the grid's own column gap, so the heading of the second
              is as clearly separated from the list above it as it would be
              from a neighbouring column. */}
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-1">
              <h3 className={headingClass}>Explore</h3>
              {EXPLORE_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <h3 className={headingClass}>Resources</h3>
              {RESOURCE_LINKS.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </div>
          </div>

          {/* Column 3, one row per language the catalog can be filtered to.
              Carries the same glyphs as the Playgrounds column beside it, and
              as the /courses sidebar these rows land in — a language reads as
              the same thing on all three surfaces. */}
          <div className="flex flex-col gap-1">
            <h3 className={headingClass}>Courses</h3>
            {COURSE_LINKS.map(({ id, ...link }) => (
              <FooterLink key={id} {...link} icon={<LangIcon id={id} />} />
            ))}
          </div>

          {/* Column 4, one row per language playground. The longest column by
              far, which is why the grid is `align-items: start` — the others
              sit at the top of the row rather than spreading down it. */}
          <div className="flex flex-col gap-1">
            <h3 className={headingClass}>Playgrounds</h3>
            {PLAYGROUND_LINKS.map(({ id, ...link }) => (
              <FooterLink key={id} {...link} icon={<LangIcon id={id} />} />
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
