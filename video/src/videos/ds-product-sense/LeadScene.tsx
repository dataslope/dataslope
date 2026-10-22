import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { SERIF } from "../../editorial/fonts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GOODHART, LEAD } from "./data";
import { at, Axes, Bracket, Clear, DATA, Drift, madeUp, Mark, type Scale, Svg, VLine, WARM, WARM_INK, X0 } from "./parts";

const CHART = { x0: X0 + 70, x1: 1060, top: 360, bottom: 740 };
const SIDE_X = 1180;
const BARS = { top: 470, h: 250, w: 120 };

/** A weekly line, drawn up to week `upTo` (fractional weeks ease along). */
const Line: React.FC<{ xs: Scale; ys: Scale; values: readonly number[]; upTo: number; color: string; width?: number }> = ({
  xs,
  ys,
  values,
  upTo,
  color,
  width = 3.6,
}) => {
  if (upTo <= 1) return null;
  const pts: [number, number][] = [];
  values.forEach((v, i) => {
    const wk = i + 1;
    if (wk <= upTo) pts.push([at(xs, wk), at(ys, v)]);
    else if (wk - 1 < upTo) {
      const t = upTo - (wk - 1);
      const [px, py] = [at(xs, wk - 1), at(ys, values[i - 1])];
      pts.push([px + (at(xs, wk) - px) * t, py + (at(ys, v) - py) * t]);
    }
  });
  return (
    <path
      d={pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
};

/** One bar of a before-and-after pair, growing from the baseline on `at`. */
const Bar: React.FC<{ x: number; base: number; height: number; at: number; color: string; value: string; name: string; ink: string }> = ({
  x,
  base,
  height,
  at: from,
  color,
  value,
  name,
  ink,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 16);
  if (p <= 0) return null;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: base - height * p, width: BARS.w, height: height * p, background: color, borderRadius: "4px 4px 0 0", opacity: 0.88 }} />
      <div style={{ position: "absolute", left: x - 40, width: BARS.w + 80, top: base - height * p - 40, textAlign: "center", ...note(28, ink), fontWeight: 700, ...TABULAR, opacity: ease(frame, from + 8, 10) }}>
        {value}
      </div>
      <div style={{ position: "absolute", left: x - 40, width: BARS.w + 80, top: base + 10, textAlign: "center", ...label(21, INK_SOFT), opacity: p }}>{name}</div>
    </>
  );
};

/**
 * Questions 3 and 4. Leading and lagging as two weekly lines from the made-up
 * app: an onboarding change in week 3 shows in week-one cooking the next week
 * and in month-three retention twelve weeks after that. Then Goodhart's law on
 * support tickets: time to close falls from 9 hours to 3 while reopened
 * tickets climb from 4% to 15%, the counter-metric that catches it.
 */
