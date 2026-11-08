import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ANN, num, pct } from "./data";
import { at, DATA, Drift, madeUp, Mark, MARK_OK, OK, OK_INK, QueryMark, QUIET, type Scale, X0 } from "./parts";
import { clusters, graphEdges, greedyWalk, nearestOf } from "./space";

const SC = { x: 140, w: 680, top: 380, h: 470 };
const CH = { x0: 1060, x1: 1720, top: 440, bottom: 740 };

/**
 * The drawn space: a picture of the mechanism, no measured number. Every
 * distance in it is measured where it is drawn (px from the space's corner),
 * so the ten nearest, the graph's edges and the walk are what the eye sees.
 */
const SPACE = clusters(144, 9, 26, 0.035, SC.w / SC.h, 0.21);
const PTS = SPACE.points.map((p) => ({ x: p.x * SC.w, y: p.y * SC.h, c: p.c }));
const CENTRES = SPACE.centres.map((c) => ({ x: c.x * SC.w, y: c.y * SC.h }));
/** The query, placed on the border between two clusters (drawn px). */
const Q = { x: 284, y: 232 };
const TOP10 = nearestOf(PTS, Q.x, Q.y, 10);
const EDGES = graphEdges(PTS, 2);
/** A cluster index's lists: every point in the list of its nearest centre. */
const nearestCentre = (x: number, y: number) =>
  CENTRES.map((c, i) => ({ i, d: Math.hypot(c.x - x, c.y - y) })).sort((a, b) => a.d - b.d)[0].i;
const LIST = PTS.map((p) => nearestCentre(p.x, p.y));
/** Each list's circle: it holds every point of the list, with 8px to spare. */
const RADIUS = CENTRES.map((c, ci) => Math.max(...PTS.filter((_, i) => LIST[i] === ci).map((p) => Math.hypot(p.x - c.x, p.y - c.y))) + 8);
/** The list whose centre is nearest the query: the one a probe of 1 searches. */
const PROBED = nearestCentre(Q.x, Q.y);
/** The true nearest that sit across the border, in a list a probe of 1 never opens. */
const MISSED = TOP10.filter((i) => LIST[i] !== PROBED);
/** HNSW's search, from the point farthest from the query: long hops, then short. */
const FAR = PTS.map((p, i) => ({ i, d: Math.hypot(p.x - Q.x, p.y - Q.y) })).sort((a, b) => b.d - a.d)[0].i;
const WALK = greedyWalk(PTS, FAR, Q.x, Q.y, [160, 160, 140, 120, 100, 70, 40]);
if (WALK[WALK.length - 1] !== TOP10[0]) throw new Error("the walk should end at the query's nearest point");

