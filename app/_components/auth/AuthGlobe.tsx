"use client";

// Decorative auth-shell background: a cobe globe with creature "stickers"
// projected from the live rotation each frame (positions written straight to
// refs, no React re-render). cobe bakes colors in at creation, so a theme
// change tears down and rebuilds the globe. Desktop only, as a render-time
// opt-out (not a `hidden` class) so mobile pays for no WebGL context, rAF
// loop, or sticker images. Non-interactive (pointer-events off, aria-hidden).

import { useEffect, useRef, useState } from "react";
import createGlobe, { type COBEOptions } from "cobe";
import imageManifest from "@/lib/generated/images";

const DEG = Math.PI / 180;

interface GlobePin {
  location: [number, number]; // [lat, long]
  /** Illustration slug under `public/images/`, without the `-cutout` suffix
   *  (see `pinSrc`). Doubles as the React key. */
  slug: string;
  /** Documentation only — the globe is `aria-hidden`, nothing is announced. */
  label: string;
}

// Only the globe's lower arc shows below the card, so most pins sit in the
// southern hemisphere / low latitudes to keep the visible region populated.
const PINS: GlobePin[] = [
  // Northern / mid latitudes (partly tucked behind the card).
  { location: [37.7749, -122.4194], slug: "auth-pin-python", label: "Python" },
  { location: [51.5074, -0.1278], slug: "auth-pin-charts", label: "data" },
  { location: [35.6762, 139.6503], slug: "auth-pin-trophy", label: "challenges" },
  { location: [1.3521, 103.8198], slug: "auth-pin-rocket", label: "ship it" },
  { location: [40.7128, -74.006], slug: "auth-pin-postgres", label: "Postgres" },
  { location: [52.52, 13.405], slug: "auth-pin-duckdb", label: "DuckDB" },
  { location: [28.6139, 77.209], slug: "auth-pin-streak", label: "streak" },
  // Southern / low latitudes (the visible lower arc), spread across
  // longitudes so several are always on the front face.
  { location: [-23.5505, -46.6333], slug: "auth-pin-learning", label: "learning" },
  { location: [-33.8688, 151.2093], slug: "auth-pin-speed", label: "speed" },
  { location: [-34.6037, -58.3816], slug: "auth-pin-growth", label: "growth" },
  { location: [-33.9249, 18.4241], slug: "auth-pin-compute", label: "compute" },
  { location: [-36.8485, 174.7633], slug: "auth-pin-ai", label: "AI" },
  { location: [-33.4489, -70.6693], slug: "auth-pin-pie-chart", label: "analytics" },
  { location: [-31.9523, 115.8613], slug: "auth-pin-cloud", label: "cloud" },
  { location: [-26.2041, 28.0473], slug: "auth-pin-idea", label: "ideas" },
  { location: [-12.0464, -77.0428], slug: "auth-pin-blocks", label: "numbers" },
  { location: [-6.2088, 106.8456], slug: "auth-pin-web", label: "web" },
  { location: [-1.2921, 36.8219], slug: "auth-pin-goals", label: "goals" },
  { location: [-37.8136, 144.9631], slug: "auth-pin-star", label: "achievements" },
];

/** Served file for a pin: the transparent `-cutout` copy. Null when the slug
 *  is missing from the manifest (absent sticker, not a broken image). */
function pinSrc(slug: string): string | null {
  const entry = imageManifest[`${slug}-cutout`];
  if (!entry) return null;
  return `/images/${slug}-cutout.${entry.formats[entry.formats.length - 1]}`;
}

const SHARED: Omit<
  COBEOptions,
  "dark" | "diffuse" | "mapBrightness" | "baseColor" | "glowColor"
> = {
  width: 1000,
  height: 1000,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.24,
  mapSamples: 16000,
  markerColor: [0.078, 0.549, 1],
  // No cobe markers; the stickers are the points of interest.
  markers: [],
};

