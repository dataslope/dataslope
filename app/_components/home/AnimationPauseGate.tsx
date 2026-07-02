"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pauses every CSS animation in its subtree while the wrapper is offscreen.
 *
 * The home page leans on infinite CSS animations for decoration (the hero
 * marquees, the Ripple halo, the ShimmerButton spark, the bento's diamond
 * loader and blinking cursor). CSS keeps those ticking even when the element
 * is scrolled far out of the viewport, so they burn style/paint time for
 * nobody. This wrapper generalises the FlickeringGrid pattern: an
 * IntersectionObserver toggles `data-anims="paused"` on the subtree, and a
 * scoped rule in app/home.css sets `animation-play-state: paused` for
 * everything inside. Paused animations freeze in place and resume mid-cycle
 * on re-entry.
 *
 * JS-driven animations (motion springs, rAF loops, timers) are unaffected —
 * those pause themselves (see AnimatedBeam, BeamSection, TypingAnimation,
 * and statsBentoBackgrounds).
 */
export function AnimationPauseGate({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Default to running so SSR markup and no-IntersectionObserver browsers
  // keep their animations.
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      // A little margin so animations are already running as the section
      // scrolls into view, rather than visibly starting at the edge.
      { rootMargin: "96px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      data-anims={inView ? undefined : "paused"}
    >
      {children}
    </div>
  );
}
