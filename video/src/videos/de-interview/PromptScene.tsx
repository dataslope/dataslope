import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, body, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { partOf } from "./data";
import { Chip, Drift, Flow, Headline, Kicker, Mono, Spot } from "./parts";

/** The stack's left edge, its right edge, and the arrow beside it. */
const STACK_X = 184;
const STACK_R = 1440;
const ARROW_X = 128;
/** Each layer's top, in layout coordinates, and its height. */
const BAND_TOP = 300;
const BAND_H = 128;
const BAND_GAP = 18;
/** The layer's name column. */
const NAME_W = 300;
/** The bracket that takes in all four layers, right of the stack, and the
 *  design prompt set beside it, under the meerkat. */
const BRACKET_X = 1470;
const DESIGN_X = 1494;
/** The meerkat's box, at its image's aspect (833 by 1017): small, so the
 *  column right of the bracket keeps its white, and centred in that column,
 *  over 80px clear of the bracket's nub (1482) and the page's right edge. */
const MEERKAT_CX = 1655;
const MEERKAT_W = 180;
const MEERKAT_H = 220;

type Layer = {
  name: string;
  at: number;
  until: number;
  /** The topic videos that answer this layer's questions, by folder. */
  parts: string[];
  chips: { at: number; text: React.ReactNode }[];
};

/** "Parts 1–2" or "Parts 6, 8, 10": a run of two is a range, anything else a
 *  list. Each number in tabular figures, the dash and commas outside them. */
const PartsLabel: React.FC<{ parts: number[] }> = ({ parts }) => {
  const nums = parts.map((p) => <Num key={p}>{p}</Num>);
  const run = parts.length === 2 && parts[1] === parts[0] + 1;
  return (
    <>
      {parts.length > 1 ? "Parts " : "Part "}
      {run ? (
        <>
          {nums[0]}–{nums[1]}
        </>
      ) : (
        nums.flatMap((x, k) => (k ? [", ", x] : [x]))
      )}
    </>
  );
};

/**
 * The opening. The page's prompt, "design a pipeline for X", is the
 * headline, with the meerkat, this video's hero, standing lookout beside it.
 * Then the four things interviewers probe, in the page's order, as a stack of
 * four layers from the query at the top down to the files at the bottom:
 * advanced SQL (which inks in first, as "a level deeper than an analyst
 * screen"), data modeling, pipelines and orchestration, systems and formats.
 * Each layer fills with its topics as they are said, and the layer being read
 * carries the highlighter's yellow. Then the prompt comes back: a design
 * question draws on all four layers at once, so all four light and a bracket
 * takes them in, with the prompt beside it; each layer is labelled with the
 * parts that build it, and Part 11 as the one that walks a design through.
 */
