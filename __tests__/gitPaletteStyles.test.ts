/**
 * Two things the audit found by looking, pinned so they stay fixed.
 *
 * The "All commands" palette once shipped with class names no stylesheet
 * knew (BG-05): every class either palette component emits must have a rule.
 * And the terminal's prompt, command and error colours must clear WCAG AA at
 * the 13px they are set in (BG-23).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const sheets = [
  "app/_components/git/gitPanels.css",
  "app/_components/git/gitPlayground.css",
  "app/_components/bash/bashPlayground.css",
].map(read).join("\n");

function classesIn(source: string): string[] {
  const out = new Set<string>();
  for (const m of source.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
    const raw = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, " ");
    for (const c of raw.split(/\s+/)) if (c && /^[a-z]/.test(c)) out.add(c);
  }
  return [...out];
}

describe("BG-05 · every palette class has a rule", () => {
  it.each([
    "app/_components/git/CommandPalette.tsx",
    "app/_components/bash/BashCommandPalette.tsx",
  ])("%s", (file) => {
    const classes = classesIn(read(file)).filter((c) => c.startsWith("gitx-palette") || c.startsWith("bpg-"));
    expect(classes.length).toBeGreaterThan(3);
    const missing = classes.filter((c) => !new RegExp(`\\.${c.replace(/[-]/g, "\\-")}[\\s,.:{\\[>]`).test(sheets));
    expect(missing).toEqual([]);
  });

  it("the Bash on-ramp's classes too", () => {
    const classes = classesIn(read("app/_components/bash/BashPlayground.tsx")).filter((c) => c.startsWith("bpg-"));
    const missing = classes.filter((c) => !new RegExp(`\\.${c}[\\s,.:{\\[>]`).test(sheets));
    expect(missing).toEqual([]);
  });
});

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe("BG-23 · terminal error colours clear AA on the page", () => {
  const brand = read("app/brand.css");
  const token = (name: string) => {
    const m = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(brand);
    if (!m) throw new Error(`no ${name} in brand.css`);
    return m[1];
  };
  const panels = read("app/_components/git/gitPanels.css");
  const light = /\.git-terminal \{[^}]*\}/.exec(panels)![0];
  const dark = /html:is\([^)]*\) \.git-terminal \{[^}]*\}/.exec(panels)![0];
  const pick = (block: string, role: string) => {
    const m = new RegExp(`--git-terminal-${role}:\\s*var\\((--ds-[a-z]+-\\d+)\\)`).exec(block);
    if (!m) throw new Error(`no ${role} in ${block}`);
    return token(m[1]);
  };

  it.each(["error", "warn"])("%s on white is at least 4.5:1", (role) => {
    expect(contrast(pick(light, role), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["error", "warn"])("%s on a dark ground is at least 4.5:1", (role) => {
    expect(contrast(pick(dark, role), "#111418")).toBeGreaterThanOrEqual(4.5);
  });

  it("no terminal rule still uses the raw --red for errors", () => {
    for (const file of [
      "app/_components/git/gitPanels.css",
      "app/_components/git/gitPlayground.css",
      "app/_components/bash/bashPlayground.css",
      "app/_components/shell/embeddedShell.css",
    ]) {
      const css = read(file);
      for (const rule of css.matchAll(/\.git-terminal[a-z-]*[^{]*\{[^}]*\}/g)) {
        expect(rule[0], `${file}: ${rule[0].split("\n")[0]}`).not.toMatch(/var\(--red\)/);
      }
    }
  });
});
