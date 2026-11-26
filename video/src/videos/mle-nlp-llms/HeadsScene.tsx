import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { MathRun } from "../../editorial/math";
import { label } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { HEADS } from "./data";
import { BAR, Drift, GOLD, INK_SOFT, lerp, Line, Mark, MARK_OK, OK_INK, Q_SIZE, Svg, Vec, X0 } from "./parts";

const LEFT = 300;
const HEAD_W = 165;
const QKV = [BAR, ds("teal", 500), ds("purple", 500)];
const SHADE = [ds("blue", 100), ds("blue", 200), ds("blue", 300), ds("blue", 400), ds("blue", 600)];
/** What each head attends to, as an illustrative 5-by-5 pattern (0..1). */
const PATTERN = (head: number, r: number, c: number) => {
  switch (head % 4) {
    case 0:
      return r === c ? 1 : 0.1;
    case 1:
      return c === r - 1 || (r === 0 && c === 0) ? 1 : 0.15;
    case 2:
      return c <= r ? 0.25 + 0.75 * Math.abs(Math.sin(head + r * 1.7 + c * 2.3)) : 0.05;
    default:
      return c === 1 ? 0.9 : 0.2 * Math.abs(Math.sin(head * 3 + r + c));
  }
};
const SYNTAX = 2;
const PRONOUN = 5;

/**
 * Question 5. One 512-wide vector, whole, reaching all eight heads, each
 * projecting it into its own 64-wide query, key and value (a head reads the
 * whole vector, not a slice of it); eight small attention grids filling at
 * once (the patterns are illustrative); two named for what a head can track;
 * the eight outputs joined back into 512. Then the cost: 8 × 64 = 512
 * multiply-adds per pair, as for one head (green).
 */
