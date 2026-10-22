import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, PAPER, TABULAR, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, pulse, X0 } from "./parts";

const TOP = 350;
const ROW = 92;
const TAG_X = 1340;

/** The five pitfalls in the order this video takes them, each with its question. */
const PITFALLS = [
  { cue: "a split that isn't the one you set", text: "A split that isn't the one you set", q: 2 },
  { cue: "segments that disagree with the total", text: "Segments that disagree with the total", q: 4 },
  { cue: "a lift that fades once it isn't new", text: "A lift that fades once it isn't new", q: 5 },
  { cue: "metrics read until one of them moves", text: "Metrics read until one of them moves", q: 6 },
  { cue: "users who affect each other", text: "Users who affect each other", q: 7 },
];

/**
 * Question 1. The page's list of pitfalls, read as five rows; then each row
 * takes the number of the question in this video that answers it, so the
 * list is also the video's map.
 */
export const PitfallsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pitfalls").from;
  const qAt = n.word("pitfalls", "Question one");
  const textAt = n.word("pitfalls", "What are the common");
  const fiveAt = n.word("pitfalls", "Five come up again and again");
  const eachAt = n.word("pitfalls", "Each gets a question of its own");
  const end = n.beat("pitfalls").to;

  return (
    <AbsoluteFill>
      {PITFALLS.map((p) => (
        <Sfx key={p.q} name="el-tap" at={n.word("pitfalls", p.cue)} level={-37} />
      ))}
      <Sfx name="el-pop" at={eachAt + 2} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={62}>
          What are the common A/B testing pitfalls?
        </QuestionCard>
        <div style={{ position: "absolute", left: X0, top: y(TOP) - h(46), opacity: ease(frame, fiveAt - 2, 12) }}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Five that come up again and again</span>
        </div>

        {PITFALLS.map((p, i) => {
          const at = n.word("pitfalls", p.cue);
          const s = ease(frame, at - 2, 12);
          if (s <= 0) return null;
          const tag = ease(frame, eachAt + i * 4, 10);
          const bump = pulse(frame, eachAt + i * 4, 16);
          const top = y(TOP) + i * h(ROW);
          return (
            <React.Fragment key={p.q}>
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top,
                  height: h(ROW) - 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  opacity: s,
                  transform: `translateX(${(1 - s) * -18}px)`,
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    border: `2.5px solid ${ACCENT}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(22, ACCENT_INK),
                    fontWeight: 800,
                    ...TABULAR,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ ...note(34, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{p.text}</span>
              </div>
              {/* A dotted leader to the question that answers it. */}
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: tag }}>
                <line
                  x1={TAG_X - 40 - 260 * tag}
                  x2={TAG_X - 20}
                  y1={top + (h(ROW) - 14) / 2}
                  y2={top + (h(ROW) - 14) / 2}
                  stroke={INK}
                  strokeWidth={1.5}
                  strokeDasharray="2 7"
                  opacity={0.5}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: TAG_X,
                  top: top + (h(ROW) - 14) / 2 - 22,
                  padding: "6px 16px",
                  borderRadius: 6,
                  background: BLUE_INK,
                  ...label(22, PAPER),
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  ...TABULAR,
                  opacity: tag,
                  transform: `scale(${1 + 0.08 * bump})`,
                }}
              >
                Question {p.q}
              </div>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
