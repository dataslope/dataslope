import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, cubicPath, lineLength, sampleCubic, type Cubic } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { MathRun } from "../../editorial/math";
import { HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KV } from "./data";
import {
  ACCENT,
  ACCENT_INK,
  BLUE_INK,
  CACHE,
  Clear,
  DATA,
  Drift,
  Enter,
  Line,
  Mark,
  MarkAt,
  MARK,
  MARK_BAD,
  OK,
  OK_INK,
  pulse,
  Q_SIZE,
  Q_W,
  Svg,
  tokenStyle,
  VRule,
  X0,
} from "./parts";

const PAST = ["Serving", "a", "large", "model", "is", "mostly"];
const NEW = "memory";
const SLOT = 168;
/** The attention arcs' arrowhead length. */
const HEAD = 12;
/** The node bar's scale: 640 GB across 1,600 px. */
const PX_PER_GB = 2.5;
const GIB = 2 ** 30;
/** A 128K context and an 8K request with 64 KV heads, in GB. */
const ctxGB = (KV.context128kGiB * GIB) / 1e9;
/** The grouped-query sketch: one query head's box, and its left edge. */
const Q_W_BOX = 34;
const Q_PITCH = 42;
const qX = (i: number) => 1630 - ((KV.gqaFactor - 1) * Q_PITCH + Q_W_BOX) / 2 + i * Q_PITCH;
const per8kGB = KV.per8kBytes / 1e9;

/**
 * Question 2: the keys and values every new token attends to, recomputed (the
 * quadratic waste) or cached; the page's formula, factor by factor, filled
 * with the model's numbers (320 KiB a token); one 128K context beside the
 * weights; then the whiteboard step: the node's 640 GB less the weights
 * leaves 500 GB, room for at most 186 8K requests, or 11 at 128K. Grouped-
 * query attention is why it is 186: give every query head its own key and
 * value head and it is 23.
 */
