"use client";

// Decorative background for the auth shell: the Magic UI / cobe globe parked
// low behind the card, with Dataslope emoji "stickers" pinned to points on the
// sphere that orbit with the rotation (à la https://cobe.vercel.app).
//
// This embeds cobe directly (rather than the generic components/ui/globe.tsx)
// because the stickers have to be projected from the *live* rotation each
// frame: the render callback advances `phi`, then positions each sticker's DOM
// node from its lat/long, hiding the ones that rotate to the back. Positions
// are written straight to the refs (no React re-render) so it stays cheap.
//
// Shown in both themes with a theme-appropriate config (light: pale sphere;
// dark: near-black sphere that melts into #121212). The dotted continents are
// kept faint via a low canvas opacity so the globe reads as a soft backdrop;
// the emoji stickers stay fully opaque on top. `useIsDark` tracks the live
// `.dark` class the shared toggle flips; cobe bakes colours in at creation, so
// a theme change tears down and rebuilds the globe.
//
// Non-interactive (pointer-events off, aria-hidden): a pure backdrop.

import { useEffect, useRef, useState } from "react";
import createGlobe, { type COBEOptions } from "cobe";

const DEG = Math.PI / 180;

interface GlobePin {
  location: [number, number]; // [lat, long]
  emoji: string;
}

// Dataslope-flavoured stickers, languages, data, challenges, and a little fun,
// spread around the globe so several sit on the front face at any moment. The
// globe is parked low behind the card (see the container transform below), so
// its *upper* latitudes hide behind the card and only the lower arc is on
// show, the bulk of the pins therefore sit in the southern hemisphere / low
// latitudes so the visible region below the card stays populated.
const PINS: GlobePin[] = [
  // Northern / mid latitudes (partly tucked behind the card).
  { location: [37.7749, -122.4194], emoji: "🐍" }, // Python
  { location: [51.5074, -0.1278], emoji: "📊" }, // data / analytics
  { location: [35.6762, 139.6503], emoji: "🏆" }, // challenges
  { location: [1.3521, 103.8198], emoji: "🚀" }, // ship it
  { location: [40.7128, -74.006], emoji: "🐘" }, // Postgres
  { location: [52.52, 13.405], emoji: "🦆" }, // DuckDB
  { location: [28.6139, 77.209], emoji: "🔥" }, // streak
  // Southern / low latitudes (the visible lower arc), spread across longitudes
  // so several are always on the front face as the globe rotates.
  { location: [-23.5505, -46.6333], emoji: "🧠" }, // learning
  { location: [-33.8688, 151.2093], emoji: "⚡" }, // WebAssembly speed
  { location: [-34.6037, -58.3816], emoji: "📈" }, // growth
  { location: [-33.9249, 18.4241], emoji: "🧮" }, // compute
  { location: [-36.8485, 174.7633], emoji: "🤖" }, // AI
  { location: [-33.4489, -70.6693], emoji: "📉" }, // analytics
  { location: [-31.9523, 115.8613], emoji: "☁️" }, // cloud
  { location: [-26.2041, 28.0473], emoji: "💡" }, // ideas
  { location: [-12.0464, -77.0428], emoji: "🔢" }, // numbers
  { location: [-6.2088, 106.8456], emoji: "🌐" }, // web
  { location: [-1.2921, 36.8219], emoji: "🎯" }, // goals
  { location: [-37.8136, 144.9631], emoji: "⭐" }, // achievements
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
  // No cobe markers, the emoji stickers are the points of interest.
  markers: [],
};

// cobe colours the whole sphere as `baseColor` scaled by a per-pixel
// brightness; the dotted continents are the *same* hue as the ocean, just
// brighter (when `dark: 1`) or darker (when `dark: 0`) by `mapBrightness`. So
// the ocean reads as roughly `baseColor × 0.1` and a continent dot as
// `baseColor × (mapBrightness × facing)`. To keep the dots close to the ocean
// colour we simply keep `mapBrightness` low, rather than picking a separate dot
// colour (cobe has no such knob).
const DARK_CONFIG: COBEOptions = {
  ...SHARED,
  dark: 1,
  diffuse: 1.1,
  // Near-black oceans that melt into #121212 (baseColor × 0.1 ≈ #0D0F12), with
  // continent dots kept only *very* subtly brighter than that background: a low
  // mapBrightness is the knob for how much the dots stand out. Raise it for
  // more prominent continents, lower it for an even fainter globe.
  mapBrightness: 0.6,
  baseColor: [0.4, 0.5, 0.72],
  glowColor: [0.07, 0.18, 0.45],
};

const LIGHT_CONFIG: COBEOptions = {
  ...SHARED,
  dark: 0,
  diffuse: 1.2,
  // White/neutral globe on the light page: a pure-white base drops the old
  // blue tint so the dotted sphere reads as white rather than blue-grey, and a
  // lower mapBrightness keeps the continents pale instead of darkening them
  // into grey specks. (cobe renders `dark: 0` continents *darker* than the
  // ocean, so true white-on-white dots aren't possible; this keeps the whole
  // sphere a soft, near-white backdrop.) baseColor / mapBrightness are the
  // knobs to fine-tune on a real GPU; keep mapBrightness low for very subtle
  // continents.
  mapBrightness: 1.1,
  baseColor: [1, 1, 1],
  glowColor: [1, 1, 1],
};

// Target opacity of the dotted sphere, low so the continents stay subtle (the
// stickers ride on top at full opacity).
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

export function AuthGlobe() {
  const dark = useIsDark();
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
      onRender: (state) => {
        phiRef.current += 0.0045;
        state.phi = phiRef.current;
        state.width = width * 2;
        state.height = width * 2;

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
      },
    });

    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = String(targetOpacity);
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
        {PINS.map((pin, i) => (
          <span
            key={pin.emoji}
            ref={(el) => {
              pinRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 flex size-9 items-center justify-center rounded-full bg-white text-[19px] leading-none opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.06] will-change-transform"
          >
            {pin.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
