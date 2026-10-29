import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PIVOT, printed } from "./data";
import { Drift, MARK, MARK_KEY, Mono, pulse, Sheet, sheetGeometry, X0 } from "./parts";

const SHEET_Y = 330;
const ROW = 38;
const PANEL_X = 760;
const BOX_W = 500;
const BOX_H = 104;
const GAP = 24;

/** One of a pivot table's four field areas, with the field dropped into it. */
const Area: React.FC<{
  x: number;
  y: number;
  name: string;
  at: number;
  chip?: { text: string; at: number; swap?: { text: string; at: number } };
  lightAt?: number;
}> = ({ x, y, name, at: from, chip, lightAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  if (p <= 0) return null;
  const cp = chip ? ease(frame, chip.at, 14) : 0;
  const glow = lightAt === undefined ? 0 : pulse(frame, lightAt, 24);
  const swapped = chip?.swap && frame >= chip.swap.at;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: BOX_W,
        height: BOX_H,
        boxSizing: "border-box",
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 8,
        background: `color-mix(in srgb, ${MARK} ${glow * 100}%, ${PAPER})`,
        opacity: p,
        padding: "12px 16px",
      }}
    >
      <div style={{ ...label(20, INK_SOFT) }}>{name}</div>
      {chip && cp > 0 ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "6px 14px",
            borderRadius: 6,
            background: MARK_KEY,
            ...label(22, BLUE_INK),
            opacity: cp,
            transform: `translateY(${(1 - cp) * -24}px)`,
          }}
        >
          {swapped ? chip.swap?.text : chip.text}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Questions 1 and 2 on the video's own ten orders: the pivot table's four
 * field areas fill as the narration names them, then the cross-tab it
 * builds, region by month, where North in March is 290 from orders 6 and 9.
 * Switching the summary to a count turns every cell into its number of
 * orders, the same grid as COUNTIFS (check.mjs).
 */
