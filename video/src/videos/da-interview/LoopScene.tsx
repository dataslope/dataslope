import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, X0 } from "./parts";

/** Three columns of text, side by side, with a hairline centred in each
 *  gap: no cards, the space and the rules do the grouping. */
const COL_W = 488;
const COL_GAP = 120;
/** Set where the cards' middles were, so the page keeps its balance. */
const COL_Y = 420;
/** The columns' text, in px, top to foot of the tallest (the first): the
 *  hairlines' height. */
const COL_H = 232;
const colX = (i: number) => X0 + i * (COL_W + COL_GAP);

/** One part of the loop, inking in on its cue, and the hairline to its left
 *  (none before the first) inking in with it. Counted "1 of 3", never "Part
 *  1": "Part N" is the series' videos, on the last scene. */
const Column: React.FC<{ i: number; at: number; title: string; children: React.ReactNode }> = ({ i, at, title, children }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at - 2, 16);
  if (p <= 0) return null;
  return (
    <>
      {i > 0 ? (
        <div
          style={{
            position: "absolute",
            left: colX(i) - COL_GAP / 2,
            top: y(COL_Y),
            width: 1,
            height: COL_H,
            background: HAIRLINE,
            opacity: p,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: colX(i),
          top: y(COL_Y),
          width: COL_W,
          opacity: p,
          transform: `translateY(${(1 - p) * 18}px)`,
        }}
      >
        <div style={{ ...label(22, BLUE_INK), marginBottom: 12 }}>{`${i + 1} of 3`}</div>
        <div style={{ ...headline(40), marginBottom: 18 }}>{title}</div>
        {children}
      </div>
    </>
  );
};

/**
 * The loop, from the role page: a SQL screen, a few spreadsheet and
 * statistics questions, and the open "how would you analyze this?", one
 * column of text each, inking in as each is named.
 */
export const LoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();

  const from = n.beat("loop").from;
  const threeAt = n.word("loop", "three parts");
  const sqlAt = n.word("loop", "a SQL screen");
  const takeAt = n.word("loop", "live or as a take-home");
  const sheetAt = n.word("loop", "spreadsheets and statistics");
  const talkAt = n.word("loop", "a conversation");
  const analyzeAt = n.word("loop", "how would you analyze this");
  const end = n.beat("loop").to;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={sqlAt} level={-32} />
      <Sfx name="el-tap" at={sheetAt} level={-32} />
      <Sfx name="el-tap" at={talkAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview questions</Kicker>
        <Headline lead="The interview," turn="in three parts." at={from + 4} turnAt={threeAt - 2} size={72} />

        <Column i={0} at={sqlAt} title="A SQL screen">
          <div style={{ fontFamily: MONO, fontSize: 24, color: INK, lineHeight: 1.6, fontVariantLigatures: "none" }}>
            <div>
              <span style={{ color: BLUE_INK, fontWeight: 500 }}>SELECT</span> region, SUM(amount)
            </div>
            <div>
              <span style={{ color: BLUE_INK, fontWeight: 500 }}>FROM</span> orders …
            </div>
          </div>
          <div style={{ ...note(24, INK_SOFT), marginTop: 22, opacity: ease(frame, takeAt - 2, 12) }}>live, or as a take-home</div>
        </Column>
        <Column i={1} at={sheetAt} title="Spreadsheets and statistics">
          <div style={{ ...note(26, INK), lineHeight: 1.5 }}>a few questions each:</div>
          <div style={{ ...note(24, INK_SOFT), lineHeight: 1.5 }}>
            <div>a pivot table, a lookup,</div>
            <div>a median, a p&#8209;value</div>
          </div>
        </Column>
        <Column i={2} at={talkAt} title="A conversation">
          <div style={{ ...headline(34, true), color: INK, opacity: ease(frame, analyzeAt - 2, 14) }}>
            &ldquo;How would you analyze this?&rdquo;
          </div>
        </Column>
      </Drift>
    </AbsoluteFill>
  );
};
