import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ds } from "../../theme/brand";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { REUSE } from "./data";
import {
  ACCENT_INK,
  Bracket,
  CACHE,
  Clear,
  commas,
  DATA,
  Drift,
  Line,
  Mark,
  OK_INK,
  Q_SIZE,
  Q_W,
  Spot,
  Strike,
  Svg,
  VRule,
  X0,
} from "./parts";

const PALE = ds("blue", 200);
const COL_B = 780;

/** The timeline's shape at a frame: prefill's width, a decode step's pitch,
 *  and how many steps are drawn. */
type Shape = { p: number; s: number; n: number };

/**
 * Question 1: one request on a timeline, prefill's one wide pass then
 * decode's narrow steps, each step reading all the weights and the cache.
 * Prefill is compute-bound and sets the time to first token; decode is
 * bandwidth-bound and sets the time per output token. Then the count (a
 * weight read used 2,000 times, or once), the levers for a chat product and
 * an offline job (the timeline's prefill widening, its decode lengthening),
 * and the follow-up: slow to start, then quick, is prefill.
 */
export const PrefillScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "Why is LLM inference split");
  const phasesAt = n.word("q1", "two phases");
  const bottleAt = n.word("q1", "different bottlenecks");
  const passAt = n.word("q1-prefill", "one parallel pass");
  const matrixAt = n.word("q1-prefill", "large matrix multiplication");
  const computeAt = n.word("q1-prefill", "compute-bound");
  const ttftAt = n.word("q1-prefill", "time to first token");
  const stepAt = n.word("q1-decode", "one token per step");
  const readsAt = n.word("q1-decode", "reads every weight");
  const contextAt = n.word("q1-decode", "the whole cached context");
  const arithAt = n.word("q1-decode", "a little arithmetic");
  const bandAt = n.word("q1-decode", "bound by memory bandwidth");
  const tpotAt = n.word("q1-decode", "time per output token");
  const countAt = n.word("q1-reuse", "Count it");
  const promptAt = n.word("q1-reuse", "With a two-thousand-token prompt");
  const timesAt = n.word("q1-reuse", "to work two thousand times");
  const decodeStepAt = n.word("q1-reuse", "A decode step for one request");
  const onceAt = n.word("q1-reuse", "uses it once");
  const leversAt = n.word("q1-levers", "So the levers differ");
  const chatAt = n.word("q1-levers", "A chat product");
  const ttft2At = n.word("q1-levers", "TTFT and smooth streaming");
  const offlineAt = n.word("q1-levers", "an offline summarization job");
  const throughputAt = n.word("q1-levers", "throughput and cost per request");
  const longPromptAt = n.word("q1-levers", "Long prompts make prefill expensive");
  const longAnswerAt = n.word("q1-levers", "long answers make decode expensive");
  const followAt = n.word("q1-follow", "The follow-up");
  const waitAt = n.word("q1-follow", "users wait seconds");
  const streamsAt = n.word("q1-follow", "then it streams quickly");
  const thatsAt = n.word("q1-follow", "That's prefill");
  const shortenAt = n.word("q1-follow", "Shorten the prompt");
  const prefixAt = n.word("q1-follow", "cache a long shared prefix");
  const batchAt = n.word("q1-follow", "Waiting to fill a bigger batch");
  const delayAt = n.word("q1-follow", "only add delay");
  const cacheInAt = n.word("q2-in", "also reads the cached context");
  const growsAt = n.word("q2-in", "the part that grows");
  const end = n.beat("q2-in").to;

  // ── The timeline's geometry, changing with the narration ──
  const widen = ease(frame, longPromptAt, 24);
  const lengthen = ease(frame, longAnswerAt, 24);
  const follow = ease(frame, waitAt, 26);
  const shape: Shape = {
    p: 360 + 200 * widen * (1 - follow) + 340 * follow,
    s: 46 + (30 - 46) * follow,
    n: 18 + 4 * lengthen,
  };
  const STEPS = 22;
  const top = y(336);
  const bh = h(150);
  const d0 = X0 + shape.p + 24;
  const stepX = (i: number) => d0 + i * shape.s;
  const stepW = shape.s - 12;
  const axisY = y(510);
  const lastX = stepX(Math.min(STEPS, shape.n)) + 8;
  // When each decode step's box arrives, then its token, then its read.
  const boxAt = (i: number) => (i < 18 ? phasesAt + 10 + i * 3 : longAnswerAt + (i - 18) * 4);
  const tokAt = (i: number) => (i < 18 ? stepAt + 4 + i * 4 : longAnswerAt + 6 + (i - 18) * 4);
  const readAt = (i: number) => (i < 18 ? readsAt + 2 + i * 3 : longAnswerAt + 8 + (i - 18) * 4);
  const cacheAt = (i: number) => (i < 18 ? contextAt + 2 + i * 3 : longAnswerAt + 10 + (i - 18) * 4);
  const prefillLit = ease(frame, passAt, 10);
  const cacheGlow = ease(frame, cacheInAt, 12);

  // The bar inside a box: the weights (fixed), then the cache (growing).
  const barTop = top + h(48);
  const weightsH = h(54);
  const grow = ease(frame, growsAt, 18);
  const cacheH = (i: number) => h(4 + i * 1.0) * (1 + 0.3 * grow);

  // ── The lower area holds, in turn: the count, the levers, the follow-up ──
  const lowY = y(728);
  const noteY = y(600);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={phasesAt} level={-32} />
      <Sfx name="el-sprinkle" at={passAt} level={-33} />
      <Sfx name="el-pencil" at={ttftAt} level={-36} />
      <Sfx name="el-pop" at={ttftAt + 2} level={-30} />
      <Sfx name="el-sprinkle" at={stepAt + 4} level={-34} />
      <Sfx name="el-pencil" at={tpotAt} level={-36} />
      <Sfx name="el-tap" at={promptAt} level={-30} />
      <Sfx name="el-tap" at={onceAt} level={-30} />
      <Sfx name="el-whoosh" at={chatAt} level={-36} />
      <Sfx name="el-whoosh" at={longPromptAt} level={-36} />
      <Sfx name="el-whoosh" at={waitAt} level={-36} />
      <Sfx name="el-tap" at={shortenAt} level={-31} />
      <Sfx name="el-tap" at={prefixAt} level={-31} />
      <Sfx name="el-scratch" at={batchAt + 6} level={-34} />
      <Sfx name="el-pencil" at={growsAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Why is LLM inference split into prefill and decode?
        </QuestionCard>

        {/* ── Titles over the two phases ── */}
        <div style={{ position: "absolute", left: X0, top: y(296), whiteSpace: "nowrap", opacity: ease(frame, phasesAt - 2, 12), ...label(24, INK), fontWeight: 500 }}>
          <span style={{ fontSize: 24 }}>
            <Mark at={thatsAt} out={cacheInAt - 10}>
              Prefill
            </Mark>
            <span style={{ color: INK_SOFT, opacity: ease(frame, computeAt, 12) }}> · compute-bound</span>
          </span>
        </div>
        <div style={{ position: "absolute", left: d0, top: y(296), whiteSpace: "nowrap", opacity: ease(frame, bottleAt - 6, 12), ...label(24, INK), fontWeight: 500 }}>
          <Mark at={1e9}>Decode</Mark>
          <span style={{ color: INK_SOFT, opacity: ease(frame, bandAt, 12) }}> · bandwidth-bound</span>
        </div>

        <Svg>
          {/* Prefill: one wide pass, the prompt's tokens in one column, lit at once. */}
          <g opacity={ease(frame, phasesAt, 12)}>
            <rect x={X0} y={top} width={shape.p} height={bh} rx={8} fill="none" stroke={INK} strokeWidth={2} />
            <rect x={X0 + 28} y={barTop} width={8} height={weightsH * ease(frame, readsAt - 6, 12)} rx={2} fill={DATA} />
            {Array.from({ length: 8 }, (_, k) => {
              const ch = (bh - h(28) - 7 * 5) / 8;
              const cw = Math.min(120, shape.p - 140);
              return (
                <rect
                  key={k}
                  x={X0 + shape.p / 2 - cw / 2 + 16}
                  y={top + h(14) + k * (ch + 5)}
                  width={cw}
                  height={ch}
                  rx={3}
                  fill={`color-mix(in srgb, ${DATA} ${prefillLit * 100}%, ${PALE})`}
                />
              );
            })}
          </g>
          {/* Decode: a narrow pass per token, each reading the weights and the cache. */}
          {Array.from({ length: STEPS }, (_, i) => {
            const show = ease(frame, boxAt(i), 8) * (i < shape.n - 0.5 ? 1 : 0);
            if (show <= 0) return null;
            const x = stepX(i);
            const tok = ease(frame, tokAt(i), 6);
            const rd = ease(frame, readAt(i), 8);
            const cc = ease(frame, cacheAt(i), 8);
            const cx = x + stepW / 2;
            return (
              <g key={i} opacity={show}>
                <rect x={x} y={top} width={stepW} height={bh} rx={5} fill="none" stroke={INK} strokeWidth={2} />
                <rect x={x + 5} y={top + h(12)} width={stepW - 10} height={h(20)} rx={3} fill={`color-mix(in srgb, ${DATA} ${tok * 100}%, ${PALE})`} opacity={0.35 + 0.65 * tok} />
                <rect x={cx - 4} y={barTop} width={8} height={weightsH * rd} rx={2} fill={DATA} />
                <rect
                  x={cx - 4}
                  y={barTop + weightsH + 3}
                  width={8}
                  height={cacheH(i) * cc}
                  rx={2}
                  fill={`color-mix(in srgb, ${ds("yellow", 500)} ${cacheGlow * 100}%, ${CACHE})`}
                />
              </g>
            );
          })}
          {/* Time runs to the right. */}
          <g opacity={ease(frame, phasesAt + 6, 14)}>
            <line x1={X0} y1={axisY} x2={lastX + 30} y2={axisY} stroke={INK_SOFT} strokeWidth={1.6} />
            <path
              d={arrowHead(
                Array.from({ length: 21 }, (_, k) => [lastX + k * 1.8, axisY] as Pt),
                12,
                6,
                { filled: true },
              )}
              fill={INK_SOFT}
            />
          </g>
        </Svg>
        <div style={{ position: "absolute", left: lastX + 48, top: axisY - 15, ...note(22, INK_SOFT), opacity: ease(frame, phasesAt + 10, 12) }}>time</div>

        {/* ── The two brackets: time to first token, time per output token ── */}
        <Bracket x1={X0} x2={X0 + shape.p} y={axisY + h(18)} at={ttftAt} up={false} />
        <div
          style={{
            position: "absolute",
            left: X0,
            width: shape.p,
            top: axisY + h(30),
            textAlign: "center",
            whiteSpace: "nowrap",
            opacity: ease(frame, ttftAt + 2, 12),
            ...note(24, INK),
          }}
        >
          <Mark at={ttftAt + 4}>Time to first token</Mark> (TTFT)
        </div>
        <Bracket x1={stepX(4)} x2={stepX(5)} y={axisY + h(18)} at={tpotAt} />
        <div style={{ position: "absolute", left: stepX(4), top: axisY + h(30), whiteSpace: "nowrap", opacity: ease(frame, tpotAt + 2, 12), ...note(24, INK) }}>
          <Mark at={tpotAt + 4}>Time per output token</Mark>
        </div>

        {/* ── What each step reads ── */}
        <div
          style={{
            position: "absolute",
            left: d0,
            top: noteY,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 24,
            whiteSpace: "nowrap",
            opacity: ease(frame, readsAt, 12),
            ...note(24, INK),
          }}
        >
          <span>Each step reads</span>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: DATA }} />
          <span>all weights</span>
          <span style={{ opacity: ease(frame, contextAt, 12), display: "flex", alignItems: "center", gap: 10 }}>
            <span>+</span>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: CACHE }} />
            <Mark at={cacheInAt + 2}>the cache</Mark>
          </span>
        </div>

        {/* ── What each phase does, under it ── */}
        <Line at={passAt} x={X0} y={noteY} size={24} color={INK}>
          Whole prompt, one pass
        </Line>
        <Line at={matrixAt} x={X0} y={noteY + h(40)} size={24} color={INK_SOFT}>
          Large matrix multiplication
        </Line>
        <Line at={arithAt} x={d0} y={noteY + h(40)} size={24} color={INK_SOFT}>
          A little arithmetic per byte read
        </Line>

        <Spot id="hourglass" at={ttftAt + 2} out={countAt - 4} x={1568} y={y(292)} w={124} />

        {/* ── 1. The count: a weight read used 2,000 times, or once ── */}
        <Clear at={leversAt - 4}>
          <Line at={promptAt - 2} x={X0} y={lowY} size={24} color={INK_SOFT}>
            Prefill, <Num>{commas(REUSE.promptTokens)}</Num>-token prompt
          </Line>
          <div style={{ position: "absolute", left: X0, top: lowY + h(34), ...label(54, INK), fontWeight: 500, opacity: ease(frame, timesAt, 12) }}>
            <Num>{commas(REUSE.prefill)}</Num>
          </div>
          <Line at={timesAt + 4} x={X0} y={lowY + h(104)} size={24} color={INK}>
            uses of every weight it reads
          </Line>
          <VRule x={COL_B - 80} top={lowY} bottom={lowY + h(134)} at={decodeStepAt} />
          <Line at={decodeStepAt - 2} x={COL_B} y={lowY} size={24} color={INK_SOFT}>
            Decode step, one request
          </Line>
          <div style={{ position: "absolute", left: COL_B, top: lowY + h(34), ...label(54, INK), fontWeight: 500, opacity: ease(frame, onceAt, 12) }}>
            <Mark at={onceAt + 4}>
              <Num>{REUSE.decode}</Num>
            </Mark>
          </div>
          <Line at={onceAt + 4} x={COL_B} y={lowY + h(104)} size={24} color={INK}>
            use of every weight it reads
          </Line>
        </Clear>

        {/* ── 2. The levers: who cares about which phase ── */}
        <Clear at={followAt - 4}>
          <Line at={chatAt} x={X0} y={lowY} size={24} color={INK_SOFT}>
            A chat product
          </Line>
          <Line at={ttft2At} x={X0} y={lowY + h(38)} size={28} color={INK}>
            TTFT, smooth streaming
          </Line>
          <Line at={longPromptAt} x={X0} y={lowY + h(100)} size={24} color={INK}>
            <Mark at={longPromptAt + 4}>Long prompts</Mark> make prefill expensive
          </Line>
          <VRule x={COL_B - 80} top={lowY} bottom={lowY + h(130)} at={offlineAt} />
          <Line at={offlineAt} x={COL_B} y={lowY} size={24} color={INK_SOFT}>
            An offline summarization job
          </Line>
          <Line at={throughputAt} x={COL_B} y={lowY + h(38)} size={28} color={INK}>
            Throughput, cost per request
          </Line>
          <Line at={longAnswerAt} x={COL_B} y={lowY + h(100)} size={24} color={INK}>
            <Mark at={longAnswerAt + 4}>Long answers</Mark> make decode expensive
          </Line>
        </Clear>

        {/* ── 3. The follow-up: slow to start, then quick ── */}
        <>
          <Line at={followAt} x={X0} y={lowY} size={24} color={INK_SOFT}>
            The follow-up
          </Line>
          <Line at={waitAt} x={X0} y={lowY + h(38)} size={28} color={INK}>
            Seconds before any text appears,
          </Line>
          <Line at={streamsAt} x={X0} y={lowY + h(78)} size={28} color={INK}>
            then it streams quickly
          </Line>
          <VRule x={COL_B - 80} top={lowY} bottom={lowY + h(130)} at={shortenAt - 2} />
          <Line at={shortenAt - 2} x={COL_B} y={lowY} size={28} color={OK_INK}>
            Shorten the prompt
          </Line>
          <Line at={prefixAt - 2} x={COL_B} y={lowY + h(46)} size={28} color={OK_INK}>
            Cache a long shared prefix
          </Line>
          <Line at={batchAt - 2} x={COL_B} y={lowY + h(92)} size={28} color={ACCENT_INK}>
            <Strike at={delayAt}>Wait to fill a bigger batch</Strike>
            <span style={{ opacity: ease(frame, delayAt + 4, 12) }}>: only adds delay</span>
          </Line>
        </>
      </Drift>
    </AbsoluteFill>
  );
};
