import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label, note, TABULAR } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OPTIM } from "./data";
import { BAR, BLUE_FILL, Box, Drift, INK, INK_SOFT, Line, Mark, Tag } from "./parts";

const NAME_X = 120;
const BADGE_X = 300;
const CHIP_X = 440;
const BYTES_X = 800;
const BYTE = 22;
const GB_X = 1186;
const PANEL_X = 1450;
const GRAD_FILL = ds("blue", 300);

type Opt = "sgd" | "momentum" | "rmsprop" | "adam";

/**
 * Question 8. The four optimizers as rows, each with what it keeps per
 * weight (outlined chips: nothing, a velocity, an average of squared
 * gradients, both). Beside them, a seeded run of two parameters fed
 * gradients a hundred times apart: SGD's average steps stay 104 times apart,
 * Adam's 1.03. Then the follow-up, memory: bytes per weight as stacked bars
 * in float32, and the gigabytes for a billion weights; Adam marked as the
 * default, SGD with momentum for vision, a quarter lighter.
 */
export const OptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q8").from;
  const qAt = n.word("q8", "Question eight");
  const textAt = n.word("q8", "What is the difference");
  const sgdAt = n.word("q8-a", "Stochastic gradient descent");
  const momAt = n.word("q8-a", "Momentum keeps");
  const zigAt = n.word("q8-a", "damps the zigzag");
  const rmsAt = n.word("q8-rms", "RMSProp divides");
  const adamAt = n.word("q8-rms", "Adam does both");
  const giveAt = n.word("q8-rms", "Give two parameters");
  const sgdStepsAt = n.word("q8-rms", "SGD's steps");
  const hundredFourAt = n.word("q8-rms", "a hundred and four times apart");
  const adamStepsAt = n.word("q8-rms", "Adam's, one point oh three");
  const memAt = n.word("q8-mem", "The follow-up is memory");
  const eightAt = n.word("q8-mem", "take eight bytes");
  const momFourAt = n.word("q8-mem", "momentum adds four");
  const adamEightAt = n.word("q8-mem", "Adam eight");
  const billionAt = n.word("q8-mem", "A billion weights");
  const sixteenAt = n.word("q8-mem", "sixteen with Adam");
  const beforeAt = n.word("q8-mem", "before any activations");
  const defaultAt = n.word("q8-choice", "the usual default");
  const visionAt = n.word("q8-choice", "on vision");
  const quarterAt = n.word("q8-choice", "a quarter less memory");
  const end = n.beat("reg-in").to;

  const rowY = (i: number) => y(400) + i * h(80);
  const CH = h(44);
  const rows: { key: Opt; name: string; at: number; chips: React.ReactNode[]; stateAt: number }[] = [
    { key: "sgd", name: "SGD", at: sgdAt, chips: [], stateAt: momFourAt },
    { key: "momentum", name: "Momentum", at: momAt, chips: ["velocity"], stateAt: momFourAt },
    {
      key: "rmsprop",
      name: "RMSProp",
      at: rmsAt,
      chips: [
        <MathRun key="g">
          avg <I>g</I>²
        </MathRun>,
      ],
      stateAt: momFourAt + 6,
    },
    {
      key: "adam",
      name: "Adam",
      at: adamAt,
      chips: [
        "velocity",
        <MathRun key="g">
          avg <I>g</I>²
        </MathRun>,
      ],
      stateAt: adamEightAt,
    },
  ];

  // ── The two parameters ──
  const base = y(640);
  const MAXH = h(230);
  const barH = (v: number) => Math.max(2, (v / OPTIM.sgdStep[0]) * MAXH);
  const groups = [
    { name: "SGD", steps: OPTIM.sgdStep, at: sgdStepsAt, ratio: `${OPTIM.sgdRatio}×`, ratioAt: hundredFourAt, x: PANEL_X + 10 },
    { name: "Adam", steps: OPTIM.adamStep, at: adamStepsAt, ratio: `${OPTIM.adamRatio}×`, ratioAt: adamStepsAt + 10, x: PANEL_X + 190 },
  ];

  return (
    <AbsoluteFill>
      {rows.map((r) => (
        <Sfx key={r.key} name="el-tap" at={r.at} level={-31} />
      ))}
      <Sfx name="el-pop" at={sgdStepsAt + 4} level={-31} />
      <Sfx name="el-pop" at={adamStepsAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={eightAt} level={-36} />
      <Sfx name="el-tap" at={billionAt + 4} level={-31} />
      <Sfx name="el-tap" at={defaultAt} level={-30} />
      <Sfx name="el-tap" at={visionAt} level={-30} />
      <Sfx name="el-chime" at={quarterAt + 20} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the difference between SGD, Momentum, RMSProp, and Adam?
        </QuestionCard>

        {/* ── What each keeps per weight ── */}
        <Line at={sgdAt} x={CHIP_X} y={y(318)} size={22} color={INK_SOFT}>
          Keeps per weight
        </Line>
        {rows.map((r, i) => (
          <React.Fragment key={r.key}>
            <Line at={r.at - 2} x={NAME_X} y={rowY(i) - 17} size={26}>
              {r.name}
            </Line>
            {r.chips.length === 0 ? (
              <Line at={r.at + 6} x={CHIP_X} y={rowY(i) - 15} size={24} color={INK_SOFT}>
                Nothing
              </Line>
            ) : (
              r.chips.map((c, k) => (
                <Box key={k} x={CHIP_X + k * 150} y={rowY(i) - CH / 2} w={136} h={CH} at={r.at + 6 + k * 4} size={22}>
                  {c}
                </Box>
              ))
            )}
          </React.Fragment>
        ))}
        <Line at={zigAt} x={CHIP_X + 150} y={rowY(1) - 15} size={22} color={INK_SOFT} out={memAt}>
          damps the zigzag
        </Line>

        {/* ── Two parameters, gradients a hundred times apart ── */}
        <Line at={giveAt} x={PANEL_X} y={y(318)} size={22} color={INK_SOFT}>
          Average step, two parameters
        </Line>
        <Line at={giveAt + 6} x={PANEL_X} y={y(350)} size={22} color={INK_SOFT}>
          with gradients <Num>100</Num>× apart
        </Line>
        {groups.map((g) => {
          const p = ease(frame, g.at, 18);
          return (
            <React.Fragment key={g.name}>
              {g.steps.map((s, k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: g.x + k * 62,
                    top: base - barH(s) * p,
                    width: 50,
                    height: barH(s) * p,
                    background: BAR,
                    borderRadius: 3,
                    opacity: p > 0 ? 1 : 0,
                  }}
                />
              ))}
              <div style={{ position: "absolute", left: g.x, width: 112, top: base + 10, textAlign: "center", ...note(24, INK), opacity: ease(frame, g.at - 4, 10) }}>{g.name}</div>
              <div style={{ position: "absolute", left: g.x - 20, width: 152, top: base + h(52), textAlign: "center", ...note(26, INK), fontWeight: 600, ...TABULAR, opacity: ease(frame, g.ratioAt, 10) }}>
                <Mark at={g.ratioAt + 2}>{g.ratio}</Mark>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ position: "absolute", left: PANEL_X - 20, width: 360, height: 1, top: base, background: INK, opacity: ease(frame, giveAt, 12) }} />

        {/* ── Memory: bytes per weight, float32 ── */}
        <Line at={memAt} x={BYTES_X} y={y(318)} size={22} color={INK_SOFT}>
          Bytes per weight
        </Line>
        <Line at={billionAt} x={GB_X} y={y(318)} size={22} color={INK_SOFT}>
          A billion weights
        </Line>
        {rows.map((r, i) => {
          const segs = [
            { bytes: 4, color: BAR, at: eightAt },
            { bytes: 4, color: GRAD_FILL, at: eightAt + 6 },
            { bytes: OPTIM.bytesPerWeight[r.key] - 8, color: BLUE_FILL, at: r.stateAt },
          ].filter((s) => s.bytes > 0);
          let left = BYTES_X;
          return (
            <React.Fragment key={r.key}>
              {segs.map((s, k) => {
                const p = ease(frame, s.at + i * 2, 14);
                const x = left;
                left += s.bytes * BYTE;
                return p > 0 ? (
                  <div
                    key={k}
                    style={{
                      position: "absolute",
                      left: x,
                      top: rowY(i) - CH / 2,
                      width: s.bytes * BYTE * p - 2,
                      height: CH,
                      background: s.color,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...label(20, INK),
                      ...TABULAR,
                    }}
                  >
                    <span style={{ opacity: ease(frame, s.at + i * 2 + 8, 8) }}>{s.bytes}</span>
                  </div>
                ) : null;
              })}
              <div style={{ position: "absolute", left: GB_X, top: rowY(i) - 16, ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, (r.key === "adam" ? sixteenAt : billionAt + 4) + i * 2, 10) }}>
                {r.key === "momentum" ? <Mark at={quarterAt}>{`${OPTIM.gbPerBillion[r.key]} GB`}</Mark> : `${OPTIM.gbPerBillion[r.key]} GB`}
              </div>
            </React.Fragment>
          );
        })}
        {/* The legend, and what the count leaves out. */}
        <div style={{ position: "absolute", left: BYTES_X, top: rowY(3) + h(46), display: "flex", alignItems: "center", gap: 12, fontSize: 22, opacity: ease(frame, eightAt + 10, 10) }}>
          {[
            { c: BAR, t: "weight" },
            { c: GRAD_FILL, t: "gradient" },
            { c: BLUE_FILL, t: "optimizer state" },
          ].map((l) => (
            <span key={l.t} style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 14 }}>
              <span style={{ width: 18, height: 18, borderRadius: 3, background: l.c }} />
              <span style={{ ...note(22, INK_SOFT) }}>{l.t}</span>
            </span>
          ))}
        </div>
        <Line at={beforeAt} x={BYTES_X} y={rowY(3) + h(92)} size={22} color={INK_SOFT}>
          float32, before any activations
        </Line>

        {/* ── The choice ── */}
        {[
          { row: 3, text: "default", at: defaultAt },
          { row: 1, text: "vision", at: visionAt },
        ].map((b) => {
          const p = ease(frame, b.at, 10);
          return (
            <div key={b.text} style={{ position: "absolute", left: BADGE_X, top: rowY(b.row) - 18, opacity: p, transform: `translateY(${(1 - p) * 6}px)` }}>
              <Tag tone="green" size={22}>
                {b.text}
              </Tag>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
