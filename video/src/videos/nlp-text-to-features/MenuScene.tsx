import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOW } from "./data";
import {
  Arrow,
  Card,
  Chip,
  ChipRow,
  CHIP_LINE,
  FIG_Y,
  Headline,
  INK,
  INK_SOFT,
  Kicker,
  Mark,
  NumCell,
  pulse,
  Spot,
  SURFACE,
  X0,
} from "./parts";

/** Fig. 1: the first bag-of-words document, as words and as its row. */
const ROW_Y = 352;
const CELL = { x0: 930, w: 70, step: 76, top: 344, h: 60 };
const WORDS_LABEL_Y = 424;
/** Fig. 2: the menu of steps. */
const FIG2_Y = 488;
const STATION_Y = 540;
const STATION_H = 112;
const TOKENIZE = { x: X0, w: 210 };
const OPTIONAL_X0 = 380;
const OPTIONAL_W = 220;
const OPTIONAL_STEP = 260;
const QUESTIONS = ["lowercase?", "drop stopwords?", "stem or lemmatize?", "add n-grams?"];
const TEST_Y = 708;
const PILL_Y = 788;

const DOC = BOW.docs[0];
const ROW = BOW.rows[0];
const MAX = Math.max(...ROW);

/**
 * Part 1 opens on Unit 3's last line: a model wants numbers, not lists of
 * words. Fig. 1 sets the first bag-of-words document beside the row of
 * counts it becomes in Part 2; Fig. 2 lays the cleaning steps out as a menu
 * (tokenize, then four questions), and the lesson's one question for every
 * step arrives under it.
 */
