import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import {
  HAIRLINE,
  INK,
  INK_SOFT,
  PAPER,
  TABULAR,
  fmt,
  label,
  note,
} from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TREE } from "./data";
import {
  at,
  Axes,
  C0,
  C1,
  Drift,
  Mark,
  OK,
  OK_INK,
  pulse,
  type Scale,
  Svg,
} from "./parts";

const LEFT = 160;
const WIDTH = 900;
const BASE = 612;
const STEP = 15;
const DOT = 6.4;
const GINI_TOP = 722;
const GINI_H = 136;
const COL = 1180;
const COL_W = 640;

/** Each flower's column (its width to one decimal) and its height in the stack. */
const STACK = (() => {
  const seen = new Map<string, number>();
  const order = TREE.width
    .map((w, i) => ({ w, l: TREE.label[i], i }))
    .sort((a, b) => a.w - b.w || a.l - b.l);
  const pos: { w: number; l: number; k: number }[] = [];
  for (const o of order) {
    const key = o.w.toFixed(1);
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    pos.push({ w: o.w, l: o.l, k });
  }
  return pos;
})();

/** How many of each species sit at or left of a cut, and right of it. */
const sides = (t: number) => {
  const left = [0, 0];
  const right = [0, 0];
  TREE.width.forEach((w, i) => {
    (w <= t ? left : right)[TREE.label[i]] += 1;
  });
  return { left, right };
};

