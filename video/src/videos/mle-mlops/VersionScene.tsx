import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SEEDS } from "./data";
import { Box, CornerLoop, Drift, Flow, LIT_LINE, Line, Mark, OK, OK_INK, Phase, Q_SIZE, Q_W, Spot, Svg, X0, YELLOW_INK } from "./parts";

/** The four things, left to right. */
const BOXES = [
  { x: X0, w: 250 },
  { x: 410, w: 250 },
  { x: 700, w: 390 },
  { x: 1130, w: 250 },
];
const ROW_TOP = 330;
const ROW_H = 96;
/** The seed strip: held-out accuracy from 96% to 98%. */
const AX = { left: 170, right: 1110, lo: 0.96, hi: 0.98 };
const BASE = 712;
const R = 10;
const STACK = 24;
const RIGHT_X = 1230;

/**
 * Questions 2 and 3: the four things to version (code, data, config, the
 * artifact) inside the container image that pins the libraries; the three
 * ways to version data; then why the seed belongs in the config: twenty
 * random forests on the digits, nothing changed but the seed, spread from
 * 96.1% to 97.8%, and seed 0 run twice landing on the same spot. A one-point
 * gain fits inside that spread.
 */
export const VersionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Questions two and three");
  const textAt = n.word("q2", "What do you need to version");
  const codeAt = n.word("q2-four", "the code");
  const dataAt = n.word("q2-four", "the data");
  const configAt = n.word("q2-four", "the config");
  const artifactAt = n.word("q2-four", "the trained artifact");
  const containerAt = n.word("q2-four", "A container image");
  const awkwardAt = n.word("q2-data", "Data is the awkward one");
  const dvcAt = n.word("q2-data", "Track snapshots");
  const travelAt = n.word("q2-data", "query a warehouse");
  const pathsAt = n.word("q2-data", "or write to immutable");
  const goalAt = n.word("q2-data", "The goal");
  const seedAt = n.word("q2-seed", "Why log the seed");
  const twentyAt = n.word("q2-seed", "twenty times");
  const lowAt = n.word("q2-seed", "ninety-six point one");
  const highAt = n.word("q2-seed", "ninety-seven point eight percent");
  const fixAt = n.word("q2-seed", "Fix the seed");
  const matchAt = n.word("q2-seed", "every prediction matches");
  const gainAt = n.word("q2-why", "a one-point gain");
  const luckyAt = n.word("q2-why", "a lucky seed");
  const severalAt = n.word("q2-why", "judge a change over several seeds");
  const reproAt = n.word("q2-why", "reproducible means");
  const end = n.beat("q2-why").to;

  const rise = ease(frame, awkwardAt - 12, 22);
  const rowTop = y(ROW_TOP) + h(130) * (1 - rise);
  const rowH = h(ROW_H);
  const ax = (v: number) => AX.left + ((v - AX.lo) / (AX.hi - AX.lo)) * (AX.right - AX.left);
  const base = y(BASE);

  // The twenty runs as a dot plot: equal accuracies stack. Seed 0 sits at the
  // bottom of its stack, where its second run lands on it.
  const counts = new Map<number, number>();
  const dots = SEEDS.accuracy.map((a, seed) => {
    const k = counts.get(a) ?? 0;
    counts.set(a, k + 1);
    return { a, seed, k };
  });
  const minDot = dots.find((d) => d.a === SEEDS.min)!;
  const maxDot = dots.find((d) => d.a === SEEDS.max)!;
  const seed0 = dots[0];
  const second = pop(frame, matchAt - 4, fps, 18);
  const ARROW_Y = base + R + 84;
  const gainFrom = ax(0.966);
  const gainTo = ax(0.976);

  const spec = [
    { title: "Code", sub: "in git", at: codeAt },
    { title: "Data", sub: "as a snapshot", at: dataAt },
    {
      title: "Config",
      sub: (
        <>
          hyperparameters, features,{" "}
          <Mark at={seedAt + 4} out={gainAt}>
            seeds
          </Mark>
        </>
      ),
      at: configAt,
    },
    { title: "Artifact", sub: "the trained model", at: artifactAt },
  ];
  const outline = ease(frame, containerAt, 22);
  const OL = { x: X0 - 22, y: rowTop - 20, w: BOXES[3].x + BOXES[3].w + 22 - (X0 - 22), h: rowH + 40 };

  return (
    <AbsoluteFill>
      {spec.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s.at} level={-31} />
      ))}
      <Sfx name="el-pencil" at={containerAt} level={-35} />
      <Sfx name="el-pop" at={containerAt + 6} level={-30} />
      {[dvcAt, travelAt, pathsAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-sprinkle" at={twentyAt} level={-31} />
      <Sfx name="el-tap" at={matchAt} level={-29} />
      <Sfx name="el-pencil" at={gainAt} level={-35} />
      <Sfx name="el-chime" at={reproAt + 30} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} kicker="Questions 2 and 3" at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What do you need to version to reproduce a model? And how do you version training data?
        </QuestionCard>
        <CornerLoop at={qAt} lit="version" />

        {/* ── The four things, in the container image ── */}
        {spec.map((s, i) => (
          <Box key={s.title} x={BOXES[i].x} y={rowTop} w={BOXES[i].w} h={rowH} at={s.at - 2} title={s.title} sub={s.sub} size={26} subSize={21} lit={i === 1 ? awkwardAt : i === 2 ? seedAt : undefined} litOut={i === 1 ? seedAt : i === 2 ? gainAt : undefined} />
        ))}
        <Svg opacity={outline > 0 ? 1 : 0}>
          <rect
            x={OL.x}
            y={OL.y}
            width={OL.w}
            height={OL.h}
            rx={8}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2}
            strokeDasharray="10 7"
            style={{ clipPath: `inset(-4px ${(1 - outline) * 100}% -4px -4px)` }}
          />
        </Svg>
        <Line at={containerAt + 6} x={OL.x + OL.w} width={600} align="right" y={OL.y + OL.h + h(12)} size={22} color={INK_SOFT}>
          Container image: pins the libraries underneath
        </Line>

        {/* ── Data, three ways ── */}
        <Phase from={awkwardAt - 4} to={seedAt - 6}>
          {[
            { at: dvcAt, until: travelAt, text: "Snapshots beside each commit (DVC)" },
            { at: travelAt, until: pathsAt, text: "Time travel: query as of a past date" },
            { at: pathsAt, until: goalAt, text: "Immutable, date-stamped paths" },
          ].map((it, i) => (
            <Line key={i} at={it.at - 2} x={BOXES[1].x} y={y(530) + i * h(54)} size={25} color={INK}>
              <Mark at={it.at} out={it.until}>
                {it.text}
              </Mark>
            </Line>
          ))}
          <Line at={goalAt - 2} x={BOXES[1].x} y={y(530) + 3 * h(54) + h(18)} size={25} color={OK_INK}>
            The goal: the exact training set behind any past model
          </Line>
        </Phase>

        {/* ── Twenty seeds ── */}
        <Phase from={seedAt - 2}>
          <Line at={seedAt} x={X0} y={y(500)} size={24} color={INK}>
            A random forest on handwritten digits, trained <Num>20</Num> times
          </Line>
          <Line at={twentyAt + 6} x={X0} y={y(500) + h(38)} size={22} color={INK_SOFT}>
            Same data, same code, seeds <Num>0</Num> to <Num>19</Num>: one dot per seed
          </Line>
          <Svg>
            <line x1={AX.left - 20} x2={AX.right + 20} y1={base + R + 8} y2={base + R + 8} stroke={INK_SOFT} strokeWidth={1.4} opacity={ease(frame, twentyAt - 6, 10)} />
            {[0.96, 0.965, 0.97, 0.975, 0.98].map((v) => (
              <text key={v} x={ax(v)} y={base + R + 38} textAnchor="middle" style={svgText(label(21, INK_SOFT))} opacity={ease(frame, twentyAt - 6, 10)}>
                {`${(v * 100).toFixed(1).replace(/\.0$/, "")}%`}
              </text>
            ))}
            {dots.map((d, i) => {
              const p = ease(frame, twentyAt + i * 2, 10);
              if (p <= 0) return null;
              const cy = base - d.k * h(STACK);
              return <circle key={i} cx={ax(d.a)} cy={cy - (1 - p) * 40} r={R} fill={BAR} opacity={p} />;
            })}
            {/* Seed 0's second run lands on its first. */}
            {second > 0.001 ? (
              <circle cx={ax(seed0.a)} cy={base - seed0.k * h(STACK) - (1 - Math.min(1, second)) * 70} r={R + 4} fill="none" stroke={OK} strokeWidth={3.4} opacity={Math.min(1, second)} />
            ) : null}
          </Svg>
          <Line at={lowAt - 2} x={ax(minDot.a)} width={120} align="center" y={base - minDot.k * h(STACK) - 50} size={22} color={BLUE_INK}>
            {(SEEDS.min * 100).toFixed(1)}%
          </Line>
          <Line at={highAt - 2} x={ax(maxDot.a)} width={120} align="center" y={base - maxDot.k * h(STACK) - 50} size={22} color={BLUE_INK}>
            {(SEEDS.max * 100).toFixed(1)}%
          </Line>
          <Flow points={[[gainFrom, ARROW_Y], [gainTo, ARROW_Y]]} at={gainAt} dur={18} color={LIT_LINE} width={4} head={16} />
          <Line at={gainAt + 6} x={(gainFrom + gainTo) / 2} width={520} align="center" y={ARROW_Y + 16} size={23} color={YELLOW_INK}>
            +1 point<span style={{ opacity: ease(frame, luckyAt - 2, 10) }}>: may just be a lucky seed</span>
          </Line>

          {/* The answer, at the right. */}
          <Line at={fixAt - 2} x={RIGHT_X} y={y(610)} size={25} color={INK}>
            Seed 0, run twice:
          </Line>
          <Line at={matchAt} x={RIGHT_X} y={y(610) + 36} size={25} color={OK_INK}>
            every prediction identical
          </Line>
          <Line at={severalAt - 2} x={RIGHT_X} y={y(712)} size={25} color={OK_INK}>
            <Mark at={severalAt + 8}>Judge a change over</Mark>
          </Line>
          <Line at={severalAt + 4} x={RIGHT_X} y={y(712) + 36} size={25} color={OK_INK}>
            <Mark at={severalAt + 14}>several seeds, not one</Mark>
          </Line>
          <Line at={reproAt - 2} x={RIGHT_X} y={y(812)} size={24} color={INK}>
            Same code, data and config →
          </Line>
          <Line at={reproAt + 8} x={RIGHT_X} y={y(812) + 34} size={24} color={INK}>
            the same artifact
          </Line>
        </Phase>
      </Drift>

      <Spot id="container" at={containerAt + 6} x={1530} y={y(322) + h(130) * (1 - rise)} w={220} />
    </AbsoluteFill>
  );
};
