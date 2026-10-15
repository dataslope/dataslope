import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { map, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds, type Hue } from "../../../theme/brand";
import { QUESTION } from "../data";
import { chipHue, CONTENT_W, glowBox, glowText, mix, neon, SIDE } from "../theme";
import { chipWidth, flicker, Headlines, Mono, NeonText, TokenChip } from "../ui";
import { DISPLAY } from "../fonts";

const CARD_A = 420;
const CARD_B = 840;
const CARD_H = 370;
const STREAM = 40;
const GATE = 300;

/** A neon-edged card that springs in at its cue. */
const Card: React.FC<{ top: number; at: number; hue: Hue; children: React.ReactNode }> = ({
  top,
  at,
  hue,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = pop(frame, at, fps, 12);
  const n = neon(hue);
  return (
    <div
      style={{
        position: "absolute",
        left: SIDE,
        top,
        width: CONTENT_W,
        height: CARD_H,
        boxSizing: "border-box",
        borderRadius: 30,
        border: `3px solid ${n.tube}`,
        background: mix(ds("gray", 900), 86),
        boxShadow: glowBox(n.tube, 0.8),
        overflow: "hidden",
        opacity: flicker(frame, at),
        transform: `translateY(${(1 - p) * 50}px) scale(${0.94 + 0.06 * p})`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * The same unit everywhere it costs something: a stream of tokens runs
 * through the meter you are billed by, and fills the context window until
 * it meets the limit.
 */
export const Units: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const tokensAt = word("units", "Tokens");
  const pay = word("units", "pay");
  const context = word("units", "context");
  const measured = word("units", "measured");

  // The billing stream: token chips sliding left through the meter's gate.
  // The lane starts full at the gate, so the count ticks from the moment
  // the card lands.
  const stream = QUESTION.concat(QUESTION, QUESTION);
  const widths = stream.map((t) => chipWidth(t.text, STREAM));
  const travelled = Math.max(0, frame - pay) * 12;
  const starts = widths.reduce<number[]>(
    (acc, w, i) => [...acc, i === 0 ? GATE + 18 - travelled : acc[i - 1] + widths[i - 1] + 14],
    [],
  );
  const passed = starts.filter((left, i) => left + widths[i] < GATE).length;

  // The context window: segments fill toward the limit.
  const BAR_W = CONTENT_W - 80;
  const LIMIT = 0.86;
  const fill = map(frame, [context, measured + 6], [0, LIMIT]);
  const seg = 30;
  const segs = Math.floor((BAR_W * fill) / seg);
  const full = frame >= measured + 6;
  const red = neon("red");
  const limitColor = full ? red.tube : ds("gray", 300);

  return (
    <Scene from={from} to={to} fade={6}>
      <Headlines end={to + 1000} items={[[tokensAt, <NeonText key="a" size={88} hue="yellow">Counted in tokens</NeonText>]]} />

      <Card top={CARD_A} at={pay} hue="yellow">
        <div style={{ position: "absolute", left: 40, top: 24, display: "flex", alignItems: "center", gap: 26 }}>
          <NeonText size={150} hue="yellow">$</NeonText>
          <div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, color: ds("gray", 50) }}>Billed per token</div>
            <Mono size={30} color={ds("gray", 400)}>{`tokens so far: ${passed}`}</Mono>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, top: 226, width: CONTENT_W, height: 76 }}>
          {stream.map((t, i) => {
            const left = starts[i];
            if (left > CONTENT_W || left + widths[i] < -10) return null;
            return (
              <div key={i} style={{ position: "absolute", left, top: 4, opacity: left + widths[i] < GATE ? 0.35 : 1 }}>
                <TokenChip text={t.text} hue={chipHue(i)} size={STREAM} />
              </div>
            );
          })}
          {/* The meter's gate: chips left of it have been counted. */}
          <div style={{ position: "absolute", left: GATE - 4, top: -10, width: 6, height: 90, background: ds("yellow", 300), boxShadow: glowBox(ds("yellow", 400), 0.7) }} />
        </div>
      </Card>

      <Card top={CARD_B} at={context} hue="blue">
        <div style={{ position: "absolute", left: 40, top: 34 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, color: ds("gray", 50) }}>Context limit</div>
          <Mono size={30} color={ds("gray", 400)}>measured in tokens</Mono>
        </div>
        <div style={{ position: "absolute", left: 40, top: 200, width: BAR_W, height: 84, boxSizing: "border-box", borderRadius: 18, border: `3px solid ${mix(ds("blue", 400), 60)}` }}>
          {Array.from({ length: segs }, (_, i) => {
            const h = neon(chipHue(i));
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 8 + i * seg,
                  top: 10,
                  width: seg - 6,
                  height: 58,
                  borderRadius: 8,
                  background: mix(h.tube, 70),
                  boxShadow: `0 0 10px ${mix(h.tube, 60)}`,
                }}
              />
            );
          })}
          <div
            style={{
              position: "absolute",
              left: BAR_W * LIMIT + 8,
              top: -22,
              width: 6,
              height: 124,
              borderRadius: 3,
              background: limitColor,
              boxShadow: full ? glowBox(red.tube, 1) : undefined,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: BAR_W * LIMIT - 120,
              top: -66,
              width: 260,
              textAlign: "center",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 32,
              color: full ? red.core : ds("gray", 300),
              textShadow: full ? glowText(red.tube, 0.6) : undefined,
            }}
          >
            {full ? "limit reached" : "limit"}
          </div>
        </div>
      </Card>
    </Scene>
  );
};
