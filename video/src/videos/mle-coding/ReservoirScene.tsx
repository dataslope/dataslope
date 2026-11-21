import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pct, RESERVOIR } from "./data";
import { ACCENT_INK, ART, artBox, BAR, BLUE_FILL, BLUE_INK, Cell, Drift, Fade, HIGHLIGHT, INK, INK_SOFT, int, Line, Mark, OK_INK, PAPER, seeded, Spot, VRule, X0 } from "./parts";

const STREAM_W = 1220;
const BLOCK = 22;
const SPACING = 34;
const SPEED = 2.2;
const SLOT_W = 72;
const SLOT_GAP = 10;
/** Frames between two later items reaching the reservoir. */
const EVERY = 20;

/** Which later items the drawing keeps and where: a seeded picture of the
 *  rule, with each item's chance k / i shown beside it. */
const EVENTS = (() => {
  const r = seeded(11);
  return Array.from({ length: 24 }, (_, e) => {
    const i = 11 + e * 9 + Math.floor(r() * 5);
    const kept = e < 2 ? true : r() < Math.min(1, (RESERVOIR.k / i) * 6);
    return { i, kept, slot: Math.floor(r() * RESERVOIR.k) };
  });
})();

/** A fraction set as math: a over b. */
const Frac: React.FC<{ a: React.ReactNode; b: React.ReactNode; opacity?: number }> = ({ a, b, opacity = 1 }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 0.12em", opacity }}>
    <span style={{ lineHeight: 1.05 }}>{a}</span>
    <span style={{ alignSelf: "stretch", height: 2, background: "currentColor", margin: "3px 0" }} />
    <span style={{ lineHeight: 1.05 }}>{b}</span>
  </span>
);

/**
 * Question 10. A stream of log lines flows past a reservoir of ten slots:
 * the first ten go in, then each later item i takes a random slot with
 * probability k / i. Why it is uniform, as the product that telescopes to
 * k / n. Then the simulation: each tenth of the stream supplied about ten
 * percent of the kept lines (RESERVOIR.tenths), and the two shortcuts that
 * fail.
 */
