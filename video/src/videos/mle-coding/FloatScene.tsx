import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { MathRun } from "../../editorial/math";
import { label, note, svgText, TABULAR } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { bytes, FLOATS, pct } from "./data";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, Drift, Fade, INK, INK_SOFT, int, Line, Mark, Mono, OK_INK, VRule, X0 } from "./parts";

const R_X = 830;
/** The number line near a million: 0 to a quarter past it. */
const NL_X = 870;
const NL_W = 840;
const NL_MAX = 0.25;
const fmtNum = (v: number, digits: number) => v.toLocaleString("en-US", { maximumFractionDigits: digits });

/**
 * Question 6. Ten million embeddings of 128 as two blocks of memory, float32
 * half the height of float64 (FLOATS.bytes32, .bytes64). Then the price: a
 * float32 running total of 0.1, ten million times, counts up to 1,087,937
 * against the million it should be; near a million float32 values are a
 * sixteenth apart, so each 0.1 lands on an eighth. NumPy's pairwise sum and a
 * float64 total, both measured, and the rule.
 */
export const FloatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "Why do float thirty-two");
  const halvesAt = n.word("q6", "halves memory and bandwidth");
  const gpuAt = n.word("q6", "it's what GPUs run on");
  const tenMAt = n.word("q6", "Ten million embeddings");
  const fiveAt = n.word("q6", "about five gigabytes in float thirty-two");
  const tenAt = n.word("q6", "and ten in float sixty-four");
  const priceAt = n.word("q6-cost", "The price is precision");
  const sevenAt = n.word("q6-cost", "about seven significant digits");
  const addAt = n.word("q6-cost", "Add point one to a float thirty-two running total");
  const endsAt = n.word("q6-cost", "it ends at one million eighty-eight thousand");
  const highAt = n.word("q6-cost", "nine percent high");
  const nearAt = n.word("q6-cost", "Near a million");
  const eighthAt = n.word("q6-cost", "rounded to an eighth");
  const sumAt = n.word("q6-fix", "NumPy's own sum adds in pairs");
  const missesAt = n.word("q6-fix", "misses by only an eighth");
  const storeAt = n.word("q6-fix", "So store big arrays in float thirty-two");
  const keepAt = n.word("q6-fix", "keep long running totals in float sixty-four");
  const end = n.beat("q6-fix").to;

  // ── Memory: two blocks on one scale ──
  const base = y(812);
  const tall = h(320);
  const blocks = [
    { dtype: "float32", b: FLOATS.bytes32, at: fiveAt, x: X0 + 30 },
    { dtype: "float64", b: FLOATS.bytes64, at: tenAt, x: X0 + 290 },
  ];

  // ── The running total, counting up ──
  const countFrom = addAt + 6;
  const countTo = endsAt + 2;
  const c = ease(frame, countFrom, Math.max(20, countTo - countFrom));
  const total = Math.round(FLOATS.running32 * c);
  const done = frame >= countTo + 4;
  const eps = FLOATS.eps32;
  const epsExp = Math.floor(Math.log10(eps));
  const epsMant = (eps / 10 ** epsExp).toFixed(1);

  // ── The number line near a million ──
  const nlY = y(626);
  const px = (v: number) => NL_X + (v / NL_MAX) * NL_W;
  const ticks = Array.from({ length: Math.round(NL_MAX / FLOATS.spacingNearMillion) + 1 }, (_, i) => i * FLOATS.spacingNearMillion);
  const lineOn = ease(frame, nearAt, 16);
  const land = ease(frame, eighthAt + 2, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={fiveAt + 2} level={-31} />
      <Sfx name="el-pop" at={tenAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={countFrom} level={-37} />
      <Sfx name="el-tap" at={countTo + 2} level={-30} />
      <Sfx name="el-pencil" at={nearAt} level={-35} />
      <Sfx name="el-tap" at={eighthAt + 14} level={-31} />
      <Sfx name="el-tap" at={sumAt + 2} level={-33} />
      <Sfx name="el-chime" at={keepAt + 16} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why do <Mono>float32</Mono> vs <Mono>float64</Mono> matter for ML data?
        </QuestionCard>

        {/* ── Memory ── */}
        <Line at={halvesAt} x={X0} y={y(262)} size={24}>
          <Mono>float32</Mono>: half the memory and bandwidth
        </Line>
        <Line at={gpuAt} x={X0} y={y(262) + h(42)} size={24} color={INK_SOFT}>
          and what GPUs run on
        </Line>
        <Line at={tenMAt} x={X0} y={y(366)} size={24} color={INK_SOFT}>
          <Num>{int(FLOATS.embeddings / 1e6)}</Num> million embeddings × <Num>{FLOATS.dims}</Num> numbers
        </Line>
        {blocks.map((bl) => {
          const p = ease(frame, bl.at, 20);
          if (ease(frame, bl.at - 4, 8) <= 0) return null;
          const hh = (bl.b / FLOATS.bytes64) * tall;
          return (
            <React.Fragment key={bl.dtype}>
              <div style={{ position: "absolute", left: bl.x, top: base - hh * p, width: 170, height: hh * p, background: BAR, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: bl.x - 20, width: 210, top: base - hh - h(44), textAlign: "center", ...note(26, BLUE_INK), fontWeight: 600, opacity: ease(frame, bl.at + 10, 10), whiteSpace: "nowrap" }}>
                {bytes(bl.b)}
              </div>
              <div style={{ position: "absolute", left: bl.x - 20, width: 210, top: base + h(14), textAlign: "center", opacity: ease(frame, bl.at, 10) }}>
                <span style={{ ...label(23, INK) }}>
                  <Mono>{bl.dtype}</Mono>
                </span>
              </div>
            </React.Fragment>
          );
        })}

        <VRule x={R_X - 60} top={y(262)} bottom={y(880)} at={priceAt} />

        {/* ── The price: a running total ── */}
        <Line at={priceAt} x={R_X} y={y(262)} size={24}>
          The price: about <Mark at={sevenAt}>7 significant digits</Mark>
          <Fade at={sevenAt + 8}>
            <span style={{ color: INK_SOFT }}>
              {" "}(machine epsilon{" "}
              <MathRun>
                {epsMant} × 10<sup style={{ fontSize: "0.76em", verticalAlign: "0.45em", lineHeight: 0 }}>{epsExp < 0 ? `−${-epsExp}` : epsExp}</sup>
              </MathRun>
              )
            </span>
          </Fade>
        </Line>
        <Line at={addAt} x={R_X} y={y(334)} size={24} color={INK_SOFT}>
          A <Mono>float32</Mono> running total, + 0.1, <Num>{int(FLOATS.adds)}</Num> times
        </Line>
        <div style={{ position: "absolute", left: R_X, top: y(380), display: "flex", alignItems: "baseline", gap: 28, fontSize: 40, whiteSpace: "nowrap", opacity: ease(frame, countFrom - 4, 8) }}>
          <span style={{ ...note(40, done ? ACCENT_INK : INK), fontWeight: 600, ...TABULAR }}>{int(total)}</span>
        </div>
        <Line at={endsAt + 6} x={R_X} y={y(440)} size={24} color={INK_SOFT}>
          should be <Num>{int(FLOATS.adds * 0.1)}</Num>
          <Fade at={highAt}>
            <span style={{ color: ACCENT_INK, fontWeight: 600 }}>
              {": "}
              {pct(FLOATS.runningError)} high
            </span>
          </Fade>
        </Line>

        {/* ── Near a million, float32 steps a sixteenth ── */}
        <Line at={nearAt} x={R_X} y={y(500)} size={24}>
          Near a million, <Mono>float32</Mono> values sit <MathRun>1/16</MathRun> apart
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: lineOn }}>
          <line x1={NL_X} x2={NL_X + NL_W * lineOn} y1={nlY} y2={nlY} stroke={INK} strokeWidth={2} />
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <line x1={px(t)} x2={px(t)} y1={nlY - 10} y2={nlY + 10} stroke={INK} strokeWidth={2} opacity={ease(frame, nearAt + 4 + i * 2, 8)} />
              <text x={px(t)} y={nlY + 40} textAnchor="middle" style={svgText({ ...note(21, i === 2 && land > 0.5 ? ACCENT_INK : INK_SOFT), fontWeight: 500 })} opacity={ease(frame, nearAt + 6 + i * 2, 8)}>
                {i === 0 ? "1,000,000" : `+${t}`}
              </text>
            </React.Fragment>
          ))}
          {/* Where + 0.1 should land, and where float32 puts it. */}
          <circle cx={px(0.1)} cy={nlY} r={8} fill="var(--ds-white)" stroke={BAR} strokeWidth={2.5} opacity={ease(frame, eighthAt - 10, 8)} />
          <text x={px(0.1)} y={nlY - 24} textAnchor="middle" style={svgText({ ...note(21, BLUE_INK), fontWeight: 500 })} opacity={ease(frame, eighthAt - 10, 8)}>
            + 0.1
          </text>
          <circle cx={px(0.1) + (px(FLOATS.stepNearMillion) - px(0.1)) * land} cy={nlY} r={7} fill={ACCENT} opacity={land > 0 ? 1 : 0} />
        </svg>
        <Line at={eighthAt + 10} x={px(FLOATS.stepNearMillion) + 30} y={nlY - h(64)} size={23} color={ACCENT_INK}>
          lands on +<Num>{FLOATS.stepNearMillion}</Num>, an eighth
        </Line>

        {/* ── The fix ── */}
        <div style={{ position: "absolute", left: R_X, top: y(712), display: "flex", flexDirection: "column", gap: h(16), fontSize: 24 }}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, sumAt, 10) }}>
            NumPy&apos;s sum, adding in pairs:{" "}
            <span style={{ color: OK_INK, fontWeight: 600 }}>
              <Num>{fmtNum(FLOATS.pairwise32, 3)}</Num>
            </span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, missesAt, 10) }}>, off by an eighth</span>
          </span>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, keepAt, 10) }}>
            A <Mono>float64</Mono> running total:{" "}
            <span style={{ color: OK_INK, fontWeight: 600 }}>
              <Num>{fmtNum(FLOATS.running64, 4)}</Num>
            </span>
          </span>
        </div>
        <Line at={storeAt} x={R_X} y={y(836)} size={26} weight={600} color={OK_INK}>
          Store in <Mono color={OK_INK}>float32</Mono>
          <Fade at={keepAt}>
            , keep running totals in <Mono color={OK_INK}>float64</Mono>
          </Fade>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
