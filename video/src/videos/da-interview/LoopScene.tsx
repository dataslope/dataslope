import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, X0 } from "./parts";

const CARD_W = 520;
const CARD_GAP = 60;
const CARD_Y = 360;
const CARD_H = 330;

/** A card for one part of the loop, inking in on its cue. */
const Card: React.FC<{ i: number; at: number; title: string; children: React.ReactNode }> = ({ i, at, title, children }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at - 2, 16);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: X0 + i * (CARD_W + CARD_GAP),
        top: y(CARD_Y),
        width: CARD_W,
        height: h(CARD_H),
        boxSizing: "border-box",
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 12,
        background: PAPER,
        padding: "28px 32px",
        opacity: p,
        transform: `translateY(${(1 - p) * 18}px)`,
      }}
    >
      <div style={{ ...label(22, BLUE_INK), marginBottom: 18 }}>{`Part ${i + 1} of the loop`}</div>
      <div style={{ ...headline(40), marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
};

/**
 * The loop, from the role page: a SQL screen, a few spreadsheet and
 * statistics questions, and the open "how would you analyze this?", one card
 * each, inking in as each is named.
 */
export const LoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();

  const from = n.beat("loop").from;
  const threeAt = n.word("loop", "three parts");
  const sqlAt = n.word("loop", "A SQL screen");
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
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="The interview," turn="in three parts." at={from + 4} turnAt={threeAt - 2} size={72} />

        <Card i={0} at={sqlAt} title="A SQL screen">
          <div style={{ fontFamily: MONO, fontSize: 24, color: INK, lineHeight: 1.6, fontVariantLigatures: "none" }}>
            <div>
              <span style={{ color: BLUE_INK, fontWeight: 600 }}>SELECT</span> region, SUM(amount)
            </div>
            <div>
              <span style={{ color: BLUE_INK, fontWeight: 600 }}>FROM</span> orders …
            </div>
          </div>
          <div style={{ ...note(24, INK_SOFT), marginTop: 22, opacity: ease(frame, takeAt - 2, 12) }}>live, or as a take-home</div>
        </Card>
        <Card i={1} at={sheetAt} title="Spreadsheets and statistics">
          <div style={{ ...note(26, INK), lineHeight: 1.5 }}>a few questions each:</div>
          <div style={{ ...note(24, INK_SOFT), lineHeight: 1.5 }}>a pivot table, a lookup, a median, a p&#8209;value</div>
        </Card>
        <Card i={2} at={talkAt} title="A conversation">
          <div style={{ ...headline(34, true), color: INK, opacity: ease(frame, analyzeAt - 2, 14) }}>
            &ldquo;How would you analyze this?&rdquo;
          </div>
        </Card>
      </Drift>
    </AbsoluteFill>
  );
};
