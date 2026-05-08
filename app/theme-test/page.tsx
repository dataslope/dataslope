"use client";

import { useMemo, useState } from "react";
import {
  ALL_THEMES,
  LIGHT_THEMES,
  THEME_PREVIEWS,
  type ThemePalette,
} from "../_components/playgroundTheme";

const SAMPLE_CODE = `function greet(name: string) {
  const message = "Hello, " + name + "!";
  return message;
}`;

function paletteVars(p: ThemePalette): React.CSSProperties {
  return {
    ["--bg" as string]: p.bg,
    ["--bg2" as string]: p.bg2,
    ["--bg3" as string]: p.bg3,
    ["--border" as string]: p.border,
    ["--text" as string]: p.text,
    ["--text-soft" as string]: p.dim,
    ["--text-accent" as string]: p.muted,
    ["--text-complementary" as string]: p.str,
    ["--theme-primary" as string]: p.kw,
    ["--theme-fn" as string]: p.fn,
    ["--theme-arg" as string]: p.arg,
    ["--text-muted" as string]: `color-mix(in srgb, ${p.text} 78%, ${p.bg} 22%)`,
    ["--text-dim" as string]: `color-mix(in srgb, ${p.text} 55%, ${p.bg} 45%)`,
  } as React.CSSProperties;
}

