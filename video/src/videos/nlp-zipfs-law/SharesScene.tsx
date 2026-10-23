import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, HAIRLINE, INK, INK_SOFT, note, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA, pct } from "./data";
import { DATA, DATA_INK, EMPTY, Headline, Mark, ONCE, ONCE_INK, POINT, POINT_WASH, Svg, Tag } from "./kit";

/** Every strip and bar spans the same width. */
const SX0 = 110;
const SX1 = 1720;
const SW = SX1 - SX0;
const STRIP_H = 40;
const LOG_DECADES = 4;
const LOG_TICKS = [1, 10, 100, 1000, 10000];
const PLAIN_TICKS = [1, 2000, 4000, 6000];

/**
 * Part 4: shares go on plain bars. Fig. 4 puts the top hundred ranks on two
 * rank axes: a log one, where they take half the width, and a plain one,
 * where they are 1.4% of it. Then Fig. 5 draws the two shares the law is
 * known for as plain 100% bars: the top hundred words are 60% of the book's
 * words, and 39% of its different words appear once.
 */
export const SharesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("warn").from;
  const sharesAt = n.word("warn", "bad at shares");
  const logAxisAt = n.word("warn", "log rank axis");
  const hundredAt = n.word("warn", "top hundred words");
  const halfAt = n.word("warn", "half the width");
  const plainAt = n.word("plain", "plain one");
  const pointAt = n.word("plain", "one point four percent");
  const countAt = n.word("top100", "Count what they fill");
  const sixtyAt = n.word("top100", "sixty percent");
  const sevenAt = n.word("once", "seven thousand");
  const thirtyAt = n.word("once", "thirty-nine percent");
  const onceAt = n.word("once", "appear only once");

  // ── Fig. 4 rides up, and steps back, when Fig. 5 arrives ──
  const lift = ease(frame, countAt - 6, 26);
  const fig4Dy = -lift * 52;
  const fig4O = 1 - 0.5 * ease(frame, countAt - 2, 16);

  const aTop = y(424);
  const bTop = y(560);
  const logX = (rank: number) => SX0 + (Math.log10(rank) / LOG_DECADES) * SW;
  /** A rank's slot on the plain axis: rank k spans edges k-1 to k. */
  const plainX = (edge: number) => SX0 + (edge / EMMA.distinct) * SW;
  const bandA = ease(frame, hundredAt - 2, 20);
  const bandB = ease(frame, plainAt + 4, 14);

  const cTop = y(704);
  const dTop = y(808);
  const cP = ease(frame, sixtyAt - 4, 24);
  const dP = ease(frame, thirtyAt - 4, 22);
  const onceX0 = plainX(EMMA.firstHapaxRank - 1);

  const strip = (top: number, at: number, o = 1) =>
    frame < at ? null : (
    <div
      style={{
        position: "absolute",
        left: SX0,
        top,
        width: SW * ease(frame, at, 18),
        height: STRIP_H,
        background: EMPTY,
        border: `1px solid ${HAIRLINE}`,
        boxSizing: "border-box",
        borderRadius: 4,
        opacity: o,
      }}
    />
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={from} level={-35} />
      <Sfx name="el-whoosh" at={hundredAt - 2} level={-33} />
      <Sfx name="el-tap" at={halfAt} level={-28} />
      <Sfx name="el-pencil" at={from + 14} level={-36} />
      <Sfx name="el-tap" at={pointAt} level={-28} />
      <Sfx name="el-whoosh" at={sixtyAt - 4} level={-32} />
      <Sfx name="el-tap" at={sixtyAt + 8} level={-28} />
      <Sfx name="el-whoosh" at={thirtyAt - 4} level={-32} />
      <Sfx name="el-tap" at={onceAt} level={-28} />

      <Headline at={from - 2} lead="Log axes are" turn="bad at shares." turnAt={sharesAt} out={countAt - 6} />
      <Headline at={countAt - 2} lead="A hundred words," turn="sixty percent of the book." turnAt={sixtyAt} />

      {/* ── Fig. 4: the top hundred ranks on two rank axes ── */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${fig4Dy}px)`, opacity: fig4O }}>
        <FigLabel n="4" title="The top 100 ranks, on two rank axes" at={from} x={96} y={y(318)} />

        <Tag x={SX0} y={aTop - 36} at={from + 2} size={21} weight={650}>
          rank, <Mark at={logAxisAt}>log scale</Mark>
        </Tag>
        {strip(aTop, from)}
        <div
          style={{
            position: "absolute",
            left: SX0,
            top: aTop,
            width: (logX(100) - SX0) * bandA,
            height: STRIP_H,
            background: POINT_WASH,
            borderRight: bandA > 0 ? `3px solid ${POINT}` : undefined,
            boxSizing: "border-box",
            borderRadius: "4px 0 0 4px",
          }}
        />
        <Tag x={SX0 + 14} y={aTop + 6} at={hundredAt + 4} size={21} color={INK} weight={650}>
          top 100 ranks: <Mark at={halfAt}>half the width</Mark>
        </Tag>
        <Svg opacity={ease(frame, from + 8, 12)}>
          {LOG_TICKS.map((v) => (
            <line key={v} x1={logX(v)} x2={logX(v)} y1={aTop + STRIP_H} y2={aTop + STRIP_H + 8} stroke={INK} strokeWidth={1.3} />
          ))}
        </Svg>
        {LOG_TICKS.map((v) => (
          <div key={v} style={{ position: "absolute", left: logX(v), top: aTop + STRIP_H + 12, transform: "translateX(-50%)", opacity: ease(frame, from + 8, 12), ...note(20, INK_SOFT), ...TABULAR }}>
            {fmt(v, 0)}
          </div>
        ))}

        <Tag x={SX0} y={bTop - 36} at={from + 14} size={21} weight={650}>
          rank, <Mark at={plainAt}>plain scale</Mark>
        </Tag>
        {strip(bTop, from + 12)}
        <div
          style={{
            position: "absolute",
            left: SX0,
            top: bTop,
            width: (plainX(100) - SX0) * bandB,
            height: STRIP_H,
            background: POINT,
            boxSizing: "border-box",
            borderRadius: "4px 0 0 4px",
          }}
        />
        <Tag x={plainX(100) + 16} y={bTop + 6} at={plainAt + 8} size={21} color={INK} weight={650}>
          the same 100 ranks: <Mark at={pointAt}>{pct(EMMA.top100OfDistinct, 1)}</Mark>
        </Tag>
        <Svg opacity={ease(frame, from + 20, 12)}>
          {[...PLAIN_TICKS, EMMA.distinct].map((v) => (
            <line key={v} x1={plainX(v - 0.5)} x2={plainX(v - 0.5)} y1={bTop + STRIP_H} y2={bTop + STRIP_H + 8} stroke={INK} strokeWidth={1.3} />
          ))}
        </Svg>
        {[...PLAIN_TICKS, EMMA.distinct].map((v) => (
          <div key={v} style={{ position: "absolute", left: plainX(v - 0.5), top: bTop + STRIP_H + 12, transform: "translateX(-50%)", opacity: ease(frame, from + 20, 12), ...note(20, INK_SOFT), ...TABULAR }}>
            {fmt(v, 0)}
          </div>
        ))}
      </div>

      {/* ── Fig. 5: the two shares, on plain bars ── */}
      <FigLabel n="5" title="Emma's words, as plain shares of the whole" at={countAt + 14} x={96} y={y(612)} />

      <Tag x={SX0} y={cTop - 36} at={countAt + 18} size={21} color={INK} weight={650}>
        all <span style={TABULAR}>{fmt(EMMA.words, 0)}</span> words in the book
      </Tag>
      {strip(cTop, countAt + 18)}
      <div style={{ position: "absolute", left: SX0, top: cTop, width: SW * EMMA.top100Share * cP, height: STRIP_H, background: DATA, borderRadius: "4px 0 0 4px" }} />
      <Tag x={SX0 + SW * EMMA.top100Share + 16} y={cTop + 6} at={sixtyAt} size={22} color={DATA_INK} weight={650}>
        the top 100 words: <Mark at={sixtyAt + 6}>{pct(EMMA.top100Share)}</Mark>
      </Tag>

      <Tag x={SX0} y={dTop - 36} at={sevenAt - 2} size={21} color={INK} weight={650}>
        its <span style={TABULAR}>{fmt(EMMA.distinct, 0)}</span> different words
      </Tag>
      {strip(dTop, sevenAt - 2)}
      <div
        style={{
          position: "absolute",
          left: SX1 - (SX1 - onceX0) * dP,
          top: dTop,
          width: (SX1 - onceX0) * dP,
          height: STRIP_H,
          background: ONCE,
          borderRadius: "0 4px 4px 0",
        }}
      />
      <Tag x={onceX0 - 16} y={dTop + 6} at={thirtyAt} align="right" size={22} color={ONCE_INK} weight={650}>
        <span style={TABULAR}>{fmt(EMMA.hapaxes, 0)}</span> <Mark at={onceAt}>appear only once</Mark>: {pct(EMMA.hapaxShare)}
      </Tag>
    </AbsoluteFill>
  );
};
