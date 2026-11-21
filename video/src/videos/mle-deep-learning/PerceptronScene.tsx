import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { XOR } from "./data";
import { ACCENT, ACCENT_INK, BAR, Box, Drift, Fade, Flow, INK, INK_SOFT, int, Line, Mark, OK_INK, PAPER, Ring, Svg } from "./parts";

const IN_X = 190;
const IN_R = 34;
const BOX_X = 340;
const BOX_W = 310;
const OUT_X = 710;
const OUT_W = 170;
const Y_X = 990;
/** The unit square: -0.25 to 1.25 on both axes across SQ px. */
const SQ_X = 1250;
const SQ = 360;
const SQ_PAD = 0.25;

const x1 = (k: string | number) => (
  <MathRun>
    <I>x</I>
    <sub>{k}</sub>
  </MathRun>
);

/**
 * Questions 1 and 2 on one figure. A perceptron is one weighted sum through
 * a step: one straight line. XOR's four points on the unit square have no
 * line that gets them all; the best of 226,981 tried gets three. Two hidden
 * ReLU units, with the weights written in their boxes, give 0, 1, 1, 0. Take
 * the ReLU out and the same weights fold into one linear function, -x1 - x2
 * + 2, which misses (0, 0) the way any line misses one; put it back and the
 * network solves it again.
 */
