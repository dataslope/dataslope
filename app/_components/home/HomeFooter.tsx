import Link from "../Link";
import { GitHubIcon } from "./icons";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

// Development-only navigation surfaced in the footer during the redesign.
const DEV_LINKS = [
  { href: "/color-test", label: "Color Theme Test", external: false },
  { href: "/svg-gallery", label: "SVG Gallery", external: false },
  { href: "/magicui-demo", label: "Magic UI Demo", external: false },
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

const linkClass =
  "text-[var(--ds-gray-600)] transition-colors hover:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-400)] dark:hover:text-[var(--ds-blue-400)]";

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
    <footer className="mt-24 border-t border-[var(--ds-gray-200)] dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {/* Column 1 — logo (no wordmark) + GitHub at the bottom. */}
          <div className="col-span-2 flex flex-col justify-between gap-8 sm:col-span-1">
            <Link href="/" aria-label="Dataslope home" className="inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-files/SVG/dataslope-logo-black.svg"
                alt="Dataslope"
                className="block h-7 w-auto dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-files/SVG/dataslope-logo-white.svg"
                alt="Dataslope"
                className="hidden h-7 w-auto dark:block"
              />
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              title="GitHub"
              className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--ds-gray-600)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-300)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <GitHubIcon size={20} />
            </a>
          </div>

          {/* Column 2 — development pages. */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
              Development
            </h3>
            {DEV_LINKS.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
          </div>

          {/* Column 3 — resources. */}
          <div className="flex flex-col gap-3">
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
