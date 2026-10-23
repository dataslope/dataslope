import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { normalPdf } from "../../editorial/charts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, MARK_OK, noteText, OK_INK, Svg, X0 } from "./parts";

const STEP_TOP = 390;
const STEP_PITCH = 92;
const HYP_X = 360;
const SKETCH_X = 1300;
const SKETCH_W = 300;
const SKETCH_H = 70;

/** CTR with its group, set the way the page writes a rate. */
const Ctr: React.FC<{ of: string }> = ({ of }) => (
  <span>
    CTR<sub style={{ fontSize: "0.62em" }}>{of}</sub>
  </span>
);

/** A small normal curve with its rejection region shaded: one tail or two. */
const Tails: React.FC<{ x: number; y: number; at: number; out: number; sides: 1 | 2 }> = ({ x, y, at, out, sides }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const cut = sides === 2 ? 1.96 : 1.645;
  const px = (z: number) => x + ((z + 3.4) / 6.8) * SKETCH_W;
  const py = (z: number) => y - (normalPdf(z, 0, 1) / normalPdf(0, 0, 1)) * SKETCH_H;
  const zs = Array.from({ length: 69 }, (_, i) => -3.4 + i * 0.1);
  const curve = zs.map((z, i) => `${i ? "L" : "M"}${px(z).toFixed(1)},${py(z).toFixed(1)}`).join(" ");
  const tail = (a: number, b: number) => {
    const pts = zs.filter((z) => z >= a - 1e-9 && z <= b + 1e-9);
    return `M${px(a)},${y} ${pts.map((z) => `L${px(z).toFixed(1)},${py(z).toFixed(1)}`).join(" ")} L${px(b)},${y} Z`;
  };
  return (
    <Svg opacity={p * (1 - o)}>
      <path d={tail(cut, 3.4)} fill={ACCENT} opacity={0.75} />
      {sides === 2 ? <path d={tail(-3.4, -cut)} fill={ACCENT} opacity={0.75} /> : null}
      <path d={curve} fill="none" stroke={INK} strokeWidth={2} />
      <line x1={x} x2={x + SKETCH_W} y1={y} y2={y} stroke={INK} strokeWidth={1.2} />
    </Svg>
  );
};

/**
 * Questions 9 and 10. The four steps of a test, each written as it is
 * named, the first two bracketed as the ones that come before any data.
 * Then the null and the two alternatives for a click-through test, each
 * alternative beside the tail (or tails) it rejects in.
 */
