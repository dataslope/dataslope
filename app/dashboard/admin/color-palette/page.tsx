"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import {
  ALL_THEMES,
  LIGHT_THEMES,
  THEME_PALETTES,
  applyMode,
  applyThemePalette,
  getStoredEditorTheme,
  setStoredEditorTheme,
} from "@/app/_components/playgroundTheme";
import "@/app/_components/playground.css";
import { AdminPageHeader } from "../_components/shared";
import styles from "./color-palette.module.css";

interface SwatchDef {
  name: string;
  label: string;
  isTextColor?: boolean;
  highlight?: boolean;
}

const SWATCH_DEFS: SwatchDef[] = [
  { name: "--bg", label: "Background" },
  { name: "--bg2", label: "Background 2" },
  { name: "--bg3", label: "Background 3" },
  { name: "--border", label: "Border" },
  { name: "--text", label: "Text", isTextColor: true },
  { name: "--text-muted", label: "Text Muted", isTextColor: true },
  { name: "--text-dim", label: "Text Dim", isTextColor: true },
  {
    name: "--text-complementary",
    label: "Text Complementary",
    isTextColor: true,
    highlight: true,
  },
  { name: "--theme-primary", label: "Theme Primary", isTextColor: true },
  { name: "--accent1", label: "Accent 1", isTextColor: true },
  { name: "--accent2", label: "Accent 2", isTextColor: true },
  { name: "--primary", label: "Primary" },
  { name: "--blue", label: "Blue" },
  { name: "--green", label: "Green" },
  { name: "--red", label: "Red" },
  { name: "--yellow", label: "Yellow" },
  // Brand "ink" anchors (AA-on-white text colors from brand.css).
  { name: "--ds-blue-ink", label: "Blue ink", isTextColor: true },
  { name: "--ds-green-ink", label: "Green ink", isTextColor: true },
  { name: "--ds-red-ink", label: "Red ink", isTextColor: true },
  { name: "--ds-amber-ink", label: "Amber ink", isTextColor: true },
  // Decorative-hue "ink" anchors (non-semantic; AA-on-white from brand.css).
  { name: "--ds-teal-ink", label: "Teal ink", isTextColor: true },
  { name: "--ds-purple-ink", label: "Purple ink", isTextColor: true },
  { name: "--ds-orange-ink", label: "Orange ink", isTextColor: true },
  // Full 50–900 brand ramps (brand.css). 500 = the brand color.
  ...(["blue", "green", "red", "yellow"] as const).flatMap((hue) =>
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => ({
      name: `--ds-${hue}-${step}`,
      label: `${hue} ${step}`,
    })),
  ),
  // Decorative / categorical ramps (teal, purple, orange), non-semantic,
  // for charts (Mermaid mindmaps) and illustrations. 500 = the base hue.
  ...(["teal", "purple", "orange"] as const).flatMap((hue) =>
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => ({
      name: `--ds-${hue}-${step}`,
      label: `${hue} ${step}`,
    })),
  ),
];

