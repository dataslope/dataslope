"use client";

import {
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import styles from "./mermaid.module.css";
import { Timeline } from "./timeline";

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
// Diagrams are themed from the brand color system (app/brand.css) via Mermaid's
// customizable "base" theme — a LIGHT theme in light mode and a DARK theme in
// dark mode, so each matches the surrounding page (no white card on a dark
// page).
//
// The wrinkle: ~200 MDX diagrams hand-color nodes with `classDef` using light
// pastel fills and *no* text color (e.g. `classDef bad fill:#fee2e2`). Mermaid
// has one global node-text color, so in a dark theme (light text) those author
// nodes would be light-on-light. We fix that after render with
// `adaptNodeLabels`, which sets each node's label color from its *own* fill
// luminance — dark text on light fills, light text on dark fills — so author
// pastels stay legible while our default nodes go properly dark.
//
// Mermaid runs color math (khroma) over theme values and needs concrete colors,
// so we resolve the brand tokens to hex at render time (brand.css stays the
// source of truth) with literal fallbacks.
const BRAND_FALLBACKS: Record<string, string> = {
  "--ds-blue-50": "#E8F2FF",
  "--ds-blue-100": "#D1E6FF",
  "--ds-blue-200": "#AED3FF",
  "--ds-blue-300": "#8ABFFF",
  "--ds-blue-800": "#00519C",
  "--ds-teal-200": "#AAE0DD",
  "--ds-teal-800": "#006361",
  "--ds-green-200": "#B4EAAF",
  "--ds-green-800": "#006F01",
  "--ds-red-200": "#FFC2BF",
  "--ds-red-500": "#FF4F59",
  "--ds-red-600": "#DC3F49",
  "--ds-red-800": "#99212C",
  "--ds-yellow-100": "#FDF5D9",
  "--ds-yellow-200": "#FEF0C3",
  "--ds-yellow-600": "#D4B651",
  "--ds-yellow-800": "#836D1C",
  "--ds-orange-200": "#F6CAAD",
  "--ds-orange-800": "#844200",
  "--ds-purple-200": "#DBCAFC",
  "--ds-purple-800": "#634094",
  "--ds-gray-50": "#F9FAFB",
  "--ds-gray-200": "#E5E7EB",
  "--ds-gray-300": "#D1D5DB",
  "--ds-gray-400": "#9CA3AF",
  "--ds-gray-500": "#6B7280",
  "--ds-gray-600": "#4B5563",
  "--ds-gray-700": "#374151",
  "--ds-gray-800": "#1F2937",
  "--ds-gray-900": "#111827",
  "--ds-white": "#FFFFFF",
};

function readBrand(): (token: keyof typeof BRAND_FALLBACKS) => string {
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

function brandThemeVariables(isDark: boolean): Record<string, string | boolean> {
  const c = readBrand();

  // Surfaces & text, keyed by mode. Light: soft tints on white. Dark: layered
  // slate (page < cluster < node) with light text. `nodeText` is the theme
  // default; adaptNodeLabels overrides it per node from the node's own fill.
  const nodeFill = isDark ? c("--ds-gray-700") : c("--ds-blue-100");
  const nodeEdge = isDark ? c("--ds-gray-600") : c("--ds-blue-300");
  const nodeText = isDark ? c("--ds-gray-50") : c("--ds-gray-900");
  const clusterFill = isDark ? c("--ds-gray-800") : c("--ds-gray-50");
  const clusterEdge = isDark ? c("--ds-gray-700") : c("--ds-gray-200");
  const pageText = isDark ? c("--ds-gray-50") : c("--ds-gray-900"); // free-floating
  const surface = isDark ? c("--ds-gray-900") : c("--ds-white");
  const line = c("--ds-gray-400"); // connectors — visible on light and dark
  const lifeline = isDark ? c("--ds-gray-500") : c("--ds-gray-300");
  const edgeLabelBg = isDark ? c("--ds-gray-900") : c("--ds-white");
  const accentFill = isDark ? c("--ds-gray-600") : c("--ds-blue-100");

  // Notes — bright sticky in light; muted slate with a yellow edge in dark.
  const noteFill = isDark ? c("--ds-gray-700") : c("--ds-yellow-100");
  const noteEdge = isDark ? c("--ds-yellow-600") : c("--ds-yellow-200");

  // Categorical wheel (mindmaps): light = soft -200 + dark labels; dark = deep
  // -800 + light labels. (Mermaid re-applies overrides after derivation, so
  // these reach the SVG verbatim; mindmap sections aren't `.node`, so
  // adaptNodeLabels leaves them alone.)
  const step = isDark ? "800" : "200";
  const wheel = ["blue", "teal", "green", "yellow", "orange", "red", "purple"];
  const cScale: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    cScale[`cScale${i}`] = c(
      `--ds-${wheel[i % wheel.length]}-${step}` as keyof typeof BRAND_FALLBACKS,
    );
  }

  return {
    darkMode: isDark,
    background: surface,
    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
    // Controls the font-size written into the SVG's inline <style> block.
    // Without this, Mermaid inherits the container's computed size (16px from
    // the 1rem wrapper) and writes that into the SVG, overriding the fontSize
    // config which only governs text measurement.
    fontSize: "15px",

    // Nodes (flowchart / class / state / ER) + sequence actors
    primaryColor: nodeFill,
    primaryBorderColor: nodeEdge,
    primaryTextColor: nodeText,
    nodeTextColor: nodeText,

    // Secondary / tertiary — clusters/subgraphs + gentle accents
    secondaryColor: accentFill,
    secondaryBorderColor: nodeEdge,
    secondaryTextColor: nodeText,
    tertiaryColor: clusterFill,
    tertiaryBorderColor: clusterEdge,
    tertiaryTextColor: nodeText,

    // Connectors + free-floating text (titles / signals sit on the page)
    lineColor: line,
    arrowheadColor: line,
    textColor: pageText,
    titleColor: pageText,
    edgeLabelBackground: edgeLabelBg,

    // Notes
    noteBkgColor: noteFill,
    noteBorderColor: noteEdge,
    noteTextColor: nodeText,

    // Sequence diagrams
    actorBkg: nodeFill,
    actorBorder: nodeEdge,
    actorTextColor: nodeText,
    actorLineColor: lifeline,
    signalColor: line,
    signalTextColor: pageText,
    labelBoxBkgColor: nodeFill,
    labelBoxBorderColor: nodeEdge,
    labelTextColor: nodeText,
    loopTextColor: pageText,
    activationBkgColor: accentFill,
    activationBorderColor: nodeEdge,
    sequenceNumberColor: isDark ? c("--ds-gray-900") : c("--ds-white"),

    // Class diagrams
    classText: nodeText,

    // State diagrams (composite/alt backgrounds follow the cluster surface)
    compositeBackground: clusterFill,
    altBackground: clusterFill,
    compositeTitleBackground: nodeFill,
    compositeBorder: nodeEdge,

    // ER diagrams — alternating attribute rows
    attributeBackgroundColorOdd: clusterFill,
    attributeBackgroundColorEven: surface,

    // Gantt charts
    sectionBkgColor: clusterFill,
    altSectionBkgColor: surface,
    sectionBkgColor2: isDark ? c("--ds-gray-700") : c("--ds-blue-50"),
    taskBkgColor: nodeFill,
    taskBorderColor: nodeEdge,
    activeTaskBkgColor: isDark ? c("--ds-gray-600") : c("--ds-blue-200"),
    activeTaskBorderColor: nodeEdge,
    gridColor: clusterEdge,
    doneTaskBkgColor: isDark ? c("--ds-gray-700") : c("--ds-gray-300"),
    doneTaskBorderColor: c("--ds-gray-500"),
    critBkgColor: isDark ? c("--ds-red-800") : c("--ds-red-200"),
    critBorderColor: c("--ds-red-600"),
    todayLineColor: c("--ds-red-500"),
    taskTextColor: nodeText,
    taskTextDarkColor: c("--ds-gray-900"),
    taskTextLightColor: c("--ds-gray-50"),
    taskTextOutsideColor: pageText,

    // Categorical scale (mindmaps / pie) + mindmap root node
    scaleLabelColor: nodeText,
    git0: nodeFill,
    gitBranchLabel0: nodeText,
    ...cScale,
  };
}

// Relative luminance (WCAG) of an "rgb(r, g, b)" string, or null if unparseable.
function rgbLuminance(rgb: string): number | null {
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((n) => {
    const v = Number(n) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Set each flowchart node's label color from its own fill luminance, so author
// `classDef` pastel fills (which carry no text color) stay legible: dark text on
// light fills, light text on dark fills. Runs after the SVG is in the DOM —
// fills can come from injected CSS classes, so getComputedStyle is required.
// Idempotent, and harmless in light mode (re-asserts dark-on-light).
function adaptNodeLabels(root: Element | null): void {
  if (!root) return;
  const DARK = "#111827"; // --ds-gray-900
  const LIGHT = "#F3F4F6"; // --ds-gray-100
  root.querySelectorAll(".node").forEach((node) => {
    const shape = node.querySelector("rect, polygon, circle, ellipse, path");
    if (!shape) return;
    const lum = rgbLuminance(getComputedStyle(shape).fill);
    if (lum == null) return;
    const color = lum > 0.4 ? DARK : LIGHT;
    node
      .querySelectorAll<HTMLElement>(
        "foreignObject div, foreignObject span, foreignObject p",
      )
      .forEach((el) => {
        el.style.color = color;
      });
    node.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
      el.style.fill = color;
    });
  });
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(cachePromise("mermaid", () => import("mermaid")));

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
    fontSize: 15,
    themeCSS: "margin: 1.5rem auto 0;",
    // Drive diagram colors from the DataSlope brand palette (app/brand.css) via
    // the customizable "base" theme: a light theme in light mode and a dark
    // theme in dark mode (adaptNodeLabels keeps author classDef pastels legible
    // in the dark theme). Replaces Mermaid's stock neutral/dark themes.
    theme: "base",
    themeVariables: brandThemeVariables(resolvedTheme === "dark"),
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, async () => {
      // Explicitly request Source Serif 4 at the weight/size Mermaid will use
      // before asking it to measure text. `document.fonts.ready` is insufficient
      // because font-display:swap fonts may not be in the "ready" set until
      // explicitly triggered. `fonts.load()` guarantees the face is available
      // (or settles with a no-op if it can't load) before we render.
      await Promise.allSettled([
        document.fonts.load('400 15px "Source Serif 4"'),
        document.fonts.load('700 15px "Source Serif 4"'),
      ]);
      return mermaid.render(id, chart.replaceAll("\\n", "\n"));
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
            adaptNodeLabels(container);
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
  onClose,
}: {
  svg: string;
  onClose: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
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
      // Keep author classDef pastel nodes legible in the dark theme (matches
      // the inline diagram).
      adaptNodeLabels(stage);
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
  }, []);

  // Apply zoom by resizing the SVG's intrinsic dimensions rather than a
  // CSS `transform: scale()`. A scaled transform on a composited layer
  // gets rasterized once at 1× and GPU-upscaled, which blurs text and
  // shapes; setting width/height re-renders the vector crisply at every
  // zoom level. The transform is left to pure translation for panning.
  //
  // Runs after every commit (not just on scale change) and via a layout
  // effect so the size is reasserted before paint — pan re-renders must
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
  // `passive: false` — React's onWheel is passive by default in newer
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
            <div
              className={styles.diagram}
              ref={stageRef}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

