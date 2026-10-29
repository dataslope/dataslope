import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CohortGrid } from "./CohortGrid";
import { Drift, Headline, Kicker, pulse, Spot, X0 } from "./parts";

const GRID_TOP = 360;
const CELL = 128;
const CELL_H = 74;
const CHIPS_Y = 712;
const CHIP = 50;
const CHIP_GAP = 10;
/** Questions worked through on real queries; the rest at speed. */
const WORKED = 6;
const TOTAL = 15;

/**
 * The opening: the finished cohort chart first, filling in as its rows and
 * columns are described. Shares fall along each row (the tint fades), and
 * the outline traces why each newer row is shorter: it has had fewer months
 * of data, which is a different thing from users leaving. Then the promise
 * that each of its pieces is a question. Then the page's fifteen questions as
 * numbered chips, six filled for the worked ones and nine outlined for the
 * quick round; the first lights on the bridge into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const chartAt = n.word("hook", "a chart like this one");
  const rowAt = n.word("hook", "Each row is the users");
  const cellAt = n.word("hook-cells", "Each cell is the share");
  const laterAt = n.word("hook-cells", "a month later");
  const twoAt = n.word("hook-cells", "then two");
  const threeAt = n.word("hook-cells", "then three");
  const shorterAt = n.word("hook-cells", "each newer row is shorter");
  const fewerAt = n.word("hook-cells", "fewer months to measure");
  const classicAt = n.word("hook-sql", "a classic data science SQL question");
  const fifteenAt = n.word("plan", "fifteen questions");
  const sixAt = n.word("plan", "Six get a real query");
  const nineAt = n.word("plan", "The other nine");
  const firstAt = n.word("join-in", "The first piece");
  const end = n.beat("join-in").to;

  // Month zero fills with the rows; each later column on its word.
  const colAt = [rowAt + 10, laterAt, twoAt, threeAt];
  const chipX = (i: number) => X0 + i * (CHIP + CHIP_GAP) + (i >= WORKED ? 22 : 0);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={chartAt + 2} level={-34} />
      <Sfx name="el-tap" at={laterAt} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-34} />
      <Sfx name="el-tap" at={threeAt} level={-34} />
      <Sfx name="el-pencil" at={shorterAt + 2} level={-34} />
      <Sfx name="el-pop" at={sixAt} level={-34} />
      <Sfx name="el-pop" at={firstAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="One chart," turn="built one question at a time." at={from + 4} turnAt={classicAt} size={70} />

        <Spot id="ds-sql-seal" at={from + 8} left={1160} top={y(300)} width={640} height={440} />

        <CohortGrid
          x={X0}
          top={y(GRID_TOP)}
          cell={CELL}
          cellH={h(CELL_H)}
          at={chartAt - 4}
          rowsAt={rowAt}
          fill={(r, c) => colAt[c] + r * 3}
          stairAt={shorterAt}
          blankNote={{ at: fewerAt, text: "not reached yet" }}
          dim={fifteenAt}
        />
        {/* What each cell is: a share of the row's own first month. */}
        <div
          style={{
            position: "absolute",
            left: X0 + 96 + 4 * CELL + 30,
            top: y(GRID_TOP) + h(14),
            ...note(24, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, cellAt + 6, 12) * (1 - ease(frame, fifteenAt, 12)),
          }}
        >
          share of the
          <br />
          row still active
        </div>

        {/* ── Fifteen questions: six on real queries, nine quickly ── */}
        <div
          style={{ position: "absolute", left: X0, top: y(CHIPS_Y) - h(46), ...label(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, fifteenAt - 2, 12) }}
        >
          15 questions
        </div>
        {Array.from({ length: TOTAL }, (_, i) => {
          const p = ease(frame, fifteenAt - 2 + i * 1.2, 10);
          if (p <= 0) return null;
          const worked = i < WORKED;
          const tone = worked ? ease(frame, sixAt + i * 2, 10) : ease(frame, nineAt + (i - WORKED), 10);
          const first = i === 0 ? ease(frame, firstAt, 10) : 0;
          const fade = i === 0 ? 0 : ease(frame, firstAt + 4, 14) * 0.5;
          const fill = first > 0 ? ds("yellow", 400) : worked ? `color-mix(in srgb, ${BAR} ${25 + 75 * tone}%, ${PAPER})` : PAPER;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top: y(CHIPS_Y),
                width: CHIP,
                height: CHIP,
                borderRadius: CHIP / 2,
                background: fill,
                border: `2px solid ${worked || first > 0 ? "transparent" : `color-mix(in srgb, ${BAR} ${40 + 60 * tone}%, ${PAPER})`}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(21, worked && tone > 0.5 && first === 0 ? PAPER : INK),
                fontWeight: 700,
                ...TABULAR,
                opacity: p * (1 - fade),
                transform: `scale(${p * (1 + 0.15 * pulse(frame, firstAt, 16) * (i === 0 ? 1 : 0))})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: chipX(0),
            top: y(CHIPS_Y) + h(66),
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, sixAt - 2, 12) * (1 - ease(frame, firstAt + 4, 14) * 0.5),
          }}
        >
          <b>6</b> on real queries
        </div>
        <div
          style={{
            position: "absolute",
            left: chipX(WORKED),
            top: y(CHIPS_Y) + h(66),
            ...note(26, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, nineAt - 2, 12) * (1 - ease(frame, firstAt + 4, 14) * 0.5),
          }}
        >
          <b>9</b> quickly, at the end
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
