import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { headline, INK } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Line, Loop, Spot, X0 } from "./parts";

const SIZE = 38;

/**
 * The close: the loop from the corner of every deep dive, drawn large, its
 * stages lit in turn on "Versioned, gated, watched and reversible", the
 * walrus beside it, and the line into Part 9.
 */
export const CloseScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("close").from;
  const versionedAt = n.word("close", "Versioned");
  const gatedAt = n.word("close", "gated");
  const watchedAt = n.word("close", "watched");
  const reversibleAt = n.word("close", "reversible");
  const runningAt = n.word("close", "that's a model you can leave running");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const words = [
    { text: "Versioned,", at: versionedAt },
    { text: "gated,", at: gatedAt },
    { text: "watched", at: watchedAt },
    { text: "and reversible", at: reversibleAt - 4 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={versionedAt} level={-31} />
      <Sfx name="el-tap" at={gatedAt} level={-31} />
      <Sfx name="el-tap" at={watchedAt} level={-31} />
      <Sfx name="el-tap" at={reversibleAt} level={-31} />
      <Sfx name="el-pop" at={from + 4} level={-31} />
      <Sfx name="el-chime" at={runningAt + 24} level={-33} />

      <Drift from={from} to={end + 30} scale={0.012}>
        <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(62) }}>
          {words.map((w) => (
            <Ink key={w.text} at={w.at - 2} dur={14} style={{ position: "relative", whiteSpace: "nowrap" }}>
              {w.text}
            </Ink>
          ))}
        </div>
        <Loop
          x={X0}
          y={y(360)}
          at={from - 4}
          size={SIZE}
          inkAt={{ version: from - 4, gate: from - 2, ship: from, watch: from + 2, retrain: from + 6 }}
          lit={[
            ["version", versionedAt],
            ["gate", gatedAt],
            ["watch", watchedAt],
            ["ship", reversibleAt],
            ["retrain", reversibleAt + 4],
          ]}
        />
        <Line at={runningAt - 2} x={X0} y={y(640)} size={34} color={INK}>
          That&apos;s a model you can leave running
        </Line>
        <NextLine at={nextAt} x={X0} y={y(760)} width={900}>
          serving LLMs
        </NextLine>
      </Drift>

      <Spot id="walrus" at={from + 4} x={1290} y={y(318)} w={460} />
    </AbsoluteFill>
  );
};