/**
 * Question 6. Left, a drawn space of points in nine clusters and a query on
 * the border between two of them. Exact search: a line to every point, and
 * the true ten nearest ringed in green, kept for the rest of the scene. Then
 * the two approximate indexes: HNSW as a graph (each point joined to its two
 * nearest) and a greedy walk through it from a far point to the query's
 * nearest; and IVF, a cluster index, where only the cluster nearest the
 * query is searched, so the three true neighbours across the border are
 * missed (red) when the chart says a probe of 1 finds 69%. Right, the seeded
 * NumPy simulation from check.mjs, labelled as one, on axes drawn from
 * "Beyond that": the recall a probe of 1 to 32 of the 100 clusters gets,
 * each point with the share of vectors it compared. The probe count is the
 * knob (search breadth is HNSW's), measured against exact search.
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
  const hnswAt = n.word("ann-hnsw", "HNSW, a graph index");
  const fastAt = n.word("ann-hnsw", "fast and accurate");
  const memAt = n.word("ann-hnsw", "memory-hungry and slow to build");
  const clusterAt = n.word("ann-ivf", "A cluster index");
  const ivfAt = n.word("ann-ivf", "called IVF");
  const lessAt = n.word("ann-ivf", "uses less memory and builds faster");
  const nearestAt = n.word("ann-ivf", "only the clusters nearest the query");
  const modelAt = n.word("ann-sim", "Model it in NumPy");
  const sizeAt = n.word("ann-sim", "twenty thousand vectors in a hundred clusters");
  const oneAt = n.word("ann-sim", "Probe one cluster");
  const onePctAt = n.word("ann-sim", "one percent of the vectors");
  const seventyAt = n.word("ann-sim", "about seventy percent");
  const sixteenAt = n.word("ann-sim", "Probe sixteen");
  const ninetySixAt = n.word("ann-sim", "ninety-six");
  const knobAt = n.word("ann-knob", "That's the knob");
  const breadthAt = n.word("ann-knob", "search breadth in HNSW");
  const measureAt = n.word("ann-measure", "Measure recall against exact search");
  const defaultsAt = n.word("ann-measure", "don't trust the defaults");
  const end = n.beat("ann-measure").to;

  const top = y(SC.top);
  // Drawn px within the space, to the page.
  const px = (v: number) => SC.x + v;
  const py = (v: number) => top + v;
  const qx = px(Q.x);
  const qy = py(Q.y);

  const lines = ease(frame, everyAt, 20) * (1 - ease(frame, beyondAt, 12));
  const ringed = ease(frame, accurateAt, 10);
  const graph = ease(frame, hnswAt, 20) * (1 - ease(frame, clusterAt, 12));
  const cl = ease(frame, clusterAt, 14);
  const probe = ease(frame, nearestAt, 12);
  const missed = ease(frame, seventyAt + 2, 10);
  const missBox = {
    x: Math.max(...MISSED.map((i) => PTS[i].x)),
    y: MISSED.reduce((a, i) => a + PTS[i].y, 0) / MISSED.length,
  };

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
      <Sfx name="el-whoosh" at={fastAt} level={-37} />
      <Sfx name="el-pop" at={nearestAt + 2} level={-34} />
      <Sfx name="el-scratch" at={seventyAt + 4} level={-36} />
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
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b>exact</b>: the query against every vector
            <span style={{ opacity: ease(frame, accurateAt - 2, 10), color: OK_INK }}>, perfectly accurate</span>
          </span>
        </Note>
        <Note at={fineAt - 2} x={X0} y={y(244) + 40} dim={tradeAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            fine into the hundreds of thousands
            <span style={{ opacity: ease(frame, filterAt - 2, 10) }}>, more so after a filter</span>
          </span>
        </Note>

        {/* The drawn space. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {cl > 0
            ? CENTRES.map((c, i) => (
                <circle
                  key={i}
                  cx={px(c.x)}
                  cy={py(c.y)}
                  r={RADIUS[i]}
                  fill={i === PROBED ? `color-mix(in srgb, ${DATA} ${14 * probe}%, ${PAPER})` : "none"}
                  stroke={i === PROBED ? BLUE_INK : INK_SOFT}
                  strokeWidth={i === PROBED ? 2 + probe : 1.4}
                  strokeDasharray={i === PROBED && probe > 0.5 ? undefined : "5 6"}
                  opacity={cl * (i === PROBED ? 1 : 1 - 0.5 * probe)}
                />
              ))
            : null}
          {lines > 0
            ? PTS.map((p, i) => {
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
                  x1={px(PTS[a].x)}
                  y1={py(PTS[a].y)}
                  x2={px(PTS[b].x)}
                  y2={py(PTS[b].y)}
                  stroke={ds("purple", 400)}
                  strokeWidth={2}
                  opacity={0.85 * graph * ease(frame, hnswAt + (k % 30) * 0.6, 8)}
                />
              ))
            : null}
          {/* The greedy walk: long hops first, then short ones, to the nearest. */}
          {graph > 0
            ? WALK.slice(1).map((b, k) => {
                const a = WALK[k];
                const s = ease(frame, fastAt + k * 7, 8);
                if (s <= 0) return null;
                const [x1, y1, x2, y2] = [px(PTS[a].x), py(PTS[a].y), px(PTS[b].x), py(PTS[b].y)];
                return (
                  <line
                    key={k}
                    x1={x1}
                    y1={y1}
                    x2={x1 + (x2 - x1) * s}
                    y2={y1 + (y2 - y1) * s}
                    stroke={ds("purple", 600)}
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={graph}
                  />
                );
              })
            : null}
          {PTS.map((p, i) => {
            const s = ease(frame, exactAt + (i % 30) * 0.5, 8);
            if (s <= 0) return null;
            const inProbe = LIST[i] === PROBED;
            const fill = probe > 0 && !inProbe ? `color-mix(in srgb, ${QUIET} ${100 * probe}%, ${DATA})` : DATA;
            return <circle key={i} cx={px(p.x)} cy={py(p.y)} r={5.5 * s} fill={fill} opacity={0.85} />;
          })}
          {TOP10.map((i) => (
            <circle
              key={i}
              cx={px(PTS[i].x)}
              cy={py(PTS[i].y)}
              r={10}
              fill="none"
              stroke={MISSED.includes(i) ? `color-mix(in srgb, ${ACCENT} ${100 * missed}%, ${OK})` : OK}
              strokeWidth={MISSED.includes(i) ? 2.4 + 0.6 * missed : 2.4}
              opacity={ringed}
            />
          ))}
        </svg>
        <Note at={seventyAt + 4} x={px(missBox.x) + 18} y={py(missBox.y) - 16}>
          <span style={{ ...label(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap", background: PAPER, padding: "0 6px" }}>
            missed: across the border
          </span>
        </Note>
        <QueryMark x={qx} y={qy} at={everyAt - 4} />
        <Note at={everyAt + 2} x={qx + 26} y={qy - 15} dim={hnswAt}>
          <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap", background: PAPER, padding: "0 4px" }}>query</span>
        </Note>

        {/* Approximate, under exact; the two indexes under the space. */}
        <Note at={tradeAt - 2} x={X0} y={y(244) + 80}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>approximate</b>: a little recall for big speedups
          </span>
        </Note>
        <Note at={hnswAt} x={X0} y={top + SC.h + 20} dim={clusterAt}>
          <span style={{ ...note(24, ds("purple", 600)), fontWeight: 500, whiteSpace: "nowrap" }}>
            HNSW, a graph index
            <span style={{ opacity: ease(frame, fastAt - 2, 10), color: INK, fontWeight: 500 }}>: fast and accurate</span>
            <span style={{ opacity: ease(frame, memAt - 2, 10), color: INK_SOFT, fontWeight: 500 }}>, memory-hungry, slow to build</span>
          </span>
        </Note>
        <Note at={clusterAt} x={X0} y={top + SC.h + 60}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, ivfAt - 2, 10) }}>IVF, </span>a cluster index
            <span style={{ opacity: ease(frame, nearestAt - 2, 10), color: INK, fontWeight: 500 }}>: search only the nearest clusters</span>
          </span>
        </Note>
        <Note at={lessAt - 2} x={X0} y={top + SC.h + 100}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>less memory and faster builds than HNSW; often with product quantization</span>
        </Note>

        {/* The simulation. */}
        <Note at={modelAt - 2} x={CH.x0 - 70} y={y(CH.top) - 136}>
          <span style={{ ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            modelled in NumPy
            <span style={{ opacity: ease(frame, sizeAt - 2, 10), fontWeight: 500 }}>
              : {num(ANN.n)} vectors, {ANN.lists} clusters
            </span>
          </span>
        </Note>
        <Note at={sizeAt + 4} x={CH.x0 - 70} y={y(CH.top) - 100}>
          <span style={madeUp(19)}>a seeded simulation, not a vector database</span>
        </Note>
        {/* The chart's frame, up from "Beyond that", so the right half is never bare. */}
        <Note at={tradeAt + 4} x={CH.x0 - 70} y={y(CH.top) - 62}>
          <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            recall<span style={{ fontWeight: 500, color: INK_SOFT }}>: the share of the true top ten found</span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, beyondAt + 4, 14)}>
            {[0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
              <g key={v}>
                <line x1={CH.x0 - 20} x2={CH.x1 + 20} y1={at(ys, v)} y2={at(ys, v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
                <text x={CH.x0 - 34} y={at(ys, v) + 7} textAnchor="end" style={svgText({ ...label(24, INK_SOFT), ...TABULAR })}>
                  {pct(v)}
                </text>
              </g>
            ))}
            <line x1={CH.x0 - 20} x2={CH.x1 + 20} y1={y(CH.bottom) + 24} y2={y(CH.bottom) + 24} stroke={INK} strokeWidth={1.6} />
          </g>
          <g opacity={ease(frame, nearestAt, 14)}>
            {probes.map((p) => (
              <text key={p.probe} x={xOf(p.probe)} y={y(CH.bottom) + 56} textAnchor="middle" style={svgText({ ...label(24, INK_SOFT), ...TABULAR })}>
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
        <Note at={nearestAt + 4} x={CH.x1 - 520} y={y(CH.bottom) + 84}>
          <span style={{ ...label(24, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Mark at={knobAt + 2}>clusters probed: the knob</Mark>
            <span style={{ opacity: ease(frame, breadthAt - 2, 10), fontWeight: 500 }}> (in HNSW, search breadth)</span>
          </span>
        </Note>
        <Note at={onePctAt - 2} x={xOf(1) + 18} y={at(ys, one.recall) + 14}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            compares {pct(one.work)} of the vectors
            <br />
            <span style={{ opacity: ease(frame, seventyAt - 2, 10), color: BLUE_INK, fontWeight: 500 }}>finds {pct(one.recall)}</span>
          </span>
        </Note>
        <Note at={sixteenAt + 2} x={xOf(16) + 18} y={at(ys, sixteen.recall) + 18}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            compares {pct(sixteen.work)}
            <br />
            <span style={{ opacity: ease(frame, ninetySixAt - 2, 10), color: BLUE_INK, fontWeight: 500 }}>finds {pct(sixteen.recall)}</span>
          </span>
        </Note>
        <Note at={measureAt - 2} x={CH.x0 - 70} y={y(CH.bottom) + 132}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
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
