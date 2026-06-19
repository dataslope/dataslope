"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import Link from "../Link";
import { PLAYGROUNDS } from "../playgrounds";
import { EmbeddedPlayground } from "./EmbeddedPlayground";
import { useTheme } from "./theme";

const SQL_IDS = new Set(["postgres", "sqlite", "duckdb"]);

function languageName(id: string): string {
  const label = PLAYGROUNDS.find((p) => p.id === id)?.label ?? id;
  return label.replace(/\s+Playground$/, "");
}

function playgroundHref(id: string): string {
  return PLAYGROUNDS.find((p) => p.id === id)?.href ?? `/playground/${id}`;
}

/** "Try the playground" section: the embedded playground, copy that follows
 *  whichever language is currently showing, and a link to its full page. */
export function PlaygroundShowcase() {
  const [playgroundId, setPlaygroundId] = useState("postgres");
  const { theme } = useTheme();
  const name = languageName(playgroundId);
  const isSql = SQL_IDS.has(playgroundId);
  // Yellow reads well behind dark text in light mode but washes out behind
  // the light link text in dark mode, so use brand blue there.
  const highlightColor = theme === "dark" ? "#148CFF" : "#FFDD6C";

  const subtitle = isSql
    ? `A full in-browser SQL workbench — query, edit schemas, and explore sample databases. Switch to any language from the switcher in the top-left.`
    : `A full in-browser ${name} playground — write and run real ${name} instantly. Switch to any language from the switcher in the top-left.`;

  return (
    <div className="px-4 sm:px-6">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
          Try the playground
        </h2>
        <p className="mt-6 text-base text-[var(--ds-gray-500)] sm:text-lg dark:text-[var(--ds-gray-400)]">
          {subtitle}
        </p>
      </div>

      <div className="mx-auto max-w-7xl">
        <EmbeddedPlayground onPlaygroundChange={setPlaygroundId} />
      </div>

      <div className="mt-6 text-center">
        <Link
          href={playgroundHref(playgroundId)}
          className="group inline-flex items-center gap-1.5 text-base font-medium text-[var(--ds-gray-800)] transition-colors hover:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-100)] dark:hover:text-[var(--ds-blue-400)]"
        >
          <span>
            Open the{" "}
            <Highlighter action="highlight" color={highlightColor} isView>
              {name}
            </Highlighter>{" "}
            playground
          </span>
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
