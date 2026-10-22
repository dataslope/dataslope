import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GD } from "./data";
import { Drift, OK, OK_INK, PanelTitle } from "./parts";

const W = 470;
const LEFTS = [150, 725, 1300];
const TOP = 450;
const BOTTOM = 740;
const X_MAX = 15;
const F_MAX = X_MAX * X_MAX;

type Run = { rate: "0.004" | "0.25" | "1.05"; left: number; color: string; at: number; every: number; shown: number };

/** One rate's run on x²: the bowl, then each step as a dot joined to the last. */
const Bowl: React.FC<{ run: Run; drawAt: number; startAt: number; out: number }> = ({ run, drawAt, startAt, out }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const id = useId().replace(/:/g, "");
  const p = ease(frame, drawAt, 18);
  const o = 1 - ease(frame, out, 10);
  if (p <= 0 || o <= 0) return null;
  const cx = run.left + W / 2;
  const px = (x: number) => cx + (x / X_MAX) * (W / 2);
  const py = (x: number) => y(BOTTOM) - ((x * x) / F_MAX) * (y(BOTTOM) - y(TOP));
  const bowl = Array.from({ length: 61 }, (_, i) => {
    const x = -X_MAX + (2 * X_MAX * i) / 60;
    return `${i ? "L" : "M"}${px(x).toFixed(1)},${py(x).toFixed(1)}`;
  }).join(" ");
  const xs = GD.runs[run.rate].slice(0, run.shown);
  const reached = (i: number) => (i === 0 ? ease(frame, startAt, 8) : ease(frame, run.at + (i - 1) * run.every, 6));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: o }}>
      <defs>
        <clipPath id={`b${id}`}>
          <rect x={run.left - 10} y={y(TOP) - 30} width={W + 20} height={y(BOTTOM) - y(TOP) + 40} />
        </clipPath>
      </defs>
      <line x1={run.left} x2={run.left + W} y1={y(BOTTOM) + 1} y2={y(BOTTOM) + 1} stroke={INK} strokeWidth={1.4} opacity={p} />
      <path d={bowl} fill="none" stroke={INK_SOFT} strokeWidth={2.4} pathLength={1} strokeDasharray={`${p} 1`} />
      <g clipPath={`url(#b${id})`}>
        {xs.map((x, i) => {
          if (i === 0) return null;
          const q = reached(i);
          if (q <= 0) return null;
          const x0 = xs[i - 1];
          return (
            <line
              key={`l${i}`}
              x1={px(x0)}
              y1={py(x0)}
              x2={px(x0) + (px(x) - px(x0)) * q}
              y2={py(x0) + (py(x) - py(x0)) * q}
              stroke={run.color}
              strokeWidth={2.2}
              opacity={0.75}
            />
          );
        })}
        {xs.map((x, i) => {
          const q = reached(i);
          if (q <= 0) return null;
          return <circle key={`d${i}`} cx={px(x)} cy={py(x)} r={(i === 0 ? 9 : 6) * q} fill={i === 0 ? INK : run.color} />;
        })}
      </g>
    </svg>
  );
};

/**
 * Question 12, on the page's own chart (charts/gradient-descent-lr): x² from
 * 8 at three learning rates, drawn as a ball stepping in a bowl. 0.25 halves
 * the distance every step; 0.004 is still at 6.55 after 25 steps; 1.05
 * overshoots further every step and leaves the bowl. Then SGD, mini-batches
 * and Adam in one line each.
 */
