import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { num, PAIR, pct, SIZE } from "./data";
import { at, BAD, DATA, Drift, madeUp, Mark, MARK_BAD, MARK_OK, OK_INK, type Scale, Strike, X0 } from "./parts";

const CHART = { x0: X0 + 70, x1: 840, top: 430, bottom: 740 };
/** The narration's pointer, for the two cells it points at. */
const POINT = ds("yellow", 600);
const TABLE = { x: 1010, top: 420, cw: 190, rh: 76, head: 150 };

/**
 * Question 3. Left: the page's own block drawn, the 95% interval around an
 * 80% pass rate at six eval-set sizes, with the 100-item one marked (72% to
 * 88%) and a three-point change set against it. Right: the video's own 500
 * paired items as a two-by-two table; read as two samples the gap is p 0.23,
 * paired only the 35 that disagree count, and McNemar gives 0.017. Then the
 * second habit, stratifying, as a small slice that a total would hide.
 */
export const SizeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("size").from;
  const qAt = n.word("size", "Question");
  const textAt = n.word("size", "How large does an eval set");
  const beatsAt = n.word("size", "beats the sampling error");
  const hundredAt = n.word("size", "With a hundred items");
  const rangeAt = n.word("size", "seventy-two to eighty-eight");
  const threeAt = n.word("size", "A prompt change worth three points");
  const habitsAt = n.word("size-pair", "Two habits help more");
  const pairAt = n.word("size-pair", "pair the comparison");
  const itemsAt = n.word("size-pair", "On five hundred items of our own");
  const bAt = n.word("size-pair", "version B passes");
  const aAt = n.word("size-pair", "A seventy-nine");
  const separateAt = n.word("size-pair", "Read as two separate samples");
  const p23At = n.word("size-pair", "point two three");
  const sameAt = n.word("size-pair", "both ran on the same items");
  const disagreeAt = n.word("size-pair", "the thirty-five where they disagree");
  const toBAt = n.word("size-pair", "twenty-five go to B");
  const toAAt = n.word("size-pair", "ten to A");
  const mcAt = n.word("size-pair", "McNemar's test");
  const p02At = n.word("size-pair", "point oh two");
  const stratAt = n.word("size-strat", "stratify");
  const sliceAt = n.word("size-strat", "a regression on a small slice");
  const awayAt = n.word("size-strat", "averaged away");
  const end = n.beat("size-strat").to;

  const xs: Scale = { lo: -0.5, hi: SIZE.n.length - 0.5, a: CHART.x0, b: CHART.x1 };
  const ys: Scale = { lo: 0.65, hi: 0.95, a: y(CHART.bottom), b: y(CHART.top) };
  const hundred = SIZE.n.indexOf(100);
  const three = ease(frame, threeAt + 2, 12);

  const cell = (r: number, c: number, value: number, lit: number | undefined, color?: string) => {
    const p = ease(frame, itemsAt + 6 + (r * 2 + c) * 3, 10);
    const l = lit === undefined ? 0 : ease(frame, lit, 12);
    return (
      <div
        style={{
          position: "absolute",
          left: TABLE.x + TABLE.head + c * TABLE.cw,
          top: y(TABLE.top) + h(TABLE.rh) * (r + 1),
          width: TABLE.cw - 10,
          height: h(TABLE.rh) - 10,
          borderRadius: 8,
          background: `color-mix(in srgb, ${color ?? INK_SOFT} ${(color ? 22 : 6) * l + 6}%, ${PAPER})`,
          border: `2px solid ${l > 0.5 && color ? color : "transparent"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...note(34, INK),
          fontWeight: 650,
          ...TABULAR,
          opacity: p,
        }}
      >
        {num(value)}
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={beatsAt} level={-36} />
      <Sfx name="el-pop" at={rangeAt} level={-32} />
      <Sfx name="el-scratch" at={threeAt + 4} level={-34} />
      <Sfx name="el-pencil" at={itemsAt + 4} level={-36} />
      <Sfx name="el-tap" at={disagreeAt + 2} level={-34} />
      <Sfx name="el-pop" at={p02At} level={-32} />
      <Sfx name="el-tap" at={stratAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          How large does an eval set need to be?
        </QuestionCard>

        {/* The page's block: the 95% interval on an 80% pass rate. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, beatsAt - 6, 14)}>
            {[0.7, 0.8, 0.9].map((v) => (
              <g key={v}>
                <line x1={CHART.x0 - 40} x2={CHART.x1} y1={at(ys, v)} y2={at(ys, v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
                <text x={CHART.x0 - 52} y={at(ys, v) + 7} textAnchor="end" style={{ ...label(20, INK_SOFT), ...TABULAR }}>
                  {pct(v)}
                </text>
              </g>
            ))}
            <line x1={CHART.x0 - 40} x2={CHART.x1} y1={y(CHART.bottom) + 30} y2={y(CHART.bottom) + 30} stroke={INK} strokeWidth={1.6} />
          </g>
          {SIZE.n.map((nn, i) => {
            const p = ease(frame, beatsAt + i * 4, 12);
            if (p <= 0) return null;
            const half = SIZE.half[i] * p;
            const x = at(xs, i);
            const lit = i === hundred ? ease(frame, hundredAt, 12) : 0;
            const color = lit > 0.5 ? BLUE_INK : DATA;
            return (
              <g key={nn}>
                <line x1={x} x2={x} y1={at(ys, SIZE.p - half)} y2={at(ys, SIZE.p + half)} stroke={color} strokeWidth={4 + 3 * lit} strokeLinecap="round" />
                {[-1, 1].map((s) => (
                  <line key={s} x1={x - 12} x2={x + 12} y1={at(ys, SIZE.p + s * half)} y2={at(ys, SIZE.p + s * half)} stroke={color} strokeWidth={3} />
                ))}
                <circle cx={x} cy={at(ys, SIZE.p)} r={7} fill={INK} />
                <text x={x} y={y(CHART.bottom) + 62} textAnchor="middle" style={{ ...label(20, i === hundred ? BLUE_INK : INK_SOFT), ...TABULAR, fontWeight: i === hundred ? 700 : 500 }}>
                  {num(nn)}
                </text>
              </g>
            );
          })}
          {/* A three-point change, beside the 100-item interval. */}
          {three > 0 ? (
            <g opacity={three}>
              <rect
                x={at(xs, hundred) + 30}
                y={at(ys, SIZE.p + 0.03)}
                width={22}
                height={at(ys, SIZE.p) - at(ys, SIZE.p + 0.03)}
                fill={BAD}
                opacity={0.85}
              />
            </g>
          ) : null}
        </svg>
        <Note at={beatsAt + 2} x={CHART.x0 - 40} y={y(CHART.bottom) + h(84)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>items in the eval set · 95% interval around an 80% pass rate</span>
        </Note>
        <Note at={rangeAt - 2} x={CHART.x0 - 40} y={y(CHART.top) - h(110)}>
          <span style={{ ...note(28, BLUE_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            at 100 items:{" "}
            <Mark at={rangeAt + 6} out={habitsAt}>
              {pct(SIZE.at100.lo)} to {pct(SIZE.at100.hi)}
            </Mark>
          </span>
        </Note>
        <Note at={threeAt + 6} x={CHART.x0 - 40} y={y(CHART.top) - h(66)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 14, height: 22, background: BAD, verticalAlign: "-3px", marginRight: 10 }} />a 3-point change can&apos;t show
          </span>
        </Note>

        {/* The second half: the same 500 items under both versions. */}
        <Note at={pairAt} x={TABLE.x} y={y(TABLE.top - 104)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={pairAt + 6}>1. pair the comparison</Mark>
          </span>
        </Note>
        <Note at={itemsAt} x={TABLE.x} y={y(TABLE.top - 50)}>
          <span style={madeUp()}>
            {num(PAIR.n)} items, made up for this video:{" "}
            <span style={{ opacity: ease(frame, bAt, 10) }}>B {pct(PAIR.bRate)}</span>
            <span style={{ opacity: ease(frame, aAt, 10) }}>, A {pct(PAIR.aRate)}</span>
          </span>
        </Note>
        <Note at={itemsAt + 2} x={TABLE.x + TABLE.head} y={y(TABLE.top) + h(30)}>
          <div style={{ display: "flex" }}>
            {["B passes", "B fails"].map((t) => (
              <span key={t} style={{ width: TABLE.cw - 10, textAlign: "center", ...label(20, INK_SOFT), fontWeight: 700 }}>
                {t}
              </span>
            ))}
          </div>
        </Note>
        {["A passes", "A fails"].map((t, r) => (
          <Note key={t} at={itemsAt + 2} x={TABLE.x} y={y(TABLE.top) + h(TABLE.rh) * (r + 1) + h(22)}>
            <span style={{ ...label(20, INK_SOFT), fontWeight: 700 }}>{t}</span>
          </Note>
        ))}
        {cell(0, 0, PAIR.bothPass, sameAt, undefined)}
        {cell(0, 1, PAIR.aOnly, toAAt, POINT)}
        {cell(1, 0, PAIR.bOnly, toBAt, POINT)}
        {cell(1, 1, PAIR.bothFail, sameAt, undefined)}
        <Note at={disagreeAt + 2} x={TABLE.x + TABLE.head + 2 * TABLE.cw + 4} y={y(TABLE.top) + h(TABLE.rh) + h(40)}>
          <span style={{ ...label(20, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            {PAIR.discordant} disagree:
            <br />
            only these count
          </span>
        </Note>
        <Note at={separateAt} x={TABLE.x} y={y(TABLE.top) + h(3 * TABLE.rh + 20)}>
          <span style={{ ...note(26, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
            as two separate samples:{" "}
            <span style={{ opacity: ease(frame, p23At - 2, 10), color: ACCENT_INK, fontWeight: 700 }}>
              <Strike at={sameAt} color={ACCENT}>
                p = {PAIR.pUnpaired.toFixed(2)}
              </Strike>
            </span>
          </span>
        </Note>
        <Note at={mcAt} x={TABLE.x} y={y(TABLE.top) + h(3 * TABLE.rh + 70)}>
          <span style={{ ...note(28, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            paired, McNemar&apos;s test:{" "}
            <span style={{ opacity: ease(frame, p02At - 2, 10), color: OK_INK, fontWeight: 700 }}>
              <Mark at={p02At + 6} color={MARK_OK}>
                p = {PAIR.pMcNemar.toFixed(3)}
              </Mark>
            </span>
          </span>
        </Note>

        {/* The second habit. */}
        <Note at={stratAt} x={TABLE.x} y={y(TABLE.top) + h(3 * TABLE.rh + 150)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={stratAt + 6}>2. stratify</Mark>
            <span style={{ ...note(24, INK_SOFT), fontWeight: 500, opacity: ease(frame, sliceAt, 10) }}>
              {"  "}a small slice that regresses{" "}
              <Mark at={awayAt} color={MARK_BAD}>
                isn&apos;t averaged away
              </Mark>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
