"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Select } from "@base-ui/react/select";
import {
  ChevronDown,
  Code2,
  Database,
  Globe,
  ListChecks,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Ripple } from "@/components/ui/ripple";
import { ButtonGroup } from "@/components/ui/button-group";
import type { IconType } from "react-icons";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
import {
  HOME_SELECT_ITEM,
  HOME_SELECT_POPUP,
  HOME_SELECT_TRIGGER,
  HomeSelectBeam,
} from "./homeSelect";
import {
  CODE_CHALLENGES,
  CONCEPT_QUESTIONS,
  SQL_CHALLENGES,
  WEB_CODE_BLOCKS,
  type HomeCodeChallenge,
  type HomeSqlChallenge,
  type HomeWebBlock,
} from "./challenges";

// The editor/runtime-backed cards are heavy (CodeMirror + a WASM runtime), so
// they're code-split and rendered client-only, only the active tab mounts.
// The fallback renders inside the RippleFrame, on top of the ripple halo, so
// its fill must be fully opaque (the page-surface token, not a translucent
// tint), otherwise the rings show through while a tab's card loads.
const CardLoading = () => (
  <div className="flex min-h-[26rem] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--color-fd-background)] text-sm text-[var(--ds-gray-500)] dark:border-white/10">
    <Loader2
      className="size-6 animate-spin text-[var(--ds-blue-500)]"
      aria-hidden="true"
    />
    Loading…
  </div>
);

const MdxChallengeCard = dynamic(() => import("../MdxChallengeCard"), {
  ssr: false,
  loading: CardLoading,
});
const SqlChallengeCard = dynamic(() => import("../SqlChallengeCard"), {
  ssr: false,
  loading: CardLoading,
});
const MdxCodeBlock = dynamic(() => import("../MdxCodeBlock"), {
  ssr: false,
  loading: CardLoading,
});
const MultipleChoiceQuestion = dynamic(
  () => import("../multipleChoice/MultipleChoiceQuestion"),
  { ssr: false, loading: CardLoading },
);

type TabId = "code" | "sql" | "web" | "mcq";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "code", label: "Programming", icon: Code2 },
  { id: "sql", label: "SQL", icon: Database },
  { id: "web", label: "Web", icon: Globe },
  { id: "mcq", label: "Multiple Choice", icon: ListChecks },
];

function OptionIcon({ id }: { id: string }) {
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      <Icon size={Math.round(16 * factor)} />
    </span>
  );
}

