import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RATE, type RateCell } from "./data";
import { Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, Svg, VRule, X0 } from "./parts";

/** The timeline: seconds 0 to 70, with the minute boundary at 60. */
const AX = { x0: 440, k: 11, y: 420 };
const CELL = 26;
const CELL_GAP = 4;
const MINUTE_X = AX.x0 + 60 * AX.k;
const A_X = MINUTE_X - 12 - 10 * (CELL + CELL_GAP);
const B_X = MINUTE_X + 14;
const NOTE_X = 1450;
const ROWS = [520, 606, 692, 778];
const GAUGE_X = 720;

/** One request's cell: green if it passed, red if refused. */
const Cells: React.FC<{ cells: readonly RateCell[]; top: number; at: number; bAt: number; out?: number }> = ({ cells, top, at, bAt, out }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  return (
    <>
      {cells.map((c, i) => {
        const p = ease(frame, i < 10 ? at + i * 2 : bAt + (i - 10) * 2, 6);
        if (p <= 0) return null;
        const x = i < 10 ? A_X + i * (CELL + CELL_GAP) : B_X + (i - 10) * (CELL + CELL_GAP);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top,
              width: CELL,
              height: CELL,
              borderRadius: 5,
              background: c.ok ? OK : ACCENT,
              opacity: p * (1 - o),
              transform: `scale(${0.6 + 0.4 * p})`,
            }}
          />
        );
      })}
    </>
  );
};

/** A bucket's level, as a small upright gauge: `level` of `max`. */
const Gauge: React.FC<{ x: number; top: number; level: number; max: number; color: string; opacity: number }> = ({ x, top, level, max, color, opacity }) => {
  const H = 56;
  const fill = (Math.max(0, Math.min(max, level)) / max) * (H - 4);
  return (
    <div style={{ position: "absolute", left: x, top, width: 34, height: H, boxSizing: "border-box", border: `2px solid ${INK_SOFT}`, borderTop: "none", borderRadius: "0 0 7px 7px", opacity }}>
      <div style={{ position: "absolute", left: 2, right: 2, bottom: 2, height: fill, background: color, borderRadius: "0 0 4px 4px" }} />
    </div>
  );
};

/**
 * Question 9: one client's twenty requests (ten at 59 s, ten at 61 s) against
 * a limit of ten a minute, under the four algorithms, a row each: every
 * request a cell, green if it passed. Then the follow-up: four servers each
 * with its own bucket pass all forty of a burst; one shared bucket, ten.
 */
