"use client";

/**
 * Static, dependency-light placeholder shown while the real interactive
 * card (CustomItemRenderer) is being fetched on /c, /quiz, and the
 * builder previews.
 *
 * Two jobs, both UX (see the lazy-loading note in
 * CustomItemRendererLazy.tsx):
 *
 *  1. Content, not a spinner: the payload is already on the page (it
 *     came with the server render), so the skeleton shows the REAL
 *     instructions, starter code, and MCQ choices as plain text. A
 *     visitor starts reading the task immediately; only interactivity
 *     arrives later.
 *  2. Shape parity: the layout mirrors the card's chrome (header strip,
 *     instructions block, editor-sized code area, toolbar strip) so the
 *     swap to the mounted card barely moves the content below it.
 *
 * Everything here must stay cheap: no markdown pipeline, no CodeMirror,
 * no runtime imports — the whole point is that this module (unlike the
 * card graph) is small enough to ship in every bundle, including the
 * SSR/Worker one. `parseQuestion` is a small pure parser, safe to use.
 */

import { parseQuestion } from "../multipleChoice/parseQuestion";
import { adapterLabel, sqlDialectLabel } from "@/lib/custom-content/labels";
import type { CustomItemRendererProps } from "./CustomItemRenderer";

const CARD_CLS =
  "overflow-hidden rounded-xl border border-[var(--ds-gray-200)] bg-white text-[var(--ds-gray-800)] dark:border-white/10 dark:bg-white/[0.02] dark:text-[var(--ds-gray-200)]";
const HEADER_CLS =
  "flex items-center justify-between gap-3 border-b border-[var(--ds-gray-200)] px-4 py-3 dark:border-white/10";
const BADGE_CLS =
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]";
const LOADING_CLS =
  "animate-pulse text-[11px] font-medium text-[var(--ds-gray-400)]";

function LoadingHint({ label }: { label: string }) {
  return <span className={LOADING_CLS}>{label}</span>;
}

export default function CustomItemSkeleton({
  title,
  payload,
  badge,
}: CustomItemRendererProps) {
  if (payload.kind === "mcq") {
    // Parse once to echo the question body + choices as inert text. The
    // markdown source reads fine as plain text for the second or so the
    // skeleton is visible.
    const parsed = parseQuestion(payload.markdown);
    return (
      <section aria-busy="true" role="status" className={CARD_CLS}>
        <div className={HEADER_CLS}>
          <span className={BADGE_CLS}>{badge ?? "Question"}</span>
          <LoadingHint label="Loading…" />
        </div>
        <div className="px-4 py-4">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {parsed.body.trim()}
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {parsed.choices.map((choice) => (
              <li
                key={choice.id}
                className="rounded-lg border border-[var(--ds-gray-200)] px-3 py-2.5 text-sm opacity-70 dark:border-white/10"
              >
                {choice.text}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const isSql = payload.kind === "sql";
  const badgeLabel =
    badge ??
    (isSql
      ? `${sqlDialectLabel(payload.dialect)} · SQL Challenge`
      : `${adapterLabel(payload.adapter)} Challenge`);
  const starter = isSql
    ? payload.starterCode
    : (payload.files.find(
        (f) => f.filename === (payload.entryFilename ?? payload.files[0]?.filename),
      )?.starterCode ?? "");

  return (
    <section aria-busy="true" role="status" className={CARD_CLS}>
      <div className={HEADER_CLS}>
        <div className="min-w-0">
          <div className={BADGE_CLS}>{badgeLabel}</div>
          <div className="mt-0.5 truncate text-base font-semibold text-[var(--ds-gray-900)] dark:text-white">
            {title}
          </div>
        </div>
        <LoadingHint label="Loading editor…" />
      </div>
      <div className="border-b border-[var(--ds-gray-200)] px-4 py-3 dark:border-white/10">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {payload.instructions}
        </p>
      </div>
      {/* Editor-shaped block: sized to the mounted card's typical editor
          footprint (SQL cards run taller, they carry an engine status /
          table strip) so the swap barely moves the content below. */}
      <div
        className={`${isSql ? "min-h-[270px]" : "min-h-[260px]"} bg-[var(--ds-gray-50)] px-4 py-3 dark:bg-white/[0.03]`}
      >
        <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed opacity-80">
          {starter}
        </pre>
      </div>
      {/* Toolbar strip stand-in (Submit / Reset row on the real card). */}
      <div className="flex h-14 items-center border-t border-[var(--ds-gray-200)] px-4 dark:border-white/10">
        <span className={LOADING_CLS}>Preparing the interactive editor…</span>
      </div>
    </section>
  );
}
