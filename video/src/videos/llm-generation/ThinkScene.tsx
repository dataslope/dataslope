import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HIGHLIGHT, INK, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ANSWER, ANSWER_TOKENS, THINKING_LINES, THINKING_TOKENS } from "./data";
import { GOOD, GOOD_INK, Headline, Kicker, Spot, Svg, THINK, THINK_INK, tint, X0 } from "./kit";


const BOX_W = 1080;
const BOX_Y = 300;
const SIZE = 24;
const LINE_H = 52;
const RIGHT_X = 1260;

type Mark = { sub: string; at: number; out?: number; color: string };

/** One line of the transcript, with the spans the narration points at marked.
 *  Every span is looked up in the line, so a changed transcript throws. */
const Line: React.FC<{ text: string; marks: readonly Mark[] }> = ({ text, marks }) => {
  const frame = useCurrentFrame();
  const found = marks
    .map((m) => {
      const i = text.indexOf(m.sub);
      if (i < 0) throw new Error(`"${m.sub}" is not in "${text}"`);
      return { ...m, i };
    })
    .sort((a, b) => a.i - b.i);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  found.forEach((m, k) => {
    if (m.i > pos) parts.push(<span key={`t${k}`}>{text.slice(pos, m.i)}</span>);
    const p = ease(frame, m.at, 12);
    const o = m.out === undefined ? 0 : ease(frame, m.out, 10);
    parts.push(
      <span key={`m${k}`} style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: "-0.1em",
            top: "-0.05em",
            bottom: "-0.1em",
            width: `calc(${p} * (100% + 0.2em))`,
            background: m.color,
            opacity: p > 0 ? 1 - o : 0,
          }}
        />
        <span style={{ position: "relative" }}>{m.sub}</span>
      </span>,
    );
    pos = m.i + m.sub.length;
  });
  if (pos < text.length) parts.push(<span key="end">{text.slice(pos)}</span>);
  return <>{parts}</>;
};

/** A tick in a small round badge. */
const Tick: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, at, fps, 14);
  if (s <= 0.001) return null;
  return (
    <Svg opacity={Math.min(1, s)}>
      <g transform={`translate(${x}, ${y}) scale(${0.6 + 0.4 * Math.min(1.1, s)})`}>
        <circle r={15} fill={GOOD} />
        <path d="M-6,1 L-2,5 L7,-5" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Svg>
  );
};

/**
 * Think, same, rl, slip: a reasoning model's working before its answer, the
 * lesson's own transcript, counted in o200k_base tokens (measure.py); what
 * changed (training against answers that can be checked); and the slip it
 * catches in that transcript.
 */
