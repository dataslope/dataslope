"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Code2,
  Database,
  Info,
  Play,
  Search,
  Settings,
  Star,
  Tag,
  Terminal,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  ALL_THEMES,
  LIGHT_THEMES,
  THEME_PREVIEWS,
  applyMode,
  applyThemePalette,
  getStoredEditorTheme,
  setStoredEditorTheme,
} from "../_components/playgroundTheme";
import "../_components/playground.css";
import styles from "./color-test.module.css";

export default function ColorTestPage() {
  const [activeTheme, setActiveTheme] = useState("lucario");

  useEffect(() => {
    const stored = getStoredEditorTheme();
    const theme = stored ?? "lucario";
    setActiveTheme(theme);
    applyThemePalette(theme);
    applyMode(theme);
  }, []);

  function handleThemeChange(theme: string) {
    setActiveTheme(theme);
    applyThemePalette(theme);
    applyMode(theme);
    setStoredEditorTheme(theme);
  }

  return (
    <div className={`pg-root ${styles.root}`}>
      {/* ── Theme switcher ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.pageTitle}>
            <Zap size={20} />
            Color Theme Test
          </h1>
          <p className={styles.pageSubtitle}>
            Select a theme to preview all UI colors and elements.
          </p>
        </div>

        <div className={styles.themeGrid}>
          {ALL_THEMES.map(({ value, label }) => {
            const p = THEME_PREVIEWS[value];
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
                  <span
                    className={styles.dot}
                    style={{ background: p.kw }}
                  />
                  <span
                    className={styles.dot}
                    style={{ background: p.fn }}
                  />
                  <span
                    className={styles.dot}
                    style={{ background: p.str }}
                  />
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
            {[
              { name: "--bg", label: "Background" },
              { name: "--bg2", label: "Background 2" },
              { name: "--bg3", label: "Background 3" },
              { name: "--border", label: "Border", text: true },
              { name: "--text", label: "Text", onBg: true },
              { name: "--text-muted", label: "Text Muted", onBg: true },
              { name: "--text-dim", label: "Text Dim", onBg: true },
              { name: "--text-soft", label: "Text Soft", onBg: true },
              { name: "--text-accent", label: "Text Accent", onBg: true },
              {
                name: "--text-complementary",
                label: "Text Complementary",
                onBg: true,
                highlight: true,
              },
              { name: "--theme-primary", label: "Theme Primary", onBg: true },
              { name: "--primary", label: "Primary" },
              { name: "--blue", label: "Blue" },
              { name: "--green", label: "Green" },
              { name: "--red", label: "Red" },
              { name: "--yellow", label: "Yellow" },
            ].map(({ name, label, onBg, highlight }) => (
              <div
                key={name}
                className={`${styles.swatch} ${highlight ? styles.swatchHighlight : ""}`}
              >
                <div
                  className={styles.swatchColor}
                  style={{
                    background: onBg ? "var(--bg)" : `var(${name})`,
                    borderColor: "var(--border)",
                  }}
                >
                  {onBg ? (
                    <span
                      className={styles.swatchSample}
                      style={{ color: `var(${name})` }}
                    >
                      Aa
                    </span>
                  ) : null}
                </div>
                <span className={styles.swatchName}>{name}</span>
                <span className={styles.swatchLabel}>{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className={styles.typoGrid}>
            <div className={styles.typoCard}>
              <h3 className={styles.typoCardTitle}>Sans-serif — UI Font</h3>
              <div className={styles.typoSamples} style={{ fontFamily: "var(--font-ui)" }}>
                <p className={styles.typoH1} style={{ color: "var(--text)" }}>
                  Heading One
                </p>
                <p className={styles.typoH2} style={{ color: "var(--text)" }}>
                  Heading Two
                </p>
                <p className={styles.typoH3} style={{ color: "var(--text)" }}>
                  Heading Three
                </p>
                <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.6 }}>
                  Body text — The quick brown fox jumps over the lazy dog. Pack
                  my box with five dozen liquor jugs.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
                  Muted body — Secondary descriptions and helper text appear
                  here, blended toward the background.
                </p>
                <p style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6 }}>
                  Dimmed caption — Timestamps, metadata, and low-priority labels
                  rendered at reduced opacity.
                </p>
              </div>
            </div>

            <div className={styles.typoCard}>
              <h3 className={styles.typoCardTitle}>Monospace — Code Font</h3>
              <div className={styles.typoSamples} style={{ fontFamily: "var(--font-mono)" }}>
                <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.8 }}>
                  <span style={{ color: "var(--theme-primary)" }}>def </span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(</span>
                  <span style={{ color: "var(--text-soft)" }}>n: int</span>
                  <span style={{ color: "var(--text)" }}>) -&gt; int:</span>
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8 }}>
                  &nbsp;&nbsp;<span style={{ color: "var(--text-dim)" }}># base cases</span>
                </p>
                <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.8 }}>
                  &nbsp;&nbsp;<span style={{ color: "var(--theme-primary)" }}>if </span>
                  <span style={{ color: "var(--text)" }}>n &lt;= 1: </span>
                  <span style={{ color: "var(--theme-primary)" }}>return </span>
                  <span style={{ color: "var(--text-accent)" }}>n</span>
                </p>
                <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.8 }}>
                  &nbsp;&nbsp;<span style={{ color: "var(--theme-primary)" }}>return </span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(n-</span>
                  <span style={{ color: "var(--text-accent)" }}>1</span>
                  <span style={{ color: "var(--text)" }}>) + </span>
                  <span style={{ color: "var(--text-complementary)" }}>fibonacci</span>
                  <span style={{ color: "var(--text)" }}>(n-</span>
                  <span style={{ color: "var(--text-accent)" }}>2</span>
                  <span style={{ color: "var(--text)" }}>)</span>
                </p>
                <p style={{ color: "var(--text-soft)", fontSize: 13, marginTop: 8 }}>
                  &gt; fibonacci(10)
                </p>
                <p style={{ color: "var(--text-accent)", fontSize: 13 }}>
                  55
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className={styles.row}>
            <button className={`${styles.btn} ${styles.btnPrimary}`}>
              <Play size={14} />
              Run
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`}>
              <Settings size={14} />
              Settings
            </button>
            <button className={`${styles.btn} ${styles.btnGhost}`}>
              <Search size={14} />
              Search
            </button>
            <button className={`${styles.btn} ${styles.btnDanger}`}>
              <X size={14} />
              Clear
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled>
              Disabled
            </button>
          </div>
          <div className={styles.row} style={{ marginTop: 8 }}>
            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}>
              Small
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`}>
              Medium
            </button>
            <button className={`${styles.btn} ${styles.btnLg} ${styles.btnPrimary}`}>
              Large
            </button>
          </div>
        </Section>

        {/* Badges & Tags */}
        <Section title="Badges & Tags">
          <div className={styles.row}>
            <span className={`${styles.badge} ${styles.badgeDefault}`}>Default</span>
            <span className={`${styles.badge} ${styles.badgeSoft}`}>Soft</span>
            <span className={`${styles.badge} ${styles.badgeAccent}`}>Accent</span>
            <span className={`${styles.badge} ${styles.badgeComplementary}`}>
              Complementary
            </span>
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
              <Check size={10} />
              Success
            </span>
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              <AlertTriangle size={10} />
              Warning
            </span>
            <span className={`${styles.badge} ${styles.badgeError}`}>
              <X size={10} />
              Error
            </span>
          </div>
          <div className={styles.row} style={{ marginTop: 8 }}>
            <span className={styles.tag}>
              <Tag size={11} />
              python
            </span>
            <span className={styles.tag}>
              <Tag size={11} />
              sql
            </span>
            <span className={styles.tag}>
              <Tag size={11} />
              data-science
            </span>
            <span className={`${styles.tag} ${styles.tagAccent}`}>
              <Star size={11} />
              featured
            </span>
          </div>
        </Section>

        {/* Icons */}
        <Section title="Icons">
          <div className={styles.iconGrid}>
            {[
              { icon: <Play size={20} />, label: "Play" },
              { icon: <Terminal size={20} />, label: "Terminal" },
              { icon: <Code2 size={20} />, label: "Code" },
              { icon: <Database size={20} />, label: "Database" },
              { icon: <Settings size={20} />, label: "Settings" },
              { icon: <Search size={20} />, label: "Search" },
              { icon: <Bell size={20} />, label: "Bell" },
              { icon: <Star size={20} />, label: "Star" },
              { icon: <Info size={20} />, label: "Info" },
              { icon: <AlertTriangle size={20} />, label: "Warning" },
              { icon: <CheckCircle2 size={20} />, label: "Success" },
              { icon: <XCircle size={20} />, label: "Error" },
            ].map(({ icon, label }, i) => (
              <div key={label} className={styles.iconItem}>
                <div
                  className={styles.iconBox}
                  style={{
                    color: [
                      "var(--text)",
                      "var(--text-muted)",
                      "var(--text-soft)",
                      "var(--text-accent)",
                      "var(--text-complementary)",
                      "var(--theme-primary)",
                      "var(--text-dim)",
                      "var(--yellow)",
                      "var(--blue)",
                      "var(--yellow)",
                      "var(--green)",
                      "var(--red)",
                    ][i],
                  }}
                >
                  {icon}
                </div>
                <span className={styles.iconLabel}>{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Form elements */}
        <Section title="Form Elements">
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.label}>Text Input</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Enter a value…"
                defaultValue=""
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Select</label>
              <select className={styles.select}>
                <option>Python</option>
                <option>JavaScript</option>
                <option>SQL</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Textarea</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Multi-line input…"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Search</label>
              <div className={styles.inputIcon}>
                <Search size={14} className={styles.inputIconEl} />
                <input
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  type="search"
                  placeholder="Search tables…"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Alerts / Callouts */}
        <Section title="Alerts & Callouts">
          <div className={styles.alertStack}>
            <div className={`${styles.alert} ${styles.alertInfo}`}>
              <Info size={16} />
              <div>
                <strong>Info</strong> — This is an informational message using{" "}
                <code className={styles.inlineCode}>--text-soft</code> for the
                icon and border accent.
              </div>
            </div>
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <CheckCircle2 size={16} />
              <div>
                <strong>Success</strong> — Operation completed using{" "}
                <code className={styles.inlineCode}>--text-accent</code> tones.
              </div>
            </div>
            <div className={`${styles.alert} ${styles.alertComplementary}`}>
              <Zap size={16} />
              <div>
                <strong>Complementary</strong> — Highlighted state using{" "}
                <code className={styles.inlineCode}>--text-complementary</code>{" "}
                — the new function-color variable.
              </div>
            </div>
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <AlertTriangle size={16} />
              <div>
                <strong>Warning</strong> — Caution state using{" "}
                <code className={styles.inlineCode}>--yellow</code>.
              </div>
            </div>
            <div className={`${styles.alert} ${styles.alertError}`}>
              <XCircle size={16} />
              <div>
                <strong>Error</strong> — Destructive state using{" "}
                <code className={styles.inlineCode}>--red</code>.
              </div>
            </div>
          </div>
        </Section>

        {/* List / Navigation */}
        <Section title="Lists & Navigation">
          <div className={styles.listGrid}>
            <nav className={styles.navList}>
              {[
                { icon: <Terminal size={15} />, label: "Python Playground", active: true },
                { icon: <Code2 size={15} />, label: "JavaScript" },
                { icon: <Database size={15} />, label: "SQLite" },
                { icon: <Code2 size={15} />, label: "TypeScript" },
              ].map(({ icon, label, active }) => (
                <div
                  key={label}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                >
                  <span
                    style={{
                      color: active
                        ? "var(--text-complementary)"
                        : "var(--text-soft)",
                    }}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                  <ChevronRight size={13} style={{ marginLeft: "auto", color: "var(--text-dim)" }} />
                </div>
              ))}
            </nav>

            <ul className={styles.bulletList}>
              {[
                { color: "var(--text-soft)", text: "--text-soft — muted secondary (dim slot)" },
                { color: "var(--text-accent)", text: "--text-accent — accent (muted slot)" },
                { color: "var(--text-complementary)", text: "--text-complementary — fn slot (new)" },
                { color: "var(--theme-primary)", text: "--theme-primary — keyword highlight" },
              ].map(({ color, text }) => (
                <li key={text} className={styles.bulletItem}>
                  <Circle size={8} style={{ color, flexShrink: 0 }} fill={color} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Code block */}
        <Section title="Inline & Block Code">
          <p className={styles.prose}>
            Use <code className={styles.inlineCode}>--text-complementary</code>{" "}
            alongside{" "}
            <code className={styles.inlineCode}>--text-soft</code> and{" "}
            <code className={styles.inlineCode}>--text-accent</code> to add a
            third distinct accent drawn straight from the active editor theme's{" "}
            <code className={styles.inlineCode}>fn</code> color slot.
          </p>
          <pre className={styles.codeBlock}>
            <code>
              <span style={{ color: "var(--theme-primary)" }}>SELECT</span>
              {`\n  `}
              <span style={{ color: "var(--text-complementary)" }}>id</span>
              {`, `}
              <span style={{ color: "var(--text-complementary)" }}>name</span>
              {`, `}
              <span style={{ color: "var(--text-complementary)" }}>created_at</span>
              {`\n`}
              <span style={{ color: "var(--theme-primary)" }}>FROM</span>
              {`  `}
              <span style={{ color: "var(--text-soft)" }}>users</span>
              {`\n`}
              <span style={{ color: "var(--theme-primary)" }}>WHERE</span>
              {` active = `}
              <span style={{ color: "var(--text-accent)" }}>true</span>
              {`\n`}
              <span style={{ color: "var(--theme-primary)" }}>ORDER BY</span>
              {` `}
              <span style={{ color: "var(--text-complementary)" }}>created_at</span>
              {` `}
              <span style={{ color: "var(--theme-primary)" }}>DESC</span>
              {`\n`}
              <span style={{ color: "var(--theme-primary)" }}>LIMIT</span>
              {`  `}
              <span style={{ color: "var(--text-accent)" }}>100</span>
              {`;`}
            </code>
          </pre>
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
