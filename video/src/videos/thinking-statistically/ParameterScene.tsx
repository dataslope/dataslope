import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, KNOWN } from "./data";
import { Bell, Bracket, DOT, lerp, Mark, Mu, pulse, STAT, STAT_INK, Svg, TruthLine, XBar } from "./parts";
import { ROW_ONE } from "./TwentyScene";

const X: XScale = { lo: 50, hi: 150, x0: 160, x1: 1760 };
const CARD_Y = 300;
const FIG_Y = 562;
const LABEL_Y = 626;
const STRIP = 722;
const JIT = 26;
const BASE = 830;
const JITTER = jitter(50, KNOWN.n);

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
  const codeAt = n.word("cheat", "In code");
  const cheatAt = n.word("cheat", "cheat");
  const buildAt = n.word("cheat", "Build");
  const hundredAt = n.word("cheat", "hundred");
  const fiftyAt = n.word("cheat", "fifty");
  const averageAt = n.word("miss", "average");
  const pointFourAt = n.word("miss", "one point four");
  const closeAt = n.word("miss", "Close");
  const missAt = n.word("price", "miss");
  const mistakeAt = n.word("price", "mistake");
  const partAt = n.word("price", "seeing only part");
  const turnAt = n.beat("twenty-in").from;
  const missAgainAt = n.word("twenty-in", "miss");
  const usuallyAt = n.word("twenty-in", "usually");
  const oneSampleAt = n.word("twenty-in", "One sample");

  // "In code": the definitions step back for the demonstration, and leave on
  // the turn to the next figure.
  const cardsOp = (1 - ease(frame, codeAt - 2, 20) * 0.55) * (1 - ease(frame, turnAt, 18));
  // "One sample can't tell you": the sample, its average, the axis and mu
  // slide into row 1 of Fig. 5; everything else about it fades first.
  const fade = ease(frame, oneSampleAt - 4, 12);
  const m = ease(frame, oneSampleAt - 2, 40);
  const XS: XScale = { ...X, x1: lerp(X.x1, ROW_ONE.X.x1, m) };
  const stripY = lerp(y(STRIP), y(ROW_ONE.ROW0), m);
  const base = lerp(y(BASE), y(ROW_ONE.BASE), m);
  const muX = sx(XS, KNOWN.mu);
  const barX = sx(XS, KNOWN.xBar);
  const tick = ease(frame, averageAt - 4, 12);
  const tickH = lerp(h(44), h(ROW_ONE.TICK), m);
  // The miss, swelling each time it is named again.
  const missSwell = pulse(frame, missAt - 2, 20) + pulse(frame, missAgainAt - 2, 20);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two symbols, fifty values, their average, the miss,
           the population behind it, and the sample sliding into Fig. 5 ── */}
      <Sfx name="el-tap" at={muAt - 4} level={-28} />
      <Sfx name="el-tap" at={xBarAt - 4} level={-28} />
      <Sfx name="el-sprinkle" at={fiftyAt - 6} level={-32} />
      <Sfx name="el-tap" at={averageAt - 4} level={-27} />
      <Sfx name="el-pencil" at={closeAt - 2} level={-34} />
      <Sfx name="el-pencil" at={partAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={oneSampleAt - 2} level={-34} />

      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={parameterAt - 6} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
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
          symbolNoteAt={xBarAt + 10}
          color={STAT_INK}
        />
      </AbsoluteFill>

      {/* ── Fig. 4: a population we know, and one sample from it ── */}
      <FigLabel
        n="4"
        title={`One sample of ${KNOWN.n}, from a population whose mean is ${KNOWN.mu}`}
        at={cheatAt - 4}
        out={oneSampleAt - 4}
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
        at={partAt - 4}
        out={usuallyAt - 2}
        dur={30}
      />
      <Note at={partAt + 14} x={sx(X, 70) - 18} y={y(BASE - 64)} align="right" out={usuallyAt - 2}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", ...halo }}>the whole population</span>
      </Note>
      <TruthLine x={muX} bottom={base} top={lerp(y(LABEL_Y + 34), y(ROW_ONE.ROW0 - 16), m)} at={hundredAt - 4} />
      <Note at={hundredAt} x={muX - 14} y={y(LABEL_Y)} align="right" out={oneSampleAt - 4}>
        <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          <Mu /> = {KNOWN.mu}
        </span>
      </Note>

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
      <Note at={averageAt} x={barX + 14} y={y(LABEL_Y)} out={oneSampleAt - 4}>
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
        <Note at={closeAt + 2} x={barX + 16} y={stripY + h(44)} out={partAt - 6}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            off by{" "}
            <b style={{ color: STAT_INK }}>
              <Mark at={missAt - 2}>{fmt(KNOWN.error)}</Mark>
            </b>
            ,{" "}
            <Mark at={mistakeAt - 2}>
              the estimation error
            </Mark>
          </span>
        </Note>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
