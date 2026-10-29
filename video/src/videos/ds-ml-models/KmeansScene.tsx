import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import {
  BLUE_INK,
  INK,
  INK_SOFT,
  PAPER,
  TABULAR,
  fmt,
  label,
  note,
} from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KMEANS } from "./data";
import {
  at,
  Axes,
  type Box,
  C0,
  CLASS,
  Drift,
  Frame,
  Mark,
  OK,
  OK_INK,
  Points,
  pulse,
  type Scale,
  scales,
  Svg,
  X0,
} from "./parts";

const PLOT = { left: X0 + 20, top: 340, width: 760, height: 476 };
const XLIM: [number, number] = [-10.6, 8.2];
const YLIM: [number, number] = [-10.6, 13];
const CH_X = 1080;
const CH_W = 700;
const ELBOW_TOP = 372;
const ELBOW_H = 210;
const SIL_TOP = 736;
const SIL_H = 112;

const LABELS = KMEANS.steps.map((s) => s.labels.split("").map(Number));
/** Where the three starting centers sit together. */
const START = [0, 1].map(
  (d) => KMEANS.steps[0].centroids.reduce((a, c) => a + c[d], 0) / 3,
) as [number, number];
const thousands = (v: number) => Math.round(v).toLocaleString("en-US");

/**
 * Question 8 on the page's three blobs. Three centers dropped into one blob,
 * every point taking its nearest center's ink, and each center's target (its
 * points' mean) marked while the recipe is read. The moves themselves wait
 * for the account of this run: two centers jump across on "two of them
 * jump", and the third pass settles on "it settles". Then the elbow in the
 * within-cluster sum of squares, the silhouette score peaking at the same k,
 * and the method's limits under the run.
 */