export const HeadsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "What is multi-head attention");
  const giveAt = n.word("q5-a", "Give each head");
  const smallerAt = n.word("q5-a", "its own smaller query");
  const runAt = n.word("q5-a", "run attention in each");
  const concatAt = n.word("q5-a", "concatenate the results");
  const syntaxAt = n.word("q5-a", "track syntax");
  const nounAt = n.word("q5-a", "which noun a pronoun means");
  const eightAt = n.word("q5-cost", "eight heads of sixty-four");
  const sameAt = n.word("q5-cost", "cost the same multiply-adds");
  const fiveAt = n.word("q5-cost", "five hundred and twelve");
  const wholeAt = n.word("tf-in", "the whole model");
  const end = n.beat("tf-in").to;

  const H = HEADS;
  const inTop = y(300);
  const BAR_H = h(24);
  const fan = ease(frame, giveAt + 4, 18);
  const vecBase = y(450);
  const gridTop = y(512);
  const GRID = 112;
  const outTop = y(690);
  const join = ease(frame, concatAt + 10, 18);
  const headX = (i: number) => LEFT + i * HEAD_W;
  const seg = (i: number, gap: number) => ({ x: headX(i) + gap / 2, w: HEAD_W - gap });

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={giveAt + 4} level={-36} />
      <Sfx name="el-sprinkle" at={smallerAt} level={-35} />
      <Sfx name="el-sprinkle" at={runAt} level={-34} />
      <Sfx name="el-whoosh" at={concatAt + 10} level={-36} />
      <Sfx name="el-tap" at={syntaxAt} level={-32} />
      <Sfx name="el-tap" at={nounAt} level={-32} />
      <Sfx name="el-pencil" at={fiveAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is multi-head attention, and why use it?
        </QuestionCard>

        {/* The input vector, 512 wide and whole, reaching every head. */}
        <Line at={qAt + 10} x={X0} y={inTop - 2} size={22} color={INK_SOFT}>
          <Num>{H.width}</Num> wide
        </Line>
        <Svg>
          {ease(frame, qAt + 10, 16) > 0 ? (
            <rect x={headX(0) + 7} y={inTop} width={(H.heads * HEAD_W - 14) * ease(frame, qAt + 10, 16)} height={BAR_H} rx={4} fill={BAR} />
          ) : null}
          {/* One line from the whole vector to each head's projections. */}
          {Array.from({ length: H.heads }, (_, i) => {
            const p = ease(frame, giveAt + 4 + i, 14) * fan;
            if (p <= 0) return null;
            const x1 = headX(H.heads / 2);
            const y1 = inTop + BAR_H + 6;
            const x2 = headX(i) + HEAD_W / 2;
            const y2 = vecBase - h(40) - 12;
            return <line key={i} x1={x1} y1={y1} x2={lerp(x1, x2, p)} y2={lerp(y1, y2, p)} stroke={BAR} strokeWidth={1.6} opacity={0.75} />;
          })}
        </Svg>
        <Line at={smallerAt + 8} x={X0} y={vecBase - h(34)} size={22} color={INK_SOFT}>
          <Num>{H.headWidth}</Num> each
        </Line>

        {/* Each head: its own query, key and value, and its own attention. */}
        {Array.from({ length: H.heads }, (_, i) =>
          QKV.map((c, m) => (
            <Vec
              key={`${i}-${m}`}
              x={headX(i) + 24 + m * 42}
              y={vecBase}
              values={Array.from({ length: 4 }, (_, k) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.9 + m * 2.7 + k)))}
              h={h(40)}
              bar={7}
              gap={2}
              at={smallerAt + i * 1.5 + m}
              color={c}
            />
          )),
        )}
        <Svg>
          {Array.from({ length: H.heads }, (_, i) => {
            const lit = i === SYNTAX ? ease(frame, syntaxAt, 10) : i === PRONOUN ? ease(frame, nounAt, 10) : 0;
            const gx = headX(i) + (HEAD_W - GRID) / 2;
            const cell = (GRID - 4 * 3) / 5;
            return Array.from({ length: 25 }, (_, k) => {
              const r = Math.floor(k / 5);
              const c = k % 5;
              const p = ease(frame, runAt + 2 + (r + c) * 1.2, 8);
              if (p <= 0) return null;
              const v = PATTERN(i, r, c);
              const base = SHADE[Math.min(SHADE.length - 1, Math.floor(v * SHADE.length))];
              const fill = lit > 0 && v > 0.5 ? `color-mix(in srgb, ${GOLD} ${lit * 100}%, ${base})` : base;
              return <rect key={`${i}-${k}`} x={gx + c * (cell + 3)} y={gridTop + r * (cell + 3)} width={cell} height={cell} rx={3} fill={fill} opacity={p} />;
            });
          })}
        </Svg>
        {[
          { i: SYNTAX, text: "syntax", at: syntaxAt },
          { i: PRONOUN, text: "which noun “it” means", at: nounAt },
        ].map((l) => (
          <Line key={l.text} at={l.at} x={headX(l.i) + HEAD_W / 2} y={gridTop + h(GRID) + 8} size={21} align="center" width={280}>
            {l.text}
          </Line>
        ))}

        {/* The eight outputs, joined back into one vector of 512: one bar once joined. */}
        <Svg>
          {join >= 1 ? (
            <rect x={seg(0, 0).x} y={outTop} width={H.heads * HEAD_W} height={BAR_H} rx={4} fill={ds("purple", 500)} />
          ) : (
            Array.from({ length: H.heads }, (_, i) => {
              const p = ease(frame, concatAt + i, 10);
              if (p <= 0) return null;
              const s = seg(i, lerp(26, 0, join));
              return <rect key={i} x={s.x} y={outTop} width={s.w + (join > 0.9 ? 1 : 0)} height={BAR_H} rx={4} fill={ds("purple", 500)} opacity={p} />;
            })
          )}
        </Svg>
        <Svg>
          <rect x={headX(0)} y={outTop + BAR_H + 10} width={H.heads * HEAD_W * ease(frame, wholeAt, 24)} height={5} rx={2.5} fill={GOLD} />
        </Svg>
        <Line at={concatAt + 20} x={X0} y={outTop - 2} size={22} color={INK_SOFT}>
          joined
        </Line>

        {/* The cost: the same multiply-adds per pair as one head of 512. */}
        <Line at={eightAt} x={X0} y={y(800)} size={30}>
          <span style={{ ...label(30, OK_INK), fontWeight: 600 }}>
            <Mark at={fiveAt + 4} color={MARK_OK}>
              <MathRun>
                {H.heads} × {H.headWidth} = {H.pairMacsMulti}
              </MathRun>
            </Mark>
          </span>
          <span style={{ opacity: ease(frame, sameAt, 10) }}> multiply-adds per pair, as for one head of </span>
          <span style={{ opacity: ease(frame, fiveAt, 10) }}>
            <Num>{H.pairMacsOne}</Num>
          </span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
