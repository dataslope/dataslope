import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { LAYERS } from "./data";
import { Arrow, BAD, Chip, chipWidth, Drift, FIG_Y, Headline, Kicker, Mark, X0 } from "./parts";

const BOX_W = 292;
const GAP = 55;
const BOX_Y = 336;
const BOX_H = 232;
const CHIP = 21;

/** One layer of the lesson's diagram: a framed box, its name and gloss at the
 *  top, its example below. */
const Layer: React.FC<{
  x: number;
  top: number;
  height: number;
  at: number;
  name: string;
  gloss?: string;
  children?: React.ReactNode;
}> = ({ x, top, height, at, name, gloss, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: BOX_W,
        height,
        boxSizing: "border-box",
        border: `2px solid ${INK}`,
        borderRadius: 12,
        background: PAPER,
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      <div style={{ position: "absolute", left: 20, top: 18, ...label(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>{name}</div>
      {gloss ? <div style={{ position: "absolute", left: 20, top: 56, ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>{gloss}</div> : null}
      {children}
    </div>
  );
};

/** Chips in a row, centred in a layer box, each with an optional tag under it. */
const ChipRow: React.FC<{ words: readonly string[]; at: number; top: number; tags?: readonly string[]; tagAt?: number }> = ({
  words,
  at,
  top,
  tags,
  tagAt = at,
}) => {
  const frame = useCurrentFrame();
  const ws = words.map((w) => chipWidth(w, CHIP));
  const total = ws.reduce((a, b) => a + b, 0) + 8 * (ws.length - 1);
  let x = (BOX_W - 4 - total) / 2;
  return (
    <>
      {words.map((w, i) => {
        const left = x;
        x += ws[i] + 8;
        return (
          <React.Fragment key={i}>
            <Chip text={w} x={left} y={top} at={at + i * 3} size={CHIP} />
            {tags ? (
              <div
                style={{
                  position: "absolute",
                  left,
                  width: ws[i],
                  top: top + 46,
                  textAlign: "center",
                  ...note(19, INK_SOFT),
                  fontStyle: "italic",
                  opacity: ease(frame, tagAt + i * 3, 10),
                }}
              >
                {tags[i]}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

/**
 * Part 2 opens: what an NLP system does. The lesson's layers, characters to
 * counts, each shown on three words of the pipeline sentence (tokens,
 * lowercased, tagged by NLTK; the sentence's most common words), then the
 * caution that none of it understands anything.
 */
export const LayersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("layers").from;
  const layersAt = n.word("layers", "layers");
  const charsAt = n.word("layers", "Characters");
  const tokensAt = n.word("layers", "tokens");
  const normalizedAt = n.word("layers-up", "normalized");
  const taggedAt = n.word("layers-up", "tagged");
  const speechAt = n.word("layers-up", "part of speech");
  const countsAt = n.word("layers-up", "counts");
  const noneAt = n.word("understand", "None");
  const textAt = n.word("understand", "the text", { edge: "end" });
  const verbs = [n.word("understand", "counts"), n.word("understand", "matches"), n.word("understand", "transforms")];
  const spamAt = n.word("understand", "spam filter");
  const meanAt = n.word("understand", "mean");
  const end = n.beat("rules").from;

  const boxX = (i: number) => X0 + i * (BOX_W + GAP);
  const top = y(BOX_Y);
  const height = h(BOX_H);
  const at = [charsAt - 4, tokensAt - 4, normalizedAt - 4, taggedAt - 4, countsAt - 4];
  const exTop = height - 98;
  const strike = ease(frame, textAt, 12);
  const UNDER_Y = 680;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      {at.map((t, i) => (
        <Sfx key={i} name="el-pop" at={t + 2} level={-32} />
      ))}
      <Sfx name="el-scratch" at={textAt} level={-33} />
      {verbs.map((t) => (
        <Sfx key={t} name="el-tap" at={t} level={-32} />
      ))}

      <Kicker at={from - 10}>What an NLP system does</Kicker>
      <Headline lead="Structure," turn="added in layers." at={from - 6} turnAt={layersAt - 6} />

      <Drift from={from} to={end} amount={0.012} origin="50% 45%">
        <FigLabel n="7" title="From characters to counts, on three words of one sentence" at={from + 2} x={X0} y={y(FIG_Y)} />
        {at.slice(1).map((t, i) => (
          <Arrow key={i} from={[boxX(i) + BOX_W + 8, top + height / 2]} to={[boxX(i + 1) - 8, top + height / 2]} at={t - 6} dur={10} />
        ))}

        <Layer x={boxX(0)} top={top} height={height} at={at[0]} name="Characters" gloss="one flat string">
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: exTop + 6,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 21,
              color: INK,
              whiteSpace: "pre",
              opacity: ease(frame, at[0] + 6, 10),
            }}
          >
            "{LAYERS.chars}"
          </div>
        </Layer>
        <Layer x={boxX(1)} top={top} height={height} at={at[1]} name="Tokens" gloss="words">
          <ChipRow words={LAYERS.tokens} at={at[1] + 6} top={exTop} />
        </Layer>
        <Layer x={boxX(2)} top={top} height={height} at={at[2]} name="Normalized" gloss="lowercased, cleaned">
          <ChipRow words={LAYERS.normalized} at={at[2] + 6} top={exTop} />
        </Layer>
        <Layer x={boxX(3)} top={top} height={height} at={at[3]} name="Tagged" gloss="part of speech">
          <ChipRow words={LAYERS.normalized} at={at[3] + 6} top={exTop - 18} tags={LAYERS.tagNames} tagAt={speechAt} />
        </Layer>
        <Layer x={boxX(4)} top={top} height={height} at={at[4]} name="Counts" gloss="frequencies, n-grams">
          {LAYERS.counts.map(([w, c], i) => (
            <div
              key={w}
              style={{
                position: "absolute",
                left: 70,
                width: BOX_W - 140,
                top: exTop - 22 + i * 34,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: MONO,
                fontSize: 21,
                color: INK,
                opacity: ease(frame, at[4] + 6 + i * 3, 10),
              }}
            >
              <span>{w}</span>
              <span style={{ ...TABULAR, fontWeight: 700 }}>{c}</span>
            </div>
          ))}
        </Layer>

        {/* ── None of it understands ── */}
        <div style={{ position: "absolute", left: X0, top: y(UNDER_Y), display: "flex", alignItems: "baseline", gap: 40, whiteSpace: "nowrap" }}>
          <Ink at={noneAt - 4} dur={16} style={{ position: "relative" }}>
            <span style={{ position: "relative", display: "inline-block", ...body(44, true), color: INK }}>
              understands
              <span
                style={{
                  position: "absolute",
                  left: "-0.05em",
                  top: "0.56em",
                  width: `calc((100% + 0.1em) * ${strike})`,
                  height: 4,
                  background: BAD,
                  borderRadius: 2,
                  transform: "rotate(-2deg)",
                  transformOrigin: "0 50%",
                }}
              />
            </span>
          </Ink>
          {["counts", "matches", "transforms"].map((w, i) => (
            <Ink key={w} at={verbs[i] - 2} dur={12} style={{ position: "relative" }}>
              <span style={{ ...body(44), color: INK }}>{w}</span>
            </Ink>
          ))}
        </div>
        <Ink at={spamAt - 4} dur={18} style={{ left: X0, top: y(UNDER_Y + 86), whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: INK_SOFT }}>
            A spam filter scores words <Mark at={meanAt - 6}>without knowing what they mean</Mark>.
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
