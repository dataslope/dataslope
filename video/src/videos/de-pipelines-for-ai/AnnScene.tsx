import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ANN, num, pct } from "./data";
import { at, DATA, Drift, madeUp, Mark, MARK_OK, OK, OK_INK, QueryMark, QUIET, type Scale, X0 } from "./parts";
import { clusters, graphEdges, nearestOf } from "./space";

/** The drawn space: a picture of the mechanism, no measured number. */
const SPACE = clusters(3, 9, 26, 0.05);
const Q = { x: 0.37, y: 0.5 };
const TOP10 = nearestOf(SPACE.points, Q.x, Q.y, 10);
const EDGES = graphEdges(SPACE.points, 2);
/** The cluster whose centre is nearest the query: the one a probe of 1 searches. */
const PROBED = SPACE.centres
  .map((c, i) => ({ i, d: Math.hypot(c.x - Q.x, c.y - Q.y) }))
  .sort((a, b) => a.d - b.d)[0].i;

const SC = { x: 140, w: 680, top: 380, h: 470 };
const CH = { x0: 1060, x1: 1720, top: 440, bottom: 740 };

/**
 * Question 6. Left, a drawn space of points in nine clusters and a query.
 * Exact search: a line to every point, and the true nearest ringed in green.
 * Then the two approximate indexes: HNSW as a graph (each point joined to
 * its two nearest), and a cluster index, where only the cluster nearest the
 * query is searched. Right, the seeded NumPy simulation from check.mjs,
 * labelled as one: the share of the exact top ten a probe of 1 to 32 of the
 * 100 clusters finds, each point with the share of vectors it compared. The
 * probe count is the knob, measured against exact search.
 */
