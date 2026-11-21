import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pct, SOFTMAX } from "./data";
import { ACCENT_INK, Cell, Drift, Fade, INK_SOFT, Line, lineOf, Listing, Mono, OK, OK_INK, VRule, X0 } from "./parts";

const COL_X = 300;
const COL_W = 124;
const COL_GAP = 26;
const R_X = 990;
const LINES = ["def softmax(z):", "    z = z - np.max(z)", "    e = np.exp(z)", "    return e / e.sum()"];
const minus = (v: number) => (v < 0 ? `−${-v}` : `${v}`);

/**
 * Question 7. Float64 tops out near e^709.78: the page's scores 1000, 1001
 * and 1002 overflow to inf, and inf over inf is nan three times. The page's
 * softmax, its shift line lit, takes them to −2, −1 and 0 and gives 0.09,
 * 0.24 and 0.67 as three green bars. Then the log: scores 1000 and 100, the
 * second's probability underflows to 0.0 and its log to −inf, where
 * log-softmax gives −900.
 */
export const SoftmaxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q7").from;
  const qAt = n.word("q7", "Question seven");
  const textAt = n.word("q7", "Why subtract the max");
  const topsAt = n.word("q7", "Float sixty-four tops out near");
  const eAt = n.word("q7", "e to the seven hundred and nine");
  const scoresAt = n.word("q7", "Scores of a thousand");
  const overflowAt = n.word("q7", "overflow to infinity");
  const infAt = n.word("q7", "infinity over infinity is not a number");
  const threeAt = n.word("q7", "three times");
  const shiftAt = n.word("q7-fix", "Softmax doesn't change when every score shifts");
  const subtractAt = n.word("q7-fix", "Subtract the largest");
  const zeroAt = n.word("q7-fix", "the biggest exponent is zero");
  const nineAt = n.word("q7-fix", "nine, twenty-four");
  const giveAt = n.word("q7-log", "Give the right class a score of a hundred");
  const underAt = n.word("q7-log", "its probability underflows to zero");
  const minusInfAt = n.word("q7-log", "whose log is minus infinity");
  const logSoftAt = n.word("q7-log", "Log-softmax computes minus nine hundred directly");
  const rawAt = n.word("q7-log", "a loss should take the raw scores");
  const end = n.beat("q7-log").to;

  const colX = (c: number) => COL_X + c * (COL_W + COL_GAP);
  const rowY = (r: number) => y(352) + r * h(62);
  const ch = h(48);
  const rows = [
    { name: "scores", at: scoresAt, values: SOFTMAX.z.map((v) => `${v}`), tone: "ink" as const },
    { name: "exp", at: overflowAt, values: SOFTMAX.z.map(() => "inf"), tone: "bad" as const },
    { name: "softmax", at: infAt + 4, values: SOFTMAX.naive, tone: "bad" as const },
  ];
  const shiftY = y(604);
  const barBase = y(880);
  const barMax = h(210);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={topsAt} level={-36} />
      <Sfx name="el-pop" at={scoresAt + 2} level={-32} />
      <Sfx name="el-tap" at={overflowAt + 2} level={-31} />
      <Sfx name="el-tap" at={infAt + 6} level={-30} />
      <Sfx name="el-pencil" at={shiftAt} level={-36} />
      <Sfx name="el-whoosh" at={subtractAt + 4} level={-36} />
      <Sfx name="el-pop" at={nineAt} level={-31} />
      <Sfx name="el-tap" at={minusInfAt + 2} level={-30} />
      <Sfx name="el-tap" at={logSoftAt + 2} level={-32} />
      <Sfx name="el-chime" at={rawAt + 18} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why subtract the max before exponentiating in softmax?
        </QuestionCard>

        <Line at={topsAt} x={X0} y={y(268)} size={26}>
          The largest <Mono>float64</Mono> is about
          <Fade at={eAt}>
            {" "}
            <M>{`e^{${SOFTMAX.ceiling}}`}</M>
          </Fade>
        </Line>

        {/* ── Unshifted: inf, then nan, three times ── */}
        {rows.map((r, i) => (
          <React.Fragment key={r.name}>
            <div style={{ position: "absolute", left: X0, top: rowY(i) + ch / 2 - 15, ...label(23, INK_SOFT), opacity: ease(frame, r.at - 2, 10), whiteSpace: "nowrap" }}>{r.name}</div>
            {r.values.map((v, c) => (
              <Cell key={c} x={colX(c)} y={rowY(i)} w={COL_W} h={ch} size={25} radius={5} tone={r.tone} opacity={ease(frame, r.at + c * 3, 10)}>
                {v}
              </Cell>
            ))}
          </React.Fragment>
        ))}
        <Line at={threeAt} x={colX(3) - 6} y={rowY(2) + ch / 2 - 15} size={23} color={ACCENT_INK}>
          inf / inf
        </Line>

        {/* ── Shifted: −2, −1, 0, and three probabilities ── */}
        <div style={{ position: "absolute", left: X0, top: shiftY + ch / 2 - 15, ...label(23, INK_SOFT), opacity: ease(frame, subtractAt - 2, 10), whiteSpace: "nowrap" }}>shifted</div>
        {SOFTMAX.shifted.map((v, c) => (
          <Cell key={c} x={colX(c)} y={shiftY} w={COL_W} h={ch} size={25} radius={5} tone={c === 2 && frame >= zeroAt ? "ok" : "ink"} opacity={ease(frame, subtractAt + 6 + c * 3, 10)}>
            {minus(v)}
          </Cell>
        ))}
        {SOFTMAX.stable.map((p, c) => {
          const g = ease(frame, nineAt + c * 6, 16);
          if (g <= 0) return null;
          const bh = p * barMax * g;
          return (
            <React.Fragment key={c}>
              <div style={{ position: "absolute", left: colX(c) + 22, top: barBase - bh, width: COL_W - 44, height: bh, background: OK, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: colX(c), width: COL_W, top: barBase - p * barMax - h(38), textAlign: "center", ...note(24, OK_INK), fontWeight: 600, opacity: ease(frame, nineAt + c * 6 + 8, 10) }}>
                <Num>{pct(p, 0)}</Num>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ position: "absolute", left: X0, top: barBase - h(30), ...label(23, INK_SOFT), opacity: ease(frame, nineAt - 2, 10), whiteSpace: "nowrap" }}>softmax</div>

        <VRule x={R_X - 70} top={y(268)} bottom={y(890)} at={shiftAt} />

        {/* ── The page's softmax ── */}
        <Listing lines={LINES} x={R_X} top={y(268)} size={26} at={shiftAt - 4} marks={[{ line: lineOf(LINES, "np.max"), at: subtractAt }]} />
        <Line at={shiftAt + 8} x={R_X} y={y(268) + h(206)} size={23} color={INK_SOFT}>
          The same shift on every score leaves softmax unchanged
        </Line>

        {/* ── The log: underflow, and log-softmax ── */}
        <Line at={giveAt} x={R_X} y={y(612)} size={24}>
          Scores <Num>{SOFTMAX.z2[0]}</Num> and <Num>{SOFTMAX.z2[1]}</Num>, the right class at <Num>{SOFTMAX.z2[1]}</Num>
        </Line>
        <Line at={underAt} x={R_X} y={y(612) + h(50)} size={24} color={ACCENT_INK}>
          <M>p</M> = <Num>{SOFTMAX.p2[1].toFixed(1)}</Num>
          <Fade at={minusInfAt}>
            , so <M>log p</M> = −inf
          </Fade>
        </Line>
        <Line at={logSoftAt} x={R_X} y={y(612) + h(100)} size={24} color={OK_INK} weight={600}>
          Log-softmax: {minus(SOFTMAX.logSoftmax[1])}, computed directly
        </Line>
        <Line at={rawAt} x={R_X} y={y(612) + h(166)} size={26} weight={600}>
          A loss should take the raw scores
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
