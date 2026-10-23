import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, body, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOW } from "./data";
import { Chip, FIG_Y, Headline, INK, INK_SOFT, Kicker, lerp, Mark, NumCell, pulse, Spot, X0 } from "./parts";

/** Fig. 6, right: one document into the bag. */
const BAG_X = 1180;
const CHIPS_Y = 340;
const BAG = { left: 1270, top: 400, size: 320 };
const TALLY_Y = 790;
/** Fig. 7, left: the three documents and their matrix. */
const DOC_Y0 = 338;
const DOC_STEP = 52;
const VOCAB_NOTE_Y = 506;
const HEAD_ROW_Y = 552;
const COL_X0 = 236;
const COL_W = 88;
const ROW_Y0 = 598;
const ROW_STEP = 68;
const ROW_H = 58;
const DTM_NOTE_Y = 818;

const DOC = BOW.docs[0];
const SIZE = 26;
/** A chip's width as Chip estimates it, so the row can be laid out by hand. */
const chipW = (w: string) => (w.length * 0.56 + 1.4) * SIZE + 4;
const CHIP_X = DOC.reduce<number[]>((xs, w, k) => [...xs, k === 0 ? BAG_X : xs[k - 1] + chipW(DOC[k - 1]) + 11], []);
/** Doc 1's tally: each distinct word and its count, in the vocabulary's order. */
const TALLY = BOW.vocab.map((w, j) => ({ w, c: BOW.rows[0][j] })).filter((t) => t.c > 0);
const MAX = Math.max(...BOW.rows.flat());

/**
 * Part 2 opens: a bag of words. Fig. 6 tips the first document's words into
 * the bag, shakes it, and lays out what survives: which words, how many
 * times, and no order. Fig. 7 builds the lesson's document-term matrix: the
 * three documents, the sorted vocabulary as its columns, one row each.
 */
