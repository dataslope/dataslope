import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DIJKSTRA } from "./data";
import { ACCENT, ACCENT_INK, Art, Cross, Drift, Edge, GraphNode, HIGHLIGHT, INK, INK_SOFT, Line, NODE_R, OK_INK, Strike, Svg, VRule } from "./parts";

type P = readonly [number, number];

/** A soft band under an edge, for the path the narration follows. */
const Glow: React.FC<{ a: P; b: P; at: number; color?: string }> = ({ a, b, at, color = HIGHLIGHT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const s: P = [a[0] + ux * NODE_R, a[1] + uy * NODE_R];
  const e: P = [b[0] - ux * NODE_R, b[1] - uy * NODE_R];
  return (
    <Svg>
      <line x1={s[0]} y1={s[1]} x2={s[0] + (e[0] - s[0]) * p} y2={s[1] + (e[1] - s[1]) * p} stroke={color} strokeWidth={12} strokeLinecap="round" />
    </Svg>
  );
};

/** Which side of an edge its weight sits on, so no weight lands on another
 *  edge: the normal points left of the direction of travel. */
const SIDE: Record<string, number> = { AB: 24, AC: -24, BC: 24, BD: 24, CD: -24, CB: 24 };

/**
 * Question 7. The page's graph and weights, distances settling in the order
 * the heap hands nodes out, to the page's printed result; the cost, (V + E)
 * log V. Then the video's own graph with an edge of -2, run by the version
 * that finalizes a node when it leaves the heap (B = 2, D = 3, in red),
 * against Bellman-Ford's B = 1, D = 2, in three rounds over four edges.
 */
export const DijkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("dijk").from;
  const qAt = n.word("dijk", "Question seven");
  const textAt = n.word("dijk", "Explain Dijkstra's algorithm");
  const findsAt = n.word("dijk", "It finds shortest paths from one source");
  const noNegAt = n.word("dijk", "when no weight is negative");
  const heapAt = n.word("dijk", "a min-heap handing out the closest unfinished node next");
  const cDirectAt = n.word("dijk-run", "C costs four directly");
  const throughBAt = n.word("dijk-run", "but three through B");
  const dAt = n.word("dijk-run", "D costs four");
  const throughCAt = n.word("dijk-run", "through B and C");
  const vAt = n.word("dijk-cost", "With V nodes and E edges");
  const onceAt = n.word("dijk-cost", "each node is finished once");
  const edgeAt = n.word("dijk-cost", "each edge can cost a heap push of log V");
  const timesAt = n.word("dijk-cost", "V plus E, times log V");
  const whyAt = n.word("dijk-neg", "Why no negative weights");
  const finalAt = n.word("dijk-neg", "A node is final when it leaves the heap");
  const bLeavesAt = n.word("dijk-neg", "B leaves at two");
  const laterAt = n.word("dijk-neg", "only later does the minus-two edge from C reach it at one");
  const wrongAt = n.word("dijk-neg", "B is wrong");
  const soDAt = n.word("dijk-neg", "and so is D");
  const bfAt = n.word("dijk-bf", "Bellman-Ford instead tries every edge");
  const vMinusAt = n.word("dijk-bf", "V minus one times");
  const vtimesAt = n.word("dijk-bf", "V times E");
  const rightAt = n.word("dijk-bf", "slower, and right");
  const end = n.beat("dijk-bf").to;

  // The page's graph.
  const mid = y(500);
  const L: Record<string, P> = { A: [200, mid], B: [440, y(380)], C: [440, y(620)], D: [680, mid] };
  const pageEdges = Object.entries(DIJKSTRA.pageGraph).flatMap(([a, nbs]) => nbs.map(([b, w]) => ({ a, b, w })));
  const printed = DIJKSTRA.pagePrinted;
  const dist = (k: string) => {
    const m = printed.match(new RegExp(`'${k}': (-?\\d+)`));
    if (!m) throw new Error(`the page's print lacks ${k}`);
    return Number(m[1]);
  };
  // C's cost on its direct edge, before the path through B replaces it.
  const direct = pageEdges.find((e) => e.a === "A" && e.b === "C")?.w;
  const settleAt: Record<string, number> = { A: findsAt + 6, B: heapAt + 4, C: throughBAt, D: throughCAt - 4 };

  // The video's own graph, with a negative edge.
  const R: Record<string, P> = { A: [1130, y(500)], B: [1390, y(392)], C: [1390, y(608)], D: [1660, y(392)] };
  const negEdges = Object.entries(DIJKSTRA.negGraph).flatMap(([a, nbs]) => nbs.map(([b, w]) => ({ a, b, w })));
  const negOn = ease(frame, whyAt - 6, 12);
  const negSettleAt: Record<string, number> = { A: finalAt + 6, B: bLeavesAt, C: bLeavesAt + 16, D: bLeavesAt + 26 };
  const lateEdge = negEdges.find((e) => e.w < 0);
  if (!lateEdge) throw new Error("the negative graph lacks a negative edge");
  const bf = DIJKSTRA.bellmanFord;
  const st = DIJKSTRA.settled;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={findsAt} level={-30} />
      {Object.keys(settleAt).map((k) => (
        <Sfx key={k} name="el-tap" at={settleAt[k]} level={-33} />
      ))}
      <Sfx name="el-scratch" at={throughBAt - 4} level={-35} />
      <Sfx name="el-chime" at={timesAt} level={-33} />
      <Sfx name="el-whoosh" at={whyAt - 6} level={-34} />
      <Sfx name="el-tap" at={bLeavesAt} level={-32} />
      <Sfx name="el-pencil" at={laterAt} level={-35} />
      <Sfx name="el-tap" at={wrongAt} level={-31} />
      <Sfx name="el-tap" at={bfAt + 6} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={62}>
          Explain Dijkstra&apos;s algorithm and its complexity.
        </QuestionCard>
        <Line at={findsAt} x={96} y={y(262)} size={24} color={INK_SOFT}>
          Shortest paths from one source<span style={{ opacity: ease(frame, noNegAt, 10) }}>, no negative weights</span>
          <span style={{ opacity: ease(frame, heapAt, 10) }}>: a min-heap hands out the closest unfinished node</span>
        </Line>
        <Art name="map" at={findsAt} out={whyAt - 20} left={1240} top={y(400)} h={200} />

        {/* The page's graph, distances settling. */}
        <Glow a={L.A} b={L.B} at={throughBAt} />
        <Glow a={L.B} b={L.C} at={throughBAt + 6} />
        <Glow a={L.C} b={L.D} at={throughCAt} />
        {pageEdges.map((e) => (
          <Edge
            key={`${e.a}${e.b}`}
            from={L[e.a]}
            to={L[e.b]}
            at={findsAt + 4}
            weight={e.a === "A" && e.b === "C" ? <Strike at={throughBAt}>{e.w}</Strike> : e.w}
            side={SIDE[`${e.a}${e.b}`]}
          />
        ))}
        {(["A", "B", "C", "D"] as const).map((k) => (
          <GraphNode
            key={k}
            x={L[k][0]}
            y={L[k][1]}
            at={findsAt + 2}
            name={k}
            badge={k === "C" && frame < throughBAt ? direct : dist(k)}
            badgeAt={k === "C" ? cDirectAt - 4 : k === "D" ? dAt - 2 : settleAt[k]}
            badgeTone={frame >= settleAt[k] ? "ok" : "plain"}
            badgeSide={k === "A" ? "below" : k === "D" ? "below" : k === "B" ? "above" : "below"}
          />
        ))}
        <Line at={throughCAt + 6} x={140} y={y(700)} size={22} color={INK_SOFT} weight={500}>
          The page prints
        </Line>
        <Line at={throughCAt + 8} x={320} y={y(700)} size={22} weight={500}>
          <span style={{ fontFamily: MONO, fontWeight: 500, color: OK_INK }}>{printed}</span>
        </Line>

        {/* The cost. */}
        <Line at={vAt} x={140} y={y(748)} size={24}>
          <Num>V</Num> nodes<span style={{ opacity: ease(frame, onceAt, 10) }}>, each finished once</span>
        </Line>
        <Line at={edgeAt} x={140} y={y(790)} size={24}>
          <Num>E</Num> edges, each a heap push of log V
        </Line>
        <Line at={timesAt} x={140} y={y(838)} size={30} weight={500} color={OK_INK}>
          O((V + E) log V)
        </Line>

        <VRule x={915} top={y(320)} bottom={y(838) + 36} at={whyAt - 6} />

        {/* Why no negative weights: the video's own graph. */}
        <div style={{ opacity: negOn }}>
          <Glow a={R.C} b={R.B} at={laterAt} color={`color-mix(in srgb, ${ACCENT} 30%, transparent)`} />
          {negEdges.map((e) => (
            <Edge
              key={`${e.a}${e.b}`}
              from={R[e.a]}
              to={R[e.b]}
              at={whyAt}
              weight={e.w}
              weightInk={e.w < 0 ? ACCENT_INK : INK}
              color={e.w < 0 ? ACCENT : INK_SOFT}
              side={SIDE[`${e.a}${e.b}`]}
            />
          ))}
          {(["A", "B", "C", "D"] as const).map((k) => (
            <GraphNode
              key={k}
              x={R[k][0]}
              y={R[k][1]}
              at={whyAt + 2}
              name={k}
              badge={st[k]}
              badgeAt={negSettleAt[k]}
              badgeTone={(k === "B" && frame >= wrongAt) || (k === "D" && frame >= soDAt) ? "bad" : "plain"}
              badgeSide={k === "A" ? "below" : k === "C" ? "below" : "above"}
              tone={frame >= negSettleAt[k] ? "data" : "plain"}
            />
          ))}
          <Line at={laterAt + 8} x={R.C[0] + 50} y={R.C[1] + 26} size={22} color={ACCENT_INK} weight={500}>
            reaches B at <Num>{bf.B}</Num>: too late
          </Line>
        </div>
        {/* The two answers. */}
        <div style={{ position: "absolute", left: 1060, top: y(700), display: "flex", alignItems: "center", gap: 12, fontSize: 24, opacity: ease(frame, finalAt, 10) }}>
          <span style={{ width: 22, display: "flex", opacity: ease(frame, wrongAt, 8) }}>
            <Cross at={wrongAt} size={22} />
          </span>
          <span style={{ ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Finalize a node when it leaves the heap:
            <span style={{ color: ACCENT_INK, fontWeight: 500, opacity: ease(frame, wrongAt, 10) }}>
              {" "}
              B = <Num>{st.B}</Num>
              <span style={{ opacity: ease(frame, soDAt, 10) }}>
                , D = <Num>{st.D}</Num>
              </span>
            </span>
          </span>
        </div>
        <div style={{ position: "absolute", left: 1060, top: y(748), display: "flex", alignItems: "center", gap: 12, fontSize: 24, opacity: ease(frame, bfAt, 10) }}>
          <Tick at={bfAt} size={24} />
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Bellman-Ford: B = <Num>{bf.B}</Num>, D = <Num>{bf.D}</Num>
          </span>
        </div>
        <Line at={vMinusAt} x={1094} y={y(796)} size={23} color={INK_SOFT}>
          every edge, V − 1 times: <Num>{DIJKSTRA.bfRounds}</Num> rounds over <Num>{DIJKSTRA.bfEdges}</Num> edges
        </Line>
        <Line at={vtimesAt} x={1094} y={y(838)} size={23} weight={500}>
          O(V · E)<span style={{ opacity: ease(frame, rightAt, 10), color: INK_SOFT, fontWeight: 500 }}>: slower, and right</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
