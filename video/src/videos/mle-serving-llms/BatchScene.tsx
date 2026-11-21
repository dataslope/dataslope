import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, PAPER, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BATCHING, continuousSchedule, PAGING, VLLM_SOURCE } from "./data";
import {
  Box,
  CACHE,
  Clear,
  commas,
  DATA,
  Drift,
  Enter,
  IDLE,
  IDLE_INK,
  Line,
  Mark,
  OK_INK,
  pct,
  Q_SIZE,
  Q_W,
  Spot,
  Svg,
  X0,
} from "./parts";

/** Where the slots' bars start, and how far one token reaches. */
const BX = 340;
const HORIZON = Math.max(...BATCHING.firstGroups[0]) + Math.max(...BATCHING.firstGroups[1]);
const PX = (1770 - BX) / HORIZON;
const ROW = 28;
const BAR_H = 19;
const GHOST = ds("blue", 100);
const HATCH = "mle-serving-llms-idle";

/** The 8K reservation's bar and the paged blocks. */
const BUF_W = 1200;
const BLOCK = 20;
const PITCH = 24;
const PER_ROW = 25;

/**
 * Question 3: one read of the weights serving eight sequences; static
 * batching's idle slots behind the longest answer; continuous batching
 * admitting and releasing at every step; the simulation's busy shares (37%
 * and 99%). Then memory: an 8K reservation three quarters empty, the same
 * answer in 16-token blocks, a shared prefix, three more requests in the
 * room it frees, the paper's 2 to 4 times at the same latency, and why that
 * last part matters.
 */
