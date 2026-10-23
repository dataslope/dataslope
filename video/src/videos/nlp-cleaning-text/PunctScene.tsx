import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, body, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { PUNCT } from "./data";
import { Chip, chipHeight, Headline, Kicker, RawText, rowLayout, Tag, type ToneStep, X0 } from "./parts";

const SIZE = 32;
const FIG_Y = 300;
const RAW_Y = 350;
const ROWS_Y = [436, 552, 668];
const CHIPS_X = 540;
const NOTE_Y = 790;
/** The marks a sentence tokenizer reads as ends: a pale wash of the blue the
 *  video gives a unit worth keeping. */
const CLUE = `color-mix(in srgb, ${BAR} 26%, transparent)`;

const find = (list: readonly string[], t: string) => {
  const i = list.indexOf(t);
  if (i < 0) throw new Error(`"${t}" is not in [${list.join(", ")}]`);
  return i;
};

/** A recipe's name in the code face from `at`, and what it does under it
 *  from `doesAt`, when the narration describes it. */
const Recipe: React.FC<{ at: number; doesAt: number; y: number; call: string; does: string }> = ({ at, doesAt, y, call, does }) => (
  <>
    <Ink at={at} dur={14} style={{ left: X0, top: y, whiteSpace: "nowrap" }}>
      <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 600, color: INK, fontVariantLigatures: "none" }}>{call}</div>
    </Ink>
    <Ink at={doesAt} dur={14} style={{ left: X0, top: y + 36, whiteSpace: "nowrap" }}>
      <div style={note(20, INK_SOFT)}>{does}</div>
    </Ink>
  </>
);

/**
 * The lesson's three punctuation recipes on one line: isalpha() drops every
 * token a mark touched, translate() glues contractions shut, the regex splits
 * them at the apostrophe. Then its order tip: strip after tokenizing.
 */
