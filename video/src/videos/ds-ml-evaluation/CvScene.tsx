import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CV, pct } from "./data";
import { at, Bracket, Drift, ElbowArrow, Fade, Mark, OK, OK_INK, PanelTitle, type Scale, Strike, Svg } from "./parts";

const STRIP = { left: 160, right: 980, base: 690 };
const DOT = 11;
const PER_ROW = 3;
const FOLDS = { left: 1150, width: 470, top: 420, rowH: 54 };
const SPLIT = { left: 160, width: 1500, top: 470, height: 84 };

/** Where each split's dot sits: its value's column, stacked in arrival order. */
const STACK = (() => {
  const seen = new Map<number, number>();
  return CV.splits.map((v) => {
    const k = seen.get(v) ?? 0;
    seen.set(v, k + 1);
    return { v, k };
  });
})();

/**
 * Questions 5 and 6 on scikit-learn's breast cancer set (569 tumors). Two
 * hundred random 80/20 splits as a pile of dots, one per split, spread from
 * 94.7% to 100%; then five folds, each scoring the fold the others trained
 * for, with their mean and its spread drawn back onto the pile, and
 * forward-chaining for time series. Then the three sets as one bar, with the
 * peek from the test set back into the choice struck out.
 */
export const CvScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cv").from;
  const qAt = n.word("cv", "Question");
  const textAt = n.word("cv", "What is cross-validation");
  const asked = n.word("cv", "Split this tumor data");
  const waysAt = n.word("cv", "two hundred different ways");
  const rangeAt = n.word("cv", "anywhere from");
  const oneAt = n.word("cv", "One split is one draw");
  const kfoldAt = n.word("cv-folds", "K-fold cross-validation");
  const fourAt = n.word("cv-folds", "trains on four");
  const fifthAt = n.word("cv-folds", "scores the fifth");
  const overAt = n.word("cv-folds", "five times over");
  const onceAt = n.word("cv-folds", "every row is scored once");
  const meanAt = n.word("cv-folds", "the mean is");
  const giveAt = n.word("cv-folds", "give or take");
  const timeAt = n.word("cv-folds", "For time series");
  const afterAt = n.word("cv-folds", "comes after the training data");
  const q6At = n.word("split", "Question six");
  const q6TextAt = n.word("split", "What's the discipline");
  const fitAt = n.word("split", "Fit on the training set");
  const tuneAt = n.word("split", "Tune and choose");
  const touchAt = n.word("split", "Touch the test set once");
  const reportAt = n.word("split", "to report");
  const peekAt = n.word("split", "Every choice made by looking");
  const flatterAt = n.word("split", "flatter you");
  const pictureAt = n.word("learn-in", "a picture tells you");
  const end = n.beat("learn-in").to;

  const xs: Scale = { lo: 0.94, hi: 1.005, a: STRIP.left, b: STRIP.right };
  const base = y(STRIP.base);
  const ticks = [0.95, 0.96, 0.97, 0.98, 0.99, 1];
  const span = Math.max(1, (rangeAt - 6) - waysAt);
  const lo = at(xs, CV.min);
  const hi = at(xs, CV.max);
  const meanX = at(xs, CV.mean);
  const sdLo = at(xs, CV.mean - CV.std);
  const sdHi = at(xs, CV.mean + CV.std);
  const top = base - h(DOT) * (Math.ceil(54 / PER_ROW) + 1);
  const meanP = ease(frame, meanAt, 14);
  const sdP = ease(frame, giveAt, 14);
  const segW = FOLDS.width / 5;

  // Question 6's bar: 60% training, 20% validation, 20% test.
  const parts = [
    { name: "training", share: 0.6, color: BAR, fill: `color-mix(in srgb, ${BAR} 22%, ${PAPER})`, role: "fit", at: fitAt },
    { name: "validation", share: 0.2, color: HIGHLIGHT, fill: HIGHLIGHT, role: "tune and choose", at: tuneAt },
    { name: "test", share: 0.2, color: INK, fill: PAPER, role: "report, once, at the end", at: touchAt },
  ];
  let acc = 0;
  const segs = parts.map((p) => {
    const left = SPLIT.left + acc * SPLIT.width;
    acc += p.share;
    return { ...p, left, width: p.share * SPLIT.width };
  });
  const testSeg = segs[2];
  const valSeg = segs[1];
  const barTop = y(SPLIT.top);
  const barH = h(SPLIT.height);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={waysAt} level={-34} />
      <Sfx name="el-pencil" at={rangeAt + 2} level={-34} />
      {CV.folds.map((_, i) => (
        <Sfx key={i} name="el-tap" at={overAt + i * 5} level={-38} />
      ))}
      <Sfx name="el-pop" at={meanAt + 2} level={-32} />
      <Sfx name="el-pencil" at={fitAt} level={-36} />
      <Sfx name="el-scratch" at={flatterAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} out={q6At - 4} size={60}>
          What is cross-validation, and why use it?
        </QuestionCard>
        <QuestionCard n={6} at={q6At} textAt={q6TextAt - 2} out={end - 6} size={56}>
          What&apos;s the discipline behind training, validation and test sets?
        </QuestionCard>

        <Fade from={asked - 8} out={q6At - 6}>
          {/* ── Two hundred single splits ── */}
          <PanelTitle x={STRIP.left} y={top - h(48)} at={asked - 2}>
            the same model, two hundred random splits of the tumor data
          </PanelTitle>
          <Svg>
            <line x1={STRIP.left} x2={STRIP.right} y1={base + 1} y2={base + 1} stroke={INK} strokeWidth={1.6} opacity={ease(frame, asked, 12)} />
            {ticks.map((t) => (
              <g key={t} opacity={ease(frame, asked + 4, 12)}>
                <line x1={at(xs, t)} x2={at(xs, t)} y1={base} y2={base + 7} stroke={INK} strokeWidth={1.2} />
                <text x={at(xs, t)} y={base + 32} textAnchor="middle" style={{ ...label(20, INK_SOFT), fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(t * 100)}%
                </text>
              </g>
            ))}
            {STACK.map((d, i) => {
              const p = ease(frame, waysAt + (i / STACK.length) * span, 6);
              if (p <= 0) return null;
              const cx = at(xs, d.v) + ((d.k % PER_ROW) - 1) * DOT;
              const cy = base - h(DOT) * (Math.floor(d.k / PER_ROW) + 0.7);
              const one = i === 0;
              const ring = one ? ease(frame, oneAt, 10) : 0;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={4.4 * p} fill={one && ring > 0 ? ACCENT : BAR} opacity={0.85} />
                  {one ? <circle cx={cx} cy={cy} r={11 * ring} fill="none" stroke={ACCENT} strokeWidth={2.4} opacity={ring} /> : null}
                </g>
              );
            })}
          </Svg>
          <Bracket x0={lo} x1={hi} y={base + h(62)} at={rangeAt} color={ACCENT}>
            <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, ...TABULAR }}>
              {pct(CV.min, 1)} to {pct(CV.max)}
            </span>
          </Bracket>
          <Note at={oneAt + 2} x={STRIP.left} y={base + h(128)} out={meanAt}>
            <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>one split: one draw from that range</span>
          </Note>

          {/* The folds' mean and spread, back on the same axis. */}
          <Svg opacity={meanP}>
            <rect x={sdLo + (meanX - sdLo) * (1 - sdP)} y={top - h(6)} width={(sdHi - sdLo) * sdP} height={base - top + h(6)} fill={`color-mix(in srgb, ${OK} 14%, transparent)`} />
            <line x1={meanX} x2={meanX} y1={top - h(14)} y2={base} stroke={OK} strokeWidth={3.4} />
          </Svg>
          <Note at={meanAt + 2} x={STRIP.left} y={base + h(128)}>
            <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
              five folds: {fmt(CV.mean * 100, 1)}%<span style={{ opacity: sdP }}>, give or take {fmt(CV.std * 100, 1)}</span>
            </span>
          </Note>

          {/* ── Five folds, each scored by the other four ── */}
          <PanelTitle x={FOLDS.left} y={y(FOLDS.top) - h(52)} at={kfoldAt - 2}>
            five folds of the same rows
          </PanelTitle>
          {CV.folds.map((score, k) => {
            const rowAt = k === 0 ? fourAt - 4 : overAt + k * 5;
            const p = ease(frame, rowAt, 12);
            if (p <= 0) return null;
            const rowTop = y(FOLDS.top) + k * h(FOLDS.rowH);
            const held = k === 0 ? ease(frame, fifthAt - 2, 10) : 1;
            return (
              <React.Fragment key={k}>
                {Array.from({ length: 5 }, (_, s) => (
                  <div
                    key={s}
                    style={{
                      position: "absolute",
                      left: FOLDS.left + s * segW + 2,
                      top: rowTop,
                      width: segW - 4,
                      height: h(FOLDS.rowH - 14),
                      boxSizing: "border-box",
                      borderRadius: 3,
                      background: s === k ? `color-mix(in srgb, ${HIGHLIGHT} ${100 * held}%, ${PAPER})` : `color-mix(in srgb, ${BAR} 28%, ${PAPER})`,
                      border: `1.5px solid ${s === k ? INK : BAR}`,
                      opacity: p,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: "absolute",
                    left: FOLDS.left + FOLDS.width + 22,
                    top: rowTop + h(4),
                    ...note(26, BLUE_INK),
                    fontWeight: 650,
                    ...TABULAR,
                    opacity: ease(frame, (k === 0 ? fifthAt : rowAt) + 4, 10),
                  }}
                >
                  {fmt(score * 100, 1)}%
                </div>
              </React.Fragment>
            );
          })}
          <Note at={fourAt} x={FOLDS.left} y={y(FOLDS.top) + 5 * h(FOLDS.rowH) + h(2)}>
            <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: 16, height: 12, background: `color-mix(in srgb, ${BAR} 28%, ${PAPER})`, border: `1.5px solid ${BAR}`, marginRight: 8 }} />
              train on four
              <span style={{ display: "inline-block", width: 16, height: 12, background: HIGHLIGHT, border: `1.5px solid ${INK}`, margin: "0 8px 0 22px", opacity: ease(frame, fifthAt, 10) }} />
              <span style={{ opacity: ease(frame, fifthAt, 10) }}>score the fifth</span>
              <span style={{ opacity: ease(frame, onceAt, 10) }}>: every row scored once</span>
            </span>
          </Note>

          {/* Time series: always validate on what comes after. */}
          <TimeSeries at={timeAt} afterAt={afterAt} left={FOLDS.left} top={y(FOLDS.top) + 5 * h(FOLDS.rowH) + h(64)} />
        </Fade>

        {/* ── Question 6: three sets, three jobs ── */}
        <Fade from={q6At + 4} out={end - 8}>
          {segs.map((s) => {
            const p = ease(frame, s.at - 4, 14);
            return (
              <React.Fragment key={s.name}>
                <div
                  style={{
                    position: "absolute",
                    left: s.left + 3,
                    top: barTop,
                    width: (s.width - 6) * p,
                    height: barH,
                    boxSizing: "border-box",
                    background: s.fill,
                    border: `2px solid ${s.color}`,
                    borderRadius: 4,
                  }}
                />
                <Note at={s.at - 2} x={s.left + 14} y={barTop + h(22)}>
                  <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{s.name}</span>
                </Note>
                <Note at={s.at + 4} x={s.left + 14} y={barTop + barH + h(18)}>
                  <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
                    {s.name === "test" ? (
                      <>
                        <Mark at={pictureAt - 6}>once</Mark>, <span style={{ opacity: ease(frame, reportAt - 2, 10) }}>to report</span>
                      </>
                    ) : s.name === "validation" ? (
                      <>
                        tune and choose
                        <br />
                        <span style={{ ...note(22, INK_SOFT) }}>or cross-validate</span>
                      </>
                    ) : (
                      s.role
                    )}
                  </span>
                </Note>
              </React.Fragment>
            );
          })}
          {/* The peek: a score read off the test set, fed back into the choice. */}
          <ElbowArrow
            points={[
              [testSeg.left + testSeg.width / 2, barTop - 14],
              [testSeg.left + testSeg.width / 2, barTop - h(80)],
              [valSeg.left + valSeg.width / 2, barTop - h(80)],
              [valSeg.left + valSeg.width / 2, barTop - 14],
            ]}
            at={peekAt}
            color={ACCENT}
            width={2.8}
          />
          <Note at={peekAt + 8} x={valSeg.left + 40} y={barTop - h(130)}>
            <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap" }}>
              <Strike at={flatterAt - 4} color={ACCENT} top="0.78em">
                choosing by the test score
              </Strike>
            </span>
          </Note>
          <Note at={flatterAt} x={SPLIT.left} y={barTop + barH + h(150)}>
            <span style={{ ...note(28, ACCENT_INK), whiteSpace: "nowrap" }}>Peek, and the test score flatters you.</span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};


