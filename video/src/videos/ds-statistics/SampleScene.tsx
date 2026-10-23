import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Bars, NormalCurve } from "../../editorial/charts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label } from "../../editorial/style";
import { Leader, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SAMPLE } from "./data";
import { at, Axes, Bracket, Drift, Mark, mulberry32, noteText, OK, OK_INK, partLabel, type Scale, Svg, VLine, X0 } from "./parts";

/** The value axis every part of the figure shares: the population, the one
 *  sample, and the pile of sample means. */
const XS: Scale = { lo: 0, hi: 32, a: X0, b: 1100 };
const POP_BASE = 540;
const POP_H = 190;
const STRIP_Y = 612;
const PILE_BASE = 862;
const PILE_H = 168;
const RIGHT_X = 1200;
/** Means that fall one by one before the rest pour in. */
const SLOW = 8;

/**
 * Questions 1 to 3 on the page's own sampling block. A skewed population of
 * 100,000 (the parameter, its mean, drawn as a line through everything), one
 * sample of 50 under it (the statistic), the standard deviation against the
 * standard error, and then the block's 2,000 sample means piling up on the
 * same axis into a narrow bell around five, its spread the standard error.
 */
export const SampleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("param").from;
  const qAt = n.word("param", "Question");
  const textAt = n.word("param", "What's the difference");
  const popAt = n.word("param", "A parameter describes the population");
  const trueAt = n.word("param", "its true mean");
  const muAt = n.word("param", "five point oh two");
  const statAt = n.word("param", "A statistic is computed");
  const xbarAt = n.word("param", "five point five seven");
  const estAt = n.word("param", "It estimates the parameter");
  const q2At = n.word("se", "Question two");
  const q2TextAt = n.word("se", "What is the standard error");
  const sdAt = n.word("se", "The standard deviation is the spread");
  const fiveAt = n.word("se", "about five here");
  const seAt = n.word("se", "The standard error is the spread");
  const rootAt = n.word("se", "over the square root of n");
  const sevenAt = n.word("se", "about point seven");
  const fourAt = n.word("se-root", "Four times the data");
  const halfAt = n.word("se-root", "point three six");
  const shrinkAt = n.word("se-root", "needn't shrink");
  const q3At = n.word("sampling", "Question three");
  const q3TextAt = n.word("sampling", "What is a sampling distribution");
  const drawAt = n.word("sampling", "Draw two thousand samples");
  const dropAt = n.word("sampling", "drop each mean as a dot");
  const lopsidedAt = n.word("sampling", "The data was lopsided");
  const bellAt = n.word("sampling", "a narrow bell");
  const spreadAt = n.word("sampling", "Its spread is the standard error");
  const simAt = n.word("sampling", "point seven oh");
  const formulaAt = n.word("sampling", "point seven one");
  const end = n.beat("sampling").to;

  const S = SAMPLE;
  const x = (v: number) => at(XS, Math.min(v, XS.hi));
  const popBase = y(POP_BASE);
  const popUnit = h(POP_H) / Math.max(...S.popCounts);
  const stripY = y(STRIP_Y);
  const pileBase = y(PILE_BASE);
  const means = S.means;
  const pileUnit = h(PILE_H) / Math.max(...S.meanCounts);
  const bin = S.meanEdges[1] - S.meanEdges[0];
  const meanLo = S.meanEdges[0];
  const charts = { lo: XS.lo, hi: XS.hi, x0: XS.a, x1: XS.b };

  // The one sample: jittered up and down its strip so the 50 dots don't sit
  // on top of each other.
  const rand = mulberry32(50);
  const strip = S.first.map((v, i) => ({ x: x(v), y: stripY + (rand() - 0.5) * h(34), at: statAt + 4 + i * 0.5 }));

  // The 2,000 means: the first few drop one at a time, then the rest pour in.
  const slowGap = Math.max(4, Math.min(8, (lopsidedAt - dropAt - 10) / SLOW));
  const pourFrom = dropAt + SLOW * slowGap + 6;
  const pourTo = Math.max(pourFrom + 30, bellAt - 2);
  const landed = (i: number) =>
    i < SLOW ? dropAt + i * slowGap + 12 : pourFrom + (pourTo - pourFrom) * Math.sqrt((i - SLOW) / (means.length - SLOW));
  const counts = new Array(S.meanCounts.length).fill(0);
  let shown = 0;
  means.forEach((m, i) => {
    if (frame < landed(i)) return;
    shown++;
    const k = Math.floor((m - meanLo) / bin);
    if (k >= 0 && k < counts.length) counts[k]++;
  });
  const pileTop = (m: number) => {
    const k = Math.floor((m - meanLo) / bin);
    return pileBase - (counts[k] ?? 0) * pileUnit;
  };

  const panelOut = q3At - 4;
  const seX0 = x(S.meanOfMeans - S.seSimulated);
  const seX1 = x(S.meanOfMeans + S.seSimulated);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={popAt + 2} level={-34} />
      <Sfx name="el-tap" at={muAt} level={-32} />
      <Sfx name="el-sprinkle" at={statAt + 4} level={-36} />
      <Sfx name="el-tap" at={xbarAt} level={-32} />
      <Sfx name="el-pencil" at={fiveAt} level={-34} />
      <Sfx name="el-pencil" at={rootAt} level={-34} />
      <Sfx name="el-tap" at={halfAt} level={-32} />
      {Array.from({ length: SLOW }, (_, i) => (
        <Sfx key={i} name="el-tap" at={Math.round(landed(i))} level={-38} />
      ))}
      <Sfx name="el-sprinkle" at={pourFrom} level={-34} />
      <Sfx name="el-pop" at={simAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4} size={60}>
          What&apos;s the difference between a parameter and a statistic?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} out={q3At - 4} size={58}>
          What is the standard error (SE), and how does it differ from the standard deviation?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={60}>
          What is a sampling distribution?
        </QuestionCard>

        {/* ── The population, and its mean: the parameter ── */}
        <Axes x={XS} y={{ lo: 0, hi: 1, a: popBase, b: popBase - h(POP_H) }} xTicks={[0, 5, 10, 15, 20, 25, 30]} at={popAt - 4} size={19} />
        <Bars
          counts={S.popCounts}
          lo={0}
          bin={0.5}
          scale={charts}
          base={popBase}
          unit={popUnit}
          gap={1.5}
          grow={(i) => ease(frame, popAt + i * 0.4, 12)}
          opacity={1 - 0.5 * ease(frame, drawAt, 14)}
        />
        <Note at={popAt + 6} x={x(13)} y={popBase - h(150)}>
          <span style={{ ...partLabel(22, INK_SOFT) }}>the population, simulated</span>
        </Note>
        <VLine
          x={x(S.mu)}
          top={popBase - h(POP_H) - h(14)}
          bottom={pileBase}
          at={trueAt}
          color={INK}
          dash="7 6"
          width={2.4}
          label={
            <span style={{ ...noteText(24, INK), opacity: ease(frame, muAt - 2, 10) }}>
              <span style={{ ...label(20, INK_SOFT), marginRight: 10 }}>parameter</span>μ = <span style={TABULAR}>{fmt(S.mu, 2)}</span>
            </span>
          }
          labelY={popBase - h(POP_H) - h(30)}
        />

        {/* ── One sample of 50, and its mean: the statistic ── */}
        <Svg>
          {strip.map((d, i) => {
            const p = ease(frame, d.at, 8);
            if (p <= 0) return null;
            return <circle key={i} cx={d.x} cy={d.y} r={5.5 * p} fill={BAR} opacity={0.8 * (1 - 0.55 * ease(frame, drawAt, 14))} />;
          })}
          <line
            x1={x(S.firstMean)}
            x2={x(S.firstMean)}
            y1={stripY - h(26)}
            y2={stripY + h(26)}
            stroke={BLUE_INK}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={ease(frame, xbarAt - 4, 10)}
          />
        </Svg>
        <Note at={statAt + 6} x={x(18)} y={stripY - h(16)} dim={drawAt}>
          <span style={{ ...partLabel(22, INK_SOFT) }}>one sample of 50</span>
        </Note>
        <Note at={xbarAt} x={x(S.firstMean) + 12} y={stripY + h(24)} dim={drawAt}>
          <span style={{ ...noteText(24, BLUE_INK) }}>
            <span style={{ ...label(20, INK_SOFT), marginRight: 10 }}>statistic</span>x̄ = <span style={TABULAR}>{fmt(S.firstMean, 2)}</span>
          </span>
        </Note>
        <Leader
          points={[
            [x(S.firstMean) + 150, stripY + h(56)],
            [x(S.firstMean) + 190, stripY + h(70)],
            [x(13), stripY + h(70)],
          ]}
          at={estAt}
          dot={false}
          color={INK_SOFT}
          dim={q2At}
          out={drawAt}
        />
        <Note at={estAt + 6} x={x(13) + 12} y={stripY + h(54)} out={drawAt}>
          <span style={{ ...noteText(24, INK) }}>estimates μ</span>
        </Note>

        {/* ── Question 2: the spread of single values, and of the mean ── */}
        <Bracket x0={x(S.mu)} x1={x(S.mu + S.sigma)} y={popBase - h(78)} at={sdAt + 4} out={panelOut} up>
          <span style={{ ...noteText(22, INK), ...TABULAR }}>
            SD ≈ <Mark at={fiveAt}>5</Mark>
          </span>
        </Bracket>
        <Note at={sdAt + 6} x={RIGHT_X} y={y(350)} out={panelOut}>
          <div style={{ ...noteText(26, INK) }}>
            <b>Standard deviation</b>: the spread of single values
          </div>
        </Note>
        <Note at={seAt} x={RIGHT_X} y={y(420)} out={panelOut}>
          <div style={{ ...noteText(26, INK) }}>
            <b>Standard error</b>: the spread of the mean,
            <br />
            from one sample to the next
          </div>
        </Note>
        <Note at={rootAt} x={RIGHT_X} y={y(530)} out={panelOut}>
          <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: INK, whiteSpace: "nowrap", ...TABULAR }}>
            SE = SD / √n
          </div>
        </Note>
        <Note at={sevenAt - 2} x={RIGHT_X} y={y(588)} out={panelOut}>
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: BLUE_INK, whiteSpace: "nowrap", ...TABULAR }}>
            n = 50: {fmt(S.sigma, 2)} / √50 = <Mark at={sevenAt + 2}>{fmt(S.seFormula, 2)}</Mark>
          </div>
        </Note>
        <Note at={fourAt} x={RIGHT_X} y={y(642)} out={panelOut}>
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: BLUE_INK, whiteSpace: "nowrap", ...TABULAR }}>
            n = 200: {fmt(S.sigma, 2)} / √200 = <Mark at={halfAt + 2}>{fmt(S.se200, 2)}</Mark>
          </div>
        </Note>
        <Note at={halfAt + 4} x={RIGHT_X} y={y(700)} out={panelOut}>
          <span style={{ ...noteText(24, OK_INK) }}>four times the data, half the error</span>
        </Note>
        <Note at={shrinkAt} x={RIGHT_X} y={y(750)} out={panelOut}>
          <span style={{ ...noteText(24, INK_SOFT) }}>
            the SD stays ≈ <span style={TABULAR}>5</span>
          </span>
        </Note>

        {/* ── Question 3: 2,000 sample means, on the same axis ── */}
        <Axes x={XS} y={{ lo: 0, hi: 1, a: pileBase, b: pileBase - h(PILE_H) }} xTicks={[0, 5, 10, 15, 20, 25, 30]} at={drawAt - 2} size={19} />
        <Bars
          counts={counts}
          lo={meanLo}
          bin={bin}
          scale={charts}
          base={pileBase}
          unit={pileUnit}
          gap={0.8}
          color={BAR}
        />
        <Svg>
          {means.slice(0, SLOW).map((m, i) => {
            const start = landed(i) - 12;
            const p = ease(frame, start, 12);
            if (p <= 0 || frame >= landed(i)) return null;
            const yy = stripY + (pileTop(m) - stripY) * p;
            return <circle key={i} cx={x(m)} cy={yy} r={6} fill={BLUE_INK} />;
          })}
        </Svg>
        <NormalCurve
          scale={charts}
          base={pileBase}
          unit={pileUnit}
          mu={S.meanOfMeans}
          sd={S.seSimulated}
          count={means.length}
          bin={bin}
          at={bellAt}
          color={OK}
          width={2.6}
        />
        <Note at={drawAt + 2} x={x(9)} y={pileBase - h(150)}>
          <span style={{ ...noteText(26, INK), ...TABULAR }}>
            <b>{shown.toLocaleString("en-US")}</b> sample means, each of 50 values
          </span>
        </Note>
        <Note at={lopsidedAt} x={x(13)} y={popBase - h(108)}>
          <span style={{ ...noteText(24, INK_SOFT) }}>lopsided</span>
        </Note>
        <Note at={bellAt + 2} x={x(9)} y={pileBase - h(104)}>
          <span style={{ ...noteText(24, OK_INK) }}>a narrow bell around 5</span>
        </Note>
        <Bracket x0={seX0} x1={seX1} y={pileBase - h(PILE_H) - h(14)} at={spreadAt} up />
        <Note at={spreadAt + 4} x={x(9)} y={pileBase - h(58)}>
          <span style={{ ...noteText(26, INK), ...TABULAR }}>
            its spread is the SE: <Mark at={simAt}>{fmt(S.seSimulated, 2)}</Mark>{" "}
            <span style={{ ...label(20, INK_SOFT) }}>simulated</span>
            <span style={{ opacity: ease(frame, formulaAt - 2, 10) }}>
              {" "}
              · <Mark at={formulaAt}>{fmt(S.seFormula, 2)}</Mark> <span style={{ ...label(20, INK_SOFT) }}>by the formula</span>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
