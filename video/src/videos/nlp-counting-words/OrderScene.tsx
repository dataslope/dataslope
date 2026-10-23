import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, fmt, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA, ORDER, PHRASES } from "./data";
import { flow, HBar, Headline, Kicker, MARK_BAD, Marked, Mono, numStyle, Spot, Tile, tileH } from "./parts";

const X0 = 120;
const SIZE = 26;
const CHIP = 24;
const GRAMS_X = 660;
/** Fig. 14's two tables. */
const T1 = 120;
const T2 = 860;
const WORD_W = 270;
const ROWS_Y = 650;
const ROW_STEP = 54;

/**
 * Order is meaning: the lesson's "the food was good" against "the food was
 * not good" as sets (only "not" differs) and as bigrams (only one has
 * "not good"); then counted bigrams finding phrases, in the lesson's lines
 * about machine learning and across Emma, stopword pairs left out.
 */
export const OrderScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("compare").from;
  const bAt = n.word("compare", "the food was good");
  const aAt = n.word("compare", "the food was not");
  const notGoodSaid = n.word("compare", "not good");
  const setsAt = n.word("sets", "sets");
  const differAt = n.word("sets", "differ");
  const notAt = n.word("sets", "not");
  const bigramsAt = n.word("bigram", "bigrams");
  const hasAt = n.word("bigram", "not good");
  const featureAt = n.word("bigram", "feature");
  const negativeAt = n.word("bigram", "negative");
  const findsAt = n.word("phrases", "finds phrases");
  const linesAt = n.word("phrases", "three short");
  const topPairAt = n.word("phrases", "top pair");
  const mlAt = n.word("phrases", "machine learning", { nth: 2 });
  const timesAt = n.word("phrases", "three times");
  const emmaAt = n.word("cast", "Emma");
  const stopwordAt = n.word("cast", "no stopword");
  const castAt = n.word("cast", "cast");
  const castAts = [n.word("cast", "Mister Knightley"), n.word("cast", "Missus Weston"), n.word("cast", "Mister Elton")];
  const fiveAt = n.word("bigger-in", "would five");

  // ── Fig. 13 ──
  const rowB = y(336);
  const rowA = y(420);
  const bTiles = flow(ORDER.b, X0, rowB, 640, SIZE, 10, 0);
  const aTiles = flow(ORDER.a, X0, rowA, 640, SIZE, 10, 0);
  const bGrams = flow(ORDER.bigramsB.map((g) => g.join(" ")), GRAMS_X, rowB + 1, 1800, CHIP, 12, 0);
  const aGrams = flow(ORDER.bigramsA.map((g) => g.join(" ")), GRAMS_X, rowA + 1, 1800, CHIP, 12, 0);
  const notGood = aGrams.findIndex((g) => g.text === "not good");
  const inB = new Set(ORDER.b);

  // ── Fig. 14 ──
  const rowY = (i: number) => y(ROWS_Y) + i * h(ROW_STEP);
  const rowH = h(40);
  const ml = PHRASES.top3;
  const cast = EMMA.pairs.slice(0, 3);
  const mlUnit = 230 / ml[0][1];
  const castUnit = 300 / cast[0][1];
  const mlAts = [mlAt, timesAt + 6, timesAt + 12];

  return (
    <AbsoluteFill>
      {/* ── Sound: each sentence, the lone word, the telling pair, the counts, the cast ── */}
      <Sfx name="el-whoosh" at={bAt - 4} level={-35} />
      <Sfx name="el-whoosh" at={aAt - 4} level={-35} />
      <Sfx name="el-tap" at={notAt - 2} level={-27} />
      <Sfx name="el-tap" at={hasAt - 2} level={-27} />
      <Sfx name="el-pop" at={emmaAt - 2} level={-30} />
      {castAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-29} />
      ))}

      <Kicker at={from - 10}>Counting word pairs</Kicker>
      <Headline at={from - 4} second={notGoodSaid - 2} italic="Order is meaning.">
        Why bother?
      </Headline>

      <FigLabel n="13" title="Single words against bigrams" at={bAt - 6} x={X0} y={y(276)} />
      {bTiles.map((t, i) => (
        <Tile key={`b${i}`} text={t.text} x={t.x} y={t.y} size={SIZE} at={bAt - 4 + i * 3} dim={setsAt + 6} undim={bigramsAt - 6} />
      ))}
      {aTiles.map((t, i) => (
        <Tile
          key={`a${i}`}
          text={t.text}
          x={t.x}
          y={t.y}
          size={SIZE}
          at={aAt - 4 + i * 3}
          dim={inB.has(t.text) ? setsAt + 6 : undefined}
          undim={bigramsAt - 6}
          marks={inB.has(t.text) ? [] : [{ at: notAt - 2, color: MARK_BAD }]}
          border={inB.has(t.text) ? undefined : ACCENT_INK}
        />
      ))}
      <Note at={differAt - 2} x={X0} y={rowA + tileH(SIZE) + 14}>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          as sets of single words, the only difference: <Mono size={22} color={ACCENT_INK} weight={600}>not</Mono>
        </div>
      </Note>
      <Ink at={bigramsAt - 4} dur={12} style={{ left: GRAMS_X, top: rowB - 42, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 600 }}>as bigrams</span>
      </Ink>
      {bGrams.map((t, i) => (
        <Tile key={`bg${i}`} text={t.text} x={t.x} y={t.y} size={CHIP} at={bigramsAt - 2 + i * 3} />
      ))}
      {aGrams.map((t, i) => (
        <Tile
          key={`ag${i}`}
          text={t.text}
          x={t.x}
          y={t.y}
          size={CHIP}
          at={bigramsAt + 4 + i * 3}
          marks={i === notGood ? [{ at: hasAt - 2 }] : []}
          border={i === notGood ? INK : undefined}
        />
      ))}
      <Note at={featureAt - 2} x={aGrams[notGood].x} y={rowA + tileH(SIZE) + 14}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          a feature a model can learn is <Marked at={negativeAt - 2}>negative</Marked>
        </div>
      </Note>
      <Note at={hasAt + 4} x={bGrams[bGrams.length - 1].x + bGrams[bGrams.length - 1].w + 16} y={rowB}>
        <div style={{ height: tileH(CHIP), display: "flex", alignItems: "center", ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          no <Mono size={22} color={INK_SOFT}>&nbsp;not good&nbsp;</Mono> here
        </div>
      </Note>

      {/* Fig. 14: counted pairs. */}
      <FigLabel n="14" title="The most common bigrams" at={findsAt - 4} x={T1} y={y(560)} />
      <Ink at={linesAt - 2} dur={12} style={{ left: T1, top: y(560) + 46, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 600 }}>three lines about machine learning</span>
      </Ink>
      {ml.map(([p, c], i) => (
        <React.Fragment key={p}>
          <Ink at={mlAts[i] - 2} dur={12} style={{ left: T1, width: WORD_W, top: rowY(i), height: rowH, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <Mono size={23} color={INK} weight={i === 0 ? 600 : 500}>
              {i === 0 ? <Marked at={topPairAt - 2}>{p}</Marked> : p}
            </Mono>
          </Ink>
          <HBar x={T1 + WORD_W + 16} y={rowY(i) + rowH * 0.18} w={c * mlUnit} h={rowH * 0.64} at={mlAts[i]} />
          <Note at={mlAts[i] + 6} x={T1 + WORD_W + 28 + c * mlUnit} y={rowY(i)}>
            <div style={{ height: rowH, display: "flex", alignItems: "center", ...numStyle(22, i === 0 ? ACCENT_INK : INK) }}>×{c}</div>
          </Note>
        </React.Fragment>
      ))}
      <Ink at={stopwordAt - 2} dur={12} style={{ left: T2, top: y(560) + 46, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 600 }}>all of Emma, pairs with no stopword</span>
      </Ink>
      {cast.map(([p, c], i) => (
        <React.Fragment key={p}>
          <Ink at={castAts[i] - 2} dur={12} style={{ left: T2, width: WORD_W - 40, top: rowY(i), height: rowH, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <Mono size={23} color={INK}>
              {p}
            </Mono>
          </Ink>
          <HBar x={T2 + WORD_W - 24} y={rowY(i) + rowH * 0.18} w={c * castUnit} h={rowH * 0.64} at={castAts[i]} />
          <Note at={castAts[i] + 6} x={T2 + WORD_W - 12 + c * castUnit} y={rowY(i)}>
            <div style={{ height: rowH, display: "flex", alignItems: "center", ...numStyle(22, INK) }}>×{fmt(c, 0)}</div>
          </Note>
        </React.Fragment>
      ))}
      <Spot id="nlp-counting-words-hats" at={castAt - 4} left={1530} top={y(580)} width={280} height={179} />
      <Note at={fiveAt - 4} x={T1} y={rowY(3) + 24}>
        <div style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>
          Two words in a row help. <span style={{ color: ACCENT_INK }}>Would five help more?</span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
