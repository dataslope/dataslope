// The playground index inside the dashboard shell: heading, "Start something
// new" language grid, and the paginated workspace list.
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

// Named from the registry, like /playground's own description, so neither
// falls behind when a playground is added.
const PLAYGROUND_DESCRIPTION = `Start a playground or reopen one of your saved workspaces: ${new Intl.ListFormat(
  "en",
  { type: "conjunction" },
).format(PLAYGROUNDS.map((p) => p.label))}, all running in your browser.`;

export const metadata: Metadata = {
  // Not bare "Playground": that is the public /playground page's title, and
  // this is the dashboard view built around the learner's own workspaces.
  title: "Playground workspaces",
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
