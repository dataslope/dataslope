import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MEMORY, pct } from "./data";
import { at, Axes, DATA, Drift, Given, math, OK_INK, pulse, type Scale, Svg, V, X0 } from "./parts";

const PLOT = { left: 200, right: 1160, top: 420, base: 800 };
const TABLE = { x: 1300, top: 430, row: 74 };

/**
 * Question 9, on the page's own memoryless chart: waits that average twelve
 * minutes, drawn as the chance the wait is still going. Ten more minutes
 * keeps 43% of what is left wherever the ten start, at 0, 10 or 30, so the
 * three windows shade in turn and a table beside them reads the same number
 * three times.
 */
export const MemoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("memory").from;
  const qAt = n.word("memory", "Question");
  const textAt = n.word("memory", "What does memoryless mean");
  const answerAt = n.word("memory", "Time already spent");
  const averageAt = n.word("memory-wait", "waits average twelve minutes");
  const moreAt = n.word("memory-wait", "ten more");
  const pctAt = n.word("memory-wait", "forty-three percent");
  const zeroAt = n.word("memory-wait", "zero minutes");
  const tenAt = n.word("memory-wait", "ten, or thirty");
  const thirtyAt = n.word("memory-wait", "or thirty");
  const otherAt = n.word("memory-wait", "No other continuous distribution");
  const end = n.beat("memory-wait").to;

  const xs: Scale = { lo: 0, hi: 50, a: PLOT.left, b: PLOT.right };
  const ys: Scale = { lo: 0, hi: 1, a: y(PLOT.base), b: y(PLOT.top) };
  const curveP = ease(frame, averageAt, 24);
  const pts = MEMORY.t.map((t, i) => [at(xs, t), at(ys, MEMORY.survive[i])] as const).filter(([x]) => x <= at(xs, 50 * curveP) + 0.01);
  const path = pts.map(([x, v], i) => `${i ? "L" : "M"}${x},${v}`).join(" ");
  const survive = (t: number) => Math.exp(-t / MEMORY.mean);
  const windows = MEMORY.starts.map((s, i) => ({ s, at: [moreAt, tenAt, thirtyAt][i] }));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={answerAt + 2} level={-34} />
      <Sfx name="el-pencil" at={averageAt + 2} level={-34} />
      {windows.map((w) => (
        <Sfx key={w.s} name="el-tap" at={w.at + 2} level={-32} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          What does memoryless mean for the exponential?
        </QuestionCard>

        <Ink at={answerAt} dur={18} style={{ left: X0, top: y(300) }}>
          <span style={math(44)}>
            P(<V>X</V> &gt; <V>s</V> + <V>t</V>
            <Given />
            <V>X</V> &gt; <V>s</V>) = P(<V>X</V> &gt; <V>t</V>)
          </span>
        </Ink>
        <Note at={answerAt + 12} x={X0 + 720} y={y(312)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>time already waited changes nothing</span>
        </Note>

        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 10, 20, 30, 40, 50]}
          yTicks={[0, 0.5, 1]}
          yFormat={(v) => pct(v)}
          xTitle="minutes waited"
          yTitle="chance the wait is still going"
          at={averageAt - 6}
        />
        <Svg>
          {windows.map((w, i) => {
            const p = ease(frame, w.at, 14);
            if (p <= 0) return null;
            const x0 = at(xs, w.s);
            const x1 = at(xs, w.s + MEMORY.extra);
            const glow = pulse(frame, w.at, 24);
            return (
              <g key={i} opacity={p}>
                <rect x={x0} y={at(ys, survive(w.s))} width={x1 - x0} height={y(PLOT.base) - at(ys, survive(w.s))} fill={HIGHLIGHT} opacity={0.5 + 0.4 * glow} />
                <line x1={x0} x2={x0} y1={y(PLOT.base)} y2={at(ys, survive(w.s))} stroke={INK} strokeWidth={1.6} strokeDasharray="4 5" />
                <line x1={x1} x2={x1} y1={y(PLOT.base)} y2={at(ys, survive(w.s + MEMORY.extra))} stroke={INK} strokeWidth={1.6} strokeDasharray="4 5" />
              </g>
            );
          })}
          <path d={path} fill="none" stroke={DATA} strokeWidth={4} />
        </Svg>
        <Note at={averageAt + 10} x={at(xs, 22)} y={at(ys, 0.62)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>waits average 12 minutes</span>
        </Note>

        {/* The same answer, three times. */}
        <Note at={moreAt} x={TABLE.x} y={y(TABLE.top) - 56}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>already waited · chance of 10 more</span>
        </Note>
        {windows.map((w, i) => (
          <Note key={w.s} at={i === 0 ? pctAt : w.at} x={TABLE.x} y={y(TABLE.top) + i * TABLE.row}>
            <span
              style={{
                ...note(32, INK),
                ...TABULAR,
                whiteSpace: "nowrap",
                display: "inline-block",
                width: 180,
                transform: `scale(${1 + 0.08 * (i === 0 ? pulse(frame, zeroAt, 20) : 0)})`,
                transformOrigin: "0 50%",
              }}
            >
              {w.s} min
            </span>
            <span style={{ ...note(34, OK_INK), ...TABULAR, fontWeight: 700, whiteSpace: "nowrap" }}>{pct(MEMORY.exact)}</span>
          </Note>
        ))}
        <Note at={otherAt} x={TABLE.x} y={y(TABLE.top) + 3 * TABLE.row + 30} width={500}>
          <span style={{ ...note(26, INK), fontWeight: 600 }}>No other continuous distribution does that.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
