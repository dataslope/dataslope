import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ORDER, STOPWORDS } from "./data";
import { BAD_INK, Chip, chipWidth, FIG_Y, GOOD_INK, Headline, Kicker, Mark, X0 } from "./parts";

const SIZE = 30;
const GAP = 14;
const COL_X0 = 520;
const IN_Y = 326;
const ROW_Y = { a1: 440, a2: 518, b1: 630, b2: 708 };
const NEXT_Y = 806;
const CARD_X = 1290;

const COL_W = ORDER.tokens.map((t) => chipWidth(t, SIZE));
const COL_XS = COL_W.map((_, c) => COL_X0 + COL_W.slice(0, c).reduce((a, b) => a + b + GAP, 0));
const ROW_RIGHT = COL_XS[COL_XS.length - 1] + COL_W[COL_W.length - 1];
/** Words measure.py confirmed are on NLTK's list (and that "The" and "THE"
 *  are not). */
const LISTED = Object.entries(STOPWORDS.has)
  .filter(([w, on]) => on && w === w.toLowerCase())
  .map(([w]) => w);

type Row = { tokens: readonly string[]; cols: readonly number[] };

/** A row of chips in the input's columns, so a dropped token leaves a gap. */
const ChipLine: React.FC<{
  row: Row;
  top: number;
  at: number;
  strikeAt?: (c: number) => number | undefined;
  bad?: (c: number) => number | undefined;
  good?: number;
  hl?: number;
}> = ({ row, top, at, strikeAt, bad, good, hl }) => (
  <>
    {row.cols.map((c, i) => {
      const w = chipWidth(row.tokens[i], SIZE);
      return (
        <Chip
          key={c}
          text={row.tokens[i]}
          x={COL_XS[c] + (COL_W[c] - w) / 2}
          y={top}
          at={at + i * 2}
          size={SIZE}
          strike={strikeAt?.(c)}
          bad={bad?.(c)}
          good={good}
          hl={hl}
        />
      );
    })}
  </>
);

/** A row's name at the left: the lane's letter, then the step. */
const RowName: React.FC<{ lane?: string; text: string; at: number; top: number }> = ({ lane, text, at, top }) => (
  <Ink at={at} dur={14} style={{ left: X0, top: top + 10, whiteSpace: "nowrap" }}>
    <span style={{ ...label(24, INK), fontWeight: 600 }}>
      {lane ? <span style={{ fontWeight: 800, marginRight: 10 }}>{lane}</span> : <span style={{ display: "inline-block", width: 27 }} />}
      {text}
    </span>
  </Ink>
);

/**
 * Part 3, order matters: the lesson's "The The THE end is near", lowercased
 * then filtered against NLTK's (all lowercase) stopword list, and filtered
 * then lowercased. The first order leaves end, near; the second lets all
 * three the's through, without an error. The video ends on the bridge to
 * Unit 2: every step works on tokens.
 */
