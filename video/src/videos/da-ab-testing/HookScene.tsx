import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { ds, inkOf } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32 } from "../da-statistics-communication/parts";
import { EXPERIMENT } from "./data";
import { Drift, Headline, Kicker, Spot, X0 } from "./parts";

/** B's lane: the categorical teal, so neither arm reads as right or wrong. */
const B_COLOR = ds("teal", 500);
const B_INK = inkOf.teal;
const DOTS = 44;
const FORK_X = 470;
const END_X = 960;
const MID_Y = 470;
const LANE = 92;
const TRAVEL = 70;

/** Which lane each user lands in: a seeded coin, the same on every frame. */
const COIN = (() => {
  const r = mulberry32(77);
  return Array.from({ length: DOTS }, () => (r() < 0.5 ? -1 : 1));
})();

/**
 * The opening, in this part's own figure: a stream of users, split at random
 * at a fork into A, the old version, and B, the new one, each lane ending on
 * the conversion rate the Statistics course's experiment measured. Then the
 * nineteen questions as two numbers, fifteen in full and four quick.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const teamsAt = n.word("hook", "Product teams");
  const splitAt = n.word("hook", "Split the users at random");
  const oldAt = n.word("hook", "the old version");
  const newAt = n.word("hook", "the new one");
  const measureAt = n.word("hook", "measure what changes");
  const abAt = n.word("hook", "That's an A B test");
  const readingAt = n.word("hook", "reading the result");
  const nineteenAt = n.word("plan", "nineteen questions");
  const fifteenAt = n.word("plan", "Fifteen get a full answer");
  const fourAt = n.word("plan", "the last four");
  const startsAt = n.word("metric-in", "It starts");
  const end = n.beat("metric-in").to;

  const laneY = (side: number) => y(MID_Y) + side * LANE;
  const spawn = (i: number) => splitAt - 6 + i * 4;

  // Each dot runs to the fork, then out along its lane, and stays at the end.
  const dots = COIN.map((side, i) => {
    const t = (frame - spawn(i)) / TRAVEL;
    if (t <= 0) return null;
    const p = Math.min(1, t);
    const forkAt = 0.42;
    const x = X0 + p * (END_X - X0) - (i % 6) * 14 * Math.min(1, Math.max(0, (t - 1) * 3));
    const turn = Math.min(1, Math.max(0, (p - forkAt) / 0.2));
    const eased = turn * turn * (3 - 2 * turn);
    const yy = y(MID_Y) + side * LANE * eased + ((i * 37) % 11) - 5;
    return { x, y: yy, side, done: p >= 1 };
  });

  const lanes = [
    { side: -1, color: BAR, ink: BLUE_INK, name: "A", what: "the old version", at: oldAt, rate: EXPERIMENT.rates[0] },
    { side: 1, color: B_COLOR, ink: B_INK, name: "B", what: "the new one", at: newAt, rate: EXPERIMENT.rates[1] },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={splitAt} level={-34} />
      <Sfx name="el-tap" at={oldAt} level={-34} />
      <Sfx name="el-tap" at={newAt} level={-34} />
      <Sfx name="el-pop" at={measureAt + 4} level={-32} />
      <Sfx name="el-pencil" at={nineteenAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="Two versions," turn="one honest reading." at={teamsAt - 4} turnAt={readingAt - 4} size={70} />

        <Spot id="da-ab-testing-fox" at={from + 4} left={1150} top={y(290)} width={640} height={460} />

        {/* ── One stream of users, split by a coin ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, splitAt - 8, 12)}>
            <path
              d={`M${X0},${y(MID_Y)} L${FORK_X},${y(MID_Y)} M${FORK_X},${y(MID_Y)} C${FORK_X + 90},${y(MID_Y)} ${FORK_X + 90},${laneY(-1)} ${FORK_X + 190},${laneY(-1)} L${END_X + 20},${laneY(-1)} M${FORK_X},${y(MID_Y)} C${FORK_X + 90},${y(MID_Y)} ${FORK_X + 90},${laneY(1)} ${FORK_X + 190},${laneY(1)} L${END_X + 20},${laneY(1)}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={1.4}
              strokeDasharray="3 7"
            />
          </g>
          {dots.map((d, i) =>
            d === null ? null : (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={9}
                fill={d.x > FORK_X + 60 ? (d.side < 0 ? BAR : B_COLOR) : INK_SOFT}
                opacity={0.85}
              />
            ),
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            left: FORK_X - 60,
            top: y(MID_Y) - 52,
            width: 120,
            textAlign: "center",
            ...label(20, INK_SOFT),
            opacity: ease(frame, splitAt + 4, 10),
          }}
        >
          at random
        </div>
        {lanes.map((l) => (
          <React.Fragment key={l.name}>
            <div
              style={{
                position: "absolute",
                left: FORK_X + 210,
                top: laneY(l.side) + (l.side < 0 ? -50 : 18),
                whiteSpace: "nowrap",
                opacity: ease(frame, l.at - 2, 12),
                ...note(26, l.ink),
              }}
            >
              <b>{l.name}</b>, {l.what}
            </div>
            <div
              style={{
                position: "absolute",
                left: END_X + 40,
                top: laneY(l.side) - 22,
                whiteSpace: "nowrap",
                opacity: ease(frame, measureAt + (l.side < 0 ? 0 : 6), 12),
                ...note(34, l.ink),
                fontWeight: 650,
                ...TABULAR,
              }}
            >
              {l.rate.toFixed(2)}%
            </div>
          </React.Fragment>
        ))}
        <div
          style={{
            position: "absolute",
            left: END_X + 40,
            top: y(MID_Y) - 16,
            whiteSpace: "nowrap",
            opacity: ease(frame, measureAt + 10, 12),
            ...label(19, INK_SOFT),
          }}
        >
          converted
        </div>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(MID_Y) + LANE + 70,
            whiteSpace: "nowrap",
            opacity: ease(frame, abAt - 2, 12),
            ...note(28, INK),
          }}
        >
          an <b>A/B test</b>: random groups, one change, one comparison
        </div>

        {/* ── Nineteen questions ── */}
        {[
          { at: fifteenAt, count: "15", text: "in full, with the numbers on screen", ink: INK },
          { at: fourAt, count: "4", text: "quick", ink: INK_SOFT },
        ].map((r, i) => {
          const p = ease(frame, r.at - 2, 12);
          const dim = ease(frame, startsAt + 2, 14) * 0.45;
          return (
            <div
              key={r.count}
              style={{
                position: "absolute",
                left: X0 + i * 700,
                top: y(MID_Y) + LANE + 150,
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                opacity: p * (1 - dim),
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <span style={{ ...note(64, r.ink), fontWeight: 700, ...TABULAR }}>{r.count}</span>
              <span style={{ ...note(28, r.ink), whiteSpace: "nowrap" }}>{r.text}</span>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(MID_Y) + LANE + 122,
            ...label(21, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, nineteenAt - 2, 12) * (1 - ease(frame, startsAt + 2, 14) * 0.45),
          }}
        >
          19 questions
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
