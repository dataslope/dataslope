import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SIDES } from "./data";
import { Arrow, curvePath, Drift, Head, Label, lerp, Mark, phi, pulse, STAT, STAT_INK, STAT_WASH, Svg } from "./parts";

const X: XScale = { lo: -4, hi: 4, x0: 300, x1: 1620 };
const BASE = 760;
const PEAK = 400;

/**
 * Where the 5% goes: split across both tails beyond 1.96, or spent in one
 * beyond 1.645, and why the side is chosen before the data is seen.
 */
export const SidesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const sidesFrom = n.beat("sides").from;
  const higherAt = n.word("sides", "Higher");
  const lowerAt = n.word("sides", "lower");
  const tailsAt = n.word("sides", "both tails");
  const halfAt = n.word("sides", "Two and a half");
  const beyondAt = n.word("sides", "beyond");
  const oneSidedAt = n.word("onesided", "one-sided");
  const allAt = n.word("onesided", "all five percent");
  const nearerAt = n.word("onesided", "nearer");
  const sixAt = n.word("onesided", "six");
  const easierAt = n.word("early", "easier");
  const chosenAt = n.word("early", "chosen");
  const dataAt = n.word("early", "data");
  const exactlyAt = n.word("coin-in", "exactly");
  const coinInFrom = n.beat("coin-in").from;

  const py = (v: number) => y(BASE) - h(PEAK) * (v / phi(0));
  const curve = ease(frame, sidesFrom - 4, 24);
  const twoIn = ease(frame, tailsAt - 4, 14);
  const lowerGone = ease(frame, oneSidedAt - 2, 16);
  // The upper cutoff slides in from 1.96 to 1.645.
  const slide = ease(frame, allAt - 2, 22);
  const cut = lerp(SIDES.two, SIDES.one, slide);
  const glowUp = pulse(frame, nearerAt - 2, 24);
  const dim = 1 - 0.55 * ease(frame, coinInFrom - 2, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the curve, both tails, the cutoff sliding in, the rule ── */}
      <Sfx name="el-pencil" at={sidesFrom - 4} level={-35} />
      <Sfx name="el-pop" at={tailsAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={allAt - 2} level={-33} />
      <Sfx name="el-tap" at={sixAt - 2} level={-29} />
      <Sfx name="el-pencil" at={chosenAt - 2} level={-35} />

      <Head a="Two tails," b="or one?" at={sidesFrom - 4} bAt={oneSidedAt - 6} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <Drift from={sidesFrom} to={coinInFrom + 40} scale={0.02} origin="50% 70%">
          <FigLabel n="5" title="The test statistic, if the null is true" at={sidesFrom} x={160} y={y(262)} />
          <Axis scale={X} base={y(BASE)} ticks={[-3, -2, -1, 0, 1, 2, 3]} format={(v) => (v < 0 ? `−${-v}` : String(v))} at={sidesFrom} />
          <Svg>
            {twoIn > 0 && lowerGone < 1 ? (
              <path d={curvePath(phi, X.lo, -SIDES.two, (v) => sx(X, v), py, y(BASE))} fill={STAT_WASH} opacity={twoIn * (1 - lowerGone)} />
            ) : null}
            {twoIn > 0 ? (
              <path d={curvePath(phi, cut, X.hi, (v) => sx(X, v), py, y(BASE))} fill={STAT_WASH} opacity={twoIn * (0.85 + 0.15 * glowUp)} />
            ) : null}
            <path
              d={curvePath(phi, X.lo, X.hi, (v) => sx(X, v), py)}
              fill="none"
              stroke={INK}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={`${curve} 1`}
            />
            {/* The cutoffs. */}
            {[-1, 1].map((s) => {
              const a = ease(frame, beyondAt - 2, 12) * (s < 0 ? 1 - lowerGone : 1);
              if (a <= 0) return null;
              const x = sx(X, s < 0 ? -SIDES.two : cut);
              return <line key={s} x1={x} x2={x} y1={y(BASE)} y2={py(phi(1.6)) - 40} stroke={STAT} strokeWidth={2.6} opacity={a} />;
            })}
            {/* Where the two-sided cutoff was, once it has moved. */}
            {slide > 0 ? (
              <line
                x1={sx(X, SIDES.two)}
                x2={sx(X, SIDES.two)}
                y1={y(BASE)}
                y2={py(phi(1.6)) - 40}
                stroke={STAT}
                strokeWidth={2}
                strokeDasharray="5 5"
                opacity={0.6 * slide}
              />
            ) : null}
          </Svg>
          {/* Higher or lower: both directions count. */}
          <Arrow from={[sx(X, 0.5), y(BASE) - h(PEAK) - 20]} to={[sx(X, 2.6), y(BASE) - h(PEAK) - 20]} at={higherAt - 4} color={INK_SOFT} width={2.4} out={oneSidedAt} />
          <Arrow from={[sx(X, -0.5), y(BASE) - h(PEAK) - 20]} to={[sx(X, -2.6), y(BASE) - h(PEAK) - 20]} at={lowerAt - 4} color={INK_SOFT} width={2.4} out={oneSidedAt} />
          <Note at={higherAt} x={sx(X, 2.7)} y={y(BASE) - h(PEAK) - 36} out={oneSidedAt}>
            <Label size={22} color={INK_SOFT}>
              higher
            </Label>
          </Note>
          <Note at={lowerAt} x={sx(X, -2.7)} y={y(BASE) - h(PEAK) - 36} align="right" out={oneSidedAt}>
            <Label size={22} color={INK_SOFT}>
              lower
            </Label>
          </Note>

          {/* The two-sided reading. */}
          {[-1, 1].map((s) => (
            <Note
              key={s}
              at={halfAt + (s > 0 ? 6 : 0)}
              x={sx(X, s * 3.05)}
              y={py(phi(2.4)) - 70}
              out={s < 0 ? oneSidedAt : allAt - 4}
            >
              <span style={{ ...note(30, STAT_INK), fontWeight: 700, ...halo, display: "inline-block", transform: "translateX(-50%)" }}>2.5%</span>
            </Note>
          ))}
          {[-1, 1].map((s) => (
            <div
              key={s}
              style={{
                position: "absolute",
                left: sx(X, s * SIDES.two),
                top: py(phi(1.6)) - 76,
                transform: "translateX(-50%)",
                opacity: ease(frame, beyondAt + 2, 12) * (s < 0 ? 1 - lowerGone : 1 - slide),
                ...note(24, STAT_INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
                ...halo,
              }}
            >
              {s < 0 ? "−" : ""}
              {fmt(SIDES.two, 2)}
            </div>
          ))}

          {/* The one-sided reading. */}
          <Note at={allAt + 6} x={sx(X, 3.05)} y={py(phi(2.4)) - 70}>
            <span style={{ ...note(30, STAT_INK), fontWeight: 700, ...halo, display: "inline-block", transform: "translateX(-50%)" }}>5%</span>
          </Note>
          <div
            style={{
              position: "absolute",
              left: sx(X, SIDES.one),
              top: py(phi(1.6)) - 76,
              transform: `translateX(-50%) scale(${1 + 0.2 * glowUp})`,
              opacity: ease(frame, sixAt - 4, 12),
              ...note(24, STAT_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              ...halo,
            }}
          >
            {fmt(SIDES.one, 3)}
          </div>
          <Arrow
            from={[sx(X, SIDES.two) - 6, py(phi(1.6)) - 18]}
            to={[sx(X, SIDES.one) + 8, py(phi(1.6)) - 18]}
            at={nearerAt - 2}
            dur={12}
            color={STAT}
            width={2.4}
          />
        </Drift>
        <Ink at={easierAt - 4} dur={16} style={{ left: 160, top: y(820), whiteSpace: "nowrap" }}>
          <span style={{ ...body(36, true), color: INK }}>
            A nearer cutoff is <Mark at={easierAt + 4}>an easier bar to clear</Mark>,
          </span>
        </Ink>
        <Ink at={chosenAt - 4} dur={18} style={{ left: 160, top: y(820) + 50, whiteSpace: "nowrap" }}>
          <span style={{ ...body(36, true), color: INK }}>
            so the side is <Mark at={dataAt - 2}>chosen before you see the data.</Mark>
          </span>
        </Ink>
      </div>
      <Ink at={exactlyAt - 8} dur={16} style={{ left: 1180, top: y(300), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: STAT_INK }}>And what is that 3%, exactly?</span>
      </Ink>
    </AbsoluteFill>
  );
};
