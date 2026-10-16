import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, TEST } from "./data";
import { Big, DATA, DATA_INK, Headline, lerp, SOFT, STAT, STAT_INK, Strike, Svg, Sweep } from "./parts";

/** The two-bar comparison: the share of positives who are sick, once and
 *  twice tested. Both bars are the whole of their positives. */
const SHARE = { x0: 160, w: 1600, h: 64, y: [420, 640] } as const;

/**
 * Part 3, the reasoning: the two conditionals the gut confuses, Bayes' rule
 * and its base rate, why the false alarms win (base-rate neglect), and the
 * second, independent test that turns 9% into 91%.
 */
export const BayesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const inverseFrom = n.beat("inverse").from;
  const backwardsAt = n.word("inverse", "backwards");
  const sickPeopleAt = n.word("inverse", "sick people");
  const notAt = n.word("inverse", "NOT");
  const positivesAt = n.word("inverse", "of positives");
  const areSickEnd = n.word("inverse", "are sick", { edge: "end" });
  const bayesAt = n.word("bayes", "Bayes' rule");
  const oneAt = n.word("bayes", "one");
  const otherAt = n.word("bayes", "the other");
  const baseAt = n.word("bayes", "base rate");
  const beforeAt = n.word("bayes", "before anyone");
  const outnumberAt = n.word("neglect", "outnumber");
  const thousandAt = n.word("neglect", "a thousand to one");
  const swampAt = n.word("neglect", "swamp");
  const neglectAt = n.word("neglect", "base-rate neglect");
  const retestFrom = n.beat("retest").from;
  const secondAt = n.word("retest", "second");
  const ninetyEightAt = n.word("retest", "Ninety-eight");
  const tenAt = n.word("retest", "about ten");
  const nineInTenAt = n.word("ninety", "nine positives in ten");
  const ninetyOneAt = n.word("ninety", "Ninety-one percent");
  const trustAt = n.word("rule", "trust");
  const rareAt = n.word("rule", "how rare");
  const fooledAt = n.word("doors-in", "fooled");

  const phaseOut = ease(frame, retestFrom - 8, 14);
  const closing = ease(frame, fooledAt - 4, 18) * 0.4;

  // The neglect bars: who takes the test.
  const BAR = { x0: 420, w: 1300, h: 40, y: [742, 800] } as const;
  const healthyW = BAR.w;
  const sickW = Math.max(4, (BAR.w * TEST.sick) / TEST.healthy);

  // The share bars.
  const first = ease(frame, retestFrom - 2, 20);
  const secondBar = ease(frame, ninetyEightAt - 6, 20);
  const realShare2 = TEST.retestTp / (TEST.retestTp + TEST.retestFp);
  // The second bar starts at the first one's split and moves to its own.
  const split2 = lerp(TEST.treePpv, realShare2, ease(frame, tenAt - 4, 26));

  return (
    <AbsoluteFill style={{ opacity: 1 - closing }}>
      {/* ── Sound: the swapped conditional, the base rate, the bars, the flip ── */}
      <Sfx name="el-scratch" at={areSickEnd} level={-30} />
      <Sfx name="el-pencil" at={baseAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={outnumberAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={retestFrom - 2} level={-34} />
      <Sfx name="el-whoosh" at={tenAt - 4} level={-33} />
      <Sfx name="el-tap" at={ninetyOneAt - 4} level={-28} />
      <Sfx name="el-pencil" at={rareAt - 2} level={-34} />

      <Headline top={y(150)} first="The gut reads it" second="backwards." firstAt={inverseFrom - 6} secondAt={backwardsAt - 4} out={retestFrom - 8} />
      <Headline top={y(150)} first="Test the positives again," second="and it flips." firstAt={retestFrom - 2} secondAt={nineInTenAt - 4} />

      <div style={{ opacity: 1 - phaseOut }}>
        {/* ── Two conditionals ── */}
        <Ink at={sickPeopleAt - 6} dur={16} style={{ left: 160, top: y(300), whiteSpace: "nowrap" }}>
          <div style={label(23, INK_SOFT)}>Among the sick</div>
          <div style={{ ...note(32, INK), marginTop: 10 }}>
            P(positive <span style={{ color: INK_SOFT }}>| sick</span>)
          </div>
          <Big size={92} color={DATA_INK}>
            {pct(TEST.sensitivity)}
          </Big>
        </Ink>
        <Ink at={notAt - 4} dur={12} style={{ left: 640, top: y(392), whiteSpace: "nowrap" }}>
          <span style={{ ...body(40, true), color: INK }}>is not</span>
        </Ink>
        <Ink at={positivesAt - 6} dur={16} style={{ left: 860, top: y(300), whiteSpace: "nowrap" }}>
          <div style={label(23, INK_SOFT)}>Among the positives</div>
          <div style={{ ...note(32, INK), marginTop: 10 }}>
            P(sick <span style={{ color: INK_SOFT }}>| positive</span>)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
            <Big size={92} color={INK_SOFT}>
              <Strike at={areSickEnd - 2} top="0.5em">
                {pct(TEST.sensitivity)}
              </Strike>
            </Big>
            <span style={{ opacity: ease(frame, areSickEnd + 4, 12) }}>
              <Big size={92} color={STAT_INK} italic>
                {pct(TEST.treePpv)}
              </Big>
            </span>
          </div>
        </Ink>

        {/* ── Bayes' rule, and the base rate ── */}
        <Ink at={bayesAt - 4} dur={18} style={{ left: 160, top: y(560), whiteSpace: "nowrap" }}>
          <span style={{ ...note(34, INK) }}>
            <Sweep at={oneAt - 2}>P(sick | +)</Sweep> ={" "}
            <Sweep at={otherAt - 2}>P(+ | sick)</Sweep> ×{" "}
            <Sweep at={baseAt - 2} color={`color-mix(in srgb, ${DATA} 35%, transparent)`}>
              P(sick)
            </Sweep>{" "}
            ÷ P(+)
          </span>
        </Ink>
        <Note at={baseAt + 2} x={1100} y={y(556)}>
          <span style={{ ...note(24, DATA_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the base rate: 1 in {num(TEST.oneIn)}</span>
        </Note>
        <Note at={beforeAt} x={160} y={y(624)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            = {TEST.sensitivity} × {TEST.baseRate} ÷ {fmt(TEST.pPos, 5)} = <b style={{ color: STAT_INK }}>{fmt(TEST.ppv, 3)}</b>
          </span>
        </Note>

        {/* ── Who takes the test ── */}
        <FigLabel n="5" title={`Who takes the test, of ${num(TEST.population)}`} at={outnumberAt - 6} x={160} y={y(690)} />
        {(
          [
            ["Don't have it", TEST.healthy, healthyW, SOFT, INK_SOFT],
            ["Have it", TEST.sick, sickW, DATA, DATA_INK],
          ] as const
        ).map(([name, count, w, color, ink], i) => {
          const g = ease(frame, outnumberAt - 2 + i * 6, 22);
          const top = y(BAR.y[i]);
          return (
            <React.Fragment key={name}>
              <Ink at={outnumberAt + i * 4} dur={12} style={{ left: 160, top: top + h(BAR.h) / 2 - 15 }}>
                <span style={note(22, INK)}>{name}</span>
              </Ink>
              <div style={{ position: "absolute", left: BAR.x0, top, width: w * g, height: h(BAR.h), background: color }} />
              <Note at={outnumberAt + 10 + i * 6} x={BAR.x0 + w * g + 14} y={top + h(BAR.h) / 2 - 15}>
                <span style={{ ...label(24, ink), whiteSpace: "nowrap" }}>{num(count)}</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={thousandAt} x={BAR.x0 + 140} y={y(BAR.y[1]) + h(BAR.h) / 2 - 15}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>{num(TEST.healthy / TEST.sick)}</b> to 1
          </span>
        </Note>
        <Ink at={swampAt - 4} dur={14} style={{ left: 1100, top: y(624), whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK) }}>
            1% of {num(TEST.healthy)} is <b style={{ color: STAT_INK }}>{num(TEST.fp)}</b>, against <b style={{ color: DATA_INK }}>{TEST.tp}</b> real cases
          </span>
        </Ink>
        <Ink at={neglectAt - 4} dur={16} style={{ left: 1100, top: y(470), whiteSpace: "nowrap" }}>
          <span style={{ ...body(36), color: INK }}>
            <span style={{ background: `linear-gradient(transparent 55%, ${HIGHLIGHT} 55%, ${HIGHLIGHT} 92%, transparent 92%)` }}>
              Base-rate neglect
            </span>
          </span>
        </Ink>
      </div>

      {/* ── Retesting the positives ── */}
      {SHARE.y.map((rowY, i) => {
        const g = i === 0 ? first : secondBar;
        if (g <= 0) return null;
        const s = i === 0 ? TEST.treePpv : split2;
        const top = y(rowY);
        const blueW = SHARE.w * s * g;
        const redW = SHARE.w * (1 - s) * g;
        return (
          <React.Fragment key={i}>
            <Ink at={(i === 0 ? retestFrom : secondAt) - 4} dur={14} style={{ left: SHARE.x0, top: top - 52, whiteSpace: "nowrap" }}>
              <span style={label(24, INK)}>{i === 0 ? "Positive once" : "Positive on a second, independent test too"}</span>
            </Ink>
            <Svg>
              <rect x={SHARE.x0} y={top} width={blueW} height={h(SHARE.h)} fill={DATA} />
              <rect x={SHARE.x0 + blueW} y={top} width={redW} height={h(SHARE.h)} fill={STAT} opacity={0.8} />
            </Svg>
            <div
              style={{
                position: "absolute",
                left: SHARE.x0,
                top: top + h(SHARE.h) + 12,
                width: SHARE.w,
                display: "flex",
                justifyContent: "space-between",
                opacity: ease(frame, (i === 0 ? retestFrom + 10 : tenAt + 4), 12),
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ ...note(24, DATA_INK), fontWeight: 700 }}>
                {i === 0 ? num(TEST.tp) : num(TEST.retestTp)} sick
              </span>
              <span style={{ ...note(24, STAT_INK), fontWeight: 700 }}>
                {i === 0 ? num(TEST.fp) : num(TEST.retestFp)} false alarms
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: SHARE.x0 + 18,
                top: top + h(SHARE.h) / 2 - 22,
                opacity: ease(frame, i === 0 ? retestFrom + 16 : nineInTenAt, 12),
                ...note(30, "var(--ds-white)"),
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {i === 0 ? "" : `${pct(realShare2)} real`}
            </div>
          </React.Fragment>
        );
      })}
      <Note at={retestFrom + 16} x={SHARE.x0 + SHARE.w * TEST.treePpv + 18} y={y(SHARE.y[0]) + h(SHARE.h) / 2 - 18}>
        <span style={{ ...note(28, "var(--ds-white)"), fontWeight: 700, whiteSpace: "nowrap" }}>{pct(TEST.treePpv)} real</span>
      </Note>
      <Ink at={ninetyOneAt - 4} dur={16} style={{ left: SHARE.x0, top: y(770), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 22 }}>
        <Big size={96} color={DATA_INK} italic>
          {pct(TEST.treePpv)} to {pct(TEST.ppv2)}
        </Big>
      </Ink>
      <Ink at={trustAt - 4} dur={18} style={{ left: 900, top: y(800), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK }}>
          Before you trust a positive, ask <Sweep at={rareAt}>how rare</Sweep> the thing is.
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
