import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { STREAM, WATERMARK, WINDOWS } from "./data";
import { Box, Drift, LANE_FILL, OK, OK_INK, pulse, USER_COLOR, X0 } from "./parts";

const AX0 = 360;
const AX1 = 1700;
const SPAN = 30;
/** The two axes, in the layout's coordinates. */
const EV_Y = 380;
const PR_Y = 560;
const BAND = 80;

type Trace = (typeof WATERMARK)["three"]["trace"];
/** The watermark once the engine has seen everything that arrived by `pt`. */
const wmAt = (trace: Trace, pt: number) => {
  let wm: number | null = null;
  for (const s of trace) if (s.arrive <= pt) wm = s.after;
  return wm;
};

/**
 * Questions 8, 9 and 10, on the video's own twelve clicks. Each is a dot on
 * an event-time axis (when it happened) and a processing-time axis (when it
 * arrived), joined by a line. Counted in ten-second windows by arrival, dee's
 * click from second 8 lands in the second window (4, 5, 3); by event time the
 * counts are 5, 4, 3. Then the watermark, the latest event time seen minus a
 * delay, sweeping along as the clicks arrive: with three seconds the first
 * window closes at 13.5 s with four clicks and dee's click arrives behind a
 * watermark at 12; with ten, it counts and the window closes 7.8 s later.
 * Then late data: an allowed lateness updates four to five, a side output
 * takes anything later, the sink upserts, and an engine can fire early,
 * on-time and late results.
 */
