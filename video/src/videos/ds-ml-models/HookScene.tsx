import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HOOK, MOONS } from "./data";
import { type Box, Drift, Frame, Headline, Kicker, PanelTitle, Points, pulse, Regions, scales, Spot, Svg, X0 } from "./parts";

const PW = 440;
const PH = 304;
const LEFTS = [X0, X0 + 480, X0 + 960];
const TOP = 330;

/**
 * The opening: the same two hundred points, three times over, and the border
 * each of three models draws through them (a straight line, a staircase, a
 * curve), with each one's score on the held-out points under it. Then the
 * round in one line, and the straight line picked out for the first question.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const pointsAt = n.word("hook", "the same two hundred points");
  const borderAt = n.word("hook", "a different border");
  const logAt = n.word("hook", "Logistic regression draws");
  const treeAt = n.word("hook", "A decision tree cuts");
  const knnAt = n.word("hook", "Nearest neighbors bends");
  const unseenAt = n.word("hook", "On points they haven't seen");
  const scoreAt = [n.word("hook", "eighty-two"), n.word("hook", "eighty-nine"), n.word("hook", "ninety-three")];
  const eachAt = n.word("plan", "how each one draws its border");
  const pickAt = n.word("plan", "when you'd pick it");
  const fifteenAt = n.word("plan", "fifteen questions");
  const elevenAt = n.word("plan", "eleven get a model");
  const fourAt = n.word("plan", "four get a sentence");
  const lineAt = n.word("logit-in", "the straight line");
  const end = n.beat("logit-in").to;

  const panels = [
    { name: "Logistic regression", model: HOOK.logistic, at: logAt },
    { name: "Decision tree", model: HOOK.tree, at: treeAt },
    { name: "Nearest neighbors", model: HOOK.knn, at: knnAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={pointsAt + 2} level={-36} />
      {panels.map((p) => (
        <Sfx key={p.name} name="el-whoosh" at={p.at + 2} level={-36} />
      ))}
      {scoreAt.map((a, i) => (
        <Sfx key={i} name="el-pop" at={a} level={-33} />
      ))}
      <Sfx name="el-tap" at={lineAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="Same points," turn="three borders." at={pointsAt - 4} turnAt={borderAt - 4} size={72} />

        {panels.map((p, i) => {
          const box: Box = { left: LEFTS[i], top: y(TOP), width: PW, height: h(PH) };
          const { x, y: sy } = scales(box, MOONS.xlim, MOONS.ylim);
          const lit = i === 0 ? ease(frame, lineAt - 2, 10) : 0;
          const dim = i === 0 ? undefined : lineAt;
          const flash = pulse(frame, eachAt + i * 5, 18) + pulse(frame, pickAt + i * 5, 18) * 0.6;
          return (
            <React.Fragment key={p.name}>
              <PanelTitle x={box.left} y={box.top - 42} at={p.at - 4} dim={dim} color={INK}>
                {p.name}
              </PanelTitle>
              <Regions grid={p.model.grid} box={box} at={p.at} dur={20} dim={dim} />
              <Frame box={box} at={pointsAt - 6} />
              <Points xs={MOONS.x} ys={MOONS.y} labels={MOONS.label} sx={x} sy={sy} at={pointsAt + i * 3} spread={18} r={5} dim={dim} />
              <Svg opacity={Math.max(lit, Math.min(1, flash))}>
                <rect
                  x={box.left - 6}
                  y={box.top - 6}
                  width={box.width + 12}
                  height={box.height + 12}
                  rx={10}
                  fill="none"
                  stroke={HIGHLIGHT}
                  strokeWidth={8}
                />
              </Svg>
              <Note at={scoreAt[i] - 2} x={box.left} y={box.top + box.height + h(18)} dim={dim}>
                <span style={{ ...note(44, BLUE_INK), fontWeight: 700, ...TABULAR }}>{Math.round(p.model.test * 100)}%</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={unseenAt} x={LEFTS[0] + 120} y={y(TOP) + h(PH) + h(36)} dim={lineAt}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>on the {MOONS.nTest} points they haven&apos;t seen</span>
        </Note>

        <Spot id="ds-ml-models-raccoon" at={from + 6} left={1500} top={y(300)} width={360} height={360} />

        {/* ── The round, in one line ── */}
        <Note at={fifteenAt - 2} x={X0} y={y(770)} dim={lineAt}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>15 questions:</span>
        </Note>
        <Note at={elevenAt - 2} x={X0 + 236} y={y(770)} dim={lineAt}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b style={{ color: BLUE_INK }}>11</b> with a model fitted on screen
          </span>
        </Note>
        <Note at={fourAt - 2} x={X0 + 750} y={y(770)} dim={lineAt}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b>4</b> in a sentence each, at the end
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
