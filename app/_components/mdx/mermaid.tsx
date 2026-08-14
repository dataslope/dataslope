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
  // Mermaid lays `timeline` out horizontally and scales wide charts down until
  // unreadable; render those with the vertical <Timeline> instead.
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
// Diagrams are themed from app/brand.css: shape fills are brand 500s, identical
// in light and dark, borderless; only page-level structure (connectors, titles,
// edge-label backdrops, subgraph surface) follows the light/dark page.
// `adaptNodes` snaps author pastel fills onto the brand 500s post-render.
// Mermaid needs concrete colors (khroma color math), so brand tokens resolve to
// hex at render time; BRAND_FALLBACKS is generated from brand.css by
// scripts/build-brand-fallbacks.mjs.

// The literal fallback stacks keep text measurement correct if a CSS var is
// ever missing (e.g. server rendering / tests).
const SANS =
  'var(--font-sans), Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO =
  'var(--font-mono), "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * The same stacks with `var(--font-*)` resolved to family names. Mermaid both
 * measures labels with `fontFamily` and writes it into the SVG's <style>; a
 * `var()` is invalid when measurement happens off-document, so measurement
 * silently falls back to a proportional face and boxes get mis-sized. Resolving
 * here makes measure and paint agree whether or not the SVG is attached.
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

// Class and ER diagrams are entirely code, so they render wholesale in mono.
// Other types stay sans and tag individual code spans with <code>.
function isCodeDiagram(chart: string): boolean {
  return /^(classDiagram(?:-v2)?|erDiagram)\b/.test(diagramKeyword(chart));
}

/**
 * Diagram kinds whose labels Mermaid paints as SVG `<text>` (via d3 `.text()`)
 * rather than HTML in a `<foreignObject>` — an author's `<code>` tag would come
 * out as literal characters. For these, `stripCodeTags` removes the tags before
 * render and `applyCodeFont` puts the mono face back afterwards.
 */
const SVG_TEXT_LABELS =
  /^(sequenceDiagram|pie\b|gantt|journey|quadrantChart|xychart|sankey|gitGraph)/;

function hasSvgTextLabels(chart: string): boolean {
  return SVG_TEXT_LABELS.test(diagramKeyword(chart));
}

/**
 * Remove `<code>` markers from a chart, returning the plain chart plus the
 * marked span texts. Spans are matched back by value, not position: Mermaid
 * rewrites labels (splits on `<br/>`, wraps, drops aliases) and the output
 * carries no index to match on.
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

// Init directive switching a single diagram to the mono face; merges over the
// global brand theme, so only the font changes.
const monoDirective = (mono: string) =>
  `%%{init: ${JSON.stringify({
    fontFamily: mono,
    themeVariables: { fontFamily: mono },
  })}}%%\n`;

// The seven-hue brand wheel (app/brand.css §1.1) for categorical diagrams and
// fill snapping. `dark` marks hues needing near-black label text (only yellow:
// white on yellow-500 is unreadable).
const WHEEL: ReadonlyArray<{ name: string; dark: boolean }> = [
  { name: "blue", dark: false },
  { name: "teal", dark: false },
  { name: "green", dark: false },
  { name: "yellow", dark: true },
  { name: "orange", dark: false },
  { name: "red", dark: false },
  { name: "purple", dark: false },
];

// Mindmaps render all-blue: root brand blue-500, branches cycle dark blue
// shades (650–850, all WCAG AA against white) so labels can always be white;
// the order alternates to keep neighbouring sections distinct.
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

  // Shapes: brand fills, identical in light & dark. Every *BorderColor below
  // equals its fill so borders never paint; adaptNodes refines text per fill.
  const nodeFill = c("--ds-blue-500");
  const nodeText = c("--ds-white");
  const dark = c("--ds-gray-900");
  const light = c("--ds-gray-50");

  // Page-level structure (connectors, titles, edge-label backdrops, cluster
  // surface) is the only thing that follows light/dark.
  const pageText = isDark ? light : dark;
  const surface = isDark ? dark : c("--ds-white");
  const line = c("--ds-gray-400"); // connectors, visible on light and dark
  const clusterFill = isDark ? c("--ds-gray-800") : c("--ds-gray-100");
  const lifeline = isDark ? c("--ds-gray-600") : c("--ds-gray-300");

  // Notes: brand yellow, dark text, both modes.
  const noteFill = c("--ds-yellow-500");

  // Categorical wheel (mindmaps / pie), brand 500s. Mindmap sections aren't
  // `.node`, so adaptNodes leaves them alone; set label color per hue here.
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
    // Written into the SVG's inline <style>; without it Mermaid inherits the
    // container's 16px, overriding the fontSize config (measurement-only).
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

// Post-render pass: snap node fills to brand 500s (mindmaps all-blue by
// section), strip borders except structural strokes, set per-fill label color,
// and grow boxes whose <code> label overflows. Must run post-render because
// fills can come from injected CSS classes (getComputedStyle). Idempotent.
function adaptNodes(root: Element | null, isDark: boolean): void {
  if (!root) return;
  const c = readBrand();
  const DARK = c("--ds-gray-900");
  const LIGHT = c("--ds-white");
  const pageText = isDark ? c("--ds-gray-50") : c("--ds-gray-900");
  const pageBg = isDark ? c("--ds-gray-900") : c("--ds-white");

  // Mermaid gives edge labels white text and a translucent white backdrop,
  // invisible on a light page; recolor to page foreground / opaque page surface.
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

    // Mindmaps go all-blue by section; other nodes snap fill by hue.
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
      // Every mindmap shade carries white text.
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
      // Keep a subtle 600 stroke only where structure lives in the outline
      // (`outer-path`, e.g. the cylinder lip); simple shapes get no border.
      if (shape.classList.contains("outer-path")) {
        shape.style.setProperty("stroke", stroke600, "important");
        shape.style.setProperty("stroke-width", "1.5px", "important");
      } else {
        shape.style.setProperty("stroke", "none", "important");
        shape.style.setProperty("stroke-width", "0", "important");
      }
    });

    // Hide the mindmap node's full-width underline (fights the filled-pill
    // look); elsewhere (e.g. subroutine side rules) the line conveys structure,
    // so keep it as a subtle 600 stroke.
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

    // Mermaid measures <code> in the default monospace; JetBrains Mono can be
    // wider, so grow the box to fit, re-centering shape and label (edges connect
    // at the center). Falls back to shrinking the label for non-rect shapes.
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

  // Compartment dividers are stroked in the node's fill color (invisible);
  // recolor to the box's 600 shade.
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

  // Recolor mindmap edges to match the all-blue nodes of their section.
  root.querySelectorAll<SVGElement>('[class*="section-edge-"]').forEach((e) => {
    const m = (e.getAttribute("class") ?? "").match(/section-edge-(\d+)/);
    if (!m) return;
    const token = MINDMAP_BRANCHES[Number(m[1]) % MINDMAP_BRANCHES.length];
    e.style.setProperty("stroke", c(token), "important");
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Put the mono face back on code spans of an SVG-text diagram (see
 * SVG_TEXT_LABELS) by splitting rendered text nodes into marked `<tspan>`s.
 * A `<tspan>` without its own `x` continues the text chunk, so runs stay on one
 * line and centered labels stay centered. Mono paints wider than the sans face
 * Mermaid measured with, which can clip at the SVG edge — `growToFitText`
 * widens the viewport afterwards. Idempotent (already-marked tspans skipped).
 */
