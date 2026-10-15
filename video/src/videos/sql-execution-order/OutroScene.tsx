import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { Logo } from "../../components/Logo";
import { bob, ease, pop } from "../../components/motion";
import { Pattern } from "../../components/Pattern";
import { useNarration } from "../../narration/NarrationContext";
import { colors, ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { VIDEO } from "./data";

const LESSON_URL = "dataslope.com/courses/intro-sql-postgres/query-execution-order";
const COURSE = "Introduction to SQL and Relational Databases with PostgreSQL";

/** End card: the takeaway, the two steps this video skipped, and the lesson. */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const start = n.beat("outro").from;
  const pHead = pop(frame, n.word("outro", "FROM"), fps, 16);
  const pMore = ease(frame, n.word("outro", "two more"), 12);
  const pLesson = pop(frame, n.word("outro", "Dataslope"), fps, 15);
  const pArt = pop(frame, start + 4, fps, 18);
  const band = ease(frame, start - 8, 18);

  return (
    <AbsoluteFill style={{ background: colors.page }}>
      <Pattern
        video={VIDEO}
        name="outro-band"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 150,
          clipPath: `inset(0 0 0 ${(1 - band) * 100}%)`,
        }}
      />
      <Logo size={46} style={{ position: "absolute", left: 96, top: 206 }} />
      <div style={{ position: "absolute", left: 96, top: 320, width: 1060, fontFamily: SANS, color: colors.ink }}>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            opacity: pHead,
            transform: `translateY(${(1 - pHead) * 30}px)`,
          }}
        >
          Read it from <span style={{ fontFamily: MONO, color: colors.accentInk }}>FROM</span> down.
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: colors.inkSoft, opacity: pMore }}>
          The full order adds two more steps:{" "}
          <span style={{ fontFamily: MONO, fontWeight: 700, color: colors.ink }}>window functions</span> and{" "}
          <span style={{ fontFamily: MONO, fontWeight: 700, color: colors.ink }}>DISTINCT</span>.
        </div>
        <div
          style={{
            marginTop: 56,
            display: "inline-flex",
            flexDirection: "column",
            gap: 8,
            padding: "26px 34px",
            borderRadius: 24,
            background: ds("blue", 50),
            border: `3px solid ${ds("blue", 200)}`,
            opacity: pLesson,
            transform: `scale(${0.92 + pLesson * 0.08})`,
            transformOrigin: "left center",
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.06em", color: colors.accentInk }}>
            THE LESSON
          </span>
          <span style={{ fontSize: 40, fontWeight: 800 }}>Query Execution Order</span>
          <span style={{ fontSize: 28, fontWeight: 600, color: colors.inkSoft }}>{COURSE}</span>
          <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: colors.accentInk, whiteSpace: "nowrap" }}>
            {LESSON_URL}
          </span>
        </div>
      </div>
      <Illustration
        video={VIDEO}
        id="sql-eo-outro"
        style={{
          position: "absolute",
          left: 1180,
          top: 300,
          width: 660,
          height: 500,
          opacity: pArt,
          transform: `translateY(${bob(frame) + (1 - pArt) * 50}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
