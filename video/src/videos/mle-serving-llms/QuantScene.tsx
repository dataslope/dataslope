import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { KV, QUANT, SPECULATIVE } from "./data";
import {
  ACCENT,
  ACCENT_INK,
  Box,
  OK,
  Bracket,
  CACHE,
  Clear,
  DATA,
  Drift,
  Enter,
  Flow,
  IDLE,
  IDLE_INK,
  Line,
  Mark,
  OK_INK,
  Q_SIZE,
  Q_W,
  Spot,
  Strike,
  Svg,
  tokenStyle,
  VRule,
  X0,
} from "./parts";

/** The weight blocks' scale: GB to px. */
const PX_BLOCK = 4;
/** One GPU's scale: 80 GB across 400 px. */
const PX_GPU = 5;
const SLOT = 150;
const DRAFT = ["the", "next", "word", "fast"];
const TPP = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/**
 * Question 4: quantization's three widths (16, 8 and 4 bits), the quarter of
 * the bytes each decode step reads at 4 bits, the 35 GB that fit one GPU with
 * room for 16 requests, and the price in quality. Then speculative decoding:
 * a draft proposes four tokens, one pass of the large model checks them,
 * accepted until the first miss ("q4-verify": the rejected draft stays red
 * and struck, the one after it greys, "dropped", and the large model's own
 * token takes the miss's place); the simulation's tokens per pass at two
 * acceptance rates; and the draft's own cost, where a draft that is usually
 * wrong can lose (said of no row: 1.9 tokens a pass is still a gain unless
 * the draft is expensive).
 */
