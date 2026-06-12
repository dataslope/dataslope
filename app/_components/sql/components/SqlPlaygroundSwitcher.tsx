"use client";

import Link from "../../Link";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui-components/react/select";
import { ChevronDown } from "lucide-react";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "../../languageIcons";
import { PLAYGROUNDS } from "../../playgrounds";

/**
 * Shared "Dataslope" brand logo + brand name + playground switcher
 * rendered in the top-left of every playground's header.
 *
 * Extracted so that all three SQL playgrounds (and ideally other
 * playgrounds in the future) share a single source of truth for the
 * switcher markup, popup styling, and navigation behaviour.
 */
export interface SqlPlaygroundSwitcherProps {
  /** Id of the playground currently being rendered (e.g. `"postgres"`,
   *  `"duckdb"`, `"sqlite"`). Must match a `PLAYGROUNDS` entry. */
  playgroundId: string;
}

export function SqlPlaygroundSwitcher({
  playgroundId,
}: SqlPlaygroundSwitcherProps) {
  const router = useRouter();
  return (
    <div className="logo">
      <Link href="/" aria-label="Dataslope home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dataslope-logo-blue.svg"
          alt="Dataslope logo"
          className="brand-logo"
        />
      </Link>
      <Link href="/" className="brand-name">
        Dataslope
      </Link>
      <Select.Root
        value={playgroundId}
        onValueChange={(value) => {
          const next = PLAYGROUNDS.find((p) => p.id === value);
          if (next && next.id !== playgroundId) router.push(next.href);
        }}
      >
        <Select.Trigger
          className="playground-switcher"
          aria-label="Switch playground"
        >
          {(() => {
            const Icon = PLAYGROUND_ICONS[playgroundId];
            const factor = PLAYGROUND_ICON_SIZE_FACTOR[playgroundId] ?? 1;
            return Icon ? (
              <span
                className="playground-switcher-lang-icon"
                style={{ color: "var(--text)" }}
                aria-hidden="true"
              >
                <Icon size={Math.round(16 * factor)} />
              </span>
            ) : null;
          })()}
          <Select.Value />
          <Select.Icon className="playground-switcher-icon">
            <ChevronDown size={12} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className="playground-lang-switcher-positioner"
            sideOffset={6}
            alignItemWithTrigger={false}
          >
            <Select.Popup className="bui-select-popup playground-lang-switcher-popup">
              {PLAYGROUNDS.map((playground) => {
                const Icon = PLAYGROUND_ICONS[playground.id];
                const factor =
                  PLAYGROUND_ICON_SIZE_FACTOR[playground.id] ?? 1;
                return (
                  <Select.Item
                    key={playground.id}
                    value={playground.id}
                    className="bui-select-item"
                  >
                    {Icon && (
                      <span
                        className="bui-select-item-icon"
                        aria-hidden="true"
                      >
                        <Icon size={Math.round(16 * factor)} />
                      </span>
                    )}
                    <Select.ItemText>{playground.label}</Select.ItemText>
                  </Select.Item>
                );
              })}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
