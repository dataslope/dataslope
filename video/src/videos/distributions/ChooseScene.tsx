import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Mini, type MiniKind } from "./Mini";
import { Arrow, ASK, askNote, Centered, Drift, Head, lerp, Svg } from "./parts";

const ROW_Y0 = 318;
const ROW_STEP = 104;
const Q_X = 160;
const ARROW_X0 = 930;
const ARROW_X1 = 1030;
const NAME_X = 1062;
const MINI_X = 1430;
const MINI_W = 230;
const MINI_H = 70;
/** The number line: 0 to 4, counting then measuring. */
const LINE_Y = 822;
const LINE_X0 = 220;
const PER = 230;

/**
 * Part 1's close: four questions about what is being counted, each landing
 * on its distribution, then whole numbers against a 2.7, which is where
 * counting ends and measuring begins.
 */
export const ChooseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const chooseFrom = n.beat("choose").from;
  const countingAt = n.word("choose", "counting");
  const ROWS: readonly { q: string; name: string; kind: MiniKind; qAt: number; nameAt: number }[] = [
    { q: "One yes or no", name: "Bernoulli", kind: "bernoulli", qAt: n.word("leaves", "One yes or no"), nameAt: n.word("leaves", "Bernoulli") },
    {
      q: "Successes in a fixed number of tries",
      name: "Binomial",
      kind: "binomial",
      qAt: n.word("leaves", "Successes"),
      nameAt: n.word("leaves", "binomial"),
    },
    {
      q: "Tries until the first success",
      name: "Geometric",
      kind: "geometric",
      qAt: n.word("leaves", "Tries until"),
      nameAt: n.word("leaves", "geometric"),
    },
    {
      q: "Events at a steady rate, no fixed number",
      name: "Poisson",
      kind: "poisson",
      qAt: n.word("leaves", "Events"),
      nameAt: n.word("leaves", "Poisson"),
    },
  ];
  const wholeAt = n.word("whole", "whole numbers");
  const allAt = n.word("whole", "All four");
  const pointAt = n.word("whole", "two point seven");
  const measuringAt = n.word("whole", "measuring");
  const notAt = n.word("whole", "not counting");

  const rowY = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const lineY = y(LINE_Y);
  const fine = ease(frame, measuringAt - 4, 30);
  const marker = pop(frame, pointAt - 2, fps, 12);
  const markerX = LINE_X0 + 2.7 * PER;
  const rowsDim = ease(frame, allAt - 6, 14) * 0.35;

  return (
    <AbsoluteFill>
      {/* ── Sound: one tap per answer, the 2.7 landing, the ruler filling in ── */}
      {ROWS.map((r) => (
        <Sfx key={r.name} name="el-tap" at={r.nameAt - 4} level={-30} />
      ))}
      <Sfx name="el-pop" at={pointAt - 2} level={-30} />
      <Sfx name="el-pencil" at={measuringAt - 4} level={-34} />

      <Head parts={[{ text: "What are you counting?", at: chooseFrom - 4 }]} />

      <Drift from={chooseFrom} to={n.beat("whole").to + 50} origin="50% 40%">
        <Ink at={countingAt - 4} dur={14} style={{ left: Q_X, top: y(ROW_Y0 - 50), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>What you count</span>
        </Ink>
        <Ink at={countingAt} dur={14} style={{ left: NAME_X, top: y(ROW_Y0 - 50), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The model</span>
        </Ink>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - rowsDim }}>
          {ROWS.map((r, i) => (
            <React.Fragment key={r.name}>
              <Ink at={r.qAt - 4} dur={16} style={{ left: Q_X, top: rowY(i), whiteSpace: "nowrap" }}>
                <span style={{ ...body(38), color: INK }}>{r.q}</span>
              </Ink>
              <Arrow from={[ARROW_X0, rowY(i) + 26]} to={[ARROW_X1, rowY(i) + 26]} at={lerp(r.qAt, r.nameAt, 0.6) - 6} dur={10} color={INK_SOFT} width={2} />
              <Ink at={r.nameAt - 6} dur={14} style={{ left: NAME_X, top: rowY(i) - 4, whiteSpace: "nowrap" }}>
                <span style={{ ...headline(50, true), color: BLUE_INK }}>{r.name}</span>
              </Ink>
              <Svg>
                <Mini kind={r.kind} x={MINI_X} top={rowY(i) - 6} w={MINI_W} h={h(MINI_H)} p={ease(frame, r.nameAt - 2, 16)} />
              </Svg>
            </React.Fragment>
          ))}
        </div>

        {/* ── Whole numbers, then everything in between ── */}
        <Svg>
          <line x1={LINE_X0 - 30} x2={LINE_X0 - 30 + (4 * PER + 60) * ease(frame, allAt - 4, 16)} y1={lineY} y2={lineY} stroke={INK} strokeWidth={1.8} />
          {Array.from({ length: 41 }, (_, i) => {
            if (i % 10 === 0) return null;
            const a = ease(frame, measuringAt - 4 + i * 0.6, 8) * fine;
            if (a <= 0) return null;
            return <line key={i} x1={LINE_X0 + i * PER * 0.1} x2={LINE_X0 + i * PER * 0.1} y1={lineY} y2={lineY - 12 * a} stroke={INK_SOFT} strokeWidth={1.4} />;
          })}
          {[0, 1, 2, 3, 4].map((v) => {
            const a = pop(frame, wholeAt - 4 + v * 3, fps, 14);
            if (a <= 0.01) return null;
            return <circle key={v} cx={LINE_X0 + v * PER} cy={lineY} r={11 * Math.min(1.1, a)} fill={BLUE_INK} />;
          })}
          {marker > 0.01 ? (
            <g transform={`translate(${markerX}, ${lineY - (1 - Math.min(1, marker)) * 40})`}>
              <path d="M0,-4 L-11,-24 L11,-24 Z" fill={ASK} />
            </g>
          ) : null}
        </Svg>
        {[0, 1, 2, 3, 4].map((v) => (
          <Centered key={v} x={LINE_X0 + v * PER} y={lineY + 16} opacity={ease(frame, wholeAt + v * 3, 10)} style={note(22, INK_SOFT)}>
            {v}
          </Centered>
        ))}
        <Centered x={markerX} y={lineY - 66} opacity={ease(frame, pointAt + 2, 10)} style={askNote(26)}>
          2.7
        </Centered>
        <Note at={wholeAt + 8} x={LINE_X0 + 4 * PER + 70} y={lineY - 44}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>counting: whole steps</span>
        </Note>
        <Note at={measuringAt} x={LINE_X0 + 4 * PER + 70} y={lineY - 8}>
          <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>measuring: anything in between</span>
        </Note>
        <Note at={notAt} x={LINE_X0 + 4 * PER + 70} y={lineY + 28}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>a different kind of model</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
