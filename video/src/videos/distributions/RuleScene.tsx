import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { normalPdf, RULE } from "./data";
import { ASK, ASK_FILL, ASK_INK, areaD, askNote, Centered, Count, Curve, curveD, DIST, Drift, Head, lerp, pulse, Svg } from "./parts";

/** Standard deviations from the mean, -4 to 4. */
const X: XScale = { lo: -4, hi: 4, x0: 260, x1: 1660 };
const BASE = 660;
const TALL = 260;
const SCORE_Y = 760;
/** Each band's bracket height, widest highest. */
const BRACKET_Y = [380, 340, 300];

/**
 * Part 3, second scene: the empirical rule as three nested bands, each swept
 * out from the mean as it is named and counted to its exact share; then the
 * same rule on test scores with a mean of 100 and a spread of 15, and how
 * rare 145 is.
 */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const ruleFrom = n.beat("rule").from;
  const sixtyAt = n.word("rule", "sixty-eight");
  const oneAt = n.word("rule", "one standard deviation");
  const ninetyFiveAt = n.word("two", "Ninety-five");
  const withinTwoAt = n.word("two", "within two");
  const ninetyNineAt = n.word("two", "ninety-nine point seven");
  const threeAt = n.word("two", "three");
  const scoresAt = n.word("scores", "test scores");
  const hundredAt = n.word("scores", "a hundred", { nth: 1 });
  const fifteenAt = n.word("scores", "fifteen");
  const landAt = n.word("scores", "ninety-five percent");
  const seventyAt = n.word("scores", "seventy");
  const thirtyAt = n.word("scores", "a hundred and thirty");
  const fortyFiveAt = n.word("rare", "a hundred and forty-five");
  const rareAt = n.word("rare", "rare");
  const measuredAt = n.word("z-in", "standard deviations");

  const base = y(BASE);
  const unit = h(TALL) / normalPdf(0, 0, 1);
  const pdf = (v: number) => normalPdf(v, 0, 1);
  const py = (v: number) => base - v * unit;
  const BANDS = [
    { k: 1, at: oneAt - 8, count: sixtyAt },
    { k: 2, at: withinTwoAt - 6, count: ninetyFiveAt },
    { k: 3, at: threeAt - 6, count: ninetyNineAt },
  ];
  const ninetyFiveGlow = pulse(frame, landAt - 4, 24) + pulse(frame, thirtyAt, 24);
  const sigmaGlow = pulse(frame, measuredAt - 6, 24);
  const scoreAxis = ease(frame, scoresAt - 6, 16);
  const tailIn = ease(frame, fortyFiveAt - 2, 12);
  const marker = pop(frame, fortyFiveAt - 2, fps, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: each band sweeping out, the scores' ruler, 145 ── */}
      {BANDS.map((b) => (
        <Sfx key={b.k} name="el-whoosh" at={b.at} level={-34} />
      ))}
      <Sfx name="el-tap" at={seventyAt - 2} level={-29} />
      <Sfx name="el-tap" at={thirtyAt - 2} level={-29} />
      <Sfx name="el-pop" at={fortyFiveAt - 2} level={-30} />

      <Head
        parts={[
          { text: "68,", at: sixtyAt - 6 },
          { text: "95,", at: ninetyFiveAt - 6 },
          { text: "99.7.", at: ninetyNineAt - 6, italic: true, color: INK },
        ]}
      />

      <Drift from={ruleFrom} to={n.beat("z-in").to + 40} origin="50% 45%">
        {/* The bands, widest underneath, each sweeping out from the mean. */}
        <Svg>
          {[...BANDS].reverse().map((b) => {
            const p = ease(frame, b.at, 22);
            if (p <= 0) return null;
            const glow = b.k === 2 ? ninetyFiveGlow : 0;
            return (
              <path
                key={b.k}
                d={areaD(pdf, -b.k * p, b.k * p, X, py)}
                fill={glow > 0 ? `color-mix(in srgb, ${ASK} ${18 + glow * 22}%, transparent)` : `color-mix(in srgb, ${DIST} 17%, transparent)`}
              />
            );
          })}
          {/* The tail beyond three, and 145 on it. */}
          <path d={areaD(pdf, 3, 4, X, py)} fill={ASK_FILL} opacity={tailIn} />
          <line x1={X.x0} x2={X.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} opacity={ease(frame, ruleFrom - 6, 14)} />
          {[-3, -2, -1, 1, 2, 3].map((k) => (
            <line
              key={k}
              x1={sx(X, k)}
              x2={sx(X, k)}
              y1={base}
              y2={py(pdf(k))}
              stroke={INK}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.5 * ease(frame, BANDS[Math.abs(k) - 1].at + 10, 12)}
            />
          ))}
        </Svg>
        <Curve d={curveD(pdf, -4, 4, X, py)} at={ruleFrom - 6} dur={24} />

        {/* The brackets and their shares. */}
        {BANDS.map((b, i) => {
          const p = ease(frame, b.at + 8, 14);
          if (p <= 0) return null;
          const yy = y(BRACKET_Y[i]);
          const x0 = lerp(sx(X, 0), sx(X, -b.k), p);
          const x1 = lerp(sx(X, 0), sx(X, b.k), p);
          return (
            <React.Fragment key={b.k}>
              <Svg>
                <path d={`M${x0},${yy + 10} L${x0},${yy} L${x1},${yy} L${x1},${yy + 10}`} fill="none" stroke={INK} strokeWidth={1.8} />
              </Svg>
              <div style={{ position: "absolute", left: sx(X, b.k) + 14, top: yy - 16, ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
                <Count at={b.at + 4} dur={18} to={RULE.within[i]} digits={2} suffix="%" />
              </div>
            </React.Fragment>
          );
        })}

        {/* Standard deviations from the mean. */}
        <Svg opacity={ease(frame, ruleFrom, 14)}>
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <text
              key={k}
              x={sx(X, k)}
              y={base + 30}
              textAnchor="middle"
              style={{
                fontFamily: SANS,
                fontSize: 22 + sigmaGlow * 3,
                fontWeight: 600,
                fill: sigmaGlow > 0.1 ? ASK_INK : INK_SOFT,
              }}
            >
              {k === 0 ? "mean" : `${k > 0 ? "+" : "−"}${Math.abs(k)} SD`}
            </text>
          ))}
        </Svg>

        {/* The same ruler on test scores. */}
        <Svg opacity={scoreAxis}>
          <line x1={X.x0} x2={X.x1} y1={y(SCORE_Y)} y2={y(SCORE_Y)} stroke={INK} strokeWidth={1.4} />
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <line key={k} x1={sx(X, k)} x2={sx(X, k)} y1={y(SCORE_Y)} y2={y(SCORE_Y) + 7} stroke={INK} strokeWidth={1.2} />
          ))}
        </Svg>
        <div style={{ position: "absolute", left: 96, top: y(SCORE_Y) - 14, opacity: scoreAxis, ...label(21, INK_SOFT) }}>Test scores</div>
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => {
          const v = RULE.mu + k * RULE.sigma;
          const at = k === 0 ? hundredAt : fifteenAt + Math.abs(k) * 3;
          const red = (k === -2 && frame >= seventyAt - 2) || (k === 2 && frame >= thirtyAt - 2) || (k === 3 && frame >= fortyFiveAt - 2);
          return (
            <Centered key={k} x={sx(X, k)} y={y(SCORE_Y) + 12} opacity={ease(frame, at - 2, 10)} style={red ? askNote(26) : { ...note(24, INK), fontWeight: 600 }}>
              {v}
            </Centered>
          );
        })}
        <Note at={thirtyAt + 6} x={sx(X, 0)} y={y(SCORE_Y) + 54} style={{ transform: "translateX(-50%)" }}>
          <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>
            {RULE.mu - 2 * RULE.sigma} to {RULE.mu + 2 * RULE.sigma}: {fmt(RULE.within[1], 0)}% of scores
          </span>
        </Note>
        {marker > 0.01 ? (
          <Svg>
            <circle cx={sx(X, 3)} cy={py(pdf(3)) - 2} r={7 * Math.min(1.1, marker)} fill={ASK} />
          </Svg>
        ) : null}
        <Note at={rareAt - 6} x={sx(X, 3) + 18} y={py(pdf(3)) - h(64)}>
          <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>
            above {RULE.rare}: {fmt(RULE.aboveRare, 2)}%
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
