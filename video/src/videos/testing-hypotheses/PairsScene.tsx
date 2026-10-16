import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, HAIRLINE, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, PAIRED } from "./data";
import { DATA, DATA_INK, DOT, Head, Label, lerp, pulse, STAT, STAT_INK, Svg, VBracket } from "./parts";

/** Blood pressure, up the page: 100 to 180 mmHg. */
const V_LO = 100;
const V_HI = 180;
const TOP = 340;
const BOTTOM = 820;
const COL = [360, 700];
const SPREAD = 110;
/** The changes, before minus after: 0 to 16 mmHg. */
const D: XScale = { lo: 0, hi: 16, x0: 1080, x1: 1740 };
const D_STRIP = 560;
const D_AXIS = 640;

const JX = jitter(425, PAIRED.n);
const JD = jitter(426, PAIRED.n);
const DIFFS = PAIRED.before.map((b, i) => b - PAIRED.after[i]);
/** The patient singled out as "their own control": the one with the largest change. */
const ONE = DIFFS.indexOf(Math.max(...DIFFS));

/**
 * The lesson's 25 patients: compared as two separate columns the
 * between-person spread drowns a seven-point drop (p = 0.115); each
 * patient's own change, tested against zero, gives t = 10.2.
 */
export const PairsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const pairsFrom = n.beat("pairs").from;
  const patientsAt = n.word("pairs", "Twenty-five");
  const beforeAt = n.word("pairs", "before");
  const afterAt = n.word("pairs", "after");
  const columnsAt = n.word("unpaired", "columns");
  const differencesAt = n.word("unpaired", "differences");
  const drownAt = n.word("unpaired", "drown");
  const p115At = n.word("unpaired", "point one one five");
  const ownAt = n.word("paired", "own change");
  const collapsesAt = n.word("paired", "collapses");
  const tenAt = n.word("paired", "ten");
  const billionAt = n.word("paired", "billion");
  const sameAt = n.word("own", "Same data");
  const controlAt = n.word("own", "own control");
  const groupsInAt = n.word("groups-in", "every pair");

  const vy = (v: number) => y(BOTTOM) - ((v - V_LO) / (V_HI - V_LO)) * (y(BOTTOM) - y(TOP));
  const colX = (c: number, i: number) => COL[c] + (JX[i] - 0.5) * SPREAD;
  const lines = (i: number) => ease(frame, ownAt - 4 + i * 1.2, 12);
  const toDiffs = ease(frame, collapsesAt - 6, 22);
  const oneGlow = ease(frame, controlAt - 4, 12);
  const sameGlow = pulse(frame, sameAt, 26);
  const dimCols = 1 - 0.35 * ease(frame, ownAt - 4, 16);
  const outDim = 1 - 0.5 * ease(frame, groupsInAt - 30, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two columns, the spreads, the lines, the changes gathering ── */}
      <Sfx name="el-sprinkle" at={beforeAt - 4} level={-33} />
      <Sfx name="el-sprinkle" at={afterAt - 4} level={-34} />
      <Sfx name="el-pencil" at={drownAt - 4} level={-34} />
      <Sfx name="el-pencil" at={ownAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={collapsesAt - 6} level={-33} />
      <Sfx name="el-tap" at={tenAt - 2} level={-28} />

      <Head a="Pair" b="what's paired." at={pairsFrom - 6} bAt={ownAt - 6} />

      <div style={{ position: "absolute", inset: 0, opacity: outDim }}>
        <FigLabel n="15" title={`Blood pressure of ${PAIRED.n} patients, before and after`} at={pairsFrom} x={160} y={y(280)} />

        {/* ── Two columns of the same people ── */}
        <Svg opacity={ease(frame, patientsAt - 4, 14)}>
          {[120, 140, 160].map((v) => (
            <line key={v} x1={230} x2={830} y1={vy(v)} y2={vy(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35} />
          ))}
        </Svg>
        {[120, 140, 160].map((v) => (
          <div key={v} style={{ position: "absolute", right: 1920 - 214, top: vy(v) - 13, opacity: ease(frame, patientsAt, 12), ...note(20, INK_SOFT) }}>
            {v}
          </div>
        ))}
        {[
          ["Before", beforeAt],
          ["After", afterAt],
        ].map(([t, at], c) => (
          <div
            key={t as string}
            style={{
              position: "absolute",
              left: COL[c],
              top: y(BOTTOM) + 20,
              transform: "translateX(-50%)",
              opacity: ease(frame, (at as number) - 4, 12),
              ...label(24, INK),
            }}
          >
            {t}
          </div>
        ))}
        <Svg opacity={dimCols}>
          {/* Each patient's own change, joined across the columns. */}
          {PAIRED.before.map((b, i) => {
            const p = lines(i);
            if (p <= 0) return null;
            const x0 = colX(0, i);
            const y0 = vy(b);
            const x1 = colX(1, i);
            const y1 = vy(PAIRED.after[i]);
            const one = i === ONE ? oneGlow : 0;
            return (
              <line
                key={i}
                x1={x0}
                y1={y0}
                x2={lerp(x0, x1, p)}
                y2={lerp(y0, y1, p)}
                stroke={STAT}
                strokeWidth={1.6 + 2.4 * one}
                opacity={0.5 + 0.5 * one}
              />
            );
          })}
          {PAIRED.before.map((b, i) => {
            const a = ease(frame, beforeAt - 4 + i * 0.6, 6);
            return a > 0 ? <circle key={`b${i}`} cx={colX(0, i)} cy={vy(b)} r={7 * a} fill={DOT} stroke={PAPER} strokeWidth={1.2} /> : null;
          })}
          {PAIRED.after.map((v, i) => {
            const a = ease(frame, afterAt - 4 + i * 0.6, 6);
            return a > 0 ? <circle key={`a${i}`} cx={colX(1, i)} cy={vy(v)} r={7 * a} fill={DATA} stroke={PAPER} strokeWidth={1.2} /> : null;
          })}
          {/* Each column's mean. */}
          {[PAIRED.meanBefore, PAIRED.meanAfter].map((m, c) => {
            const a = ease(frame, columnsAt - 4 + c * 6, 12);
            if (a <= 0) return null;
            return <line key={c} x1={COL[c] - 80 * a} x2={COL[c] + 80 * a} y1={vy(m)} y2={vy(m)} stroke={STAT} strokeWidth={4} strokeLinecap="round" />;
          })}
        </Svg>
        {/* The spread between people, which the unpaired test counts as noise. */}
        <VBracket x={COL[0] - 92} y0={vy(Math.max(...PAIRED.before))} y1={vy(Math.min(...PAIRED.before))} at={differencesAt - 2} color={INK} />
        <VBracket x={COL[1] + 92} y0={vy(Math.max(...PAIRED.after))} y1={vy(Math.min(...PAIRED.after))} at={differencesAt + 4} color={INK} right />
        <Note at={drownAt - 2} x={COL[1] + 112} y={vy(150) - 30}>
          <Label size={21} color={INK_SOFT} weight={520} style={{ whiteSpace: "normal", display: "inline-block", width: 200 }}>
            the spread between people
          </Label>
        </Note>
        <Note at={p115At - 2} x={COL[0] - 100} y={y(BOTTOM) + 64}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            as two separate groups: p = {fmt(PAIRED.unpairedP, 3)}
          </span>
        </Note>

        {/* ── Fig. 16: the changes alone ── */}
        <FigLabel n="16" title="Each patient's own change, before minus after" at={ownAt + 4} x={D.x0} y={y(400)} />
        <Axis scale={D} base={y(D_AXIS)} ticks={[0, 4, 8, 12, 16]} at={ownAt + 6} />
        <Note at={ownAt + 10} x={D.x1} y={y(D_AXIS) + 40} align="right">
          <Label size={21} color={INK_SOFT} weight={520}>
            mmHg
          </Label>
        </Note>
        <Svg>
          {DIFFS.map((d, i) => {
            if (toDiffs <= 0) return null;
            // Each change flies from its patient's line to its place on the axis.
            const fx = lerp(colX(0, i), colX(1, i), 0.5);
            const fy = lerp(vy(PAIRED.before[i]), vy(PAIRED.after[i]), 0.5);
            const t = ease(frame, collapsesAt - 6 + i * 0.9, 16);
            const tx = sx(D, d);
            const ty = y(D_STRIP) + h((JD[i] - 0.5) * 50);
            return (
              <circle
                key={i}
                cx={lerp(fx, tx, t)}
                cy={lerp(fy, ty, t)}
                r={7}
                fill={i === ONE && oneGlow > 0 ? STAT : DOT}
                stroke={PAPER}
                strokeWidth={1.2}
                opacity={t > 0 ? 1 : 0}
              />
            );
          })}
          {ease(frame, tenAt - 6, 12) > 0 ? (
            <line
              x1={sx(D, PAIRED.meanChange)}
              x2={sx(D, PAIRED.meanChange)}
              y1={y(D_STRIP) - h(50) * ease(frame, tenAt - 6, 12)}
              y2={y(D_STRIP) + h(50) * ease(frame, tenAt - 6, 12)}
              stroke={STAT}
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          ) : null}
          {/* Zero, which the test asks about. */}
          {ease(frame, ownAt + 8, 12) > 0 ? (
            <line x1={sx(D, 0)} x2={sx(D, 0)} y1={y(D_AXIS)} y2={y(D_STRIP) - h(60)} stroke={INK} strokeWidth={2.2} strokeDasharray="7 6" />
          ) : null}
        </Svg>
        <Note at={tenAt - 4} x={sx(D, PAIRED.meanChange) + 14} y={y(D_STRIP) - h(60) - 40}>
          <span style={{ ...note(24, STAT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
            average drop {fmt(PAIRED.meanChange, 1)}
          </span>
        </Note>
        <div style={{ position: "absolute", left: D.x0, top: y(720), opacity: ease(frame, tenAt - 4, 12), whiteSpace: "nowrap" }}>
          <span style={{ ...note(40, STAT_INK), fontWeight: 700 }}>
            <span style={{ fontStyle: "italic" }}>t</span> = {fmt(PAIRED.pairedT, 1)}
          </span>
          <span
            style={{
              ...note(30, STAT_INK),
              fontWeight: 650,
              marginLeft: 28,
              opacity: ease(frame, billionAt - 6, 12),
            }}
          >
            p = {PAIRED.pairedP.toFixed(11)}
          </span>
        </div>
        <Note at={billionAt} x={D.x0} y={y(720) + 64}>
          <Label size={22} color={INK_SOFT} weight={520}>
            under one in a billion
          </Label>
        </Note>
        <Note at={controlAt - 2} x={colX(1, ONE) + 20} y={vy(PAIRED.after[ONE]) - 14}>
          <span style={{ ...label(22, STAT_INK), ...halo, whiteSpace: "nowrap", display: "inline-block", transform: `scale(${1 + 0.05 * sameGlow})` }}>
            their own control
          </span>
        </Note>
        <Note at={sameAt - 2} x={D.x0} y={y(BOTTOM) + 20}>
          <Label size={24} color={DATA_INK}>
            Same data, tested within each patient
          </Label>
        </Note>
      </div>
    </AbsoluteFill>
  );
};
