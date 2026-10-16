import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, OUTLIERS } from "./data";
import { Bracket, DATA, Drift, Mark, Pulse, Spot, STAT, STAT_INK, Svg, Tag } from "./parts";

const X: XScale = { lo: 0, hi: 210, x0: 200, x1: 1720 };
const STRIP = 520;
const AXIS = 610;
const JIT = 46;
const R = 5.5;
const CARDS = 720;
const JIT_Y = jitter(73, OUTLIERS.values.length);

/** The lesson's three kinds of outlier, and what each one calls for. */
const KINDS = [
  { word: "error", egWord: "typo", title: "An error", eg: "a typo, a unit mix-up", act: "Fix it, or drop it and say why" },
  { word: "placeholder", egWord: "minus nine", title: "A placeholder", eg: "−999 standing for missing", act: "Treat it as missing" },
  { word: "real", egWord: "biggest customer", title: "Something real", eg: "your biggest customer, a fraud", act: "Keep it, and use robust statistics" },
] as const;

/**
 * Part 3, third scene: what an outlier is (far away, nothing more), its three
 * kinds, and the lesson's two flagging rules disagreeing on two hundred
 * skewed incomes: six flagged by the box-plot fences, two by the z-score.
 */
export const OutlierScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const outlierFrom = n.beat("outlier").from;
  const farAt = n.word("outlier", "far");
  const allAt = n.word("outlier", "all");
  const kindAt = KINDS.map((k) => n.word("kinds", k.word));
  const egAt = KINDS.map((k) => n.word("kinds", k.egWord));
  const fraudAt = n.word("kinds", "fraud");
  const sixOfAt = n.word("ordinary", "six");
  const longTailAt = n.word("ordinary", "long tail");
  const surestAt = n.word("plot-in", "surest");
  const flagFrom = n.beat("flag").from;
  const twoHundredAt = n.word("flag", "two hundred");
  const genuineAt = n.word("flag", "genuine");
  const fencesAt = n.word("flag", "box-plot fences");
  const sixAt = n.word("flag", "six");
  const zAt = n.word("flag", "z-score");
  const twoAt = n.word("flag", "just two");
  const ordinaryAt = n.word("ordinary", "ordinary");
  const fourAt = n.word("ordinary", "Four");
  const verdictFrom = n.beat("verdict").from;
  const questionAt = n.word("verdict", "question");
  const notVerdictAt = n.word("verdict", "not a verdict");
  const whyAt = n.word("verdict", "why");
  const decideAt = n.word("verdict", "decide");
  const lookAt = n.word("plot-in", "look");

  const strip = y(STRIP);
  const base = y(AXIS);
  const planted = new Set(OUTLIERS.planted);
  const fenceX = sx(X, OUTLIERS.upper);
  const zX = sx(X, OUTLIERS.zCut);
  const fence = ease(frame, fencesAt - 4, 16);
  const zLine = ease(frame, zAt - 4, 16);
  const tailBand = ease(frame, longTailAt - 4, 16);
  const cardsOut = ease(frame, flagFrom - 6, 14) * (1 - ease(frame, decideAt - 8, 14));
  const acts = ease(frame, decideAt - 6, 16);

  const ySpread = (i: number) => strip + (JIT_Y[i] - 0.5) * 2 * JIT;
  const at = (v: number) => OUTLIERS.values.indexOf(v);

  return (
    <AbsoluteFill>
      {/* ── Sound: the incomes, the kinds, the two rules' flags ── */}
      <Sfx name="el-sprinkle" at={outlierFrom} level={-34} />
      <Sfx name="el-pop" at={kindAt[0] - 4} level={-31} />
      <Sfx name="el-pencil" at={fencesAt - 4} level={-33} />
      <Sfx name="el-pencil" at={zAt - 4} level={-33} />
      <Sfx name="el-tap" at={twoAt - 2} level={-28} />
      <Sfx name="el-pop" at={decideAt - 6} level={-30} />

      {/* ── Headlines ── */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={outlierFrom - 4} dur={20} out={verdictFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          An outlier is far away.
        </Ink>
        <Ink at={allAt - 4} dur={18} out={verdictFrom - 6} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          Nothing more.
        </Ink>
      </div>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={verdictFrom - 2} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          A flag is a <Mark at={questionAt - 2}>question</Mark>,
        </Ink>
        <Ink at={notVerdictAt - 4} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          not a verdict.
        </Ink>
      </div>

      <Spot id="describing-data-magnifier" at={lookAt - 6} left={1620} top={y(100)} width={200} height={203} />

      <FigLabel n="10" title="Two hundred skewed incomes, and two genuine high earners" at={outlierFrom} x={160} y={y(330)} />

      <Drift from={outlierFrom} to={lookAt + 40} scale={0.018} origin={[960, base]}>
        {/* The four flags that are only the long tail. */}
        {tailBand > 0 ? (
          <Svg opacity={tailBand}>
            <rect x={fenceX} y={strip - JIT - 18} width={(zX - fenceX) * tailBand} height={2 * JIT + 36} fill={HIGHLIGHT} opacity={0.5} />
          </Svg>
        ) : null}

        {/* The two rules' cut-offs. */}
        {fence > 0 ? (
          <Svg>
            <line x1={fenceX} x2={fenceX} y1={base} y2={base - (base - (strip - JIT - 40)) * fence} stroke={INK} strokeWidth={2.4} strokeDasharray="8 6" />
          </Svg>
        ) : null}
        <Tag x={fenceX} y={strip - JIT - 76} opacity={ease(frame, fencesAt, 12)} size={21} bold>
          box-plot fence, {fmt(OUTLIERS.upper, 1)}
        </Tag>
        {zLine > 0 ? (
          <Svg>
            <line x1={zX} x2={zX} y1={base} y2={base - (base - (strip - JIT - 40)) * zLine} stroke={STAT} strokeWidth={2.4} strokeDasharray="8 6" />
          </Svg>
        ) : null}
        <Tag x={zX + 6} y={strip - JIT - 76} opacity={ease(frame, zAt, 12)} color={STAT_INK} size={21} bold align="left">
          z of 3, at {fmt(OUTLIERS.zCut, 1)}
        </Tag>

        {/* The incomes. */}
        <Svg>
          {OUTLIERS.values.map((v, i) => {
            const a = planted.has(v) ? ease(frame, genuineAt - 4 + (v === 200 ? 4 : 0), 10) : ease(frame, outlierFrom + (i / OUTLIERS.values.length) * 26, 8);
            if (a <= 0) return null;
            return <circle key={i} cx={sx(X, v)} cy={ySpread(i)} r={R * (planted.has(v) ? 1.3 : 1)} fill={DATA} opacity={0.78 * a} stroke={PAPER} strokeWidth={1} />;
          })}
          {/* Rings: the fences' six in ink, the z-score's two in red. */}
          {OUTLIERS.iqrFlagged.map((v, k) => {
            const p = ease(frame, sixAt - 6 + k * 3, 8);
            return p > 0 ? <circle key={`i${k}`} cx={sx(X, v)} cy={ySpread(at(v))} r={(R + 7) * p} fill="none" stroke={INK} strokeWidth={2.2} /> : null;
          })}
          {OUTLIERS.zFlagged.map((v, k) => {
            const p = ease(frame, twoAt - 4 + k * 4, 8);
            return p > 0 ? <circle key={`z${k}`} cx={sx(X, v)} cy={ySpread(at(v))} r={(R + 13) * p} fill="none" stroke={STAT} strokeWidth={2.6} /> : null;
          })}
        </Svg>
        <Axis scale={X} base={base} ticks={[0, 50, 100, 150, 200]} at={outlierFrom} />
        <Pulse x={sx(X, 200)} y={ySpread(at(200))} at={farAt - 2} color={DATA} r={7} />
        <Pulse x={sx(X, 200)} y={ySpread(at(200))} at={kindAt[2] - 2} color={DATA} r={7} />
        {OUTLIERS.iqrFlagged.map((v, k) => (
          <Pulse key={v} x={sx(X, v)} y={ySpread(at(v))} at={sixOfAt - 2 + k * 2} color={INK} r={R + 6} />
        ))}
        {OUTLIERS.iqrFlagged.map((v, k) => (
          <Pulse key={`s${v}`} x={sx(X, v)} y={ySpread(at(v))} at={surestAt + k * 2} color={STAT} r={R + 6} />
        ))}
        {OUTLIERS.iqrFlagged
          .filter((v) => !planted.has(v))
          .map((v, k) => (
            <Pulse key={`f${v}`} x={sx(X, v)} y={ySpread(at(v))} at={fourAt + k * 3} color={INK} r={R + 6} />
          ))}

        {/* The bulk: two hundred draws from one skewed distribution. */}
        <Bracket x0={sx(X, 5)} x1={sx(X, 40)} y={strip - JIT - 14} at={twoHundredAt - 4} out={fencesAt - 4} up />
        <Tag x={sx(X, 5)} y={strip - JIT - 58} opacity={ease(frame, twoHundredAt, 12) * (1 - ease(frame, fencesAt - 4, 10))} size={21} align="left">
          200 skewed incomes
        </Tag>

        {/* The counts. */}
        <Tag x={fenceX - 12} y={strip + JIT + 26} opacity={ease(frame, sixAt, 12)} size={22} bold align="right">
          fences: {OUTLIERS.iqrFlags} flagged
        </Tag>
        <Tag x={sx(X, 160)} y={strip + JIT + 26} opacity={ease(frame, twoAt + 2, 12)} color={STAT_INK} size={22} bold>
          z-score: {OUTLIERS.zFlags} flagged
        </Tag>
        <Tag x={(fenceX + zX) / 2} y={strip + JIT + 26} opacity={ease(frame, ordinaryAt - 2, 12)} color={INK} size={21}>
          {OUTLIERS.tailFlags} from the ordinary tail
        </Tag>
      </Drift>

      {/* ── The three kinds, then what each one calls for ── */}
      {KINDS.map((k, i) => {
        const p = ease(frame, kindAt[i] - 6, 14);
        const shown = Math.max(p * (1 - cardsOut), acts);
        if (shown <= 0) return null;
        const left = 160 + i * 560;
        return (
          <div
            key={k.word}
            style={{
              position: "absolute",
              left,
              top: y(CARDS),
              width: 500,
              opacity: shown,
              transform: `translateY(${(1 - shown) * 16}px)`,
              borderTop: `2px solid ${HAIRLINE}`,
              paddingTop: 16,
            }}
          >
            <div style={{ ...label(26, INK), fontWeight: 700 }}>{k.title}</div>
            <div style={{ ...body(28), color: INK_SOFT, marginTop: 8, whiteSpace: "nowrap", opacity: Math.max(ease(frame, egAt[i] - 4, 12), acts) }}>
              {i === 2 ? (
                <>
                  your biggest customer, <Mark at={fraudAt - 2}>a fraud</Mark>
                </>
              ) : (
                k.eg
              )}
            </div>
            <div style={{ ...note(24, STAT_INK), fontWeight: 650, marginTop: 14, opacity: ease(frame, decideAt - 6 + i * 6, 12), whiteSpace: "nowrap", ...halo }}>
              {k.act}
            </div>
          </div>
        );
      })}
      <Ink at={whyAt - 4} dur={16} style={{ left: 160, top: y(CARDS) - 56, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT) }}>First find out which it is</span>
      </Ink>
    </AbsoluteFill>
  );
};