/** A compact Base UI Select styled to echo the playground language switcher. */
function PickerSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; iconId: string }[];
}) {
  const active = options.find((o) => o.value === value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--ds-gray-500)]">
        {label}
      </span>
      <Select.Root
        value={value}
        onValueChange={(next) => {
          if (next != null) onValueChange(next);
        }}
      >
        {/* ShimmerButton trigger; background tracks the page surface
            (--color-fd-background) so it reads as part of the page. */}
        <Select.Trigger
          aria-label={label}
          className={`${HOME_SELECT_TRIGGER} min-w-40 justify-between`}
        >
          {active && <OptionIcon id={active.iconId} />}
          {/* Explicit label: a bare <Select.Value/> shows the raw value. */}
          <Select.Value className="flex-1 truncate text-left">
            {active?.label ?? value}
          </Select.Value>
          <Select.Icon className="text-[var(--ds-gray-500)] dark:text-white/70">
            <ChevronDown size={14} />
          </Select.Icon>
          <HomeSelectBeam />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            sideOffset={6}
            alignItemWithTrigger={false}
            className="z-50"
          >
            <Select.Popup className={`${HOME_SELECT_POPUP} min-w-44`}>
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className={HOME_SELECT_ITEM}
                >
                  <OptionIcon id={o.iconId} />
                  <Select.ItemText>{o.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

/** Centered row wrapper for a panel's picker / control strip. `z-20` lifts
 *  it above the RippleFrame's ripple (a later sibling that would otherwise
 *  paint its rings over these opaque controls). */
function ControlRow({ children }: { children: React.ReactNode }) {
  return <div className="relative z-20 flex justify-center">{children}</div>;
}

/**
 * Wraps a preview card with a Ripple centered on it and sized from its
 * shorter edge — a soft halo, re-sized as the card's measured box changes.
 */
function RippleFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Shorter edge keeps the halo subtle; fall back until the card is measured.
  const NUM_CIRCLES = 7;
  const shortEdge = Math.min(box.w, box.h) || 360;
  const maxCircle = Math.round(shortEdge * 1.25);
  const mainCircleSize = Math.round(maxCircle * 0.42);
  const circleGap = Math.round((maxCircle - mainCircleSize) / (NUM_CIRCLES - 1));

  return (
    <div ref={ref} className="relative">
      {/* Largest-circle-sized box centered on the card. No overflow clip —
          the rings spill slightly; <main>'s overflow-x-clip protects the page. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        style={{ width: maxCircle, height: maxCircle }}
      >
        {/* Drop the Ripple's built-in mask (it would hide the rings); they
            fade via their own decreasing opacity. */}
        <Ripple
          className="[mask-image:none]"
          mainCircleOpacity={0.26}
          mainCircleSize={mainCircleSize}
          circleGap={circleGap}
          numCircles={NUM_CIRCLES}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CodeChallengePanel() {
  const [adapterId, setAdapterId] = useState<string>("python");
  const challenge =
    CODE_CHALLENGES.find((c) => c.adapter === adapterId) ?? CODE_CHALLENGES[0];
  return (
    <div className="flex flex-col gap-4">
      <ControlRow>
        <PickerSelect
          label="Language"
          value={adapterId}
          onValueChange={setAdapterId}
          options={CODE_CHALLENGES.map((c: HomeCodeChallenge) => ({
            value: c.adapter,
            label: c.label,
            iconId: c.adapter,
          }))}
        />
      </ControlRow>
      <RippleFrame>
        <MdxChallengeCard
          key={challenge.adapter}
          adapter={challenge.adapter}
          title={challenge.title}
          instructions={challenge.instructions}
          files={challenge.files}
          entryFilename={challenge.entryFilename}
          tests={challenge.tests}
        />
      </RippleFrame>
    </div>
  );
}

function SqlChallengePanel() {
  const [dialect, setDialect] = useState<string>("postgres");
  const challenge =
    SQL_CHALLENGES.find((c) => c.dialect === dialect) ?? SQL_CHALLENGES[0];
  return (
    <div className="flex flex-col gap-4">
      <ControlRow>
        <PickerSelect
          label="Dialect"
          value={dialect}
          onValueChange={setDialect}
          options={SQL_CHALLENGES.map((c: HomeSqlChallenge) => ({
            value: c.dialect,
            label: c.label,
            iconId: c.dialect,
          }))}
        />
      </ControlRow>
      <RippleFrame>
        <SqlChallengeCard
          key={challenge.dialect}
          dialect={challenge.dialect}
          title={challenge.title}
          instructions={challenge.instructions}
          initSql={challenge.initSql}
          starterCode={challenge.starterCode}
          solutionSql={challenge.solutionSql}
          tables={challenge.tables}
          tests={challenge.tests}
        />
      </RippleFrame>
    </div>
  );
}

function WebPanel() {
  const [flavor, setFlavor] = useState<string>("web");
  const block =
    WEB_CODE_BLOCKS.find((b) => b.flavor === flavor) ?? WEB_CODE_BLOCKS[0];
  return (
    <div className="flex flex-col gap-4">
      <ControlRow>
        <PickerSelect
          label="Flavor"
          value={flavor}
          onValueChange={setFlavor}
          options={WEB_CODE_BLOCKS.map((b: HomeWebBlock) => ({
            value: b.flavor,
            label: b.label,
            iconId: b.adapter,
          }))}
        />
      </ControlRow>
      <RippleFrame>
        <MdxCodeBlock
          key={block.flavor}
          adapter={block.adapter}
          files={block.files}
          entryFilename={block.entryFilename}
          tailwind={block.tailwind}
        />
      </RippleFrame>
    </div>
  );
}

function McqPanel() {
  const [index, setIndex] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      {/* Numbered button group (shadcn) to pick which question to try. */}
      <ControlRow>
        <ButtonGroup aria-label="Choose a question">
          {CONCEPT_QUESTIONS.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Question ${i + 1}`}
                aria-pressed={active}
                onClick={() => setIndex(i)}
                className={
                  active
                    ? "relative z-10 inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-[var(--ds-blue-500)] bg-[var(--ds-blue-500)] text-sm font-semibold text-white transition-colors duration-200"
                    : "inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-[var(--ds-gray-200)] bg-[var(--color-fd-background)] text-sm font-medium text-[var(--ds-gray-700)] transition-colors duration-200 hover:bg-[var(--ds-gray-100)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/10"
                }
              >
                {i + 1}
              </button>
            );
          })}
        </ButtonGroup>
      </ControlRow>
      <RippleFrame>
        <MultipleChoiceQuestion
          key={index}
          markdown={CONCEPT_QUESTIONS[index]}
          badge="Concept Check"
        />
      </RippleFrame>
    </div>
  );
}

export function HeroInteractive() {
  const [tab, setTab] = useState<TabId>("code");

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* Tab bar; margins give the underline room and keep wrapped rows from
          crowding on narrow screens. */}
      <div className="relative z-10 mb-10 flex flex-wrap items-center justify-center gap-x-1 gap-y-3 sm:gap-x-6">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                active
                  ? "relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-base font-semibold text-[var(--ds-gray-900)] transition-[color,translate] hover:-translate-y-0.5 dark:text-white"
                  : "relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-base font-medium text-[var(--ds-gray-500)] transition-[color,translate] hover:-translate-y-0.5 hover:text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-400)] dark:hover:text-[var(--ds-gray-100)]"
              }
            >
              <Icon size={16} aria-hidden="true" />
              {t.label}
              {/* Active-item underline, desktop only (mobile's bold label
                  already marks it); the shared layoutId slides it between tabs. */}
              {active && (
                <motion.span
                  layoutId="hero-tab-underline"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-x-0 bottom-0 mx-auto hidden h-0.5 w-5 rounded-full bg-current sm:block"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel; each preview wraps its card in a <RippleFrame>. */}
      <div>
        {tab === "code" && <CodeChallengePanel />}
        {tab === "sql" && <SqlChallengePanel />}
        {tab === "web" && <WebPanel />}
        {tab === "mcq" && <McqPanel />}
      </div>
    </div>
  );
}
