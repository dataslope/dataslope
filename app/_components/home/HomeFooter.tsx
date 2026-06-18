import Link from "../Link";
import { GitHubIcon } from "./icons";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

// Development-only navigation surfaced in the footer during the redesign.
const DEV_LINKS = [
  { href: "/color-test", label: "Color Theme Test" },
  { href: "/svg-gallery", label: "SVG Gallery" },
  { href: "/magicui-demo", label: "Magic UI Demo" },
];

export function HomeFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--ds-gray-200)] dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Dataslope home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dataslope-logo-blue.svg"
              alt=""
              className="h-4 w-auto"
              aria-hidden="true"
            />
            <span className="text-base font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
              Dataslope
            </span>
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            title="GitHub"
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--ds-gray-600)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-300)] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <GitHubIcon size={18} />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
            Dev
          </span>
          {DEV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[var(--ds-gray-600)] transition-colors hover:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-400)] dark:hover:text-[var(--ds-blue-400)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-xs text-[var(--ds-gray-400)]">
          Interactive, no sign-up, free — learn Python, SQL, C++ and more, right
          in your browser.
        </p>
      </div>
    </footer>
  );
}
