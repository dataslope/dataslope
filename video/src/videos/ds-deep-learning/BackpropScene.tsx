import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BACKPROP, PAGE_CHECK } from "./data";
import { Cells, CELL_MARK, CELL_OK, Drift, ElbowArrow, Mark, num, OK_INK, Svg, Tagline, X0 } from "./parts";

const ROW = 432;
const BOX_H = 80;
/** The chain, left to right: an operation, the value it hands on. */
const OPS = [
  { x: 150, w: 230, text: "w · x + b" },
  { x: 610, w: 150, text: "sigmoid" },
  { x: 1000, w: 220, text: "(a − y)²" },
];
const VALS = [
  { x: 420, name: "z" },
  { x: 800, name: "a" },
  { x: 1260, name: "loss" },
];
const SLOPE_Y = 548;
const PRODUCT_Y = 650;
const PAGE_Y = 742;

/** A step of the computation: a rounded box with its operation in it. */
const Op: React.FC<{ x: number; w: number; top: number; height: number; at: number; lit?: number; children: React.ReactNode }> = ({
  x,
  w,
  top,
  height,
  at: from,
  lit = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: w,
        height,
        boxSizing: "border-box",
        border: `2.4px solid ${INK}`,
        borderRadius: 10,
        background: lit > 0 ? `color-mix(in srgb, ${CELL_MARK} ${lit * 100}%, ${PAPER})` : PAPER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
        fontFamily: MONO,
        fontSize: 27,
        fontWeight: 600,
        color: INK,
        fontVariantLigatures: "none",
      }}
    >
      {children}
    </div>
  );
};

/**
 * Question 4 on one sigmoid neuron (x 1.5, w 0.8, b -0.2, target 1): the
 * forward values left to right, then the error sent back right to left, a
 * local slope under each step, -0.538, 0.197 and 1.5, multiplied into the
 * weight's gradient, -0.159, which nudging the weight by hand confirms. Then
 * the middle slope as the page's own check computes it at -2, 0 and 2.
 */
