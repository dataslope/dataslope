import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, headline, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VIDEO } from "./data";
import { Drift, Headline, Hero, Kicker, OK, OK_INK } from "./parts";

const ROUTE_Y = 590;
const FIRST = 210;
const STEP = 380;
const TITLE_W = 340;
const R = 26;

/** A small normal curve, drawn along its length from `at`. */
const Bell: React.FC<{ at: number; cx: number; top: number }> = ({ at, cx, top }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 22);
  const W = 240;
  const H = 86;
  const pts = Array.from({ length: 49 }, (_, k) => {
    const z = -3 + (k * 6) / 48;
    return [cx - W / 2 + (k * W) / 48, top + H - H * Math.exp(-(z * z) / 2)] as const;
  });
  const d = pts.map(([x, v], k) => `${k ? "L" : "M"}${x.toFixed(1)},${v.toFixed(1)}`).join(" ");
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={1920} height={1080}>
      <line x1={cx - W / 2} x2={cx + W / 2} y1={top + H} y2={top + H} stroke={INK_SOFT} strokeWidth={1.4} opacity={ease(frame, at - 4, 10)} />
      <path d={d} fill="none" stroke={BAR} strokeWidth={3.4} pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};

/** One stop on the route: its number on the line, its name above, and
 *  whatever stands for it below. */
const Stop: React.FC<{ i: number; at: number; title: string; children?: React.ReactNode }> = ({ i, at, title, children }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at - 2, 14);
  if (p <= 0) return null;
  const cx = FIRST + i * STEP;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cx - TITLE_W / 2,
          width: TITLE_W,
          top: y(ROUTE_Y) - h(140),
          height: h(100),
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          textAlign: "center",
          ...note(32, INK),
          fontWeight: 650,
          lineHeight: 1.15,
          opacity: p,
          transform: `translateY(${(1 - p) * 12}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - R,
          top: y(ROUTE_Y) - R,
          width: 2 * R,
          height: 2 * R,
          borderRadius: R,
          border: `2.5px solid ${BLUE_INK}`,
          background: PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(24, BLUE_INK),
          ...TABULAR,
          transform: `scale(${0.6 + 0.4 * p})`,
          opacity: p,
        }}
      >
        {i + 1}
      </div>
      {children}
    </>
  );
};

/**
 * The loop, from the role page, as a route with four stops: probability and
 * statistics, a modeling case, an experiment to design, and a coding screen.
 * The line draws on to each stop as it is named, and the otter, this video's
 * own hero, stands at the end of it.
 */
export const LoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("loop").from;
  const fourAt = n.word("loop", "four kinds of round");
  const stops = [
    n.word("loop", "Probability and statistics questions"),
    n.word("loop", "A modeling case"),
    n.word("loop", "An experiment to design"),
    n.word("loop", "And a coding screen"),
  ];
  const predictAt = n.word("loop", "how would you predict this");
  const abAt = n.word("loop", "an A B test");
  const pandasAt = n.word("loop", "Python and pandas");
  const sqlAt = n.word("loop", "in SQL");
  const end = n.beat("loop").to;

  const below = y(ROUTE_Y) + h(56);
  const cx = (i: number) => FIRST + i * STEP;
  // The line reaches each stop as it is named: a lead-in to the first, then
  // one segment per stop after it.
  const reach = stops.map((at, i) => ({ from: i === 0 ? cx(0) - 90 : cx(i - 1) + R, to: cx(i) - R, p: ease(frame, at - 12, 12) }));
  const mono: React.CSSProperties = { fontFamily: MONO, fontSize: 24, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" };

  return (
    <AbsoluteFill>
      {stops.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-32} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="The loop," turn="four kinds of round." at={from + 4} turnAt={fourAt - 2} size={72} />

        <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={1920} height={1080}>
          {reach.map((s, i) => (
            <line key={i} x1={s.from} x2={s.from + (s.to - s.from) * s.p} y1={y(ROUTE_Y)} y2={y(ROUTE_Y)} stroke={INK_SOFT} strokeWidth={2.4} opacity={s.p > 0 ? 1 : 0} />
          ))}
        </svg>

        <Stop i={0} at={stops[0]} title="Probability & statistics">
          <Bell at={stops[0] + 6} cx={cx(0)} top={below + h(6)} />
        </Stop>
        <Stop i={1} at={stops[1]} title="A modeling case">
          <div
            style={{
              position: "absolute",
              left: cx(1) - TITLE_W / 2,
              width: TITLE_W,
              top: below,
              textAlign: "center",
              ...headline(32, true),
              color: INK,
              opacity: ease(frame, predictAt - 2, 14),
            }}
          >
            &ldquo;How would you predict this?&rdquo;
          </div>
        </Stop>
        <Stop i={2} at={stops[2]} title="An experiment to design">
          {(["A", "B"] as const).map((arm, k) => (
            <div
              key={arm}
              style={{
                position: "absolute",
                left: cx(2) - 118 + k * 128,
                top: below + h(4),
                width: 108,
                height: h(78),
                borderRadius: 12,
                background: `color-mix(in srgb, ${k ? OK : BAR} 22%, ${PAPER})`,
                border: `2px solid ${k ? OK : BAR}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...headline(40),
                color: k ? OK_INK : BLUE_INK,
                opacity: ease(frame, abAt - 2 + k * 6, 12),
                transform: `translateY(${(1 - ease(frame, abAt - 2 + k * 6, 12)) * 10}px)`,
              }}
            >
              {arm}
            </div>
          ))}
        </Stop>
        <Stop i={3} at={stops[3]} title="A coding screen">
          <div style={{ position: "absolute", left: cx(3) - 150, top: below + h(4), lineHeight: 1.7 }}>
            <div style={{ ...mono, opacity: ease(frame, pandasAt - 2, 12) }}>df.groupby(…)</div>
            <div style={{ ...mono, opacity: ease(frame, sqlAt - 2, 12) }}>
              <span style={{ color: BLUE_INK, fontWeight: 600 }}>SELECT</span> …
            </div>
          </div>
        </Stop>

        <Hero video={VIDEO} id="ds-interview-otter" at={from + 14} left={1530} top={y(290)} width={300} height={h(300)} />
      </Drift>
    </AbsoluteFill>
  );
};
