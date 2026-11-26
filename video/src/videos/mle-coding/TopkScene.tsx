import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TOPK } from "./data";
import { ACCENT_INK, Arrow, BAR, Bars, BLUE_FILL, Cell, Drift, GRAY_FILL, INK, INK_SOFT, int, Line, Listing, Mark, OK, OK_INK, seeded, VRule, X0 } from "./parts";

/** The million scores, drawn as a strip of a few: a picture, not data. */
const STRIP_N = 96;
const STRIP_X = X0;
const STRIP_W = 1680;
const STRIP_VALUES = (() => {
  const r = seeded(31);
  return Array.from({ length: STRIP_N }, () => r());
})();
const STRIP_RANK = (() => {
  const order = STRIP_VALUES.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const rank: number[] = [];
  order.forEach((o, r) => (rank[o.i] = r));
  return rank;
})();
const KEPT = 8;

const CELL_W = 96;
const CELL_GAP = 14;
const R_X = 1060;

/**
 * Question 3. A million scores as one long strip: a full sort orders all of
 * them, and all but the few at the end is work nobody asked for. Then the
 * page's one line, `np.argpartition(scores, -k)[-k:]`, on its own five
 * scores: the k largest go to the right end in no set order, the rest stay
 * as they fall, and only the k are sorted (TOPK.top). On the right, the two
 * timings as one run's bars and their ratio (TOPK.ratio), then a heap of k
 * slots fed by a stream: n log k.
 */
