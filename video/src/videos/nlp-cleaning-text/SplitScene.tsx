import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pieceOf, tokenOf, WORDS } from "./data";
import { Chip, chipHeight, Headline, Kicker, LabelEnd, type MarkSpan, RawText, rowLayout, rowWidth, Spot, Tag, type ToneStep, X0 } from "./parts";

const SIZE = 34;
const FIG1_Y = 306;
const RAW_Y = 360;
const ROW1_Y = 436;
const FIG2_Y = 584;
const ROW2_Y = 640;

/**
 * Part 1 opens: the lesson's sentence split at the spaces (eleven pieces, two
 * with punctuation stuck on and one hiding its negation), then cut by
 * word_tokenize (sixteen tokens, each split piece lit with the tokens it
 * became), and the definition of a token.
 */
export const SplitScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const whereAt = n.word("hook", "where");
  const decisionAt = n.word("hook", "decision");
  const sentence = n.beat("sentence");
  const readFrom = n.word("sentence", "I");
  const splitAt = n.word("split", "split");
  const spacesAt = n.word("split", "spaces");
  const elevenAt = n.word("split", "eleven");
  const commaAt = n.word("glued", "comma");
  const exclAt = n.word("glued", "exclamation");
  const hiddenAt = n.word("hidden", "hidden");
  const negHidAt = n.word("hidden", "negation");
  const nltkAt = n.word("cuts", "NLTK's");
  const wordAt = n.word("cuts", "word");
  const cutsAt = n.word("cuts", "cuts");
  const dontAt = n.word("pieces", "Don't");
  const negAt = n.word("pieces", "negation");
  const leesAt = n.word("pieces", "Lee's");
  const possAt = n.word("pieces", "possessive");
  const wellAt = n.word("pieces", "we'll");
  const willAt = n.word("pieces", "will");
  const commaAt2 = n.word("pieces", "comma");
  const exclAt2 = n.word("pieces", "exclamation");
  const aloneAt = n.word("pieces", "alone");
  const sixteenAt = n.word("sixteen", "sixteen");
  const mrAt = n.word("sixteen", "Mr.");
  const periodAt = n.word("sixteen", "period");
  const eachAt = n.beat("token").from;
  const tokenAt = n.word("token", "token");
  const meaningfulAt = n.word("token", "meaningful");
  const aWordAt = n.word("token", "word");
  const markAt = n.word("token", "punctuation");
  const levelAt = n.word("sent-in", "period");
  const end = n.beat("sent-in").to;

  // ── Geometry ──
  const row1 = rowLayout(WORDS.split, X0, SIZE);
  const row2 = rowLayout(WORDS.tokens, X0, SIZE);
  const figRight = X0 + rowWidth(WORDS.tokens, SIZE);
  const chipH = chipHeight(SIZE);
  const tag1 = y(ROW1_Y) + chipH + 12;
  const tag2 = y(ROW2_Y) + chipH + 12;
  const row1At = WORDS.split.map((_, i) => spacesAt + i * 3);
  const row2At = WORDS.tokens.map((_, i) => cutsAt + i * 3);

  const p = {
    dont: pieceOf("don't"),
    mr: pieceOf("Mr."),
    lees: pieceOf("Lee's"),
    work: pieceOf("work,"),
    well: pieceOf("we'll"),
    see: pieceOf("see!"),
  };
  const t = {
    do: tokenOf("do"),
    nt: tokenOf("n't"),
    mr: tokenOf("Mr."),
    lee: tokenOf("Lee"),
    s: tokenOf("'s"),
    plan: tokenOf("plan"),
    comma: tokenOf(","),
    we: tokenOf("we"),
    ll: tokenOf("'ll"),
    bang: tokenOf("!"),
  };

  // Each split piece lights with the tokens it became, one pair at a time.
  const pairs: { at: number; out: number; piece: number; tokens: number[] }[] = [
    { at: dontAt, out: leesAt - 2, piece: p.dont, tokens: [t.do, t.nt] },
    { at: leesAt, out: wellAt - 2, piece: p.lees, tokens: [t.lee, t.s] },
    { at: wellAt, out: commaAt2 - 2, piece: p.well, tokens: [t.we, t.ll] },
    { at: commaAt2, out: exclAt2 - 2, piece: p.work, tokens: [t.comma] },
    { at: exclAt2, out: aloneAt + 14, piece: p.see, tokens: [t.bang] },
    { at: mrAt, out: eachAt, piece: p.mr, tokens: [t.mr] },
  ];
  const marks1 = (i: number): MarkSpan[] => pairs.filter((q) => q.piece === i).map((q) => ({ at: q.at, out: q.out }));
  const marks2 = (j: number): MarkSpan[] => [
    ...pairs.filter((q) => q.tokens.includes(j)).map((q) => ({ at: q.at, out: q.out })),
    ...(j === t.plan ? [{ at: aWordAt, out: levelAt }] : []),
    ...(j === t.comma || j === t.bang ? [{ at: markAt, out: levelAt }] : []),
  ];
  // The pieces a split broke go red as they are named; the units word_tokenize
  // exposed go blue.
  const tones1 = (i: number): ToneStep[] =>
    i === p.work ? [{ at: commaAt, tone: "bad" }] : i === p.see ? [{ at: exclAt, tone: "bad" }] : i === p.dont ? [{ at: hiddenAt, tone: "bad" }] : [];
  const exposed: Record<number, number> = { [t.nt]: negAt, [t.s]: possAt, [t.ll]: willAt, [t.comma]: commaAt2 + 4, [t.bang]: exclAt2 + 4 };
  const tones2 = (j: number): ToneStep[] => (exposed[j] !== undefined ? [{ at: exposed[j], tone: "good" }] : []);

  return (
    <AbsoluteFill>
      {/* ── Sound: the spot, the two rows landing, the label strokes ── */}
      <Sfx name="el-pop" at={hookFrom + 6} level={-30} />
      <Sfx name="el-pencil" at={decisionAt - 4} level={-36} />
      {row1At.filter((_, i) => i % 2 === 0).map((at, i) => (
        <Sfx key={`a${i}`} name="el-tap" at={at} level={-29} />
      ))}
      <Sfx name="el-pencil" at={nltkAt - 4} level={-36} />
      {row2At.filter((_, i) => i % 2 === 0).map((at, i) => (
        <Sfx key={`b${i}`} name="el-tap" at={at} level={-29} />
      ))}

      <Kicker at={hookFrom - 6}>Tokenization</Kicker>
      <Headline lead="Where does one word end?" at={whereAt - 4} out={eachAt} />
      <Headline lead="A token:" turn="one meaningful unit of text." at={tokenAt - 4} turnAt={meaningfulAt - 2} />
      <Spot id="nlp-cleaning-text-scissors" at={hookFrom + 4} left={1446} top={50} width={340} height={233} />

      {/* Fig. 1: the sentence, split at the spaces. */}
      <FigLabel n="1" title="Split at the spaces" at={decisionAt - 4} x={X0} y={y(FIG1_Y)} />
      <LabelEnd
        at={splitAt}
        x={figRight}
        y={y(FIG1_Y)}
        call="text.split()"
        count={`${WORDS.split.length} pieces`}
        countAt={elevenAt}
      />
      <RawText
        text={WORDS.text}
        x={X0}
        y={y(RAW_Y)}
        at={decisionAt}
        size={30}
        read={{ from: readFrom, to: sentence.to }}
      />
      {WORDS.split.map((w, i) => (
        <Chip
          key={i}
          text={w}
          x={row1[i].x}
          y={y(ROW1_Y)}
          at={row1At[i]}
          size={SIZE}
          tones={tones1(i)}
          marks={marks1(i)}
          hot={i === p.work ? { from: 4, to: 5, at: commaAt } : i === p.see ? { from: 3, to: 4, at: exclAt } : undefined}
        />
      ))}
      <Tag at={commaAt} x={row1[p.work].mid} y={tag1} align="center">
        comma stuck on
      </Tag>
      <Tag at={exclAt} x={row1[p.see].mid} y={tag1} align="center">
        mark stuck on
      </Tag>
      <Tag at={negHidAt} x={row1[p.dont].mid} y={tag1} align="center">
        negation hidden
      </Tag>

      {/* Fig. 2: the same sentence through word_tokenize. */}
      <FigLabel n="2" title="Cut by NLTK's tokenizer" at={nltkAt - 4} x={X0} y={y(FIG2_Y)} />
      <LabelEnd
        at={wordAt}
        x={figRight}
        y={y(FIG2_Y)}
        call="word_tokenize(text)"
        count={`${WORDS.tokens.length} tokens`}
        countAt={sixteenAt}
      />
      {WORDS.tokens.map((w, j) => (
        <Chip key={j} text={w} x={row2[j].x} y={y(ROW2_Y)} at={row2At[j]} size={SIZE} tones={tones2(j)} marks={marks2(j)} />
      ))}
      <Tag at={negAt} x={row2[t.nt].mid} y={tag2} align="center" color={BLUE_INK}>
        negation, a token
      </Tag>
      <Tag at={periodAt} x={row2[t.mr].mid} y={tag2} align="center" color={BLUE_INK}>
        period kept
      </Tag>
      {/* "Each piece is a token" carries the scene to its end; the Mr. period
          that the next scene is about lights as it is named. */}
      <Chip
        text={WORDS.tokens[t.mr]}
        x={row2[t.mr].x}
        y={y(ROW2_Y)}
        at={levelAt}
        size={SIZE}
        marks={[{ at: levelAt + 2 }]}
        out={end + 30}
      />
    </AbsoluteFill>
  );
};
