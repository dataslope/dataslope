import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, TABULAR, fmt } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ZT } from "./data";
import { at, Axes, Curve, Drift, Mark, noteText, OK_INK, type Scale, Svg, WARM, WARM_INK, X0 } from "./parts";

const XS: Scale = { lo: -4.5, hi: 4.5, a: X0, b: 1180 };
const BASE = 820;
const HEIGHT = 400;
const SIDE_X = 1270;

/**
 * Question 12. The normal curve, then the t curve at five degrees of
 * freedom over it, lower in the middle and heavier in the tails, with each
 * one's 95% cutoffs: 1.96 against 2.571. Then t at thirty degrees of
 * freedom, nearly on the normal, its cutoff 2.042.
 */
export const ZtScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("zt").from;
  const qAt = n.word("zt", "Question");
  const textAt = n.word("zt", "When do you use a z-test");
  const zAt = n.word("zt", "A z-test when");
  const tAt = n.word("zt", "A t-test when");
  const tailsAt = n.word("zt", "heavier tails");
  const fiveAt = n.word("zt", "at five degrees of freedom");
  const t5At = n.word("zt", "two point five seven");
  const zCutAt = n.word("zt", "one point nine six");
  const thirtyAt = n.word("zt", "At thirty");
  const t30At = n.word("zt", "two point oh four");
  const softwareAt = n.word("zt", "Software uses t");
  const becomesAt = n.word("zt", "t becomes z");
  const end = n.beat("zt").to;

  const base = y(BASE);
  const peak = Math.max(...ZT.normalPdf);
  const py = (v: number) => base - (v / peak) * h(HEIGHT);
  const pts = (values: readonly number[]) =>
    ZT.x.flatMap((x, i) => (x >= XS.lo - 1e-9 && x <= XS.hi + 1e-9 ? [[at(XS, x), py(values[i])] as const] : []));
  // 1.96 and 2.04 are a few pixels apart, so a label beside one line sits on
  // the other: each cutoff gets its own height, the tallest line labelled on
  // its left, and a shorter one never reaches up into a label beside it.
  // An SVG <text> takes its color from `fill`; noteText's CSS color alone
  // left all three black.
  const cut = (v: number, color: string, from: number, label: string, row: number, side: "left" | "right" = "right") => {
    const p = ease(frame, from, 12);
    if (p <= 0) return null;
    return (
      <g opacity={p}>
        {[-v, v].map((s) => (
          <line key={s} x1={at(XS, s)} x2={at(XS, s)} y1={base} y2={base - h(150 + row * 40)} stroke={color} strokeWidth={2.6} strokeDasharray="6 5" />
        ))}
        <text
          x={at(XS, v) + (side === "left" ? -10 : 10)}
          y={base - h(150 + row * 40) + 6}
          fill={color}
          textAnchor={side === "left" ? "end" : "start"}
          style={{ ...noteText(24, color), fontWeight: 650, fontVariantNumeric: "tabular-nums" }}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={zAt + 4} level={-34} />
      <Sfx name="el-pencil" at={tAt + 4} level={-34} />
      <Sfx name="el-tap" at={t5At} level={-32} />
      <Sfx name="el-tap" at={zCutAt} level={-32} />
      <Sfx name="el-tap" at={t30At} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={60}>
          When do you use a z-test versus a t-test?
        </QuestionCard>

        <Axes x={XS} y={{ lo: 0, hi: 1, a: base, b: base - h(HEIGHT) }} xTicks={[-4, -2, 0, 2, 4]} at={zAt - 4} size={19} />
        <Curve points={pts(ZT.normalPdf)} at={zAt} dur={24} color={INK} width={3} />
        <Curve points={pts(ZT.t5Pdf)} at={tAt + 2} dur={24} color={BAR} width={3.4} />
        <Curve points={pts(ZT.t30Pdf)} at={thirtyAt} dur={24} color={WARM} width={2.6} dash="8 6" />
        {[
          { at: zAt + 6, color: INK, text: "normal (z)", dash: false },
          { at: tAt + 8, color: BLUE_INK, text: "t, 5 degrees of freedom", dash: false },
          { at: thirtyAt + 4, color: WARM_INK, text: "t, 30 degrees of freedom", dash: true },
        ].map((k, i) => (
          <Note key={k.text} at={k.at} x={X0} y={base - h(HEIGHT) + h(i * 40)}>
            <span style={{ ...noteText(22, k.color), display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 34, height: 0, borderTop: `3px ${k.dash ? "dashed" : "solid"} ${k.color}` }} />
              {k.text}
            </span>
          </Note>
        ))}
        <Note at={tailsAt} x={at(XS, 3.1)} y={base - h(70)}>
          <span style={{ ...noteText(22, BLUE_INK) }}>
            <Mark at={tailsAt + 4}>heavier tails</Mark>
          </span>
        </Note>
        <Svg>
          {cut(ZT.t5, BLUE_INK, fiveAt + 6, fmt(ZT.t5, 2), 0)}
          {cut(ZT.z, INK, zCutAt - 2, fmt(ZT.z, 2), 2, "left")}
          {cut(ZT.t30, WARM_INK, t30At - 2, fmt(ZT.t30, 2), 1)}
        </Svg>

        <Note at={zAt} x={SIDE_X} y={y(420)}>
          <div style={{ ...noteText(26, INK), lineHeight: 1.35 }}>
            <b>z-test</b>: the variance is known,
            <br />
            or the sample is large
          </div>
        </Note>
        <Note at={tAt} x={SIDE_X} y={y(530)}>
          <div style={{ ...noteText(26, BLUE_INK), lineHeight: 1.35 }}>
            <b>t-test</b>: the variance is estimated
            <br />
            from a small sample
          </div>
        </Note>
        <Note at={fiveAt + 6} x={SIDE_X} y={y(640)}>
          <span style={{ ...noteText(24, INK), ...TABULAR }}>the cutoffs, either side</span>
        </Note>
        <Note at={softwareAt} x={SIDE_X} y={y(770)}>
          <span style={{ ...noteText(26, OK_INK) }}>
            software uses t, <Mark at={becomesAt + 2}>t becomes z</Mark> as n grows
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