export const BackpropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("backprop").from;
  const qAt = n.word("backprop", "Question four");
  const textAt = n.word("backprop", "What is backpropagation");
  const chainAt = n.word("backprop", "It's the chain rule");
  const backAt = n.word("backprop", "run backward from the loss");
  const localAt = n.word("backprop", "its own local slope");
  const sweepAt = n.word("backprop", "One backward sweep");
  const costAt = n.word("backprop", "for about the cost");
  const thisAt = n.word("backprop-chain", "For this one neuron");
  const s1At = n.word("backprop-chain", "minus point five four");
  const s2At = n.word("backprop-chain", "point two, and");
  const s3At = n.word("backprop-chain", "one point five");
  const prodAt = n.word("backprop-chain", "Their product");
  const handAt = n.word("backprop-chain", "nudging the weight by hand");
  const middleAt = n.word("backprop-page", "The middle slope");
  const pageAt = n.word("backprop-page", "the page's code checks it");
  const valsAt = n.word("backprop-page", "point one oh five, point two five");
  const aliveAt = n.word("backprop-page", "by formula and by nudging alike");
  const end = n.beat("backprop-page").to;

  const B = BACKPROP;
  const fwd = [num(B.z, 1), B.a.toFixed(3), B.loss.toFixed(3)];
  const slopes = [
    { x: OPS[0].x, w: OPS[0].w, text: `∂z/∂w = ${B.dz_dw}`, at: s3At },
    { x: OPS[1].x - 30, w: OPS[1].w + 60, text: `∂a/∂z = ${B.da_dz.toFixed(3)}`, at: s2At },
    { x: OPS[2].x, w: OPS[2].w, text: `∂loss/∂a = ${num(B.dL_da, 3)}`, at: s1At },
  ];
  const mid = y(ROW) + h(BOX_H) / 2;
  const midLit = ease(frame, middleAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={chainAt} level={-36} />
      <Sfx name="el-whoosh" at={backAt + 2} level={-34} />
      <Sfx name="el-tap" at={s1At} level={-36} />
      <Sfx name="el-tap" at={s2At} level={-36} />
      <Sfx name="el-tap" at={s3At} level={-36} />
      <Sfx name="el-pop" at={prodAt + 4} level={-32} />
      <Sfx name="el-pop" at={valsAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is backpropagation, intuitively?
        </QuestionCard>

        <Note at={chainAt - 2} x={X0} y={y(300)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            the chain rule, run backward:{" "}
            <span style={{ opacity: ease(frame, sweepAt - 2, 10) }}>
              one sweep gives every weight its gradient,{" "}
              <span style={{ opacity: ease(frame, costAt - 2, 10) }}>at about the cost of the forward pass</span>
            </span>
          </span>
        </Note>

        {/* ── The forward pass, left to right ── */}
        <Tagline x={OPS[0].x + OPS[0].w / 2} y={y(ROW) - h(44)} width={OPS[0].w + 160} align="center" at={thisAt - 4} size={21} color={BLUE_INK}>
          w = {B.w}, x = {B.x}, b = {num(B.b, 1)}
        </Tagline>
        <Tagline x={OPS[2].x + OPS[2].w / 2} y={y(ROW) - h(44)} width={OPS[2].w} align="center" at={thisAt} size={21} color={BLUE_INK}>
          target y = {B.y}
        </Tagline>
        {OPS.map((op, i) => (
          <React.Fragment key={op.text}>
            <Op x={op.x} w={op.w} top={y(ROW)} height={h(BOX_H)} at={chainAt + i * 4} lit={i === 1 ? midLit : 0}>
              {op.text}
            </Op>
            <ElbowArrow points={[[op.x + op.w + 8, mid], [VALS[i].x - 12, mid]]} at={chainAt + 2 + i * 4} color={INK_SOFT} width={2} head={11} />
            <Tagline x={VALS[i].x} y={mid - h(18)} at={chainAt + 4 + i * 4} size={26} color={BLUE_INK}>
              {VALS[i].name} = {fwd[i]}
            </Tagline>
            {i < OPS.length - 1 ? (
              <ElbowArrow points={[[VALS[i].x + 150, mid], [OPS[i + 1].x - 8, mid]]} at={chainAt + 4 + i * 4} color={INK_SOFT} width={2} head={11} />
            ) : null}
          </React.Fragment>
        ))}

        {/* ── The error, sent back, with a local slope under each step ── */}
        <ElbowArrow points={[[1420, y(SLOPE_Y) - h(26)], [OPS[0].x + 10, y(SLOPE_Y) - h(26)]]} at={backAt} dur={30} color={ACCENT} width={2.4} head={13} />
        <Tagline x={1440} y={y(SLOPE_Y) - h(44)} at={backAt + 4} size={21} color={ACCENT_INK}>
          back from the loss
        </Tagline>
        <Tagline x={1440} y={y(SLOPE_Y)} at={localAt} size={21}>
          each step&apos;s local slope
        </Tagline>
        {slopes.map((s) => (
          <Tagline key={s.text} x={s.x + s.w / 2} y={y(SLOPE_Y)} width={s.w + 80} align="center" at={s.at - 2} size={23} color={ACCENT_INK}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>{s.text}</span>
          </Tagline>
        ))}
        <Svg opacity={midLit}>
          <rect x={OPS[1].x - 40} y={y(SLOPE_Y) - 6} width={OPS[1].w + 80} height={h(40)} rx={6} fill="none" stroke={ACCENT} strokeWidth={2} />
        </Svg>

        {/* ── Multiplied: the weight's gradient, and the same by hand ── */}
        <Note at={prodAt - 2} x={X0} y={y(PRODUCT_Y)}>
          <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: INK, whiteSpace: "pre", ...TABULAR, fontVariantLigatures: "none" }}>
            ∂loss/∂w = {num(B.dL_da, 3)} × {B.da_dz.toFixed(3)} × {B.dz_dw} ={" "}
            <Mark at={prodAt + 6}>
              <span style={{ color: ACCENT_INK }}>{num(B.grad, 3)}</span>
            </Mark>
          </span>
        </Note>
        <Note at={handAt - 2} x={1000} y={y(PRODUCT_Y)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Tick at={handAt + 4} size={26} />
            <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>nudging w by hand: {num(B.finiteDiff, 3)}</span>
          </div>
        </Note>

        {/* ── The page's own check of the middle slope ── */}
        <Tagline x={X0} y={y(PAGE_Y)} at={pageAt - 4} size={22} color={INK}>
          the page&apos;s check:{" "}
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>sigmoid′(z) = s(1 − s)</span>
        </Tagline>
        {["z", "formula", "nudged"].map((name, r) => (
          <Tagline key={name} x={X0} y={y(PAGE_Y) + h(44) + r * h(42)} at={pageAt + r * 3} size={21}>
            {name}
          </Tagline>
        ))}
        <Cells
          values={[PAGE_CHECK.z.map((v) => num(v, 0)), PAGE_CHECK.analytic.map((v) => v.toFixed(5)), PAGE_CHECK.numeric.map((v) => v.toFixed(5))]}
          x={X0 + 140}
          y={y(PAGE_Y) + h(38)}
          w={150}
          h={h(42)}
          at={pageAt}
          size={22}
          bracket={false}
          look={(r, c) =>
            r === 0
              ? { ink: { color: BLUE_INK, at: pageAt } }
              : { tint: { color: c === 1 ? CELL_MARK : CELL_OK, at: (r === 1 ? valsAt : aliveAt) + c * 3 } }
          }
        />
      </Drift>
    </AbsoluteFill>
  );
};
