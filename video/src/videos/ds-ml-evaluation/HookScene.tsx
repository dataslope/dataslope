import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HOOK } from "./data";
import { Drift, Headline, Kicker, pulse, Spot, Svg, X0 } from "./parts";

const FULL = 860;
const BAR_H = 58;
const TRAIN_Y = 360;
const TEST_Y = 500;
const TILE = 50;
const TILE_GAP = 10;
const TILES_Y = 660;
/** Questions taken slowly, each with a figure; the rest are the quick round. */
const DRAWN = 12;
const TOTAL = 15;

/** A tiny glyph per question, so the twelve tiles read as twelve figures. */
const GLYPHS: string[] = [
  "M6,30 C14,8 22,8 30,22 S40,40 44,14", // a fit through noise
  "M6,10 L18,18 L30,30 L44,38", // a path shrinking
  "M6,36 L12,36 L12,26 L18,26 L18,14 L24,14 L24,22 L30,22 L30,32 L36,32 L36,38", // a dot pile
  "M6,12 C14,28 26,34 44,36", // a falling curve
  "M6,8 C8,28 20,36 44,38", // ROC-like
  "M6,40 C20,38 30,24 44,8", // rising
];

/**
 * The opening: one model's two scores, a hundred percent on what it learned
 * from and eighty-four on what it never saw, with the gap between them
 * outlined in red. Then the round as fifteen tiles, twelve carrying a small
 * figure and three dashed for the quick round, and the gap marked again on
 * the bridge into the first question.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const trainedAt = n.word("hook", "every example it trained on");
  const hundredAt = n.word("hook", "A hundred percent");
  const neverAt = n.word("hook", "never seen");
  const eightyAt = n.word("hook", "eighty-four");
  const whichAt = n.word("hook", "Which of those");
  const gapAt = n.word("hook", "that gap");
  const fifteenAt = n.word("plan", "Fifteen questions");
  const realAt = n.word("plan", "a real model");
  const pythonAt = n.word("plan", "fitted in Python");
  const lastAt = n.word("plan", "The last three are quick");
  const firstAt = n.word("bias-in", "where the gap comes from");
  const end = n.beat("bias-in").to;

  const xOf = (v: number) => X0 + FULL * v;
  const grow = (at: number, v: number) => FULL * v * ease(frame, at, 22);
  const gapP = ease(frame, gapAt, 14);
  const swell = pulse(frame, firstAt, 20);

  const bars = [
    { top: TRAIN_Y, at: trainedAt, valueAt: hundredAt, v: HOOK.train, name: "examples it trained on" },
    { top: TEST_Y, at: neverAt, valueAt: eightyAt, v: HOOK.test, name: "examples it has never seen" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={hundredAt + 2} level={-32} />
      <Sfx name="el-pop" at={eightyAt + 2} level={-32} />
      <Sfx name="el-pencil" at={gapAt} level={-34} />
      <Sfx name="el-sprinkle" at={fifteenAt} level={-36} />
      <Sfx name="el-tap" at={firstAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="A hundred percent," turn="or eighty-four?" at={hundredAt - 4} turnAt={whichAt - 4} size={72} />

        <Spot id="ds-ml-evaluation-beaver" at={from + 4} left={1140} top={y(250)} width={660} height={470} />

        {/* ── One model, two scores ── */}
        {bars.map((b) => (
          <React.Fragment key={b.name}>
            <Note at={b.at - 4} x={X0} y={y(b.top) - h(44)}>
              <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>{b.name}</span>
            </Note>
            <div
              style={{
                position: "absolute",
                left: X0,
                top: y(b.top),
                width: grow(b.at, b.v),
                height: h(BAR_H),
                background: BAR,
                borderRadius: 3,
              }}
            />
            <Note at={b.valueAt - 2} x={xOf(HOOK.train) + 18} y={y(b.top) + h(8)}>
              <span style={{ ...note(38, BLUE_INK), fontWeight: 700, ...TABULAR }}>{Math.round(b.v * 100)}%</span>
            </Note>
          </React.Fragment>
        ))}
        {/* The gap: the second bar's missing length, outlined. */}
        <Svg opacity={gapP}>
          <rect
            x={xOf(HOOK.test) + 2}
            y={y(TEST_Y) + 1}
            width={(xOf(HOOK.train) - xOf(HOOK.test) - 4) * gapP}
            height={h(BAR_H) - 2}
            fill={`color-mix(in srgb, ${ACCENT} ${12 + 18 * swell}%, transparent)`}
            stroke={ACCENT}
            strokeWidth={2.4 + 1.6 * swell}
            strokeDasharray="7 6"
            rx={3}
          />
          <line x1={xOf(HOOK.train)} x2={xOf(HOOK.train)} y1={y(TRAIN_Y) + h(BAR_H)} y2={y(TEST_Y)} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="3 5" />
        </Svg>
        <Note at={gapAt + 4} x={xOf(HOOK.train) - 210} y={y(TEST_Y) + h(BAR_H) + h(14)} width={200} align="right" from="up">
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: `scale(${1 + 0.08 * swell})` }}>
            the gap
          </span>
        </Note>

        {/* ── The round: twelve figures, three without ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const p = ease(frame, fifteenAt - 4 + i * 1.4, 12);
          if (p <= 0) return null;
          const drawn = i < DRAWN;
          const fill = drawn ? ease(frame, realAt + i * 1.2, 12) : 0;
          const plain = drawn ? 0 : ease(frame, lastAt + (i - DRAWN) * 2, 10);
          const lit = i === 0 ? ease(frame, firstAt, 10) : 0;
          const dim = i === 0 ? 0 : ease(frame, firstAt + 4, 14) * 0.55;
          const left = X0 + i * (TILE + TILE_GAP);
          const glyph = ease(frame, pythonAt + i * 1.2, 14);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left,
                top: y(TILES_Y),
                width: TILE,
                height: h(TILE),
                boxSizing: "border-box",
                border: `2px solid ${drawn ? `color-mix(in srgb, ${BAR} ${100 * fill}%, ${INK_SOFT})` : INK_SOFT}`,
                borderStyle: drawn ? "solid" : plain > 0.5 ? "dashed" : "solid",
                borderRadius: 7,
                background: lit > 0 ? HIGHLIGHT : PAPER,
                opacity: p * (drawn ? 1 : 0.5 + 0.5 * plain) * (1 - dim),
                transform: `translateY(${(1 - p) * 10}px) scale(${1 + 0.08 * pulse(frame, firstAt, 16) * (i === 0 ? 1 : 0)})`,
              }}
            >
              {drawn ? (
                <svg width={TILE - 4} height={h(TILE) - 4} viewBox="0 0 50 46" style={{ position: "absolute", inset: 0 }}>
                  <path
                    d={GLYPHS[i % GLYPHS.length]}
                    fill="none"
                    stroke={BAR}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={`${glyph} 1`}
                  />
                </svg>
              ) : null}
            </div>
          );
        })}
        {Array.from({ length: TOTAL }, (_, i) => (
          <Note key={i} at={fifteenAt + i * 1.4} x={X0 + i * (TILE + TILE_GAP)} y={y(TILES_Y) + h(TILE) + h(8)} width={TILE} style={{ textAlign: "center" }} dim={firstAt + 4}>
            <span style={{ ...label(18, i === 0 && frame >= firstAt ? INK : INK_SOFT), ...TABULAR, fontWeight: 650 }}>{i + 1}</span>
          </Note>
        ))}
        <Note at={realAt - 2} x={X0} y={y(TILES_Y) + h(96)} dim={firstAt + 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>12</b> with a figure, each <span style={{ opacity: ease(frame, pythonAt - 2, 10) }}>a real model fitted in Python</span>
          </span>
        </Note>
        <Note at={lastAt} x={X0} y={y(TILES_Y) + h(142)} dim={firstAt + 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b>3</b> quick ones at the end
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
