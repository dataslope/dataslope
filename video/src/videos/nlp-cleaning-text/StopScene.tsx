import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FOX, STOPLIST } from "./data";
import { Chip, Headline, Kicker, LabelEnd, lerp, Mark, rowLayout, rowWidth, Spot, X0 } from "./parts";

const SIZE = 32;
const FIG9_Y = 300;
const SAMPLE_Y = 356;
const FIG10_Y = 548;
const ROW_Y = 604;
const GHOST_Y = 694;
const NOTE_Y = 800;
const COUNT_X = 520;

/**
 * Part 3 opens: NLTK's English stopword list (198 words, the lesson's
 * examples first), and the lesson's fox sentence filtered against it: five
 * of twelve tokens drop out and the seven content words close ranks.
 */
export const StopScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("stop").from;
  const sampleAt = [n.word("stop", "the", { nth: 2 }), n.word("stop", "is"), n.word("stop", "of")];
  const stopwordsAt = n.word("define", "stopwords");
  const countAt = n.word("define", "ninety-eight");
  const filterAt = n.word("fox", "Filter");
  const sentenceAt = n.word("fox", "sentence");
  const againstAt = n.word("fox", "against");
  const dropAt = n.word("removed", "drop");
  const sevenAt = n.word("removed", "seven");
  const meaningAt = n.word("removed", "meaning");
  const named = ["quick", "brown", "fox", "lazy", "dog", "park"].map((w) => ({ w, at: n.word("removed", w) }));
  const searchAt = n.word("win", "search");
  const winAt = n.word("win", "win");
  const elseAt = n.word("trap-in", "else");

  // ── Geometry ──
  const row = rowLayout(FOX.tokens, X0, SIZE);
  const final = rowLayout(FOX.content, X0, SIZE);
  const figRight = X0 + rowWidth(FOX.tokens, SIZE);
  const sample = rowLayout(["the", "is", "of"], X0, SIZE);
  const removed = FOX.tokens.length - FOX.content.length;
  const rowAt = FOX.tokens.map((_, i) => sentenceAt + i * 3);
  let rank = 0;
  let drop = 0;
  const plan = FOX.tokens.map((t, i) => (FOX.isStop[i] ? { stop: true, k: drop++ } : { stop: false, k: rank++ }));
  const close = ease(frame, sevenAt, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 8} level={-30} />
      {sampleAt.map((a, i) => (
        <Sfx key={`s${i}`} name="el-tap" at={a} level={-28} />
      ))}
      <Sfx name="el-pencil" at={countAt - 2} level={-34} />
      {rowAt.filter((_, i) => i % 2 === 0).map((a, i) => (
        <Sfx key={`r${i}`} name="el-tap" at={a} level={-29} />
      ))}
      <Sfx name="el-whoosh" at={dropAt} level={-33} />
      <Sfx name="el-whoosh" at={sevenAt} level={-36} />

      <Kicker at={from - 6}>Stopwords</Kicker>
      <Headline lead="The most common words" turn="say the least." at={from - 4} turnAt={from + 12} />
      <Spot id="nlp-cleaning-text-sieve" at={from + 8} left={1446} top={250} width={318} height={320} />

      {/* Fig. 9: the list, its first examples, and its size. */}
      <FigLabel n="9" title="NLTK's English stopwords" at={from} x={X0} y={y(FIG9_Y)} />
      {["the", "is", "of"].map((w, i) => (
        <Chip key={w} text={w} x={sample[i].x} y={y(SAMPLE_Y)} at={sampleAt[i]} size={SIZE} marks={[{ at: stopwordsAt + i * 3, out: filterAt }]} />
      ))}
      <Ink at={countAt - 2} dur={18} style={{ left: COUNT_X, top: y(FIG9_Y) + 30, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ ...headline(104), ...TABULAR, color: INK }}>
          <Mark at={elseAt}>{STOPLIST.count}</Mark>
        </span>
        <span style={{ ...body(32), color: INK_SOFT }}>words on the list</span>
      </Ink>

      {/* Fig. 10: the fox sentence, filtered. */}
      <FigLabel n="10" title="One sentence, filtered" at={filterAt - 2} x={X0} y={y(FIG10_Y)} />
      <LabelEnd
        at={againstAt}
        x={figRight}
        y={y(FIG10_Y)}
        call="t not in stop"
        count={`${removed} of ${FOX.tokens.length} removed`}
        countAt={dropAt}
      />
      {FOX.tokens.map((t, i) => {
        const p = plan[i];
        if (p.stop) {
          const f = ease(frame, dropAt + p.k * 3, 16);
          return (
            <Chip key={i} text={t} x={row[i].x} y={lerp(y(ROW_Y), y(GHOST_Y), f)} at={rowAt[i]} size={SIZE} gone={dropAt + p.k * 3} />
          );
        }
        const mark = named.find((m) => m.w === t);
        return (
          <Chip
            key={i}
            text={t}
            x={lerp(row[i].x, final[p.k].x, close)}
            y={y(ROW_Y)}
            at={rowAt[i]}
            size={SIZE}
            tones={[{ at: meaningAt, tone: "good" }]}
            marks={mark ? [{ at: mark.at, out: searchAt }] : []}
          />
        );
      })}

      <Ink at={searchAt - 4} dur={16} style={{ left: X0, top: y(NOTE_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36), color: INK }}>
          For search and topics, a <span style={{ fontStyle: "italic" }}>clear win.</span>
        </span>
      </Ink>
      <Sfx name="el-pencil" at={winAt - 6} level={-36} />
    </AbsoluteFill>
  );
};
