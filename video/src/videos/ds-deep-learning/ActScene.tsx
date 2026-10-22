import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ACT } from "./data";
import { Axes, Cells, CELL_MARK, CELL_OK, Curve, Drift, ElbowArrow, Mark, OK, OK_INK, type Scale, Svg, Tagline } from "./parts";

const BOX = { left: 170, right: 850, top: 350, bottom: 820 };
const TANH = ds("purple", 500);
const TANH_INK = inkOf.purple;
const LEG_X = 980;
const LEG_Y = 352;
const LEG_ROW = 62;
const SOFT_Y = 700;

/**
 * Question 3 on one plot from -5 to 5: sigmoid with its flat ends marked,
 * tanh, ReLU in the right answer's green, and leaky ReLU dashed beside it,
 * each named in a legend as it is described. Then softmax on three scores,
 * 2, 1 and 0.1, becoming 66, 24 and 10 percent.
 */
export const ActScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("act").from;
  const qAt = n.word("act", "Question three");
  const textAt = n.word("act", "Compare the common activation functions");
  const sigAt = n.word("act", "Sigmoid squashes");
  const flatAt = n.word("act", "goes flat at both ends");
  const tanhAt = n.word("act", "Tanh, the hyperbolic tangent");
  const centeredAt = n.word("act", "centered on zero");
  const reluAt = n.word("act-relu", "ReLU, the rectified linear unit");
  const zeroesAt = n.word("act-relu", "zeroes the rest");
  const defaultAt = n.word("act-relu", "the default for hidden layers");
  const stuckAt = n.word("act-relu", "A unit whose inputs stay negative");
  const leakyAt = n.word("act-relu", "leaky ReLU keeps a small slope");
  const softAt = n.word("act-soft", "And softmax turns");
  const addAt = n.word("act-soft", "add to one");
  const scoresAt = n.word("act-soft", "Scores of two, one and point one");
  const becomeAt = n.word("act-soft", "become sixty-six");
  const ideaAt = n.word("backprop-in", "one more idea");
  const end = n.beat("backprop-in").to;

  const xs: Scale = { lo: -5, hi: 5, a: BOX.left, b: BOX.right };
  const ys: Scale = { lo: -1.5, hi: 3, a: y(BOX.bottom), b: y(BOX.top) };
  const clip = { left: BOX.left - 4, right: BOX.right + 4, top: y(BOX.top) - 6, bottom: y(BOX.bottom) + 4 };
  const pts = (vals: readonly number[]) => ACT.z.map((z, i) => [z, vals[i]] as const);
  const sig = pts(ACT.sigmoid);
  const tails = [sig.filter(([z]) => z <= -2.8), sig.filter(([z]) => z >= 2.8)];
  const legendOut = ideaAt - 2;

  const legend = [
    { at: sigAt, color: BAR, dash: undefined, text: <>sigmoid: 0 to 1, <Mark at={flatAt + 2}>flat at both ends</Mark></>, ink: BLUE_INK },
    { at: tanhAt, color: TANH, dash: undefined, text: <>tanh: −1 to 1, centered on 0</>, ink: TANH_INK },
    { at: reluAt, color: OK, dash: undefined, text: <>ReLU: max(0, z), the hidden-layer default</>, ink: OK_INK },
    { at: leakyAt, color: OK, dash: "7 6", text: <>leaky ReLU: a small slope below zero</>, ink: OK_INK },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sigAt} level={-36} />
      <Sfx name="el-scratch" at={flatAt + 2} level={-36} />
      <Sfx name="el-pencil" at={tanhAt} level={-36} />
      <Sfx name="el-pencil" at={reluAt} level={-36} />
      <Sfx name="el-tap" at={leakyAt} level={-36} />
      <Sfx name="el-pop" at={becomeAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          Compare the common activation functions.
        </QuestionCard>

        <Axes x={xs} y={ys} xTicks={[-4, -2, 0, 2, 4]} yTicks={[-1, 0, 1, 2, 3]} xTitle="input z" yTitle="output" at={sigAt - 6} />
        <Curve points={tails[0]} x={xs} y={ys} at={flatAt} dur={10} color={ACCENT} width={10} clip={clip} />
        <Curve points={tails[1]} x={xs} y={ys} at={flatAt + 4} dur={10} color={ACCENT} width={10} clip={clip} />
        <Curve points={sig} x={xs} y={ys} at={sigAt} dur={26} color={BAR} width={3.6} clip={clip} />
        <Curve points={pts(ACT.tanh)} x={xs} y={ys} at={tanhAt} dur={26} color={TANH} width={3.6} clip={clip} />
        <Curve points={pts(ACT.leaky)} x={xs} y={ys} at={leakyAt} dur={22} color={OK} width={3} dash="8 7" clip={clip} />
        <Curve points={pts(ACT.relu)} x={xs} y={ys} at={reluAt} dur={26} color={OK} width={4.4} clip={clip} />
        {/* Zero below zero: the half that stops learning when it is all a unit sees. */}
        <Svg opacity={ease(frame, stuckAt, 10) * (1 - ease(frame, leakyAt + 6, 12) * 0.6)}>
          <rect x={xs.a} y={ys.b} width={(xs.b - xs.a) / 2} height={ys.a - ys.b} fill={`color-mix(in srgb, ${ACCENT} 8%, transparent)`} />
        </Svg>
        <Note at={stuckAt + 2} x={BOX.left + 24} y={y(BOX.top) + h(18)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>stuck here, a ReLU unit stops learning</span>
        </Note>

        {/* ── The legend, a row per activation as it is described ── */}
        {legend.map((row, i) => (
          <Note key={i} at={row.at - 2} x={LEG_X} y={y(LEG_Y) + i * h(LEG_ROW)} out={legendOut}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width={44} height={14} style={{ overflow: "visible" }}>
                <line x1={0} x2={44} y1={7} y2={7} stroke={row.color} strokeWidth={4} strokeDasharray={row.dash} />
              </svg>
              <span style={{ ...note(26, row.ink), fontWeight: 600, whiteSpace: "nowrap" }}>{row.text}</span>
            </div>
          </Note>
        ))}
        <Tagline x={LEG_X + 60} y={y(LEG_Y) + 2 * h(LEG_ROW) + h(36)} at={zeroesAt + 2} out={legendOut} size={20}>
          passes positives, zeroes the rest
        </Tagline>
        <Tagline x={LEG_X + 60} y={y(LEG_Y) + 1 * h(LEG_ROW) + h(36)} at={centeredAt} out={legendOut} size={20}>
          the same shape, centered
        </Tagline>
        <Svg opacity={ease(frame, defaultAt, 10) * (1 - ease(frame, legendOut, 10))}>
          <rect x={LEG_X - 14} y={y(LEG_Y) + 2 * h(LEG_ROW) - 10} width={760} height={h(LEG_ROW) + 8} rx={6} fill="none" stroke={OK} strokeWidth={2} />
        </Svg>

        {/* ── Softmax: three scores into probabilities ── */}
        <Tagline x={LEG_X} y={y(SOFT_Y) - h(46)} at={softAt} out={legendOut} size={22} color={INK}>
          softmax: scores into probabilities that <Mark at={addAt}>add to one</Mark>
        </Tagline>
        <Cells values={[ACT.scores.map((v) => v.toFixed(1))]} x={LEG_X} y={y(SOFT_Y)} w={96} h={h(56)} at={scoresAt - 2} out={legendOut} color={BLUE_INK} />
        <ElbowArrow points={[[LEG_X + 3 * 96 + 22, y(SOFT_Y) + h(28)], [LEG_X + 3 * 96 + 96, y(SOFT_Y) + h(28)]]} at={becomeAt - 6} out={legendOut} color={INK_SOFT} width={2} head={11} />
        <Cells
          values={[ACT.softmax.map((v) => `${Math.round(v * 100)}%`)]}
          x={LEG_X + 3 * 96 + 112}
          y={y(SOFT_Y)}
          w={110}
          h={h(56)}
          at={becomeAt - 2}
          out={legendOut}
          color={OK_INK}
          look={(_, c) => ({ tint: { color: c === 0 ? CELL_MARK : CELL_OK, at: becomeAt + 4 + c * 3 } })}
        />
        <Tagline x={LEG_X + 3 * 96 + 112} y={y(SOFT_Y) + h(68)} width={330} align="center" at={becomeAt + 10} out={legendOut} size={20}>
          sum: 100%
        </Tagline>
        <Tagline x={LEG_X} y={y(SOFT_Y) + h(68)} width={288} align="center" at={scoresAt} out={legendOut} size={20}>
          scores
        </Tagline>
      </Drift>
    </AbsoluteFill>
  );
};
