"use client";

import Link from "../../Link";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "../../languageIcons";
import { PLAYGROUNDS } from "../../playgrounds";
import { useIsFramed } from "../../useIsFramed";

/**
 * Shared brand logo + playground switcher in every playground's header.
 * Icon-only: the wordmark is deliberately omitted to keep the header compact.
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
  // Hide the brand logo when embedded (the home page's iframe);
  // keep it on the standalone playground pages.
  const embedded = useIsFramed();
  return (
    <div className="logo">
      {!embedded && (
        <Link href="/" aria-label="Dataslope home" className="ds-logo-hover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dataslope-logo-blue.svg"
            alt="Dataslope logo"
            className="brand-logo ds-logo-mark"
          />
        </Link>
      )}
      {/* Hidden when embedded (home page iframe): switching is done by the
          page's own switcher. */}
      {!embedded && (
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
          {/* The label is hidden below 768px (the icon already identifies
              the dialect) so the header has room for the logo; the dropdown
              items keep their icons and labels either way. Same class, and
              so the same rule, as the language playgrounds' switcher. */}
          <Select.Value className="playground-switcher-label">
            {PLAYGROUNDS.find((p) => p.id === playgroundId)?.label ??
              playgroundId}
          </Select.Value>
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
      )}
    </div>
  );
}
