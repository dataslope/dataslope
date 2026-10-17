import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Drift, Headline, Kicker, Spot, STAT_INK } from "./parts";

/** The paper, as ACM Transactions on Database Systems printed it (see script.ts). */
const PAPER_TITLE = "The Entity-Relationship Model: Toward a Unified View of Data";
const JOURNAL = "ACM Transactions on Database Systems, 1976";

/**
 * Part 3 opens: Peter Chen's 1976 model, and its argument in two steps, what
 * the data means before how to store it.
 */
export const ChenScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("chen").from;
  const yearAt = n.word("chen", "nineteen");
  const chenAt = n.word("chen", "Peter Chen");
  const modelAt = n.word("chen", "entity-relationship model");
  const meansAt = n.word("chen", "means");
  const beforeAt = n.word("chen", "before");
  const storeAt = n.word("chen", "store");
  const end = n.beat("chen").to;

  const stepY = y(640);

  return (
    <AbsoluteFill>
      {/* ── Sound: the year, the plan, the two steps ── */}
      <Sfx name="el-tap" at={yearAt} level={-29} />
      <Sfx name="el-pop" at={modelAt} level={-30} />
      <Sfx name="el-pencil" at={beforeAt} level={-34} />
      <Sfx name="el-tap" at={storeAt} level={-30} />

      <Drift from={storeAt} to={end + 60} scale={0.022} origin={[700, 560]}>
        <Kicker at={from - 10}>Entity-relationship diagrams</Kicker>
        <Headline lead="Draw it first." leadAt={from - 6} />

        <Ink at={yearAt - 4} dur={18} style={{ left: 116, top: y(286), whiteSpace: "nowrap" }}>
          <span style={{ ...headline(132), color: STAT_INK }}>1976</span>
        </Ink>
        <Ink at={chenAt - 4} dur={16} style={{ left: 122, top: y(436), whiteSpace: "nowrap" }}>
          <span style={label(32, INK)}>Peter Chen</span>
        </Ink>
        <Ink at={modelAt - 2} dur={18} style={{ left: 122, top: y(490), whiteSpace: "nowrap" }}>
          <div style={{ ...body(28, true), color: INK }}>{PAPER_TITLE}</div>
          <div style={{ ...note(21, INK_SOFT), marginTop: 10 }}>{JOURNAL}</div>
        </Ink>

        {/* ── The argument, in order ── */}
        <Ink at={meansAt - 8} dur={16} style={{ left: 122, top: stepY, whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, STAT_INK), marginRight: 14 }}>1</span>
          <span style={{ ...body(40), color: INK }}>What the data means</span>
        </Ink>
        <Arrow from={[548, stepY + 30]} to={[618, stepY + 30]} at={beforeAt} dur={12} />
        <Ink at={storeAt - 6} dur={16} style={{ left: 650, top: stepY, whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK_SOFT), marginRight: 14 }}>2</span>
          <span style={{ ...body(40), color: INK_SOFT }}>How to store it</span>
        </Ink>

        <Spot id="db-entities-plan" at={modelAt} left={1060} top={y(300)} width={660} height={440} />
      </Drift>
    </AbsoluteFill>
  );
};
