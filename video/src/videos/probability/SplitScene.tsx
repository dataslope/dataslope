import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, STREAK, TABLE } from "./data";
import { DATA_INK, Headline, lerp, SOFT, STAT, STAT_INK, Svg, Sweep, VBracket } from "./parts";

/** Two bars, one per plan, equally wide because both plans have 500 users. */
const BARS = { x: [230, 610], w: 300, top: 352, base: 800 } as const;
const RIGHT = 1080;

/**
 * Part 2, independence: each plan as a bar split at its churn rate. If plan
 * told you nothing, both would split at the overall 15%; they split at 6% and
 * 24%, so the two are dependent. Then independence as the licence to
 * multiply, and the turn to which way round a conditional is read.
 */
export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const splitFrom = n.beat("split").from;
  const barAt = n.word("split", "a bar");
  const splitAt = n.word("split", "split");
  const sameAt = n.word("flat", "same height");
  const fifteenAt = n.word("flat", "Fifteen percent");
  const indepAt = n.word("indep", "independence");
  const givenAt = n.word("indep", "given the plan");
  const withoutAt = n.word("indep", "without it");
  const jumpsAt = n.word("step", "jumps");
  const dependentAt = n.word("step", "dependent");
  const gapAt = n.word("step", "gap");
  const actAt = n.word("step", "act on");
  const multiplyAt = n.word("multiply", "multiply");
  const tenAt = n.word("multiply", "Ten fair heads");
  const halfAt = n.word("multiply", "a half");
  const timesAt = n.word("multiply", "ten times");
  const oneInAt = n.word("multiply", "one in a thousand");
  const roundAt = n.word("test-in", "which way round");
  const conditionalAt = n.word("test-in", "conditional");
  const mattersAt = n.word("test-in", "matters");

  const top = y(BARS.top);
  const base = y(BARS.base);
  const H = base - top;
  // Each bar's split: the real rate, then the overall rate (as if
  // independent), then the real rate again.
  const toFlat = ease(frame, sameAt - 6, 22);
  const back = ease(frame, jumpsAt - 4, 22);
  const rates = [TABLE.pPaid, TABLE.pFree].map((p) => lerp(lerp(p, TABLE.pAll, toFlat), p, back));
  const grow = (i: number) => ease(frame, barAt - 6 + i * 6, 18);
  const split = ease(frame, splitAt - 2, 16);
  const overall = ease(frame, fifteenAt - 6, 16);
  const indepTag = ease(frame, sameAt + 6, 12) * (1 - ease(frame, jumpsAt - 4, 10));
  const depTag = ease(frame, dependentAt - 4, 12);
  const splitY = (i: number) => top + H * rates[i];

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the splits levelling and stepping, the halves ── */}
      <Sfx name="el-pop" at={barAt - 6} level={-30} />
      <Sfx name="el-whoosh" at={sameAt - 6} level={-34} />
      <Sfx name="el-whoosh" at={jumpsAt - 4} level={-33} />
      <Sfx name="el-pencil" at={gapAt - 4} level={-34} />
      <Sfx name="el-sprinkle" at={halfAt - 2} level={-34} />
      <Sfx name="el-tap" at={oneInAt - 4} level={-28} />

      <Headline top={y(150)} first="Does the plan" second="change the chance?" firstAt={splitFrom - 6} secondAt={barAt + 2} out={jumpsAt - 8} />
      <Headline top={y(150)} first="Plan and churn" second="are dependent." firstAt={jumpsAt - 2} secondAt={dependentAt - 4} />
      <FigLabel n="3" title="Each plan's users, split where they churned" at={splitFrom} x={BARS.x[0]} y={y(268)} />

      {/* ── The bars ── */}
      <Svg>
        {BARS.x.map((x, i) => {
          const g = grow(i);
          if (g <= 0) return null;
          const sy = splitY(i);
          return (
            <g key={i}>
              <rect x={x} y={base - H * g} width={BARS.w} height={H * g} fill={SOFT} />
              {split > 0 ? (
                <>
                  <rect x={x} y={top} width={BARS.w} height={(sy - top) * split} fill={STAT} opacity={0.72} />
                  <line x1={x - 8} x2={x + BARS.w + 8} y1={top + (sy - top) * split} y2={top + (sy - top) * split} stroke={STAT} strokeWidth={3} />
                </>
              ) : null}
            </g>
          );
        })}
        {/* The overall rate, as a dashed level across both. */}
        <line
          x1={BARS.x[0] - 20}
          x2={lerp(BARS.x[0] - 20, BARS.x[1] + BARS.w + 20, overall)}
          y1={top + H * TABLE.pAll}
          y2={top + H * TABLE.pAll}
          stroke={INK}
          strokeWidth={2}
          strokeDasharray="7 6"
          opacity={overall}
        />
      </Svg>
      {BARS.x.map((x, i) => (
        <React.Fragment key={i}>
          <Ink at={barAt - 2 + i * 6} dur={12} style={{ left: x, top: base + 16, whiteSpace: "nowrap" }}>
            <span style={{ ...headline(40), color: INK }}>{i === 0 ? "Paid" : "Free"}</span>
            <span style={{ ...note(21, INK_SOFT), marginLeft: 12 }}>{num(TABLE.rowTotals[i])} users</span>
          </Ink>
          {/* The split's label rides on the split. */}
          <div
            style={{
              position: "absolute",
              left: x + BARS.w + 22,
              top: top + (splitY(i) - top) * split - 20,
              opacity: ease(frame, splitAt + 6, 10),
              ...note(28, STAT_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {pct(rates[i])}
          </div>
          <div
            style={{
              position: "absolute",
              left: x + 18,
              top: top + 14,
              opacity: ease(frame, splitAt + 8, 10),
              ...note(21, "var(--ds-white)"),
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            {i === 1 ? "churned" : ""}
          </div>
        </React.Fragment>
      ))}
      <Note at={fifteenAt} x={BARS.x[0] - 20} y={top + H * TABLE.pAll + 10} from="up">
        <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap" }}>everyone: {pct(TABLE.pAll)}</span>
      </Note>
      <div style={{ position: "absolute", left: BARS.x[0], top: y(BARS.top) - 52, opacity: indepTag, ...label(24, DATA_INK) }}>
        If independent: one level
      </div>
      <div style={{ position: "absolute", left: BARS.x[0], top: y(BARS.top) - 52, opacity: depTag, ...label(24, STAT_INK) }}>
        Dependent: the split steps
      </div>
      <VBracket x={BARS.x[1] - 24} y0={splitY(0)} y1={splitY(1)} at={gapAt - 4} color={INK} />
      <Note at={gapAt} x={BARS.x[1] - 48} y={(splitY(0) + splitY(1)) / 2 - 15} align="right">
        <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          {Math.round((TABLE.pFree - TABLE.pPaid) * 100)} points
        </span>
      </Note>

      {/* ── Independence, in symbols ── */}
      <Ink at={indepAt - 4} dur={14} style={{ left: RIGHT, top: y(344), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Independent means</span>
      </Ink>
      <Ink at={givenAt - 4} dur={16} style={{ left: RIGHT, top: y(386), whiteSpace: "nowrap" }}>
        <span style={{ ...note(36, INK), fontWeight: 600 }}>
          P(churn <span style={{ color: INK_SOFT }}>| plan</span>)
        </span>
        <span style={{ ...note(36, INK), fontWeight: 600, opacity: ease(frame, withoutAt - 4, 12) }}> = P(churn)</span>
      </Ink>
      <Note at={actAt} x={RIGHT} y={y(450)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Here it isn&apos;t: the gap is information.</span>
      </Note>

      {/* ── The licence to multiply ── */}
      <Ink at={multiplyAt - 4} dur={14} style={{ left: RIGHT, top: y(540), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Independent, so multiply</span>
      </Ink>
      <Ink at={tenAt - 2} dur={12} style={{ left: RIGHT, top: y(580), whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK) }}>Ten heads in a row</span>
      </Ink>
      <div style={{ position: "absolute", left: RIGHT, top: y(626), display: "flex", gap: 10, ...note(34, INK), whiteSpace: "nowrap" }}>
        {Array.from({ length: 10 }, (_, i) => {
          const at = lerp(halfAt - 2, timesAt + 6, i / 9);
          const p = ease(frame, at, 8);
          return (
            <span key={i} style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)`, display: "inline-block" }}>
              ½{i < 9 ? <span style={{ color: INK_SOFT, marginLeft: 10 }}>×</span> : null}
            </span>
          );
        })}
      </div>
      <Ink at={oneInAt - 4} dur={16} style={{ left: RIGHT, top: y(686), whiteSpace: "nowrap" }}>
        <span style={{ ...note(30, INK) }}>= {STREAK.ten.toFixed(4).replace(/0+$/, "")}, about </span>
        <span style={{ ...headline(52, true), color: STAT_INK }}>
          <Sweep at={oneInAt}>1 in 1,000</Sweep>
        </span>
      </Ink>

      {/* ── The turn: which way round ── */}
      <div style={{ position: "absolute", left: RIGHT, top: y(808), height: 1, width: 700 * ease(frame, roundAt - 6, 14), background: INK, opacity: 0.5 }} />
      <Ink at={roundAt - 2} dur={14} style={{ left: RIGHT, top: y(830), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, INK) }}>
          P(churn <span style={{ color: INK_SOFT }}>| free</span>) = <b>{pct(TABLE.pFree)}</b>
        </span>
      </Ink>
      <Ink at={conditionalAt - 2} dur={14} style={{ left: RIGHT + 360, top: y(830), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, INK) }}>
          P(free <span style={{ color: INK_SOFT }}>| churn</span>) = <b style={{ color: STAT_INK }}>{pct(TABLE.pFreeGivenChurn)}</b>
        </span>
      </Ink>
      <Note at={mattersAt} x={RIGHT} y={y(830) + 52}>
        <span style={{ ...body(28, true), color: INK, whiteSpace: "nowrap" }}>Same table, the other way round.</span>
      </Note>
    </AbsoluteFill>
  );
};
