import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AB } from "./data";
import { Count, DATA, DATA_INK, Drift, Greek, Head, Label, pulse, STAT_INK, Svg } from "./parts";

const X: XScale = { lo: 0, hi: 16000, x0: 520, x1: 1720 };
const ROW_Y = [470, 650];
const BAR_H = 70;
const TWELVE = AB.perArm["12"];
const ELEVEN = AB.perArm["11"];

/**
 * Sizing an A/B test before it runs: 3,841 users per arm to catch 10% to
 * 12% at 80% power, and 14,751 to catch half that lift, the second bar laid
 * off in lengths of the first.
 */
export const AbScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const abFrom = n.beat("ab").from;
  const sizedAt = n.word("ab", "sized");
  const liftAt = n.word("ab", "lift");
  const powerAt = n.word("ab", "eighty percent power");
  const threeAt = n.word("ab", "three thousand");
  const armAt = n.word("ab", "each arm");
  const usersAt = n.word("ab", "users");
  const halveAt = n.word("halve", "Halve");
  const elevenAt = n.word("halve", "eleven");
  const fourteenAt = n.word("halve", "fourteen thousand");
  const nearlyAt = n.word("halve", "Nearly");
  const manyAt = n.word("halve", "as many");

  const g1 = ease(frame, threeAt - 4, Math.max(30, usersAt - threeAt + 4));
  const g2 = ease(frame, fourteenAt - 4, Math.max(40, nearlyAt - fourteenAt));
  const end1 = sx(X, TWELVE);
  const end2 = sx(X, ELEVEN);
  const bars = [
    { at: liftAt, label: "10% to 12%", value: TWELVE, grow: g1, countAt: threeAt - 4, dur: Math.max(30, usersAt - threeAt + 4) },
    { at: elevenAt, label: "10% to 11%", value: ELEVEN, grow: g2, countAt: fourteenAt - 4, dur: Math.max(40, nearlyAt - fourteenAt) },
  ];
  const copies = Math.ceil(AB.ratio);
  const manyGlow = pulse(frame, manyAt, 26);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two bars, then the first laid along the second ── */}
      <Sfx name="el-whoosh" at={threeAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={fourteenAt - 4} level={-33} />
      {Array.from({ length: copies - 1 }, (_, k) => (
        <Sfx key={k} name="el-tap" at={nearlyAt - 4 + k * 6} level={-30} />
      ))}

      <Head a="Size it" b="before it starts." at={abFrom - 6} bAt={sizedAt - 2} />

      <Drift from={abFrom} to={n.beat("halve").to + 40} scale={0.02} origin="30% 60%">
        <FigLabel n="15" title="Users needed in each arm, from a 10% baseline" at={abFrom} x={160} y={y(300)} />
        <Ink at={powerAt - 4} dur={14} style={{ left: 160, top: y(300) + 44, whiteSpace: "nowrap" }}>
          <Label size={22} color={INK_SOFT} weight={520}>
            for 80% power at <Greek>α</Greek> = 0.05
          </Label>
        </Ink>
        {/* The chart is up on "sized", the first row named on "lift". */}
        <Axis scale={X} base={y(ROW_Y[1]) + h(BAR_H) / 2 + 40} ticks={[0, 4000, 8000, 12000, 16000]} format={(v) => fmt(v, 0)} at={sizedAt} />
        <Svg>
          {/* No gridline at 16,000: it would run through the 14,751 printed at the end of the second bar. */}
          {[4000, 8000, 12000].map((v) => (
            <line
              key={v}
              x1={sx(X, v)}
              x2={sx(X, v)}
              y1={y(ROW_Y[0]) - h(BAR_H)}
              y2={y(ROW_Y[1]) + h(BAR_H) / 2 + 40}
              stroke={HAIRLINE}
              strokeWidth={1}
              opacity={0.3 * ease(frame, sizedAt, 12)}
            />
          ))}
          {bars.map((b, i) =>
            b.grow > 0 ? (
              <rect
                key={i}
                x={X.x0}
                y={y(ROW_Y[i]) - h(BAR_H) / 2}
                width={(sx(X, b.value) - X.x0) * b.grow}
                height={h(BAR_H)}
                fill={DATA}
                opacity={i === 0 ? 0.9 : 0.75}
              />
            ) : null,
          )}
          {/* The first bar laid off along the second, one length at a time. */}
          {Array.from({ length: copies }, (_, k) => {
            const a = ease(frame, nearlyAt - 4 + k * 6, 8);
            if (a <= 0 || k === 0) return null;
            const x = X.x0 + (end1 - X.x0) * k;
            if (x > end2) return null;
            return (
              <line
                key={k}
                x1={x}
                x2={x}
                y1={y(ROW_Y[1]) - h(BAR_H) / 2 - 10 * a}
                y2={y(ROW_Y[1]) + h(BAR_H) / 2 + 10 * a}
                stroke={PAPER}
                strokeWidth={4}
              />
            );
          })}
        </Svg>
        {bars.map((b, i) => (
          <React.Fragment key={i}>
            <Ink at={b.at - 6} dur={14} style={{ left: 160, top: y(ROW_Y[i]) - 22, whiteSpace: "nowrap" }}>
              <span style={{ ...body(38, true), color: INK }}>{b.label}</span>
            </Ink>
            {b.grow > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: X.x0 + (sx(X, b.value) - X.x0) * b.grow + 16,
                  top: y(ROW_Y[i]) - 22,
                  ...note(34, DATA_INK),
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  ...halo,
                }}
              >
                <Count at={b.countAt} to={b.value} dur={b.dur} />
              </div>
            ) : null}
          </React.Fragment>
        ))}
        <Note at={armAt - 2} x={end1 + 16} y={y(ROW_Y[0]) + 26}>
          <Label size={21} color={INK_SOFT} weight={520}>
            users in each arm
          </Label>
        </Note>
        {Array.from({ length: copies - 1 }, (_, k) => {
          const x = X.x0 + (end1 - X.x0) * (k + 0.5);
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: x,
                top: y(ROW_Y[1]) - 14,
                transform: "translateX(-50%)",
                opacity: ease(frame, nearlyAt + k * 6, 8),
                ...note(22, PAPER),
                fontWeight: 700,
              }}
            >
              {k + 1}
            </div>
          );
        })}
        <Note at={manyAt - 4} x={end2} y={y(ROW_Y[1]) - h(BAR_H) / 2 - 46} align="right">
          <span
            style={{
              ...note(26, STAT_INK),
              fontWeight: 700,
              display: "inline-block",
              transform: `scale(${1 + 0.1 * manyGlow})`,
              transformOrigin: "100% 50%",
              whiteSpace: "nowrap",
            }}
          >
            {fmt(AB.ratio, 2)} times as many
          </span>
        </Note>
        <Ink at={halveAt - 4} dur={14} style={{ left: 160, top: y(ROW_Y[1]) + 44, whiteSpace: "nowrap" }}>
          <Label size={22} color={INK_SOFT} weight={520}>
            half the lift
          </Label>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
