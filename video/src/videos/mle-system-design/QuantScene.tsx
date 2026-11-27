import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { QUANT } from "./data";
import { commas, Digit, Drift, Fade, Line, Mark, MiniMap, OK_INK, Q_SIZE, Q_W, Svg, Tag, X0 } from "./parts";

const CELL_W = 15;
const CELL_STEP = 17;
const NAME_X = 700;
const SIZE_X = 990;
/** The accuracy axis: 0 to 100% across this span. */
const ACC = { x0: 1060, x1: 1400 };
const CHANGED_X = 1500;
const ROW = { top: 384, pitch: 70 };
const NAMES: Record<number, string> = { 32: "32-bit float", 8: "8-bit integer", 4: "4 bits", 3: "3 bits", 2: "2 bits" };

const kb = (bytes: number) => {
  const v = bytes / 1000;
  return v >= 10 ? `${Math.round(v)} KB` : `${v.toFixed(1)} KB`;
};
const accText = (a: number) => `${(a * 100).toFixed(1)}%`;

/**
 * Question 7: one weight as 32 bits, then 8, then 4; then a real network on
 * scikit-learn's handwritten digits with every weight rounded: 8 bits a
 * quarter of the size and not one answer changed, 4 bits an eighth and the
 * same accuracy, 2 bits a collapse to 28.9% (3 bits drawn, not said). Then
 * post-training against quantization-aware, and why to compare answers
 * rather than the average: at 4 bits two answers changed, one fixed and one
 * broken, and accuracy did not move.
 */
