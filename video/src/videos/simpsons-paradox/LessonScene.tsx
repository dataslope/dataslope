import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, INK, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { VIDEO } from "./data";

/** Name and rule: the paradox named, and the habit that catches it. */
export const LessonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("name").from;
  const comparisonAt = n.word("name", "comparison");
  const ruleAt = n.beat("rule").from;
  const envelopes = pop(frame, start + 6, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={start - 12} dur={14} style={{ left: 120, top: y(150) }}>
        <span style={label(22, ACCENT_INK)}>The name for it</span>
      </Ink>
      <Ink at={start - 10} dur={22} style={{ left: 114, top: y(194), ...headline(112), whiteSpace: "nowrap" }}>
        Simpson&apos;s paradox
      </Ink>
      <Ink at={comparisonAt - 4} dur={22} style={{ left: 120, top: y(348), width: 1000 }}>
        <div style={{ ...body(40), color: INK, lineHeight: 1.3 }}>
          A comparison that holds inside the groups can reverse once the groups are pooled.
        </div>
      </Ink>
      <Ink at={ruleAt - 6} dur={22} style={{ left: 120, top: y(560), width: 1040 }}>
        <div style={{ height: 2, background: INK, width: 140, marginBottom: 30 }} />
        <div style={{ ...headline(58, true), color: ACCENT_INK, lineHeight: 1.12 }}>
          Before you trust a total, ask what it is averaging over.
        </div>
      </Ink>
      <Illustration
        video={VIDEO}
        id="sp-applications"
        style={{
          position: "absolute",
          left: 1330,
          top: y(260),
          width: 440,
          height: 380,
          opacity: envelopes,
          transform: `translateY(${bob(frame, 5, 110) + (1 - envelopes) * 30}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
