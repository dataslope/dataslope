import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { normalPdf, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RATES } from "./data";
import { DATA, DATA_INK, Dashed, Drift, Headline, Marker, Ring, STAT, STAT_INK, Svg } from "./parts";

/** Conversion, 0 to 5%. */
const RX: XScale = { lo: 0, hi: 0.05, x0: 420, x1: 1300 };
const BAR_Y = [330, 410];
const BAR_H = 50;
/** The two ways to say it, beside the bars. */
const SAY_X = 1480;
/** The lift in percentage points, −1 to +3, for its interval. */
const DX: XScale = { lo: -1, hi: 3, x0: 420, x1: 1300 };
const DX_TICKS = [-1, 0, 1, 2, 3];
const CI_Y = 744;
/** The curve of plausible lifts: its peak, and the markers' height. */
const CURVE_TOP = 88;
const HIST_TOP = 96;
const RAW_BAR = `color-mix(in srgb, ${INK_SOFT} 38%, ${PAPER})`;
const TRIO_Y = 838;
/** Fig. 4 sits this far down the page until Fig. 5 needs the room. */
const LOWER = 110;
/** The lift and its interval in points, as the narration says them. */
const LIFT = RATES.difference * 100;
const LO = RATES.lo * 100;
const HI = RATES.hi * 100;
const SE = RATES.se * 100;
const pts = (v: number) => `${v < 0 ? "−" : "+"}${fmt(Math.abs(v), 1)}`;

/**
 * Two ways to say the size of a lift in a rate, then an effect size with its
 * interval, and the three numbers to report together.
 */
