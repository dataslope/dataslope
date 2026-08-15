"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pauses every CSS animation in its subtree while offscreen (CSS keeps
 * ticking out of view, burning style/paint time for nobody): an
 * IntersectionObserver toggles `data-anims="paused"`, and a rule in
 * app/home.css sets `animation-play-state: paused` inside. JS-driven
 * animations pause themselves.
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
