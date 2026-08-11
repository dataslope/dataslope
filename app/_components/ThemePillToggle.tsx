"use client";

// Shared light/dark pill toggle (sun ↔ moon with a sliding knob), used by
// every surface that lets the visitor flip the color scheme: the home
// header, the home mobile drawer, the playground Settings panel, and the
// Fumadocs docs chrome (via `slots.themeSwitch`).
//
// Styled with plain CSS (`.ds-theme-pill*` in app/globals.css, imported by the
// root layout) rather than Tailwind utilities, because the /playground pages
// don't load a Tailwind root, so a utility-styled pill would render unstyled
// there. globals.css loads on every route, so the pill looks identical
// everywhere.
//
// Wired directly to the canonical site-theme controller (siteTheme.ts) so the
// choice is shared across surfaces, same-origin frames, and the
// next-themes-driven /courses, /interview-prep and /fumadocs-dev routes
// (subscribeSiteTheme observes the <html> class next-themes toggles there).

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
 * The pill toggle. The knob position and glyph are driven purely by the
 * `.dark` class on <html> (applied pre-hydration, read here via the
 * `.dark .ds-theme-pill*` CSS rules), so they never mismatch on hydration;
 * only `aria-checked` reads the live store value, which useSyncExternalStore
 * reconciles without a hydration warning.
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
 * Fumadocs `slots.themeSwitch` adapter. Fumadocs renders the slot with layout
 * classNames meant for its own segmented control (e.g. `rounded-none`); we
 * ignore those and render the pill flush-right in the docs sidebar footer so
 * it keeps its own shape.
 */
export function ThemePillToggleSlot() {
  return (
    <span className="ms-auto inline-flex items-center">
      <ThemePillToggle />
    </span>
  );
}
