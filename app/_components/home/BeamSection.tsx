"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { IconType } from "react-icons";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { cn } from "@/lib/utils";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "../languageIcons";

// Brand-coloured beams: blue → green.
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

/** Cross-fades between the given language icons on an interval. A single-id
 *  list just renders that icon (no animation). */
function AlternatingIcon({
  ids,
  delay = 0,
  interval = 2800,
}: {
  ids: string[];
  delay?: number;
  interval?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ids.length < 2) return;
    let timer: number | undefined;
    const start = window.setTimeout(() => {
      timer = window.setInterval(
        () => setIndex((p) => (p + 1) % ids.length),
        interval,
      );
    }, delay);
    return () => {
      window.clearTimeout(start);
      if (timer) window.clearInterval(timer);
    };
  }, [ids.length, delay, interval]);

  const id = ids[index % ids.length];
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

export function BeamSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  // Left column (top → bottom): Python/R, JS/TS, PHP, C/C++.
  const left1 = useRef<HTMLDivElement>(null);
  const left2 = useRef<HTMLDivElement>(null);
  const left3 = useRef<HTMLDivElement>(null);
  const left4 = useRef<HTMLDivElement>(null);
  // Right column (top → bottom): Java/C#, SQLite, Postgres, DuckDB.
  const right1 = useRef<HTMLDivElement>(null);
  const right2 = useRef<HTMLDivElement>(null);
  const right3 = useRef<HTMLDivElement>(null);
  const right4 = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex h-[24rem] w-full max-w-2xl items-center justify-between overflow-hidden px-6 sm:px-10"
    >
      {/* Left column */}
      <div className="flex flex-col justify-center gap-6">
        <Circle ref={left1} label="Python and R">
          <AlternatingIcon ids={["python", "r"]} delay={0} />
        </Circle>
        <Circle ref={left2} label="JavaScript and TypeScript">
          <AlternatingIcon ids={["javascript", "typescript"]} delay={700} />
        </Circle>
        <Circle ref={left3} label="PHP">
          <AlternatingIcon ids={["php"]} />
        </Circle>
        <Circle ref={left4} label="C and C++">
          <AlternatingIcon ids={["c", "cpp"]} delay={1400} />
        </Circle>
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

      {/* Right column */}
      <div className="flex flex-col justify-center gap-6">
        <Circle ref={right1} label="Java and C#">
          <AlternatingIcon ids={["java", "csharp"]} delay={350} />
        </Circle>
        <Circle ref={right2} label="SQLite">
          <AlternatingIcon ids={["sqlite"]} />
        </Circle>
        <Circle ref={right3} label="PostgreSQL">
          <AlternatingIcon ids={["postgres"]} />
        </Circle>
        <Circle ref={right4} label="DuckDB">
          <AlternatingIcon ids={["duckdb"]} />
        </Circle>
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