export const RateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Question nine");
  const textAt = n.word("q9", "How does rate limiting work");
  const capsAt = n.word("q9", "caps a client's requests per window");
  const protectAt = n.word("q9", "to protect the system");
  const limitAt = n.word("q9", "ten new links a minute");
  const fiftyNineAt = n.word("q9", "ten at fifty-nine seconds");
  const sixtyOneAt = n.word("q9", "then ten at sixty-one");
  const fixedAt = n.word("q9-fixed", "A fixed-window counter");
  const resetsAt = n.word("q9-fixed", "resets on the minute");
  const twentyAt = n.word("q9-fixed", "all twenty get through");
  const twiceAt = n.word("q9-fixed", "twice the limit");
  const cheapAt = n.word("q9-fixed", "one cheap counter");
  const slidingAt = n.word("q9-sliding", "A sliding-window counter");
  const weighsAt = n.word("q9-sliding", "weighs in the minute before");
  const refusesAt = n.word("q9-sliding", "refuses the second ten");
  const estimateAt = n.word("q9-sliding", "it's an estimate");
  const tokenAt = n.word("q9-token", "A token bucket holds ten tokens");
  const refillAt = n.word("q9-token", "refills one every six seconds");
  const spendAt = n.word("q9-token", "Each request spends one");
  const burstAt = n.word("q9-token", "burst ten at once");
  const emptyAt = n.word("q9-token", "an empty bucket answers");
  const tooManyAt = n.word("q9-token", "too many requests");
  const firstAt = n.word("q9-token", "the first burst empties it");
  const secondAt = n.word("q9-token", "the second is refused");
  const leakyAt = n.word("q9-leaky", "A leaky bucket queues requests");
  const constantAt = n.word("q9-leaky", "at a constant rate");
  const smoothAt = n.word("q9-leaky", "a smooth stream");
  const waitsAt = n.word("q9-leaky", "a burst waits its turn");
  const followAt = n.word("q9-shared", "The follow-up is where the count lives");
  const fourAt = n.word("q9-shared", "With four app servers");
  const ownAt = n.word("q9-shared", "each keeping its own bucket");
  const handsAt = n.word("q9-shared", "round-robin hands one client four buckets");
  const fourTimesAt = n.word("q9-shared", "four times the limit");
  const shareAt = n.word("q9-shared", "The count belongs in a store they all share");
  const end = n.beat("q9-shared").to;

  const ax = (t: number) => AX.x0 + t * AX.k;
  const axY = y(AX.y);
  const rowY = (i: number) => y(ROWS[i]);
  const rowsOut = followAt - 2;

  // The token bucket's level: full, ten spent at 59 s, a third back by 61 s.
  const tokenLevel = 10 - 10 * ease(frame, spendAt + 2, 24) + (1 / 3) * ease(frame, firstAt + 8, 10);
  // The leaky bucket's queue: ten in at 59 s, one out by 61 s, one more in.
  const leakyLevel = 10 * ease(frame, leakyAt + 8, 20) - ease(frame, constantAt, 8) + ease(frame, constantAt + 14, 8);
  const drip = (frame - constantAt) / 24;

  // ── The follow-up: forty over four servers. ──
  const own = ease(frame, ownAt, 14);
  const shared = ease(frame, shareAt, 14);
  const srvX = (i: number) => X0 + i * 190;
  const shX = (i: number) => 1010 + i * 196;
  const sharedBox = { x: 1180, w: 420, top: y(612), h: 62 };

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={capsAt} level={-35} />
      <Sfx name="el-sprinkle" at={fiftyNineAt} level={-32} />
      <Sfx name="el-sprinkle" at={sixtyOneAt} level={-32} />
      <Sfx name="el-sprinkle" at={fixedAt + 4} level={-32} />
      <Sfx name="el-tap" at={twiceAt} level={-30} />
      <Sfx name="el-sprinkle" at={slidingAt + 4} level={-32} />
      <Sfx name="el-tap" at={refusesAt} level={-30} />
      <Sfx name="el-sprinkle" at={spendAt} level={-32} />
      <Sfx name="el-tap" at={tooManyAt} level={-30} />
      <Sfx name="el-sprinkle" at={leakyAt + 4} level={-32} />
      <Sfx name="el-sprinkle" at={handsAt} level={-32} />
      <Sfx name="el-tap" at={fourTimesAt} level={-30} />
      <Sfx name="el-sprinkle" at={shareAt + 6} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          How does rate limiting work?
        </QuestionCard>
        <MiniMap at={qAt} stage={8} lit="limit" grow={{ limit: capsAt }} />
        <Line at={capsAt} x={X0} y={y(250)} size={22} color={INK_SOFT} out={rowsOut}>
          caps a client&apos;s requests per window
          <span style={{ opacity: ease(frame, protectAt, 10) }}>, to protect the system and keep it fair</span>
        </Line>

        {/* ── The trace: ten at 59 s, ten at 61 s, against ten a minute. ── */}
        <Line at={limitAt} x={X0} y={axY - h(64)} size={22} weight={700} out={rowsOut}>
          <Mark at={limitAt + 2}>limit: 10 a minute</Mark>
        </Line>
        <Svg opacity={ease(frame, limitAt, 12) * (1 - ease(frame, rowsOut, 10))}>
          <line x1={ax(0)} x2={ax(70)} y1={axY} y2={axY} stroke={INK} strokeWidth={1.6} />
          {[0, 20, 40, 60].map((t) => (
            <g key={t}>
              <line x1={ax(t)} x2={ax(t)} y1={axY} y2={axY + 7} stroke={INK} strokeWidth={1.2} />
              <text x={ax(t)} y={axY + 30} textAnchor="middle" style={svgText({ ...note(20, t === 60 ? INK : INK_SOFT), fontWeight: t === 60 ? 700 : 500 })}>
                {t} s
              </text>
            </g>
          ))}
          {/* The minute boundary, down through the rows. */}
          <line x1={MINUTE_X} x2={MINUTE_X} y1={axY - 120} y2={axY + 6} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="6 6" />
          <line x1={MINUTE_X} x2={MINUTE_X} y1={axY + 46} y2={axY + 46 + (rowY(3) + 4 - axY) * ease(frame, fixedAt, 20)} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="6 6" />
          {/* Two stacks of ten requests. */}
          {Array.from({ length: 20 }, (_, i) => {
            const at = i < 10 ? fiftyNineAt + i * 1.5 : sixtyOneAt + (i - 10) * 1.5;
            const p = ease(frame, at, 6);
            const t = RATE.trace[i];
            return <rect key={i} x={ax(t) - 7 + (t < 60 ? -3 : 3)} y={axY - 12 - (i % 10) * 10} width={14} height={7} rx={1.5} fill={BAR} opacity={p} />;
          })}
        </Svg>
        <Ink at={fiftyNineAt + 4} dur={12} out={rowsOut} style={{ left: ax(59) - 200, top: axY - 64, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700 }}>10 at 59 s</span>
        </Ink>
        <Ink at={sixtyOneAt + 4} dur={12} out={rowsOut} style={{ left: ax(61) + 34, top: axY - 64, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700 }}>10 at 61 s</span>
        </Ink>

        {/* ── Four limiters, a row each. ── */}
        {[
          ["Fixed-window counter", "resets on the minute", fixedAt, resetsAt],
          ["Sliding-window counter", "weighs in the minute before", slidingAt, weighsAt],
          ["Token bucket", "10 tokens, one back every 6 s", tokenAt, refillAt],
          ["Leaky bucket", "a queue of 10, one out every 6 s", leakyAt, constantAt],
        ].map(([name, sub, at, subAt], i) => (
          <React.Fragment key={i}>
            <Ink at={(at as number) - 2} dur={12} out={rowsOut} style={{ left: X0, top: rowY(i) - 4, whiteSpace: "nowrap" }}>
              <span style={{ ...label(22, INK), fontWeight: 700 }}>{name as string}</span>
            </Ink>
            <Ink at={subAt as number} dur={12} out={rowsOut} style={{ left: X0, top: rowY(i) + 28, whiteSpace: "nowrap" }}>
              <span style={note(20, INK_SOFT)}>{sub as string}</span>
            </Ink>
          </React.Fragment>
        ))}
        <Cells cells={RATE.fixed.cells} top={rowY(0)} at={fixedAt + 4} bAt={twentyAt} out={rowsOut} />
        <Cells cells={RATE.sliding.cells} top={rowY(1)} at={slidingAt + 4} bAt={refusesAt} out={rowsOut} />
        <Cells cells={RATE.token.cells} top={rowY(2)} at={spendAt} bAt={secondAt} out={rowsOut} />
        <Cells cells={RATE.leaky.cells} top={rowY(3)} at={leakyAt + 4} bAt={waitsAt} out={rowsOut} />
        <Gauge x={GAUGE_X} top={rowY(2) - 14} level={tokenLevel} max={10} color={BAR} opacity={ease(frame, tokenAt, 10) * (1 - ease(frame, rowsOut, 10))} />
        <Gauge x={GAUGE_X} top={rowY(3) - 14} level={leakyLevel} max={10} color={BAR} opacity={ease(frame, leakyAt, 10) * (1 - ease(frame, rowsOut, 10))} />
        {/* The leak: one drop every six seconds, at the video's pace. */}
        {drip > 0 && frame < rowsOut ? (
          <div
            style={{
              position: "absolute",
              left: GAUGE_X + 12,
              top: rowY(3) + 44 + (drip % 1) * 34,
              width: 10,
              height: 10,
              borderRadius: 5,
              background: BAR,
              opacity: Math.sin((drip % 1) * Math.PI) * (1 - ease(frame, rowsOut, 10)),
            }}
          />
        ) : null}

        {/* Each row's verdict. */}
        <Line at={twentyAt} x={NOTE_X} y={rowY(0) - 4} size={21} weight={700} color={ACCENT_INK} out={rowsOut}>
          <Num>{RATE.fixed.accepted}</Num> of <Num>20</Num> pass
          <span style={{ opacity: ease(frame, twiceAt, 10) }}>: 2× the limit</span>
        </Line>
        <Line at={cheapAt} x={NOTE_X} y={rowY(0) + 28} size={20} color={INK_SOFT} out={rowsOut}>
          for one cheap counter
        </Line>
        <Line at={refusesAt} x={NOTE_X} y={rowY(1) - 4} size={21} weight={700} color={OK_INK} out={rowsOut}>
          the second ten refused
        </Line>
        <Line at={estimateAt} x={NOTE_X} y={rowY(1) + 28} size={20} color={INK_SOFT} out={rowsOut}>
          an estimate: assumes an even spread
        </Line>
        <Line at={burstAt} x={NOTE_X} y={rowY(2) - 4} size={21} weight={700} color={OK_INK} out={rowsOut}>
          a burst of <Num>10</Num>
          <span style={{ opacity: ease(frame, secondAt, 10) }}>, then refused</span>
        </Line>
        <Line at={emptyAt} x={NOTE_X} y={rowY(2) + 28} size={20} color={ACCENT_INK} out={rowsOut}>
          empty: HTTP 429
          <span style={{ opacity: ease(frame, tooManyAt, 10) }}>, too many requests</span>
        </Line>
        <Line at={smoothAt} x={NOTE_X} y={rowY(3) - 4} size={21} weight={700} color={OK_INK} out={rowsOut}>
          a smooth stream out
        </Line>
        <Line at={waitsAt} x={NOTE_X} y={rowY(3) + 28} size={20} color={INK_SOFT} out={rowsOut}>
          <Num>{RATE.leaky.accepted}</Num> queued: one had drained by 61 s
        </Line>

        {/* ── The follow-up: each server its own bucket, or one shared. ── */}
        <Line at={fourAt} x={X0} y={y(330)} size={23} weight={700}>
          Four app servers, each with its own bucket
        </Line>
        {[0, 1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <Node x={srvX(i)} y={y(390)} w={160} h={58} at={fourAt + 4 + i * 3} tone="plain" title={`server ${i + 1}`} size={21} />
            <div style={{ position: "absolute", left: srvX(i), top: y(390) + 76, display: "grid", gridTemplateColumns: `repeat(5, ${CELL}px)`, gap: CELL_GAP, opacity: own }}>
              {Array.from({ length: 10 }, (_, k) => {
                const p = ease(frame, handsAt + (k * 4 + i) * 1.2, 6);
                return <div key={k} style={{ width: CELL, height: CELL, borderRadius: 5, background: OK, opacity: p }} />;
              })}
            </div>
          </React.Fragment>
        ))}
        <Line at={handsAt} x={X0} y={y(390) + 160} size={21} color={INK_SOFT}>
          a burst of <Num>{RATE.burst}</Num>, dealt round-robin: ten to each
        </Line>
        <Line at={fourTimesAt} x={X0} y={y(390) + 196} size={23} weight={700} color={ACCENT_INK}>
          all <Num>{RATE.localOk}</Num> pass: 4× the limit
        </Line>
        <VRule x={930} top={y(330)} bottom={sharedBox.top + sharedBox.h + 30 + 2 * (CELL + CELL_GAP) + 50} at={shareAt} />
        <Line at={shareAt} x={1010} y={y(330)} size={23} weight={700} color={OK_INK}>
          The count in a store they all share
        </Line>
        {[0, 1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <Node x={shX(i)} y={y(390)} w={160} h={58} at={shareAt + 2 + i * 2} tone="plain" title={`server ${i + 1}`} size={21} />
            <Flow points={[[shX(i) + 80, y(390) + 64], [shX(i) + 80, y(390) + 84], [sharedBox.x + sharedBox.w / 2 + (i - 1.5) * 60, y(390) + 84], [sharedBox.x + sharedBox.w / 2 + (i - 1.5) * 60, sharedBox.top - 8]]} at={shareAt + 8 + i * 2} color={OK} width={2} head={11} />
          </React.Fragment>
        ))}
        <Node x={sharedBox.x} y={sharedBox.top} w={sharedBox.w} h={sharedBox.h} at={shareAt + 10} tone="ok" title="one shared bucket" size={22} />
        <div style={{ position: "absolute", left: 1010, top: sharedBox.top + sharedBox.h + 30, display: "grid", gridTemplateColumns: `repeat(20, ${CELL}px)`, gap: CELL_GAP, opacity: shared }}>
          {Array.from({ length: RATE.burst }, (_, k) => {
            const p = ease(frame, shareAt + 18 + k * 0.8, 6);
            return <div key={k} style={{ width: CELL, height: CELL, borderRadius: 5, background: k < RATE.sharedOk ? OK : ACCENT, opacity: p }} />;
          })}
        </div>
        <Line at={shareAt + 30} x={1010} y={sharedBox.top + sharedBox.h + 30 + 2 * (CELL + CELL_GAP) + 22} size={23} weight={700} color={OK_INK}>
          <Num>{RATE.sharedOk}</Num> pass
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