export const KvScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "What is the KV cache");
  const duringAt = n.word("q2", "During decode");
  const attendsAt = n.word("q2", "attends to every token before it");
  const recompAt = n.word("q2", "Recomputing their keys and values");
  const wasteAt = n.word("q2", "quadratic waste");
  const cachedAt = n.word("q2", "so they're cached");
  const perSeqAt = n.word("q2-formula", "Per sequence");
  const twoAt = n.word("q2-formula", "its size is two");
  const kvPairAt = n.word("q2-formula", "for one key and one value");
  const factorAt = [
    twoAt,
    n.word("q2-formula", "times the layers"),
    n.word("q2-formula", "the KV heads"),
    n.word("q2-formula", "the head dimension"),
    n.word("q2-formula", "the tokens"),
    n.word("q2-formula", "the bytes per value"),
  ];
  const valueAt = [
    n.word("q2-model", "This model has"),
    n.word("q2-model", "eighty layers"),
    n.word("q2-model", "eight KV heads"),
    n.word("q2-model", "of dimension a hundred and twenty-eight"),
    n.word("q2-model", "That's three hundred"),
    n.word("q2-model", "at sixteen bits"),
  ];
  const perTokAt = n.word("q2-model", "three hundred and twenty kibibytes");
  const contextAt = n.word("q2-context", "One context");
  const fortyAt = n.word("q2-context", "takes forty gibibytes");
  const weightsAt = n.word("q2-context", "a hundred and forty gigabytes of weights");
  const fitQAt = n.word("q2-fit", "how many requests fit");
  const gpusAt = n.word("q2-fit", "Eight eighty-gigabyte GPUs");
  const minusAt = n.word("q2-fit", "minus the weights");
  const freeAt = n.word("q2-fit", "leave five hundred gigabytes");
  const at8kAt = n.word("q2-fit", "At eight K tokens a request");
  const fitAt = n.word("q2-fit", "at most a hundred and eighty-six");
  const elevenAt = n.word("q2-long", "At a hundred and twenty-eight K, eleven");
  const memAt = n.word("q2-long", "Memory, not compute");
  const goesAt = n.word("q2-long", "this cache is where the memory goes");
  const gqaAt = n.word("q2-gqa", "grouped-query attention matters");
  const shareAt = n.word("q2-gqa", "several query heads share one key and value head");
  const ownAt = n.word("q2-gqa", "Give each of the sixty-four query heads its own");
  const timesAt = n.word("q2-gqa", "the cache grows eight times");
  const t23At = n.word("q2-gqa", "twenty-three of those eight K requests");
  const not186At = n.word("q2-gqa", "not a hundred and eighty-six");
  const capsAt = n.word("q3-in", "So memory caps the batch");
  const end = n.beat("q3-in").to;

  // ── Part A: tokens, keys and values ──
  const rowTop = y(392);
  const chipH = 46;
  const slotX = (i: number) => X0 + i * SLOT;
  const kvTop = rowTop + chipH + h(28);
  const kvH = 48;
  const cellW = 52;
  const redden = Math.min(ease(frame, recompAt, 8), 1 - ease(frame, cachedAt, 12));
  const flash = pulse(frame, recompAt + 4, 14) + pulse(frame, recompAt + 20, 14);
  const cached = ease(frame, cachedAt, 14);
  const clearA = contextAt - 8;

  // ── The formula: up under the tokens, then moved to the top ──
  const lift = ease(frame, clearA, 22);
  const formTop = y(690) + (y(296) - y(690)) * lift;
  const COLS: { word: React.ReactNode; value: React.ReactNode }[] = [
    { word: "2", value: "2" },
    { word: "layers", value: <Num>{KV.layers}</Num> },
    { word: "KV heads", value: <Num>{KV.kvHeads}</Num> },
    { word: "head dim", value: <Num>{KV.headDim}</Num> },
    { word: "tokens", value: "1" },
    { word: "bytes per value", value: <Num>{KV.bytesPerValue}</Num> },
  ];

  // ── Part B: the node's memory ──
  const barX = X0;
  const ctxTop = y(470);
  const nodeTop = y(650);
  const nodeH = h(80);
  const gpuW = KV.gpuGB * PX_PER_GB;
  const merge = ease(frame, gpusAt + 18, 20);
  const gpuGap = 14 * (1 - merge);
  const wPx = KV.weightsGB * PX_PER_GB;
  const freePx = KV.freeGB * PX_PER_GB;
  const freeX = barX + wPx;
  const weightsIn = ease(frame, minusAt, 14);
  const freeIn = ease(frame, freeAt, 14);
  // Which cells fill the free part: 186 of 8K, then 11 of 128K, then 186 again
  // and the 23 of 8K with 64 KV heads.
  const phase186 = ease(frame, fitAt, 1) * (1 - ease(frame, elevenAt, 1)) + ease(frame, gqaAt, 1) * (1 - ease(frame, timesAt + 4, 1));
  const phase11 = ease(frame, elevenAt, 1) * (1 - ease(frame, gqaAt, 1));
  const phase23 = ease(frame, timesAt + 4, 1);
  const cellsFrom = phase11 > 0 ? elevenAt : phase23 > 0 ? timesAt + 4 : frame >= gqaAt ? gqaAt : fitAt;
  // The caption under the cells, one per fill, cross-faded on the cells' cues.
  const cap8 =
    Math.min(ease(frame, at8kAt, 12), 1 - ease(frame, elevenAt - 2, 8)) + Math.min(ease(frame, gqaAt, 12), 1 - ease(frame, timesAt + 2, 8));
  const cap128 = Math.min(ease(frame, elevenAt + 4, 10), 1 - ease(frame, gqaAt - 2, 8));
  const cap64 = ease(frame, timesAt + 6, 10);
  const cells =
    phase11 > 0
      ? { count: KV.fit128k, gb: ctxGB, rows: 1 }
      : phase23 > 0
        ? { count: KV.fitNoGqa8k, gb: per8kGB * KV.gqaFactor, rows: 1 }
        : phase186 > 0
          ? { count: KV.fit8k, gb: per8kGB, rows: 2 }
          : null;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={attendsAt} level={-36} />
      <Sfx name="el-scratch" at={recompAt + 4} level={-35} />
      <Sfx name="el-chime" at={cachedAt + 6} level={-33} />
      {factorAt.map((at, i) => (
        <Sfx key={`f${i}`} name="el-tap" at={at} level={-35} />
      ))}
      <Sfx name="el-tap" at={perTokAt} level={-29} />
      <Sfx name="el-whoosh" at={clearA} level={-37} />
      <Sfx name="el-tap" at={fortyAt} level={-31} />
      <Sfx name="el-tap" at={weightsAt} level={-31} />
      <Sfx name="el-whoosh" at={gpusAt + 18} level={-36} />
      <Sfx name="el-tap" at={minusAt} level={-31} />
      <Sfx name="el-sprinkle" at={fitAt} level={-31} />
      <Sfx name="el-sprinkle" at={elevenAt} level={-33} />
      <Sfx name="el-pencil" at={shareAt} level={-36} />
      <Sfx name="el-sprinkle" at={timesAt + 4} level={-32} />
      <Sfx name="el-chime" at={capsAt + 4} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is the KV cache, and how large does it get?
        </QuestionCard>

        {/* ── Part A: each new token attends to every token before it ── */}
        <Clear at={clearA}>
          {PAST.map((w, i) => (
            <div key={w} style={{ position: "absolute", left: slotX(i), width: SLOT - 18, top: rowTop, display: "flex", justifyContent: "center", fontSize: 30 }}>
              <span style={{ ...tokenStyle("data", 30), opacity: ease(frame, duringAt + i * 3, 10) }}>{w}</span>
            </div>
          ))}
          <div style={{ position: "absolute", left: slotX(PAST.length), width: SLOT - 18, top: rowTop, display: "flex", justifyContent: "center", fontSize: 30 }}>
            <span style={{ ...tokenStyle("lit", 30), opacity: ease(frame, duringAt + 22, 10) }}>{NEW}</span>
          </div>
          <Svg>
            {PAST.map((_, i) => {
              const sx = slotX(PAST.length) + (SLOT - 18) / 2;
              const ex = slotX(i) + (SLOT - 18) / 2;
              const yy = rowTop - 6;
              const lift2 = 34 + (sx - ex) * 0.06;
              const STRAIGHT = 20;
              const c: Cubic = [
                [sx, yy],
                [sx, yy - lift2 * 1.3],
                [ex, yy - STRAIGHT - lift2 * 1.1],
                [ex, yy - STRAIGHT],
              ];
              const p = ease(frame, attendsAt + 2 + (PAST.length - 1 - i) * 3, 14);
              if (p <= 0) return null;
              const line = [...sampleCubic(c), ...Array.from({ length: 11 }, (_, k) => [ex, yy - STRAIGHT + (STRAIGHT * (k + 1)) / 11] as const)];
              const d = `${cubicPath(c)} L${ex},${yy}`;
              // The stroke stops a head-length short of the tip, so it meets
              // the head on every arc (a fixed 96% left the long arcs 20 to
              // 45 px short of theirs).
              const len = lineLength(line);
              const reach = (len - HEAD + 1) / len;
              return (
                <g key={i} opacity={1 - 0.45 * ease(frame, recompAt, 12)}>
                  <path d={d} fill="none" stroke={INK} strokeWidth={2} pathLength={1} strokeDasharray={`${p * reach} 1`} />
                  <path d={arrowHead(line, HEAD, 6.4, { filled: true })} fill={INK} opacity={ease(frame, attendsAt + 12 + (PAST.length - 1 - i) * 3, 5)} />
                </g>
              );
            })}
            {/* Each past token's key and value. */}
            {PAST.map((_, i) => {
              const p = ease(frame, duringAt + 8 + i * 3, 10);
              if (p <= 0) return null;
              const cx = slotX(i) + (SLOT - 18) / 2;
              const stroke = `color-mix(in srgb, ${ACCENT} ${Math.min(1, redden + flash) * 100}%, ${INK})`;
              return (
                <g key={i} opacity={p}>
                  {[0, 1].map((k) => (
                    <rect key={k} x={cx - cellW - 4 + k * (cellW + 8)} y={kvTop} width={cellW} height={kvH} rx={5} fill="none" stroke={stroke} strokeWidth={2} />
                  ))}
                </g>
              );
            })}
            {/* The cache: every key and value kept, drawn round as one. */}
            {cached > 0 ? (
              <rect
                x={X0 - 12}
                y={kvTop - 12}
                width={(slotX(PAST.length - 1) + SLOT - 18 - X0 + 24) * cached}
                height={kvH + 24}
                rx={8}
                fill="none"
                stroke={OK}
                strokeWidth={2}
                strokeDasharray="8 6"
              />
            ) : null}
          </Svg>
          {PAST.map((_, i) => {
            const cx = slotX(i) + (SLOT - 18) / 2;
            const color = redden + flash > 0.5 ? ACCENT_INK : INK;
            return (
              <div key={i} style={{ position: "absolute", left: cx - cellW - 4, top: kvTop, display: "flex", gap: 8, opacity: ease(frame, duringAt + 8 + i * 3, 10) }}>
                {["K", "V"].map((t) => (
                  <span key={t} style={{ width: cellW, height: kvH, display: "flex", alignItems: "center", justifyContent: "center", ...label(24, color), fontWeight: 500 }}>
                    {t}
                  </span>
                ))}
              </div>
            );
          })}
          <Line at={recompAt + 4} x={X0} y={kvTop + kvH + h(44)} size={28} color={ACCENT_INK} out={cachedAt}>
            Recompute them every step: <Mark at={wasteAt} color={MARK_BAD}>quadratic waste</Mark>
          </Line>
          <Line at={cachedAt + 4} x={slotX(PAST.length) + 6} y={kvTop + 8} size={28} color={OK_INK}>
            KV cache
          </Line>
          <Line at={cachedAt + 10} x={X0} y={kvTop + kvH + h(44)} size={28} color={OK_INK}>
            Computed once, then read at every step
          </Line>
        </Clear>

        {/* ── The formula, factor by factor, then the model's numbers ── */}
        <div style={{ position: "absolute", left: X0, top: formTop - h(44), opacity: ease(frame, perSeqAt, 12), ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          KV cache per sequence
          <span style={{ opacity: ease(frame, kvPairAt, 12) }}> · 2 for one key and one value</span>
        </div>
        <div style={{ position: "absolute", left: X0, top: formTop, display: "flex", alignItems: "flex-start", gap: 14, fontSize: 30 }}>
          {COLS.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: h(14), opacity: ease(frame, factorAt[i] - 4, 10), color: INK }}>
                  <MathRun>×</MathRun>
                  <MathRun style={{ opacity: ease(frame, valueAt[i], 10) }}>×</MathRun>
                </div>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: h(14), opacity: ease(frame, factorAt[i] - 4, 10), color: INK }}>
                <span style={{ fontSize: 30 }}>
                  <Mark at={factorAt[i]} out={factorAt[i + 1] ?? valueAt[0]} color={MARK}>
                    <MathRun>{c.word}</MathRun>
                  </Mark>
                </span>
                <span style={{ fontSize: 30, color: BLUE_INK, opacity: ease(frame, valueAt[i], 10) }}>
                  <Mark at={i === 2 ? shareAt : 1e9} out={ownAt + 10}>
                    <MathRun>{c.value}</MathRun>
                  </Mark>
                </span>
              </div>
            </React.Fragment>
          ))}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: h(14), color: INK, marginLeft: 6 }}>
            <span style={{ fontSize: 30, opacity: 0 }}>
              <MathRun>=</MathRun>
            </span>
            <span style={{ fontSize: 30, whiteSpace: "nowrap", opacity: ease(frame, perTokAt, 12) }}>
              <MathRun>
                = <Mark at={perTokAt + 4}>
                  <b style={{ fontWeight: 600 }}>
                    <Num>{KV.perTokenKiB}</Num> KiB
                  </b>
                </Mark>{" "}
                per token
              </MathRun>
            </span>
          </div>
        </div>

        {/* ── Part B: one long context against the weights ── */}
        <Enter at={contextAt - 2}>
          <Svg>
            <rect x={barX} y={ctxTop} width={wPx * ease(frame, weightsAt, 16)} height={h(30)} rx={4} fill={DATA} />
            <rect x={barX} y={ctxTop + h(48)} width={ctxGB * PX_PER_GB * ease(frame, fortyAt, 16)} height={h(30)} rx={4} fill={CACHE} />
          </Svg>
          <Line at={weightsAt + 6} x={barX + wPx + 18} y={ctxTop + h(1)} size={24}>
            Weights: about <Num>{KV.weightsGB}</Num> GB
          </Line>
          <Line at={fortyAt + 6} x={barX + ctxGB * PX_PER_GB + 18} y={ctxTop + h(49)} size={24}>
            One <Num>128</Num>K-token context: <Num>{KV.context128kGiB}</Num> GiB of cache
          </Line>
        </Enter>

        {/* ── The node: eight GPUs as one bar, the weights, the free part, the requests ── */}
        <Line at={gpusAt} x={barX} y={nodeTop - h(46)} size={24} color={INK}>
          <Num>{KV.gpus}</Num> × <Num>{KV.gpuGB}</Num> GB = <Num>{KV.nodeGB}</Num> GB
        </Line>
        <Line at={fitQAt - 4} x={barX} y={y(806)} size={32} color={INK_SOFT} out={fitAt - 12}>
          How many requests fit?
        </Line>
        <Svg>
          {Array.from({ length: KV.gpus }, (_, i) => {
            const p = ease(frame, gpusAt + i * 2, 10);
            if (p <= 0) return null;
            return (
              <rect
                key={i}
                x={barX + i * (gpuW + gpuGap)}
                y={nodeTop}
                width={gpuW}
                height={nodeH}
                rx={8}
                fill="none"
                stroke={INK}
                strokeWidth={2}
                opacity={p * (1 - merge)}
              />
            );
          })}
          {merge > 0 ? (
            <g opacity={merge}>
              {Array.from({ length: KV.gpus - 1 }, (_, i) => (
                <line key={i} x1={barX + (i + 1) * gpuW} x2={barX + (i + 1) * gpuW} y1={nodeTop + 6} y2={nodeTop + nodeH - 6} stroke={HAIRLINE} strokeWidth={1} />
              ))}
            </g>
          ) : null}
          {/* The free part, lit, then filled with requests' caches. */}
          <rect x={freeX + 3} y={nodeTop + 3} width={(freePx - 6) * freeIn} height={nodeH - 6} rx={4} fill={MARK} opacity={1 - 0.6 * ease(frame, fitAt, 10)} />
          <rect x={barX + 3} y={nodeTop + 3} width={(wPx - 6) * weightsIn} height={nodeH - 6} rx={4} fill={DATA} />
          {cells
            ? Array.from({ length: cells.count }, (_, k) => {
                const perRow = Math.ceil(cells.count / cells.rows);
                const r = Math.floor(k / perRow);
                const c = k % perRow;
                const cw = cells.gb * PX_PER_GB * cells.rows;
                const gap = cells.rows > 1 ? 2.4 : 4;
                const rowH = (nodeH - 10 - (cells.rows - 1) * 4) / cells.rows;
                const p = ease(frame, cellsFrom + (c / perRow) * 18, 6);
                if (p <= 0) return null;
                return (
                  <rect
                    key={k}
                    x={freeX + 4 + c * cw}
                    y={nodeTop + 5 + r * (rowH + 4)}
                    width={Math.max(1, cw - gap)}
                    height={rowH * p}
                    rx={cells.rows > 1 ? 2 : 4}
                    fill={CACHE}
                  />
                );
              })
            : null}
          {merge > 0 ? <rect x={barX} y={nodeTop} width={gpuW * KV.gpus} height={nodeH} rx={8} fill="none" stroke={INK} strokeWidth={2} opacity={merge} /> : null}
        </Svg>
        <Line at={minusAt + 6} x={barX} y={nodeTop + nodeH + h(14)} size={24} color={BLUE_INK}>
          Weights <Num>{KV.weightsGB}</Num> GB
        </Line>
        <div style={{ position: "absolute", left: freeX + 14, top: nodeTop + nodeH + h(14), opacity: ease(frame, freeAt + 4, 12), ...note(24, INK), whiteSpace: "nowrap" }}>
          <Mark at={freeAt + 6}>
            <Num>{KV.freeGB}</Num> GB free
          </Mark>
          <span style={{ color: INK_SOFT, opacity: ease(frame, at8kAt, 12) }}> · </span>
          {/* One caption per fill, stacked in one grid cell so the line keeps its place. */}
          <span style={{ display: "inline-grid", color: INK_SOFT, verticalAlign: "top" }}>
            <span style={{ gridArea: "1 / 1", opacity: cap8 }}>
              <Num>8</Num>K tokens a request: <Num>{KV.per8kGiB}</Num> GiB = <Num>{KV.per8kGB}</Num> GB each
            </span>
            <span style={{ gridArea: "1 / 1", opacity: cap128 }}>
              <Num>128</Num>K tokens a request: <Num>{KV.context128kGiB}</Num> GiB each
            </span>
            <span style={{ gridArea: "1 / 1", opacity: cap64 }}>
              <Num>8</Num>K tokens, <Num>{KV.queryHeads}</Num> KV heads: <Num>{KV.per8kNoGqaGiB}</Num> GiB each
            </span>
          </span>
        </div>

        {/* ── The count, then the long context, then grouped-query attention ── */}
        <Clear at={elevenAt - 4}>
          <Line at={fitAt} x={barX} y={y(806)} size={32}>
            At most <b style={{ color: BLUE_INK, fontWeight: 600 }}><Num>{KV.fit8k}</Num></b> requests of <Num>8</Num>K tokens
            <span style={{ color: INK_SOFT, opacity: ease(frame, fitAt + 20, 12) }}>, before activations and runtime overhead</span>
          </Line>
        </Clear>
        <Clear at={gqaAt - 4}>
          <Line at={elevenAt} x={barX} y={y(806)} size={32}>
            At <Num>128</Num>K tokens each: <b style={{ color: BLUE_INK, fontWeight: 600 }}><Num>{KV.fit128k}</Num></b>
          </Line>
        </Clear>
        <Line at={memAt} x={barX} y={y(866)} size={32}>
          <MarkAt amount={Math.max(ease(frame, goesAt, 12) * (1 - ease(frame, gqaAt, 12)), ease(frame, capsAt, 12))}>Memory caps concurrency</MarkAt>
        </Line>
        <Enter at={gqaAt}>
          <Line at={gqaAt} x={barX} y={y(806)} size={30} color={OK_INK}>
            <Num>{KV.kvHeads}</Num> KV heads (grouped-query): <b style={{ fontWeight: 600 }}><Num>{KV.fit8k}</Num></b>
          </Line>
          <VRule x={barX + 640} top={y(802)} bottom={y(854)} at={t23At} />
          <Line at={t23At} x={barX + 700} y={y(806)} size={30} color={INK}>
            <Num>{KV.queryHeads}</Num> KV heads: <b style={{ fontWeight: 600 }}><Num>{KV.fitNoGqa8k}</Num></b>
            <span style={{ color: INK_SOFT, opacity: ease(frame, not186At, 12) }}> requests of <Num>8</Num>K tokens</span>
          </Line>
        </Enter>

        {/* ── Grouped-query attention: query heads share a key and value head ── */}
        <Enter at={gqaAt}>
          <Svg>
            {Array.from({ length: KV.gqaFactor }, (_, i) => {
              const qx = qX(i);
              const p = ease(frame, gqaAt + 4 + i * 2, 10);
              const lp = ease(frame, shareAt + i * 2, 12);
              const ly = y(300) + 56;
              const tx = 1630;
              const ty = y(420) - 2;
              return (
                <g key={i}>
                  <line x1={qx + Q_W_BOX / 2} y1={ly} x2={qx + Q_W_BOX / 2 + (tx - qx - Q_W_BOX / 2) * lp} y2={ly + (ty - ly) * lp} stroke={INK} strokeWidth={2} opacity={lp} />
                  <rect x={qx} y={y(300)} width={Q_W_BOX} height={54} rx={6} fill="none" stroke={INK} strokeWidth={2} opacity={p} />
                </g>
              );
            })}
            <rect x={1562} y={y(420)} width={136} height={54} rx={8} fill="none" stroke={OK} strokeWidth={2} opacity={ease(frame, shareAt, 12)} />
          </Svg>
          {Array.from({ length: KV.gqaFactor }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: qX(i),
                top: y(300),
                width: Q_W_BOX,
                height: 54,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(22, INK),
                fontWeight: 500,
                opacity: ease(frame, gqaAt + 4 + i * 2, 10),
              }}
            >
              Q
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: 1562,
              top: y(420),
              width: 136,
              height: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...label(24, OK_INK),
              fontWeight: 500,
              opacity: ease(frame, shareAt, 12),
            }}
          >
            K, V
          </div>
          <Line at={shareAt + 10} x={1630} width={400} align="center" y={y(420) + 66} size={22} color={INK_SOFT}>
            shared by <Num>{KV.gqaFactor}</Num> query heads
          </Line>
        </Enter>
      </Drift>
    </AbsoluteFill>
  );
};
