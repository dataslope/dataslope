import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, fmt, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA, ORDER, PHRASES } from "./data";
import { flow, HBar, Headline, Kicker, MARK_BAD, Marked, Mono, numStyle, pulse, Spot, Tile, tileH, tileW } from "./parts";

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
  const frame = useCurrentFrame();
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
  const pairAt = n.word("bigram", "The pair");
  const notBadAt = n.word("bigram", "not bad");
  const loneAt = n.word("bigram", "lone");
  const praiseAt = n.word("bigram", "praise");
  const negativeAt = n.word("bigram", "negative");
  const findsAt = n.word("phrases", "finds phrases");
  const linesAt = n.word("phrases", "three short");
  const topPairAt = n.word("phrases", "top pair");
  const timesAt = n.word("phrases", "three times");
  const emmaAt = n.word("cast", "Emma");
  const stopwordAt = n.word("cast", "no stopword");
  const castAt = n.word("cast", "cast");
  const castAts = [n.word("cast", "Mister Knightley"), n.word("cast", "Missus Weston"), n.word("cast", "Mister Elton")];
  const fiveAt = n.word("bigger-in", "would five");
  const ml1At = n.word("phrases", "machine learning", { nth: 1 });
  const overAt = n.word("cast", "Over");
  // Fig. 13 steps back as the counting starts over a whole book.
  const back13 = 1 - 0.55 * ease(frame, overAt - 2, 16);

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

  const castUnit = 300 / cast[0][1];
  const mlAts = [ml1At - 4, ml1At + 6, ml1At + 14];

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

      <div style={{ position: "absolute", inset: 0, opacity: back13 }}>
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
          lift={inB.has(t.text) ? 0 : 10 * pulse(frame, loneAt - 2, 26)}
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
      {/* A lone "not" turns up in praise too: the pair is what carries the sign. */}
      <Tile text="not bad" x={aGrams[notGood].x} y={rowA + tileH(SIZE) + 12} size={CHIP} at={praiseAt - 2} marks={[{ at: notBadAt - 2 }]} />
      <Note at={notBadAt + 2} x={aGrams[notGood].x + tileW("not bad", CHIP) + 14} y={rowA + tileH(SIZE) + 12}>
        <div style={{ height: tileH(CHIP), display: "flex", alignItems: "center", ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          praise has a lone not too
        </div>
      </Note>
      <Note at={pairAt - 2} x={aGrams[notGood].x} y={rowA + tileH(SIZE) + tileH(CHIP) + 28}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          the pair is what a model can learn is <Marked at={negativeAt - 2}>negative</Marked>
        </div>
      </Note>
      <Note at={hasAt + 4} x={bGrams[bGrams.length - 1].x + bGrams[bGrams.length - 1].w + 16} y={rowB}>
        <div style={{ height: tileH(CHIP), display: "flex", alignItems: "center", ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          no <Mono size={22} color={INK_SOFT}>&nbsp;not good&nbsp;</Mono> here
        </div>
      </Note>

      </div>

      {/* Fig. 14: counted pairs. */}
      <FigLabel n="14" title="The most common bigrams" at={findsAt - 4} x={T1} y={y(568)} />
      <Ink at={linesAt - 2} dur={12} style={{ left: T1, top: y(568) + 46, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 600 }}>three lines about machine learning</span>
      </Ink>
      {/* The three lines themselves, then what counting their bigrams finds. */}
      {PHRASES.sentences.map((line, k) => (
        <Ink key={line} at={linesAt + 4 + k * 6} dur={12} style={{ left: T1, top: rowY(0) + k * 28, whiteSpace: "nowrap" }}>
          <Mono size={20} color={INK_SOFT}>
            {line}
          </Mono>
        </Ink>
      ))}
      {ml.map(([p, c], i) => {
        const x = T1 + ml.slice(0, i).reduce((sum, [q]) => sum + tileW(q, CHIP) + 70, 0);
        return (
          <React.Fragment key={p}>
            <Tile text={p} x={x} y={rowY(2) - 6} size={CHIP} at={mlAts[i] - 2} marks={i === 0 ? [{ at: topPairAt - 2 }] : []} border={i === 0 ? INK : undefined} />
            <Note at={mlAts[i] + 4} x={x + tileW(p, CHIP) + 8} y={rowY(2) - 6}>
              <div style={{ height: tileH(CHIP), display: "flex", alignItems: "center", ...numStyle(22, i === 0 ? ACCENT_INK : INK) }}>
                {i === 0 ? <Marked at={timesAt - 2}>×{c}</Marked> : `×${c}`}
              </div>
            </Note>
          </React.Fragment>
        );
      })}
      <Ink at={emmaAt - 2} dur={12} style={{ left: T2, top: y(568) + 46, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), fontWeight: 600 }}>
          all of Emma<span style={{ opacity: ease(frame, stopwordAt - 2, 10) }}>, pairs with no stopword</span>
        </span>
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
