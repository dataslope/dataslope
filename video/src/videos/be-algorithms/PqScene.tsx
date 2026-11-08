import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { TABULAR, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HEAP } from "./data";
import { ACCENT, ACCENT_INK, BAR, BLUE_FILL, BLUE_INK, Drift, HBar, HIGHLIGHT, INK, INK_SOFT, Line, OK_INK, PAPER, Svg, int, VRule } from "./parts";

/** Five jobs, by urgency (1 the most urgent), in the order they arrive.
 *  A drawing of the two disciplines, not data. */
const ARRIVALS = [3, 1, 4, 2, 5];
const LANE_X = 420;
const CHIP = 62;
/** The table of push and pop costs. */
const T = { name: 140, push: 410, pop: 850 };
/** The heap, a triangle of its twenty levels, the top four drawn as nodes. */
const TREE = { apexX: 1440, x0: 1110, x1: 1770 };

/**
 * Question 6, with the heap's operation costs answered inside it. Five jobs
 * served two ways: a queue in arrival order, a priority queue most urgent
 * first. Then the three ways to keep one (a sorted list, an unsorted list, a
 * heap) as a table of push and pop costs; the heap as a tree twenty levels
 * deep, one push climbing nineteen; then building a million-item heap,
 * heapify against one push at a time, counted.
 */