export const PunctScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("punct").from;
  const threeAt = n.word("punct", "three");
  const recipesAt = n.word("punct", "recipes");
  const lineAt = n.word("punct", "line");
  const exclAt = n.word("alpha", "exclamation");
  const punctuationAt = n.word("alpha", "punctuation");
  const charactersAt = n.word("translate", "characters");
  const surviveAt = n.word("translate", "survive");
  const cleaningAt = n.word("look", "cleaning");
  const didAt = n.word("look", "did");
  const cluesAt = n.word("order", "clues");
  const nextAt = n.word("stop-in", "Next");
  const everywhereAt = n.word("stop-in", "everywhere");
  const firstAt = n.word("alpha", "first");
  const keepsAt = n.word("alpha", "keeps");
  const lettersAt = n.word("alpha", "letters");
  const worldAt = n.word("alpha", "World");
  const loseAt = n.word("alpha", "lose");
  const secondAt = n.word("translate", "second");
  const deletesAt = n.word("translate", "deletes");
  const gluedAt = n.word("translate", "glued");
  const itsAt = n.word("translate", "it's");
  const isntAt = n.word("translate", "isn't");
  const thirdAt = n.word("regex", "third");
  const pullsAt = n.word("regex", "pulls");
  const splitsAt = n.word("regex", "splits");
  const apostropheAt = n.word("regex", "apostrophe");
  const lookFrom = n.beat("look").from;
  const answersAt = n.word("look", "answers");
  const lookAt = n.word("look", "look");
  const afterAt = n.word("order", "after");
  const neverAt = n.word("order", "never");

  // ── Geometry ──
  const rows = [PUNCT.split, PUNCT.translate, PUNCT.regex];
  const starts = [keepsAt, deletesAt, pullsAt];
  const layouts = rows.map((r) => rowLayout(r, CHIPS_X, SIZE));
  const chipAt = (k: number, i: number) => starts[k] + i * 3;

  // Row 1: every piece a mark touched is dropped whole; World! is struck.
  const world = find(PUNCT.split, "World!");
  const kept = new Set(PUNCT.isalpha);
  const goneAt = (i: number) => (kept.has(PUNCT.split[i]) ? undefined : lettersAt + 4 + i * 2);
  // Row 2: the contractions glued shut. Row 3: split at the apostrophe.
  const glued = [find(PUNCT.translate, "its"), find(PUNCT.translate, "isnt")];
  const isn = find(PUNCT.regex, "isn");
  const s = find(PUNCT.regex, "s");
  const split = [isn, isn + 1, s - 1, s];
  const tones = (k: number, i: number): ToneStep[] => {
    if (k === 0) return kept.has(PUNCT.split[i]) ? [{ at: lettersAt + 20, tone: "good" }] : i === world ? [{ at: worldAt, tone: "bad" }] : [];
    if (k === 1) return glued.includes(i) ? [{ at: gluedAt + glued.indexOf(i) * 4, tone: "bad" }] : [];
    return split.includes(i) ? [{ at: splitsAt + (i >= s - 1 ? 8 : 0), tone: "bad" }] : [];
  };
  const marks = (k: number, i: number) => {
    // Each recipe's casualty lit as it is named, and again on "look at what
    // your cleaning actually did".
    if (k === 0 && i === world) return [{ at: loseAt, out: secondAt }, { at: lookAt, out: afterAt }];
    if (k === 1 && i === glued[0]) return [{ at: itsAt, out: isntAt }, { at: cleaningAt, out: afterAt }];
    if (k === 1 && i === glued[1]) return [{ at: isntAt, out: thirdAt }, { at: cleaningAt + 3, out: afterAt }];
    if (k === 2 && (i === isn || i === isn + 1)) return [{ at: splitsAt + 4, out: lookFrom }, { at: didAt + (i - isn) * 3, out: afterAt }];
    return [];
  };
  const chars = [...PUNCT.text];
  const apostrophes = chars.flatMap((c, i) => (c === "'" ? [i] : []));
  // Every punctuation character translate() deletes, and the marks a
  // sentence tokenizer reads as ends.
  const punctuation = chars.flatMap((c, i) => (/[!-/:-@[-`{-~]/.test(c) ? [i] : []));
  const ends = chars.flatMap((c, i) => (/[!?.]/.test(c) ? [i] : []));
  const rowsDim = 1 - ease(frame, nextAt, 14) * 0.35;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={from - 4} level={-36} />
      {rows.map((r, k) =>
        r
          .filter((_, i) => i % 2 === 0)
          .map((_, i) => <Sfx key={`${k}-${i}`} name="el-tap" at={chipAt(k, i * 2)} level={-29} />),
      )}
      <Sfx name="el-scratch" at={worldAt} level={-31} />

      <Kicker at={from - 6}>Normalization</Kicker>
      <Headline lead="One line," turn="three recipes." at={from - 4} turnAt={threeAt} out={lookFrom} />
      <Headline lead="Three recipes," turn="three answers." at={lookFrom + 10} turnAt={answersAt - 2} />

      <FigLabel n="8" title="Three ways to strip punctuation" at={from} x={X0} y={y(FIG_Y)} />
      <RawText
        text={PUNCT.text}
        x={X0}
        y={y(RAW_Y)}
        at={lineAt - 4}
        size={SIZE}
        marks={[
          ...punctuation.map((i, k) => ({ from: i, to: i + 1, at: charactersAt + k, out: surviveAt })),
          ...apostrophes.map((i) => ({ from: i, to: i + 1, at: apostropheAt, out: lookAt })),
          ...ends.map((i, k) => ({ from: i, to: i + 1, at: cluesAt + k, out: everywhereAt, color: CLUE })),
        ]}
      />

      <Recipe at={recipesAt} doesAt={firstAt} y={y(ROWS_Y[0]) + 2} call="w.isalpha()" does="keeps all-letter tokens" />
      <Recipe at={recipesAt + 5} doesAt={secondAt} y={y(ROWS_Y[1]) + 2} call="w.translate(table)" does="deletes punctuation characters" />
      <Recipe at={recipesAt + 10} doesAt={thirdAt} y={y(ROWS_Y[2]) + 2} call={'re.findall(r"[a-z]+")'} does="pulls out runs of letters" />

      <div style={{ position: "absolute", inset: 0, opacity: rowsDim }}>
        {rows.map((r, k) =>
          r.map((t, i) => (
            <Chip
              key={`${k}-${i}`}
              text={t}
              x={layouts[k][i].x}
              y={y(ROWS_Y[k])}
              at={chipAt(k, i)}
              size={SIZE}
              tones={tones(k, i)}
              marks={marks(k, i)}
              gone={k === 0 ? goneAt(i) : undefined}
              strike={k === 0 && i === world ? worldAt + 2 : undefined}
              hot={k === 0 && i === world ? { from: t.length - 1, to: t.length, at: exclAt } : undefined}
            />
          )),
        )}
        <Tag at={punctuationAt - 4} x={layouts[0][world].mid} y={y(ROWS_Y[0]) + chipHeight(SIZE) + 10} align="center">
          the whole word lost
        </Tag>
      </div>

      {/* The lesson's order tip, as it is said. */}
      <div style={{ position: "absolute", left: X0, top: y(NOTE_Y), display: "flex", gap: "0.26em", whiteSpace: "nowrap", ...body(36), color: INK }}>
        <Ink at={afterAt - 6} dur={16} style={{ position: "relative" }}>
          Strip it after you tokenize,
        </Ink>
        <Ink at={neverAt - 4} dur={16} style={{ position: "relative", fontStyle: "italic" }}>
          never before.
        </Ink>
      </div>
      <Sfx name="el-pencil" at={neverAt - 4} level={-36} />
    </AbsoluteFill>
  );
};
