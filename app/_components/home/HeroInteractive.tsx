"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Select } from "@base-ui-components/react/select";
import { ChevronDown } from "lucide-react";
import { Ripple } from "@/components/ui/ripple";
import type { IconType } from "react-icons";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
import {
  CODE_CHALLENGES,
  CONCEPT_QUESTION,
  SQL_CHALLENGES,
  type HomeCodeChallenge,
  type HomeSqlChallenge,
} from "./challenges";

// The editor/runtime-backed cards are heavy (CodeMirror + a WASM runtime), so
// they're code-split and rendered client-only — only the active tab mounts.
const CardLoading = () => (
  <div className="flex min-h-[26rem] items-center justify-center rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] text-sm text-[var(--ds-gray-500)] dark:border-white/10 dark:bg-white/5">
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
const MultipleChoiceQuestion = dynamic(
  () => import("../multipleChoice/MultipleChoiceQuestion"),
  { ssr: false, loading: CardLoading },
);

type TabId = "code" | "sql" | "mcq";

const TABS: { id: TabId; label: string }[] = [
  { id: "code", label: "Code Challenge" },
  { id: "sql", label: "SQL Challenge" },
  { id: "mcq", label: "Multiple Choice Questions" },
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
        <Select.Trigger className="inline-flex min-w-40 items-center gap-2 rounded-lg border border-[var(--ds-gray-200)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:border-[var(--ds-blue-300)] focus-visible:border-[var(--ds-blue-500)] focus-visible:outline-none dark:border-white/15 dark:bg-white/5 dark:text-[var(--ds-gray-100)]">
          {active && <OptionIcon id={active.iconId} />}
          {/* Render the label explicitly — a bare <Select.Value/> shows the
              raw (lowercased) value instead of the option's label. */}
          <Select.Value className="flex-1 truncate text-left">
            {active?.label ?? value}
          </Select.Value>
          <Select.Icon className="text-[var(--ds-gray-400)]">
            <ChevronDown size={14} />
          </Select.Icon>
        </Select.Trigger>
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

function CodeChallengePanel() {
  const [adapterId, setAdapterId] = useState<string>("python");
  const challenge =
    CODE_CHALLENGES.find((c) => c.adapter === adapterId) ?? CODE_CHALLENGES[0];
  return (
    <div className="flex flex-col gap-2">
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
      <MdxChallengeCard
        key={challenge.adapter}
        adapter={challenge.adapter}
        title={challenge.title}
        instructions={challenge.instructions}
        files={challenge.files}
        entryFilename={challenge.entryFilename}
        tests={challenge.tests}
      />
    </div>
  );
}

function SqlChallengePanel() {
  const [dialect, setDialect] = useState<string>("postgres");
  const challenge =
    SQL_CHALLENGES.find((c) => c.dialect === dialect) ?? SQL_CHALLENGES[0];
  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}

export function HeroInteractive() {
  const [tab, setTab] = useState<TabId>("code");
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* Magic UI Ripple behind the preview card. */}
      <Ripple mainCircleOpacity={0.16} />
      {/* Tab bar */}
      <div className="relative z-10 mb-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                active
                  ? "relative text-base font-semibold text-[var(--ds-gray-900)] dark:text-white"
                  : "relative text-base font-medium text-[var(--ds-gray-500)] transition-colors hover:text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-400)] dark:hover:text-[var(--ds-gray-100)]"
              }
            >
              {t.label}
              {active && (
                <span className="absolute -bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--ds-blue-500)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div className="relative z-10">
        {tab === "code" && <CodeChallengePanel />}
        {tab === "sql" && <SqlChallengePanel />}
        {tab === "mcq" && (
          <MultipleChoiceQuestion
            markdown={CONCEPT_QUESTION}
            badge="Concept Check"
          />
        )}
      </div>
    </div>
  );
}