export const RatesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const from = n.beat("rates").from;

  // ── Cues ──
  const buttonAt = n.word("rates", "button");
  const threeAt = n.word("rates", "three percent");
  const fourAt = n.word("rates", "four point two");
  const fortyAt = n.word("relative", "forty percent");
  const pointsAt = n.word("relative", "one point two");
  const ppAt = n.word("relative", "percentage points");
  const firstAt = n.word("both", "The first");
  const readerAt = n.word("both", "reader");
  const everyAt = n.word("interval", "every");
  const sizeAt = n.word("interval", "effect size");
  const liftAt = n.word("interval", "that lift");
  const plausiblyAt = n.word("interval", "plausibly");
  const biggerAt = n.word("both", "bigger");
  const bothAt = n.word("both", "Report both");
  const intervalAt = n.word("interval", "interval");
  const dAt = n.word("interval", "one point two");
  const oneAt = n.word("interval", "zero point three");
  const sixAt = n.word("interval", "two point one");
  const bigAt = n.word("trio", "How big");
  const preciseAt = n.word("trio", "how precise");
  const allAt = n.word("trio", "there at all");
  const reportAt = n.word("trio", "all three");
  const butAt = n.word("part2-in", "But");
  const meanAt = n.word("part2-in", "mean");
  const seemsAt = n.word("part2-in", "seems");

  const rates = [RATES.pControl, RATES.pTreatment];
  const grow = [ease(frame, threeAt - 6, 16), ease(frame, fourAt - 6, 16)];
  const extra = ease(frame, pointsAt - 4, 12);
  const ciY = y(CI_Y);
  const trio = [
    { q: "How big", a: `${pts(LIFT)} points`, at: bigAt },
    { q: "How precise", a: `${pts(LO)} to ${pts(HI)}`, at: preciseAt },
    { q: "Is it there at all", a: `p = ${fmt(RATES.p, 3)}`, at: allAt },
  ];
  // Fig. 4 rises into place as Fig. 5 arrives under it.
  const lower = h(LOWER) * (1 - ease(frame, everyAt - 12, 24));
  // The curve of plausible lifts, and the middle 95% of it.
  const curvePath = (a: number, b: number, k: number) => {
    const steps = 80;
    const line = Array.from({ length: steps + 1 }, (_, i) => {
      const v = a + ((b - a) * i) / steps;
      const yy = ciY - CURVE_TOP * k * (normalPdf(v, LIFT, SE) / normalPdf(LIFT, LIFT, SE));
      return `L${sx(DX, v).toFixed(1)},${yy.toFixed(1)}`;
    });
    return `M${sx(DX, a).toFixed(1)},${ciY} ${line.join(" ")} L${sx(DX, b).toFixed(1)},${ciY} Z`;
  };
  const rise = ease(frame, plausiblyAt - 6, 16);
  const leftLit = ease(frame, oneAt - 6, 14);
  const rightLit = ease(frame, sixAt - 6, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two bars, the extra, the interval, the three answers ── */}
      <Sfx name="el-pop" at={threeAt - 6} level={-30} />
      <Sfx name="el-pop" at={fourAt - 6} level={-30} />
      <Sfx name="el-pencil" at={oneAt - 6} level={-34} />
      {trio.map((t) => (
        <Sfx key={t.q} name="el-tap" at={t.at - 4} level={-30} />
      ))}

      <Headline
        top={y(150)}
        out={intervalAt - 6}
        parts={[
          { text: "One lift,", at: from - 6 },
          { text: "two ways to say it.", at: fortyAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        out={meanAt - 6}
        parts={[
          { text: "Size, with an interval,", at: intervalAt - 2 },
          { text: "and the p-value.", at: allAt - 4, italic: true },
        ]}
      />

      <Headline
        top={y(150)}
        parts={[
          { text: "But what does it", at: meanAt - 4 },
          { text: "mean?", at: seemsAt - 4, italic: true },
        ]}
      />

      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.5 * ease(frame, everyAt - 4, 16), transform: `translateY(${lower}px)` }}>
        <FigLabel n="4" title="Conversion, old checkout button and new" at={from - 4} x={160} y={y(268)} />
        {/* Gridlines at each percent. */}
        <Svg opacity={ease(frame, from, 14)}>
          {[0, 0.01, 0.02, 0.03, 0.04, 0.05].map((v) => (
            <line
              key={v}
              x1={sx(RX, v)}
              x2={sx(RX, v)}
              y1={y(BAR_Y[0]) - 18}
              y2={y(BAR_Y[1]) + BAR_H + 10}
              stroke={v === 0 ? INK : HAIRLINE}
              strokeWidth={v === 0 ? 1.6 : 1}
              strokeDasharray={v === 0 ? undefined : "2 5"}
            />
          ))}
        </Svg>
        {[0, 0.01, 0.02, 0.03, 0.04, 0.05].map((v) => (
          <div
            key={v}
            style={{
              position: "absolute",
              left: sx(RX, v),
              top: y(BAR_Y[1]) + BAR_H + 16,
              transform: "translateX(-50%)",
              opacity: ease(frame, from + 4, 12),
              ...note(20, INK_SOFT),
            }}
          >
            {Math.round(v * 100)}%
          </div>
        ))}
        {(["Old button", "New button"] as const).map((t, i) => {
          const top = y(BAR_Y[i]);
          const w = (sx(RX, rates[i]) - RX.x0) * grow[i];
          const counts = i ? RATES.treatment : RATES.control;
          return (
            <React.Fragment key={t}>
              <Ink at={buttonAt - 4 + i * 5} dur={12} style={{ left: 160, top: top + 10, whiteSpace: "nowrap" }}>
                <span style={label(24, INK)}>{t}</span>
              </Ink>
              <Svg>
                {w > 0 ? <rect x={RX.x0} y={top} width={w} height={BAR_H} fill={i ? DATA : `color-mix(in srgb, ${DATA} 45%, ${PAPER})`} /> : null}
              </Svg>
              <Note at={(i ? fourAt : threeAt) + 4} x={RX.x0 + w + 14} y={top + 4}>
                <span style={{ ...note(30, DATA_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
                  {fmt(rates[i] * 100, 1)}%
                  <span style={{ ...note(20, INK_SOFT), marginLeft: 12 }}>
                    {counts[0]} of {counts[1].toLocaleString("en-US")}
                  </span>
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        {/* The 1.2 points the new button adds, over the old bar's length. */}
        <Svg>
          {extra > 0 ? (
            <rect
              x={sx(RX, RATES.pControl)}
              y={y(BAR_Y[1]) - 4}
              width={(sx(RX, RATES.pTreatment) - sx(RX, RATES.pControl)) * extra}
              height={BAR_H + 8}
              fill="none"
              stroke={STAT}
              strokeWidth={3}
            />
          ) : null}
        </Svg>
        <Note at={fortyAt - 2} x={SAY_X} y={y(BAR_Y[0]) - 30}>
          <div style={label(21, INK_SOFT)}>relative</div>
          <div style={{ ...note(32, INK), fontWeight: 700, marginTop: 6, whiteSpace: "nowrap" }}>
            <Marker at={biggerAt - 2}>+{Math.round(RATES.uplift * 100)}%</Marker>
            <span style={{ ...note(21, INK_SOFT), fontWeight: 500, marginLeft: 12 }}>{fmt(RATES.ratio, 1)} times the rate</span>
          </div>
        </Note>
        <Note at={pointsAt - 2} x={SAY_X} y={y(BAR_Y[1]) - 2}>
          <div style={label(21, INK_SOFT)}>absolute</div>
          <div style={{ ...note(32, STAT_INK), fontWeight: 700, marginTop: 6, whiteSpace: "nowrap" }}>
            <Marker at={ppAt + 4}>+{fmt(RATES.difference * 100, 1)} points</Marker>
          </div>
        </Note>
        <Ring x={SAY_X + 50} y={y(BAR_Y[0]) + 22} at={firstAt - 2} r0={30} r1={100} />
        <Svg>
          {ease(frame, readerAt - 4, 14) > 0 ? (
            <rect
              x={SAY_X - 28}
              y={y(BAR_Y[0]) - 46}
              width={380}
              height={y(BAR_Y[1]) + 96 - (y(BAR_Y[0]) - 46)}
              rx={10}
              fill="none"
              stroke={INK}
              strokeWidth={2.6}
              pathLength={1}
              strokeDasharray={`${ease(frame, readerAt - 4, 14)} 1`}
            />
          ) : null}
        </Svg>
        <Note at={bothAt - 2} x={SAY_X} y={y(BAR_Y[1]) + 104}>
          <span style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>
            <Marker at={bothAt + 4}>report both</Marker>
          </span>
        </Note>
      </div>

      {/* The lift Fig. 5 measures is Fig. 4's absolute one. */}
      <Ring x={SAY_X + 90} y={y(BAR_Y[1]) + 50} at={liftAt - 2} r0={30} r1={100} />

      {/* ── The same lift with its interval ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.45 * ease(frame, butAt - 4, 18) }}>
      <Drift from={reportAt} to={n.beat("part2-in").to + 40} amount={0.02} origin={[960, 760]}>
        <FigLabel n="5" title="The same lift, with its 95% interval" at={sizeAt - 4} x={160} y={y(596)} />
        <Svg opacity={ease(frame, intervalAt, 14)}>
          <line x1={DX.x0} x2={DX.x1} y1={ciY + 0.5} y2={ciY + 0.5} stroke={INK} strokeWidth={1.6} />
          {DX_TICKS.map((v) => (
            <line key={v} x1={sx(DX, v)} x2={sx(DX, v)} y1={ciY} y2={ciY + 7} stroke={INK} strokeWidth={1.2} />
          ))}
        </Svg>
        {DX_TICKS.map((v) => (
          <div
            key={v}
            style={{
              position: "absolute",
              left: sx(DX, v),
              top: ciY + 14,
              transform: "translateX(-50%)",
              opacity: ease(frame, intervalAt + 4, 12),
              ...note(20, INK_SOFT),
            }}
          >
            {v === 0 ? "0" : `${v < 0 ? "−" : "+"}${Math.abs(v)}`}
          </div>
        ))}
        <Ink at={intervalAt} dur={12} style={{ left: 160, top: ciY - 22, whiteSpace: "nowrap" }}>
          <span style={label(24, INK)}>Lift, in points</span>
        </Ink>
        {/* The plausible lifts, and the interval read off their middle 95%. */}
        {rise > 0 ? (
          <Svg>
            <path d={curvePath(DX.lo, DX.hi, rise)} fill={RAW_BAR} />
            {leftLit > 0 ? <path d={curvePath(LO, LIFT, rise)} fill={STAT} opacity={0.7 * leftLit} /> : null}
            {rightLit > 0 ? <path d={curvePath(LIFT, HI, rise)} fill={STAT} opacity={0.7 * rightLit} /> : null}
          </Svg>
        ) : null}
        <Svg>
          {[
            { v: LO, at: oneAt },
            { v: HI, at: sixAt },
          ].map((e) => {
            const p = ease(frame, e.at - 6, 12);
            return p > 0 ? (
              <line key={e.v} x1={sx(DX, e.v)} x2={sx(DX, e.v)} y1={ciY} y2={ciY - HIST_TOP * p} stroke={STAT} strokeWidth={3} strokeDasharray="6 5" />
            ) : null;
          })}
          {ease(frame, dAt - 4, 12) > 0 ? (
            <line x1={sx(DX, LIFT)} x2={sx(DX, LIFT)} y1={ciY} y2={ciY - HIST_TOP * ease(frame, dAt - 4, 12)} stroke={STAT} strokeWidth={4} />
          ) : null}
        </Svg>
        <Note at={dAt} x={sx(DX, LIFT)} y={ciY - HIST_TOP - 34} from="up">
          <span style={{ ...note(24, STAT_INK), fontWeight: 700, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
            {pts(LIFT)} points
          </span>
        </Note>
        <Note at={plausiblyAt + 4} x={DX.x1 + 30} y={ciY - 70}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>plausible lifts</span>
          <div style={{ ...note(21, STAT_INK), fontWeight: 600, whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, sixAt, 10) }}>
            the middle 95%
          </div>
        </Note>
        {[
          { v: LO, at: oneAt },
          { v: HI, at: sixAt },
        ].map((e) => (
          <Note key={e.v} at={e.at} x={sx(DX, e.v)} y={ciY + 40} from="up">
            <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", background: PAPER, padding: "0 6px" }}>
              {pts(e.v)}
            </span>
          </Note>
        ))}
        {/* No lift at all: outside the interval, which is what the p-value says. */}
        <Dashed x0={sx(DX, 0)} y0={ciY} x1={sx(DX, 0)} y1={ciY - HIST_TOP} at={allAt - 6} dur={12} color={INK} width={2.4} />
        <Note at={allAt - 2} x={sx(DX, 0)} y={ciY - HIST_TOP - 34} from="up">
          <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>no lift</span>
        </Note>
        <Ring x={sx(DX, 0)} y={ciY - HIST_TOP / 2} at={allAt + 2} r0={20} r1={64} />

        {/* ── The three to report ── */}
        {trio.map((t, i) => (
          <Ink key={t.q} at={t.at - 4} dur={14} style={{ left: 160 + i * 560, top: y(TRIO_Y), whiteSpace: "nowrap" }}>
            <div style={label(22, INK_SOFT)}>{t.q}</div>
            <div style={{ ...note(30, INK), ...TABULAR, fontWeight: 700, marginTop: 8 }}>
              {t.a}
            </div>
          </Ink>
        ))}
        <div
          style={{
            position: "absolute",
            left: 160,
            top: y(TRIO_Y) - 18,
            width: 1600 * ease(frame, reportAt - 4, 18),
            height: 3,
            background: HIGHLIGHT,
          }}
        />
      </Drift>
      </div>
    </AbsoluteFill>
  );
};