export const StepsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("steps").from;
  const qAt = n.word("steps", "Question");
  const textAt = n.word("steps", "What is hypothesis testing");
  const defAt = n.word("steps", "A way to decide");
  const stepAt = [
    n.word("steps", "One: state"),
    n.word("steps", "Two: choose"),
    n.word("steps", "Three: collect"),
    n.word("steps", "Four: reject"),
  ];
  const beforeAt = n.word("steps", "The first two happen before");
  const q10At = n.word("ctr", "Question ten");
  const q10TextAt = n.word("ctr", "State the null and alternative");
  const nullAt = n.word("ctr", "The null: the two rates are equal");
  const differAt = n.word("ctr", "they differ");
  const twoAt = n.word("ctr", "for a two-sided test");
  const higherAt = n.word("ctr", "the new one is higher");
  const oneAt = n.word("ctr", "for a one-sided test");
  const pickAt = n.word("ctr", "Pick it before you look");
  const saferAt = n.word("ctr", "Two-sided is the safer default");
  const eitherAt = n.word("ctr", "in either direction");
  const end = n.beat("ctr").to;

  const stepsOut = q10At - 4;
  const STEPS = [
    <>State the null and the alternative</>,
    <>
      Choose the significance level, <i>α</i>, and size the sample
    </>,
    <>Collect the data; compute the test statistic and its p-value</>,
    <>
      Reject the null if <i>p</i> &lt; <i>α</i>, and say what that means
    </>,
  ];
  const stepY = (i: number) => y(STEP_TOP + i * STEP_PITCH);
  const hyp = [
    { y: y(420), name: "the null", formula: <>
        <Ctr of="new" /> = <Ctr of="old" />
      </>, at: nullAt, tag: null },
    { y: y(530), name: "the alternative", formula: <>
        <Ctr of="new" /> ≠ <Ctr of="old" />
      </>, at: differAt, tag: { text: "two-sided", at: twoAt, sides: 2 as const } },
    { y: y(640), name: "", formula: <>
        <Ctr of="new" /> &gt; <Ctr of="old" />
      </>, at: higherAt, tag: { text: "one-sided", at: oneAt, sides: 1 as const } },
  ];

  return (
    <AbsoluteFill>
      {stepAt.map((t, i) => (
        <Sfx key={i} name="el-pencil" at={t + 2} level={-34} />
      ))}
      <Sfx name="el-tap" at={beforeAt + 4} level={-32} />
      <Sfx name="el-pencil" at={nullAt + 2} level={-34} />
      <Sfx name="el-pencil" at={differAt + 2} level={-34} />
      <Sfx name="el-pencil" at={higherAt + 2} level={-34} />
      <Sfx name="el-pop" at={saferAt + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={q10At - 4} size={60}>
          What is hypothesis testing, and what are its four steps?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={56}>
          State the null and alternative hypotheses for an A/B test on click-through rate (CTR).
        </QuestionCard>

        {/* ── Question 9: the four steps ── */}
        <Note at={defAt} x={X0} y={y(300)} out={stepsOut}>
          <span style={{ ...noteText(26, INK_SOFT) }}>deciding whether the data give enough evidence against a null hypothesis</span>
        </Note>
        {STEPS.map((text, i) => (
          <Note key={i} at={stepAt[i]} x={X0} y={stepY(i)} out={stepsOut}>
            <div style={{ display: "flex", alignItems: "center", gap: 22, whiteSpace: "nowrap" }}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  border: `2.5px solid ${BAR}`,
                  background: i < 2 ? `color-mix(in srgb, ${BAR} ${ease(frame, beforeAt + 4 + i * 3, 12) * 100}%, ${PAPER})` : PAPER,
                  color: i < 2 && frame > beforeAt + 8 ? PAPER : BLUE_INK,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(24),
                  fontWeight: 700,
                  ...TABULAR,
                }}
              >
                {i + 1}
              </span>
              <span style={{ ...noteText(32, INK) }}>{text}</span>
            </div>
          </Note>
        ))}
        <Svg opacity={1 - ease(frame, stepsOut, 10)}>
          {(() => {
            const p = ease(frame, beforeAt, 14);
            const top = stepY(0) - h(4);
            const bottom = stepY(1) + h(50);
            const mid = (top + bottom) / 2;
            const half = ((bottom - top) / 2) * p;
            return p > 0 ? (
              <path
                d={`M1170,${mid - half} L1182,${mid - half} L1182,${mid + half} L1170,${mid + half}`}
                fill="none"
                stroke={OK_INK}
                strokeWidth={2.4}
                strokeLinejoin="round"
              />
            ) : null;
          })()}
        </Svg>
        <Note at={beforeAt + 6} x={1204} y={stepY(0) + h(28)} out={stepsOut}>
          <span style={{ ...noteText(26, OK_INK) }}>
            <Mark at={beforeAt + 10} color={MARK_OK}>
              before you see any data
            </Mark>
          </span>
        </Note>

        {/* ── Question 10: the null and the two alternatives ── */}
        {hyp.map((r, i) => (
          <React.Fragment key={i}>
            <Note at={r.at} x={X0} y={r.y}>
              <span style={{ ...noteText(28, INK_SOFT), fontWeight: 650 }}>{r.name}</span>
            </Note>
            <Note at={r.at + 2} x={HYP_X} y={r.y - h(4)}>
              <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, color: INK, whiteSpace: "nowrap", fontVariantLigatures: "none" }}>
                {r.formula}
              </span>
            </Note>
            {r.tag ? (
              <>
                <Note at={r.tag.at} x={860} y={r.y}>
                  <span style={{ ...noteText(28, r.tag.sides === 2 ? OK_INK : INK) }}>
                    {r.tag.sides === 2 ? (
                      <Mark at={saferAt + 4} color={MARK_OK}>
                        {r.tag.text}
                      </Mark>
                    ) : (
                      r.tag.text
                    )}
                  </span>
                </Note>
                <Tails x={SKETCH_X} y={r.y + h(48)} at={r.tag.at + 4} out={end + 60} sides={r.tag.sides} />
              </>
            ) : null}
          </React.Fragment>
        ))}
        <Note at={pickAt} x={X0} y={y(750)}>
          <span style={{ ...noteText(26, INK) }}>chosen before you look</span>
        </Note>
        <Note at={saferAt + 6} x={X0} y={y(810)}>
          <span style={{ ...noteText(26, OK_INK) }}>
            two-sided: the safer default, it catches a change{" "}
            <span style={{ opacity: ease(frame, eitherAt - 2, 10) }}>in either direction</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
