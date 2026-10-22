import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ENS } from "./data";
import { at, type Box, C0, Curve, Drift, Frame, Mark, OK, OK_INK, PanelTitle, Points, pulse, scales, Svg } from "./parts";

const PW = 760;
const PH = 330;
const LEFTS = [140, 1020];
const TOP = 380;
const XLIM: [number, number] = [0, 6];
const YLIM: [number, number] = [-1.8, 1.8];

const line = (ys: readonly number[]) => ENS.grid.map((x, i) => [x, ys[i]] as const);

/**
 * Question 4, on the video's own sixty noisy points from a sine wave. Left,
 * bagging: five of the bootstrapped trees side by side, one deep tree in red
 * chasing every point, and the average of two hundred in green. Right,
 * boosting: the first small tree with its misses drawn in, then the fit
 * after ten and after a hundred.
 */
export const BagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bag").from;
  const qAt = n.word("bag", "Question four");
  const textAt = n.word("bag", "What's the difference between bagging and boosting");
  const asked = n.word("bag", "Bagging trains many models");
  const sideAt = n.word("bag", "side by side");
  const bootAt = n.word("bag", "a bootstrap sample");
  const avgAt = n.word("bag", "averages them");
  const oneAt = n.word("bag", "One deep tree");
  const chaseAt = n.word("bag", "chases every point");
  const twoHAt = n.word("bag", "Two hundred bagged trees");
  const fromAt = n.word("bag", "falls from point two six");
  const toAt = n.word("bag", "to point one eight");
  const varAt = n.word("bag", "Bagging cuts variance");
  const boostAt = n.word("boost", "Boosting trains small models");
  const afterAt = n.word("boost", "one after another");
  const wrongAt = n.word("boost", "still get wrong");
  const crudeAt = n.word("boost", "After one tree the fit is crude");
  const tenAt = n.word("boost", "after ten it's close");
  const hundredAt = n.word("boost", "after a hundred");
  const mseAt = n.word("boost", "point one seven five");
  const biasAt = n.word("boost", "Boosting cuts bias");
  const accurateAt = n.word("boost", "the more accurate of the two");
  const noisyAt = n.word("boost", "overfit noisy data");
  const holdsAt = n.word("boost", "where bagging holds up");
  const end = n.beat("boost").to;

  const boxes: Box[] = LEFTS.map((left) => ({ left, top: y(TOP), width: PW, height: h(PH) }));
  const [bag, boost] = boxes.map((b) => scales(b, XLIM, YLIM));
  const under = y(TOP) + h(PH) + h(20);
  const wrongP = ease(frame, wrongAt, 14) * (1 - ease(frame, tenAt, 12));

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={asked} level={-36} />
      <Sfx name="el-scratch" at={chaseAt} level={-33} />
      <Sfx name="el-chime" at={toAt} level={-36} />
      <Sfx name="el-whoosh" at={afterAt} level={-36} />
      <Sfx name="el-tap" at={tenAt} level={-34} />
      <Sfx name="el-pop" at={mseAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What&apos;s the difference between bagging and boosting?
        </QuestionCard>

        {/* ── Bagging ── */}
        <PanelTitle x={LEFTS[0]} y={y(TOP) - 42} at={asked - 4} color={INK}>
          Bagging: side by side, then averaged
        </PanelTitle>
        <Frame box={boxes[0]} at={asked - 4} />
        <Points xs={ENS.x} ys={ENS.y} sx={bag.x} sy={bag.y} at={asked - 2} spread={14} r={5.5} opacity={0.75} />
        {ENS.trees.map((t, i) => (
          <Curve key={i} points={line(t)} x={bag.x} y={bag.y} at={sideAt + i * 5} dur={14} color={INK_SOFT} width={1.6} dim={oneAt} opacity={0.7} clip={boxes[0]} />
        ))}
        <Note at={bootAt} x={LEFTS[0] + PW} y={y(TOP) - h(40)} align="right" from="right">
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>gray: trees on bootstrap samples</span>
        </Note>
        <Curve points={line(ENS.one)} x={bag.x} y={bag.y} at={oneAt + 2} dur={22} color={ACCENT} width={2.2} dim={twoHAt + 4} clip={boxes[0]} />
        <Curve points={line(ENS.bag)} x={bag.x} y={bag.y} at={avgAt} dur={22} color={OK} width={3.6 + 2 * pulse(frame, twoHAt, 22)} clip={boxes[0]} />
        <Note at={fromAt} x={LEFTS[0]} y={under}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>one deep tree: test error {fmt(ENS.mse.one, 3)}</span>
        </Note>
        <Note at={toAt} x={LEFTS[0]} y={under + h(40)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>200 bagged trees: {fmt(ENS.mse.bag, 3)}</span>
        </Note>
        <Note at={varAt} x={LEFTS[0]} y={under + h(96)}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={varAt + 2}>cuts variance</Mark>
          </span>
        </Note>

        {/* ── Boosting ── */}
        <PanelTitle x={LEFTS[1]} y={y(TOP) - 42} at={boostAt - 4} color={INK}>
          Boosting: one after another
        </PanelTitle>
        <Frame box={boxes[1]} at={boostAt - 4} />
        <Points xs={ENS.x} ys={ENS.y} sx={boost.x} sy={boost.y} at={boostAt - 2} spread={14} r={5.5} opacity={0.75} />
        <Svg opacity={wrongP}>
          {ENS.x.map((x, i) => (
            <line key={i} x1={at(boost.x, x)} x2={at(boost.x, x)} y1={at(boost.y, ENS.y[i])} y2={at(boost.y, ENS.fit1[i])} stroke={ACCENT} strokeWidth={1.6} opacity={0.7} />
          ))}
        </Svg>
        <Curve points={line(ENS.stages["1"])} x={boost.x} y={boost.y} at={afterAt} dur={16} color={C0} width={2.6} dim={tenAt} clip={boxes[1]} />
        <Curve points={line(ENS.stages["10"])} x={boost.x} y={boost.y} at={tenAt} dur={18} color={C0} width={2.6} dim={hundredAt + 4} clip={boxes[1]} />
        <Curve points={line(ENS.stages["100"])} x={boost.x} y={boost.y} at={hundredAt} dur={20} color={OK} width={3.6} clip={boxes[1]} />
        <Note at={wrongAt} x={LEFTS[1] + PW} y={y(TOP) - h(40)} align="right" from="right" out={tenAt}>
          <span style={{ ...label(19, ACCENT_INK), whiteSpace: "nowrap" }}>red: what the next tree is fitted to</span>
        </Note>
        {[
          { at: crudeAt, k: "1" as const, name: "after 1 tree", color: BLUE_INK },
          { at: tenAt, k: "10" as const, name: "after 10", color: BLUE_INK },
          { at: mseAt - 4, k: "100" as const, name: "after 100", color: OK_INK },
        ].map((s, i) => (
          <Note key={s.k} at={s.at} x={LEFTS[1] + i * 250} y={under}>
            <span style={{ ...note(25, s.color), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
              {s.name}: {fmt(ENS.mse.stages[s.k], 3)}
            </span>
          </Note>
        ))}
        <Note at={hundredAt} x={LEFTS[1]} y={under + h(40)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>test error, on 2,000 new points</span>
        </Note>
        <Note at={biasAt} x={LEFTS[1]} y={under + h(96)}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={biasAt + 2}>cuts bias</Mark>
          </span>
        </Note>
        <Note at={accurateAt} x={LEFTS[1] + 220} y={under + h(100)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            often more accurate, <span style={{ opacity: ease(frame, noisyAt, 10), color: ACCENT_INK }}>but can overfit noise</span>
          </span>
        </Note>
        <Note at={holdsAt} x={LEFTS[0] + 240} y={under + h(100)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>holds up on noisy data</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