export const AnnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("ann").from;
  const qAt = n.word("ann", "Question");
  const textAt = n.word("ann", "Exact or approximate");
  const exactAt = n.word("ann", "Exact search compares the query");
  const everyAt = n.word("ann", "with every vector");
  const accurateAt = n.word("ann", "perfectly accurate");
  const fineAt = n.word("ann", "fine into the hundreds of thousands");
  const filterAt = n.word("ann", "especially after a filter");
  const beyondAt = n.word("ann-index", "Beyond that");
  const tradeAt = n.word("ann-index", "trade a little recall for big speedups");
  const hnswAt = n.word("ann-index", "HNSW, a graph index");
  const fastAt = n.word("ann-index", "fast and accurate");
  const memAt = n.word("ann-index", "memory-hungry and slow to build");
  const clusterAt = n.word("ann-index", "A cluster index");
  const nearestAt = n.word("ann-index", "only the clusters nearest the query");
  const modelAt = n.word("ann-sim", "Model it in NumPy");
  const sizeAt = n.word("ann-sim", "twenty thousand vectors in a hundred clusters");
  const oneAt = n.word("ann-sim", "Probe one cluster");
  const onePctAt = n.word("ann-sim", "one percent of the vectors");
  const seventyAt = n.word("ann-sim", "about seventy percent");
  const sixteenAt = n.word("ann-sim", "Probe sixteen");
  const ninetySixAt = n.word("ann-sim", "ninety-six");
  const knobAt = n.word("ann-measure", "That's the knob");
  const measureAt = n.word("ann-measure", "Measure recall against exact search");
  const defaultsAt = n.word("ann-measure", "don't trust the defaults");
  const end = n.beat("ann-measure").to;

  const top = y(SC.top);
  const px = (v: number) => SC.x + v * SC.w;
  const py = (v: number) => top + v * SC.h;
  const qx = px(Q.x);
  const qy = py(Q.y);

  const lines = ease(frame, everyAt, 20) * (1 - ease(frame, beyondAt, 12));
  const ringed = ease(frame, accurateAt, 10) * (1 - ease(frame, clusterAt, 12));
  const graph = ease(frame, hnswAt, 20) * (1 - ease(frame, clusterAt, 12));
  const cl = ease(frame, clusterAt, 14);
  const probe = ease(frame, nearestAt, 12);

  // The simulation's chart.
  const xs: Scale = { lo: 0, hi: 5, a: CH.x0, b: CH.x1 };
  const ys: Scale = { lo: 0.6, hi: 1.0, a: y(CH.bottom), b: y(CH.top) };
  const probes = ANN.probes;
  const xOf = (probe: number) => at(xs, Math.log2(probe));
  const pointAt = (i: number) => {
    const p = probes[i].probe;
    if (p === 1) return oneAt + 4;
    if (p === 16) return sixteenAt + 2;
    return (p < 16 ? oneAt + 10 : sixteenAt + 8) + i * 4;
  };
  const one = probes.find((p) => p.probe === 1)!;
  const sixteen = probes.find((p) => p.probe === 16)!;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={exactAt} level={-35} />
      <Sfx name="el-whoosh" at={everyAt} level={-37} />
      <Sfx name="el-pencil" at={hnswAt + 4} level={-36} />
      <Sfx name="el-pop" at={nearestAt + 2} level={-34} />
      <Sfx name="el-pencil" at={modelAt + 4} level={-36} />
      <Sfx name="el-tap" at={oneAt + 4} level={-34} />
      <Sfx name="el-tap" at={sixteenAt + 2} level={-34} />
      <Sfx name="el-chime" at={measureAt + 6} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          Exact or approximate nearest-neighbor search?
        </QuestionCard>

        {/* What exact search is, and when it is enough. */}
        <Note at={exactAt} x={X0} y={y(244)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>exact</b>: the query against every vector
            <span style={{ opacity: ease(frame, accurateAt - 2, 10), color: OK_INK }}>, perfectly accurate</span>
          </span>
        </Note>
        <Note at={fineAt - 2} x={X0} y={y(244) + 40} dim={tradeAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            fine into the hundreds of thousands
            <span style={{ opacity: ease(frame, filterAt - 2, 10) }}>, more so after a filter</span>
          </span>
        </Note>

        {/* The drawn space. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {cl > 0
            ? SPACE.centres.map((c, i) => (
                <circle
                  key={i}
                  cx={px(c.x)}
                  cy={py(c.y)}
                  r={SC.w * 0.11}
                  fill={i === PROBED ? `color-mix(in srgb, ${DATA} ${14 * probe}%, ${PAPER})` : "none"}
                  stroke={i === PROBED ? BLUE_INK : INK_SOFT}
                  strokeWidth={i === PROBED ? 2 + probe : 1.4}
                  strokeDasharray={i === PROBED && probe > 0.5 ? undefined : "5 6"}
                  opacity={cl * (i === PROBED ? 1 : 1 - 0.5 * probe)}
                />
              ))
            : null}
          {lines > 0
            ? SPACE.points.map((p, i) => {
                const s = ease(frame, everyAt + (i % 40) * 0.5, 8) * lines;
                return s > 0 ? (
                  <line key={i} x1={qx} y1={qy} x2={px(p.x)} y2={py(p.y)} stroke={INK_SOFT} strokeWidth={1} opacity={0.22 * s} />
                ) : null;
              })
            : null}
          {graph > 0
            ? EDGES.map(([a, b], k) => (
                <line
                  key={k}
                  x1={px(SPACE.points[a].x)}
                  y1={py(SPACE.points[a].y)}
                  x2={px(SPACE.points[b].x)}
                  y2={py(SPACE.points[b].y)}
                  stroke={ds("purple", 400)}
                  strokeWidth={2}
                  opacity={0.85 * graph * ease(frame, hnswAt + (k % 30) * 0.6, 8)}
                />
              ))
            : null}
          {SPACE.points.map((p, i) => {
            const s = ease(frame, exactAt + (i % 30) * 0.5, 8);
            if (s <= 0) return null;
            const inProbe = p.c === PROBED;
            const fill = probe > 0 && !inProbe ? `color-mix(in srgb, ${QUIET} ${100 * probe}%, ${DATA})` : DATA;
            return <circle key={i} cx={px(p.x)} cy={py(p.y)} r={5.5 * s} fill={fill} opacity={0.85} />;
          })}
          {TOP10.map((i) => (
            <circle
              key={i}
              cx={px(SPACE.points[i].x)}
              cy={py(SPACE.points[i].y)}
              r={10}
              fill="none"
              stroke={OK}
              strokeWidth={2.4}
              opacity={ringed}
            />
          ))}
        </svg>
        <QueryMark x={qx} y={qy} at={everyAt - 4} />
        <Note at={everyAt + 2} x={qx + 22} y={qy - 50} dim={hnswAt}>
          <span style={{ ...label(20, INK), fontWeight: 700, whiteSpace: "nowrap", background: PAPER, padding: "0 4px" }}>query</span>
        </Note>

        {/* The two approximate indexes, under the space. */}
        <Note at={tradeAt - 2} x={X0} y={top + SC.h + 20}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>approximate</b>: a little recall for big speedups
          </span>
        </Note>
        <Note at={hnswAt} x={X0} y={top + SC.h + 60} dim={clusterAt}>
          <span style={{ ...note(23, ds("purple", 600)), fontWeight: 650, whiteSpace: "nowrap" }}>
            HNSW, a graph index
            <span style={{ opacity: ease(frame, fastAt - 2, 10), color: INK, fontWeight: 500 }}>: fast and accurate</span>
            <span style={{ opacity: ease(frame, memAt - 2, 10), color: INK_SOFT, fontWeight: 500 }}>, memory-hungry, slow to build</span>
          </span>
        </Note>
        <Note at={clusterAt} x={X0} y={top + SC.h + 100}>
          <span style={{ ...note(23, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            a cluster index
            <span style={{ opacity: ease(frame, nearestAt - 2, 10), color: INK, fontWeight: 500 }}>: search only the nearest clusters</span>
          </span>
        </Note>

        {/* The simulation. */}
        <Note at={modelAt - 2} x={CH.x0 - 70} y={y(CH.top) - 116}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            modelled in NumPy
            <span style={{ opacity: ease(frame, sizeAt - 2, 10), fontWeight: 500 }}>
              : {num(ANN.n)} vectors, {ANN.lists} clusters
            </span>
          </span>
        </Note>
        <Note at={sizeAt + 4} x={CH.x0 - 70} y={y(CH.top) - 78}>
          <span style={madeUp(19)}>a seeded simulation, not a vector database: share of the exact top ten found</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, modelAt, 14)}>
            {[0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
              <g key={v}>
                <line x1={CH.x0 - 20} x2={CH.x1 + 20} y1={at(ys, v)} y2={at(ys, v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
                <text x={CH.x0 - 34} y={at(ys, v) + 7} textAnchor="end" style={svgText({ ...label(20, INK_SOFT), ...TABULAR })}>
                  {pct(v)}
                </text>
              </g>
            ))}
            <line x1={CH.x0 - 20} x2={CH.x1 + 20} y1={y(CH.bottom) + 24} y2={y(CH.bottom) + 24} stroke={INK} strokeWidth={1.6} />
            {probes.map((p) => (
              <text key={p.probe} x={xOf(p.probe)} y={y(CH.bottom) + 56} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), ...TABULAR })}>
                {p.probe}
              </text>
            ))}
          </g>
          {probes.slice(1).map((p, i) => {
            const prev = probes[i];
            const s = ease(frame, pointAt(i + 1), 10);
            return s > 0 ? (
              <line
                key={p.probe}
                x1={xOf(prev.probe)}
                y1={at(ys, prev.recall)}
                x2={xOf(prev.probe) + (xOf(p.probe) - xOf(prev.probe)) * s}
                y2={at(ys, prev.recall) + (at(ys, p.recall) - at(ys, prev.recall)) * s}
                stroke={DATA}
                strokeWidth={3}
              />
            ) : null;
          })}
          {probes.map((p, i) => {
            const s = ease(frame, pointAt(i), 8);
            const lit = p.probe === 1 || p.probe === 16;
            return s > 0 ? (
              <circle key={p.probe} cx={xOf(p.probe)} cy={at(ys, p.recall)} r={(lit ? 9 : 6.5) * s} fill={lit ? BLUE_INK : DATA} stroke={PAPER} strokeWidth={2} />
            ) : null;
          })}
        </svg>
        <Note at={modelAt + 6} x={CH.x1 - 360} y={y(CH.bottom) + 84}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Mark at={knobAt + 2}>clusters probed: the knob</Mark>
          </span>
        </Note>
        <Note at={onePctAt - 2} x={xOf(1) + 18} y={at(ys, one.recall) + 14}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            compares {pct(one.work)} of the vectors
            <br />
            <span style={{ opacity: ease(frame, seventyAt - 2, 10), color: BLUE_INK, fontWeight: 700 }}>finds {pct(one.recall)}</span>
          </span>
        </Note>
        <Note at={sixteenAt + 2} x={xOf(16) + 18} y={at(ys, sixteen.recall) + 18}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            compares {pct(sixteen.work)}
            <br />
            <span style={{ opacity: ease(frame, ninetySixAt - 2, 10), color: BLUE_INK, fontWeight: 700 }}>finds {pct(sixteen.recall)}</span>
          </span>
        </Note>
        <Note at={measureAt - 2} x={CH.x0 - 70} y={y(CH.bottom) + 132}>
          <span style={{ ...note(25, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={measureAt + 6} color={MARK_OK}>
              measure recall against exact search
            </Mark>
            <span style={{ opacity: ease(frame, defaultsAt - 2, 10), color: INK_SOFT, fontWeight: 500 }}>, not the defaults</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
