import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WHERE } from "./data";
import { Drift, ElbowArrow, Listing, MARK_OK, Mono, X0 } from "./parts";

const SIZE = 24;
const LIST_Y = 300;
const LIST_W = 640;
const STEP_X = 880;
const STEP_Y = 300;
const STEP_PITCH = 62;
const FUNNEL_X = 1170;
const SQ = 15;
const SQ_GAP = 4;

/** The clauses in the order a query runs them, and the word that names each. */
const STEPS = [
  { clause: "FROM, JOIN", word: "From" },
  { clause: "WHERE", word: "WHERE" },
  { clause: "GROUP BY", word: "GROUP BY" },
  { clause: "HAVING", word: "HAVING" },
  { clause: "SELECT", word: "SELECT" },
  { clause: "DISTINCT", word: "DISTINCT" },
  { clause: "ORDER BY", word: "ORDER BY" },
  { clause: "LIMIT", word: "LIMIT" },
] as const;

/** Which step each line of the written query is, by its first keyword. */
const stepOf = (line: string) => STEPS.findIndex((s) => line.startsWith(s.clause.split(",")[0]));

/**
 * Question 2, the order a query runs in. The page's query as it is written,
 * each line badged with where it runs; the run order as a list of steps; and
 * the page's 24 orders going through the first four steps (24 rows, 11, 4
 * groups, 2). Then why WHERE can't see a SELECT alias and ORDER BY can.
 */