export const TopkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "How do you find the top-k");
  const sortAt = n.word("q3", "Sorting everything is n log n");
  const wastedAt = n.word("q3", "most of that work is wasted");
  const argAt = n.word("q3", "argpartition moves the k largest to one end");
  const linearAt = n.word("q3", "in linear time");
  const unorderedAt = n.word("q3", "unordered");
  const onlyAt = n.word("q3", "sort only those k");
  const millionAt = n.word("q3-time", "On a million scores");
  const tenAt = n.word("q3-time", "more than ten times faster");
  const fullAt = n.word("q3-time", "than a full sort");
  const plainAt = n.word("q3-time", "In plain Python");
  const heapAt = n.word("q3-time", "keep a heap of size k");
  const nlogkAt = n.word("q3-time", "That's n log k");
  const memAt = n.word("q3-time", "with memory for only k items");
  const end = n.beat("q3-time").to;

  // ── The strip: sorted on "Sorting", most of it dimmed on "wasted". ──
  const stripBottom = y(372);
  const pitch = STRIP_W / STRIP_N;
  const sorted = ease(frame, sortAt + 4, 30);
  const waste = ease(frame, wastedAt, 14);

  // ── The page's five scores ──
  const S = TOPK.scores;
  const k = TOPK.k;
  const top = TOPK.top;
  const rest = S.map((_, i) => i)
    .filter((i) => !top.includes(i))
    .sort((a, b) => S[a] - S[b]);
  // argpartition leaves the k at the end in no set order; this run's order
  // is the sorted one reversed, which is what then gets sorted.
  const partOrder = [...rest, ...[...top].reverse()];
  const finalOrder = [...rest, ...top];
  const moved = ease(frame, argAt + 6, 22);
  const ordered = ease(frame, onlyAt + 4, 16);
  const cellTop = y(606);
  const slotX = (s: number) => X0 + s * (CELL_W + CELL_GAP);

  // ── The heap ──
  const heapOn = ease(frame, heapAt - 2, 12);
  const nodes: [number, number][] = [
    [1560, y(690)],
    [1490, y(784)],
    [1630, y(784)],
  ];
  const streamFrom = heapAt + 6;
  const streamT = Math.max(0, frame - streamFrom);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={sortAt - 6} level={-36} />
      <Sfx name="el-whoosh" at={sortAt + 4} level={-36} />
      <Sfx name="el-pencil" at={argAt} level={-35} />
      <Sfx name="el-whoosh" at={argAt + 6} level={-36} />
      <Sfx name="el-tap" at={onlyAt + 4} level={-32} />
      <Sfx name="el-pop" at={millionAt + 2} level={-31} />
      <Sfx name="el-tap" at={tenAt + 4} level={-30} />
      <Sfx name="el-pop" at={heapAt} level={-31} />
      <Sfx name="el-chime" at={memAt + 20} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you find the top-k scores efficiently?
        </QuestionCard>

        {/* ── A million scores, sorted in full ── */}
        <Line at={sortAt - 6} x={X0} y={y(258)} size={24}>
          A full sort: <M>O(n log n)</M>
        </Line>
        {STRIP_VALUES.map((v, i) => {
          const shown = ease(frame, sortAt - 6 + i * 0.25, 8);
          if (shown <= 0) return null;
          const slot = i + (STRIP_RANK[i] - i) * sorted;
          const isTop = STRIP_RANK[i] >= STRIP_N - KEPT;
          const hgt = h(10 + 52 * v);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: STRIP_X + slot * pitch,
                top: stripBottom - hgt,
                width: pitch - 4,
                height: hgt,
                borderRadius: 2,
                background: isTop && waste > 0 ? BAR : waste > 0 ? GRAY_FILL : BLUE_FILL,
                opacity: shown * (isTop ? 1 : 1 - 0.35 * waste),
              }}
            />
          );
        })}
        <Line at={wastedAt + 4} x={X0} y={stripBottom + h(12)} size={23} color={ACCENT_INK}>
          most of the order is never used
        </Line>
        <Line at={wastedAt + 8} x={STRIP_X + STRIP_W - 4} width={300} align="right" y={stripBottom + h(12)} size={23} color={BAR}>
          the top few
        </Line>

        {/* ── argpartition, on the page's five scores ── */}
        <Listing lines={["np.argpartition(scores, -k)[-k:]"]} x={X0} top={y(452)} size={28} at={argAt - 4} />
        {S.map((v, i) => {
          const s0 = i;
          const s1 = partOrder.indexOf(i);
          const s2 = finalOrder.indexOf(i);
          const slot = s0 + (s1 - s0) * moved + (s2 - s1) * ordered;
          const inTop = top.includes(i);
          const tone = inTop && moved > 0.5 ? (ordered > 0.5 ? "ok" : "data") : "ink";
          const dim = !inTop ? 1 - 0.45 * ease(frame, unorderedAt, 12) : 1;
          const lift = inTop ? Math.sin(Math.PI * moved) * h(30) + Math.sin(Math.PI * ordered) * h(12) : 0;
          return (
            <React.Fragment key={i}>
              <Cell x={slotX(slot)} y={cellTop - lift} w={CELL_W} h={h(56)} size={26} radius={5} tone={tone} opacity={ease(frame, argAt - 2 + i * 2, 10) * dim}>
                {v.toFixed(1)}
              </Cell>
              <div style={{ position: "absolute", left: slotX(slot), width: CELL_W, top: cellTop + h(64), textAlign: "center", ...label(20, INK_SOFT), opacity: ease(frame, argAt + i * 2, 10) * dim }}>
                <Num>{i}</Num>
              </div>
            </React.Fragment>
          );
        })}
        <Line at={linearAt} x={slotX(0)} y={cellTop + h(104)} size={22} color={INK_SOFT}>
          <M>O(n)</M>: the rest, in no set order
        </Line>
        <Line at={unorderedAt} x={slotX(S.length - k)} y={cellTop - h(46)} size={22} color={BAR}>
          the {k} largest, unordered
        </Line>
        <Line at={onlyAt + 6} x={X0} y={y(784)} size={24}>
          Then sort only those <M>k</M>: <M>O(k log k)</M>
        </Line>
        <Line at={onlyAt + 14} x={X0} y={y(784) + h(46)} size={24} color={OK_INK} weight={600}>
          Indices {top.join(" and ")}: scores {TOPK.topScores.map((v) => v.toFixed(1)).join(" and ")}
        </Line>

        <VRule x={R_X - 50} top={y(452)} bottom={y(890)} at={millionAt} />

        {/* ── Timed, on a million scores ── */}
        <Line at={millionAt} x={R_X} y={y(452)} size={23} color={INK_SOFT}>
          <Num>{int(TOPK.n)}</Num> scores, timed once
        </Line>
        <Bars
          x={R_X}
          top={y(494)}
          width={420}
          rowH={h(58)}
          nameW={190}
          bars={[
            {
              name: "full sort",
              value: TOPK.ms.sort,
              color: BAR,
              at: millionAt + 4,
              dur: 26,
              endAt: tenAt,
              end: (
                <Mark at={tenAt + 4}>
                  <span style={{ ...note(25, INK), fontWeight: 600 }}>×{Math.round(TOPK.ratio)}</span>
                </Mark>
              ),
            },
            { name: "argpartition", value: TOPK.ms.partition, color: OK, at: fullAt, dur: 10, end: <span style={{ ...note(25, OK_INK), fontWeight: 600 }}>×1</span> },
          ]}
        />

        {/* ── A heap of k, fed by a stream ── */}
        <Line at={plainAt} x={R_X} y={y(626)} size={23} color={INK_SOFT}>
          In plain Python, or over a stream:
        </Line>
        <Arrow points={[[R_X, nodes[0][1]], [nodes[0][0] - 34, nodes[0][1]]]} at={heapAt - 2} dur={16} color={BAR} width={2.6} head={14} />
        {heapOn > 0
          ? Array.from({ length: 6 }, (_, i) => {
              const t = (streamT + i * 14) % 84;
              const x = R_X + 10 + (t / 84) * 360;
              return <div key={i} style={{ position: "absolute", left: x, top: nodes[0][1] - 9, width: 18, height: 18, borderRadius: 3, background: BAR, opacity: heapOn * Math.min(1, t / 10, (84 - t) / 12) }} />;
            })
          : null}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: heapOn }}>
          <line x1={nodes[0][0]} y1={nodes[0][1]} x2={nodes[1][0]} y2={nodes[1][1]} stroke={INK} strokeWidth={2} />
          <line x1={nodes[0][0]} y1={nodes[0][1]} x2={nodes[2][0]} y2={nodes[2][1]} stroke={INK} strokeWidth={2} />
        </svg>
        {nodes.map(([cx, cy], i) => {
          const p = pop(frame, heapAt + i * 3, fps, 16);
          return (
            <div key={i} style={{ position: "absolute", left: cx - 26, top: cy - 26, width: 52, height: 52, borderRadius: 26, boxSizing: "border-box", border: `2px solid ${INK}`, background: "var(--ds-white)", opacity: Math.min(1, p), transform: `scale(${0.8 + 0.2 * Math.min(1, p)})` }} />
          );
        })}
        {/* Which heap: a min-heap, so the weakest of the k kept sits at the
            root and is the one a better score replaces (review 2026-11-26). */}
        <Line at={heapAt + 6} x={1606} y={y(690) - 36} size={22} color={INK}>
          min-heap of <M>k</M>
        </Line>
        <Line at={heapAt + 12} x={1606} y={y(690) + 6} size={22} color={INK_SOFT}>
          smallest on top
        </Line>
        <Line at={nlogkAt} x={R_X} y={y(846)} size={24}>
          <M>O(n log k)</M> time<span style={{ opacity: ease(frame, memAt, 10) }}>, <M>O(k)</M> memory</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
