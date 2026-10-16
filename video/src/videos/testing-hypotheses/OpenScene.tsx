import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HIGHLIGHT, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHECKOUT } from "./data";
import { Bracket, DATA, DATA_WASH, Head, Kicker, Label, lerp, Mark, pulse, RAW, STAT, STAT_INK, Svg } from "./parts";

/** The schematic effect axis: no numbers but zero. */
const E: XScale = { lo: -2, hi: 4, x0: 260, x1: 1660 };
const E_BASE = 620;
const CI = [0.45, 2.65] as const;
/** The conversion bars, in percent. */
const C: XScale = { lo: 0, hi: 12, x0: 480, x1: 1700 };
const OLD_Y = 470;
const NEW_Y = 590;
const BAR_H = 64;

/**
 * Part 1 opens on Unit 6's bridge: an interval gives the plausible values, a
 * test asks about one of them, usually zero. Then the lesson's checkout
 * example, and the question a test answers.
 */
export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const intervalAt = n.word("hook", "interval");
  const plausibleAt = n.word("hook", "plausible");
  const oneAt = n.word("hook", "one value");
  const zeroAt = n.word("hook", "zero");
  const checkoutFrom = n.beat("checkout").from;
  const elevenAt = n.word("checkout", "eleven");
  const tenAt = n.word("checkout", "ten");
  const noiseAt = n.word("free", "noise");
  const questionAt = n.word("free", "question");
  const noDiffAt = n.word("free", "no difference");
  const howAt = n.word("free", "how often");
  const bigAt = n.word("free", "this big");

  // The interval figure leaves as the checkout bars arrive.
  const leave = ease(frame, checkoutFrom - 10, 16);
  // The pin: it lands inside the interval on "one value", then slides to zero.
  const pinIn = ease(frame, oneAt - 4, 12);
  const toZero = ease(frame, zeroAt - 10, 18);
  const pinV = lerp(1.6, 0, toZero);
  const pinX = sx(E, pinV);
  const zeroGlow = pulse(frame, zeroAt, 26);

  const oldW = sx(C, CHECKOUT.oldRate * ease(frame, tenAt - 4, 18)) - C.x0;
  const newW = sx(C, CHECKOUT.newRate * ease(frame, elevenAt - 4, 18)) - C.x0;
  const ghost = ease(frame, noDiffAt - 4, 14);
  const gapGlow = ease(frame, bigAt - 6, 10);
  const gapPulse = pulse(frame, bigAt + 4, 24);
  const oldEnd = sx(C, CHECKOUT.oldRate);
  const newEnd = sx(C, CHECKOUT.newRate);

  return (
    <AbsoluteFill>
      {/* ── Sound: the interval, the pin, the two bars, the dashed line ── */}
      <Sfx name="el-pencil" at={intervalAt - 2} level={-34} />
      <Sfx name="el-pop" at={oneAt - 4} level={-30} />
      <Sfx name="el-tap" at={elevenAt - 4} level={-28} />
      <Sfx name="el-tap" at={tenAt - 4} level={-29} />
      <Sfx name="el-pencil" at={noDiffAt - 4} level={-35} />

      <Kicker at={hookFrom - 10}>The logic of a test</Kicker>
      <Head a="One value in particular." b="Could it be zero?" at={hookFrom - 6} bAt={zeroAt - 6} out={noiseAt - 8} />
      <Head a="Noise makes gaps" b="for free." at={noiseAt - 4} bAt={noiseAt + 10} />

      {/* ── Fig. 1: the interval, then the one value a test asks about ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - leave, transform: `translateX(${-leave * 60}px)` }}>
        <FigLabel n="1" title="What an interval says, and what a test asks" at={hookFrom} x={160} y={y(330)} />
        <Svg opacity={ease(frame, hookFrom + 2, 14)}>
          <line x1={E.x0} x2={E.x1} y1={y(E_BASE)} y2={y(E_BASE)} stroke={INK} strokeWidth={1.6} />
        </Svg>
        <Note at={hookFrom + 6} x={E.x1} y={y(E_BASE) + 18} align="right">
          <Label size={21} color={INK_SOFT}>
            the effect
          </Label>
        </Note>
        {/* The interval: a band of plausible values. */}
        <Svg opacity={ease(frame, intervalAt - 2, 12)}>
          <rect
            x={sx(E, CI[0])}
            y={y(E_BASE) - h(70)}
            width={(sx(E, CI[1]) - sx(E, CI[0])) * ease(frame, intervalAt - 2, 20)}
            height={h(70)}
            fill={DATA_WASH}
          />
        </Svg>
        <Bracket x0={sx(E, CI[0])} x1={sx(E, CI[1])} y={y(E_BASE) - h(92)} at={intervalAt} color={DATA} width={3} />
        <Note at={plausibleAt - 2} x={(sx(E, CI[0]) + sx(E, CI[1])) / 2} y={y(E_BASE) - h(92) - 50} from="up">
          <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
            <Label size={24} color="var(--ds-blue-ink)">
              plausible values
            </Label>
          </span>
        </Note>
        {/* Zero, the value a test usually asks about. */}
        <Svg opacity={ease(frame, hookFrom + 4, 14)}>
          <line x1={sx(E, 0)} x2={sx(E, 0)} y1={y(E_BASE) - 6} y2={y(E_BASE) + 8} stroke={INK} strokeWidth={2} />
        </Svg>
        <div
          style={{
            position: "absolute",
            left: sx(E, 0),
            top: y(E_BASE) + 18,
            transform: `translateX(-50%) scale(${1 + 0.25 * zeroGlow})`,
            opacity: ease(frame, hookFrom + 4, 14),
          }}
        >
          <Label size={26} color={zeroGlow > 0.05 ? STAT_INK : INK}>
            0
          </Label>
        </div>
        {pinIn > 0 ? (
          <Svg>
            <line
              x1={pinX}
              x2={pinX}
              y1={y(E_BASE)}
              y2={y(E_BASE) - h(150) * pinIn}
              stroke={STAT}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle cx={pinX} cy={y(E_BASE) - h(150) * pinIn} r={11 + 4 * zeroGlow} fill={STAT} stroke={PAPER} strokeWidth={2} />
          </Svg>
        ) : null}
        <Note at={zeroAt + 4} x={sx(E, 0) - 24} y={y(E_BASE) - h(150) - 18} align="right">
          <Label size={24} color={STAT_INK}>
            no effect at all?
          </Label>
        </Note>
      </div>

      {/* ── Fig. 2: the checkout, old and new ── */}
      <FigLabel n="2" title="Conversion rate, old checkout and new" at={checkoutFrom - 4} x={160} y={y(330)} />
      <Ink at={tenAt - 6} dur={12} style={{ left: 160, top: y(OLD_Y) - 16, whiteSpace: "nowrap" }}>
        <Label size={26}>Old checkout</Label>
      </Ink>
      <Ink at={elevenAt - 6} dur={12} style={{ left: 160, top: y(NEW_Y) - 16, whiteSpace: "nowrap" }}>
        <Label size={26}>New checkout</Label>
      </Ink>
      <Svg>
        {oldW > 0 ? <rect x={C.x0} y={y(OLD_Y) - h(BAR_H) / 2} width={oldW} height={h(BAR_H)} fill={RAW} /> : null}
        {newW > 0 ? <rect x={C.x0} y={y(NEW_Y) - h(BAR_H) / 2} width={newW} height={h(BAR_H)} fill={DATA} /> : null}
        {/* The part of the new bar that is the gap. */}
        {gapGlow > 0 ? (
          <rect
            x={oldEnd}
            y={y(NEW_Y) - h(BAR_H) / 2 - 4 * gapPulse}
            width={newEnd - oldEnd}
            height={h(BAR_H) + 8 * gapPulse}
            fill={HIGHLIGHT}
            opacity={gapGlow}
          />
        ) : null}
        {/* Where the new bar would end if there were no difference. */}
        {ghost > 0 ? (
          <line
            x1={oldEnd}
            x2={oldEnd}
            y1={y(OLD_Y) - h(BAR_H) / 2 - 10}
            y2={lerp(y(OLD_Y) - h(BAR_H) / 2 - 10, y(NEW_Y) + h(BAR_H) / 2 + 16, ghost)}
            stroke={INK}
            strokeWidth={2.2}
            strokeDasharray="7 6"
          />
        ) : null}
      </Svg>
      {[
        { at: tenAt, rate: CHECKOUT.oldRate, yy: OLD_Y, color: INK },
        { at: elevenAt, rate: CHECKOUT.newRate, yy: NEW_Y, color: "var(--ds-blue-ink)" },
      ].map((b) => {
        const g = ease(frame, b.at - 4, 18);
        if (g <= 0) return null;
        return (
          <div
            key={b.yy}
            style={{
              position: "absolute",
              left: sx(C, b.rate * g) + 14,
              top: y(b.yy) - 19,
              ...note(30, b.color),
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {fmt(b.rate * g, 1)}%
          </div>
        );
      })}
      <Bracket x0={oldEnd} x1={newEnd} y={y(NEW_Y) + h(BAR_H) / 2 + 26} at={bigAt - 2} color={STAT} up width={2.6} />
      <Note at={bigAt + 2} x={(oldEnd + newEnd) / 2} y={y(NEW_Y) + h(BAR_H) / 2 + 40} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
          <Label size={24} color={STAT_INK}>
            a gap of {fmt(CHECKOUT.gap, 1)} points
          </Label>
        </span>
      </Note>
      <Note at={noDiffAt + 2} x={oldEnd - 14} y={y(NEW_Y) + h(BAR_H) / 2 + 40} align="right">
        <Label size={21} color={INK_SOFT}>
          if there were no difference
        </Label>
      </Note>

      {/* The question, as the lesson puts it. */}
      <Ink at={questionAt - 2} dur={16} style={{ left: 160, top: y(780), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK_SOFT }}>The real question:</span>
      </Ink>
      <Ink at={howAt - 4} dur={22} style={{ left: 160, top: y(836), whiteSpace: "nowrap" }}>
        <span style={{ ...body(38, true), color: INK }}>
          how often would chance alone hand you <Mark at={bigAt}>a gap this big?</Mark>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
