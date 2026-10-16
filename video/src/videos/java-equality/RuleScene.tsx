import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ILLUSTRATIONS, VIDEO } from "./data";
import { After, Code, Marked, markP } from "./kit";

const LEFT = 120;
const TEXT_X = 520;
const TEXT_W = 760;
const CODE = 50;

/** The rule: == for primitives and identity, .equals() for contents. */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("rule").from;
  const eqAt = n.word("rule", "equals equals");
  const primitivesAt = n.word("rule", "primitives");
  const objectAt = n.word("rule", "same object");
  const contentsAt = n.word("rule", "compare contents");
  const dotAt = n.word("rule", "dot equals");
  const mugs = pop(frame, start + 4, fps, 16);

  const codeCell: React.CSSProperties = {
    left: LEFT,
    display: "flex",
    alignItems: "center",
  };

  return (
    <AbsoluteFill>
      <Ink at={start - 5} dur={14} style={{ left: LEFT + 4, top: y(262) }}>
        <span style={label(22, ACCENT_INK)}>The rule</span>
      </Ink>

      <Ink at={eqAt - 4} dur={16} style={{ ...codeCell, top: y(330) }}>
        <Code line="a == b" size={CODE} />
      </Ink>
      <Ink at={primitivesAt - 6} dur={22} style={{ left: TEXT_X, top: y(324), width: TEXT_W }}>
        <div style={{ ...headline(64), color: INK, lineHeight: 1.1 }}>
          for primitives, or when you mean the <Marked p={markP(frame, objectAt)}>same object</Marked>
          <After>.</After>
        </div>
      </Ink>

      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(536),
          width: 140,
          height: 2,
          background: INK,
          opacity: markP(frame, contentsAt - 10),
        }}
      />
      <Ink at={contentsAt - 4} dur={16} style={{ ...codeCell, top: y(590) }}>
        <Code line="a.equals(b)" size={CODE} />
      </Ink>
      <Ink at={contentsAt} dur={22} style={{ left: TEXT_X, top: y(584), width: TEXT_W }}>
        <div style={{ ...headline(64, true), color: ACCENT_INK, lineHeight: 1.1 }}>
          to compare <Marked p={markP(frame, dotAt)}>contents</Marked>
          <After>.</After>
        </div>
      </Ink>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="je-twin-mugs"
          style={{
            position: "absolute",
            left: 1330,
            top: y(330),
            width: 470,
            height: 320,
            opacity: mugs,
            transform: `translateY(${bob(frame, 5, 110) + (1 - mugs) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
