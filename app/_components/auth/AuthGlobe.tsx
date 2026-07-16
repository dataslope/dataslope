"use client";

// Decorative background for the auth shell in dark mode: the Magic UI globe,
// parked low behind the card as a soft glowing dome. Non-interactive
// (pointer-events off, aria-hidden), dimmed, and double-masked (radial + a
// bottom fade) so it reads as a subtle backdrop rather than a hard disc.
//
// Dark-mode only: on the light theme the sphere reads as a heavy dark disc
// against the pale page, so the globe belongs to the dark redesign and isn't
// rendered in light mode. `useIsDark` tracks the live `.dark` class on <html>
// that the shared theme toggle flips; cobe bakes its colours in at creation,
// so nothing needs to re-theme mid-life here.

import { useEffect, useState } from "react";
import type { COBEOptions } from "cobe";
import { Globe } from "@/components/ui/globe";

// Tuned for a near-black (#121212) page: oceans melt into the background
// (dark: 1), continents show as soft blue-grey dots, and a gentle blue
// atmosphere rims the sphere. Kept muted so it never competes with the card.
const DARK_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 1.1,
  mapSamples: 16000,
  mapBrightness: 6.6,
  baseColor: [0.36, 0.47, 0.7],
  glowColor: [0.12, 0.3, 0.72],
  markerColor: [0.078, 0.549, 1],
  markers: [
    { location: [19.076, 72.8777], size: 0.05 },
    { location: [39.9042, 116.4074], size: 0.05 },
    { location: [-23.5505, -46.6333], size: 0.05 },
    { location: [40.7128, -74.006], size: 0.06 },
    { location: [51.5074, -0.1278], size: 0.05 },
    { location: [35.6762, 139.6503], size: 0.05 },
  ],
};

/** Tracks the live `.dark` class on <html> so the globe shows only in dark
 *  mode and re-evaluates when the shared toggle flips it. */
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
  if (!dark) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -bottom-4 z-0 flex justify-center overflow-hidden"
    >
      <div
        className="relative aspect-square w-[min(620px,120vw)] translate-y-[48%] opacity-[0.62]"
        style={{
          // Radial mask fades the sphere's rim into the page; the linear pass
          // softens the very top so it emerges gently rather than as an edge.
          maskImage:
            "radial-gradient(circle at 50% 50%, #000 46%, transparent 68%), linear-gradient(to bottom, transparent, #000 22%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, #000 46%, transparent 68%), linear-gradient(to bottom, transparent, #000 22%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <Globe config={DARK_CONFIG} className="max-w-none" />
      </div>
    </div>
  );
}
