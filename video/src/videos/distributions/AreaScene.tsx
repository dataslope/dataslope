import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EXPONENTIAL, expPdf } from "./data";
import {
  areaD,
  Arrow,
  ASK,
  ASK_FILL,
  askNote,
  Centered,
  code,
  Count,
  Curve,
  curveD,
  DIST,
  DIST_FILL,
  Drift,
  Head,
  Kicker,
  lerp,
  pulse,
  Spot,
  Svg,
  YTicks,
} from "./parts";

const X: XScale = { lo: 0, hi: 20, x0: 200, x1: 1440 };
const BASE = 820;
const TALL = 400;
const EQ_X = 1120;

/**
 * Part 2 opens: waiting times as an exponential density. An exact value has
 * no width and so no probability; a range has area, shaded as it is named,
 * and the area is one CDF minus another.
 */
export const AreaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const exactFrom = n.beat("exact").from;
  const waitingAt = n.word("exact", "waiting times");
  const exponentialAt = n.word("exact", "exponential");
  const commonAt = n.word("exact", "common");
  const rareAt = n.word("exact", "rare");
  const averageAt = n.word("five-min", "average five minutes");
  const exactlyAt = n.word("five-min", "EXACTLY");
  const bitAt = n.word("zero", "five and a bit");
  const exactly2At = n.word("zero", "Exactly five");
  const zeroAt = n.word("zero", "zero");
  const widthAt = n.word("zero", "no width");
  const rangesAt = n.word("area", "ranges");
  const areaAt = n.word("area", "area under the curve");
  const betweenAt = n.word("area", "between two and eight");
  const percentAt = n.word("area", "forty-seven percent");
  const leftEightAt = n.word("cdf", "left of eight");
  const minusAt = n.word("cdf", "minus");
  const leftTwoEnd = n.word("cdf", "two", { edge: "end" });
  const heightAt = n.word("height-in", "height");
  const cantAt = n.word("height-in", "can't");

  const scale = EXPONENTIAL.scale;
  const f = (x: number) => expPdf(x, scale);
  const base = y(BASE);
  const unit = h(TALL) / EXPONENTIAL.pdf0;
  const py = (v: number) => base - v * unit;
  const curve = curveD(f, 0, 20, X, py);

  // The question at five, its sliver, and the range that answers.
  const px5 = sx(X, EXPONENTIAL.point);
  const lineIn = ease(frame, exactlyAt - 4, 12);
  const pointOut = ease(frame, rangesAt - 4, 12);
  const sliver = ease(frame, bitAt - 2, 12) * (1 - ease(frame, exactly2At - 2, 22));
  const sweep = ease(frame, betweenAt - 2, 34);
  const a = EXPONENTIAL.a;
  const b = EXPONENTIAL.b;
  const leftEight = ease(frame, leftEightAt - 4, 14);
  const lift = ease(frame, minusAt, 18);
  const hint = pulse(frame, commonAt - 6, 26);
  const tail = pulse(frame, rareAt - 6, 26);
  const dimFig = ease(frame, n.word("height-in", "Which") - 4, 14) * 0.25;

  return (
    <AbsoluteFill>
      {/* ── Sound: the curve drawn, the question at five, its zero, the range
           sweeping, the area left of two lifting away ── */}
      <Sfx name="el-pencil" at={exponentialAt - 6} level={-34} />
      <Sfx name="el-tap" at={exactlyAt - 4} level={-29} />
      <Sfx name="el-pop" at={zeroAt - 2} level={-30} />
      <Sfx name="el-whoosh" at={betweenAt - 2} level={-34} />
      <Sfx name="el-tap" at={minusAt} level={-30} />

      <Kicker at={exactFrom - 10}>Probability is area</Kicker>
      <Head parts={[{ text: "Measuring, not counting.", at: exactFrom - 4 }]} out={zeroAt - 6} />
      <Head parts={[{ text: "A single point holds nothing.", at: zeroAt - 2 }]} out={rangesAt - 8} />
      <Head
        parts={[
          { text: "Probability is", at: rangesAt - 4 },
          { text: "area.", at: areaAt - 2, italic: true },
        ]}
      />

      <Spot id="distributions-hourglass" at={waitingAt - 4} left={1530} top={y(88)} width={250} height={290} />

      <Drift from={exactFrom} to={n.beat("height-in").to + 40}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - dimFig }}>
          <FigLabel n="6" title="Waiting times, in minutes" at={waitingAt - 6} x={160} y={y(300)} />
          <Note at={averageAt} x={X.x1} y={y(304)} align="right">
            <span style={code(21, INK_SOFT)}>expon(scale={scale})</span>
          </Note>
          <YTicks ticks={[0.1, 0.2]} py={py} x0={X.x0} x1={X.x1} at={waitingAt} format={(v) => fmt(v, 1)} />
          <Ink at={waitingAt + 4} dur={12} style={{ left: X.x0 - 60, top: py(EXPONENTIAL.pdf0) - h(56), whiteSpace: "nowrap" }}>
            <span style={label(20, INK_SOFT)}>height</span>
          </Ink>
          <Axis scale={X} base={base} ticks={[0, 5, 10, 15, 20]} at={waitingAt - 4} />

          {/* Common short waits, rare long ones. */}
          <Svg>
            <path d={areaD(f, 0, 3, X, py)} fill={DIST_FILL} opacity={hint} />
            <path d={areaD(f, 11, 20, X, py)} fill={DIST_FILL} opacity={tail} />
          </Svg>
          {/* Clear of the curve, to its right, over the short waits it names. */}
          <Note at={commonAt - 2} x={sx(X, 1.5)} y={py(f(0.8)) - 40} out={rangesAt}>
            <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>short waits, common</span>
          </Note>
          <Note at={rareAt - 2} x={sx(X, 12.5)} y={py(f(12.5)) - 54} out={rangesAt}>
            <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>long ones, rare</span>
          </Note>

          {/* The area left of eight, then the part left of two lifting off. */}
          <Svg opacity={leftEight}>
            <path d={areaD(f, a, b, X, py)} fill={DIST_FILL} />
            <g transform={`translate(0, ${lift * h(70)})`} opacity={1 - lift}>
              <path d={areaD(f, 0, a, X, py)} fill={DIST_FILL} stroke={DIST} strokeWidth={1.5} strokeDasharray="5 5" />
            </g>
          </Svg>
          {/* The range's area, sweeping in from two to eight. */}
          {sweep > 0 ? (
            <Svg>
              <path d={areaD(f, a, lerp(a, b, sweep), X, py)} fill={ASK_FILL} />
              <line x1={sx(X, a)} x2={sx(X, a)} y1={base} y2={py(f(a))} stroke={ASK} strokeWidth={2} />
              <line x1={sx(X, lerp(a, b, sweep))} x2={sx(X, lerp(a, b, sweep))} y1={base} y2={py(f(lerp(a, b, sweep)))} stroke={ASK} strokeWidth={2} />
            </Svg>
          ) : null}
          <Curve d={curve} at={exponentialAt - 6} dur={30} />

          {/* Exactly five: a line with no width, and the sliver that shrinks into it. */}
          <Svg opacity={lineIn * (1 - pointOut)}>
            {sliver > 0.001 ? <path d={areaD(f, 5, 5 + 0.7 * sliver, X, py, 20)} fill={ASK_FILL} /> : null}
            <line x1={px5} x2={px5} y1={base} y2={lerp(base, py(f(5)), lineIn)} stroke={ASK} strokeWidth={2.4} />
            <circle cx={px5} cy={py(f(5))} r={5} fill={ASK} />
          </Svg>
          <Note at={exactlyAt} x={px5 + 16} y={py(f(5)) - h(150)} out={rangesAt - 4}>
            <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>exactly 5</span>
          </Note>
          <Note at={zeroAt - 2} x={px5 + 16} y={py(f(5)) - h(150) + 34} out={rangesAt - 4}>
            <span style={{ ...askNote(30), whiteSpace: "nowrap" }}>P(wait = 5) = 0</span>
          </Note>
          <Note at={widthAt - 2} x={px5 + 16} y={py(f(5)) - h(150) + 80} out={rangesAt - 4}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>no width, so no area</span>
          </Note>

          {/* The range's ends and its share. */}
          {[a, b].map((v, i) => (
            <Centered key={v} x={sx(X, v)} y={base + 34} opacity={ease(frame, betweenAt + i * 6, 10)} style={{ ...askNote(22) }}>
              {v}
            </Centered>
          ))}
          <Centered x={sx(X, 4.6)} y={py(f(4.6)) + h(60)} opacity={ease(frame, percentAt - 10, 10)} style={{ ...askNote(34), ...halo }}>
            <Count at={percentAt - 10} dur={16} to={EXPONENTIAL.between * 100} suffix="%" />
          </Centered>

          {/* The area as code. */}
          <Ink at={leftEightAt - 4} dur={14} style={{ left: EQ_X, top: y(470), whiteSpace: "nowrap" }}>
            <span style={code(28, INK)}>cdf({b})</span>
            <span style={{ ...note(22, INK_SOFT), marginLeft: 14 }}>area left of {b}: {fmt(EXPONENTIAL.cdfB, 3)}</span>
          </Ink>
          <Ink at={minusAt - 2} dur={14} style={{ left: EQ_X - 30, top: y(516), whiteSpace: "nowrap" }}>
            <span style={code(28, INK)}>− cdf({a})</span>
            <span style={{ ...note(22, INK_SOFT), marginLeft: 14 }}>left of {a}: {fmt(EXPONENTIAL.cdfA, 3)}</span>
          </Ink>
          <Ink at={leftTwoEnd} dur={14} style={{ left: EQ_X - 30, top: y(562), whiteSpace: "nowrap" }}>
            <span style={code(28, ASK)}>= {fmt(EXPONENTIAL.between, 3)}</span>
          </Ink>
        </div>

        {/* The height, which is not a probability. */}
        <Arrow from={[sx(X, 0.45), base - 4]} to={[sx(X, 0.45), py(f(0.45)) + 4]} at={heightAt - 6} dur={14} color={INK} width={2.4} />
        <Note at={heightAt} x={sx(X, 2.6)} y={py(0.19)}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap", background: PAPER, padding: "0 6px" }}>
            the height <span style={{ opacity: ease(frame, cantAt - 2, 10) }}>is not a probability</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
