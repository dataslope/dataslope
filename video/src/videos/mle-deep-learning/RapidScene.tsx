import { Lock, LockOpen } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DOUBLE_SOFTMAX } from "./data";
import { ACCENT, ACCENT_INK, BAR, Box, Drift, Fade, Flow, GREY_FILL, Headline, INK, INK_SOFT, Kicker, Line, Mark, OK_INK, Svg, X0 } from "./parts";

const R_X = 800;
const BLOCK_W = 66;
const BLOCK_GAP = 12;
const NOTE_X = 1250;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** A network drawn as filled blocks, input on the left: grey for frozen
 *  (pretrained, a lock on it), blue for trained here. No outlines. */
const Blocks: React.FC<{ x: number; top: number; height: number; at: number; trained: (i: number) => number; heads: number; headsAt?: number; lock: number; lockSpan: number }> = ({
  x,
  top,
  height,
  at,
  trained,
  heads,
  headsAt,
  lock,
  lockSpan,
}) => {
  const frame = useCurrentFrame();
  const headX = x + 4 * (BLOCK_W + BLOCK_GAP) + 26;
  const headH = heads > 1 ? (height - 2 * 10) / 3 : height;
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => {
        const p = ease(frame, at + i * 3, 10);
        const t = trained(i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + i * (BLOCK_W + BLOCK_GAP),
              top,
              width: BLOCK_W,
              height,
              borderRadius: 5,
              background: t > 0 ? `color-mix(in srgb, ${BAR} ${Math.round(t * 100)}%, ${GREY_FILL})` : GREY_FILL,
              opacity: p,
              transform: `translateY(${(1 - p) * 8}px)`,
            }}
          />
        );
      })}
      {Array.from({ length: heads }, (_, k) => {
        const p = ease(frame, (headsAt ?? at + 14) + k * 5, 10);
        const hy = heads > 1 ? top + k * (headH + 10) : top;
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: headX, top: hy, width: BLOCK_W, height: headH, borderRadius: 5, background: BAR, opacity: p, transform: `translateX(${(1 - p) * 10}px)` }} />
            <Flow points={[[x + 4 * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP + 2, top + height / 2], [headX - 4, hy + headH / 2]]} at={(headsAt ?? at + 14) + k * 5} width={2} head={10} />
          </React.Fragment>
        );
      })}
      {/* The lock over the frozen blocks. */}
      <div
        style={{
          position: "absolute",
          left: x + (lockSpan * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP) / 2 - 16,
          top: top + height / 2 - 16,
          opacity: lock,
        }}
      >
        <Lock size={32} color={INK} strokeWidth={2.2} />
      </div>
    </>
  );
};

// ── 12. Transfer learning ───────────────────────────────────────────────────

const Transfer: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const startAt = c.w("r-transfer", "start from a pretrained network");
  const freezeAt = c.w("r-transfer", "freeze it");
  const headAt = c.w("r-transfer", "train a new head");
  const moreAt = c.w("r-transfer", "with more");
  const fineAt = c.w("r-transfer", "fine-tune some or all layers");
  const cutsAt = c.w("r-transfer", "It cuts data and compute");
  const manyAt = c.w("r-transfer", "one frozen backbone can serve many heads");
  const H = c.h(84);
  const rows = [c.y(350), c.y(510), c.y(670)];
  const unlock = ease(frame, fineAt + 6, 12);
  return (
    <>
      <Line at={startAt} x={R_X} y={rows[0] - c.h(44)} size={22} color={INK_SOFT}>
        Pretrained network, then a new head
      </Line>
      <Blocks x={R_X} top={rows[0]} height={H} at={startAt} trained={() => 0} heads={1} headsAt={headAt} lock={ease(frame, freezeAt, 10)} lockSpan={4} />
      <Line at={freezeAt} x={NOTE_X} y={rows[0] + H / 2 - 16} size={24}>
        Little data: freeze it, train a new head
      </Line>

      <Blocks x={R_X} top={rows[1]} height={H} at={moreAt} trained={(i) => (i >= 2 ? unlock : 0)} heads={1} lock={ease(frame, moreAt + 6, 10)} lockSpan={2} />
      <div style={{ position: "absolute", left: R_X + 3 * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP / 2 - 16, top: rows[1] - c.h(40), opacity: unlock }}>
        <LockOpen size={32} color={INK_SOFT} strokeWidth={2.2} />
      </div>
      <Line at={fineAt} x={NOTE_X} y={rows[1] + H / 2 - 16} size={24}>
        More data: fine-tune some or all layers
      </Line>

      <Blocks x={R_X} top={rows[2]} height={H + c.h(20)} at={manyAt} trained={() => 0} heads={3} headsAt={manyAt + 10} lock={ease(frame, manyAt + 4, 10)} lockSpan={4} />
      <Line at={manyAt + 6} x={NOTE_X} y={rows[2] + H / 2 - 6} size={24}>
        One frozen backbone, many heads
      </Line>
      <Line at={cutsAt} x={R_X} y={c.y(830)} size={24} color={OK_INK}>
        Less data and compute than training from scratch
      </Line>
    </>
  );
};

