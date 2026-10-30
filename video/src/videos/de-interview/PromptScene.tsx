import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, body, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
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

type Layer = { name: string; at: number; until: number; chips: { at: number; text: React.ReactNode }[] };

/**
 * The opening. The page's prompt, "design a pipeline for X", is the
 * headline, with the meerkat, this video's hero, standing lookout beside it.
 * Then the four things interviewers probe, in the page's order, as a stack of
 * four layers from the query at the top down to the files at the bottom:
 * advanced SQL (which inks in first, as "a level deeper than an analyst
 * screen"), data modeling, pipelines and orchestration, systems and formats.
 * Each layer fills with its topics as they are said, and the layer being read
 * carries the highlighter's yellow.
 */
export const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("prompt").from;
  const forAt = n.word("prompt", "for X");
  const expectAt = n.word("expect", "Expect it");
  const sqlAt = n.word("expect", "next to sequel");
  const deeperAt = n.word("expect", "a level deeper");
  const fourAt = n.word("probe", "probe four things");
  const downAt = n.word("probe", "from the query down");
  const filesAt = n.word("probe", "to the files");
  const end = n.beat("probe-store").to;

  const layers: Layer[] = [
    {
      name: "Advanced SQL",
      at: sqlAt,
      until: n.beat("probe-model").from,
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
      until: end + 20,
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

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={expectAt} level={-31} />
      {layers.map((l) => (
        <Sfx key={l.name} name="el-tap" at={l.at} level={-31} />
      ))}
      <Sfx name="el-pencil" at={downAt} level={-35} />

      <Drift from={from} to={end + 40} scale={0.02}>
        <Kicker at={from}>Data engineer interview prep</Kicker>
        <Headline lead="Design a pipeline" turn="for X." at={from + 2} turnAt={forAt - 2} out={fourAt - 10} size={80} />
        <Headline lead="Four things," turn="from the query down to the files." at={fourAt} turnAt={downAt} size={60} />

        {/* The meerkat, standing lookout over the page as "Expect it" is said:
            330 by 403, under half its 833 by 1017 pixels, so it stays sharp
            at 4K. */}
        <Spot id="de-interview-meerkat" at={expectAt} left={1490} top={y(150)} width={330} height={403} amp={4} />

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
          const current = during(frame, l.at - 4, l.until, 10);
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
              <div style={{ width: NAME_W, flex: "none", ...note(32, INK), fontWeight: 650, lineHeight: 1.12 }}>{l.name}</div>
              <div style={{ position: "relative", flex: 1, display: "flex", flexWrap: "wrap", gap: "10px 12px", alignContent: "center" }}>
                {l.chips.map((c, k) => (frame >= c.at - 2 ? <Chip key={k} at={c.at} size={26}>{c.text}</Chip> : null))}
                {deeper > 0 ? (
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", ...body(30, true), color: INK, opacity: deeper, whiteSpace: "nowrap" }}>
                    a level deeper than an analyst screen
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
