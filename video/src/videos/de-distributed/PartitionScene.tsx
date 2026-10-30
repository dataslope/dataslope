import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { caseOf, count, PARTS } from "./data";
import { Drift, Machine, OK, OK_INK, Svg } from "./parts";

const G_X = 120;
const CELL_W = 112;
const CELL_GAP = 14;
const CELL_TOP = 440;
const CELL_PITCH = 98;
const CELL_H = 84;
const R_X = 760;
const ROW0 = 430;
const ROW_PITCH = 104;

const FEW = caseOf(4);
const MANY = caseOf(100_000);
const RIGHT = caseOf(64);

const mb = (v: number) => (v >= 1000 ? `${v / 1000} GB` : v >= 1 ? `${v} MB` : `${Math.round(v * 1000)} KB`);

/**
 * Question 5. The video's own sixteen gigabytes on sixteen cores, drawn as a
 * grid of cores. Four partitions of 4 GB fill four cores and leave twelve
 * idle; a hundred thousand of 160 KB give every core a stream of tasks that
 * are mostly scheduling; sixty-four of 250 MB give every core four. Then the
 * two ways to change the count: repartition (a full shuffle, its lines
 * crossing) and coalesce (neighbours merge, nothing crosses).
 */
export const PartitionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("partitions").from;
  const qAt = n.word("partitions", "Question five");
  const textAt = n.word("partitions", "What is a partition in Spark");
  const unitAt = n.word("partitions", "the unit of parallelism");
  const taskAt = n.word("partitions", "one task works on one partition");
  const coreAt = n.word("partitions", "on one core");
  const modelAt = n.word("partitions", "Model it with sixteen gigabytes");
  const coresAt = n.word("partitions", "on sixteen cores");
  const fewAt = n.word("part-few", "In four partitions");
  const idleAt = n.word("part-few", "twelve cores sit idle");
  const oomAt = n.word("part-few", "run out of memory");
  const manyAt = n.word("part-many", "In a hundred thousand");
  const schedAt = n.word("part-many", "scheduling the tiny tasks");
  const rightAt = n.word("part-right", "The rough target");
  const fewHundredAt = n.word("part-right", "a few hundred megabytes");
  const twoFourAt = n.word("part-right", "two to four times");
  const sixtyAt = n.word("part-right", "Sixty-four of two hundred fifty");
  const bothAt = n.word("part-right", "meets both");
  const repAt = n.word("part-change", "Repartition shuffles");
  const coalAt = n.word("part-change", "Coalesce only merges");
  const noShuffleAt = n.word("part-change", "no full shuffle");
  const writeAt = n.word("part-change", "before writing");
  const end = n.beat("part-change").to;

  const cellX = (c: number) => G_X + (c % 4) * (CELL_W + CELL_GAP);
  const cellTop = (c: number) => y(CELL_TOP + Math.floor(c / 4) * CELL_PITCH);
  const cellH = h(CELL_H);
  const showFew = during(frame, fewAt, manyAt, 10);
  const showMany = during(frame, manyAt, rightAt, 10);
  const showRight = ease(frame, sixtyAt - 2, 12);
  const idle = ease(frame, idleAt, 10) * (1 - ease(frame, manyAt, 10));
  const caseRow = (k: number) => y(ROW0 + k * ROW_PITCH);
  const band = (at: number, out: number) => during(frame, at, out, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={coresAt} level={-37} />
      <Sfx name="el-tap" at={fewAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={manyAt + 2} level={-35} />
      <Sfx name="el-tap" at={sixtyAt} level={-35} />
      <Sfx name="el-whoosh" at={repAt + 2} level={-37} />
      <Sfx name="el-pencil" at={coalAt + 2} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a partition in Spark, and why does partition count matter?
        </QuestionCard>

        {/* One partition, one task, one core. */}
        <Note at={unitAt - 2} x={R_X} y={y(318)}>
          <span style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap", ...note(25, INK) }}>
            <span style={{ ...label(24, BLUE_INK), fontWeight: 700 }}>1 partition</span>
            <span style={{ opacity: ease(frame, taskAt, 10) }}>
              → <b>1 task</b>
            </span>
            <span style={{ opacity: ease(frame, coreAt, 10) }}>
              → <b>1 core</b>
            </span>
            <span style={{ opacity: ease(frame, unitAt + 4, 10), color: INK_SOFT, fontSize: 22 }}>: the unit of parallelism</span>
          </span>
        </Note>

        {/* The cluster: sixteen cores, and the data. */}
        <Note at={modelAt - 2} x={G_X} y={y(384)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            A model: <Num>{PARTS.gb}</Num> GB<span style={{ opacity: ease(frame, coresAt, 10) }}> on <Num>{PARTS.cores}</Num> cores</span>
          </span>
        </Note>
        {Array.from({ length: PARTS.cores }, (_, c) => (
          <Machine
            key={c}
            x={cellX(c)}
            top={cellTop(c)}
            width={CELL_W}
            height={cellH}
            at={coresAt + c}
            tone={c >= FEW.partitions && idle > 0 ? "idle" : showRight > 0.5 ? "ok" : "plain"}
            toneAt={c >= FEW.partitions && idle > 0 ? idleAt : showRight > 0.5 ? sixtyAt : undefined}
          />
        ))}

        {/* Four partitions: four busy cores, twelve idle. */}
        {showFew > 0
          ? Array.from({ length: FEW.partitions }, (_, c) => {
              const p = ease(frame, fewAt + 2 + c * 3, 12);
              const warn = ease(frame, oomAt, 10);
              return (
                <div
                  key={c}
                  style={{
                    position: "absolute",
                    left: cellX(c) + 8,
                    top: cellTop(c) + 8,
                    width: CELL_W - 16,
                    height: (cellH - 16) * p,
                    background: `color-mix(in srgb, ${BAR} 40%, ${PAPER})`,
                    border: `2px solid ${warn > 0.5 ? ACCENT : BAR}`,
                    borderRadius: 4,
                    opacity: showFew,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(20, INK),
                  }}
                >
                  {p > 0.6 ? mb(FEW.mb) : null}
                </div>
              );
            })
          : null}
        {showFew > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: showFew * idle }}>
            {Array.from({ length: PARTS.cores - FEW.partitions }, (_, k) => {
              const c = k + FEW.partitions;
              return (
                <div key={c} style={{ position: "absolute", left: cellX(c), top: cellTop(c) + cellH / 2 - 13, width: CELL_W, textAlign: "center", ...label(20, INK_SOFT) }}>
                  idle
                </div>
              );
            })}
          </div>
        ) : null}

        {/* A hundred thousand: every core a stream of tiny tasks, mostly scheduling. */}
        {showMany > 0 ? (
          <Svg opacity={showMany}>
            {Array.from({ length: PARTS.cores }, (_, c) =>
              Array.from({ length: 9 }, (_, r) => {
                const p = ease(frame, manyAt + 2 + c + r, 8);
                const sched = ease(frame, schedAt, 10);
                const ry = cellTop(c) + 8 + r * ((cellH - 16) / 9);
                const rh = (cellH - 16) / 9 - 2;
                const work = 18;
                return p > 0 ? (
                  <g key={`${c}-${r}`} opacity={p}>
                    <rect x={cellX(c) + 8} y={ry} width={work} height={rh} fill={BAR} rx={1.5} />
                    <rect x={cellX(c) + 8 + work + 2} y={ry} width={(CELL_W - 16 - work - 2) * sched} height={rh} fill={ds("gray", 300)} rx={1.5} />
                  </g>
                ) : null;
              }),
            )}
          </Svg>
        ) : null}

        {/* Sixty-four: four per core. */}
        {showRight > 0 ? (
          <Svg>
            {Array.from({ length: PARTS.cores }, (_, c) =>
              Array.from({ length: RIGHT.perCore }, (_, r) => {
                const p = ease(frame, sixtyAt + c + r * 3, 10);
                const ry = cellTop(c) + 8 + r * ((cellH - 16) / RIGHT.perCore);
                const rh = (cellH - 16) / RIGHT.perCore - 4;
                return <rect key={`${c}-${r}`} x={cellX(c) + 8} y={ry} width={(CELL_W - 16) * p} height={rh} fill={`color-mix(in srgb, ${BAR} 45%, ${PAPER})`} stroke={BAR} strokeWidth={1.4} rx={3} />;
              }),
            )}
          </Svg>
        ) : null}

        {/* The three counts, as the narration takes each. */}
        {[
          { at: fewAt, out: manyAt, k: 0 },
          { at: manyAt, out: rightAt, k: 1 },
          { at: sixtyAt - 2, out: repAt, k: 2 },
        ].map((b) => {
          const o = band(b.at, b.out);
          return o > 0 ? (
            <div key={b.k} style={{ position: "absolute", left: R_X - 14, top: caseRow(b.k) - 8, width: 1000, height: h(84), background: HIGHLIGHT, opacity: o * 0.5, borderRadius: 6 }} />
          ) : null;
        })}
        <Note at={fewAt - 2} x={R_X} y={caseRow(0)}>
          <span style={{ ...note(29, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{FEW.partitions}</Num> partitions of <Num>{mb(FEW.mb)}</Num>
          </span>
          <span style={{ display: "block", ...note(23, ACCENT_INK), whiteSpace: "nowrap", marginTop: 4 }}>
            <span style={{ opacity: ease(frame, idleAt, 10) }}>
              <Num>{FEW.idle}</Num> cores idle
            </span>
            <span style={{ opacity: ease(frame, oomAt, 10) }}> · can run out of memory</span>
          </span>
        </Note>
        <Note at={manyAt - 2} x={R_X} y={caseRow(1)}>
          <span style={{ ...note(29, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{count(MANY.partitions)}</Num> of <Num>{mb(MANY.mb)}</Num>
          </span>
          <span style={{ display: "block", ...note(23, ACCENT_INK), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, schedAt, 10) }}>
            scheduling costs more than the work
          </span>
        </Note>
        <Note at={fewHundredAt - 2} x={R_X} y={caseRow(2)}>
          <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap", fontWeight: 650 }}>
            target: a few hundred MB a partition
            <span style={{ opacity: ease(frame, twoFourAt, 10) }}>, 2 to 4 × the cores</span>
          </span>
          <span style={{ display: "block", ...note(29, INK), fontWeight: 700, whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, sixtyAt - 2, 10) }}>
            <Num>{RIGHT.partitions}</Num> of <Num>{mb(RIGHT.mb)}</Num>, <Num>{RIGHT.perCore}</Num> per core
            <span style={{ color: OK_INK, opacity: ease(frame, bothAt, 10) }}> ✓</span>
          </span>
        </Note>

        {/* Changing the count. */}
        <Repartition x={R_X} top={y(760)} at={repAt} labelAt={repAt} h={h} />
        <Coalesce x={R_X + 520} top={y(760)} at={coalAt} labelAt={noShuffleAt} writeAt={writeAt} h={h} />
      </Drift>
    </AbsoluteFill>
  );
};

const MINI_W = 70;
const MINI_PITCH = 25;

/** Four partitions into six through a full shuffle: every new one draws from every old one. */
const Repartition: React.FC<{ x: number; top: number; at: number; labelAt: number; h: (v: number) => number }> = ({ x, top, at, labelAt, h }) => {
  const frame = useCurrentFrame();
  const pitch = h(MINI_PITCH);
  const bh = pitch - 6;
  const x2 = x + 230;
  const oldY = (i: number) => top + h(48) + pitch + i * pitch;
  const newY = (j: number) => top + h(48) + j * pitch;
  return (
    <>
      <Note at={labelAt - 2} x={x} y={top}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b>repartition</b>: <span style={{ color: ACCENT_INK }}>a full shuffle</span>
        </span>
      </Note>
      <Svg>
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`o${i}`} x={x} y={oldY(i)} width={MINI_W * ease(frame, at + i, 8)} height={bh} rx={2} fill={`color-mix(in srgb, ${BAR} 40%, ${PAPER})`} stroke={BAR} strokeWidth={1.2} />
        ))}
        {Array.from({ length: 4 }, (_, i) =>
          Array.from({ length: 6 }, (_, j) => {
            const p = ease(frame, at + 8 + j * 2, 12);
            const ax = x + MINI_W + 4;
            const ay = oldY(i) + bh / 2;
            const bx = x2 - 4;
            const by = newY(j) + bh / 2;
            return p > 0 ? (
              <line key={`${i}-${j}`} x1={ax} y1={ay} x2={ax + (bx - ax) * p} y2={ay + (by - ay) * p} stroke={ACCENT} strokeWidth={1} opacity={0.55} />
            ) : null;
          }),
        )}
        {Array.from({ length: 6 }, (_, j) => (
          <rect key={`n${j}`} x={x2} y={newY(j)} width={MINI_W * ease(frame, at + 18 + j * 2, 8)} height={bh} rx={2} fill={`color-mix(in srgb, ${BAR} 40%, ${PAPER})`} stroke={BAR} strokeWidth={1.2} />
        ))}
      </Svg>
    </>
  );
};

