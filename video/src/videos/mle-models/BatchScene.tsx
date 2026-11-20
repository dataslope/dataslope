import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BATCH, GD } from "./data";
import { BOWL_LEVELS } from "./GdScene";
import { type Box, Bowl, DATA, Drift, Frame, int, Line, Mark, mulberry32, OK, OK_INK, PanelTitle, scales, StepPath, Svg, Target, X0, at } from "./parts";

const STACK_COLS = 2;
const STACK_ROWS = 50;
const PW = 440;
const LEFTS = [420, 900, 1380];

/** The ten rows one mini-batch step reads, drawn at random (seeded). */
const MINI = (() => {
  const rnd = mulberry32(3);
  const pick = new Set<number>();
  while (pick.size < 10) pick.add(Math.floor(rnd() * 100));
  return pick;
})();

/**
 * Question 2. The page's 100 rows as a stack, lit by how many one step reads:
 * all of them, one, ten, as each is named. Beside it three runs of thirty
 * steps on the bowl, one per batch size, at one rate: batch smooth, single
 * rows wandering, mini-batch between, ringed green as the default. Then the
 * rows each read; the three end about as far along, so none is lit as better.
 */
export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("batch").from;
  const qAt = n.word("batch", "Question two");
  const textAt = n.word("batch", "What's the difference");
  const howAt = n.word("batch", "How many rows each step averages");
  const batchAt = n.word("batch-each", "Batch uses all of them");
  const exactAt = n.word("batch-each", "an exact gradient");
  const wholeAt = n.word("batch-each", "every step reads the whole dataset");
  const sgdAt = n.word("batch-each", "uses one row");
  const cheapAt = n.word("batch-each", "cheap, noisy steps");
  const settleAt = n.word("batch-each", "never quite settle");
  const miniAt = n.word("batch-mini", "Mini-batch");
  const rangeAt = n.word("batch-mini", "thirty-two to five hundred and twelve rows");
  const defaultAt = n.word("batch-mini", "is the default");
  const lessAt = n.word("batch-mini", "less noise");
  const multiplyAt = n.word("batch-mini", "one matrix multiply");
  const thirtyAt = n.word("batch-run", "Thirty steps each");
  const threeKAt = n.word("batch-run", "reads three thousand rows");
  const farAt = n.word("batch-run", "get about as far");
  const readThirtyAt = n.word("batch-run", "and read thirty");
  const end = n.beat("batch-run").to;

  // The stack: 100 rows, two columns of fifty.
  const sx0 = X0;
  const sTop = y(420);
  const stripW = 64;
  const stripH = h(4.4);
  const stripGap = h(1.6);
  const litOf = (i: number) => {
    const all = ease(frame, batchAt, 10) * (1 - ease(frame, sgdAt - 2, 8));
    const one = i === 0 ? ease(frame, sgdAt, 8) * (1 - ease(frame, miniAt - 2, 8)) : 0;
    const ten = MINI.has(i) ? ease(frame, miniAt, 8) * (1 - ease(frame, thirtyAt - 2, 10)) : 0;
    return Math.max(all, one, ten);
  };

  // The three panels share one window on the bowl.
  const ph = h(254);
  const pTop = y(420);
  const ols: [number, number] = [GD.ols[1], GD.ols[2]];
  const panels = [
    { key: "batch" as const, name: "Batch: all 100 rows", at: batchAt, run: BATCH.runs.batch, notes: ["Exact gradient, smooth path", "Every step reads every row"], noteAt: [exactAt, wholeAt] },
    { key: "single" as const, name: "SGD: 1 row", at: sgdAt, run: BATCH.runs.single, notes: ["Cheap, noisy steps", "Never quite settles"], noteAt: [cheapAt, settleAt] },
    { key: "mini" as const, name: "Mini-batch: 10 rows", at: miniAt, run: BATCH.runs.mini, notes: ["Typically 32 to 512 rows", "Less noise", "One matrix multiply"], noteAt: [rangeAt, lessAt, multiplyAt] },
  ];
  const readAt = { batch: threeKAt, single: readThirtyAt, mini: readThirtyAt + 8 };
  const ring = ease(frame, defaultAt - 2, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={batchAt} level={-34} />
      <Sfx name="el-tap" at={sgdAt} level={-30} />
      <Sfx name="el-sprinkle" at={miniAt} level={-36} />
      <Sfx name="el-pencil" at={defaultAt - 2} level={-35} />
      {panels.map((p) => (
        <Sfx key={p.key} name="el-whoosh" at={p.at + 6} level={-37} />
      ))}
      <Sfx name="el-tap" at={threeKAt} level={-31} />
      <Sfx name="el-tap" at={readThirtyAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={52}>
          What&apos;s the difference between batch gradient descent, SGD, and mini-batch GD?
        </QuestionCard>
        <Line at={howAt - 2} x={X0} y={y(300)} size={30}>
          <Mark at={howAt + 4}>How many rows each step averages</Mark>
        </Line>

        {/* ── The page's 100 rows ── */}
        <Line at={howAt + 4} x={sx0} y={y(378)} size={22} color={INK_SOFT}>
          100 rows
        </Line>
        <Svg opacity={ease(frame, howAt + 4, 12)}>
          {Array.from({ length: STACK_COLS * STACK_ROWS }, (_, i) => {
            const c = Math.floor(i / STACK_ROWS);
            const r = i % STACK_ROWS;
            const l = litOf(i);
            return (
              <rect
                key={i}
                x={sx0 + c * (stripW + 12)}
                y={sTop + r * (stripH + stripGap)}
                width={stripW}
                height={stripH}
                rx={1.5}
                fill={l > 0 ? `color-mix(in srgb, ${ds("blue", 600)} ${l * 100}%, ${ds("blue", 100)})` : ds("blue", 100)}
              />
            );
          })}
        </Svg>

        {/* ── Thirty steps each, at one rate ── */}
        <Line at={thirtyAt - 2} x={LEFTS[1]} y={y(300)} size={30} color={INK}>
          {BATCH.updates} steps each at rate {BATCH.rate}
          <span style={{ opacity: ease(frame, farAt - 2, 10) }}>: all end about as far along</span>
        </Line>
        {panels.map((p, i) => {
          const box: Box = { left: LEFTS[i], top: pTop, width: PW, height: ph };
          const unit = PW / 2.6;
          const { x: px, y: py } = scales(box, [-0.3, 2.3], [-1.38, -1.38 + ph / unit]);
          return (
            <React.Fragment key={p.key}>
              <PanelTitle x={box.left} y={box.top - h(52)} at={p.at - 2}>
                {p.key === "mini" ? (
                  <span
                    style={{
                      display: "inline-block",
                      margin: "-4px -12px",
                      padding: "2px 10px",
                      borderRadius: 8,
                      border: `2.4px solid color-mix(in srgb, ${OK} ${ring * 100}%, transparent)`,
                      color: `color-mix(in srgb, ${OK_INK} ${ring * 100}%, ${INK})`,
                    }}
                  >
                    {p.name}
                  </span>
                ) : (
                  p.name
                )}
              </PanelTitle>
              <Frame box={box} at={p.at - 4} />
              <Bowl H={GD.bowl} centre={ols} levels={BOWL_LEVELS} x={px} y={py} at={p.at - 2} clip={box} />
              <Target px={[at(px, ols[0]), at(py, ols[1])]} at={p.at} ring={false} />
              <StepPath path={p.run.path} x={px} y={py} at={p.at + 8} every={3} color={DATA} r={3.6} clip={box} />
              {p.notes.map((t, k) => (
                <Line key={t} at={p.noteAt[k] - 2} x={box.left} y={box.top + box.height + h(24) + k * h(38)} size={23} color={p.key === "mini" && k === 0 ? OK_INK : INK}>
                  {t}
                </Line>
              ))}
              <Line at={readAt[p.key] - 2} x={box.left} y={box.top + box.height + h(160)} size={26}>
                Rows read: <span style={{ color: DATA }}>{int(p.run.rowsRead)}</span>
              </Line>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
