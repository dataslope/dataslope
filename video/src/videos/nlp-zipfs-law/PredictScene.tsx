import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, INK, INK_SOFT, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA } from "./data";
import { Bracket, DATA, DATA_INK, drift, Headline, LAW, LAW_FILL, Mark, POINT, POINT_INK, POINT_WASH, Svg, Swatch, Tag } from "./kit";

/** Table columns: right edges of rank, the prediction and the count; the
 *  word's left edge. */
const RANK_R = 150;
const WORD_L = 178;
const LAW_R = 430;
const EMMA_R = 570;
/** Each row's two bars, on one scale: the top word's count across BAR_W. */
const BX0 = 620;
const BAR_W = 1080;
const BAR_H = 15;

/**
 * Part 3: what one over the rank predicts, row by row, against Emma. Fig. 3
 * lists ranks 1 to 10 with the prediction from the top word (count(1) /
 * rank) as grey dashed bars, then Emma's counts as blue bars on the same
 * scale: "the" nearly ties with "to" where the law wants half, and "she", the
 * tenth, is 4.5 times its prediction.
 */
export const PredictScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("predict").from;
  const predictionAt = n.word("predict", "prediction");
  const halfAt = n.word("predict", "half as often");
  const tenthAt = n.word("predict", "a tenth");
  const inEmmaAt = n.word("real", "In Emma");
  const fiveAt = n.word("real", "five thousand");
  const tiesAt = n.word("real", "nearly ties");
  const tenthRealAt = n.word("rough", "tenth");
  const fourAt = n.word("rough", "more than four times");
  const roughAt = n.word("rough", "rough");

  const HEAD_Y = y(352);
  const TOP = y(402);
  const ROW = h(48);
  const rowY = (i: number) => TOP + i * ROW;
  const scale = BAR_W / EMMA.predict[0].count;
  const rowsIn = (i: number) => from + 4 + i * 3;
  const lawIn = (i: number) => predictionAt - 2 + i * 4;
  const emmaIn = (i: number) => inEmmaAt + i * 4;
  const settle = drift(frame, roughAt, 1, 90);
  const dimOthers = ease(frame, tenthRealAt - 2, 14) * 0.55;

  const tenth = EMMA.predict[9];
  const tenthLawX = BX0 + tenth.law * scale;
  const tenthEmmaX = BX0 + tenth.count * scale;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 4} level={-33} />
      <Sfx name="el-pencil" at={predictionAt - 2} level={-34} />
      <Sfx name="el-tap" at={halfAt} level={-29} />
      <Sfx name="el-tap" at={tenthAt} level={-29} />
      <Sfx name="el-whoosh" at={inEmmaAt} level={-33} />
      <Sfx name="el-tap" at={fiveAt} level={-27} />
      <Sfx name="el-pencil" at={tiesAt - 2} level={-34} />
      <Sfx name="el-pencil" at={fourAt - 2} level={-34} />

      <Headline at={from - 2} lead="The law's prediction," turn="against Emma." turnAt={inEmmaAt} out={roughAt - 6} />
      <Headline at={roughAt - 2} lead="Rough at" turn="the very top." turnAt={roughAt + 6} />

      <FigLabel n="3" title="Emma's top ten, against one over the rank" at={from} x={96} y={y(286)} />
      <Ink at={predictionAt} style={{ left: 1824 - 520, top: y(286) + 2, width: 520, display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center", whiteSpace: "nowrap" }}>
        <Swatch color={LAW} dashed />
        <span style={{ ...note(21, INK_SOFT), fontWeight: 600 }}>predicted</span>
        <span style={{ width: 14 }} />
        <span style={{ opacity: ease(frame, inEmmaAt - 2, 10), display: "inline-flex", gap: 12, alignItems: "center" }}>
          <Swatch color={DATA} />
          <span style={{ ...note(21, DATA_INK), fontWeight: 600 }}>Emma</span>
        </span>
      </Ink>

      {/* ── Column heads ── */}
      {[
        { x: RANK_R, align: "right" as const, text: "rank", at: from + 2 },
        { x: WORD_L, align: "left" as const, text: "word", at: from + 4 },
        { x: LAW_R, align: "right" as const, text: "predicted", at: predictionAt - 4 },
        { x: EMMA_R, align: "right" as const, text: "Emma", at: inEmmaAt - 4 },
      ].map((c) => (
        <Tag key={c.text} x={c.x} y={HEAD_Y} at={c.at} align={c.align} size={21} weight={650}>
          {c.text}
        </Tag>
      ))}
      <Svg opacity={ease(frame, from + 2, 12)}>
        <line x1={96} x2={BX0 + BAR_W} y1={HEAD_Y + 38} y2={HEAD_Y + 38} stroke={INK} strokeWidth={1.4} />
      </Svg>

      {/* ── Rows ── */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${settle}px)` }}>
        {/* The tenth row, washed as it is named (behind its text). */}
        <Svg opacity={ease(frame, tenthRealAt - 2, 12)}>
          <rect x={86} y={rowY(9) - 6} width={BX0 + BAR_W - 76} height={ROW - 2} rx={6} fill={POINT_WASH} opacity={0.5} />
        </Svg>
        {EMMA.predict.map((r, i) => {
          const top = rowY(i);
          const isTenth = i === 9;
          const o = isTenth ? 1 : 1 - dimOthers;
          const lawP = ease(frame, lawIn(i), 14);
          const emmaP = ease(frame, emmaIn(i), 16);
          const cell = (x: number, align: "left" | "right", at: number, child: React.ReactNode) => (
            <Ink at={at} dur={12} style={{ left: align === "left" ? x : x - 160, width: 160, top: top + 2, textAlign: align }}>
              {child}
            </Ink>
          );
          const lawText = fmt(r.law, 0);
          const emmaText = fmt(r.count, 0);
          return (
            <div key={r.rank} style={{ position: "absolute", inset: 0, opacity: o }}>
              {cell(RANK_R, "right", rowsIn(i), <span style={{ ...note(24, INK_SOFT), ...TABULAR }}>{r.rank}</span>)}
              {cell(WORD_L, "left", rowsIn(i), <span style={{ ...note(24, INK), fontWeight: 600 }}>{r.word}</span>)}
              {cell(
                LAW_R,
                "right",
                lawIn(i),
                <span style={{ ...note(24, INK_SOFT), ...TABULAR }}>
                  {i === 1 ? <Mark at={halfAt}>{lawText}</Mark> : i === 9 ? <Mark at={tenthAt}>{lawText}</Mark> : lawText}
                </span>,
              )}
              {cell(
                EMMA_R,
                "right",
                emmaIn(i),
                <span style={{ ...note(24, DATA_INK), fontWeight: 600, ...TABULAR }}>
                  {i === 1 ? <Mark at={fiveAt}>{emmaText}</Mark> : emmaText}
                </span>,
              )}
              <Svg>
                {lawP > 0 ? (
                  <rect
                    x={BX0}
                    y={top + 3}
                    width={r.law * scale * lawP}
                    height={BAR_H}
                    rx={2}
                    fill={LAW_FILL}
                    stroke={LAW}
                    strokeWidth={1.8}
                    strokeDasharray="6 4"
                  />
                ) : null}
                {emmaP > 0 ? <rect x={BX0} y={top + 3 + BAR_H + 5} width={r.count * scale * emmaP} height={BAR_H} rx={2} fill={DATA} /> : null}
              </Svg>
            </div>
          );
        })}

        {/* The near tie: the top two counts, ringed. */}
        <Svg opacity={ease(frame, tiesAt - 2, 12)}>
          <rect
            x={EMMA_R - 92}
            y={rowY(0) - 4}
            width={104}
            height={ROW + 40}
            rx={20}
            fill="none"
            stroke={POINT}
            strokeWidth={2.6}
            pathLength={1}
            strokeDasharray={`${ease(frame, tiesAt - 2, 16)} 1`}
          />
        </Svg>
        <Tag x={EMMA_R + 26} y={rowY(0) + ROW * 0.5 + 2} at={tiesAt} size={21} color={POINT_INK} weight={650}>
          nearly tied
        </Tag>

        {/* The tenth: the gap from prediction to count. */}
        <Bracket x0={tenthLawX} x1={tenthEmmaX} y={rowY(9) - 2} at={fourAt - 2} color={POINT} tick={8} up={false} />
        <Tag x={tenthEmmaX + 18} y={rowY(9) + 6} at={fourAt} size={22} color={POINT_INK} weight={700}>
          {(Math.round(EMMA.tenthOverLaw * 10) / 10).toFixed(1)}× the prediction
        </Tag>
      </div>
    </AbsoluteFill>
  );
};