export const GdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("gd").from;
  const qAt = n.word("gd", "Question");
  const textAt = n.word("gd", "What is gradient descent");
  const asked = n.word("gd", "It minimizes a loss");
  const againstAt = n.word("gd", "stepping against the gradient");
  const sizeAt = n.word("gd", "sets the size of each step");
  const startAt = n.word("gd-rates", "Start at eight");
  const quarterAt = n.word("gd-rates", "At point two five");
  const halvesAt = n.word("gd-rates", "each step halves the distance");
  const tenAt = n.word("gd-rates", "done in about ten");
  const smallAt = n.word("gd-rates", "At point oh oh four");
  const stillAt = n.word("gd-rates", "still past six");
  const bigAt = n.word("gd-rates", "At one point oh five");
  const overAt = n.word("gd-rates", "overshoots");
  const explodesAt = n.word("gd-rates", "the loss explodes");
  const sgdAt = n.word("gd-sgd", "Stochastic gradient descent");
  const miniAt = n.word("gd-sgd", "Mini-batches");
  const adamAt = n.word("gd-sgd", "And Adam");
  const end = n.beat("gd-sgd").to;

  const runs: Run[] = [
    { rate: "0.004", left: LEFTS[0], color: ACCENT, at: smallAt + 6, every: 1.6, shown: GD.steps },
    { rate: "0.25", left: LEFTS[1], color: OK, at: halvesAt, every: 4, shown: 11 },
    { rate: "1.05", left: LEFTS[2], color: ACCENT, at: overAt - 4, every: 6, shown: 9 },
  ];
  const slow = GD.runs["0.004"][GD.steps - 1];
  const labels = [
    { text: `still at ${fmt(slow)} after ${GD.steps - 1} steps`, at: stillAt - 2, ink: ACCENT_INK },
    { text: "halves the distance every step", at: halvesAt + 4, ink: OK_INK },
    { text: "overshoots: the loss explodes", at: explodesAt - 2, ink: ACCENT_INK },
  ];
  const titles = [
    { text: "learning rate 0.004", at: smallAt - 4 },
    { text: "learning rate 0.25", at: quarterAt - 4 },
    { text: "learning rate 1.05", at: bigAt - 4 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={asked + 2} level={-34} />
      {Array.from({ length: 6 }, (_, i) => (
        <Sfx key={i} name="el-tap" at={halvesAt + i * 4} level={-40} />
      ))}
      <Sfx name="el-pop" at={tenAt} level={-34} />
      <Sfx name="el-whoosh" at={explodesAt} level={-34} />
      <Sfx name="el-tap" at={sgdAt} level={-36} />
      <Sfx name="el-tap" at={miniAt} level={-36} />
      <Sfx name="el-tap" at={adamAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} out={end - 6} size={56}>
          What is gradient descent, and how does the learning rate affect it?
        </QuestionCard>

        <Note at={againstAt - 2} x={LEFTS[0]} y={y(310)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            each step:{" "}
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600 }}>
              x ← x − <span style={{ opacity: ease(frame, sizeAt - 4, 10), color: OK_INK }}>rate</span> × gradient
            </span>
          </span>
        </Note>
        <Note at={startAt - 2} x={LEFTS[0] + 760} y={y(316)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>loss = x², starting at x = {GD.start}</span>
        </Note>

        {runs.map((run, i) => (
          <React.Fragment key={run.rate}>
            <Bowl run={run} drawAt={i === 1 ? asked : startAt - 4 + i * 3} startAt={i === 1 ? againstAt : startAt + i * 3} out={end - 8} />
            <PanelTitle x={run.left} y={y(TOP) - h(66)} at={titles[i].at} color={INK} out={end - 8}>
              <span style={TABULAR}>{titles[i].text}</span>
            </PanelTitle>
            <Note at={labels[i].at} x={run.left} y={y(BOTTOM) + h(18)} out={end - 8}>
              <span style={{ ...note(24, labels[i].ink), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>{labels[i].text}</span>
            </Note>
          </React.Fragment>
        ))}

        {/* ── Three ways to take the step ── */}
        {[
          { at: sgdAt, head: "SGD, stochastic gradient descent", body: "one example a step" },
          { at: miniAt, head: "mini-batch", body: "a few at a time" },
          { at: adamAt, head: "Adam", body: "a step size for each parameter" },
        ].map((s, i) => (
          <Note key={s.head} at={s.at - 2} x={LEFTS[i]} y={y(808)} out={end - 8}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{s.head}</span>
            <br />
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>{s.body}</span>
          </Note>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
