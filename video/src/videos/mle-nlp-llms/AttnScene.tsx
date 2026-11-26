import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUS, SCALING } from "./data";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, Chip, Clear, Drift, Grid, GOLD, INK, INK_SOFT, Line, Mark, MARK_BAD, OK, OK_INK, pct, Q_SIZE, Svg, Vec, X0 } from "./parts";

/** Query, key and value: three small vectors per token, told apart by
 *  three non-semantic inks. */
const QKV = [
  { name: "q", color: BAR },
  { name: "k", color: ds("teal", 500) },
  { name: "v", color: ds("purple", 500) },
] as const;
const vals = (t: number, m: number) => Array.from({ length: 4 }, (_, k) => 0.3 + 0.7 * Math.abs(Math.sin(t * 2.1 + m * 1.3 + k * 0.9 + 0.2)));
const COLW = 160;
/** The right panel's four columns, one per key. */
const KX = [1120, 1280, 1440, 1600];

/**
 * Question 4. The page's formula on a line of its own, its scaling marked
 * when it is named. Four tokens each sprout a query, a key and a value; the
 * query of "bank" is dotted with every key; its four scores (illustrative,
 * and labelled so) are softmaxed into weights that sum to one; and its
 * output is the weighted blend of the values. Then why divide: at the right,
 * how widely one random number and a dot product of 64 of them spread (8
 * times, results.json scaling), back to 1 once divided; one row of the seeded
 * simulation, unscaled with nearly all its weight on one key (red), scaled
 * spread out (green), with the averages over 2,000 rows; and every pair of
 * tokens one hop apart, as a grid of pairs, where the spread was.
 */
