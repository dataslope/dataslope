import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText, TABULAR } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { OBSERVE } from "./data";
import { Chip, Drift, pulse, SmallMono, Svg, X0 } from "./parts";

const HEADS_Y = 272;
const RIGHT_X = 980;
const DAY_X = [400, 610];
const DAY_W = 170;
const BASE_Y = 548;
const ROWS_Y = 600;
const ROW = 46;
const MON = { x0: 1190, x1: 1770, top: 380, pitch: 104, h: 56 };

const TEST_NAMES: Record<string, string> = {
  unique: "unique",
  notNull: "not_null",
  acceptedValues: "accepted_values",
  relationships: "relationships",
};

/** "2026-03-02" → "2 March". */
const dayOf = (d: string) => `${Number(d.slice(8, 10))} ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Number(d.slice(5, 7)) - 1]}`;

/** A monitor's drawn week: values on a 0 to 1 scale inside its band (0.3 to
 *  0.7), the last one out of the band where the monitor flags. Drawn, not
 *  measured; the volume line ends on the measured drop. */
const MONITORS = [
  { name: "Volume", values: [0.52, 0.47, 0.55, 0.5, 0.53, 0.5], flags: true },
  { name: "Freshness", values: [0.45, 0.5, 0.48, 0.52, 0.46, 0.5, 0.49] },
  { name: "Schema", values: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
  { name: "Distribution", values: [0.55, 0.48, 0.52, 0.45, 0.5, 0.54, 0.47] },
];

/**
 * Question 9. Tests on the left: the video's own two days of loads, 30
 * orders then 20 (33.3% fewer), and the four tests' results under each day,
 * every one "0 rows: pass" in neutral ink. Observability on the right: four
 * monitored signals as drawn lines in their usual bands, volume dropping out
 * of its band and flagged. Then the row-count bound a test could add, dashed
 * under the tests, and what each side catches.
 */
export const ObserveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("observe").from;
  const qAt = n.word("observe", "Question nine");
  const qTextAt = n.word("observe", "What is the difference between testing");
  const assertAt = n.word("observe", "Tests assert rules you wrote in advance");
  const dropsAt = n.word("observe-run", "drops from thirty orders to twenty");
  const twentyAt = n.word("observe-run", "to twenty");
  const thirdAt = n.word("observe-run", "A third of the data is gone");
  const zeroAt = n.word("observe-run", "every test still returns zero rows");
  const fineAt = n.word("observe-run", "the rows that did arrive are fine");
  const watchAt = n.word("observe-watch", "Observability watches");
  const signals = [
    n.word("observe-watch", "volume"),
    n.word("observe-watch", "freshness"),
    n.word("observe-watch", "schema"),
    n.word("observe-watch", "distribution"),
  ];
  const normalAt = n.word("observe-watch", "against what's normal");
  const surpriseAt = n.word("observe-watch", "flags the surprise");
  const toolsAt = n.word("observe-watch", "Tools like Monte Carlo");
  const boundAt = n.word("observe-both", "A row-count bound");
  const writeAt = n.word("observe-both", "once someone thinks to write it");
  const expectedAt = n.word("observe-both", "Tests catch what you expected");
  const didntAt = n.word("observe-both", "monitoring catches what you didn't");
  const end = n.beat("observe-both").to;

  const headsTop = y(HEADS_Y);
  const base = y(BASE_Y);
  const max = Math.max(...OBSERVE.volume.map((v) => v.rows));
  const barH = (rows: number) => (rows / max) * h(170);
  const rowsTop = y(ROWS_Y);
  const rowY = (i: number) => rowsTop + i * h(ROW);

  const monY = (i: number) => y(MON.top) + i * h(MON.pitch);
  const mx = (k: number, len: number) => MON.x0 + (k / (len - 1)) * (MON.x1 - MON.x0);
  const mh = h(MON.h);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={assertAt} level={-34} />
      <Sfx name="el-pop" at={dropsAt} level={-32} />
      <Sfx name="el-pop" at={twentyAt} level={-31} />
      <Sfx name="el-tap" at={thirdAt + 4} level={-32} />
      <Sfx name="el-sprinkle" at={zeroAt} level={-35} />
      <Sfx name="el-tap" at={watchAt} level={-34} />
      {signals.map((at, i) => (
        <Sfx key={i} name="el-pencil" at={at} level={-37} />
      ))}
      <Sfx name="el-tap" at={surpriseAt + 2} level={-31} />
      <Sfx name="el-pencil" at={boundAt + 2} level={-35} />
      <Sfx name="el-chime" at={didntAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={qTextAt - 4} size={56}>
          What is the difference between testing and data observability?
        </QuestionCard>

        {/* ── Two heads ── */}
        <Ink at={assertAt - 2} dur={12} style={{ left: X0, top: headsTop, whiteSpace: "nowrap" }}>
          <div style={{ ...label(26, INK), fontWeight: 600 }}>Tests</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 10 }}>
            Rules you wrote in advance
            <span style={{ color: INK, fontWeight: 600, opacity: ease(frame, expectedAt, 10) }}>: they catch the expected</span>
          </div>
        </Ink>
        <div style={{ position: "absolute", left: RIGHT_X - 50, top: headsTop + 2, width: 1, height: 74 * ease(frame, watchAt - 4, 14), background: HAIRLINE }} />
        <Ink at={watchAt - 2} dur={12} style={{ left: RIGHT_X, top: headsTop, whiteSpace: "nowrap" }}>
          <div style={{ ...label(26, INK), fontWeight: 600 }}>Observability</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 10 }}>
            <span style={{ opacity: ease(frame, normalAt, 10) }}>What&rsquo;s normal</span>
            <span style={{ color: INK, fontWeight: 600, opacity: ease(frame, didntAt, 10) }}>: it catches the unexpected</span>
          </div>
        </Ink>

        {/* ── Two days of loads ── */}
        <Svg>
          {OBSERVE.volume.map((v, i) => {
            const at = i === 0 ? dropsAt : twentyAt;
            const p = ease(frame, at - 4, 16);
            const hh = barH(v.rows) * p;
            const x = DAY_X[i];
            return (
              <g key={v.day}>
                <rect x={x} y={base - hh} width={DAY_W - 40} height={hh} fill={i === 0 ? BAR : `color-mix(in srgb, ${BAR} 70%, white)`} rx={3} />
                <text x={x + (DAY_W - 40) / 2} y={base - hh - 12} textAnchor="middle" style={svgText({ ...label(24, BLUE_INK), ...TABULAR })} opacity={p}>
                  {v.rows}
                </text>
                <text x={x + (DAY_W - 40) / 2} y={base + 30} textAnchor="middle" style={svgText(note(20, INK_SOFT))} opacity={p}>
                  {dayOf(v.day)}
                </text>
              </g>
            );
          })}
          <line x1={DAY_X[0] - 20} y1={base} x2={DAY_X[1] + DAY_W - 20} y2={base} stroke={INK} strokeWidth={1.5} opacity={ease(frame, dropsAt - 6, 10)} />
        </Svg>
        <Note at={thirdAt} x={DAY_X[1] + DAY_W - 10} y={base - barH(OBSERVE.volume[1].rows) - h(10)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <Num>-{OBSERVE.dropPct}%</Num>
          </span>
        </Note>

        {/* ── The four tests, each day: zero rows ── */}
        {OBSERVE.tests.map((t, i) => (
          <React.Fragment key={t.id}>
            <Ink at={zeroAt - 4 + i * 3} dur={10} style={{ left: X0, top: rowY(i), height: h(ROW), display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 20, color: INK }}>{TEST_NAMES[t.id]}</span>
            </Ink>
            {t.failing.map((f, k) => (
              <Ink key={f.day} at={zeroAt + i * 3 + k * 6} dur={10} style={{ left: DAY_X[k] - 14, top: rowY(i), height: h(ROW), display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                <Chip tone="gray" size={19}>
                  {f.failing} rows: pass
                </Chip>
              </Ink>
            ))}
          </React.Fragment>
        ))}
        <Note at={fineAt} x={X0} y={rowY(4) + h(6)} out={boundAt - 2}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>The rows that did arrive are fine</span>
        </Note>
        {/* The bound a test could add, once someone thinks of it. */}
        <Ink at={boundAt} dur={12} style={{ left: X0 - 10, top: rowY(4) + h(4), whiteSpace: "nowrap" }}>
          <span
            style={{
              display: "inline-block",
              border: `2px dashed ${ds("gray", 500)}`,
              borderRadius: 8,
              padding: "6px 14px",
              ...note(21, INK),
            }}
          >
            Row-count bound <span style={{ color: INK_SOFT }}>(<SmallMono>dbt_expectations</SmallMono>)</span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, writeAt, 10) }}>, if someone writes it</span>
          </span>
        </Ink>

        {/* ── Monitors: each signal in its usual band ── */}
        {MONITORS.map((m, i) => {
          const at = signals[i];
          const p = ease(frame, at - 2, 18);
          const top = monY(i);
          const values = m.flags ? [...m.values, 0.06] : m.values;
          const yv = (v: number) => top + mh * (1 - v);
          const drawn = Math.max(1, Math.round(values.length * p));
          const flagged = m.flags ? ease(frame, surpriseAt, 10) : 0;
          return (
            <React.Fragment key={m.name}>
              <Ink at={at - 4} dur={10} style={{ left: RIGHT_X, top: top + mh / 2 - 16, whiteSpace: "nowrap" }}>
                <span style={{ ...label(22, INK) }}>{m.name}</span>
              </Ink>
              <Svg opacity={ease(frame, at - 4, 10)}>
                <rect x={MON.x0} y={yv(0.7)} width={MON.x1 - MON.x0} height={yv(0.3) - yv(0.7)} fill={`color-mix(in srgb, ${ds("gray", 400)} ${18 * ease(frame, normalAt, 12) + 6}%, transparent)`} rx={3} />
                <polyline
                  points={values
                    .slice(0, m.flags && flagged <= 0 ? values.length - 1 : values.length)
                    .slice(0, drawn)
                    .map((v, k) => `${mx(k, values.length)},${yv(v)}`)
                    .join(" ")}
                  fill="none"
                  stroke={BAR}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                />
                {m.flags && flagged > 0 ? (
                  <>
                    <circle cx={mx(values.length - 1, values.length)} cy={yv(values[values.length - 1])} r={7} fill={ACCENT} opacity={flagged} />
                    <circle
                      cx={mx(values.length - 1, values.length)}
                      cy={yv(values[values.length - 1])}
                      r={15 + 6 * pulse(frame, surpriseAt + 4, 20)}
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth={2.4}
                      opacity={flagged}
                    />
                  </>
                ) : null}
              </Svg>
            </React.Fragment>
          );
        })}
        <Note at={surpriseAt + 4} x={MON.x1 - 210} y={monY(0) + mh + h(10)}>
          <span style={{ ...note(21, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Flagged: out of its band</span>
        </Note>
        <Note at={normalAt} x={MON.x0} y={monY(3) + mh + h(16)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>Gray: the usual range (drawn)</span>
        </Note>
        <Note at={toolsAt} x={RIGHT_X} y={monY(3) + mh + h(60)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            Tools: <b>Monte Carlo</b>, <b>Elementary</b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
