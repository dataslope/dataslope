import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ACCENT, ACCENT_INK, Drift, GOLD, INK, INK_SOFT, Line, Mark, pulse, Q_SIZE, QUIET, Svg, X0 } from "./parts";

const FRAME = { x: X0, w: 1380 };
const PAD = 6;

/**
 * Question 9. The window as one outlined bar of fixed width, filled from the
 * left by what competes for it (instructions, retrieved documents, history,
 * then the answer), each a labelled segment; prompt and output bracketed
 * under it. What does not fit runs past the right edge in gray, behind a red
 * line at the limit: invisible to the model.
 */
export const WindowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Question nine");
  const textAt = n.word("q9", "What is a context window");
  const mostAt = n.word("q9-a", "the most tokens");
  const promptAt = n.word("q9-a", "prompt and output together");
  const instrAt = n.word("q9-a", "Instructions");
  const docsAt = n.word("q9-a", "documents");
  const histAt = n.word("q9-a", "and history");
  const competeAt = n.word("q9-a", "all compete for it");
  const longerAt = n.word("q9-a", "a longer one costs more");
  const pastAt = n.word("q9-a", "anything past the limit");
  const invisAt = n.word("q9-a", "is invisible");
  const shapeAt = n.word("train-in", "the shape");
  const learnsAt = n.word("train-in", "how it learns");
  const end = n.beat("train-in").to;

  const top = y(450);
  const H = h(78);
  const inner = FRAME.w - 2 * PAD;
  const SEGS = [
    { text: "instructions", w: 0.16, at: instrAt, fill: ds("blue", 300) },
    { text: "retrieved documents", w: 0.38, at: docsAt, fill: ds("blue", 200) },
    { text: "history", w: 0.24, at: histAt, fill: ds("teal", 200) },
    { text: "answer", w: 0.22, at: competeAt + 4, fill: ds("purple", 200) },
  ];
  let acc = 0;
  const segs = SEGS.map((s) => {
    const x = FRAME.x + PAD + acc * inner;
    acc += s.w;
    return { ...s, x, px: s.w * inner };
  });
  const over = { x: FRAME.x + FRAME.w + 10, w: 300 };
  const squeeze = 1 - 0.04 * Math.sin(Math.min(1, Math.max(0, (frame - competeAt) / 24)) * Math.PI);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={mostAt} level={-36} />
      <Sfx name="el-tap" at={instrAt} level={-32} />
      <Sfx name="el-tap" at={docsAt} level={-32} />
      <Sfx name="el-tap" at={histAt} level={-32} />
      <Sfx name="el-whoosh" at={pastAt} level={-36} />
      <Sfx name="el-tap" at={invisAt} level={-30} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is a context window, and why does its size matter?
        </QuestionCard>

        <Line at={mostAt} x={X0} y={y(330)} size={26}>
          The most tokens the model can attend to at once
        </Line>

        {/* The window: a fixed width, outlined. */}
        <Svg>
          {segs.map((s) => {
            const p = ease(frame, s.at, 16);
            if (p <= 0) return null;
            return <rect key={s.text} x={s.x} y={top + PAD} width={Math.max(0, s.px * p * squeeze - 4)} height={H - 2 * PAD} rx={4} fill={s.fill} />;
          })}
          {/* What does not fit: past the edge, grayed out. */}
          {ease(frame, pastAt, 14) > 0 ? <rect x={over.x} y={top + PAD} width={over.w * ease(frame, pastAt, 18)} height={H - 2 * PAD} rx={4} fill={QUIET} /> : null}
          <rect
            x={FRAME.x}
            y={top}
            width={FRAME.w}
            height={H}
            rx={8}
            fill="none"
            stroke={pulse(frame, shapeAt, 30) > 0 ? `color-mix(in srgb, ${GOLD} ${pulse(frame, shapeAt, 30) * 100}%, ${INK})` : INK}
            strokeWidth={2 + 2 * pulse(frame, shapeAt, 30)}
            opacity={ease(frame, mostAt + 4, 14)}
          />
          {ease(frame, pastAt + 6, 10) > 0 ? (
            <line x1={FRAME.x + FRAME.w + 4} x2={FRAME.x + FRAME.w + 4} y1={top - h(26)} y2={top + H + h(26)} stroke={ACCENT} strokeWidth={3 + 3 * pulse(frame, learnsAt, 30)} opacity={ease(frame, pastAt + 6, 10)} />
          ) : null}
        </Svg>
        {segs.map((s) => (
          <div
            key={s.text}
            style={{
              position: "absolute",
              left: s.x + 6,
              top: top - h(40),
              ...label(22, INK),
              fontWeight: 500,
              whiteSpace: "nowrap",
              opacity: ease(frame, s.at + 6, 12),
            }}
          >
            {s.text}
          </div>
        ))}
        <div style={{ position: "absolute", left: over.x + 6, top: top - h(40), ...label(22, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, pastAt + 4, 12) }}>
          more documents
        </div>
        <div style={{ position: "absolute", left: over.x + 6, top: top + H + h(18), ...label(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, invisAt, 12) }}>
          invisible
        </div>
        <div style={{ position: "absolute", left: FRAME.x + FRAME.w - 146, top: top - h(78), width: 150, textAlign: "right", ...label(21, ACCENT_INK), fontWeight: 500, opacity: ease(frame, pastAt + 8, 12) }}>
          the limit
        </div>

        {/* Prompt and output, bracketed under the window. */}
        <Svg opacity={ease(frame, promptAt + 8, 14)}>
          {[
            [segs[0].x, segs[2].x + segs[2].px - 8],
            [segs[3].x, segs[3].x + segs[3].px - 8],
          ].map(([a, b], i) => (
            <path key={i} d={`M${a},${top + H + h(14)} L${a},${top + H + h(26)} L${b},${top + H + h(26)} L${b},${top + H + h(14)}`} fill="none" stroke={INK_SOFT} strokeWidth={2} />
          ))}
        </Svg>
        <Line at={promptAt + 10} x={(segs[0].x + segs[2].x + segs[2].px) / 2} y={top + H + h(36)} size={22} align="center" width={200} color={INK_SOFT}>
          prompt
        </Line>
        <Line at={promptAt + 14} x={segs[3].x + segs[3].px / 2} y={top + H + h(36)} size={22} align="center" width={200} color={INK_SOFT}>
          output
        </Line>

        <Line at={competeAt} x={X0} y={y(680)} size={26}>
          All of it competes for one window
        </Line>
        <Line at={longerAt} x={X0} y={y(736)} size={26}>
          A longer window <Mark at={longerAt + 8}>costs more</Mark>
        </Line>

      </Drift>
    </AbsoluteFill>
  );
};
