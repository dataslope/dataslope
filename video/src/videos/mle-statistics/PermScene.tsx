import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MODELS, PERM_MODELS, PERM_PAGE } from "./data";
import { Baseline, DATA, Drift, Heading, Hist, Line, Mark, mulberry32, OK_INK, POINT, Svg, X0, QMark } from "./parts";

const GROUP_B = ds("teal", 500);
const DOT = 14;
const DOT_PITCH = 22;
const L_X1 = 860;
const R_X0 = 1000;
const R_X1 = 1780;

/** One shuffle of the page's hundred labels: which slots read A after it. */
const SHUFFLED = (() => {
  const order = Array.from({ length: 100 }, (_, i) => i);
  const rand = mulberry32(8);
  for (let i = 99; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map((k) => k < 50);
})();

/**
 * Question 8. The page's two groups of fifty as dots, their labels shuffled
 * once; the null distribution 10,000 shuffles build, with the observed 5.9
 * out in its tails (p = 0.024). Then the two models: pooled and shuffled, a
 * wide null with the half-point gap in its middle (p = 0.62: no evidence of
 * a gap, which is not evidence of none); paired, the 2×2 of agreement (only
 * 18 disagreements, 14 to the new model) and a narrow null with the same gap
 * in its tail (p = 0.03, below α). On "ship it?" the verdict is marked: the
 * offline test passes, and an online test decides.
 */
export const PermScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q8").from;
  const qAt = n.word("q8", "Question eight");
  const textAt = n.word("q8", "What is a permutation test?");
  const buildsAt = n.word("q8", "It builds the null distribution");
  const shufflingAt = n.word("q8", "shuffling the group labels");
  const interAt = n.word("q8", "interchangeable if there's no effect");
  const diffAt = n.word("q8", "five point nine");
  const tenKAt = n.word("q8", "ten thousand shuffles");
  const twoFourAt = n.word("q8", "two point four percent");
  const modelsAt = n.word("q8-models", "Now the two models");
  const poolAt = n.word("q8-models", "Pool their four thousand");
  const sixTwoAt = n.word("q8-models", "point six two");
  const sameAt = n.word("q8-paired", "the same two thousand examples");
  const eighteenAt = n.word("q8-paired", "only eighteen");
  const fourteenAt = n.word("q8-paired", "wins fourteen");
  const withinAt = n.word("q8-paired", "Shuffle within each pair");
  const ohThreeAt = n.word("q8-paired", "point oh three");
  const sameGapAt = n.word("q8-paired", "Same gap");
  const rejectsAt = n.word("q8-paired", "rejects the null");
  const passesAt = n.word("q8-ship", "the new model passes");
  const end = n.beat("q8-ship").to;

  const out = modelsAt - 4;

  // ── The page's example ──
  const dotsX = X0 + 160;
  const groupY = [y(330), y(452)];
  const shuffled = ease(frame, shufflingAt + 6, 16);
  const nullX = (v: number) => R_X0 + ((v + 10) / 20) * (R_X1 - R_X0);
  const nullBase = y(620);
  const pageTail = (i: number) => {
    const mid = (PERM_PAGE.null.edges[i] + PERM_PAGE.null.edges[i + 1]) / 2;
    return Math.abs(mid) >= PERM_PAGE.observed;
  };
  const tail = ease(frame, twoFourAt - 6, 10);

  // ── The two models, on one scale: accuracy difference in points. ±3
  // points holds the whole pooled null (its spread is about 0.9 points). ──
  const SPAN = 0.03;
  const dx = (x0: number, x1: number) => (v: number) => x0 + ((v + SPAN) / (2 * SPAN)) * (x1 - x0);
  const pointTicks = (x: (v: number) => number) =>
    [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03].map((v) => ({ v, x: x(v), text: v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v * 100))}` }));
  const ux = dx(X0, L_X1);
  const px = dx(R_X0, R_X1);
  const histBase = y(700);
  const gapLine = (x: (v: number) => number, at: number, tall: number) => (
    <Svg opacity={ease(frame, at, 10)}>
      <line x1={x(PERM_MODELS.gap)} x2={x(PERM_MODELS.gap)} y1={histBase} y2={histBase - tall} stroke={POINT} strokeWidth={3} />
    </Svg>
  );
  const pairedEdges = [...PERM_MODELS.pairedNull.values.map((v) => v - 0.0004), PERM_MODELS.pairedNull.values[PERM_MODELS.pairedNull.values.length - 1] + 0.0004];
  const pairedTail = (i: number) => Math.abs(PERM_MODELS.pairedNull.values[i]) >= PERM_MODELS.gap - 1e-9;

  // ── The 2×2 of agreement ──
  const tX = R_X0 + 200;
  const tW = 190;
  const tY = y(352);
  const tH = h(42);
  const cells = [
    [MODELS.bothRight, MODELS.onlyOld],
    [MODELS.onlyNew, MODELS.bothWrong],
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={buildsAt + 4} level={-33} />
      <Sfx name="el-whoosh" at={shufflingAt + 6} level={-36} />
      <Sfx name="el-sprinkle" at={tenKAt} level={-32} />
      <Sfx name="el-tap" at={twoFourAt} level={-30} />
      <Sfx name="el-sprinkle" at={poolAt + 4} level={-32} />
      <Sfx name="el-tap" at={sixTwoAt} level={-30} />
      <Sfx name="el-tap" at={eighteenAt} level={-31} />
      <Sfx name="el-tap" at={fourteenAt} level={-31} />
      <Sfx name="el-sprinkle" at={withinAt + 4} level={-32} />
      <Sfx name="el-tap" at={ohThreeAt} level={-30} />
      <Sfx name="el-chime" at={rejectsAt + 16} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a <QMark at={n.word("q8", "a permutation test?")} after="?">permutation test</QMark>
        </QuestionCard>

        {/* ── The page's two groups, shuffled ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          {[0, 1].map((g) => (
            <Line key={g} at={buildsAt + g * 4} x={X0} y={groupY[g] + 8} size={24} color={g ? ds("teal", 700) : DATA}>
              {g ? "Group B" : "Group A"}
            </Line>
          ))}
          <Svg>
            {Array.from({ length: 100 }, (_, i) => {
              const g = i < 50 ? 0 : 1;
              const k = i % 50;
              const cx = dotsX + (k % 25) * DOT_PITCH + DOT / 2;
              const cy = groupY[g] + Math.floor(k / 25) * DOT_PITCH + DOT / 2;
              const p = ease(frame, buildsAt + 2 + i * 0.3, 8);
              if (p <= 0) return null;
              const isA = shuffled > 0.5 ? SHUFFLED[i] : g === 0;
              return <circle key={i} cx={cx} cy={cy} r={(DOT / 2) * p} fill={isA ? DATA : GROUP_B} />;
            })}
          </Svg>
          <Line at={shufflingAt + 8} x={X0} y={y(560)} size={24} color={INK_SOFT}>
            One shuffle of the labels
          </Line>
          <Line at={interAt} x={X0} y={y(604)} size={24} color={INK_SOFT}>
            Interchangeable if there&apos;s no effect
          </Line>

          <ColumnRule x={(L_X1 + R_X0) / 2 - 20} top={y(320)} height={y(760) - y(320)} at={tenKAt} />
          <Heading at={tenKAt} x={R_X0} y={y(300)}>
            Differences over <Num>10,000</Num> shuffles
          </Heading>
          <Hist
            counts={PERM_PAGE.null.counts}
            edges={PERM_PAGE.null.edges}
            x={nullX}
            base={nullBase}
            height={h(220)}
            grow={(i) => ease(frame, tenKAt + 2 + i * 0.6, 10)}
            ink={(i) => (pageTail(i) && tail > 0.5 ? POINT : DATA)}
          />
          <Baseline x0={R_X0} x1={R_X1} base={nullBase} at={tenKAt} ticks={[-10, -5, 0, 5, 10].map((v) => ({ v, x: nullX(v), text: v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0" }))} />
          <Svg opacity={ease(frame, diffAt, 10)}>
            <line x1={nullX(PERM_PAGE.observed)} x2={nullX(PERM_PAGE.observed)} y1={nullBase} y2={nullBase - h(170)} stroke={POINT} strokeWidth={3} />
          </Svg>
          <Line at={diffAt} x={nullX(PERM_PAGE.observed) + 12} y={nullBase - h(170)} size={24}>
            Observed <Num>{PERM_PAGE.observed.toFixed(1)}</Num>
          </Line>
          <Line at={twoFourAt} x={R_X0} y={nullBase + h(64)} size={28} weight={600}>
            <Mark at={twoFourAt + 4}>
              <MathRun>
                <I>p</I> = <Num>{PERM_PAGE.p.toFixed(3)}</Num>
              </MathRun>
            </Mark>
            <span style={{ ...note(28, INK_SOFT), fontWeight: 500 }}> as far out, or farther</span>
          </Line>
        </div>

        {/* ── The two models, pooled ── */}
        <Heading at={poolAt} x={X0} y={y(300)}>
          Pool <Num>4,000</Num> answers, shuffle
        </Heading>
        <Line at={poolAt + 8} x={X0} y={y(344)} size={22} color={INK_SOFT}>
          As if the two models&apos; answers were independent
        </Line>
        <Hist
          counts={PERM_MODELS.unpairedNull.counts}
          edges={PERM_MODELS.unpairedNull.edges}
          x={ux}
          base={histBase}
          height={h(200)}
          grow={(i) => ease(frame, poolAt + 6 + i * 0.5, 10)}
        />
        <Baseline x0={X0} x1={L_X1} base={histBase} at={poolAt} ticks={pointTicks(ux)} title="Accuracy difference, points" />
        {gapLine(ux, sixTwoAt - 10, h(250))}
        <Line at={sixTwoAt - 8} x={ux(PERM_MODELS.gap) + 12} y={histBase - h(250)} size={22}>
          The gap
        </Line>
        <Line at={sixTwoAt} x={X0} y={y(790)} size={28} weight={600}>
          <MathRun>
            <I>p</I> = <Num>{PERM_MODELS.unpaired.toFixed(2)}</Num>
          </MathRun>
          <span style={{ ...note(28, INK_SOFT), fontWeight: 500, opacity: ease(frame, sixTwoAt + 10, 10) }}>: no evidence of a gap</span>
        </Line>

        <ColumnRule x={(L_X1 + R_X0) / 2} top={y(300)} height={y(860) - y(300)} at={sameAt} />

        {/* ── The two models, paired ── */}
        <Heading at={sameAt} x={R_X0} y={y(300)}>
          The same <Num>2,000</Num> examples
        </Heading>
        <Ink at={sameAt + 6} dur={16} style={{ left: R_X0, top: tY, width: R_X1 - R_X0 }}>
          <div style={{ position: "relative", height: tH * 3 }}>
            {["New right", "New wrong"].map((t, c) => (
              <div key={t} style={{ position: "absolute", left: tX - R_X0 + c * tW, width: tW, top: 0, height: tH, display: "flex", alignItems: "center", justifyContent: "center", ...label(22, INK_SOFT) }}>
                {t}
              </div>
            ))}
            {["Old right", "Old wrong"].map((t, r) => (
              <div key={t} style={{ position: "absolute", left: 0, top: tH * (r + 1), height: tH, display: "flex", alignItems: "center", ...label(22, INK_SOFT) }}>
                {t}
              </div>
            ))}
            <div style={{ position: "absolute", left: tX - R_X0, top: tH, width: tW * 2, height: 1, background: HAIRLINE }} />
            <div style={{ position: "absolute", left: tX - R_X0, top: tH * 2, width: tW * 2, height: 1, background: HAIRLINE }} />
            <div style={{ position: "absolute", left: tX - R_X0 + tW, top: tH * 0.2, width: 1, height: tH * 2.8, background: HAIRLINE }} />
            {cells.map((row, r) =>
              row.map((v, c) => {
                const off = r !== c;
                const at = off ? (r === 1 ? fourteenAt : eighteenAt) : sameAt + 10;
                return (
                  <div
                    key={`${r}${c}`}
                    style={{
                      position: "absolute",
                      left: tX - R_X0 + c * tW,
                      width: tW,
                      top: tH * (r + 1),
                      height: tH,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...note(26, INK),
                      fontWeight: off ? 600 : 500,
                      opacity: ease(frame, off ? eighteenAt - 4 : sameAt + 10, 10),
                    }}
                  >
                    {off ? (
                      <Mark at={at + 4}>
                        <Num>{v.toLocaleString("en-US")}</Num>
                      </Mark>
                    ) : (
                      <Num>{v.toLocaleString("en-US")}</Num>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </Ink>
        <Hist
          counts={PERM_MODELS.pairedNull.counts}
          edges={pairedEdges}
          x={px}
          base={histBase}
          height={h(130)}
          gap={0}
          grow={(i) => ease(frame, withinAt + 6 + i * 0.8, 10)}
          ink={(i) => (pairedTail(i) && ease(frame, ohThreeAt - 4, 8) > 0.5 ? POINT : DATA)}
        />
        <Baseline x0={R_X0} x1={R_X1} base={histBase} at={withinAt} ticks={pointTicks(px)} title="Accuracy difference, points" />
        {gapLine(px, ohThreeAt - 10, h(150))}
        <Line at={ohThreeAt - 8} x={px(PERM_MODELS.gap) + 12} y={histBase - h(150)} size={22}>
          The same gap
        </Line>
        <Line at={withinAt} x={R_X0} y={y(512)} size={22} color={INK_SOFT}>
          Shuffle within each pair: swap which model said which
        </Line>
        <Line at={ohThreeAt} x={R_X0} y={y(790)} size={28} color={OK_INK} weight={600}>
          <MathRun>
            <I>p</I> = <Num>{PERM_MODELS.paired.toFixed(2)}</Num>
          </MathRun>
          <span style={{ opacity: ease(frame, rejectsAt - 2, 10) }}>
            {" "}
            &lt;{" "}
            <MathRun>
              <I>α</I>
            </MathRun>
            : <Mark at={passesAt}>reject the null</Mark>
          </span>
        </Line>
        <Line at={sameGapAt} x={R_X0} y={y(844)} size={24} color={INK_SOFT}>
          Same gap, different test
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
