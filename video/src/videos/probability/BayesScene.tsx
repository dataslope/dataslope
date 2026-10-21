import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, TEST } from "./data";
import { Arrow, Big, DATA, DATA_INK, Headline, Held, lerp, SOFT, STAT, STAT_INK, Strike, Svg, Sweep } from "./parts";

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
  const healthyAt = n.word("neglect", "Healthy");
  const falseAt = n.word("neglect", "false alarms");
  const realAt = n.word("neglect", "real cases");
  const testedAt = n.word("bayes", "tested");
  const stayAt = n.word("retest", "stay positive");
  const thousandAt = n.word("neglect", "a thousand to one");
  const swampAt = n.word("neglect", "ten to one");
  const neglectAt = n.word("neglect", "base-rate neglect");
  const retestFrom = n.beat("retest").from;
  const secondAt = n.word("retest", "second");
  const ninetyEightAt = n.word("retest", "Ninety-eight");
  const tenAt = n.word("retest", "about ten");
  const nineInTenAt = n.word("ninety", "nine positives in ten");
  const ninetyOneAt = n.word("ninety", "Ninety-one percent");
  const trustAt = n.word("rule", "trust");
  const ruleFrom = n.beat("rule").from;
  const rareAt = n.word("rule", "how rare");
  const fooledAt = n.word("doors-in", "fooled");
  const doorsInFrom = n.beat("doors-in").from;

  const phaseOut = ease(frame, retestFrom - 8, 14);
  const closing = ease(frame, doorsInFrom - 4, 18) * 0.45;

  // The neglect bars: who takes the test.
  const BAR = { x0: 420, w: 1300, h: 40, y: [764, 820] } as const;
  const healthyW = BAR.w;
  const sickW = Math.max(4, (BAR.w * TEST.sick) / TEST.healthy);

  // The share bars.
  const first = ease(frame, retestFrom - 2, 20);
  // The positives go to a second test: a copy of the first bar slides down.
  const secondBar = ease(frame, secondAt - 4, 1);
  const slide = ease(frame, secondAt - 4, 22);
  const barsBack = ease(frame, ruleFrom - 2, 14) * 0.5;
  const realShare2 = TEST.retestTp / (TEST.retestTp + TEST.retestFp);
  // The second test, drawn first at the first bar's scale (one unit a
  // person): the real cases stay, the false alarms shrink from 999 to about
  // ten, and then the survivors are stretched to the whole bar.
  const shrink = ease(frame, tenAt - 4, 24);
  const renorm = ease(frame, nineInTenAt - 6, 22);
  const unit = SHARE.w / TEST.positives;
  const scale2 = lerp(unit, SHARE.w / (TEST.retestTp + TEST.retestFp), renorm);
  const red2 = lerp(TEST.fp, TEST.retestFp, shrink);
  const stayFlash = ease(frame, stayAt - 2, 6) * (1 - ease(frame, stayAt + 10, 12));

  return (
    <AbsoluteFill>
      <Headline top={y(150)} first="Conditioning fools" second="experts, too." firstAt={doorsInFrom - 2} secondAt={fooledAt + 2} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - closing }}>
      {/* ── Sound: the swapped conditional, the base rate, the bars, the flip ── */}
      <Sfx name="el-scratch" at={areSickEnd} level={-30} />
      <Sfx name="el-pencil" at={baseAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={retestFrom - 2} level={-34} />
      <Sfx name="el-whoosh" at={tenAt - 4} level={-33} />
      <Sfx name="el-tap" at={ninetyOneAt - 4} level={-28} />
      <Sfx name="el-pencil" at={rareAt - 2} level={-34} />

      <Headline top={y(150)} first="The gut reads it" second="backwards." firstAt={inverseFrom - 6} secondAt={backwardsAt - 4} out={retestFrom - 8} />
      <Headline top={y(150)} first="Test the positives again," second="and it flips." firstAt={retestFrom - 2} secondAt={nineInTenAt - 4} out={doorsInFrom - 6} />

      <div style={{ opacity: 1 - phaseOut }}>
        {/* ── Two conditionals: both are on the page as "backwards" is said,
             and each number arrives with its own words. ── */}
        <Ink at={inverseFrom + 4} dur={16} style={{ left: 160, top: y(300), whiteSpace: "nowrap" }}>
          <div style={label(23, INK_SOFT)}>Among the sick</div>
          <div style={{ ...note(32, INK), marginTop: 10 }}>
            P(positive <span style={{ color: INK_SOFT }}>| sick</span>)
          </div>
          <div>
            <Held at={sickPeopleAt - 6}>
              <Big size={92} color={DATA_INK}>
                {pct(TEST.sensitivity)}
              </Big>
            </Held>
          </div>
        </Ink>
        <Ink at={notAt - 4} dur={12} style={{ left: 640, top: y(392), whiteSpace: "nowrap" }}>
          <span style={{ ...body(40, true), color: INK }}>is not</span>
        </Ink>
        <Ink at={backwardsAt - 4} dur={16} style={{ left: 860, top: y(300), whiteSpace: "nowrap" }}>
          <div style={label(23, INK_SOFT)}>Among the positives</div>
          <div style={{ ...note(32, INK), marginTop: 10 }}>
            P(sick <span style={{ color: INK_SOFT }}>| positive</span>)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
            <Held at={positivesAt - 6}>
              <Big size={92} color={INK_SOFT}>
                <Strike at={areSickEnd - 2} top="0.5em">
                  {pct(TEST.sensitivity)}
                </Strike>
              </Big>
            </Held>
            <span style={{ opacity: ease(frame, areSickEnd + 4, 12) }}>
              <Big size={92} color={STAT_INK} italic>
                {pct(TEST.treePpv)}
              </Big>
            </span>
          </div>
        </Ink>

        {/* Bayes' rule takes you from one to the other. */}
        <Arrow from={[200, y(490)]} to={[1080, y(490)]} at={oneAt - 4} dur={18} color={STAT} width={3.4} />
        {/* ── Bayes' rule, and the base rate. "One" is the test's own rate,
             what the arrow starts from; "the other" is the one you want. ── */}
        <Ink at={bayesAt - 4} dur={18} style={{ left: 160, top: y(540), whiteSpace: "nowrap" }}>
          <span style={{ ...note(30, INK) }}>
            <Sweep at={Math.max(otherAt - 2, oneAt + 10)}>P(sick | positive)</Sweep> ={" "}
            <Sweep at={oneAt - 2}>P(positive | sick)</Sweep> ×{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              <Sweep at={baseAt - 2} color={`color-mix(in srgb, ${DATA} 35%, transparent)`}>
                P(sick)
              </Sweep>
              {/* The base rate, named right above the term it is. */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "100%",
                  marginBottom: 6,
                  ...note(22, DATA_INK),
                  fontWeight: 650,
                  whiteSpace: "nowrap",
                  opacity: ease(frame, baseAt + 2, 12),
                }}
              >
                the base rate, 1 in {num(TEST.oneIn)}
              </span>
            </span>{" "}
            ÷ P(positive)
          </span>
        </Ink>
        <Note at={beforeAt} x={160} y={y(600)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            = {TEST.sensitivity} × {TEST.baseRate} ÷ {fmt(TEST.pPos, 5)} ={" "}
            <b style={{ color: STAT_INK }}>
              <Sweep at={testedAt - 2}>{fmt(TEST.ppv, 3)}</Sweep>
            </b>
          </span>
        </Note>
        {/* Where the 0.01098 comes from: the tree's positives, sick or not. */}
        <Note at={beforeAt + 12} x={160} y={y(654)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            P(positive) = {num(TEST.positives)} / {num(TEST.population)}: everyone who tests positive
          </span>
        </Note>

        {/* ── Who takes the test ── */}
        <FigLabel n="5" title={`Who takes the test, of ${num(TEST.population)}`} at={healthyAt - 6} x={160} y={y(712)} />
        {(
          [
            ["Don't have it", TEST.healthy, healthyW, SOFT, INK_SOFT],
            ["Have it", TEST.sick, sickW, DATA, DATA_INK],
          ] as const
        ).map(([name, count, w, color, ink], i) => {
          const g = ease(frame, healthyAt - 2 + i * 6, 22);
          const top = y(BAR.y[i]);
          return (
            <React.Fragment key={name}>
              <Ink at={healthyAt + i * 4} dur={12} style={{ left: 160, top: top + h(BAR.h) / 2 - 15 }}>
                <span style={note(22, INK)}>{name}</span>
              </Ink>
              <div style={{ position: "absolute", left: BAR.x0, top, width: w * g, height: h(BAR.h), background: color }} />
              <Note at={outnumberAt + i * 6} x={BAR.x0 + w * g + 14} y={top + h(BAR.h) / 2 - 15}>
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
        {/* Right of the rule, clear of its widest line. */}
        <Ink at={falseAt - 4} dur={14} style={{ left: 1240, top: y(540), whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK) }}>
            1% of {num(TEST.healthy)} is <b style={{ color: STAT_INK }}>{num(TEST.fp)}</b> false alarms,
          </span>
          <div style={{ ...note(24, INK), marginTop: 8, opacity: ease(frame, realAt - 4, 10) }}>
            against <b style={{ color: DATA_INK }}>{TEST.tp}</b> real cases
          </div>
        </Ink>
        <Ink at={swampAt - 4} dur={14} style={{ left: 1240, top: y(612), whiteSpace: "nowrap" }}>
          <Big size={72} color={STAT_INK} italic>
            {Math.round(TEST.fp / TEST.tp)} to 1
          </Big>
        </Ink>
        <Ink at={neglectAt - 4} dur={16} style={{ left: 160, top: y(890), whiteSpace: "nowrap" }}>
          <span style={{ ...body(34), color: INK }}>
            <span style={{ background: `linear-gradient(transparent 55%, ${HIGHLIGHT} 55%, ${HIGHLIGHT} 92%, transparent 92%)` }}>
              Base-rate neglect
            </span>{" "}
            is forgetting this ratio.
          </span>
        </Ink>
      </div>

      {/* ── Retesting the positives ── */}
      {SHARE.y.map((rowY, i) => {
        const g = i === 0 ? first : secondBar;
        if (g <= 0) return null;
        const top = i === 0 ? y(rowY) : lerp(y(SHARE.y[0]), y(rowY), slide);
        const blueW = (i === 0 ? SHARE.w * TEST.treePpv : TEST.retestTp * scale2) * g;
        const redW = (i === 0 ? SHARE.w * (1 - TEST.treePpv) : red2 * scale2) * g;
        return (
          <React.Fragment key={i}>
            <Ink at={(i === 0 ? retestFrom : secondAt) - 4} dur={14} style={{ left: SHARE.x0, top: top - 52, whiteSpace: "nowrap" }}>
              <span style={label(24, INK)}>{i === 0 ? "Positive once" : "Positive on a second, independent test too"}</span>
            </Ink>
            <Svg opacity={1 - barsBack}>
              <rect x={SHARE.x0} y={top} width={blueW} height={h(SHARE.h)} fill={DATA} />
              <rect x={SHARE.x0 + blueW} y={top} width={redW} height={h(SHARE.h)} fill={STAT} opacity={0.8} />
              {i === 1 && stayFlash > 0 ? <rect x={SHARE.x0} y={top} width={blueW} height={h(SHARE.h)} fill={HIGHLIGHT} opacity={stayFlash} /> : null}
            </Svg>
            <div
              style={{
                position: "absolute",
                left: SHARE.x0,
                top: top + h(SHARE.h) + 12,
                width: Math.max(360, blueW + redW),
                display: "flex",
                justifyContent: "space-between",
                opacity: ease(frame, i === 0 ? retestFrom + 10 : ninetyEightAt - 2, 12),
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ ...note(24, DATA_INK), fontWeight: 700 }}>
                {i === 0 ? num(TEST.tp) : num(TEST.retestTp)} sick
              </span>
              <span style={{ ...note(24, STAT_INK), fontWeight: 700, opacity: i === 0 ? 1 : ease(frame, tenAt + 4, 12) }}>
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
      <Note at={retestFrom + 16} x={SHARE.x0 + 14} y={y(SHARE.y[0]) + h(SHARE.h) / 2 - 18}>
        <span style={{ ...note(26, "var(--ds-white)"), fontWeight: 700, whiteSpace: "nowrap" }}>{pct(TEST.treePpv)} real</span>
      </Note>
      <Ink at={ninetyOneAt - 4} dur={16} style={{ left: SHARE.x0, top: y(770), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 22 }}>
        <Big size={96} color={DATA_INK} italic>
          {pct(TEST.treePpv)} to {pct(TEST.ppv2)}
        </Big>
      </Ink>
      <Ink at={trustAt - 4} dur={18} style={{ left: 900, top: y(790), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK }}>
          Before you trust a positive, ask <Sweep at={rareAt}>how rare</Sweep> the thing is.
        </span>
      </Ink>
      <Ink at={rareAt + 2} dur={16} style={{ left: 900, top: y(842), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={note(24, INK_SOFT)}>Here,</span>
        <Big size={56} color={DATA_INK} italic>
          1 in {num(TEST.oneIn)}
        </Big>
      </Ink>
      </div>
    </AbsoluteFill>
  );
};
