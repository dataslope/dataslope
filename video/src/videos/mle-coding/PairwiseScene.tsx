import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { bytes, PAIRWISE } from "./data";
import { ACCENT, ACCENT_INK, BLUE_FILL, Drift, Fade, GREEN_FILL, INK, INK_SOFT, int, Line, Mono, OK, OK_INK, seeded, VRule, X0 } from "./parts";

/** The thousand rows' self-distances, as a grid of cells. */
const COLS = 100;
const PITCH = 12;
/** Which cells are drawn red: a seeded scatter of exactly the count the run
 *  found (PAIRWISE.selfNegative). The count is the claim; where they sit is
 *  only a picture of it. */
const NEGATIVE = (() => {
  const r = seeded(409);
  const cells = Array.from({ length: PAIRWISE.rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return new Set(cells.slice(0, PAIRWISE.selfNegative));
})();

const R_X = 980;

/** A block drawn as a box: front, top and side faces, filled, no outline. */
const Cube: React.FC<{ x: number; y: number; s: number; dx: number; dy: number; hue: "blue" | "red"; opacity: number }> = ({ x, y, s, dx, dy, hue, opacity }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    <polygon points={`${x},${y} ${x + dx},${y + dy} ${x + s + dx},${y + dy} ${x + s},${y}`} fill={ds(hue, 100)} />
    <polygon points={`${x + s},${y} ${x + s + dx},${y + dy} ${x + s + dx},${y + s + dy} ${x + s},${y + s}`} fill={ds(hue, 300)} />
    <rect x={x} y={y} width={s} height={s} fill={ds(hue, 200)} />
  </svg>
);

/**
 * Question 5. Broadcasting every row against every other is an (n, n, d)
 * block, drawn as one: 102.4 GB for ten thousand rows of 128 in float64.
 * The identity on the right is one matrix product and a flat (n, n) square,
 * 800 MB. Then the catch the run found: a thousand rows' distance to
 * themselves, 409 of them negative (PAIRWISE.selfNegative), nan after the
 * root, and none once clipped at zero.
 */
export const PairwiseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "How do you compute pairwise");
  const everyAt = n.word("q5", "Broadcasting every row against every other");
  const nndAt = n.word("q5", "gives an n by n by d array");
  const tenAt = n.word("q5", "For ten thousand rows");
  const hundredAt = n.word("q5", "about a hundred gigabytes");
  const expandAt = n.word("q5-identity", "Expand the square instead");
  const normsAt = n.word("q5-identity", "two squared norms");
  const twiceAt = n.word("q5-identity", "minus twice the dot product");
  const oneAt = n.word("q5-identity", "That's one matrix product");
  const nnAt = n.word("q5-identity", "an n by n result");
  const eightAt = n.word("q5-identity", "eight hundred megabytes");
  const thousandAt = n.word("q5-neg", "On a thousand random rows");
  const selfAt = n.word("q5-neg", "the squared distance from a row to itself");
  const zeroAt = n.word("q5-neg", "which should be zero");
  const negAt = n.word("q5-neg", "came out negative for four in ten");
  const rootAt = n.word("q5-neg", "The square root turned them into not a number");
  const clipAt = n.word("q5-neg", "So clip at zero");
  const beforeAt = n.word("q5-neg", "before the root");
  const end = n.beat("q5-neg").to;

  const cubeTop = y(392);
  const s = 176;
  const red = ease(frame, hundredAt, 16);
  const sqOn = ease(frame, nnAt - 2, 14);
  const gridTop = y(732);
  const negOn = ease(frame, negAt + 2, 8);
  const clipped = ease(frame, clipAt + 8, 16);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={nndAt + 2} level={-31} />
      <Sfx name="el-tap" at={hundredAt + 2} level={-30} />
      <Sfx name="el-pencil" at={expandAt} level={-36} />
      <Sfx name="el-pop" at={nnAt} level={-31} />
      <Sfx name="el-tap" at={eightAt + 2} level={-31} />
      <Sfx name="el-sprinkle" at={thousandAt + 2} level={-36} />
      <Sfx name="el-sprinkle" at={negAt + 2} level={-33} />
      <Sfx name="el-pencil" at={clipAt} level={-35} />
      <Sfx name="el-sprinkle" at={clipAt + 8} level={-35} />
      <Sfx name="el-chime" at={beforeAt + 16} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={56}>
          How do you compute pairwise Euclidean distances between rows?
        </QuestionCard>

        {/* ── Broadcasting: an (n, n, d) block ── */}
        <Line at={everyAt} x={X0} y={y(262)} size={24} color={INK_SOFT}>
          Every row minus every other row
        </Line>
        <Cube x={X0 + 40} y={cubeTop} s={s * ease(frame, nndAt, 18)} dx={86 * ease(frame, nndAt, 18)} dy={-64 * ease(frame, nndAt, 18)} hue="blue" opacity={ease(frame, nndAt - 2, 8) * (1 - red)} />
        <Cube x={X0 + 40} y={cubeTop} s={s} dx={86} dy={-64} hue="red" opacity={red} />
        <div style={{ position: "absolute", left: X0 + 40 + s + 86 + 34, top: cubeTop + s / 2 - 30, opacity: ease(frame, nndAt + 8, 10) }}>
          <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, color: red > 0.5 ? ACCENT_INK : INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>(n, n, d)</span>
        </div>
        <Line at={tenAt} x={X0} y={cubeTop + s + h(36)} size={24}>
          <Num>{int(PAIRWISE.n)}</Num> × <Num>{int(PAIRWISE.n)}</Num> × <Num>{PAIRWISE.d}</Num> × 8 bytes
          <Fade at={hundredAt}>
            {" = "}
            <span style={{ color: ACCENT_INK, fontWeight: 600 }}>{bytes(PAIRWISE.broadcastBytes)}</span>
          </Fade>
        </Line>

        <VRule x={R_X - 70} top={y(262)} bottom={y(640)} at={expandAt} />

        {/* ── The identity: one matrix product, an (n, n) result ── */}
        <div style={{ position: "absolute", left: R_X, top: y(266), fontSize: 38, color: INK, whiteSpace: "nowrap", opacity: ease(frame, expandAt, 12) }}>
          <MathRun>
            ‖<I>a</I> − <I>b</I>‖² ={" "}
            <span style={{ opacity: ease(frame, normsAt, 10) }}>
              ‖<I>a</I>‖² + ‖<I>b</I>‖²
            </span>{" "}
            <span style={{ opacity: ease(frame, twiceAt, 10) }}>
              − 2 <I>a</I> · <I>b</I>
            </span>
          </MathRun>
        </div>
        <Line at={oneAt} x={R_X} y={y(350)} size={23} color={INK_SOFT}>
          One matrix product, plus the norms
        </Line>
        <div style={{ position: "absolute", left: R_X, top: cubeTop + s - s * sqOn, width: s, height: s * sqOn, background: GREEN_FILL, borderRadius: 3 }} />
        <div style={{ position: "absolute", left: R_X + s + 34, top: cubeTop + s / 2 - 30, opacity: ease(frame, nnAt + 6, 10) }}>
          <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, color: OK_INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>(n, n)</span>
        </div>
        <Line at={nnAt + 6} x={R_X} y={cubeTop + s + h(36)} size={24}>
          <Num>{int(PAIRWISE.n)}</Num> × <Num>{int(PAIRWISE.n)}</Num> × 8 bytes
          <Fade at={eightAt}>
            {" = "}
            <span style={{ color: OK_INK, fontWeight: 600 }}>{bytes(PAIRWISE.identityBytes)}</span>
          </Fade>
        </Line>

        {/* ── The catch: a row's distance to itself ── */}
        <Line at={thousandAt} x={X0} y={gridTop - h(48)} size={24}>
          <Num>{int(PAIRWISE.rows)}</Num> random rows
          <Fade at={selfAt}>: each one&apos;s squared distance to itself</Fade>
          <Fade at={zeroAt}>
            <span style={{ color: INK_SOFT }}>, which should be 0</span>
          </Fade>
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: PAIRWISE.rows }, (_, i) => {
            const shown = ease(frame, thousandAt + (i % COLS) * 0.12 + Math.floor(i / COLS) * 0.6, 6);
            if (shown <= 0) return null;
            const bad = NEGATIVE.has(i);
            const fill = bad ? (clipped > 0.5 ? OK : negOn > 0.5 ? ACCENT : BLUE_FILL) : clipped > 0.5 ? ds("green", 300) : BLUE_FILL;
            return <rect key={i} x={X0 + (i % COLS) * PITCH} y={gridTop + Math.floor(i / COLS) * h(PITCH)} width={PITCH - 3} height={h(PITCH) - 3} rx={2} fill={fill} opacity={shown} />;
          })}
        </svg>
        <div style={{ position: "absolute", left: X0 + COLS * PITCH + 50, top: gridTop - h(6), display: "flex", flexDirection: "column", gap: h(14), fontSize: 24 }}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: negOn }}>
            <Num>{PAIRWISE.selfNegative}</Num> came out negative
          </span>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap", opacity: ease(frame, rootAt, 10) }}>nan after the square root</span>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", opacity: ease(frame, clipAt, 10) }}>
            Clip first: <Mono>np.maximum(d2, 0)</Mono>
          </span>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, clipAt + 22, 10) }}>
            Then the root: <Num>{PAIRWISE.nanAfterClip}</Num> nan
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
