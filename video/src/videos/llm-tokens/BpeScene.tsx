import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { END, FIRST_PAIRS, FREQS, MERGES, STEPS, unitsOf, WORDS } from "./data";
import {
  chipGround,
  ChipFace,
  clamp01,
  Drift,
  FIG_Y,
  FOCUS,
  FOCUS_INK,
  Headline,
  InlineArrow,
  Kicker,
  pulse,
  TOKEN,
  UnderBracket,
  X0,
} from "./parts";

/** The tiles: one unit per character (and one for the end marker). */
const U = 62;
const G = 10;
const TX = 420;
const ROW0 = 440;
const ROW_STEP = 96;
const TILE_H = 54;
const CORPUS_Y = 352;
/** The right column: the first pair count, then the merges. */
const RX = 1060;
const LIST_Y = 372;
const LIST_STEP = 50;

type Tile = { text: string; start: number; units: number };
const tilesOf = (syms: readonly string[]): Tile[] => {
  let start = 0;
  return syms.map((text) => {
    const t = { text, start, units: unitsOf(text) };
    start += t.units;
    return t;
  });
};
const tileX = (start: number) => TX + start * (U + G);
const tileW = (units: number) => units * U + (units - 1) * G;
const same = (a: Tile, b: Tile) => a.start === b.start && a.units === b.units && a.text === b.text;

/** A symbol in the code face, the end marker set smaller and softer. */
const Sym: React.FC<{ text: string; size?: number }> = ({ text, size = 28 }) => {
  const body = text.endsWith(END) ? text.slice(0, -END.length) : text;
  const end = text.endsWith(END);
  return (
    <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: size, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
      {body}
      {end ? <span style={{ fontSize: size * 0.72, color: INK_SOFT }}>{END}</span> : null}
    </span>
  );
};

