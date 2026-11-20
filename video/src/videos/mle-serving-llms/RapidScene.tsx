import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Num } from "../../editorial/ui";
import { BLUE_INK, Box, Bracket, CACHE, DATA, Drift, Flow, Headline, IDLE, IDLE_INK, Kicker, Line, Mark, OK_INK, Svg, TokenRow, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 330;
const ROW = 60;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; frame: number };

// ── 1. Prefix caching: the shared prompt's cache once, each prefill after it ──
const Prefix: React.FC<{ c: Ctx }> = ({ c }) => {
  const sharedAt = c.w("r-prefix", "compute a shared system prompt's cache once");
  const afterAt = c.w("r-prefix", "covers only what comes after it");
  const sx = R_X;
  const sw = 420;
  const top = c.y(400);
  const rowsY = [c.y(500), c.y(560), c.y(620)];
  const own = [260, 420, 180];
  return (
    <>
      <Line at={sharedAt - 4} x={sx} y={top - c.h(46)} size={24} color={INK}>
        Shared system prompt: cached once
      </Line>
      <Svg>
        <rect x={sx} y={top} width={sw * ease(c.frame, sharedAt, 16)} height={c.h(34)} rx={5} fill={CACHE} />
        {rowsY.map((ry, i) => (
          <g key={i}>
            <rect x={sx} y={ry} width={sw} height={c.h(30)} rx={5} fill="none" stroke={CACHE} strokeWidth={2} strokeDasharray="7 5" opacity={ease(c.frame, sharedAt + 14 + i * 4, 10)} />
            <rect x={sx + sw + 6} y={ry} width={own[i] * ease(c.frame, afterAt + i * 5, 14)} height={c.h(30)} rx={5} fill={DATA} />
          </g>
        ))}
      </Svg>
      <Line at={sharedAt + 14} x={sx + 14} y={rowsY[0] + 2} size={21} color={INK_SOFT}>
        reused
      </Line>
      <Line at={afterAt} x={sx} y={rowsY[2] + c.h(58)} size={24} color={INK}>
        Each request&apos;s prefill: <Mark at={afterAt + 6}>only what comes after</Mark>
      </Line>
    </>
  );
};

// ── 2. Routing: easy requests to a smaller model ──
const Route: React.FC<{ c: Ctx }> = ({ c }) => {
  const easyAt = c.w("r-route", "send the easy requests");
  const smallAt = c.w("r-route", "to a smaller model");
  const mid = c.y(540);
  const up = c.y(430);
  const low = c.y(650);
  const split = R_X + 230;
  const boxX = R_X + 420;
  return (
    <>
      <Line at={easyAt - 8} x={R_X} y={mid - 16} size={26} color={INK}>
        Requests
      </Line>
      <Flow points={[[R_X + 130, mid], [split, mid], [split, up], [boxX - 6, up]]} at={easyAt} color={INK} />
      <Flow points={[[split, mid], [split, low], [boxX - 6, low]]} at={easyAt + 6} color={INK} />
      <Box x={boxX} y={up - 34} w={220} h={68} at={smallAt} title="Small model" />
      <Box x={boxX} y={low - 40} w={300} h={80} at={easyAt + 10} title="Large model" />
      <Line at={easyAt + 4} x={split + 20} y={up - 44} size={22} color={INK}>
        easy
      </Line>
      <Line at={easyAt + 10} x={split + 20} y={low - 44} size={22} color={INK_SOFT}>
        hard
      </Line>
    </>
  );
};

// ── 3. Distillation: a small model trained to imitate the large one ──
const Distill: React.FC<{ c: Ctx }> = ({ c }) => {
  const trainAt = c.w("r-distill", "train a small model");
  const imitateAt = c.w("r-distill", "to imitate the large one");
  const narrowAt = c.w("r-distill", "on a narrow task");
  const mid = c.y(520);
  const smallX = R_X;
  const largeX = R_X + 560;
  return (
    <>
      <Box x={smallX} y={mid - 34} w={220} h={68} at={trainAt} title="Small model" />
      <Box x={largeX} y={mid - 50} w={320} h={100} at={trainAt + 4} title="Large model" />
      <Flow points={[[smallX + 226, mid], [largeX - 6, mid]]} at={imitateAt} />
      <Line at={imitateAt + 6} x={smallX + 226 + (largeX - smallX - 232) / 2} width={300} align="center" y={mid - 48} size={24} color={INK}>
        imitates
      </Line>
      <Line at={narrowAt} x={smallX} y={mid + c.h(80)} size={26} color={INK}>
        On a <Mark at={narrowAt + 4}>narrow task</Mark>
      </Line>
    </>
  );
};

