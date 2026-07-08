"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Select } from "@base-ui-components/react/select";
import { Highlighter } from "@/components/ui/highlighter";
import Link from "../Link";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
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
        className="inline-flex min-w-44 items-center gap-2 rounded-lg border border-[var(--ds-gray-300)] bg-white px-4 py-2 text-sm font-medium text-[var(--ds-gray-800)] shadow-sm transition-colors hover:border-[var(--ds-blue-300)] focus-visible:border-[var(--ds-blue-500)] focus-visible:outline-none dark:border-white/15 dark:bg-white/5 dark:text-[var(--ds-gray-100)]"
      >
        {active && <PlaygroundGlyph id={active.id} />}
        <Select.Value className="flex-1 text-left">
          {active?.label ?? value}
        </Select.Value>
        <Select.Icon className="text-[var(--ds-gray-400)]">
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50"
        >
          <Select.Popup className="max-h-[60vh] min-w-44 overflow-y-auto rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
            {PLAYGROUNDS.map((p) => (
              <Select.Item
                key={p.id}
                value={p.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-700)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] data-[highlighted]:text-[var(--ds-gray-900)] data-[selected]:font-medium data-[selected]:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-200)] dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white"
              >
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
  const { theme } = useTheme();
  const name = languageName(playgroundId);
  const isSql = SQL_IDS.has(playgroundId);
  // Yellow reads well behind dark text in light mode but washes out behind
  // the light link text in dark mode, so use brand blue there.
  const highlightColor = theme === "dark" ? "#148CFF" : "#FFDD6C";

  const subtitle = isSql
    ? `A full in-browser SQL workbench, query, edit schemas, and explore sample databases. Pick any language from the switcher below.`
    : `A full in-browser ${name} playground, write and run real ${name} instantly. Pick any language from the switcher below.`;

  return (
    <div className="px-4 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
          Try the playground
        </h2>
        <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
          {subtitle}
        </p>
      </div>

      {/* Switcher lives on the page (not inside the iframe), centered below the
          heading with ample spacing. */}
      <div className="mb-10 mt-10 flex justify-center">
        <PlaygroundSwitcher value={playgroundId} onValueChange={setPlaygroundId} />
      </div>

      <div className="mx-auto max-w-7xl">
        <EmbeddedPlayground playgroundId={playgroundId} label={name} />
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
