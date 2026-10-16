import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CI, RATES } from "./data";
import { DATA, DATA_INK, Drift, Headline, lerp, Marker, Ring, STAT, STAT_INK, Svg } from "./parts";

/** Conversion, 0 to 5%. */
const RX: XScale = { lo: 0, hi: 0.05, x0: 420, x1: 1300 };
const BAR_Y = [330, 410];
const BAR_H = 50;
/** The two ways to say it, beside the bars. */
const SAY_X = 1480;
/** d, 0 to 0.8, for the interval. */
const DX: XScale = { lo: 0, hi: 0.8, x0: 420, x1: 1300 };
const CI_Y = 730;
const TRIO_Y = 838;

/**
 * Two ways to say the size of a lift in a rate, then an effect size with its
 * interval, and the three numbers to report together.
 */
export const RatesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
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
  const plausiblyAt = n.word("interval", "plausibly");
  const anywhereAt = n.word("interval", "anywhere");
  const biggerAt = n.word("both", "bigger");
  const bothAt = n.word("both", "Report both");
  const intervalAt = n.word("interval", "interval");
  const dAt = n.word("interval", "zero point three six");
  const oneAt = n.word("interval", "zero point one");
  const sixAt = n.word("interval", "zero point six");
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
  const ci = ease(frame, plausiblyAt - 4, Math.max(10, oneAt - plausiblyAt + 4));
  const ciY = y(CI_Y);
  const trio = [
    { q: "How big", a: `d = ${fmt(CI.d, 2)}`, at: bigAt },
    { q: "How precise", a: `${fmt(CI.lo, 2)} to ${fmt(CI.hi, 2)}`, at: preciseAt },
    { q: "Is it there at all", a: "the p-value", at: allAt },
  ];

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

      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.5 * ease(frame, everyAt - 4, 16) }}>
        <FigLabel n="4" title="Conversion, old checkout button and new" at={from - 4} x={160} y={y(268)} />
        {/* Gridlines at each percent. */}
        <Svg opacity={ease(frame, from, 14)}>
          {[0, 0.01, 0.02, 0.03, 0.04, 0.05].map((v) => (
            <line
              key={v}
              x1={sx(RX, v)}
              x2={sx(RX, v)}
              y1={y(BAR_Y[0]) - 44}
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
        <Svg opacity={ease(frame, readerAt - 4, 12)}>
          <path
            d={`M${SAY_X - 22},${y(BAR_Y[0]) - 24} L${SAY_X - 34},${y(BAR_Y[0]) - 24} L${SAY_X - 34},${y(BAR_Y[1]) + 76} L${SAY_X - 22},${y(BAR_Y[1]) + 76}`}
            fill="none"
            stroke={INK}
            strokeWidth={2.2}
          />
        </Svg>
        <Note at={bothAt - 2} x={SAY_X} y={y(BAR_Y[1]) + 104}>
          <span style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>
            <Marker at={bothAt + 4}>report both</Marker>
          </span>
        </Note>
      </div>

      {/* ── The effect size with its interval ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.45 * ease(frame, butAt - 4, 18) }}>
      <Drift from={reportAt} to={n.beat("part2-in").to + 40} amount={0.02} origin={[960, 760]}>
        <FigLabel n="5" title="An effect size and its 95% interval" at={sizeAt - 4} x={160} y={y(612)} />
        <Svg opacity={ease(frame, intervalAt, 14)}>
          <line x1={DX.x0} x2={DX.x1} y1={ciY + 0.5} y2={ciY + 0.5} stroke={INK} strokeWidth={1.6} />
          {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
            <line key={v} x1={sx(DX, v)} x2={sx(DX, v)} y1={ciY} y2={ciY + 7} stroke={INK} strokeWidth={1.2} />
          ))}
        </Svg>
        {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
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
            {fmt(v, 1)}
          </div>
        ))}
        <Ink at={intervalAt} dur={12} style={{ left: 160, top: ciY - 22, whiteSpace: "nowrap" }}>
          <span style={label(24, INK)}>Cohen&apos;s d</span>
        </Ink>
        <Svg>
          {ci > 0 ? (
            <line
              x1={lerp(sx(DX, CI.d), sx(DX, CI.lo), ci)}
              x2={lerp(sx(DX, CI.d), sx(DX, CI.hi), ease(frame, anywhereAt - 4, Math.max(10, sixAt - anywhereAt + 4)))}
              y1={ciY - 34}
              y2={ciY - 34}
              stroke={STAT}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.55}
            />
          ) : null}
          {ease(frame, dAt - 4, 8) > 0 ? (
            <circle cx={sx(DX, CI.d)} cy={ciY - 34} r={12 * ease(frame, dAt - 4, 8)} fill={STAT} stroke={PAPER} strokeWidth={2} />
          ) : null}
        </Svg>
        <Note at={dAt} x={sx(DX, CI.d)} y={ciY - 92} from="up">
          <span style={{ ...note(24, STAT_INK), fontWeight: 700, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
            {fmt(CI.d, 2)}
          </span>
        </Note>
        {[
          { v: CI.lo, at: oneAt },
          { v: CI.hi, at: sixAt },
        ].map((e) => (
          <Note key={e.v} at={e.at} x={sx(DX, e.v)} y={ciY - 84} from="up">
            <span style={{ ...note(21, STAT_INK), fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
              {fmt(e.v, 2)}
            </span>
          </Note>
        ))}

        {/* ── The three to report ── */}
        {trio.map((t, i) => (
          <Ink key={t.q} at={t.at - 4} dur={14} style={{ left: 160 + i * 560, top: y(TRIO_Y), whiteSpace: "nowrap" }}>
            <div style={label(22, INK_SOFT)}>{t.q}</div>
            <div style={{ ...note(30, INK), fontWeight: 700, marginTop: 8 }}>
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