/** One symbol tile, on its units, in its state. */
const TileBox: React.FC<{ t: Tile; top: number; opacity: number; focus: number; scale?: number }> = ({
  t,
  top,
  opacity,
  focus,
  scale = 1,
}) => {
  const marker = t.text === END;
  return (
    <div
      style={{
        position: "absolute",
        left: tileX(t.start),
        top,
        width: tileW(t.units),
        height: TILE_H,
        boxSizing: "border-box",
        borderRadius: 8,
        border: `2px ${marker ? "dashed" : "solid"} ${
          focus > 0 ? `color-mix(in srgb, ${FOCUS} ${Math.round(focus * 100)}%, ${marker ? INK_SOFT : TOKEN})` : marker ? INK_SOFT : TOKEN
        }`,
        background: marker ? PAPER : chipGround(focus),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <Sym text={t.text} size={marker ? 26 : 28} />
    </div>
  );
};

/**
 * Byte-pair encoding, run by hand on the lesson's training text: the words
 * and their counts, each split into characters and an end marker; the first
 * pair count; then the ten merges in the order the lesson's code learns them,
 * each fusing its two tiles in every word at once, and the list of merges
 * that is the tokenizer. Every step is measure.py's re-run of the lesson's
 * own pair_counts and merge_pair.
 */
export const BpeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const bpeFrom = n.beat("bpe").from;
  const handAt = n.word("bpe", "hand");
  const wordSaid = [
    n.word("corpus", "Low"),
    n.word("corpus", "Lower"),
    n.word("corpus", "Newest"),
    n.word("corpus", "widest"),
  ];
  const splitAt = n.word("split", "Split");
  const markerAt = n.word("split", "marker");
  const countAt = n.word("count", "count");
  const loAt = n.word("count", "L and O");
  const sevenAt = n.word("count", "seven");
  const owAt = n.word("count", "O and W");
  const mergeAt = n.word("merge", "Merge", { nth: 1 });
  const writeAt = n.word("merge", "write");
  const firstAt = n.word("order", "L and O first");
  const makingAt = n.word("order", "making");
  const wordEndAt = n.word("order", "end of a word");
  const esAt = n.word("suffix", "E and S");
  const tAt = n.word("suffix", "then T");
  const suffixEndAt = n.word("suffix", "word end");
  const newestAt = n.word("suffix", "newest");
  const widestAt = n.word("suffix", "widest");
  const afterAt = n.word("after", "After");
  const singleAt = n.word("after", "low and newest");
  const fourAt = n.word("after", "still four");
  const widAt = n.word("after", "wid");
  const tokenizerAt = n.word("list", "tokenizer");
  const replayedAt = n.word("list", "replayed");
  const orderAt = n.word("list", "order");
  const frequentAt = n.word("rule", "Frequent");
  const rareAt = n.word("rule", "Rare");
  const piecesAt = n.word("counts-in", "pieces");
  const end = n.beat("bytes").from;

  // When each merge happens: the narration walks the first six, then the
  // last four land together on "After ten merges".
  const mergeCue = [mergeAt, makingAt, wordEndAt, esAt + 4, tAt + 2, suffixEndAt, afterAt, afterAt + 7, afterAt + 14, afterAt + 21];
  const stepAt = (f: number) => mergeCue.filter((c) => f >= c).length;
  const k = stepAt(frame);
  // Each merge: the two old tiles go first, then the fused one comes in on
  // their span, so their labels never sit on top of each other.
  const tOld = k > 0 ? ease(frame, mergeCue[k - 1], 6) : 1;
  const tMerge = k > 0 ? ease(frame, mergeCue[k - 1] + 4, 10) : 1;

  const rowY = (i: number) => y(ROW0) + i * h(ROW_STEP);
  const rowIn = (i: number) => ease(frame, wordSaid[i] - 2, 12);
  const splitP = ease(frame, splitAt, 14);
  const markerP = ease(frame, markerAt - 2, 12);
  const lowRows = [0, 1];

  // Rows named again later: "low and newest", widest's four pieces.
  const rowGlow = (w: string) =>
    (w === "low" || w === "newest" ? pulse(frame, singleAt, 24) + pulse(frame, frequentAt, 24) : 0) +
    (w === "widest" ? pulse(frame, rareAt, 24) + pulse(frame, piecesAt, 24) : 0);

  // The list rows light in order on "replayed in order".
  const replay = (i: number) => pulse(frame, replayedAt + i * 3, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, the split, the pair count, every merge, the replay ── */}
      {wordSaid.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-28} />
      ))}
      <Sfx name="el-scratch" at={splitAt} level={-34} />
      <Sfx name="el-pencil" at={loAt - 4} level={-35} />
      <Sfx name="el-pencil" at={owAt - 4} level={-35} />
      {mergeCue.map((t, i) => (
        <Sfx key={i} name="el-pop" at={t} level={i < 6 ? -28 : -32} />
      ))}
      <Sfx name="el-pencil" at={fourAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={replayedAt} level={-34} />
      <Sfx name="el-chime" at={n.beat("rule").to + 4} level={-33} />

      <Kicker at={bpeFrom - 10}>Byte-pair encoding</Kicker>
      <Headline lead="Byte-pair encoding," turn="by hand." at={bpeFrom - 6} turnAt={handAt - 4} out={frequentAt - 10} />
      <Headline lead="Frequent text, whole tokens." turn="Rare text, pieces." at={frequentAt - 4} turnAt={rareAt - 4} />

      <Drift from={bpeFrom} to={end} amount={0.01} origin="35% 55%">
        {/* Fig. 8: the training text, split into symbols. */}
        <FigLabel n="8" title="The lesson's training text" at={bpeFrom} x={X0} y={y(FIG_Y)} />
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(CORPUS_Y),
            fontFamily: MONO,
            fontSize: 21,
            fontWeight: 500,
            color: INK_SOFT,
            whiteSpace: "nowrap",
            opacity: ease(frame, bpeFrom + 4, 14) * (1 - 0.5 * ease(frame, splitAt, 14)),
          }}
        >
          {WORDS.flatMap((w) => Array.from({ length: FREQS[w] }, () => w)).join(" ")}
        </div>

        {WORDS.map((w, i) => {
          const p = rowIn(i);
          if (p <= 0) return null;
          const top = rowY(i);
          const glow = Math.min(1, rowGlow(w));
          const now = tilesOf(STEPS[k].splits[w]);
          const before = k > 0 ? tilesOf(STEPS[k - 1].splits[w]) : now;
          const fresh = (t: Tile) => !before.some((b) => same(b, t));
          // Newly merged tiles stay red for about a second.
          const hot = k > 0 ? 1 - ease(frame, mergeCue[k - 1] + 26, 18) : 0;
          // Tiles named in the narration.
          const named = (t: Tile) =>
            (t.text === `est${END}` && ((w === "newest" && pulse(frame, newestAt - 2, 24) > 0) || (w === "widest" && pulse(frame, widestAt - 2, 24) > 0))
              ? pulse(frame, (w === "newest" ? newestAt : widestAt) - 2, 24)
              : 0) +
            (w === "widest" && ["w", "i", "d"].includes(t.text) && t.start < 3 ? ease(frame, widAt - 2, 10) * (1 - ease(frame, frequentAt, 16)) : 0);
          return (
            <React.Fragment key={w}>
              <div style={{ position: "absolute", left: X0, top: top + 8, opacity: p, display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: INK }}>{w}</span>
                <span style={{ ...note(24, INK_SOFT), ...TABULAR }}>×{FREQS[w]}</span>
              </div>
              {/* Before the split: the word, whole. */}
              {splitP < 1 ? (
                <div style={{ position: "absolute", left: TX, top: top + 8, opacity: p * (1 - splitP) }}>
                  <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: INK }}>{w}</span>
                </div>
              ) : null}
              {/* The tiles: unchanged ones held, merged ones fused. */}
              {splitP > 0
                ? now.map((t) => {
                    const isNew = k > 0 && fresh(t);
                    const isMarker = t.text === END && t.units === 1;
                    const o = (isMarker && k === 0 ? markerP : 1) * splitP * (isNew ? tMerge : 1);
                    const focus = Math.min(1, (isNew ? hot : 0) + named(t) + glow * 0.8);
                    return (
                      <TileBox
                        key={`${t.start}-${t.text}`}
                        t={t}
                        top={top}
                        opacity={o}
                        focus={focus}
                        scale={isNew ? 0.96 + 0.04 * tMerge : 1}
                      />
                    );
                  })
                : null}
              {k > 0 && tOld < 1
                ? before
                    .filter((b) => !now.some((t) => same(b, t)))
                    .map((b) => <TileBox key={`old-${b.start}-${b.text}`} t={b} top={top} opacity={1 - tOld} focus={0} />)
                : null}
            </React.Fragment>
          );
        })}

        {/* "L and O sit side by side seven times": under each pair in low and lower. */}
        {lowRows.map((r) => (
          <React.Fragment key={r}>
            <UnderBracket x0={tileX(0) + 4} x1={tileX(1) + U - 4} y={rowY(r) + TILE_H + 12} at={loAt - 2} color={FOCUS} out={owAt - 4} />
            <UnderBracket x0={tileX(1) + 4} x1={tileX(2) + U - 4} y={rowY(r) + TILE_H + 12} at={owAt - 2} color={FOCUS} out={mergeAt - 4} />
          </React.Fragment>
        ))}

        {/* Widest: still four pieces. */}
        <UnderBracket
          x0={tileX(0)}
          x1={tileX(6) + U}
          y={rowY(3) + TILE_H + 12}
          at={fourAt - 2}
          color={INK_SOFT}
        />
        <Note at={fourAt} x={tileX(0)} y={rowY(3) + TILE_H + 20}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>four pieces: wid never earned a merge</span>
        </Note>

        {/* Fig. 9: the first count of neighbouring pairs, the lesson's top five. */}
        <FigLabel n="9" title="Neighbouring pairs, counted" at={countAt - 4} x={RX} y={y(FIG_Y)} out={writeAt - 2} />
        {FIRST_PAIRS.map((p, i) => {
          const on = ease(frame, countAt + 4 + i * 4, 10) * (1 - ease(frame, writeAt - 2, 10));
          if (on <= 0) return null;
          const hit = (i === 0 ? ease(frame, loAt - 2, 10) : 0) + (i === 1 ? ease(frame, owAt - 2, 10) : 0);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: RX,
                top: y(LIST_Y) + i * h(LIST_STEP + 6),
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: on,
              }}
            >
              <ChipFace text={p.pair[0]} size={24} focus={Math.min(1, hit)} />
              <ChipFace text={p.pair[1]} size={24} focus={Math.min(1, hit)} />
              <span style={{ ...note(26, hit > 0.5 ? FOCUS_INK : INK), marginLeft: 14, fontWeight: 650, ...TABULAR }}>
                {p.count}
              </span>
              <span style={{ ...note(21, INK_SOFT) }}>{i === 0 ? "times" : ""}</span>
            </div>
          );
        })}
        <Note at={sevenAt} x={RX} y={y(LIST_Y) + 5 * h(LIST_STEP + 6) + 4} out={writeAt - 2}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>five lows and two lowers: seven</span>
        </Note>

        {/* Fig. 10: the merges, in the order learned. That list is the tokenizer. */}
        <FigLabel n="10" title="Merges, in the order learned" at={writeAt + 4} x={RX} y={y(FIG_Y)} />
        <Note at={tokenizerAt - 2} x={1800} y={y(FIG_Y) + 2} align="right">
          <span style={{ ...label(24, ACCENT_INK), whiteSpace: "nowrap" }}>= the tokenizer</span>
        </Note>
        {MERGES.map((m, i) => {
          const at = i === 0 ? Math.max(mergeCue[0], writeAt + 6) : mergeCue[i];
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const lit = Math.min(1, replay(i) + (i === 0 ? pulse(frame, firstAt - 2, 20) : 0));
          const hot = 1 - ease(frame, at + 26, 18);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: RX,
                top: y(LIST_Y) + i * h(LIST_STEP),
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: p,
                transform: `translateX(${(1 - p) * -14}px)`,
              }}
            >
              <span style={{ ...label(22, lit > 0.3 ? FOCUS_INK : ACCENT_INK), width: 30, textAlign: "right", ...TABULAR }}>{i + 1}</span>
              <span style={{ width: 190, display: "inline-flex", gap: 8, alignItems: "baseline", justifyContent: "flex-end" }}>
                <Sym text={m.a} size={24} />
                <span style={{ ...note(22, INK_SOFT) }}>+</span>
                <Sym text={m.b} size={24} />
              </span>
              <InlineArrow width={34} size={24} />
              <ChipFace text={m.a + m.b} size={22} focus={Math.max(clamp01(hot), lit)} />
              <span style={{ ...note(21, INK_SOFT), marginLeft: 6, ...TABULAR }}>×{m.count}</span>
            </div>
          );
        })}
        <Note at={orderAt - 2} x={RX + 42} y={y(LIST_Y) + MERGES.length * h(LIST_STEP) + 2}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>new text: split, then replay these in order</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