// ── 13. Softmax with cross-entropy ──────────────────────────────────────────

const Softmax: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const whyAt = c.w("r-softmax", "Why pair softmax");
  const gradAt = c.w("r-softmax", "prediction minus target");
  const wrongAt = c.w("r-softmax", "confidently wrong");
  const fuseAt = c.w("r-softmax", "Libraries fuse them");
  const firstAt = c.w("r-softmax", "don't apply softmax first");
  const twiceAt = c.w("r-softmax", "applied twice over ten classes");
  const topsAt = c.w("r-softmax", "tops out at twenty-three percent");
  const lossAt = c.w("r-softmax", "can't drop below");
  const rowA = c.y(352);
  const rowB = c.y(626);
  const BH = c.h(50);
  const pipe = (top: number, at: number, extra: boolean) => {
    const xs = extra
      ? { logits: R_X, b0: R_X + 112, b1: R_X + 302, out: R_X + 652 }
      : { logits: R_X, b0: R_X + 112, b1: R_X + 402, out: R_X + 652 };
    return (
      <>
        <Line at={at} x={xs.logits} y={top - 16} size={24}>
          logits
        </Line>
        <Flow points={[[xs.logits + 72, top], [xs.b0 - 6, top]]} at={at + 4} width={2.2} head={12} />
        {extra ? (
          <>
            <Box x={xs.b0} y={top - BH / 2} w={150} h={BH} at={at + 6} size={22} hue="red" hueAt={at + 6}>
              softmax
            </Box>
            <Flow points={[[xs.b0 + 152, top], [xs.b1 - 6, top]]} at={at + 10} width={2.2} head={12} />
            <Box x={xs.b1} y={top - BH / 2} w={300} h={BH} at={at + 12} size={22}>
              softmax + cross-entropy
            </Box>
          </>
        ) : (
          <>
            <Box x={xs.b0} y={top - BH / 2} w={150} h={BH} at={at + 6} size={22}>
              softmax
            </Box>
            <Flow points={[[xs.b0 + 152, top], [xs.b0 + 196, top]]} at={at + 10} width={2.2} head={12} />
            <Line at={at + 12} x={xs.b0 + 206} y={top - 18} size={24}>
              <MathRun>
                <I>p</I>
              </MathRun>
            </Line>
            <Flow points={[[xs.b0 + 236, top], [xs.b1 - 6, top]]} at={at + 12} width={2.2} head={12} />
            <Box x={xs.b1} y={top - BH / 2} w={200} h={BH} at={at + 14} size={22}>
              cross-entropy
            </Box>
          </>
        )}
        <Flow points={[[xs.out - 46, top], [xs.out + 4, top]]} at={at + 16} width={2.2} head={12} />
        <Line at={at + 18} x={xs.out + 14} y={top - 16} size={24}>
          loss
        </Line>
      </>
    );
  };
  // Ten classes after a second softmax: the right one capped, the rest level.
  const best = DOUBLE_SOFTMAX.bestP;
  const rest = (1 - best) / (DOUBLE_SOFTMAX.classes - 1);
  const barTop = c.y(712);
  const BAR_MAX = c.h(128);
  const bars = Array.from({ length: DOUBLE_SOFTMAX.classes }, (_, k) => (k === 0 ? best : rest));
  return (
    <>
      {pipe(rowA, whyAt, false)}
      <Line at={gradAt - 4} x={R_X} y={rowA + c.h(50)} size={24}>
        Gradient on the logits:{" "}
        <MathRun>
          <I>p</I> − <I>y</I>
        </MathRun>
        , prediction minus target
      </Line>
      <Line at={wrongAt} x={R_X} y={rowA + c.h(92)} size={22} color={INK_SOFT}>
        Largest when the model is confidently wrong
      </Line>
      <Line at={fuseAt} x={R_X} y={rowA + c.h(136)} size={24} color={OK_INK}>
        <Mark at={fuseAt + 4}>Libraries fuse the two, on raw logits</Mark>
      </Line>

      <Line at={firstAt} x={R_X} y={rowB - c.h(62)} size={22} color={ACCENT_INK}>
        Softmax applied first, so twice
      </Line>
      {pipe(rowB, firstAt + 4, true)}
      <Svg>
        {bars.map((v, k) => {
          const p = ease(frame, twiceAt + k * 1.5, 14);
          const bh = (v / 0.25) * BAR_MAX * p;
          return p > 0 ? <rect key={k} x={R_X + k * 34} y={barTop + BAR_MAX - bh} width={26} height={bh} rx={3} fill={k === 0 ? ACCENT : "var(--ds-gray-300)"} /> : null;
        })}
        <line x1={R_X - 6} x2={R_X + 10 * 34} y1={barTop + BAR_MAX} y2={barTop + BAR_MAX} stroke={INK} strokeWidth={1.4} opacity={ease(frame, twiceAt, 10)} />
      </Svg>
      <Line at={twiceAt + 4} x={R_X} y={barTop + BAR_MAX + c.h(14)} size={22} color={INK_SOFT}>
        <Num>10</Num> classes, the right one first
      </Line>
      <Line at={topsAt} x={R_X + 380} y={barTop + c.h(20)} size={26} color={ACCENT_INK}>
        Right class tops out at <Num>{Math.round(best * 100)}</Num>%
      </Line>
      <Line at={lossAt} x={R_X + 380} y={barTop + c.h(70)} size={26} color={ACCENT_INK}>
        Loss never below <Num>{DOUBLE_SOFTMAX.lossFloor}</Num>
      </Line>
    </>
  );
};