export const KmeansScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("kmeans").from;
  const qAt = n.word("kmeans", "Question eight");
  const textAt = n.word("kmeans", "What is k-means clustering");
  const placeAt = n.word("kmeans", "Place k centers");
  const assignAt = n.word("kmeans", "assign each point to the nearest");
  const moveAt = n.word("kmeans", "move each center to the mean");
  const startAt = n.word("kmeans", "all start in one group");
  const jumpAt = n.word("kmeans", "two of them jump");
  const settleAt = n.word("kmeans", "it settles");
  const roundAt = n.word("kmeans-limits", "assumes round clusters");
  const outlierAt = n.word("kmeans-limits", "outliers drag the means");
  const ssAt = n.word("kmeans-k", "the within-cluster sum of squares");
  const fallsAt = n.word("kmeans-k", "always falls as k grows");
  const elbowAt = n.word("kmeans-k", "look for the elbow");
  const twentyAt = n.word("kmeans-k", "twenty thousand at one cluster");
  const threeAt = n.word("kmeans-k", "five sixty-seven at three");
  const barelyAt = n.word("kmeans-k", "barely moves");
  const silAt = n.word("kmeans-k", "The silhouette score");
  const nearerAt = n.word("kmeans-k", "how much nearer each point sits");
  const peaksAt = n.word("kmeans-k", "peaks at three as well");
  const startsAt = n.word("kmeans-starts", "run several starts");
  const wrongAt = n.word("kmeans-starts", "settle in the wrong place");
  const troubleAt = n.word("pca-in", "More features");
  const clearAt = n.word("pca-in", "their own");
  const end = n.beat("pca-in").to;

  const box: Box = {
    left: PLOT.left,
    top: y(PLOT.top),
    width: PLOT.width,
    height: h(PLOT.height),
  };
  const { x: sx, y: sy } = scales(box, XLIM, YLIM);

  // Lloyd's algorithm. The recipe plays over the first assignment, with
  // each center's target marked; the moves are cued to the sentence that
  // tells this run, so the jump is seen while it is described.
  const moves = [jumpAt, settleAt - 20];
  const recolor = [assignAt + 2, jumpAt + 16, settleAt - 4];
  const C = KMEANS.steps.map((s) => s.centroids);
  const centerAt = (j: number): [number, number] => {
    let [cx, cy] = C[0][j];
    moves.forEach((m, s) => {
      const p = ease(frame, m, 18);
      cx += (C[s + 1][j][0] - cx) * p;
      cy += (C[s + 1][j][1] - cy) * p;
    });
    return [cx, cy];
  };
  const pass = 1 + moves.filter((m) => frame >= m).length;
  const settled = ease(frame, settleAt, 12);

  // The elbow and the silhouette.
  const ex: Scale = { lo: 0.6, hi: 8.4, a: CH_X + 60, b: CH_X + CH_W };
  const ey: Scale = {
    lo: 0,
    hi: 22000,
    a: y(ELBOW_TOP) + h(ELBOW_H),
    b: y(ELBOW_TOP),
  };
  const silY: Scale = { lo: 0, hi: 1, a: y(SIL_TOP) + h(SIL_H), b: y(SIL_TOP) };
  const lineP = ease(frame, fallsAt, 26);
  const best = KMEANS.elbow[2];
  const okLit = ease(frame, threeAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={placeAt - 4} level={-36} />
      <Sfx name="el-tap" at={placeAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={moves[0]} level={-36} />
      <Sfx name="el-whoosh" at={moves[1]} level={-37} />
      <Sfx name="el-chime" at={settleAt} level={-36} />
      <Sfx name="el-pencil" at={fallsAt} level={-35} />
      <Sfx name="el-pop" at={threeAt} level={-33} />
      <Sfx name="el-pop" at={peaksAt} level={-34} />

      <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt + 4, 10) }}>
        <Drift from={from} to={end + 40}>
          <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
            What is k-means clustering?
          </QuestionCard>

          {/* ── The run ── */}
          <Frame box={box} at={placeAt - 6} />
          <Points
            xs={KMEANS.x}
            ys={KMEANS.y}
            sx={sx}
            sy={sy}
            at={placeAt - 6}
            spread={14}
            r={4.6}
            color={INK_SOFT}
            opacity={0.6}
          />
          {LABELS.map((lab, s) => (
            <Points
              key={s}
              xs={KMEANS.x}
              ys={KMEANS.y}
              labels={lab}
              sx={sx}
              sy={sy}
              at={recolor[s]}
              spread={10}
              r={4.6}
              out={recolor[s + 1]}
            />
          ))}
          {/* Where each center is about to go: the mean of its points. */}
          <Svg
            opacity={
              ease(frame, moveAt + 2, 12) * (1 - ease(frame, moves[0] + 14, 8))
            }
          >
            {C[1].map(([cx, cy], j) => (
              <circle
                key={j}
                cx={at(sx, cx)}
                cy={at(sy, cy)}
                r={15}
                fill="none"
                stroke={CLASS[j]}
                strokeWidth={3}
                strokeDasharray="4 5"
              />
            ))}
          </Svg>
          <Svg opacity={ease(frame, startAt, 12)}>
            {[1, 2].map((j) => {
              const p = ease(frame, jumpAt + (j - 1) * 4, 20);
              const pts = C.map(
                (c) => [at(sx, c[j][0]), at(sy, c[j][1])] as const,
              );
              const d = pts
                .map(([a, b], i) => `${i ? "L" : "M"}${a},${b}`)
                .join(" ");
              return (
                <path
                  key={j}
                  d={d}
                  fill="none"
                  stroke={CLASS[j]}
                  strokeWidth={2.6}
                  strokeDasharray="6 7"
                  opacity={p}
                />
              );
            })}
            {C[0].map(([cx, cy], j) => (
              <circle
                key={j}
                cx={at(sx, cx)}
                cy={at(sy, cy)}
                r={13}
                fill="none"
                stroke={CLASS[j]}
                strokeWidth={2}
                strokeDasharray="3 4"
              />
            ))}
            <circle
              cx={at(sx, START[0])}
              cy={at(sy, START[1])}
              r={h(66) + 6 * pulse(frame, startAt, 20)}
              fill="none"
              stroke={INK}
              strokeWidth={1.6}
              strokeDasharray="5 6"
            />
          </Svg>
          <Note
            at={startAt + 4}
            x={at(sx, START[0]) + h(76)}
            y={at(sy, START[1]) - h(16)}
          >
            <span
              style={{
                ...label(21, INK),
                whiteSpace: "nowrap",
                background: PAPER,
                padding: "0 6px",
              }}
            >
              all three start here
            </span>
          </Note>
          <Svg opacity={ease(frame, placeAt, 10)}>
            {[0, 1, 2].map((j) => {
              const [cx, cy] = centerAt(j);
              const px = at(sx, cx);
              const py = at(sy, cy);
              const s = ease(frame, placeAt + j * 4, 10);
              return (
                <g key={j} transform={`translate(${px},${py}) scale(${s})`}>
                  <circle
                    r={15}
                    fill={PAPER}
                    stroke={CLASS[j]}
                    strokeWidth={4.5}
                  />
                  <path
                    d="M-6,-6 L6,6 M6,-6 L-6,6"
                    stroke={CLASS[j]}
                    strokeWidth={3.4}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </Svg>
          {/* The run's counter heads the plot, so the two caveats below it
              each get a line of their own. */}
          <Note at={placeAt + 2} x={box.left} y={box.top - h(40)}>
            <span
              style={{
                ...label(21, INK_SOFT),
                ...TABULAR,
                whiteSpace: "nowrap",
              }}
            >
              {KMEANS.x.length} points · pass {pass}
              <span
                style={{ color: OK_INK, fontWeight: 650, opacity: settled }}
              >
                {" "}
                · settled
              </span>
            </span>
          </Note>
          <Note at={roundAt} x={box.left} y={box.top + box.height + h(14)}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
              assumes round clusters of similar size
              <span
                style={{ color: INK_SOFT, opacity: ease(frame, outlierAt, 10) }}
              >
                ; outliers drag the means
              </span>
            </span>
          </Note>
          <Note at={startsAt} x={box.left} y={box.top + box.height + h(54)}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
              <Mark at={troubleAt}>run several starts, or k-means++</Mark>
              <span
                style={{ color: INK_SOFT, opacity: ease(frame, wrongAt, 10) }}
              >
                : a bad start can settle wrong
              </span>
            </span>
          </Note>

          {/* ── The elbow ── */}
          <Note at={ssAt} x={CH_X} y={y(ELBOW_TOP) - h(52)}>
            <span
              style={{
                ...label(22, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              within-cluster sum of squares
            </span>
          </Note>
          <Axes
            x={ex}
            y={ey}
            xTicks={[1, 2, 3, 4, 5, 6, 7, 8]}
            yTicks={[0, 10000, 20000]}
            yFormat={(v) => (v ? `${v / 1000}k` : "0")}
            xTitle="k, the number of clusters"
            at={ssAt}
            size={18}
          />
          <Svg opacity={ease(frame, fallsAt - 2, 8)}>
            <defs>
              <clipPath id="kmeans-elbow-reveal">
                <rect
                  x={ex.a - 10}
                  y={ey.b - 30}
                  width={(ex.b - ex.a + 20) * lineP}
                  height={ey.a - ey.b + 60}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#kmeans-elbow-reveal)">
              <path
                d={KMEANS.elbow
                  .map(
                    (e, i) =>
                      `${i ? "L" : "M"}${at(ex, e.k)},${at(ey, e.inertia)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={C0}
                strokeWidth={3}
                strokeLinejoin="round"
              />
              {KMEANS.elbow.map((e) => (
                <circle
                  key={e.k}
                  cx={at(ex, e.k)}
                  cy={at(ey, e.inertia)}
                  r={e.k === 3 ? 7 + 4 * okLit : 6}
                  fill={e.k === 3 && okLit > 0 ? OK : C0}
                />
              ))}
            </g>
          </Svg>
          <Note
            at={twentyAt}
            x={at(ex, 1) + 16}
            y={at(ey, KMEANS.elbow[0].inertia) - h(14)}
          >
            <span
              style={{
                ...note(22, BLUE_INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
                ...TABULAR,
              }}
            >
              {thousands(KMEANS.elbow[0].inertia)}
            </span>
          </Note>
          <Note at={threeAt} x={at(ex, 3) + 6} y={at(ey, best.inertia) - h(58)}>
            <span
              style={{
                ...note(22, OK_INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
                ...TABULAR,
              }}
            >
              {fmt(best.inertia, 0)}: the elbow
            </span>
          </Note>
          <Note
            at={barelyAt}
            x={at(ex, 5.6)}
            y={at(ey, KMEANS.elbow[5].inertia) - h(76)}
          >
            <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
              then barely moves
            </span>
          </Note>
          <Note
            at={elbowAt}
            x={CH_X + CH_W}
            y={y(ELBOW_TOP) - h(52)}
            align="right"
            from="right"
          >
            <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
              always falls: look for the bend
            </span>
          </Note>

          {/* ── The silhouette ── */}
          <Note at={silAt} x={CH_X} y={y(SIL_TOP) - h(54)}>
            <span
              style={{
                ...label(22, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              silhouette score
            </span>
          </Note>
          <Note at={nearerAt} x={CH_X + 190} y={y(SIL_TOP) - h(52)}>
            <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>
              how much nearer a point sits to its own cluster
            </span>
          </Note>
          {KMEANS.elbow
            .filter((e) => e.silhouette !== null)
            .map((e, i) => {
              const p = ease(frame, silAt + 4 + i * 2, 12);
              const v = e.silhouette ?? 0;
              const lit = e.k === 3 ? ease(frame, peaksAt, 12) : 0;
              const bw = 46;
              return (
                <React.Fragment key={e.k}>
                  <div
                    style={{
                      position: "absolute",
                      left: at(ex, e.k) - bw / 2,
                      top: at(silY, v * p),
                      width: bw,
                      height: at(silY, 0) - at(silY, v * p),
                      background:
                        lit > 0
                          ? `color-mix(in srgb, ${OK} ${100 * lit}%, ${C0})`
                          : C0,
                      opacity: 0.85,
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: at(ex, e.k) - 30,
                      width: 60,
                      textAlign: "center",
                      top: at(silY, 0) + 6,
                      opacity: p,
                      ...label(18, INK_SOFT),
                      ...TABULAR,
                    }}
                  >
                    {e.k}
                  </div>
                </React.Fragment>
              );
            })}
          <Note
            at={peaksAt}
            x={at(ex, 3) + 30}
            y={at(silY, KMEANS.silhouette) - h(8)}
          >
            <span
              style={{
                ...note(22, OK_INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
                ...TABULAR,
              }}
            >
              {fmt(KMEANS.silhouette, 2)}, the peak
            </span>
          </Note>
        </Drift>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