export const PivotScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pivot").from;
  const qAt = n.word("pivot", "Question");
  const textAt = n.word("pivot", "What is a pivot table");
  const asked = n.beat("pivot").to;
  const groupsAt = n.word("pivot-what", "groups the rows");
  const aggAt = n.word("pivot-what", "aggregates the values");
  const dragAt = n.word("pivot-what", "GROUP BY that you can drag");
  const rowsAt = n.word("pivot-what", "Rows and columns hold the groups");
  const valuesAt = n.word("pivot-what", "values hold the sum");
  const filtersAt = n.word("pivot-what", "filters narrow it down");
  const exploreAt = n.word("pivot-what", "cross-tab in seconds");
  const q2At = n.word("crosstab", "Question two");
  const q2TextAt = n.word("crosstab", "How would you build");
  const regionAt = n.word("crosstab", "Region in rows");
  const monthAt = n.word("crosstab", "month in columns");
  const summedAt = n.word("crosstab", "revenue in values, summed");
  const northAt = n.word("crosstab", "North in March");
  const sqlAt = n.word("crosstab-count", "sum of case when");
  const countAt = n.word("crosstab-count", "Switch the summary to count");
  const twoAt = n.word("crosstab-count", "that cell says two");
  const end = n.beat("lookup-in").to;

  const g = sheetGeometry({ x: X0, top: y(SHEET_Y), widths: [50, 90, 104, 100], rows: 11, rowH: h(ROW) });
  const orders = PIVOT.orders.map((r) => r.map(String));
  // North in 2024-03: the orders the 290 is made of.
  const northMarch = PIVOT.orders.flatMap((r, i) => (i > 0 && r[1] === "North" && r[2] === PIVOT.months[2] ? [i + 1] : []));

  const boxY = (row: number) => y(SHEET_Y) + row * (h(BOX_H) + GAP);
  const pg = sheetGeometry({
    x: PANEL_X,
    top: boxY(2) + h(20),
    widths: [170, 110, 110, 110],
    rows: 4,
    rowH: h(ROW),
    firstCol: 5,
  });
  const header = (count: boolean) => [count ? "Count" : "Sum", ...PIVOT.months];
  const crossTab = [header(false), ...PIVOT.regions.map((region, i) => [region, ...PIVOT.grid[i].map((c) => printed(c.value))])];
  const swaps = [
    { r: 1, c: 0, at: countAt + 6, value: "Count" },
    ...PIVOT.countGrid.flatMap((row, i) => row.map((c, j) => ({ r: i + 2, c: j + 1, at: countAt + 8 + (i * 3 + j) * 2, value: printed(c.value) }))),
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={rowsAt + 4} level={-34} />
      <Sfx name="el-tap" at={valuesAt + 4} level={-34} />
      <Sfx name="el-sprinkle" at={summedAt + 4} level={-34} />
      <Sfx name="el-pop" at={northAt + 4} level={-32} />
      <Sfx name="el-pencil" at={countAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4}>
          What is a pivot table, and when do you use one?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2}>
          How would you build revenue by region and month?
        </QuestionCard>

        {/* ── The flat table ── */}
        <Sheet
          g={g}
          values={orders}
          at={asked - 8}
          cellAt={(r) => asked - 6 + (r - 1) * 2}
          bold={(r) => r === 1}
          size={20}
          fills={[
            ...Array.from({ length: 10 }, (_, i) => ({ r: i + 2, c: 1, at: groupsAt + i, out: aggAt + 4, color: MARK_KEY })),
            ...Array.from({ length: 10 }, (_, i) => ({ r: i + 2, c: 3, at: aggAt + i, out: rowsAt, color: MARK })),
            ...northMarch.flatMap((r, k) => [1, 2, 3].map((c) => ({ r, c, at: northAt + 6 + k * 6, color: MARK }))),
          ]}
        />
        <Note at={dragAt - 2} x={X0} y={g.bottom + h(20)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            SQL&apos;s <Mono>GROUP BY</Mono>, by dragging
          </span>
        </Note>

        {/* ── The four field areas ── */}
        <Area x={PANEL_X} y={boxY(0)} name="Filters" at={asked - 4} lightAt={filtersAt} />
        <Area x={PANEL_X + BOX_W + GAP} y={boxY(0)} name="Columns" at={asked - 2} chip={{ text: "month", at: rowsAt + 6 }} lightAt={monthAt} />
        <Area x={PANEL_X} y={boxY(1)} name="Rows" at={asked} chip={{ text: "region", at: rowsAt }} lightAt={regionAt} />
        <Area
          x={PANEL_X + BOX_W + GAP}
          y={boxY(1)}
          name="Values"
          at={asked + 2}
          chip={{ text: "Sum of revenue", at: valuesAt, swap: { text: "Count of revenue", at: countAt + 4 } }}
          lightAt={summedAt}
        />
        <Note at={exploreAt - 2} x={PANEL_X} y={boxY(2) - h(14)} out={q2At}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>to explore, or to cross-tab in seconds</span>
        </Note>

        {/* ── The cross-tab it builds ── */}
        <Sheet
          g={pg}
          values={crossTab}
          at={q2TextAt + 10}
          cellAt={(r, c) => summedAt + 2 + (r - 1) * 3 + c}
          bold={(r, c) => r === 1 || c === 0}
          size={21}
          swaps={swaps}
          fills={[{ r: 2, c: 3, at: northAt + 4, color: MARK }]}
        />
        <Note at={sqlAt - 2} x={PANEL_X} y={pg.bottom + h(20)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            in SQL: <Mono color={INK}>SUM(CASE WHEN …)</Mono>
          </span>
        </Note>
        <Note at={twoAt - 2} x={pg.colMid(3) + 70} y={pg.rowTop(2) + 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b>{printed(PIVOT.countGrid[0][2].value)}</b> orders made the {printed(PIVOT.grid[0][2].value)}
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
