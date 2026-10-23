import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { QUOTED } from "./data";
import { A, A_INK, Arrow, B, Check, Count, Drift, FAINT, Headline, lerp, OK, PANEL, pulse, Svg, X0 } from "./parts";

const CARD_X = [X0, 555, 990, 1425];
const CARD_W = 380;
const CARD_TOP = 352;
/** The glyph's box inside a card, in layout units from the card's top. */
const GLYPH_TOP = 64;
const TEXT_TOP = 318;

/** The ARC-style puzzles: a 3x3 input and the output its rule makes. Drawn,
 *  not real tasks: the cells only show what a grid puzzle looks like. */
const GRID_IN = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const GRID_OUT = [0, 0, 1, 0, 1, 0, 1, 0, 0];

/**
 * What the four families of benchmark ask (Fig. 3), one card per beat, each
 * with a small working picture: MMLU's four options and its fifty-seven
 * subjects, GPQA Diamond's 34% for PhDs outside the field, SWE-bench's issue,
 * patch and tests, and ARC-AGI's grid puzzle, then its game.
 */
export const FamiliesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("families").from;
  const fixedAt = n.word("families", "fixed");
  const answersAt = n.word("families", "known answers");
  const mmluAt = n.word("mmlu", "MMLU");
  const choiceAt = n.word("mmlu", "multiple choice");
  const fiftyAt = n.word("mmlu", "fifty-seven");
  const mathAt = n.word("mmlu", "math");
  const lawAt = n.word("mmlu", "law");
  const gpqaAt = n.word("gpqa", "GPQA Diamond");
  const scienceAt = n.word("gpqa", "science");
  const phdAt = n.word("gpqa", "PhDs");
  const webAt = n.word("gpqa", "web");
  const thirtyAt = n.word("gpqa", "thirty-four percent");
  const sweAt = n.word("swe", "SWE-bench");
  const issueAt = n.word("swe", "GitHub issue");
  const patchAt = n.word("swe", "patch");
  const testsAt = n.word("swe", "tests");
  const arcAt = n.word("arc", "Arc AGI");
  const ruleAt = n.word("arc", "rule");
  const gridAt = n.word("arc", "grid puzzles");
  const versionAt = n.word("arc", "version three");
  const gameAt = n.word("arc", "game");
  const playingAt = n.word("arc", "playing");
  const end = n.beat("read").from;

  const cardAt = [mmluAt - 6, gpqaAt - 6, sweAt - 6, arcAt - 6];
  const top = y(CARD_TOP);
  const gy = (v: number) => top + h(GLYPH_TOP + v);

  return (
    <AbsoluteFill>
      {/* ── Sound: each card, and the piece of each picture that lands ── */}
      {cardAt.map((at, i) => (
        <Sfx key={i} name="el-pop" at={at + 2} level={-31} />
      ))}
      <Sfx name="el-tap" at={choiceAt + 6} level={-27} />
      <Sfx name="el-tap" at={thirtyAt - 2} level={-27} />
      <Sfx name="el-tap" at={testsAt + 2} level={-27} />
      <Sfx name="el-pencil" at={gridAt - 2} level={-35} />

      <Headline at={from - 6} second={answersAt - 4} italic="with known answers." size={62}>
        A fixed set of questions
      </Headline>
      <FigLabel n="3" title="What four benchmarks ask" at={fixedAt - 2} x={X0} y={y(296)} />

      <Drift from={from} to={end} amount={0.012} origin="50% 60%">
        {/* The cards' frames, so the four places are set out from the start. */}
        {CARD_X.map((x, i) => (
          <Svg key={i} opacity={ease(frame, fixedAt + i * 3, 14) * (0.5 + 0.5 * ease(frame, cardAt[i], 10))}>
            <rect x={x} y={top} width={CARD_W} height={h(470)} rx={14} fill={PANEL} stroke={FAINT} strokeWidth={1.6} />
          </Svg>
        ))}

        {/* ── MMLU: one question, four options, fifty-seven subjects ── */}
        <CardTitle x={CARD_X[0]} top={top} at={cardAt[0]} name="MMLU" />
        <Svg opacity={ease(frame, cardAt[0] + 4, 12)}>
          {[0, 1, 2, 3].map((k) => {
            const oy = gy(40 + k * 44);
            const picked = k === 2 ? ease(frame, choiceAt + 4, 10) : 0;
            return (
              <g key={k} opacity={ease(frame, cardAt[0] + 6 + k * 3, 10)}>
                <circle cx={CARD_X[0] + 46} cy={oy} r={11} fill={picked > 0 ? A : PAPER} stroke={picked > 0 ? A : INK_SOFT} strokeWidth={2.2} />
                <rect x={CARD_X[0] + 72} y={oy - 5} width={[190, 150, 210, 130][k]} height={10} rx={5} fill={B} opacity={0.55} />
              </g>
            );
          })}
        </Svg>
        <Ink at={fiftyAt - 2} dur={12} style={{ left: CARD_X[0] + 30, top: gy(210) - 12, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, A_INK), fontWeight: 700 }}>
            <Count at={fiftyAt - 2} to={QUOTED.mmluSubjects} dur={18} />
          </span>
          <span style={{ ...label(24, INK), marginLeft: 10 }}>subjects</span>
        </Ink>
        <CardText x={CARD_X[0]} top={top + h(TEXT_TOP)} lines={[[choiceAt, "Multiple choice,"], [mathAt, "elementary math"], [lawAt, "to professional law"]]} />

        {/* ── GPQA Diamond: the bar PhDs from other fields reach ── */}
        <CardTitle x={CARD_X[1]} top={top} at={cardAt[1]} name="GPQA Diamond" />
        <GpqaBar x={CARD_X[1] + 30} y={gy(150)} w={CARD_W - 60} at={phdAt} fill={thirtyAt} value={QUOTED.gpqaNonExpertPhd} />
        <Ink at={phdAt - 2} dur={12} style={{ left: CARD_X[1] + 30, top: gy(40) - 14, width: CARD_W - 60 }}>
          <span style={{ ...note(22, INK), lineHeight: 1.25 }}>PhDs from other fields,</span>
        </Ink>
        <Ink at={webAt - 4} dur={12} style={{ left: CARD_X[1] + 30, top: gy(70) - 14, width: CARD_W - 60 }}>
          <span style={{ ...note(22, INK), lineHeight: 1.25 }}>with web access</span>
        </Ink>
        <CardText x={CARD_X[1]} top={top + h(TEXT_TOP)} lines={[[scienceAt, "Graduate-level biology,"], [scienceAt + 6, "chemistry and physics"]]} />

        {/* ── SWE-bench: issue, patch, the project's own tests ── */}
        <CardTitle x={CARD_X[2]} top={top} at={cardAt[2]} name="SWE-bench Verified" />
        <SweFlow x={CARD_X[2] + 30} y={gy(30)} issueAt={issueAt} patchAt={patchAt} testsAt={testsAt} />
        <CardText x={CARD_X[2]} top={top + h(TEXT_TOP)} lines={[[issueAt, "A real GitHub issue;"], [patchAt, "the patch must pass"], [testsAt, "the project's own tests"]]} />

        {/* ── ARC-AGI: the rule behind a grid, then a game ── */}
        <CardTitle x={CARD_X[3]} top={top} at={cardAt[3]} name="ARC-AGI" />
        <ArcGrids x={CARD_X[3] + 30} y={gy(20)} gridAt={gridAt} ruleAt={ruleAt} />
        <ArcGame x={CARD_X[3] + 30} y={gy(134)} at={versionAt} playAt={playingAt} />
        <CardText
          x={CARD_X[3]}
          top={top + h(TEXT_TOP)}
          lines={[
            [gridAt, "Find the rule behind"],
            [gridAt + 6, "a few grid puzzles;"],
            [gameAt, "version 3: learn a game"],
            [playingAt, "by playing it"],
          ]}
        />
      </Drift>
    </AbsoluteFill>
  );
};

