"use client";

import { forwardRef, useRef } from "react";
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
      "z-10 flex size-14 items-center justify-center rounded-full border border-[var(--ds-gray-200)] bg-white text-[var(--ds-gray-700)] shadow-[0_4px_18px_-6px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[var(--ds-gray-800)] dark:text-[var(--ds-gray-100)]",
      className,
    )}
  >
    {children}
  </div>
));
Circle.displayName = "Circle";

function MonoIcon({ id, size = 26 }: { id: string; size?: number }) {
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return <Icon size={Math.round(size * factor)} aria-hidden="true" />;
}

export function BeamSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const left1 = useRef<HTMLDivElement>(null);
  const left2 = useRef<HTMLDivElement>(null);
  const left3 = useRef<HTMLDivElement>(null);
  const right1 = useRef<HTMLDivElement>(null);
  const right2 = useRef<HTMLDivElement>(null);
  const right3 = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex h-[22rem] w-full max-w-2xl items-center justify-between overflow-hidden px-6 sm:px-12"
    >
      {/* Left column */}
      <div className="flex flex-col justify-center gap-7">
        <Circle ref={left1} label="Python">
          <MonoIcon id="python" />
        </Circle>
        <Circle ref={left2} label="R">
          <MonoIcon id="r" />
        </Circle>
        <Circle ref={left3} label="C++">
          <MonoIcon id="cpp" />
        </Circle>
      </div>

      {/* Center logo */}
      <Circle
        ref={centerRef}
        label="Dataslope"
        className="size-20 border-2 shadow-[0_8px_30px_-8px_rgba(20,140,255,0.45)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-files/SVG/dataslope-logo-black.svg"
          alt="Dataslope"
          className="block h-9 w-auto dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-files/SVG/dataslope-logo-white.svg"
          alt=""
          aria-hidden="true"
          className="hidden h-9 w-auto dark:block"
        />
      </Circle>

      {/* Right column */}
      <div className="flex flex-col justify-center gap-7">
        <Circle ref={right1} label="Java">
          <MonoIcon id="java" />
        </Circle>
        <Circle ref={right2} label="PostgreSQL">
          <MonoIcon id="postgres" />
        </Circle>
        <Circle ref={right3} label="DuckDB">
          <MonoIcon id="duckdb" />
        </Circle>
      </div>

      {/* Beams: each left node → center, then center → each right node. */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={left1}
        toRef={centerRef}
        curvature={-55}
        gradientStartColor={BEAM_START}
        gradientStopColor={BEAM_STOP}
        pathColor={BEAM_PATH}
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={left2}
        toRef={centerRef}
        gradientStartColor={BEAM_START}
        gradientStopColor={BEAM_STOP}
        pathColor={BEAM_PATH}
        delay={0.4}
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={left3}
        toRef={centerRef}
        curvature={55}
        gradientStartColor={BEAM_START}
        gradientStopColor={BEAM_STOP}
        pathColor={BEAM_PATH}
        delay={0.8}
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={right1}
        curvature={-55}
        gradientStartColor={BEAM_START}
        gradientStopColor={BEAM_STOP}
        pathColor={BEAM_PATH}
        delay={0.2}
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={right2}
        gradientStartColor={BEAM_START}
        gradientStopColor={BEAM_STOP}
        pathColor={BEAM_PATH}
        delay={0.6}
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={right3}
        curvature={55}
        gradientStartColor={BEAM_START}
        gradientStopColor={BEAM_STOP}
        pathColor={BEAM_PATH}
        delay={1}
        duration={4}
      />
    </div>
  );
}