export const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("prompt").from;
  const forAt = n.word("prompt", "for X");
  const expectAt = n.word("expect", "Expect it");
  const sqlAt = n.word("expect-sql", "comes sequel");
  const deeperAt = n.word("expect-sql", "a level deeper");
  const fourAt = n.word("probe", "probe four things");
  const downAt = n.word("probe", "from the query down");
  const filesAt = n.word("probe", "to the files");
  const designFrom = n.beat("probe-design").from;
  const designAt = n.word("probe-design", "Designing a pipeline for X");
  const allAt = n.word("probe-design", "all four layers");
  const buildsAt = n.word("probe-design", "builds each layer");
  const elevenAt = n.word("probe-design", "Part eleven walks");
  const end = n.beat("probe-design").to;

  const layers: Layer[] = [
    {
      name: "Advanced SQL",
      at: sqlAt,
      until: n.beat("probe-model").from,
      parts: ["de-sql-patterns", "de-sql-performance"],
      chips: [
        { at: n.word("probe-sql", "window functions"), text: "window functions" },
        { at: n.word("probe-sql", "qualify"), text: <Mono>QUALIFY</Mono> },
        { at: n.word("probe-sql", "deduplication"), text: "deduplication" },
        { at: n.word("probe-sql", "gaps and islands"), text: "gaps and islands" },
        { at: n.word("probe-sql", "incremental logic"), text: "incremental logic" },
      ],
    },
    {
      name: "Data modeling",
      at: n.word("probe-model", "Data modeling"),
      until: n.beat("probe-pipe").from,
      parts: ["de-dimensional-modeling", "de-modeling-history"],
      chips: [
        { at: n.word("probe-model", "star or snowflake schemas"), text: "star or snowflake schemas" },
        { at: n.word("probe-model", "facts and dimensions"), text: "facts and dimensions" },
        { at: n.word("probe-model", "normalization trade-offs"), text: "normalization trade-offs" },
        { at: n.word("probe-model", "slowly changing dimensions"), text: "slowly changing dimensions" },
      ],
    },
    {
      name: "Pipelines & orchestration",
      at: n.word("probe-pipe", "Pipelines and orchestration"),
      until: n.beat("probe-store").from,
      parts: ["de-pipelines", "de-streaming", "de-orchestration"],
      chips: [
        { at: n.word("probe-pipe", "batch or streaming"), text: "batch or streaming" },
        { at: n.word("probe-pipe", "idempotency"), text: "idempotency" },
        { at: n.word("probe-pipe", "backfills"), text: "backfills" },
        { at: n.word("probe-pipe", "scheduling in Airflow or Dagster"), text: "scheduling: Airflow, Dagster" },
      ],
    },
    {
      name: "Systems & formats",
      at: n.word("probe-store", "systems and formats"),
      until: designFrom,
      parts: ["de-distributed", "de-warehousing"],
      chips: [
        { at: n.word("probe-store", "columnar files like Parquet"), text: "columnar files (Parquet)" },
        { at: n.word("probe-store", "partitioning and file sizes"), text: "partitioning, file sizes" },
        { at: n.word("probe-store", "warehouse or lakehouse"), text: "warehouse or lakehouse" },
        { at: n.word("probe-store", "and cost"), text: "cost" },
      ],
    },
  ];

  const bandY = (i: number) => y(BAND_TOP) + i * (h(BAND_H) + h(BAND_GAP));
  const firstChip = layers[0].chips[0].at;
  // All four at once, on "all four layers", held to the cut.
  const all = ease(frame, allAt - 4, 12);
  const stackTop = bandY(0);
  const stackBottom = bandY(3) + h(BAND_H);
  // The prompt beside the bracket sits under the meerkat, and the bracket's
  // nub points at it.
  const designTop = bandY(2) + 20;
  const nubY = designTop + 22;
  const bracket = ease(frame, allAt - 2, 18);
  const partsIn = (i: number) => ease(frame, buildsAt + i * 3, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={expectAt} level={-31} />
      {layers.map((l) => (
        <Sfx key={l.name} name="el-tap" at={l.at} level={-31} />
      ))}
      <Sfx name="el-pencil" at={downAt} level={-35} />
      <Sfx name="el-pencil" at={allAt} level={-35} />

      <Drift from={from} to={end + 40} scale={0.02}>
        {/* Inked before frame 0, so the video's first frame (its poster) is
            not a blank page. */}
        <Kicker at={-14}>Data engineer interview questions</Kicker>
        <Headline lead="Design a pipeline" turn="for X." at={from + 2} turnAt={forAt - 2} out={fourAt - 10} size={80} />
        <Headline lead="Four things," turn="from the query down to the files." at={fourAt} turnAt={downAt} size={60} />

        {/* The meerkat, standing lookout over the page as "Expect it" is said,
            level with the headline and well above the design prompt that
            later stands in the same column. The page's one image. */}
        <Spot id="de-interview-meerkat" at={expectAt} left={MEERKAT_CX - MEERKAT_W / 2} top={y(150)} width={MEERKAT_W} height={MEERKAT_H} amp={3} />

        {/* From the query down to the files: an arrow down the stack's left. */}
        <div
          style={{
            position: "absolute",
            left: ARROW_X - 40,
            width: 80,
            top: bandY(0) - 40,
            textAlign: "center",
            ...label(20, INK_SOFT),
            opacity: ease(frame, downAt - 2, 12),
          }}
        >
          query
        </div>
        <Flow
          points={[
            [ARROW_X, bandY(0) - 6],
            [ARROW_X, bandY(3) + h(BAND_H) + 4],
          ]}
          at={downAt + 2}
          dur={Math.max(16, filesAt - downAt)}
          color={INK_SOFT}
          width={2}
        />
        <div
          style={{
            position: "absolute",
            left: ARROW_X - 40,
            width: 80,
            top: bandY(3) + h(BAND_H) + 14,
            textAlign: "center",
            ...label(20, INK_SOFT),
            opacity: ease(frame, filesAt, 12),
          }}
        >
          files
        </div>

        {layers.map((l, i) => {
          const p = ease(frame, l.at - 4, 14);
          if (p <= 0) return null;
          const current = Math.max(during(frame, l.at - 4, l.until, 10), all * 0.6);
          // The first layer speaks for SQL "a level deeper than an analyst
          // screen" until its own topics start.
          const deeper = i === 0 ? ease(frame, deeperAt - 2, 12) * (1 - ease(frame, firstChip - 12, 10)) : 0;
          return (
            <div
              key={l.name}
              style={{
                position: "absolute",
                left: STACK_X,
                top: bandY(i),
                width: STACK_R - STACK_X,
                height: h(BAND_H),
                boxSizing: "border-box",
                border: `1.5px solid ${HAIRLINE}`,
                borderRadius: 12,
                background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(current * 45)}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                padding: "0 28px",
                gap: 24,
                opacity: p,
                transform: `translateY(${(1 - p) * -12}px)`,
              }}
            >
              <div style={{ width: NAME_W, flex: "none" }}>
                <div style={{ ...note(32, INK), fontWeight: 650, lineHeight: 1.12 }}>{l.name}</div>
                {/* The parts open a line under the name as they ink in, so
                    the name rises to make room and the two stay centred in
                    the band together. */}
                <div
                  style={{
                    ...label(21, BLUE_INK),
                    lineHeight: "26px",
                    height: 26 * partsIn(i),
                    marginTop: 6 * partsIn(i),
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    opacity: partsIn(i),
                  }}
                >
                  <PartsLabel parts={l.parts.map(partOf)} />
                </div>
              </div>
              <div style={{ position: "relative", flex: 1, display: "flex", flexWrap: "wrap", gap: "10px 12px", alignContent: "center" }}>
                {l.chips.map((c, k) => (frame >= c.at - 2 ? <Chip key={k} at={c.at} size={26}>{c.text}</Chip> : null))}
                {/* Inter at the layer name's size, not the serif: the two
                    share the band's one line, so they share one face. */}
                {deeper > 0 ? (
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", ...note(30, INK_SOFT), opacity: deeper, whiteSpace: "nowrap" }}>
                    a level deeper than an analyst screen
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* All four layers at once: a bracket down the stack's right, its
            nub pointing at the prompt it answers. */}
        {bracket > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path
              d={`M ${BRACKET_X - 12} ${stackTop} H ${BRACKET_X} V ${stackBottom} H ${BRACKET_X - 12} M ${BRACKET_X} ${nubY} H ${BRACKET_X + 12}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={`${bracket} 1`}
            />
          </svg>
        ) : null}
        <div style={{ position: "absolute", left: DESIGN_X + 6, top: designTop, width: 1900 - DESIGN_X }}>
          <div style={{ ...body(32, true), color: INK, whiteSpace: "nowrap", opacity: ease(frame, designAt - 2, 12) }}>design a pipeline for X</div>
          <div style={{ ...label(21, BLUE_INK), marginTop: 8, opacity: ease(frame, elevenAt - 2, 12) }}>
            <PartsLabel parts={[partOf("de-pipelines-for-ai")]} /> walks one through
          </div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
