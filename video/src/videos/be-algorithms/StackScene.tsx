import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, HIGHLIGHT, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BRACKETS } from "./data";
import { ACCENT, ACCENT_INK, Art, Cell, Cross, Drift, INK, INK_SOFT, Line, MARK_BAD, OK_INK, Svg, VRule } from "./parts";

const SX = 140;
const CH = 74;
/** The stack, drawn as a column of openers, newest on top. */
const COL_X = 660;
const SLOT = 70;
/** The verdict table. */
const TX = 1120;
const COL1 = 1440;
const COL2 = 1660;

const crossed = BRACKETS.find((b) => b.s === "([)]");
const nested = BRACKETS.find((b) => b.s === "{[]}");
if (!crossed || !nested) throw new Error("results.json lacks the two bracket strings");

/** A checker's verdict on a string, colored by whether it is right. */
const Verdict: React.FC<{ at: number; accepts: boolean; right: boolean; x: number; top: number }> = ({ at, accepts, right, x, top }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x - 90, top, width: 180, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 24, opacity: p }}>
      {right ? <Tick at={at} size={24} /> : <Cross at={at} size={22} />}
      <span style={{ ...note(24, right ? OK_INK : ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>{accepts ? "accepts" : "rejects"}</span>
    </div>
  );
};

/** A bracket set big in the mono face, one character to a box. */
const Glyph: React.FC<{ ch: string; x: number; y: number; at: number; mark?: string; markAt?: number }> = ({ ch, x, y, at, mark, markAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const m = markAt === undefined ? 0 : ease(frame, markAt, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CH - 10,
        height: 92,
        borderRadius: 8,
        background: m > 0 && mark ? mark : undefined,
        opacity: p,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 72,
        fontWeight: 500,
        color: INK,
      }}
    >
      {ch}
    </div>
  );
};

/**
 * Question 4. "([)]" and "{[]}" through three checkers: a counter, which
 * accepts both; a queue, which matches the oldest opener and so gets both
 * wrong; and a stack, the openers in a column with the newest on top, which
 * gets both right. The verdicts collect in a table on the right, green
 * where a checker is right and red where it is wrong (results.json).
 */
