import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pct, SHUFFLE } from "./data";
import { ACCENT, ACCENT_INK, ART, artBox, Bars, Cell, Drift, INK, INK_SOFT, Line, OK, OK_INK, seeded, Spot, VRule, X0 } from "./parts";

const ROWS = 8;
const F_X = 200;
const F_W = 240;
const L_X = 620;
const L_W = 150;
const SEGS = 8;

/** A picture of a few training rows: each a strip of feature values and a
 *  label, then one permutation for both, then two apart. Only the scores on
 *  the right are measured. */
const PICTURE = (() => {
  const r = seeded(959);
  const rows = Array.from({ length: ROWS }, (_, i) => ({
    shades: Array.from({ length: SEGS }, () => [100, 200, 300, 400, 500][Math.floor(r() * 5)] as 100 | 200 | 300 | 400 | 500),
    benign: i % 3 !== 1,
  }));
  const perm = (seed: number) => {
    const g = seeded(seed);
    const p = Array.from({ length: ROWS }, (_, i) => i);
    for (let i = ROWS - 1; i > 0; i--) {
      const j = Math.floor(g() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  };
  // apart: a seed whose order moves every label off its own row (seed 23
  // left two in place, under a caption that says every row; review
  // 2026-11-26).
  return { rows, together: perm(7), apart: perm(10) };
})();

/**
 * Question 9. Features and labels as two columns joined row by row: one
 * permutation moves both and every join stays level; shuffling them
 * separately crosses the joins and turns them red. Then the run on
 * scikit-learn's breast cancer set: 95.9% trained on aligned rows, 52.6% on
 * rows shuffled apart, under the 62.6% of always guessing benign.
 */
export const ShuffleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Question nine");
  const textAt = n.word("q9", "How do you shuffle features and labels");
  const oneAt = n.word("q9", "One permutation, applied to both");
  const sepAt = n.word("q9", "Shuffle them separately");
  const anotherAt = n.word("q9", "every row gets another row's label");
  const cancerAt = n.word("q9", "On the breast cancer data");
  const dropsAt = n.word("q9", "logistic regression drops from ninety-six percent");
  const fiftyAt = n.word("q9", "to fifty-three percent");
  const worseAt = n.word("q9", "worse than always guessing benign");
  const end = n.beat("q9").to;

  const top = y(330);
  const pitch = h(56);
  const rowH = h(38);
  const rowY = (slot: number) => top + slot * pitch;
  const together = ease(frame, oneAt + 4, 22);
  const apart = ease(frame, sepAt + 4, 24);
  const broken = ease(frame, sepAt + 16, 10);

  const R_X = 960;
  const barTop = y(372);
  const barRow = h(64);
  const scale = 480;
  const nameW = 250;
  const baseX = R_X + nameW + SHUFFLE.majority * scale;
  const cards = artBox(ART.cards, 230);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={oneAt - 4} level={-32} />
      <Sfx name="el-whoosh" at={oneAt + 4} level={-36} />
      <Sfx name="el-pop" at={sepAt} level={-30} />
      <Sfx name="el-whoosh" at={sepAt + 4} level={-35} />
      <Sfx name="el-pop" at={dropsAt + 2} level={-32} />
      <Sfx name="el-pop" at={fiftyAt + 2} level={-32} />
      <Sfx name="el-pencil" at={worseAt + 2} level={-35} />
      <Sfx name="el-chime" at={end + 14} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you shuffle features and labels together correctly?
        </QuestionCard>

        <div style={{ position: "absolute", left: F_X, top: top - h(48), ...label(23, INK), opacity: ease(frame, oneAt - 6, 10) }}>features</div>
        <div style={{ position: "absolute", left: L_X, top: top - h(48), ...label(23, INK), opacity: ease(frame, oneAt - 6, 10) }}>labels</div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, oneAt - 2, 10) }}>
          {PICTURE.rows.map((_, r) => {
            const fSlot = r + (PICTURE.together[r] - r) * together;
            const lSlot = fSlot + (PICTURE.apart[r] - PICTURE.together[r]) * apart;
            const wrong = PICTURE.apart[r] !== PICTURE.together[r];
            const color = wrong && broken > 0.5 ? ACCENT : INK;
            return (
              <line
                key={r}
                x1={F_X + F_W + 16}
                y1={rowY(fSlot) + rowH / 2}
                x2={L_X - 16}
                y2={rowY(lSlot) + rowH / 2}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={wrong && broken > 0.5 ? "7 6" : undefined}
              />
            );
          })}
        </svg>
        {PICTURE.rows.map((row, r) => {
          const fSlot = r + (PICTURE.together[r] - r) * together;
          const lSlot = fSlot + (PICTURE.apart[r] - PICTURE.together[r]) * apart;
          const shown = ease(frame, oneAt - 6 + r, 8);
          return (
            <React.Fragment key={r}>
              <div style={{ position: "absolute", left: F_X, top: rowY(fSlot), display: "flex", gap: 3, opacity: shown }}>
                {row.shades.map((s, k) => (
                  <div key={k} style={{ width: F_W / SEGS - 3, height: rowH, background: ds("blue", s), borderRadius: 2 }} />
                ))}
              </div>
              <Cell x={L_X} y={rowY(lSlot)} w={L_W} h={rowH} size={21} radius={5} opacity={shown}>
                {row.benign ? "benign" : "malignant"}
              </Cell>
            </React.Fragment>
          );
        })}
        <Line at={oneAt + 10} x={X0} y={rowY(ROWS) + h(10)} size={24} color={OK_INK} weight={600} out={sepAt}>
          One permutation for both: every join stays level
        </Line>
        <Line at={anotherAt} x={X0} y={rowY(ROWS) + h(10)} size={24} color={ACCENT_INK} weight={600}>
          Shuffled apart: every row, another row&apos;s label
        </Line>

        <VRule x={R_X - 60} top={y(300)} bottom={y(880)} at={cancerAt} />

        {/* ── The run: breast cancer, logistic regression ── */}
        <Line at={cancerAt} x={R_X} y={y(300)} size={23} color={INK_SOFT}>
          Breast cancer data, logistic regression, <Num>{SHUFFLE.test}</Num> test rows
        </Line>
        <Bars
          x={R_X}
          top={barTop}
          width={scale}
          rowH={barRow}
          nameW={nameW}
          max={1}
          endCol={scale + 24}
          bars={[
            { name: "shuffled together", value: SHUFFLE.aligned, color: OK, at: dropsAt, end: <span style={{ ...note(25, OK_INK), fontWeight: 600 }}>{pct(SHUFFLE.aligned)}</span> },
            { name: "shuffled apart", value: SHUFFLE.separate, color: ACCENT, at: fiftyAt, end: <span style={{ ...note(25, ACCENT_INK), fontWeight: 600 }}>{pct(SHUFFLE.separate)}</span> },
          ]}
        />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, worseAt, 10) }}>
          <line x1={baseX} x2={baseX} y1={barTop - h(12)} y2={barTop + 2 * barRow + h(12)} stroke={INK_SOFT} strokeWidth={2} strokeDasharray="6 6" />
        </svg>
        <Line at={worseAt + 4} x={baseX - 200} y={barTop + 2 * barRow + h(24)} size={22} color={INK_SOFT}>
          always guess {SHUFFLE.majorityClass}: {pct(SHUFFLE.majority)}
        </Line>

        <Spot id={ART.cards.id} at={sepAt} left={1380} top={y(660)} {...cards} />
      </Drift>
    </AbsoluteFill>
  );
};
