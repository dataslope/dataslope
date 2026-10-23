import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TWEET } from "./data";
import { Chip, Headline, Kicker, Mark, RawText, rowLayout, type ToneStep, X0 } from "./parts";

const SIZE = 36;
const FIG5_Y = 300;
const RAW_Y = 350;
const SUBA_Y = 430;
const ROWA_Y = 466;
const SUBB_Y = 572;
const ROWB_Y = 608;
const NOTE_Y = 740;

const find = (list: readonly string[], t: string) => {
  const i = list.indexOf(t);
  if (i < 0) throw new Error(`"${t}" is not a token`);
  return i;
};

/** The call above a row, in the code face. */
const Sub: React.FC<{ at: number; y: number; children: React.ReactNode }> = ({ at, y, children }) => (
  <Ink at={at} dur={14} style={{ left: X0, top: y, whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK_SOFT, fontVariantLigatures: "none" }}>{children}</span>
  </Ink>
);

/**
 * The lesson's tweet: the default tokenizer cuts the hashtag, the handle and
 * the smiley apart, TweetTokenizer keeps each whole, and the lesson's moral,
 * that the right tokens are the units the task cares about.
 */
export const TweetScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("tweet").from;
  const hashtagAt = n.word("tweet", "hashtag");
  const handleAt = n.word("tweet", "handle");
  const smileyAt = n.word("tweet", "smiley");
  const defaultAt = n.word("default", "default");
  const tokAt = n.word("default", "tokenizer");
  const hashAt = n.word("default", "hash");
  const atSignAt = n.word("default", "at sign");
  const smiley2At = n.word("default", "smiley");
  const nltkAt = n.word("tweettok", "NLTK's");
  const tok2At = n.word("tweettok", "tokenizer");
  const wholeAt = n.word("tweettok", "whole");
  const neitherAt = n.word("task", "Neither");
  const keepAt = n.word("task", "keep");
  const unitsAt = n.word("task", "units");
  const caresAt = n.word("task", "cares");
  const cleanAt = n.word("case-in", "clean");
  const waysAt = n.word("case-in", "ways");
  const colonAt = n.word("default", "colon");
  const bracketAt = n.word("default", "bracket");
  const rightAt = n.word("task", "right");

  // ── Geometry ──
  const rowA = rowLayout(TWEET.default, X0, SIZE);
  const rowB = rowLayout(TWEET.tweet, X0, SIZE);
  const aAt = TWEET.default.map((_, i) => tokAt + i * 3);
  const bAt = TWEET.tweet.map((_, i) => tok2At + i * 3);

  const span = (t: string) => {
    const i = TWEET.text.indexOf(t);
    if (i < 0) throw new Error(`"${t}" is not in the tweet`);
    return { from: i, to: i + t.length };
  };
  const a = {
    hash: find(TWEET.default, "#"),
    nlp: find(TWEET.default, "NLP"),
    at: find(TWEET.default, "@"),
    name: find(TWEET.default, "dataslope"),
    colon: find(TWEET.default, ":"),
    paren: find(TWEET.default, ")"),
  };
  const badA: Record<number, number> = {
    [a.hash]: hashAt,
    [a.nlp]: hashAt + 3,
    [a.at]: atSignAt,
    [a.name]: atSignAt + 3,
    [a.colon]: smiley2At,
    [a.paren]: smiley2At + 3,
  };
  const whole = [find(TWEET.tweet, "#NLP"), find(TWEET.tweet, "@dataslope"), find(TWEET.tweet, ":)")];
  const tonesA = (i: number): ToneStep[] => (badA[i] !== undefined ? [{ at: badA[i], tone: "bad" }] : []);
  const tonesB = (i: number): ToneStep[] => (whole.includes(i) ? [{ at: wholeAt + whole.indexOf(i) * 4, tone: "good" }] : []);
  const dim = 1 - ease(frame, cleanAt, 14) * 0.45;
  const noteDim = 1 - ease(frame, waysAt, 14) * 0.25;
  const marksA = (i: number) =>
    i === a.colon ? [{ at: colonAt, out: nltkAt }] : i === a.paren ? [{ at: bracketAt, out: nltkAt }] : [];
  const marksB = (i: number) => (whole.includes(i) ? [{ at: rightAt + whole.indexOf(i) * 3, out: keepAt }] : []);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={from - 4} level={-36} />
      {aAt.filter((_, i) => i % 2 === 0).map((t, i) => (
        <Sfx key={`a${i}`} name="el-tap" at={t} level={-29} />
      ))}
      {bAt.filter((_, i) => i % 2 === 0).map((t, i) => (
        <Sfx key={`b${i}`} name="el-tap" at={t} level={-29} />
      ))}
      <Sfx name="el-pop" at={wholeAt} level={-31} />

      <Kicker at={from - 6}>Tokenization</Kicker>
      <Headline lead="A tweet" turn="has units of its own." at={from - 4} turnAt={from + 10} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <FigLabel n="5" title="One tweet, two tokenizers" at={from} x={X0} y={y(FIG5_Y)} />
        <RawText
          text={TWEET.text}
          x={X0}
          y={y(RAW_Y)}
          at={from + 4}
          size={SIZE}
          marks={[
            { ...span("#NLP"), at: hashtagAt, out: neitherAt },
            { ...span("@dataslope"), at: handleAt, out: neitherAt },
            { ...span(":)"), at: smileyAt, out: neitherAt },
          ]}
        />

        <Sub at={defaultAt} y={y(SUBA_Y)}>
          word_tokenize(tweet)
        </Sub>
        {TWEET.default.map((t, i) => (
          <Chip key={i} text={t} x={rowA[i].x} y={y(ROWA_Y)} at={aAt[i]} size={SIZE} tones={tonesA(i)} marks={marksA(i)} />
        ))}

        <Sub at={nltkAt} y={y(SUBB_Y)}>
          TweetTokenizer().tokenize(tweet)
        </Sub>
        {TWEET.tweet.map((t, i) => (
          <Chip key={i} text={t} x={rowB[i].x} y={y(ROWB_Y)} at={bAt[i]} size={SIZE} tones={tonesB(i)} marks={marksB(i)} />
        ))}
      </div>

      {/* The lesson's moral, as it is said. */}
      <div style={{ position: "absolute", left: X0, top: y(NOTE_Y), display: "flex", gap: "0.26em", whiteSpace: "nowrap", ...body(38), color: INK, opacity: noteDim }}>
        <Ink at={keepAt - 2} dur={16} style={{ position: "relative" }}>
          Keep the{" "}
          <Mark at={unitsAt}>
            <span style={{ fontStyle: "italic" }}>units</span>
          </Mark>
        </Ink>
        <Ink at={caresAt - 4} dur={16} style={{ position: "relative" }}>
          your task cares about.
        </Ink>
      </div>
      <Sfx name="el-pencil" at={unitsAt - 6} level={-36} />
    </AbsoluteFill>
  );
};
