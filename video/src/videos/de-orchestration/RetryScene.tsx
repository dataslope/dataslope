import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RETRY } from "./data";
import { Cross, Drift, lineOf, MARK, OK_INK, Pill, pulse, PyListing, X0 } from "./parts";

/** The page's default_args, word for word. */
const ARGS = [
  "default_args = {",
  '    "retries": 3,',
  '    "retry_delay": timedelta(minutes=5),',
  '    "retry_exponential_backoff": True,',
  '    "max_retry_delay": timedelta(minutes=30),',
  "}",
];
const RIGHT_X = 960;
/** The attempts' line: 35 minutes of waiting across it. */
const LINE_X0 = 990;
const LINE_W = 720;

/**
 * Question 4, the settings. What to retry (transient failures) and what not
 * to (deterministic ones); the page's default_args, read as a doubling
 * schedule: four attempts with waits of 5, 10 and 20 minutes, never more than
 * 30 (Pyodide, check.mjs). Retry only idempotent tasks, and alert when the
 * retries run out.
 */
export const RetryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("retry").from;
  const qAt = n.word("retry", "Question four");
  const textAt = n.word("retry", "How should you configure retries");
  const transAt = n.word("retry", "Retry transient failures");
  const okItems = [
    { text: "a network blip", at: n.word("retry", "a network blip") },
    { text: "a rate limit", at: n.word("retry", "a rate limit") },
    { text: "a brief outage", at: n.word("retry", "a brief outage") },
  ];
  const smallAt = n.word("retry", "Keep the count small");
  const expAt = n.word("retry", "back off exponentially");
  const waitAt = [n.word("retry", "wait five minutes"), n.word("retry", "then ten"), n.word("retry", "then twenty")];
  const capAt = n.word("retry", "never more than thirty");
  const dontAt = n.word("retry-not", "Don't retry deterministic failures");
  const badItems = [
    { text: "a bad SQL query", at: n.word("retry-not", "a bad sequel query") },
    { text: "a schema mismatch", at: n.word("retry-not", "a schema mismatch") },
  ];
  const sameAt = n.word("retry-not", "they fail the same way every time");
  const idemAt = n.word("retry-not", "Retry only idempotent tasks");
  const alertAt = n.word("retry-not", "alert when retries run out");
  const surfaceAt = n.word("retry-not", "repeated failures surface");
  const end = n.beat("retry-not").to;

  // The attempts, placed by the minutes waited before each.
  const perMin = LINE_W / RETRY.totalWait;
  const xs = [LINE_X0];
  for (const w of RETRY.waits) xs.push(xs[xs.length - 1] + w * perMin);
  const lineY = y(650);
  const R = 24;
  const lastFails = alertAt + 2;
  // Each attempt appears as the wait before it ends, and fails as its own wait begins.
  const appearAt = (i: number) => (i === 0 ? waitAt[0] - 6 : waitAt[i - 1] + 16);
  const failAt = (i: number) => (i < 3 ? Math.max(appearAt(i) + 4, waitAt[i]) : lastFails);
  const ping = pulse(frame, surfaceAt, 24);

  return (
    <AbsoluteFill>
      {okItems.map((it) => (
        <Sfx key={it.text} name="el-tap" at={it.at} level={-37} />
      ))}
      {waitAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={-36} />
      ))}
      <Sfx name="el-pencil" at={capAt} level={-36} />
      {badItems.map((it) => (
        <Sfx key={it.text} name="el-tap" at={it.at} level={-37} />
      ))}
      <Sfx name="el-scratch" at={lastFails} level={-34} />
      <Sfx name="el-pop" at={alertAt + 8} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={54}>
          How should you configure retries, and what shouldn&apos;t you retry?
        </QuestionCard>

        {/* What to retry, and what never to. */}
        <Note at={transAt} x={X0} y={y(286)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>retry: transient failures</span>
        </Note>
        {okItems.map((it, i) => (
          <Note key={it.text} at={it.at - 2} x={X0 + 20} y={y(336) + i * h(44)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>· {it.text}</span>
          </Note>
        ))}
        <Note at={dontAt} x={X0} y={y(500)}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>don&apos;t retry: deterministic failures</span>
        </Note>
        {badItems.map((it, i) => (
          <Note key={it.text} at={it.at - 2} x={X0 + 20} y={y(550) + i * h(44)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>· {it.text}</span>
          </Note>
        ))}
        <Note at={sameAt} x={X0 + 20} y={y(646)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>the same failure, every time</span>
        </Note>
        <Pill x={X0} y={y(740)} at={idemAt} ink={OK_INK} size={24}>
          retry only idempotent tasks
        </Pill>

        {/* The page's settings. */}
        <PyListing
          lines={ARGS}
          x={RIGHT_X}
          top={y(286)}
          width={680}
          size={21}
          at={smallAt - 2}
          marks={[
            { line: lineOf(ARGS, '"retries"'), at: smallAt + 4 },
            { line: lineOf(ARGS, "retry_exponential_backoff"), at: expAt },
            { line: lineOf(ARGS, '"retry_delay"'), at: waitAt[0] },
            { line: lineOf(ARGS, "max_retry_delay"), at: capAt },
          ].map((m) => ({ ...m, color: MARK }))}
        />

        {/* Four attempts, each wait twice the one before. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {RETRY.waits.map((w, i) => {
            const p = ease(frame, waitAt[i] + 2, 16);
            return <line key={i} x1={xs[i] + R} x2={xs[i] + R + (xs[i + 1] - xs[i] - 2 * R) * p} y1={lineY} y2={lineY} stroke={BAR} strokeWidth={5} strokeLinecap="round" />;
          })}
          {xs.map((x, i) => {
            const p = ease(frame, appearAt(i), 10);
            const bad = ease(frame, failAt(i), 8);
            return (
              <g key={i} opacity={p}>
                <circle
                  cx={x}
                  cy={lineY}
                  r={R + (i === 3 ? 4 * ping : 0)}
                  fill={PAPER}
                  stroke={`color-mix(in srgb, ${ACCENT} ${bad * 100}%, ${INK})`}
                  strokeWidth={2.6}
                />
                <text x={x} y={lineY + 7} textAnchor="middle" style={svgText({ ...label(20, INK), fontWeight: 700 })}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        {xs.map((x, i) =>
          frame >= failAt(i) ? (
            <div key={i} style={{ position: "absolute", left: x - 11, top: lineY + R + 8 }}>
              <Cross at={failAt(i)} size={22} />
            </div>
          ) : null,
        )}
        <Note at={waitAt[0] - 4} x={LINE_X0 - R} y={lineY - h(84)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>attempts</span>
        </Note>
        {RETRY.waits.map((w, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (xs[i] + xs[i + 1]) / 2 - 70,
              width: 140,
              top: lineY - h(50),
              textAlign: "center",
              ...note(23, BLUE_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              opacity: ease(frame, waitAt[i] + 4, 10),
            }}
          >
            <Num>{w}</Num> min
          </div>
        ))}
        <Note at={capAt + 2} x={LINE_X0 - R} y={lineY + h(66)}>
          <span style={{ ...note(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            each wait doubles, never more than <Num>{RETRY.max}</Num> min
          </span>
        </Note>
        <Note at={alertAt + 8} x={xs[3] + R} y={lineY + h(66)} align="right">
          <span
            style={{
              display: "inline-block",
              padding: "4px 14px",
              border: `2.4px solid ${ACCENT}`,
              borderRadius: 8,
              ...note(24, ACCENT_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              transform: `scale(${1 + 0.06 * ping})`,
            }}
          >
            out of retries: alert
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
