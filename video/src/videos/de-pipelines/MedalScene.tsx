import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Node, OK, OK_INK, Pill, pulse } from "./parts";

const TIER_X = 520;
const TIER_W = 820;
const TIER_H = 112;
const GAP = 34;

/**
 * Question 7. The three layers stacked as the narration says them, bronze at
 * the bottom and gold on top, all data (a blue that deepens as the data is
 * refined), with the sources under bronze and the dashboards and models over
 * gold. Then the reason for the layers: each rebuilds from the one below, so
 * a wrong cleaning rule is fixed and rebuilt from the untouched bronze.
 */
export const MedalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("medal").from;
  const qAt = n.word("medal", "Question seven");
  const textAt = n.word("medal", "What is a medallion architecture");
  const threeAt = n.word("medal", "Three layers");
  const lakeAt = n.word("medal", "in a lake or lakehouse");
  const bronzeAt = n.word("medal", "Bronze holds the raw source data");
  const asAt = n.word("medal", "exactly as it arrived");
  const silverAt = n.word("medal", "Silver is cleaned");
  const joinsAt = n.word("medal", "with joins applied");
  const goldAt = n.word("medal", "Gold holds business aggregates");
  const shapedAt = n.word("medal", "shaped for a dashboard or a model");
  const rebuiltAt = n.word("medal-why", "Each layer is rebuilt from the one below it");
  const goldFromAt = n.word("medal-why", "gold from silver");
  const silverFromAt = n.word("medal-why", "silver from bronze");
  const wrongAt = n.word("medal-why", "a cleaning rule turns out wrong");
  const fixAt = n.word("medal-why", "fix it and rebuild");
  const holdsAt = n.word("medal-why", "bronze still holds the original");
  const end = n.beat("medal-why").to;

  // Top to bottom: gold, silver, bronze.
  const tierTop = (k: number) => y(330) + k * h(TIER_H + GAP);
  const th = h(TIER_H);
  const TIERS = [
    { name: "Gold", at: goldAt, fill: ds("blue", 300), text: "business aggregates", more: "for a dashboard or a model", moreAt: shapedAt },
    { name: "Silver", at: silverAt, fill: ds("blue", 200), text: "cleaned, deduplicated, conformed", more: "joins applied", moreAt: joinsAt },
    { name: "Bronze", at: bronzeAt, fill: ds("blue", 100), text: "raw source data", more: "exactly as it arrived", moreAt: asAt },
  ];
  const srcTop = tierTop(3) + h(10);
  const railX = TIER_X - 70;
  const wrongP = ease(frame, wrongAt, 12);
  const fixP = ease(frame, fixAt + 4, 12);
  const bronzeLit = pulse(frame, holdsAt + 4, 28);

  return (
    <AbsoluteFill>
      {TIERS.map((t) => (
        <Sfx key={t.name} name="el-pop" at={t.at} level={-30} />
      ))}
      <Sfx name="el-pencil" at={goldFromAt} level={-34} />
      <Sfx name="el-pencil" at={silverFromAt} level={-34} />
      <Sfx name="el-scratch" at={wrongAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={fixAt + 4} level={-32} />
      <Sfx name="el-chime" at={holdsAt + 8} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a medallion architecture (bronze, silver, gold)?
        </QuestionCard>

        {/* The lake or lakehouse the three layers live in. */}
        <div
          style={{
            position: "absolute",
            left: TIER_X - 24,
            top: tierTop(0) - h(24),
            width: TIER_W + 48,
            height: (tierTop(2) + th + h(24) - (tierTop(0) - h(24))) * ease(frame, threeAt, 16),
            boxSizing: "border-box",
            border: `2px dashed ${INK_SOFT}`,
            borderRadius: 18,
            opacity: ease(frame, threeAt, 8),
          }}
        />
        <Note at={lakeAt} x={TIER_X + TIER_W + 40} y={tierTop(1) + th / 2 - 16}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>a lake or lakehouse</span>
        </Note>

        {TIERS.map((t, i) => (
          <Node
            key={t.name}
            x={TIER_X}
            y={tierTop(i)}
            w={TIER_W}
            h={th}
            at={t.at}
            fill={t.fill}
            align="left"
            title={t.name}
            titleInk={INK}
            size={32}
            lit={t.name === "Bronze" ? bronzeLit : 0}
            sub={
              <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
                {t.text}
                <span style={{ color: INK_SOFT, opacity: ease(frame, t.moreAt, 10) }}>; {t.more}</span>
              </span>
            }
          />
        ))}
        {/* A wrong cleaning rule marks silver red until it is fixed and rebuilt. */}
        {[
          { color: ACCENT, p: wrongP * (1 - fixP) },
          { color: OK, p: fixP },
        ].map((o, k) =>
          o.p > 0 ? (
            <div
              key={k}
              style={{
                position: "absolute",
                left: TIER_X - 8,
                top: tierTop(1) - 8,
                width: TIER_W + 16,
                height: th + 16,
                boxSizing: "border-box",
                border: `4px solid ${o.color}`,
                borderRadius: 16,
                opacity: o.p,
              }}
            />
          ) : null,
        )}
        {/* Sources feed bronze; gold feeds what the business reads. */}
        <Node x={TIER_X + 250} y={srcTop + h(30)} w={320} h={h(64)} at={bronzeAt - 4} tone="plain" title="source systems" size={24} />
        <Flow points={[[TIER_X + 410, srcTop + h(30) - 6], [TIER_X + 410, tierTop(2) + th + 8]]} at={bronzeAt} color={BAR} />
        <Pill x={TIER_X + TIER_W + 40} y={tierTop(0) + th / 2 - 22} at={shapedAt} tone="data" size={22}>
          dashboards, models
        </Pill>

        {/* Each layer rebuilds from the one below. */}
        <Flow points={[[railX, tierTop(2) + th / 2], [railX, tierTop(1) + th / 2 + 4]]} at={silverFromAt} color={OK} width={3.2} />
        <Flow points={[[railX, tierTop(1) + th / 2], [railX, tierTop(0) + th / 2 + 4]]} at={goldFromAt} color={OK} width={3.2} />
        <Note at={rebuiltAt} x={120} y={tierTop(0) - h(20)}>
          <span style={{ ...label(22, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>rebuilt from</span>
          <br />
          <span style={{ ...label(22, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>the layer below</span>
        </Note>
        <Note at={wrongAt + 4} x={120} y={tierTop(1) + h(26)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a wrong rule</span>
        </Note>
        <Note at={fixAt + 4} x={120} y={tierTop(1) + h(62)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap", opacity: fixP }}>fixed, rebuilt</span>
        </Note>
        <Note at={holdsAt} x={120} y={tierTop(2) + h(26)}>
          <span style={{ ...note(23, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            still the
            <br />
            original
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
