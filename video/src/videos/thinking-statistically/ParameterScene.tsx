import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, body, fmt, halo, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, KNOWN, mulberry32 } from "./data";
import { Bell, Bracket, DOT, lerp, Mark, Mu, pulse, RAW, STAT, STAT_INK, Svg, TruthLine, XBar } from "./parts";
import { ROW_ONE } from "./TwentyScene";

const X: XScale = { lo: 50, hi: 150, x0: 160, x1: 1760 };
const CARD_Y = 300;
const FIG_Y = 562;
const LABEL_Y = 626;
const STRIP = 722;
const JIT = 26;
const BASE = 830;
const JITTER = jitter(50, KNOWN.n);

/**
 * Fig. 3 again, small, under the two cards while they are read: the whole
 * field under "the population", and under "the sample" the few dots you saw,
 * which move to a new sample on "it moves". They leave on "In code", before
 * Fig. 4 takes their place.
 */
const ECHO_COLS = 56;
const ECHO_ROWS = 20;
const ECHO_PITCH = 12;
const ECHO_TOP = 512;
const ECHO_N = 10;
/** Ten cells at random, clear of the edge and of each other, so no two dots
 *  read as one. */
const pickSample = (seed: number) => {
  const r = mulberry32(seed);
  const picked: number[] = [];
  while (picked.length < ECHO_N) {
    const c = 1 + Math.floor(r() * (ECHO_COLS - 2));
    const w = 1 + Math.floor(r() * (ECHO_ROWS - 2));
    const near = picked.some((i) => Math.abs((i % ECHO_COLS) - c) < 5 && Math.abs(Math.floor(i / ECHO_COLS) - w) < 4);
    if (!near) picked.push(w * ECHO_COLS + c);
  }
  return picked;
};
const SAMPLE_A = pickSample(11);
const SAMPLE_B = pickSample(12);

/** One card: a name, what it describes, and its symbol, each arriving on
 *  the words that introduce it. */
const Card: React.FC<{
  x: number;
  ruleAt: number;
  whatAt: number;
  at: number;
  name: string;
  markAt: number;
  markOut: number;
  what: string;
  how: string;
  howAt: number;
  how2: string;
  how2At: number;
  symbol: React.ReactNode;
  symbolAt: number;
  symbolNote: string;
  symbolNoteAt: number;
  color: string;
}> = ({ x, ruleAt, whatAt, at, name, markAt, markOut, what, how, howAt, how2, how2At, symbol, symbolAt, symbolNote, symbolNoteAt, color }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const rule = ease(frame, ruleAt, 16);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y(CARD_Y), width: 720 * rule, height: 2, background: INK }} />
      <Ink at={at} dur={16} style={{ left: x, top: y(CARD_Y + 22), whiteSpace: "nowrap" }}>
        <span style={{ ...body(48, true), color }}>
          <Mark at={markAt} out={markOut}>
            {name}
          </Mark>
        </span>
      </Ink>
      <Ink at={whatAt} dur={14} style={{ left: x, top: y(CARD_Y + 96), whiteSpace: "nowrap" }}>
        <span style={note(25, INK_SOFT)}>{what}</span>
      </Ink>
      <Ink at={howAt} dur={14} style={{ left: x, top: y(CARD_Y + 140), whiteSpace: "nowrap" }}>
        <span style={{ ...note(25, INK), fontWeight: 650 }}>
          {how}
          <span style={{ opacity: ease(frame, how2At, 10) }}>{how2}</span>
        </span>
      </Ink>
      <Ink at={symbolAt} dur={16} style={{ left: x + 540, top: y(CARD_Y + 14), width: 180, textAlign: "center" }}>
        <div style={{ ...headline(112), color, lineHeight: 1 }}>{symbol}</div>
        <div style={{ ...label(20, INK_SOFT), marginTop: 18, opacity: ease(frame, symbolNoteAt, 10) }}>{symbolNote}</div>
      </Ink>
    </>
  );
};

/**
 * Part 2: the parameter and the statistic, then a population whose mean we
 * know, one sample of fifty from it, and the gap between the two. On the
 * turn to Fig. 5 the sample shrinks into the first of its twenty rows.
 */