export const TimeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("time").from;
  const qAt = n.word("time", "Question eight");
  const textAt = n.word("time", "What is event time");
  const eventAt = n.word("time-def", "Event time is when it happened");
  const stampedAt = n.word("time-def", "stamped in the event");
  const procAt = n.word("time-def", "Processing time is when");
  const causes = [
    { text: "network delay", at: n.word("time-def", "Network delay") },
    { text: "retries", at: n.word("time-def", "retries") },
    { text: "a phone that was offline", at: n.word("time-def", "a phone that was offline") },
    { text: "batched uploads", at: n.word("time-def", "batched uploads") },
  ];
  const apartAt = n.word("time-def", "pulls the two apart");
  const clicksAt = n.word("time-count", "Here are the twelve clicks");
  const byArrivalAt = n.word("time-count", "by arrival");
  const deeAt = n.word("time-count", "dee's click from second eight");
  const wrongAt = n.word("time-count", "lands in the wrong window");
  const fourFiveAt = n.word("time-count", "four, then five");
  const byEventAt = n.word("time-count", "By event time");
  const correctAt = n.word("time-count", "Correct counts use event time");
  const q9At = n.word("wm", "Question nine");
  const q9TextAt = n.word("wm", "What is a watermark");
  const estAt = n.word("wm-def", "the engine's estimate");
  const closeAt = n.word("wm-def", "close a window and emit it");
  const ruleAt = n.word("wm-def", "the latest event time seen");
  const delayAt = n.word("wm-def", "minus an allowed delay");
  const proofAt = n.word("wm-def", "progress, not proof");
  const allowAt = n.word("wm-three", "Allow three seconds");
  const closesAt = n.word("wm-three", "closes at thirteen and a half seconds");
  const withFourAt = n.word("wm-three", "with four clicks");
  const arrivesAt = n.word("wm-three", "Then dee's click arrives");
  const lateAt = n.word("wm-three", "it's late");
  const tenAt = n.word("wm-ten", "Allow ten");
  const countsAt = n.word("wm-ten", "it counts");
  const laterAt = n.word("wm-ten", "almost eight seconds later");
  const buysAt = n.word("wm-ten", "buys completeness with latency");
  const stateAt = n.word("wm-ten", "holds more state");
  const q10At = n.word("late", "Question ten");
  const q10TextAt = n.word("late", "How do you handle");
  const keepAt = n.word("late-fix", "Keep a window's state");
  const updateAt = n.word("late-fix", "update its result");
  const fiveAt = n.word("late-fix", "four becomes five");
  const sideAt = n.word("late-fix", "a side output");
  const silenceAt = n.word("late-fix", "not into silence");
  const upsertAt = n.word("late-fix", "have the sink upsert");
  const replacesAt = n.word("late-fix", "replaces the row");
  const firings = [
    { text: "early", at: n.word("late-trig", "early"), pt: 5 },
    { text: "on time", at: n.word("late-trig", "on-time"), pt: WATERMARK.three.closeFirst },
    { text: "late", at: n.word("late-trig", "late results"), pt: WATERMARK.deeAt },
  ];
  const mixAt = n.word("late-trig", "decides the mix");
  const end = n.beat("late-trig").to;

  const ex = (t: number) => AX0 + (t / SPAN) * (AX1 - AX0);
  const evY = y(EV_Y);
  const prY = y(PR_Y);
  const q8Out = q9At - 4;
  const q9Out = q10At - 4;

  // The sweep: processing time runs on as the watermark is explained.
  const t3 = WATERMARK.three;
  const t10 = WATERMARK.ten;
  const pt = interpolate(
    frame,
    [allowAt + 4, closesAt + 6, arrivesAt + 6, tenAt + 10, laterAt + 4],
    [0, t3.closeFirst, WATERMARK.deeAt, WATERMARK.deeAt, t10.closeFirst],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sweepIn = ease(frame, allowAt, 10) * (1 - ease(frame, q9Out, 10));
  const wm3 = wmAt(t3.trace, pt);
  const wm10 = wmAt(t10.trace, pt);
  const ten = ease(frame, tenAt + 4, 10) * (1 - ease(frame, q9Out, 10));
  const dee = STREAM[WATERMARK.dee];
  const deeLate = ease(frame, lateAt - 2, 8);
  const deeOk = ease(frame, countsAt, 8);

  const windows = [0, 1, 2];
  const evCounts = WINDOWS.tumblingEvent;
  const prCounts = WINDOWS.tumblingProcessing;
  const evCountIn = ease(frame, byEventAt, 10);
  const prCountIn = ease(frame, byArrivalAt + 4, 10);
  const deeHot = ease(frame, deeAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={eventAt} level={-37} />
      <Sfx name="el-pencil" at={procAt} level={-37} />
      <Sfx name="el-sprinkle" at={clicksAt + 4} level={-33} />
      <Sfx name="el-tap" at={byArrivalAt + 4} level={-36} />
      <Sfx name="el-scratch" at={wrongAt + 2} level={-36} />
      <Sfx name="el-tap" at={byEventAt} level={-36} />
      <Sfx name="el-whoosh" at={allowAt + 4} level={-37} />
      <Sfx name="el-pop" at={closesAt + 6} level={-35} />
      <Sfx name="el-scratch" at={lateAt} level={-34} />
      <Sfx name="el-pop" at={laterAt + 4} level={-35} />
      <Sfx name="el-tap" at={fiveAt} level={-35} />
      <Sfx name="el-pop" at={sideAt + 2} level={-36} />
      {firings.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-37} />
      ))}

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} out={q8Out} size={60}>
          What is event time versus processing time?
        </QuestionCard>
        <QuestionCard n={9} at={q9At} textAt={q9TextAt - 2} out={q9Out} size={60}>
          What is a watermark?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={60}>
          How do you handle late-arriving data?
        </QuestionCard>

        {/* The two axes, each with its windows. */}
        {[
          { y: evY, at: eventAt, name: "event time", sub: "when it happened", subAt: stampedAt, below: false },
          { y: prY, at: procAt, name: "processing time", sub: "when it arrived", subAt: procAt + 8, below: true },
        ].map((a) => {
          const p = ease(frame, a.at, 16);
          const bandTop = a.below ? a.y : a.y - h(BAND);
          return (
            <React.Fragment key={a.name}>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                {windows.map((w) => (
                  <rect
                    key={w}
                    x={ex(w * 10)}
                    y={bandTop}
                    width={ex(10) - ex(0)}
                    height={h(BAND)}
                    fill={w % 2 ? PAPER : LANE_FILL}
                    opacity={ease(frame, (a.below ? byArrivalAt : clicksAt) + w * 3, 10)}
                  />
                ))}
                {[0, 10, 20, 30].map((t) => (
                  <g key={t} opacity={ease(frame, a.at + 8, 10)}>
                    <line x1={ex(t)} x2={ex(t)} y1={bandTop} y2={bandTop + h(BAND)} stroke={HAIRLINE} strokeWidth={1} strokeDasharray="3 5" />
                    <text
                      x={ex(t)}
                      y={a.below ? a.y + 28 : a.y - 12}
                      textAnchor="middle"
                      style={svgText({ fontFamily: SANS, fontSize: 20, fontWeight: 600, color: INK_SOFT, fontVariantNumeric: "tabular-nums" })}
                    >
                      {t} s
                    </text>
                  </g>
                ))}
                <line x1={AX0 - 10} x2={AX0 - 10 + (AX1 - AX0 + 20) * p} y1={a.y} y2={a.y} stroke={INK} strokeWidth={2} />
              </svg>
              <Note at={a.at} x={X0} y={a.y - h(30)}>
                <div style={{ ...note(25, INK), fontWeight: 750, whiteSpace: "nowrap" }}>{a.name}</div>
                <div style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, a.subAt, 10) }}>{a.sub}</div>
              </Note>
            </React.Fragment>
          );
        })}

        {/* The window counts: by arrival, then by event time. */}
        {windows.map((w) => {
          const bad = w < 2 ? ease(frame, fourFiveAt + w * 4, 8) : 0;
          return (
            <React.Fragment key={w}>
              <div
                style={{
                  position: "absolute",
                  left: ex(w * 10),
                  width: ex(10) - ex(0),
                  top: prY + h(BAND) - h(46),
                  textAlign: "center",
                  ...note(25, bad > 0.5 ? ACCENT_INK : INK),
                  fontWeight: 700,
                  opacity: prCountIn,
                }}
              >
                <span style={TABULAR}>{prCounts[w]}</span> clicks
              </div>
              <div
                style={{
                  position: "absolute",
                  left: ex(w * 10),
                  width: ex(10) - ex(0),
                  top: evY - h(BAND) + h(8),
                  textAlign: "center",
                  ...note(25, ease(frame, correctAt, 10) > 0.5 && w < 2 ? OK_INK : INK),
                  fontWeight: 700,
                  opacity: evCountIn,
                }}
              >
                <span style={TABULAR}>{evCounts[w]}</span> clicks
              </div>
            </React.Fragment>
          );
        })}
        <Note at={correctAt} x={AX1 + 14} y={evY - h(BAND) + h(8)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>✓ correct</span>
        </Note>

        {/* The clicks: a dot on each axis, joined. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {STREAM.map((c) => {
            const p = ease(frame, clicksAt + 2 + c.order * 2, 10);
            if (p <= 0) return null;
            const isDee = c.i === WATERMARK.dee;
            const hot = isDee ? deeHot : 0;
            const x0 = ex(c.t);
            const x1 = ex(c.arrive);
            const color = USER_COLOR[c.user];
            return (
              <g key={c.i}>
                <line
                  x1={x0}
                  y1={evY}
                  x2={x0 + (x1 - x0) * p}
                  y2={evY + (prY - evY) * p}
                  stroke={hot > 0.5 ? ACCENT : color}
                  strokeWidth={2 + 2.5 * hot}
                  opacity={0.75}
                />
                <circle cx={x0} cy={evY} r={10} fill={color} stroke={PAPER} strokeWidth={2} />
                <circle cx={x1} cy={prY} r={10 * p} fill={color} stroke={PAPER} strokeWidth={2} />
              </g>
            );
          })}
          {/* dee's click: late against the three-second watermark, on time against ten. */}
          <circle cx={ex(dee.t)} cy={evY} r={18} fill="none" stroke={deeOk > 0.5 ? OK : ACCENT} strokeWidth={4} opacity={Math.max(deeLate, deeHot)} />
          <circle cx={ex(dee.arrive)} cy={prY} r={18} fill="none" stroke={ACCENT} strokeWidth={4} opacity={deeHot * (1 - ease(frame, q8Out, 10))} />
        </svg>
        <Note at={deeAt + 4} x={X0} y={y(720)} out={q8Out}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            dee's click: happened at <Num>{dee.t}</Num> s, arrived at <Num>{dee.arrive}</Num> s
          </span>
        </Note>

        {/* What pulls the two apart. */}
        <div style={{ position: "absolute", left: X0, top: y(720), display: "flex", gap: 14, whiteSpace: "nowrap", opacity: 1 - ease(frame, byArrivalAt, 10) }}>
          {causes.map((c, i) => (
            <span key={c.text} style={{ ...note(25, INK), opacity: ease(frame, c.at - 2, 10) }}>
              {c.text}
              {i < causes.length - 1 ? <span style={{ color: INK_SOFT }}> ·</span> : null}
            </span>
          ))}
        </div>
        <Note at={apartAt} x={X0} y={y(766)} out={byArrivalAt}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>each pulls the two apart</span>
        </Note>

        {/* ── Question 9: the watermark sweeps along. ───────────────────── */}
        {sweepIn > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: sweepIn }}>
            {/* Now, on the processing axis. */}
            <line x1={ex(pt)} x2={ex(pt)} y1={prY - 14} y2={prY + h(BAND)} stroke={INK} strokeWidth={3} />
            <path d={`M${ex(pt) - 9},${prY + h(BAND) + 14} L${ex(pt) + 9},${prY + h(BAND) + 14} L${ex(pt)},${prY + h(BAND) + 2} Z`} fill={INK} />
            {wm3 !== null ? (
              <line x1={ex(Math.max(0, wm3))} x2={ex(Math.max(0, wm3))} y1={evY - h(BAND) - 6} y2={evY + 14} stroke={BLUE_INK} strokeWidth={5} />
            ) : null}
            {wm10 !== null && ten > 0 ? (
              <line
                x1={ex(Math.max(0, wm10))}
                x2={ex(Math.max(0, wm10))}
                y1={evY - h(BAND) - 6}
                y2={evY + 14}
                stroke={BLUE_INK}
                strokeWidth={4}
                strokeDasharray="6 5"
                opacity={ten}
              />
            ) : null}
          </svg>
        ) : null}
        <Note at={allowAt + 4} x={ex(pt) - 40} y={prY + h(BAND) + h(20)} out={q9Out}>
          <span style={{ ...label(20, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            now: <Num>{pt.toFixed(1)}</Num> s
          </span>
        </Note>
        {wm3 !== null ? (
          <Note at={allowAt + 6} x={ex(Math.max(0, wm3)) + 8} y={evY - h(BAND) - h(34)} out={q9Out}>
            <span style={{ ...label(20, BLUE_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
              watermark, delay 3: <Num>{Math.max(0, wm3)}</Num> s
            </span>
          </Note>
        ) : null}
        {wm10 !== null ? (
          <Note at={tenAt + 6} x={ex(Math.max(0, wm10)) - 8} y={evY - h(BAND) - h(34)} out={q9Out} align="right">
            <span style={{ ...label(20, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              delay 10: <Num>{Math.max(0, wm10)}</Num> s
            </span>
          </Note>
        ) : null}

        <Note at={estAt} x={X0} y={y(720)} out={q9Out}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>watermark</b>: everything before it has (probably) arrived
            <span style={{ opacity: ease(frame, closeAt, 10) }}>, so a window can close</span>
          </span>
        </Note>
        <Note at={ruleAt} x={X0} y={y(762)} out={q9Out}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            = latest event time seen <span style={{ opacity: ease(frame, delayAt, 10) }}>− an allowed delay</span>
            <span style={{ ...label(20, INK_SOFT), opacity: ease(frame, proofAt, 10) }}> · progress, not proof</span>
          </span>
        </Note>
        <Note at={closesAt + 6} x={X0} y={y(812)} out={q9Out}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            delay <Num>{t3.delay}</Num> s: first window closes at <Num>{t3.closeFirst}</Num> s
            <span style={{ opacity: ease(frame, withFourAt, 8) }}>
              , with <Num>{WATERMARK.firstOnTime}</Num>
            </span>
            <span style={{ color: ACCENT_INK, fontWeight: 700, opacity: deeLate }}>
              ; dee's click arrives behind <Num>{WATERMARK.deeBehind}</Num> s: late
            </span>
          </span>
        </Note>
        <Note at={laterAt + 4} x={X0} y={y(854)} out={q9Out}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            delay <Num>{t10.delay}</Num> s: it counts, <Num>{t10.firstCount}</Num> clicks, but closes at <Num>{t10.closeFirst}</Num> s,{" "}
            <b style={{ color: ACCENT_INK }}>
              <Num>{WATERMARK.closeLater}</Num> s later
            </b>
          </span>
        </Note>
        <Note at={buysAt} x={1260} y={y(812)} out={q9Out}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            longer delay: more complete, later
            <br />
            <span style={{ ...label(20, INK_SOFT), opacity: ease(frame, stateAt, 10) }}>and more state held</span>
          </span>
        </Note>

        {/* ── Question 10: late data. ───────────────────────────────────── */}
        {[
          {
            at: keepAt,
            body: (
              <>
                <b>1</b> allowed lateness <Num>{WATERMARK.threeLate.lateness}</Num> s: window 0 to 10 s stays open until the watermark passes{" "}
                <Num>{WINDOWS.size + WATERMARK.threeLate.lateness}</Num> s
              </>
            ),
          },
          {
            at: sideAt - 2,
            body: (
              <>
                <b>2</b> later than that: a side output
                <span style={{ color: ACCENT_INK, opacity: ease(frame, silenceAt, 10) }}>, never silently dropped</span>
              </>
            ),
          },
          {
            at: upsertAt,
            body: (
              <>
                <b>3</b> the sink upserts<span style={{ color: OK_INK, fontWeight: 700, opacity: ease(frame, replacesAt, 10) }}>: one row, replaced</span>
              </>
            ),
          },
        ].map((r, i) => (
          <Note key={i} at={r.at} x={X0} y={y(720) + i * h(44)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>{r.body}</span>
          </Note>
        ))}
        <Note at={mixAt} x={X0} y={y(720) + 3 * h(44) + h(6)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>early, on-time and late results: how late, and how much it matters, decides the mix</span>
        </Note>
        {/* The window's row in the sink: four, then five, in place. */}
        <Box x={1420} y={y(712)} w={380} h={h(64)} at={updateAt} size={24}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            window 0 to 10 s:
            <span style={{ display: "inline-grid", ...TABULAR }}>
              <span style={{ gridArea: "1 / 1", opacity: 1 - ease(frame, fiveAt, 10) }}>{WATERMARK.firstOnTime}</span>
              <span style={{ gridArea: "1 / 1", color: OK_INK, opacity: ease(frame, fiveAt, 10) }}>{WATERMARK.threeLate.firstCount}</span>
            </span>
          </span>
        </Box>
        <div
          style={{
            position: "absolute",
            left: 1414,
            top: y(712) - 6,
            width: 392,
            height: h(64) + 12,
            borderRadius: 12,
            boxShadow: `0 0 0 ${6 * pulse(frame, fiveAt, 26)}px ${HIGHLIGHT}`,
          }}
        />
        <Note at={updateAt + 4} x={1420} y={y(712) + h(74)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>the window's row in the sink</span>
        </Note>
        {firings.map((f) => {
          const p = ease(frame, f.at - 2, 10);
          const top = prY + h(BAND) + 4;
          return (
            <React.Fragment key={f.text}>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
                <line x1={ex(f.pt)} x2={ex(f.pt)} y1={top} y2={top + h(34)} stroke={OK} strokeWidth={3} />
                <path d={`M${ex(f.pt)},${top} l26,9 l-26,9 z`} fill={OK} />
              </svg>
              <Note at={f.at} x={ex(f.pt) + 32} y={top + h(4)}>
                <span style={{ ...label(20, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{f.text}</span>
              </Note>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
