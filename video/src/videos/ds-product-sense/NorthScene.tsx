import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Chip, Clear, DATA, Drift, pulse, Strike, Svg, X0 } from "./parts";

const STAR = { top: 330, w: 640, h: 180 };
const CHECKS_X = 900;
const RAIL = { top: 600, x1: 1700 };

/**
 * Questions 1 and 2. The north star as one card: weekly cooks, people who
 * open a recipe in cooking mode, ticked against the three things a good one
 * does, with total signups struck beside it. Then the guardrails as a rail
 * of chips under it: the health checks you refuse to harm, and the one that
 * catches more notifications buying sessions while people quietly leave.
 */
export const NorthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("north").from;
  const qAt = n.word("north", "Question");
  const textAt = n.word("north", "What is a north-star metric");
  const singleAt = n.word("north", "the single number");
  const pushAt = n.word("north", "every team pushes toward");
  const goodAt = n.word("north-good", "A good one");
  const checks = [
    { text: "moves before revenue does", at: n.word("north-good", "moves before revenue does") },
    { text: "reflects real value", at: n.word("north-good", "reflects real value") },
    { text: "the team's work can move it", at: n.word("north-good", "the team's work can move") },
  ];
  const cooksAt = n.word("north-good", "weekly cooks");
  const modeAt = n.word("north-good", "open a recipe in cooking mode");
  const signupsAt = n.word("north-good", "Total signups is bigger");
  const nothingAt = n.word("north-good", "says nothing about whether anyone cooks");
  const q2At = n.word("guard", "Question two");
  const q2TextAt = n.word("guard", "What are guardrail metrics");
  const healthAt = n.word("guard", "the health checks you refuse to harm");
  const rails = [
    { text: "crash rate", at: n.word("guard", "crash rate") },
    { text: "load time", at: n.word("guard", "load time") },
    { text: "unsubscribes", at: n.word("guard", "unsubscribes") },
    { text: "revenue", at: n.word("guard", "revenue") },
  ];
  const gamedAt = n.word("guard", "can be gamed");
  const sendAt = n.word("guard", "Send more notifications");
  const climbAt = n.word("guard", "sessions climb");
  const leaveAt = n.word("guard", "people quietly leave");
  const proxiesAt = n.word("lead-in", "two ideas about proxies");
  const lieAt = n.word("lead-in", "when they lie");
  const end = n.beat("lead-in").to;

  const out1 = q2At - 4;
  const card = ease(frame, singleAt - 2, 14);
  const named = ease(frame, cooksAt - 2, 12);
  const glow = pulse(frame, proxiesAt, 30);
  const rail = ease(frame, healthAt, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={singleAt} level={-32} />
      {checks.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at + 2} level={-34} />
      ))}
      <Sfx name="el-pencil" at={cooksAt} level={-34} />
      <Sfx name="el-scratch" at={nothingAt} level={-32} />
      <Sfx name="slide" at={healthAt} level={-32} />
      {rails.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={leaveAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          What is a north-star metric, and what makes a good one?
        </QuestionCard>

        <Clear at={lieAt}>
          {/* The north star: one card, named once the narration names it. */}
          <div
            style={{
              position: "absolute",
              left: X0,
              top: y(STAR.top),
              width: STAR.w,
              height: h(STAR.h),
              boxSizing: "border-box",
              border: `3px solid ${DATA}`,
              borderRadius: 16,
              background: `color-mix(in srgb, ${HIGHLIGHT} ${glow * 60}%, color-mix(in srgb, ${DATA} 8%, ${PAPER}))`,
              opacity: card,
              transform: `translateY(${(1 - card) * 20}px)`,
            }}
          >
            <div style={{ position: "absolute", left: 30, top: 22, ...label(22, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>★ north star</div>
            <div style={{ position: "absolute", left: 28, top: 58, ...note(52, INK), fontWeight: 700, whiteSpace: "nowrap", opacity: named }}>
              weekly cooks
            </div>
            <div style={{ position: "absolute", left: 30, top: 128, ...note(23, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, modeAt, 12) }}>
              people who open a recipe in cooking mode
            </div>
          </div>
          <Note at={pushAt} x={X0} y={y(STAR.top) + h(STAR.h) + h(18)} out={out1}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>the number every team pushes toward</span>
          </Note>

          {/* What a good one does. */}
          <Note at={goodAt - 2} x={CHECKS_X} y={y(STAR.top)} out={out1}>
            <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>A good one:</span>
          </Note>
          {checks.map((c, i) => (
            <Note key={c.text} at={c.at - 2} x={CHECKS_X} y={y(STAR.top) + h(64) + i * h(58)} out={out1}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Tick at={c.at + 4} size={30} />
                <span style={{ ...note(29, INK), whiteSpace: "nowrap" }}>{c.text}</span>
              </div>
            </Note>
          ))}

          {/* The bigger number that says nothing. */}
          <Note at={signupsAt - 2} x={X0} y={y(STAR.top) + h(STAR.h) + h(80)} out={out1}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
              <span style={{ ...note(34, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
                <Strike at={nothingAt + 2}>total signups</Strike>
              </span>
              <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap", opacity: ease(frame, nothingAt, 12) }}>
                bigger, and says nothing about whether anyone cooks
              </span>
            </div>
          </Note>

          {/* ── Question 2: the rail under the north star ── */}
          <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
            What are guardrail metrics, and why do you need them?
          </QuestionCard>
          <Note at={healthAt - 2} x={CHECKS_X} y={y(STAR.top) + h(20)}>
            <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>guardrails:</span>
          </Note>
          <Note at={healthAt + 4} x={CHECKS_X} y={y(STAR.top) + h(70)}>
            <span style={{ ...note(27, INK_SOFT), whiteSpace: "nowrap" }}>health checks you refuse to harm on the way</span>
          </Note>
          <Svg opacity={rail}>
            {[0, 14].map((dy) => (
              <line
                key={dy}
                x1={X0}
                x2={X0 + (RAIL.x1 - X0) * rail}
                y1={y(RAIL.top) + dy}
                y2={y(RAIL.top) + dy}
                stroke={INK_SOFT}
                strokeWidth={2.2}
              />
            ))}
            {Array.from({ length: 13 }, (_, i) => (
              <line
                key={i}
                x1={X0 + 20 + i * 130}
                x2={X0 + 20 + i * 130}
                y1={y(RAIL.top)}
                y2={y(RAIL.top) + 34}
                stroke={INK_SOFT}
                strokeWidth={2.2}
                opacity={ease(frame, healthAt + 6 + i * 0.6, 6)}
              />
            ))}
          </Svg>
          {rails.map((r, i) => (
            <Chip
              key={r.text}
              x={X0 + i * 300}
              y={y(RAIL.top) + h(52)}
              at={r.at - 2}
              lit={r.text === "unsubscribes" ? leaveAt + 4 : undefined}
              ink={r.text === "unsubscribes" ? ACCENT_INK : INK}
            >
              {r.text}
            </Chip>
          ))}
          <Note at={gamedAt - 2} x={X0} y={y(RAIL.top) + h(150)}>
            <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>almost any single number can be gamed:</span>
          </Note>
          <Note at={sendAt} x={X0 + 560} y={y(RAIL.top) + h(150)}>
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
              more notifications →{" "}
              <span style={{ color: BLUE_INK, fontWeight: 650, opacity: ease(frame, climbAt, 10) }}>sessions ▲</span>
              <span style={{ color: ACCENT_INK, fontWeight: 650, opacity: ease(frame, leaveAt, 10) }}>, people quietly leave ▼</span>
            </span>
          </Note>
          <Svg opacity={ease(frame, leaveAt + 4, 12)}>
            <path
              d={`M ${X0 + 900} ${y(RAIL.top) + h(150) + 4} Q ${X0 + 860} ${y(RAIL.top) + h(110)} ${X0 + 790} ${y(RAIL.top) + h(104)}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.4}
              strokeDasharray="6 6"
            />
          </Svg>
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