export const StackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("stack").from;
  const qAt = n.word("stack", "Question four");
  const textAt = n.word("stack", "When is a stack the right structure");
  const recentAt = n.word("stack", "When the problem is about the most recent thing");
  const lifoAt = n.word("stack", "Last in, first out");
  const counterAt = n.word("stack-count", "A counter can't do it");
  const stringAt = n.word("stack-count", "This string opens and closes");
  const acceptsAt = n.word("stack-count", "so counting accepts it");
  const butAt = n.word("stack-count", "But the round one closes");
  const insideAt = n.word("stack-count", "the square one inside is open");
  const keepsAt = n.word("stack-run", "A stack keeps the openers");
  const topAt = n.word("stack-run", "newest on top");
  const matchAt = n.word("stack-run", "each closer must match the top");
  const rejectedAt = n.word("stack-run", "rejected");
  const queueAt = n.word("stack-queue", "A queue matches the oldest opener");
  const thisAt = n.word("stack-queue", "it accepts this one");
  const nestedAt = n.word("stack-queue", "and rejects a correctly nested string");
  const dfsAt = n.word("stack-next", "Depth-first search is the same idea");
  const pathAt = n.word("stack-next", "the path you're on is the stack");
  const end = n.beat("stack-next").to;

  const sTop = y(340);
  const chars = [...crossed.s];
  const colBase = y(620);
  const slotY = (i: number) => colBase - (i + 1) * SLOT - 6;
  const qTop = y(700);
  const tTop = y(340);
  const row = (i: number) => tTop + 46 + i * 56;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={stringAt} level={-32} />
      <Sfx name="el-tap" at={acceptsAt} level={-32} />
      <Sfx name="el-pop" at={keepsAt} level={-30} />
      <Sfx name="el-tap" at={topAt} level={-32} />
      <Sfx name="el-scratch" at={matchAt + 10} level={-35} />
      <Sfx name="el-tap" at={thisAt} level={-32} />
      <Sfx name="el-tap" at={nestedAt + 4} level={-32} />
      <Sfx name="el-chime" at={pathAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={62}>
          When is a stack the right structure?
        </QuestionCard>
        <Line at={recentAt} x={96} y={y(262)} size={26} color={INK_SOFT}>
          The most recent thing still open: nesting, undo, backtracking.
          <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, lifoAt, 10) }}> Last in, first out.</span>
        </Line>
        <Art name="plates" at={keepsAt} left={1420} top={y(660)} h={170} />

        {/* The string, and the counter that accepts it. */}
        {chars.map((ch, i) => (
          <Glyph
            key={i}
            ch={ch}
            x={SX + i * CH}
            y={sTop}
            at={stringAt + i * 3}
            mark={i === 1 ? HIGHLIGHT : i === 2 ? MARK_BAD : undefined}
            markAt={i === 1 ? insideAt : i === 2 ? butAt + 4 : undefined}
          />
        ))}
        <Line at={stringAt + 14} x={SX} y={sTop + 112} size={24} color={INK_SOFT}>
          round: +1 − 1 = 0
        </Line>
        <Line at={stringAt + 20} x={SX} y={sTop + 152} size={24} color={INK_SOFT}>
          square: +1 − 1 = 0
        </Line>
        <Line at={acceptsAt} x={SX} y={sTop + 200} size={24} weight={500} color={ACCENT_INK}>
          A counter accepts it
        </Line>
        <Line at={insideAt} x={SX} y={sTop + 240} size={24} weight={500}>
          but <b style={{ color: ACCENT_INK }}>)</b> closes while <b>[</b> is open
        </Line>

        <VRule x={566} top={sTop - 4} bottom={colBase + 8} at={keepsAt - 2} />
        <VRule x={1020} top={sTop - 4} bottom={row(3) + 50} at={counterAt} />

        {/* The stack: openers in a column, newest on top. */}
        <Line at={keepsAt - 2} x={COL_X - 8} y={sTop - 4} size={22} weight={500}>
          A stack<span style={{ opacity: ease(frame, topAt, 10) }}>: newest on top</span>
        </Line>
        <Svg opacity={ease(frame, keepsAt, 12)}>
          <path
            d={`M${COL_X - 8},${slotY(2) - 10} L${COL_X - 8},${colBase} L${COL_X + 128},${colBase} L${COL_X + 128},${slotY(2) - 10}`}
            fill="none"
            stroke={INK}
            strokeWidth={2.4}
          />
        </Svg>
        <Cell x={COL_X + 4} y={slotY(0)} at={keepsAt + 6} value="(" size={32} w={112} h={SLOT - 8} />
        <Cell x={COL_X + 4} y={slotY(1)} at={topAt} value="[" size={32} w={112} h={SLOT - 8} tone={frame >= matchAt ? "look" : "data"} />
        <Cell x={COL_X + 196} y={slotY(1)} at={matchAt} value=")" size={32} w={64} h={SLOT - 8} tone="bad" />
        <div style={{ position: "absolute", left: COL_X + 145, top: slotY(1) + 20, opacity: ease(frame, matchAt + 8, 8) }}>
          <Cross at={matchAt + 8} size={26} />
        </div>
        <Line at={rejectedAt - 2} x={COL_X - 8} y={colBase + 18} size={24} weight={500} color={OK_INK}>
          rejected
        </Line>

        {/* The queue: the oldest opener at the front. */}
        <Line at={queueAt} x={SX} y={qTop - 46} size={22} weight={500}>
          A queue matches the oldest opener
        </Line>
        {[
          { s: crossed.s, x: SX, at: queueAt + 6, ok: crossed.queue, verdictAt: thisAt },
          { s: nested.s, x: SX + 470, at: nestedAt - 4, ok: nested.queue, verdictAt: nestedAt + 4 },
        ].map((q) => {
          const opens = [...q.s].slice(0, 2);
          const closes = [...q.s].slice(2);
          const match = (o: string, c: string) => ({ "(": ")", "[": "]", "{": "}" })[o] === c;
          return (
            <React.Fragment key={q.s}>
              {opens.map((o, i) => (
                <Cell key={`o${i}`} x={q.x + i * 76} y={qTop} at={q.at + i * 3} value={o} size={28} w={64} h={58} />
              ))}
              {closes.map((c, i) => {
                const ok = match(opens[i], c);
                return (
                  <React.Fragment key={`c${i}`}>
                    <Svg opacity={ease(frame, q.at + 10 + i * 4, 8)}>
                      <line x1={q.x + i * 76 + 32} x2={q.x + i * 76 + 32} y1={qTop + 62} y2={qTop + 82} stroke={ok ? HAIRLINE : `color-mix(in srgb, ${ACCENT} 45%, transparent)`} strokeWidth={1.5} strokeLinecap="round" />
                    </Svg>
                    <Cell x={q.x + i * 76} y={qTop + 86} at={q.at + 10 + i * 4} value={c} size={28} w={64} h={58} tone={ok ? "plain" : "bad"} />
                  </React.Fragment>
                );
              })}
              <div style={{ position: "absolute", left: q.x + 170, top: qTop + 14, fontFamily: MONO, fontSize: 24, fontWeight: 500, color: INK_SOFT, opacity: ease(frame, q.at, 10) }}>{q.s}</div>
              <div style={{ position: "absolute", left: q.x + 170, top: qTop + 96, display: "flex", alignItems: "center", gap: 10, fontSize: 24, opacity: ease(frame, q.verdictAt, 10) }}>
                <Cross at={q.verdictAt} size={22} />
                <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>{q.ok ? "accepts" : "rejects"}</span>
              </div>
            </React.Fragment>
          );
        })}

        {/* The verdicts. */}
        <div style={{ position: "absolute", left: 0, top: tTop, opacity: ease(frame, counterAt, 12) }}>
          {[
            { x: COL1, s: crossed.s, at: counterAt },
            { x: COL2, s: nested.s, at: nestedAt - 4 },
          ].map((c) => (
            <div key={c.s} style={{ position: "absolute", left: c.x - 90, width: 180, textAlign: "center", fontFamily: MONO, fontSize: 28, fontWeight: 500, color: INK, opacity: ease(frame, c.at, 10) }}>
              {c.s}
            </div>
          ))}
        </div>
        <Svg opacity={ease(frame, counterAt, 12)}>
          <line x1={TX} x2={COL2 + 100} y1={tTop + 42} y2={tTop + 42} stroke={INK} strokeWidth={1.4} />
        </Svg>
        {[
          { name: "correct", r: -1 },
          { name: "counter", r: 0 },
          { name: "queue", r: 1 },
          { name: "stack", r: 2 },
        ].map((r, i) => (
          <div
            key={r.name}
            style={{ position: "absolute", left: TX, top: row(i) + 14, ...note(24, i === 0 ? INK_SOFT : INK), fontWeight: i === 0 ? 500 : 500, opacity: ease(frame, counterAt + i * 3, 10) }}
          >
            {r.name}
          </div>
        ))}
        {[
          { col: COL1, should: "reject", at: counterAt + 2 },
          { col: COL2, should: "accept", at: nestedAt - 2 },
        ].map((c) => (
          <div key={c.col} style={{ position: "absolute", left: c.col - 90, width: 180, top: row(0) + 14, textAlign: "center", ...note(24, INK_SOFT), opacity: ease(frame, c.at, 10) }}>
            {c.should}
          </div>
        ))}
        <Verdict at={acceptsAt} accepts={crossed.count} right={!crossed.count} x={COL1} top={row(1) + 12} />
        <Verdict at={thisAt} accepts={crossed.queue} right={!crossed.queue} x={COL1} top={row(2) + 12} />
        <Verdict at={rejectedAt} accepts={crossed.stack} right={!crossed.stack} x={COL1} top={row(3) + 12} />
        <Verdict at={nestedAt + 4} accepts={nested.count} right={nested.count} x={COL2} top={row(1) + 12} />
        <Verdict at={nestedAt + 4} accepts={nested.queue} right={nested.queue} x={COL2} top={row(2) + 12} />
        <Verdict at={nestedAt + 10} accepts={nested.stack} right={nested.stack} x={COL2} top={row(3) + 12} />

        {/* Depth-first search, the same idea. */}
        <Line at={dfsAt} x={SX} y={y(866)} size={26} weight={500}>
          Depth-first search is the same idea:{" "}
          <span style={{ opacity: ease(frame, pathAt, 10) }}>the path you&apos;re on is the stack</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};

