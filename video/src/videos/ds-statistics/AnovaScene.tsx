import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, fmt } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ANOVA } from "./data";
import { Axes, Curve, Drift, Mark, noteText, OK_INK, Svg, WARM, WARM_INK, X0 } from "./parts";

const GROUP_X = [300, 560, 820];
const LO = 4.6;
const HI = 6.7;
const BASE = 820;
const TOP = 400;
const SIDE_X = 1080;
/** The five identical groups and their ten pairs, drawn as a pentagon. */
const PENT = { cx: 1700, cy: 760, r: 100 };

/**
 * Question 14 on the page's three groups: each group's four values and its
 * mean, the grand mean across all twelve, the gaps between the group means
 * and the grand mean (between) against the spread inside each group
 * (within), F = 37.9. Then the course's pairwise block: ten t-tests on five
 * identical groups, which flag something about a third of the time.
 */
export const AnovaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("anova").from;
  const qAt = n.word("anova", "Question");
  const textAt = n.word("anova", "What is ANOVA");
  const testAt = n.word("anova", "To test whether three or more");
  const betweenAt = n.word("anova", "the spread between the groups");
  const withinAt = n.word("anova", "the spread within them");
  const fAt = n.word("anova", "as an F statistic");
  const valueAt = n.word("anova", "thirty-seven point nine");
  const someAt = n.word("anova", "A big F says some mean differs");
  const whichAt = n.word("anova", "not which");
  const tukeyAt = n.word("anova", "A post-hoc test");
  const pairsAt = n.word("anova-pairs", "it beats testing every pair");
  const tenAt = n.word("anova-pairs", "Ten t-tests");
  const thirdAt = n.word("anova-pairs", "about a third of the time");
  const end = n.beat("anova-pairs").to;

  const base = y(BASE);
  const vy = (v: number) => base - ((v - LO) / (HI - LO)) * (base - y(TOP));
  const grand = ANOVA.grand;
  const pent = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [PENT.cx + PENT.r * Math.cos(a), y(PENT.cy) + PENT.r * Math.sin(a)] as const;
  });
  const pairs: [number, number][] = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push([i, j]);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={testAt + 4} level={-34} />
      <Sfx name="el-pencil" at={betweenAt + 2} level={-34} />
      <Sfx name="el-pencil" at={withinAt + 2} level={-34} />
      <Sfx name="el-pop" at={valueAt} level={-30} />
      <Sfx name="el-sprinkle" at={tenAt + 2} level={-36} />
      <Sfx name="el-tap" at={thirdAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={14} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is ANOVA (analysis of variance), and when do you use it?
        </QuestionCard>

        <Note at={testAt} x={X0} y={y(300)}>
          <span style={{ ...noteText(26, INK) }}>are three or more group means equal?</span>
        </Note>
        <Axes
          x={{ lo: 0, hi: 1, a: GROUP_X[0] - 130, b: GROUP_X[2] + 130 }}
          y={{ lo: LO, hi: HI, a: base, b: y(TOP) }}
          xTicks={[]}
          yTicks={[5, 5.5, 6, 6.5]}
          yFormat={(v) => fmt(v, 1)}
          at={testAt}
          size={19}
        />
        <Curve points={[[GROUP_X[0] - 120, vy(grand)], [GROUP_X[2] + 120, vy(grand)]]} at={betweenAt - 2} dur={16} color={INK} width={2} dash="7 6" />
        <Svg>
          {ANOVA.groups.map((g, k) => {
            const gx = GROUP_X[k];
            const mean = ANOVA.means[k];
            const pIn = ease(frame, testAt + 6 + k * 4, 10);
            const pB = ease(frame, betweenAt + 4 + k * 4, 12);
            const pW = ease(frame, withinAt + 4 + k * 4, 12);
            const lo = Math.min(...g);
            const hi = Math.max(...g);
            return (
              <g key={k}>
                {g.map((v, i) => (
                  <circle key={i} cx={gx - 36 + i * 24} cy={vy(v)} r={9 * pIn} fill={BAR} opacity={0.85} />
                ))}
                <line x1={gx - 60} x2={gx + 60} y1={vy(mean)} y2={vy(mean)} stroke={BLUE_INK} strokeWidth={3.4} opacity={pIn} />
                {pB > 0 ? (
                  <line x1={gx + 76} x2={gx + 76} y1={vy(grand)} y2={vy(grand) + (vy(mean) - vy(grand)) * pB} stroke={WARM} strokeWidth={5} strokeLinecap="round" />
                ) : null}
                {pW > 0 ? (
                  <path
                    d={`M${gx - 66},${vy(hi)} L${gx - 76},${vy(hi)} L${gx - 76},${vy(hi) + (vy(lo) - vy(hi)) * pW} L${gx - 66},${vy(hi) + (vy(lo) - vy(hi)) * pW}`}
                    fill="none"
                    stroke={INK_SOFT}
                    strokeWidth={2.4}
                  />
                ) : null}
              </g>
            );
          })}
        </Svg>
        <Note at={betweenAt + 6} x={SIDE_X} y={y(420)}>
          <span style={{ ...noteText(26, WARM_INK) }}>
            spread <b>between</b> the groups
          </span>
        </Note>
        <Note at={withinAt + 6} x={SIDE_X} y={y(470)}>
          <span style={{ ...noteText(26, INK_SOFT) }}>
            against the spread <b style={{ color: INK }}>within</b> them
          </span>
        </Note>
        <Note at={fAt} x={SIDE_X} y={y(536)}>
          <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: INK, whiteSpace: "nowrap", ...TABULAR }}>
            F = between / within{" "}
            <span style={{ opacity: ease(frame, valueAt - 2, 10) }}>
              = <Mark at={valueAt + 2}>{fmt(ANOVA.f, 1)}</Mark>
            </span>
          </div>
        </Note>
        <Note at={someAt} x={SIDE_X} y={y(596)}>
          <span style={{ ...noteText(24, INK) }}>
            a big F: some mean differs,{" "}
            <span style={{ color: ACCENT_INK, opacity: ease(frame, whichAt - 2, 10) }}>not which</span>
          </span>
        </Note>
        <Note at={tukeyAt} x={SIDE_X} y={y(640)} dim={pairsAt}>
          <span style={{ ...noteText(24, OK_INK) }}>a post-hoc test, like Tukey&apos;s, finds the pairs</span>
        </Note>

        {/* ── Testing every pair instead ── */}
        <Svg>
          {pairs.map(([a, b], i) => {
            const p = ease(frame, tenAt + 2 + i * 2, 8);
            if (p <= 0) return null;
            const [x0, y0] = pent[a];
            const [x1, y1] = pent[b];
            const fire = i === 6 ? ease(frame, thirdAt + 2, 10) : 0;
            return (
              <line
                key={i}
                x1={x0}
                y1={y0}
                x2={x0 + (x1 - x0) * p}
                y2={y0 + (y1 - y0) * p}
                stroke={fire > 0 ? ACCENT : INK_SOFT}
                strokeWidth={2 + 2 * fire}
              />
            );
          })}
          {pent.map(([px, py], i) => {
            const p = ease(frame, pairsAt + 4 + i * 2, 10);
            return p > 0 ? <circle key={i} cx={px} cy={py} r={20 * p} fill={PAPER} stroke={BAR} strokeWidth={3} /> : null;
          })}
        </Svg>
        <Note at={tenAt} x={SIDE_X} y={y(712)}>
          <div style={{ ...noteText(24, INK), lineHeight: 1.4 }}>
            10 t-tests,
            <br />5 identical groups
          </div>
        </Note>
        <Note at={thirdAt} x={SIDE_X} y={y(800)}>
          <span style={{ ...noteText(24, ACCENT_INK) }}>
            flag something <Mark at={thirdAt + 4}>about a third of the time</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