function resolveCssVarToHex(varName: string): string {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-9999px;top:0;width:1px;height:1px;background:var(${varName})`;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return "";
  return (
    "#" +
    (m as string[])
      .slice(0, 3)
      .map((n: string) => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
  );
}


export default function ColorTestPage() {
  const [activeTheme, setActiveTheme] = useState("github-light");
  const [resolvedHex, setResolvedHex] = useState<Record<string, string>>({});
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredEditorTheme();
    const theme = stored ?? "github-light";
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setActiveTheme(theme);
    applyThemePalette(theme);
    applyMode(theme);
  }, []);

  // Re-resolve hex values whenever the theme changes (after CSS vars update).
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const { name } of SWATCH_DEFS) {
      map[name] = resolveCssVarToHex(name);
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setResolvedHex(map);
  }, [activeTheme]);

  function handleThemeChange(theme: string) {
    setActiveTheme(theme);
    applyThemePalette(theme);
    applyMode(theme);
    setStoredEditorTheme(theme);
  }

  function handleCopy(varName: string) {
    const hex = resolvedHex[varName];
    if (!hex) return;
    navigator.clipboard.writeText(hex.slice(1)); // strip leading #
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar((v) => (v === varName ? null : v)), 1500);
  }


  return (
    <>
      <AdminPageHeader
        title="Color Palette"
        description="Every editor theme's resolved palette, plus the brand ramps from app/brand.css. Pick a theme to re-resolve every swatch against it; click a swatch to copy its hex."
      />

      {/* The preview surfaces below paint themselves from the *playground*
          variables (--bg, --text, --theme-primary …), which is the whole point
          of the page: they have to show the chosen editor theme, not the
          dashboard's. `playground-root` is what scopes those variables, so it
          stays wrapped around this subtree and nothing outside it is touched. */}
      <div className={`playground-root ${styles.root}`}>
        <Section
          title="Editor theme"
          note="Drives every resolved value below."
        >
          <div className={styles.themeRow}>
            {ALL_THEMES.map(({ value, label }) => {
              const p = THEME_PALETTES[value];
              const isLight = LIGHT_THEMES.has(value);
              const active = activeTheme === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  className={`${styles.themeChip} ${active ? styles.themeChipActive : ""}`}
                  onClick={() => handleThemeChange(value)}
                >
                  <span
                    className={styles.themePreview}
                    style={{ background: p.bg, borderColor: p.border }}
                  >
                    <span className={styles.dot} style={{ background: p.kw }} />
                    <span className={styles.dot} style={{ background: p.fn }} />
                    <span className={styles.dot} style={{ background: p.str }} />
                    {active && (
                      <Check
                        size={10}
                        className={styles.activeCheck}
                        style={{ color: isLight ? "#000" : "#fff" }}
                      />
                    )}
                  </span>
                  <span className={styles.themeLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title="Color variables"
          note={`${SWATCH_DEFS.length} tokens · click to copy`}
        >
          <div className={styles.swatchGrid}>
            {SWATCH_DEFS.map(({ name, label, isTextColor, highlight }) => {
              const hex = resolvedHex[name] ?? "";
              const copied = copiedVar === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleCopy(name)}
                  disabled={!hex}
                  title={hex ? `Copy ${hex}` : undefined}
                  className={`${styles.swatch} ${highlight ? styles.swatchHighlight : ""}`}
                >
                  {/* One cell geometry for every token, so the hex, the name
                      and the label line up in columns down the grid. A text
                      token shows "Aa" over --bg with a solid band of itself
                      beneath, rather than claiming a wider cell as it used
                      to and breaking the alignment for everything after it. */}
                  <span className={styles.chip} style={{ background: "var(--bg)" }}>
                    {isTextColor ? (
                      <>
                        <span
                          className={styles.chipSample}
                          style={{ color: `var(${name})` }}
                        >
                          Aa
                        </span>
                        <span
                          className={styles.chipBand}
                          style={{ background: `var(${name})` }}
                        />
                      </>
                    ) : (
                      <span
                        className={styles.chipFill}
                        style={{ background: `var(${name})` }}
                      />
                    )}
                    <span className={styles.chipAction} aria-hidden="true">
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                    </span>
                  </span>

                  <span className={styles.swatchHex}>{hex || "—"}</span>
                  <span className={styles.swatchName}>{name}</span>
                  <span className={styles.swatchLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        </Section>

      </div>
    </>
  );
}

/**
 * A titled band. No card: a small-caps label with a hairline running to the
 * right edge, which lines every section heading up on the same left margin as
 * the grid beneath it and lets the swatches be the only filled shapes on the
 * page.
 */
function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <span className={styles.sectionNote}>{note}</span> : null}
      </div>
      {children}
    </section>
  );
}
