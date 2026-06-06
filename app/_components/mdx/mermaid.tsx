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
// Mermaid runs color math (khroma) over its theme variables, so it needs
// concrete colors rather than `var(--ds-*)` strings. We resolve the brand
// tokens (app/brand.css) to hex at render time, keeping that file the single
// source of truth, and fall back to the literal brand values — mirrored below,
// kept in sync with app/brand.css — if a token is ever missing (e.g. before
// the stylesheet applies). Only the steps the theme actually uses are listed.
const BRAND_FALLBACKS: Record<string, string> = {
  "--ds-blue-50": "#E8F2FF",
  "--ds-blue-100": "#D1E6FF",
  "--ds-blue-200": "#AED3FF",
  "--ds-blue-400": "#5BA7FF",
  "--ds-blue-600": "#0878DD",
  "--ds-blue-800": "#00519C",
  "--ds-teal-200": "#AAE0DD",
  "--ds-teal-600": "#009491",
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
  "--ds-gray-50": "#f9fafb",
  "--ds-gray-300": "#d1d5db",
  "--ds-gray-400": "#9ca3af",
  "--ds-gray-500": "#6b7280",
  "--ds-gray-600": "#4b5563",
  "--ds-gray-700": "#374151",
  "--ds-gray-800": "#1f2937",
  "--ds-gray-900": "#111827",
  "--ds-white": "#ffffff",
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

// Build Mermaid `themeVariables` for the brand "base" theme. Light mode places
// dark text/soft-blue nodes on a white page; dark mode places light text on
// dark cards with a bright-blue accent border. All node/line/text pairings are
// WCAG-AA verified. Semantic brand hues (green/red/yellow) keep their meaning
// (success/error/warning notes & critical tasks); the seven-hue categorical
// wheel colors multi-branch diagrams (mindmaps) without semantic collisions.
function brandThemeVariables(isDark: boolean): Record<string, string | boolean> {
  const c = readBrand();

  const text = isDark ? c("--ds-gray-50") : c("--ds-gray-900");
  const surface = isDark ? c("--ds-gray-900") : c("--ds-white");
  const nodeFill = isDark ? c("--ds-gray-800") : c("--ds-blue-50");
  const nodeBorder = isDark ? c("--ds-blue-400") : c("--ds-blue-600");
  const line = isDark ? c("--ds-gray-400") : c("--ds-gray-500");
  const lifeline = isDark ? c("--ds-gray-500") : c("--ds-gray-400");
  const signal = isDark ? c("--ds-gray-300") : c("--ds-gray-600");
  const clusterFill = isDark ? c("--ds-gray-900") : c("--ds-gray-50");
  const clusterBorder = isDark ? c("--ds-gray-700") : c("--ds-gray-300");

  // Categorical wheel (mindmaps): light = soft -200 fills under dark labels;
  // dark = deep -800 fills under light labels. Mermaid re-applies overrides
  // after its internal derivation, so these exact values reach the SVG.
  const step = isDark ? "800" : "200";
  const wheel = ["blue", "teal", "green", "yellow", "orange", "red", "purple"];
  const cScale: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    cScale[`cScale${i}`] = c(`--ds-${wheel[i % wheel.length]}-${step}` as keyof typeof BRAND_FALLBACKS);
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

    // Primary nodes (flowchart / class / state / ER) + sequence actors
    primaryColor: nodeFill,
    primaryBorderColor: nodeBorder,
    primaryTextColor: text,
    nodeTextColor: text,

    // Secondary / tertiary — clusters/subgraphs and accents
    secondaryColor: isDark ? c("--ds-gray-700") : c("--ds-teal-200"),
    secondaryBorderColor: isDark ? c("--ds-gray-600") : c("--ds-teal-600"),
    secondaryTextColor: text,
    tertiaryColor: clusterFill,
    tertiaryBorderColor: clusterBorder,
    tertiaryTextColor: text,

    // Edges / arrows / labels
    lineColor: line,
    arrowheadColor: line,
    textColor: text,
    titleColor: text,
    edgeLabelBackground: surface,

    // Notes (sequence + flowchart) — bright "sticky note" in both modes
    noteBkgColor: c("--ds-yellow-100"),
    noteBorderColor: c("--ds-yellow-600"),
    noteTextColor: c("--ds-gray-900"),

    // Sequence diagrams
    actorBkg: nodeFill,
    actorBorder: nodeBorder,
    actorTextColor: text,
    actorLineColor: lifeline,
    signalColor: signal,
    signalTextColor: text,
    labelBoxBkgColor: nodeFill,
    labelBoxBorderColor: nodeBorder,
    labelTextColor: text,
    loopTextColor: text,
    activationBkgColor: isDark ? c("--ds-gray-700") : c("--ds-blue-100"),
    activationBorderColor: nodeBorder,
    sequenceNumberColor: isDark ? c("--ds-gray-900") : c("--ds-white"),

    // Class diagrams
    classText: text,

    // ER diagrams — alternating attribute rows
    attributeBackgroundColorOdd: clusterFill,
    attributeBackgroundColorEven: surface,

    // Gantt charts
    sectionBkgColor: isDark ? c("--ds-gray-800") : c("--ds-gray-50"),
    altSectionBkgColor: surface,
    sectionBkgColor2: isDark ? c("--ds-gray-700") : c("--ds-blue-50"),
    taskBkgColor: nodeFill,
    taskBorderColor: nodeBorder,
    activeTaskBkgColor: isDark ? c("--ds-blue-800") : c("--ds-blue-200"),
    activeTaskBorderColor: nodeBorder,
    gridColor: clusterBorder,
    doneTaskBkgColor: isDark ? c("--ds-gray-700") : c("--ds-gray-300"),
    doneTaskBorderColor: c("--ds-gray-500"),
    critBkgColor: isDark ? c("--ds-red-800") : c("--ds-red-200"),
    critBorderColor: c("--ds-red-600"),
    todayLineColor: c("--ds-red-500"),
    taskTextColor: text,
    taskTextDarkColor: c("--ds-gray-900"),
    taskTextLightColor: c("--ds-white"),
    taskTextOutsideColor: text,

    // Categorical scale (mindmaps / pie) + mindmap root node
    scaleLabelColor: text,
    git0: isDark ? c("--ds-gray-800") : c("--ds-blue-100"),
    gitBranchLabel0: text,
    ...cScale,
  };
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
    // the customizable "base" theme, instead of Mermaid's stock neutral (light)
    // / dark themes, so charts match the rest of /learn in both modes.
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
        ref={(container) => {
          if (container) bindFunctions?.(container);
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
            <div ref={stageRef} dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      </div>
    </div>
  );
}

