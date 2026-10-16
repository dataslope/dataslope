import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, fmt, halo, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EXPERIMENT } from "./data";
import { Count, Headline, lerp, Marker, STAT, STAT_INK, Svg } from "./parts";

/** Every user as one square: 100 to a row, 60 rows, per arm. */
const COLS = 100;
const ROWS = EXPERIMENT.n / COLS;
const CELL = 4;
const GRID_TOP = 352;
const GRID_X = [160, 700];
/** The lift, B minus A, in percentage points. */
export const LIFT: XScale = { lo: -1, hi: 4, x0: 160, x1: 1260 };
export const LIFT_BASE = 852;
export const LIFT_ROW = 800;
const CARD_X = 1390;
const CARD_Y = [352, 452, 552, 652];

const pp = (v: number) => v * 100;
const num = (v: number) => Math.round(v).toLocaleString("en-US");

/** One arm's users, as two paths (bought, and didn't), revealed row by row. */
const Grid: React.FC<{ x: number; top: number; converted: Set<number>; fill: number; lit: number; color: string }> = ({
  x,
  top,
  converted,
  fill,
  lit,
  color,
}) => {
  const { h } = useLayout();
  const rowsShown = Math.ceil(fill * ROWS);
  if (rowsShown <= 0) return null;
  const ch = h(CELL);
  let off = "";
  let on = "";
  const litUpTo = lit * EXPERIMENT.n;
  for (let i = 0; i < rowsShown * COLS; i++) {
    const cx = x + (i % COLS) * CELL;
    const cy = top + Math.floor(i / COLS) * ch;
    const cell = `M${cx},${cy.toFixed(1)}h${CELL - 1}v${(ch - 1).toFixed(1)}h-${CELL - 1}z`;
    if (converted.has(i) && i < litUpTo) on += cell;
    else off += cell;
  }
  return (
    <Svg>
      <path d={off} fill={`color-mix(in srgb, ${INK_SOFT} 22%, ${PAPER})`} />
      <path d={on} fill={color} />
    </Svg>
  );
};

/**
 * One finished test, read in full: every user of the lesson's seed-42
 * experiment as a square, the buyers lit, the two rates, the lift with its
 * 95% interval on a scale of points, and the four numbers a report carries.
 */
