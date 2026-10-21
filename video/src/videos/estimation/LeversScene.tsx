import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LEVELS, SIZES, SPREAD } from "./data";
import { EST, EST_INK, Headline, IntervalBar, Kicker, lerp, Marked, Spot, Svg } from "./parts";

/** One value axis for all three panels, so their widths compare directly. */
const LO = 43;
const HI = 57;
const PANELS = [160, 720, 1280];
const PANEL_W = 480;
const BAR_X0 = 96;
const scaleFor = (x0: number): XScale => ({ lo: LO, hi: HI, x0: x0 + BAR_X0, x1: x0 + PANEL_W });
const ROW_Y = [430, 510, 590, 670];
const AXIS = 724;

type Row = { name: string; lo: number; hi: number; width: number; at: number; lit: number };

/**
 * Part 2 opens: the three levers on an interval's width, each measured on the
 * lesson's own samples and drawn on one shared axis, a bar arriving as each
 * level or sample size is named and its width lighting as it is read out.
 */
export const LeversScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const wideFrom = n.beat("wide").from;
  const wideAt = n.word("wide", "wide");
  const threeAt = n.word("wide", "Three");
  const confidenceAt = n.word("level", "confidence");
  const twoHundredAt = n.word("level", "two hundred");
  const eightyAt = n.word("level", "eighty");
  const ninetyAt = n.word("level", "ninety");
  const ninetyFiveAt = n.word("level", "ninety-five");
  const ninetyNineAt = n.word("level", "ninety-nine");
  const widerAt = n.word("costs", "wider");
  const twoOneAt = n.word("costs", "two point one");
  const fourAt = n.word("costs", "four point two five");
  const costsAt = n.word("costs", "costs");
  const sizeAt = n.word("size", "sample size");
  const holdAt = n.word("size", "Hold");
  const twentyFiveAt = n.word("size", "twenty-five");
  const sixteenAt = n.word("size", "sixteen hundred");
  const quadruplesAt = n.word("halves", "quadruples");
  const halvesAt = n.word("halves", "halves");
  const elevenAt = n.word("halves", "eleven");
  const fiveAt = n.word("halves", "five");
  const twoThreeAt = n.word("halves", "two point three");
  const oneTwoAt = n.word("halves", "one point two");
  const spreadAt = n.word("noise", "spread");
  const doubleAt = n.word("noise", "Double");
  const doublesAt = n.word("noise", "doubles");
  const noiseEnd = n.beat("noise").to;

  const levelAt = [eightyAt, ninetyAt, ninetyFiveAt, ninetyNineAt];
  const levelLit = [twoOneAt, -1, -1, fourAt];
  const sizeRowAt = [0, 1, 2, 3].map((i) => lerp(twentyFiveAt - 4, sixteenAt - 4, i / 3));
  const sizeLit = [elevenAt, fiveAt, twoThreeAt, oneTwoAt];

  const panels: { title: string; sub: string; at: number; rows: Row[]; lesson: string; lessonAt: number }[] = [
    {
      title: "Confidence level",
      sub: `one simulated sample of ${LEVELS.n}, values near 50`,
      at: confidenceAt - 4,
      rows: LEVELS.rows.map((r, i) => ({ name: `${r.level}%`, lo: r.lo, hi: r.hi, width: r.width, at: levelAt[i] - 4, lit: levelLit[i] })),
      lesson: "More confidence: wider",
      lessonAt: costsAt - 4,
    },
    {
      title: "Sample size",
      sub: "at 95%",
      at: sizeAt - 4,
      rows: SIZES.rows.map((r, i) => ({
        name: `n = ${r.n.toLocaleString("en-US")}`,
        lo: r.lo,
        hi: r.hi,
        width: r.width,
        at: sizeRowAt[i],
        lit: sizeLit[i],
      })),
      lesson: "Four times the data: about half the width",
      lessonAt: halvesAt - 2,
    },
    {
      title: "Spread",
      sub: `the same ${LEVELS.n}, at 95%`,
      at: spreadAt - 6,
      rows: [
        { name: `spread ${fmt(SPREAD.s, 1)}`, lo: SPREAD.lo, hi: SPREAD.hi, width: SPREAD.width, at: spreadAt - 2, lit: -1 },
        { name: `spread ${fmt(SPREAD.sWide, 1)}`, lo: SPREAD.wideLo, hi: SPREAD.wideHi, width: SPREAD.wideWidth, at: doubleAt - 2, lit: doublesAt },
      ],
      lesson: "Twice the spread: twice the width",
      lessonAt: doublesAt + 4,
    },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the first and last bar of each lever, and the caliper ── */}
      <Sfx name="el-pop" at={wideAt - 6} level={-30} />
      <Sfx name="el-tap" at={eightyAt - 4} level={-29} />
      <Sfx name="el-tap" at={ninetyNineAt - 4} level={-28} />
      <Sfx name="el-tap" at={twentyFiveAt - 4} level={-29} />
      <Sfx name="el-tap" at={sixteenAt - 4} level={-28} />
      <Sfx name="el-tap" at={doubleAt - 2} level={-28} />

      <Kicker at={wideFrom - 10}>What makes an interval wide</Kicker>
      <Headline at={wideFrom - 4} second={threeAt - 4} size={64} italic="Three things.">
        What makes an interval wide?
      </Headline>
      <Spot id="estimation-caliper" at={wideAt - 6} left={1500} top={y(96)} width={270} height={202} />

      {panels.map((p, k) => {
        const x0 = PANELS[k];
        const X = scaleFor(x0);
        return (
          <React.Fragment key={p.title}>
            <Ink at={p.at} dur={14} style={{ left: x0, top: y(300), whiteSpace: "nowrap" }}>
              <span style={{ ...label(26, EST_INK), fontWeight: 700 }}>{k + 1}</span>
              <span style={{ ...label(26, INK), fontWeight: 600, marginLeft: 12 }}>{p.title}</span>
            </Ink>
            <Ink at={k === 0 ? twoHundredAt - 4 : k === 1 ? holdAt - 4 : p.at + 6} dur={14} style={{ left: x0, top: y(344), whiteSpace: "nowrap" }}>
              <span style={note(22, INK_SOFT)}>{p.sub}</span>
            </Ink>
            <Axis scale={X} base={y(AXIS)} ticks={[44, 50, 56]} at={p.at + 2} />
            <Svg opacity={ease(frame, p.at + 2, 12) * 0.5}>
              <line x1={sx(X, 50)} x2={sx(X, 50)} y1={y(ROW_Y[0] - 30)} y2={y(AXIS)} stroke={HAIRLINE} strokeWidth={1} strokeDasharray="3 5" />
            </Svg>
            {p.rows.map((r, i) => {
              const ry = y(ROW_Y[i]);
              const lit = r.lit >= 0 ? ease(frame, r.lit - 4, 10) : 0;
              return (
                <React.Fragment key={r.name}>
                  <Ink at={r.at - 2} dur={12} style={{ left: x0, top: ry - 15, whiteSpace: "nowrap" }}>
                    <span style={{ ...note(22, INK), fontWeight: 600 }}>{r.name}</span>
                  </Ink>
                  <IntervalBar x0={sx(X, r.lo)} x1={sx(X, r.hi)} y={ry} at={r.at} dur={14} color={INK} width={4} tick={10} />
                  <Svg>
                    <circle cx={sx(X, (r.lo + r.hi) / 2)} cy={ry} r={5 * ease(frame, r.at + 4, 8)} fill={EST} stroke={PAPER} strokeWidth={1} />
                  </Svg>
                  <Note at={r.at + 8} x={sx(X, r.hi) + 12} y={ry - 15}>
                    <span style={{ ...note(22, lit > 0 ? EST_INK : INK_SOFT), fontWeight: lit > 0 ? 700 : 500, ...halo, whiteSpace: "nowrap" }}>
                      <Marked at={r.lit >= 0 ? r.lit - 4 : 1e9} color={HIGHLIGHT}>
                        {fmt(r.width)}
                      </Marked>
                    </span>
                  </Note>
                </React.Fragment>
              );
            })}
            <Ink at={p.lessonAt} dur={16} style={{ left: x0, top: y(784), width: PANEL_W }}>
              <span style={{ ...body(28, true), color: INK }}>{p.lesson}</span>
            </Ink>
          </React.Fragment>
        );
      })}
      <Note at={widerAt - 2} x={PANELS[0]} y={y(384)}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>each interval’s width beside it</span>
      </Note>
      <Note at={quadruplesAt - 2} x={PANELS[1] + BAR_X0} y={y(384)}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>each row has four times the data</span>
      </Note>

      {/* The recipe the next scene reuses: short enough to read in the pause
          after "doubles too" and the turn into the rate. */}
      <Ink at={noiseEnd + 4} dur={18} style={{ left: PANELS[0], top: y(852), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK) }}>
          The same recipe: <span style={{ fontWeight: 700 }}>estimate ± critical value × standard error</span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
