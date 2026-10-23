import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WINDOW } from "./data";
import { flow, Kicker, lerp, Marked, numStyle, Svg, Tile, tileH, tileW } from "./parts";

const X0 = 120;
const SIZE = 32;
const CHIP = 24;
const LIST_X = 330;
const PAIRS = ["New York", "machine learning", "not good"] as const;

/**
 * Part 3 opens: phrases whose meaning lives in the pair, what an n-gram is,
 * the lesson's window sliding along "the quick brown fox jumps" (four
 * bigrams, then three trigrams), and k - n + 1.
 */
export const WindowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("together").from;
  const pairAts = [n.word("together", "New York"), n.word("together", "machine learning"), n.word("together", "not good")];
  const togetherAt = n.word("together", "together");
  const ngramAt = n.word("ngram", "n-gram");
  const rowAt = n.word("ngram", "in a row");
  const bigramAt = n.word("ngram", "bigram");
  const trigramAt = n.word("ngram", "trigram");
  const windowAt = n.word("slide", "window");
  const quickAt = n.word("slide", "quick");
  const stepAt = n.word("slide", "one step");
  const timeAt = n.word("slide", "time");
  const overlapAt = n.word("slide", "overlap");
  const fourAt = n.word("formula", "four bigrams");
  const threeAt = n.word("formula", "three trigrams");
  const numberAt = n.word("formula", "number of words");
  const minusAt = n.word("formula", "minus n");
  const plusAt = n.word("formula", "plus one");

  // ── The tokens and the window ──
  const tokens = WINDOW.tokens;
  const tiles = flow(tokens, X0 + 10, y(470), 1800, SIZE, 18, 0);
  const th = tileH(SIZE);
  const biY = y(600);
  const triY = y(690);
  // Bigram window: in on "window", then a step at a time.
  const biSteps = [windowAt + 4, stepAt, lerp(stepAt, timeAt + 8, 0.5), timeAt + 8];
  const triSteps = [threeAt - 6, threeAt + 4, threeAt + 14];
  const posAt = (steps: readonly number[]) => {
    let pos = 0;
    steps.forEach((s, i) => {
      if (i > 0) pos += ease(frame, s, 8);
    });
    return pos;
  };
  const span = (pos: number, width: number) => {
    const i = Math.floor(pos);
    const f = pos - i;
    const left = (k: number) => tiles[Math.min(k, tiles.length - 1)].x;
    const right = (k: number) => tiles[Math.min(k, tiles.length - 1)].x + tiles[Math.min(k, tiles.length - 1)].w;
    const l = lerp(left(i), left(i + 1), f);
    const r = lerp(right(i + width - 1), right(Math.min(i + width, tiles.length - 1)), f);
    return [l - 9, r + 9] as const;
  };
  const biOn = ease(frame, biSteps[0] - 4, 8) * (1 - ease(frame, triSteps[0] - 6, 6));
  const triOn = ease(frame, triSteps[0] - 2, 8);
  const [bl, br] = span(posAt(biSteps), 2);
  const [tl, tr] = span(posAt(triSteps), 3);

  const chipList = (grams: readonly (readonly string[])[], ats: readonly number[], top: number, marks?: (i: number) => number | undefined) =>
    flow(
      grams.map((g) => g.join(" ")),
      LIST_X,
      top,
      1700,
      CHIP,
      14,
      0,
    ).map((t, i) => {
      const m = marks?.(i);
      return <Tile key={t.text} text={t.text} x={t.x} y={t.y} size={CHIP} at={ats[i] + 4} marks={m === undefined ? [] : [{ at: m }]} />;
    });
  const biRight = LIST_X + WINDOW.bigrams.reduce((s, g) => s + tileW(g.join(" "), CHIP) + 14, 0);
  const triRight = LIST_X + WINDOW.trigrams.reduce((s, g) => s + tileW(g.join(" "), CHIP) + 14, 0);

  return (
    <AbsoluteFill>
      {/* ── Sound: the pairs, each window step, the formula ── */}
      {pairAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-30} />
      ))}
      {biSteps.map((t, i) => (
        <Sfx key={`b${i}`} name="el-tap" at={t + 4} level={-29} />
      ))}
      <Sfx name="el-whoosh" at={triSteps[0]} level={-34} />
      <Sfx name="el-pencil" at={numberAt - 2} level={-35} />

      <Kicker at={from - 10}>Counting word pairs</Kicker>

      {/* The phrases, each a pair. */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.9em", whiteSpace: "nowrap", fontSize: headline(60).fontSize }}>
        {PAIRS.map((p, i) => (
          <Ink key={p} at={pairAts[i] - 4} dur={16} style={{ position: "relative", ...headline(60, i === 2) , color: i === 2 ? ACCENT_INK : INK }}>
            <Marked at={togetherAt - 2 + i * 4}>{p}</Marked>
          </Ink>
        ))}
      </div>

      {/* What an n-gram is. */}
      <Ink at={ngramAt - 4} dur={16} style={{ left: X0, top: y(280), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36), color: INK }}>
          An <span style={{ fontStyle: "italic" }}>n-gram</span>: <Slot at={rowAt - 2}>n words in a row.</Slot>
        </span>
      </Ink>
      <Note at={bigramAt - 2} x={X0 + 640} y={y(280) + 4}>
        <div style={{ ...label(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          bigram <span style={{ ...numStyle(26, INK_SOFT) }}>n = 2</span>
        </div>
      </Note>
      <Note at={trigramAt - 2} x={X0 + 900} y={y(280) + 4}>
        <div style={{ ...label(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          trigram <span style={{ ...numStyle(26, INK_SOFT) }}>n = 3</span>
        </div>
      </Note>

      <FigLabel n="12" title="A window, sliding one step at a time" at={windowAt - 6} x={X0} y={y(400)} />
      {tiles.map((t, i) => (
        <Tile key={i} text={t.text} x={t.x} y={t.y} size={SIZE} at={(i === 0 ? windowAt : quickAt) - 6 + i * 3} marks={i === 1 ? [{ at: overlapAt - 2 }] : []} />
      ))}
      <Svg>
        {biOn > 0 ? (
          <rect x={bl} y={tiles[0].y - 9} width={br - bl} height={th + 18} rx={12} fill="none" stroke={ACCENT} strokeWidth={3.5} opacity={biOn} />
        ) : null}
        {triOn > 0 ? (
          <rect x={tl} y={tiles[0].y - 9} width={tr - tl} height={th + 18} rx={12} fill="none" stroke={ACCENT} strokeWidth={3.5} opacity={triOn} />
        ) : null}
      </Svg>

      {/* What the windows framed. */}
      <Ink at={biSteps[0]} dur={12} style={{ left: X0, top: biY, height: tileH(CHIP), display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 600 }}>bigrams</span>
      </Ink>
      {chipList(WINDOW.bigrams, biSteps, biY, (i) => (i < 2 ? overlapAt + i * 4 : undefined))}
      <Note at={fourAt - 2} x={biRight + 16} y={biY}>
        <div style={{ height: tileH(CHIP), display: "flex", alignItems: "center", ...numStyle(26, ACCENT_INK) }}>
          {WINDOW.bigrams.length}
          <span style={{ ...label(22, INK_SOFT), marginLeft: 10, fontWeight: 500, opacity: ease(frame, minusAt - 2, 10) }}>
            = {tokens.length} − 2 + 1
          </span>
        </div>
      </Note>
      <Ink at={triSteps[0]} dur={12} style={{ left: X0, top: triY, height: tileH(CHIP), display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 600 }}>trigrams</span>
      </Ink>
      {chipList(WINDOW.trigrams, triSteps, triY)}
      <Note at={threeAt + 18} x={triRight + 16} y={triY}>
        <div style={{ height: tileH(CHIP), display: "flex", alignItems: "center", ...numStyle(26, ACCENT_INK) }}>
          {WINDOW.trigrams.length}
          <span style={{ ...label(22, INK_SOFT), marginLeft: 10, fontWeight: 500, opacity: ease(frame, minusAt + 4, 10) }}>
            = {tokens.length} − 3 + 1
          </span>
        </div>
      </Note>

      {/* The count, in words. */}
      <Ink at={numberAt - 4} dur={18} style={{ left: X0, top: y(800), whiteSpace: "nowrap" }}>
        <span style={{ ...body(38), color: INK }}>
          n-grams = number of words <Slot at={minusAt - 2}>− n</Slot> <Slot at={plusAt - 2}>+ 1</Slot>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};

/** Words that ink in on their own cue inside a line already showing. */
const Slot: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return <span style={{ opacity: p, display: "inline-block", transform: `translateX(${(1 - p) * -8}px)` }}>{children}</span>;
};
