import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FOX } from "./data";
import { CodePanel, DATA, flow, Headline, HBar, Kicker, MARK_BAD, Marked, Mono, numStyle, Spot, Tile } from "./parts";

const TILE_SIZE = 26;
const LEFT_X = 120;
const LEFT_MAX = 900;
const TOKENS_Y = 352;
const ROW_STEP = 62;
/** The FreqDist table on the right. */
const WORD_RIGHT = 1150;
const BAR_X = 1172;
const UNIT = 64;
const TABLE_Y = 346;
const ROW_H = 40;
/** The notes beside the short rows. */
const NOTE_X = BAR_X + 4 * UNIT + 60;

/**
 * Part 1 opens: the lesson's fox-and-dog text as thirty tokens, FreqDist
 * tallying them into thirteen rows (each bar growing as its words are
 * counted), most_common(5) and what it prints, and thirteen out of thirty as
 * the ratio the next scene names.
 */
export const CountScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const wordsAt = n.word("hook", "words");
  const cleanAt = n.word("hook", "clean");
  const countAt = n.word("hook", "count");
  const foxAt = n.word("fox", "fox");
  const dogAt = n.word("fox", "dog");
  const thirtyAt = n.word("fox", "thirty");
  const freqAt = n.word("tally", "FreqDist");
  const talliesAt = n.word("tally", "tallies");
  const thirteenAt = n.word("tally", "thirteen");
  const theAt = n.word("tally", "the word the");
  const eightAt = n.word("tally", "eight");
  const askAt = n.word("common", "Ask");
  const fiveAt = n.word("common", "five");
  const highestAt = n.word("common", "highest");
  const ratioThirteen = n.word("ratio-in", "thirteen");
  const ratioThirty = n.word("ratio-in", "thirty");
  const repeatsAt = n.word("ratio-in", "repeats");

  // ── The tokens ──
  const tiles = flow(FOX.tokens, LEFT_X, y(TOKENS_Y), LEFT_MAX, TILE_SIZE, 10, h(ROW_STEP));
  const tilesBottom = Math.max(...tiles.map((t) => t.y)) + h(46);
  const tileAt = (i: number) => wordsAt - 2 + Math.round(i * 0.9);
  // FreqDist reads them left to right: one token every 1.6 frames from "tallies".
  const step = 1.6;
  const countedAt = (i: number) => talliesAt + 2 + i * step;
  const sweepEnd = countedAt(FOX.tokens.length - 1);
  const firstSeen = new Map<string, number>();
  FOX.tokens.forEach((t, i) => {
    if (!firstSeen.has(t)) firstSeen.set(t, i);
  });
  const repeats = FOX.tokens.map((t, i) => firstSeen.get(t) !== i);

  // ── The table: one row per distinct word, in most_common() order ──
  const rowY = (k: number) => y(TABLE_Y) + k * h(ROW_H);
  const rowH = h(ROW_H);
  const tallyOf = (word: string) =>
    FOX.tokens.reduce((s, t, i) => (t === word ? s + ease(frame, countedAt(i), 5) : s), 0);
  const top5 = FOX.top5.length;

  return (
    <AbsoluteFill>
      {/* ── Sound: the tiles, the tally running through them, the printed result ── */}
      <Sfx name="el-sprinkle" at={wordsAt - 2} level={-33} />
      <Sfx name="el-sprinkle" at={talliesAt + 2} level={-31} />
      <Sfx name="el-tap" at={eightAt - 2} level={-26} />
      <Sfx name="el-pencil" at={askAt - 2} level={-35} />
      <Sfx name="el-tap" at={highestAt - 4} level={-27} />

      <Kicker at={hookFrom - 10}>Counting words</Kicker>
      <Headline at={cleanAt - 6} second={countAt - 4} italic="count them.">
        Once the words are clean,
      </Headline>
      <Spot id="nlp-counting-words-tally" at={countAt - 2} left={1610} top={y(76)} width={168} height={270} />

      <FigLabel n="1" title="Thirty words, tallied" at={wordsAt - 4} x={LEFT_X} y={y(286)} />

      {/* The thirty tokens, flashed as FreqDist counts each one. */}
      {tiles.map((t, i) => {
        const marks = [
          ...(t.text === "fox" ? [{ at: foxAt - 2 + (i % 3), out: dogAt + 10 }] : []),
          ...(t.text === "dog" ? [{ at: dogAt - 2 + (i % 3), out: talliesAt - 4 }] : []),
          { at: countedAt(i) - 2, out: countedAt(i) + 8, color: HIGHLIGHT },
          ...(repeats[i] ? [{ at: repeatsAt - 2 + (i % 5), color: MARK_BAD }] : []),
        ];
        return <Tile key={i} text={t.text} x={t.x} y={t.y} at={tileAt(i)} size={TILE_SIZE} marks={marks} />;
      })}
      <Note at={thirtyAt - 2} x={LEFT_X} y={tilesBottom + 18}>
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={numStyle(22, INK)}>{FOX.total}</span> words, once the punctuation is gone
        </span>
      </Note>

      {/* most_common(5), and what it prints. */}
      <CodePanel
        x={LEFT_X}
        y={tilesBottom + 78}
        width={LEFT_MAX - LEFT_X + 40}
        size={21}
        at={askAt - 4}
        lines={[
          { text: "fd = FreqDist(tokens)", at: askAt - 2 },
          { text: `fd.most_common(${top5})`, at: fiveAt - 2 },
          {
            text: `[${FOX.top5.map(([w, c]) => `('${w}', ${c})`).join(", ")}]`,
            at: highestAt - 4,
            color: INK_SOFT,
          },
        ]}
      />

      {/* The FreqDist itself: a row for each word the moment it is first counted. */}
      <Ink at={freqAt - 4} dur={14} style={{ left: BAR_X, top: rowY(0) - 44, whiteSpace: "nowrap" }}>
        <Mono size={21} color={INK_SOFT}>
          FreqDist
        </Mono>
        <span style={{ ...label(20, INK_SOFT), marginLeft: 12 }}>each word and its count</span>
      </Ink>
      {/* The five most common rows, banded as most_common(5) is asked for. */}
      <HBar x={WORD_RIGHT - 120} y={rowY(0) + 2} w={BAR_X + 8 * UNIT + 70 - (WORD_RIGHT - 120)} h={top5 * rowH - 4} at={fiveAt - 2} color={`color-mix(in srgb, ${HIGHLIGHT} 45%, transparent)`} dur={14} />
      {FOX.counts.map(([word, total], k) => {
        const first = countedAt(firstSeen.get(word) ?? 0);
        const t = tallyOf(word);
        const isThe = k === 0;
        const showing = ease(frame, first - 3, 6);
        if (showing <= 0) return null;
        return (
          <React.Fragment key={word}>
            <div
              style={{
                position: "absolute",
                left: WORD_RIGHT - 160,
                width: 160,
                top: rowY(k),
                height: rowH,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                opacity: showing,
              }}
            >
              <Mono size={22} color={INK}>
                {isThe ? <Marked at={theAt - 2} color={MARK_BAD}>{word}</Marked> : word}
              </Mono>
            </div>
            <div
              style={{
                position: "absolute",
                left: BAR_X,
                top: rowY(k) + rowH * 0.2,
                width: t * UNIT,
                height: rowH * 0.6,
                background: DATA,
                opacity: showing,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: BAR_X + t * UNIT + 10,
                top: rowY(k),
                height: rowH,
                display: "flex",
                alignItems: "center",
                opacity: showing,
                ...numStyle(22, isThe && frame >= eightAt - 2 ? ACCENT_INK : INK),
                fontWeight: isThe && frame >= eightAt - 2 ? 700 : 600,
              }}
            >
              {frame >= sweepEnd + 6 ? total : Math.max(1, Math.round(t))}
            </div>
          </React.Fragment>
        );
      })}
      <Note at={thirteenAt - 2} x={NOTE_X} y={rowY(7) + 6}>
        <div style={{ ...body(30), color: INK, whiteSpace: "nowrap" }}>
          <span style={numStyle(30, INK)}>{FOX.distinct}</span> different words
        </div>
      </Note>

      {/* Thirteen out of thirty: the ratio the next scene names. */}
      <Ink at={ratioThirteen - 4} dur={16} style={{ left: NOTE_X, top: rowY(7) + 58, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30), color: INK }}>
          out of <Slot30 at={ratioThirty - 2} />
        </span>
      </Ink>
      <Note at={repeatsAt} x={NOTE_X} y={rowY(7) + 122}>
        <span style={{ ...body(28, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>so the text repeats itself</span>
      </Note>
    </AbsoluteFill>
  );
};

/** "thirty words", inked on its word in the ratio line. */
const Slot30: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ opacity: p }}>
      <span style={numStyle(30, INK)}>{FOX.total}</span> in all
    </span>
  );
};
