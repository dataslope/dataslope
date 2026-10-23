import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { changed, dropped, PIPE, PIPE_COLS } from "./data";
import { Chip, chipWidth, CodeStrip, Count, Drift, FIG_Y, Headline, Kicker, Mark, X0 } from "./parts";

const SIZE = 24;
const GAP = 10;
const COL_X0 = 336;
const RAW_Y = 334;
const ROW_Y0 = 410;
const ROW_STEP = 82;
const CODE_Y = 822;

/** One column per token of the first list, as wide as its widest form. */
const COL_W = PIPE_COLS.map((_, c) =>
  Math.max(...PIPE.stages.map((s) => s.tokens[s.cols.indexOf(c)] ?? "").map((t) => (t ? chipWidth(t, SIZE) : 0))),
);
const COL_XS = COL_W.map((_, c) => COL_X0 + COL_W.slice(0, c).reduce((a, b) => a + b + GAP, 0));
const COUNT_X = 1800;
const ROW_RIGHT = COL_XS[COL_XS.length - 1] + COL_W[COL_W.length - 1];
/** Lines the lesson prints, one per step: "1. tokenized" and so on. */
const STAGE_LABELS = PIPE.stages.map((s, k) => `${k + 1}. ${s.name}`);

/**
 * Part 3 opens: the pipeline. The lesson's sentence through its five steps,
 * one row per printed line, every token kept in its column so the list is
 * seen to shrink: what a step drops flashes in the row it leaves and stays as
 * a struck ghost in the step's own row, what it changes is highlighted in its
 * own row, and each row's length is counted. The lemmatizer leaves running
 * and barking alone, read as nouns; the narration says why in one clause.
 */