const NodeBox: React.FC<{
  x: number;
  y: number;
  w: number;
  at: number;
  lines: React.ReactNode[];
  lit?: number;
}> = ({ x, y, w, at: from, lines, lit = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        boxSizing: "border-box",
        padding: "12px 16px",
        border: `2px solid ${lit > 0 ? `color-mix(in srgb, ${OK} ${100 * lit}%, ${HAIRLINE})` : HAIRLINE}`,
        borderRadius: 10,
        background: PAPER,
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            ...note(i === 0 ? 24 : 22, i === 0 ? INK : INK_SOFT),
            fontWeight: i === 0 ? 650 : 500,
            whiteSpace: "nowrap",
            ...TABULAR,
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};

/**
 * Question 3, on a hundred iris flowers stacked by petal width, the two
 * species in two inks. A cut slides along the axis, the counts on its two
 * sides following it and the weighted Gini of every cut tracing out below,
 * then settles at 1.75, the lowest. On the right, the split as a tree: the
 * root, the question, and the two purer children.
 */
export const TreeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("tree").from;
  const qAt = n.word("tree", "Question three");
  const textAt = n.word("tree", "How does a decision tree split");
  const triesAt = n.word("tree", "It tries every threshold");
  const purestAt = n.word("tree", "the two sides purest");
  const irisAt = n.word("tree-gini", "a hundred iris flowers");
  const speciesAt = n.word("tree-gini", "two species");
  const giniAt = n.word("tree-gini", "Gini impurity");
  const chanceAt = n.word("tree-gini", "the chance that two flowers");
  const halfAt = n.word("tree-gini", "starts at point five");
  const slideAt = n.word("tree-gini", "Slide a cut");
  const bestAt = n.word("tree-gini", "At one point seven five");
  const otherAt = n.word("tree-gini", "the other one to forty-five");
  const fallsAt = n.word("tree-gini", "falls to point one one");
  const lowestAt = n.word("tree-gini", "the lowest of any cut");
  const entropyAt = n.word("tree-measures", "Entropy");
  const regressionAt = n.word("tree-measures", "A regression tree");
  const repeatAt = n.word("tree-stop", "repeats this on each side");
  const depthAt = n.word("tree-stop", "a maximum depth");
  const readAt = n.word("bag-in", "quick to read");
  const overAt = n.word("bag-in", "quick to overreact");
  const end = n.beat("bag-in").to;

  const sx: Scale = { lo: 0.95, hi: 2.55, a: LEFT, b: LEFT + WIDTH };
  const base = y(BASE);
  const sy: Scale = { lo: 0, hi: 1, a: base, b: base - 10 };
  const gy: Scale = {
    lo: 0,
    hi: 0.5,
    a: y(GINI_TOP) + h(GINI_H),
    b: y(GINI_TOP),
  };
  const first = TREE.curve[0][0];
  const last = TREE.curve[TREE.curve.length - 1][0];
  const best = TREE.best[0];

  // The cut: three quick tries while the answer is given, then the sweep
  // over every candidate and back to the best one.
  const tries = [1.25, 1.55, 2.05];
  const triesP = (frame - triesAt) / Math.max(1, purestAt - triesAt);
  const tryCut =
    tries[
      Math.min(tries.length - 1, Math.max(0, Math.floor(triesP * tries.length)))
    ];
  const sweepEnd = bestAt - 12;
  const sweep = ease(frame, slideAt + 4, Math.max(1, sweepEnd - slideAt - 4));
  const settle = ease(frame, sweepEnd, 16);
  const swept = first + (last - first) * sweep;
  const cut = frame < slideAt ? tryCut : swept + (best - swept) * settle;
  const cutOn = ease(frame, triesAt + 4, 10);
  const counts = sides(cut);
  const reveal = Math.max(first, first + (last - first) * sweep);
  const okLit = ease(frame, lowestAt, 12);
  // The cut stops just under the flowers' axis until the Gini chart it
  // reaches down to is there, then follows it down.
  const cutTo =
    base + h(24) + (y(GINI_TOP) + h(GINI_H) - base - h(24)) * ease(frame, slideAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={triesAt} level={-36} />
      <Sfx name="el-whoosh" at={slideAt + 4} level={-36} />
      <Sfx name="el-tap" at={bestAt} level={-34} />
      <Sfx name="el-pop" at={fallsAt} level={-33} />
      <Sfx name="el-pencil" at={repeatAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          How does a decision tree split?
        </QuestionCard>

        {/* ── The flowers, stacked by petal width ── */}
        <Axes
          x={sx}
          y={sy}
          xTicks={[1, 1.5, 2, 2.5]}
          xFormat={(v) => fmt(v, 1)}
          xTitle="petal width (cm)"
          at={triesAt - 4}
        />
        <Svg>
          {STACK.map((d, i) => {
            const s = ease(frame, triesAt - 2 + (i / STACK.length) * 16, 8);
            if (s <= 0) return null;
            return (
              <circle
                key={i}
                cx={at(sx, d.w)}
                cy={base - h(10) - d.k * h(STEP)}
                r={DOT * s}
                fill={d.l ? C1 : C0}
                opacity={0.88}
                stroke={PAPER}
                strokeWidth={1.2}
              />
            );
          })}
        </Svg>
        <Note at={speciesAt} x={LEFT} y={y(330)}>
          <span
            style={{
              ...label(22, INK),
              whiteSpace: "nowrap",
              display: "flex",
              gap: 26,
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <svg width={14} height={14}>
                <circle cx={7} cy={7} r={6} fill={C0} />
              </svg>
              versicolor
            </span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <svg width={14} height={14}>
                <circle cx={7} cy={7} r={6} fill={C1} />
              </svg>
              virginica
            </span>
            <span style={{ color: INK_SOFT, fontWeight: 500 }}>
              {TREE.width.length} iris flowers
            </span>
          </span>
        </Note>

        {/* The cut, and the count on each side of it. */}
        <Svg opacity={cutOn}>
          <line
            x1={at(sx, cut)}
            x2={at(sx, cut)}
            y1={y(380)}
            y2={cutTo}
            stroke={INK}
            strokeWidth={2.4}
            strokeDasharray="7 6"
          />
        </Svg>
        <Note
          at={triesAt + 6}
          x={at(sx, cut) - 14}
          y={y(366)}
          align="right"
          from="up"
        >
          <span style={{ ...label(21, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            <b style={{ color: C0 }}>{counts.left[0]}</b> ·{" "}
            <b style={{ color: C1 }}>{counts.left[1]}</b>
          </span>
        </Note>
        <Note at={triesAt + 6} x={at(sx, cut) + 14} y={y(366)} from="up">
          <span style={{ ...label(21, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            <b style={{ color: C0 }}>{counts.right[0]}</b> ·{" "}
            <b style={{ color: C1 }}>{counts.right[1]}</b>
          </span>
        </Note>

        {/* ── The weighted Gini of every cut ── */}
        <Axes
          x={sx}
          y={gy}
          xTicks={[]}
          yTicks={[0, 0.25, 0.5]}
          yFormat={(v) => fmt(v, 2)}
          yTitle="weighted Gini of the two sides"
          at={slideAt}
          size={19}
        />
        <Svg opacity={ease(frame, slideAt, 10)}>
          <defs>
            <clipPath id="tree-gini-reveal">
              <rect
                x={LEFT}
                y={y(GINI_TOP) - 10}
                width={at(sx, reveal) - LEFT + 2}
                height={h(GINI_H) + 20}
              />
            </clipPath>
          </defs>
          <path
            clipPath="url(#tree-gini-reveal)"
            d={TREE.curve
              .map(
                ([t, g], i) =>
                  `${i ? "L" : "M"}${at(sx, t).toFixed(1)},${at(gy, g).toFixed(1)}`,
              )
              .join(" ")}
            fill="none"
            stroke={C0}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <circle
            cx={at(sx, best)}
            cy={at(gy, TREE.best[1])}
            r={9 * okLit + 4 * pulse(frame, lowestAt, 18)}
            fill={OK}
          />
        </Svg>
        {/* Under the rising side of the curve, which ran through the label
            when it sat above the dot. */}
        <Note
          at={lowestAt}
          x={at(sx, best) + 16}
          y={at(gy, TREE.best[1]) + h(2)}
        >
          <span
            style={{
              ...note(24, OK_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              ...TABULAR,
            }}
          >
            {fmt(TREE.best[1], 2)}, the lowest
          </span>
        </Note>

        {/* The follow-up "Gini or entropy?", under the Gini chart: entropy's
            own sweep bottoms out at the same cut. */}
        <Note
          at={entropyAt}
          x={LEFT}
          y={y(GINI_TOP) + h(GINI_H) + h(12)}
        >
          <span style={{ ...note(22, INK), whiteSpace: "nowrap", ...TABULAR }}>
            entropy (information gain) also picks{" "}
            {fmt(TREE.entropy.best[0], 2)}
            <span
              style={{ color: INK_SOFT, opacity: ease(frame, regressionAt, 10) }}
            >
              ; a regression tree cuts variance
            </span>
          </span>
        </Note>

        <Note
          at={purestAt}
          x={LEFT + WIDTH}
          y={y(330)}
          align="right"
          from="right"
          out={irisAt}
        >
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            purest: each side as close to one species as it gets
          </span>
        </Note>

        {/* ── The split, as a tree ── */}
        <NodeBox
          x={COL + 160}
          y={y(330)}
          w={320}
          at={giniAt}
          lines={[
            `${TREE.width.length} flowers`,
            "50 · 50",
            <Mark key="g" at={halfAt + 2}>
              Gini {fmt(TREE.parent, 2)}
            </Mark>,
          ]}
        />
        <Note at={chanceAt} x={COL + 160} y={y(330) + h(128)} width={320}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>
            chance two random flowers differ
          </span>
        </Note>
        <Svg opacity={ease(frame, bestAt, 12)}>
          <path
            d={`M${COL + 320},${y(330) + h(168)} L${COL + 150},${y(560)}`}
            stroke={INK}
            strokeWidth={1.6}
            fill="none"
          />
          <path
            d={`M${COL + 320},${y(330) + h(168)} L${COL + 490},${y(560)}`}
            stroke={INK}
            strokeWidth={1.6}
            fill="none"
          />
        </Svg>
        <Note
          at={bestAt}
          x={COL + 320}
          y={y(330) + h(176)}
          align="left"
          from="up"
          style={{ transform: "translateX(-50%)" }}
        >
          <span
            style={{
              ...note(23, INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
              ...TABULAR,
              background: PAPER,
              padding: "2px 8px",
            }}
          >
            petal width ≤ {fmt(best, 2)}?
          </span>
        </Note>
        <NodeBox
          x={COL}
          y={y(560)}
          w={300}
          at={bestAt + 6}
          lit={okLit}
          lines={[
            <>
              <b style={{ color: C0 }}>{TREE.left.versicolor}</b> ·{" "}
              <b style={{ color: C1 }}>{TREE.left.virginica}</b>
            </>,
            <>Gini {fmt(TREE.left.gini, 2)}</>,
          ]}
        />
        <NodeBox
          x={COL + 340}
          y={y(560)}
          w={300}
          at={otherAt}
          lit={okLit}
          lines={[
            <>
              <b style={{ color: C0 }}>{TREE.right.versicolor}</b> ·{" "}
              <b style={{ color: C1 }}>{TREE.right.virginica}</b>
            </>,
            <>Gini {fmt(TREE.right.gini, 2)}</>,
          ]}
        />
        {/* The split's number, so it sits between the two children rather
            than under one, clear of the dashed links below each box. */}
        <Note
          at={fallsAt}
          x={COL + 320 - 140}
          width={280}
          y={y(560) + h(104)}
          style={{ textAlign: "center" }}
        >
          <span
            style={{
              ...note(25, OK_INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
              ...TABULAR,
            }}
          >
            weighted: {fmt(TREE.best[1], 2)}
          </span>
        </Note>
        <Svg opacity={ease(frame, repeatAt, 14)}>
          {[COL + 150, COL + 490].flatMap((cx) =>
            [-70, 70].map((dx) => (
              <path
                key={`${cx}${dx}`}
                d={`M${cx},${y(560) + h(92)} L${cx + dx},${y(760)}`}
                stroke={INK_SOFT}
                strokeWidth={1.4}
                strokeDasharray="4 6"
                fill="none"
              />
            )),
          )}
        </Svg>
        {[COL + 150, COL + 490].flatMap((cx, j) =>
          [-70, 70].map((dx, k) => (
            <Note
              key={`${cx}${dx}`}
              at={repeatAt + 4 + (j * 2 + k) * 3}
              x={cx + dx - 18}
              y={y(764)}
              from="up"
            >
              <span style={{ ...label(24, INK_SOFT) }}>…</span>
            </Note>
          )),
        )}
        <Note at={depthAt} x={COL} y={y(820)} width={COL_W}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={readAt}>until a stopping rule: a maximum depth</Mark>
          </span>
        </Note>
        <Svg opacity={pulse(frame, overAt, 26)}>
          <rect
            x={COL - 8}
            y={y(552)}
            width={COL_W + 16}
            height={h(110)}
            rx={12}
            fill="none"
            stroke={OK}
            strokeWidth={3}
          />
        </Svg>
      </Drift>
    </AbsoluteFill>
  );
};