export const QuantScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "What do quantization and speculative decoding trade");
  const storesAt = n.word("q4", "Quantization stores the weights");
  const kvAt = n.word("q4", "sometimes the KV cache");
  const bitsAt = n.word("q4", "eight or four instead of sixteen");
  const bandAt = n.word("q4-bytes", "Decode is bound by bandwidth");
  const fasterAt = n.word("q4-bytes", "makes it faster");
  const w140At = n.word("q4-bytes", "about a hundred and forty gigabytes");
  const w35At = n.word("q4-bytes", "to thirty-five");
  const quarterAt = n.word("q4-bytes", "a quarter of the weight bytes");
  const fitAt = n.word("q4-fit", "They'd fit on one of those GPUs");
  const sixteenAt = n.word("q4-fit", "sixteen eight K requests");
  const priceAt = n.word("q4-risk", "The price is quality");
  const slipsAt = n.word("q4-risk", "slips on reasoning and rare cases");
  const perplexAt = n.word("q4-risk", "before it shows in average perplexity");
  const kernelsAt = n.word("q4-risk", "may lack fast kernels");
  const evalAt = n.word("q4-risk", "So evaluate on your own task");
  const genericAt = n.word("q4-risk", "not a generic benchmark");
  const specAt = n.word("q4-spec", "Speculative decoding lets a small draft model");
  const proposeAt = n.word("q4-spec", "propose several tokens");
  const verifyAt = n.word("q4-spec", "the large model verify them all");
  const stepAt = n.word("q4-spec", "costs about one decode step");
  const dominatesAt = n.word("q4-spec", "reading the weights dominates");
  const rejectsAt = n.word("q4-verify", "the first one it rejects");
  const dropsAt = n.word("q4-verify", "drops the rest");
  const ownAt = n.word("q4-verify", "one token of its own");
  const ruleAt = n.word("q4-rule", "With the standard acceptance rule");
  const distAt = n.word("q4-rule", "the output distribution doesn't change");
  const notPriceAt = n.word("q4-rule", "so quality isn't the price");
  const dependsAt = n.word("q4-sim", "The speedup depends on how often the draft is right");
  const simAt = n.word("q4-sim", "In a simulation with four-token drafts");
  const nineAt = n.word("q4-sim", "accepted nine times in ten");
  const fourTokAt = n.word("q4-sim", "yields about four tokens");
  const halfAt = n.word("q4-sim", "At half, under two");
  const costAt = n.word("q4-cost", "the draft model costs time and memory");
  const predictAt = n.word("q4-cost", "helps most on predictable text");
  const loseAt = n.word("q4-cost", "can lose where the draft is usually wrong");
  const end = n.beat("q4-cost").to;

  const clearA = specAt - 8;

  // ── Part A: the weights at 16, 8 and 4 bits ──
  const blockTop = y(332);
  const blockH = h(104);
  const widths = [QUANT.weights16GB, QUANT.weights8GB, QUANT.weights4GB].map((gb) => gb * PX_BLOCK);
  const bx = [X0, X0 + widths[0] + 80, X0 + widths[0] + widths[1] + 160];
  const blockAt = [storesAt, bitsAt, bitsAt + 8];
  const bits = [16, 8, 4];
  const gbLabel = [
    <>
      about <Num>{QUANT.weights16GB}</Num> GB
    </>,
    <>
      <Num>{QUANT.weights8GB}</Num> GB
    </>,
    <>
      <Num>{QUANT.weights4GB}</Num> GB
    </>,
  ];
  const gbAt = [w140At, w35At + 6, w35At];

  // One GPU: 4-bit weights and 16 requests, beside 16-bit weights that overflow it.
  const gpuTop = y(622);
  const gpuH = h(60);
  const gpuW = KV.gpuGB * PX_GPU;
  const gpu2X = 860;
  const cellW = (KV.per8kBytes / 1e9) * PX_GPU;
  const riskTop = y(756);

  // ── Part B: a draft, checked in one pass ──
  const draftY = y(330);
  const largeY = y(452);
  const tokX = (i: number) => 470 + i * SLOT;
  const verdict = (i: number) => ease(frame, verifyAt + 10 + i * 6, 10);
  const simTop = y(716);
  const SQ = 38;
  const rows = [
    { label: "Plain decode step", tpp: 1, at: simAt, tone: IDLE },
    { label: "Draft accepted 9 in 10", tpp: SPECULATIVE.runs[0].tokensPerPass, at: nineAt, tone: DATA },
    { label: "Draft accepted 1 in 2", tpp: SPECULATIVE.runs[1].tokensPerPass, at: halfAt, tone: DATA },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={storesAt} level={-32} />
      <Sfx name="el-tap" at={bitsAt} level={-32} />
      <Sfx name="el-tap" at={bitsAt + 8} level={-32} />
      <Sfx name="el-pencil" at={quarterAt} level={-36} />
      <Sfx name="el-sprinkle" at={sixteenAt} level={-32} />
      <Sfx name="el-tap" at={slipsAt} level={-33} />
      <Sfx name="el-tap" at={perplexAt} level={-33} />
      <Sfx name="el-chime" at={evalAt + 6} level={-34} />
      <Sfx name="el-whoosh" at={clearA} level={-37} />
      <Sfx name="el-pop" at={specAt + 4} level={-30} />
      <Sfx name="el-sprinkle" at={proposeAt} level={-34} />
      <Sfx name="el-tap" at={verifyAt + 10} level={-33} />
      <Sfx name="el-tap" at={verifyAt + 16} level={-33} />
      <Sfx name="el-scratch" at={rejectsAt + 4} level={-34} />
      <Sfx name="el-tap" at={ownAt + 2} level={-32} />
      <Sfx name="el-pencil" at={stepAt} level={-36} />
      <Sfx name="el-tap" at={fourTokAt} level={-31} />
      <Sfx name="el-tap" at={halfAt} level={-31} />
      <Sfx name="el-pencil" at={loseAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What do quantization and speculative decoding trade?
        </QuestionCard>

        {/* ── Part A: quantization ── */}
        <Clear at={clearA}>
          <Svg>
            {widths.map((w, i) => (
              <rect key={i} x={bx[i]} y={blockTop} width={w * ease(frame, blockAt[i], 16)} height={blockH} rx={5} fill={DATA} />
            ))}
          </Svg>
          {bits.map((b, i) => (
            <Line key={b} at={blockAt[i] - 2} x={bx[i]} y={blockTop - h(42)} size={24} color={INK}>
              <Num>{b}</Num>-bit
            </Line>
          ))}
          {gbLabel.map((g, i) => (
            <Line key={i} at={gbAt[i]} x={bx[i]} y={blockTop + blockH + h(12)} size={24} color={INK}>
              {g}
            </Line>
          ))}
          <Line at={kvAt} x={bx[2] + widths[2] + 60} y={blockTop + h(18)} size={22} color={INK_SOFT}>
            The weights,
          </Line>
          <Line at={kvAt + 4} x={bx[2] + widths[2] + 60} y={blockTop + h(52)} size={22} color={INK_SOFT}>
            sometimes the KV cache
          </Line>
          <Line at={quarterAt} x={X0} y={y(512)} size={26} color={INK}>
            Decode is bandwidth-bound: at <Num>4</Num> bits, each step reads <Mark at={quarterAt + 4}>¼ of the weight bytes</Mark>
          </Line>
          <Line at={bandAt} x={X0} y={y(512)} size={26} color={INK} out={quarterAt - 4}>
            Decode is bandwidth-bound:<span style={{ opacity: ease(frame, fasterAt, 10) }}> fewer bytes, faster as well as smaller</span>
          </Line>

          {/* One GPU: 35 GB of weights and sixteen 8K requests; 140 GB does not fit. */}
          <Line at={w35At} x={X0} y={gpuTop - h(42)} size={24} color={INK}>
            One <Num>{KV.gpuGB}</Num> GB GPU, <Num>4</Num>-bit weights
          </Line>
          <Line at={w140At} x={gpu2X} y={gpuTop - h(42)} size={24} color={IDLE_INK}>
            The same GPU, <Num>16</Num>-bit weights
          </Line>
          <Svg>
            <g opacity={ease(frame, w35At, 12)}>
              <rect x={X0 + 3} y={gpuTop + 3} width={(QUANT.weights4GB * PX_GPU - 3) * ease(frame, w35At + 4, 14)} height={gpuH - 6} rx={4} fill={DATA} />
              {Array.from({ length: QUANT.oneGpu4bit }, (_, k) => (
                <rect
                  key={k}
                  x={X0 + QUANT.weights4GB * PX_GPU + 3 + k * cellW}
                  y={gpuTop + 3}
                  width={cellW - 2.5}
                  height={(gpuH - 6) * ease(frame, sixteenAt + k * 1.5, 6)}
                  rx={2}
                  fill={CACHE}
                />
              ))}
              <rect x={X0} y={gpuTop} width={gpuW} height={gpuH} rx={8} fill="none" stroke={`color-mix(in srgb, ${OK} ${ease(frame, fitAt, 12) * 100}%, ${INK})`} strokeWidth={2} />
            </g>
            <g opacity={ease(frame, w140At, 12)}>
              <rect x={gpu2X + 3} y={gpuTop + 3} width={(QUANT.weights16GB * PX_GPU - 3) * ease(frame, w140At + 4, 22)} height={gpuH - 6} rx={4} fill={IDLE} />
              <rect x={gpu2X} y={gpuTop} width={gpuW} height={gpuH} rx={8} fill="none" stroke={INK} strokeWidth={2} />
            </g>
          </Svg>
          <Line at={w35At + 8} x={X0} y={gpuTop + gpuH + h(12)} size={24} color={INK}>
            <Num>{QUANT.weights4GB}</Num> GB of weights
            <span style={{ color: OK_INK, opacity: ease(frame, sixteenAt, 10) }}>
              , room for <Num>{QUANT.oneGpu4bit}</Num> requests of <Num>8</Num>K tokens
            </span>
          </Line>
          <Line at={w140At + 20} x={gpu2X} y={gpuTop + gpuH + h(12)} size={24} color={IDLE_INK}>
            <Num>{QUANT.weights16GB}</Num> GB of weights: over the <Num>{KV.gpuGB}</Num> GB
          </Line>

          {/* The price. */}
          <Line at={priceAt} x={X0} y={riskTop} size={24} color={INK_SOFT}>
            The price is quality
          </Line>
          <Line at={slipsAt} x={X0} y={riskTop + h(42)} size={26} color={ACCENT_INK}>
            Reasoning and rare cases slip first
          </Line>
          <Line at={perplexAt} x={X0} y={riskTop + h(84)} size={26} color={ACCENT_INK}>
            Average perplexity can still look fine
          </Line>
          <Line at={kernelsAt} x={X0} y={riskTop + h(126)} size={26} color={INK}>
            Fast kernels may be missing for the format
          </Line>
          <VRule x={880} top={riskTop + h(40)} bottom={riskTop + h(160)} at={evalAt} />
          <Line at={evalAt} x={940} y={riskTop + h(42)} size={30} color={OK_INK}>
            Evaluate on your own task
          </Line>
          <Line at={genericAt} x={940} y={riskTop + h(90)} size={26} color={INK}>
            not a generic benchmark
          </Line>
        </Clear>

        {/* ── Part B: speculative decoding ── */}
        <Enter at={clearA + 6}>
          <Box x={X0} y={draftY - 2} w={230} h={52} at={specAt} title="Draft model" size={24} />
          <Flow points={[[X0 + 236, draftY + 24], [tokX(0) - 12, draftY + 24]]} at={proposeAt - 4} />
          {DRAFT.map((t, i) => {
            // The verify step, held: the first rejected draft in red and
            // struck (the error), the one after it grey (dropped, not wrong).
            const bad = i === 2 ? ease(frame, rejectsAt, 10) : 0;
            const gone = i === 3 ? ease(frame, dropsAt, 10) : 0;
            const edge = bad > 0 ? `color-mix(in srgb, ${ACCENT} ${bad * 100}%, ${ds("blue", 400)})` : gone > 0 ? `color-mix(in srgb, ${ds("gray", 400)} ${gone * 100}%, ${ds("blue", 400)})` : ds("blue", 400);
            const ink = bad > 0 ? `color-mix(in srgb, ${ACCENT_INK} ${bad * 100}%, ${ds("blue", 500)})` : gone > 0 ? `color-mix(in srgb, ${IDLE_INK} ${gone * 100}%, ${ds("blue", 500)})` : ds("blue", 500);
            return (
              <div key={t} style={{ position: "absolute", left: tokX(i), width: SLOT - 20, top: draftY, display: "flex", justifyContent: "center", fontSize: 28 }}>
                <span style={{ ...tokenStyle("pale", 28), color: ink, background: "transparent", opacity: ease(frame, proposeAt + i * 5, 8), border: `2px dashed ${edge}`, padding: "4px 11px" }}>
                  {i === 2 ? <Strike at={rejectsAt + 4}>{t}</Strike> : t}
                </span>
              </div>
            );
          })}
          <Box x={X0} y={largeY - 8} w={230} h={68} at={verifyAt} title="Large model" sub="one forward pass" size={24} subSize={20} />
          <Flow points={[[X0 + 236, largeY + 24], [tokX(0) - 12, largeY + 24]]} at={verifyAt + 4} />
          {["the", "next", "tokens"].map((t, i) => {
            const p = i < 2 ? verdict(i) : ease(frame, ownAt, 12);
            return (
              <div key={t} style={{ position: "absolute", left: tokX(i), width: SLOT - 20, top: largeY, display: "flex", justifyContent: "center", fontSize: 28, opacity: p }}>
                <span style={{ ...tokenStyle("ok", 28), transform: `translateY(${(1 - p) * 10}px)` }}>{t}</span>
              </div>
            );
          })}
          {/* Ticks over the two it keeps; the first miss is replaced by its own token, the rest dropped. */}
          {[0, 1].map((i) =>
            verdict(i) > 0 ? (
              <div key={i} style={{ position: "absolute", left: tokX(i) + (SLOT - 20) / 2 - 13, top: largeY - h(34) }}>
                <Tick at={verifyAt + 10 + i * 6} size={26} />
              </div>
            ) : null,
          )}
          <Line at={rejectsAt + 4} out={ownAt - 6} x={tokX(2) + (SLOT - 20) / 2} width={240} align="center" y={largeY - h(34)} size={21} color={ACCENT_INK}>
            rejected
          </Line>
          <Line at={ownAt} x={tokX(2) + (SLOT - 20) / 2} width={240} align="center" y={largeY - h(34)} size={21} color={OK_INK}>
            its own token
          </Line>
          <Line at={dropsAt + 4} x={tokX(3) + (SLOT - 20) / 2} width={240} align="center" y={largeY - h(34)} size={21} color={IDLE_INK}>
            dropped
          </Line>
          <Bracket x1={tokX(0) + 10} x2={tokX(3) + SLOT - 30} y={largeY + h(72)} at={stepAt} />
          <Line at={stepAt + 4} x={tokX(0) + 10} y={largeY + h(88)} size={26} color={INK}>
            <Mark at={stepAt + 6}>About one decode step:</Mark>
            <span style={{ opacity: ease(frame, dominatesAt, 10) }}> one read of the weights</span>
          </Line>
          <Line at={distAt} x={X0} y={y(590)} size={28} color={OK_INK}>
            Same output distribution
            <span style={{ color: INK, opacity: ease(frame, notPriceAt, 10) }}>, so quality isn&apos;t the price</span>
          </Line>
          <Line at={ruleAt} x={X0} y={y(590)} size={28} color={INK_SOFT} out={distAt - 4}>
            The standard acceptance rule
          </Line>

          {/* The simulation: tokens per pass of the large model. */}
          <Line at={simAt} x={X0} y={simTop - h(44)} size={22} color={INK_SOFT}>
            Simulation, <Num>4</Num>-token drafts: tokens per pass, the accepted drafts plus its own
          </Line>
          <Line at={dependsAt} x={X0} y={simTop - h(44)} size={22} color={INK_SOFT} out={simAt - 4}>
            The speedup depends on how often the draft is right
          </Line>
          <Svg>
            {rows.map((r, j) => {
              const p = ease(frame, r.at, 18);
              const whole = Math.floor(r.tpp);
              const frac = r.tpp - whole;
              return (
                <g key={j} opacity={Math.min(1, p * 2)}>
                  {Array.from({ length: Math.ceil(r.tpp) }, (_, k) => {
                    const w = k < whole ? SQ : SQ * frac;
                    const show = ease(frame, r.at + k * 4, 8);
                    return <rect key={k} x={480 + k * (SQ + 8)} y={simTop + j * h(52)} width={w * show} height={SQ} rx={5} fill={r.tone} />;
                  })}
                </g>
              );
            })}
          </Svg>
          {rows.map((r, j) => {
            return (
              <React.Fragment key={j}>
                <Line at={r.at} x={X0} y={simTop + j * h(52) + 4} size={24} color={j === 0 ? IDLE_INK : INK}>
                  {r.label}
                </Line>
                <Line at={j === 1 ? fourTokAt : r.at + 16} x={480 + 5 * (SQ + 8) + 10} y={simTop + j * h(52) + 4} size={24} color={j === 0 ? IDLE_INK : INK}>
                  {j === 0 ? (
                    <>
                      <Num>1</Num> token
                    </>
                  ) : (
                    <>
                      about <Num>{TPP(r.tpp)}</Num> tokens
                    </>
                  )}
                  {j === 1 ? <span style={{ color: OK_INK, opacity: ease(frame, predictAt, 10) }}> · predictable text: helps most</span> : null}
                </Line>
              </React.Fragment>
            );
          })}
          <Line at={costAt} x={X0} y={simTop + 3 * h(52) + h(16)} size={24} color={INK}>
            The draft model costs time and memory of its own
            <span style={{ opacity: ease(frame, loseAt, 10) }}>
              , <span style={{ color: ACCENT_INK }}>so a draft that is usually wrong can lose</span>
            </span>
          </Line>
        </Enter>

        <Spot id="pencil" at={specAt + 4} x={1480} y={y(310)} w={190} />
      </Drift>
    </AbsoluteFill>
  );
};

