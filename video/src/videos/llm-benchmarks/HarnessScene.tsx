import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { HARNESS, MISS_QUEUE, TICKETS } from "./data";
import { Check, Cross, Drift, Headline, lerp, Marked, OK_INK, pulse, Svg, TRAP, TRAP_INK, X0 } from "./parts";

const COL = { ticket: X0, expected: 720, cheap: 950, good: 1170 };
const HEAD_Y = 346;
const ROW0 = 394;
const STEP = 47;
const TABLE_X1 = 1360;
const TOTAL_X = 1470;

/**
 * The harness (Fig. 13): the lesson's ten tickets with the queue each belongs
 * in, and its two stand-in models. The cheap one gets three right, 30%, and
 * the good one all ten; then the failure list: every miss of the cheap one
 * went to "other".
 */
export const HarnessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("harness").from;
  const loopAt = n.word("harness", "loop");
  const ticketsAt = n.word("harness", "ten tickets");
  const queueAt = n.word("harness", "right queue");
  const modelsAt = n.word("harness", "stand-in models");
  const cheapAt = n.word("scores", "cheap one");
  const threeAt = n.word("scores", "three");
  const thirtyAt = n.word("scores", "Thirty percent");
  const otherAt = n.word("scores", "other");
  const allTenAt = n.word("scores", "all ten");
  const missesAt = n.word("misses", "misses");
  const sevenAt = n.word("misses", "all seven");
  const toOtherAt = n.word("misses", "other");
  const queueEndAt = n.word("misses", "that queue");
  const end = n.beat("freetext").from;

  const ry = (i: number) => y(ROW0) + h(i * STEP);
  const rowAt = (i: number) => Math.round(lerp(ticketsAt - 4, modelsAt - 2, i / 9));
  const cheapMark = (i: number) => Math.round(lerp(cheapAt, thirtyAt - 6, i / 9));
  const goodMark = (i: number) => Math.round(lerp(otherAt, allTenAt + 4, i / 9));
  const missTint = ease(frame, missesAt - 2, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, the scores, the misses ── */}
      <Sfx name="el-sprinkle" at={ticketsAt - 2} level={-35} />
      <Sfx name="el-tap" at={thirtyAt - 2} level={-26} />
      <Sfx name="el-tap" at={allTenAt} level={-26} />
      <Sfx name="el-pencil" at={sevenAt - 2} level={-34} />

      <Headline at={from - 6} second={loopAt - 2} italic="a loop.">
        The harness is just
      </Headline>
      <FigLabel n="13" title="Ten tickets, two stand-in models" at={from} x={X0} y={y(282)} />

      <Drift from={from} to={end} amount={0.01} origin="40% 60%">
        {/* Header. */}
        <Ink at={from + 4} dur={12} style={{ left: COL.ticket, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>ticket</span>
        </Ink>
        <Ink at={queueAt - 4} dur={12} style={{ left: COL.expected, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>right queue</span>
        </Ink>
        <Ink at={modelsAt - 4} dur={12} style={{ left: COL.cheap, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>cheap model</span>
        </Ink>
        <Ink at={modelsAt} dur={12} style={{ left: COL.good, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>good model</span>
        </Ink>
        <Svg opacity={ease(frame, from + 6, 12)}>
          <line x1={X0} x2={TABLE_X1} y1={y(HEAD_Y) + 16} y2={y(HEAD_Y) + 16} stroke={INK} strokeWidth={2} />
        </Svg>

        {TICKETS.map((t, i) => {
          const cheapOk = t.cheap === t.expected;
          const goodOk = t.good === t.expected;
          const at = rowAt(i);
          const rowY = ry(i);
          return (
            <React.Fragment key={t.text}>
              {/* A miss of the cheap model, tinted once the misses are read. */}
              <Svg opacity={cheapOk ? 0 : missTint * (0.1 + pulse(frame, queueEndAt + i * 2, 18) * 0.1)}>
                <rect x={X0 - 10} y={rowY - h(STEP) / 2} width={TABLE_X1 - X0 + 20} height={h(STEP) - 2} fill={TRAP} />
              </Svg>
              <Ink at={at} dur={10} style={{ left: COL.ticket, top: rowY - 14, whiteSpace: "nowrap" }}>
                <span style={note(22, INK)}>{t.text}</span>
              </Ink>
              <Ink at={Math.max(at, queueAt - 4 + i)} dur={10} style={{ left: COL.expected, top: rowY - 13, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>{t.expected}</span>
              </Ink>
              <Ink at={cheapMark(i) - 4} dur={10} style={{ left: COL.cheap, top: rowY - 13, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: MONO, fontSize: 21, color: cheapOk ? INK : TRAP_INK, fontWeight: cheapOk ? 400 : 600 }}>
                  {cheapOk ? t.cheap : <Marked at={toOtherAt - 2 + i}>{t.cheap}</Marked>}
                </span>
              </Ink>
              <Ink at={goodMark(i) - 4} dur={10} style={{ left: COL.good, top: rowY - 13, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>{t.good}</span>
              </Ink>
              <Svg>
                {cheapOk ? <Check x={COL.cheap + 170} y={rowY} at={cheapMark(i)} size={20} /> : <Cross x={COL.cheap + 170} y={rowY} at={cheapMark(i)} size={16} />}
                {goodOk ? <Check x={COL.good + 170} y={rowY} at={goodMark(i)} size={20} /> : <Cross x={COL.good + 170} y={rowY} at={goodMark(i)} size={16} />}
                <line x1={X0} x2={TABLE_X1} y1={rowY + h(STEP) / 2 - 1} y2={rowY + h(STEP) / 2 - 1} stroke={HAIRLINE} strokeWidth={0.8} opacity={ease(frame, at + 4, 10) * 0.6} />
              </Svg>
            </React.Fragment>
          );
        })}

        {/* The two scores. */}
        <Ink at={threeAt - 2} dur={12} style={{ left: TOTAL_X, top: y(400), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>cheap model</span>
        </Ink>
        <Ink at={thirtyAt - 2} dur={14} style={{ left: TOTAL_X, top: y(400) + 34, whiteSpace: "nowrap" }}>
          <span style={{ ...body(64), color: TRAP_INK, ...TABULAR }}>{HARNESS.cheap}%</span>
        </Ink>
        <Ink at={threeAt} dur={12} style={{ left: TOTAL_X, top: y(400) + 118, whiteSpace: "nowrap" }}>
          <span style={note(22, INK_SOFT)}>
            <span style={TABULAR}>{HARNESS.cheapRight}</span> of <span style={TABULAR}>{TICKETS.length}</span> right
          </span>
        </Ink>
        <Ink at={otherAt - 2} dur={12} style={{ left: TOTAL_X, top: y(620), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>good model</span>
        </Ink>
        <Ink at={allTenAt - 2} dur={14} style={{ left: TOTAL_X, top: y(620) + 34, whiteSpace: "nowrap" }}>
          <span style={{ ...body(64), color: OK_INK, ...TABULAR }}>{HARNESS.good}%</span>
        </Ink>
        {/* The failure list, read: every miss went to one queue. */}
        <Ink at={sevenAt - 2} dur={14} style={{ left: TOTAL_X, top: y(800), whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), fontWeight: 600 }}>
            all <span style={TABULAR}>{HARNESS.cheapMisses.length}</span> misses sent to{" "}
            <span style={{ fontFamily: MONO, color: TRAP_INK }}>{MISS_QUEUE}</span>
          </span>
        </Ink>
        <Ink at={queueEndAt - 2} dur={14} style={{ left: TOTAL_X, top: y(800) + 36, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontStyle: "italic" }}>who reads that queue?</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