export const ReservoirScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q10").from;
  const qAt = n.word("q10", "Question ten");
  const textAt = n.word("q10", "What is reservoir sampling");
  const keepsAt = n.word("q10", "It keeps a uniform sample of k items");
  const streamAt = n.word("q10", "from a stream of unknown length");
  const passAt = n.word("q10", "in one pass");
  const memAt = n.word("q10", "with memory for k");
  const firstAt = n.word("q10", "Keep the first k");
  const afterAt = n.word("q10", "After that, item number i replaces a random slot");
  const probAt = n.word("q10", "with probability k over i");
  const whyAt = n.word("q10-why", "The follow-up is why that's uniform");
  const getsAt = n.word("q10-why", "Item i gets in with chance k over i");
  const laterAt = n.word("q10-why", "Then each later item, j, knocks it out");
  const oneOverAt = n.word("q10-why", "with chance one over j");
  const multAt = n.word("q10-why", "Multiply it through");
  const everyAt = n.word("q10-why", "every item ends at k over n");
  const simAt = n.word("q10-sim", "In a simulation of twenty thousand streams");
  const tenthAt = n.word("q10-sim", "each tenth of the stream supplied ten percent");
  const firstKAt = n.word("q10-alt", "The first k lines all come from the start of the day");
  const coinAt = n.word("q10-alt", "keeping each line with probability one percent");
  const notTenAt = n.word("q10-alt", "not ten");
  const end = n.beat("q10-alt").to;

  const k = RESERVOIR.k;
  const streamY = y(312);
  const slotY = y(420);
  const slotH = h(52);
  const slotX = (s: number) => X0 + s * (SLOT_W + SLOT_GAP);
  const streamOn = ease(frame, streamAt - 4, 12);
  const drift = Math.max(0, frame - (streamAt - 4)) * SPEED;
  const drop = (at: number, x0: number, s: number) => {
    const p = ease(frame, at, 12);
    return { p, x: x0 + (slotX(s) + SLOT_W / 2 - BLOCK / 2 - x0) * p, yy: streamY + (slotY + slotH / 2 - BLOCK / 2 - streamY) * p };
  };

  // The first k drop straight in, one per slot.
  const firstDrops = Array.from({ length: k }, (_, s) => ({ at: firstAt + 2 + s * 3, s }));
  // Then later items, one every EVERY frames.
  const evFrom = afterAt + 8;
  const current = frame < evFrom ? -1 : Math.min(EVENTS.length - 1, Math.floor((frame - evFrom) / EVERY));
  const lastKept = (s: number) => {
    let at = -1;
    for (let e = 0; e <= current; e++) if (EVENTS[e].kept && EVENTS[e].slot === s) at = evFrom + e * EVERY;
    return at;
  };

  // ── The simulation's bars ──
  const R_X = 1000;
  const barBase = y(748);
  const barTop = (v: number) => barBase - (v / 0.12) * h(150);
  const barW = 44;
  const barPitch = 60;
  const barrel = artBox(ART.barrel, 140);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={streamAt} level={-37} />
      <Sfx name="el-pop" at={firstAt + 2} level={-31} />
      <Sfx name="el-tap" at={probAt + 2} level={-32} />
      <Sfx name="el-pop" at={keepsAt} level={-30} />
      <Sfx name="el-pencil" at={getsAt} level={-36} />
      <Sfx name="el-pencil" at={multAt} level={-36} />
      <Sfx name="el-tap" at={everyAt + 8} level={-31} />
      <Sfx name="el-pop" at={simAt + 4} level={-32} />
      <Sfx name="el-tap" at={firstKAt + 4} level={-32} />
      <Sfx name="el-tap" at={coinAt + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is reservoir sampling, and when is it useful?
        </QuestionCard>

        {/* ── The stream ── */}
        <Line at={streamAt} x={X0} y={streamY - h(48)} size={23} color={INK_SOFT}>
          A stream of log lines, length unknown
        </Line>
        <div style={{ position: "absolute", left: X0, top: streamY, width: STREAM_W, height: BLOCK, overflow: "hidden", opacity: streamOn }}>
          {Array.from({ length: Math.ceil(STREAM_W / SPACING) + 2 }, (_, b) => {
            const x = ((b * SPACING + drift) % (STREAM_W + SPACING)) - SPACING;
            return <div key={b} style={{ position: "absolute", left: x, top: 0, width: BLOCK, height: BLOCK, borderRadius: 4, background: BLUE_FILL }} />;
          })}
        </div>

        {/* ── The reservoir: k slots ── */}
        {Array.from({ length: k }, (_, s) => {
          const flash = lastKept(s);
          const lit = flash >= 0 ? 1 - ease(frame, flash + 12, 16) : 0;
          return (
            <Cell
              key={s}
              x={slotX(s)}
              y={slotY}
              w={SLOT_W}
              h={slotH}
              radius={5}
              opacity={ease(frame, keepsAt + s, 10)}
              style={{ background: lit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(lit * 100)}%, ${PAPER})` : "transparent" }}
            />
          );
        })}
        {/* What each slot holds: its first line, then each later line kept
            into it, the one it replaces fading as the new one lands. */}
        {Array.from({ length: k }, (_, s) => {
          const arrivals = [
            { at: firstDrops[s].at, x0: X0 + s * SPACING },
            ...EVENTS.slice(0, current + 1)
              .map((ev, e) => ({ ev, at: evFrom + e * EVERY }))
              .filter(({ ev }) => ev.kept && ev.slot === s)
              .map(({ at }) => ({ at, x0: X0 + 700 })),
          ];
          return arrivals.slice(-2).map((a, j, last) => {
            const d = drop(a.at, a.x0, s);
            if (d.p <= 0) return null;
            const replaced = j < last.length - 1 ? 1 - ease(frame, last[j + 1].at + 6, 6) : 1;
            if (replaced <= 0) return null;
            return <div key={`${s}-${a.at}`} style={{ position: "absolute", left: d.x, top: d.yy, width: BLOCK, height: BLOCK, borderRadius: 4, background: BAR, opacity: replaced }} />;
          });
        })}
        <Line at={keepsAt} x={slotX(0)} y={slotY + slotH + h(14)} size={22} color={INK_SOFT}>
          the reservoir, <MathRun><I>k</I> = {k}</MathRun>
          <Fade at={passAt}>: one pass</Fade>
          <Fade at={memAt}>, memory for <MathRun><I>k</I></MathRun></Fade>
        </Line>
        {current >= 0 ? (
          <div style={{ position: "absolute", left: slotX(k) + 40, top: slotY + slotH / 2 - 16, fontSize: 24, whiteSpace: "nowrap", opacity: ease(frame, evFrom - 4, 8) }}>
            <span style={{ ...note(24, INK) }}>
              item <Num>{EVENTS[current].i}</Num>: keep with{" "}
              <Mark at={probAt}>
                <MathRun>
                  <I>k</I> / <I>i</I> = {k} / {EVENTS[current].i}
                </MathRun>
              </Mark>
            </span>
          </div>
        ) : null}
        <Spot id={ART.barrel.id} at={keepsAt} left={1590} top={y(270)} {...barrel} />

        {/* ── Why it is uniform ── */}
        <Line at={whyAt} x={X0} y={y(570)} size={24}>
          Why every line ends up equally likely
        </Line>
        <div style={{ position: "absolute", left: X0, top: y(626), display: "flex", flexDirection: "column", gap: h(18), fontSize: 26 }}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, getsAt, 10) }}>
            Item <MathRun><I>i</I></MathRun> gets in: <MathRun><I>k</I> / <I>i</I></MathRun>
          </span>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, laterAt, 10) }}>
            Each later item <MathRun><I>j</I></MathRun> knocks it out
            <Fade at={oneOverAt}>
              : <MathRun>1 / <I>j</I></MathRun>
            </Fade>
          </span>
        </div>
        <div style={{ position: "absolute", left: X0, top: y(740), fontSize: 30, color: INK, whiteSpace: "nowrap", display: "flex", alignItems: "center", opacity: ease(frame, multAt, 12) }}>
          <MathRun>
            <Frac a={<I>k</I>} b={<I>i</I>} />
            {" × "}
            <Frac a={<I>i</I>} b={<><I>i</I> + 1</>} opacity={1 - 0.6 * ease(frame, everyAt, 14)} />
            {" × "}
            <Frac a={<><I>i</I> + 1</>} b={<><I>i</I> + 2</>} opacity={1 - 0.6 * ease(frame, everyAt, 14)} />
            {" × … × "}
            <Frac a={<><I>n</I> − 1</>} b={<I>n</I>} />
            <span style={{ opacity: ease(frame, everyAt + 4, 10), color: OK_INK }}>
              {" = "}
              <Frac a={<I>k</I>} b={<I>n</I>} />
            </span>
          </MathRun>
        </div>

        <VRule x={R_X - 60} top={y(570)} bottom={y(890)} at={simAt} />

        {/* ── The simulation ── */}
        <Line at={simAt} x={R_X} y={y(570)} size={23} color={INK_SOFT}>
          Simulation: <Num>{int(RESERVOIR.runs)}</Num> streams of <Num>{int(RESERVOIR.stream)}</Num> lines
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, simAt + 4, 10) }}>
          <line x1={R_X - 8} x2={R_X + 10 * barPitch} y1={barTop(RESERVOIR.expected * 10)} y2={barTop(RESERVOIR.expected * 10)} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="6 6" />
        </svg>
        {RESERVOIR.tenths.map((v, i) => {
          const g = ease(frame, simAt + 6 + i * 2, 16);
          return <div key={i} style={{ position: "absolute", left: R_X + i * barPitch, top: barBase - (barBase - barTop(v)) * g, width: barW, height: (barBase - barTop(v)) * g, background: BAR, borderRadius: 3 }} />;
        })}
        <div style={{ position: "absolute", left: R_X, top: barBase + h(10), ...label(20, INK_SOFT), opacity: ease(frame, simAt + 10, 10) }}>start of the stream</div>
        <div style={{ position: "absolute", left: R_X + 10 * barPitch - barPitch + barW - 200, width: 200, textAlign: "right", top: barBase + h(10), ...label(20, INK_SOFT), opacity: ease(frame, simAt + 10, 10) }}>end</div>
        <Line at={tenthAt} x={R_X + 10 * barPitch + 20} y={barTop(0.1) - 16} size={22} color={BLUE_INK}>
          each tenth:
        </Line>
        <Line at={tenthAt + 4} x={R_X + 10 * barPitch + 20} y={barTop(0.1) + h(22)} size={22} color={BLUE_INK}>
          {pct(RESERVOIR.tenthsRange[0])} to {pct(RESERVOIR.tenthsRange[1])}
        </Line>

        {/* ── The shortcuts ── */}
        <Line at={firstKAt} x={R_X} y={y(806)} size={23} color={ACCENT_INK}>
          First {k} lines: all from the start of the day
        </Line>
        <Line at={coinAt} x={R_X} y={y(806) + h(42)} size={23} color={ACCENT_INK}>
          Each line kept with <MathRun><I>p</I></MathRun> = 1%: {RESERVOIR.coinSizes.p5} to {RESERVOIR.coinSizes.p95} lines
          <Fade at={notTenAt}>, not {k}</Fade>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
