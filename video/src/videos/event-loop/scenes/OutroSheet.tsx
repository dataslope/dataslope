import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { Logo } from "../../../components/Logo";
import { bob, ease, pop } from "../../../components/motion";
import { Pattern } from "../../../components/Pattern";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { MONO } from "../../../theme/fonts";
import { COURSE_TITLE, LESSON_TITLE, LESSON_URL, OUTPUT } from "../data";
import { DraftBox, Ink, Layer, Letter } from "../draw";
import { HAND } from "../fonts";
import { BP, VIDEO, mix } from "../theme";

const RESULT = { x: 84, y: 672, w: 560, h: 214 };

/** End sheet: the lesson, its address, the marmot, and the checker's stamp. */
export const OutroSheet: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const dataslopeAt = n.word("outro", "Dataslope");
  const howAt = n.word("outro", "How");
  const walksAt = n.word("outro", "walks");
  const codeAt = n.word("outro", "code");
  const runAt = n.word("outro", "run");

  const band = ease(frame, from, 20);
  const art = pop(frame, from + 6, fps, 18);
  const stamp = pop(frame, runAt + 4, fps, 11);
  const urlP = ease(frame, walksAt - 4, 16);

  return (
    <Scene from={from} to={to} fade={6}>
      <Pattern
        video={VIDEO}
        name="sheet-border"
        style={{
          position: "absolute",
          left: 36,
          top: 36,
          width: 1848,
          height: 72,
          clipPath: `inset(0 0 0 ${(1 - band) * 100}%)`,
          opacity: 0.85,
        }}
      />
      <Layer>
        <Ink d="M 1884 108 H 36" p={band} color={BP.line2} width={1.5} />
        <DraftBox x={84} y={474} w={1050} h={88} p={urlP} color={BP.line} fill={mix(BP.paperDeep, 80)} />
        <DraftBox x={RESULT.x} y={RESULT.y} w={RESULT.w} h={RESULT.h} p={ease(frame, codeAt - 6, 16)} color={BP.line2} fill={mix(BP.paperDeep, 70)} />
      </Layer>

      <div style={{ position: "absolute", left: 88, top: 150, opacity: ease(frame, dataslopeAt - 4, 12) }}>
        <Logo size={52} tone="light" />
      </div>
      <Letter x={90} y={244} p={ease(frame, dataslopeAt, 12)} size={24} color={BP.line2} spacing="0.14em">
        The lesson
      </Letter>
      <Letter x={84} y={280} p={ease(frame, howAt - 2, 18)} size={86} color={BP.white}>
        {LESSON_TITLE}
      </Letter>
      <Letter x={90} y={392} p={ease(frame, howAt + 10, 14)} size={30} color={BP.line}>
        {COURSE_TITLE}
      </Letter>
      <div
        style={{
          position: "absolute",
          left: 112,
          top: 474,
          height: 88,
          display: "flex",
          alignItems: "center",
          fontFamily: MONO,
          fontSize: 27,
          fontWeight: 600,
          color: BP.cyan,
          whiteSpace: "nowrap",
          clipPath: `inset(0 ${(1 - ease(frame, walksAt + 2, 16)) * 100}% 0 0)`,
        }}
      >
        {LESSON_URL}
      </div>
      <Letter x={90} y={600} p={ease(frame, codeAt - 2, 14)} size={28} color={BP.line}>
        Run the puzzle yourself, right in the lesson.
      </Letter>

      <Illustration
        video={VIDEO}
        id="el-marmot"
        style={{
          position: "absolute",
          // 553x463: its 1107x926 pixels cover a 4K render without stretching.
          left: 1238,
          top: 228,
          width: 553,
          height: 463,
          opacity: art,
          transform: `translateY(${bob(frame, 6, 100) + (1 - art) * 40}px)`,
        }}
      />

      {/* The run this video was checked against, which the stamp signs off. */}
      <Letter x={RESULT.x + 22} y={RESULT.y + 14} p={ease(frame, codeAt - 2, 14)} size={22} color={BP.line2} spacing="0.12em">
        Verified output, Node 22
      </Letter>
      {OUTPUT.map((line, i) => (
        <div
          key={line}
          style={{
            position: "absolute",
            left: RESULT.x + 24,
            top: RESULT.y + 56 + i * 38,
            fontFamily: MONO,
            fontSize: 23,
            fontWeight: 600,
            whiteSpace: "pre",
            color: BP.white,
            clipPath: `inset(0 ${(1 - ease(frame, codeAt + 2 + i * 5, 8)) * 100}% 0 0)`,
          }}
        >
          <span style={{ color: BP.faint }}>{"> "}</span>
          {line}
        </div>
      ))}

      {/* The checker's stamp. */}
      <div
        style={{
          position: "absolute",
          left: 1520,
          top: 770,
          padding: "10px 26px",
          border: `4px solid ${BP.mark}`,
          outline: `2px solid ${BP.mark}`,
          outlineOffset: 4,
          fontFamily: HAND,
          fontSize: 44,
          letterSpacing: "0.2em",
          color: BP.mark,
          opacity: stamp > 0.02 ? Math.min(1, stamp * 1.4) * 0.92 : 0,
          transform: `rotate(-9deg) scale(${1.5 - 0.5 * stamp})`,
        }}
      >
        CHECKED
      </div>
    </Scene>
  );
};
