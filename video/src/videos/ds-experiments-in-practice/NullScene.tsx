import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, fixed, NOSIG } from "./data";
import { at, Drift, MARK_OK, OK, OK_INK, type Scale, X0 } from "./parts";

const AXIS_Y = 820;
const SMALL_Y = 560;
const LARGE_Y = 700;
const LABEL_RIGHT = 470;

/**
 * Question 3. "No significant difference" read through its interval: two
 * simulated A/A tests on a 10% rate, against the video's own bar of half a
 * point. The small test's interval (-3.2 to +1.8 points) is far wider than the
 * bar, so it cannot tell; the large test's (-0.1 to +0.4) sits inside it.
 */
export const NullScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("nosig").from;
  const qAt = n.word("nosig", "Question three");
  const textAt = n.word("nosig", "The test shows no significant difference");
  const onlyAt = n.word("nosig", "Only that you didn't detect one");
  const ciAt = n.word("nosig", "The confidence interval");
  const simAt = n.word("nosig-ci", "two simulated tests");
  const halfAt = n.word("nosig-ci", "Say half a point");
  const smallAt = n.word("nosig-ci", "With a thousand users per arm");
  const smallEnds = n.word("nosig-ci", "from minus three point two points");
  const widerAt = n.word("nosig-ci", "far wider than that");
  const tellAt = n.word("nosig-ci", "the test can't tell");
  const largeAt = n.word("nosig-ci", "With a hundred thousand per arm");
  const largeEnds = n.word("nosig-ci", "from minus point one");
  const supportAt = n.word("nosig-ci", "That one does support");
  const end = n.beat("nosig-ci").to;

  const x: Scale = { lo: -4, hi: 4, a: 560, b: 1760 };
  const band = ease(frame, halfAt, 16);
  const tests = [
    { t: NOSIG.small, row: SMALL_Y, at: smallAt, ends: smallEnds, verdictAt: tellAt, ok: false },
    { t: NOSIG.large, row: LARGE_Y, at: largeAt, ends: largeEnds, verdictAt: supportAt, ok: true },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={smallAt + 4} level={-36} />
      <Sfx name="el-scratch" at={tellAt} level={-35} />
      <Sfx name="el-pencil" at={largeAt + 4} level={-36} />
      <Sfx name="el-pop" at={supportAt + 2} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58}>
          The test shows no significant difference. What can you conclude?
        </QuestionCard>
        <Note at={onlyAt - 2} x={X0} y={y(330)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            Only that you didn't detect one.{" "}
            <span style={{ color: BLUE_INK, opacity: ease(frame, ciAt, 12) }}>Read the confidence interval.</span>
          </span>
        </Note>
        <Note at={simAt} x={X0} y={y(400)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            simulated: a change that does nothing, on a {NOSIG.base}% conversion rate
          </span>
        </Note>

        {/* The axis, in percentage points, with the band worth having. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <rect
            x={at(x, -NOSIG.worth)}
            y={y(470)}
            width={(at(x, NOSIG.worth) - at(x, -NOSIG.worth)) * band}
            height={y(AXIS_Y) - y(470)}
            fill={MARK_OK}
          />
          <g opacity={ease(frame, simAt + 4, 12)}>
            <line x1={x.a} x2={x.b} y1={y(AXIS_Y)} y2={y(AXIS_Y)} stroke={INK} strokeWidth={1.6} />
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
              <g key={v}>
                <line x1={at(x, v)} x2={at(x, v)} y1={y(AXIS_Y)} y2={y(AXIS_Y) + 7} stroke={INK} strokeWidth={1.2} />
                <text x={at(x, v)} y={y(AXIS_Y) + 32} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 21, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}>
                  {v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0"}
                </text>
              </g>
            ))}
            <line x1={at(x, 0)} x2={at(x, 0)} y1={y(470)} y2={y(AXIS_Y)} stroke={INK} strokeWidth={1.2} strokeDasharray="3 6" />
            <text x={x.b} y={y(AXIS_Y) + 62} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
              difference, new minus old (percentage points)
            </text>
          </g>
        </svg>
        <Note at={halfAt + 6} x={at(x, -NOSIG.worth)} y={y(470) - h(36)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>± half a point: the smallest lift worth having</span>
        </Note>

        {tests.map(({ t, row, at: start, ends, verdictAt, ok }) => {
          const p = ease(frame, start + 2, 18);
          if (p <= 0) return null;
          const mid = at(x, t.diff);
          const lo = mid + (at(x, t.lo) - mid) * p;
          const hi = mid + (at(x, t.hi) - mid) * p;
          const v = ease(frame, verdictAt, 12);
          const ink = v > 0 ? (ok ? OK : ACCENT) : BAR;
          return (
            <React.Fragment key={t.n}>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <line x1={lo} x2={hi} y1={y(row)} y2={y(row)} stroke={ink} strokeWidth={5} strokeLinecap="round" />
                <line x1={lo} x2={lo} y1={y(row) - 14} y2={y(row) + 14} stroke={ink} strokeWidth={3} />
                <line x1={hi} x2={hi} y1={y(row) - 14} y2={y(row) + 14} stroke={ink} strokeWidth={3} />
                <circle cx={mid} cy={y(row)} r={9} fill={ink} />
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  width: LABEL_RIGHT - X0,
                  top: y(row) - 20,
                  textAlign: "right",
                  ...note(26, INK),
                  fontWeight: 650,
                  whiteSpace: "nowrap",
                  ...TABULAR,
                  opacity: ease(frame, start, 12),
                }}
              >
                {count(t.n)} per arm
              </div>
              {[t.lo, t.hi].map((e, j) => (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: at(x, e) - 60,
                    width: 120,
                    top: y(row) - h(52),
                    textAlign: "center",
                    ...label(21, INK),
                    fontWeight: 700,
                    ...TABULAR,
                    opacity: ease(frame, ends + j * 8, 10),
                  }}
                >
                  {fixed(e, 1, true)}
                </div>
              ))}
              <Note at={verdictAt - 2} x={ok ? at(x, t.hi) + 70 : at(x, t.hi) + 40} y={y(row) - 20}>
                <span style={{ ...note(28, ok ? OK_INK : ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
                  {ok ? "no meaningful effect" : "can't tell"}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={widerAt} x={at(x, NOSIG.small.lo)} y={y(SMALL_Y) + h(26)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>far wider than half a point</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
