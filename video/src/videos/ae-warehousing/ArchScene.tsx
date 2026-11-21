import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { Box, Drift, READ, Wire } from "./parts";

const COL_X = [120, 700, 1280];
const COL_W = 480;
const RULES = [650, 1230];
const NAME_Y = 330;
const LINE_Y = 384;
const LINE_STEP = 42;
const FIG_Y = 540;
const STORE_Y = 664;
const STORE_H = 52;

/** One line of a column, inking in on its words. */
const Line: React.FC<{ x: number; top: number; at: number; soft?: boolean; children: React.ReactNode }> = ({ x, top, at, soft, children }) => (
  <Note at={at} x={x} y={top}>
    <span style={{ ...note(soft ? 21 : 24, soft ? INK_SOFT : INK), whiteSpace: "nowrap" }}>{children}</span>
  </Note>
);

/**
 * Question 2. Three columns, a hairline between each: Snowflake's virtual
 * warehouses, sized by you, over one managed store; BigQuery's pool of slots
 * lent to each query, with no cluster at all; Redshift's provisioned nodes,
 * each holding its own slice of the data, and the note that Serverless and
 * RA3 have moved it toward separate storage.
 */
export const ArchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("arch").from;
  const qAt = n.word("arch", "Question two");
  const qTextAt = n.word("arch", "How do Snowflake");
  const snowAt = n.word("arch-snow", "Snowflake keeps storage apart");
  const defineAt = n.word("arch-snow", "compute clusters you define");
  const vwAt = n.word("arch-snow", "called virtual warehouses");
  const microAt = n.word("arch-snow", "manages its micro-partitions");
  const bqAt = n.word("arch-bq", "BigQuery is serverless");
  const noClusterAt = n.word("arch-bq", "no clusters to size");
  const byteAt = n.word("arch-bq", "You pay per byte scanned");
  const slotsAt = n.word("arch-bq", "reserved slots");
  const declareAt = n.word("arch-bq", "partitions and clusters the tables you declare");
  const rsAt = n.word("arch-rs", "Redshift is cluster-based");
  const nodesAt = n.word("arch-rs", "provisioned nodes");
  const keysAt = n.word("arch-rs", "distribution and sort keys you choose");
  const serverlessAt = n.word("arch-rs", "Redshift Serverless");
  const end = n.beat("arch-rs").to;

  const lineTop = (i: number) => y(LINE_Y) + i * h(LINE_STEP);
  const storeTop = y(STORE_Y);
  const storeH = h(STORE_H);
  const figBottom = y(FIG_Y) + h(110);

  // Snowflake: three warehouses of three sizes over one store.
  const sizes = [
    { t: "XS", w: 96, h: 56, x: 140 },
    { t: "M", w: 130, h: 76, x: 270 },
    { t: "L", w: 164, h: 96, x: 430 },
  ];
  // BigQuery: a pool of slots, a few lent to each query.
  const SLOT = 24;
  const SLOT_GAP = 9;
  const slots = Array.from({ length: 24 }, (_, i) => ({ c: i % 8, r: Math.floor(i / 8) }));
  const lent = new Set([1, 2, 9, 10, 17, 18]);
  const nodeXs = [1280, 1452, 1624];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={snowAt} level={-33} />
      <Sfx name="el-sprinkle" at={defineAt} level={-34} />
      <Sfx name="el-tap" at={bqAt} level={-33} />
      <Sfx name="el-sprinkle" at={noClusterAt} level={-34} />
      <Sfx name="el-pencil" at={slotsAt} level={-35} />
      <Sfx name="el-tap" at={rsAt} level={-33} />
      <Sfx name="el-sprinkle" at={nodesAt} level={-34} />
      <Sfx name="el-pencil" at={serverlessAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          How do Snowflake, BigQuery, and Redshift differ architecturally?
        </QuestionCard>

        {RULES.map((x, i) => (
          <ColumnRule key={x} x={x} top={y(NAME_Y)} height={storeTop + storeH - y(NAME_Y)} at={i === 0 ? bqAt : rsAt} />
        ))}

        {/* ── Snowflake ── */}
        <Note at={snowAt - 2} x={COL_X[0]} y={y(NAME_Y)}>
          <span style={{ ...label(30, INK), whiteSpace: "nowrap" }}>Snowflake</span>
        </Note>
        <Line x={COL_X[0]} top={lineTop(0)} at={vwAt}>
          Virtual warehouses you size
        </Line>
        <Line x={COL_X[0]} top={lineTop(1)} at={microAt}>
          Micro-partitions, managed for you
        </Line>
        {sizes.map((s, i) => (
          <React.Fragment key={s.t}>
            <Wire points={[[s.x + s.w / 2, figBottom + 2], [s.x + s.w / 2, storeTop - 2]]} at={defineAt + 6 + i * 4} />
            <Box x={s.x} y={figBottom - h(s.h)} w={s.w} h={h(s.h)} at={defineAt + i * 4} title={s.t} size={22} />
          </React.Fragment>
        ))}
        <Box x={COL_X[0]} y={storeTop} w={COL_W} h={storeH} at={snowAt + 6} title="Storage" tone="data" size={22} />

        {/* ── BigQuery ── */}
        <Note at={bqAt - 2} x={COL_X[1]} y={y(NAME_Y)}>
          <span style={{ ...label(30, INK), whiteSpace: "nowrap" }}>BigQuery</span>
        </Note>
        <Line x={COL_X[1]} top={lineTop(0)} at={noClusterAt}>
          Serverless: no clusters to size
        </Line>
        <Line x={COL_X[1]} top={lineTop(1)} at={byteAt}>
          Bytes scanned, or reserved slots
        </Line>
        <Line x={COL_X[1]} top={lineTop(2)} at={declareAt}>
          Partitions and clusters you declare
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {slots.map((s, i) => {
            const p = ease(frame, noClusterAt + 2 + i * 0.6, 8);
            if (p <= 0) return null;
            const on = lent.has(i) ? ease(frame, slotsAt + 2, 10) : 0;
            const x = COL_X[1] + 20 + s.c * (SLOT + SLOT_GAP);
            const yy = figBottom - 3 * (SLOT + SLOT_GAP) + SLOT_GAP + s.r * (SLOT + SLOT_GAP);
            return (
              <rect
                key={i}
                x={x}
                y={yy}
                width={SLOT}
                height={SLOT}
                rx={4}
                fill={`color-mix(in srgb, ${READ} ${Math.round(85 * on)}%, transparent)`}
                stroke={on > 0.5 ? inkOf.yellow : INK}
                strokeWidth={2}
                opacity={p}
              />
            );
          })}
        </svg>
        {/* A slot is compute, not data: lent slots are lit yellow, never blue. */}
        <Note at={noClusterAt + 10} x={COL_X[1] + 20 + 8 * (SLOT + SLOT_GAP) + 16} y={figBottom - h(100)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>A pool of slots,</span>
        </Note>
        <Note at={noClusterAt + 12} x={COL_X[1] + 20 + 8 * (SLOT + SLOT_GAP) + 16} y={figBottom - h(70)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>units of compute,</span>
        </Note>
        <Note at={noClusterAt + 14} x={COL_X[1] + 20 + 8 * (SLOT + SLOT_GAP) + 16} y={figBottom - h(40)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            lent to <span style={{ color: INK, fontWeight: 500 }}>each query</span>
          </span>
        </Note>
        <Wire points={[[COL_X[1] + 20 + 4 * (SLOT + SLOT_GAP) - SLOT_GAP / 2, figBottom + 2], [COL_X[1] + 20 + 4 * (SLOT + SLOT_GAP) - SLOT_GAP / 2, storeTop - 2]]} at={byteAt} />
        <Box x={COL_X[1]} y={storeTop} w={COL_W} h={storeH} at={bqAt + 6} title="Storage" tone="data" size={22} />

        {/* ── Redshift ── */}
        <Note at={rsAt - 2} x={COL_X[2]} y={y(NAME_Y)}>
          <span style={{ ...label(30, INK), whiteSpace: "nowrap" }}>Redshift</span>
        </Note>
        <Line x={COL_X[2]} top={lineTop(0)} at={nodesAt}>
          Provisioned nodes
        </Line>
        <Line x={COL_X[2]} top={lineTop(1)} at={keysAt}>
          Distribution and sort keys you choose
        </Line>
        <Line x={COL_X[2]} top={lineTop(2)} at={serverlessAt} soft>
          Serverless, RA3: toward separate storage
        </Line>
        {nodeXs.map((x, i) => (
          <Box
            key={x}
            x={x}
            y={y(FIG_Y) - h(10)}
            w={136}
            h={storeTop + storeH - (y(FIG_Y) - h(10))}
            at={nodesAt + 2 + i * 4}
            title="Node"
            sub={<span style={{ color: BLUE_INK }}>its own data</span>}
            size={22}
          />
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
