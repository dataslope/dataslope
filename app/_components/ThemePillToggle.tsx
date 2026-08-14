"use client";

// Shared light/dark pill toggle used by every surface that flips the color
// scheme. Styled with plain CSS (`.ds-theme-pill*` in globals.css) rather
// than Tailwind because the /playground pages load no Tailwind root. Wired
// to the canonical site-theme controller (siteTheme.ts) so the choice is
// shared across surfaces, frames, and the next-themes-driven docs routes.

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getSiteTheme,
  setSiteTheme,
  subscribeSiteTheme,
  type SiteTheme,
} from "./siteTheme";

// The home route defaults to light; SSR has no DOM/localStorage to read.
function getServerTheme(): SiteTheme {
  return "light";
}

/**
 * Knob position and glyph are driven purely by the `.dark` class on <html>
 * (applied pre-hydration), so they never mismatch on hydration; only
 * `aria-checked` reads the live store value.
 */
export function ThemePillToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeSiteTheme,
    getSiteTheme,
    getServerTheme,
  );
  return (
    <button
      type="button"
      onClick={() => setSiteTheme(theme === "dark" ? "light" : "dark")}
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={`ds-theme-pill${className ? ` ${className}` : ""}`}
    >
      {/* Faint end markers so the control reads as sun ↔ moon. */}
      <Sun
        size={13}
        aria-hidden="true"
        className="ds-theme-pill-marker ds-theme-pill-marker-sun"
      />
      <Moon
        size={13}
        aria-hidden="true"
        className="ds-theme-pill-marker ds-theme-pill-marker-moon"
      />
      {/* Knob: sits left in light mode, slides right in dark mode. */}
      <span className="ds-theme-pill-knob" aria-hidden="true">
        <Sun size={12} className="ds-theme-pill-glyph-sun" />
        <Moon size={12} className="ds-theme-pill-glyph-moon" />
      </span>
    </button>
  );
}

/**
 * Fumadocs `slots.themeSwitch` adapter: ignores the slot's segmented-control
 * classNames and renders the pill flush-right so it keeps its own shape.
 */
export function ThemePillToggleSlot() {
  return (
    <span className="ms-auto inline-flex items-center">
      <ThemePillToggle />
    </span>
  );
}
