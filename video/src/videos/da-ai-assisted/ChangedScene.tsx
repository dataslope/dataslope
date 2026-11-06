import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, Svg } from "./parts";

/** The loop as plain text: the live SQL screen as a centred heading at the
 *  top, and the four kinds of question around it as four centred columns,
 *  each reached by its own curve. The curves separate the columns, so they
 *  take no hairlines. Layout units for positions (through y()), px across. */
const CORE = { y: 352, w: 700 };
/** The heading's two lines, in px: a 32px title over a 22px line, 6 apart. */
const CORE_H = 42 + 6 + 29;
const RING_Y = 560;
const COL_W = 400;
const COL_GAP = 20;
const RING_X = (1920 - (4 * COL_W + 3 * COL_GAP)) / 2;
/** Where a curve stops above its column's title, in px. */
const CURVE_GAP = 12;

/** One kind of question: its title, and the line under it, centred in its
 *  column. It holds its place before it inks, so nothing reflows. */
const Kind: React.FC<{ x: number; y: number; at: number; title: React.ReactNode; sub: React.ReactNode; extra?: React.ReactNode }> = ({ x, y, at, title, sub, extra }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: COL_W, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
      <div style={{ ...note(26, INK), fontWeight: 650, lineHeight: "34px", whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ ...note(22, INK_SOFT), lineHeight: "29px", marginTop: 6, textWrap: "balance" }}>{sub}</div>
      {extra}
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
  const { y } = useLayout();

  const from = n.beat("changed").from;
  const qAt = n.word("changed", "Question");
  const textAt = n.word("changed", "How has the data analyst");
  const coreAt = n.word("changed-core", "The live SQL screen");
  // The heading arrives as the question ends, so it never sits alone.
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
  const coreMid = 960;
  // The curves leave from under the heading's second line.
  const forkTop = coreY + CORE_H + CURVE_GAP;
  const coreP = ease(frame, Math.min(coreAt, asked) - 6, 14);
  const links = ring.map((r, i) => ({ at: r.at, x: RING_X + i * (COL_W + COL_GAP) + COL_W / 2 }));

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

        {/* ── At the center, still: the live SQL screen, a centred heading ── */}
        <div
          style={{
            position: "absolute",
            left: 960 - CORE.w / 2,
            top: coreY,
            width: CORE.w,
            textAlign: "center",
            opacity: coreP,
            transform: `translateY(${(1 - coreP) * 12}px)`,
          }}
        >
          <div style={{ ...note(32, INK), fontWeight: 650, lineHeight: "42px", whiteSpace: "nowrap" }}>The live SQL screen</div>
          <div style={{ ...note(22, INK_SOFT), lineHeight: "29px", marginTop: 6, whiteSpace: "nowrap" }}>
            usually <Mark at={offAt + 2}>AI off</Mark>
            <span style={{ opacity: ease(frame, fluencyAt - 2, 10) }}>, so fluency still matters</span>
          </div>
        </div>

        {/* ── Around it, four new kinds of question, each on its own curve ── */}
        <Svg opacity={ease(frame, aroundAt - 2, 12)}>
          {links.map((l) => {
            const p = ease(frame, l.at - 4, 14);
            return (
              <path
                key={l.x}
                d={`M${coreMid},${forkTop} C${coreMid},${forkTop + 40} ${l.x},${ringY - 50} ${l.x},${ringY - CURVE_GAP}`}
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
          <Kind
            key={r.title}
            x={RING_X + i * (COL_W + COL_GAP)}
            y={ringY}
            at={r.at - 2}
            title={r.title}
            sub={r.sub}
            extra={
              i === 2 ? (
                <div style={{ ...label(19, BLUE_INK), lineHeight: "25px", marginTop: 10, whiteSpace: "nowrap", opacity: ease(frame, biAt + 2, 14) }}>BI: business intelligence</div>
              ) : undefined
            }
          />
        ))}

        {/* ── Round by round ── */}
        <div
          style={{
            position: "absolute",
            left: 960 - CORE.w / 2 - 80,
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