export const PerceptronScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const q1At = n.word("q1", "Question one");
  const q1TextAt = n.word("q1", "What is a perceptron");
  const sumAt = n.word("q1-a", "A weighted sum");
  const activAt = n.word("q1-a", "through an activation");
  const lineAt = n.word("q1-a", "one straight line");
  const xorAt = n.word("q1-xor", "learn XOR");
  const exactlyAt = n.word("q1-xor", "exactly one input is one");
  const noLineAt = n.word("q1-xor", "no line separates");
  const bestAt = n.word("q1-xor", "the best gets three");
  const q2At = n.word("q2", "Question two");
  const q2TextAt = n.word("q2", "Why do we need");
  const addAt = n.word("q2", "Add two hidden units");
  const reluAt = n.word("q2", "with ReLU");
  const outsAt = n.word("q2", "zero, one, one, zero");
  const reluOutAt = n.word("q2-collapse", "Take the ReLU out");
  const collapseAt = n.word("q2-collapse", "collapse to one linear function");
  const minusAt = n.word("q2-collapse", "minus each input");
  const againAt = n.word("q2-collapse", "one line again");
  const withoutAt = n.word("q2-collapse", "Without a non-linearity");
  const withOneAt = n.word("q2-collapse", "with one");
  const anyAt = n.word("q2-collapse", "almost any function");
  const whichAt = n.word("act-in", "which non-linearity");
  const end = n.beat("act-in").to;

  const ya = y(440);
  const yb = y(600);
  const cy = (ya + yb) / 2;
  const BH = h(66);

  // ── The unit square ──
  const top = y(360);
  const px = (v: number) => SQ_X + ((v + SQ_PAD) / (1 + 2 * SQ_PAD)) * SQ;
  const py = (v: number) => top + SQ - ((v + SQ_PAD) / (1 + 2 * SQ_PAD)) * SQ;
  const pts = XOR.points.map(([a, b], i) => ({ x: px(a), y: py(b), label: XOR.labels[i] }));
  /** A line x1 + x2 = c across the square, clipped to it. */
  const diag = (c: number) => {
    const lo = -SQ_PAD;
    const hi = 1 + SQ_PAD;
    const a: [number, number] = c - lo > hi ? [c - hi, hi] : [lo, c - lo];
    const b: [number, number] = c - lo > hi ? [hi, c - hi] : [c - lo, lo];
    return { x1: px(a[0]), y1: py(a[1]), x2: px(b[0]), y2: py(b[1]) };
  };
  // The first line: shown on "one straight line", swept down to the best one.
  const sweep = ease(frame, noLineAt - 4, Math.max(20, bestAt - noLineAt));
  const firstC = 2.1 - (2.1 - 0.5) * sweep;
  const firstOn = ease(frame, lineAt, 12) * (1 - ease(frame, addAt, 10));
  const firstLine = diag(firstC);
  // The collapsed function's line, -x1 - x2 + 2 = 0.5.
  const secondOn = ease(frame, againAt, 14) * (1 - ease(frame, withOneAt, 10));
  const secondLine = diag(1.5);

  const relu = 1 - ease(frame, reluOutAt, 10) + ease(frame, withOneAt, 10);
  const reluWrap = (inner: React.ReactNode) => (
    <MathRun>
      <span style={{ opacity: relu }}>max(0, </span>
      {inner}
      <span style={{ opacity: relu }}>)</span>
    </MathRun>
  );

  const network = (at: number, out?: number) => (
    <>
      {[ya, yb].map((by, j) =>
        [ya, yb].map((iy, i) => (
          <Flow key={`${i}${j}`} points={[[IN_X + IN_R + 2, iy], [BOX_X - 4, by + (i - 0.5) * 18]]} at={at + 2 + i * 2 + j} out={out} width={2.2} head={13} />
        )),
      )}
      <Box x={BOX_X} y={ya - BH / 2} w={BOX_W} h={BH} at={at + 4} out={out} size={28} hue="yellow" hueAt={reluAt} hueOut={reluOutAt}>
        {reluWrap(
          <>
            <I>x</I>
            <sub>1</sub> + <I>x</I>
            <sub>2</sub>
          </>,
        )}
      </Box>
      <Box x={BOX_X} y={yb - BH / 2} w={BOX_W} h={BH} at={at + 7} out={out} size={28} hue="yellow" hueAt={reluAt} hueOut={reluOutAt}>
        {reluWrap(
          <>
            <I>x</I>
            <sub>1</sub> + <I>x</I>
            <sub>2</sub> − 1
          </>,
        )}
      </Box>
      <Line at={at + 4} out={out} x={BOX_X} y={ya - BH / 2 - h(40)} size={22} color={INK_SOFT}>
        <MathRun>
          <I>h</I>
          <sub>1</sub>
        </MathRun>
      </Line>
      <Line at={at + 7} out={out} x={BOX_X} y={yb + BH / 2 + h(10)} size={22} color={INK_SOFT}>
        <MathRun>
          <I>h</I>
          <sub>2</sub>
        </MathRun>
      </Line>
      <Flow points={[[BOX_X + BOX_W + 2, ya], [OUT_X - 4, cy - 10]]} at={at + 12} out={out} width={2.2} head={13} />
      <Flow points={[[BOX_X + BOX_W + 2, yb], [OUT_X - 4, cy + 10]]} at={at + 13} out={out} width={2.2} head={13} />
      <Box x={OUT_X} y={cy - BH / 2} w={OUT_W} h={BH} at={at + 14} out={out} size={28}>
        <MathRun>
          <I>h</I>
          <sub>1</sub> − 2<I>h</I>
          <sub>2</sub>
        </MathRun>
      </Box>
      <Flow points={[[OUT_X + OUT_W + 2, cy], [Y_X - IN_R - 4, cy]]} at={at + 18} out={out} width={2.2} head={13} />
    </>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sumAt} level={-36} />
      <Sfx name="el-tap" at={exactlyAt} level={-30} />
      <Sfx name="el-whoosh" at={noLineAt} level={-36} />
      <Sfx name="el-pencil" at={bestAt + 4} level={-35} />
      <Sfx name="el-pop" at={addAt} level={-31} />
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={i} name="el-tap" at={outsAt + i * 7} level={-31} />
      ))}
      <Sfx name="el-whoosh" at={collapseAt} level={-35} />
      <Sfx name="el-pencil" at={againAt} level={-35} />
      <Sfx name="el-pop" at={withOneAt} level={-31} />
      <Sfx name="el-chime" at={n.beat("q2-collapse").to + 8} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={q1At - 4} textAt={q1TextAt - 4} out={q2At - 6}>
          What is a perceptron?
        </QuestionCard>
        <QuestionCard n={2} at={q2At - 2} textAt={q2TextAt - 4}>
          Why do we need non-linear activation functions?
        </QuestionCard>

        {/* ── The inputs, shared by every version of the network ── */}
        {[ya, yb].map((iy, i) => (
          <Box key={i} x={IN_X - IN_R} y={iy - IN_R} w={2 * IN_R} h={2 * IN_R} at={sumAt - 4 + i * 3} size={26} radius={IN_R}>
            {x1(i + 1)}
          </Box>
        ))}
        <Box x={Y_X - IN_R} y={cy - IN_R} w={2 * IN_R} h={2 * IN_R} at={activAt + 8} size={26} radius={IN_R}>
          <MathRun>
            <I>ŷ</I>
          </MathRun>
        </Box>

        {/* ── One perceptron: a weighted sum, then a step ── */}
        {[ya, yb].map((iy, i) => (
          <Flow key={i} points={[[IN_X + IN_R + 2, iy], [BOX_X - 4, cy + (i - 0.5) * 18]]} at={sumAt + i * 2} out={addAt} width={2.2} head={13} />
        ))}
        <Box x={BOX_X} y={cy - BH / 2} w={BOX_W} h={BH} at={sumAt + 2} out={addAt} size={28}>
          <MathRun>
            <I>w</I>
            <sub>1</sub>
            <I>x</I>
            <sub>1</sub> + <I>w</I>
            <sub>2</sub>
            <I>x</I>
            <sub>2</sub> + <I>b</I>
          </MathRun>
        </Box>
        <Flow points={[[BOX_X + BOX_W + 2, cy], [OUT_X - 4, cy]]} at={activAt} out={addAt} width={2.2} head={13} />
        <Box x={OUT_X} y={cy - BH / 2} w={OUT_W} h={BH} at={activAt + 2} out={addAt} size={26}>
          step
        </Box>
        <Flow points={[[OUT_X + OUT_W + 2, cy], [Y_X - IN_R - 4, cy]]} at={activAt + 6} out={addAt} width={2.2} head={13} />
        <Line at={lineAt} out={addAt} x={BOX_X} y={yb + BH / 2 + h(30)} size={24} color={INK_SOFT}>
          Alone: a linear classifier, one straight line
        </Line>

        {/* ── Two hidden ReLU units ── */}
        {network(addAt, collapseAt)}
        {network(withOneAt)}

        {/* ── Without the ReLU: one linear function ── */}
        {[ya, yb].map((iy, i) => (
          <Flow key={i} points={[[IN_X + IN_R + 2, iy], [BOX_X - 4, cy + (i - 0.5) * 18]]} at={collapseAt + 4 + i * 2} out={withOneAt} width={2.2} head={13} />
        ))}
        <Box x={BOX_X} y={cy - BH / 2} w={OUT_X + OUT_W - BOX_X} h={BH} at={collapseAt + 4} out={withOneAt} size={30} hue="red" hueAt={minusAt}>
          <MathRun>
            −<I>x</I>
            <sub>1</sub> − <I>x</I>
            <sub>2</sub> + 2
          </MathRun>
        </Box>
        <Flow points={[[OUT_X + OUT_W + 2, cy], [Y_X - IN_R - 4, cy]]} at={collapseAt + 10} out={withOneAt} width={2.2} head={13} />

        <Line at={withoutAt} x={IN_X - IN_R} y={y(720)} size={26} color={INK}>
          Without a non-linearity, stacked layers are one layer
        </Line>
        <Line at={withOneAt + 4} x={IN_X - IN_R} y={y(720) + h(50)} size={26} color={OK_INK}>
          <Mark at={whichAt}>Non-linear between layers</Mark>: almost any function
        </Line>

        {/* ── XOR on the unit square ── */}
        <Fade at={lineAt - 6}>
          <Svg>
            <rect x={px(-SQ_PAD)} y={top} width={SQ} height={SQ} fill="none" stroke={INK_SOFT} strokeWidth={1} opacity={0.5} />
            {[0, 1].map((v) => (
              <React.Fragment key={v}>
                <text x={px(v)} y={top + SQ + 30} textAnchor="middle" style={{ ...label(21, INK_SOFT), fill: INK_SOFT }}>
                  {v}
                </text>
                <text x={px(-SQ_PAD) - 14} y={py(v) + 7} textAnchor="end" style={{ ...label(21, INK_SOFT), fill: INK_SOFT }}>
                  {v}
                </text>
              </React.Fragment>
            ))}
          </Svg>
          <div style={{ position: "absolute", left: px(1.25) + 14, top: top + SQ - 18, ...note(24, INK_SOFT) }}>{x1(1)}</div>
          <div style={{ position: "absolute", left: px(-SQ_PAD) - 12, top: top - 42, ...note(24, INK_SOFT) }}>{x1(2)}</div>
        </Fade>
        <Svg>
          <clipPath id="xor-square">
            <rect x={px(-SQ_PAD)} y={top} width={SQ} height={SQ} />
          </clipPath>
          <g clipPath="url(#xor-square)">
            {firstOn > 0 ? (
              <line {...firstLine} stroke={INK} strokeWidth={3} opacity={firstOn} strokeDasharray="10 7" />
            ) : null}
            {secondOn > 0 ? <line {...secondLine} stroke={ACCENT} strokeWidth={3} opacity={secondOn} strokeDasharray="10 7" /> : null}
          </g>
          {pts.map((p, i) => {
            const s = ease(frame, lineAt - 2 + i * 3, 10);
            if (s <= 0) return null;
            const filled = p.label === 1 ? ease(frame, exactlyAt + 4, 12) : 0;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={16 * s}
                fill={filled > 0 ? `color-mix(in srgb, ${BAR} ${Math.round(filled * 100)}%, ${PAPER})` : PAPER}
                stroke={BAR}
                strokeWidth={3}
              />
            );
          })}
        </Svg>
        <Line at={xorAt} x={px(-SQ_PAD)} y={top - h(86)} size={24} color={INK}>
          XOR: <Num>1</Num> when exactly one input is <Num>1</Num>
        </Line>
        {/* The best line misses (1, 1); the collapsed function misses (0, 0). */}
        <Ring x={pts[3].x} y={pts[3].y} r={28} at={bestAt + 2} out={addAt} />
        <Ring x={pts[0].x} y={pts[0].y} r={28} at={againAt + 8} out={withOneAt} />
        <Line at={noLineAt} out={addAt} x={px(-SQ_PAD)} y={top + SQ + h(56)} size={24} color={ACCENT_INK}>
          No line gets all four
        </Line>
        <Line at={bestAt} out={addAt} x={px(-SQ_PAD)} y={top + SQ + h(100)} size={24} color={INK}>
          Best of <Num>{int(XOR.linesSearched)}</Num> lines tried: <Num>{Math.round(XOR.bestLine * 4)}</Num> of 4
        </Line>
        <Line at={againAt + 4} out={withOneAt} x={px(-SQ_PAD)} y={top + SQ + h(56)} size={24} color={ACCENT_INK}>
          One line again: <Num>3</Num> of 4
        </Line>

        {/* Each point's output: 0, 1, 1, 0 with the ReLU, 2, 1, 1, 0 without. */}
        {pts.map((p, i) => {
          const dx = p.x < px(0.5) ? -34 : 34;
          const place: React.CSSProperties = {
            position: "absolute",
            left: dx < 0 ? undefined : p.x + dx,
            right: dx < 0 ? 1920 - (p.x + dx) : undefined,
            top: p.y - 52,
            ...note(28, OK_INK),
            fontWeight: 600,
            whiteSpace: "nowrap",
          };
          const on = (a: number, o?: number) => ease(frame, a, 8) * (o === undefined ? 1 : 1 - ease(frame, o, 8));
          return (
            <React.Fragment key={i}>
              <div style={{ ...place, opacity: on(outsAt + i * 7, collapseAt) }}>{XOR.withRelu[i]}</div>
              <div
                style={{
                  ...place,
                  color: XOR.withoutRelu[i] === XOR.labels[i] ? INK : ACCENT_INK,
                  opacity: on(collapseAt + 6 + i * 2, withOneAt),
                }}
              >
                {XOR.withoutRelu[i]}
              </div>
              <div style={{ ...place, opacity: on(withOneAt + 6 + i * 2) }}>{XOR.withRelu[i]}</div>
            </React.Fragment>
          );
        })}
        <Line at={anyAt} x={px(-SQ_PAD)} y={top + SQ + h(56)} size={24} color={OK_INK}>
          With the ReLU: <Num>4</Num> of 4
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
