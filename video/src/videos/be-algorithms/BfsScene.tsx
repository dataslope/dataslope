import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { TABULAR } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TRAVERSAL } from "./data";
import { ACCENT_INK, BAR, BLUE_FILL, BLUE_INK, Cell, Drift, Edge, GraphNode, HIGHLIGHT, INK_SOFT, Line, OK_INK, Svg, int, VRule } from "./parts";

type P = readonly [number, number];
/** The page's graph, a diamond: A over B and C, both over D. */
const diamond = (cx: number, top: number): Record<string, P> => ({
  A: [cx, top],
  B: [cx - 100, top + 105],
  C: [cx + 100, top + 105],
  D: [cx, top + 210],
});
/** The million-node tree, drawn as a triangle of its twenty levels. */
const TREE = { apexX: 1430, x0: 1090, x1: 1770 };
const CELLS = 8;

/**
 * Question 5, with the deque answered inside it. The page's graph twice,
 * numbered in breadth-first and in depth-first order; what each is chosen
 * for; then memory, on a full binary tree of a million nodes: BFS holds its
 * widest level, a band across the base, DFS one path down it. Then the
 * queue itself: a list popped from the front shifts every item behind it,
 * a deque's front simply detaches.
 */
export const BfsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("bfs").from;
  const qAt = n.word("bfs", "Question five");
  const textAt = n.word("bfs", "Walk me through BFS versus DFS");
  const breadthAt = n.word("bfs", "Breadth-first search takes a queue");
  const depthAt = n.word("bfs", "Depth-first takes a stack");
  const w = (word: string, nth: number) => n.word("bfs-graph", word, { nth });
  const nodeAt = { A: w("A", 1), B: w("B", 1), C: w("C", 1), D: w("D", 1) } as Record<string, number>;
  const bfsAt = { A: w("A", 2), B: w("B", 2), C: w("C", 2), D: w("D", 2) } as Record<string, number>;
  const dfsAt = { A: w("A", 3), B: w("B", 3), D: w("D", 3), C: w("C", 3) } as Record<string, number>;
  const shortAt = n.word("bfs-short", "Choose BFS for shortest paths");
  const fewestAt = n.word("bfs-short", "by the fewest edges");
  const dfsForAt = n.word("bfs-short", "DFS for cycle detection");
  const memoryAt = n.word("bfs-memory", "Memory decides it too");
  const treeAt = n.word("bfs-memory", "On a full binary tree of a million nodes");
  const widestAt = n.word("bfs-memory", "BFS holds the widest level");
  const pathAt = n.word("bfs-memory", "DFS holds one path");
  const dequeAt = n.word("bfs-deque", "And make the queue a deque");
  const poppingAt = n.word("bfs-deque", "Popping a Python list's front");
  const billionAt = n.word("bfs-deque", "two hundred seventy-five billion moves here");
  const eitherAt = n.word("bfs-deque", "A deque pops either end in constant time");
  const end = n.beat("bfs-deque").to;

  const gTop = y(388);
  const left = diamond(300, gTop);
  const right = diamond(720, gTop);
  const edges = Object.entries(TRAVERSAL.graph).flatMap(([a, nbs]) => nbs.map((b) => [a, b] as const));
  const bfsOrder = TRAVERSAL.bfsOrder;
  const dfsOrder = TRAVERSAL.dfsOrder;

  // The tree.
  const apexY = y(392);
  const baseY = y(640);
  const lv = (k: number) => apexY + ((baseY - apexY) * k) / (TRAVERSAL.levels - 1);
  const half = (k: number) => ((TREE.x1 - TREE.x0) / 2) * (k / (TRAVERSAL.levels - 1));
  const tri = ease(frame, treeAt, 18);
  const band = ease(frame, widestAt, 12);
  const dfsP = ease(frame, pathAt, 20);
  // One path down: left, right, left... from the root to a leaf, each node
  // placed where its level's 2^k nodes would sit across the triangle.
  const path: P[] = [];
  for (let k = 0, i = 0; k < TRAVERSAL.levels; k++) {
    if (k > 0) i = 2 * i + (k % 2 ? 0 : 1);
    path.push([TREE.apexX - half(k) + ((i + 0.5) / 2 ** k) * 2 * half(k), lv(k)] as const);
  }
  const shown = Math.max(1, Math.round(dfsP * path.length));

  // The queue rows: a list's pop shifts every cell; a deque's front detaches.
  const rowY1 = y(752);
  const rowY2 = y(828);
  const cx0 = 360;
  const pop1 = ease(frame, poppingAt + 8, 12);
  const shift = ease(frame, poppingAt + 18, 16);
  const pop2 = ease(frame, eitherAt + 6, 14);

  return (
    <AbsoluteFill>
      {(["A", "B", "C", "D"] as const).map((k) => (
        <Sfx key={`b${k}`} name="el-tap" at={bfsAt[k]} level={-33} />
      ))}
      {(["A", "B", "D", "C"] as const).map((k) => (
        <Sfx key={`d${k}`} name="el-tap" at={dfsAt[k]} level={-33} />
      ))}
      <Sfx name="el-pencil" at={treeAt} level={-35} />
      <Sfx name="el-sprinkle" at={widestAt} level={-31} />
      <Sfx name="el-pencil" at={pathAt} level={-35} />
      <Sfx name="el-whoosh" at={poppingAt + 18} level={-34} />
      <Sfx name="el-pop" at={eitherAt + 6} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={62}>
          Walk me through BFS vs DFS, when do you choose each?
        </QuestionCard>
        <Line at={breadthAt} x={96} y={y(262)} size={26} color={INK_SOFT}>
          Breadth-first: a queue, level by level.
          <span style={{ opacity: ease(frame, depthAt, 10) }}> Depth-first: a stack, one path down.</span>
        </Line>

        {/* The page's graph, numbered both ways. */}
        {[
          { g: left, title: "Breadth-first", order: bfsOrder, at: bfsAt, titleAt: bfsAt.A - 4, side: "right" as const },
          { g: right, title: "Depth-first", order: dfsOrder, at: dfsAt, titleAt: dfsAt.A - 4, side: "right" as const },
        ].map((v) => (
          <React.Fragment key={v.title}>
            <Line at={v.titleAt} x={v.g.A[0] - 130} y={gTop - 76} size={22} weight={650}>
              {v.title}: {v.order.join(", ")}
            </Line>
            {edges.map(([a, b]) => (
              <Edge key={`${a}${b}`} from={v.g[a]} to={v.g[b]} at={nodeAt[b] + 2} color={INK_SOFT} width={2.4} />
            ))}
            {(["A", "B", "C", "D"] as const).map((k) => (
              <GraphNode
                key={k}
                x={v.g[k][0]}
                y={v.g[k][1]}
                at={nodeAt[k]}
                name={k}
                tone={frame >= v.at[k] ? "data" : "plain"}
                badge={v.order.indexOf(k) + 1}
                badgeAt={v.at[k]}
                badgeTone="look"
                badgeSide={k === "B" ? "left" : "right"}
              />
            ))}
          </React.Fragment>
        ))}
        <Line at={shortAt} x={140} y={y(650)} size={24}>
          <b style={{ color: BLUE_INK }}>BFS</b>: shortest paths, unweighted<span style={{ opacity: ease(frame, fewestAt, 10) }}>; fewest edges first</span>
        </Line>
        <Line at={dfsForAt} x={140} y={y(692)} size={24}>
          <b style={{ color: BLUE_INK }}>DFS</b>: cycle detection, topological sort, backtracking
        </Line>

        <VRule x={510} top={gTop - 76} bottom={gTop + 250} at={nodeAt.A} />
        <VRule x={985} top={apexY - 72} bottom={baseY + 96} at={memoryAt} />

        {/* Memory: a million-node tree. */}
        <Line at={memoryAt} x={TREE.x0} y={apexY - 72} size={22} weight={650}>
          Full binary tree: <Num>{int(TRAVERSAL.nodes)}</Num> nodes, <Num>{TRAVERSAL.levels}</Num> levels
        </Line>
        <Svg opacity={tri}>
          <path d={`M${TREE.apexX},${apexY} L${TREE.apexX + half(TRAVERSAL.levels - 1)},${baseY} L${TREE.apexX - half(TRAVERSAL.levels - 1)},${baseY} Z`} fill={BLUE_FILL} stroke={BAR} strokeWidth={1.6} />
          {Array.from({ length: TRAVERSAL.levels - 1 }, (_, k) => (
            <line key={k} x1={TREE.apexX - half(k + 1)} x2={TREE.apexX + half(k + 1)} y1={lv(k + 1)} y2={lv(k + 1)} stroke={BAR} strokeWidth={0.8} opacity={0.35} />
          ))}
          {/* BFS's frontier: the widest level, a band across the base. */}
          <clipPath id="be-alg-band">
            <rect x={TREE.apexX - half(TRAVERSAL.levels - 1) - 2} y={apexY - 4} width={(2 * half(TRAVERSAL.levels - 1) + 4) * band} height={baseY - apexY + 10} />
          </clipPath>
          <path
            d={`M${TREE.apexX - half(TRAVERSAL.levels - 2)},${lv(TRAVERSAL.levels - 2)} L${TREE.apexX + half(TRAVERSAL.levels - 2)},${lv(TRAVERSAL.levels - 2)} L${TREE.apexX + half(TRAVERSAL.levels - 1)},${baseY} L${TREE.apexX - half(TRAVERSAL.levels - 1)},${baseY} Z`}
            fill={HIGHLIGHT}
            clipPath="url(#be-alg-band)"
            opacity={band > 0 ? 1 : 0}
          />
          {/* DFS's stack: one path down. */}
          <polyline points={path.slice(0, shown).map(([px, py]) => `${px},${py}`).join(" ")} fill="none" stroke={BAR} strokeWidth={3.4} strokeLinejoin="round" opacity={dfsP > 0 ? 1 : 0} />
          {path.slice(0, shown).map(([px, py], k) => (dfsP > 0 ? <circle key={k} cx={px} cy={py} r={4.5} fill={BAR} /> : null))}
        </Svg>
        <Line at={widestAt} x={TREE.x0} y={baseY + 22} size={24}>
          BFS queue: the widest level, <b style={{ ...TABULAR }}>{int(TRAVERSAL.bfsPeak)}</b> nodes
        </Line>
        <Line at={pathAt} x={TREE.x0} y={baseY + 64} size={24}>
          DFS stack: one path, <b style={{ ...TABULAR, color: BLUE_INK }}>{TRAVERSAL.dfsPeak}</b> nodes
        </Line>

        {/* The queue itself: list or deque. */}
        <Line at={poppingAt - 2} x={140} y={rowY1 + 14} size={23} weight={650}>
          Python list
        </Line>
        {Array.from({ length: CELLS }, (_, i) => {
          const first = i === 0;
          const dx = first ? -40 * pop1 : -76 * shift;
          return (
            <Cell
              key={`l${i}`}
              x={cx0 + i * 76}
              y={rowY1}
              at={dequeAt + i * 2}
              value=""
              w={64}
              h={52}
              tone={first ? "look" : "data"}
              dx={dx}
              opacity={first ? 1 - pop1 : 1}
            />
          );
        })}
        <Line at={poppingAt + 18} x={cx0 + CELLS * 76 + 20} y={rowY1 + 12} size={23} color={ACCENT_INK} weight={600}>
          every item behind it shifts
          <span style={{ opacity: ease(frame, billionAt, 10) }}>
            : <b style={TABULAR}>{int(TRAVERSAL.listShifts)}</b> moves for this tree
          </span>
        </Line>
        <Line at={dequeAt} x={140} y={rowY2 + 14} size={23} weight={650}>
          Deque
        </Line>
        {Array.from({ length: CELLS }, (_, i) => {
          const first = i === 0;
          return (
            <Cell
              key={`d${i}`}
              x={cx0 + i * 76}
              y={rowY2}
              at={dequeAt + 6 + i * 2}
              value=""
              w={64}
              h={52}
              tone={first ? "look" : "data"}
              dx={first ? -50 * pop2 : 0}
              opacity={first ? 1 - pop2 : 1}
            />
          );
        })}
        <Line at={eitherAt + 6} x={cx0 + CELLS * 76 + 20} y={rowY2 + 12} size={23} color={OK_INK} weight={700}>
          pops either end in O(1)
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
