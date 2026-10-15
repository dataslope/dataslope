import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ILLUSTRATIONS, row, VIDEO } from "./data";
import { FILL } from "./kit";

/** A small chart of the four bars at one temperature, drawn from the data. */
const MiniBars: React.FC<{ t: number; x: number; top: number; height: number; at: number }> = ({ t, x, top, height, at }) => {
  const frame = useCurrentFrame();
  const { probs } = row(t);
  const bw = 30;
  const gap = 10;
  const width = probs.length * bw + (probs.length - 1) * gap;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, at, 12) }}>
        <line x1={x - 6} x2={x + width + 6} y1={top + height} y2={top + height} stroke={INK} strokeWidth={1.6} />
        {probs.map((p, i) => {
          const hgt = height * p * ease(frame, at + 2 + i * 3, 16);
          return <rect key={i} x={x + i * (bw + gap)} y={top + height - hgt} width={bw} height={hgt} fill={FILL[i]} />;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: x - 20,
          width: width + 40,
          top: top + height + 12,
          textAlign: "center",
          opacity: ease(frame, at + 4, 12),
          ...note(20, INK_SOFT),
        }}
      >
        T = {t}
      </div>
    </>
  );
};

/** Rule: turn it down for one right answer, up for variety. */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("rule").from;
  const downAt = n.word("rule", "down");
  const likeAt = n.word("rule", "like extraction");
  const upAt = n.word("rule", "Turn it up");
  const varietyAt = n.word("rule", "variety");
  const thermo = pop(frame, start + 4, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={start - 2} dur={14} style={{ left: 120, top: y(150) }}>
        <span style={label(22, ACCENT_INK)}>Choosing a temperature</span>
      </Ink>

      <MiniBars t={0.2} x={128} top={y(250)} height={h(120)} at={downAt - 6} />
      <Ink at={downAt - 4} dur={20} style={{ left: 340, top: y(250), width: 960 }}>
        <div style={{ ...headline(64), lineHeight: 1.08 }}>Turn it down for one right answer.</div>
      </Ink>
      <Ink at={likeAt - 2} dur={18} style={{ left: 340, top: y(342), width: 960 }}>
        <div style={{ ...body(32) }}>Extraction, analysis and code.</div>
      </Ink>

      <MiniBars t={1.5} x={128} top={y(500)} height={h(120)} at={upAt - 6} />
      <Ink at={upAt - 4} dur={20} style={{ left: 340, top: y(500), width: 960 }}>
        <div style={{ ...headline(64, true), color: ACCENT_INK, lineHeight: 1.08 }}>Turn it up for variety.</div>
      </Ink>
      <Ink at={varietyAt + 4} dur={18} style={{ left: 340, top: y(592), width: 960 }}>
        <div style={{ ...body(32) }}>Brainstorming and drafting.</div>
      </Ink>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="llm-temperature-thermometer"
          style={{
            position: "absolute",
            left: 1400,
            top: y(170),
            width: 380,
            height: h(560),
            opacity: thermo,
            transform: `translateY(${bob(frame, 5, 110) + (1 - thermo) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