export const LeadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lead").from;
  const qAt = n.word("lead", "Question");
  const textAt = n.word("lead", "Leading versus lagging");
  const leadDefAt = n.word("lead", "A leading indicator moves before");
  const leadExAt = n.word("lead", "cooking in the first week");
  const lagDefAt = n.word("lead", "A lagging one confirms it");
  const lagExAt = n.word("lead", "retention at month three");
  const changeAt = n.word("lead-gap", "an onboarding change lands");
  const leadDropAt = n.word("lead-gap", "Week-one cooking drops");
  const lagDropAt = n.word("lead-gap", "doesn't show it for twelve more");
  const steerAt = n.word("lead-gap", "You steer by the leading line");
  const causesAt = n.word("lead-gap", "actually causes the outcome");
  const corrAt = n.word("lead-gap", "just correlated");
  const q4At = n.word("goodhart", "Question four");
  const q4TextAt = n.word("goodhart", "What is Goodhart's law");
  const lawAt = n.word("goodhart", "When a measure becomes a target");
  const stopsAt = n.word("goodhart", "stops being a good measure");
  const rewardAt = n.word("goodhart", "Reward support agents");
  const earlyAt = n.word("goodhart", "before the problem is solved");
  const closeAt = n.word("goodhart", "Time to close falls");
  const threeAt = n.word("goodhart", "to three");
  const reopenAt = n.word("goodhart", "Reopened tickets climb");
  const fifteenAt = n.word("goodhart", "to fifteen");
  const counterAt = n.word("goodhart", "the counter-metric");
  const handsAt = n.word("save-in", "hands you");
  const featureAt = n.word("save-in", "a feature");
  const end = n.beat("save-in").to;

  const out3 = q4At - 4;
  const xs: Scale = { lo: 1, hi: 20, a: CHART.x0, b: CHART.x1 };
  const ys: Scale = { lo: 0.15, hi: 0.45, a: y(CHART.bottom), b: y(CHART.top) };
  const change = LEAD.change + 0.5;
  const leadUp = 1 + (LEAD.change - 1) * ease(frame, leadDefAt, 18) + (20 - LEAD.change) * ease(frame, leadDropAt, 40);
  const lagUp = 1 + (LEAD.change - 1) * ease(frame, lagDefAt, 18) + (20 - LEAD.change) * ease(frame, lagDropAt - 4, 50);
  const o3 = 1 - ease(frame, out3, 10);
  const dropLead = LEAD.change + 1;
  const dropLag = LEAD.change + 1 + LEAD.lagWeeks;
  const base = y(BARS.top) + h(BARS.h);
  const hourScale = h(BARS.h) / GOODHART.closeHoursWas;
  const pctScale = h(BARS.h) / GOODHART.reopenNow;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={leadDefAt} level={-34} />
      <Sfx name="el-pencil" at={lagDefAt} level={-34} />
      <Sfx name="el-tap" at={changeAt + 2} level={-32} />
      <Sfx name="slide" at={leadDropAt} level={-32} />
      <Sfx name="slide" at={lagDropAt} level={-32} />
      <Sfx name="el-pop" at={lawAt} level={-32} />
      <Sfx name="el-tap" at={closeAt + 2} level={-34} />
      <Sfx name="el-tap" at={reopenAt + 2} level={-34} />
      <Sfx name="el-pencil" at={counterAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={out3} size={60}>
          Leading versus lagging indicators: why does the distinction matter?
        </QuestionCard>

        {/* ── Question 3: two weekly lines, one lagging the other ── */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[1, 5, 10, 15, 20]}
          yTicks={[0.2, 0.3, 0.4]}
          xFormat={(v) => `week ${v}`}
          yFormat={(v) => `${Math.round(v * 100)}%`}
          at={leadDefAt - 6}
          out={out3}
        />
        <Svg opacity={o3}>
          <Line xs={xs} ys={ys} values={LEAD.leading} upTo={leadUp} color={DATA} />
          <Line xs={xs} ys={ys} values={LEAD.lagging} upTo={lagUp} color={WARM} />
        </Svg>
        <Note at={leadDefAt + 10} x={at(xs, 1)} y={at(ys, LEAD.leading[0]) - h(48)} out={out3}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>week-one cooking</span>
        </Note>
        <Note at={lagDefAt + 10} x={at(xs, 1)} y={at(ys, LEAD.lagging[0]) - h(48)} out={out3}>
          <span style={{ ...label(22, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>month-three retention</span>
        </Note>
        <VLine
          x={at(xs, change)}
          top={y(CHART.top) - h(20)}
          bottom={y(CHART.bottom)}
          at={changeAt}
          out={out3}
          color={INK}
          dash="7 6"
          width={2}
          label={<span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>onboarding change</span>}
          labelY={y(CHART.top) - h(44)}
        />
        <Bracket x0={at(xs, dropLead)} x1={at(xs, dropLag)} y={at(ys, 0.3)} at={lagDropAt + 10} out={out3} color={INK}>
          <span style={{ ...label(22, INK), fontWeight: 700, ...TABULAR }}>{LEAD.lagWeeks} weeks later</span>
        </Bracket>
        <Note at={leadDefAt + 4} x={CHART.x0} y={y(CHART.bottom) + h(64)} out={out3}>
          <span style={madeUp()}>the made-up app, with simulated week-to-week noise</span>
        </Note>

        <Note at={leadDefAt} x={SIDE_X} y={y(360)} out={out3}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>leading</b>: moves before the outcome
          </span>
        </Note>
        <Note at={leadExAt} x={SIDE_X + 24} y={y(404)} out={out3}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>cooking in the first week</span>
        </Note>
        <Note at={lagDefAt} x={SIDE_X} y={y(460)} out={out3}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: WARM_INK }}>lagging</b>: confirms it afterwards
          </span>
        </Note>
        <Note at={lagExAt} x={SIDE_X + 24} y={y(504)} out={out3}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>retention at month three</span>
        </Note>
        <Note at={steerAt} x={SIDE_X} y={y(590)} out={out3}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={steerAt + 6} out={causesAt}>
              steer by the leading line
            </Mark>
          </span>
        </Note>
        <Note at={causesAt} x={SIDE_X} y={y(642)} out={out3}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>if it causes the outcome,</span>
        </Note>
        <Note at={corrAt} x={SIDE_X} y={y(684)} out={out3}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>not just correlates with it</span>
        </Note>

        {/* ── Question 4: Goodhart's law, cleared on the bridge ── */}
        <Clear at={featureAt}>
          <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} size={60}>
            What is Goodhart&apos;s law?
          </QuestionCard>
          <Note at={lawAt - 2} x={X0} y={y(300)}>
            <span style={{ fontFamily: SERIF, fontSize: 40, fontStyle: "italic", color: INK, whiteSpace: "nowrap" }}>
              When a measure becomes a target,{" "}
              <span style={{ opacity: ease(frame, stopsAt - 2, 12) }}>it stops being a good measure.</span>
            </span>
          </Note>
          <Note at={rewardAt} x={X0} y={y(380)}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
              reward closing tickets fast
              <span style={{ opacity: ease(frame, earlyAt, 10) }}>, and some close before it&apos;s solved</span>
            </span>
          </Note>
          <Note at={closeAt - 2} x={X0} y={y(BARS.top) - h(10)}>
            <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>median time to close</span>
          </Note>
          <Bar x={X0 + 30} base={base} height={GOODHART.closeHoursWas * hourScale} at={closeAt} color={DATA} value={`${GOODHART.closeHoursWas} h`} name="before" ink={BLUE_INK} />
          <Bar x={X0 + 210} base={base} height={GOODHART.closeHoursNow * hourScale} at={threeAt - 2} color={DATA} value={`${GOODHART.closeHoursNow} h`} name="after" ink={BLUE_INK} />
          <Note at={reopenAt - 2} x={760} y={y(BARS.top) - h(10)}>
            <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              <Mark at={handsAt} color={`color-mix(in srgb, ${ACCENT} 22%, transparent)`}>
                tickets reopened
              </Mark>
            </span>
          </Note>
          <Bar x={790} base={base} height={GOODHART.reopenWas * pctScale} at={reopenAt} color={ACCENT} value={`${GOODHART.reopenWas}%`} name="before" ink={ACCENT_INK} />
          <Bar x={970} base={base} height={GOODHART.reopenNow * pctScale} at={fifteenAt - 2} color={ACCENT} value={`${GOODHART.reopenNow}%`} name="after" ink={ACCENT_INK} />
          <Note at={counterAt} x={1210} y={y(BARS.top) + h(60)}>
            <span style={{ ...note(30, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>← the counter-metric</span>
          </Note>
          <Note at={counterAt + 6} x={1210} y={y(BARS.top) + h(110)}>
            <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>that catches it</span>
          </Note>
          <Note at={closeAt} x={X0} y={base + h(56)}>
            <span style={madeUp()}>made up for this video</span>
          </Note>
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
