import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT_INK,
  BLUE_INK,
  INK,
  INK_SOFT,
  PAPER,
  TABULAR,
  label,
  note,
} from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KNN, MOONS, VOTE } from "./data";
import {
  at,
  type Box,
  C0,
  C1,
  CLASS,
  Drift,
  Frame,
  Mark,
  OK_INK,
  PanelTitle,
  Points,
  Regions,
  scales,
  Svg,
  X0,
} from "./parts";

const BIG: Omit<Box, "top" | "height"> & { top: number; height: number } = {
  left: X0 + 20,
  width: 720,
  top: 340,
  height: 497,
};
const PW = 520;
const PH = 359;
const LEFTS = [X0 + 20, X0 + 570, X0 + 1120];
const TOP = 350;
const COL = 1000;

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width={16}
    height={16}
    style={{ display: "inline-block", verticalAlign: "-1px" }}
  >
    <circle cx={8} cy={8} r={7} fill={color} />
  </svg>
);

/**
 * Question 7, on the hook's moons. One new point, its fifteen nearest
 * training points joined to it inside the circle that holds them, and the
 * vote. Then the three borders k draws, at 1, 15 and 75, each with its two
 * scores; and the labels taken away on the bridge into clustering.
 */
export const KnnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("knn").from;
  const qAt = n.word("knn", "Question seven");
  const textAt = n.word("knn", "How does k-nearest neighbors");
  const keepAt = n.word("knn", "It keeps every training point");
  const newAt = n.word("knn", "For a new one");
  const closestAt = n.word("knn", "the k closest");
  const voteAt = n.word("knn", "takes a vote");
  const tenAt = n.word("knn", "ten against five");
  const noTrainAt = n.word("knn", "There's no training step");
  const slowAt = n.word("knn", "slow on large data");
  const tradeAt = n.word("knn-k", "And k sets the trade-off");
  const oneAt = n.word("knn-k", "At k equals one");
  const patchAt = n.word("knn-k", "owns a patch of its own");
  const newOnesAt = n.word("knn-k", "seventy-nine on new ones");
  const fifteenAt = n.word("knn-k", "At fifteen");
  const ninetyThreeAt = n.word("knn-k", "scores ninety-three");
  const seventyFiveAt = n.word("knn-k", "At seventy-five");
  const eightySevenAt = n.word("knn-k", "drops to eighty-seven");
  const varianceAt = n.word("knn-k", "Small k is high variance");
  const biasAt = n.word("knn-k", "large k high bias");
  const cvAt = n.word("knn-k", "choose it by cross-validation");
  const labelsAt = n.word("kmeans-in", "Neighbors need labels");
  const withoutAt = n.word("kmeans-in", "Without them");
  const end = n.beat("kmeans-in").to;

  // ── One new point and its vote ──
  const big: Box = {
    left: BIG.left,
    top: y(BIG.top),
    width: BIG.width,
    height: h(BIG.height),
  };
  const { x: bx, y: by } = scales(big, MOONS.xlim, MOONS.ylim);
  const out1 = tradeAt - 2;
  const qx = at(bx, VOTE.q[0]);
  const qy = at(by, VOTE.q[1]);
  // The neighbors' radius in data units, through each axis's own scale: the
  // y scale is denser than x, so a circle in pixels left the top ones out.
  // Padded past the fifteenth neighbor, which sits exactly at that radius.
  const ring = ease(frame, closestAt, 16);
  const ringRx = (at(bx, VOTE.q[0] + VOTE.radius) - qx + 12) * ring;
  const ringRy = (qy - at(by, VOTE.q[1] + VOTE.radius) + 12) * ring;

  const panels = [
    {
      k: "1" as const,
      at: oneAt,
      score: newOnesAt,
      under: varianceAt,
      tag: "high variance",
      tagInk: ACCENT_INK,
    },
    {
      k: "15" as const,
      at: fifteenAt,
      score: ninetyThreeAt,
      under: cvAt,
      tag: "",
      tagInk: OK_INK,
    },
    {
      k: "75" as const,
      at: seventyFiveAt,
      score: eightySevenAt,
      under: biasAt,
      tag: "high bias",
      tagInk: ACCENT_INK,
    },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={keepAt} level={-36} />
      <Sfx name="el-tap" at={newAt + 2} level={-34} />
      <Sfx name="el-pencil" at={closestAt + 2} level={-35} />
      <Sfx name="el-pop" at={tenAt + 2} level={-33} />
      {panels.map((p) => (
        <Sfx key={p.k} name="el-whoosh" at={p.at + 2} level={-36} />
      ))}
      <Sfx name="el-scratch" at={withoutAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          How does k-nearest neighbors (KNN) make predictions?
        </QuestionCard>

        {/* ── One new point ── */}
        <Frame box={big} at={keepAt - 4} out={out1} />
        <Points
          xs={MOONS.x}
          ys={MOONS.y}
          labels={MOONS.label}
          sx={bx}
          sy={by}
          at={keepAt}
          spread={18}
          r={6}
          out={out1}
        />
        <Svg opacity={ease(frame, closestAt, 12) * (1 - ease(frame, out1, 10))}>
          <ellipse
            cx={qx}
            cy={qy}
            rx={Math.max(0, ringRx)}
            ry={Math.max(0, ringRy)}
            fill="none"
            stroke={INK}
            strokeWidth={1.6}
            strokeDasharray="5 6"
          />
          {VOTE.neighbors.map((i, j) => {
            const p = ease(frame, closestAt + 4 + j, 8);
            const nx = at(bx, MOONS.x[i]);
            const ny = at(by, MOONS.y[i]);
            return (
              <g key={i}>
                <line
                  x1={qx}
                  y1={qy}
                  x2={qx + (nx - qx) * p}
                  y2={qy + (ny - qy) * p}
                  stroke={CLASS[MOONS.label[i]]}
                  strokeWidth={2}
                  opacity={0.8}
                />
                <circle
                  cx={nx}
                  cy={ny}
                  r={9 * ease(frame, voteAt + j, 8)}
                  fill="none"
                  stroke={CLASS[MOONS.label[i]]}
                  strokeWidth={2.4}
                />
              </g>
            );
          })}
        </Svg>
        <Svg opacity={ease(frame, newAt, 10) * (1 - ease(frame, out1, 10))}>
          <circle
            cx={qx}
            cy={qy}
            r={11}
            fill={PAPER}
            stroke={INK}
            strokeWidth={3}
          />
          <circle cx={qx} cy={qy} r={4} fill={INK} />
        </Svg>

        <Note at={keepAt} x={COL} y={y(350)} out={out1}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            keeps all {MOONS.nTrain} training points
          </span>
        </Note>
        <Note at={newAt} x={COL} y={y(410)} out={out1}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            a new point{" "}
            <span style={{ opacity: ease(frame, closestAt, 10) }}>
              → its k closest
            </span>{" "}
            <span style={{ opacity: ease(frame, voteAt, 10) }}>→ a vote</span>
          </span>
        </Note>
        <Note at={tenAt - 2} x={COL} y={y(490)} out={out1}>
          <span
            style={{
              ...note(34, INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
              ...TABULAR,
            }}
          >
            k = 15: <Dot color={C1} /> {VOTE.ones}{" "}
            <span style={{ color: INK_SOFT }}>against</span> <Dot color={C0} />{" "}
            {VOTE.zeros}
          </span>
        </Note>
        <Note at={tenAt + 10} x={COL} y={y(560)} out={out1}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            so the new point is <Dot color={CLASS[VOTE.predicted]} />
          </span>
        </Note>
        <Note at={noTrainAt} x={COL} y={y(660)} out={out1}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>
            no training step,
          </span>
        </Note>
        <Note at={slowAt} x={COL} y={y(700)} out={out1}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            but slow to predict on large data
          </span>
        </Note>

        {/* ── What k does to the border ── */}
        {panels.map((p, i) => {
          const box: Box = {
            left: LEFTS[i],
            top: y(TOP),
            width: PW,
            height: h(PH),
          };
          const { x, y: sy } = scales(box, MOONS.xlim, MOONS.ylim);
          const m = KNN[p.k];
          return (
            <React.Fragment key={p.k}>
              <PanelTitle
                x={box.left}
                y={box.top - 42}
                at={p.at - 4}
                color={INK}
              >
                k = {p.k}
              </PanelTitle>
              <Regions grid={m.grid} box={box} at={p.at} dur={18} />
              <Frame box={box} at={tradeAt} />
              <Points
                xs={MOONS.x}
                ys={MOONS.y}
                labels={MOONS.label}
                sx={x}
                sy={sy}
                at={tradeAt + i * 3}
                spread={12}
                r={4.5}
                out={withoutAt + 2}
              />
              <Points
                xs={MOONS.x}
                ys={MOONS.y}
                sx={x}
                sy={sy}
                at={withoutAt}
                spread={10}
                r={4.5}
                color={INK_SOFT}
                opacity={0.75}
              />
              <Note
                at={p.score - 2}
                x={box.left}
                y={box.top + box.height + h(14)}
              >
                <span
                  style={{
                    ...note(25, BLUE_INK),
                    fontWeight: 650,
                    whiteSpace: "nowrap",
                    ...TABULAR,
                  }}
                >
                  {p.k === "1"
                    ? `training ${Math.round(m.train * 100)}% · `
                    : ""}
                  new {Math.round(m.test * 100)}%
                </span>
              </Note>
              {p.tag ? (
                <Note
                  at={p.under}
                  x={box.left}
                  y={box.top + box.height + h(56)}
                >
                  <span
                    style={{
                      ...note(25, p.tagInk),
                      fontWeight: 650,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.tag}
                  </span>
                </Note>
              ) : null}
            </React.Fragment>
          );
        })}
        <Note at={patchAt} x={LEFTS[0] + 14} y={y(TOP) + h(10)} out={fifteenAt}>
          <span
            style={{
              ...label(19, INK),
              whiteSpace: "nowrap",
              background: PAPER,
              padding: "0 6px",
            }}
          >
            every point owns a patch
          </span>
        </Note>
        <Note at={cvAt} x={LEFTS[0]} y={y(TOP) + h(PH) + h(104)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={labelsAt}>choose k by cross-validation</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
