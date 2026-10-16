import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32, num, pct, TEST } from "./data";
import { Big, Count, DATA, DATA_INK, Headline, Kicker, lerp, Pulse, SOFT, STAT, STAT_INK, Strike, Svg, Sweep, VBracket } from "./parts";

/** The tree: where each node's label is centred. */
const NODE = {
  root: [500, 360],
  sick: [250, 520],
  healthy: [750, 520],
  sickPos: [170, 700],
  sickNeg: [330, 700],
  healthyPos: [650, 700],
  healthyNeg: [870, 700],
} as const;
/** Each node's pill: the two sick branches tinted blue, the false alarms red. */
const PILL = [
  `color-mix(in srgb, ${INK_SOFT} 14%, transparent)`,
  ds("blue", 100),
  `color-mix(in srgb, ${INK_SOFT} 14%, transparent)`,
  ds("blue", 100),
  `color-mix(in srgb, ${INK_SOFT} 8%, transparent)`,
  ds("red", 100),
  `color-mix(in srgb, ${INK_SOFT} 8%, transparent)`,
];
/** Everyone who tested positive, 61 to a row: 61 x 18 is 1,098 exactly. */
const GRID = { x0: 1060, top: 372, pitch: 12.8, r: 4.7, cols: 61 } as const;

/** A thousand people as 50 by 20 dots; the one with the disease sits here. */
const FIELD = { x0: 1100, top: 340, pitch: 13, cols: 50, one: 637 } as const;

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
  const aTestAt = n.word("test", "A test");
  const dontAt = n.word("walk", "don't");
  const theTestAt = n.word("caught", "The test");
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
  const mistakeAt = n.word("flagged", "by mistake");
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
            [aTestAt - 2, pct(TEST.sensitivity), "of sick people test positive", DATA_INK],
            [accurateAt - 2, pct(TEST.specificity), "of healthy people test negative", INK_SOFT],
          ] as const
        ).map(([cue, big, text, color], i) => (
          <Ink key={i} at={cue} dur={16} style={{ left: 160, top: y(330 + i * 120), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 22 }}>
            <span style={{ ...headline(76), color }}>{i === 0 ? big : <Sweep at={bothAt - 2 + (i - 1) * 6}>{big}</Sweep>}</span>
            <span style={note(30, INK)}>{text}</span>
          </Ink>
        ))}
        <Ink at={positiveAt - 2} dur={14} style={{ left: 160, top: y(712), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 18 }}>
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
        {/* A thousand people, one of whom has it. */}
        <Ink at={thousandAt - 4} dur={12} style={{ left: FIELD.x0, top: y(FIELD.top) - 40, whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>
            A thousand people, <span style={{ color: DATA_INK }}>one with the disease</span>
          </span>
        </Ink>
        <Svg>
          {Array.from({ length: 1000 }, (_, i) => {
            const one = i === FIELD.one;
            const p = one ? pop(frame, thousandAt + 10, fps, 12) : ease(frame, thousandAt - 4 + JIT[i] * 14, 8);
            if (p <= 0) return null;
            const cx = FIELD.x0 + FIELD.pitch * ((i % FIELD.cols) + 0.5);
            const cy = y(FIELD.top) + h(FIELD.pitch * (Math.floor(i / FIELD.cols) + 0.5));
            return <circle key={i} cx={cx} cy={cy} r={(one ? 6.5 : 3.6) * Math.min(1.1, p)} fill={one ? DATA : SOFT} />;
          })}
        </Svg>
        <Pulse
          x={FIELD.x0 + FIELD.pitch * ((FIELD.one % FIELD.cols) + 0.5)}
          y={y(FIELD.top) + h(FIELD.pitch * (Math.floor(FIELD.one / FIELD.cols) + 0.5))}
          at={positiveAt - 2}
          color={DATA}
        />
        <Ink at={chancesAt - 4} dur={14} style={{ left: 1100, top: y(616), whiteSpace: "nowrap" }}>
          <span style={label(24, INK)}>The chance you have it</span>
        </Ink>
        <Ink at={gutAt - 2} dur={14} style={{ left: 1100, top: y(654), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={note(26, INK_SOFT)}>Your gut</span>
          <Big size={96} color={INK_SOFT}>
            <Strike at={answerAt - 2} top="0.5em">
              {pct(TEST.sensitivity)}
            </Strike>
          </Big>
        </Ink>
        <Ink at={answerAt + 2} dur={14} style={{ left: 1100, top: y(768), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={note(26, INK)}>The answer</span>
          <span style={{ opacity: ease(frame, nineAt - 4, 12) }}>
            <Big size={110} color={STAT_INK} italic>
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
            [NODE.sickPos, caughtAt - 2, num(TEST.tp), "caught", DATA_INK],
            [NODE.sickNeg, caughtAt + 4, num(TEST.fn), "missed", INK_SOFT],
            [NODE.healthyPos, alarmsAt - 2, num(TEST.fp), "false alarms", STAT_INK],
            [NODE.healthyNeg, alarmsAt + 6, num(TEST.tn), "cleared", INK_SOFT],
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
                top: y(p[1]) - 40,
                transform: `translate(-50%, ${(1 - a) * 10}px) scale(${lerp(0.85, 1, a)})`,
                opacity: a,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ padding: "6px 20px 8px", borderRadius: 16, background: PILL[i] }}>
                <div style={{ ...note(i === 0 ? 40 : 34, color), fontWeight: 700, lineHeight: 1.05 }}>{big}</div>
                <div style={{ ...note(21, INK_SOFT) }}>{small}</div>
              </div>
            </div>
          );
        })}
        <Pulse x={NODE.healthy[0]} y={y(NODE.healthy[1])} at={mistakeAt - 2} r={70} />
        <Pulse x={NODE.sick[0]} y={y(NODE.sick[1])} at={theTestAt - 2} r={70} color={DATA} />
        <Pulse x={NODE.healthy[0]} y={y(NODE.healthy[1])} at={dontAt - 2} r={80} color={INK_SOFT} />
        {/* The two rates, on the branches they decide. */}
        <Note at={catchesAt} x={(NODE.sick[0] + NODE.sickPos[0]) / 2 - 16} y={y((NODE.sick[1] + NODE.sickPos[1]) / 2) - 14} align="right">
          <span style={{ ...note(21, DATA_INK), fontWeight: 650, whiteSpace: "nowrap" }}>99%</span>
        </Note>
        <Note at={flagsAt + 2} x={(NODE.healthy[0] + NODE.healthyPos[0]) / 2 - 16} y={y((NODE.healthy[1] + NODE.healthyPos[1]) / 2) - 14} align="right">
          <span style={{ ...note(21, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>1%</span>
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
      <Note at={simAt - 2} x={GRID.x0} y={gridBottom + 236}>
        <div style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          Simulated, <Count at={simAt} dur={30} to={TEST.simN} format={num} style={{ fontWeight: 700 }} /> people
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, simAt + 14, 10) }}>
            {num(TEST.simSickPositive)} sick of {num(TEST.simPositives)} positives
          </span>
          <span style={{ opacity: ease(frame, pointOneAt - 4, 10) }}>
            <Big size={64} color={STAT_INK} italic>
              {fmt(TEST.simPpv * 100, 1)}%
            </Big>
          </span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