export const BagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const start = n.beat("bag").from;
  const bagAt = n.word("bag", "bag of words");
  const tipAt = n.word("bag", "Tip");
  const shakeAt = n.word("bag", "shake it");
  const whichAt = n.word("bag", "which words");
  const howManyAt = n.word("bag", "how many times");
  const orderAt = n.word("bag", "not their order");
  const docsAt = n.word("vocab", "three tiny documents");
  const vocabAt = n.word("vocab", "vocabulary");
  const distinctAt = n.word("vocab", "every distinct word");
  const nineAt = n.word("vocab", "nine");
  const rowAt = n.word("rows", "a row");
  const columnAt = n.word("rows", "one column");
  const theTwiceAt = n.word("rows", "twice");
  const onceAt = [n.word("rows", "cat"), n.word("rows", "mat"), n.word("rows", "on and"), n.word("rows", "sat")];
  const dtmAt = n.word("matrix", "document-term matrix");
  const sameAt = n.word("matrix", "same nine columns");

  // The words fly into the bag on "Tip", the bag shakes on "shake it".
  const into = (k: number) => ease(frame, tipAt + 4 + k * 2, 14);
  const shake = Math.sin((frame - shakeAt) / 2.2) * 5 * (1 - ease(frame, shakeAt + 4, 22)) * (frame >= shakeAt ? 1 : 0);
  const slide = -420 * (1 - ease(frame, docsAt - 16, 24));
  const mouth: [number, number] = [BAG.left + BAG.size * 0.42, y(BAG.top) + h(BAG.size) * 0.42];

  // The cells of doc1 the narration names, by vocabulary column.
  const named: { col: number; at: number }[] = [
    { col: BOW.vocab.indexOf("the"), at: theTwiceAt },
    ...["cat", "mat", "on", "sat"].map((w, k) => ({ col: BOW.vocab.indexOf(w), at: onceAt[k] })),
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the bag, the words into it, the shake, the tally, the header, each row ── */}
      <Sfx name="el-pop" at={bagAt} level={-30} />
      <Sfx name="el-whoosh" at={tipAt + 4} level={-33} />
      <Sfx name="el-sprinkle" at={shakeAt} level={-33} />
      {TALLY.map((_, k) => (
        <Sfx key={k} name="el-tap" at={whichAt + k * 3} level={-31} />
      ))}
      <Sfx name="el-pencil" at={docsAt - 4} level={-36} />
      {BOW.rows.map((_, i) => (
        <Sfx key={i} name="el-tap" at={rowAt + i * 8} level={-29} />
      ))}

      <Kicker at={start - 10}>Bag of words</Kicker>
      <Headline at={start - 4} second={start + 10} italic="lose the order.">
        Keep the counts,
      </Headline>

      {/* ── Fig. 6: one document, into the bag. It plays mid-page, then moves right for Fig. 7. ── */}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${slide}px)` }}>
      <FigLabel n="6" title="One document, into a bag" at={bagAt - 6} x={BAG_X} y={y(FIG_Y)} />
      <div style={{ position: "absolute", inset: 0, transform: `rotate(${shake}deg)`, transformOrigin: `${mouth[0]}px ${mouth[1] + 120}px` }}>
        <Spot id="bag" at={bagAt} left={BAG.left} top={y(BAG.top)} width={BAG.size} height={h(BAG.size)} />
      </div>
      {DOC.map((w, k) => {
        const p = into(k);
        const x = lerp(CHIP_X[k], mouth[0] - chipW(w) / 2, p);
        const top = lerp(y(CHIPS_Y), mouth[1] - 20, p);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x,
              top,
              transform: `scale(${1 - 0.6 * p}) rotate(${p * (k % 2 ? 24 : -18)}deg)`,
              opacity: 1 - ease(frame, tipAt + 12 + k * 2, 8),
            }}
          >
            <Chip text={w} size={SIZE} at={start + 2 + k * 2} />
          </div>
        );
      })}
      <Note at={whichAt - 4} x={BAG_X} y={y(TALLY_Y) - 40}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>What the bag keeps</span>
      </Note>
      <div style={{ position: "absolute", left: BAG_X, top: y(TALLY_Y), display: "flex", gap: 14 }}>
        {TALLY.map((t, k) => (
          <TallyChip key={t.w} word={t.w} count={t.c} at={whichAt + k * 3} countAt={howManyAt + k * 2} />
        ))}
      </div>
      <Note at={orderAt} x={BAG_X} y={y(TALLY_Y) + 58}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>which words and how many times; their order is gone</span>
      </Note>
      </div>

      {/* ── Fig. 7: three documents, counted ── */}
      <FigLabel n="7" title="Three tiny documents, counted" at={docsAt - 6} x={X0} y={y(FIG_Y)} />
      {BOW.corpus.map((d, i) => (
        <Ink key={i} at={docsAt - 2 + i * 5} dur={16} style={{ left: X0, top: y(DOC_Y0 + i * DOC_STEP), display: "flex", alignItems: "baseline", gap: 22, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, INK_SOFT), width: 60 }}>doc{i + 1}</span>
          <span style={{ ...body(32), color: INK }}>{d}</span>
        </Ink>
      ))}
      <Note at={vocabAt - 2} x={COL_X0} y={y(VOCAB_NOTE_Y)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
          Vocabulary, sorted<span style={{ opacity: ease(frame, nineAt - 2, 10) }}>: {BOW.vocab.length} words</span>
        </span>
      </Note>
      {BOW.vocab.map((w, j) => (
        <Ink
          key={w}
          at={distinctAt + j * 2}
          dur={10}
          style={{ left: COL_X0 + j * COL_W, width: COL_W, top: y(HEAD_ROW_Y), textAlign: "center", ...label(22, INK), whiteSpace: "nowrap" }}
        >
          {w}
        </Ink>
      ))}
      {BOW.rows.map((row, i) => {
        const at = (i === 0 ? rowAt : columnAt) + (i === 0 ? 0 : (i - 1) * 8) - 4;
        const sweep = pulse(frame, sameAt + i * 6, 22);
        return (
          <React.Fragment key={i}>
            <Ink at={at} dur={12} style={{ left: X0, top: y(ROW_Y0 + i * ROW_STEP) + h(ROW_H) / 2 - 14, ...label(22, INK) }}>
              doc{i + 1}
            </Ink>
            {row.map((c, j) => {
              const hit = i === 0 ? named.find((m) => m.col === j) : undefined;
              const lit = hit ? ease(frame, hit.at - 2, 10) * (1 - ease(frame, dtmAt - 4, 14)) : 0;
              return (
                <React.Fragment key={j}>
                  <NumCell
                    value={c}
                    at={at + j}
                    x={COL_X0 + j * COL_W + 4}
                    y={y(ROW_Y0 + i * ROW_STEP)}
                    w={COL_W - 8}
                    h={h(ROW_H)}
                    heat={c / MAX + sweep * 0.45 + lit * 0.35}
                    faint={c === 0}
                    outline={lit > 0.5 ? BLUE_INK : undefined}
                  />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
      <Note at={dtmAt - 2} x={X0} y={y(DTM_NOTE_Y)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <Mark at={dtmAt}>A document-term matrix</Mark>
          <span style={{ color: INK_SOFT }}>: a row per document, a column per word</span>
        </span>
      </Note>
      <Note at={sameAt - 2} x={X0} y={y(DTM_NOTE_Y) + 44}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Every row the same {BOW.vocab.length} columns, in the same order</span>
      </Note>
    </AbsoluteFill>
  );
};

/** One word of the tally, its count inking in beside it. */
const TallyChip: React.FC<{ word: string; count: number; at: number; countAt: number }> = ({ word, count, at, countAt }) => {
  const frame = useCurrentFrame();
  const c = ease(frame, countAt, 10);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Chip text={word} size={24} at={at} style={{ marginRight: 0 }} />
      <span style={{ ...note(26, BLUE_INK), ...TABULAR, fontWeight: 700, opacity: c, transform: `translateY(${(1 - c) * 6}px)` }}>
        ×{count}
      </span>
    </span>
  );
};
