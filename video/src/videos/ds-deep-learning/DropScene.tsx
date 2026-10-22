import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DECAY, DROPOUT, OVERFIT } from "./data";
import { at, Axes, CELL_BAD, CELL_OK, Cells, Curve, Drift, Fade, Mark, num, OK, OK_INK, type Scale, Tagline, X0 } from "./parts";

// ── Question 8 ──
const CX = 330;
const CW = 100;
const CH = 54;
const R1 = 380;
const R2 = 486;
const R3 = 592;
const SUM_X = CX + 8 * CW + 50;

// ── Question 9 ──
/** Weight decay first, as it is described first; the L2 penalty under it. */
const ROW_A = 590;
const ROW_B = 470;
const VAL = { left: 1200, right: 1760, top: 400, bottom: 720 };

/**
 * Questions 8 and 9. Dropout on one real draw at p = 0.5: eight
 * activations, a mask that keeps four and doubles them, the zeroed four
 * struck; the total over 100,000 draws matches the total going in. Then
 * weight decay against an L2 penalty under plain SGD, one step each from the
 * same weights, landing on identical numbers; and on the toy network from
 * question 7, decoupled weight decay holding validation loss near its low.
 */
export const DropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dropout").from;
  const qAt = n.word("dropout", "Question eight");
  const textAt = n.word("dropout", "What does dropout do");
  const stepAt = n.word("dropout", "On every training step");
  const zeroesAt = n.word("dropout", "it zeroes a random share");
  const halfAt = n.word("dropout", "here half");
  const doublesAt = n.word("dropout", "doubles the survivors");
  const expectedAt = n.word("dropout", "the expected total stays the same");
  const leanAt = n.word("dropout", "No unit can lean");
  const thinnedAt = n.word("dropout", "many thinned networks");
  const inferenceAt = n.word("dropout", "At inference");
  const q9At = n.word("decay", "Question nine");
  const q9TextAt = n.word("decay", "What is weight decay");
  const shrinksAt = n.word("decay", "shrinks every weight a little");
  const sgdAt = n.word("decay", "For plain SGD");
  const penaltyAt = n.word("decay", "adding an L two penalty");
  const sameAt = n.word("decay", "lands on exactly the same weights");
  const adamAt = n.word("decay-adam", "With Adam the two differ");
  const adamwAt = n.word("decay-adam", "AdamW applies the decay separately");
  const toyAt = n.word("decay-adam", "On the toy network");
  const holdsAt = n.word("decay-adam", "it holds validation loss at point one one");
  const climbedAt = n.word("decay-adam", "where it had climbed");
  const bnInAt = n.word("bn-in", "Then, a layer");
  // The page clears on the bridge's last word, so the gap before question 10 stays short.
  const stackAt = n.beat("bn-in").to - 4;
  const end = n.beat("bn-in").to;

  const q8Out = q9At - 6;
  const D = DROPOUT;
  const kept = (c: number) => D.mask[c] === 1;

  const xs: Scale = { lo: 0, hi: 4000, a: VAL.left, b: VAL.right };
  const ys: Scale = { lo: 0, hi: 0.3, a: y(VAL.bottom), b: y(VAL.top) };
  const clip = { left: VAL.left - 4, right: VAL.right + 6, top: y(VAL.top) - 10, bottom: y(VAL.bottom) + 4 };
  const plain = OVERFIT.epochs.map((e, i) => [e, OVERFIT.val[i]] as const);
  const decayed = OVERFIT.epochs.map((e, i) => [e, OVERFIT.decayVal[i]] as const);

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={zeroesAt + 4} level={-36} />
      <Sfx name="el-tap" at={doublesAt} level={-36} />
      <Sfx name="el-pop" at={expectedAt + 2} level={-34} />
      <Sfx name="el-pencil" at={penaltyAt} level={-36} />
      <Sfx name="el-pop" at={sameAt + 2} level={-32} />
      <Sfx name="el-pencil" at={toyAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} out={q8Out} size={60}>
          What does dropout do, and why does it help?
        </QuestionCard>
        <QuestionCard n={9} at={q9At} textAt={q9TextAt - 2} out={stackAt} size={54} width={1740}>
          What is weight decay, and how does it relate to L2 regularization?
        </QuestionCard>

        {/* ── Question 8: one dropout draw ── */}
        <Fade from={from} out={q8Out}>
          <Tagline x={X0} y={y(R1) + h(14)} at={stepAt - 2} size={22} color={INK}>
            activations
          </Tagline>
          <Cells values={[D.act.map((v) => v.toFixed(2))]} x={CX} y={y(R1)} w={CW} h={h(CH)} at={stepAt} color={BLUE_INK} size={25} />
          <Tagline x={X0} y={y(R2) + h(14)} at={zeroesAt - 2} size={22} color={INK}>
            mask, p = {D.p}
          </Tagline>
          <Cells
            values={[D.mask.map((m) => (m ? "× 2" : "× 0"))]}
            x={CX}
            y={y(R2)}
            w={CW}
            h={h(CH)}
            at={zeroesAt}
            size={24}
            bracket={false}
            look={(_, c) => ({
              tint: { color: kept(c) ? CELL_OK : CELL_BAD, at: kept(c) ? doublesAt : halfAt },
              ink: { color: kept(c) ? OK_INK : ACCENT_INK, at: kept(c) ? doublesAt : halfAt },
            })}
          />
          <Tagline x={X0} y={y(R3) + h(14)} at={doublesAt - 2} size={22} color={INK}>
            after dropout
          </Tagline>
          <Cells
            values={[D.out.map((v) => v.toFixed(2))]}
            x={CX}
            y={y(R3)}
            w={CW}
            h={h(CH)}
            at={doublesAt}
            size={25}
            look={(_, c) => (kept(c) ? { ink: { color: OK_INK, at: doublesAt + 4 } } : { strikeAt: doublesAt + 6 })}
          />
          <Tagline x={SUM_X} y={y(R1) + h(14)} at={stepAt + 6} size={23} color={INK}>
            total {D.sum.toFixed(2)}
          </Tagline>
          <Tagline x={SUM_X} y={y(R3) + h(14)} at={doublesAt + 6} size={23} color={INK}>
            this draw {D.outSum.toFixed(2)}
          </Tagline>
          <Note at={expectedAt - 2} x={SUM_X} y={y(R3) + h(64)}>
            <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
              averaged over 100,000 draws: {D.meanSum.toFixed(2)}
            </span>
          </Note>
          <Note at={leanAt - 2} x={X0} y={y(700)}>
            <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              no unit can lean on any one neighbor:{" "}
              <span style={{ opacity: ease(frame, thinnedAt - 4, 10) }}>like training many thinned networks at once</span>
            </span>
          </Note>
          <Note at={inferenceAt - 2} x={X0} y={y(770)}>
            <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              <Mark at={inferenceAt + 4}>at inference: off</Mark>, all eight pass through
            </span>
          </Note>
        </Fade>

        {/* ── Question 9: two updates that agree ── */}
        <Fade from={q9At} out={stackAt}>
          <Note at={shrinksAt - 2} x={X0} y={y(330)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
              each step, every weight <Mark at={shrinksAt + 4}>shrinks a little toward zero</Mark>
            </span>
          </Note>
          <Tagline x={X0} y={y(390)} at={sgdAt - 2} size={21}>
            plain SGD, from w = ({DECAY.w.map((v) => num(v, 1)).join(", ")}), gradient g = ({DECAY.g.map((v) => num(v, 1)).join(", ")}), step η = {DECAY.eta},
            λ = {DECAY.lam}
          </Tagline>
          <Tagline x={X0} y={y(ROW_A) - h(36)} at={penaltyAt - 2} size={22} color={INK}>
            an L2 penalty in the loss
          </Tagline>
          <Note at={penaltyAt} x={X0} y={y(ROW_A) + h(8)}>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>w − η(g + λw) =</span>
          </Note>
          <Cells
            values={[DECAY.l2.map((v) => num(v, 3))]}
            x={400}
            y={y(ROW_A)}
            w={120}
            h={h(52)}
            at={penaltyAt + 4}
            size={24}
            look={() => ({ tint: { color: CELL_OK, at: sameAt + 4 } })}
          />
          <Tagline x={X0} y={y(ROW_B) - h(36)} at={shrinksAt} size={22} color={INK}>
            weight decay: shrink by {DECAY.shrink}, then the usual step
          </Tagline>
          <Note at={shrinksAt + 2} x={X0} y={y(ROW_B) + h(8)}>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>(1 − ηλ)w − ηg =</span>
          </Note>
          <Cells
            values={[DECAY.decay.map((v) => num(v, 3))]}
            x={400}
            y={y(ROW_B)}
            w={120}
            h={h(52)}
            at={sameAt - 2}
            size={24}
            look={() => ({ tint: { color: CELL_OK, at: sameAt + 4 } })}
          />
          <Note at={sameAt + 4} x={790} y={(y(ROW_A) + y(ROW_B)) / 2 + h(10)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Tick at={sameAt + 8} size={26} />
              <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>identical</span>
            </div>
          </Note>
          <Note at={adamAt - 2} x={X0} y={y(700)}>
            <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>with Adam, the two differ:</span>
          </Note>
          <Note at={adamwAt - 2} x={X0 + 340} y={y(700)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <Mark at={adamwAt + 4}>AdamW</Mark> applies the decay separately
            </span>
          </Note>

          {/* The toy network from question 7, with and without the decay. */}
          <Axes
            x={xs}
            y={ys}
            xTicks={[0, 2000, 4000]}
            yTicks={[0, 0.1, 0.2, 0.3]}
            xFormat={(v) => v.toLocaleString("en-US")}
            yFormat={(v) => v.toFixed(1)}
            xTitle="epochs"
            yTitle="validation loss, the toy network"
            at={toyAt - 4}
            size={18}
          />
          <Curve points={plain} x={xs} y={ys} at={toyAt} dur={30} color={ACCENT} width={3} clip={clip} />
          <Curve points={decayed} x={xs} y={ys} at={holdsAt - 4} dur={30} color={OK} width={3.4} clip={clip} />
          <Tagline x={at(xs, 4000) - 210} y={at(ys, OVERFIT.endVal) - h(40)} at={climbedAt} size={20} color={ACCENT_INK}>
            plain: {OVERFIT.endVal.toFixed(2)}
          </Tagline>
          <Tagline x={at(xs, 4000) - 260} y={at(ys, OVERFIT.decayEndVal) + h(12)} at={holdsAt + 4} size={20} color={OK_INK}>
            <Mark at={bnInAt}>weight decay: {OVERFIT.decayEndVal.toFixed(2)}</Mark>
          </Tagline>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
