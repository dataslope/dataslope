import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OPT, type Optimizer } from "./data";
import { Drift, Fade, Mark, OK, OK_INK, Tagline, WARM, WARM_INK } from "./parts";

const BOX = { left: 150, right: 1130, top: 360, bottom: 770 };
const DOM = { x0: -9, x1: 2, y0: -1.6, y1: 1.6 };
const LEG_X = 1230;
const LEG_Y = 366;
const LEG_ROW = 96;
/** Contours of 0.5 (0.1 x² + 10 y²): half-widths along x, each a tenth as tall along y. */
const LEVELS = [2, 4, 6, 8, 10];

type Run = { key: Optimizer; color: string; ink: string; name: string; what: string; at: number };

/**
 * Question 6 on a made-up narrow valley, 0.5 (0.1 x² + 10 y²), from (-8, 1):
 * fifty steps of each optimizer, each at a learning rate that suits it.
 * Plain steps zigzag across the walls and creep along the floor; momentum
 * builds speed along it; RMSProp evens out the two directions; Adam does
 * both. After fifty steps plain descent is 3.07 from the bottom and the
 * other three within a third of a unit.
 */
export const OptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const id = useId().replace(/:/g, "");

  const from = n.beat("opt").from;
  const qAt = n.word("opt", "Question six");
  const textAt = n.word("opt", "Compare S G D");
  const sgdAt = n.word("opt", "Stochastic gradient descent");
  const batchAt = n.word("opt", "the gradient of each mini-batch");
  const valleyAt = n.word("opt", "In a narrow valley");
  const zigAt = n.word("opt", "zigzag across the steep walls");
  const creepAt = n.word("opt", "creep along the floor");
  const momAt = n.word("opt-rest", "Momentum keeps a running velocity");
  const rmsAt = n.word("opt-rest", "R M S prop, root mean square propagation");
  const paceAt = n.word("opt-rest", "move at a similar pace");
  const adamAt = n.word("opt-rest", "Adam, adaptive moment estimation");
  const defaultAt = n.word("opt-rest", "the usual default");
  const fiftyAt = n.word("opt-result", "After fifty steps");
  const threeAt = n.word("opt-result", "three units from the bottom");
  const otherAt = n.word("opt-result", "The other three");
  const needAt = n.word("opt-result", "a hundred and seventy-five");
  const tooMuchAt = n.word("overfit-in", "learn too much");
  const end = n.beat("overfit-in").to;

  const px = (v: number) => BOX.left + ((v - DOM.x0) / (DOM.x1 - DOM.x0)) * (BOX.right - BOX.left);
  const py = (v: number) => y(BOX.bottom) + ((v - DOM.y0) / (DOM.y1 - DOM.y0)) * (y(BOX.top) - y(BOX.bottom));
  const unitX = (BOX.right - BOX.left) / (DOM.x1 - DOM.x0);
  const unitY = (y(BOX.bottom) - y(BOX.top)) / (DOM.y1 - DOM.y0);

  const runs: Run[] = [
    { key: "sgd", color: ACCENT, ink: ACCENT_INK, name: "SGD", what: "stochastic gradient descent", at: valleyAt },
    { key: "momentum", color: BAR, ink: BLUE_INK, name: "momentum", what: "a running velocity", at: momAt },
    { key: "rmsprop", color: WARM, ink: WARM_INK, name: "RMSProp", what: "root mean square propagation", at: rmsAt },
    { key: "adam", color: OK, ink: OK_INK, name: "Adam", what: "adaptive moment estimation: both", at: adamAt },
  ];
  const nameAt: Record<Optimizer, number> = { sgd: sgdAt, momentum: momAt, rmsprop: rmsAt, adam: adamAt };
  const out = tooMuchAt - 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={valleyAt} level={-36} />
      <Sfx name="el-scratch" at={zigAt} level={-36} />
      <Sfx name="el-whoosh" at={momAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={rmsAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={adamAt + 4} level={-36} />
      <Sfx name="el-pop" at={threeAt} level={-32} />
      <Sfx name="el-pop" at={otherAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out} size={60}>
          Compare SGD, momentum, RMSProp, and Adam.
        </QuestionCard>

        <Fade from={from} out={out}>
          {/* ── The valley: contours, start and bottom ── */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, valleyAt - 6, 16) }}>
            <defs>
              <clipPath id={`v${id}`}>
                <rect x={BOX.left} y={y(BOX.top)} width={BOX.right - BOX.left} height={y(BOX.bottom) - y(BOX.top)} />
              </clipPath>
            </defs>
            <rect x={BOX.left} y={y(BOX.top)} width={BOX.right - BOX.left} height={y(BOX.bottom) - y(BOX.top)} fill="none" stroke={INK_SOFT} strokeWidth={1} opacity={0.4} />
            <g clipPath={`url(#v${id})`}>
              {LEVELS.map((a, i) => (
                <ellipse
                  key={a}
                  cx={px(0)}
                  cy={py(0)}
                  rx={a * unitX * ease(frame, valleyAt - 4 + i * 2, 14)}
                  ry={(a / 10) * unitY * ease(frame, valleyAt - 4 + i * 2, 14)}
                  fill="none"
                  stroke={INK_SOFT}
                  strokeWidth={1.2}
                  opacity={0.55}
                />
              ))}
              {runs.map((r) => {
                const path = OPT.paths[r.key];
                const reached = (k: number) => ease(frame, r.at + 4 + k * 1.1, 4);
                return (
                  <g key={r.key}>
                    {path.slice(1).map(([a, b], k) => {
                      const q = reached(k);
                      if (q <= 0) return null;
                      const [a0, b0] = path[k];
                      return (
                        <line
                          key={k}
                          x1={px(a0)}
                          y1={py(b0)}
                          x2={px(a0) + (px(a) - px(a0)) * q}
                          y2={py(b0) + (py(b) - py(b0)) * q}
                          stroke={r.color}
                          strokeWidth={2.6}
                          opacity={0.9}
                        />
                      );
                    })}
                    {path.map(([a, b], k) => {
                      const q = k === 0 ? 1 : reached(k - 1);
                      if (q < 1 || k === 0) return null;
                      return <circle key={`d${k}`} cx={px(a)} cy={py(b)} r={3.6} fill={r.color} />;
                    })}
                  </g>
                );
              })}
            </g>
            <circle cx={px(OPT.start[0])} cy={py(OPT.start[1])} r={9 * ease(frame, valleyAt, 10)} fill={INK} />
            <path d={`M${px(0) - 9},${py(0) - 9} L${px(0) + 9},${py(0) + 9} M${px(0) + 9},${py(0) - 9} L${px(0) - 9},${py(0) + 9}`} stroke={INK} strokeWidth={3} opacity={ease(frame, valleyAt + 4, 10)} />
          </svg>
          <Tagline x={px(OPT.start[0]) - 30} y={py(OPT.start[1]) - h(44)} at={valleyAt + 2} size={21} color={INK}>
            start
          </Tagline>
          <Tagline x={px(0) - 50} y={py(0) + h(58)} at={valleyAt + 6} size={21} color={INK}>
            the bottom
          </Tagline>
          <Note at={zigAt - 2} x={BOX.left} y={y(BOX.top) - h(48)}>
            <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
              plain steps: <Mark at={zigAt + 2}>zigzag across</Mark>, <span style={{ opacity: ease(frame, creepAt - 2, 10) }}>creep along</span>
            </span>
          </Note>
          <Note at={paceAt - 2} x={BOX.left + 560} y={y(BOX.top) - h(48)}>
            <span style={{ ...note(24, WARM_INK), whiteSpace: "nowrap" }}>RMSProp: both directions at a similar pace</span>
          </Note>
          <Tagline x={BOX.left} y={y(BOX.bottom) + h(14)} at={valleyAt + 8} size={19}>
            a made-up valley; 50 steps each, each at a learning rate that suits it
          </Tagline>

          {/* ── The legend, and where each one got to ── */}
          {runs.map((r, i) => {
            const top = y(LEG_Y) + i * h(LEG_ROW);
            return (
              <React.Fragment key={r.key}>
                <Note at={nameAt[r.key] - 2} x={LEG_X} y={top}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <svg width={34} height={14} style={{ overflow: "visible" }}>
                      <line x1={0} x2={34} y1={7} y2={7} stroke={r.color} strokeWidth={4} />
                    </svg>
                    <span style={{ ...note(30, r.ink), fontWeight: 700, whiteSpace: "nowrap" }}>
                      {r.key === "adam" ? <Mark at={defaultAt}>{r.name}</Mark> : r.name}
                    </span>
                  </div>
                </Note>
                <Note at={nameAt[r.key] + 4} x={LEG_X + 48} y={top + h(40)}>
                  <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
                    {r.key === "sgd" ? <span style={{ opacity: ease(frame, batchAt - 2, 10) }}>a step per mini-batch</span> : r.what}
                  </span>
                </Note>
                <Note at={(r.key === "sgd" ? threeAt : otherAt + (i - 1) * 4) - 2} x={1720} y={top} align="right" width={180}>
                  <span style={{ ...note(30, r.ink), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{OPT.dist[r.key].toFixed(2)}</span>
                </Note>
              </React.Fragment>
            );
          })}
          <Tagline x={1720} y={y(LEG_Y) - h(40)} width={330} align="right" at={fiftyAt} size={20}>
            distance after {OPT.steps} steps
          </Tagline>
          <Note at={needAt - 2} x={LEG_X} y={y(LEG_Y) + 4 * h(LEG_ROW) + h(4)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
              plain steps need <b style={{ color: ACCENT_INK }}>{OPT.sgdStepsToAdam}</b> to get as close as Adam
            </span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
