import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WANDER } from "./data";
import { Bracket, DATA, Dashed, Drift, Headline, Kicker, lerp, Marker, partial, Ring, STAT, STAT_INK, Svg } from "./parts";

const X0 = 200;
const X1 = 1740;
const LO = 70;
const HI = 120;
const TOP = 330;
const BOTTOM = 560;
/** The zoom: four bars, drawn honestly from zero. */
const ZX = [720, 880, 1040, 1200];
const ZW = 110;
const ZBASE = 900;
const ZUNIT = 2.2;
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Part 4 opens: ten years of a metric that went nowhere, the steepest four
 * months found by search, and those months on their own, from zero.
 */
export const CherryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const from = n.beat("cherry").from;

  // ── Cues ──
  const yearsAt = n.word("cherry", "ten years");
  const endedAt = n.word("cherry", "ended");
  const startedAt = n.word("cherry", "started");
  const steepAt = n.word("window", "steep stretch");
  const tenYearsAt = n.word("window", "ten years");
  const fourAt = n.word("window", "four months");
  const pctAt = n.word("window", "twenty-five percent");
  const showAt = n.word("crop", "Show");
  const thoseAt = n.word("crop", "those months");
  const everyAt = n.word("crop", "every number");
  const realAt = n.word("crop", "real");
  const falseAt = n.word("crop", "false");
  const end = n.beat("crop").to;

  const S = WANDER.series;
  const px = (m: number) => X0 + (m / (S.length - 1)) * (X1 - X0);
  const py = (v: number) => y(BOTTOM) - ((v - LO) / (HI - LO)) * (y(BOTTOM) - y(TOP));
  const pts = S.map((v, i) => [px(i), py(v)] as const);
  const draw = ease(frame, yearsAt - 6, 40);
  // The window searches the decade, then settles on the steepest four months.
  const searchEnd = fourAt - 6;
  const search = ease(frame, steepAt - 4, Math.max(8, searchEnd - steepAt));
  const settle = ease(frame, searchEnd, 14);
  const scan = lerp(0, S.length - WANDER.length, search);
  const winStart = lerp(scan, WANDER.start, settle);
  const band = ease(frame, steepAt - 6, 8);
  const lit = ease(frame, fourAt - 4, 12);
  const winPts = pts.slice(WANDER.start, WANDER.end + 1);
  const zbase = y(ZBASE);

  return (
    <AbsoluteFill>
      {/* ── Sound: the decade drawing, the search, the bars landing ── */}
      <Sfx name="el-pencil" at={yearsAt - 6} level={-33} />
      <Sfx name="el-whoosh" at={steepAt - 4} level={-34} />
      <Sfx name="el-tap" at={searchEnd} level={-29} />
      {ZX.map((_, i) => (
        <Sfx key={i} name="el-pop" at={showAt - 2 + i * 4} level={-31} />
      ))}

      <Kicker at={from - 10}>Sharpshooters, selection and the unit of analysis</Kicker>
      <Headline
        top={y(150)}
        out={showAt - 8}
        parts={[
          { text: "Ten years, no change.", at: startedAt - 8 },
          { text: "Four months, up 25%.", at: pctAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        parts={[
          { text: "Every number real,", at: realAt - 8 },
          { text: "the story false.", at: falseAt - 6, italic: true },
        ]}
      />

      <Drift from={falseAt} to={end + 40} amount={0.02} origin={[960, 640]}>
        <FigLabel n="9" title="Ten years of a monthly metric" at={from - 4} x={160} y={y(262)} />
        {/* Gridlines and the years. */}
        <Svg opacity={ease(frame, from, 14)}>
          {[80, 100, 120].map((v) => (
            <line key={v} x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35} />
          ))}
        </Svg>
        {[80, 100, 120].map((v) => (
          <div key={v} style={{ position: "absolute", right: 1920 - X0 + 12, top: py(v) - 13, opacity: ease(frame, from + 2, 12), ...note(20, INK_SOFT) }}>
            {v}
          </div>
        ))}
        {[0, 2, 4, 6, 8, 10].map((yr) => (
          <div
            key={yr}
            style={{ position: "absolute", left: px(Math.min(yr * 12, S.length - 1)), top: y(BOTTOM) + 14, transform: "translateX(-50%)", opacity: ease(frame, from + 4, 12), ...note(20, INK_SOFT) }}
          >
            {yr === 0 ? "Year 0" : yr}
          </div>
        ))}

        {/* The search window. */}
        {band > 0 ? (
          <Svg opacity={band}>
            <rect
              x={px(winStart) - 4}
              y={py(HI) - 6}
              width={px(winStart + WANDER.length - 1) - px(winStart) + 8}
              height={y(BOTTOM) - py(HI) + 6}
              fill={HIGHLIGHT}
              opacity={lerp(0.45, 0.75, settle)}
              stroke={STAT}
              strokeWidth={3}
            />
          </Svg>
        ) : null}
        <Dashed x0={X0} y0={py(S[0])} x1={X1} y1={py(S[0])} at={startedAt - 6} dur={22} color={INK_SOFT} width={2} />
        <Bracket x0={X0} x1={X1} y={py(HI) - 16} at={tenYearsAt - 4} up={false} tick={12} />
        <Note at={tenYearsAt} x={(X0 + X1) / 2} y={py(HI) - 52} from="up">
          <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", background: PAPER, padding: "0 10px" }}>
            ten years
          </span>
        </Note>
        <Svg>
          {draw > 0 ? <path d={partial(pts, draw)} fill="none" stroke={DATA} strokeWidth={3} strokeLinejoin="round" /> : null}
          {lit > 0 ? <path d={partial(winPts, lit)} fill="none" stroke={STAT} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" /> : null}
        </Svg>
        <Note at={startedAt - 2} x={X1} y={py(S[0]) + 14} align="right">
          <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>
            started at {fmt(S[0], 0)}, ended at {fmt(S[S.length - 1], 0)}
          </span>
        </Note>
        <Note at={pctAt - 2} x={px(WANDER.end) + 18} y={py(S[WANDER.end]) - 70}>
          <span style={{ ...note(24, STAT_INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>
            <Marker at={pctAt}>up {WANDER.windowPct}%</Marker> in {WANDER.length} months
          </span>
        </Note>
        <Ring x={px(WANDER.end)} y={py(S[WANDER.end])} at={pctAt - 2} />
        <Ring x={px(S.length - 1)} y={py(S[S.length - 1])} at={endedAt - 2} color={DATA} />

        {/* ── The four months alone, from zero ── */}
        <Ink at={thoseAt - 4} dur={12} style={{ left: 160, top: y(640), whiteSpace: "nowrap" }}>
          <span style={label(24, INK)}>The same four months, on their own</span>
        </Ink>
        <Svg opacity={ease(frame, showAt - 4, 10)}>
          <line x1={ZX[0] - 40} x2={ZX[3] + ZW + 40} y1={zbase + 0.5} y2={zbase + 0.5} stroke={INK} strokeWidth={1.6} />
        </Svg>
        <Svg>
          {winPts.map(([wx, wy], i) => {
            const v = S[WANDER.start + i];
            const t = ease(frame, showAt - 2 + i * 4, 16);
            if (t <= 0) return null;
            const hh = h(v * ZUNIT) * pop(frame, showAt + i * 4, fps, 16);
            const fx = lerp(wx, ZX[i] + ZW / 2, t);
            const fy = lerp(wy, zbase - hh, t);
            return (
              <g key={i}>
                <rect x={lerp(wx - 4, ZX[i], t)} y={Math.min(fy, zbase)} width={lerp(8, ZW, t)} height={Math.max(4, zbase - fy)} fill={STAT} opacity={lerp(1, 0.6, t)} />
                <circle cx={fx} cy={fy} r={lerp(6, 0, t)} fill={STAT} stroke={PAPER} />
              </g>
            );
          })}
        </Svg>
        {winPts.map((_, i) => (
          <React.Fragment key={i}>
            <div
              style={{ position: "absolute", left: ZX[i] + ZW / 2, top: zbase + 12, transform: "translateX(-50%)", opacity: ease(frame, showAt + 6 + i * 4, 10), ...note(20, INK_SOFT) }}
            >
              {MONTH[(WANDER.start + i) % 12]}
            </div>
            <Note at={everyAt - 4 + i * 4} x={ZX[i] + ZW / 2} y={zbase - h(S[WANDER.start + i] * ZUNIT) - 36} from="up">
              <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", ...halo }}>
                {fmt(S[WANDER.start + i], 0)}
              </span>
            </Note>
          </React.Fragment>
        ))}
        <Note at={falseAt - 4} x={ZX[3] + ZW + 70} y={y(700)}>
          <span style={{ ...body(36, true), color: STAT_INK, whiteSpace: "nowrap" }}>a breakout?</span>
          <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>
            missing: the other {S.length - WANDER.length} months
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
