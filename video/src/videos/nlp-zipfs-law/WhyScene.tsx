import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { EMMA, pct } from "./data";
import { DATA_INK, EMPTY, Headline, Mark, POINT, POINT_INK, Spot, Strike, Tag } from "./kit";

/** The top hundred as a 10 by 10 grid of word chips, in rank order. */
const GX = 96;
const CHIP_W = 126;
const CHIP_H = 38;
const COL = CHIP_W + 6;
/** The two spots, in a column on the right. */
const SPOT_X = 1470;
const SPOT = 230;

/**
 * Part 5: why it matters. Emma's top hundred words, the few that fill 60% of
 * the book (Fig. 6), with the seventy on NLTK's English stopword list struck
 * out in red as they are counted, leaving the book's own words in blue; a
 * sieve for stopwords (blue pebbles kept, red grit through) and a balance for
 * IDF (a blue gem outweighs a red heap), each named as it is said.
 */
export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("why").from;
  const stopwordsAt = n.word("why", "stopwords exist");
  const fillAt = n.word("why", "fill most");
  const leastAt = n.word("why", "say the least");
  const seventyAt = n.word("stop", "Seventy");
  const listAt = n.word("stop", "stopword list");
  const idfAt = n.word("idf", "IDF");
  const weightAt = n.word("idf", "more weight");
  const fewerAt = n.word("idf", "fewer documents");

  const GY = y(352);
  const ROW = 50;
  const chipAt = (i: number) => from + 2 + Math.floor(i / 10) * 4 + (i % 10);
  // The stopwords are struck in rank order, quickly, as the seventy is said.
  const stops = EMMA.top100Words.map(([, s]) => s);
  const stopIndex = stops.map((s, i) => (s ? stops.slice(0, i).filter(Boolean).length : -1));
  const strikeAt = (k: number) => seventyAt + Math.round(k * 0.6);
  const gridBottom = GY + 9 * ROW + CHIP_H;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 2} level={-32} />
      <Sfx name="el-pop" at={stopwordsAt - 2} level={-29} />
      <Sfx name="el-scratch" at={seventyAt} level={-31} />
      <Sfx name="el-pop" at={idfAt - 2} level={-29} />
      <Sfx name="el-chime" at={n.beat("idf").to + 8} level={-32} />

      <Headline at={from - 2} lead="A few words fill" turn="most of the text." turnAt={fillAt} />

      <FigLabel n="6" title="The novel's top 100 words, in rank order" at={from} x={96} y={y(286)} />

      {/* ── The grid ── */}
      {EMMA.top100Words.map(([w, isStop], i) => {
        const p = ease(frame, chipAt(i), 10);
        if (p <= 0) return null;
        const struck = isStop ? ease(frame, strikeAt(stopIndex[i]) + 6, 12) : 0;
        const kept = isStop ? 0 : ease(frame, listAt, 14);
        return (
          <div
            key={w}
            style={{
              position: "absolute",
              left: GX + (i % 10) * COL,
              top: GY + Math.floor(i / 10) * ROW + (1 - p) * 10,
              width: CHIP_W,
              height: CHIP_H,
              boxSizing: "border-box",
              borderRadius: 6,
              border: `1px solid ${HAIRLINE}`,
              background: kept > 0 ? `color-mix(in srgb, ${EMPTY} ${100 - 60 * kept}%, ${PAPER})` : EMPTY,
              boxShadow: kept > 0 ? `inset 0 0 0 ${2 * kept}px color-mix(in srgb, ${DATA_INK} 70%, transparent)` : undefined,
              opacity: p * (1 - 0.55 * struck),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontSize: 20,
              fontWeight: 600,
              color: kept > 0 ? DATA_INK : INK,
            }}
          >
            {isStop ? <Strike at={strikeAt(stopIndex[i])} color={POINT}>{w}</Strike> : w}
          </div>
        );
      })}
      <Tag x={GX} y={gridBottom + 18} at={fillAt} size={21} color={INK} weight={650}>
        these 100 are <span style={TABULAR}>{pct(EMMA.top100Share)}</span> of the book
        <span style={{ opacity: ease(frame, seventyAt, 12), color: POINT_INK }}>
          {" "}
          · <span style={TABULAR}>{EMMA.top100Stop}</span> are on <Mark at={listAt}>NLTK&apos;s stopword list</Mark>
        </span>
      </Tag>

      {/* ── Stopwords and IDF ── */}
      <Spot id="nlp-zipfs-law-sieve" at={stopwordsAt - 2} left={SPOT_X} top={y(340)} width={SPOT} height={SPOT} />
      <Tag x={SPOT_X + SPOT / 2} y={y(340) + SPOT + 8} at={stopwordsAt + 2} align="center" size={22} color={INK} weight={650}>
        drop the <Mark at={leastAt}>stopwords</Mark>
      </Tag>
      <Spot id="nlp-zipfs-law-balance" at={idfAt - 2} left={SPOT_X} top={y(640)} width={SPOT} height={SPOT} />
      <Tag x={SPOT_X + SPOT / 2} y={y(640) + SPOT + 8} at={idfAt + 2} align="center" size={22} color={INK} weight={650} style={{ textAlign: "center" }}>
        IDF: <Mark at={weightAt}>more weight</Mark>
        <br />
        the <Mark at={fewerAt}>fewer documents</Mark>
      </Tag>
      <div
        style={{
          position: "absolute",
          left: SPOT_X - 44,
          top: y(340),
          width: 1,
          height: y(640) + SPOT + 40 - y(340),
          background: HAIRLINE,
          opacity: ease(frame, from + 6, 14) * 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
