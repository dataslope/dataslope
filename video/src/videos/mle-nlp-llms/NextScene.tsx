import { NotebookPen } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Box, Drift, Headline, INK, INK_SOFT, Kicker, Line, QUIET, Spot, Svg, X0 } from "./parts";

/**
 * The bridge into Part 7: a model box inside a notebook's outline, then a
 * dashed outline for the system around it (left empty: that is the next
 * video), the dolphin back on the page, and the Next line.
 */
export const NextScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("next").from;
  const notebookAt = n.word("next", "a model in a notebook");
  const productAt = n.word("next", "isn't a product yet");
  const nextAt = n.word("next", "Next");
  const systemAt = n.word("next", "the system around it");
  const end = n.beat("next").to;

  const NB = { x: X0 + 80, y: y(380), w: 520, h: h(300) };
  const sys = ease(frame, systemAt, 22);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={notebookAt + 6} level={-32} />
      <Sfx name="el-pop" at={from + 4} level={-30} />
      <Sfx name="el-pencil" at={systemAt} level={-35} />
      <Sfx name="el-chime" at={end + 10} level={-33} />

      <Drift from={from} to={end + 80} scale={0.016}>
        <Kicker at={from - 4}>Machine learning engineer interview questions</Kicker>
        <Headline at={from} size={60}>
          A model in a notebook isn&apos;t a product yet
        </Headline>

        {/* The notebook: an outline, a few cells, and the model in one of them. */}
        <Svg opacity={ease(frame, notebookAt, 14)}>
          <rect x={NB.x} y={NB.y} width={NB.w} height={NB.h} rx={8} fill="none" stroke={INK} strokeWidth={2} />
          <line x1={NB.x} x2={NB.x + NB.w} y1={NB.y + h(46)} y2={NB.y + h(46)} stroke={INK} strokeWidth={1.4} opacity={0.5} />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={NB.x + 30} y={NB.y + h(70) + k * h(30)} width={[300, 220, 260][k]} height={h(12)} rx={4} fill={QUIET} />
          ))}
        </Svg>
        <div style={{ position: "absolute", left: NB.x + 20, top: NB.y + h(12), display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, notebookAt + 4, 12) }}>
          <NotebookPen size={22} color={INK} strokeWidth={1.9} />
          <span style={{ ...label(21, INK), fontWeight: 500 }}>Notebook</span>
        </div>
        <Box x={NB.x + 30} y={NB.y + h(176)} w={200} h={h(72)} at={notebookAt + 8} tone="data">
          Model
        </Box>

        {/* The system around it: next time. */}
        <Svg opacity={sys}>
          <rect
            x={NB.x - 50}
            y={NB.y - h(44)}
            width={NB.w + 100}
            height={NB.h + h(88)}
            rx={10}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2}
            strokeDasharray="8 7"
          />
        </Svg>
        <Line at={productAt} x={NB.x + NB.w + 90} y={NB.y + h(120)} size={26} color={INK_SOFT}>
          Not yet a product
        </Line>
        <Line at={systemAt + 6} x={NB.x - 50} y={NB.y + NB.h + h(56)} size={22} color={INK_SOFT}>
          the system around it
        </Line>

        <Spot id="dolphin" at={from + 4} x={1300} y={y(350)} w={460} />

        <NextLine at={nextAt} x={X0} y={y(800)} width={1000}>
          ML system design
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