/** A card's name, inked on its cue with a small swell as it lands. */
const CardTitle: React.FC<{ x: number; top: number; at: number; name: string }> = ({ x, top, at, name }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  return (
    <Ink at={at} dur={14} style={{ left: x + 30, top: top + h(22), whiteSpace: "nowrap" }}>
      <span style={{ ...label(28, INK), fontWeight: 700, transform: `scale(${1 + pulse(frame, at + 10, 18) * 0.04})`, display: "inline-block" }}>
        {name}
      </span>
    </Ink>
  );
};

/** Up to four lines of a card's description, each inked on its own cue. */
const CardText: React.FC<{ x: number; top: number; lines: [number, string][] }> = ({ x, top, lines }) => (
  <>
    {lines.map(([at, text], i) => (
      <Ink key={i} at={at - 2} dur={12} style={{ left: x + 30, top: top + i * 31, whiteSpace: "nowrap" }}>
        <span style={note(23, INK)}>{text}</span>
      </Ink>
    ))}
  </>
);

/** GPQA's bar: a 0 to 100 track and the share PhDs outside the field reach. */
const GpqaBar: React.FC<{ x: number; y: number; w: number; at: number; fill: number; value: number }> = ({ x, y, w, at, fill, value }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at, 14);
  const p = ease(frame, fill - 6, 18);
  if (t <= 0) return null;
  return (
    <>
      <Svg opacity={t}>
        <rect x={x} y={y} width={w} height={28} rx={4} fill={PAPER} stroke={HAIRLINE} strokeWidth={1.4} />
        <rect x={x} y={y} width={(w * value * p) / 100} height={28} rx={4} fill={B} />
        <text x={x} y={y + 58} style={{ ...label(20, INK_SOFT), fontWeight: 500, ...TABULAR }}>
          0
        </text>
        <text x={x + w} y={y + 58} textAnchor="end" style={{ ...label(20, INK_SOFT), fontWeight: 500, ...TABULAR }}>
          100
        </text>
      </Svg>
      <Ink at={fill - 2} dur={12} style={{ left: x + (w * value) / 100 - 30, top: y - 46, whiteSpace: "nowrap" }}>
        <span style={{ ...label(28, INK), fontWeight: 700 }}>
          <Count at={fill - 6} to={value} dur={18} suffix="%" />
        </span>
      </Ink>
    </>
  );
};

