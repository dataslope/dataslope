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
      {/* Full-bleed, outside the max-w-6xl content column below. */}
      <FooterPattern />
      {/* Clear air below the band so the links read as the footer proper. */}
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
        <div className="ds-footer-grid">
          {/* Column 1: logo + GitHub. One row on mobile, stacked from `sm`.
              The negative margins cancel the icon button's padding so the
              mark, not the box, lines up with the column edge. */}
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
              {/* 28px so it carries the same weight as the h-5 logo beside it. */}
              <GitHubIcon size={28} />
            </a>
          </div>

          {/* Column 2: Explore + Resources stacked vertically so their short
              lists match the weight of the long language columns beside them. */}
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

          {/* Column 3: one row per catalog language filter. */}
          <div className="flex flex-col gap-1">
            <h3 className={headingClass}>Courses</h3>
            {COURSE_LINKS.map(({ id, ...link }) => (
              <FooterLink key={id} {...link} icon={<LangIcon id={id} />} />
            ))}
          </div>

          {/* Column 4: one row per playground. Longest column, hence the
              grid's `align-items: start`. */}
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
