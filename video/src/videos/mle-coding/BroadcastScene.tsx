import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BROADCAST } from "./data";
import { ACCENT_INK, BLUE_FILL, BLUE_INK, Cell, Drift, Fade, INK, INK_SOFT, Line, Mark, MARK_BAD, OK_INK, RED_FILL, VRule, X0 } from "./parts";

const CW = 84;
const GAP = 8;

/** A shape as NumPy prints it, in the mono face. */
const Shape: React.FC<{ dims: readonly number[]; color?: string; size?: number }> = ({ dims, color = INK_SOFT, size = 22 }) => (
  <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 500, color, fontVariantLigatures: "none", whiteSpace: "pre" }}>
    ({dims.join(", ")}
    {dims.length === 1 ? "," : ""})
  </span>
);

/** An operator between two arrays. */
const Op: React.FC<{ x: number; y: number; at: number; children: React.ReactNode }> = ({ x, y, at, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ position: "absolute", left: x, top: y, width: 40, textAlign: "center", ...note(36, INK), opacity: ease(frame, at, 10) }}>{children}</div>;
};

/**
 * Question 4. The page's 3-by-2 matrix minus its column means, a row of two:
 * the row is stamped down onto every row (dashed: stretched, not copied), and
 * the centred matrix comes out (computed from BROADCAST.X and .mean). Then
 * the trap, as shapes: predictions in a (1000, 1) column minus labels in a
 * flat (1000,) array grow into a red (1000, 1000) square, and the mean
 * squared error comes out 2.29 where the right one is 0.24, with no error.
 */
