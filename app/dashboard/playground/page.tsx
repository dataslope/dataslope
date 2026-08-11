// The playground index, moved into the dashboard (from the old standalone
// /playground page, which now redirects here). Chrome (sidebar + top bar)
// comes from the /dashboard layout's Studio shell; this page renders the
// studio-styled heading, the "Start something new" language grid, and the
// paginated workspace list.
import "@/app/tailwind.css";
import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import Link from "@/app/_components/Link";
import { PLAYGROUNDS } from "@/app/_components/playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "@/app/_components/languageIcons";
import { PlaygroundWorkspaces } from "./PlaygroundWorkspaces";

const PLAYGROUND_DESCRIPTION =
  "Free online coding playgrounds that run entirely in your browser, Python, R, SQL, JavaScript, TypeScript, HTML/CSS, React, PHP, C, C++, Java, and C#. No sign-up, no install, powered by WebAssembly.";

export const metadata: Metadata = {
  title: "Playground",
  description: PLAYGROUND_DESCRIPTION,
  // The public `/playground` landing page is the canonical, indexable surface;
  // this personalized dashboard view points at it to consolidate signals.
  alternates: { canonical: "/playground" },
};

/** Monochrome language glyph for the "Start something new" grid. Renders in
 *  `currentColor` so it tracks the link's text color (and its hover). */
function LanguageIcon({ id }: { id: string }) {
  const Icon = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span
      className="inline-flex size-[18px] shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <Icon size={Math.round(18 * factor)} />
    </span>
  );
}

export default function DashboardPlaygroundPage() {
  return (
    <div>
      <h1 className="ds-h1">Playground</h1>
      <p
        className="mt-2.5 text-[15px] leading-relaxed"
        style={{ color: "var(--muted)" }}
      >
        Browser-based playgrounds across data and engineering. Everything runs
        live in your browser, no setup required.
      </p>

      {/* Start something new, one link per language playground. */}
      <h2
        className="mt-12 flex items-center gap-2.5 text-[17px] font-semibold"
        style={{ color: "var(--ink)" }}
      >
        <span style={{ color: "var(--green-text)" }}>
          <Rocket size={17} />
        </span>
        Start something new
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {PLAYGROUNDS.map((p) => (
          // Dense index grid, don't viewport-prefetch every link (see the
          // opt-out note in app/_components/Link.tsx).
          <Link
            key={p.id}
            href={p.href}
            prefetch={false}
            className="flex items-center gap-2.5 text-sm font-medium transition-colors hover:!text-[var(--ds-blue-500)]"
            style={{ color: "var(--ink)" }}
          >
            <LanguageIcon id={p.id} />
            {p.label}
          </Link>
        ))}
      </div>

      {/* Your workspaces, a client island (reads localStorage + the
          signed-in user's cloud backups). Always rendered, empty and
          signed-out states included. */}
      <PlaygroundWorkspaces />
    </div>
  );
}