export const AttnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "What is self-attention");
  const projAt = n.word("q4-a", "Each token is projected");
  const queryAt = n.word("q4-a", "a query");
  const keyAt = n.word("q4-a", "a key");
  const valueAt = n.word("q4-a", "a value");
  const weightAt = n.word("q4-a", "One token's weight");
  const dottedAt = n.word("q4-a", "query dotted with");
  const dividedAt = n.word("q4-a", "divided by the square root");
  const softAt = n.word("q4-a", "and softmaxed");
  const outAt = n.word("q4-a", "Its output is");
  const sumAt = n.word("q4-a", "the weighted sum of the values");
  const whyAt = n.word("q4-scale", "Why divide");
  const simAt = n.word("q4-scale", "Simulate queries");
  const spreadAt = n.word("q4-scale", "spread eight times wider");
  const eightyAt = n.word("q4-scale", "eighty-five percent");
  const gradAt = n.word("q4-scale", "where its gradient is small");
  const divEightAt = n.word("q4-scale", "Divided by eight");
  const twentyAt = n.word("q4-scale", "twenty-five percent");
  const pairAt = n.word("q4-hop", "Every pair of tokens");
  const hopAt = n.word("q4-hop", "one hop apart");
  const squareAt = n.word("q4-hop", "grow with the square");
  const end = n.beat("q4-hop").to;

  const A = ILLUS.attention;
  const S = SCALING;
  const qkvAt = [queryAt, keyAt, valueAt];

  // ── The worked example ──
  const chipY = y(350);
  const base = y(476);
  const tokX = (t: number) => X0 + t * COLW;
  const vecX = (t: number, m: number) => tokX(t) + m * 44;
  const QI = A.query;
  const arcTop = base + h(44);
  const scoreY = y(420);
  const barBase = y(574);
  const barMax = h(110);
  const outBase = y(690);
  const blend = Array.from({ length: 4 }, (_, k) => A.weights.reduce((s, w, t) => s + w * vals(t, 2)[k], 0));

  // ── The simulation ──
  const simTop = y(350);
  const rowBase = y(700);
  const rowMax = h(190);
  const panel = [X0, 690];
  const grid = { x: 1410, y: y(476), size: 354 };
  // The spread, in the right column until the pair grid takes it: a bar one
  // standard deviation either side, the dot products' 8 times as wide, back
  // to one number's width once divided by √64.
  const SP = { x: 1300, mid: 1550, unit: 54 };
  const spreadW =
    SP.unit * (1 + (S.rawSd - 1) * ease(frame, spreadAt + 2, 20) + (S.scaledSd - S.rawSd) * ease(frame, divEightAt + 4, 20));

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={queryAt + 2} level={-35} />
      <Sfx name="el-pencil" at={dottedAt} level={-36} />
      <Sfx name="el-pencil" at={dividedAt + 4} level={-37} />
      <Sfx name="el-pop" at={softAt + 4} level={-32} />
      <Sfx name="el-sprinkle" at={sumAt + 2} level={-35} />
      <Sfx name="el-whoosh" at={whyAt} level={-36} />
      <Sfx name="el-tap" at={eightyAt} level={-30} />
      <Sfx name="el-sprinkle" at={divEightAt + 4} level={-34} />
      <Sfx name="el-tap" at={twentyAt} level={-31} />
      <Sfx name="el-sprinkle" at={pairAt + 2} level={-35} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is self-attention?
        </QuestionCard>

        {/* The page's formula, on a line of its own. */}
        <Ink at={weightAt - 6} dur={18} style={{ left: X0, top: y(244), whiteSpace: "nowrap" }}>
          <span style={{ ...note(36, INK), fontWeight: 400 }}>
            <MathRun>
              Attention(<I>Q</I>, <I>K</I>, <I>V</I>) = softmax(
              <Mark at={dividedAt + 2} out={pairAt}>
                <I>Q</I>
                <I>K</I>
                <sup style={{ fontSize: "0.7em", verticalAlign: "0.45em", lineHeight: 0 }}>T</sup> / √<I>d</I>
                <sub style={{ fontSize: "0.7em", verticalAlign: "-0.25em", lineHeight: 0 }}>
                  <I>k</I>
                </sub>
              </Mark>
              ) <I>V</I>
            </MathRun>
          </span>
        </Ink>

        {/* Held through "Why divide?", so the output stays up a few seconds. */}
        <Clear at={simAt - 6}>
          {/* Four tokens, each projected into a query, a key and a value. */}
          {A.words.map((w, t) => (
            <Chip key={w} x={tokX(t)} y={chipY} at={projAt + t * 3} tone={t === QI ? "ink" : "blue"} size={24} mono>
              {w}
            </Chip>
          ))}
          {A.words.map((_, t) =>
            QKV.map((m, mi) => <Vec key={`${t}${m.name}`} x={vecX(t, mi)} y={base} values={vals(t, mi)} h={h(44)} bar={7} gap={2} at={qkvAt[mi] + t * 2} color={m.color} />),
          )}
          {QKV.map((m, mi) => (
            <React.Fragment key={m.name}>
              {A.words.map((_, t) => (
                <Ink key={t} at={qkvAt[mi] + t * 2 + 4} dur={10} style={{ left: vecX(t, mi) + 9, top: base + 6, whiteSpace: "nowrap" }}>
                  <span style={{ ...note(22, m.color) }}>
                    <M>{m.name}</M>
                  </span>
                </Ink>
              ))}
            </React.Fragment>
          ))}
          {/* bank's query against every key. */}
          <Svg>
            {A.words.map((_, t) => {
              const p = ease(frame, dottedAt + t * 3, 12);
              if (p <= 0) return null;
              const x1 = vecX(QI, 0) + 16;
              const x2 = vecX(t, 1) + 16;
              const dip = h(26) + Math.abs(x2 - x1) * 0.12;
              return (
                <path
                  key={t}
                  d={`M${x1},${arcTop} C${x1},${arcTop + dip} ${x2},${arcTop + dip} ${x2},${arcTop}`}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth={2.4}
                  pathLength={1}
                  strokeDasharray={`${p} 1`}
                />
              );
            })}
          </Svg>

          {/* The arithmetic for that one query, a column per key. */}
          {A.words.map((w, t) => (
            <Ink key={w} at={weightAt + t * 2} dur={12} style={{ left: KX[t] - 70, top: chipY + 4, width: 140, textAlign: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: INK_SOFT }}>{w}</span>
            </Ink>
          ))}
          <Line at={dottedAt} x={890} y={scoreY} size={24} color={INK}>
            <MathRun>
              <I>q</I> · <I>k</I> / √<I>d</I>
              <sub style={{ fontSize: "0.7em", verticalAlign: "-0.25em", lineHeight: 0 }}>
                <I>k</I>
              </sub>
            </MathRun>
          </Line>
          {A.scores.map((s, t) => (
            <Line key={t} at={dottedAt + 6 + t * 3} x={KX[t]} y={scoreY} size={24} align="center" width={120}>
              <Num>{s.toFixed(1)}</Num>
            </Line>
          ))}
          <Line at={softAt} x={890} y={barBase - h(36)} size={24}>
            <M>softmax</M>
          </Line>
          <Svg>
            {A.weights.map((wt, t) => {
              const p = ease(frame, softAt + 4 + t * 2, 14);
              if (p <= 0) return null;
              const bh = (wt / Math.max(...A.weights)) * barMax * p;
              return <rect key={t} x={KX[t] - 28} y={barBase - bh} width={56} height={bh} rx={4} fill={BAR} />;
            })}
          </Svg>
          {A.weights.map((wt, t) => (
            <Line key={t} at={softAt + 10 + t * 2} x={KX[t]} y={barBase + 8} size={22} align="center" width={120} color={BLUE_INK}>
              <Num>{wt.toFixed(3)}</Num>
            </Line>
          ))}
          <Line at={softAt + 18} x={KX[3] + 90} y={barBase - h(36)} size={22} color={INK_SOFT}>
            sum to <Num>1</Num>
          </Line>
          <Line at={outAt} x={890} y={outBase - h(34)} size={24}>
            output
          </Line>
          <Vec x={KX[0] - 20} y={outBase} values={blend} h={h(44)} bar={10} gap={4} at={sumAt + 2} color={QKV[2].color} />
          <Line at={sumAt + 6} x={KX[0] + 50} y={outBase - h(34)} size={22} color={INK_SOFT}>
            the values, blended by the weights
          </Line>
          <Line at={dottedAt + 18} x={890} y={y(740)} size={20} color={INK_SOFT}>
            Illustrative scores
          </Line>
        </Clear>

        {/* ── Why divide: one row of the simulation, each way ── */}
        <Line at={simAt} x={X0} y={simTop} size={21} color={INK_SOFT}>
          Simulation: <Num>{S.rows.toLocaleString("en-US")}</Num> rows of <Num>{S.keys}</Num> keys, queries and keys of <Num>{S.dk}</Num> random numbers
        </Line>
        <Line at={spreadAt} x={X0} y={simTop + h(46)} size={26}>
          Dot products spread <Num>{S.rawSd}</Num>× wider than the numbers
        </Line>
        {[
          { title: "Not divided", row: S.exampleRow.unscaled, color: ACCENT, at: eightyAt - 10 },
          { title: `Divided by √${S.dk} = ${S.rootDk}`, row: S.exampleRow.scaled, color: OK, at: divEightAt },
        ].map((r, i) => (
          <React.Fragment key={r.title}>
            <Line at={r.at} x={panel[i]} y={y(470)} size={22} color={INK}>
              {r.title}
            </Line>
            <Svg>
              <line x1={panel[i]} x2={panel[i] + 16 * 29 - 7} y1={rowBase} y2={rowBase} stroke={INK_SOFT} strokeWidth={1.2} opacity={ease(frame, r.at, 10)} />
              {r.row.map((v, k) => {
                const p = ease(frame, r.at + 4 + k * 0.8, 12);
                if (p <= 0) return null;
                const bh = Math.max(2, v * rowMax) * p;
                return <rect key={k} x={panel[i] + k * 29} y={rowBase - bh} width={22} height={bh} rx={3} fill={r.color} />;
              })}
            </Svg>
          </React.Fragment>
        ))}
        <ColumnRule x={640} top={y(470)} height={h(380)} at={divEightAt} />
        <Line at={eightyAt} x={panel[0]} y={rowBase + h(18)} size={23} color={ACCENT_INK} weight={600}>
          <Mark at={eightyAt + 6} color={MARK_BAD}>
            <Num>{pct(S.topUnscaled)}</Num> on one key
          </Mark>
          , on average
        </Line>
        <Line at={gradAt} x={panel[0]} y={rowBase + h(56)} size={21} color={ACCENT_INK}>
          where softmax&apos;s gradient is small
        </Line>
        <Line at={twentyAt} x={panel[1]} y={rowBase + h(18)} size={23} color={OK_INK} weight={600}>
          Top weight <Num>{pct(S.topScaled)}</Num>, on average
        </Line>
        <Line at={divEightAt + 10} x={panel[1]} y={rowBase + h(56)} size={21} color={INK_SOFT}>
          One row of <Num>{S.keys}</Num> weights, each way
        </Line>

        {/* ── Every pair one hop apart ── */}
        {/* ── How widely the scores spread: one number against a dot product of 64 ── */}
        <ColumnRule x={1240} top={y(470)} height={h(380)} at={simAt + 6} />
        <Clear at={pairAt - 8}>
          <Line at={simAt + 6} x={SP.x} y={y(470)} size={22}>
            One random number
          </Line>
          <Line at={spreadAt} x={SP.x} y={y(570)} size={22}>
            A dot product of <Num>{S.dk}</Num> of them
          </Line>
          <Svg>
            <line x1={SP.mid} x2={SP.mid} y1={y(500)} y2={y(650)} stroke={INK_SOFT} strokeWidth={1.2} opacity={0.6 * ease(frame, simAt + 6, 10)} />
            {[
              { y: y(512), w: SP.unit, at: simAt + 10 },
              { y: y(612), w: spreadW, at: spreadAt + 2 },
            ].map((b, i) => {
              const p = ease(frame, b.at, 12);
              if (p <= 0) return null;
              return <rect key={i} x={SP.mid - b.w / 2} y={b.y} width={b.w} height={h(24)} rx={4} fill={BAR} opacity={p} />;
            })}
          </Svg>
          <Line at={spreadAt + 14} out={divEightAt} x={SP.x} y={y(676)} size={23} weight={600}>
            <Num>{S.rawSd}</Num>× wider
          </Line>
          <Line at={divEightAt + 8} x={SP.x} y={y(676)} size={23} color={OK_INK} weight={600}>
            Divided by <Num>{S.rootDk}</Num>: <Num>{S.scaledSd}</Num>× again
          </Line>
          <Line at={spreadAt + 24} x={SP.x} y={y(730)} size={20} color={INK_SOFT}>
            Each bar: one standard deviation either side
          </Line>
        </Clear>

        <Grid x={grid.x} y={grid.y} n={4} size={grid.size} gap={6} at={pairAt + 4} dur={16} color={GOLD} />
        {A.words.map((w, t) => (
          <React.Fragment key={w}>
            <Ink at={pairAt + t * 2} dur={10} style={{ left: grid.x + t * ((grid.size + 6) / 4) - 6, top: grid.y - h(36), width: (grid.size - 18) / 4 + 12, textAlign: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 500, color: INK_SOFT }}>{w}</span>
            </Ink>
            <Ink at={pairAt + t * 2} dur={10} style={{ left: grid.x - 140, top: grid.y + t * ((grid.size + 6) / 4) + 28, width: 124, textAlign: "right" }}>
              <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 500, color: INK_SOFT }}>{w}</span>
            </Ink>
          </React.Fragment>
        ))}
        <Line at={hopAt} x={grid.x} y={grid.y + grid.size + h(18)} size={23}>
          Every pair, one hop
        </Line>
        <Line at={squareAt} x={grid.x} y={grid.y + grid.size + h(56)} size={23} color={ACCENT_INK} weight={600}>
          <MathRun>
            <I>n</I>
            <sup style={{ fontSize: "0.7em", verticalAlign: "0.45em", lineHeight: 0 }}>2</sup>
          </MathRun>{" "}
          pairs
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
