import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { halo, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { QUOTED } from "./data";
import { A, A_INK, Arrow, Bracket, Drift, FAINT, Headline, Kicker, lerp, Spot, Strike, Svg, track, TRAP, TRAP_INK, X0 } from "./parts";

const BX0 = 430;
const BX1 = 1330;
const ROWS = { mmlu: 452, gpqa: 586, hle: 720 };
const BAR_H = 30;

/**
 * Pitfall one, saturation (Fig. 5): the best scores the lessons quote, on one
 * 0 to 100 scale. MMLU's frontier sits in the three points under its
 * ceiling, GPQA Diamond's leaders around 95, and Humanity's Last Exam grows
 * from under 10 at launch to about 60 twenty months later. The three-point
 * tell then strikes the MMLU row.
 */
export const SaturationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("saturation").from;
  const topAt = n.word("saturation", "top");
  const everyoneAt = n.word("saturation", "everyone");
  const apartAt = n.word("saturation", "apart");
  const frontierAt = n.word("sat-now", "frontier");
  const ninetyTwoAt = n.word("sat-now", "ninety-two");
  const gpqaAt = n.word("sat-now", "GPQA Diamond");
  const replaceAt = n.word("sat-now", "replace");
  const ninetyFiveAt = n.word("sat-now", "ninety-five");
  const fastAt = n.word("sat-fast", "fast");
  const hleAt = n.word("sat-fast", "Humanity's Last Exam");
  const underAt = n.word("sat-fast", "under ten percent");
  const sixtyAt = n.word("sat-fast", "sixty");
  const monthsAt = n.word("sat-fast", "twenty months");
  const tellAt = n.word("sat-tell", "tell");
  const threeAt = n.word("sat-tell", "three points");
  const skipAt = n.word("sat-tell", "skip");
  const end = n.beat("contam").from;

  const X = track(BX0, BX1);
  const ry = (v: number) => y(v);
  const grow = (at: number, dur = 18) => ease(frame, at, dur);
  const hle = lerp(QUOTED.hleLaunch, QUOTED.hleNow, ease(frame, sixtyAt - 10, 26));
  const skip = ease(frame, skipAt + 4, 14);
  const skipGpqa = ease(frame, skipAt + 12, 14);

  const bar = (v: number, rowY: number, at: number) => (
    <rect x={BX0} y={ry(rowY) - BAR_H / 2} width={Math.max(0, X(v) - BX0) * grow(at)} height={BAR_H} rx={3} fill={A} />
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the gauge, each bar, the stretch, the strike ── */}
      <Sfx name="el-pop" at={topAt - 6} level={-30} />
      <Sfx name="el-tap" at={ninetyTwoAt - 2} level={-26} />
      <Sfx name="el-tap" at={ninetyFiveAt - 2} level={-27} />
      <Sfx name="el-tap" at={underAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={sixtyAt - 10} level={-33} />
      <Sfx name="el-scratch" at={skipAt - 2} level={-34} />
      <Sfx name="el-scratch" at={skipAt + 8} level={-36} />

      <Kicker at={from - 10}>Four pitfalls</Kicker>
      <Headline at={from - 6} second={topAt - 4} italic="Everyone near the top.">
        One, saturation.
      </Headline>
      <Spot id="llm-benchmarks-gauge" at={topAt - 6} left={1530} top={y(110)} width={240} height={322} />
      <FigLabel n="5" title="Where the top scores sit, 0 to 100" at={from + 4} x={X0} y={y(330)} />

      <Drift from={from} to={end} amount={0.012} origin="40% 60%">
        {/* The scale every row shares, and its grid. */}
        <Svg opacity={ease(frame, from + 6, 14)}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={X(v)} x2={X(v)} y1={ry(ROWS.mmlu) - 44} y2={ry(ROWS.hle) + 18} stroke={FAINT} strokeWidth={1.2} />
              <text x={X(v)} y={ry(ROWS.hle) + 86} textAnchor="middle" style={{ ...label(20, INK_SOFT), fontWeight: 500, ...TABULAR }}>
                {v}
              </text>
            </g>
          ))}
        </Svg>

        {/* Each row's empty track, 0 to 100, as "everyone scores" is said. */}
        <Svg>
          {[ROWS.mmlu, ROWS.gpqa, ROWS.hle].map((r, i) => (
            <rect
              key={r}
              x={BX0}
              y={ry(r) - BAR_H / 2}
              width={(BX1 - BX0) * ease(frame, everyoneAt - 4 + i * 5, 18)}
              height={BAR_H}
              rx={3}
              fill={FAINT}
              opacity={0.55}
            />
          ))}
        </Svg>

        {/* ── MMLU ── */}
        <Ink at={frontierAt - 8} dur={12} style={{ left: X0, top: ry(ROWS.mmlu) - 17, whiteSpace: "nowrap", opacity: 1 - skip * 0.45 }}>
          <span style={{ ...label(26, INK), fontWeight: 700 }}>
            <Strike at={skipAt}>MMLU</Strike>
          </span>
        </Ink>
        <Svg opacity={1 - skip * 0.45}>
          {/* Where every frontier model sits: from 92 up to the ceiling. */}
          <rect
            x={X(QUOTED.mmluFrontierAbove)}
            y={ry(ROWS.mmlu) - BAR_H / 2}
            width={(X(QUOTED.mmluCeiling) - X(QUOTED.mmluFrontierAbove)) * grow(ninetyTwoAt - 6, 14)}
            height={BAR_H}
            rx={3}
            fill={A}
          />
          {/* The ceiling near 95, from "near the top". */}
          <line
            x1={X(QUOTED.mmluCeiling)}
            x2={X(QUOTED.mmluCeiling)}
            y1={ry(ROWS.mmlu) - 30}
            y2={ry(ROWS.mmlu) + 30}
            stroke={TRAP}
            strokeWidth={2.6}
            strokeDasharray="6 5"
            opacity={ease(frame, topAt - 2, 12)}
          />
        </Svg>
        <Ink at={ninetyTwoAt} dur={12} style={{ left: X(100) + 22, top: ry(ROWS.mmlu) - 17, whiteSpace: "nowrap", opacity: 1 - skip * 0.45 }}>
          <span style={{ ...note(24, A_INK), fontWeight: 700 }}>
            every frontier model, {QUOTED.mmluFrontierAbove} to {QUOTED.mmluCeiling}
          </span>
        </Ink>
        <Ink at={apartAt - 2} dur={12} style={{ left: X(QUOTED.mmluCeiling) - 30, top: ry(ROWS.mmlu) + 34, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, TRAP_INK), fontWeight: 600 }}>ceiling</span>
        </Ink>
        {/* The tell: every frontier model inside the same three points. */}
        <Bracket x0={X(QUOTED.mmluFrontierAbove)} x1={X(QUOTED.mmluCeiling)} y={ry(ROWS.mmlu) - 30} at={threeAt - 4} up={false} color={TRAP} />
        <Ink at={threeAt - 2} dur={12} style={{ left: X(QUOTED.mmluCeiling) + 4, top: ry(ROWS.mmlu) - 72, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, TRAP_INK), fontWeight: 700, display: "inline-block", transform: "translateX(-100%)" }}>
            all within {QUOTED.withinPoints} points
          </span>
        </Ink>

        {/* ── GPQA Diamond ── */}
        <Ink at={gpqaAt - 4} dur={12} style={{ left: X0, top: ry(ROWS.gpqa) - 17, whiteSpace: "nowrap", opacity: 1 - skipGpqa * 0.45 }}>
          <span style={{ ...label(26, INK), fontWeight: 700 }}>
            <Strike at={skipAt + 8}>GPQA Diamond</Strike>
          </span>
        </Ink>
        <Svg opacity={1 - skipGpqa * 0.45}>
          {bar(QUOTED.gpqaLeaders, ROWS.gpqa, ninetyFiveAt - 8)}
        </Svg>
        <Ink at={ninetyFiveAt} dur={12} style={{ left: X(100) + 22, top: ry(ROWS.gpqa) - 17, whiteSpace: "nowrap", opacity: 1 - skipGpqa * 0.45 }}>
          <span style={{ ...note(24, A_INK), fontWeight: 700 }}>leaders around {QUOTED.gpqaLeaders}</span>
        </Ink>
        <Ink at={replaceAt - 2} dur={12} style={{ left: X0, top: ry(ROWS.gpqa) + 18, whiteSpace: "nowrap" }}>
          <span style={note(21, INK_SOFT)}>built to replace MMLU</span>
        </Ink>

        {/* ── Humanity's Last Exam: under 10, then about 60 ── */}
        <Ink at={Math.min(fastAt, hleAt - 4)} dur={12} style={{ left: X0, top: ry(ROWS.hle) - 17, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 700 }}>Humanity&apos;s Last Exam</span>
        </Ink>
        <Svg>
          <rect
            x={BX0}
            y={ry(ROWS.hle) - BAR_H / 2}
            width={(X(hle) - BX0) * grow(underAt - 6)}
            height={BAR_H}
            rx={3}
            fill={A}
          />
          {/* Where it started: under ten, a dashed end. */}
          <line
            x1={X(QUOTED.hleLaunch)}
            x2={X(QUOTED.hleLaunch)}
            y1={ry(ROWS.hle) - 26}
            y2={ry(ROWS.hle) + 16}
            stroke={INK}
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={ease(frame, underAt, 10)}
          />
        </Svg>
        <Ink at={underAt} dur={12} style={{ left: X(QUOTED.hleLaunch) + 8, top: ry(ROWS.hle) + 22, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK_SOFT), ...halo }}>
            launch, January 2025: every model under <span style={TABULAR}>{QUOTED.hleLaunch}</span>
          </span>
        </Ink>
        <Ink at={sixtyAt} dur={12} style={{ left: X(100) + 22, top: ry(ROWS.hle) - 17, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, A_INK), fontWeight: 700 }}>the best near {QUOTED.hleNow}</span>
        </Ink>
        <Arrow
          from={[X(QUOTED.hleLaunch) + 10, ry(ROWS.hle) - 42]}
          to={[X(QUOTED.hleNow) - 6, ry(ROWS.hle) - 42]}
          at={monthsAt - 6}
          dur={16}
          color={INK_SOFT}
          width={2}
        />
        <Ink at={monthsAt - 2} dur={12} style={{ left: (X(QUOTED.hleLaunch) + X(QUOTED.hleNow)) / 2, top: ry(ROWS.hle) - 80, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 600, display: "inline-block", transform: "translateX(-50%)" }}>20 months later</span>
        </Ink>
        <Ink at={tellAt - 2} dur={14} style={{ left: X0, top: ry(ROWS.hle) + 126, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK), fontWeight: 600 }}>
            The tell: every model within <span style={{ color: TRAP_INK }}>{QUOTED.withinPoints} points</span>? Skip the row.
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
