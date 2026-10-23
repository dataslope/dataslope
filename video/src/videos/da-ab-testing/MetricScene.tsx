import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DRIFT } from "./data";
import { Axes, Drift, ElbowArrow, Line, OK, OK_INK, type Scale, X0, at } from "./parts";

const LIST_Y = 330;
const PITCH = 60;
const CHART = { x0: 900, x1: 1640, top: 360, base: 780 };
const SERIES = [BAR, ds("teal", 500), ds("purple", 500)];
const SERIES_INK = [BLUE_INK, inkOf.teal, inkOf.purple];

type Box = { text: string; at: number };

/** A labelled card, for the metric kinds and the north star. */
const Card: React.FC<{ x: number; y: number; w: number; at: number; out?: number; color?: string; strong?: boolean; children: React.ReactNode }> = ({
  x,
  y,
  w,
  at: from,
  out,
  color = HAIRLINE,
  strong,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        boxSizing: "border-box",
        padding: "12px 18px",
        border: `${strong ? 2.5 : 1.5}px solid ${color}`,
        borderRadius: 10,
        background: PAPER,
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 10}px)`,
        ...note(26, INK),
      }}
    >
      {children}
    </div>
  );
};

/**
 * Questions 1, 2 and 3. What a good metric is, as a checklist, and the
 * page's chart of three definitions of an active user drifting a factor of
 * three apart by December; then the three kinds of metric for a checkout
 * test, chosen before it starts; then a north star above the day-to-day
 * metrics.
 */
export const MetricScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("metric").from;
  const qAt = n.word("metric", "Question");
  const textAt = n.word("metric", "What makes a good metric");
  const asked = n.beat("metric").to;
  const props: Box[] = [
    { text: "specific", at: n.word("metric-good", "specific") },
    { text: "measurable", at: n.word("metric-good", "measurable") },
    { text: "tied to the outcome", at: n.word("metric-good", "tied to the outcome") },
    { text: "sensitive to change", at: n.word("metric-good", "sensitive enough") },
    { text: "a rate, not a count", at: n.word("metric-good", "Prefer rates to counts") },
    { text: "hard to game", at: n.word("metric-good", "hard to game") },
  ];
  const specificAt = n.word("metric-drift", "Specific matters most");
  const threeAt = n.word("metric-drift", "three reasonable definitions");
  const decemberAt = n.word("metric-drift", "by December");
  const factorAt = n.word("metric-drift", "a factor of three");
  const q2At = n.word("kinds", "Question two");
  const q2TextAt = n.word("kinds", "What's the difference");
  const primaryAt = n.word("kinds", "The primary metric");
  const guardAt = n.word("kinds", "A guardrail must not");
  const guardItems = [n.word("kinds", "page speed"), n.word("kinds", "refunds"), n.word("kinds", "unsubscribes")];
  const vanityAt = n.word("kinds", "A vanity metric looks good");
  const beforeAt = n.word("kinds", "before the test starts");
  const q3At = n.word("north", "Question three");
  const q3TextAt = n.word("north", "What is a north star");
  const oneAt = n.word("north", "One number");
  const teamsAt = n.word("north", "weekly active teams");
  const dayAt = n.word("north", "day-to-day metrics");
  const end = n.beat("funnel-in").to;

  const out1 = q2At - 4;
  const out2 = q3At - 4;

  // ── The drift chart ──
  const last = DRIFT.months.length - 1;
  const xs: Scale = { lo: 0, hi: last, a: CHART.x0, b: CHART.x1 };
  const ys: Scale = { lo: 0, hi: 700, a: y(CHART.base), b: y(CHART.top) };
  const drawAt = (i: number) => threeAt + i * 10;

  // ── Kinds ──
  const colW = 520;
  const cols = [
    { x: X0, title: "Primary", at: primaryAt, ink: OK_INK, items: [{ text: "checkout conversion", at: primaryAt + 10 }] },
    {
      x: X0 + colW + 40,
      title: "Guardrail",
      at: guardAt,
      ink: BLUE_INK,
      items: [
        { text: "page speed", at: guardItems[0] },
        { text: "refunds", at: guardItems[1] },
        { text: "unsubscribes", at: guardItems[2] },
      ],
    },
    { x: X0 + 2 * (colW + 40), title: "Vanity", at: vanityAt, ink: ACCENT_INK, items: [{ text: "total registered users", at: vanityAt + 12 }] },
  ];

  // ── North star ──
  const starX = 760;
  const starY = y(360);
  const tactical = ["sign-ups", "messages sent", "files shared"];

  return (
    <AbsoluteFill>
      {props.map((p) => (
        <Sfx key={p.text} name="el-tap" at={p.at} level={-36} />
      ))}
      <Sfx name="el-pencil" at={threeAt} level={-34} />
      <Sfx name="el-pop" at={factorAt} level={-32} />
      <Sfx name="el-tap" at={primaryAt} level={-34} />
      <Sfx name="el-tap" at={guardAt} level={-34} />
      <Sfx name="el-tap" at={vanityAt} level={-34} />
      <Sfx name="el-pop" at={teamsAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          What makes a good metric?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} out={out2} size={58}>
          What&apos;s the difference between a primary, a guardrail, and a vanity metric?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={60}>
          What is a north star metric?
        </QuestionCard>

        {/* ── Question 1: a checklist, then the drift ── */}
        <div style={{ position: "absolute", left: X0, top: y(LIST_Y) - h(46), ...label(21, INK_SOFT), opacity: ease(frame, asked - 6, 12) * (1 - ease(frame, out1, 10)) }}>
          a good metric is
        </div>
        {props.map((p, i) => {
          const s = ease(frame, p.at - 2, 12);
          const o = ease(frame, out1, 10);
          const hot = i === 0 ? ease(frame, specificAt, 12) : 0;
          if (s <= 0 || o >= 1) return null;
          return (
            <div
              key={p.text}
              style={{
                position: "absolute",
                left: X0,
                top: y(LIST_Y) + i * h(PITCH),
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: s * (1 - o),
                transform: `translateX(${(1 - s) * -14}px)`,
              }}
            >
              <Tick at={p.at + 2} size={26} />
              <span
                style={{
                  ...note(30, INK),
                  whiteSpace: "nowrap",
                  fontWeight: hot > 0.5 ? 650 : 500,
                  background: hot > 0 ? `color-mix(in srgb, ${ds("yellow", 400)} ${hot * 70}%, transparent)` : undefined,
                  padding: "0 6px",
                  margin: "0 -6px",
                  borderRadius: 4,
                }}
              >
                {p.text}
              </span>
            </div>
          );
        })}
        <Axes x={xs} y={ys} xTicks={[0, 3, 6, 9, 11]} xFormat={(v) => DRIFT.months[v]} yTicks={[0, 200, 400, 600]} yTitle="active users" at={threeAt - 6} out={out1} />
        {DRIFT.definitions.map((d, i) => (
          <React.Fragment key={d.key}>
            <Line points={d.values.map((v, m) => [m, v] as const)} x={xs} y={ys} at={drawAt(i)} dur={30} out={out1} color={SERIES[i]} width={3.4} />
            <Note at={decemberAt + i * 4} x={at(xs, last) + 16} y={at(ys, d.values[last]) - 16} out={out1}>
              <span style={{ ...note(24, SERIES_INK[i]), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>{d.values[last]}</span>
            </Note>
            <Note at={drawAt(i) + 20} x={CHART.x0 + 10} y={y(CHART.top) - h(10) + i * h(32)} out={out1}>
              <span style={{ ...note(22, SERIES_INK[i]), whiteSpace: "nowrap" }}>{d.key}</span>
            </Note>
          </React.Fragment>
        ))}
        {/* The spread, as a bracket beside December. */}
        <Spread
          show={ease(frame, factorAt, 12) * (1 - ease(frame, out1, 10))}
          x={at(xs, last) + 90}
          y0={at(ys, DRIFT.definitions[0].values[last])}
          y1={at(ys, DRIFT.definitions[2].values[last])}
        />
        <Note at={factorAt + 4} x={at(xs, last) + 104} y={(at(ys, DRIFT.definitions[0].values[last]) + at(ys, DRIFT.definitions[2].values[last])) / 2 - 18} out={out1}>
          <span style={{ ...note(30, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>×{DRIFT.spread}</span>
        </Note>

        {/* ── Question 2: three kinds of metric ── */}
        {cols.map((c) => (
          <React.Fragment key={c.title}>
            <Note at={c.at - 2} x={c.x} y={y(340)} out={out2}>
              <span style={{ ...label(26, c.ink), whiteSpace: "nowrap" }}>{c.title}</span>
            </Note>
            {c.items.map((it, k) => (
              <Card key={it.text} x={c.x} y={y(400) + k * h(76)} w={colW} at={it.at - 2} out={out2} color={c.ink}>
                {it.text}
              </Card>
            ))}
          </React.Fragment>
        ))}
        <Note at={beforeAt - 2} x={X0} y={y(680)} out={out2}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            primary and guardrails: <b>chosen before the test starts</b>
          </span>
        </Note>

        {/* ── Question 3: one number above the rest ── */}
        <Card x={starX} y={starY} w={400} at={oneAt - 2} color={OK} strong>
          <div style={{ ...label(20, OK_INK) }}>north star</div>
          <div style={{ ...note(30, INK), fontWeight: 650, opacity: ease(frame, teamsAt - 2, 10) }}>weekly active teams</div>
        </Card>
        {tactical.map((t, i) => {
          const x = 340 + i * 440;
          const top = y(640);
          return (
            <React.Fragment key={t}>
              <Card x={x} y={top} w={320} at={dayAt + i * 4}>
                {t}
              </Card>
              <ElbowArrow
                points={[
                  [x + 160, top - 8],
                  [x + 160, top - h(70)],
                  [starX + 200, top - h(70)],
                  [starX + 200, starY + h(118)],
                ]}
                at={dayAt + 8 + i * 4}
                color={OK}
                width={2.2}
              />
            </React.Fragment>
          );
        })}
        <Note at={dayAt + 20} x={340} y={y(740)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the day-to-day metrics, pointed at durable value</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** The spread beside December, as a vertical bracket. */
const Spread: React.FC<{ show: number; x: number; y0: number; y1: number }> = ({ show, x, y0, y1 }) =>
  show <= 0 ? null : (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: show }}>
      <path d={`M${x - 10},${y0} L${x},${y0} L${x},${y1} L${x - 10},${y1}`} fill="none" stroke={ACCENT_INK} strokeWidth={2.4} />
    </svg>
  );
