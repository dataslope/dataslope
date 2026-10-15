import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ILLUSTRATIONS, VIDEO } from "./data";

const LEFT = 120;

/** The rule: a type is what you expect; a check that runs is what you know. */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("rule").from;
  const onlyAt = n.word("rule", "Only");
  const parcel = pop(frame, onlyAt - 2, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={start - 6} dur={14} style={{ left: LEFT + 4, top: y(270) }}>
        <span style={label(22, ACCENT_INK)}>Compile time and runtime</span>
      </Ink>
      <Ink at={start - 4} dur={22} style={{ left: LEFT - 2, top: y(314), ...headline(84), whiteSpace: "nowrap" }}>
        Types describe what you expect.
      </Ink>
      <Ink at={onlyAt - 6} dur={22} style={{ left: LEFT, top: y(490), width: 1080 }}>
        <div style={{ height: 2, background: INK, width: 140, marginBottom: 34 }} />
        <div style={{ ...headline(64, true), color: ACCENT_INK, lineHeight: 1.12 }}>
          <div>Only a runtime check can tell you</div>
          <div>what actually arrived.</div>
        </div>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="type-erasure-parcel"
          style={{
            position: "absolute",
            left: 1340,
            top: y(440),
            width: 440,
            height: 336,
            opacity: parcel,
            transform: `translateY(${bob(frame, 5, 110) + (1 - parcel) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
