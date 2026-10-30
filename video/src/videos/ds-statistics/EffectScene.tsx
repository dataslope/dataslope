import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { normalPdf } from "../../editorial/charts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, TABULAR, fmt } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EFFECT } from "./data";
import { at, Axes, Curve, Drift, Mark, MARK_BAD, MARK_OK, noteText, OK_INK, type Scale, Svg, WARM_INK, X0 } from "./parts";

const XS: Scale = { lo: 40, hi: 160, a: X0, b: 1060 };
const BASE = 800;
const HEIGHT = 380;
const SIDE_X = 1180;
/** The magnifier: the two means, a quarter of a point apart at most. */
const ZOOM: Scale = { lo: 99.95, hi: 100.25, a: 1220, b: 1740 };
const ZOOM_Y = 470;
/** Both groups' standard deviation, as check.mjs draws them (normal, SD 15). */
const SD = 15;

/**
 * Question 15 on the Statistics course's challenge (seed 2024, the run
 * Stats-8 InterpretingResults shows): two groups of 300,000 whose curves lie
 * on top of each other, a magnifier on their means 0.142 apart, p = 0.00026
 * and Cohen's d = 0.0094. Significant, and too small to matter.
 */
export const EffectScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("effect").from;
  const qAt = n.word("effect", "Question");
  const textAt = n.word("effect", "What is effect size");
  const howBigAt = n.word("effect", "It measures how big a difference is");
  const usersAt = n.word("effect", "Three hundred thousand users");
  const leadsAt = n.word("effect", "B leads by a seventh");
  const pAt = n.word("effect", "p is under three in ten thousand");
  const dAt = n.word("effect", "Cohen's d");
  const lessAt = n.word("effect", "less than one percent of one");
  const sigAt = n.word("effect", "Significant, and too small");
  const smallAt = n.word("effect", "too small to matter");
  const reportAt = n.word("effect-report", "report the effect size");
  const intervalAt = n.word("effect-report", "with its interval");
  const reverseAt = n.word("effect-small", "The reverse happens too");
  const bigAt = n.word("effect-small", "a big effect can miss significance");
  const end = n.beat("effect-small").to;

  const base = y(BASE);
  const peak = normalPdf(100, 100, SD);
  const curve = (mu: number) =>
    Array.from({ length: 121 }, (_, i) => {
      const v = XS.lo + i;
      return [at(XS, v), base - (normalPdf(v, mu, SD) / peak) * h(HEIGHT)] as const;
    });
  const muB = 100 + EFFECT.gap;
  const zp = ease(frame, leadsAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={usersAt + 4} level={-34} />
      <Sfx name="el-tap" at={leadsAt + 4} level={-32} />
      <Sfx name="el-tap" at={pAt + 6} level={-32} />
      <Sfx name="el-tap" at={lessAt} level={-32} />
      <Sfx name="el-pop" at={smallAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={15} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is effect size, and why does it matter alongside p-values?
        </QuestionCard>

        <Note at={howBigAt} x={X0} y={y(300)}>
          <span style={{ ...noteText(26, INK) }}>how big a difference is, which a p-value doesn&apos;t say</span>
        </Note>
        <Axes
          x={XS}
          y={{ lo: 0, hi: 1, a: base, b: base - h(HEIGHT) }}
          xTicks={[55, 70, 85, 100, 115, 130, 145]}
          xTitle={`score (SD ${SD})`}
          at={usersAt - 4}
          size={19}
        />
        <Curve points={curve(100)} at={usersAt} dur={26} color={INK_SOFT} width={3.2} />
        <Curve points={curve(muB)} at={usersAt + 8} dur={26} color={BAR} width={3.2} dash="10 7" />
        <Note at={usersAt + 6} x={at(XS, 112)} y={base - h(HEIGHT) + h(10)}>
          <span style={{ ...noteText(24, INK), ...TABULAR }}>A and B, 300,000 users each</span>
        </Note>

        {/* ── The magnifier on the two means ── */}
        <Svg opacity={zp}>
          <line x1={at(XS, 100)} x2={ZOOM.a - 20} y1={base - h(HEIGHT) - h(6)} y2={y(ZOOM_Y) - h(60)} stroke={HAIRLINE} strokeWidth={1.4} />
          <line x1={ZOOM.a} x2={ZOOM.b} y1={y(ZOOM_Y)} y2={y(ZOOM_Y)} stroke={INK} strokeWidth={1.6} />
          {[100, 100.1, 100.2].map((v) => (
            <g key={v}>
              <line x1={at(ZOOM, v)} x2={at(ZOOM, v)} y1={y(ZOOM_Y)} y2={y(ZOOM_Y) + 7} stroke={INK} strokeWidth={1.2} />
              <text x={at(ZOOM, v)} y={y(ZOOM_Y) + 30} textAnchor="middle" fill={INK_SOFT} style={{ ...noteText(19, INK_SOFT), ...TABULAR }}>
                {fmt(v, 1)}
              </text>
            </g>
          ))}
          <line x1={at(ZOOM, 100)} x2={at(ZOOM, 100)} y1={y(ZOOM_Y) - h(80)} y2={y(ZOOM_Y)} stroke={INK_SOFT} strokeWidth={4} />
          <line x1={at(ZOOM, muB)} x2={at(ZOOM, muB)} y1={y(ZOOM_Y) - h(80)} y2={y(ZOOM_Y)} stroke={BLUE_INK} strokeWidth={4} strokeDasharray="8 5" />
        </Svg>
        <Note at={leadsAt + 6} x={at(ZOOM, 100) - 10} y={y(ZOOM_Y) - h(122)} align="right">
          <span style={{ ...noteText(22, INK_SOFT) }}>mean of A</span>
        </Note>
        <Note at={leadsAt + 6} x={at(ZOOM, muB) + 10} y={y(ZOOM_Y) - h(122)}>
          <span style={{ ...noteText(22, BLUE_INK) }}>
            mean of B, <Mark at={leadsAt + 10}><span style={TABULAR}>+{fmt(EFFECT.gap, 2)}</span></Mark>
          </span>
        </Note>

        <Note at={pAt + 4} x={SIDE_X} y={y(580)}>
          <span style={{ ...noteText(30, INK), ...TABULAR }}>
            p = <b>{EFFECT.p.toFixed(5)}</b>
          </span>
        </Note>
        <Note at={dAt} x={SIDE_X} y={y(636)}>
          <span style={{ ...noteText(30, WARM_INK), ...TABULAR }}>
            Cohen&apos;s d ={" "}
            <span style={{ opacity: ease(frame, lessAt - 2, 10) }}>
              <b>{fmt(EFFECT.d, 4)}</b>
            </span>
          </span>
        </Note>
        <Note at={dAt + 8} x={SIDE_X} y={y(686)}>
          <span style={{ ...noteText(22, INK_SOFT) }}>the gap, in standard deviations</span>
        </Note>
        <Note at={sigAt} x={SIDE_X} y={y(750)}>
          <span style={{ ...noteText(28, INK) }}>
            <Mark at={sigAt + 2} color={MARK_OK}>
              significant
            </Mark>
            <span style={{ opacity: ease(frame, smallAt - 2, 10) }}>
              , and{" "}
              <span style={{ color: ACCENT_INK }}>
                <Mark at={smallAt + 2} color={MARK_BAD}>
                  too small to matter
                </Mark>
              </span>
            </span>
          </span>
        </Note>
        <Note at={reportAt} x={X0} y={y(866)}>
          <span style={{ ...noteText(26, OK_INK) }}>
            report the effect size
            <span style={{ opacity: ease(frame, intervalAt - 2, 10) }}>, with its interval,</span> beside every p-value
          </span>
        </Note>
        <Note at={reverseAt} x={SIDE_X} y={y(806)}>
          <div style={{ lineHeight: 1.4 }}>
            <span style={{ ...noteText(22, INK_SOFT) }}>the reverse happens too:</span>
            <br />
            <span style={{ ...noteText(24, INK), opacity: ease(frame, bigAt - 2, 10) }}>
              a <Mark at={bigAt + 6}>big effect</Mark> can miss significance in a small sample
            </span>
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
