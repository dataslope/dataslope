import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mark, OK, OK_INK, pulse, Spot, X0 } from "./parts";
import { mulberry32 } from "../da-statistics-communication/parts";

const LINE_Y = 600;
const LAUNCH_X = 1040;
const LINE_END = 1800;
const CHIP_Y = 460;
const CHIP_W = 176;
const CHIP_GAP = 10;
const CHIP_H = 66;
const DOTS_X = 1110;
const DOTS_Y = 480;

/** The five things settled before launch, in the order the hook names them. */
const DECISIONS = [
  { text: "hypothesis", cue: "The hypothesis" },
  { text: "metric", cue: "the metric" },
  { text: "who gets split", cue: "who gets split" },
  { text: "how many users", cue: "how many users" },
  { text: "when it stops", cue: "when it stops" },
];

/** Twenty-four users, each split by a seeded coin into A (old) or B (new). */
const coin = mulberry32(61);
const USERS = Array.from({ length: 24 }, (_, i) => ({ row: Math.floor(i / 8), col: i % 8, b: coin() < 0.5 }));

/**
 * The opening: a test's life as a timeline, with the launch marked on it.
 * Users split at random on the live side; the five decisions that can lose
 * the test pile up on the other side and settle onto the line before launch.
 * Then the round itself: fourteen questions, eleven worked through on
 * simulated experiments, three brief ones at the end.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "An A B test");
  const versionsAt = n.word("hook", "two versions");
  const splitAt = n.word("hook", "split at random");
  const lostAt = n.word("hook", "can be lost");
  const beforeAt = n.word("hook", "before anyone sees it");
  const settledAt = n.word("hook", "settled before launch");
  const undoAt = n.word("hook", "hard to undo later");
  const roundAt = n.word("plan", "the design round");
  const fourteenAt = n.word("plan", "fourteen questions");
  const elevenAt = n.word("plan", "Eleven are worked through");
  const simAt = n.word("plan", "simulated experiments");
  const briefAt = n.word("plan", "three brief ones");
  const planAt = n.word("design-in", "the whole plan");
  const clearAt = n.beat("design-in").to - 6;

  const lineP = ease(frame, startAt + 4, 24);
  const washIn = ease(frame, lostAt, 14);
  const wash = washIn * (1 - 0.5 * ease(frame, roundAt, 16));
  const drop = ease(frame, settledAt, 14);
  const clear = 1 - ease(frame, clearAt, 10);

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      <Sfx name="el-pencil" at={startAt + 4} level={-36} />
      <Sfx name="el-pop" at={splitAt + 2} level={-36} />
      {DECISIONS.map((d) => (
        <Sfx key={d.text} name="el-tap" at={n.word("hook", d.cue)} level={-38} />
      ))}
      <Sfx name="tock-low" at={settledAt + 6} level={-36} />
      <Sfx name="el-chime" at={fourteenAt} level={-36} />

      <Drift from={0} to={n.beat("design-in").to + 20}>
        <Kicker at={startAt}>Data scientist interview prep · Experimentation I</Kicker>
        <Headline lead="An A/B test can be lost" turn="before launch." at={startAt + 2} turnAt={beforeAt - 2} size={72} />
        <Spot id="ds-experiment-design-heron" at={startAt + 10} left={1470} top={y(268)} width={330} height={220} />

        {/* The timeline: before launch, the launch, live. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <rect
            x={X0 - 14}
            y={y(LINE_Y) - h(170)}
            width={(LAUNCH_X - X0 + 14) * washIn}
            height={h(170)}
            fill={HIGHLIGHT}
            opacity={0.45 * wash}
            rx={6}
          />
          <line x1={X0} x2={X0 + (LINE_END - X0) * lineP} y1={y(LINE_Y)} y2={y(LINE_Y)} stroke={INK} strokeWidth={2.4} />
          <g opacity={ease(frame, startAt + 14, 10)}>
            <line x1={LAUNCH_X} x2={LAUNCH_X} y1={y(LINE_Y) - h(16)} y2={y(LINE_Y) + h(16)} stroke={INK} strokeWidth={3} />
            <polygon
              points={`${LINE_END},${y(LINE_Y)} ${LINE_END - 14},${y(LINE_Y) - 8} ${LINE_END - 14},${y(LINE_Y) + 8}`}
              fill={INK}
              opacity={lineP > 0.98 ? 1 : 0}
            />
          </g>
        </svg>
        <Note at={startAt + 12} x={X0} y={y(LINE_Y) + h(22)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>before launch</span>
        </Note>
        <Note at={startAt + 16} x={LAUNCH_X - 60} y={y(LINE_Y) + h(22)} width={120} style={{ textAlign: "center" }}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>launch</span>
        </Note>
        <Note at={startAt + 18} x={LINE_END - 200} y={y(LINE_Y) + h(22)} width={200} align="right">
          <span style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>live</span>
        </Note>

        {/* Live: two versions, and users split between them at random. */}
        {[
          { text: "A · old", color: BAR, x: DOTS_X },
          { text: "B · new", color: OK, x: DOTS_X + 150 },
        ].map((c, i) => {
          const p = ease(frame, versionsAt + i * 4, 10);
          return (
            <div
              key={c.text}
              style={{
                position: "absolute",
                left: c.x,
                top: y(DOTS_Y) - h(64),
                padding: "4px 14px",
                borderRadius: 6,
                background: c.color,
                ...label(21, PAPER),
                fontWeight: 700,
                whiteSpace: "nowrap",
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              {c.text}
            </div>
          );
        })}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {USERS.map((u, i) => {
            const p = ease(frame, splitAt - 6 + i * 0.6, 8);
            if (p <= 0) return null;
            const turned = ease(frame, splitAt + 6 + i * 0.9, 8);
            const color = u.b ? OK : BAR;
            return (
              <circle
                key={i}
                cx={DOTS_X + 14 + u.col * 40}
                cy={y(DOTS_Y) + h(14) + u.row * h(34)}
                r={11 * p}
                fill={turned > 0 ? `color-mix(in srgb, ${color} ${turned * 100}%, ${ds("gray", 300)})` : ds("gray", 300)}
              />
            );
          })}
        </svg>

        {/* Before launch: the five decisions, settling onto the line. */}
        {DECISIONS.map((d, i) => {
          const cueAt = n.word("hook", d.cue);
          const p = ease(frame, cueAt - 2, 10);
          if (p <= 0) return null;
          const lift = (y(LINE_Y) - h(CHIP_H) - h(10) - y(CHIP_Y)) * drop;
          const lit = i < 2 ? ease(frame, planAt, 10) : 0;
          const bump = pulse(frame, cueAt, 14);
          return (
            <div
              key={d.text}
              style={{
                position: "absolute",
                left: X0 + i * (CHIP_W + CHIP_GAP),
                top: y(CHIP_Y) + lift,
                width: CHIP_W,
                height: h(CHIP_H),
                boxSizing: "border-box",
                border: `2px solid ${INK}`,
                borderRadius: 8,
                background: lit > 0 ? `color-mix(in srgb, ${ds("yellow", 300)} ${lit * 100}%, ${PAPER})` : PAPER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...note(21, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
                opacity: p,
                transform: `translateY(${(1 - p) * -14}px) scale(${1 + 0.06 * bump})`,
              }}
            >
              {d.text}
            </div>
          );
        })}
        <Note at={undoAt - 2} x={DOTS_X} y={y(LINE_Y) + h(70)}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a mistake is hard to undo once it's live</span>
        </Note>

        {/* The round. */}
        <Note at={fourteenAt - 2} x={X0} y={y(720)}>
          <span style={{ ...note(34, INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            <Mark at={roundAt}>The design round</Mark>: 14 questions
          </span>
        </Note>
        <Note at={elevenAt - 2} x={X0} y={y(778)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b style={{ color: BLUE_INK }}>11</b> worked through on <span style={{ opacity: ease(frame, simAt - 2, 10) }}>simulated experiments</span>
          </span>
        </Note>
        <Note at={briefAt - 2} x={X0} y={y(822)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b style={{ color: OK_INK }}>3</b> brief ones at the end
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
