import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32, num, pct, TEST } from "./data";
import { Big, Count, DATA, DATA_INK, Headline, Kicker, lerp, STAT, STAT_INK, Strike, Svg, VBracket } from "./parts";

/** The tree: where each node's label is centred. */
const NODE = {
  root: [520, 352],
  sick: [250, 500],
  healthy: [790, 500],
  sickPos: [160, 668],
  sickNeg: [340, 668],
  healthyPos: [690, 668],
  healthyNeg: [900, 668],
} as const;
/** Everyone who tested positive, 61 to a row: 61 x 18 is 1,098 exactly. */
const GRID = { x0: 1080, top: 352, pitch: 12.6, r: 4.6, cols: 61 } as const;

const JIT = (() => {
  const r = mulberry32(3);
  return Array.from({ length: TEST.positives }, () => r());
})();

/**
 * Part 3 opens: the lesson's 99% accurate test for a disease one person in a
 * thousand has, the gut answer, the tree on 100,000 people, and everyone who
 * tested positive lined up as dots, ninety-nine of them sick.
 */
export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const testFrom = n.beat("test").from;
  const thousandAt = n.word("test", "one person in a thousand");
  const accurateAt = n.word("test", "accurate");
  const bothAt = n.word("test", "both ways");
  const positiveAt = n.word("test", "You test positive");
  const chancesAt = n.word("gut", "chances");
  const gutAt = n.word("gut", "Your gut");
  const answerAt = n.word("gut", "The answer");
  const nineAt = n.word("gut", "about nine");
  const walkFrom = n.beat("walk").from;
  const walkAt = n.word("walk", "a hundred thousand");
  const hundredAt = n.word("walk", "A hundred");
  const ninetyNineKAt = n.word("walk", "Ninety-nine thousand");
  const catchesAt = n.word("caught", "catches");
  const caughtAt = n.word("caught", "ninety-nine");
  const flagsAt = n.word("flagged", "flags");
  const alarmsAt = n.word("flagged", "nine hundred and ninety-nine");
  const lineupAt = n.word("lineup", "line up");
  const peopleAt = n.word("lineup", "One thousand and ninety-eight");
  const sickAt = n.word("lineup", "only ninety-nine");
  const percentAt = n.word("nine", "nine percent");
  const simAt = n.word("sim", "two million");
  const pointOneAt = n.word("sim", "nine point one");

  const factsOut = ease(frame, walkFrom - 8, 12);
  const at = (p: Pt) => [p[0], y(p[1])] as const;
  type Pt = readonly [number, number];
  const edge = (a: Pt, b: Pt, cue: number, color: string = INK) => {
    const p = ease(frame, cue, 14);
    if (p <= 0) return null;
    const [ax, ay] = at(a);
    const [bx, by] = at(b);
    const y0 = ay + 42;
    const y1 = by - 36;
    return <line x1={ax} y1={y0} x2={lerp(ax, bx, p)} y2={lerp(y0, y1, p)} stroke={color} strokeWidth={2} opacity={0.8} />;
  };
  const treeDim = ease(frame, lineupAt - 4, 16) * 0.35;

  // Where each positive sits in the grid, and where it flies from.
  const slot = (i: number) => [GRID.x0 + GRID.pitch * ((i % GRID.cols) + 0.5), y(GRID.top) + h(GRID.pitch * (Math.floor(i / GRID.cols) + 0.5))] as const;
  const rowsUsed = Math.ceil(TEST.positives / GRID.cols);
  const gridBottom = y(GRID.top) + h(GRID.pitch * rowsUsed);
  const sickLit = ease(frame, sickAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the answer, the tree's branches, the positives lining up ── */}
      <Sfx name="el-pop" at={positiveAt - 4} level={-30} />
      <Sfx name="el-scratch" at={answerAt - 2} level={-30} />
      <Sfx name="el-tap" at={nineAt - 4} level={-28} />
      <Sfx name="el-pencil" at={hundredAt - 4} level={-34} />
      <Sfx name="el-pencil" at={catchesAt - 2} level={-35} />
      <Sfx name="el-pencil" at={flagsAt - 2} level={-35} />
      <Sfx name="el-sprinkle" at={lineupAt} level={-32} />
      <Sfx name="el-tap" at={percentAt - 4} level={-28} />

      <Kicker at={testFrom - 10}>Bayes and the 99% test</Kicker>
      <Headline top={y(150)} first="A 99% accurate test" second="says positive." firstAt={testFrom - 6} secondAt={positiveAt - 4} out={lineupAt - 8} />
      <Headline top={y(150)} first={`Of ${num(TEST.positives)} positives,`} second={`${TEST.tp} are sick.`} firstAt={lineupAt - 2} secondAt={sickAt - 4} secondColor={DATA_INK} />

      {/* ── The facts, and the two answers ── */}
      <div style={{ opacity: 1 - factsOut }}>
        {(
          [
            [thousandAt - 4, `1 in ${num(TEST.oneIn)}`, "people have the disease", INK],
            [accurateAt - 2, pct(TEST.sensitivity), "of sick people test positive", DATA_INK],
            [bothAt - 2, pct(TEST.specificity), "of healthy people test negative", INK_SOFT],
          ] as const
        ).map(([cue, big, text, color], i) => (
          <Ink key={i} at={cue} dur={16} style={{ left: 160, top: y(330 + i * 108), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 22 }}>
            <span style={{ ...headline(64), color }}>{big}</span>
            <span style={note(26, INK)}>{text}</span>
          </Ink>
        ))}
        <Ink at={positiveAt - 2} dur={14} style={{ left: 160, top: y(668), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: STAT,
              color: "var(--ds-white)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              ...note(40, "var(--ds-white)"),
              fontWeight: 700,
            }}
          >
            +
          </span>
          <span style={{ ...note(30, INK), fontWeight: 600 }}>You test positive.</span>
        </Ink>
        <Ink at={chancesAt - 4} dur={14} style={{ left: 1100, top: y(330), whiteSpace: "nowrap" }}>
          <span style={label(24, INK)}>The chance you have it</span>
        </Ink>
        <Ink at={gutAt - 2} dur={14} style={{ left: 1100, top: y(388), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={note(26, INK_SOFT)}>Your gut</span>
          <Big size={110} color={INK_SOFT}>
            <Strike at={answerAt - 2} top="0.5em">
              {pct(TEST.sensitivity)}
            </Strike>
          </Big>
        </Ink>
        <Ink at={answerAt + 2} dur={14} style={{ left: 1100, top: y(560), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={note(26, INK)}>The answer</span>
          <span style={{ opacity: ease(frame, nineAt - 4, 12) }}>
            <Big size={150} color={STAT_INK} italic>
              about {pct(TEST.treePpv)}
            </Big>
          </span>
        </Ink>
      </div>

      {/* ── The tree, on 100,000 people ── */}
      <FigLabel n="4" title={`The lesson's tree, on ${num(TEST.population)} people`} at={walkAt - 6} x={160} y={y(268)} />
      <div style={{ opacity: 1 - treeDim }}>
        <Svg>
          {edge(NODE.root, NODE.sick, hundredAt - 6, DATA)}
          {edge(NODE.root, NODE.healthy, ninetyNineKAt - 6)}
          {edge(NODE.sick, NODE.sickPos, caughtAt - 6, DATA)}
          {edge(NODE.sick, NODE.sickNeg, caughtAt, INK_SOFT)}
          {edge(NODE.healthy, NODE.healthyPos, alarmsAt - 6, STAT)}
          {edge(NODE.healthy, NODE.healthyNeg, alarmsAt + 2, INK_SOFT)}
        </Svg>
        {(
          [
            [NODE.root, walkAt - 2, num(TEST.population), "people", INK],
            [NODE.sick, hundredAt - 2, num(TEST.sick), "have it", DATA_INK],
            [NODE.healthy, ninetyNineKAt - 2, num(TEST.healthy), "don't", INK],
            [NODE.sickPos, caughtAt - 2, num(TEST.tp), "test +", DATA_INK],
            [NODE.sickNeg, caughtAt + 4, num(TEST.fn), "test −", INK_SOFT],
            [NODE.healthyPos, alarmsAt - 2, num(TEST.fp), "test +", STAT_INK],
            [NODE.healthyNeg, alarmsAt + 6, num(TEST.tn), "test −", INK_SOFT],
          ] as const
        ).map(([p, cue, big, small, color], i) => {
          const a = ease(frame, cue, 12);
          if (a <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p[0],
                top: y(p[1]) - 34,
                transform: `translate(-50%, ${(1 - a) * 10}px)`,
                opacity: a,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ ...note(i === 0 ? 40 : 34, color), fontWeight: 700, lineHeight: 1.05 }}>{big}</div>
              <div style={{ ...note(21, INK_SOFT) }}>{small}</div>
            </div>
          );
        })}
        <Note at={flagsAt + 2} x={NODE.healthy[0] + 90} y={y(NODE.healthy[1]) - 20}>
          <span style={{ ...note(21, STAT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>1% flagged by mistake</span>
        </Note>
        <Note at={catchesAt} x={NODE.sick[0] - 210} y={y(NODE.sick[1]) - 20}>
          <span style={{ ...note(21, DATA_INK), fontWeight: 600, whiteSpace: "nowrap" }}>99% caught</span>
        </Note>
      </div>

      {/* ── Everyone who tested positive, one dot each ── */}
      <Svg>
        {Array.from({ length: TEST.positives }, (_, i) => {
          const sick = i < TEST.tp;
          const from = at(sick ? NODE.sickPos : NODE.healthyPos);
          const [tx, ty] = slot(i);
          const go = ease(frame, lineupAt + 2 + (i / TEST.positives) * 26 + JIT[i] * 10, 18);
          if (go <= 0) return null;
          const lit = sick ? pop(frame, sickAt - 2 + JIT[i] * 4, fps, 12) : 0;
          return (
            <circle
              key={i}
              cx={lerp(from[0], tx, go)}
              cy={lerp(from[1], ty, go)}
              r={GRID.r * (sick ? 1 + 0.25 * Math.min(1, lit) : 1)}
              fill={sick ? DATA : STAT}
              opacity={sick ? 1 : lerp(1, 0.55, sickLit)}
            />
          );
        })}
      </Svg>
      <VBracket x={GRID.x0 - 14} y0={y(GRID.top)} y1={slot(TEST.tp - 1)[1] + GRID.pitch / 2} at={sickAt} color={DATA} />
      <Note at={sickAt + 2} x={GRID.x0 - 34} y={y(GRID.top) - 2} align="right">
        <span style={{ ...note(22, DATA_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{TEST.tp} sick</span>
      </Note>
      <Note at={peopleAt} x={GRID.x0} y={gridBottom + 14}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={{ color: STAT_INK, fontWeight: 700 }}>{num(TEST.fp)} false alarms</span>, and{" "}
          <Count at={peopleAt} dur={20} to={TEST.positives} format={num} /> positives in all
        </span>
      </Note>
      <Ink at={percentAt - 4} dur={16} style={{ left: GRID.x0, top: gridBottom + 72, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 24 }}>
        <Big size={130} color={STAT_INK} italic>
          {pct(TEST.treePpv)}
        </Big>
        <span style={note(26, INK)}>
          = {TEST.tp} / {num(TEST.positives)}
        </span>
      </Ink>
      <Note at={simAt - 2} x={GRID.x0} y={gridBottom + 250}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          Simulated, <Count at={simAt} dur={22} to={TEST.simN} format={num} /> people:{" "}
          <span style={{ opacity: ease(frame, simAt + 14, 10) }}>
            {num(TEST.simSickPositive)} sick of {num(TEST.simPositives)} positives,{" "}
          </span>
          <b style={{ color: STAT_INK, opacity: ease(frame, pointOneAt - 4, 10) }}>{fmt(TEST.simPpv * 100, 1)}%</b>
        </span>
      </Note>
    </AbsoluteFill>
  );
};
