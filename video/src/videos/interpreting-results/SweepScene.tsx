import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SWEEP } from "./data";
import { Arrow, DATA, DATA_INK, Dashed, Drift, Headline, lerp, Marker, partial, Ring, STAT, STAT_INK, Svg } from "./parts";

/** Both panels share the x axis: observations per group, log 10 to 100,000. */
const PANELS = [
  { x0: 200, x1: 840 },
  { x0: 1080, x1: 1720 },
] as const;
const TOP = 360;
const BOTTOM = 820;
const N_TICKS = [10, 100, 1000, 10000, 100000];
const nx = (p: { x0: number; x1: number }, n: number) => p.x0 + ((Math.log10(n) - 1) / 4) * (p.x1 - p.x0);
/** The p-value axis runs from 1 at the top down to 10⁻⁵⁰. */
const P_DECADES = 50;
const D_MAX = 0.6;

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const sup = (s: string) => [...s].map((c) => SUP[c] ?? c).join("");
/** "0.15", "0.095", "3 × 10⁻⁸", and "0.0" where the lesson's print rounds
 *  to nothing. */
const pLabel = (p: number) => {
  if (p === 0) return "prints as 0.0";
  if (p >= 0.01) return fmt(p, p >= 0.1 ? 2 : 3);
  const e = Math.floor(Math.log10(p));
  const m = p / 10 ** e;
  return `${fmt(m, m < 9.95 && Math.round(m) !== m ? 1 : 0)} × 10${sup(String(e))}`;
};

/**
 * The same true effect, d = 0.3, at five sample sizes: the p-value plunges
 * through fifty decades while the estimate of d settles on 0.3.
 */
