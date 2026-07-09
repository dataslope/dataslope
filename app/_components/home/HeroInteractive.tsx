"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Select } from "@base-ui-components/react/select";
import {
  ChevronDown,
  Code2,
  Database,
  Globe,
  ListChecks,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Ripple } from "@/components/ui/ripple";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ButtonGroup } from "@/components/ui/button-group";
import type { IconType } from "react-icons";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
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
        {/* Magic UI ShimmerButton as the select trigger. The background tracks
            the page surface (--color-fd-background: white in light, #121212 in
            dark, see app/home.css) so the trigger reads as part of the page
            rather than a floating dark pill; text/border/chevron flip per theme
            so they stay legible on either surface, with the blue shimmer as the
            accent edge. */}
        <Select.Trigger
          render={(triggerProps) => (
            <ShimmerButton
              {...triggerProps}
              background="var(--color-fd-background)"
              shimmerColor="#148CFF"
              shimmerSize="0.15em"
              borderRadius="0.625rem"
              className="min-w-40 justify-between gap-2 border-[color:var(--ds-gray-200)] px-3.5 py-1.5 text-sm font-medium text-[color:var(--ds-gray-900)] focus-visible:outline-none dark:border-white/10 dark:text-white"
            >
              {active && <OptionIcon id={active.iconId} />}
              {/* Render the label explicitly, a bare <Select.Value/> shows the
                  raw (lowercased) value instead of the option's label. */}
              <Select.Value className="flex-1 truncate text-left">
                {active?.label ?? value}
              </Select.Value>
              <Select.Icon className="text-[var(--ds-gray-500)] dark:text-white/70">
                <ChevronDown size={14} />
              </Select.Icon>
            </ShimmerButton>
          )}
        />
        <Select.Portal>
          <Select.Positioner
            sideOffset={6}
            alignItemWithTrigger={false}
            className="z-50"
          >
            <Select.Popup className="max-h-[60vh] min-w-44 overflow-y-auto rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none transition-[opacity,transform] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-700)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] data-[highlighted]:text-[var(--ds-gray-900)] data-[selected]:font-medium data-[selected]:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-200)] dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white"
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
 * Wraps a preview card with a Magic UI Ripple that is centered on the card
 * (both axes) and sized from the card's shorter edge, so its largest circle
 * reaches a bit beyond that edge, a soft halo rather than a ring
 * spanning the whole card. The card renders on top (opaque), so the rings read
 * as a halo around it. The ripple re-sizes itself as the card's measured box
 * changes (e.g. when the runtime loads or the viewport resizes).
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

  // Size the ripple from the card's SHORTER edge so it stays subtle, the
  // largest circle reaches a bit beyond that edge for a soft halo without
  // spreading the full width of the card. Fall back to a sensible size
  // until the card is measured.
  const NUM_CIRCLES = 7;
  const shortEdge = Math.min(box.w, box.h) || 360;
  const maxCircle = Math.round(shortEdge * 1.25);
  const mainCircleSize = Math.round(maxCircle * 0.42);
  const circleGap = Math.round((maxCircle - mainCircleSize) / (NUM_CIRCLES - 1));

  return (
    <div ref={ref} className="relative">
      {/* Box is the size of the largest circle, centered on the card. No
          overflow clip, the rings are meant to spill slightly past the card;
          the page itself is kept from widening by <main>'s overflow-x-clip. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        style={{ width: maxCircle, height: maxCircle }}
      >
        {/* No mask: the Ripple ships a built-in solid→transparent fade that
            would hide the rings, drop it so the ripple stays fully visible.
            The rings fade naturally via their own decreasing opacity. */}
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
                    ? "relative z-10 inline-flex size-9 items-center justify-center rounded-md border border-[var(--ds-blue-500)] bg-[var(--ds-blue-500)] text-sm font-semibold text-white"
                    : "inline-flex size-9 items-center justify-center rounded-md border border-[var(--ds-gray-200)] bg-[var(--color-fd-background)] text-sm font-medium text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/10"
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
      {/* Tab bar. Bottom margin gives the active-item underline room while
          keeping the pickers close below; a roomier row gap keeps the tabs
          from crowding when they wrap onto multiple lines on narrow screens;
          and desktop gets wider horizontal spacing between items. */}
      <div className="relative z-10 mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-5 sm:gap-x-12">
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
                  ? "relative inline-flex items-center gap-1.5 text-base font-semibold text-[var(--ds-gray-900)] dark:text-white"
                  : "relative inline-flex items-center gap-1.5 text-base font-medium text-[var(--ds-gray-500)] transition-colors hover:text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-400)] dark:hover:text-[var(--ds-gray-100)]"
              }
            >
              <Icon size={16} aria-hidden="true" />
              {t.label}
              {/* Active-item underline (a short bar in the label's own
                  colour), desktop only (on mobile the bold, darker label
                  already marks the active tab). */}
              {active && (
                <span className="absolute -bottom-2 left-1/2 hidden h-0.5 w-5 -translate-x-1/2 rounded-full bg-current sm:block" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel. Each preview wraps its card in a <RippleFrame>, which
          centers the ripple on the card (both axes) and sizes it to reach
          beyond every edge. */}
      <div>
        {tab === "code" && <CodeChallengePanel />}
        {tab === "sql" && <SqlChallengePanel />}
        {tab === "web" && <WebPanel />}
        {tab === "mcq" && <McqPanel />}
      </div>
    </div>
  );
}
