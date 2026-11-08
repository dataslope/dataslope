import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ESTIMATE } from "./data";
import { Arrow, Drift, InlineArrow, int, Line, Mark, reach, VRule, X0 } from "./parts";

const NF_X = 900;
const ROW_SIZE = 27;
const STEPS = [
  { text: "Requirements", cue: null },
  { text: "Estimate the load", cue: "estimate the load" },
  { text: "Define the API", cue: "define the API" },
  { text: "High-level design", cue: "sketch a high-level design" },
  { text: "Bottlenecks", cue: "drill into the bottlenecks" },
] as const;

/**
 * Question 1, the method, in the page's order: not boxes first, but the
 * requirements in two lists (the shortener's two features, and the four
 * qualities it must have), then estimate, API, high-level design, and only
 * then the bottlenecks. The second list is the one that shapes the design:
 * the same two features at a thousand users and at a billion redirects a day
 * are different systems.
 */
export const ApproachScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "How do you approach");
  const boxesAt = n.word("q1", "Not by drawing boxes");
  const boxesEnd = n.word("q1", "Not by drawing boxes", { edge: "end" });
  const firstAt = n.word("q1", "First, clarify the requirements");
  const listsAt = n.word("q1", "in two lists");
  const mustAt = n.word("q1-func", "what the system must do");
  const shortenAt = n.word("q1-func", "Shorten a long URL");
  const sendAt = n.word("q1-func", "send anyone who opens the short one");
  const aliasAt = n.word("q1-func", "custom aliases");
  const expireAt = n.word("q1-func", "Links that expire");
  const nfWords = ["scale", "latency", "availability", "consistency"].map((w) => n.word("q1-nonfunc", w));
  const fastAt = n.word("q1-nonfunc", "Redirects must be fast");
  const failAt = n.word("q1-nonfunc", "almost never fail");
  const pointAt = n.word("q1-nonfunc", "a short link must never start pointing somewhere else");
  const thenAt = n.word("q1-steps", "Then estimate the load");
  const stepAt = STEPS.map((s) => (s.cue ? n.word("q1-steps", s.cue) : thenAt - 2));
  const stepsEnd = n.beat("q1-steps").to;
  const shapesAt = n.word("q1-why", "shapes the design");
  const sameAt = n.word("q1-why", "the same two features");
  const thousandAt = n.word("q1-why", "at a thousand users");
  const billionAt = n.word("q1-why", "at a billion redirects a day");
  const differentAt = n.word("q1-why", "are different systems");
  const sayAt = n.word("q1-why", "Say each assumption out loud");
  const correctAt = n.word("q1-why", "so the interviewer can correct it");
  const end = n.beat("q1-why").to;

  // The sketch nobody should start with.
  const sketchY = y(380);
  const sketchGone = ease(frame, firstAt, 12);
  const strike = ease(frame, boxesEnd, 12);

  const headY = y(300);
  const row = (i: number) => y(372) + i * 60;
  const stepsY = y(648);
  const figY = y(748);
  const items = [
    { at: shortenAt, text: "Shorten a long URL", ink: INK },
    { at: sendAt, text: "Redirect anyone who opens the short one", ink: INK },
    { at: aliasAt, text: "Custom aliases?", ink: INK_SOFT },
    { at: expireAt, text: "Links that expire?", ink: INK_SOFT },
  ];
  const qualities = [
    { name: "Scale", gloss: null, glossAt: 0 },
    { name: "Latency", gloss: "redirects must be fast", glossAt: fastAt },
    { name: "Availability", gloss: "almost never fail", glossAt: failAt },
    { name: "Consistency", gloss: "a link never points somewhere else", glossAt: pointAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={boxesAt} level={-37} />
      <Sfx name="el-scratch" at={boxesEnd} level={-33} />
      <Sfx name="el-tap" at={listsAt} level={-35} />
      {[shortenAt, sendAt, aliasAt, expireAt, ...nfWords].map((a, i) => (
        <Sfx key={i} name="el-tap" at={a} level={-37} />
      ))}
      {stepAt.map((a, i) => (
        <Sfx key={`s${i}`} name="el-tap" at={a} level={-35} />
      ))}
      <Sfx name="el-pencil" at={shapesAt} level={-37} />
      <Sfx name="el-pop" at={thousandAt} level={-34} />
      <Sfx name="el-pop" at={billionAt} level={-34} />
      <Sfx name="el-chime" at={sayAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you approach an open-ended system design question?
        </QuestionCard>

        {/* Boxes first: the trap. */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - sketchGone }}>
          {[0, 1, 2].map((i) => {
            const p = ease(frame, boxesAt + i * 5, 10);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: X0 + 20 + i * 250,
                  top: sketchY - 38,
                  width: 160,
                  height: 76,
                  boxSizing: "border-box",
                  border: `2.4px solid ${INK_SOFT}`,
                  borderRadius: 10,
                  opacity: p,
                }}
              />
            );
          })}
          {[0, 1].map((i) => (
            <Arrow
              key={i}
              points={[
                [X0 + 190 + i * 250, sketchY],
                [X0 + 260 + i * 250, sketchY],
              ]}
              at={boxesAt + 4 + i * 5}
              dur={8}
              color={INK_SOFT}
              head={12}
            />
          ))}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <line
              x1={X0}
              y1={sketchY + 14}
              x2={X0 + 720 * strike}
              y2={sketchY + 14 - 26 * strike}
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={strike > 0 ? 1 : 0}
            />
          </svg>
        </div>

        {/* The two lists. */}
        <Line x={X0} y={headY} at={listsAt} size={30} weight={600} color={BLUE_INK}>
          Functional
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, mustAt, 10) }}>: what the system must do</span>
        </Line>
        {items.map((it, i) => (
          <Line key={it.text} x={X0} y={row(i)} at={it.at} size={ROW_SIZE} color={it.ink} weight={i < 2 ? 600 : 500}>
            {it.text}
          </Line>
        ))}
        <Line x={NF_X} y={headY} at={listsAt + 6} size={30} weight={600} color={BLUE_INK}>
          <Mark at={shapesAt} color={HIGHLIGHT}>
            Non-functional
          </Mark>
        </Line>
        <VRule x={785} top={headY} bottom={reach(frame, headY + 40, items.map((it, i) => [it.at, row(i) + 36] as const))} at={listsAt + 6} />
        {qualities.map((q, i) => (
          <Line key={q.name} x={NF_X} y={row(i)} at={nfWords[i]} size={ROW_SIZE} weight={600}>
            {q.name}
            {q.gloss ? <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, q.glossAt, 10) }}>: {q.gloss}</span> : null}
          </Line>
        ))}

        {/* The order: requirements first, bottlenecks last. */}
        <div style={{ position: "absolute", left: X0, top: stepsY, height: 54, display: "flex", alignItems: "center", gap: 18, fontSize: 26 }}>
          {STEPS.map((s, i) => {
            const at = stepAt[i];
            const p = ease(frame, at, 12);
            const next = stepAt[i + 1] ?? stepsEnd + 10;
            const lit = Math.min(ease(frame, at, 8), 1 - ease(frame, next, 10));
            const open = i === STEPS.length - 1;
            return (
              <React.Fragment key={s.text}>
                {i ? <InlineArrow at={at - 4} w={44} /> : null}
                <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em", whiteSpace: "nowrap", opacity: p }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "-0.14em",
                      right: "-0.14em",
                      top: "0.04em",
                      bottom: "-0.06em",
                      background: HIGHLIGHT,
                      borderRadius: "0.14em",
                      opacity: lit,
                    }}
                  />
                  <span style={{ position: "relative", ...note(26, open ? INK_SOFT : INK), fontWeight: 650, fontStyle: open ? "italic" : "normal" }}>
                    {s.text}
                  </span>
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Same features, different systems. */}
        {[
          { x: X0, at: thousandAt, n: 1000, unit: "users", servers: 1 },
          { x: X0 + 620, at: billionAt, n: ESTIMATE.readsPerDay, unit: "redirects a day", servers: 12 },
        ].map((f) => (
          <React.Fragment key={f.unit}>
            <Line x={f.x} y={figY} at={f.at} size={27} weight={600} color={BLUE_INK}>
              <Num>{int(f.n)}</Num> {f.unit}
            </Line>
            <Line x={f.x} y={figY + 48} at={Math.max(f.at, sameAt)} size={22} weight={600} color={INK}>
              shorten · redirect
            </Line>
            <Arrow
              points={[
                [f.x + 214, figY + 63],
                [f.x + 262, figY + 63],
              ]}
              at={differentAt}
              dur={8}
              head={11}
              color={INK_SOFT}
            />
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              {Array.from({ length: f.servers }, (_, k) => {
                const col = k % 6;
                const rowK = Math.floor(k / 6);
                const p = ease(frame, differentAt + 4 + k, 8);
                return (
                  <rect
                    key={k}
                    x={f.x + 280 + col * 34}
                    y={figY + (f.servers > 1 ? 40 + rowK * 26 : 46)}
                    width={26}
                    height={f.servers > 1 ? 20 : 34}
                    rx={4}
                    fill={`color-mix(in srgb, ${BAR} 14%, ${PAPER})`}
                    stroke={BAR}
                    strokeWidth={2}
                    opacity={p}
                  />
                );
              })}
            </svg>
          </React.Fragment>
        ))}
        <VRule x={583} top={figY} bottom={figY + 92} at={billionAt} />
        <VRule x={1308} top={figY} bottom={figY + 92} at={sayAt} />
        <Line x={1400} y={figY} at={sayAt} size={27} weight={600} width={420}>
          Say each assumption out loud
        </Line>
        <Line x={1400} y={figY + 50} at={correctAt} size={25} color={INK_SOFT} width={420}>
          so the interviewer can correct it before you build on it
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
