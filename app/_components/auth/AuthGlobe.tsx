"use client";

// Decorative background for the auth shell: the Magic UI / cobe globe parked
// low behind the card, with brand-coloured term labels pinned to points on the
// sphere that orbit with the rotation (à la https://cobe.vercel.app).
//
// This embeds cobe directly (rather than the generic components/ui/globe.tsx)
// because the labels have to be projected from the *live* rotation each frame:
// the render callback advances `phi`, then positions each label's DOM node from
// its lat/long, hiding the ones that rotate to the back. Positions are written
// straight to the label refs (no React re-render) so it stays cheap.
//
// Shown in both themes with a theme-appropriate config (light: pale sphere;
// dark: near-black sphere that melts into #121212). `useIsDark` tracks the
// live `.dark` class the shared toggle flips; cobe bakes colours in at
// creation, so a theme change tears down and rebuilds the globe.
//
// Non-interactive (pointer-events off, aria-hidden): a pure backdrop.

import { useEffect, useRef, useState } from "react";
import createGlobe, { type COBEOptions } from "cobe";

const DEG = Math.PI / 180;

interface GlobeLabel {
  location: [number, number]; // [lat, long]
  text: string;
  bg: string;
  fg: string;
}

// Data / programming terms, spread around the globe so several sit on the
// front face at any moment. Brand palette: blue/green/red use white text,
// yellow uses near-black.
const BLUE = "#148CFF";
const GREEN = "#20C621";
const RED = "#FF4F59";
const YELLOW = "#FFDD6C";
const INK = "#121212";

const LABELS: GlobeLabel[] = [
  { location: [37.7749, -122.4194], text: "pandas", bg: BLUE, fg: "#fff" },
  { location: [51.5074, -0.1278], text: "GROUP BY", bg: GREEN, fg: "#fff" },
  { location: [35.6762, 139.6503], text: "recursion", bg: RED, fg: "#fff" },
  { location: [1.3521, 103.8198], text: "async / await", bg: YELLOW, fg: INK },
  { location: [-23.5505, -46.6333], text: "gradient descent", bg: BLUE, fg: "#fff" },
  { location: [40.7128, -74.006], text: "vectorize", bg: GREEN, fg: "#fff" },
  { location: [52.52, 13.405], text: "O(n log n)", bg: RED, fg: "#fff" },
  { location: [-33.8688, 151.2093], text: "JOIN", bg: YELLOW, fg: INK },
];

const SHARED: Omit<
  COBEOptions,
  "dark" | "diffuse" | "mapBrightness" | "baseColor" | "glowColor"
> = {
  width: 1000,
  height: 1000,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.24,
  mapSamples: 16000,
  markerColor: [0.078, 0.549, 1],
  // A small anchor dot under each label.
  markers: LABELS.map((l) => ({ location: l.location, size: 0.045 })),
};

const DARK_CONFIG: COBEOptions = {
  ...SHARED,
  dark: 1,
  diffuse: 1.15,
  mapBrightness: 7.5,
  // Light blue-grey continents on near-black oceans that melt into #121212;
  // a soft (not harsh) blue atmosphere.
  baseColor: [0.44, 0.55, 0.78],
  glowColor: [0.08, 0.2, 0.5],
};

const LIGHT_CONFIG: COBEOptions = {
  ...SHARED,
  dark: 0,
  diffuse: 1.2,
  mapBrightness: 5.5,
  // Pale sphere with soft grey-blue continents for the light page.
  baseColor: [0.88, 0.91, 0.97],
  glowColor: [0.9, 0.94, 1],
};

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function AuthGlobe() {
  const dark = useIsDark();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const phiRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = 0;
    const onResize = () => {
      width = container.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const config = dark ? DARK_CONFIG : LIGHT_CONFIG;
    const theta = config.theta ?? 0.24;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const globe = createGlobe(canvas, {
      ...config,
      width: width * 2,
      height: width * 2,
      onRender: (state) => {
        phiRef.current += 0.0045;
        state.phi = phiRef.current;
        state.width = width * 2;
        state.height = width * 2;

        // Project each label onto the sphere from the live rotation.
        const r = width * 0.455; // sphere radius in CSS px (tuned to the fill)
        const c = width / 2;
        for (let i = 0; i < LABELS.length; i++) {
          const el = labelRefs.current[i];
          if (!el) continue;
          const latR = LABELS[i].location[0] * DEG;
          const lonR = LABELS[i].location[1] * DEG;
          const x = Math.cos(latR) * Math.sin(lonR + phiRef.current);
          const y0 = Math.sin(latR);
          const z0 = Math.cos(latR) * Math.cos(lonR + phiRef.current);
          // Tilt by theta so the labels follow cobe's northward lean.
          const y = y0 * cosT - z0 * sinT;
          const z = y0 * sinT + z0 * cosT;
          if (z <= 0.02) {
            el.style.opacity = "0";
            continue;
          }
          // Fade in as a point clears the limb; dim slightly by depth.
          const edge = Math.min(1, (z - 0.02) / 0.22);
          el.style.opacity = String(0.35 + 0.65 * edge);
          el.style.transform = `translate(-50%,-50%) translate(${(
            c +
            x * r
          ).toFixed(1)}px, ${(c - y * r).toFixed(1)}px)`;
          el.style.zIndex = z > 0.5 ? "2" : "1";
        }
      },
    });

    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1";
    });
    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [dark]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -bottom-10 z-0 flex justify-center overflow-hidden"
    >
      <div
        ref={containerRef}
        className="relative aspect-square w-[clamp(340px,80vw,1040px)] translate-y-[44%]"
      >
        <canvas
          ref={canvasRef}
          className="size-full opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
          style={{
            maskImage:
              "radial-gradient(circle at 50% 50%, #000 58%, transparent 74%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, #000 58%, transparent 74%)",
          }}
        />
        {LABELS.map((label, i) => (
          <span
            key={label.text}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold opacity-0 shadow-[0_4px_14px_rgba(0,0,0,0.28)] will-change-transform"
            style={{ background: label.bg, color: label.fg }}
          >
            {label.text}
          </span>
        ))}
      </div>
    </div>
  );
}
