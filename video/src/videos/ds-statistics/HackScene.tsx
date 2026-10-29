import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, TABULAR, fmt, label } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HACK } from "./data";
import { Drift, Mark, MARK_BAD, noteText, OK_INK, pulse, Svg, X0 } from "./parts";

const TILE_W = 98;
const TILE_H = 74;
const TILE_GAP = 12;
const TILES_TOP = 340;
/** The tree of choices: five levels, thirty-two leaves. */
const TREE = { x0: X0 + 10, x1: 820, top: 640, bottom: 878 };
const LEVELS = ["outliers", "logs", "cutoffs", "…", "…"] as const;
const SIDE_X = 1100;

/**
 * Question 16. The Statistics course's twenty tests where nothing is real
 * (seed 123, the run Stats-7 TestingHypotheses shows), one tile each with
 * its p-value; test 14 lands under 0.05 and turns red. The chance of at
 * least one in twenty, 64%. Then the forking paths: five reasonable binary
 * choices branching into thirty-two analyses, and the three remedies.
 */
export const HackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hack").from;
  const qAt = n.word("hack", "Question");
  const textAt = n.word("hack", "What is p-hacking");
  const tryingAt = n.word("hack", "Trying analyses");
  const onlyAt = n.word("hack", "reporting only that one");
  const twentyAt = n.word("hack", "Twenty tests where nothing is real");
  const landsAt = n.word("hack", "one lands under point oh five");
  const chanceAt = n.word("hack", "the chance of at least one");
  const pctAt = n.word("hack", "sixty-four percent");
  const deliberateAt = n.word("hack-paths", "It needn't be deliberate");
  const choicesAt = n.word("hack-paths", "Five reasonable choices");
  const thirtyTwoAt = n.word("hack-paths", "thirty-two possible analyses");
  const remedyAt = [
    n.word("hack-fix", "Pre-register the plan"),
    n.word("hack-fix", "correct for the number of tests"),
    n.word("hack-fix", "confirm on fresh data"),
  ];
  const methodsAt = n.word("hack-fix", "with Bonferroni or Benjamini-Hochberg");
  const end = n.beat("hack-fix").to;

  const hit = HACK.p.findIndex((p) => p <= 0.05);
  const tileX = (i: number) => X0 + (i % 10) * (TILE_W + TILE_GAP);
  const tileY = (i: number) => y(TILES_TOP) + Math.floor(i / 10) * (h(TILE_H) + h(TILE_GAP));

  // The tree: level k has 2^k nodes, spread over the leaves' height.
  const levelX = (k: number) => TREE.x0 + (k * (TREE.x1 - TREE.x0)) / LEVELS.length;
  const nodeY = (k: number, i: number) => {
    const count = 2 ** k;
    const span = y(TREE.bottom) - y(TREE.top);
    return y(TREE.top) + ((i + 0.5) * span) / count;
  };
  const levelAt = (k: number) => choicesAt + 4 + k * Math.max(6, (thirtyTwoAt - choicesAt - 6) / LEVELS.length);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={twentyAt + 2} level={-34} />
      <Sfx name="el-pop" at={landsAt + 4} level={-30} />
      <Sfx name="el-tap" at={pctAt} level={-32} />
      {LEVELS.map((_, k) => (
        <Sfx key={k} name="el-tap" at={Math.round(levelAt(k))} level={-38} />
      ))}
      {remedyAt.map((t, i) => (
        <Sfx key={i} name="el-pencil" at={t + 2} level={-34} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={16} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is p-hacking, and why is it dangerous?
        </QuestionCard>

        <Note at={tryingAt} x={X0} y={y(290)}>
          <span style={{ ...noteText(26, INK) }}>
            try analyses until one is significant,{" "}
            <span style={{ opacity: ease(frame, onlyAt - 2, 10) }}>
              then report <Mark at={onlyAt + 4} color={MARK_BAD}>only that one</Mark>
            </span>
          </span>
        </Note>

        {/* ── Twenty tests of nothing ── */}
        {HACK.p.map((p, i) => {
          const s = ease(frame, twentyAt + 2 + i * 1.2, 10);
          if (s <= 0) return null;
          const red = i === hit ? ease(frame, landsAt + 4, 10) : 0;
          const dim = i === hit ? 0 : 0.45 * ease(frame, landsAt + 6, 12);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: tileX(i),
                top: tileY(i),
                width: TILE_W,
                height: h(TILE_H),
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2px solid ${red > 0 ? ACCENT : BAR}`,
                background: red > 0 ? `color-mix(in srgb, ${ACCENT} ${18 * red}%, ${PAPER})` : PAPER,
                opacity: s * (1 - dim),
                transform: `scale(${1 + 0.12 * pulse(frame, landsAt + 4, 18) * (i === hit ? 1 : 0)})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span style={{ ...label(19, INK_SOFT), ...TABULAR }}>test {i + 1}</span>
              <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: red > 0.5 ? ACCENT_INK : INK, ...TABULAR }}>{fmt(p, 3)}</span>
            </div>
          );
        })}
        <Note at={landsAt + 6} x={tileX(9) + TILE_W + 24} y={tileY(hit) + h(16)}>
          <span style={{ ...noteText(24, ACCENT_INK), ...TABULAR }}>under 0.05</span>
        </Note>
        <Note at={chanceAt} x={X0} y={y(540)}>
          <span style={{ ...noteText(26, INK), ...TABULAR }}>
            the chance of at least one in 20:{" "}
            <span style={{ fontFamily: MONO, fontWeight: 600 }}>1 − 0.95²⁰</span>{" "}
            <span style={{ opacity: ease(frame, pctAt - 2, 10) }}>
              = <Mark at={pctAt + 2} color={MARK_BAD}>{Math.round(HACK.atLeastOne * 100)}%</Mark>
            </span>
          </span>
        </Note>

        {/* ── Five reasonable choices, thirty-two analyses ── */}
        <Note at={deliberateAt} x={SIDE_X + 140} y={y(610)}>
          <span style={{ ...noteText(24, INK_SOFT) }}>it needn&apos;t be deliberate</span>
        </Note>
        <Svg>
          {LEVELS.map((_, k) => {
            const p = ease(frame, levelAt(k), 10);
            if (p <= 0) return null;
            const count = 2 ** k;
            return (
              <g key={k}>
                {Array.from({ length: count }, (_, i) =>
                  [0, 1].map((b) => {
                    const x0 = levelX(k);
                    const y0 = nodeY(k, i);
                    const x1 = levelX(k + 1);
                    const y1 = nodeY(k + 1, i * 2 + b);
                    return (
                      <line
                        key={`${i}-${b}`}
                        x1={x0}
                        y1={y0}
                        x2={x0 + (x1 - x0) * p}
                        y2={y0 + (y1 - y0) * p}
                        stroke={k === LEVELS.length - 1 ? BAR : INK_SOFT}
                        strokeWidth={k > 2 ? 1.2 : 1.8}
                      />
                    );
                  }),
                )}
              </g>
            );
          })}
          {Array.from({ length: 32 }, (_, i) => {
            const p = ease(frame, levelAt(LEVELS.length - 1) + 8 + i * 0.3, 8);
            return p > 0 ? <circle key={i} cx={levelX(LEVELS.length)} cy={nodeY(5, i)} r={3.4 * p} fill={BAR} /> : null;
          })}
        </Svg>
        {LEVELS.map((name, k) => (
          <Note key={k} at={levelAt(k)} x={levelX(k) + 8} y={y(TREE.top) - h(34)}>
            <span style={{ ...label(20, INK_SOFT) }}>{name}</span>
          </Note>
        ))}
        <Note at={thirtyTwoAt} x={levelX(LEVELS.length) + 20} y={(nodeY(5, 15) + nodeY(5, 16)) / 2 - 18}>
          <span style={{ ...noteText(28, INK), ...TABULAR }}>
            <b>32</b> possible analyses
          </span>
        </Note>

        {remedyAt.map((t, i) => (
          <Note key={i} at={t} x={SIDE_X + 140} y={y([660, 720, 812][i])}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Tick at={t + 4} size={26} />
              <span style={{ ...noteText(26, OK_INK) }}>{["pre-register the plan", "correct for the number of tests", "confirm on fresh data"][i]}</span>
            </div>
          </Note>
        ))}
        <Note at={methodsAt} x={SIDE_X + 180} y={y(760)}>
          <span style={{ ...noteText(22, INK_SOFT) }}>Bonferroni, or Benjamini-Hochberg</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
