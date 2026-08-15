"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import type { IconType } from "react-icons";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { cn } from "@/lib/utils";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "../languageIcons";

// Brand-colored beams: blue → green.
const BEAM_START = "#148CFF"; // --ds-blue-500
const BEAM_STOP = "#20C621"; // --ds-green-500
const BEAM_PATH = "var(--ds-gray-300)";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; label?: string }
>(({ className, children, label }, ref) => (
  <div
    ref={ref}
    aria-label={label}
    className={cn(
      "z-10 flex size-12 items-center justify-center rounded-full border border-[var(--ds-gray-200)] bg-white text-[var(--ds-gray-700)] shadow-[0_4px_18px_-6px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-[var(--ds-gray-100)]",
      className,
    )}
  >
    {children}
  </div>
));
Circle.displayName = "Circle";

function MonoIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return <Icon size={Math.round(size * factor)} aria-hidden="true" />;
}

/** Steps through `count` on an interval after `delay`; rotation only runs
 *  while `active`. Shared by icon and label so they show the same language. */
function useRotatingIndex(
  count: number,
  delay = 0,
  interval = 2800,
  active = true,
): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count < 2 || !active) return;
    let timer: number | undefined;
    const start = window.setTimeout(() => {
      timer = window.setInterval(
        () => setIndex((p) => (p + 1) % count),
        interval,
      );
    }, delay);
    return () => {
      window.clearTimeout(start);
      if (timer) window.clearInterval(timer);
    };
  }, [count, delay, interval, active]);

  return index % count;
}

/** Cross-fades the glyph whenever the active `id` changes. */
function SwapIcon({ id }: { id: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={id}
        className="inline-flex items-center justify-center"
        initial={{ opacity: 0, y: 6, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.8 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <MonoIcon id={id} />
      </motion.span>
    </AnimatePresence>
  );
}

/** Cross-fades the label text in lock-step with its icon. */
function SwapLabel({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <span
      // Desktop only. The fixed width keeps each circle's position constant
      // across cross-fades so the beams (recomputed only on container
      // resize) stay aligned.
      className={cn(
        "hidden w-28 whitespace-nowrap text-sm font-medium text-[var(--ds-gray-600)] sm:block dark:text-[var(--ds-gray-300)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={name}
          className="block"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {name}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface NodeItem {
  id: string;
  name: string;
}

/** A language node: circle + rotating label. `side` picks the diagram edge
 *  and label alignment; `active` gates the rotation while offscreen. */
const BeamNode = forwardRef<
  HTMLDivElement,
  {
    items: NodeItem[];
    side: "left" | "right";
    delay?: number;
    label: string;
    active: boolean;
  }
>(({ items, side, delay = 0, label, active }, ref) => {
  const index = useRotatingIndex(items.length, delay, 2800, active);
  const current = items[index];

  const circle = (
    <Circle ref={ref} label={label}>
      <SwapIcon id={current.id} />
    </Circle>
  );
  const text = (
    <SwapLabel name={current.name} align={side === "left" ? "right" : "left"} />
  );

  return (
    <div className="flex items-center gap-3">
      {side === "left" ? (
        <>
          {text}
          {circle}
        </>
      ) : (
        <>
          {circle}
          {text}
        </>
      )}
    </div>
  );
});
BeamNode.displayName = "BeamNode";

export function BeamSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Pause the rotation offscreen and under prefers-reduced-motion (beams
  // and the FlickeringGrid backdrop gate themselves).
  const sectionInView = useInView(containerRef as RefObject<Element>);
  const reducedMotion = useReducedMotion();
  const rotationActive = sectionInView && !reducedMotion;
  const centerRef = useRef<HTMLDivElement>(null);
  // Left column (top → bottom): Python/R, JS/TS, PHP, C/C++.
  const left1 = useRef<HTMLDivElement>(null);
  const left2 = useRef<HTMLDivElement>(null);
  const left3 = useRef<HTMLDivElement>(null);
  const left4 = useRef<HTMLDivElement>(null);
  // Right column (top → bottom): Java/C#, Postgres, SQLite/DuckDB, HTML/React.
  const right1 = useRef<HTMLDivElement>(null);
  const right2 = useRef<HTMLDivElement>(null);
  const right3 = useRef<HTMLDivElement>(null);
  const right4 = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex h-[24rem] w-full max-w-2xl items-center justify-between overflow-hidden px-6 sm:px-10"
    >
      {/* Left column, labels hug the right edge so they sit beside the circle. */}
      <div className="flex flex-col items-end justify-center gap-6">
        <BeamNode ref={left1} active={rotationActive} side="left" label="Python and R" delay={0} items={[{ id: "python", name: "Python" }, { id: "r", name: "R" }]} />
        <BeamNode ref={left2} active={rotationActive} side="left" label="JavaScript and TypeScript" delay={700} items={[{ id: "javascript", name: "JavaScript" }, { id: "typescript", name: "TypeScript" }]} />
        <BeamNode ref={left3} active={rotationActive} side="left" label="PHP" items={[{ id: "php", name: "PHP" }]} />
        <BeamNode ref={left4} active={rotationActive} side="left" label="C and C++" delay={1400} items={[{ id: "c", name: "C" }, { id: "cpp", name: "C++" }]} />
      </div>

      {/* Center logo */}
      <Circle
        ref={centerRef}
        label="Dataslope"
        className="size-14 border-2 shadow-[0_8px_30px_-8px_rgba(20,140,255,0.45)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-files/SVG/dataslope-logo-black.svg"
          alt="Dataslope"
          className="block h-4 w-auto dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-files/SVG/dataslope-logo-white.svg"
          alt=""
          aria-hidden="true"
          className="hidden h-4 w-auto dark:block"
        />
      </Circle>

      {/* Right column, labels hug the left edge, beside the circle. */}
      <div className="flex flex-col items-start justify-center gap-6">
        <BeamNode ref={right1} active={rotationActive} side="right" label="Java and C#" delay={350} items={[{ id: "java", name: "Java" }, { id: "csharp", name: "C#" }]} />
        <BeamNode ref={right2} active={rotationActive} side="right" label="PostgreSQL" items={[{ id: "postgres", name: "PostgreSQL" }]} />
        <BeamNode ref={right3} active={rotationActive} side="right" label="SQLite and DuckDB" delay={1050} items={[{ id: "sqlite", name: "SQLite" }, { id: "duckdb", name: "DuckDB" }]} />
        <BeamNode ref={right4} active={rotationActive} side="right" label="HTML and React" delay={1750} items={[{ id: "web", name: "HTML" }, { id: "react", name: "React" }]} />
      </div>

      {/* Every beam flows from a language node INTO the center. Right-side
          beams are reversed so their pulse still travels node → center.
          curvature 0 keeps them from crossing. */}
      <AnimatedBeam containerRef={containerRef} fromRef={left1} toRef={centerRef} gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={left2} toRef={centerRef} gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={0.3} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={left3} toRef={centerRef} gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={0.6} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={left4} toRef={centerRef} gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={0.9} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={right1} toRef={centerRef} reverse gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={0.15} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={right2} toRef={centerRef} reverse gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={0.45} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={right3} toRef={centerRef} reverse gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={0.75} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={right4} toRef={centerRef} reverse gradientStartColor={BEAM_START} gradientStopColor={BEAM_STOP} pathColor={BEAM_PATH} delay={1.05} duration={4} />
    </div>
  );
}
