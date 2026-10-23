import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, body, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { familyOf, LEMMA } from "./data";
import { columns, FAMILY, Headline, Kicker, MARK_BAD, Marked, Mono, TagChip, Tile, tileH } from "./parts";

const LABEL_X = 120;
const COL_X = 400;
const SIZE = 24;
const GAP = 14;
const ROW_Y = { words: 362, naive: 452, tags: 540, aware: 626 };

/**
 * Tag, then lemmatize: the lesson's runners sentence, its lemmas with
 * WordNet's default noun (running and eaten untouched), the tags, and the
 * lemmas with each word's tag passed along (be, run, have, eat).
 */
export const LemmaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("lemma").from;
  const lemmatizingAt = n.word("lemma", "lemmatizing");
  const wordnetAt = n.word("lemma", "WordNet");
  const nounAt = n.word("lemma", "noun");
  const runnersAt = n.word("untouched", "runners");
  const runningAt = n.word("untouched", "running", { nth: 2 });
  const eatenAt = n.word("untouched", "eaten", { nth: 2 });
  const untouchedAt = n.word("untouched", "untouched");
  const tagFirstAt = n.word("tagfirst", "Tag first");
  const handAt = n.word("tagfirst", "hand");
  const runAt = n.word("tagfirst", "run");
  const eatAt = n.word("tagfirst", "eat");
  const wereAt = n.word("tagfirst", "were");
  const beAt = n.word("tagfirst", "be and have");
  const recipeAt = n.word("recipe", "Tag");
  const lemmatizeAt = n.word("recipe", "lemmatize");
  const accurateAt = n.word("recipe", "accurate");
  const oneAt = n.word("pairs-in", "one word");
  const stillAt = n.word("pairs-in", "Still");
  const soAt = n.word("untouched", "So");
  const otherwiseAt = n.word("lemma", "otherwise");
  const recipeWordAt = n.word("recipe", "recipe");
  // The working steps back once the recipe is said, for the next idea.
  const back = 1 - 0.65 * ease(frame, stillAt - 2, 16);
  const timeAt = n.word("pairs-in", "time");

  const words = LEMMA.tagged.map(([w]) => w);
  const cols = columns([words, LEMMA.naive, LEMMA.aware], COL_X, SIZE, GAP);
  const changed = LEMMA.aware.map((a, i) => a !== LEMMA.naive[i]);
  const awareAt = (i: number) => {
    const w = words[i];
    if (w === "running") return runAt - 2;
    if (w === "eaten") return eatAt - 2;
    if (w === "were" || w === "had") return beAt - 2 + (w === "had" ? 6 : 0);
    return handAt + 4 + i * 2;
  };
  const untouched = (i: number) => words[i] === "running" || words[i] === "eaten";
  // "one word at a time": a frame steps along the sentence, a word per step.
  const stepDur = Math.max(4, Math.floor((timeAt + 12 - oneAt) / words.length));
  const stepI = Math.floor((frame - oneAt) / stepDur);
  const stepOn = frame >= oneAt && stepI >= 0 && stepI < words.length;

  const row = (key: keyof typeof ROW_Y) => y(ROW_Y[key]);
  const rowLabel = (text: string, at: number, key: keyof typeof ROW_Y, color: string = INK_SOFT) => (
    <Ink at={at} dur={12} style={{ left: LABEL_X, top: row(key), height: tileH(SIZE), display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
      <span style={{ ...label(22, color), fontWeight: 600 }}>{text}</span>
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the naive row, the tags, the corrected lemmas, the stepping frame ── */}
      <Sfx name="el-whoosh" at={runnersAt - 6} level={-35} />
      <Sfx name="el-scratch" at={untouchedAt - 2} level={-33} />
      <Sfx name="el-tap" at={tagFirstAt - 2} level={-28} />
      <Sfx name="el-pop" at={runAt - 2} level={-30} />
      <Sfx name="el-pop" at={eatAt - 2} level={-30} />
      <Sfx name="el-chime" at={n.beat("recipe").to + 4} level={-33} />

      <Kicker at={from - 10}>Tagging words</Kicker>
      <Headline at={lemmatizingAt - 6}>Tags fix the lemmatizer</Headline>

      <FigLabel n="11" title="Lemmas without tags, and with them" at={from - 2} x={LABEL_X} y={y(262)} />

      {/* The sentence. */}
      {rowLabel("the words", from + 4, "words")}
      {words.map((w, i) => (
        <Tile
          key={`w${i}`}
          text={w}
          x={cols.xs[i]}
          y={row("words")}
          w={cols.widths[i]}
          size={SIZE}
          at={from + 2 + i * 3}
          border={stepOn && stepI === i ? ACCENT : undefined}
          marks={stepOn && stepI === i ? [{ at: oneAt + i * stepDur, out: oneAt + (i + 1) * stepDur, color: MARK_BAD }] : []}
        />
      ))}
      <Note at={wordnetAt - 2} x={COL_X} y={row("words") - 54}>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <Mono size={21} color={INK_SOFT}>
            WordNetLemmatizer
          </Mono>{" "}
          <Marked at={nounAt - 2}>calls every word a noun</Marked>
          <span style={{ opacity: ease(frame, otherwiseAt - 4, 10) }}> unless told otherwise</span>
        </div>
      </Note>

      {/* Lemmas with the default noun. */}
      <div style={{ position: "absolute", inset: 0, opacity: back }}>
      {rowLabel("no tags", soAt - 2, "naive")}
      {LEMMA.naive.map((w, i) => (
        <Tile
          key={`n${i}`}
          text={w}
          x={cols.xs[i]}
          y={row("naive")}
          w={cols.widths[i]}
          size={SIZE}
          at={runnersAt - 4 + i * 2}
          marks={untouched(i) ? [{ at: (words[i] === "running" ? runningAt : eatenAt) - 2, color: MARK_BAD }] : changed[i] ? [{ at: wereAt - 2 + i, color: MARK_BAD }] : []}
        />
      ))}

      {/* The tags. */}
      {rowLabel("tags", tagFirstAt - 6, "tags")}
      {LEMMA.tagged.map(([, tag], i) => (
        <TagChip key={`t${i}`} tag={tag} family={familyOf(tag)} cx={cols.xs[i] + cols.widths[i] / 2} y={row("tags") + 4} at={tagFirstAt - 2 + i * 2} size={21} glow={changed[i] ? ease(frame, awareAt(i) - 8, 8) * (1 - ease(frame, awareAt(i) + 4, 10)) : 0} />
      ))}

      {/* Lemmas with each tag passed along. */}
      {rowLabel("with tags", handAt - 2, "aware", INK)}
      {LEMMA.aware.map((w, i) => {
        const fam = familyOf(LEMMA.tagged[i][1]);
        return (
          <Tile
            key={`a${i}`}
            text={w}
            x={cols.xs[i]}
            y={row("aware")}
            w={cols.widths[i]}
            size={SIZE}
            at={awareAt(i)}
            tint={changed[i] ? FAMILY[fam].tint : undefined}
            border={changed[i] ? FAMILY[fam].fill : undefined}
          />
        );
      })}
      <Note at={untouchedAt - 2} x={cols.right + 24} y={row("naive")}>
        <div style={{ height: tileH(SIZE), display: "flex", alignItems: "center", ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>untouched</div>
      </Note>
      <Note at={runAt} x={cols.right + 24} y={row("aware")}>
        <div style={{ height: tileH(SIZE), display: "flex", alignItems: "center", ...label(22, FAMILY.verb.ink), fontWeight: 600, whiteSpace: "nowrap" }}>
          the verbs, fixed
        </div>
      </Note>

      {/* The recipe. */}
      <Ink at={recipeAt - 4} dur={18} style={{ left: COL_X, top: y(744), whiteSpace: "nowrap" }}>
        <span style={{ ...body(44), color: INK }}>
          Tag, then <Slot at={lemmatizeAt - 2}>lemmatize.</Slot>
        </span>
      </Ink>
      <Note at={accurateAt - 2} x={COL_X} y={y(744) + 70}>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          the accurate <Marked at={recipeWordAt - 2}>recipe</Marked>
        </div>
      </Note>
      </div>
    </AbsoluteFill>
  );
};

/** Words that ink in on their own cue inside a line already showing. */
const Slot: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return <span style={{ opacity: p, display: "inline-block", transform: `translateX(${(1 - p) * -8}px)` }}>{children}</span>;
};