export const MenuScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const numbersAt = n.word("hook", "numbers");
  const listsAt = n.word("hook", "not lists");
  const turnsAt = n.word("unit", "turns text");
  const featuresAt = n.word("unit", "features");
  const rowsAt = n.word("unit", "rows of numbers");
  const learnAt = n.word("unit", "learn from");
  const choiceAt = n.word("menu", "a choice");
  const menuAt = n.word("menu", "a menu");
  const recipeAt = n.word("menu", "recipe");
  const tokenizeAt = n.word("steps", "tokenize");
  const questionAt = n.word("steps", "a question");
  const askAt = [
    n.word("steps", "Lowercase"),
    n.word("steps", "Drop stopwords"),
    n.word("steps", "Stem or lemmatize"),
    n.word("steps", "Add n-grams"),
  ];
  const testAt = n.word("test", "same test");
  const doesAt = n.word("test", "Does what");
  const matterAt = n.word("test", "matter to your task");
  const noiseAt = n.word("test", "noise");
  const signalAt = n.word("test", "signal");

  const optionalX = (k: number) => OPTIONAL_X0 + k * OPTIONAL_STEP;
  const stationMid = y(STATION_Y) + h(STATION_H) / 2;
  const glow = pulse(frame, learnAt - 2, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the row of numbers, the words, the arrow, the menu's stations, the test ── */}
      <Sfx name="el-pencil" at={hookFrom - 4} level={-36} />
      <Sfx name="el-tap" at={numbersAt - 2} level={-28} />
      <Sfx name="el-tap" at={listsAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={turnsAt} level={-34} />
      <Sfx name="el-pop" at={menuAt} level={-30} />
      <Sfx name="el-tap" at={tokenizeAt - 4} level={-28} />
      {askAt.map((t, k) => (
        <Sfx key={k} name="el-tap" at={t - 4} level={-29} />
      ))}
      <Sfx name="el-pencil" at={doesAt - 4} level={-35} />

      <Kicker at={hookFrom - 10}>Choosing the pipeline</Kicker>
      <Headline at={hookFrom - 4} second={listsAt - 4} out={choiceAt - 6} italic="not lists of words.">
        A model wants numbers,
      </Headline>
      <Headline at={menuAt - 2} second={recipeAt - 4} italic="not a recipe.">
        A menu,
      </Headline>

      {/* ── Fig. 1: one document as words, and as the row of counts it becomes ── */}
      <FigLabel n="1" title="One document, as a list of words and as a row of numbers" at={hookFrom - 2} x={X0} y={y(FIG_Y)} />
      <ChipRow x={X0} y={y(ROW_Y)}>
        {DOC.map((w, k) => (
          <Chip key={k} text={w} size={28} at={listsAt - 2 + k * 2} />
        ))}
      </ChipRow>
      <Note at={turnsAt} x={X0} y={y(WORDS_LABEL_Y)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>a list of words</span>
      </Note>
      <Arrow from={[740, y(ROW_Y) + 22]} to={[880, y(ROW_Y) + 22]} at={turnsAt} dur={16} color={INK_SOFT} />
      {BOW.vocab.map((w, j) => (
        <Note key={w} at={numbersAt + j} x={CELL.x0 + j * CELL.step + CELL.w / 2} y={y(CELL.top) - 34} style={{ transform: "translateX(-50%)" }}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>{w}</span>
        </Note>
      ))}
      {ROW.map((c, j) => (
        <NumCell
          key={j}
          value={c}
          at={numbersAt + j}
          x={CELL.x0 + j * CELL.step}
          y={y(CELL.top)}
          w={CELL.w}
          h={h(CELL.h)}
          heat={c / MAX + glow * 0.5}
          faint={c === 0}
        />
      ))}
      <Note at={featuresAt - 2} x={CELL.x0} y={y(WORDS_LABEL_Y)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <Mark at={rowsAt - 2}>a row of numbers</Mark>: features
        </span>
      </Note>

      {/* ── Fig. 2: tokenize, then a question at every step ── */}
      <FigLabel n="2" title="The cleaning steps: a menu, not a recipe" at={menuAt - 4} x={X0} y={y(FIG2_Y)} />
      <Card at={tokenizeAt - 4} x={TOKENIZE.x} y={y(STATION_Y)} w={TOKENIZE.w} h={h(STATION_H)} fill={SURFACE} line={INK}>
        <span style={label(26, INK)}>tokenize</span>
        <span style={{ ...note(20, INK_SOFT), marginTop: 6 }}>nearly always</span>
      </Card>
      {QUESTIONS.map((q, k) => (
        <React.Fragment key={q}>
          <Arrow
            from={[(k === 0 ? TOKENIZE.x + TOKENIZE.w : optionalX(k - 1) + OPTIONAL_W) + 6, stationMid]}
            to={[optionalX(k) - 8, stationMid]}
            at={k === 0 ? questionAt - 4 : askAt[k] - 6}
            dur={8}
            color={INK_SOFT}
            width={2}
            head={10}
          />
          <Card at={askAt[k] - 4} x={optionalX(k)} y={y(STATION_Y)} w={OPTIONAL_W} h={h(STATION_H)} dashed line={CHIP_LINE}>
            <span style={{ ...label(24, INK), width: OPTIONAL_W - 30, lineHeight: 1.2 }}>{q}</span>
          </Card>
        </React.Fragment>
      ))}
      <Spot id="toolbox" at={menuAt} left={1460} top={y(452)} width={340} height={340} />

      {/* ── The one question, the lesson's callout ── */}
      <Note at={testAt - 2} x={X0} y={y(TEST_Y) - 38}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>The same test, at every step</span>
      </Note>
      <Ink at={doesAt - 4} dur={22} style={{ left: X0, top: y(TEST_Y), ...body(40, true), color: INK, whiteSpace: "nowrap" }}>
        Does what this step throws away <Mark at={matterAt - 2}>matter to your task?</Mark>
      </Ink>
      {[
        { at: noiseAt - 2, x: X0, text: "If it’s noise: drop it." },
        { at: signalAt - 2, x: X0 + 400, text: "If it’s signal: keep it." },
      ].map((p) => (
        <Note key={p.text} at={p.at} x={p.x} y={y(PILL_Y)}>
          <span
            style={{
              ...note(24, INK),
              display: "inline-block",
              padding: "8px 18px 10px",
              border: `1.5px solid ${CHIP_LINE}`,
              borderRadius: 999,
              whiteSpace: "nowrap",
              opacity: 0.4 + 0.6 * ease(frame, p.at, 12),
            }}
          >
            {p.text}
          </span>
        </Note>
      ))}
    </AbsoluteFill>
  );
};
