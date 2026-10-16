import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KICKER_Y, X0 } from "./kit";
import { Drift, Fade, Spot } from "./parts";

/** The rules the unit built, as the lessons' path of normal forms names them. */
const FORMS = [
  { name: "1NF", gist: "one value per cell" },
  { name: "2NF", gist: "the whole key" },
  { name: "3NF", gist: "nothing but the key" },
] as const;

/**
 * The unit's rule in three lines, the normal forms it rests on, and the
 * bridge to Unit 8: a process for applying the rules, and for changing a
 * design once it's live.
 */
export const CloseScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();
  const { durationInFrames } = n;

  const from = n.beat("rule").from;
  const firstAt = n.word("rule", "normalize first");
  const purposeAt = n.word("rule", "denormalize");
  const syncAt = n.word("rule", "keep every copy");
  const rulesAt = n.word("next", "rules");
  const processAt = n.word("next", "process");
  const changingAt = n.word("next", "changing");
  const liveAt = n.word("next", "live");
  const end = n.beat("next").to;

  const lines = [
    { at: firstAt, lead: "Normalize", turn: "first." },
    { at: purposeAt, lead: "Denormalize", turn: "on purpose." },
    { at: syncAt, lead: "Keep every copy", turn: "in sync." },
  ];

  return (
    <AbsoluteFill>
      {lines.map((l, k) => (
        <Sfx key={k} name="el-pencil" at={l.at} level={-35} />
      ))}
      <Sfx name="el-pop" at={from - 4} level={-31} />
      <Sfx name="el-pencil" at={processAt - 4} level={-34} />
      {/* The video's one bell, in the silence after its last word. */}
      <Sfx name="el-chime" at={end + 8} level={-32} />

      <Ink at={from - 10} dur={14} style={{ left: X0 + 2, top: y(KICKER_Y) }}>
        <span style={label(22, INK_SOFT)}>Normalization</span>
      </Ink>
      <Spot id="db-normalization-drawer" at={from - 4} left={1470} top={y(250)} width={320} height={318} />

      <Drift from={from} to={durationInFrames} amount={0.015} origin="30% 45%">
        <Fade dimAt={changingAt} dim={0.55}>
          {lines.map((l, k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: X0 - 4,
                top: y(200 + k * 112),
                display: "flex",
                gap: "0.24em",
                whiteSpace: "nowrap",
                ...headline(84),
              }}
            >
              <Ink at={l.at - 4} dur={18} style={{ position: "relative" }}>
                {l.lead}
              </Ink>
              <Ink at={l.at + 4} dur={18} style={{ position: "relative", ...headline(84, true), color: ACCENT_INK }}>
                {l.turn}
              </Ink>
            </div>
          ))}
        </Fade>

        {/* The rules themselves: the half the unit covered. */}
        <Fade dimAt={liveAt + 20} dim={0.55}>
          {FORMS.map((f, k) => (
            <Ink key={f.name} at={rulesAt + k * 6} dur={14} style={{ left: X0 + k * 420, top: y(560), whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ ...label(26, BLUE_INK), fontWeight: 700 }}>{f.name}</span>
                <span style={{ ...note(22, INK) }}>{f.gist}</span>
              </span>
            </Ink>
          ))}
        </Fade>

        <NextLine at={processAt} x={X0} y={y(700)} width={980}>
          designing a schema, start to finish.
        </NextLine>
        <Ink at={liveAt - 4} dur={16} style={{ left: X0, top: y(700) + 84, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT) }}>and changing it once it&apos;s live</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
