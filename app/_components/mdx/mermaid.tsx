"use client";

import {
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import styles from "./mermaid.module.css";
import { Timeline } from "./timeline";
import { MERMAID_CDN } from "../runtime/cdn";
import BRAND_FALLBACKS from "@/lib/generated/brand-fallbacks.js";

export function Mermaid({ chart }: { chart: string }) {
  // Mermaid lays `timeline` diagrams out horizontally, so a chart with many
  // year-columns grows far wider than the article column and gets scaled down
  // until the text is unreadable. Render those with our vertical, responsive
  // <Timeline> instead; everything else falls through to the Mermaid SVG.
  if (/^\s*timeline\b/i.test(chart.replace(/\\n/g, "\n"))) {
    return <Timeline chart={chart} />;
  }
  return <MermaidDiagram chart={chart} />;
}

function MermaidDiagram({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

// ─── Brand-themed Mermaid palette ──────────────────────────────────────────
//
// Diagrams are themed from the brand color system (app/brand.css) so every
// element reads as part of the DataSlope palette:
//
//   • Shapes use saturated brand fills (the 500 shade by default), and those
//     fills are IDENTICAL in light and dark mode, no translucent or pastel
//     variants. Only the *page-level* structure (connectors, free-floating
//     titles, edge-label backdrops, the subtle subgraph surface) follows the
//     surrounding light/dark page.
//   • Shapes have NO borders: every theme border color is set equal to its
//     fill, and `adaptNodes` additionally forces stroke-width to 0 after
//     render (which also clears any author `stroke:` override).
//   • The fonts come from the app's type system: Inter (`--font-sans`) for
//     regular text and JetBrains Mono (`--font-mono`) for code spans the author
//     wraps in a <code> tag (styled in mermaid.module.css).
//
// ~50 MDX diagrams hand-color nodes with `style`/`classDef` using light pastel
// fills (e.g. `fill:#fee2e2`). To keep those on-brand, `adaptNodes` buckets
// each node's fill by hue and snaps it to the matching brand 500 (red pastel →
// red-500, green pastel → green-500, …), then sets a per-fill label color
// (white on the darker hues, near-black on yellow/green/teal).
//
// Mermaid runs color math (khroma) over theme values and needs concrete colors,
// so we resolve the brand tokens to hex at render time (brand.css stays the
// source of truth) with literal fallbacks, BRAND_FALLBACKS, generated from
// brand.css at build time by scripts/build-brand-fallbacks.mjs.

// Inter for regular text; JetBrains Mono for diagrams that are entirely code.
// Inline <code> spans in flowchart labels are styled via mermaid.module.css; whole
// class/ER diagrams (see isCodeDiagram) render in mono so Mermaid measures, and
// therefore sizes the boxes, in the mono face. The CSS vars resolve in the DOM
// (published on <html> by next/font in app/layout.tsx); the literal fallbacks
// keep text measurement correct if a var is ever missing.
const SANS =
  'var(--font-sans), Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO =
  'var(--font-mono), "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * The same stacks with `var(--font-*)` already resolved to the family names.
 *
 * A `var()` in the string handed to Mermaid is a measurement hazard, and the
 * `List` class diagram on `java-collections-and-generics-deep-dive/lists` is
 * what it looks like when it fires: the box came out exactly as wide as
 * `+indexOf(Object) : int` and `+subList(int, int) : List`, three characters
 * longer, wrapped onto a second line on top of the row above it.
 *
 * Mermaid writes `fontFamily` into the SVG's own `<style>` and *also* measures
 * every label with it. A custom property resolves against the element it is
 * applied to, so the two steps only agree while the SVG is attached to a
 * document that carries the variable. Whenever measurement happens off that
 * document the declaration is invalid, measurement silently falls back to the
 * inherited proportional face, and the box is sized for a font the label will
 * not be painted in. In a proportional face those two rows are 176px and
 * 178px, which is why the shorter one won; in mono they are 194px and 221px.
 *
 * Resolving here removes the difference: the string Mermaid measures with and
 * the string it paints with name the same families, attached or not. The
 * literal stacks stay as the fallback for a missing variable, which is what
 * server rendering and the tests see.
 */
function resolvedStacks(): { sans: string; mono: string } {
  if (typeof document === "undefined") return { sans: SANS, mono: MONO };
  const root = getComputedStyle(document.documentElement);
  const resolve = (variable: string, stack: string) => {
    const family = root.getPropertyValue(variable).trim();
    return family ? stack.replace(`var(${variable})`, family) : stack;
  };
  return {
    sans: resolve("--font-sans", SANS),
    mono: resolve("--font-mono", MONO),
  };
}

/** The keyword the chart opens with (`flowchart`, `sequenceDiagram`, …), read
 *  off the first line that is neither blank nor a `%%` comment. */
function diagramKeyword(chart: string): string {
  const first = chart
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("%%"));
  return first ?? "";
}

// Class diagrams (class names, fields, method signatures) and ER diagrams (tables,
// typed columns, keys) are entirely code, so they render wholesale in mono. Other
// types stay sans and tag individual code spans with <code> instead.
function isCodeDiagram(chart: string): boolean {
  return /^(classDiagram(?:-v2)?|erDiagram)\b/.test(diagramKeyword(chart));
}

/**
 * Diagram kinds whose labels Mermaid paints as SVG `<text>` rather than as
 * HTML in a `<foreignObject>`.
 *
 * A flowchart, class, state, ER or mindmap label goes through Mermaid's HTML
 * label path, so an author's `<code>` tag survives into the DOM as an element
 * and mermaid.module.css sets it in the mono face. These kinds instead hand
 * the label to d3's `.text()`, which writes it as a text node: by the time it
 * reaches the page the tag is not markup, it is the literal characters
 * `<code>System.out</code>` sitting inside the actor box. That is how the
 * sequence diagram on `java-programming-for-beginners/your-first-java-program`
 * came to show `System.out` in Inter — there was no way to ask for anything
 * else. (Checked against mermaid 11.16.1, including `sequence.textPlacement:
 * "fo"`, whose foreignObject path calls `.text()` too, so it escapes the tag
 * just the same.)
 *
 * For these, `stripCodeTags` takes the tags out before Mermaid measures the
 * label, and `applyCodeFont` puts the mono face back on the rendered text.
 */
const SVG_TEXT_LABELS =
  /^(sequenceDiagram|pie\b|gantt|journey|quadrantChart|xychart|sankey|gitGraph)/;

function hasSvgTextLabels(chart: string): boolean {
  return SVG_TEXT_LABELS.test(diagramKeyword(chart));
}

/**
 * Remove the `<code>` markers from a chart, returning the plain chart Mermaid
 * should measure and render plus the text of every span that was marked.
 *
 * The spans are matched back against the rendered text by value rather than by
 * position: Mermaid rewrites labels on the way through (it splits on `<br/>`,
 * wraps long text, drops the participant alias) and there is no id on the
 * output to carry an index. Matching on the string is what survives all of
 * that, and a code span is a distinctive enough run (`System.out`,
 * `println("Hello, Java!")`) that a chance collision would have to be a label
 * quoting the identifier it is naming, which is the same face either way.
 */
function stripCodeTags(chart: string): { chart: string; spans: string[] } {
  const spans: string[] = [];
  const plain = chart.replace(/<code>([\s\S]*?)<\/code>/gi, (_, inner: string) => {
    const text = inner.trim();
    if (text) spans.push(text);
    return inner;
  });
  return { chart: plain, spans };
}

// Mermaid init directive that switches a single diagram to the mono face. It
// merges over the global brand theme; adaptNodes still owns fills and label
// colors, so only the font changes.
const monoDirective = (mono: string) =>
  `%%{init: ${JSON.stringify({
    fontFamily: mono,
    themeVariables: { fontFamily: mono },
  })}}%%\n`;

// The seven-hue brand wheel (app/brand.css §1.1) used for categorical diagrams
// (pie) and for snapping author fills back onto the palette. `dark` marks hues
// that take near-black label text; everything else takes white. Only yellow is
// light enough to require dark text (white on yellow-500 is unreadable).
const WHEEL: ReadonlyArray<{ name: string; dark: boolean }> = [
  { name: "blue", dark: false },
  { name: "teal", dark: false },
  { name: "green", dark: false },
  { name: "yellow", dark: true },
  { name: "orange", dark: false },
  { name: "red", dark: false },
  { name: "purple", dark: false },
];

// Mindmaps render all-blue (Request: one hue, varied shades). The root takes
// brand blue; branches cycle a set of distinct blue shades so sibling sections
// stay tellable apart. Every branch uses a *dark* shade (the 50-step ramp's
// 650–850, which all clear WCAG AA body text against white) so the label can
// always be white, no light fills with hard-to-read dark text. The shades
// alternate light/dark around the wheel to keep neighbouring sections distinct.
const MINDMAP_ROOT = "--ds-blue-500";
const MINDMAP_BRANCHES = [
  "--ds-blue-650",
  "--ds-blue-800",
  "--ds-blue-700",
  "--ds-blue-850",
  "--ds-blue-750",
];

function readBrand(): (token: string) => string {
  let resolved: Record<string, string> = BRAND_FALLBACKS;
  if (typeof window !== "undefined") {
    const root = getComputedStyle(document.documentElement);
    resolved = { ...BRAND_FALLBACKS };
    for (const name of Object.keys(BRAND_FALLBACKS)) {
      const value = root.getPropertyValue(name).trim();
      if (value) resolved[name] = value;
    }
  }
  return (token) => resolved[token] ?? BRAND_FALLBACKS[token];
}

function brandThemeVariables(
  isDark: boolean,
  sans: string,
): Record<string, string | boolean> {
  const c = readBrand();

  // ── Shapes, brand fills, identical in light & dark, no borders ──────────
  // The default node is brand blue. Every *BorderColor below is set equal to
  // its fill so borders never paint (adaptNodes also forces stroke-width:0).
  // `nodeText` is the theme default white; adaptNodes refines it per fill.
  const nodeFill = c("--ds-blue-500");
  const nodeText = c("--ds-white");
  const dark = c("--ds-gray-900");
  const light = c("--ds-gray-50");

  // ── Page-level structure, the only thing that follows light/dark ────────
  // Connectors, free-floating titles/signals, edge-label backdrops, and the
  // subtle subgraph/cluster surface sit ON the page, so they track it.
  const pageText = isDark ? light : dark;
  const surface = isDark ? dark : c("--ds-white");
  const line = c("--ds-gray-400"); // connectors, visible on light and dark
  const clusterFill = isDark ? c("--ds-gray-800") : c("--ds-gray-100");
  const lifeline = isDark ? c("--ds-gray-600") : c("--ds-gray-300");

  // ── Notes, brand yellow (attention), dark text, both modes ──────────────
  const noteFill = c("--ds-yellow-500");

  // ── Categorical wheel (mindmaps / pie), brand 500s, same in both modes ──
  // Mindmap sections aren't `.node`, so adaptNodes leaves them alone; set the
  // label color per hue here instead (white on the darker hues, dark on the
  // lighter ones).
  const cScale: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const hue = WHEEL[i % WHEEL.length];
    cScale[`cScale${i}`] = c(`--ds-${hue.name}-500`);
    cScale[`cScaleLabel${i}`] = hue.dark ? dark : light;
  }

  return {
    darkMode: isDark,
    background: surface,
    fontFamily: sans,
    // Controls the font-size written into the SVG's inline <style> block.
    // Without this, Mermaid inherits the container's computed size (16px from
    // the 1rem wrapper) and writes that into the SVG, overriding the fontSize
    // config which only governs text measurement.
    fontSize: "15px",

    // Nodes (flowchart / class / state / ER) + sequence actors, border = fill
    primaryColor: nodeFill,
    primaryBorderColor: nodeFill,
    primaryTextColor: nodeText,
    nodeTextColor: nodeText,

    // Secondary / tertiary, keep nodes brand blue; clusters get the surface
    secondaryColor: nodeFill,
    secondaryBorderColor: nodeFill,
    secondaryTextColor: nodeText,
    tertiaryColor: clusterFill,
    tertiaryBorderColor: clusterFill,
    tertiaryTextColor: pageText,

    // Connectors + free-floating text (titles / signals sit on the page)
    lineColor: line,
    arrowheadColor: line,
    textColor: pageText,
    titleColor: pageText,
    edgeLabelBackground: surface,

    // Notes
    noteBkgColor: noteFill,
    noteBorderColor: noteFill,
    noteTextColor: dark,

    // Sequence diagrams
    actorBkg: nodeFill,
    actorBorder: nodeFill,
    actorTextColor: nodeText,
    actorLineColor: lifeline,
    signalColor: line,
    signalTextColor: pageText,
    labelBoxBkgColor: nodeFill,
    labelBoxBorderColor: nodeFill,
    labelTextColor: nodeText,
    loopTextColor: pageText,
    activationBkgColor: nodeFill,
    activationBorderColor: nodeFill,
    sequenceNumberColor: nodeText,

    // Class diagrams
    classText: nodeText,

    // State diagrams (composite/alt backgrounds follow the cluster surface)
    compositeBackground: clusterFill,
    altBackground: clusterFill,
    compositeTitleBackground: clusterFill,
    compositeBorder: clusterFill,

    // ER diagrams, alternating attribute rows
    attributeBackgroundColorOdd: clusterFill,
    attributeBackgroundColorEven: surface,

    // Gantt charts
    sectionBkgColor: clusterFill,
    altSectionBkgColor: surface,
    sectionBkgColor2: clusterFill,
    taskBkgColor: nodeFill,
    taskBorderColor: nodeFill,
    activeTaskBkgColor: c("--ds-blue-600"),
    activeTaskBorderColor: c("--ds-blue-600"),
    gridColor: isDark ? c("--ds-gray-700") : c("--ds-gray-200"),
    doneTaskBkgColor: isDark ? c("--ds-gray-600") : c("--ds-gray-300"),
    doneTaskBorderColor: isDark ? c("--ds-gray-600") : c("--ds-gray-300"),
    critBkgColor: c("--ds-red-500"),
    critBorderColor: c("--ds-red-500"),
    todayLineColor: c("--ds-red-500"),
    taskTextColor: nodeText,
    taskTextDarkColor: dark,
    taskTextLightColor: light,
    taskTextOutsideColor: pageText,

    // Categorical scale (mindmaps / pie) + mindmap root node
    scaleLabelColor: nodeText,
    git0: nodeFill,
    gitBranchLabel0: nodeText,
    ...cScale,
  };
}

// Parse an "rgb(r, g, b)" / "rgba(...)" string to [r, g, b], or null.
function parseRgb(s: string): [number, number, number] | null {
  const m = s.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

// Hue (0–360) + saturation + lightness (0–1) from r,g,b (0–255).
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

// Map a hue onto the brand wheel. Violet + magenta/pink fold into purple (the
// nearest decorative hue, since the brand has no pink).
function hueToWheel(h: number): (typeof WHEEL)[number] {
  const name =
    h < 15 ? "red"
    : h < 45 ? "orange"
    : h < 70 ? "yellow"
    : h < 160 ? "green"
    : h < 198 ? "teal"
    : h < 258 ? "blue"
    : h < 345 ? "purple"
    : "red";
  return WHEEL.find((w) => w.name === name) ?? WHEEL[0];
}

// Snap an arbitrary fill onto the brand palette: returns the matching brand-500
// hex and whether the fill is light enough to need dark label text. Near-neutral
// or near-white/black fills return null (left as-is, e.g. cluster surfaces).
function snapToBrand(
  fill: string,
  c: (token: string) => string,
): { fill: string; name: string; dark: boolean } | null {
  const rgb = parseRgb(fill);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  if (s < 0.12 || l > 0.97 || l < 0.03) return null;
  const hue = hueToWheel(h);
  return {
    fill: c(`--ds-${hue.name}-500`),
    name: hue.name,
    dark: hue.dark,
  };
}

// After the SVG is in the DOM, make every flowchart node consistent with the
// brand system:
//   1. fill, snap to the nearest brand 500 by hue (so author pastels go bold);
//      mindmap nodes instead get an all-blue shade keyed to their section.
//   2. borders, removed from simple shapes (rect/circle/polygon/stadium); kept
//      as a subtle 600 stroke only where it conveys structure: the cylinder lip
//      (`outer-path`), inner bars (`line`), and class/state compartment
//      `divider`s (which Mermaid draws in the fill color, i.e. invisible).
//   3. label color, white, except near-black on yellow (and the two lightest
//      mindmap blues) where white is unreadable.
//   4. for labels containing an inline <code> span, grow the box so the mono
//      face (styled via CSS) isn't clipped past Mermaid's measured size.
// Runs post-render because fills can come from injected CSS classes, so
// getComputedStyle is required. Idempotent.
function adaptNodes(root: Element | null, isDark: boolean): void {
  if (!root) return;
  const c = readBrand();
  const DARK = c("--ds-gray-900");
  const LIGHT = c("--ds-white");
  const pageText = isDark ? c("--ds-gray-50") : c("--ds-gray-900");
  const pageBg = isDark ? c("--ds-gray-900") : c("--ds-white");

  // Edge labels sit on the page. Mermaid colors their text from the (white)
  // node-text variable and gives them a translucent white backdrop, invisible
  // on a light page and against our "no translucent fills" rule. Recolor the
  // text to the page foreground and make the backdrop the opaque page surface
  // (so it just masks the connector behind the text).
  root.querySelectorAll(".edgeLabel").forEach((lbl) => {
    lbl.querySelectorAll<HTMLElement>("div, span, p").forEach((el) => {
      el.style.color = pageText;
      if (el.classList.contains("labelBkg")) {
        el.style.background = pageBg;
        el.style.opacity = "1";
      }
    });
    lbl.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
      el.style.fill = pageText;
    });
  });

  root.querySelectorAll(".node").forEach((node) => {
    const shapes = node.querySelectorAll<SVGElement>(
      "rect, polygon, circle, ellipse, path",
    );
    if (shapes.length === 0) return;

    // Pick the fill + label color. Mindmaps go all-blue by section; every other
    // node snaps its fill onto the brand palette by hue.
    let fillHex: string | null = null;
    let hueName = "blue";
    let darkText = false;
    const isMindmap = node.classList.contains("mindmap-node");
    if (isMindmap) {
      const m = (node.getAttribute("class") ?? "").match(/\bsection-(\d+)\b/);
      const token = m
        ? MINDMAP_BRANCHES[Number(m[1]) % MINDMAP_BRANCHES.length]
        : MINDMAP_ROOT;
      fillHex = c(token);
      // Every mindmap shade (root 500 + dark branches) carries white text.
      darkText = false;
    } else {
      const snapped = snapToBrand(getComputedStyle(shapes[0]).fill, c);
      if (snapped) {
        fillHex = snapped.fill;
        hueName = snapped.name;
        darkText = snapped.dark;
      }
    }
    const stroke600 = c(`--ds-${hueName}-600`);

    shapes.forEach((shape) => {
      if (fillHex) shape.style.setProperty("fill", fillHex, "important");
      // Keep a subtle 600 stroke only on shapes whose structure lives in the
      // outline (the cylinder lip / other `outer-path` shapes). Simple shapes
      // get no border, their fill already shows the silhouette.
      if (shape.classList.contains("outer-path")) {
        shape.style.setProperty("stroke", stroke600, "important");
        shape.style.setProperty("stroke-width", "1.5px", "important");
      } else {
        shape.style.setProperty("stroke", "none", "important");
        shape.style.setProperty("stroke-width", "0", "important");
      }
    });

    // Inner `<line>` bars vary by diagram. Mindmap's default node appends a
    // full-width `node-line-` rule under the label, an underline that fights
    // the clean filled-pill look, so hide it. Elsewhere (e.g. subroutine side
    // rules) the line conveys structure, so keep it as a subtle 600 stroke.
    node.querySelectorAll<SVGElement>("line").forEach((ln) => {
      if (isMindmap) {
        ln.style.setProperty("stroke", "none", "important");
        ln.style.setProperty("stroke-width", "0", "important");
      } else {
        ln.style.setProperty("stroke", stroke600, "important");
        ln.style.setProperty("stroke-width", "1.5px", "important");
      }
    });

    const textColor = fillHex ? (darkText ? DARK : LIGHT) : null;
    // Inline <code> spans are styled in mono by mermaid.module.css; the label
    // color still needs syncing (white on the brand fill) and inherits down to
    // the <code> child. `hasCode` also drives the box-grow safety net below.
    const hasCode = node.querySelector("foreignObject code") != null;
    const htmlLabels = node.querySelectorAll<HTMLElement>(
      "foreignObject div, foreignObject span, foreignObject p",
    );
    htmlLabels.forEach((el) => {
      if (textColor) el.style.color = textColor;
    });
    node.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
      if (textColor) el.style.fill = textColor;
    });

    // Mermaid measures a <code> span in the browser's default monospace; our mono
    // face (JetBrains Mono) can be marginally wider, so the label may overflow and
    // clip. Grow the box to fit at full size, re-centering the shape and label so
    // the node stays put (edges connect at the center, so they stay aligned).
    // Falls back to shrinking the label if the shape isn't a simple rect.
    if (hasCode) {
      const fo = node.querySelector<SVGForeignObjectElement>("foreignObject");
      const content = fo?.firstElementChild as HTMLElement | null;
      const rect = node.querySelector<SVGRectElement>("rect");
      const labelG = node.querySelector<SVGGElement>("g.label");
      if (fo && content) {
        const dw = Math.max(0, content.scrollWidth - fo.width.baseVal.value);
        const dh = Math.max(0, content.scrollHeight - fo.height.baseVal.value);
        const gw = dw > 0 ? dw + 2 : 0;
        const gh = dh > 0 ? dh + 2 : 0;
        if ((gw > 0 || gh > 0) && rect && labelG) {
          fo.width.baseVal.value += gw;
          fo.height.baseVal.value += gh;
          rect.x.baseVal.value -= gw / 2;
          rect.y.baseVal.value -= gh / 2;
          rect.width.baseVal.value += gw;
          rect.height.baseVal.value += gh;
          const t = labelG.transform.baseVal.consolidate();
          if (t) t.setTranslate(t.matrix.e - gw / 2, t.matrix.f - gh / 2);
        } else if (gw > 0 || gh > 0) {
          const scale = Math.min(
            gh > 0 ? fo.height.baseVal.value / content.scrollHeight : 1,
            gw > 0 ? fo.width.baseVal.value / content.scrollWidth : 1,
          );
          htmlLabels.forEach((el) => {
            el.style.fontSize = `${Math.floor(scale * 100)}%`;
          });
        }
      }
    }
  });

  // Class / state compartment dividers: Mermaid strokes them in the node's
  // (now brand-500) fill color, i.e. invisible. Recolor to the box's 600 shade
  // so the attribute/method sections read.
  root.querySelectorAll<SVGElement>(".divider").forEach((d) => {
    const host = d.closest(".node");
    const shape = host?.querySelector("rect, polygon, circle, ellipse, path");
    const snapped = shape && snapToBrand(getComputedStyle(shape).fill, c);
    const col = c(`--ds-${snapped?.name ?? "blue"}-600`);
    d.style.setProperty("stroke", col, "important");
    d.querySelectorAll<SVGElement>("line, path, rect").forEach((e) => {
      e.style.setProperty("stroke", col, "important");
      e.style.setProperty("stroke-width", "1px", "important");
    });
  });

  // Mindmap edges are colored per branch; recolor to match the all-blue nodes
  // (the `section-edge-N` index maps to the same branch shade).
  root.querySelectorAll<SVGElement>('[class*="section-edge-"]').forEach((e) => {
    const m = (e.getAttribute("class") ?? "").match(/section-edge-(\d+)/);
    if (!m) return;
    const token = MINDMAP_BRANCHES[Number(m[1]) % MINDMAP_BRANCHES.length];
    e.style.setProperty("stroke", c(token), "important");
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Put the mono face back on the code spans of a diagram whose labels are SVG
 * text (see SVG_TEXT_LABELS), by splitting each rendered text node into
 * `<tspan>`s and marking the runs the author wrapped in `<code>`.
 *
 * A `<tspan>` with no `x` of its own continues the text chunk it sits in, so
 * the runs stay on one line and a `text-anchor: middle` label stays centered
 * on the same point it was centered on before, which is what keeps a message
 * over its arrow and an actor's name inside its box.
 *
 * Mermaid measured the label in the sans face, so a code run is painted a
 * little wider than the width the layout reserved for it (JetBrains Mono's
 * advance is roughly a sixth wider than Inter's at the same size). Sequence
 * diagrams absorb that on their own: an actor box is at least 150px wide
 * against names that measure well under 100, and a message label is
 * free-floating text centered over its arrow, so the growth is split evenly to
 * either side rather than pushing anything. What it can do is push a label
 * past the edge of the SVG, which is a hard clip, so `growToFitText` widens
 * the viewport afterwards. Nothing here moves a shape, for the same reason
 * `adaptNodes` does not: the layout is Mermaid's and re-deriving it from the
 * outside goes wrong in more ways than it fixes.
 *
 * Idempotent: a run split by an earlier pass is already inside a marked
 * `<tspan>`, and those are skipped.
 */
function applyCodeFont(root: Element | null, spans: readonly string[]): void {
  if (!root || spans.length === 0) return;
  const doc = root.ownerDocument;
  let split = false;

  // Longest first, so `println("Hello, Java!")` claims its characters before a
  // shorter span that happens to sit inside it.
  const wanted = [...new Set(spans)].sort((a, b) => b.length - a.length);

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  for (const node of texts) {
    const text = node.nodeValue ?? "";
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    // An HTML label already carries the author's real <code> element, which the
    // stylesheet handles; only SVG text needs splitting.
    if (parent.closest("foreignObject")) continue;
    if (styles.codeSpan && parent.closest(`.${styles.codeSpan}`)) continue;

    const claimed: Array<[number, number]> = [];
    for (const span of wanted) {
      for (let at = text.indexOf(span); at !== -1; at = text.indexOf(span, at + span.length)) {
        const end = at + span.length;
        if (claimed.some(([from, to]) => at < to && from < end)) continue;
        claimed.push([at, end]);
      }
    }
    if (claimed.length === 0) continue;
    claimed.sort((a, b) => a[0] - b[0]);

    const rebuilt = doc.createDocumentFragment();
    let cursor = 0;
    for (const [from, to] of claimed) {
      if (from > cursor) rebuilt.appendChild(doc.createTextNode(text.slice(cursor, from)));
      const run = doc.createElementNS(SVG_NS, "tspan");
      run.setAttribute("class", styles.codeSpan);
      run.textContent = text.slice(from, to);
      rebuilt.appendChild(run);
      cursor = to;
    }
    if (cursor < text.length) rebuilt.appendChild(doc.createTextNode(text.slice(cursor)));
    node.replaceWith(rebuilt);
    split = true;
  }

  if (split) growToFitText(root);
}

/**
 * Widen the SVG's viewport until every label fits inside it.
 *
 * An SVG clips at its viewport, so a label that Mermaid sized in the sans face
 * and `applyCodeFont` then repainted wider can lose its last characters. The
 * gantt chart on `from-zero-to-cpp/memory-model` is the one in the lessons
 * that does: `global_counter` runs 6px past the left edge.
 *
 * The `max-width` cap Mermaid writes inline grows by the same number of user
 * units as the viewBox, so the diagram keeps its scale and only the frame
 * around it gets bigger.
 */
function growToFitText(root: Element): void {
  root.querySelectorAll("svg").forEach((svg) => {
    const box = svg.viewBox.baseVal;
    if (!box || box.width <= 0) return;

    let left = box.x;
    let right = box.x + box.width;
    svg.querySelectorAll<SVGGraphicsElement>("text").forEach((text) => {
      const bounds = text.getBBox();
      if (bounds.width <= 0) return;
      left = Math.min(left, bounds.x);
      right = Math.max(right, bounds.x + bounds.width);
    });

    const grown = right - left;
    const extra = grown - box.width;
    if (extra <= 0.5) return;

    const capped = Number.parseFloat(svg.style.maxWidth);
    box.x = left;
    box.width = grown;
    if (Number.isFinite(capped)) svg.style.maxWidth = `${capped + extra}px`;
  });
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  // Mermaid is loaded from jsDelivr on demand (see MERMAID_CDN in runtime/cdn)
  // so it stays out of the client bundle and the OpenNext Worker bundle, like
  // the other heavy runtimes. It lazy-loads its per-diagram chunks from the
  // same CDN base at render time.
  const { default: mermaid } = use(
    cachePromise(
      "mermaid",
      () => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ MERMAID_CDN),
    ),
  );

  const stacks = resolvedStacks();

  // Diagrams whose labels are SVG text cannot carry the author's <code> tag
  // through Mermaid, so it comes out before the render and the mono face goes
  // back on afterwards (see SVG_TEXT_LABELS / applyCodeFont). Memoised because
  // `codeSpans` is a dependency of the fullscreen stage's callback ref, which
  // re-injects the SVG whenever it changes identity.
  const { chart: renderedChart, spans: codeSpans } = useMemo(
    () =>
      hasSvgTextLabels(chart)
        ? stripCodeTags(chart)
        : { chart, spans: [] as string[] },
    [chart],
  );

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    fontFamily: stacks.sans,
    fontSize: 15,
    themeCSS: "margin: 1.5rem auto 0;",
    // Drive diagram colors from the DataSlope brand palette (app/brand.css) via
    // the customizable "base" theme. Shapes use brand fills (same in light and
    // dark); adaptNodes snaps author pastels onto the palette, removes borders,
    // and sets per-fill label colors. Replaces Mermaid's stock themes.
    theme: "base",
    themeVariables: brandThemeVariables(resolvedTheme === "dark", stacks.sans),
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, async () => {
      // Explicitly request the sans (Inter) and mono (JetBrains Mono) faces at
      // the weights/size Mermaid measures with, before rendering. `document.
      // fonts.ready` is insufficient because font-display:swap fonts may not be
      // in the "ready" set until explicitly triggered. `fonts.load()` guarantees
      // the face is available (or settles with a no-op if it can't load) first.
      // next/font registers the faces under names of its choosing (hashed or
      // suffixed with a generated fallback, depending on the bundler), so
      // resolve the actual family lists from the variables it publishes on
      // <html> rather than hardcoding "Inter"/"JetBrains Mono".
      //
      // Only the *first* family of each variable is requested. next/font
      // publishes the real face followed by a metric-adjusted local fallback
      // ("JetBrains Mono", "JetBrains Mono Fallback"), and `fonts.load()` on
      // the pair settles as soon as either matches, which is immediately: the
      // fallback is a local face and needs no fetch. Asking for the head of
      // the list is what makes this actually wait for the webfont.
      const rootStyle = getComputedStyle(document.documentElement);
      await Promise.allSettled(
        ["--font-sans", "--font-mono"].flatMap((variable) => {
          const family = rootStyle.getPropertyValue(variable).split(",")[0].trim();
          if (!family) return [];
          return [400, 500, 700].map((weight) =>
            document.fonts.load(`${weight} 15px ${family}`),
          );
        }),
      );
      const prefix = isCodeDiagram(chart) ? monoDirective(stacks.mono) : "";
      return mermaid.render(id, prefix + renderedChart.replaceAll("\\n", "\n"));
    }),
  );

  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.diagram}
        ref={(container) => {
          if (container) {
            bindFunctions?.(container);
            adaptNodes(container, resolvedTheme === "dark");
            applyCodeFont(container, codeSpans);
          }
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        type="button"
        className={styles.expandBtn}
        title="Expand to full page"
        aria-label="Expand diagram to full page"
        onClick={() => setFullscreen(true)}
      >
        <Maximize2 size={14} strokeWidth={2} aria-hidden />
      </button>
      {fullscreen && (
        <MermaidFullscreen
          svg={svg}
          isDark={resolvedTheme === "dark"}
          codeSpans={codeSpans}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

// ─── Full-screen modal with zoom + pan ────────────────────────────────────

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function MermaidFullscreen({
  svg,
  isDark,
  codeSpans,
  onClose,
}: {
  svg: string;
  isDark: boolean;
  codeSpans: readonly string[];
  onClose: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Callback ref for the SVG host. We inject the markup imperatively here
  // (rather than via `dangerouslySetInnerHTML`) and adapt it in the same pass.
  // Why not dangerouslySetInnerHTML: React owns that subtree, and under
  // StrictMode's double commit it re-asserts the *raw* multi-hue SVG over our
  // adapted nodes after this ref has run, without re-firing the ref, so the
  // fullscreen copy reverts to Mermaid's default palette. Setting innerHTML
  // ourselves keeps the subtree outside React's reconciler, so the brand
  // snapping/borderless/white-label treatment sticks. `useCallback` keyed on
  // [svg, isDark] re-runs it only when the diagram or theme actually changes,
  // not on every pan/zoom frame.
  const stageRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      stageRef.current = node;
      if (!node) return;
      node.innerHTML = svg;
      adaptNodes(node, isDark);
      applyCodeFont(node, codeSpans);
    },
    [svg, isDark, codeSpans],
  );

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);

  // Fit the rendered SVG inside the viewport. Called on open and on
  // reset, and from the toolbar reset button. Uses the cached natural
  // dimensions captured on first mount so the function is independent
  // of the current scale (and therefore doesn't get invalidated every
  // time we zoom).
  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const natural = naturalSizeRef.current;
    if (!viewport || !natural) return;
    const { w: naturalW, h: naturalH } = natural;
    if (naturalW <= 0 || naturalH <= 0) return;
    const pad = 64;
    const vw = viewport.clientWidth - pad;
    const vh = viewport.clientHeight - pad;
    const next = clamp(
      Math.min(vw / naturalW, vh / naturalH),
      ZOOM_MIN,
      ZOOM_MAX,
    );
    setScale(next);
    setTx((viewport.clientWidth - naturalW * next) / 2);
    setTy((viewport.clientHeight - naturalH * next) / 2);
  }, []);

  // One-shot initial fit. Use a rAF so the SVG is in the DOM with
  // measurable dimensions before we compute the transform. Captures
  // the SVG's natural pixel dimensions while scale is still 1 so any
  // later `fit()` calls can divide cleanly.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const stage = stageRef.current;
      if (!viewport || !stage) return;
      const svgEl = stage.querySelector("svg");
      if (!svgEl) return;
      // Brand snapping / borderless / label treatment is applied by the stage
      // callback ref (`stageRef` below) when the SVG mounts, so by the time
      // this fit runs the measured size already reflects the adapted nodes.
      const bbox = svgEl.getBoundingClientRect();
      const naturalW = bbox.width;
      const naturalH = bbox.height;
      if (naturalW <= 0 || naturalH <= 0) return;
      naturalSizeRef.current = { w: naturalW, h: naturalH };
      const pad = 64;
      const vw = viewport.clientWidth - pad;
      const vh = viewport.clientHeight - pad;
      const next = clamp(
        Math.min(vw / naturalW, vh / naturalH),
        ZOOM_MIN,
        ZOOM_MAX,
      );
      setScale(next);
      setTx((viewport.clientWidth - naturalW * next) / 2);
      setTy((viewport.clientHeight - naturalH * next) / 2);
    });
    return () => cancelAnimationFrame(raf);
  }, [isDark]);

  // Apply zoom by resizing the SVG's intrinsic dimensions rather than a
  // CSS `transform: scale()`. A scaled transform on a composited layer
  // gets rasterized once at 1× and GPU-upscaled, which blurs text and
  // shapes; setting width/height re-renders the vector crisply at every
  // zoom level. The transform is left to pure translation for panning.
  //
  // Runs after every commit (not just on scale change) and via a layout
  // effect so the size is reasserted before paint, pan re-renders must
  // never leave the SVG at its natural size while `scale` says otherwise.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const natural = naturalSizeRef.current;
    if (!stage || !natural) return;
    const svgEl = stage.querySelector("svg");
    if (!svgEl) return;
    svgEl.style.width = `${natural.w * scale}px`;
    svgEl.style.height = `${natural.h * scale}px`;
  });

  // Lock background scroll while the modal is open, and wire Esc-close.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Zoom around the cursor: keep the world-point under the pointer
  // stationary across the scale change. Without this the diagram drifts
  // off-screen when the user wheel-zooms, which feels broken.
  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      setScale((prevScale) => {
        const next = clamp(prevScale * factor, ZOOM_MIN, ZOOM_MAX);
        const ratio = next / prevScale;
        setTx((prevTx) => px - (px - prevTx) * ratio);
        setTy((prevTy) => py - (py - prevTy) * ratio);
        return next;
      });
    },
    [],
  );

  const zoomFromCenter = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [zoomAt],
  );

  // Wheel zoom. Attach via ref + addEventListener so we can pass
  // `passive: false`, React's onWheel is passive by default in newer
  // versions and would warn on preventDefault.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(e.clientX, e.clientY, factor);
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Pointer-driven pan. setPointerCapture keeps deltas flowing even
  // when the cursor leaves the modal bounds mid-drag.
  const dragStateRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    dragStateRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const dx = e.clientX - state.x;
    const dy = e.clientY - state.y;
    state.x = e.clientX;
    state.y = e.clientY;
    setTx((prev) => prev + dx);
    setTy((prev) => prev + dy);
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
    dragStateRef.current = null;
    setDragging(false);
  }, []);

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Mermaid diagram (full page)"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.closeBtn}
          title="Close (Esc)"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
        <div className={styles.toolbar} role="toolbar" aria-label="Zoom controls">
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => zoomFromCenter(1 / ZOOM_STEP)}
            disabled={scale <= ZOOM_MIN + 1e-3}
          >
            <Minus size={16} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => zoomFromCenter(ZOOM_STEP)}
            disabled={scale >= ZOOM_MAX - 1e-3}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
          </button>
          <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
          <span className={styles.toolbarSep} aria-hidden />
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Reset / fit"
            aria-label="Reset zoom and recenter"
            onClick={fit}
          >
            <RotateCcw size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div
          ref={viewportRef}
          className={`${styles.viewport}${dragging ? ` ${styles.dragging}` : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className={styles.stage}
            style={{
              transform: `translate(${tx}px, ${ty}px)`,
            }}
          >
            {/* Markup is injected + adapted imperatively by stageRefCallback;
                no dangerouslySetInnerHTML so React can't revert the styling. */}
            <div className={styles.diagram} ref={stageRefCallback} />
          </div>
        </div>
      </div>
    </div>
  );
}