export const OrderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("order").from;
  const testAt = n.word("order", "tiny test");
  const threeAt = n.word("order", "three ways");
  const endIsAt = n.word("order", "end is near");
  const aLowerAt = n.word("order-a", "Lowercase");
  const aRemoveAt = n.word("order-a", "remove stopwords");
  const goneAt = n.word("order-a", "gone");
  const endNearAt = n.word("order-a", "End");
  const bRemoveAt = n.word("order-b", "Remove stopwords");
  const slipAt = n.word("order-b", "slip through");
  const listAt = n.word("order-b", "stopword list");
  const lowercaseAt = n.word("order-b", "lowercase");
  const noneAt = n.word("order-b", "none of the three");
  const crashedAt = n.word("silent", "Nothing crashed");
  const wrongAt = n.word("silent", "wrong");
  const silentAt = n.word("silent", "silent");
  const tokensAt = n.word("next", "tokens");
  const decidingAt = n.word("next", "deciding");

  const top = (v: number) => y(v);
  const theCols = ORDER.tokens.map((t, c) => (t.toLowerCase() === "the" ? c : -1)).filter((c) => c >= 0);
  const isStop = (c: number) => !ORDER.a.filtered.cols.includes(c);
  const card = ease(frame, aRemoveAt - 4, 14);
  const cardY = top(IN_Y) - 8;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={testAt} level={-32} />
      <Sfx name="el-whoosh" at={aLowerAt} level={-35} />
      <Sfx name="el-scratch" at={goneAt - 6} level={-34} />
      <Sfx name="el-tap" at={endNearAt} level={-29} />
      <Sfx name="el-whoosh" at={bRemoveAt} level={-35} />
      <Sfx name="el-tap" at={slipAt} level={-30} />
      <Sfx name="el-pop" at={aRemoveAt - 4} level={-32} />
      <Sfx name="el-pencil" at={decidingAt - 6} level={-34} />

      <Kicker at={from - 10}>Order matters</Kicker>
      <Headline lead="Same steps," turn="different order." at={from - 6} turnAt={bRemoveAt - 6} />
      <FigLabel n="11" title="The lesson's tiny test, in two orders" at={from + 2} x={X0} y={y(FIG_Y)} />

      {/* ── The input ── */}
      <RowName text="tokens" at={testAt - 4} top={top(IN_Y)} />
      {ORDER.tokens.map((t, c) => (
        <Chip
          key={c}
          text={t}
          x={COL_XS[c]}
          y={top(IN_Y)}
          at={(theCols.includes(c) ? threeAt - 6 + theCols.indexOf(c) * 4 : endIsAt - 2 + (c - 3) * 3)}
          size={SIZE}
          hl={tokensAt - 2 + c * 2}
          hlOut={tokensAt + 40}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: X0,
          top: top(IN_Y) + 74,
          width: (ROW_RIGHT - X0) * ease(frame, aLowerAt - 6, 14),
          height: 1,
          background: HAIRLINE,
          opacity: 0.6,
        }}
      />

      {/* ── NLTK's stopword list ── */}
      {card > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CARD_X,
            top: cardY,
            width: 510,
            boxSizing: "border-box",
            padding: "16px 22px 18px",
            border: `2px solid ${INK}`,
            borderRadius: 12,
            background: PAPER,
            opacity: card,
            transform: `translateY(${(1 - card) * 10}px)`,
          }}
        >
          <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>NLTK's stopwords, {STOPWORDS.count} of them</div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: INK, marginTop: 10, whiteSpace: "nowrap" }}>{LISTED.join(", ")}, …</div>
          <div style={{ ...note(22, INK), marginTop: 10, whiteSpace: "nowrap" }}>
            <Mark at={lowercaseAt - 2}>all lowercase</Mark>
          </div>
        </div>
      ) : null}

      {/* ── Order A: lowercase, then filter ── */}
      <RowName lane="A" text="lowercase" at={aLowerAt - 4} top={top(ROW_Y.a1)} />
      <ChipLine row={ORDER.a.lowered} top={top(ROW_Y.a1)} at={aLowerAt} strikeAt={(c) => (isStop(c) ? goneAt - 8 + c * 2 : undefined)} />
      <RowName text="then filter" at={aRemoveAt - 4} top={top(ROW_Y.a2)} />
      <ChipLine row={ORDER.a.filtered} top={top(ROW_Y.a2)} at={goneAt + 2} good={endNearAt} />
      <Ink at={endNearAt + 2} dur={14} style={{ left: ROW_RIGHT + 40, top: top(ROW_Y.a2) + 8, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: GOOD_INK }}>every the is gone</span>
      </Ink>

      {/* ── Order B: filter, then lowercase ── */}
      <RowName lane="B" text="filter" at={bRemoveAt - 4} top={top(ROW_Y.b1)} />
      <ChipLine row={ORDER.b.filtered} top={top(ROW_Y.b1)} at={bRemoveAt + 2} bad={(c) => (theCols.includes(c) ? slipAt + theCols.indexOf(c) * 3 : undefined)} />
      <RowName text="then lowercase" at={listAt - 4} top={top(ROW_Y.b2)} />
      <ChipLine
        row={ORDER.b.lowered}
        top={top(ROW_Y.b2)}
        at={noneAt - 10}
        bad={(c) => (theCols.includes(c) ? noneAt + 6 + theCols.indexOf(c) * 3 : undefined)}
      />
      <Ink at={crashedAt - 2} dur={14} style={{ left: ROW_RIGHT + 40, top: top(ROW_Y.b2) + 8, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: BAD_INK }}>
          no error, <Mark at={wrongAt - 2}>just wrong</Mark>
        </span>
      </Ink>
      <Ink at={silentAt - 4} dur={14} style={{ left: ROW_RIGHT + 40, top: top(ROW_Y.b2) + 56, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>order bugs are silent</span>
      </Ink>

      <NextLine at={decidingAt - 4} x={X0} y={top(NEXT_Y)} width={1680}>
        cutting text into tokens
      </NextLine>
    </AbsoluteFill>
  );
};
