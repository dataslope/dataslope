import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LEARN } from "./data";
import { at, Axes, type Box, Curve, Drift, Mark, OK_INK, PanelTitle, type Scale, Svg } from "./parts";

const LEFT: Box = { left: 180, right: 840, top: 430, bottom: 770 };
const RIGHT: Box = { left: 1100, right: 1760, top: 430, bottom: 770 };
const Y_TOP = 0.4;

/**
 * Question 7 on the video's own 600 points from the same noisy sine, twenty
 * shuffles at each size: a straight line's training and validation errors
 * meeting early near 0.30 and staying there (bias), and degree 9's starting
 * far apart and closing onto the noise floor of 0.09 (variance).
 */
export const LearnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("learn").from;
  const qAt = n.word("learn", "Question");
  const textAt = n.word("learn", "What is learning curve analysis");
  const asked = n.word("learn", "Train on more and more data");
  const bothAt = n.word("learn", "track both errors");
  const lineAt = n.word("learn-shapes", "A straight line on the sine wave");
  const meetAt = n.word("learn-shapes", "meet early and stay high");
  const biasAt = n.word("learn-bias", "That's bias");
  const flexAt = n.word("learn-bias", "a more flexible model");
  const nineAt = n.word("learn-nine", "The degree-nine polynomial");
  const wideAt = n.word("learn-nine", "the gap starts wide");
  const closesAt = n.word("learn-nine", "closes as the data grows");
  const noiseAt = n.word("learn-nine", "down to the noise");
  const varianceAt = n.word("learn-nine", "That's variance");
  const cureAt = n.word("learn-nine", "more data is the cure");
  const rareAt = n.word("pr-in", "on a rare event");
  const end = n.beat("pr-in").to;

  const xsOf = (b: Box): Scale => ({ lo: 0, hi: 450, a: b.left, b: b.right });
  const ysOf = (b: Box): Scale => ({ lo: 0, hi: Y_TOP, a: y(b.bottom), b: y(b.top) });
  const clipOf = (b: Box): Box => ({ left: b.left - 12, right: b.right + 12, top: y(b.top) - 8, bottom: y(b.bottom) + 12 });
  const pts = (vals: number[]) => LEARN.sizes.map((s, i) => [s, vals[i]] as const);
  const panels = [
    { b: LEFT, d: "1" as const, title: "a straight line", at: lineAt },
    { b: RIGHT, d: "9" as const, title: "degree 9", at: nineAt },
  ];

  // The gap at the second size on the right, then where it ends up.
  const gx = at(xsOf(RIGHT), LEARN.sizes[1]);
  const gTrain = at(ysOf(RIGHT), LEARN["9"].train[1]);
  const gVal = at(ysOf(RIGHT), LEARN["9"].val[1]);
  const wideP = ease(frame, wideAt, 14);
  const lastI = LEARN.sizes.length - 1;
  const lineLevel = (LEARN["1"].train[lastI] + LEARN["1"].val[lastI]) / 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={lineAt + 2} level={-34} />
      <Sfx name="el-pop" at={meetAt + 4} level={-32} />
      <Sfx name="el-pencil" at={nineAt + 2} level={-34} />
      <Sfx name="el-scratch" at={wideAt + 2} level={-34} />
      <Sfx name="el-pop" at={cureAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={end - 6} size={60}>
          What is learning curve analysis?
        </QuestionCard>
        <Note at={bothAt - 2} x={LEFT.left} y={y(270)} out={end - 8}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            Train on more and more data; track <span style={{ color: BLUE_INK, fontWeight: 650 }}>training</span> and{" "}
            <span style={{ fontWeight: 650 }}>validation</span> error.
          </span>
        </Note>

        {panels.map((p) => (
          <React.Fragment key={p.d}>
            <PanelTitle x={p.b.left} y={y(p.b.top) - h(54)} at={p.d === "1" ? asked : p.at - 4} color={INK} out={end - 8}>
              {p.title}
            </PanelTitle>
            <Axes
              x={xsOf(p.b)}
              y={ysOf(p.b)}
              xTicks={[100, 200, 300, 400]}
              yTicks={[0, 0.1, 0.2, 0.3, 0.4]}
              yFormat={(v) => fmt(v, 1)}
              xTitle="training points"
              at={asked - 4 + (p.d === "9" ? 6 : 0)}
              out={end - 8}
            />
            <Curve points={pts(LEARN[p.d].train)} x={xsOf(p.b)} y={ysOf(p.b)} at={p.at + 2} dur={26} color={BAR} width={3.4} clip={clipOf(p.b)} dots={5} out={end - 8} />
            <Curve points={pts(LEARN[p.d].val)} x={xsOf(p.b)} y={ysOf(p.b)} at={p.at + 8} dur={26} color={INK} width={3.4} clip={clipOf(p.b)} dots={5} out={end - 8} />
            <Svg opacity={ease(frame, noiseAt - 2, 12) * (1 - ease(frame, end - 8, 10))}>
              <line
                x1={p.b.left}
                x2={p.b.right}
                y1={at(ysOf(p.b), LEARN.noise)}
                y2={at(ysOf(p.b), LEARN.noise)}
                stroke={INK_SOFT}
                strokeWidth={2}
                strokeDasharray="3 7"
              />
              <text x={p.b.right} y={at(ysOf(p.b), LEARN.noise) - 10} textAnchor="end" style={{ ...label(19, INK_SOFT), fontWeight: 650 }}>
                the noise: {fmt(LEARN.noise)}
              </text>
            </Svg>
          </React.Fragment>
        ))}

        {/* ── Left: met early, stayed high ── */}
        <Svg opacity={ease(frame, meetAt, 12) * (1 - ease(frame, end - 8, 10))}>
          <rect
            x={at(xsOf(LEFT), 60)}
            y={at(ysOf(LEFT), lineLevel) - 18}
            width={(at(xsOf(LEFT), 430) - at(xsOf(LEFT), 60)) * ease(frame, meetAt, 18)}
            height={36}
            rx={18}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.4}
            strokeDasharray="7 6"
          />
        </Svg>
        <Note at={meetAt + 6} x={LEFT.left + 20} y={at(ysOf(LEFT), lineLevel) - h(76)} out={end - 8}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>both stay near {fmt(lineLevel, 1)}</span>
        </Note>
        <Note at={biasAt - 2} x={LEFT.left} y={y(LEFT.bottom) + h(76)} out={end - 8}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            bias: more data won&apos;t help
            {/* What will, in the right answer's green. */}
            <span style={{ color: OK_INK, opacity: ease(frame, flexAt - 2, 10) }}>; a more flexible model will</span>
          </span>
        </Note>

        {/* ── Right: wide, then closed ── */}
        <Svg opacity={wideP * (1 - ease(frame, closesAt + 20, 12))}>
          <line x1={gx} x2={gx} y1={gTrain} y2={gTrain + (gVal - gTrain) * wideP} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" />
        </Svg>
        <Note at={wideAt + 4} x={gx + 16} y={(gTrain + gVal) / 2 - h(16)} out={closesAt + 20}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the gap</span>
        </Note>
        <Note at={varianceAt - 2} x={RIGHT.left} y={y(RIGHT.bottom) + h(76)} out={end - 8}>
          <span style={{ ...note(27, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            variance: <Mark at={rareAt - 10}>more data helps</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
