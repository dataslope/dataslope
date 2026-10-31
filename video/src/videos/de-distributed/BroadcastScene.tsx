import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { BROADCAST } from "./data";
import { Curve, Drift, Machine, OK, OK_INK, Svg } from "./parts";

const DIM = ds("purple", 500);
const wash = (c: string, k = 30) => `color-mix(in srgb, ${c} ${k}%, ${PAPER})`;

// ── Broadcast panel ──
const EX_X = 120;
const EX_W = 380;
const EX_H = 70;
const EX_TOPS = [430, 520, 610, 700];
const FACT_W = 190;
const LOOK_W = 76;
const SRC_X = 560;
const SRC_TOP = 360;
const NOTE_X = 560;

// ── Sort-merge panel ──
const R0 = 1060;
const SRC_W = 156;
const CHIP = 40;
const CHIP_GAP = 6;
const CO_X = 1440;
const CO_W = 250;
const CO_TOPS = [384, 520, 656];
const CO_H = 112;
/** The keys each side's partitions hold, and the three key ranges they shuffle into. */
const FACT = [
  [5, 1, 8],
  [3, 7, 2],
];
const DIMS = [
  [2, 8, 4],
  [7, 1, 5],
];
const SRC_TOPS = [392, 452, 572, 632];
const rangeOf = (k: number) => (k <= 3 ? 0 : k <= 6 ? 1 : 2);
const RANGES = ["keys 1 to 3", "keys 4 to 6", "keys 7 to 9"];

/**
 * Questions 10 and 11, side by side. Broadcast: the small lookup flies, whole,
 * to each of four executors, and each joins its own slice of the big table
 * where it sits; then the page's concept-check sizes on fifty executors: one
 * gigabyte on the network. Sort-merge: both sides' partitions shuffle into
 * three key ranges (red, crossing), each sorts, then merges in one pass
 * (green links); here about two terabytes would cross the network.
 */
