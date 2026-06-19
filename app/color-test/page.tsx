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
} from "../_components/playgroundTheme";
import "../_components/playground.css";
import styles from "./color-test.module.css";

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
  // Decorative / categorical ramps (teal, purple, orange) — non-semantic,
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
    <div className={`playground-root ${styles.root}`}>
      {/* ── Theme switcher ── */}
      <header className={styles.header}>
        <div className={styles.themeGrid}>
          {ALL_THEMES.map(({ value, label }) => {
            const p = THEME_PALETTES[value];
            const isLight = LIGHT_THEMES.has(value);
            return (
              <button
                key={value}
                className={`${styles.themeCard} ${activeTheme === value ? styles.themeCardActive : ""}`}
                onClick={() => handleThemeChange(value)}
                title={label}
              >
                <div
                  className={styles.themePreview}
                  style={{ background: p.bg, borderColor: p.border }}
                >
                  <span className={styles.dot} style={{ background: p.kw }} />
                  <span className={styles.dot} style={{ background: p.fn }} />
                  <span className={styles.dot} style={{ background: p.str }} />
                  {activeTheme === value && (
                    <Check
                      size={10}
                      className={styles.activeCheck}
                      style={{ color: isLight ? "#000" : "#fff" }}
                    />
                  )}
                </div>
                <span className={styles.themeLabel}>{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Content ── */}
      <main className={styles.content}>
        {/* Color swatches */}
        <Section title="Color Variables">
          <div className={styles.swatchGrid}>
            {SWATCH_DEFS.map(({ name, label, isTextColor, highlight }) => {
              const hex = resolvedHex[name] ?? "";
              return (
                <div
                  key={name}
                  className={[
                    styles.swatch,
                    isTextColor ? styles.swatchDual : "",
                    highlight ? styles.swatchHighlight : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.swatchColors}>
                    <div
                      className={styles.swatchColor}
                      style={{
                        background: isTextColor
                          ? "var(--bg)"
                          : `var(${name})`,
                        borderColor: "var(--border)",
                      }}
                    >
                      {isTextColor && (
                        <span
                          className={styles.swatchSample}
                          style={{ color: `var(${name})` }}
                        >
                          Aa
                        </span>
                      )}
                    </div>
                    {isTextColor && (
                      <div
                        className={styles.swatchColorSolid}
                        style={{
                          background: `var(${name})`,
                          borderColor: "var(--border)",
                        }}
                      />
                    )}
                  </div>

                  <div className={styles.swatchMeta}>
                    <span className={styles.swatchHex}>
                      {hex || "—"}
                    </span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopy(name)}
                      title="Copy hex (without #)"
                      disabled={!hex}
                    >
                      {copiedVar === name ? (
                        <Check size={9} />
                      ) : (
                        <Copy size={9} />
                      )}
                    </button>
                  </div>

                  <span className={styles.swatchName}>{name}</span>
                  <span className={styles.swatchLabel}>{label}</span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className={styles.typoStack}>
            <div className={styles.typoCard}>
              <h3 className={styles.typoCardTitle}>Sans-serif — UI Font</h3>
              <div
                className={styles.typoSamples}
                style={{ fontFamily: "var(--font-ui)" }}
              >
                <p className={styles.typoH1} style={{ color: "var(--text)" }}>
                  Heading One
                </p>
                <p className={styles.typoH2} style={{ color: "var(--text)" }}>
                  Heading Two
                </p>
                <p className={styles.typoH3} style={{ color: "var(--text)" }}>
                  Heading Three
                </p>
                <p
                  style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.6 }}
                >
                  Body text — The quick brown fox jumps over the lazy dog. Pack
                  my box with five dozen liquor jugs.
                </p>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Muted body — Secondary descriptions and helper text appear
                  here, blended toward the background.
                </p>
                <p
                  style={{
                    color: "var(--text-dim)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Dimmed caption — Timestamps, metadata, and low-priority labels
                  rendered at reduced opacity.
                </p>
              </div>
            </div>

            <div className={styles.cmCard}>
              <h3 className={styles.typoCardTitle}>Monospace — Code Font</h3>
              <pre className={styles.codeBlock}>
                <code>
                  <span style={{ color: "var(--theme-primary)" }}>def </span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(</span>
                  <span style={{ color: "var(--text-dim)" }}>n: int</span>
                  <span style={{ color: "var(--text)" }}>) -&gt; int:{"\n"}</span>
                  <span style={{ color: "var(--text-dim)" }}>{"    "}{'"""Return the nth Fibonacci number."""'}{"\n"}</span>
                  {"    "}<span style={{ color: "var(--theme-primary)" }}>if </span>
                  <span style={{ color: "var(--text)" }}>n &lt;= </span>
                  <span style={{ color: "var(--text-muted)" }}>1</span>
                  <span style={{ color: "var(--text)" }}>:{"\n"}</span>
                  {"        "}<span style={{ color: "var(--theme-primary)" }}>return </span>
                  <span style={{ color: "var(--text-muted)" }}>n{"\n"}</span>
                  {"    "}<span style={{ color: "var(--theme-primary)" }}>return </span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(n - </span>
                  <span style={{ color: "var(--text-muted)" }}>1</span>
                  <span style={{ color: "var(--text)" }}>) + </span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(n - </span>
                  <span style={{ color: "var(--text-muted)" }}>2</span>
                  <span style={{ color: "var(--text)" }}>){"\n\n"}</span>
                  <span style={{ color: "var(--text-dim)" }}># Compute first 10 values{"\n"}</span>
                  <span style={{ color: "var(--text-complementary)" }}>results</span>
                  <span style={{ color: "var(--text)" }}> = [</span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(i) </span>
                  <span style={{ color: "var(--theme-primary)" }}>for </span>
                  <span style={{ color: "var(--text)" }}>i </span>
                  <span style={{ color: "var(--theme-primary)" }}>in </span>
                  <span style={{ color: "var(--text-complementary)" }}>range</span>
                  <span style={{ color: "var(--text)" }}>(</span>
                  <span style={{ color: "var(--text-muted)" }}>10</span>
                  <span style={{ color: "var(--text)" }}>)]{"\n"}</span>
                  <span style={{ color: "var(--text-complementary)" }}>print</span>
                  <span style={{ color: "var(--text)" }}>(</span>
                  <span style={{ color: "var(--text-dim)" }}>{'f"'}Sequence: {"{"}</span>
                  <span style={{ color: "var(--text-complementary)" }}>results</span>
                  <span style={{ color: "var(--text-dim)" }}>{'}"'}</span>
                  <span style={{ color: "var(--text)" }}>)</span>
                </code>
              </pre>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
