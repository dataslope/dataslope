import Link from "../Link";
import { GitHubIcon } from "./icons";
import { FooterPattern } from "./FooterPattern";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

// Development-only navigation surfaced in the footer during the redesign.
const DEV_LINKS = [
  { href: "/color-test", label: "Color Theme Test", external: false },
  { href: "/illustration-prompts", label: "Illustration Prompts", external: false },
  { href: "/fumadocs-dev", label: "Fumadocs Dev", external: false },
  { href: "/email-preview", label: "Email Preview", external: false },
];

const RESOURCE_LINKS = [
  { href: "/privacy", label: "Privacy Policy", external: false },
  { href: "/terms", label: "Terms", external: false },
  {
    href: "https://github.com/dataslope/dataslope/blob/main/LICENSE",
    label: "License",
    external: true,
  },
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

// `inline-block w-fit` so each link shrinks to its text: as a stretched flex
// item (`block`) the trailing whitespace across the column was clickable too.
const linkClass =
  "inline-block w-fit py-1.5 text-sm text-[#121212] transition-[color,translate] hover:translate-x-0.5 hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]";

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
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 sm:pb-28">
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

          {/* Column 2, development pages. */}
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
              Development
            </h3>
            {DEV_LINKS.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>

          {/* Column 3, resources. */}
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
              Resources
            </h3>
            {RESOURCE_LINKS.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