export const SweepScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("sweep").from;

  // ── Cues ──
  const fixedAt = n.word("sweep", "fixed");
  const growAt = n.word("sweep", "grow");
  const twentyAt = n.word("sweep", "twenty");
  const fiftyAt = n.word("sweep", "fifty thousand");
  const plungesAt = n.word("plunge", "plunges");
  const fifteenAt = n.word("plunge", "zero point one five");
  const zeroAt = n.word("plunge", "prints as zero");
  const dAt = n.word("settle", "d");
  const nearAt = n.word("settle", "near");
  const worldAt = n.word("world", "the world");
  const andAt = n.word("world", "AND");
  const sampleAt = n.word("world", "sample");
  const twoAt = n.word("rates-in", "two ways");
  const end = n.beat("rates-in").to;

  const top = y(TOP);
  const bottom = y(BOTTOM);
  const pY = (p: number) => (p <= 0 ? bottom + 70 : lerp(top, bottom, -Math.log10(p) / P_DECADES));
  const dY = (d: number) => lerp(bottom, top, d / D_MAX);
  // Each sample size arrives on its own beat of the sweep.
  const rowAt = (i: number) => (i === 0 ? twentyAt - 2 : lerp(twentyAt + 10, fiftyAt + 2, (i - 1) / (SWEEP.rows.length - 2)));
  const pLine = ease(frame, plungesAt - 4, 34);
  const dLine = ease(frame, dAt - 4, 26);
  const P = PANELS[0];
  const D = PANELS[1];
  const pPts = SWEEP.rows.map((r) => [nx(P, r.n), pY(r.p)] as const);
  const dPts = SWEEP.rows.map((r) => [nx(D, r.n), dY(r.d)] as const);
  const finalP = pPts[pPts.length - 1];

  return (
    <AbsoluteFill>
      {/* ── Sound: each sample size, the plunge, the settling, the two titles ── */}
      {SWEEP.rows.map((r, i) => (
        <Sfx key={r.n} name="el-tap" at={rowAt(i)} level={-30} />
      ))}
      <Sfx name="el-whoosh" at={plungesAt - 4} level={-33} />
      <Sfx name="el-pencil" at={dAt - 4} level={-34} />
      <Sfx name="el-pop" at={zeroAt - 2} level={-30} />

      <Headline
        top={y(150)}
        parts={[
          { text: "More data:", at: from - 6 },
          { text: "the p-value falls, d holds.", at: plungesAt - 8, italic: true },
        ]}
      />

      {/* The figure steps back as the narration turns to rates. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.45 * ease(frame, twoAt - 6, 18) }}>
      <Drift from={sampleAt} to={end + 30} amount={0.02} origin={[960, 620]}>
        <FigLabel n="3" title={`A true d of ${fmt(SWEEP.trueD, 1)}, at five sample sizes`} at={from - 4} x={160} y={y(258)} />

        {/* ── Panel titles ── */}
        <Ink at={growAt - 6} dur={14} style={{ left: P.x0, top: y(318), whiteSpace: "nowrap" }}>
          <span style={label(24, STAT_INK)}>
            <Marker at={sampleAt - 4}>p-value</Marker>
          </span>
        </Ink>
        <Ink at={growAt - 2} dur={14} style={{ left: D.x0, top: y(318), whiteSpace: "nowrap" }}>
          <span style={label(24, DATA_INK)}>
            <Marker at={worldAt - 4}>Cohen&apos;s d</Marker>
          </span>
        </Ink>

        {/* ── Axes ── */}
        <Svg opacity={ease(frame, growAt - 4, 14)}>
          {PANELS.map((p, k) => (
            <g key={k}>
              <line x1={p.x0} x2={p.x0} y1={top} y2={bottom} stroke={INK} strokeWidth={1.4} />
              <line x1={p.x0} x2={p.x1} y1={bottom + 0.5} y2={bottom + 0.5} stroke={INK} strokeWidth={1.6} />
              {N_TICKS.map((t) => (
                <line key={t} x1={nx(p, t)} x2={nx(p, t)} y1={bottom} y2={bottom + 7} stroke={INK} strokeWidth={1.2} />
              ))}
            </g>
          ))}
          {[0, 10, 20, 30, 40, 50].map((e) => (
            <line key={e} x1={P.x0} x2={P.x1} y1={lerp(top, bottom, e / P_DECADES)} y2={lerp(top, bottom, e / P_DECADES)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35} />
          ))}
          {[0, 0.2, 0.4, 0.6].map((v) => (
            <line key={v} x1={D.x0} x2={D.x1} y1={dY(v)} y2={dY(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35} />
          ))}
        </Svg>
        {PANELS.map((p, k) =>
          N_TICKS.map((t) => (
            <div
              key={`${k}-${t}`}
              style={{
                position: "absolute",
                left: nx(p, t),
                top: bottom + 14,
                transform: "translateX(-50%)",
                opacity: ease(frame, growAt, 12),
                ...note(20, INK_SOFT),
              }}
            >
              {t.toLocaleString("en-US")}
            </div>
          )),
        )}
        {PANELS.map((p, k) => (
          <Note key={k} at={growAt + 4} x={(p.x0 + p.x1) / 2} y={bottom + 48} from="up">
            <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
              observations per group
            </span>
          </Note>
        ))}
        {[0, 10, 20, 30, 40, 50].map((e) => (
          <div
            key={e}
            style={{
              position: "absolute",
              right: 1920 - P.x0 + 12,
              top: lerp(top, bottom, e / P_DECADES) - 13,
              opacity: ease(frame, growAt, 12),
              ...note(20, INK_SOFT),
              whiteSpace: "nowrap",
            }}
          >
            {e === 0 ? "1" : `10${sup(String(-e))}`}
          </div>
        ))}
        {[0, 0.2, 0.4, 0.6].map((v) => (
          <div
            key={v}
            style={{
              position: "absolute",
              right: 1920 - D.x0 + 12,
              top: dY(v) - 13,
              opacity: ease(frame, growAt, 12),
              ...note(20, INK_SOFT),
            }}
          >
            {fmt(v, 1)}
          </div>
        ))}

        {/* The true effect, on the d panel. */}
        <Dashed x0={D.x0} y0={dY(SWEEP.trueD)} x1={D.x1} y1={dY(SWEEP.trueD)} at={fixedAt - 4} dur={18} width={2.4} />
        <Note at={fixedAt} x={D.x1} y={dY(SWEEP.trueD) - 40} align="right">
          <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>the true effect, {fmt(SWEEP.trueD, 1)}</span>
        </Note>
        {/* p = 0.05, on the p panel: just under the top. */}
        <Dashed x0={P.x0} y0={pY(0.05)} x1={P.x1} y1={pY(0.05)} at={growAt} dur={14} color={INK_SOFT} width={1.4} dash="4 4" />

        {/* ── The lines, drawn through the points as the narration follows them ── */}
        <Svg>
          {pLine > 0 ? <path d={partial(pPts.slice(0, -1), pLine)} fill="none" stroke={STAT} strokeWidth={3} strokeLinejoin="round" /> : null}
          {dLine > 0 ? <path d={partial(dPts, dLine)} fill="none" stroke={DATA} strokeWidth={3} strokeLinejoin="round" /> : null}
          {SWEEP.rows.map((r, i) => {
            const a = ease(frame, rowAt(i), 8);
            if (a <= 0) return null;
            return (
              <g key={r.n}>
                {r.p > 0 ? <circle cx={pPts[i][0]} cy={pPts[i][1]} r={8 * a} fill={STAT} stroke={PAPER} strokeWidth={2} /> : null}
                <circle cx={dPts[i][0]} cy={dPts[i][1]} r={8 * a} fill={DATA} stroke={PAPER} strokeWidth={2} />
              </g>
            );
          })}
        </Svg>
        {/* The last p-value leaves the axis: it underflows to 0.0. */}
        <Arrow from={[pPts[3][0], pPts[3][1]]} to={[finalP[0], bottom - 6]} at={zeroAt - 10} dur={12} color={STAT} width={3} />

        {SWEEP.rows.map((r, i) => {
          const pAt = i === 0 ? fifteenAt - 2 : i === SWEEP.rows.length - 1 ? zeroAt - 2 : lerp(fifteenAt + 6, zeroAt - 8, (i - 1) / 2);
          const last = i === SWEEP.rows.length - 1;
          return (
            <React.Fragment key={r.n}>
              <Note at={pAt} x={last ? finalP[0] - 14 : pPts[i][0] + 14} y={last ? bottom - 60 : pPts[i][1] - 34} align={last ? "right" : "left"}>
                <span style={{ ...note(21, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>{pLabel(r.p)}</span>
              </Note>
              <Note at={dAt + 4 + i * 3} x={dPts[i][0]} y={dPts[i][1] + (r.d > SWEEP.trueD ? -44 : 16)} from="up">
                <span style={{ ...note(21, DATA_INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", ...halo }}>
                  {fmt(r.d, 2)}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Ring x={dPts[4][0]} y={dPts[4][1]} at={nearAt - 2} color={DATA} r1={52} />
        <Ring x={finalP[0]} y={bottom - 6} at={zeroAt + 4} r1={44} />
        <Note at={andAt - 2} x={P.x0 + 24} y={bottom - 50}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>moves with n</span>
        </Note>
        <Note at={worldAt} x={D.x0 + 24} y={dY(0.08)}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>stays put</span>
        </Note>
      </Drift>
      </div>
    </AbsoluteFill>
  );
};