export const BroadcastScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("broadcast").from;
  const qAt = n.word("broadcast", "Question ten");
  const textAt = n.word("broadcast", "What is a broadcast join");
  const shipAt = n.word("broadcast", "Ship the small table");
  const everyAt = n.word("broadcast", "to every executor");
  const joinAt = n.word("broadcast", "join the big one where it sits");
  const noShuffleAt = n.word("broadcast", "with no shuffle");
  const fitsAt = n.word("broadcast", "fits comfortably in memory");
  const lookupAt = n.word("broadcast", "like a lookup table");
  const caseAt = n.word("bc-model", "The page's case");
  const tbAt = n.word("bc-model", "a two terabyte fact table");
  const mbAt = n.word("bc-model", "a twenty megabyte lookup");
  const fiftyAt = n.word("bc-model", "Broadcast to fifty executors");
  const gbAt = n.word("bc-model", "one gigabyte on the network");
  const thresholdAt = n.word("bc-model", "Below a size threshold");
  const hintAt = n.word("bc-model", "a hint forces it");
  const q11At = n.word("smj", "Question eleven");
  const text11At = n.word("smj", "What is a sort-merge join");
  const defaultAt = n.word("smj", "Spark's default for two large tables");
  const bothAt = n.word("smj", "shuffle both sides on the join key");
  const sortAt = n.word("smj", "sort each partition");
  const mergeAt = n.word("smj", "merge them in one pass");
  const anyAt = n.word("smj-cost", "It handles any size");
  const twoTbAt = n.word("smj-cost", "about two terabytes");
  const oneGbAt = n.word("smj-cost", "against one gigabyte");
  const smallAt = n.word("smj-cost", "Broadcast when one side is small");
  const largeAt = n.word("smj-cost", "sort-merge when both are large");
  const end = n.beat("smj-cost").to;

  const exMid = (k: number) => y(EX_TOPS[k]) + h(EX_H) / 2;
  const factTop = (k: number) => exMid(k) - h(20);
  const chipH = h(30);
  const sorted = ease(frame, sortAt + 2, 16);
  const merged = ease(frame, mergeAt, 12);

  // Each co-partition's rows: where they came from, unsorted and sorted.
  const co = [0, 1, 2].map((r) => {
    const f = FACT.flatMap((p, pi) => p.filter((k) => rangeOf(k) === r).map((k) => ({ k, src: pi })));
    const d = DIMS.flatMap((p, pi) => p.filter((k) => rangeOf(k) === r).map((k) => ({ k, src: 2 + pi })));
    const order = (rows: { k: number }[]) => rows.map((row) => [...rows].sort((a, b) => a.k - b.k).indexOf(row));
    return { f, d, fOrder: order(f), dOrder: order(d) };
  });
  const chipX = (slot: number, sortedSlot: number) => CO_X + 14 + (slot + (sortedSlot - slot) * sorted) * (CHIP + CHIP_GAP);
  const factRowY = (r: number) => y(CO_TOPS[r]) + h(14);
  const dimRowY = (r: number) => y(CO_TOPS[r]) + h(CO_H) - h(14) - chipH;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={everyAt} level={-35} />
      <Sfx name="el-tap" at={joinAt + 6} level={-36} />
      <Sfx name="el-tap" at={gbAt} level={-35} />
      <Sfx name="el-whoosh" at={bothAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={sortAt + 2} level={-37} />
      <Sfx name="el-pencil" at={mergeAt} level={-36} />
      <Sfx name="el-chime" at={smallAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={58} out={q11At - 6}>
          What is a broadcast join and when should you use it?
        </QuestionCard>
        <QuestionCard n={11} at={q11At - 2} textAt={text11At - 2} size={56}>
          What is a sort-merge join, and how does it differ from a broadcast join?
        </QuestionCard>

        {/* ── Broadcast ── */}
        <Note at={shipAt - 2} x={EX_X} y={y(316)}>
          <span style={{ ...label(27, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Broadcast join</span>
        </Note>
        <Note at={shipAt} x={SRC_X} y={y(SRC_TOP) - h(34)}>
          <span style={{ ...label(20, inkOf.purple), whiteSpace: "nowrap" }}>small lookup</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: SRC_X,
            top: y(SRC_TOP),
            width: LOOK_W,
            height: h(40),
            background: wash(DIM),
            borderLeft: `4px solid ${DIM}`,
            borderRadius: 3,
            opacity: ease(frame, shipAt, 10),
          }}
        />
        {EX_TOPS.map((_, k) => {
          const land = ease(frame, everyAt + 8 + k * 3, 10);
          const joined = ease(frame, joinAt + 4 + k * 3, 10);
          return (
            <React.Fragment key={k}>
              <Machine x={EX_X} top={y(EX_TOPS[k])} width={EX_W} height={h(EX_H)} at={shipAt + 2 + k * 2} tone="ok" toneAt={noShuffleAt} />
              <div style={{ position: "absolute", left: EX_X + 12, top: exMid(k) - 12, ...label(19, INK_SOFT), opacity: ease(frame, shipAt + 4 + k * 2, 10) * (1 - joined), whiteSpace: "nowrap" }}>
                {k + 1}
              </div>
              <div style={{ position: "absolute", left: EX_X + 8, top: exMid(k) - 17, ...label(26, OK_INK), fontWeight: 800, opacity: joined }}>✓</div>
              <div
                style={{
                  position: "absolute",
                  left: EX_X + 40,
                  top: factTop(k),
                  width: FACT_W * ease(frame, shipAt + 4 + k * 2, 12),
                  height: h(40),
                  background: wash(BAR, 34),
                  borderLeft: `4px solid ${BAR}`,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10,
                  boxSizing: "border-box",
                  ...label(19, INK),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  opacity: ease(frame, shipAt + 4 + k * 2, 8),
                }}
              >
                big table, part {k + 1}
              </div>
              <Curve from={[SRC_X - 6, y(SRC_TOP) + h(20)]} to={[EX_X + 40 + FACT_W + 12 + LOOK_W + 8, exMid(k)]} at={everyAt + k * 3} dur={14} color={DIM} width={1.8} head={10} opacity={0.8} />
              <div
                style={{
                  position: "absolute",
                  left: EX_X + 40 + FACT_W + 10,
                  top: factTop(k),
                  width: LOOK_W,
                  height: h(40),
                  background: wash(DIM),
                  borderLeft: `4px solid ${DIM}`,
                  borderRadius: 3,
                  opacity: land,
                }}
              />
            </React.Fragment>
          );
        })}
        <Note at={noShuffleAt - 2} x={EX_X} y={y(EX_TOPS[3]) + h(EX_H) + h(12)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>joined where it sits: no shuffle</span>
        </Note>
        <Note at={fitsAt - 2} x={NOTE_X} y={y(436)} out={caseAt}>
          <span style={{ ...note(23, INK), display: "block", lineHeight: 1.35, whiteSpace: "nowrap" }}>
            when one side fits
            <br />
            comfortably in memory<span style={{ opacity: ease(frame, lookupAt, 10) }}>:</span>
            <br />
            <span style={{ opacity: ease(frame, lookupAt, 10) }}>a lookup table</span>
          </span>
        </Note>
        <Note at={caseAt} x={NOTE_X} y={y(436)}>
          <span style={{ ...note(23, INK), display: "block", lineHeight: 1.4, whiteSpace: "nowrap" }}>
            <span style={{ ...label(20, INK_SOFT) }}>the page&apos;s case</span>
            <br />
            <span style={{ opacity: ease(frame, tbAt, 10) }}>
              <Num>{BROADCAST.factTB}</Num> TB fact table
            </span>
            <br />
            <span style={{ opacity: ease(frame, mbAt, 10) }}>
              <Num>{BROADCAST.dimMB}</Num> MB lookup
            </span>
            <br />
            <span style={{ opacity: ease(frame, fiftyAt, 10) }}>
              × <Num>{BROADCAST.executors}</Num> executors
            </span>
            <span style={{ opacity: ease(frame, gbAt, 10), color: OK_INK, fontWeight: 700 }}>
              {" = "}
              <span style={{ position: "relative", padding: "0 4px", borderRadius: 4, background: ease(frame, oneGbAt, 10) > 0 ? HIGHLIGHT : undefined }}>
                <Num>{BROADCAST.broadcastMB / 1000}</Num> GB
              </span>
            </span>
          </span>
        </Note>
        <Note at={thresholdAt - 2} x={NOTE_X} y={y(640)}>
          <span style={{ ...label(20, INK_SOFT), display: "block", whiteSpace: "nowrap" }}>automatic below</span>
          <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: INK, fontVariantLigatures: "none", whiteSpace: "nowrap" }}>
            spark.sql.autoBroadcastJoinThreshold
          </span>
        </Note>
        <Note at={hintAt - 2} x={NOTE_X} y={y(714)}>
          <span style={{ ...label(20, INK_SOFT), display: "block", whiteSpace: "nowrap" }}>or hint it</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: INK, fontVariantLigatures: "none", whiteSpace: "nowrap" }}>
            broadcast(small_dim)
          </span>
        </Note>

        {/* ── Sort-merge ── */}
        <div style={{ position: "absolute", left: 1010, top: y(330), width: 1.5, height: y(860) - y(330), background: `color-mix(in srgb, ${INK_SOFT} 30%, transparent)`, opacity: ease(frame, q11At, 12) }} />
        <Note at={defaultAt - 2} x={R0} y={y(316)}>
          <span style={{ ...label(27, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Sort-merge join</span>
        </Note>
        {[...FACT, ...DIMS].map((keys, s) => {
          const isDim = s >= 2;
          const c = isDim ? DIM : BAR;
          const p = ease(frame, defaultAt + 2 + s * 2, 12);
          return (
            <React.Fragment key={s}>
              <div
                style={{
                  position: "absolute",
                  left: R0,
                  top: y(SRC_TOPS[s]),
                  width: SRC_W,
                  height: h(46),
                  background: wash(c, 16),
                  border: `1.5px solid ${wash(c, 60)}`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: CHIP_GAP,
                  paddingLeft: 8,
                  boxSizing: "border-box",
                  opacity: p,
                }}
              >
                {keys.map((k) => (
                  <span key={k} style={{ width: CHIP, textAlign: "center", ...note(21, INK), fontWeight: 600 }}>
                    {k}
                  </span>
                ))}
              </div>
              {keys.map((k) => {
                const r = rangeOf(k);
                const list = isDim ? co[r].d : co[r].f;
                const slot = list.findIndex((row) => row.k === k);
                return (
                  <Curve
                    key={k}
                    from={[R0 + SRC_W + 6, y(SRC_TOPS[s]) + h(23)]}
                    to={[CO_X - 8, (isDim ? dimRowY(r) : factRowY(r)) + chipH / 2 + (slot - 1) * 3]}
                    at={bothAt + 2 + s * 3}
                    dur={18}
                    color={ACCENT}
                    width={1.4}
                    head={9}
                    opacity={0.75}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
        <Note at={defaultAt} x={R0} y={y(SRC_TOPS[0]) - h(36)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>both sides large</span>
        </Note>
        <Note at={bothAt + 4} x={R0} y={y(SRC_TOPS[3]) + h(66)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>both shuffled</span>
        </Note>
        {co.map((c, r) => {
          const p = ease(frame, bothAt + 10 + r * 3, 12);
          return (
            <React.Fragment key={r}>
              <Machine x={CO_X} top={y(CO_TOPS[r])} width={CO_W} height={h(CO_H)} at={bothAt + 6 + r * 3} />
              <Note at={bothAt + 8 + r * 3} x={CO_X + CO_W + 14} y={y(CO_TOPS[r]) + h(CO_H) / 2 - 14}>
                <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>{RANGES[r]}</span>
              </Note>
              {/* The pointer that walks both sorted rows once. */}
              {merged > 0 && merged < 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: CO_X + 10 + merged * (CO_W - 30),
                    top: y(CO_TOPS[r]) + 6,
                    width: 8,
                    height: h(CO_H) - 12,
                    background: HIGHLIGHT,
                    borderRadius: 3,
                  }}
                />
              ) : null}
              <Svg>
                {c.f.map((row, i) =>
                  c.d.map((drow, j) =>
                    row.k === drow.k ? (
                      <line
                        key={`${i}-${j}`}
                        x1={chipX(i, c.fOrder[i]) + CHIP / 2}
                        y1={factRowY(r) + chipH}
                        x2={chipX(j, c.dOrder[j]) + CHIP / 2}
                        y2={dimRowY(r)}
                        stroke={OK}
                        strokeWidth={3}
                        opacity={ease(frame, mergeAt + 4 + r * 4, 10)}
                      />
                    ) : null,
                  ),
                )}
              </Svg>
              {c.f.map((row, i) => (
                <Key key={`f${i}`} k={row.k} color={BAR} x={chipX(i, c.fOrder[i])} top={factRowY(r)} h={chipH} o={p} />
              ))}
              {c.d.map((row, j) => (
                <Key key={`d${j}`} k={row.k} color={DIM} x={chipX(j, c.dOrder[j])} top={dimRowY(r)} h={chipH} o={p} />
              ))}
            </React.Fragment>
          );
        })}
        <Note at={sortAt} x={CO_X} y={y(CO_TOPS[0]) - h(40)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
            sort each<span style={{ opacity: ease(frame, mergeAt, 10), color: OK_INK }}>, merge in one pass</span>
          </span>
        </Note>

        {/* What it costs here, and the rule. */}
        <Note at={anyAt} x={R0} y={y(790)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            any size
            <span style={{ opacity: ease(frame, twoTbAt, 10), color: ACCENT_INK, fontWeight: 700 }}>
              , but here about <Num>{BROADCAST.factTB}</Num> TB shuffled
            </span>
          </span>
        </Note>
        <Note at={smallAt - 2} x={EX_X} y={y(850)}>
          <span style={{ ...note(25, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            One side small: <span style={{ color: OK_INK }}>broadcast</span>
            <span style={{ opacity: ease(frame, largeAt, 10) }}>
              {" · "}both large: <span style={{ color: OK_INK }}>sort-merge</span>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** One row's join key, as a small chip. */
const Key: React.FC<{ k: number; color: string; x: number; top: number; h: number; o: number }> = ({ k, color, x, top, h, o }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top,
      width: CHIP,
      height: h,
      background: wash(color, 22),
      border: `1.5px solid ${color}`,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...note(21, INK),
      fontWeight: 600,
      opacity: o,
    }}
  >
    {k}
  </div>
);
