import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { commas, fmtTime, ILLUSTRATIONS, MACHINE, ROWS, VIDEO } from "./data";
import { Fig, MEMO, MEMO_INK, Mono, NAIVE, NAIVE_INK } from "./kit";

const LEFT = 120;
const RIGHT = 1800;
/** Right edges of the columns. */
const COL = {
  n: 196,
  naiveCalls: 610,
  naiveTime: 830,
  naiveDepth: 990,
  memoCalls: 1330,
  memoTime: 1550,
  memoDepth: 1710,
} as const;
/** Where each group's heading and rule start and end. */
const GROUP = { naive: [300, 990], memo: [1110, 1710] } as const;
const GROUP_Y = 158;
const HEAD_Y = 214;
const ROW0 = 252;
const ROW_H = 60;
/** The notes under the table, the footnote, and the closing rule. */
const NOTE_Y = ROW0 + 5 * ROW_H + 12;
const FOOT_Y = NOTE_Y + 46;
const RULE_Y = 676;

/**
 * Naive against memoized for n = 10 to 50: calls, time and stack depth, all
 * measured. The memo's calls grow by two per step; its stack is as deep as
 * the naive one. Then the rule the whole thing comes down to.
 */
export const CompareScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("linear").from;
  const ninetyAt = n.word("linear", "ninety-nine");
  const twoAt = n.word("linear", "two more");
  const microAt = n.word("linear", "microsecond");
  const stillAt = n.word("depth", "still fifty");
  const removesAt = n.word("depth", "removes");
  const ruleAt = n.beat("rule").from;
  const keepAt = n.word("rule", "keep");
  const notebook = pop(frame, keepAt - 8, fps, 16);

  const rowTop = (i: number) => y(ROW0 + i * ROW_H);
  const rowH = h(ROW_H);
  const last = ROWS.length - 1;
  const cell = (i: number, right: number, width = 260): React.CSSProperties => ({
    position: "absolute",
    left: right - width,
    width,
    top: rowTop(i),
    height: rowH,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  });
  const num = (size: number, color: string): React.CSSProperties => ({
    ...note(size, color),
    fontWeight: 600,
  });
  /** A highlighter swipe behind the n = 50 value of a column. */
  const swipe = (at: number) => ({
    position: "absolute" as const,
    left: "-0.15em",
    right: `calc(${1 - ease(frame, at, 12)} * (100% + 0.3em) - 0.15em)`,
    top: "0.05em",
    bottom: "0.05em",
    background: HIGHLIGHT,
    zIndex: -1,
  });

  return (
    <AbsoluteFill>
      <Fig n="6" at={start - 14} x={LEFT} y={y(104)}>
        Naive and memoized <Mono>fib(n)</Mono>, measured
      </Fig>

      {/* Group headings, each with a rule in its series color. */}
      {(
        [
          ["naive", "Naive fib", NAIVE, NAIVE_INK, start - 10],
          ["memo", "With the memo", MEMO, MEMO_INK, ninetyAt - 8],
        ] as const
      ).map(([key, title, color, ink, at]) => (
        <Ink key={key} at={at} dur={14} style={{ left: GROUP[key][0], top: y(GROUP_Y), width: GROUP[key][1] - GROUP[key][0] }}>
          <div style={{ ...label(24, ink), fontWeight: 700, paddingBottom: 8, borderBottom: `2px solid ${color}` }}>{title}</div>
        </Ink>
      ))}
      {(
        [
          ["n", "n", start - 10],
          ["naiveCalls", "calls", start - 8],
          ["naiveTime", "time", start - 8],
          ["naiveDepth", "stack depth", start - 8],
          ["memoCalls", "calls", ninetyAt - 6],
          ["memoTime", "time", microAt - 6],
          ["memoDepth", "stack depth", stillAt - 6],
        ] as const
      ).map(([key, title, at]) => (
        <Ink key={key} at={at} dur={12} style={{ left: COL[key] - 200, width: 200, top: y(HEAD_Y), textAlign: "right" }}>
          <span style={label(21, INK_SOFT)}>{title}</span>
        </Ink>
      ))}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(HEAD_Y) + 34,
          width: (RIGHT - LEFT) * ease(frame, start - 8, 16),
          height: 1,
          background: HAIRLINE,
        }}
      />

      {ROWS.map((r, i) => {
        const isLast = i === last;
        const stagger = (at: number) => at - 4 + i * 2;
        return (
          <React.Fragment key={r.n}>
            <Ink at={start - 8 + i * 2} dur={12} style={cell(i, COL.n, 120)}>
              <span style={num(28, INK_SOFT)}>{r.n}</span>
            </Ink>
            <Ink at={start - 6 + i * 2} dur={12} style={cell(i, COL.naiveCalls, 360)}>
              <span style={{ ...num(28, NAIVE_INK), opacity: 0.85 }}>{commas(r.naiveCalls)}</span>
            </Ink>
            <Ink at={start - 4 + i * 2} dur={12} style={cell(i, COL.naiveTime, 200)}>
              <span style={{ ...num(28, NAIVE_INK), opacity: 0.85 }}>{fmtTime(r.naiveSeconds)}</span>
            </Ink>
            <Ink at={stagger(stillAt)} dur={12} style={cell(i, COL.naiveDepth, 160)}>
              <span style={{ position: "relative", ...num(28, INK) }}>
                {isLast ? <span style={swipe(stillAt + 6)} /> : null}
                {r.naiveDepth}
              </span>
            </Ink>
            <Ink at={stagger(ninetyAt)} dur={12} style={cell(i, COL.memoCalls, 200)}>
              <span style={{ position: "relative", ...num(isLast ? 34 : 28, MEMO_INK) }}>
                {isLast ? <span style={swipe(ninetyAt + 6)} /> : null}
                {commas(r.memoCalls)}
              </span>
            </Ink>
            <Ink at={stagger(microAt)} dur={12} style={cell(i, COL.memoTime, 200)}>
              <span style={{ position: "relative", ...num(isLast ? 34 : 28, MEMO_INK) }}>
                {isLast ? <span style={swipe(microAt + 6)} /> : null}
                {fmtTime(r.memoSeconds)}
              </span>
            </Ink>
            <Ink at={stagger(stillAt + 6)} dur={12} style={cell(i, COL.memoDepth, 160)}>
              <span style={{ position: "relative", ...num(28, INK) }}>
                {isLast ? <span style={swipe(stillAt + 12)} /> : null}
                {r.memoDepth}
              </span>
            </Ink>
          </React.Fragment>
        );
      })}

      {/* What the columns say, one note under each group. */}
      <Note at={twoAt} x={GROUP.memo[0]} y={y(NOTE_Y)} from="up" width={GROUP.memo[1] - GROUP.memo[0]}>
        <span style={note(21, INK_SOFT)}>
          Calls: <span style={{ color: MEMO_INK, fontWeight: 650 }}>2n − 1</span> at every n, two more per step.
        </span>
      </Note>
      <Note at={removesAt} x={GROUP.naive[0]} y={y(NOTE_Y)} from="up" width={GROUP.naive[1] - GROUP.naive[0]}>
        <span style={note(21, INK_SOFT)}>Stack depth: the most calls open at once, the same n in both.</span>
      </Note>
      <Note at={microAt + 10} x={LEFT} y={y(FOOT_Y)} from="up">
        <span style={note(20, INK_SOFT)}>
          Same machine and method as Fig. 3: {MACHINE.compiler}, -O2, best of {MACHINE.rounds} runs. Memo times include
          making the table.
        </span>
      </Note>

      {/* The rule. */}
      <Ink at={ruleAt - 6} dur={20} style={{ left: LEFT, top: y(RULE_Y), width: 1240 }}>
        <div style={{ height: 2, background: INK, width: 140, marginBottom: 24 }} />
        <div style={{ ...label(22, ACCENT_INK), marginBottom: 14 }}>The seed of dynamic programming</div>
        <div style={{ ...headline(52, true), color: INK, lineHeight: 1.14 }}>
          When a recursion asks the same question twice, keep the first answer.
        </div>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="recursion-fib-notebook"
          style={{
            position: "absolute",
            left: 1480,
            top: y(RULE_Y - 16),
            width: 280,
            height: 240,
            opacity: notebook,
            transform: `translateY(${bob(frame, 4, 110) + (1 - notebook) * 26}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
