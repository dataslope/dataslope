import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, Svg } from "./parts";

const CORE = { x: 610, y: 340, w: 700, h: 130 };
const RING_Y = 560;
const BOX_W = 400;
const BOX_GAP = 20;
const RING_X = (1920 - (4 * BOX_W + 3 * BOX_GAP)) / 2;

/** A box in the loop's diagram: a title, and an optional line under it. */
const Box: React.FC<{ x: number; y: number; w: number; h: number; at: number; title: React.ReactNode; sub?: React.ReactNode; strong?: boolean }> = ({
  x,
  y,
  w,
  h,
  at,
  title,
  sub,
  strong = false,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${strong ? 3 : 2}px solid ${strong ? INK : BLUE_INK}`,
        borderRadius: 12,
        background: PAPER,
        padding: "16px 22px",
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      <div style={{ ...note(strong ? 32 : 26, INK), fontWeight: 650 }}>{title}</div>
      {sub ? <div style={{ ...note(22, INK_SOFT), marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
};

/**
 * Question 1, the page's own answer: the live SQL screen still at the center
 * of the loop, usually with AI off, and the four kinds of question that now
 * sit around it, each arriving as it is named; then the advice to ask the
 * recruiter, round by round.
 */
export const ChangedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("changed").from;
  const qAt = n.word("changed", "Question");
  const textAt = n.word("changed", "How has the data analyst");
  const coreAt = n.word("changed-core", "The live SQL screen");
  // The center box arrives as the question ends, so it never sits alone.
  const asked = n.beat("changed").to;
  const offAt = n.word("changed-core", "usually AI off");
  const fluencyAt = n.word("changed-core", "fluency still matters");
  const aroundAt = n.word("changed-around", "Around it");
  const ring = [
    { at: n.word("changed-around", "verifying a query"), title: "Verifying a query", sub: "an assistant wrote this; is it right?" },
    { at: n.word("changed-around", "what you would and wouldn't share"), title: "Responsible use", sub: "what you'd share with a tool, and saying so" },
    { at: n.word("changed-around", "the AI features in BI tools"), title: "AI in BI tools", sub: "Power BI, Tableau, Looker" },
    { at: n.word("changed-around", "deeper follow-ups on take-homes"), title: "Take-home follow-ups", sub: "why this filter, why this grain" },
  ];
  const biAt = n.word("changed-around", "business intelligence tools");
  const askAt = n.word("changed-ask", "Ask the recruiter");
  const differAt = n.word("changed-ask", "Policies differ");
  const end = n.beat("changed-ask").to;

  const coreY = y(CORE.y);
  const ringY = y(RING_Y);
  const coreMid = CORE.x + CORE.w / 2;
  const links = ring.map((r, i) => ({ at: r.at, x: RING_X + i * (BOX_W + BOX_GAP) + BOX_W / 2 }));

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={coreAt} level={-32} />
      {ring.map((r) => (
        <Sfx key={r.title} name="el-tap" at={r.at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={askAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          How has the Data Analyst interview changed with AI?
        </QuestionCard>

        {/* ── At the center, still: the live SQL screen ── */}
        <Box
          x={CORE.x}
          y={coreY}
          w={CORE.w}
          h={h(CORE.h)}
          at={Math.min(coreAt, asked) - 6}
          strong
          title="The live SQL screen"
          sub={
            <>
              usually <Mark at={offAt + 2}>AI off</Mark>
              <span style={{ opacity: ease(frame, fluencyAt - 2, 10) }}>, so fluency still matters</span>
            </>
          }
        />

        {/* ── Around it, four new kinds of question ── */}
        <Svg opacity={ease(frame, aroundAt - 2, 12)}>
          {links.map((l) => {
            const p = ease(frame, l.at - 4, 14);
            return (
              <path
                key={l.x}
                d={`M${coreMid},${coreY + h(CORE.h)} C${coreMid},${coreY + h(CORE.h) + 40} ${l.x},${ringY - 50} ${l.x},${ringY - 4}`}
                fill="none"
                stroke={ds("blue", 300)}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray={`${p} 1`}
              />
            );
          })}
        </Svg>
        {ring.map((r, i) => (
          <Box key={r.title} x={RING_X + i * (BOX_W + BOX_GAP)} y={ringY} w={BOX_W} h={h(116)} at={r.at - 2} title={r.title} sub={r.sub} />
        ))}
        <Note at={biAt + 2} x={RING_X + 2 * (BOX_W + BOX_GAP)} y={ringY + h(126)}>
          <span style={{ ...label(19, BLUE_INK), whiteSpace: "nowrap" }}>BI: business intelligence</span>
        </Note>

        {/* ── Round by round ── */}
        <div
          style={{
            position: "absolute",
            left: CORE.x - 80,
            top: y(790),
            width: CORE.w + 160,
            textAlign: "center",
            opacity: ease(frame, askAt - 2, 12),
            transform: `translateY(${(1 - ease(frame, askAt - 2, 12)) * 10}px)`,
          }}
        >
          <span style={{ ...note(30, INK), fontWeight: 600, background: `linear-gradient(${HIGHLIGHT}, ${HIGHLIGHT})`, padding: "4px 12px", borderRadius: 6 }}>
            Ask the recruiter: is AI allowed in this round?
          </span>
          <div style={{ ...note(22, INK_SOFT), marginTop: 10, opacity: ease(frame, differAt - 2, 10) }}>policies differ, and change often</div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