export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "What are continuous batching");
  const readAt = n.word("q3", "one read of the weights");
  const manyAt = n.word("q3", "serve many sequences");
  const staticAt = n.word("q3-static", "Static batching groups requests");
  const longestAt = n.word("q3-static", "waits until the longest one finishes");
  const idleAt = n.word("q3-static", "sit idle");
  const contAt = n.word("q3-cont", "Continuous batching");
  const flightAt = n.word("q3-cont", "also called in-flight batching");
  const admitAt = n.word("q3-cont", "admits a new request");
  const releaseAt = n.word("q3-cont", "releases a finished one");
  const simAt = n.word("q3-sim", "In a simulation");
  const slotsAt = n.word("q3-sim", "eight slots work through");
  const shortAt = n.word("q3-sim", "most of them short");
  const s37At = n.word("q3-sim", "thirty-seven percent");
  const c99At = n.word("q3-sim", "Continuous batching, ninety-nine");
  const memAt = n.word("q3-mem", "Every busy slot needs cache memory");
  const knowsAt = n.word("q3-mem", "no one knows in advance");
  const reserveAt = n.word("q3-mem", "Reserve eight K tokens");
  const usingAt = n.word("q3-mem", "ends up using two thousand");
  const quartersAt = n.word("q3-mem", "three quarters of its buffer");
  const pagedAt = n.word("q3-paged", "PagedAttention stores the cache");
  const blocksAt = n.word("q3-paged", "fixed-size blocks");
  const osAt = n.word("q3-paged", "the way an operating system pages memory");
  const growsAt = n.word("q3-paged", "hands out blocks as the answer grows");
  const wasteAt = n.word("q3-paged", "the only waste");
  const underAt = n.word("q3-paged", "under one percent");
  const prefixAt = n.word("q3-paged", "share a prompt prefix");
  const shareAt = n.word("q3-paged", "share its blocks");
  const lessAt = n.word("q3-paper", "Less waste means more requests");
  const vllmAt = n.word("q3-paper", "PagedAttention came with vLLM");
  const timesAt = n.word("q3-paper", "two to four times the throughput");
  const sameAt = n.word("q3-paper", "at the same latency");
  const noticeAt = n.word("q3-latency", "Notice that last part");
  const biggerAt = n.word("q3-latency", "A bigger batch raises throughput");
  const slowerAt = n.word("q3-latency", "arrive more slowly");
  const statedAt = n.word("q3-latency", "only means something at a stated latency");
  const end = n.beat("q4-in").to;

  const clearA = memAt - 8;

  // ── Part A geometry ──
  const sTop = y(326);
  const cTop = y(616);
  const rowY = (top: number, i: number) => top + i * h(ROW);
  const g1 = BATCHING.firstGroups[0];
  const g2 = BATCHING.firstGroups[1];
  const g1Max = Math.max(...g1);
  const lineX = BX + g1Max * PX;
  const line2X = BX + HORIZON * PX;
  // The opening: every sequence gains a token per step, together.
  const grown = Math.max(0, Math.min(g1Max, ((frame - (manyAt + 4)) / 110) * g1Max));
  const ghost = ease(frame, staticAt + 6, 14);
  const longest = ease(frame, longestAt + 4, 12);
  const idle = ease(frame, idleAt, 14);
  const run2 = Math.max(0, Math.min(Math.max(...g2), ((frame - (idleAt + 24)) / 60) * Math.max(...g2)));
  const idle2 = ease(frame, idleAt + 84, 12);
  const sched = continuousSchedule(BATCHING.firstLengths, BATCHING.slots, HORIZON);
  const tCont = Math.max(0, Math.min(HORIZON, ((frame - (contAt + 10)) / 130) * HORIZON));
  const admitGlow = Math.min(ease(frame, admitAt, 8), 1 - ease(frame, simAt - 6, 10));
  const releaseGlow = Math.min(ease(frame, releaseAt, 8), 1 - ease(frame, simAt - 6, 10));

  // ── Part B geometry ──
  const bufTop = y(330);
  const bufH = h(54);
  const usedW = (PAGING.usedTokens / PAGING.reservedTokens) * BUF_W;
  const more = ease(frame, lessAt + 4, 20);
  const gridTop = y(500);
  const blocks = Math.ceil(PAGING.usedTokens / PAGING.blockTokens);
  const lastFill = 9 / 16;
  const handed = Math.max(0, Math.min(blocks, ((frame - (growsAt + 4)) / 70) * blocks));
  const fork = { x: 1000, mid: y(560), a: y(496), b: y(624) };
  const sketch = { x: 1230, y0: y(880), w: 380, hh: h(160) };

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={readAt} level={-36} />
      <Sfx name="el-sprinkle" at={manyAt + 4} level={-34} />
      <Sfx name="el-pencil" at={longestAt + 4} level={-35} />
      <Sfx name="el-sprinkle" at={idleAt} level={-34} />
      <Sfx name="el-whoosh" at={contAt + 10} level={-37} />
      <Sfx name="el-tap" at={admitAt} level={-32} />
      <Sfx name="el-tap" at={releaseAt} level={-32} />
      <Sfx name="el-tap" at={s37At} level={-30} />
      <Sfx name="el-tap" at={c99At} level={-30} />
      <Sfx name="el-whoosh" at={clearA} level={-37} />
      <Sfx name="el-tap" at={usingAt} level={-31} />
      <Sfx name="el-pop" at={blocksAt} level={-30} />
      <Sfx name="el-sprinkle" at={growsAt + 4} level={-33} />
      <Sfx name="el-tap" at={underAt} level={-31} />
      <Sfx name="el-pencil" at={shareAt} level={-36} />
      <Sfx name="el-whoosh" at={lessAt + 4} level={-36} />
      <Sfx name="el-pencil" at={biggerAt} level={-36} />
      <Sfx name="el-chime" at={statedAt + 10} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What are continuous batching and PagedAttention?
        </QuestionCard>

        {/* ── Part A: batching ── */}
        <Clear at={clearA}>
          <Svg>
            <defs>
              <pattern id={HATCH} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width={8} height={8} fill={IDLE} />
                <line x1={0} y1={0} x2={0} y2={8} stroke={ds("gray", 300)} strokeWidth={3} />
              </pattern>
            </defs>
            {/* One read of the weights fans out to every sequence. */}
            {g1.map((_, i) => {
              const p = ease(frame, readAt + 4 + i * 2, 12);
              if (p <= 0) return null;
              const sy = rowY(sTop, 3.5) + BAR_H / 2;
              const ey = rowY(sTop, i) + BAR_H / 2;
              const x1 = 286;
              const x2 = BX - 8;
              const pts: Pt[] = Array.from({ length: 21 }, (_, k) => [x1 + ((x2 - x1) * k) / 20, sy + ((ey - sy) * k) / 20] as Pt);
              return (
                <g key={i} opacity={1 - 0.6 * ease(frame, staticAt, 14)}>
                  <line x1={x1} y1={sy} x2={x1 + (x2 - x1) * p} y2={sy + (ey - sy) * p} stroke={DATA} strokeWidth={2} />
                  {p > 0.95 ? <path d={arrowHead(pts, 10, 5.2, { filled: true })} fill={DATA} /> : null}
                </g>
              );
            })}
            {/* Static: the first group from a common start, the next waiting behind the longest. */}
            {g1.map((len, i) => {
              const w = Math.min(len, grown) * PX;
              return (
                <g key={i}>
                  {idle > 0 && len < g1Max ? (
                    <rect x={BX + len * PX + 2} y={rowY(sTop, i)} width={(g1Max - len) * PX * idle - 2} height={BAR_H} rx={3} fill={`url(#${HATCH})`} />
                  ) : null}
                  {w > 0 ? <rect x={BX} y={rowY(sTop, i)} width={w} height={BAR_H} rx={3} fill={DATA} /> : null}
                </g>
              );
            })}
            {g2.map((len, i) => {
              const solid = Math.min(len, run2) * PX;
              const g2Max = Math.max(...g2);
              return (
                <g key={i} opacity={ghost}>
                  <rect x={lineX + 3} y={rowY(sTop, i)} width={len * PX - 3} height={BAR_H} rx={3} fill={GHOST} />
                  {solid > 0 ? <rect x={lineX + 3} y={rowY(sTop, i)} width={solid - 3} height={BAR_H} rx={3} fill={DATA} /> : null}
                  {idle2 > 0 && len < g2Max ? (
                    <rect x={lineX + len * PX + 2} y={rowY(sTop, i)} width={(g2Max - len) * PX * idle2 - 2} height={BAR_H} rx={3} fill={`url(#${HATCH})`} />
                  ) : null}
                </g>
              );
            })}
            {longest > 0 ? (
              <g opacity={longest}>
                <line x1={lineX} x2={lineX} y1={sTop - 10} y2={rowY(sTop, 7) + BAR_H + 10} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
                <line x1={line2X} x2={line2X} y1={sTop - 10} y2={rowY(sTop, 7) + BAR_H + 10} stroke={INK} strokeWidth={2} strokeDasharray="6 5" opacity={idle2} />
              </g>
            ) : null}
            {/* Continuous: a slot takes the next request the step after it frees. */}
            {sched.map((r, k) => {
              const s = Math.min(r.start, tCont);
              const e = Math.min(r.end, tCont, HORIZON);
              if (e <= s) return null;
              const x = BX + s * PX + (r.start > 0 ? 2 : 0);
              const w = (e - s) * PX - (r.start > 0 ? 2 : 0);
              return <rect key={k} x={x} y={rowY(cTop, r.slot)} width={Math.max(0, w)} height={BAR_H} rx={3} fill={DATA} />;
            })}
            {/* Admit and release: every handover, lit on its word. */}
            {sched
              .filter((r) => r.start > 0 && r.start < tCont && r.start < HORIZON)
              .map((r, k) => (
                <g key={k}>
                  <rect x={BX + r.start * PX - 3} y={rowY(cTop, r.slot) - 5} width={4} height={BAR_H + 10} rx={2} fill={ds("yellow", 500)} opacity={Math.max(admitGlow, releaseGlow)} />
                </g>
              ))}
          </Svg>
          <Box x={X0} y={rowY(sTop, 3.5) + BAR_H / 2 - 34} w={166} h={68} at={readAt} title="Weights" sub="one read" size={24} subSize={20} />
          <Line at={staticAt} x={BX} y={sTop - h(42)} size={24} color={INK}>
            Static batching
          </Line>
          <div style={{ position: "absolute", left: BX + 120, top: rowY(sTop, 6) + BAR_H / 2 - 15, opacity: ease(frame, idleAt + 4, 12), ...label(22, IDLE_INK), fontWeight: 500, background: PAPER, padding: "0 8px", borderRadius: 4 }}>
            idle
          </div>
          <Line at={longestAt + 8} x={lineX - 14} width={420} align="right" y={sTop - h(42)} size={24} color={INK_SOFT}>
            the next group waits for the longest
          </Line>
          <div style={{ position: "absolute", left: 1770, top: sTop - h(42), transform: "translateX(-100%)", whiteSpace: "nowrap", opacity: ease(frame, s37At, 12), ...note(24, INK), fontWeight: 600 }}>
            <Num>{pct(BATCHING.staticBusy)}</Num> busy
          </div>
          <Line at={contAt} x={BX} y={cTop - h(42)} size={24} color={INK}>
            Continuous batching
            <span style={{ color: INK_SOFT, opacity: ease(frame, flightAt, 12) }}> (in-flight)</span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, admitAt, 12) }}>
              {" · "}
              <Mark at={admitAt + 2} out={simAt - 6}>
                admit
              </Mark>
            </span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, releaseAt, 12) }}>
              {" and "}
              <Mark at={releaseAt + 2} out={simAt - 6}>
                release
              </Mark>{" "}
              at any step
            </span>
          </Line>
          <div style={{ position: "absolute", left: 1770, top: cTop - h(42), transform: "translateX(-100%)", whiteSpace: "nowrap", opacity: ease(frame, c99At, 12), ...note(24, OK_INK), fontWeight: 600 }}>
            <Num>{pct(BATCHING.continuousBusy)}</Num> busy
          </div>
          <Line at={slotsAt} x={BX} y={rowY(cTop, 8) + h(22)} size={22} color={INK_SOFT}>
            Simulation: <Num>{BATCHING.slots}</Num> slots, <Num>{commas(BATCHING.requests)}</Num> requests, answers <Num>{BATCHING.min}</Num> to{" "}
            <Num>{commas(BATCHING.max)}</Num> tokens
            <span style={{ opacity: ease(frame, shortAt, 12) }}>, mostly short</span>
          </Line>
        </Clear>

        {/* ── Part B: the cache's memory ── */}
        <Enter at={clearA + 6}>
          <Line at={memAt + 4} x={X0} y={bufTop - h(46)} size={24} color={INK}>
            One request&apos;s cache
            <span style={{ opacity: ease(frame, reserveAt - 4, 12) }}>
              , reserved up front: <Num>{commas(PAGING.reservedTokens)}</Num> tokens
            </span>
          </Line>
          <Svg>
            {frame < reserveAt + 12 ? (
              <rect
                x={X0}
                y={bufTop}
                width={(0.25 + 0.6 * ease(frame, knowsAt, 30) + 0.12 * Math.sin((frame - knowsAt) / 9) * ease(frame, knowsAt, 30)) * BUF_W * ease(frame, memAt + 6, 14)}
                height={bufH}
                rx={8}
                fill="none"
                stroke={INK_SOFT}
                strokeWidth={2}
                strokeDasharray="8 6"
                opacity={1 - ease(frame, reserveAt, 12)}
              />
            ) : null}
            <rect x={X0} y={bufTop} width={BUF_W * ease(frame, reserveAt, 16)} height={bufH} rx={8} fill="none" stroke={INK} strokeWidth={2} />
            <rect x={X0 + 4} y={bufTop + 4} width={(BUF_W - 8) * ease(frame, reserveAt + 6, 16) * (1 - more * 0)} height={bufH - 8} rx={4} fill={IDLE} opacity={ease(frame, usingAt, 12)} />
            <rect x={X0 + 4} y={bufTop + 4} width={(usedW - 4) * ease(frame, usingAt, 16)} height={bufH - 8} rx={4} fill={DATA} />
            {[1, 2, 3].map((k) => (
              <rect key={k} x={X0 + 4 + k * (usedW + 2)} y={bufTop + 4} width={usedW * ease(frame, lessAt + 6 + k * 6, 14)} height={bufH - 8} rx={4} fill={DATA} />
            ))}
          </Svg>
          <Line at={knowsAt} x={X0} y={bufTop + bufH + h(14)} size={24} color={INK_SOFT} out={reserveAt}>
            How long will the answer be?
          </Line>
          <Line at={usingAt + 4} x={X0} y={bufTop + bufH + h(14)} size={24} color={INK}>
            <Num>{commas(PAGING.usedTokens)}</Num> used
          </Line>
          <Clear at={lessAt + 4}>
            <Line at={quartersAt} x={X0 + usedW + 30} y={bufTop + bufH + h(14)} size={24} color={INK}>
              <Mark at={quartersAt + 4}>
                <Num>{pct(PAGING.emptyShare)}</Num> empty
              </Mark>
            </Line>
          </Clear>
          <Line at={lessAt + 24} x={X0 + usedW + 30} y={bufTop + bufH + h(14)} size={24} color={OK_INK}>
            Room for three more requests
          </Line>

          {/* The same answer in blocks of 16, handed out as it grows. */}
          <Line at={pagedAt} x={X0} y={gridTop - h(46)} size={24} color={INK}>
            PagedAttention: blocks of <Num>{PAGING.blockTokens}</Num> tokens
            <span style={{ color: INK_SOFT, opacity: ease(frame, osAt, 12) }}>, like an operating system&apos;s pages</span>
          </Line>
          <Svg>
            {Array.from({ length: blocks }, (_, k) => {
              const r = Math.floor(k / PER_ROW);
              const c = k % PER_ROW;
              const p = Math.max(0, Math.min(1, handed - k));
              if (p <= 0) return null;
              const last = k === blocks - 1;
              const bx = X0 + c * PITCH;
              const by = gridTop + r * PITCH;
              return (
                <g key={k} opacity={p}>
                  {last ? (
                    <>
                      <rect x={bx} y={by} width={BLOCK} height={BLOCK} rx={4} fill={IDLE} />
                      <rect x={bx} y={by} width={BLOCK * lastFill} height={BLOCK} rx={4} fill={CACHE} />
                    </>
                  ) : (
                    <rect x={bx} y={by} width={BLOCK} height={BLOCK} rx={4} fill={CACHE} />
                  )}
                </g>
              );
            })}
          </Svg>
          <Line at={wasteAt} x={X0} y={gridTop + 5 * PITCH + h(14)} size={24} color={INK}>
            Waste: the unfilled end of the last block,{" "}
            <span style={{ color: OK_INK, opacity: ease(frame, underAt, 10) }}>
              at most <Num>{PAGING.worstWasteTokens}</Num> tokens, under <Num>1</Num>%
            </span>
          </Line>

          {/* Two requests that share a prompt prefix share its blocks. */}
          <Svg>
            {[0, 1, 2].map((k) => (
              <rect key={k} x={fork.x + k * PITCH} y={fork.mid - BLOCK / 2} width={BLOCK} height={BLOCK} rx={4} fill={CACHE} opacity={ease(frame, prefixAt + k * 3, 10)} />
            ))}
            {[
              { y: fork.a, n: 6, at: prefixAt + 10 },
              { y: fork.b, n: 4, at: shareAt },
            ].map((row, j) => (
              <g key={j}>
                <line
                  x1={fork.x + 3 * PITCH}
                  y1={fork.mid}
                  x2={fork.x + 3 * PITCH + 46 * ease(frame, row.at, 10)}
                  y2={fork.mid + (row.y - fork.mid) * ease(frame, row.at, 10)}
                  stroke={INK}
                  strokeWidth={2}
                />
                {Array.from({ length: row.n }, (_, k) => (
                  <rect key={k} x={fork.x + 3 * PITCH + 52 + k * PITCH} y={row.y - BLOCK / 2} width={BLOCK} height={BLOCK} rx={4} fill={CACHE} opacity={ease(frame, row.at + 6 + k * 2, 8)} />
                ))}
              </g>
            ))}
          </Svg>
          <div style={{ position: "absolute", left: fork.x + 3 * PITCH - 4, top: fork.mid - BLOCK / 2 - h(40), transform: "translateX(-100%)", whiteSpace: "nowrap", opacity: ease(frame, prefixAt + 6, 12), ...label(22, INK), fontWeight: 500 }}>
            <Mark at={shareAt + 6}>shared prompt prefix</Mark>
          </div>
          <Line at={prefixAt + 14} x={fork.x + 3 * PITCH + 52 + 6 * PITCH + 10} y={fork.a - 14} size={22} color={INK_SOFT}>
            request A
          </Line>
          <Line at={shareAt + 12} x={fork.x + 3 * PITCH + 52 + 4 * PITCH + 10} y={fork.b - 14} size={22} color={INK_SOFT}>
            request B
          </Line>

          {/* The paper, and the latency it held. */}
          <Line at={timesAt} x={X0} y={y(712)} size={28} color={INK}>
            <Num>2</Num>–<Num>4</Num>× the throughput of earlier systems,{" "}
            <span style={{ opacity: ease(frame, sameAt, 10) }}>
              <Mark at={noticeAt}>at the same latency</Mark>
            </span>
          </Line>
          <Line at={vllmAt} x={X0} y={y(712) + h(50)} size={22} color={INK_SOFT}>
            {VLLM_SOURCE}, an open-source serving engine
          </Line>
          <Line at={statedAt} x={X0} y={y(712) + h(122)} size={26} color={INK}>
            A throughput number means something only at a stated latency
          </Line>

          {/* A bigger batch: more throughput, slower tokens. A sketch, no numbers. */}
          <Svg>
            <g opacity={ease(frame, biggerAt - 4, 12)}>
              <line x1={sketch.x} y1={sketch.y0} x2={sketch.x + sketch.w} y2={sketch.y0} stroke={INK} strokeWidth={1.6} />
              <line x1={sketch.x} y1={sketch.y0} x2={sketch.x} y2={sketch.y0 - sketch.hh} stroke={INK} strokeWidth={1.6} />
              <path
                d={`M${sketch.x},${sketch.y0 - 6} C${sketch.x + sketch.w * 0.3},${sketch.y0 - sketch.hh * 0.75} ${sketch.x + sketch.w * 0.6},${sketch.y0 - sketch.hh * 0.88} ${sketch.x + sketch.w},${sketch.y0 - sketch.hh * 0.92}`}
                fill="none"
                stroke={DATA}
                strokeWidth={3}
                pathLength={1}
                strokeDasharray={`${ease(frame, biggerAt, 24)} 1`}
              />
              <path
                d={`M${sketch.x},${sketch.y0 - 14} C${sketch.x + sketch.w * 0.4},${sketch.y0 - 20} ${sketch.x + sketch.w * 0.7},${sketch.y0 - sketch.hh * 0.3} ${sketch.x + sketch.w},${sketch.y0 - sketch.hh * 0.55}`}
                fill="none"
                stroke={INK}
                strokeWidth={3}
                pathLength={1}
                strokeDasharray={`${ease(frame, slowerAt, 24)} 1`}
              />
              <text x={sketch.x + sketch.w / 2} y={sketch.y0 + 30} textAnchor="middle" style={svgText(label(21, INK_SOFT))}>
                batch size
              </text>
            </g>
            <text x={sketch.x + sketch.w + 12} y={sketch.y0 - sketch.hh * 0.92 + 7} style={{ ...svgText(label(21, ds("blue", 500))), opacity: ease(frame, biggerAt + 18, 10) }}>
              throughput
            </text>
            <text x={sketch.x + sketch.w + 12} y={sketch.y0 - sketch.hh * 0.55 + 7} style={{ ...svgText(label(21, INK)), opacity: ease(frame, slowerAt + 18, 10) }}>
              time per token
            </text>
          </Svg>
        </Enter>

        <Spot id="tiles" at={blocksAt} x={1450} y={bufTop - 4} w={280} />
      </Drift>
    </AbsoluteFill>
  );
};
