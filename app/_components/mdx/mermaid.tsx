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
// Diagrams use one SOFT, LIGHT palette from the brand system (app/brand.css)
// in *both* modes, via Mermaid's customizable "base" theme. It's light in both
// modes for two reasons:
//   1. Many MDX diagrams hand-color nodes with `classDef` light pastel fills
//      and no text color (e.g. `fill:#fee2e2`). One global node-text color must
//      be dark to stay legible on them — so every box is light with dark text.
//   2. With all text dark, we render the whole figure on a soft light "card" in
//      dark mode (see mermaid.module.css) so it reads cleanly on a dark page —
//      no per-element light/dark juggling, and author pastels always work.
// Borders are deliberately minimal (soft hairlines) and the palette is
// low-contrast (updates from the brand report). Mermaid runs color math
// (khroma) over these values and needs concrete colors, so we resolve the
// brand tokens to hex at render time (brand.css stays the source of truth)
// with literal fallbacks.
const BRAND_FALLBACKS: Record<string, string> = {
  "--ds-blue-50": "#E8F2FF",
  "--ds-blue-100": "#D1E6FF",
  "--ds-blue-200": "#AED3FF",
  "--ds-teal-200": "#AAE0DD",
  "--ds-green-200": "#B4EAAF",
  "--ds-red-200": "#FFC2BF",
  "--ds-red-500": "#FF4F59",
  "--ds-red-600": "#DC3F49",
  "--ds-yellow-100": "#FDF5D9",
  "--ds-yellow-200": "#FEF0C3",
  "--ds-orange-200": "#F6CAAD",
  "--ds-purple-200": "#DBCAFC",
  "--ds-gray-50": "#F9FAFB",
  "--ds-gray-200": "#E5E7EB",
  "--ds-gray-300": "#D1D5DB",
  "--ds-gray-400": "#9CA3AF",
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

function brandThemeVariables(): Record<string, string | boolean> {
  const c = readBrand();

  const ink = c("--ds-gray-900"); // all text — dark, sits on light fills/card
  const canvas = c("--ds-white"); // diagram canvas + edge-label backdrop blend
  // blue-100 reads clearly on white (blue-50 was nearly invisible); blue-300
  // gives a soft-but-visible edge without the old bold border.
  const nodeFill = c("--ds-blue-100");
  const nodeEdge = c("--ds-blue-300");
  const softFill = c("--ds-gray-50"); // clusters / subgraphs / alt rows
  const softEdge = c("--ds-gray-200");
  const line = c("--ds-gray-400"); // connectors

  // Categorical wheel (mindmaps): soft -200 fills under dark labels. Mermaid
  // re-applies overrides after its internal derivation, so these reach the SVG
  // verbatim (its cScale darkening is bypassed).
  const wheel = ["blue", "teal", "green", "yellow", "orange", "red", "purple"];
  const cScale: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    cScale[`cScale${i}`] = c(
      `--ds-${wheel[i % wheel.length]}-200` as keyof typeof BRAND_FALLBACKS,
    );
  }

  return {
    // Light-based in both modes; dark mode is handled by a CSS figure card.
    darkMode: false,
    background: canvas,
    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
    // Controls the font-size written into the SVG's inline <style> block.
    // Without this, Mermaid inherits the container's computed size (16px from
    // the 1rem wrapper) and writes that into the SVG, overriding the fontSize
    // config which only governs text measurement.
    fontSize: "15px",

    // Nodes (flowchart / class / state / ER) + sequence actors
    primaryColor: nodeFill,
    primaryBorderColor: nodeEdge,
    primaryTextColor: ink,
    nodeTextColor: ink,

    // Secondary / tertiary — clusters/subgraphs + gentle accents
    secondaryColor: c("--ds-blue-100"),
    secondaryBorderColor: nodeEdge,
    secondaryTextColor: ink,
    tertiaryColor: softFill,
    tertiaryBorderColor: softEdge,
    tertiaryTextColor: ink,

    // Connectors + labels (edge-label backdrops blend into the canvas/card)
    lineColor: line,
    arrowheadColor: line,
    textColor: ink,
    titleColor: ink,
    edgeLabelBackground: canvas,

    // Notes — soft yellow, dark text
    noteBkgColor: c("--ds-yellow-100"),
    noteBorderColor: c("--ds-yellow-200"),
    noteTextColor: ink,

    // Sequence diagrams
    actorBkg: nodeFill,
    actorBorder: nodeEdge,
    actorTextColor: ink,
    actorLineColor: c("--ds-gray-300"),
    signalColor: line,
    signalTextColor: ink,
    labelBoxBkgColor: nodeFill,
    labelBoxBorderColor: nodeEdge,
    labelTextColor: ink,
    loopTextColor: ink,
    activationBkgColor: c("--ds-blue-100"),
    activationBorderColor: nodeEdge,
    sequenceNumberColor: ink,

    // Class diagrams
    classText: ink,

    // State diagrams — keep composite/alt backgrounds light (they default to
    // `background`) so nested state text stays legible.
    compositeBackground: softFill,
    altBackground: softFill,
    compositeTitleBackground: nodeFill,
    compositeBorder: nodeEdge,

    // ER diagrams — alternating attribute rows
    attributeBackgroundColorOdd: softFill,
    attributeBackgroundColorEven: canvas,

    // Gantt charts
    sectionBkgColor: softFill,
    altSectionBkgColor: canvas,
    sectionBkgColor2: c("--ds-blue-50"),
    taskBkgColor: c("--ds-blue-100"),
    taskBorderColor: nodeEdge,
    activeTaskBkgColor: c("--ds-blue-200"),
    activeTaskBorderColor: nodeEdge,
    gridColor: softEdge,
    doneTaskBkgColor: c("--ds-gray-200"),
    doneTaskBorderColor: c("--ds-gray-400"),
    critBkgColor: c("--ds-red-200"),
    critBorderColor: c("--ds-red-600"),
    todayLineColor: c("--ds-red-500"),
    taskTextColor: ink,
    taskTextDarkColor: ink,
    taskTextLightColor: ink,
    taskTextOutsideColor: ink,

    // Categorical scale (mindmaps / pie) + mindmap root node
    scaleLabelColor: ink,
    git0: c("--ds-blue-100"),
    gitBranchLabel0: ink,
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
    // the customizable "base" theme, instead of Mermaid's stock neutral/dark
    // themes. The theme is light-based in both modes; free-floating text blends
    // with the page so it reads on light and dark (see brandThemeVariables).
    theme: "base",
    themeVariables: brandThemeVariables(),
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

