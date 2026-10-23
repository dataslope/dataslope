import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SENTENCES } from "./data";
import { Chip, chipHeight, Headline, Kicker, LabelEnd, RawText, rowLayout, rowWidth, Tag, wordSpans, X0 } from "./parts";

const SIZE = 40;
const FIG3_Y = 300;
const RAW_Y = 352;
const ROW_Y = 428;
const FIG4_Y = 574;
const ROW4_Y = 628;

/** Where a run of characters sits in the lesson's text. */
const at = (needle: string, offset: number) => {
  const i = SENTENCES.text.indexOf(needle);
  if (i < 0) throw new Error(`"${needle}" is not in the text`);
  return i + offset;
};

/**
 * The period's three jobs on the lesson's second line: split(".") cuts at
 * every one and gets five broken pieces; Punkt, NLTK's sentence tokenizer,
 * knows the abbreviation and the decimal and returns three sentences.
 */
export const PeriodScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("period").from;
  const endAt = n.word("period", "end");
  const titleAt = n.word("period", "title");
  const decimalAt = n.word("period", "decimal");
  const allAt = n.word("lee", "all");
  const splitAt = n.word("naive", "Split");
  const fallsAt = n.word("naive", "falls");
  const fiveAt = n.word("naive", "five", { nth: 1 });
  const doctorAt = n.word("naive-cut", "doctor");
  const insideAt = n.word("naive-cut", "inside");
  const twoAt = n.word("naive-cut", "two");
  const periodsAt = n.word("naive-cut", "periods");
  const nltkAt = n.word("punkt", "NLTK's");
  const punktAt = n.word("punkt", "Punkt");
  const abbrAt = n.word("punkt", "abbreviations");
  const decimalsAt = n.word("punkt", "decimals");
  const returnsAt = n.word("punkt", "returns");
  const threeAt = n.word("punkt", "three");
  const cleanAt = n.word("punkt", "clean");
  const andAt = n.word("domain-in", "And");
  const readingAt = n.word("domain-in", "reading");

  // ── Geometry ──
  const row = rowLayout(SENTENCES.naive, X0, SIZE);
  const row4 = rowLayout(SENTENCES.sentences, X0, SIZE);
  const figRight = X0 + Math.max(rowWidth(SENTENCES.naive, SIZE), rowWidth(SENTENCES.sentences, SIZE), 1200);
  const tagY = y(ROW_Y) + chipHeight(SIZE) + 12;
  const rowAt = SENTENCES.naive.map((_, i) => fallsAt + i * 4);
  const row4At = SENTENCES.sentences.map((_, i) => returnsAt + i * 5);
  /** The piece the narration's "throws the periods away" points at: "He
   *  smiled" without the period it ended on. */
  const smiled = SENTENCES.naive.findIndex((p) => p.trim() === "He smiled");
  const gapX = (i: number) => (row[i].right + row[i + 1].x) / 2;

  const dr = at("Dr.", 2);
  const dec = at("2.5", 1);
  const ends = [at("million.", 7), at("smiled.", 6)];
  const fig3 = 1 - ease(frame, andAt, 14) * 0.45;
  const fig4 = 1 - ease(frame, readingAt, 14) * 0.3;
  const blue = `color-mix(in srgb, ${BAR} 26%, transparent)`;
  const one = (i: number, a: number, out?: number, color?: string, pulse?: number) => ({ from: i, to: i + 1, at: a, out, color, pulse });

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={from - 4} level={-36} />
      {rowAt.map((a, i) => (
        <Sfx key={i} name="el-tap" at={a} level={-29} />
      ))}
      <Sfx name="el-pencil" at={nltkAt - 4} level={-36} />
      {row4At.map((a, i) => (
        <Sfx key={`s${i}`} name="el-tap" at={a} level={-28} />
      ))}

      <Kicker at={from - 6}>Tokenization</Kicker>
      <Headline lead="One mark," turn="three jobs." at={from - 4} turnAt={endAt} />

      <div style={{ position: "absolute", inset: 0, opacity: fig3 }}>
        {/* Fig. 3: the text, its periods lit as each job is named, then split(".") */}
        <FigLabel n="3" title="Split at every period" at={from} x={X0} y={y(FIG3_Y)} />
        <LabelEnd
          at={splitAt}
          x={figRight}
          y={y(FIG3_Y)}
          call={'text.split(".")'}
          count={`${SENTENCES.naive.length} pieces`}
          countAt={fiveAt}
        />
        <RawText
          text={SENTENCES.text}
          x={X0}
          y={y(RAW_Y)}
          at={from + 4}
          size={SIZE}
          words={wordSpans(SENTENCES.text).map((w) => ({ ...w, at: n.word("lee", w.word === "2.5" ? "two point five" : w.word) }))}
          marks={[
            ...ends.map((i, k) => one(i, endAt, splitAt, undefined, allAt + 8 + k * 3)),
            one(dr, titleAt, splitAt, undefined, allAt),
            one(dec, decimalAt, splitAt, undefined, allAt + 4),
            one(dr, abbrAt, undefined, blue),
            one(dec, decimalsAt, undefined, blue),
          ]}
        />
        {SENTENCES.naive.map((w, i) => (
          <Chip
            key={i}
            text={w}
            x={row[i].x}
            y={y(ROW_Y)}
            at={rowAt[i]}
            size={SIZE}
            tones={
              i === 0
                ? [{ at: doctorAt, tone: "bad" }]
                : i === 1 || i === 2
                  ? [{ at: insideAt, tone: "bad" }]
                  : i === smiled
                    ? [{ at: periodsAt, tone: "bad" }]
                    : []
            }
            showSpace
          />
        ))}
        <Tag at={doctorAt} x={gapX(0)} y={tagY} align="center">
          Dr. cut
        </Tag>
        <Tag at={twoAt} x={gapX(1)} y={tagY} align="center">
          2.5 cut
        </Tag>
        <Tag at={periodsAt} x={row[smiled].mid} y={tagY} align="center">
          period gone
        </Tag>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: fig4 }}>
        {/* Fig. 4: Punkt's three sentences. */}
        <FigLabel n="4" title="Punkt's sentences" at={nltkAt - 2} x={X0} y={y(FIG4_Y)} />
        <LabelEnd
          at={punktAt}
          x={figRight}
          y={y(FIG4_Y)}
          call="sent_tokenize(text)"
          count={`${SENTENCES.sentences.length} sentences`}
          countAt={threeAt}
        />
        {SENTENCES.sentences.map((s, i) => (
          <Chip key={i} text={s} x={row4[i].x} y={y(ROW4_Y)} at={row4At[i]} size={SIZE} tones={[{ at: cleanAt, tone: "good" }]} />
        ))}
        <Tag at={cleanAt + 6} x={X0} y={y(ROW4_Y) + chipHeight(SIZE) + 12} color={BLUE_INK}>
          knows abbreviations and decimals
        </Tag>
      </div>
      <Sfx name="el-pop" at={cleanAt} level={-32} />
    </AbsoluteFill>
  );
};