export const BroadcastScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "What is broadcasting");
  const stretchAt = n.word("q4", "NumPy stretches the smaller array");
  const sizeOneAt = n.word("q4", "along its size-one dimensions");
  const copyAt = n.word("q4", "without copying");
  const subtractAt = n.word("q4", "Subtract the column means");
  const rowTwoAt = n.word("q4", "a row of two");
  const matrixAt = n.word("q4", "from a three-by-two matrix");
  const reusedAt = n.word("q4", "that row is reused for every row");
  const trapAt = n.word("q4-trap", "The trap is that it never complains");
  const predAt = n.word("q4-trap", "Predictions in a column");
  const labelsAt = n.word("q4-trap", "minus labels in a flat array");
  const broadcastAt = n.word("q4-trap", "broadcast to a thousand by a thousand");
  const mseAt = n.word("q4-trap", "The mean squared error comes out");
  const twoAt = n.word("q4-trap", "two point three");
  const insteadAt = n.word("q4-trap", "instead of point two four");
  const nothingAt = n.word("q4-trap", "nothing raises an error");
  const checkAt = n.word("q4-trap", "Check the shapes before you reduce");
  const end = n.beat("q4-trap").to;

  const X = BROADCAST.X;
  const mean = BROADCAST.mean;
  const centred = X.map((row) => row.map((v, j) => v - mean[j]));
  const top = y(336);
  const ch = h(52);
  const rowY = (i: number) => top + i * (ch + GAP);
  const xX = X0;
  const xMean = X0 + 2 * CW + GAP + 90;
  const xRes = xMean + 2 * CW + GAP + 90;
  const dimTop = 1 - 0.35 * ease(frame, trapAt, 14);

  // ── The trap ──
  const bTop = y(668);
  const side = h(196);
  const thin = 26;
  const colX = X0 + 50;
  const flatX = colX + thin + 92;
  const sqX = flatX + side + 92;
  const grow = ease(frame, broadcastAt + 4, 26);
  const R_X = 1020;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={matrixAt} level={-32} />
      <Sfx name="el-tap" at={rowTwoAt} level={-33} />
      <Sfx name="el-whoosh" at={reusedAt + 2} level={-36} />
      <Sfx name="el-pop" at={reusedAt + 22} level={-32} />
      <Sfx name="el-pop" at={predAt + 2} level={-32} />
      <Sfx name="el-pop" at={labelsAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={broadcastAt + 4} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-30} />
      <Sfx name="el-tap" at={insteadAt + 2} level={-32} />
      <Sfx name="el-chime" at={checkAt + 10} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is broadcasting, and why is it useful?
        </QuestionCard>
        <Line at={stretchAt} x={X0} y={y(262)} size={24} color={INK_SOFT}>
          The smaller array is stretched<Fade at={sizeOneAt}> along its size-1 dimensions</Fade>
          <Fade at={copyAt}>, without copying</Fade>
        </Line>

        {/* ── The page's matrix minus its column means ── */}
        <div style={{ position: "absolute", inset: 0, opacity: dimTop }}>
          {X.map((row, i) =>
            row.map((v, j) => (
              <Cell key={`${i}${j}`} x={xX + j * (CW + GAP)} y={rowY(i)} w={CW} h={ch} size={26} radius={5} opacity={ease(frame, matrixAt + i * 2, 10)}>
                {v}
              </Cell>
            )),
          )}
          <div style={{ position: "absolute", left: xX, top: rowY(3) + h(4), width: 2 * CW + GAP, textAlign: "center", opacity: ease(frame, matrixAt + 6, 10) }}>
            <Shape dims={[3, 2]} />
          </div>
          <Op x={xMean - 66} y={rowY(1) + ch / 2 - 24} at={subtractAt}>
            −
          </Op>
          {[0, 1, 2].map((i) => {
            const stamp = i === 0 ? 1 : ease(frame, reusedAt + 2 + i * 8, 12);
            if (stamp <= 0) return null;
            return mean.map((v, j) => (
              <Cell
                key={`${i}${j}`}
                x={xMean + j * (CW + GAP)}
                y={i === 0 ? rowY(0) : rowY(i) - h(16) * (1 - stamp)}
                w={CW}
                h={ch}
                size={26}
                radius={5}
                tone="data"
                dashed={i > 0}
                opacity={i === 0 ? ease(frame, rowTwoAt, 10) : 0.85 * stamp}
              >
                {v}
              </Cell>
            ));
          })}
          <div style={{ position: "absolute", left: xMean, top: rowY(3) + h(4), width: 2 * CW + GAP, textAlign: "center", opacity: ease(frame, rowTwoAt + 6, 10) }}>
            <Shape dims={[2]} color={BLUE_INK} />
          </div>
          <Op x={xRes - 66} y={rowY(1) + ch / 2 - 24} at={reusedAt + 20}>
            =
          </Op>
          {centred.map((row, i) =>
            row.map((v, j) => (
              <Cell key={`${i}${j}`} x={xRes + j * (CW + GAP)} y={rowY(i)} w={CW} h={ch} size={26} radius={5} opacity={ease(frame, reusedAt + 22 + i * 3, 10)}>
                {v < 0 ? `−${-v}` : v}
              </Cell>
            )),
          )}
          <div style={{ position: "absolute", left: xRes, top: rowY(3) + h(4), width: 2 * CW + GAP, textAlign: "center", opacity: ease(frame, reusedAt + 28, 10) }}>
            <Shape dims={[3, 2]} />
          </div>
          <Line at={reusedAt + 4} x={xRes + 2 * CW + GAP + 70} y={rowY(1) + ch / 2 - 16} size={23} color={BLUE_INK}>
            Dashed: the same row, reused
          </Line>
          <Line at={reusedAt + 10} x={xRes + 2 * CW + GAP + 70} y={rowY(1) + ch / 2 - 16 + h(40)} size={23} color={INK_SOFT}>
            never copied in memory
          </Line>
        </div>

        {/* ── The trap: a column minus a flat array ── */}
        <Line at={trapAt} x={X0} y={y(602)} size={26}>
          The trap: it <Mark at={trapAt + 10} color={MARK_BAD}>never complains</Mark>
        </Line>
        <div style={{ position: "absolute", left: colX, top: bTop, width: thin, height: side * ease(frame, predAt + 2, 16), background: BLUE_FILL, borderRadius: 3 }} />
        <div style={{ position: "absolute", left: colX - 30, top: bTop + side + h(12), opacity: ease(frame, predAt + 6, 10), whiteSpace: "nowrap" }}>
          <Shape dims={BROADCAST.predShape} color={INK} />
        </div>
        <div style={{ position: "absolute", left: colX + thin + 14, top: bTop - 4, ...label(22, INK_SOFT), opacity: ease(frame, predAt + 6, 10), whiteSpace: "nowrap" }}>
          predictions
        </div>
        <Op x={flatX - 64} y={bTop + side / 2 - 24} at={labelsAt}>
          −
        </Op>
        <div style={{ position: "absolute", left: flatX, top: bTop + side / 2 - thin / 2, width: side * ease(frame, labelsAt + 2, 16), height: thin, background: BLUE_FILL, borderRadius: 3 }} />
        <div style={{ position: "absolute", left: flatX, top: bTop + side / 2 - thin / 2 - 38, width: side, textAlign: "center", ...label(22, INK_SOFT), opacity: ease(frame, labelsAt + 6, 10), whiteSpace: "nowrap" }}>
          labels
        </div>
        <div style={{ position: "absolute", left: flatX, top: bTop + side + h(12), width: side, textAlign: "center", opacity: ease(frame, labelsAt + 6, 10) }}>
          <Shape dims={BROADCAST.yShape} color={INK} />
        </div>
        <Op x={sqX - 64} y={bTop + side / 2 - 24} at={broadcastAt}>
          =
        </Op>
        <div
          style={{
            position: "absolute",
            left: sqX,
            top: bTop,
            width: thin + (side - thin) * grow,
            height: grow > 0 ? side : 0,
            background: RED_FILL,
            borderRadius: 3,
            opacity: ease(frame, broadcastAt, 8),
          }}
        />
        <div style={{ position: "absolute", left: sqX, top: bTop + side + h(12), width: side, textAlign: "center", opacity: ease(frame, broadcastAt + 20, 10) }}>
          <Shape dims={BROADCAST.wrongShape} color={ACCENT_INK} />
        </div>

        <VRule x={R_X - 60} top={y(660)} bottom={y(890)} at={mseAt} />
        <Line at={mseAt} x={R_X} y={y(664)} size={23} color={INK_SOFT}>
          Mean squared error
        </Line>
        <div style={{ position: "absolute", left: R_X, top: y(664) + h(44), display: "flex", alignItems: "baseline", gap: 18, fontSize: 26, whiteSpace: "nowrap", opacity: ease(frame, twoAt - 2, 10) }}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 600 }}>
            <Num>{BROADCAST.mseWrong.toFixed(2)}</Num>
          </span>
          <span style={{ ...note(24, INK_SOFT) }}>from the (1000, 1000) square</span>
        </div>
        <div style={{ position: "absolute", left: R_X, top: y(664) + h(94), display: "flex", alignItems: "baseline", gap: 18, fontSize: 26, whiteSpace: "nowrap", opacity: ease(frame, insteadAt - 2, 10) }}>
          <span style={{ ...note(26, OK_INK), fontWeight: 600 }}>
            <Num>{BROADCAST.mseRight.toFixed(2)}</Num>
          </span>
          <span style={{ ...note(24, INK_SOFT) }}>the real one, row against its own label</span>
        </div>
        <Line at={nothingAt} x={R_X} y={y(664) + h(146)} size={24} color={ACCENT_INK}>
          No error raised
        </Line>
        <Line at={checkAt} x={R_X} y={y(664) + h(200)} size={26} color={OK_INK} weight={600}>
          Check the shapes before you reduce
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