/**
 * The quick round, questions 12 and 13: the numbered list on the left, each
 * answer on the right. Transfer learning as a network of filled blocks, grey
 * and locked where frozen, blue where trained, one backbone with three heads
 * last; then softmax with cross-entropy, the fused pair, and softmax applied
 * twice, which caps the right class at 23% of ten.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const twoAt = n.word("rapid-in", "Two quick ones");
  const softAt = n.beat("r-softmax").from;
  const end = n.beat("rnn-in").from;

  const items: RapidItem[] = [
    { n: 12, label: "Transfer learning", at: n.beat("r-transfer").from, body: <Transfer c={c} /> },
    { n: 13, label: "Softmax with cross-entropy", at: softAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={c.w("r-transfer", "freeze it")} level={-31} />
      <Sfx name="el-pop" at={c.w("r-softmax", "applied twice over ten classes")} level={-34} />
      <Sfx name="el-chime" at={end + 4} level={-33} />

      <Drift from={from} to={n.beat("rnn-in").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 12 and 13</Kicker>
        <Headline lead="Two quick ones" at={twoAt - 4} />
        <RapidFire items={items} x={X0} top={y(340)} rowH={h(56)} width={560} at={twoAt} end={end} />
        <Fade at={softAt - 6}>
          <Softmax c={c} />
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
