import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FIT, INCOME, normalPdf } from "./data";
import { areaD, ASK, ASK_FILL, askNote, code, Count, Curve, curveD, Drift, Head, KBars, Kicker, lerp, pulse, Spot, Svg, VRule } from "./parts";

const X: XScale = { lo: 52, hi: 92, x0: 200, x1: 1240 };
const BASE = 820;
const TALL = 380;
const PANEL_X = 1340;

/**
 * Part 4 opens: five hundred measurements, a normal fitted to them, and
 * what the fitted model can answer (its 95th percentile). Then the catch: a
 * fit returns numbers for any shape, the skewed incomes included.
 */
export const FitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const fitFrom = n.beat("fit").from;
  const realAt = n.word("fit", "real data");
  const knowAt = n.word("fit", "don't know");
  const estimateAt = n.word("fit", "estimate");
  const sampleEnd = n.word("fit", "sample", { edge: "end" });
  const handAt = n.word("fitted", "Hand");
  const fitAt = n.word("fitted", "normal fit");
  const meanAt = n.word("fitted", "seventy-one point nine");
  const spreadAt = n.word("fitted", "five point seven five");
  const questionsAt = n.word("use", "questions");
  const pctAt = n.word("use", "ninety-fifth percentile");
  const eightyAt = n.word("use", "eighty-one point four");
  const alwaysAt = n.word("always", "ALWAYS");
  const wrongAt = n.word("always", "wrong shape");
  const answerAt = n.word("always", "Getting an answer");

  const base = y(BASE);
  const unit = h(TALL) / Math.max(...FIT.counts);
  const ks = FIT.counts.map((_, i) => FIT.lo + (i + 0.5) * FIT.bin);
  const barAt = (i: number) => lerp(realAt - 2, sampleEnd - 6, i / (FIT.counts.length - 1));
  const perBin = (v: number) => FIT.n * FIT.bin * normalPdf(v, FIT.loc, FIT.scale);
  const py = (c: number) => base - c * unit;
  const qx = sx(X, FIT.ppf95);
  const tail = ease(frame, pctAt - 4, 16);
  const unknown = pulse(frame, estimateAt - 4, 22);
  const mean = ease(frame, meanAt - 6, 14);
  const spread = ease(frame, spreadAt - 6, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the measurements, the fit's two numbers, the curve, the
           tail it answers for ── */}
      <Sfx name="el-sprinkle" at={realAt - 2} level={-34} />
      <Sfx name="el-tap" at={meanAt - 6} level={-29} />
      <Sfx name="el-tap" at={spreadAt - 6} level={-29} />
      <Sfx name="el-pencil" at={meanAt - 2} level={-34} />
      <Sfx name="el-pop" at={pctAt - 4} level={-30} />

      <Kicker at={fitFrom - 10}>Fitting a distribution</Kicker>
      <Head parts={[{ text: "Estimate the parameters.", at: fitFrom - 4 }]} out={alwaysAt - 8} />
      <Head
        parts={[
          { text: "Numbers back", at: alwaysAt - 4 },
          { text: "aren't proof of a fit.", at: answerAt - 6, italic: true },
        ]}
      />

      <Spot id="distributions-dress-form" at={handAt - 4} left={1560} top={y(88)} width={220} height={300} />

      <Drift from={fitFrom} to={n.beat("always").to + 40}>
        <FigLabel n="11" title={`${FIT.n} measurements, and a normal fitted to them`} at={realAt - 6} x={160} y={y(300)} />
        <Axis scale={X} base={base} ticks={[55, 60, 65, 70, 75, 80, 85, 90]} at={realAt - 6} />
        <KBars
          ks={ks.map((v) => (v - FIT.lo) / FIT.bin)}
          values={FIT.counts}
          scale={{ lo: 0, hi: FIT.counts.length, x0: X.x0, x1: X.x1 }}
          base={base}
          unit={unit}
          width={0.84}
          grow={(i) => ease(frame, barAt(i), 10)}
        />
        {tail > 0 ? (
          <Svg>
            <path d={areaD(perBin, FIT.ppf95, X.hi, X, py)} fill={ASK_FILL} opacity={tail} />
          </Svg>
        ) : null}
        <Curve d={curveD(perBin, X.lo, X.hi, X, py)} at={meanAt - 2} dur={26} color={ASK} width={3.4} />
        <VRule x={qx} bottom={base} top={base - h(TALL - 60)} at={pctAt - 4} color={ASK} dash="6 5" />
        <Note at={eightyAt - 6} x={qx + 14} y={base - h(TALL - 50)}>
          <div style={{ ...askNote(24), whiteSpace: "nowrap", ...halo }}>95th percentile: {fmt(FIT.ppf95, 1)}</div>
          <div style={{ ...code(20, INK_SOFT), marginTop: 6 }}>.ppf(0.95)</div>
        </Note>
        <Note at={pctAt + 6} x={qx + 14} y={base - h(150)}>
          <span style={{ ...askNote(21), whiteSpace: "nowrap", ...halo }}>5% above it</span>
        </Note>

        {/* ── The fit ── */}
        <Ink at={knowAt - 4} dur={14} style={{ left: PANEL_X, top: y(430), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The parameters</span>
        </Ink>
        {[
          { name: "mean", value: FIT.loc, digits: 2, at: knowAt, p: mean, yy: 474 },
          { name: "spread", value: FIT.scale, digits: 2, at: knowAt + 6, p: spread, yy: 524 },
        ].map((r) => (
          <Ink key={r.name} at={r.at} dur={14} style={{ left: PANEL_X, top: y(r.yy), whiteSpace: "nowrap" }}>
            <span style={{ ...note(30, INK), fontWeight: 600 }}>
              {r.name}{" "}
              {r.p > 0 ? (
                <span style={askNote(30)}>
                  <Count at={r.at === knowAt ? meanAt - 6 : spreadAt - 6} dur={14} from={0} to={r.value} digits={r.digits} />
                </span>
              ) : (
                <span style={{ color: INK_SOFT, display: "inline-block", transform: `scale(${1 + unknown * 0.3})` }}>?</span>
              )}
            </span>
          </Ink>
        ))}
        <Ink at={fitAt - 4} dur={14} style={{ left: PANEL_X, top: y(584), whiteSpace: "nowrap" }}>
          <span style={code(22, INK)}>stats.norm.fit(sample)</span>
        </Ink>
        <Note at={questionsAt} x={PANEL_X} y={y(624)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>then the model answers questions</span>
        </Note>

        {/* The catch: the skewed incomes get numbers too. */}
        <Ink at={wrongAt - 6} dur={14} style={{ left: PANEL_X, top: y(690), whiteSpace: "nowrap" }}>
          <span style={code(22, INK)}>stats.norm.fit(incomes)</span>
        </Ink>
        <Note at={wrongAt} x={PANEL_X} y={y(728)}>
          <span style={{ ...note(23, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            → {fmt(INCOME.fitLoc, 0)} and {fmt(INCOME.fitScale, 0)}
          </span>
        </Note>
        <Note at={answerAt} x={PANEL_X} y={y(766)}>
          <span style={{ ...body(28, true), color: ASK, whiteSpace: "nowrap" }}>an answer, for the wrong shape</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