/** Four partitions into two: neighbours merge where they sit, and nothing crosses. */
const Coalesce: React.FC<{ x: number; top: number; at: number; labelAt: number; writeAt: number; h: (v: number) => number }> = ({ x, top, at, labelAt, writeAt, h }) => {
  const frame = useCurrentFrame();
  const pitch = h(MINI_PITCH);
  const bh = pitch - 6;
  const x2 = x + 200;
  const oldY = (i: number) => top + h(48) + pitch + i * pitch;
  return (
    <>
      <Note at={at - 2} x={x} y={top}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b>coalesce</b>
          <span style={{ opacity: ease(frame, labelAt, 10), color: OK_INK }}>: merges, no full shuffle</span>
        </span>
      </Note>
      <Svg>
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`o${i}`} x={x} y={oldY(i)} width={MINI_W * ease(frame, at + i, 8)} height={bh} rx={2} fill={`color-mix(in srgb, ${BAR} 40%, ${PAPER})`} stroke={BAR} strokeWidth={1.2} />
        ))}
        {Array.from({ length: 2 }, (_, j) => {
          const p = ease(frame, at + 10 + j * 3, 12);
          const top2 = oldY(j * 2);
          const bottom2 = oldY(j * 2 + 1) + bh;
          return (
            <g key={j} opacity={p}>
              <path
                d={`M${x + MINI_W + 4},${oldY(j * 2) + bh / 2} L${x + MINI_W + 30},${oldY(j * 2) + bh / 2} L${x + MINI_W + 30},${oldY(j * 2 + 1) + bh / 2} L${x + MINI_W + 4},${oldY(j * 2 + 1) + bh / 2} M${x + MINI_W + 30},${(top2 + bottom2) / 2} L${x2 - 6},${(top2 + bottom2) / 2}`}
                fill="none"
                stroke={OK}
                strokeWidth={1.6}
              />
              <rect x={x2} y={top2} width={MINI_W * p} height={bottom2 - top2} rx={2} fill={`color-mix(in srgb, ${BAR} 40%, ${PAPER})`} stroke={BAR} strokeWidth={1.2} />
            </g>
          );
        })}
      </Svg>
      <Note at={writeAt - 2} x={x2 + MINI_W + 24} y={oldY(1)}>
        <span style={{ ...note(22, INK_SOFT), display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
          cheap: use it
          <br />
          before writing
        </span>
      </Note>
    </>
  );
};
