import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COLLAPSE, NEURON } from "./data";
import { CELL_BAD, CELL_MARK, CELL_OK, Cells, Drift, ElbowArrow, Mark, OK, OK_INK, sn, Svg, Tagline, X0 } from "./parts";

// ── Question 1: the neuron ──
const IN_X = 200;
const IN_W = 96;
const IN_Y = [420, 535, 650];
const CELL_H = 56;
const NX = 800;
const NY = 562;
const NR = 74;
const ACT_X = 990;
const ACT_W = 190;
const OUT_X = 1270;

// ── Question 2: two layers, one matrix ──
const W = 74;
const H = 48;
const ROWS = { a: 372, b: 552, c: 732 };

/**
 * Questions 1 and 2. The neuron: three inputs times their weights, summed
 * with the bias to 1.4, and through a sigmoid to 0.802; struck activation,
 * linear regression. Then two made-up 2x2 layers: the input (1, -1) comes
 * out as (1, -8) through both, and through their product, a single matrix;
 * with the negatives zeroed between them it comes out as (3, -6).
 */
export const NeuronScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("neuron").from;
  const qAt = n.word("neuron", "Question one");
  const textAt = n.word("neuron", "What does a single artificial neuron compute");
  const sumAt = n.word("neuron", "A weighted sum of its inputs");
  const biasAt = n.word("neuron", "plus a bias");
  const fAt = n.word("neuron", "passed through an activation function");
  const inputsAt = n.word("neuron", "These three inputs");
  const timesAt = n.word("neuron", "times their weights");
  const plusAt = n.word("neuron", "plus the bias");
  const zAt = n.word("neuron", "one point four");
  const sigAt = n.word("neuron", "A sigmoid turns that");
  const aAt = n.word("neuron", "into point eight");
  const leaveAt = n.word("neuron", "Leave out the activation");
  const regAt = n.word("neuron", "just linear regression");
  const q2At = n.word("linear", "Question two");
  const q2TextAt = n.word("linear", "Why do networks need");
  const onlyAt = n.word("linear", "two linear layers are only one");
  const goesAt = n.word("linear", "This input goes through");
  const outAt = n.word("linear", "comes out as one, minus eight");
  const multAt = n.word("linear", "Multiply the matrices together first");
  const sameAt = n.word("linear", "one, minus eight as well");
  const everyAt = n.word("linear", "for every input");
  const tenAt = n.word("linear-fix", "Ten layers would collapse");
  const zeroAt = n.word("linear-fix", "zeroes the negatives");
  const becomesAt = n.word("linear-fix", "the answer becomes three, minus six");
  const depthAt = n.word("linear-fix", "Now depth adds something");
  const whichAt = n.word("act-in", "which activation");
  const end = n.beat("act-in").to;

  const q1Out = q2At - 6;
  const C = COLLAPSE;
  const col = (v: readonly number[]) => v.map((x) => [x]);
  const box = (top: number) => y(top) + h(CELL_H) / 2;
  const cellsH = 2 * H;
  const midOf = (top: number) => y(top) + cellsH / 2;
  const lit = ease(frame, leaveAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sumAt} level={-36} />
      <Sfx name="el-tap" at={zAt} level={-34} />
      <Sfx name="el-pop" at={aAt} level={-32} />
      <Sfx name="el-scratch" at={leaveAt + 4} level={-34} />
      <Sfx name="el-tap" at={outAt} level={-34} />
      <Sfx name="el-pop" at={sameAt} level={-32} />
      <Sfx name="el-pop" at={becomesAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q1Out} size={60}>
          What does a single artificial neuron compute?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          Why do networks need non-linear activations?
        </QuestionCard>

        {/* ── Question 1: the formula, then one neuron worked ── */}
        <Note at={sumAt - 4} x={X0} y={y(290)} out={q1Out}>
          <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            a = <Mark at={fAt}>f(</Mark>
            <Mark at={sumAt + 2}>w · x</Mark> <Mark at={biasAt}>+ b</Mark>
            <Mark at={fAt}>)</Mark>
          </span>
        </Note>

        {NEURON.x.map((v, i) => (
          <React.Fragment key={i}>
            <Cells values={[[sn(v)]]} x={IN_X} y={y(IN_Y[i])} w={IN_W} h={h(CELL_H)} at={inputsAt - 4 + i * 3} out={q1Out} size={28} color={BLUE_INK} />
            <ElbowArrow
              points={[
                [IN_X + IN_W + 16, box(IN_Y[i])],
                [NX - NR - 6, y(NY) + (i - 1) * 34],
              ]}
              at={timesAt - 6 + i * 3}
              out={q1Out}
              color={INK_SOFT}
              width={2}
              head={12}
            />
            <Tagline x={IN_X + IN_W + 60} y={box(IN_Y[i]) - h(40) + (i - 1) * 8} at={timesAt + i * 3} out={q1Out} size={22} color={INK}>
              × {NEURON.w[i]} <span style={{ color: BLUE_INK }}>= {sn(NEURON.products[i])}</span>
            </Tagline>
          </React.Fragment>
        ))}
        <Tagline x={IN_X} y={y(IN_Y[0]) - h(40)} at={inputsAt} out={q1Out}>
          inputs
        </Tagline>

        {/* The neuron itself: a sum, then the activation. */}
        <Svg opacity={ease(frame, inputsAt, 12) * (1 - ease(frame, q1Out, 10))}>
          <circle cx={NX} cy={y(NY)} r={NR} fill={ease(frame, zAt, 10) > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${70 * ease(frame, zAt, 10)}%, ${PAPER})` : PAPER} stroke={INK} strokeWidth={2.4} />
          <line x1={NX} x2={NX} y1={y(NY) + NR + 70} y2={y(NY) + NR + 6} stroke={INK_SOFT} strokeWidth={2} opacity={ease(frame, plusAt - 2, 10)} />
        </Svg>
        <Tagline x={NX} y={y(NY) - h(22)} width={140} align="center" at={inputsAt + 2} out={zAt - 2} size={40} color={INK} weight={500}>
          Σ
        </Tagline>
        <Tagline x={NX} y={y(NY) - h(20)} width={140} align="center" at={zAt} out={q1Out} size={34} color={INK} weight={700}>
          {NEURON.z}
        </Tagline>
        <Tagline x={NX} y={y(NY) + NR + h(74)} width={160} align="center" at={plusAt - 2} out={q1Out} size={22} color={INK}>
          bias + {NEURON.b}
        </Tagline>

        <ElbowArrow points={[[NX + NR + 6, y(NY)], [ACT_X - 10, y(NY)]]} at={sigAt - 6} out={q1Out} color={INK_SOFT} width={2} head={12} />
        <div
          style={{
            position: "absolute",
            left: ACT_X,
            top: y(NY) - h(44),
            width: ACT_W,
            height: h(88),
            boxSizing: "border-box",
            border: `2.4px solid ${INK}`,
            borderRadius: 10,
            background: PAPER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ease(frame, sigAt - 4, 10) * (1 - ease(frame, q1Out, 10)) * (1 - lit * 0.55),
            ...label(26, INK),
            fontWeight: 650,
          }}
        >
          sigmoid
        </div>
        <Svg opacity={lit * (1 - ease(frame, q1Out, 10))}>
          <line x1={ACT_X - 8} x2={ACT_X - 8 + (ACT_W + 16) * lit} y1={y(NY) + h(4)} y2={y(NY) - h(4)} stroke={ACCENT_INK} strokeWidth={3.4} />
        </Svg>
        <ElbowArrow points={[[ACT_X + ACT_W + 10, y(NY)], [OUT_X - 14, y(NY)]]} at={aAt - 6} out={q1Out} color={INK_SOFT} width={2} head={12} />
        <Cells values={[[NEURON.a.toFixed(3)]]} x={OUT_X} y={y(NY) - h(CELL_H) / 2} w={120} h={h(CELL_H)} at={aAt - 2} out={q1Out} size={30} color={OK_INK} />
        <Note at={regAt - 2} x={ACT_X - 20} y={y(NY) + h(70)} out={q1Out}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>without it: just linear regression</span>
        </Note>

        {/* ── Question 2: two layers, then one matrix, then a non-linearity ── */}
        {/* Row A: through both layers. */}
        <Tagline x={X0} y={y(ROWS.a) - h(42)} at={onlyAt} size={22} color={INK}>
          two linear layers
        </Tagline>
        <Cells values={col(C.x)} x={330} y={y(ROWS.a)} w={W} h={H} at={goesAt - 2} color={BLUE_INK} format={sn} />
        <ElbowArrow points={[[420, midOf(ROWS.a)], [474, midOf(ROWS.a)]]} at={goesAt + 2} color={INK_SOFT} width={2} head={11} />
        <Cells values={C.W1} x={490} y={y(ROWS.a)} w={W} h={H} at={goesAt + 4} format={sn} />
        <Tagline x={490} y={y(ROWS.a) - h(42)} at={goesAt + 4} width={2 * W} align="center">
          layer 1
        </Tagline>
        <ElbowArrow points={[[654, midOf(ROWS.a)], [708, midOf(ROWS.a)]]} at={goesAt + 8} color={INK_SOFT} width={2} head={11} />
        <Cells values={col(C.hidden)} x={724} y={y(ROWS.a)} w={W} h={H} at={goesAt + 10} format={sn} />
        <ElbowArrow points={[[814, midOf(ROWS.a)], [868, midOf(ROWS.a)]]} at={goesAt + 12} color={INK_SOFT} width={2} head={11} />
        <Cells values={C.W2} x={884} y={y(ROWS.a)} w={W} h={H} at={goesAt + 14} format={sn} />
        <Tagline x={884} y={y(ROWS.a) - h(42)} at={goesAt + 14} width={2 * W} align="center">
          layer 2
        </Tagline>
        <ElbowArrow points={[[1048, midOf(ROWS.a)], [1102, midOf(ROWS.a)]]} at={outAt - 6} color={INK_SOFT} width={2} head={11} />
        <Cells
          values={col(C.twoLayers)}
          x={1118}
          y={y(ROWS.a)}
          w={W}
          h={H}
          at={outAt - 4}
          format={sn}
          look={() => ({ tint: { color: CELL_MARK, at: outAt, out: sameAt } })}
        />

        {/* Row B: one matrix, the product of the two. */}
        <Tagline x={X0} y={y(ROWS.b) - h(42)} at={multAt - 4} size={22} color={INK}>
          one matrix: layer 2 × layer 1
        </Tagline>
        <Cells values={col(C.x)} x={330} y={y(ROWS.b)} w={W} h={H} at={multAt - 2} color={BLUE_INK} format={sn} />
        <ElbowArrow points={[[420, midOf(ROWS.b)], [474, midOf(ROWS.b)]]} at={multAt + 2} color={INK_SOFT} width={2} head={11} />
        <Cells values={C.W} x={490} y={y(ROWS.b)} w={W} h={H} at={multAt + 2} format={sn} />
        <ElbowArrow points={[[654, midOf(ROWS.b)], [1102, midOf(ROWS.b)]]} at={sameAt - 8} color={INK_SOFT} width={2} head={11} />
        <Cells
          values={col(C.oneLayer)}
          x={1118}
          y={y(ROWS.b)}
          w={W}
          h={H}
          at={sameAt - 4}
          format={sn}
          look={() => ({ tint: { color: CELL_OK, at: sameAt + 2 } })}
        />
        <Note at={everyAt - 2} x={1240} y={midOf(ROWS.b) - h(36)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the same, for every input</span>
        </Note>
        <Note at={tenAt} x={1240} y={midOf(ROWS.b) + h(4)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>ten layers: still one matrix</span>
        </Note>
        <Svg opacity={ease(frame, sameAt, 10)}>
          <line x1={1118 + W} x2={1118 + W} y1={y(ROWS.a) + cellsH + 8} y2={y(ROWS.b) - 8} stroke={OK} strokeWidth={2.4} strokeDasharray="4 6" />
        </Svg>
        <Tagline x={1118 + W + 14} y={(y(ROWS.a) + cellsH + y(ROWS.b)) / 2 - h(14)} at={sameAt} size={24} color={OK_INK}>
          =
        </Tagline>

        {/* Row C: zero the negatives in between. */}
        <Tagline x={X0} y={y(ROWS.c) - h(42)} at={zeroAt - 6} size={22} color={INK}>
          an activation in between
        </Tagline>
        <Cells values={col(C.x)} x={330} y={y(ROWS.c)} w={W} h={H} at={zeroAt - 4} color={BLUE_INK} format={sn} />
        <ElbowArrow points={[[420, midOf(ROWS.c)], [474, midOf(ROWS.c)]]} at={zeroAt - 2} color={INK_SOFT} width={2} head={11} />
        <Cells values={C.W1} x={490} y={y(ROWS.c)} w={W} h={H} at={zeroAt - 2} format={sn} />
        <ElbowArrow points={[[654, midOf(ROWS.c)], [708, midOf(ROWS.c)]]} at={zeroAt} color={INK_SOFT} width={2} head={11} />
        <Cells
          values={col(C.hidden)}
          x={724}
          y={y(ROWS.c)}
          w={W}
          h={H}
          at={zeroAt}
          format={sn}
          look={(r) => (C.hidden[r] < 0 ? { tint: { color: CELL_BAD, at: zeroAt + 4 } } : undefined)}
        />
        <Tagline x={724 + W / 2} y={y(ROWS.c) + cellsH + h(10)} width={240} align="center" at={zeroAt + 4} size={20} color={ACCENT_INK}>
          zero the negatives
        </Tagline>
        <ElbowArrow points={[[814, midOf(ROWS.c)], [868, midOf(ROWS.c)]]} at={zeroAt + 6} color={INK_SOFT} width={2} head={11} />
        <Cells values={col(C.relu)} x={884} y={y(ROWS.c)} w={W} h={H} at={zeroAt + 8} format={sn} />
        <ElbowArrow points={[[974, midOf(ROWS.c)], [1028, midOf(ROWS.c)]]} at={becomesAt - 8} color={INK_SOFT} width={2} head={11} />
        <Cells values={C.W2} x={1044} y={y(ROWS.c)} w={W} h={H} at={becomesAt - 6} format={sn} />
        <ElbowArrow points={[[1208, midOf(ROWS.c)], [1262, midOf(ROWS.c)]]} at={becomesAt - 4} color={INK_SOFT} width={2} head={11} />
        <Cells
          values={col(C.withRelu)}
          x={1278}
          y={y(ROWS.c)}
          w={W}
          h={H}
          at={becomesAt - 2}
          format={sn}
          look={() => ({ tint: { color: CELL_MARK, at: becomesAt + 2 } })}
        />
        <Note at={depthAt - 2} x={1400} y={midOf(ROWS.c) - h(18)}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={whichAt}>now depth adds something</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