function applyCodeFont(root: Element | null, spans: readonly string[]): void {
  if (!root || spans.length === 0) return;
  const doc = root.ownerDocument;
  let split = false;

  // Longest first, so a span claims its characters before a shorter span that
  // sits inside it.
  const wanted = [...new Set(spans)].sort((a, b) => b.length - a.length);

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  for (const node of texts) {
    const text = node.nodeValue ?? "";
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    // HTML labels keep the real <code> element; only SVG text needs splitting.
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
 * Widen the SVG's viewport until every label fits (labels repainted wider by
 * applyCodeFont can clip at the edge). Mermaid's inline `max-width` cap grows
 * by the same user units as the viewBox, so the diagram keeps its scale.
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
  // Loaded from jsDelivr on demand (see MERMAID_CDN) to stay out of the client
  // and OpenNext Worker bundles.
  const { default: mermaid } = use(
    cachePromise(
      "mermaid",
      () => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ MERMAID_CDN),
    ),
  );

  const stacks = resolvedStacks();

  // Strip <code> tags for SVG-text diagrams (see SVG_TEXT_LABELS). Memoised
  // because `codeSpans` is a dep of the fullscreen stage's callback ref, which
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
    // Brand palette via the customizable "base" theme (see brandThemeVariables).
    theme: "base",
    themeVariables: brandThemeVariables(resolvedTheme === "dark", stacks.sans),
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, async () => {
      // Load the faces Mermaid measures with before rendering. `fonts.ready` is
      // insufficient for font-display:swap fonts; `fonts.load()` guarantees the
      // face (or settles as a no-op). Family names come from the next/font vars
      // on <html>, not hardcoded names. Only the FIRST family per var is
      // requested: next/font appends a local metric fallback, and `load()` on
      // the pair settles immediately via the fallback instead of waiting for
      // the webfont.
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

  // Inject the SVG imperatively, not via dangerouslySetInnerHTML: under
  // StrictMode's double commit React re-asserts the raw SVG over the adapted
  // nodes without re-firing the ref. innerHTML keeps the subtree outside the
  // reconciler so the brand treatment sticks.
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

  // Fit the SVG inside the viewport. Uses the cached natural dimensions so it
  // is independent of current scale (not invalidated on zoom).
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

  // One-shot initial fit; rAF so the SVG is measurable first. Captures the
  // natural dimensions while scale is still 1 for later fit() calls.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const stage = stageRef.current;
      if (!viewport || !stage) return;
      const svgEl = stage.querySelector("svg");
      if (!svgEl) return;
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

  // Zoom by resizing the SVG's intrinsic dimensions, not CSS scale(): a scaled
  // composited layer is rasterized at 1× and GPU-upscaled, which blurs.
  // Layout effect on every commit so pan re-renders never leave the SVG at its
  // natural size while `scale` says otherwise.
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

  // Zoom around the cursor: keep the world-point under the pointer stationary
  // across the scale change.
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

  // Wheel zoom. addEventListener so we can pass `passive: false` — React's
  // onWheel is passive and would warn on preventDefault.
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

  // Pointer-driven pan; setPointerCapture keeps deltas flowing when the cursor
  // leaves the modal mid-drag.
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
            {/* Injected imperatively by stageRefCallback so React can't revert
                the adapted styling. */}
            <div className={styles.diagram} ref={stageRefCallback} />
          </div>
        </div>
      </div>
    </div>
  );
}