export const ThinkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("think").from;
  const writesAt = n.word("think", "writes out");
  const beforeAt = n.word("think", "before it answers");
  const attemptsAt = n.word("think", "attempts");
  const checksAt = n.word("think", "checks");
  const correctionsAt = n.word("think", "corrections");
  const thinkingAt = n.word("think", "thinking tokens");
  const sameAt = n.word("same", "same next-token machine");
  const nothingAt = n.word("same", "nothing new");
  const trainingAt = n.word("same", "training");
  const rewardedAt = n.word("rl", "rewarded");
  const mathAt = n.word("rl", "math");
  const codeAt = n.word("rl", "code");
  const habitsAt = n.word("rl", "habits");
  const triesAt = n.word("slip", "simple interest");
  const slipAt = n.word("slip", "catches the slip");
  const compoundAt = n.word("slip", "compound growth");
  const slipFrom = n.beat("slip").from;

  const MARK = `color-mix(in srgb, ${HIGHLIGHT} 80%, transparent)`;
  const BAD = tint(ACCENT, 30);
  const OK = tint(GOOD, 30);
  const marks: Mark[][] = [
    [],
    [
      { sub: "First attempt:", at: attemptsAt - 2, out: slipFrom - 6, color: MARK },
      { sub: "1000 * 3 * 0.08 = 240.", at: triesAt - 2, color: BAD },
      { sub: "That is simple interest,", at: slipAt - 2, color: BAD },
    ],
    [
      { sub: "not compound.", at: slipAt + 4, color: BAD },
      { sub: "Let me redo it.", at: correctionsAt - 2, out: slipFrom - 6, color: MARK },
    ],
    [{ sub: THINKING_LINES[3], at: compoundAt - 2, color: OK }],
    [{ sub: "Check:", at: checksAt - 2, out: slipFrom - 6, color: MARK }],
  ];

  const top = y(BOX_Y);
  const linesTop = top + 56;
  const answerTop = linesTop + THINKING_LINES.length * LINE_H + 40;
  const boxH = answerTop + 64 - top;
  const lineAt = (k: number) => writesAt + k * 7;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={start - 2} level={-31} />
      {THINKING_LINES.map((_, k) => (
        <Sfx key={k} name="el-pencil" at={lineAt(k)} level={-38} />
      ))}
      <Sfx name="el-tap" at={thinkingAt} level={-29} />
      <Sfx name="el-tap" at={mathAt - 2} level={-31} />
      <Sfx name="el-tap" at={codeAt - 2} level={-31} />
      <Sfx name="el-scratch" at={slipAt} level={-34} />
      <Sfx name="el-chime" at={compoundAt + 30} level={-33} />

      <Kicker at={start - 6}>Reasoning models</Kicker>
      <Headline lead="It writes its working" turn="before it answers." at={start - 4} turnAt={beforeAt - 2} />
      <Spot id="llm-generation-hourglass" at={start - 2} left={1610} top={y(66)} width={210} height={h(240)} />

      <FigLabel n="18" title="A reasoning model's output (the lesson's transcript)" at={writesAt - 8} x={X0} y={y(240)} />
      <Ink at={writesAt - 4} dur={16} style={{ left: X0, top, width: BOX_W, height: boxH }}>
        <div style={{ width: "100%", height: "100%", background: ds("gray", 50), borderTop: `2px solid ${INK}` }} />
      </Ink>
      <Ink at={writesAt - 2} dur={12} style={{ left: X0 + 24, top: top + 14, display: "flex", gap: 18, alignItems: "baseline", whiteSpace: "nowrap" }}>
        <span style={label(21, THINK_INK)}>Thinking</span>
        <span style={{ ...note(21, THINK_INK), fontWeight: 650, opacity: ease(frame, thinkingAt - 2, 10), ...TABULAR }}>
          {THINKING_TOKENS} tokens
        </span>
      </Ink>
      {THINKING_LINES.map((line, k) => (
        <Ink key={k} at={lineAt(k)} dur={14} style={{ left: X0 + 24, top: linesTop + k * LINE_H, whiteSpace: "pre" }}>
          <span style={{ fontFamily: MONO, fontSize: SIZE, color: INK, fontVariantLigatures: "none" }}>
            <Line text={line} marks={marks[k]} />
          </span>
        </Ink>
      ))}
      <Svg opacity={ease(frame, beforeAt - 4, 10)}>
        <line x1={X0 + 24} x2={X0 + BOX_W - 24} y1={answerTop - 20} y2={answerTop - 20} stroke={THINK} strokeWidth={1.4} strokeDasharray="4 4" />
      </Svg>
      <Ink at={beforeAt - 2} dur={14} style={{ left: X0 + 24, top: answerTop, display: "flex", gap: 18, alignItems: "baseline", whiteSpace: "nowrap" }}>
        <span style={label(21, INK)}>Answer</span>
        <span style={{ fontFamily: MONO, fontSize: SIZE + 2, color: INK, fontWeight: 600 }}>{ANSWER}</span>
        <span style={{ ...note(21, INK), fontWeight: 650, opacity: ease(frame, thinkingAt + 6, 10), ...TABULAR }}>
          {ANSWER_TOKENS} tokens
        </span>
      </Ink>

      {/* What it is, and what changed. */}
      <Ink at={sameAt - 2} dur={14} style={{ left: RIGHT_X, top: y(360), width: 560 }}>
        <div style={{ ...body(34), color: INK }}>Same next-token machine.</div>
      </Ink>
      <Ink at={nothingAt - 2} dur={14} style={{ left: RIGHT_X, top: y(408), width: 560 }}>
        <div style={{ ...body(30, true) }}>Nothing new inside.</div>
      </Ink>
      <Ink at={trainingAt - 6} dur={14} style={{ left: RIGHT_X, top: y(476), width: 560 }}>
        <div style={{ ...body(34), color: INK }}>
          What changed: <span style={{ color: ACCENT_INK, fontStyle: "italic" }}>training.</span>
        </div>
      </Ink>
      <Ink at={rewardedAt - 2} dur={14} style={{ left: RIGHT_X, top: y(552), width: 600 }}>
        <div style={{ ...body(28), color: INK, whiteSpace: "nowrap" }}>Rewarded for answers that can be checked:</div>
      </Ink>
      {[
        { at: mathAt, text: "math with a known result", yy: 600 },
        { at: codeAt, text: "code that passes its tests", yy: 648 },
      ].map((r) => (
        <React.Fragment key={r.text}>
          <Tick at={r.at - 2} x={RIGHT_X + 16} y={y(r.yy) + 20} />
          <Ink at={r.at - 2} dur={12} style={{ left: RIGHT_X + 44, top: y(r.yy), width: 520 }}>
            <div style={{ ...body(30), color: INK }}>{r.text}</div>
          </Ink>
        </React.Fragment>
      ))}
      <Note at={habitsAt - 2} x={RIGHT_X} y={y(722)} width={560}>
        <div style={{ ...body(30, true), color: GOOD_INK }}>So checking its own work gets reinforced.</div>
      </Note>
    </AbsoluteFill>
  );
};
