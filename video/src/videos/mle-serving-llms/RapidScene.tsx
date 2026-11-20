import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Box, CACHE, DATA, Drift, Flow, Headline, Kicker, Line, Mark, OK_INK, Svg, TokenRow, X0 } from "./parts";

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

// ── 4. Streaming: the reader starts on the first token ──
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
 * The quick round: the page's other levers worth naming, a line each, with a
 * small figure for each beside the list.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, frame };

  const from = n.beat("rapid-in").from;
  const fourAt = n.word("rapid-in", "Four more levers");
  const lineAt = n.word("rapid-in", "one line each");
  const end = n.beat("r-stream").to;

  const items: RapidItem[] = [
    { n: 1, label: "Prefix caching", beat: "r-prefix", body: <Prefix c={c} /> },
    { n: 2, label: "Routing", beat: "r-route", body: <Route c={c} /> },
    { n: 3, label: "Distillation", beat: "r-distill", body: <Distill c={c} /> },
    { n: 4, label: "Streaming", beat: "r-stream", body: <Stream c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-32} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={fourAt - 6}>Other levers worth naming</Kicker>
        <Headline lead="Four more levers," turn="one line each" at={fourAt - 4} turnAt={lineAt - 2} size={60} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={fourAt + 6} end={end + 20} />
      </Drift>
    </AbsoluteFill>
  );
};