/** Forward-chaining folds: each validates on the block after what it trained on. */
const TimeSeries: React.FC<{ at: number; afterAt: number; left: number; top: number }> = ({ at: from, afterAt, left, top }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const cell = 52;
  const rows = 3;
  return (
    <>
      <div style={{ position: "absolute", left, top, ...label(21, INK), fontWeight: 650, opacity: ease(frame, from, 10), whiteSpace: "nowrap" }}>
        time series: validate only on what comes after
      </div>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => {
          const kind = c <= r ? "train" : c === r + 1 ? "val" : "none";
          const p = ease(frame, afterAt - 6 + r * 4 + c, 8);
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: left + c * (cell + 4),
                top: top + h(40) + r * h(22),
                width: cell,
                height: h(16),
                borderRadius: 2,
                boxSizing: "border-box",
                background: kind === "train" ? `color-mix(in srgb, ${BAR} 28%, ${PAPER})` : kind === "val" ? HIGHLIGHT : "transparent",
                border: kind === "none" ? `1px dashed ${INK_SOFT}` : `1.5px solid ${kind === "val" ? INK : BAR}`,
                opacity: p * (kind === "none" ? 0.5 : 1),
              }}
            />
          );
        }),
      )}
      <div style={{ position: "absolute", left: left + 6 * (cell + 4) + 8, top: top + h(58), ...label(19, INK_SOFT), opacity: ease(frame, afterAt, 10), whiteSpace: "nowrap" }}>
        time →
      </div>
    </>
  );
};

