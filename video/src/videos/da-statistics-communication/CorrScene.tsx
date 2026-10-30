import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, PAPER, TABULAR, fmt, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CORR } from "./data";
import {
  at,
  Axes,
  Dots,
  Drift,
  ElbowArrow,
  mulberry32,
  OK_INK,
  type Scale,
  Svg,
  WARM,
  WARM_INK,
} from "./parts";

const PLOT = { left: 220, right: 900, top: 380, base: 830 };
const NODE_W = 250;
const NODE_H = 64;

/** Drownings are counts, so days with the same count would sit on one row;
 *  each dot is nudged up or down a little, the same way on every frame. A day
 *  with none is only nudged up, so no dot sits below the axis. */
const JITTER = (() => {
  const r = mulberry32(2027);
  return CORR.days.map(([, , drown]) => {
    const j = (r() - 0.5) * 0.5;
    return drown === 0 ? Math.abs(j) : j;
  });
})();

/** A box with a name in it, for the causal sketch. */
const Node: React.FC<{ x: number; y: number; at: number; color?: string; children: React.ReactNode }> = ({ x, y, at: from, color = INK, children }) => (
  <Ink at={from} dur={14} style={{ left: x - NODE_W / 2, top: y - NODE_H / 2, width: NODE_W, height: NODE_H }}>
    <div
      style={{
        width: NODE_W,
        height: NODE_H,
        boxSizing: "border-box",
        border: `2px solid ${color}`,
        borderRadius: 10,
        background: PAPER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...note(26, color),
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  </Ink>
);

/**
 * Question 2. The video's own 200 days, after the page's example: ice cream
 * against drownings (r = 0.57), the hot days lighting up together in the top
 * right, then the causal sketch: temperature drives both (0.88 and 0.61),
 * and with it held fixed the link falls to 0.08.
 */
export const CorrScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("corr").from;
  const qAt = n.word("corr", "Question");
  const textAt = n.word("corr", "Explain");
  const asked = n.beat("corr").to;
  const daysAt = n.word("corr-ice", "Two hundred days");
  const drownAt = n.word("corr-ice", "more people drown");
  const rAt = n.word("corr-ice", "The correlation is");
  const notCauseAt = n.word("corr-heat", "doesn't cause");
  const bothAt = n.word("corr-heat", "Hot weather drives both");
  const swimAt = n.word("corr-heat", "more people swim");
  const hotAt = n.word("corr-heat", "The hot days");
  const confounderAt = n.word("corr-heat", "the confounder");
  const fixedAt = n.word("corr-fixed", "Hold temperature fixed");
  const vanishAt = n.word("corr-fixed", "point zero eight");
  const chanceAt = n.word("corr-fixed", "pure chance");
  const backwardsAt = n.word("corr-fixed", "the cause runs the other way");
  const experimentAt = n.word("corr-cause", "you need an experiment");
  const end = n.beat("corr-cause").to;

  const xs: Scale = { lo: 150, hi: 850, a: PLOT.left, b: PLOT.right };
  const ys: Scale = { lo: 0, hi: 12, a: y(PLOT.base), b: y(PLOT.top) };
  const dots = CORR.days.map(([temp, ice, drown], i) => ({
    x: at(xs, ice),
    y: at(ys, drown + JITTER[i]),
    at: daysAt + (i * (drownAt - daysAt + 20)) / CORR.days.length,
    turn: temp >= CORR.hot ? { color: WARM, at: hotAt + (i % 12) } : undefined,
  }));
  const hotDays = CORR.days.filter(([t]) => t >= CORR.hot).length;

  // The causal sketch.
  const heat = { x: 1440, y: y(420) };
  const ice = { x: 1190, y: y(660) };
  const drown = { x: 1690, y: y(660) };
  const linkY = ice.y;
  const linkFrom = ice.x + NODE_W / 2 + 10;
  const linkTo = drown.x - NODE_W / 2 - 10;
  const linkP = ease(frame, notCauseAt, 16);
  const arrows = [
    { to: ice, r: CORR.tempIce, at: bothAt + 4, side: -1 },
    { to: drown, r: CORR.tempDrown, at: swimAt, side: 1 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={daysAt} level={-34} />
      <Sfx name="el-pop" at={rAt + 4} level={-32} />
      <Sfx name="el-pencil" at={bothAt + 4} level={-34} />
      <Sfx name="el-pop" at={hotAt + 4} level={-32} />
      <Sfx name="el-scratch" at={vanishAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          Explain &ldquo;correlation does not imply causation&rdquo; with an example.
        </QuestionCard>

        {/* ── Ice cream against drownings ── */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[200, 400, 600, 800]}
          yTicks={[0, 4, 8, 12]}
          xTitle="ice creams sold that day"
          yTitle="drownings"
          at={asked - 6}
        />
        <Dots dots={dots} r={7} />
        <Note at={rAt - 2} x={PLOT.left + 30} y={y(PLOT.top) + h(10)}>
          <span style={{ ...note(34, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            r = {fmt(CORR.r)}
          </span>
        </Note>
        <Note at={hotAt + 6} x={PLOT.left + 30} y={y(PLOT.top) + h(62)}>
          <span style={{ ...note(24, WARM_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            ● the {hotDays} days at 30 °C or hotter
          </span>
        </Note>

        {/* ── Why: one cause behind both ── */}
        <Node x={ice.x} y={ice.y} at={notCauseAt - 6}>
          ice cream sales
        </Node>
        <Node x={drown.x} y={drown.y} at={notCauseAt - 2}>
          drownings
        </Node>
        <Svg opacity={linkP}>
          <line
            x1={linkFrom}
            x2={linkFrom + (linkTo - linkFrom) * linkP}
            y1={linkY}
            y2={linkY}
            stroke={ACCENT}
            strokeWidth={2.6}
            strokeDasharray="8 7"
          />
        </Svg>
        <Note at={notCauseAt + 4} x={(linkFrom + linkTo) / 2 - 200} width={400} y={linkY - h(52)} from="up" style={{ textAlign: "center" }}>
          {/* Still true, so never struck: at "Hold temperature fixed" it goes
              soft and says it is the raw link, beside the 0.08 under the line. */}
          <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...note(24, ACCENT_INK) }}>
            <span style={{ opacity: 1 - ease(frame, fixedAt, 12) }}>
              r = <Num>{fmt(CORR.r)}</Num>
            </span>
            <span style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", color: INK_SOFT, opacity: ease(frame, fixedAt, 12) }}>
              raw r = <Num>{fmt(CORR.r)}</Num>
            </span>
          </span>
        </Note>
        <Note at={vanishAt - 2} x={(linkFrom + linkTo) / 2 - 200} width={400} y={linkY + h(16)} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>{fmt(CORR.partial)}</span>
        </Note>
        <Note at={vanishAt + 4} x={(linkFrom + linkTo) / 2 - 200} width={400} y={linkY + h(54)} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>with temperature held fixed</span>
        </Note>

        <Node x={heat.x} y={heat.y} at={bothAt - 2} color={WARM_INK}>
          hot weather
        </Node>
        {arrows.map((a) => {
          const x0 = heat.x + a.side * 60;
          const y0 = heat.y + NODE_H / 2 + 8;
          const x1 = a.to.x - a.side * 20;
          const y1 = a.to.y - NODE_H / 2 - 10;
          return (
            <React.Fragment key={a.side}>
              <ElbowArrow points={[[x0, y0], [x1, y1]]} at={a.at} color={WARM} width={2.6} />
              <Note at={a.at + 8} x={(x0 + x1) / 2 + a.side * 28} y={(y0 + y1) / 2 - 18} align={a.side < 0 ? "right" : "left"}>
                <span style={{ ...note(22, WARM_INK), whiteSpace: "nowrap", ...TABULAR }}>r = {fmt(a.r)}</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={confounderAt - 2} x={heat.x - 200} width={400} y={heat.y - NODE_H / 2 - h(48)} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>the confounder</span>
        </Note>

        {/* The other two ways two things move together. */}
        <Note at={chanceAt - 2} x={1060} y={y(766)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            other links: pure chance
            <span style={{ opacity: ease(frame, backwardsAt - 2, 10) }}>, or a cause that runs backwards</span>
          </span>
        </Note>
        <Note at={experimentAt - 2} x={1060} y={y(812)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>To argue a cause: an experiment,</span>
          <br />
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>like an A/B test, or a careful causal design.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
