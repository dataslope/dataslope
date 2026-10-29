import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BN } from "./data";
import { Bracket, Drift, Fade, Mark, OK, OK_INK, Svg, Tagline, X0 } from "./parts";

const LEFT = 200;
const RIGHT = 1080;
/** Three number lines: the batch as it arrives, normalized, then scaled and shifted. */
const LINES = [
  { y: 420, lo: 0, hi: 10, ticks: [0, 2, 4, 6, 8, 10] },
  { y: 600, lo: -2.5, hi: 2.5, ticks: [-2, -1, 0, 1, 2] },
  { y: 780, lo: -2.5, hi: 5, ticks: [-2, 0, 2, 4] },
];
const WHY_X = 1300;
const WHY_Y = 380;
const WHY_ROW = 64;

/**
 * Question 10 on one unit's pre-activations across a batch of eight (mean
 * 6.58, standard deviation 1.75): the dots drop onto a second line at mean
 * zero and spread one, then onto a third, scaled by gamma and shifted by beta
 * (2 and 1, for the picture), leaving a ghost on each line they leave. Then
 * why it helps, a tick a reason.
 */
export const BnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bn").from;
  const qAt = n.word("bn", "Question ten");
  const textAt = n.word("bn", "What is batch normalization");
  const eachAt = n.word("bn-each", "For each unit");
  const acrossAt = n.word("bn-each", "across the mini-batch");
  const scalesAt = n.word("bn-each", "shifts and scales the unit's inputs");
  const meanAt = n.word("bn-mean", "a mean of six point six");
  const zeroAt = n.word("bn-mean", "After normalizing, zero");
  const gammaAt = n.word("bn-mean", "gamma and beta");
  const wantsAt = n.word("bn-mean", "the network actually wants");
  const reasons = [
    { text: "steadier training", at: n.word("bn-why", "It steadies training") },
    { text: "larger learning rates", at: n.word("bn-why", "tolerates larger learning rates") },
    { text: "the starting weights matter less", at: n.word("bn-why", "makes the starting weights matter less") },
    { text: "inference: running averages", at: n.word("bn-why", "At inference it uses running averages") },
    { text: "transformers: layer norm, per example", at: n.word("bn-why", "Transformers use layer norm") },
  ];
  const archInAt = n.word("arch-in", "The last two long ones");
  const end = n.beat("arch-in").to;

  const pos = (line: number, v: number) => LEFT + ((v - LINES[line].lo) / (LINES[line].hi - LINES[line].lo)) * (RIGHT - LEFT);
  const toNormed = ease(frame, zeroAt - 6, 24);
  const toOut = ease(frame, gammaAt + 2, 24);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={eachAt} level={-36} />
      <Sfx name="el-tap" at={meanAt} level={-34} />
      <Sfx name="el-whoosh" at={zeroAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={gammaAt + 2} level={-34} />
      {reasons.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-38} />
      ))}

      <Drift from={from} to={end + 40}>
        {/* Held to the cut, as every other scene is: clearing on the bridge's
            last word left a blank page through the gap. */}
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is batch normalization, and why does it help?
        </QuestionCard>

        <Fade from={from}>
          {LINES.map((line, i) => {
            const shown = [eachAt - 2, scalesAt, gammaAt - 2][i];
            const p = ease(frame, shown, 16);
            return (
              <React.Fragment key={i}>
                <Svg opacity={p}>
                  <line x1={LEFT} x2={LEFT + (RIGHT - LEFT) * p} y1={y(line.y)} y2={y(line.y)} stroke={INK} strokeWidth={1.6} />
                  {line.ticks.map((t) => (
                    <g key={t}>
                      <line x1={pos(i, t)} x2={pos(i, t)} y1={y(line.y)} y2={y(line.y) + 7} stroke={INK} strokeWidth={1.2} />
                      <text x={pos(i, t)} y={y(line.y) + 30} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontVariantNumeric: "tabular-nums" })}>
                        {t < 0 ? `−${-t}` : t}
                      </text>
                    </g>
                  ))}
                </Svg>
              </React.Fragment>
            );
          })}
          <Tagline x={X0} y={y(LINES[0].y) - h(62)} at={eachAt} size={22} color={INK}>
            {/* Words, so not tabular: that sets the hyphen a digit wide. */}
            <span style={{ fontVariantNumeric: "normal" }}>
              one unit&apos;s input,{" "}
              <span style={{ opacity: ease(frame, acrossAt - 2, 10) }}>across a mini-batch of {BN.batch.length} examples</span>
            </span>
          </Tagline>
          <Tagline x={X0} y={y(LINES[1].y) - h(62)} at={scalesAt + 2} size={22} color={INK}>
            normalized: mean 0, variance 1
          </Tagline>
          <Tagline x={X0} y={y(LINES[2].y) - h(62)} at={gammaAt - 2} size={22} color={INK}>
            × gamma, + beta (say 2 and 1): the scale and shift it learns
          </Tagline>

          {/* The batch's mean, then zero after normalizing. */}
          <Svg opacity={ease(frame, meanAt - 2, 10)}>
            <line x1={pos(0, BN.mean)} x2={pos(0, BN.mean)} y1={y(LINES[0].y) - 44} y2={y(LINES[0].y) + 4} stroke={INK} strokeWidth={2} strokeDasharray="4 4" />
          </Svg>
          <Tagline x={pos(0, BN.mean) + 10} y={y(LINES[0].y) - h(60)} at={meanAt} size={22} color={INK}>
            <Mark at={meanAt + 4}>mean {BN.mean}</Mark>
          </Tagline>
          <Svg opacity={ease(frame, zeroAt + 4, 10)}>
            <line x1={pos(1, 0)} x2={pos(1, 0)} y1={y(LINES[1].y) - 44} y2={y(LINES[1].y) + 4} stroke={OK} strokeWidth={2.4} />
          </Svg>
          <Tagline x={pos(1, 0) + 10} y={y(LINES[1].y) - h(56)} at={zeroAt + 4} size={22} color={OK_INK}>
            mean 0
          </Tagline>
          <Bracket x0={pos(1, -1)} x1={pos(1, 1)} y={y(LINES[1].y) + h(46)} at={zeroAt + 12} color={OK}>
            <span style={{ ...label(19, OK_INK), fontWeight: 650 }}>± 1</span>
          </Bracket>

          {/* The eight dots, dropping from line to line. */}
          <Svg>
            {BN.batch.map((v, i) => {
              const p = ease(frame, eachAt + i * 2, 10);
              if (p <= 0) return null;
              const x0 = pos(0, v);
              const x1 = pos(1, BN.normed[i]);
              const x2 = pos(2, BN.out[i]);
              const y0 = y(LINES[0].y) - 14;
              const y1 = y(LINES[1].y) - 14;
              const y2 = y(LINES[2].y) - 14;
              const xNow = x0 + (x1 - x0) * toNormed + (x2 - x1) * toOut;
              const yNow = y0 + (y1 - y0) * toNormed + (y2 - y1) * toOut;
              const lit = ease(frame, wantsAt, 10) * (1 - ease(frame, wantsAt + 30, 14));
              return (
                <g key={i}>
                  <circle cx={x0} cy={y0} r={8} fill={BAR} opacity={0.25 * toNormed} />
                  <circle cx={x1} cy={y1} r={8} fill={BAR} opacity={0.25 * toOut} />
                  <circle cx={xNow} cy={yNow} r={10 * p} fill={lit > 0 ? `color-mix(in srgb, ${OK} ${lit * 100}%, ${BAR})` : BAR} opacity={0.85} />
                </g>
              );
            })}
          </Svg>
          <Tagline x={RIGHT + 20} y={y(LINES[0].y) - h(26)} at={meanAt + 6} size={20} color={BLUE_INK}>
            standard deviation
            <br />
            {BN.sd}
          </Tagline>

          {/* ── Why it helps ── */}
          {reasons.map((r, i) => (
            <Note key={r.text} at={r.at - 2} x={WHY_X} y={y(WHY_Y) + i * h(WHY_ROW)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Tick at={r.at + 2} size={24} color={i < 3 ? OK : INK_SOFT} />
                <span style={{ ...note(24, i < 3 ? INK : INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
                  {i === reasons.length - 1 ? <Mark at={archInAt}>{r.text}</Mark> : r.text}
                </span>
              </div>
            </Note>
          ))}
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
