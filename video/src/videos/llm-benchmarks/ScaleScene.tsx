import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HAIRLINE, INK, INK_SOFT, label, note, PAPER, TABULAR, svgText } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ARC3, MMLU } from "./data";
import { A, A_INK, B, B_INK, Bracket, Dot, Drift, Headline, pulse, Svg, Track, track, TRAP, TRAP_INK, X0 } from "./parts";

const TX0 = 300;
const TX1 = 1700;
const MMLU_Y = 404;
const ARC_Y = 826;
/** The zoom under MMLU's row: 90 to 96 points across 900px. */
const ZOOM = { lo: 90, hi: 96, x0: 760, x1: 1660, y: 600 };
const zx = (v: number) => ZOOM.x0 + ((v - ZOOM.lo) / (ZOOM.hi - ZOOM.lo)) * (ZOOM.x1 - ZOOM.x0);

/**
 * How to read a score (Fig. 4): the same two models on the lesson's MMLU and
 * ARC-AGI-3 rows, on one 0 to 100 scale. MMLU's 0.6-point gap sits just under
 * a ceiling near 95, magnified below its row until it reads as noise;
 * ARC-AGI-3's 32.5 points sit mid-scale with room above both.
 */
export const ScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("read").from;
  const sitsAt = n.word("read", "sits");
  const mmluAt = n.word("mmlu-gap", "MMLU");
  const aAt = n.word("mmlu-gap", "ninety-two point three");
  const bAt = n.word("mmlu-gap", "ninety-one point seven");
  const labelAt = n.word("mmlu-gap", "answer keys");
  const capAt = n.word("mmlu-gap", "most anyone");
  const ninetyFiveAt = n.word("mmlu-gap", "ninety-five");
  const sixAt = n.word("noise", "Six tenths");
  const ceilingAt = n.word("noise", "ceiling");
  const noiseAt = n.word("noise", "noise");
  const arcAt = n.word("arc-gap", "Arc AGI three");
  const arcA = n.word("arc-gap", "sixty-two point seven");
  const arcB = n.word("arc-gap", "thirty point two");
  const roomAt = n.word("arc-gap", "room");
  const realAt = n.word("arc-gap", "real difference");
  const crowdedAt = n.word("read-in", "crowded");
  const fourAt = n.word("read-in", "four");
  const misleadsAt = n.word("read-in", "misleads");
  const end = n.beat("saturation").from;

  const X = track(TX0, TX1);
  const my = y(MMLU_Y);
  const ay = y(ARC_Y);
  const zy = y(ZOOM.y);
  const zoomIn = ease(frame, aAt - 10, 16);
  const crowd = ease(frame, crowdedAt - 4, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the dots, the ceiling, the verdicts ── */}
      <Sfx name="el-pencil" at={from + 2} level={-35} />
      <Sfx name="el-tap" at={aAt + 2} level={-26} />
      <Sfx name="el-tap" at={bAt + 2} level={-28} />
      <Sfx name="el-pencil" at={capAt - 2} level={-34} />
      <Sfx name="el-tap" at={arcA + 2} level={-26} />
      <Sfx name="el-tap" at={arcB + 2} level={-28} />

      <Headline at={from - 6} second={sitsAt - 4} italic="by where it sits.">
        Read a score
      </Headline>
      <FigLabel n="4" title="The same two models, on a scale of 0 to 100" at={from - 2} x={X0} y={y(296)} />
      {/* The legend, at the right end of the label's line. */}
      <Ink at={from + 6} dur={12} style={{ left: 1420, top: y(296), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 12 }}>
        <svg width={18} height={18}>
          <circle cx={9} cy={9} r={8} fill={A} />
        </svg>
        <span style={{ ...label(22, A_INK), marginRight: 22 }}>Model A</span>
        <svg width={18} height={18}>
          <circle cx={9} cy={9} r={8} fill={B} />
        </svg>
        <span style={label(22, B_INK)}>Model B</span>
      </Ink>

      <Drift from={from} to={end} amount={0.01} origin="55% 55%">
        {/* ── MMLU ── */}
        <Ink at={mmluAt - 6} dur={12} style={{ left: X0, top: my - 17, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 700 }}>MMLU</span>
        </Ink>
        <Track x0={TX0} x1={TX1} y={my} at={from + 2} />
        <Svg opacity={ease(frame, labelAt - 2, 12)}>
          <line x1={X(MMLU.ceiling)} x2={X(MMLU.ceiling)} y1={my - 34} y2={my + 16} stroke={TRAP} strokeWidth={2.6} strokeDasharray="6 5" />
        </Svg>
        <Svg>
          <Dot x={X(MMLU.b)} y={my} at={bAt} r={9} color={B} />
          <Dot x={X(MMLU.a)} y={my} at={aAt} r={9} color={A} />
        </Svg>
        <Ink at={capAt - 2} dur={14} style={{ left: X(MMLU.ceiling) - 6, top: my - 78, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, TRAP_INK), fontWeight: 600, display: "inline-block", transform: "translateX(-100%)" }}>
            wrong answer keys cap it near {MMLU.ceiling}
          </span>
        </Ink>

        {/* The zoom: 90 to 96, magnified under the row. */}
        <Svg opacity={zoomIn}>
          <path
            d={`M${X(ZOOM.lo)},${my + 14} L${ZOOM.x0},${zy - 92} M${X(ZOOM.hi)},${my + 14} L${ZOOM.x1},${zy - 92}`}
            fill="none"
            stroke={HAIRLINE}
            strokeWidth={1.2}
            strokeDasharray="3 5"
          />
          <rect x={X(ZOOM.lo)} y={my - 12} width={X(ZOOM.hi) - X(ZOOM.lo)} height={24} rx={4} fill="none" stroke={HAIRLINE} strokeWidth={1.2} />
          <line x1={ZOOM.x0} x2={ZOOM.x0 + (ZOOM.x1 - ZOOM.x0) * zoomIn} y1={zy} y2={zy} stroke={HAIRLINE} strokeWidth={2} />
          {[90, 92, 94, 96].map((v) => (
            <g key={v}>
              <line x1={zx(v)} x2={zx(v)} y1={zy + 2} y2={zy + 9} stroke={INK_SOFT} strokeWidth={1.4} />
              <text x={zx(v)} y={zy + 32} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500, ...TABULAR })}>
                {v}
              </text>
            </g>
          ))}
          {/* "That crowded ceiling": the strip between the leader and the cap. */}
          <rect x={zx(MMLU.a)} y={zy - 16} width={(zx(MMLU.ceiling) - zx(MMLU.a)) * crowd} height={32} fill={TRAP} opacity={0.14 + pulse(frame, crowdedAt + 8, 20) * 0.12} />
        </Svg>
        <Svg opacity={ease(frame, labelAt - 2, 12)}>
          <line x1={zx(MMLU.ceiling)} x2={zx(MMLU.ceiling)} y1={zy - 110} y2={zy + 16} stroke={TRAP} strokeWidth={2.6} strokeDasharray="6 5" />
        </Svg>
        <Ink at={ninetyFiveAt - 2} dur={12} style={{ left: zx(MMLU.ceiling) + 12, top: zy - 116, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, TRAP_INK), fontWeight: 600 }}>ceiling</span>
        </Ink>
        <Svg>
          <Dot x={zx(MMLU.b)} y={zy} at={bAt} r={12} color={B} />
          <Dot x={zx(MMLU.a)} y={zy} at={aAt} r={12} color={A} />
        </Svg>
        <Ink at={aAt} dur={10} style={{ left: zx(MMLU.a), top: zy - 54, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, A_INK), fontWeight: 700, ...TABULAR, display: "inline-block", transform: "translateX(-30%)" }}>
            {fmt(MMLU.a, 1)}
          </span>
        </Ink>
        <Ink at={bAt} dur={10} style={{ left: zx(MMLU.b), top: zy - 54, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, B_INK), fontWeight: 600, ...TABULAR, display: "inline-block", transform: "translateX(-70%)" }}>
            {fmt(MMLU.b, 1)}
          </span>
        </Ink>
        <Bracket x0={zx(MMLU.b)} x1={zx(MMLU.a)} y={zy - 76} at={sixAt - 4} color={INK} />
        <Ink at={sixAt - 2} dur={12} style={{ left: (zx(MMLU.b) + zx(MMLU.a)) / 2, top: zy - 116, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 700, ...TABULAR, display: "inline-block", transform: "translateX(-50%)" }}>
            {fmt(MMLU.gap, 1)}
          </span>
        </Ink>
        <Bracket x0={zx(MMLU.a) + 16} x1={zx(MMLU.ceiling) - 4} y={zy - 76} at={ceilingAt - 4} color={TRAP} />
        <Ink at={ceilingAt - 2} dur={12} style={{ left: (zx(MMLU.a) + zx(MMLU.ceiling)) / 2, top: zy - 116, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, TRAP_INK), fontWeight: 600, ...TABULAR, display: "inline-block", transform: "translateX(-50%)" }}>
            {fmt(MMLU.ceiling - MMLU.a, 1)} to the ceiling
          </span>
        </Ink>
        {/* The verdict, under the gap it judges. */}
        <Ink at={noiseAt - 4} dur={18} style={{ left: (zx(MMLU.b) + zx(MMLU.a)) / 2, top: zy + 50, whiteSpace: "nowrap" }}>
          <span style={{ ...body(46, true), color: TRAP_INK, display: "inline-block", transform: "translateX(-50%)" }}>Noise.</span>
        </Ink>

        {/* "The first of four ways": the part ahead, one mark per pitfall. */}
        <Svg>
          {[0, 1, 2, 3].map((k) => {
            const p = ease(frame, fourAt - 2 + k * 4, 10);
            const lit = k === 0 ? ease(frame, misleadsAt - 2, 10) : 0;
            const cx = X0 + 58 + k * 50;
            const cy = zy - 6;
            return (
              <g key={k} opacity={p}>
                <circle cx={cx} cy={cy} r={17} fill={lit > 0 ? TRAP : "none"} fillOpacity={lit} stroke={TRAP} strokeWidth={2.2} />
                <text x={cx} y={cy + 7} textAnchor="middle" style={{ ...label(20, TRAP_INK), fill: lit > 0.5 ? PAPER : TRAP_INK, fontWeight: 700 }}>
                  {k + 1}
                </text>
              </g>
            );
          })}
        </Svg>

        {/* ── ARC-AGI-3 ── */}
        <Ink at={arcAt - 6} dur={12} style={{ left: X0, top: ay - 17, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 700 }}>ARC-AGI-3</span>
        </Ink>
        <Track x0={TX0} x1={TX1} y={ay} at={arcAt - 8} />
        <Svg>
          <Dot x={X(ARC3.b)} y={ay} at={arcB} r={12} color={B} />
          <Dot x={X(ARC3.a)} y={ay} at={arcA} r={12} color={A} />
        </Svg>
        <Ink at={arcA} dur={10} style={{ left: X(ARC3.a), top: ay - 54, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, A_INK), fontWeight: 700, ...TABULAR, display: "inline-block", transform: "translateX(-50%)" }}>
            {fmt(ARC3.a, 1)}
          </span>
        </Ink>
        <Ink at={arcB} dur={10} style={{ left: X(ARC3.b), top: ay - 54, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, B_INK), fontWeight: 600, ...TABULAR, display: "inline-block", transform: "translateX(-50%)" }}>
            {fmt(ARC3.b, 1)}
          </span>
        </Ink>
        <Bracket x0={X(ARC3.a) + 16} x1={X(100)} y={ay - 76} at={roomAt - 4} color={INK_SOFT} />
        <Ink at={roomAt - 2} dur={12} style={{ left: (X(ARC3.a) + X(100)) / 2, top: ay - 116, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT), fontWeight: 600, display: "inline-block", transform: "translateX(-50%)" }}>room above</span>
        </Ink>
        <Bracket x0={X(ARC3.b)} x1={X(ARC3.a)} y={ay - 76} at={realAt - 4} color={A} width={2.6} />
        <Ink at={realAt - 2} dur={14} style={{ left: (X(ARC3.b) + X(ARC3.a)) / 2, top: ay - 118, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, A_INK), fontWeight: 700, display: "inline-block", transform: "translateX(-50%)", ...halo }}>
            <span style={TABULAR}>{fmt(ARC3.gap, 1)}</span> points: a real difference
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