/** SWE-bench as three steps: the issue, the patch, the tests that judge it. */
const SweFlow: React.FC<{ x: number; y: number; issueAt: number; patchAt: number; testsAt: number }> = ({ x, y, issueAt, patchAt, testsAt }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const step = h(66);
  const box = (at: number, i: number, text: string, mono = false) => (
    <Ink at={at - 2} dur={12} style={{ left: x, top: y + i * step, whiteSpace: "nowrap" }}>
      <div
        style={{
          width: 220,
          boxSizing: "border-box",
          padding: "6px 14px",
          borderRadius: 8,
          border: `2px solid ${i === 2 && frame >= testsAt + 6 ? OK : INK}`,
          background: PAPER,
          ...(mono ? { fontFamily: MONO, fontSize: 21, color: INK } : { ...label(22, INK), fontWeight: 600 }),
        }}
      >
        {text}
      </div>
    </Ink>
  );
  return (
    <>
      {box(issueAt, 0, "GitHub issue")}
      <Arrow from={[x + 110, y + 44]} to={[x + 110, y + step - 4]} at={patchAt - 6} dur={8} width={2} />
      {box(patchAt, 1, "+ patch", true)}
      <Arrow from={[x + 110, y + step + 44]} to={[x + 110, y + 2 * step - 4]} at={testsAt - 6} dur={8} width={2} />
      {box(testsAt, 2, "project's tests")}
      <Svg>
        <Check x={x + 250} y={y + 2 * step + 20} at={testsAt + 6} size={26} />
      </Svg>
    </>
  );
};

/** ARC-AGI-2's kind of task: a grid, an arrow, the grid the rule makes. */
const ArcGrids: React.FC<{ x: number; y: number; gridAt: number; ruleAt: number }> = ({ x, y, gridAt, ruleAt }) => {
  const frame = useCurrentFrame();
  const cell = 26;
  const grid = (gx: number, cells: number[], at: number) => (
    <g>
      {cells.map((c, i) => {
        const p = ease(frame, at + i * 1.5, 8);
        return (
          <rect
            key={i}
            x={gx + (i % 3) * (cell + 3)}
            y={y + Math.floor(i / 3) * (cell + 3)}
            width={cell}
            height={cell}
            rx={3}
            fill={c ? A : PAPER}
            stroke={c ? A : FAINT}
            strokeWidth={1.5}
            opacity={p}
          />
        );
      })}
    </g>
  );
  return (
    <>
      <Svg>
        {grid(x, GRID_IN, ruleAt - 4)}
        {grid(x + 190, GRID_OUT, gridAt + 6)}
      </Svg>
      <Arrow from={[x + 100, y + 42]} to={[x + 172, y + 42]} at={gridAt} dur={10} width={2.2} />
    </>
  );
};

/** ARC-AGI-3's kind of task: a little game board and a piece that moves as
 *  it is played. */
const ArcGame: React.FC<{ x: number; y: number; at: number; playAt: number }> = ({ x, y, at, playAt }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at - 2, 12);
  if (t <= 0) return null;
  const cell = 22;
  const cols = 9;
  const rows = 3;
  // The piece walks along the middle row toward the goal once play starts.
  const walk = Math.min(cols - 1, Math.max(0, Math.floor((frame - (playAt - 18)) / 5)));
  const goal = cols - 1;
  return (
    <Svg opacity={t}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const wall = r !== 1 && (c === 3 || c === 6);
        return (
          <rect
            key={i}
            x={x + c * (cell + 3)}
            y={y + r * (cell + 3)}
            width={cell}
            height={cell}
            rx={3}
            fill={wall ? B : PAPER}
            stroke={FAINT}
            strokeWidth={1.2}
          />
        );
      })}
      <rect x={x + goal * (cell + 3) + 4} y={y + cell + 3 + 4} width={cell - 8} height={cell - 8} rx={2} fill={OK} />
      <circle cx={x + lerp(0, walk, 1) * (cell + 3) + cell / 2} cy={y + (cell + 3) + cell / 2} r={8} fill={INK} />
    </Svg>
  );
};
