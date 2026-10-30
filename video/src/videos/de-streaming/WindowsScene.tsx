import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { STREAM, USERS, WINDOWS } from "./data";
import { Drift, OK_INK, pulse, QUIET, USER_COLOR, USER_INK, userFill, X0 } from "./parts";

const AX0 = 440;
const AX1 = 1520;
const SPAN = 30;
/** Rows, in the layout's coordinates. */
const AXIS_Y = 330;
const TUMBLE_Y = 420;
const SLIDE_Y = 540;
const SESSION_Y = 710;
const BOX_H = 48;
/** The click both of whose sliding windows are shown: ava's from second 6. */
const PICK_T = 6;

/**
 * Question 11, on the video's own twelve clicks by event time. Tumbling
 * windows of ten seconds: every click in exactly one, 5, 4 and 3. Sliding
 * windows ten seconds long every five: every click in two (ava's click from
 * second 6 is in the windows from 0 and from 5). Sessions with a five-second
 * gap, one lane per user: ava's five clicks make two.
 */
export const WindowsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("windows").from;
  const qAt = n.word("windows", "Question eleven");
  const textAt = n.word("windows", "What is windowing");
  const figAt = n.word("windows", "the main window types");
  const endlessAt = n.word("win-def", "an endless stream");
  const bucketsAt = n.word("win-def", "finite buckets");
  const aggAt = n.word("win-def", "you can aggregate");
  const tumbleAt = n.word("win-tumble", "Tumbling windows");
  const overlapAt = n.word("win-tumble", "never overlap");
  const tenAt = n.word("win-tumble", "Ten seconds each");
  const oneAt = n.word("win-tumble", "exactly one");
  const countWords = [n.word("win-tumble", "five,"), n.word("win-tumble", "four,"), n.word("win-tumble", "three.")];
  const slideAt = n.word("win-slide", "Sliding windows");
  const hopAt = n.word("win-slide", "also called hopping");
  const longAt = n.word("win-slide", "Ten seconds long");
  const everyAt = n.word("win-slide", "starting every five");
  const twoAt = n.word("win-slide", "counts in two");
  const sessionAt = n.word("win-session", "Session windows");
  const gapAt = n.word("win-session", "a gap of inactivity");
  const fiveGapAt = n.word("win-session", "With a five-second gap");
  const avaAt = n.word("win-session", "ava's five clicks");
  const twoSessAt = n.word("win-session", "two sessions");
  const sessionizeAt = n.word("win-session", "sessionize users");
  const end = n.beat("win-session").to;

  const ex = (t: number) => AX0 + (t / SPAN) * (AX1 - AX0);
  const unit = ex(1) - ex(0);
  const axisY = y(AXIS_Y);

  const sliding = WINDOWS.sliding;
  const pick = STREAM.find((c) => c.t === PICK_T)!;
  const pickHot = ease(frame, twoAt, 10);
  const inPick = (s: number) => s <= PICK_T && PICK_T < s + WINDOWS.size;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={figAt + 8} level={-34} />
      <Sfx name="el-pencil" at={tenAt} level={-37} />
      {countWords.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-36} />
      ))}
      <Sfx name="el-pencil" at={everyAt} level={-37} />
      <Sfx name="el-pop" at={twoAt} level={-36} />
      <Sfx name="el-pencil" at={fiveGapAt} level={-37} />
      <Sfx name="el-pop" at={twoSessAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is windowing, and what are the main window types?
        </QuestionCard>

        {/* The clicks on an event-time axis, and the stream running on past it. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={ex(0) - 10} x2={ex(0) - 10 + (ex(SPAN) - ex(0) + 20) * ease(frame, figAt, 16)} y1={axisY} y2={axisY} stroke={INK} strokeWidth={2} />
          {[0, 5, 10, 15, 20, 25, 30].map((t) => (
            <text key={t} x={ex(t)} y={axisY + 32} textAnchor="middle" style={svgText({ fontFamily: SANS, fontSize: 20, fontWeight: 600, color: INK_SOFT, fontVariantNumeric: "tabular-nums" })} opacity={ease(frame, figAt + 6, 10)}>
              {t} s
            </text>
          ))}
          {[32, 34.5, 36.5].map((t, i) => (
            <circle key={t} cx={ex(t)} cy={axisY} r={8} fill={QUIET} opacity={ease(frame, endlessAt + i * 4, 8) * (0.7 - i * 0.2)} />
          ))}
          {STREAM.map((c) => (
            <circle
              key={c.i}
              cx={ex(c.t)}
              cy={axisY}
              r={10 * ease(frame, figAt + 4 + c.i * 1.5, 8) * (1 + 0.4 * (c.i === pick.i ? pulse(frame, twoAt, 20) : 0))}
              fill={USER_COLOR[c.user]}
              stroke={c.i === pick.i && pickHot > 0 ? INK : PAPER}
              strokeWidth={c.i === pick.i && pickHot > 0 ? 3 : 2}
            />
          ))}
        </svg>
        <Note at={figAt + 6} x={X0} y={axisY - h(16)}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>event time</span>
        </Note>
        <Note at={endlessAt + 6} x={ex(37.5)} y={axisY - h(16)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>… and on</span>
        </Note>
        <Note at={bucketsAt} x={ex(0)} y={axisY - h(64)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            finite buckets<span style={{ opacity: ease(frame, aggAt, 10) }}> to count, sum or average</span>
          </span>
        </Note>

        {/* Tumbling. */}
        <Note at={tumbleAt} x={X0} y={y(TUMBLE_Y) + h(8)}>
          <div style={{ ...note(25, INK), fontWeight: 750, whiteSpace: "nowrap" }}>tumbling</div>
          <div style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, overlapAt, 10) }}>fixed, no overlap</div>
        </Note>
        {[0, 1, 2].map((w) => {
          const p = ease(frame, tenAt + w * 4, 12);
          const c = ease(frame, countWords[w] - 2, 8);
          return (
            <div
              key={w}
              style={{
                position: "absolute",
                left: ex(w * 10) + 3,
                top: y(TUMBLE_Y),
                width: (ex(10) - ex(0) - 6) * p,
                height: h(BOX_H),
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2.5px solid ${BAR}`,
                background: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...note(25, BLUE_INK),
                fontWeight: 750,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ opacity: c }}>
                <span style={TABULAR}>{WINDOWS.tumblingEvent[w]}</span> clicks
              </span>
            </div>
          );
        })}
        <Note at={oneAt} x={AX1 + 30} y={y(TUMBLE_Y) + h(10)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>each click in one</span>
        </Note>

        {/* Sliding: ten seconds long, a new one every five. */}
        <Note at={slideAt} x={X0} y={y(SLIDE_Y) + h(8)}>
          <div style={{ ...note(25, INK), fontWeight: 750, whiteSpace: "nowrap" }}>sliding</div>
          <div style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, hopAt, 10) }}>or hopping</div>
        </Note>
        {sliding.map((w, k) => {
          const row = k % 2;
          const p = ease(frame, (k === 1 ? longAt : everyAt) + k * 3, 12);
          const hot = inPick(w.start) ? pickHot : 0;
          const x0 = Math.max(ex(w.start), ex(0) - 3 * unit);
          const x1 = Math.min(ex(w.start + WINDOWS.size), ex(SPAN) + 3 * unit);
          return (
            <div
              key={w.start}
              style={{
                position: "absolute",
                left: x0 + 3,
                top: y(SLIDE_Y) + row * h(BOX_H + 12),
                width: (x1 - x0 - 6) * p,
                height: h(BOX_H),
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2.5px ${w.start < 0 || w.start + WINDOWS.size > SPAN ? "dashed" : "solid"} ${BAR}`,
                background: hot > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${hot * 100}%, ${PAPER})` : `color-mix(in srgb, ${BAR} 10%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...note(23, BLUE_INK),
                fontWeight: 750,
                overflow: "hidden",
                whiteSpace: "nowrap",
                opacity: Math.min(1, p * 2),
              }}
            >
              <span style={{ opacity: ease(frame, everyAt + 10 + k * 3, 8), ...TABULAR }}>{w.count}</span>
            </div>
          );
        })}
        <Note at={twoAt} x={AX1 + 30} y={y(SLIDE_Y) + h(20)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            each click in two:
            <br />
            ava's at <span style={TABULAR}>{PICK_T}</span> s, in both
            <br />
            highlighted windows
          </span>
        </Note>

        {/* Sessions: a lane per user, closed by a gap of five seconds. */}
        <Note at={sessionAt} x={X0} y={y(SESSION_Y) - h(46)}>
          <span style={{ ...note(25, INK), fontWeight: 750, whiteSpace: "nowrap" }}>session</span>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, gapAt, 10) }}>
            {" "}
            · no fixed size; closed by a gap of inactivity
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {USERS.map((u, r) => {
            const ly = y(SESSION_Y) + h(20) + r * h(48);
            const laneP = ease(frame, sessionAt + r * 3, 12);
            return (
              <g key={u} opacity={laneP}>
                <line x1={ex(0)} x2={ex(SPAN)} y1={ly} y2={ly} stroke={HAIRLINE} strokeWidth={1} strokeDasharray="2 6" />
                {WINDOWS.sessions[u].map((s, k) => {
                  const p = ease(frame, fiveGapAt + r * 4 + k * 3, 12);
                  const hot = u === "ava" ? ease(frame, avaAt, 10) : 0;
                  return (
                    <g key={k} opacity={p}>
                      <rect
                        x={ex(s.first) - 14}
                        y={ly - h(17)}
                        width={(ex(s.last) - ex(s.first) + 28) * p}
                        height={h(34)}
                        rx={h(17)}
                        fill={userFill(u, 22)}
                        stroke={hot > 0.5 ? INK : USER_COLOR[u]}
                        strokeWidth={hot > 0.5 ? 3 : 2}
                      />
                      <line x1={ex(s.last) + 14} x2={ex(Math.min(s.end, SPAN + 2))} y1={ly} y2={ly} stroke={USER_COLOR[u]} strokeWidth={2.5} strokeDasharray="5 5" opacity={p} />
                    </g>
                  );
                })}
                {STREAM.filter((c) => c.user === u).map((c) => (
                  <circle key={c.i} cx={ex(c.t)} cy={ly} r={8} fill={USER_COLOR[u]} stroke={PAPER} strokeWidth={2} />
                ))}
              </g>
            );
          })}
        </svg>
        {USERS.map((u, r) => (
          <Note key={u} at={sessionAt + r * 3} x={X0 + 170} y={y(SESSION_Y) + h(20) + r * h(48) - h(15)}>
            <span style={{ ...label(21, USER_INK[u]), fontWeight: 700, whiteSpace: "nowrap" }}>{u}</span>
          </Note>
        ))}
        <Note at={fiveGapAt + 6} x={AX1 + 30} y={y(SESSION_Y) + h(6)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            - - - five quiet seconds
            <br />
            close a session
          </span>
        </Note>
        <Note at={twoSessAt} x={AX1 + 30} y={y(SESSION_Y) + h(100)}>
          <span style={{ ...note(25, INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            ava: <span style={TABULAR}>5</span> clicks,{" "}
            <span style={{ background: HIGHLIGHT, borderRadius: 4, padding: "0 4px" }}>
              <span style={TABULAR}>{WINDOWS.sessions.ava.length}</span> sessions
            </span>
          </span>
        </Note>
        <Note at={sessionizeAt} x={AX1 + 30} y={y(SESSION_Y) + h(150)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>how to sessionize users</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