// ── 4. The reasoning budget: thinking tokens are decode steps before the first visible word ──
const THINK = 8;
const SHOWN = 3;
const Reason: React.FC<{ c: Ctx }> = ({ c }) => {
  const budgetAt = c.w("r-reason", "Reasoning budget");
  const decodeAt = c.w("r-reason", "thinking tokens are decode steps");
  const waitsAt = c.w("r-reason", "the user waits through");
  const firstAt = c.w("r-reason", "before the first visible word");
  const spendAt = c.w("r-reason", "spend them only on requests that need them");
  const top = c.y(450);
  const bh = c.h(64);
  const pre = { x: R_X, w: 120 };
  const step = 40;
  const sx = (i: number) => pre.x + pre.w + 18 + i * step;
  const thinkEnd = sx(THINK) - 8;
  return (
    <>
      <Line at={budgetAt} x={R_X} y={top - c.h(84)} size={24} color={INK}>
        One request, as question <Num>1</Num> drew it
      </Line>
      <Svg>
        <rect x={pre.x} y={top} width={pre.w} height={bh} rx={8} fill="none" stroke={INK} strokeWidth={2} opacity={ease(c.frame, budgetAt + 4, 10)} />
        {Array.from({ length: THINK + SHOWN }, (_, i) => {
          const visible = i >= THINK;
          const p = ease(c.frame, (visible ? firstAt : decodeAt) + (visible ? i - THINK : i) * 3, 8);
          if (p <= 0) return null;
          return (
            <g key={i} opacity={p}>
              <rect x={sx(i)} y={top} width={step - 10} height={bh} rx={5} fill="none" stroke={INK} strokeWidth={2} />
              <rect x={sx(i) + 5} y={top + 8} width={step - 20} height={c.h(16)} rx={3} fill={visible ? DATA : IDLE} />
            </g>
          );
        })}
      </Svg>
      <Line at={budgetAt + 6} x={pre.x + pre.w / 2} width={pre.w} align="center" y={top + bh / 2 - 15} size={21} color={INK}>
        Prefill
      </Line>
      <Line at={decodeAt + 6} x={sx(0)} y={top + bh + c.h(14)} size={22} color={IDLE_INK}>
        decode steps of thinking, billed like any output
      </Line>
      <Line at={firstAt + 6} x={sx(THINK)} y={top - c.h(36)} size={22} color={BLUE_INK}>
        first visible word
      </Line>
      <Bracket x1={pre.x} x2={thinkEnd} y={top + bh + c.h(62)} at={waitsAt} />
      <Line at={waitsAt + 6} x={pre.x} y={top + bh + c.h(76)} size={24} color={INK}>
        <Mark at={waitsAt + 10}>The wait</Mark> before the first visible word
      </Line>
      <Line at={spendAt} x={R_X} y={top + bh + c.h(150)} size={26} color={OK_INK}>
        Spend them only where a request needs them
      </Line>
    </>
  );
};

// ── 5. Streaming: the reader starts on the first token ──
const WORDS = ["The", "reader", "starts", "while", "the", "rest", "is", "still", "being", "written"];
const Stream: React.FC<{ c: Ctx }> = ({ c }) => {
  const startAt = c.w("r-stream", "And streaming");
  const feelAt = c.w("r-stream", "cuts the wait you feel");
  const workAt = c.w("r-stream", "rather than the work");
  const readerAt = c.w("r-stream", "the reader starts");
  return (
    <>
      <TokenRow x={R_X} y={c.y(430)} size={26} gap={8} tokens={WORDS.map((w, k) => ({ text: w, at: startAt + 8 + k * 9 }))} />
      <Line at={feelAt} x={R_X} y={c.y(530)} size={26} color={INK}>
        Cuts the <Mark at={feelAt + 4}>wait you feel</Mark>
      </Line>
      <Line at={workAt} x={R_X} y={c.y(580)} size={26} color={INK_SOFT}>
        not the work
      </Line>
      <Line at={readerAt} x={R_X} y={c.y(660)} size={28} color={OK_INK}>
        Same work, earlier start
      </Line>
    </>
  );
};

/**
 * The quick round: the page's other levers worth naming and its reasoning
 * budget, a line each, with a small figure for each beside the list.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, frame };

  const from = n.beat("rapid-in").from;
  const fiveAt = n.word("rapid-in", "Five more levers");
  const lineAt = n.word("rapid-in", "one line each");
  const end = n.beat("r-stream").to;
  /** The last lever stays current until the cut, so the page never empties. */
  const cutAt = n.beat("close").from;

  const items: RapidItem[] = [
    { n: 1, label: "Prefix caching", beat: "r-prefix", body: <Prefix c={c} /> },
    { n: 2, label: "Routing", beat: "r-route", body: <Route c={c} /> },
    { n: 3, label: "Distillation", beat: "r-distill", body: <Distill c={c} /> },
    { n: 4, label: "Reasoning budget", beat: "r-reason", body: <Reason c={c} /> },
    { n: 5, label: "Streaming", beat: "r-stream", body: <Stream c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-32} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={fiveAt - 6}>Other levers worth naming</Kicker>
        <Headline lead="Five more levers," turn="one line each" at={fiveAt - 4} turnAt={lineAt - 2} size={60} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={fiveAt + 6} end={cutAt} />
      </Drift>
    </AbsoluteFill>
  );
};