export default function ThemeTestPage() {
  const [theme, setTheme] = useState<string>("lucario");
  const palette = THEME_PREVIEWS[theme] ?? THEME_PREVIEWS.lucario;
  const isLight = LIGHT_THEMES.has(theme);
  const vars = useMemo(() => paletteVars(palette), [palette]);

  return (
    <div style={{ ...vars, minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`
        .tt-root {
          font-family: var(--font-sans, Inter, system-ui, sans-serif);
          color: var(--text);
          padding: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .tt-mono { font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace; }
        .tt-switcher {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
        }
        .tt-switcher label { font-size: 13px; color: var(--text-muted); }
        .tt-switcher select {
          background: var(--bg3);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 10px;
          font: inherit;
        }
        .tt-preview-row { display: flex; gap: 6px; align-items: center; }
        .tt-swatch {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          border: 1px solid var(--border);
        }
        .tt-section {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .tt-section h2 {
          margin: 0 0 14px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tt-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .tt-btn {
          font: inherit;
          padding: 8px 14px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--text);
          cursor: pointer;
          transition: filter 0.15s;
        }
        .tt-btn:hover { filter: brightness(1.15); }
        .tt-btn-primary {
          background: var(--theme-primary);
          color: ${isLight ? "#fff" : "#0f1117"};
          border-color: transparent;
          font-weight: 600;
        }
        .tt-btn-accent {
          background: transparent;
          border-color: var(--text-accent);
          color: var(--text-accent);
        }
        .tt-btn-complementary {
          background: transparent;
          border-color: var(--text-complementary);
          color: var(--text-complementary);
        }
        .tt-input, .tt-textarea {
          font: inherit;
          width: 100%;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
        }
        .tt-textarea { min-height: 80px; resize: vertical; }
        .tt-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
          background: var(--bg3);
          color: var(--text-muted);
          border: 1px solid var(--border);
        }
        .tt-link { color: var(--text-soft); text-decoration: underline; }
        .tt-link-comp { color: var(--text-complementary); }
        .tt-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .tt-table th, .tt-table td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .tt-table th { color: var(--text-soft); font-weight: 500; }
        .tt-code {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          white-space: pre;
          overflow-x: auto;
          font-size: 13px;
        }
        .tt-code .kw { color: var(--theme-primary); }
        .tt-code .fn { color: var(--theme-fn); }
        .tt-code .arg { color: var(--theme-arg); }
        .tt-code .str { color: var(--text-complementary); }
        .tt-code .dim { color: var(--text-dim); }
        .tt-list { list-style: none; padding: 0; margin: 0; }
        .tt-list li {
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tt-list li:last-child { border-bottom: none; }
        .tt-icon-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .tt-color-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .tt-color-chip {
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: "JetBrains Mono", ui-monospace, monospace;
          border: 1px solid var(--border);
        }
        .tt-checkbox-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
        .tt-progress {
          height: 8px;
          background: var(--bg3);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .tt-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--theme-primary), var(--text-complementary));
        }
      `}</style>

      <div className="tt-root">
        <div className="tt-switcher">
          <label htmlFor="tt-theme">Theme</label>
          <select
            id="tt-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            {ALL_THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {LIGHT_THEMES.has(t.value) ? " (light)" : ""}
              </option>
            ))}
          </select>
          <div className="tt-preview-row" aria-label="palette preview">
            <div className="tt-swatch" style={{ background: palette.bg }} title="bg" />
            <div className="tt-swatch" style={{ background: palette.bg2 }} title="bg2" />
            <div className="tt-swatch" style={{ background: palette.kw }} title="primary (kw)" />
            <div className="tt-swatch" style={{ background: palette.muted }} title="accent (muted)" />
            <div className="tt-swatch" style={{ background: palette.str }} title="complementary (str)" />
          </div>
          <span className="tt-badge">{isLight ? "light" : "dark"}</span>
        </div>

        <div className="tt-section">
          <h2>Typography — Sans-serif</h2>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700 }}>
            The quick brown fox jumps over the lazy dog
          </h1>
          <p style={{ margin: "0 0 8px", color: "var(--text-muted)" }}>
            Body copy in the default sans-serif stack. Secondary text uses{" "}
            <code>--text-muted</code> for paragraphs and aside content.
          </p>
          <p style={{ margin: "0 0 8px" }}>
            Inline highlights:{" "}
            <span style={{ color: "var(--text-soft)" }}>soft</span>,{" "}
            <span style={{ color: "var(--text-accent)" }}>accent</span>,{" "}
            <span style={{ color: "var(--text-complementary)" }}>complementary</span>,{" "}
            <a href="#" className="tt-link">link soft</a>,{" "}
            <a href="#" className="tt-link tt-link-comp">link complementary</a>.
          </p>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 13 }}>
            Dim caption text — fine print, timestamps, footnotes.
          </p>
        </div>

        <div className="tt-section">
          <h2>Typography — Monospace</h2>
          <div className="tt-mono" style={{ marginBottom: 12 }}>
            const result = await fetch(&quot;/api/data&quot;);
          </div>
          <pre className="tt-code tt-mono">
            <span className="dim">{"// editor-style snippet"}</span>{"\n"}
            <span className="kw">function</span>{" "}
            <span className="fn">greet</span>(
            <span className="arg">name</span>: <span className="kw">string</span>) {"{"}{"\n  "}
            <span className="kw">const</span> message ={" "}
            <span className="str">&quot;Hello, &quot;</span> + name +{" "}
            <span className="str">&quot;!&quot;</span>;{"\n  "}
            <span className="kw">return</span> message;{"\n}"}{"\n\n"}
            <span className="dim">{`// SAMPLE_CODE = ${SAMPLE_CODE.length} chars`}</span>
          </pre>
        </div>

        <div className="tt-section">
          <h2>Buttons</h2>
          <div className="tt-icon-row">
            <button className="tt-btn tt-btn-primary">Primary</button>
            <button className="tt-btn">Default</button>
            <button className="tt-btn tt-btn-accent">Accent</button>
            <button className="tt-btn tt-btn-complementary">Complementary</button>
            <button className="tt-btn" disabled style={{ opacity: 0.5 }}>
              Disabled
            </button>
          </div>
        </div>

        <div className="tt-section">
          <h2>Form Controls</h2>
          <div className="tt-grid-2">
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-soft)" }}>
                Text input
              </label>
              <input className="tt-input" placeholder="Type something…" defaultValue="hello world" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-soft)" }}>
                Textarea
              </label>
              <textarea className="tt-textarea" defaultValue="Multi-line input." />
            </div>
          </div>
          <div className="tt-checkbox-row" style={{ marginTop: 12 }}>
            <label><input type="checkbox" defaultChecked /> Enabled</label>
            <label><input type="checkbox" /> Disabled</label>
            <label><input type="radio" name="r" defaultChecked /> Option A</label>
            <label><input type="radio" name="r" /> Option B</label>
          </div>
        </div>

        <div className="tt-section">
          <h2>Icons (inline SVG)</h2>
          <div className="tt-icon-row">
            <Icon color="var(--text)" label="text" />
            <Icon color="var(--text-soft)" label="soft" />
            <Icon color="var(--text-accent)" label="accent" />
            <Icon color="var(--text-complementary)" label="complementary" />
            <Icon color="var(--theme-primary)" label="primary" />
            <Icon color="var(--text-muted)" label="muted" />
          </div>
        </div>

        <div className="tt-section">
          <h2>Color tokens</h2>
          <div className="tt-color-row">
            {([
              ["--bg", palette.bg],
              ["--bg2", palette.bg2],
              ["--bg3", palette.bg3],
              ["--border", palette.border],
              ["--text", palette.text],
              ["--text-soft", palette.dim],
              ["--text-accent", palette.muted],
              ["--text-complementary", palette.str],
              ["--theme-primary", palette.kw],
            ] as const).map(([name, value]) => (
              <span
                key={name}
                className="tt-color-chip"
                style={{
                  background: value,
                  color:
                    name === "--text" ||
                    name === "--text-soft" ||
                    name === "--text-accent" ||
                    name === "--text-complementary" ||
                    name === "--theme-primary"
                      ? palette.bg
                      : palette.text,
                }}
              >
                {name} {value}
              </span>
            ))}
          </div>
        </div>

        <div className="tt-section">
          <h2>List & Table</h2>
          <div className="tt-grid-2">
            <ul className="tt-list">
              <li>
                <Icon color="var(--text-accent)" />
                <span>First item</span>
                <span className="tt-badge" style={{ marginLeft: "auto" }}>new</span>
              </li>
              <li>
                <Icon color="var(--text-complementary)" />
                <span>Second item</span>
                <span
                  className="tt-badge"
                  style={{
                    marginLeft: "auto",
                    color: "var(--text-complementary)",
                    borderColor: "var(--text-complementary)",
                  }}
                >
                  ready
                </span>
              </li>
              <li>
                <Icon color="var(--text-soft)" />
                <span>Third item</span>
              </li>
            </ul>
            <table className="tt-table">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>users</td>
                  <td className="tt-mono">TABLE</td>
                  <td style={{ color: "var(--text-complementary)" }}>OK</td>
                </tr>
                <tr>
                  <td>orders</td>
                  <td className="tt-mono">VIEW</td>
                  <td style={{ color: "var(--text-accent)" }}>SYNCING</td>
                </tr>
                <tr>
                  <td>events</td>
                  <td className="tt-mono">TABLE</td>
                  <td style={{ color: "var(--theme-primary)" }}>STALE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="tt-section">
          <h2>Progress & Misc</h2>
          <div className="tt-progress" style={{ marginBottom: 16 }}>
            <div className="tt-progress-bar" style={{ width: "62%" }} />
          </div>
          <blockquote
            style={{
              margin: 0,
              padding: "10px 16px",
              borderLeft: "3px solid var(--text-complementary)",
              background: "var(--bg3)",
              color: "var(--text-muted)",
            }}
          >
            “The complementary accent draws the eye without overpowering the
            primary palette.”
          </blockquote>
        </div>
      </div>
    </div>
  );
}

function Icon({ color, label }: { color: string; label?: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color, fontSize: 13 }}
      title={label}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
