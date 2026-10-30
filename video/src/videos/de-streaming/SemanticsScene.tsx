import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, DELIVERY } from "./data";
import { Cell, Drift, OK_INK, X0 } from "./parts";

/** Offsets 3 to 10 of one partition; the batch is 5 to 9. */
const FIRST = 3;
const OFFSETS = [3, 4, 5, 6, 7, 8, 9, 10];
const CELLS_X = 480;
const CELL_W = 74;
const STEP = 86;
const CELL_H = 50;
/** Each row's top, in the layout's coordinates. */
const ROW = [320, 450, 580];
const VERDICT_X = 1220;
/** The model's strips: a thousand messages across this many pixels. */
const STRIP = { x: 480, w: 1100, h: 26 };

/**
 * Question 5. One partition read three ways, offsets 5 to 9 as the batch and
 * a crash after 7, the same crash in every row. At-most-once commits to 9
 * first, so 8 and 9 are lost; at-least-once processes first, so after the
 * crash 5 to 7 run again; exactly-once may run them again too, with no second
 * effect. Then the model: a thousand messages, a commit every fifty, three
 * crashes: 54 lost one way, 96 processed twice the other.
 */
export const SemanticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("semantics").from;
  const qAt = n.word("semantics", "Question five");
  const textAt = n.word("semantics", "What is the difference");
  const figAt = n.word("semantics", "and exactly-once");
  const batchAt = n.word("sem-most", "offsets five to nine");
  const crashAt = n.word("sem-most", "a crash just after seven");
  const commitFirstAt = n.word("sem-most", "Commit first");
  const thenProcAt = n.word("sem-most", "then process");
  const skippedAt = n.word("sem-most", "eight and nine are skipped");
  const mostAt = n.word("sem-most", "That's at-most-once");
  const lostAt = n.word("sem-most", "but messages lost");
  const procFirstAt = n.word("sem-least", "Process first");
  const thenCommitAt = n.word("sem-least", "then commit");
  const againAt = n.word("sem-least", "five to seven run again");
  const leastAt = n.word("sem-least", "That's at-least-once");
  const dupAt = n.word("sem-least", "but duplicates");
  const defaultAt = n.word("sem-least", "the usual default");
  const deletedAt = n.word("sem-least", "a message deleted before anyone read it");
  const exactAt = n.word("sem-exact", "Exactly-once means");
  const effectAt = n.word("sem-exact", "one effect on the result");
  const twiceAt = n.word("sem-exact", "it can run twice");
  const nothingAt = n.word("sem-exact", "the second run changes nothing");
  const modelAt = n.word("sem-sim", "Model it");
  const commitEveryAt = n.word("sem-sim", "committed every fifty");
  const threeAt = n.word("sem-sim", "three crashes");
  const losesAt = n.word("sem-sim", "At-most-once loses");
  const twiceSimAt = n.word("sem-sim", "ninety-six of them twice");
  const end = n.beat("sem-sim").to;

  const rowTop = (r: number) => y(ROW[r]);
  const cellsTop = (r: number) => rowTop(r) + h(40);
  const cx = (off: number) => CELLS_X + (off - FIRST) * STEP;
  /** The x of the gap after an offset, where a commit bar stands. */
  const after = (off: number) => cx(off) + CELL_W + (STEP - CELL_W) / 2;
  const crashX = after(7);

  // Each row's run: when each offset is processed (a tick), and when again.
  const tick = (r: number, off: number) => {
    if (r === 0) return off <= 7 ? thenProcAt + 2 + (off - 5) * 4 : undefined;
    if (r === 1) return off <= 7 ? procFirstAt + 2 + (off - 5) * 4 : againAt + 18 + (off - 8) * 4;
    return off <= 7 ? effectAt + (off - 5) * 4 : twiceAt + 18 + (off - 8) * 4;
  };
  const again = (r: number, off: number) => {
    if (off < 5 || off > 7) return undefined;
    if (r === 1) return againAt + 2 + (off - 5) * 4;
    if (r === 2) return twiceAt + 2 + (off - 5) * 4;
    return undefined;
  };
  // Where each row's commit bar stands: after 4, then after 9 when it commits.
  const commitX = (r: number) => {
    const at = r === 0 ? commitFirstAt + 2 : r === 1 ? againAt + 32 : twiceAt + 32;
    return interpolate(ease(frame, at, 14), [0, 1], [after(4), after(9)]);
  };

  const ROWS = [
    { name: "at-most-once", rule: "commit, then process", at: commitFirstAt - 2 },
    { name: "at-least-once", rule: "process, then commit", at: procFirstAt - 2 },
    { name: "exactly-once", rule: "one effect per message", at: exactAt - 2 },
  ];

  const strips = [
    { name: "at-most-once", y: y(790), seg: (b: number, c: number) => [c, b + DELIVERY.batch], at: losesAt, text: `${DELIVERY.lost} lost` },
    { name: "at-least-once", y: y(850), seg: (b: number, c: number) => [b, c], at: twiceSimAt - 6, text: `${DELIVERY.duplicates} processed twice` },
  ];
  const sx = (m: number) => STRIP.x + (m / DELIVERY.messages) * STRIP.w;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={batchAt} level={-37} />
      <Sfx name="el-scratch" at={crashAt + 2} level={-34} />
      <Sfx name="el-tap" at={commitFirstAt + 2} level={-36} />
      <Sfx name="el-scratch" at={skippedAt + 4} level={-36} />
      <Sfx name="el-tap" at={procFirstAt + 2} level={-37} />
      <Sfx name="el-tap" at={againAt + 2} level={-36} />
      <Sfx name="el-pop" at={nothingAt} level={-36} />
      <Sfx name="el-sprinkle" at={threeAt} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={56} width={1500}>
          What is the difference between at-least-once, at-most-once, and exactly-once?
        </QuestionCard>

        {/* Each row's name and rule. */}
        {ROWS.map((r, i) => (
          <Note key={r.name} at={r.at} x={X0} y={cellsTop(i) - h(6)}>
            <div style={{ ...note(28, INK), fontWeight: 750, whiteSpace: "nowrap" }}>{r.name}</div>
            <div style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", marginTop: 2 }}>{r.rule}</div>
          </Note>
        ))}

        {/* The batch, the same in every row. */}
        <div
          style={{
            position: "absolute",
            left: cx(5) - 8,
            top: rowTop(0) - h(6),
            width: cx(9) + CELL_W - cx(5) + 16,
            height: cellsTop(2) + CELL_H + h(10) - rowTop(0) + h(6),
            borderRadius: 12,
            background: `color-mix(in srgb, ${HIGHLIGHT} 45%, transparent)`,
            opacity: ease(frame, batchAt, 12),
          }}
        />
        <Note at={batchAt + 2} x={cx(5)} y={rowTop(0) - h(40)}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            one batch: offsets <Num>5</Num> to <Num>9</Num>
          </span>
        </Note>

        {[0, 1, 2].map((r) => (
          <React.Fragment key={r}>
            {OFFSETS.map((off) => {
              const lost = r === 0 && off >= 8 && off <= 9 ? ease(frame, skippedAt + 4 + (off - 8) * 4, 10) : 0;
              return (
                <Cell
                  key={off}
                  x={cx(off)}
                  y={cellsTop(r)}
                  w={CELL_W}
                  h={CELL_H}
                  plain
                  size={22}
                  opacity={ease(frame, figAt + r * 4 + (off - FIRST) * 1.5, 8)}
                  ring={lost > 0 ? ACCENT : undefined}
                  ringP={lost}
                >
                  {off}
                </Cell>
              );
            })}
            {/* Ticks: processed once, and a second run where there is one. */}
            {OFFSETS.map((off) => {
              const t = tick(r, off);
              const a = again(r, off);
              if (t === undefined || off < 5 || off > 9) return null;
              const p = ease(frame, t, 8);
              const q = a === undefined ? 0 : ease(frame, a, 8);
              const ink = r === 1 ? ACCENT_INK : r === 2 ? OK_INK : INK;
              return (
                <div
                  key={off}
                  style={{
                    position: "absolute",
                    left: cx(off),
                    width: CELL_W,
                    top: cellsTop(r) - h(32),
                    textAlign: "center",
                    ...label(20, INK),
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    opacity: p,
                  }}
                >
                  <span style={{ color: OK_INK }}>✓</span>
                  {q > 0 ? <span style={{ color: ink, opacity: q }}> ×2</span> : null}
                </div>
              );
            })}
            {/* The commit bar. */}
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, figAt + 8 + r * 4, 10) }}>
              <line x1={commitX(r)} x2={commitX(r)} y1={cellsTop(r) - 8} y2={cellsTop(r) + CELL_H + 8} stroke={BAR} strokeWidth={5} strokeLinecap="round" />
            </svg>
          </React.Fragment>
        ))}
        {/* At-least-once means to commit after the batch: here, never reached before the crash. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, thenCommitAt, 10) * (1 - ease(frame, againAt + 30, 8)) }}>
          <line x1={after(9)} x2={after(9)} y1={cellsTop(1) - 8} y2={cellsTop(1) + CELL_H + 8} stroke={BAR} strokeWidth={3} strokeDasharray="5 5" />
        </svg>
        <Note at={figAt + 14} x={after(4) - 60} y={cellsTop(2) + CELL_H + h(14)} out={twiceAt + 30}>
          <span style={{ ...label(20, BAR), fontWeight: 700, whiteSpace: "nowrap" }}>┃ commit</span>
        </Note>

        {/* The crash, after 7 in every row. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, crashAt, 10) }}>
          <line x1={crashX} x2={crashX} y1={rowTop(0) + h(4)} y2={cellsTop(2) + CELL_H + h(4)} stroke={ACCENT} strokeWidth={3} strokeDasharray="7 6" />
        </svg>
        <Note at={crashAt + 2} x={crashX + 10} y={rowTop(0) - h(40)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>✕ crash after 7</span>
        </Note>

        {/* Verdicts. */}
        <Note at={mostAt} x={VERDICT_X} y={cellsTop(0) - h(4)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            no duplicates, but <b style={{ color: ACCENT_INK, opacity: ease(frame, lostAt, 8) > 0.5 ? 1 : 0.25 }}>8 and 9 lost</b>
          </span>
        </Note>
        <Note at={leastAt} x={VERDICT_X} y={cellsTop(1) - h(4)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            nothing lost, but <b style={{ color: ACCENT_INK, opacity: ease(frame, dupAt, 8) > 0.5 ? 1 : 0.25 }}>5 to 7 twice</b>
            <span style={{ ...label(20, INK_SOFT), opacity: ease(frame, defaultAt, 10) }}> · the usual default</span>
          </span>
        </Note>
        <Note at={deletedAt} x={VERDICT_X} y={cellsTop(1) + h(36)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>can't save a message deleted before it was read</span>
        </Note>
        <Note at={effectAt} x={VERDICT_X} y={cellsTop(2) - h(4)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>one effect each on the result</span>
        </Note>
        <Note at={nothingAt} x={VERDICT_X} y={cellsTop(2) + h(36)}>
          <span style={{ ...label(20, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>may run twice; the second run changes nothing</span>
        </Note>

        {/* The model: a thousand messages, twenty batches, three crashes. */}
        <Note at={modelAt} x={X0} y={y(740)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            model: <Num>{count(DELIVERY.messages)}</Num> messages
            <span style={{ opacity: ease(frame, commitEveryAt, 10) }}>
              , a commit every <Num>{DELIVERY.batch}</Num>
            </span>
            <span style={{ opacity: ease(frame, threeAt, 10) }}>
              , <Num>{DELIVERY.crashes.length}</Num> crashes
            </span>
          </span>
        </Note>
        {strips.map((st, si) => (
          <React.Fragment key={st.name}>
            <Note at={modelAt + 4 + si * 4} x={X0} y={st.y - h(2)}>
              <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>{st.name}</span>
            </Note>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <rect
                x={STRIP.x}
                y={st.y}
                width={STRIP.w * ease(frame, modelAt + 4 + si * 4, 16)}
                height={STRIP.h}
                rx={4}
                fill={`color-mix(in srgb, ${BAR} 22%, ${PAPER})`}
              />
              {Array.from({ length: DELIVERY.messages / DELIVERY.batch - 1 }, (_, k) => (
                <line
                  key={k}
                  x1={sx((k + 1) * DELIVERY.batch)}
                  x2={sx((k + 1) * DELIVERY.batch)}
                  y1={st.y}
                  y2={st.y + STRIP.h}
                  stroke={PAPER}
                  strokeWidth={2}
                  opacity={ease(frame, commitEveryAt + k * 0.5, 6)}
                />
              ))}
              {DELIVERY.crashes.map((c, k) => {
                const [a, b] = st.seg(c.batch, c.crash);
                const p = ease(frame, st.at + k * 3, 10);
                return (
                  <g key={k}>
                    <rect x={sx(a)} y={st.y - 3} width={(sx(b) - sx(a)) * p} height={STRIP.h + 6} fill={ACCENT} rx={2} />
                    <line x1={sx(c.crash)} x2={sx(c.crash)} y1={st.y - 8} y2={st.y + STRIP.h + 8} stroke={INK} strokeWidth={2.5} opacity={ease(frame, threeAt + k * 3, 8)} />
                  </g>
                );
              })}
            </svg>
            <Note at={st.at + 6} x={STRIP.x + STRIP.w + 24} y={st.y - h(4)}>
              <span style={{ ...note(25, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
                <Num>{st.text.split(" ")[0]}</Num> {st.text.split(" ").slice(1).join(" ")}
              </span>
            </Note>
          </React.Fragment>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