export const OrderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("order").from;
  const qAt = n.word("order", "Question");
  const textAt = n.word("order", "In what order");
  const notAt = n.word("order-list", "Not the order");
  const stepAt = STEPS.map((s) => n.word("order-list", s.word));
  const watchAt = n.word("order-demo", "Watch");
  const elevenAt = n.word("order-demo", "eleven");
  const fourAt = n.word("order-demo", "four regions");
  const twoAt = n.word("order-demo", "the two");
  const aliasAt = n.word("order-alias", "WHERE can't");
  const nameAt = n.word("order-alias", "a name");
  const canAt = n.word("order-alias", "ORDER BY can");
  const end = n.beat("joins-in").to;

  const lines = WHERE.both.lines;
  const g = { lineH: Math.round(SIZE * 1.8), padY: Math.round(SIZE * 0.66) };
  const rowY = (i: number) => y(STEP_Y + i * STEP_PITCH);
  // The funnel has been read by the time the aliases need its room.
  const funnelOut = ease(frame, aliasAt - 4, 14);

  // The page's orders, in the page's order; WHERE keeps the ones of 100 or more.
  const amounts = WHERE.orders.rows.map((r) => Number(r[1]));
  const big = amounts.map((a) => a >= 100);
  // Region groups after WHERE, and the two HAVING keeps.
  const groups = WHERE.bigGroups.rows.map((r) => ({ region: r[0], orders: Number(r[1]), revenue: r[2] }));
  const keptGroups = new Set(WHERE.both.rows.map((r) => r[0]));
  const selectLine = lines.findIndex((l) => l.startsWith("SELECT"));
  const orderLine = lines.findIndex((l) => l.startsWith("ORDER BY"));
  const arrowX = STEP_X + 220;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={stepAt[0]} level={-32} />
      <Sfx name="el-tap" at={stepAt[4]} level={-32} />
      <Sfx name="el-pop" at={elevenAt} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-32} />
      <Sfx name="el-pop" at={twoAt + 2} level={-32} />
      <Sfx name="el-pencil" at={canAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={Math.min(textAt - 4, qAt + 12)}>
          In what order does a query actually run?
        </QuestionCard>

        {/* ── The query as it is written, each line badged with its step ── */}
        <Listing
          lines={lines}
          x={X0}
          top={y(LIST_Y)}
          width={LIST_W}
          size={SIZE}
          at={notAt - 4}
          marks={[
            { line: selectLine, at: nameAt },
            { line: orderLine, at: canAt, color: MARK_OK },
          ]}
        />
        {lines.map((line, i) => {
          const s = stepOf(line);
          if (s < 0) return null;
          return (
            <Ink key={i} at={stepAt[s] + 2} dur={10} style={{ left: X0 + LIST_W - 52, top: y(LIST_Y) + g.padY + i * g.lineH + g.lineH / 2 - 15 }}>
              <StepBadge n={s + 1} />
            </Ink>
          );
        })}
        <Caption at={notAt - 4} x={X0} top={y(LIST_Y) - 40}>
          As you write it
        </Caption>
        <Caption at={stepAt[0] - 4} x={STEP_X} top={y(LIST_Y) - 40}>
          As it runs
        </Caption>

        {/* ── The run order ── */}
        {STEPS.map((s, i) => (
          <Ink key={s.clause} at={stepAt[i] - 4} dur={12} style={{ left: STEP_X, top: rowY(i), height: h(44), display: "flex", alignItems: "center", gap: 16 }}>
            <StepBadge n={i + 1} />
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, whiteSpace: "nowrap", fontVariantLigatures: "none" }}>
              {s.clause}
            </span>
          </Ink>
        ))}

        {/* ── The page's orders, going through ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - funnelOut }}>
          {amounts.map((_, i) => {
            const p = ease(frame, watchAt + i, 8);
            const cut = big[i] ? 0 : ease(frame, elevenAt, 12) * 0.7;
            return p > 0 ? (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: FUNNEL_X + i * (SQ + SQ_GAP),
                  top: rowY(0) + h(8),
                  width: SQ,
                  height: h(28),
                  borderRadius: 2,
                  background: big[i] ? BAR : INK_SOFT,
                  opacity: p * (1 - cut),
                }}
              />
            ) : null;
          })}
          <Count at={watchAt + 10} x={FUNNEL_X + amounts.length * (SQ + SQ_GAP) + 14} top={rowY(0) + h(4)}>
            {WHERE.rows} rows
          </Count>

          {big.flatMap((b, i) => (b ? [i] : [])).map((i, k) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: FUNNEL_X + k * (SQ + SQ_GAP),
                top: rowY(1) + h(8),
                width: SQ,
                height: h(28),
                borderRadius: 2,
                background: BAR,
                opacity: ease(frame, elevenAt + 2 + k, 8),
              }}
            />
          ))}
          <Count at={elevenAt + 8} x={FUNNEL_X + WHERE.bigRows * (SQ + SQ_GAP) + 14} top={rowY(1) + h(4)}>
            {WHERE.bigRows} rows
          </Count>

          {groups.map((grp, k) => (
            <Group key={grp.region} region={grp.region} at={fourAt + k * 3} x={FUNNEL_X + k * 112} top={rowY(2) + h(4)} />
          ))}
          <Count at={fourAt + 14} x={FUNNEL_X + groups.length * 112 + 4} top={rowY(2) + h(4)}>
            {groups.length} groups
          </Count>

          {groups
            .filter((grp) => keptGroups.has(grp.region))
            .map((grp, k) => (
              <Group key={grp.region} region={grp.region} at={twoAt + 4 + k * 3} x={FUNNEL_X + k * 112} top={rowY(3) + h(4)} kept />
            ))}
          <Count at={twoAt + 14} x={FUNNEL_X + keptGroups.size * 112 + 4} top={rowY(3) + h(4)}>
            {keptGroups.size} groups
          </Count>
        </div>

        {/* ── Names made in SELECT: too late for WHERE, ready for ORDER BY ── */}
        <ElbowArrow
          points={[
            [arrowX, rowY(4) + h(22)],
            [arrowX + 70, rowY(4) + h(22)],
            [arrowX + 70, rowY(1) + h(22)],
            [arrowX - 70, rowY(1) + h(22)],
          ]}
          at={aliasAt}
          color={ACCENT}
        />
        <Note at={aliasAt + 12} x={arrowX + 90} y={rowY(2) + h(14)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", fontWeight: 650 }}>
            <Mono>WHERE</Mono> can&apos;t use it
          </span>
        </Note>
        <ElbowArrow
          points={[
            [arrowX, rowY(4) + h(30)],
            [arrowX + 40, rowY(4) + h(30)],
            [arrowX + 40, rowY(6) + h(22)],
            [arrowX - 26, rowY(6) + h(22)],
          ]}
          at={canAt}
          color={OK}
        />
        <Note at={canAt + 10} x={arrowX + 60} y={rowY(5) + h(18)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", fontWeight: 650 }}>
            <Mono>ORDER BY</Mono> can
          </span>
        </Note>
        <Note at={nameAt + 4} x={arrowX + 90} y={rowY(4) + h(6)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mono>revenue</Mono> is named here
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** A step's number in a ring. */
const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 32,
      height: 32,
      borderRadius: 999,
      border: `2px solid ${INK}`,
      background: PAPER,
      ...label(19, INK),
      ...TABULAR,
      fontWeight: 700,
    }}
  >
    {n}
  </span>
);

/** A figure's small title, over its top. */
const Caption: React.FC<{ at: number; x: number; top: number; children: React.ReactNode }> = ({ at, x, top, children }) => (
  <Ink at={at} dur={12} style={{ left: x, top, whiteSpace: "nowrap" }}>
    <span style={label(21, INK_SOFT)}>{children}</span>
  </Ink>
);

/** A count beside a row of the funnel, inked on its word. */
const Count: React.FC<{ at: number; x: number; top: number; children: React.ReactNode }> = ({ at, x, top, children }) => (
  <Ink at={at} dur={10} style={{ left: x, top, whiteSpace: "nowrap" }}>
    <span style={{ ...note(24, INK), fontWeight: 650 }}>{children}</span>
  </Ink>
);

/** One region group, as a block with its name. */
const Group: React.FC<{ region: string; at: number; x: number; top: number; kept?: boolean }> = ({ region, at, x, top, kept }) => {
  const { h } = useLayout();
  return (
    <Ink at={at} dur={10} style={{ left: x, top }}>
      <div
        style={{
          width: 100,
          height: h(36),
          borderRadius: 4,
          border: `2px solid ${BAR}`,
          background: kept ? `color-mix(in srgb, ${BAR} 18%, ${PAPER})` : PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(20, INK),
        }}
      >
        {region}
      </div>
    </Ink>
  );
};
