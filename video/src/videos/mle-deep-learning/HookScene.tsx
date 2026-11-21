import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NORM } from "./data";
import { Art, BLUE_INK, Box, Drift, Flow, GREY_INK, Headline, INK, INK_SOFT, Kicker, Line, LOOK, LOOK_INK, Node, pulse, Pixels, Svg, X0 } from "./parts";

/** The deep stack: columns of units, every unit joined to the next column's. */
const COLS = 7;
const PER_COL = 5;
const STACK_X0 = 760;
const STACK_X1 = 1190;
/** The round as numbered chips. */
const TOTAL = 15;
const QUICK = [12, 13];
const CHIP = 56;
const CHIP_PITCH = 68;
/** The digits on the plan: sixteen of scikit-learn's, two rows of eight. */
const DIGIT_CELL = 6;
const DIGIT_PITCH = 58;
const DIGIT_X = 1300;

/**
 * The opening: training is maximum likelihood, as for a logistic regression
 * (inputs, one weighted sum, a sigmoid), and a deep network is the same thing
 * many layers deep, with a gradient that has to make it back through every
 * one of them (the yellow arrow). Then the round as fifteen chips, thirteen
 * worked and two quick, and the digits most of the networks are trained on.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const mlAt = n.word("hook", "maximum likelihood");
  const weightsAt = n.word("hook", "find the weights");
  const scaleAt = n.word("hook", "The difference is scale");
  const layersAt = n.word("hook", "many layers");
  const millionsAt = n.word("hook", "millions of weights");
  const gradAt = n.word("hook", "a gradient");
  const backAt = n.word("hook", "back through all of them");
  const fifteenAt = n.word("plan", "Fifteen questions");
  const thirteenAt = n.word("plan", "thirteen worked through");
  const digitAt = n.word("plan", "small digit networks");
  const quickAt = n.word("plan", "two quick ones");
  const end = n.beat("plan").to;

  const cy = y(470);
  const inputs = [-1, 0, 1].map((k) => cy + k * h(72));
  const SUM_X = 250;
  const SUM_W = 170;
  const SIG_X = 480;
  const SIG_W = 64;

  const colX = (c: number) => STACK_X0 + (c * (STACK_X1 - STACK_X0)) / (COLS - 1);
  const unitY = (r: number) => cy + (r - (PER_COL - 1) / 2) * h(50);
  const colAt = (c: number) => layersAt - 4 + c * 3;
  const weightsLit = pulse(frame, millionsAt, 30);

  const chipsTop = y(730);
  const digitsTop = y(735);
  const digitIds = Object.keys(NORM.images);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 6} level={-30} />
      <Sfx name="el-pencil" at={weightsAt} level={-36} />
      <Sfx name="el-pencil" at={layersAt} level={-36} />
      <Sfx name="el-whoosh" at={gradAt} level={-35} />
      <Sfx name="el-sprinkle" at={fifteenAt} level={-34} />
      <Sfx name="el-tap" at={digitAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Machine learning engineer interview questions</Kicker>
        <Headline lead="Maximum likelihood," turn="at scale" at={mlAt - 4} turnAt={scaleAt - 4} />

        <Art name="orangutan" at={from + 6} left={1330} top={y(250)} h={440} />

        {/* ── One weighted sum: a logistic regression ── */}
        <Line at={mlAt + 6} x={X0} y={y(312)} size={24} color={INK_SOFT}>
          Logistic regression
        </Line>
        {inputs.map((iy, i) => (
          <React.Fragment key={i}>
            <Node x={150} y={iy} r={20} at={mlAt + 8 + i * 3} />
            <Flow points={[[170, iy], [SUM_X - 2, cy]]} at={weightsAt + i * 3} noHead width={2} />
          </React.Fragment>
        ))}
        <Box x={SUM_X} y={cy - 32} w={SUM_W} h={64} at={weightsAt} size={28}>
          <MathRun>
            <I>w</I> · <I>x</I> + <I>b</I>
          </MathRun>
        </Box>
        <Flow points={[[SUM_X + SUM_W + 2, cy], [SIG_X - 4, cy]]} at={weightsAt + 10} />
        <Box x={SIG_X} y={cy - 32} w={SIG_W} h={64} at={weightsAt + 14} size={28}>
          <MathRun>
            <I>σ</I>
          </MathRun>
        </Box>
        <Flow points={[[SIG_X + SIG_W + 2, cy], [SIG_X + SIG_W + 52, cy]]} at={weightsAt + 20} />
        <Line at={weightsAt + 26} x={SIG_X + SIG_W + 62} y={cy - 18} size={26}>
          <MathRun>
            <I>p</I>
          </MathRun>
        </Line>

        {/* ── The same thing, many layers deep ── */}
        <Line at={layersAt - 6} x={STACK_X0 - 20} y={y(312)} size={24} color={INK_SOFT}>
          Many layers deep
        </Line>
        <Svg>
          {Array.from({ length: COLS - 1 }, (_, c) => {
            const p = ease(frame, colAt(c + 1), 10);
            if (p <= 0) return null;
            return Array.from({ length: PER_COL * PER_COL }, (_, k) => {
              const a = Math.floor(k / PER_COL);
              const b = k % PER_COL;
              return (
                <line
                  key={`${c}-${k}`}
                  x1={colX(c) + 11}
                  y1={unitY(a)}
                  x2={colX(c) + 11 + (colX(c + 1) - colX(c) - 22) * p}
                  y2={unitY(a) + (unitY(b) - unitY(a)) * p}
                  stroke={INK}
                  strokeWidth={1}
                  opacity={0.22 + 0.3 * weightsLit}
                />
              );
            });
          })}
        </Svg>
        {Array.from({ length: COLS * PER_COL }, (_, k) => {
          const c = Math.floor(k / PER_COL);
          const r = k % PER_COL;
          return <Node key={k} x={colX(c)} y={unitY(r)} r={11} at={colAt(c)} />;
        })}

        {/* The gradient, running back down through every layer. */}
        <Flow points={[[STACK_X1 + 10, y(610)], [STACK_X0 - 10, y(610)]]} at={gradAt} dur={Math.max(20, backAt - gradAt + 16)} color={LOOK} width={5} head={18} />
        <Line at={backAt} x={STACK_X0 - 20} y={y(610) + h(26)} size={24} color={LOOK_INK}>
          The gradient, back through every layer
        </Line>

        {/* ── The round ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const q = i + 1;
          const quick = QUICK.includes(q);
          return (
            <Box
              key={q}
              x={X0 + i * CHIP_PITCH}
              y={chipsTop}
              w={CHIP}
              h={h(50)}
              at={fifteenAt - 2 + i * 1.5}
              hue={quick ? "gray" : "blue"}
              hueAt={quick ? quickAt : thirteenAt + i}
              size={24}
            >
              {q}
            </Box>
          );
        })}
        <Line at={thirteenAt} x={X0} y={chipsTop + h(50) + h(28)} size={24} color={BLUE_INK}>
          13 worked through
          <span style={{ color: GREY_INK, opacity: ease(frame, quickAt, 10) }}>, 2 quick ones (12 and 13)</span>
        </Line>

        {/* The digits most of the networks are trained on. */}
        {digitIds.map((id, i) => (
          <Pixels
            key={id}
            values={NORM.images[id]}
            x={DIGIT_X + (i % 8) * DIGIT_PITCH}
            y={digitsTop + Math.floor(i / 8) * DIGIT_PITCH}
            cell={DIGIT_CELL}
            gap={0}
            at={digitAt - 2 + i}
          />
        ))}
        <Line at={digitAt + 8} x={DIGIT_X} y={digitsTop + 2 * DIGIT_PITCH + 6} size={22} color={INK_SOFT}>
          {"scikit-learn's digits, 8 × 8 pixels"}
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