export const QuantScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q7").from;
  const qAt = n.word("q7", "Question seven");
  const textAt = n.word("q7", "What is model quantization");
  const fewerAt = n.word("q7", "Storing the weights in fewer bits");
  const eightBitAt = n.word("q7", "eight-bit integers");
  const fourBitAt = n.word("q7", "or even four bits");
  const smallerAt = n.word("q7", "The model gets smaller");
  const memoryAt = n.word("q7", "moves less data through memory");
  const fasterAt = n.word("q7", "usually runs faster");
  const netAt = n.word("q7-run", "Take a small neural network");
  const weightsAt = n.word("q7-run", "seventeen thousand weights");
  const kbAt = n.word("q7-run", "sixty-eight kilobytes");
  const accAt = n.word("q7-run", "ninety-seven point eight percent");
  const quarterAt = n.word("q7-run", "a quarter of the size");
  const noneAt = n.word("q7-run", "not one answer changes");
  const eighthAt = n.word("q7-cliff", "an eighth of the size");
  const holdsAt = n.word("q7-cliff", "accuracy still holds");
  const twoAt = n.word("q7-cliff", "At two");
  const collapseAt = n.word("q7-cliff", "collapses to twenty-nine percent");
  const ptqAt = n.word("q7-qat", "post-training quantization");
  const simpleAt = n.word("q7-qat", "simple, and often enough");
  const qatAt = n.word("q7-qat", "quantization-aware training");
  const tolerateAt = n.word("q7-qat", "learn to tolerate it");
  const compareAt = n.word("q7-qat", "compare answers");
  const changedAt = n.word("q7-qat", "two answers changed");
  const fixedAt = n.word("q7-qat", "one fixed");
  const brokenAt = n.word("q7-qat", "one broken");
  const didntAt = n.word("q7-qat", "accuracy didn't move");
  const labelsInAt = n.word("q8-in", "learn whether the model was right");
  const end = n.beat("q8-in").to;

  const rows = QUANT.rows;
  const rowTop = (i: number) => y(ROW.top) + i * h(ROW.pitch);
  const rowMid = (i: number) => rowTop(i) + 15;
  /** When each row arrives, and when its size, accuracy and change land. */
  const rowAt = [fewerAt, eightBitAt, fourBitAt, twoAt - 4, twoAt];
  const sizeAt = [kbAt, quarterAt, eighthAt, twoAt + 2, twoAt + 6];
  const accAtRow = [accAt, noneAt, holdsAt, twoAt + 4, collapseAt];
  const accX = (a: number) => ACC.x0 + a * (ACC.x1 - ACC.x0);
  const four = rows.find((r) => r.bits === 4)!;
  const qatLit = Math.min(ease(frame, changedAt, 10), 1);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={fewerAt} level={-33} />
      <Sfx name="el-tap" at={eightBitAt} level={-30} />
      <Sfx name="el-tap" at={fourBitAt} level={-30} />
      <Sfx name="el-tap" at={smallerAt} level={-32} />
      <Sfx name="el-tap" at={memoryAt} level={-32} />
      <Sfx name="el-tap" at={fasterAt} level={-32} />
      <Sfx name="el-sprinkle" at={netAt} level={-33} />
      <Sfx name="el-tap" at={kbAt} level={-31} />
      <Sfx name="el-tap" at={accAt} level={-31} />
      <Sfx name="el-tap" at={quarterAt} level={-31} />
      <Sfx name="el-chime" at={noneAt + 12} level={-33} />
      <Sfx name="el-tap" at={eighthAt} level={-31} />
      <Sfx name="el-scratch" at={collapseAt} level={-33} />
      <Sfx name="el-tap" at={ptqAt} level={-31} />
      <Sfx name="el-tap" at={qatAt} level={-31} />
      <Sfx name="el-pop" at={changedAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is model quantization?
        </QuestionCard>
        <MiniMap
          at={qAt}
          store
          lit={[
            ["model", qAt + 10],
            ["labels", labelsInAt],
          ]}
        />

        {/* ── The header ── */}
        <Line at={fewerAt} x={X0} y={y(ROW.top) - h(54)} size={21} color={INK_SOFT}>
          One weight&apos;s bits
        </Line>
        <Line at={kbAt} x={SIZE_X} y={y(ROW.top) - h(54)} size={21} color={INK_SOFT} align="right" width={160}>
          size
        </Line>
        <Line at={accAt} x={ACC.x0} y={y(ROW.top) - h(54)} size={21} color={INK_SOFT}>
          right, of <Num>{QUANT.test}</Num> held-out digits
        </Line>
        <Line at={noneAt} x={CHANGED_X + 60} y={y(ROW.top) - h(54)} size={21} color={INK_SOFT}>
          answers changed
        </Line>

        {/* ── The rows: each a weight's bits, the size, the accuracy ── */}
        {rows.map((r, i) => {
          const p = ease(frame, rowAt[i], 14);
          if (p <= 0) return null;
          const quiet = r.bits === 3;
          const bad = r.bits === 2;
          return (
            <React.Fragment key={r.bits}>
              {Array.from({ length: r.bits }, (_, k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: X0 + k * CELL_STEP,
                    top: rowTop(i),
                    width: CELL_W,
                    height: 30,
                    borderRadius: 3,
                    background: quiet ? ds("blue", 200) : BAR,
                    opacity: ease(frame, rowAt[i] + k * 0.6, 8),
                  }}
                />
              ))}
              <div style={{ position: "absolute", left: NAME_X, top: rowTop(i) + 1, ...label(22, quiet ? INK_SOFT : INK), fontWeight: 500, whiteSpace: "nowrap", opacity: p }}>
                {NAMES[r.bits]}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: SIZE_X - 160,
                  width: 160,
                  textAlign: "right",
                  top: rowTop(i) + 1,
                  ...label(22, quiet ? INK_SOFT : BLUE_INK),
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  opacity: ease(frame, sizeAt[i], 10),
                }}
              >
                {kb(r.weightBytes)}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: bad ? accX(r.accuracy) - 18 - 100 : accX(r.accuracy) + 18,
                  width: bad ? 100 : undefined,
                  textAlign: bad ? "right" : "left",
                  top: rowTop(i) + 1,
                  ...label(22, bad ? ACCENT_INK : quiet ? INK_SOFT : BLUE_INK),
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  opacity: ease(frame, accAtRow[i] + 6, 10),
                }}
              >
                {accText(r.accuracy)}
              </div>
            </React.Fragment>
          );
        })}
        {/* The accuracies as a line that holds and then drops. */}
        <Svg>
          {rows.map((r, i) => {
            const p = ease(frame, accAtRow[i], 12);
            if (p <= 0) return null;
            const prev = rows[i - 1];
            const line = i > 0 ? ease(frame, accAtRow[i], 18) : 0;
            const px = prev ? accX(prev.accuracy) : 0;
            const py = rowMid(i - 1);
            const tx = accX(r.accuracy);
            const ty = rowMid(i);
            return (
              <g key={r.bits}>
                {prev ? (
                  <line
                    x1={px}
                    y1={py}
                    x2={px + (tx - px) * line}
                    y2={py + (ty - py) * line}
                    stroke={r.bits === 2 ? ACCENT : BAR}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                ) : null}
                <circle cx={tx} cy={ty} r={9 * p} fill={r.bits === 2 ? ACCENT : r.bits === 3 ? ds("blue", 200) : BAR} />
              </g>
            );
          })}
          <line x1={ACC.x0} x2={ACC.x1} y1={rowMid(4) + h(36)} y2={rowMid(4) + h(36)} stroke={HAIRLINE} strokeWidth={1} opacity={ease(frame, accAt, 12)} />
        </Svg>
        {[0, 0.5, 1].map((v) => (
          <Line key={v} at={accAt} x={accX(v)} y={rowMid(4) + h(44)} size={19} color={INK_SOFT} align="center" width={80}>
            <Num>{v * 100}</Num>%
          </Line>
        ))}
        {/* Answers changed: none at 8 bits, two at 4. */}
        <Ink at={noneAt} dur={12} style={{ left: CHANGED_X + 60, top: rowTop(1) + 1, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, OK_INK), fontWeight: 500 }}>
            <Num>0</Num>
          </span>
        </Ink>
        <Ink at={changedAt} dur={12} style={{ left: CHANGED_X + 60, top: rowTop(2) + 1, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 500 }}>
            <Mark at={changedAt + 2}>
              <Num>{four.changed}</Num>: <Num>{four.fixed}</Num> fixed, <Num>{four.broke}</Num> broken
            </Mark>
          </span>
        </Ink>

        {/* What fewer bits buy: one line under the bars, not one benefit per
            row, since all three come from fewer bits. It sits where the 3-
            and 2-bit rows arrive later, and leaves before they do. */}
        <Fade out={netAt}>
          <Line at={smallerAt} x={X0} y={rowTop(3) + h(20)} size={22}>
            Fewer bits: smaller
            <span style={{ opacity: ease(frame, memoryAt, 10) }}>, less data through memory</span>
            <span style={{ opacity: ease(frame, fasterAt, 10) }}>, usually faster</span>
          </Line>
        </Fade>

        {/* ── The network and its digits ── */}
        <Fade out={changedAt - 4}>
          <Line at={netAt} x={X0} y={y(760)} size={22}>
            A small neural network
            <span style={{ color: INK_SOFT, opacity: ease(frame, weightsAt, 10) }}>
              , <Num>{commas(QUANT.weights)}</Num> weights
            </span>
          </Line>
          {QUANT.gallery.map((g, i) => (
            <Digit key={i} image={g.image} px={7} x={X0 + i * 76} y={y(760) + h(46)} at={netAt + 4 + i * 3} />
          ))}
          <Line at={netAt + 20} x={X0} y={y(760) + h(46) + 70} size={20} color={INK_SOFT}>
            Held-out digits, as it reads them: <Num>8</Num> by <Num>8</Num> pixels
          </Line>
        </Fade>
        {/* The two answers that changed at 4 bits. */}
        {QUANT.changed4.map((c, i) => {
          const fixed = c.pred4 === c.label;
          const at = fixed ? fixedAt : brokenAt;
          const x = X0 + i * 420;
          return (
            <React.Fragment key={c.index}>
              <Digit image={c.image} px={8} x={x} y={y(760)} at={changedAt + i * 4} />
              <Line at={changedAt + 4 + i * 4} x={x + 86} y={y(760) - 4} size={21}>
                Truly a <Num>{c.label}</Num>
              </Line>
              <Line at={changedAt + 8 + i * 4} x={x + 86} y={y(760) + 28} size={21} color={INK_SOFT}>
                <Num>32</Num> bits: <Num>{c.pred32}</Num> · <Num>4</Num> bits: <Num>{c.pred4}</Num>
              </Line>
              <Line at={at} x={x + 86} y={y(760) + 60} size={21} color={fixed ? OK_INK : ACCENT_INK}>
                {fixed ? "Fixed" : "Broken"}
              </Line>
            </React.Fragment>
          );
        })}
        <Line at={didntAt} x={X0} y={y(760) + 112} size={21} color={INK_SOFT}>
          Accuracy didn&apos;t move: <Num>{accText(four.accuracy)}</Num> either way
        </Line>

        {/* ── Two ways to quantize ── */}
        <Ink at={ptqAt} dur={12} style={{ left: 1060, top: y(760), whiteSpace: "nowrap" }}>
          <Tag size={22} tone={ease(frame, simpleAt, 10) > 0.5 && qatLit < 1 ? "yellow" : "ink"}>
            post-training
          </Tag>
        </Ink>
        <Line at={simpleAt} x={1060} y={y(760) + h(50)} size={21} color={INK_SOFT}>
          Round a finished model:
        </Line>
        <Line at={simpleAt + 6} x={1060} y={y(760) + h(50) + 30} size={21} color={INK_SOFT}>
          simple, often enough
        </Line>
        <ColumnRule x={1430} top={y(760)} height={h(50) + 60} at={qatAt} />
        <Ink at={qatAt} dur={12} style={{ left: 1470, top: y(760), whiteSpace: "nowrap" }}>
          <Tag size={22}>quantization-aware</Tag>
        </Ink>
        <Line at={qatAt + 8} x={1470} y={y(760) + h(50)} size={21} color={INK_SOFT}>
          Rounds during training,
        </Line>
        <Line at={tolerateAt} x={1470} y={y(760) + h(50) + 30} size={21} color={INK_SOFT}>
          so the weights tolerate it
        </Line>
        <Line at={compareAt} x={1060} y={y(760) + h(50) + 90} size={22}>
          <Mark at={compareAt + 4}>Compare answers, not just the average</Mark>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