export const ParameterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const pNumberAt = n.word("parameter", "number");
  const describesAt = n.word("parameter", "describes");
  const parameterAt = n.word("parameter", "parameter");
  const fixedAt = n.word("parameter", "fixed");
  const cantAt = n.word("parameter", "can't see");
  const sNumberAt = n.word("statistic", "number");
  const computeAt = n.word("statistic", "compute");
  const statisticAt = n.word("statistic", "statistic");
  const canSeeAt = n.word("statistic", "You can see");
  const movesAt = n.word("statistic", "moves");
  const parametersAt = n.word("letters", "Parameters");
  const muAt = n.word("letters", "mu");
  const meanAt = n.word("letters", "mean");
  const statisticsAt = n.word("letters", "Statistics");
  const xBarAt = n.word("letters", "x-bar");
  const parameterFrom = n.beat("parameter").from;
  const codeAt = n.word("cheat", "In code");
  const cheatAt = n.word("cheat", "cheat");
  const buildAt = n.word("cheat", "Build");
  const hundredAt = n.word("cheat", "hundred");
  const fiftyAt = n.word("cheat", "fifty");
  const averageAt = n.word("miss", "average");
  const pointFourAt = n.word("miss", "one point four");
  const closeAt = n.word("miss", "Close");
  const missAt = n.word("price", "miss");
  const errorAt = n.word("price", "estimation error");
  const mistakeAt = n.word("price", "mistake");
  const priceAt = n.word("price", "price");
  const partAt = n.word("price", "seeing only part");
  const turnAt = n.beat("twenty-in").from;
  const missAgainAt = n.word("twenty-in", "miss");
  const usuallyAt = n.word("twenty-in", "usually");
  // The labelled Fig. 4 holds through "One sample can't tell you"; the morph
  // into row 1 of Fig. 5 fills the pause before the cut and ends on it.
  const morphAt = n.beat("twenty").from - 48;

  // "Build a population": the definitions step back for the demonstration,
  // and leave on the turn to the next figure.
  const cardsOp = (1 - ease(frame, buildAt, 20) * 0.55) * (1 - ease(frame, turnAt, 18));
  // The sample, its average, the axis and mu slide into row 1 of Fig. 5;
  // the labels and the miss fade just before.
  const fade = ease(frame, morphAt - 2, 12);
  const m = ease(frame, morphAt, 40);
  const XS: XScale = { ...X, x1: lerp(X.x1, ROW_ONE.X.x1, m) };
  const stripY = lerp(y(STRIP), y(ROW_ONE.ROW0), m);
  const base = lerp(y(BASE), y(ROW_ONE.BASE), m);
  const muX = sx(XS, KNOWN.mu);
  const barX = sx(XS, KNOWN.xBar);
  const tick = ease(frame, averageAt - 4, 12);
  const tickH = lerp(h(44), h(ROW_ONE.TICK), m);
  // The miss, swelling each time it is named again ("isn't a mistake" too).
  const missSwell = pulse(frame, missAt - 2, 20) + pulse(frame, mistakeAt - 2, 20) + pulse(frame, missAgainAt - 2, 20);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two symbols, fifty values, their average, the miss,
           the population behind it, and the sample sliding into Fig. 5 ── */}
      <Sfx name="el-tap" at={muAt - 4} level={-28} />
      <Sfx name="el-tap" at={xBarAt - 4} level={-28} />
      <Sfx name="el-sprinkle" at={fiftyAt - 6} level={-32} />
      <Sfx name="el-tap" at={averageAt - 4} level={-27} />
      <Sfx name="el-pencil" at={closeAt - 2} level={-34} />
      <Sfx name="el-pencil" at={priceAt - 4} level={-35} />
      <Sfx name="el-whoosh" at={morphAt} level={-34} />
      <Sfx name="el-sprinkle" at={describesAt - 2} level={-35} />
      <Sfx name="el-sprinkle" at={computeAt + 6} level={-35} />

      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={parameterFrom - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Parameters stay put.
        </Ink>
        <Ink at={movesAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          Statistics move.
        </Ink>
      </div>

      <AbsoluteFill style={{ opacity: cardsOp }}>
        <Card
          x={160}
          ruleAt={pNumberAt - 4}
          whatAt={describesAt - 2}
          at={parameterAt}
          name="Parameter"
          markAt={parametersAt - 2}
          markOut={statisticsAt - 2}
          what="Describes the population"
          how="Fixed"
          howAt={fixedAt - 2}
          how2=", but you can't see it"
          how2At={cantAt - 2}
          symbol={<Mu />}
          symbolAt={muAt - 4}
          symbolNote="mu, its mean"
          symbolNoteAt={meanAt - 2}
          color={INK}
        />
        <Card
          x={1000}
          ruleAt={sNumberAt - 4}
          whatAt={computeAt - 2}
          at={statisticAt}
          name="Statistic"
          markAt={statisticsAt - 2}
          markOut={codeAt}
          what="Computed from the sample"
          how="You can see it"
          howAt={canSeeAt - 2}
          how2=", but it moves"
          how2At={movesAt - 4}
          symbol={<XBar />}
          symbolAt={xBarAt - 4}
          symbolNote="x-bar, its mean"
          symbolNoteAt={xBarAt - 2}
          color={STAT_INK}
        />
      </AbsoluteFill>

      {/* ── Fig. 3, echoed under the cards ── */}
      <Echo
        x={[160, 1000]}
        fieldAt={describesAt - 2}
        hideAt={cantAt - 2}
        sampleAt={computeAt + 6}
        seeAt={canSeeAt}
        movesAt={movesAt - 4}
        out={codeAt - 2}
      />

      {/* ── Fig. 4: a population we know, and one sample from it ── */}
      <FigLabel
        n="4"
        title={`One sample of ${KNOWN.n}, from a population whose mean is ${KNOWN.mu}`}
        at={cheatAt - 4}
        out={morphAt - 2}
        x={160}
        y={y(FIG_Y)}
      />
      <Axis scale={XS} base={base} ticks={[50, 75, 100, 125, 150]} at={buildAt - 4} />
      {/* "the price of seeing only part": the whole population, behind the fifty seen. */}
      <Bell
        x={(v) => sx(XS, v)}
        mu={KNOWN.mu}
        sd={KNOWN.sigma}
        base={base}
        height={y(BASE) - y(LABEL_Y + 66)}
        at={priceAt - 4}
        out={usuallyAt - 2}
        dur={30}
      />
      <Note at={partAt + 14} x={sx(X, 70) - 18} y={y(BASE - 64)} align="right" out={usuallyAt - 2}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", ...halo }}>the whole population</span>
      </Note>
      <TruthLine x={muX} bottom={base} top={lerp(y(LABEL_Y + 34), y(ROW_ONE.ROW0 - 16), m)} at={hundredAt - 4} />
      {/* mu rides with its line into Fig. 5, to where that figure labels it. */}
      <div
        style={{
          position: "absolute",
          left: muX + lerp(-14, 12, m),
          top: lerp(y(LABEL_Y), y(ROW_ONE.ROW0 - 50), m),
          opacity: ease(frame, hundredAt, 14),
          transform: `translateX(${lerp(-100, 0, m)}%)`,
          ...note(lerp(25, 23, m), INK),
          fontWeight: 650,
          whiteSpace: "nowrap",
          ...halo,
        }}
      >
        <Mu /> = {KNOWN.mu}
      </div>

      <Svg>
        {KNOWN.values.map((v, j) => {
          const a = ease(frame, fiftyAt - 6 + j * 0.45, 6);
          if (a <= 0) return null;
          const cy = lerp(
            y(STRIP) + h((JITTER[j] - 0.5) * 2 * JIT),
            y(ROW_ONE.ROW0) + h((ROW_ONE.JIT[j] - 0.5) * 2 * ROW_ONE.ROW_JIT),
            m,
          );
          return (
            <circle
              key={j}
              cx={sx(XS, v)}
              cy={cy}
              r={lerp(7, ROW_ONE.ROW_R, m) * a}
              fill={DOT}
              stroke={PAPER}
              strokeWidth={lerp(1.2, 0, m)}
              opacity={lerp(1, ROW_ONE.ROW_OP, m)}
            />
          );
        })}
        {tick > 0 ? (
          <line
            x1={barX}
            x2={barX}
            y1={stripY - tickH * tick}
            y2={stripY + tickH}
            stroke={STAT}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <Note at={averageAt} x={barX + 14} y={y(LABEL_Y)} out={morphAt - 2}>
        {/* "how big is that miss": the average it is measured from swells. */}
        <span
          style={{
            ...note(25, STAT_INK),
            fontWeight: 700,
            whiteSpace: "nowrap",
            display: "inline-block",
            transform: `scale(${1 + pulse(frame, missAgainAt - 4, 20) * 0.16})`,
            transformOrigin: "0 100%",
          }}
        >
          <XBar /> ={" "}
          <Mark at={pointFourAt - 2} out={closeAt + 6}>
            {fmt(KNOWN.xBar)}
          </Mark>
        </span>
      </Note>

      {/* "Close, but not on it." */}
      <AbsoluteFill style={{ opacity: 1 - fade }}>
        <Bracket
          x0={muX}
          x1={barX}
          y={stripY + h(58)}
          at={closeAt - 2}
          up
          color={STAT}
          tick={10 + missSwell * 6}
          width={2.6 + missSwell * 2.4}
        />
        {/* It makes way for the population on "the price of seeing only part". */}
        <Note at={closeAt + 2} x={barX + 16} y={stripY + h(44)} out={priceAt - 6}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            off by{" "}
            <b style={{ color: STAT_INK }}>
              <Mark at={missAt - 2}>{fmt(KNOWN.error)}</Mark>
            </b>
            ,{" "}
            <Mark at={errorAt - 2}>the estimation error</Mark>
          </span>
        </Note>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The echo of Fig. 3: two small fields, the population and the sample. */
const Echo: React.FC<{
  x: readonly [number, number];
  fieldAt: number;
  hideAt: number;
  sampleAt: number;
  seeAt: number;
  movesAt: number;
  out: number;
}> = ({ x, fieldAt, hideAt, sampleAt, seeAt, movesAt, out }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const gone = ease(frame, out, 14);
  if (frame < fieldAt || gone >= 1) return null;
  const top = y(ECHO_TOP);
  const w = (ECHO_COLS - 1) * ECHO_PITCH;
  const fh = h((ECHO_ROWS - 1) * ECHO_PITCH);
  const at = (i: number) => [i % ECHO_COLS, Math.floor(i / ECHO_COLS)] as const;
  const px = (x0: number, i: number) => x0 + at(i)[0] * ECHO_PITCH;
  const py = (i: number) => top + h(at(i)[1] * ECHO_PITCH);
  // "you can't see it": the population fades to its outline.
  const hidden = 1 - ease(frame, hideAt, 16) * 0.72;
  const sampleField = ease(frame, sampleAt - 8, 12);
  const moved = (k: number) => ease(frame, movesAt + k * 1.5, 16);
  const outline = (x0: number, p: number) =>
    p > 0 ? (
      <rect
        x={x0 - 12}
        y={top - 12}
        width={w + 24}
        height={fh + 24}
        rx={8}
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
        opacity={0.7}
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    ) : null;
  return (
    <Svg opacity={1 - gone}>
      {outline(x[0], ease(frame, fieldAt, 24))}
      {Array.from({ length: ECHO_COLS * ECHO_ROWS }, (_, i) => {
        const a = ease(frame, fieldAt + at(i)[0] * 0.35, 8);
        return a > 0 ? <circle key={i} cx={px(x[0], i)} cy={py(i)} r={2.3} fill={RAW} opacity={a * hidden} /> : null;
      })}
      {outline(x[1], ease(frame, sampleAt - 8, 20))}
      {sampleField > 0
        ? Array.from({ length: ECHO_COLS * ECHO_ROWS }, (_, i) => (
            <circle key={i} cx={px(x[1], i)} cy={py(i)} r={2.3} fill={RAW} opacity={sampleField * 0.32} />
          ))
        : null}
      {SAMPLE_A.map((from, k) => {
        const a = ease(frame, sampleAt + k * 1.5, 10);
        if (a <= 0) return null;
        const t = moved(k);
        const to = SAMPLE_B[k];
        // "You can see it": each answer swells in turn.
        const seen = pulse(frame, seeAt - 2 + k * 1.6, 16);
        return (
          <circle
            key={k}
            cx={lerp(px(x[1], from), px(x[1], to), t)}
            cy={lerp(py(from), py(to), t)}
            r={7 * a * (1 + seen * 0.45)}
            fill={BAR}
            stroke={PAPER}
            strokeWidth={2}
          />
        );
      })}
    </Svg>
  );
};