export const ResultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const resultFrom = n.beat("result").from;
  const sixAt = n.word("result", "six thousand");
  const eachAt = n.word("result", "each arm");
  const oldAt = n.word("counts", "Five hundred");
  const oldButtonAt = n.word("counts", "old button");
  const newAt = n.word("counts", "Seven hundred");
  const nineAt = n.word("lift", "nine point six five");
  const elevenAt = n.word("lift", "eleven point seven");
  const liftAt = n.word("lift", "A lift");
  const fifthAt = n.word("lift", "fifth");
  const intervalAt = n.word("interval", "interval");
  const oneAt = n.word("interval", "one point");
  const threeAt = n.word("interval", "to three");
  const pAt = n.word("interval", "p-value");
  const tenThousandAt = n.word("interval", "ten thousand");
  const fourAt = n.word("four", "all four");
  const theLiftAt = n.word("four", "the lift");
  const itsIntervalAt = n.word("four", "its interval");
  const thePAt = n.word("four", "the p-value");
  const effectAt = n.word("four", "effect size");
  const aloneAt = n.word("four", "alone");

  const fill = ease(frame, sixAt - 6, Math.max(24, eachAt - sixAt + 6));
  const litA = ease(frame, oldAt - 4, 26);
  const litB = ease(frame, newAt - 4, 26);
  const lift = pp(EXPERIMENT.absLift);
  const dotIn = ease(frame, liftAt - 4, 12);
  const ci = ease(frame, intervalAt - 4, 18);
  const lo = lerp(lift, pp(EXPERIMENT.ciLow), ci);
  const hi = lerp(lift, pp(EXPERIMENT.ciHigh), ci);
  const rowY = y(LIFT_ROW);
  const gridH = h(ROWS * CELL);
  const top = y(GRID_TOP);

  const arms = [
    { g: "A", name: "the old button", x: GRID_X[0], set: EXPERIMENT.convertedA, lit: litA, at: oldAt, k: EXPERIMENT.xA, rate: EXPERIMENT.pA, rateAt: nineAt, color: INK_SOFT },
    { g: "B", name: "the new button", x: GRID_X[1], set: EXPERIMENT.convertedB, lit: litB, at: newAt, k: EXPERIMENT.xB, rate: EXPERIMENT.pB, rateAt: elevenAt, color: BAR },
  ] as const;

  const CARD = [
    { name: "Lift", value: `+${fmt(lift)} points`, extra: `+${Math.round(EXPERIMENT.relLift * 100)}% relative`, at: liftAt, mark: theLiftAt },
    { name: "95% interval", value: `${fmt(pp(EXPERIMENT.ciLow))} to ${fmt(pp(EXPERIMENT.ciHigh))} points`, extra: "", at: intervalAt, mark: itsIntervalAt },
    { name: "p-value", value: fmt(EXPERIMENT.p, 4), extra: "", at: pAt, mark: thePAt },
    { name: "Effect size", value: `Cohen's h = ${fmt(EXPERIMENT.h)}`, extra: "", at: effectAt - 6, mark: effectAt },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the users arriving, each arm's buyers, the lift, the interval, the report ── */}
      <Sfx name="el-sprinkle" at={sixAt - 6} level={-33} />
      <Sfx name="el-sprinkle" at={oldAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={newAt - 4} level={-34} />
      <Sfx name="el-tap" at={liftAt - 4} level={-28} />
      <Sfx name="el-pencil" at={intervalAt - 4} level={-33} />
      <Sfx name="el-tap" at={effectAt - 6} level={-30} />

      <Headline lead="Six thousand users," turn="in each arm." at={resultFrom - 6} turnAt={eachAt - 6} out={liftAt - 6} />
      <Headline lead="A lift of two points," turn="with an interval." at={liftAt - 2} turnAt={intervalAt - 6} />

      <FigLabel n="4" title="Every user in the test, one square each, the buyers lit" at={resultFrom - 2} x={160} y={y(300)} />

      {/* ── The users ── */}
      {arms.map((a) => (
        <React.Fragment key={a.g}>
          <Grid x={a.x} top={top} converted={a.set} fill={fill} lit={a.lit} color={a.color} />
          <Ink at={sixAt} dur={14} style={{ left: a.x, top: top + gridH + 14, whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK) }}>
              {a.g}: {a.name}
            </span>
          </Ink>
          <Ink at={a.at - 4} dur={12} style={{ left: a.x, top: top + gridH + 50, whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, a.g === "B" ? "var(--ds-blue-ink)" : INK), fontWeight: 700 }}>
              <Count to={a.k} at={a.at - 4} dur={26} format={num} />
            </span>
            <span style={{ ...note(22, INK_SOFT), marginLeft: 10 }}>of {num(EXPERIMENT.n)} bought</span>
          </Ink>
          <Ink at={a.rateAt - 4} dur={12} style={{ left: a.x + 300, top: top + gridH + 50, whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, INK), fontWeight: 700 }}>{fmt(pp(a.rate))}%</span>
          </Ink>
        </React.Fragment>
      ))}
      <Ink at={oldButtonAt} dur={10} style={{ left: (GRID_X[0] + COLS * CELL + GRID_X[1]) / 2 - 10, top: top + gridH / 2 - 14, whiteSpace: "nowrap" }}>
        <span style={{ ...note(20, INK_SOFT) }}>vs</span>
      </Ink>

      {/* ── The lift, and its interval ── */}
      <Ink at={liftAt - 6} dur={14} style={{ left: LIFT.x0, top: y(LIFT_ROW - 72), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>The lift, B minus A, in percentage points</span>
      </Ink>
      <Axis
        scale={LIFT}
        base={y(LIFT_BASE)}
        ticks={[-1, 0, 1, 2, 3, 4]}
        format={(v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0")}
        at={liftAt - 6}
      />
      <Svg opacity={ease(frame, liftAt - 4, 12)}>
        <line
          x1={sx(LIFT, 0)}
          x2={sx(LIFT, 0)}
          y1={y(LIFT_ROW - 34)}
          y2={y(LIFT_BASE)}
          stroke={INK}
          strokeWidth={1.8}
          strokeDasharray="6 5"
        />
      </Svg>
      {ci > 0 ? (
        <Svg>
          <line x1={sx(LIFT, lo)} x2={sx(LIFT, hi)} y1={rowY} y2={rowY} stroke={STAT} strokeWidth={6} strokeLinecap="round" />
          <line x1={sx(LIFT, lo)} x2={sx(LIFT, lo)} y1={rowY - 14} y2={rowY + 14} stroke={STAT} strokeWidth={3.5} strokeLinecap="round" />
          <line x1={sx(LIFT, hi)} x2={sx(LIFT, hi)} y1={rowY - 14} y2={rowY + 14} stroke={STAT} strokeWidth={3.5} strokeLinecap="round" />
        </Svg>
      ) : null}
      {dotIn > 0 ? (
        <Svg>
          <circle cx={sx(LIFT, lift)} cy={rowY} r={11 * dotIn} fill={STAT} stroke={PAPER} strokeWidth={2.5} />
        </Svg>
      ) : null}
      <Note at={liftAt + 2} x={sx(LIFT, lift)} y={rowY - 52} from="up">
        <span style={{ ...note(24, STAT_INK), fontWeight: 700, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", ...halo }}>
          +{fmt(lift)}
        </span>
      </Note>
      <Note at={oneAt - 4} x={sx(LIFT, pp(EXPERIMENT.ciLow))} y={rowY + 18} from="up">
        <span style={{ ...note(21, STAT_INK), fontWeight: 650, display: "inline-block", transform: "translateX(-50%)", ...halo }}>
          {fmt(pp(EXPERIMENT.ciLow))}
        </span>
      </Note>
      <Note at={threeAt - 4} x={sx(LIFT, pp(EXPERIMENT.ciHigh))} y={rowY + 18} from="up">
        <span style={{ ...note(21, STAT_INK), fontWeight: 650, display: "inline-block", transform: "translateX(-50%)", ...halo }}>
          {fmt(pp(EXPERIMENT.ciHigh))}
        </span>
      </Note>
      <Note at={liftAt + 6} x={sx(LIFT, 0) - 12} y={y(LIFT_ROW - 34)} align="right">
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>no difference</span>
      </Note>

      {/* ── The report: all four, never the p-value alone ── */}
      <Ink at={liftAt - 4} dur={14} style={{ left: CARD_X, top: y(300), whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 560 }}>The report</span>
      </Ink>
      <Svg opacity={ease(frame, liftAt - 2, 14)}>
        <line x1={CARD_X} x2={CARD_X + 400} y1={y(336)} y2={y(336)} stroke={INK} strokeWidth={2} />
      </Svg>
      {CARD.map((c, i) => (
        <React.Fragment key={c.name}>
          <Ink at={c.at - 2} dur={14} style={{ left: CARD_X, top: y(CARD_Y[i]), whiteSpace: "nowrap" }}>
            <span style={{ ...label(21, INK_SOFT) }}>
              <Marker at={c.mark - 4} off={c.mark + 26}>
                {c.name}
              </Marker>
            </span>
          </Ink>
          <Ink at={c.at + 4} dur={14} style={{ left: CARD_X, top: y(CARD_Y[i]) + 32, whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, i === 2 ? INK : STAT_INK), fontWeight: 700 }}>{c.value}</span>
          </Ink>
          {c.extra ? (
            <Ink at={fifthAt - 4} dur={14} style={{ left: CARD_X, top: y(CARD_Y[i]) + 72, whiteSpace: "nowrap" }}>
              <span style={{ ...note(21, INK_SOFT) }}>{c.extra}</span>
            </Ink>
          ) : null}
          <Svg opacity={0.5 * ease(frame, c.at + 6, 12)}>
            <line x1={CARD_X} x2={CARD_X + 400} y1={y(CARD_Y[i] + 92)} y2={y(CARD_Y[i] + 92)} stroke={HAIRLINE} strokeWidth={1} />
          </Svg>
        </React.Fragment>
      ))}
      <Ink at={tenThousandAt - 2} dur={12} style={{ left: CARD_X + 140, top: y(CARD_Y[2]) + 38, whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT) }}>three in ten thousand</span>
      </Ink>
      <Ink at={fourAt - 4} dur={14} out={aloneAt - 8} style={{ left: CARD_X, top: y(CARD_Y[3] + 104), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK) }}>Report all four together.</span>
      </Ink>
      <Ink at={aloneAt - 4} dur={14} style={{ left: CARD_X, top: y(CARD_Y[3] + 104), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650 }}>Never the p-value alone.</span>
      </Ink>
    </AbsoluteFill>
  );
};
