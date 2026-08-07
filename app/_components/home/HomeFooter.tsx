import Link from "../Link";
import { GitHubIcon } from "./icons";
import { FooterPattern } from "./FooterPattern";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

// Column 2 used to carry the redesign's development-only pages (color test,
// illustration prompts, the Fumadocs gallery, email preview). Those aren't
// useful to a visitor, so for launch this column carries the site's own
// destinations instead: the same set the header links to, plus the home
// page's FAQ, which is otherwise reachable only by scrolling.
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
  // The on-site license summary rather than the raw LICENSE file on GitHub:
  // it covers the code (MIT), the learning content (CC BY 4.0), and the
  // third-party runtimes in one place.
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

// Kept for local work, but never shipped: these render only under
// `next dev`, so the production footer stays user-facing.
const DEV_LINKS = [
  { href: "/color-test", label: "Color Theme Test", external: false },
  { href: "/illustration-prompts", label: "Illustration Prompts", external: false },
  { href: "/fumadocs-dev", label: "Fumadocs Dev", external: false },
  { href: "/email-preview", label: "Email Preview", external: false },
];
const SHOW_DEV_LINKS = process.env.NODE_ENV === "development";

// `inline-block w-fit` so each link shrinks to its text: as a stretched flex
// item (`block`) the trailing whitespace across the column was clickable too.
const linkClass =
  "inline-block w-fit py-1.5 text-sm text-[#121212] transition-[color,translate] hover:translate-x-0.5 hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]";

// `mb-2` on top of the column's `gap-1`: the heading sat almost flush against
// its first link, so it read as another list item rather than as a label.
const headingClass =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]";

function FooterLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={linkClass}>
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
          {/* Column 1, logo (no wordmark) + GitHub at the bottom. */}
          <div className="flex flex-col justify-between gap-8">
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
              className="inline-flex size-10 items-center justify-center rounded-lg text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-white dark:hover:bg-white/[0.06]"
            >
              <GitHubIcon size={26} />
            </a>
          </div>

          {/* Column 2, where to go next on the site. */}
          <div className="flex flex-col gap-1">
            <h3 className={headingClass}>Explore</h3>
            {EXPLORE_LINKS.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>

          {/* Column 3, resources. */}
          <div className="flex flex-col gap-1">
            <h3 className={headingClass}>Resources</h3>
            {RESOURCE_LINKS.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>

        {/* Local-development pages, hidden in every deployed build. Sits under
            the grid rather than in it so the three published columns keep
            their widths whether or not this row is present. */}
        {SHOW_DEV_LINKS && (
          <div className="mt-12 flex flex-col gap-1 border-t border-[var(--ds-gray-200)] pt-8 dark:border-white/10">
            <h3 className={headingClass}>Development</h3>
            <div className="flex flex-wrap gap-x-6">
              {DEV_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