// cobe has no separate continent-dot color: dots are `baseColor` scaled by
// `mapBrightness` (ocean ≈ baseColor × 0.1), so a low mapBrightness is the
// only knob for keeping the dots subtle.
const DARK_CONFIG: COBEOptions = {
  ...SHARED,
  dark: 1,
  diffuse: 1.1,
  // Near-black oceans melting into #121212 (baseColor × 0.1 ≈ #0D0F12).
  mapBrightness: 0.6,
  baseColor: [0.4, 0.5, 0.72],
  glowColor: [0.07, 0.18, 0.45],
};

const LIGHT_CONFIG: COBEOptions = {
  ...SHARED,
  dark: 0,
  diffuse: 1.2,
  // Near-white backdrop. `dark: 0` renders continents darker than the ocean,
  // so true white-on-white dots aren't possible; low mapBrightness keeps them
  // pale rather than grey specks.
  mapBrightness: 1.1,
  baseColor: [1, 1, 1],
  glowColor: [1, 1, 1],
};

// Low so the continents stay subtle; stickers ride on top at full opacity.
const CANVAS_OPACITY = { dark: 0.6, light: 0.42 };

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

/** The `md` breakpoint, read live so a resize across it mounts/tears down the
 *  globe. Starts `false` so server and first client render stay globe-free. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const read = () => setDesktop(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return desktop;
}

export function AuthGlobe() {
  const dark = useIsDark();
  const desktop = useIsDesktop();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<Array<HTMLSpanElement | null>>([]);
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
    const targetOpacity = dark ? CANVAS_OPACITY.dark : CANVAS_OPACITY.light;

    const globe = createGlobe(canvas, {
      ...config,
      width: width * 2,
      height: width * 2,
    });

    // cobe v2 has no `onRender`; rotation and sticker projection run from a
    // rAF loop this component owns, driving `globe.update()` once per frame.
    let frame = 0;
    const step = () => {
      frame = requestAnimationFrame(step);
      phiRef.current += 0.0045;
      globe.update({
        phi: phiRef.current,
        width: width * 2,
        height: width * 2,
      });

      // Project each sticker onto the sphere from the live rotation.
      const r = width * 0.455; // sphere radius in CSS px (tuned to the fill)
      const c = width / 2;
      for (let i = 0; i < PINS.length; i++) {
        const el = pinRefs.current[i];
        if (!el) continue;
        const latR = PINS[i].location[0] * DEG;
        const lonR = PINS[i].location[1] * DEG;
        const x = Math.cos(latR) * Math.sin(lonR + phiRef.current);
        const y0 = Math.sin(latR);
        const z0 = Math.cos(latR) * Math.cos(lonR + phiRef.current);
        // Tilt by theta so the stickers follow cobe's northward lean.
        const y = y0 * cosT - z0 * sinT;
        const z = y0 * sinT + z0 * cosT;
        if (z <= 0.02) {
          el.style.opacity = "0";
          continue;
        }
        // Fade in as a point clears the limb; grow slightly toward the front.
        const edge = Math.min(1, (z - 0.02) / 0.22);
        const scale = 0.82 + 0.18 * z;
        el.style.opacity = String(0.25 + 0.75 * edge);
        el.style.transform = `translate(-50%,-50%) translate(${(
          c +
          x * r
        ).toFixed(1)}px, ${(c - y * r).toFixed(1)}px) scale(${scale.toFixed(
          3,
        )})`;
        el.style.zIndex = z > 0.5 ? "2" : "1";
      }
    };
    frame = requestAnimationFrame(step);

    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = String(targetOpacity);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(raf);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
    // `desktop` is a dep because crossing the breakpoint must re-run this.
  }, [dark, desktop]);

  if (!desktop) return null;

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
        {PINS.map((pin, i) => {
          const src = pinSrc(pin.slug);
          return (
            <span
              key={pin.slug}
              ref={(el) => {
                pinRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 flex size-[88px] items-center justify-center opacity-0 will-change-transform"
            >
              {src ? (
                // Transparent cut-out with a drop-shadow lifting it off the
                // globe; no disc behind it.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                  className="size-full object-contain [filter:drop-shadow(0_2px_5px_rgba(0,0,0,0.35))]"
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