export const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("pipeline").from;
  const sequenceAt = n.word("pipeline", "sequence");
  const outputAt = n.word("pipeline", "output");
  const inputAt = n.word("pipeline", "input");
  const tokenizingAt = n.word("tokenized", "Tokenizing");
  const thirteenAt = n.word("tokenized", "thirteen");
  const punctAt = n.word("tokenized", "punctuation");
  const lowerAt = n.word("lowercased", "Lowercasing");
  const capitalsAt = n.word("lowercased", "capitals");
  const commaAt = n.word("cleaned", "comma");
  const exclAt = n.word("cleaned", "exclamation");
  const elevenAt = n.word("cleaned", "Eleven");
  const littleAt = n.word("stopped", "drops");
  const sixAt = n.word("stopped", "Six");
  const lemmaAt = n.word("lemmatized", "lemmatizing");
  const catAt = n.word("lemmatized", "cat");
  const dogAt = n.word("lemmatized", "dog");
  const keptAt: Record<string, number> = {
    running: n.word("running", "Running"),
    barking: n.word("running", "barking"),
  };
  const verbsAt = n.word("running", "verbs");
  const comprehensionAt = n.word("list", "list comprehension");
  const easyAt = n.word("list", "easy");
  const choosingAt = n.word("list", "Choosing");
  const hardAt = n.word("list", "hard part");
  const end = n.beat("cleaning").from;

  // When each row arrives, and how its tokens come in.
  const rowAt = [tokenizingAt + 2, lowerAt + 2, elevenAt - 8, sixAt - 10, lemmaAt + 4];
  const countAt = [thirteenAt - 2, lowerAt + 10, elevenAt - 2, sixAt - 2, lemmaAt + 12];
  // "A fixed sequence of steps": the five step names arrive down the left
  // as the sequence is named.
  const labelAt = PIPE.stages.map((_, k) => sequenceAt + k * 5);
  // What each step drops: the token flashes red in the row it leaves, then
  // stays behind as a struck ghost in the row of the step that dropped it.
  const strikeAt = (k: number, c: number) => {
    if (k === 2) return PIPE_COLS[c] === "," ? commaAt : exclAt;
    if (k === 3) return littleAt + dropped(3).indexOf(c) * 3;
    return undefined;
  };
  const hlAt = (k: number, c: number) => {
    if (k === 1 && changed(1).includes(c)) return capitalsAt + changed(1).indexOf(c) * 3;
    if (k === 4 && changed(4).includes(c)) return changed(4).indexOf(c) === 0 ? catAt : dogAt;
    if (k === 4) return keptAt[PIPE.stages[4].tokens[PIPE.stages[4].cols.indexOf(c)]];
    return undefined;
  };
  const rowY = (k: number) => y(ROW_Y0 + k * ROW_STEP);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pencil" at={from} level={-36} />
      {rowAt.map((t, k) => (
        <Sfx key={k} name={k === 0 ? "el-sprinkle" : "el-whoosh"} at={t} level={k === 0 ? -31 : -36} />
      ))}
      {countAt.map((t, k) => (
        <Sfx key={k} name="el-tap" at={t} level={-31} />
      ))}
      <Sfx name="el-scratch" at={commaAt} level={-35} />
      <Sfx name="el-scratch" at={littleAt} level={-35} />
      <Sfx name="el-pencil" at={comprehensionAt - 6} level={-35} />

      <Kicker at={from - 10}>The pipeline</Kicker>
      <Headline lead="Each step's output" turn="is the next one's input." at={from - 6} turnAt={inputAt - 8} size={68} />

      <Drift from={from} to={end} amount={0.01} origin="50% 50%">
        <FigLabel n="9" title="The lesson's sentence, through five steps" at={from + 2} x={X0} y={y(FIG_Y)} />

        {/* The raw string. */}
        <Ink at={outputAt - 6} dur={14} style={{ left: X0, top: y(RAW_Y) + 4, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, INK_SOFT) }}>raw text</span>
        </Ink>
        <Ink at={outputAt - 2} dur={20} style={{ left: COL_X0, top: y(RAW_Y), whiteSpace: "pre" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK }}>"{PIPE.text}"</span>
        </Ink>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(RAW_Y) + 52,
            width: 1680 * ease(frame, outputAt, 16),
            height: 1,
            background: HAIRLINE,
            opacity: 0.6,
          }}
        />

        {/* "A fixed sequence of steps": a faint rule between each step and
            the next, drawn in order. */}
        {PIPE.stages.slice(0, -1).map((s, k) => (
          <div
            key={`rule-${s.name}`}
            style={{
              position: "absolute",
              left: X0,
              top: rowY(k) + 60,
              width: 1680 * ease(frame, sequenceAt + k * 5, 18),
              height: 1,
              background: HAIRLINE,
              opacity: 0.35,
            }}
          />
        ))}
        {PIPE.stages.map((s, k) => (
          <React.Fragment key={s.name}>
            <Ink at={labelAt[k]} dur={14} style={{ left: X0, top: rowY(k) + 6, whiteSpace: "nowrap" }}>
              <span style={{ ...label(22, INK), fontWeight: 600 }}>
                <Mark at={choosingAt + k * 3} out={hardAt + 30}>
                  {STAGE_LABELS[k]}
                </Mark>
              </span>
            </Ink>
            {s.cols.map((c, i) => {
              const next = PIPE.stages[k + 1];
              const leaves = next && !next.cols.includes(c) ? strikeAt(k + 1, c) : undefined;
              const w = chipWidth(s.tokens[i], SIZE);
              return (
                <Chip
                  key={c}
                  text={s.tokens[i]}
                  x={COL_XS[c] + (COL_W[c] - w) / 2}
                  y={rowY(k)}
                  at={rowAt[k] + i * (k === 0 ? 2.2 : 1)}
                  size={SIZE}
                  flash={leaves}
                  hl={hlAt(k, c) ?? (k === 0 && (PIPE_COLS[c] === "," || PIPE_COLS[c] === "!") ? punctAt : undefined)}
                  hlOut={k === 0 ? punctAt + 26 : undefined}
                />
              );
            })}
            {/* The tokens this step dropped, as struck ghosts in its own row. */}
            {k > 0
              ? dropped(k).map((c, i) => {
                  const prev = PIPE.stages[k - 1];
                  const t = prev.tokens[prev.cols.indexOf(c)];
                  const w = chipWidth(t, SIZE);
                  const at = rowAt[k] + i * 2;
                  return (
                    <Chip key={`ghost-${c}`} text={t} x={COL_XS[c] + (COL_W[c] - w) / 2} y={rowY(k)} at={at} size={SIZE} strike={at + 3} />
                  );
                })
              : null}
            <Count value={s.tokens.length} at={countAt[k]} x={COUNT_X} y={rowY(k) + 4} align="right" size={28} />
          </React.Fragment>
        ))}

        {/* Running and barking are left alone: read as nouns. */}
        <Ink at={verbsAt - 4} dur={14} style={{ left: ROW_RIGHT + 28, top: rowY(4) + 6, whiteSpace: "nowrap" }}>
          <span style={{ ...body(28, true), color: INK_SOFT }}>read as nouns</span>
        </Ink>

        {/* Step 2 as the lesson writes it. */}
        <CodeStrip line="tokens = [t.lower() for t in tokens]" x={X0} y={y(CODE_Y)} at={comprehensionAt - 6} size={26} />
        <Ink at={easyAt - 4} dur={14} style={{ left: X0 + 640, top: y(CODE_Y) + 12, whiteSpace: "nowrap" }}>
          <span style={{ ...body(30, true), color: INK_SOFT }}>step 2, as one line of Python</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
