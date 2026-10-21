import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, STREAK, TABLE } from "./data";
import { Coin, DATA_INK, Headline, Held, lerp, Pulse, SOFT, STAT, STAT_INK, Svg, Sweep, VBracket } from "./parts";

/** Two bars, one per plan, equally wide because both plans have 500 users. */
const BARS = { x: [200, 600], w: 280, top: 384, base: 812 } as const;
const RIGHT = 1160;
/** Where the step between the two splits is measured, right of the free bar. */
const STEP_X = 980;

/**
 * Part 2, independence: each plan as a bar split at its churn rate. If plan
 * told you nothing, both would split at the overall 15%; they split at 6% and
 * 24%, so the two are dependent. Then independence as the licence to
 * multiply, on ten coin flips with the churn bars set back, since the rule
 * is about independent events and these two are not; and the turn to which
 * way round a conditional is read, on the same table: 24% of free users
 * churned, but 80% of churners were free.
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
  const knowingAt = n.word("flat", "knowing the plan");
  const nothingAt = n.word("flat", "told you nothing");
  const fifteenAt = n.word("flat", "Fifteen percent");
  const indepAt = n.word("indep", "independence");
  const givenAt = n.word("indep", "given the plan");
  const withoutAt = n.word("indep", "without it");
  const jumpsAt = n.word("step", "jumps");
  const sixAt = n.word("step", "six percent");
  const twentyFourAt = n.word("step", "twenty-four");
  const dependentAt = n.word("step", "dependent");
  const gapAt = n.word("step", "gap");
  const actAt = n.word("step", "act on");
  const multiplyAt = n.word("multiply", "multiply");
  const indepWordAt = n.word("multiply", "Independence");
  const tenAt = n.word("multiply", "Ten heads");
  const halfAt = n.word("multiply", "ten halves");
  const timesAt = n.word("multiply", "multiplied together");
  const oneInAt = n.word("multiply", "one in a thousand");
  const roundAt = n.word("test-in", "which way round");
  const testInFrom = n.beat("test-in").from;
  const conditionalAt = n.word("test-in", "conditional");
  const mattersAt = n.word("test-in", "matters");
  const revFreeAt = n.word("reverse", "Twenty-four percent");
  const revAllAt = n.word("reverse", "everyone who churned");
  const revEightyAt = n.word("reverse", "eighty percent");

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
  const indepTag = ease(frame, nothingAt - 2, 12) * (1 - ease(frame, jumpsAt - 4, 10));
  // The real splits' labels set back while the bars show the what-if, and
  // stay back until the bars have stepped all the way back to the real rates,
  // so no in-between rate reads as a number.
  const whatIf = ease(frame, knowingAt - 2, 10) * (1 - ease(frame, jumpsAt + 18, 10));
  // The multiplication rule is about independent events, which plan and churn
  // are not: the bars and the independence lines set back while it is on, and
  // come back for the reversed conditional, which is read off them.
  const multiDim = ease(frame, indepWordAt + 6, 14) * (1 - ease(frame, testInFrom - 4, 14));
  const multBack = ease(frame, testInFrom - 4, 14);
  // Every churned user, in both bars: the whole that P(free | churn) divides by.
  const churnedRing = ease(frame, revAllAt - 4, 12);
  const freeFlash = ease(frame, revEightyAt - 4, 8) * (1 - ease(frame, revEightyAt + 14, 14));
  const depTag = ease(frame, dependentAt - 4, 12);
  const splitY = (i: number) => top + H * rates[i];

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the splits levelling and stepping, the coins and
           the halves, the churned ringed, the 80% ── */}
      <Sfx name="el-pop" at={barAt - 6} level={-30} />
      <Sfx name="el-whoosh" at={sameAt - 6} level={-34} />
      <Sfx name="el-whoosh" at={jumpsAt - 4} level={-33} />
      <Sfx name="el-pencil" at={gapAt - 4} level={-34} />
      <Sfx name="el-sprinkle" at={halfAt - 2} level={-34} />
      <Sfx name="el-tap" at={oneInAt - 4} level={-28} />
      <Sfx name="el-pop" at={tenAt - 2} level={-31} />
      <Sfx name="el-pencil" at={revAllAt - 4} level={-34} />
      <Sfx name="el-tap" at={revEightyAt - 4} level={-28} />

      <Headline top={y(150)} first="Does the plan" second="change the chance?" firstAt={splitFrom - 6} secondAt={barAt + 2} out={jumpsAt - 8} />
      <Headline top={y(150)} first="Plan and churn" second="are dependent." firstAt={jumpsAt - 2} secondAt={dependentAt - 4} out={indepWordAt - 8} />
      <Headline top={y(150)} first="Independent flips" second="multiply." firstAt={indepWordAt - 2} secondAt={multiplyAt - 4} out={testInFrom - 6} />
      <Headline top={y(150)} first="Now read it" second="the other way round." firstAt={testInFrom - 2} secondAt={roundAt + 4} />
      <FigLabel n="3" title="Each plan's users, split where they churned" at={splitFrom} x={BARS.x[0]} y={y(268)} />

      {/* ── The bars ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - multiDim * 0.7 }}>
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
        {/* The overall rate, as a dashed level across both, stopping short of
            the free bar's label. */}
        <line
          x1={BARS.x[0] - 20}
          x2={lerp(BARS.x[0] - 20, BARS.x[1] + BARS.w + 8, overall)}
          y1={top + H * TABLE.pAll}
          y2={top + H * TABLE.pAll}
          stroke={INK}
          strokeWidth={2}
          strokeDasharray="7 6"
          opacity={overall}
        />
        {/* Paid's level, carried across to the step. It passes behind the
            free bar rather than through it, which keeps the "churned" label
            inside that bar clear. */}
        {(() => {
          const reach = lerp(BARS.x[0] + BARS.w, STEP_X, ease(frame, gapAt - 6, 14));
          const segs = [
            [BARS.x[0] + BARS.w, Math.min(reach, BARS.x[1])],
            [BARS.x[1] + BARS.w, reach],
          ] as const;
          return segs.map(([a, b], k) =>
            b > a ? (
              <line key={k} x1={a} x2={b} y1={splitY(0)} y2={splitY(0)} stroke={INK} strokeWidth={1.6} strokeDasharray="2 5" opacity={ease(frame, gapAt - 6, 8)} />
            ) : null,
          );
        })()}
        {/* For the reversed conditional: every churned user, in both bars. */}
        {churnedRing > 0
          ? BARS.x.map((x, i) => (
              <rect
                key={i}
                x={x - 6}
                y={top - 6}
                width={BARS.w + 12}
                height={splitY(i) - top + 12}
                rx={6}
                fill="none"
                stroke={INK}
                strokeWidth={2.4}
                strokeDasharray="8 6"
                opacity={churnedRing}
              />
            ))
          : null}
        {freeFlash > 0 ? <rect x={BARS.x[1]} y={top} width={BARS.w} height={splitY(1) - top} fill={HIGHLIGHT} opacity={freeFlash * 0.8} /> : null}
      </Svg>
      {BARS.x.map((x, i) => (
        <React.Fragment key={i}>
          <Ink at={barAt - 2 + i * 6} dur={12} style={{ left: x, top: base + 16, whiteSpace: "nowrap" }}>
            <span style={{ ...headline(40), color: INK }}>{i === 0 ? "Paid" : "Free"}</span>
            <span style={{ ...note(21, INK_SOFT), marginLeft: 12 }}>{num(TABLE.rowTotals[i])} users</span>
          </Ink>
          {/* The split's label rides above the split, outside its bar. */}
          <div
            style={{
              position: "absolute",
              left: i === 0 ? undefined : x + BARS.w + 16,
              right: i === 0 ? 1920 - x + 16 : undefined,
              top: top + (splitY(i) - top) * split - 38,
              opacity: ease(frame, splitAt + 6, 10) * (1 - whatIf * 0.6),
              ...note(28, STAT_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {pct(rates[i])}
          </div>
        </React.Fragment>
      ))}
      <div
        style={{
          position: "absolute",
          left: BARS.x[1] + 16,
          top: top + 12,
          opacity: ease(frame, splitAt + 8, 10),
          ...note(21, "var(--ds-white)"),
          fontWeight: 650,
          whiteSpace: "nowrap",
        }}
      >
        churned
      </div>
      <Note at={fifteenAt} x={(BARS.x[0] + BARS.w + BARS.x[1]) / 2} y={top + H * TABLE.pAll + 10} from="up">
        <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", textAlign: "center" }}>
          everyone
          <br />
          {pct(TABLE.pAll)}
        </span>
      </Note>
      <div style={{ position: "absolute", left: BARS.x[0], top: top - 52, opacity: indepTag, ...label(24, DATA_INK) }}>
        If independent: one level
      </div>
      <div style={{ position: "absolute", left: BARS.x[0], top: top - 52, opacity: depTag, ...label(24, STAT_INK) }}>
        Dependent: the split steps
      </div>
      <Pulse x={BARS.x[0] - 44} y={splitY(0) - 22} at={sixAt - 2} r={34} />
      <Pulse x={BARS.x[1] + BARS.w + 48} y={splitY(1) - 22} at={twentyFourAt - 2} r={34} />
      <VBracket x={STEP_X} y0={splitY(0)} y1={splitY(1)} at={gapAt - 4} color={INK} right />
      <Note at={gapAt} x={STEP_X + 24} y={(splitY(0) + splitY(1)) / 2 - 15}>
        <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          {Math.round((TABLE.pFree - TABLE.pPaid) * 100)} points
        </span>
      </Note>
      </div>

      {/* ── Independence, in symbols ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - multiDim * 0.7 }}>
      <Ink at={indepAt - 4} dur={14} style={{ left: RIGHT, top: y(344), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Independent means</span>
      </Ink>
      <Ink at={givenAt - 4} dur={16} style={{ left: RIGHT, top: y(386), whiteSpace: "nowrap" }}>
        <Sweep at={indepWordAt - 2} dur={16} out={testInFrom - 6}>
          <span style={{ ...note(42, INK), fontWeight: 600 }}>
            P(churn <span style={{ color: INK_SOFT }}>| plan</span>)
          </span>
          <span style={{ ...note(42, INK), fontWeight: 600, opacity: ease(frame, withoutAt - 4, 12) }}> = P(churn)</span>
        </Sweep>
      </Ink>
      <Note at={actAt} x={RIGHT} y={y(450)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Here it isn&apos;t: the gap is information.</span>
      </Note>
      </div>

      {/* ── The licence to multiply: ten independent flips, each a half ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - multBack * 0.6 }}>
      <Ink at={tenAt - 2} dur={12} style={{ left: RIGHT, top: y(518), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Ten heads in a row</span>
      </Ink>
      <div style={{ position: "absolute", left: RIGHT, top: y(556), display: "flex", alignItems: "flex-end", gap: 2, ...note(30, INK), whiteSpace: "nowrap" }}>
        {Array.from({ length: 10 }, (_, i) => {
          const at = lerp(halfAt - 2, timesAt + 6, i / 9);
          const p = ease(frame, at, 8);
          return (
            <React.Fragment key={i}>
              {i ? <span style={{ color: INK_SOFT, opacity: p, lineHeight: 1.2 }}>×</span> : null}
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ position: "relative", display: "block", width: 40, height: 40 }}>
                  <Coin x={20} y={20} r={20} heads at={tenAt - 2 + i * 2} />
                </span>
                <span style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)`, lineHeight: 1.2 }}>½</span>
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <Ink at={oneInAt - 4} dur={16} style={{ left: RIGHT, top: y(668), whiteSpace: "nowrap" }}>
        {/* 0.5 to the tenth is 0.000977, so "about". */}
        <span style={{ ...note(30, INK) }}>≈ {STREAK.ten.toFixed(4).replace(/0+$/, "")}, about </span>
        <span style={{ ...headline(52, true), color: STAT_INK }}>
          <Sweep at={oneInAt}>1 in 1,000</Sweep>
        </span>
      </Ink>
      </div>

      {/* ── The turn: which way round. The same 120 free churners, over two
           different wholes: the 500 free users, then the 150 who churned. ── */}
      <div style={{ position: "absolute", left: RIGHT, top: y(766), height: 1, width: 660 * ease(frame, roundAt - 6, 14), background: INK, opacity: 0.5 }} />
      <div
        style={{
          position: "absolute",
          left: RIGHT,
          top: y(784),
          display: "grid",
          gridTemplateColumns: "auto auto auto",
          columnGap: 18,
          rowGap: 14,
          alignItems: "baseline",
          whiteSpace: "nowrap",
          ...note(26, INK),
        }}
      >
        {(
          [
            ["churn", "free", conditionalAt - 2, revFreeAt - 4, revFreeAt + 6, TABLE.churned[1], TABLE.rowTotals[1], TABLE.pFree, INK],
            ["free", "churn", mattersAt - 2, revAllAt - 2, revEightyAt - 4, TABLE.churned[1], TABLE.churnedTotal, TABLE.pFreeGivenChurn, STAT_INK],
          ] as const
        ).map(([a, b, exprAt, fracAt, pAt, top, bottom, p, color]) => (
          <React.Fragment key={a}>
            <Held at={exprAt}>
              P({a} <span style={{ color: INK_SOFT }}>| {b}</span>)
            </Held>
            <Held at={fracAt}>
              = {num(top)} / {num(bottom)}
            </Held>
            <Held at={pAt}>
              = <b style={{ color }}>{pct(p)}</b>
            </Held>
          </React.Fragment>
        ))}
      </div>
      <Note at={revEightyAt + 18} x={RIGHT} y={y(876)}>
        <span style={{ ...body(28, true), color: INK, whiteSpace: "nowrap" }}>Same 120, a different whole.</span>
      </Note>
    </AbsoluteFill>
  );
};
