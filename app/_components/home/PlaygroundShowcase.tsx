"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, SquareTerminal } from "lucide-react";
import { Select } from "@base-ui/react/select";
import { SparklesText } from "@/components/ui/sparkles-text";
import Link from "../Link";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
import { EmbeddedPlayground } from "./EmbeddedPlayground";
import {
  HOME_SELECT_ITEM,
  HOME_SELECT_POPUP,
  HOME_SELECT_TRIGGER,
  HomeSelectBeam,
} from "./homeSelect";

const SQL_IDS = new Set(["postgres", "sqlite", "duckdb"]);

function languageName(id: string): string {
  const label = PLAYGROUNDS.find((p) => p.id === id)?.label ?? id;
  return label.replace(/\s+Playground$/, "");
}

function playgroundHref(id: string): string {
  return PLAYGROUNDS.find((p) => p.id === id)?.href ?? `/playground/${id}`;
}

function PlaygroundGlyph({ id }: { id: string }) {
  const Icon = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      <Icon size={Math.round(18 * factor)} />
    </span>
  );
}

/** The playground language picker, lifted out of the embedded playground so it
 *  sits on the page itself (below the heading) rather than inside the iframe. */
function PlaygroundSwitcher({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (id: string) => void;
}) {
  const active = PLAYGROUNDS.find((p) => p.id === value);
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        if (next != null) onValueChange(next);
      }}
    >
      <Select.Trigger
        aria-label="Switch playground"
        className={`${HOME_SELECT_TRIGGER} min-w-44`}
      >
        {active && <PlaygroundGlyph id={active.id} />}
        <Select.Value className="flex-1 text-left">
          {active?.label ?? value}
        </Select.Value>
        <Select.Icon className="text-[var(--ds-gray-400)]">
          <ChevronDown size={16} />
        </Select.Icon>
        <HomeSelectBeam />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50"
        >
          <Select.Popup className={`${HOME_SELECT_POPUP} min-w-44`}>
            {PLAYGROUNDS.map((p) => (
              <Select.Item key={p.id} value={p.id} className={HOME_SELECT_ITEM}>
                <PlaygroundGlyph id={p.id} />
                <Select.ItemText>{p.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/** "Try the playground" section: a centered language switcher, the embedded
 *  playground for the selected language, copy that follows the selection, and
 *  a link to the full page. */
export function PlaygroundShowcase() {
  const [playgroundId, setPlaygroundId] = useState("postgres");
  // Drives the connector's hover state from the link itself (not from hovering
  // the connector), so the line/dot only react to the "Open the … playground"
  // link and both revert together on mouseout.
  const [linkHover, setLinkHover] = useState(false);
  const name = languageName(playgroundId);
  const isSql = SQL_IDS.has(playgroundId);

  const subtitle = isSql
    ? `A full in-browser SQL workbench, query, edit schemas, and explore sample databases. Pick any language from the switcher below.`
    : `A full in-browser ${name} playground, write and run real ${name} instantly. Pick any language from the switcher below.`;

  return (
    <div className="px-4 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <SparklesText
          as="h2"
          className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white"
        >
          Try the playground
        </SparklesText>
        <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
          {subtitle}
        </p>
      </div>

      {/* Switcher lives on the page (not inside the iframe), centered below the
          heading with ample spacing. */}
      <div className="mb-10 mt-10 flex justify-center">
        <PlaygroundSwitcher value={playgroundId} onValueChange={setPlaygroundId} />
      </div>

      <div className="group ds-striped-shell ds-striped-shell-blue-hover mx-auto max-w-7xl">
        <EmbeddedPlayground playgroundId={playgroundId} label={name} />
      </div>

      {/* Connector stemming from the playground's bottom center down to a dot
          above the link. It tracks the link's colour, and only while the link
          itself is hovered the line extends toward the link, a shorter reach
          than before so the dot keeps more space from the link. State-driven so
          it reacts to the link, not to hovering the connector; both revert on
          mouseout. */}
      <div className="mt-2 flex flex-col items-center">
        <div className="flex h-24 flex-col items-center" aria-hidden="true">
          <span
            className={`w-px transition-[height,background-color] duration-200 ${
              linkHover
                ? "h-16 bg-[var(--ds-blue-700)] dark:bg-[var(--ds-blue-400)]"
                : "h-12 bg-[var(--ds-gray-800)] dark:bg-[var(--ds-gray-100)]"
            }`}
          />
          <span
            className={`size-2 rounded-full transition-colors duration-200 ${
              linkHover
                ? "bg-[var(--ds-blue-700)] dark:bg-[var(--ds-blue-400)]"
                : "bg-[var(--ds-gray-800)] dark:bg-[var(--ds-gray-100)]"
            }`}
          />
        </div>
        <Link
          href={playgroundHref(playgroundId)}
          onMouseEnter={() => setLinkHover(true)}
          onMouseLeave={() => setLinkHover(false)}
          className="group mt-2 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-lg font-medium tracking-tight text-[var(--ds-gray-800)] transition-colors hover:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-100)] dark:hover:text-[var(--ds-blue-400)]"
        >
          <SquareTerminal size={18} aria-hidden="true" />
          <span>Open the {name} playground</span>
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