export const PqScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("pq").from;
  const qAt = n.word("pq", "Question six");
  const textAt = n.word("pq", "How does a priority queue differ");
  const queueAt = n.word("pq", "A queue serves in arrival order");
  const urgentAt = n.word("pq", "A priority queue serves the most urgent first");
  const schedAt = n.word("pq", "as in a scheduler");
  const sortedAt = n.word("heap-choose", "Keep a list sorted");
  const instantAt = n.word("heap-choose", "a pop is instant");
  const shiftsAt = n.word("heap-choose", "an insert shifts half a million");
  const unsortedAt = n.word("heap-choose", "An unsorted list inserts instantly");
  const scansAt = n.word("heap-choose", "scans to pop");
  const heapAt = n.word("heap-height", "A heap does both in log n");
  const parentAt = n.word("heap-height", "each parent at least as urgent");
  const levelsAt = n.word("heap-height", "A million items make twenty levels");
  const climbAt = n.word("heap-height", "a push or pop moves at most nineteen");
  const peekAt = n.word("heap-height", "a peek is constant");
  const linearAt = n.word("heap-build", "building a heap is linear");
  const bottomAt = n.word("heap-build", "since most nodes sit near the bottom");
  const heapifyAt = n.word("heap-build", "heapify takes one and a half million comparisons");
  const pushedAt = n.word("heap-build", "pushed one at a time");
  const end = n.beat("heap-build").to;

  const laneY = [y(304), y(372)];
  const tTop = y(508);
  const rowY = (i: number) => tTop + 44 + i * 54;
  const rows = [
    { name: "Sorted list", push: <>O(n): shifts <Num>{int(HEAP.sortedInsertMeanShift)}</Num> on average</>, pop: "O(1)", at: sortedAt, pushAt: shiftsAt, popAt: instantAt, pushBad: true, popBad: false },
    { name: "Unsorted list", push: "O(1)", pop: "O(n): a scan", at: unsortedAt, pushAt: unsortedAt + 6, popAt: scansAt, pushBad: false, popBad: true },
    { name: "Heap", push: "O(log n)", pop: "O(log n)", at: heapAt, pushAt: heapAt + 4, popAt: heapAt + 8, pushBad: false, popBad: false },
  ];

  // The heap.
  const apexY = y(372);
  const baseY = y(640);
  const lv = (k: number) => apexY + ((baseY - apexY) * k) / (HEAP.levels - 1);
  const half = (k: number) => ((TREE.x1 - TREE.x0) / 2) * (k / (HEAP.levels - 1));
  const nodeXY = (k: number, i: number) => [TREE.apexX - half(k) + ((i + 0.5) / 2 ** k) * 2 * half(k), lv(k)] as const;
  // A push enters at the bottom and climbs to the root: one level a step.
  const climbPath = Array.from({ length: HEAP.levels }, (_, k) => {
    const level = HEAP.levels - 1 - k;
    const i = Math.floor((2 ** level - 1) * 0.3);
    return nodeXY(level, i);
  });
  const climb = ease(frame, climbAt, Math.max(30, peekAt - climbAt - 4));
  const climbed = climb * (climbPath.length - 1);
  const ci = Math.min(climbPath.length - 2, Math.floor(climbed));
  const cf = climbed - ci;
  const dot = climb > 0 ? [climbPath[ci][0] + (climbPath[ci + 1][0] - climbPath[ci][0]) * cf, climbPath[ci][1] + (climbPath[ci + 1][1] - climbPath[ci][1]) * cf] : null;
  const tri = ease(frame, heapAt, 18);

  return (
    <AbsoluteFill>
      {ARRIVALS.map((_, i) => (
        <Sfx key={`q${i}`} name="el-tap" at={queueAt + 4 + i * 4} level={-34} />
      ))}
      <Sfx name="el-whoosh" at={urgentAt + 4} level={-34} />
      <Sfx name="el-tap" at={shiftsAt} level={-32} />
      <Sfx name="el-tap" at={scansAt} level={-32} />
      <Sfx name="el-pop" at={heapAt} level={-30} />
      <Sfx name="el-pencil" at={climbAt} level={-35} />
      <Sfx name="el-tap" at={heapifyAt} level={-32} />
      <Sfx name="el-tap" at={pushedAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={62}>
          How does a priority queue differ from a regular queue?
        </QuestionCard>

        {/* Five jobs, served two ways. */}
        {[
          { title: "Queue: arrival order", order: ARRIVALS, at: queueAt },
          { title: "Priority queue: most urgent first", order: [...ARRIVALS].sort((a, b) => a - b), at: urgentAt },
        ].map((lane, j) => (
          <React.Fragment key={lane.title}>
            <div style={{ position: "absolute", left: 140, top: laneY[j] + 16, ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, lane.at - 2, 10), width: 260 }}>
              {lane.title.split(":")[0]}
            </div>
            {lane.order.map((u, i) => {
              const p = ease(frame, lane.at + 4 + i * 4, 10);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: LANE_X + i * (CHIP + 14),
                    top: laneY[j] + 4,
                    width: CHIP,
                    height: 54,
                    boxSizing: "border-box",
                    borderRadius: 27,
                    border: `2px solid ${u === 1 ? INK : BAR}`,
                    background: u === 1 ? HIGHLIGHT : BLUE_FILL,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(24, u === 1 ? INK : BLUE_INK),
                    ...TABULAR,
                    fontWeight: 500,
                    opacity: p,
                    transform: `translateX(${(1 - p) * -20}px)`,
                  }}
                >
                  {u}
                </div>
              );
            })}
            <div style={{ position: "absolute", left: LANE_X + 5 * (CHIP + 14) + 16, top: laneY[j] + 16, ...note(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, lane.at + 24, 10) }}>
              {lane.title.split(": ")[1]}
            </div>
          </React.Fragment>
        ))}
        <Line at={urgentAt + 10} x={LANE_X} y={laneY[1] + 62} size={21} color={INK_SOFT} weight={500}>
          1 is the most urgent
          <span style={{ opacity: ease(frame, schedAt, 10) }}>: a scheduler, Dijkstra&apos;s algorithm</span>
        </Line>

        {/* Three ways to keep one. */}
        <div style={{ opacity: ease(frame, sortedAt - 4, 12) }}>
          {[
            { x: T.push, t: "push" },
            { x: T.pop, t: "pop" },
          ].map((c) => (
            <div key={c.t} style={{ position: "absolute", left: c.x, top: tTop, ...label(24, INK_SOFT) }}>
              {c.t}
            </div>
          ))}
        </div>
        <Svg opacity={ease(frame, sortedAt - 4, 12)}>
          <line x1={T.name} x2={1010} y1={tTop + 34} y2={tTop + 34} stroke={INK} strokeWidth={1.4} />
        </Svg>
        {rows.map((r, i) => (
          <React.Fragment key={r.name}>
            <div style={{ position: "absolute", left: T.name, top: rowY(i) + 10, ...note(24, INK), fontWeight: 500, opacity: ease(frame, r.at - 2, 10), whiteSpace: "nowrap" }}>{r.name}</div>
            <div style={{ position: "absolute", left: T.push, top: rowY(i) + 10, ...note(24, i === 2 ? OK_INK : r.pushBad ? ACCENT_INK : INK), fontWeight: 500, opacity: ease(frame, r.pushAt, 10), whiteSpace: "nowrap" }}>{r.push}</div>
            <div style={{ position: "absolute", left: T.pop, top: rowY(i) + 10, ...note(24, i === 2 ? OK_INK : r.popBad ? ACCENT_INK : INK), fontWeight: 500, opacity: ease(frame, r.popAt, 10), whiteSpace: "nowrap" }}>{r.pop}</div>
          </React.Fragment>
        ))}

        <VRule x={1060} top={laneY[0]} bottom={y(814) + 56} at={levelsAt} />

        {/* The heap: twenty levels for a million, one push climbing. */}
        <Line at={levelsAt} x={TREE.x0} y={apexY - 72} size={22} weight={500}>
          A heap of a million: <Num>{HEAP.levels}</Num> levels
        </Line>
        <Svg opacity={tri}>
          <path d={`M${TREE.apexX},${apexY} L${TREE.apexX + half(HEAP.levels - 1)},${baseY} L${TREE.apexX - half(HEAP.levels - 1)},${baseY} Z`} fill={BLUE_FILL} stroke={BAR} strokeWidth={1.6} />
          {Array.from({ length: HEAP.levels - 1 }, (_, k) => (
            <line key={k} x1={TREE.apexX - half(k + 1)} x2={TREE.apexX + half(k + 1)} y1={lv(k + 1)} y2={lv(k + 1)} stroke={BAR} strokeWidth={0.8} opacity={0.3} />
          ))}
          {/* The climb, lit as it goes. */}
          {climb > 0 ? (
            <polyline
              points={climbPath.slice(0, ci + 1).map(([px, py]) => `${px},${py}`).concat(dot ? [`${dot[0]},${dot[1]}`] : []).join(" ")}
              fill="none"
              stroke={HIGHLIGHT}
              strokeWidth={8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {dot ? <circle cx={dot[0]} cy={dot[1]} r={8} fill={OK} stroke={PAPER} strokeWidth={2} /> : null}
        </Svg>
        {/* The root: the most urgent, read without moving anything. */}
        <div
          style={{
            position: "absolute",
            left: TREE.apexX - 14,
            top: apexY - 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: HIGHLIGHT,
            border: `2px solid ${INK}`,
            boxSizing: "border-box",
            opacity: ease(frame, parentAt, 10),
          }}
        />
        <Line at={parentAt} x={TREE.x0} y={baseY + 22} size={23}>
          Each parent at least as urgent as its children
        </Line>
        <Line at={climbAt} x={TREE.x0} y={baseY + 62} size={23}>
          A push or pop moves at most <b style={{ ...TABULAR, color: OK_INK }}>{HEAP.maxMoves}</b> levels
        </Line>
        <Line at={peekAt} x={TREE.x0} y={baseY + 102} size={23} color={INK_SOFT}>
          Peek: O(1). Counted: push <Num>{HEAP.pushNewMinCompares}</Num>, pop <Num>{HEAP.popCompares}</Num> compares
        </Line>

        {/* Building one. */}
        <Line at={linearAt} x={140} y={y(716)} size={22} weight={500}>
          Building a heap: O(n), not O(n log n). Comparisons, a million items:
        </Line>
        <HBar
          x={140}
          y={y(752)}
          w={680}
          max={HEAP.pushesCompares}
          value={HEAP.heapifyCompares}
          at={heapifyAt}
          color={OK}
          ink={OK_INK}
          label="Heapify, arriving least urgent first"
          valueText={<Num>{int(HEAP.heapifyCompares)}</Num>}
          size={22}
          barH={22}
        />
        <HBar
          x={140}
          y={y(814)}
          w={680}
          max={HEAP.pushesCompares}
          value={HEAP.pushesCompares}
          at={pushedAt + 4}
          color={ACCENT}
          ink={ACCENT_INK}
          label="Pushed one at a time"
          valueText={<Num>{int(HEAP.pushesCompares)}</Num>}
          size={22}
          barH={22}
        />
        <Line at={bottomAt} x={TREE.x0} y={y(800)} size={23}>
          Most nodes sit near the bottom:
        </Line>
        <Line at={bottomAt + 10} x={TREE.x0} y={y(838)} size={23}>
          heights sum to <b style={{ ...TABULAR, color: OK_INK }}>{int(HEAP.heightsSum)}</b>, under <i>n</i>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
