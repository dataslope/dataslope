import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { arrowHead } from "../../components/arrow";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { HARNESS, MISS_QUEUE, TICKETS } from "./data";
import { A, Check, Cross, Drift, Headline, lerp, MARK, Marked, OK_INK, PANEL, pulse, Svg, TRAP, TRAP_INK, X0 } from "./parts";

const COL = { ticket: X0, expected: 720, cheap: 950, good: 1170 };
const HEAD_Y = 346;
const ROW0 = 394;
const STEP = 47;
const TABLE_X1 = 1360;
const TOTAL_X = 1470;
/** The loop, in the room beside the headline: the lesson's evaluate(), cut
 *  to its four working lines. */
const LOOP_X = 1280;
const LOOP_TOP = 110;
const LOOP_W = 520;
const LOOP_LINE = 34;
const LOOP_SIZE = 22;

/**
 * The harness (Fig. 13): the lesson's ten tickets with the queue each belongs
 * in, and its two stand-in models. The cheap one gets three right, 30%, and
 * the good one all ten; then the failure list: every miss of the cheap one
 * went to "other". Beside the headline is the loop that produced it, the
 * lesson's evaluate() in four lines: a pointer steps down the table as each
 * mark lands, once per model, and the hit count in the loop counts with it.
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

  // The loop runs twice, once per stand-in, a row per mark as it lands.
  const passes = [
    { mark: cheapMark, ok: (t: (typeof TICKETS)[number]) => t.cheap === t.expected, name: "cheap" },
    { mark: goodMark, ok: (t: (typeof TICKETS)[number]) => t.good === t.expected, name: "good" },
  ];
  const passOf = frame >= goodMark(0) - 8 ? 1 : 0;
  const pass = passes[passOf];
  const landed = TICKETS.filter((_, i) => frame >= pass.mark(i) - 4).length;
  const row = Math.max(0, landed - 1);
  const stepT = ease(frame, pass.mark(row) - 4, 5);
  const pointerY = lerp(ry(Math.max(0, row - 1)), ry(row), row === 0 ? 1 : stepT);
  const running = (k: number) =>
    ease(frame, passes[k].mark(0) - 8, 8) * (1 - ease(frame, passes[k].mark(TICKETS.length - 1) + 10, 10));
  const pointerOn = Math.max(running(0), running(1));
  const hits = TICKETS.filter((t, i) => frame >= pass.mark(i) && pass.ok(t)).length;
  const counting = frame >= passes[0].mark(0) - 8;
  // Which line of the loop is working: the body while rows are scored, the
  // last line as each score is read out.
  const bodyLit = pointerOn * (0.55 + 0.45 * pulse(frame, pass.mark(row), 8));
  const lastLit = Math.max(pulse(frame, thirtyAt - 4, 30), pulse(frame, allTenAt - 4, 30));
  const KW = inkOf.purple;

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
      <FigLabel n="13" title="Ten tickets, two stand-in models (keyword rules, not real LLMs)" at={from} x={X0} y={y(282)} />

      {/* ── The loop, from "a loop" ── */}
      <Ink at={loopAt - 4} dur={18} style={{ left: LOOP_X, top: y(LOOP_TOP), width: LOOP_W }}>
        <div
          style={{
            position: "relative",
            background: PANEL,
            borderTop: `2px solid ${INK}`,
            padding: "12px 20px",
            fontFamily: MONO,
            fontSize: LOOP_SIZE,
            lineHeight: `${LOOP_LINE}px`,
            color: INK,
            whiteSpace: "pre",
            fontVariantLigatures: "none",
          }}
        >
          {/* The working line's highlight, under the text. */}
          <div style={{ position: "absolute", left: 8, right: 8, top: 12 + LOOP_LINE, height: LOOP_LINE * 2, background: MARK, opacity: bodyLit * 0.8, borderRadius: 4 }} />
          <div style={{ position: "absolute", left: 8, right: 8, top: 12 + LOOP_LINE * 3, height: LOOP_LINE, background: MARK, opacity: lastLit * 0.8, borderRadius: 4 }} />
          <div style={{ position: "relative" }}>
            <span style={{ color: KW, fontWeight: 600 }}>for</span> text, expected <span style={{ color: KW, fontWeight: 600 }}>in</span> tickets:
          </div>
          <div style={{ position: "relative" }}>
            {"    got = "}
            <span style={{ color: A, fontWeight: 600 }}>{counting ? pass.name : "model"}</span>
            (text)
          </div>
          <div style={{ position: "relative" }}>
            {"    hits += got == expected"}
            <span style={{ color: INK_SOFT, opacity: counting ? 1 : 0 }}>
              {"   # "}
              <span style={TABULAR}>{hits}</span>
            </span>
          </div>
          <div style={{ position: "relative" }}>accuracy = hits / len(tickets)</div>
        </div>
      </Ink>

      <Drift from={from} to={end} amount={0.01} origin="40% 60%">
        {/* The loop's pointer, on the row it is scoring. */}
        <Svg opacity={pointerOn}>
          <path d={arrowHead([[X0 - 30, pointerY], [X0 - 12, pointerY]], 14, 9, { filled: true })} fill={A} />
        </Svg>

        {/* Header. */}
        <Ink at={from + 4} dur={12} style={{ left: COL.ticket, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>ticket</span>
        </Ink>
        <Ink at={queueAt - 4} dur={12} style={{ left: COL.expected, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>right queue</span>
        </Ink>
        <Ink at={modelsAt - 4} dur={12} style={{ left: COL.cheap, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>cheap stand-in</span>
        </Ink>
        <Ink at={modelsAt} dur={12} style={{ left: COL.good, top: y(HEAD_Y) - 16, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>good stand-in</span>
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
          <span style={label(22, INK_SOFT)}>cheap stand-in</span>
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
          <span style={label(22, INK_SOFT)}>good stand-in</span>
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
