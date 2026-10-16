import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { jitter, KNOWN } from "./data";
import { Bracket, DOT, Mu, STAT, STAT_INK, Svg, TruthLine, XBar } from "./parts";

const X: XScale = { lo: 50, hi: 150, x0: 160, x1: 1760 };
const CARD_Y = 300;
const FIG_Y = 562;
const LABEL_Y = 626;
const STRIP = 722;
const JIT = 26;
const BASE = 830;
const JITTER = jitter(50, KNOWN.n);

/** One card: a name, what it describes, and its symbol. */
const Card: React.FC<{
  x: number;
  at: number;
  name: string;
  what: string;
  how: React.ReactNode;
  howAt: number;
  symbol: React.ReactNode;
  symbolAt: number;
  symbolNote: string;
  color: string;
}> = ({ x, at, name, what, how, howAt, symbol, symbolAt, symbolNote, color }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const rule = ease(frame, at - 4, 16);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y(CARD_Y), width: 720 * rule, height: 2, background: INK }} />
      <Ink at={at} dur={16} style={{ left: x, top: y(CARD_Y + 22), whiteSpace: "nowrap" }}>
        <span style={{ ...body(48, true), color }}>{name}</span>
      </Ink>
      <Ink at={at + 6} dur={14} style={{ left: x, top: y(CARD_Y + 96), whiteSpace: "nowrap" }}>
        <span style={note(25, INK_SOFT)}>{what}</span>
      </Ink>
      <Ink at={howAt} dur={14} style={{ left: x, top: y(CARD_Y + 140), whiteSpace: "nowrap" }}>
        <span style={{ ...note(25, INK), fontWeight: 650 }}>{how}</span>
      </Ink>
      <Ink at={symbolAt} dur={16} style={{ left: x + 540, top: y(CARD_Y + 14), width: 180, textAlign: "center" }}>
        <div style={{ ...headline(112), color, lineHeight: 1 }}>{symbol}</div>
        <div style={{ ...label(20, INK_SOFT), marginTop: 18 }}>{symbolNote}</div>
      </Ink>
    </>
  );
};

/**
 * Part 2: the parameter and the statistic, then a population whose mean we
 * know, one sample of fifty from it, and the gap between the two.
 */
export const ParameterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const parameterAt = n.word("parameter", "parameter");
  const fixedAt = n.word("parameter", "fixed");
  const statisticAt = n.word("statistic", "statistic");
  const movesAt = n.word("statistic", "moves");
  const muAt = n.word("letters", "mu");
  const xBarAt = n.word("letters", "x-bar");
  const truthAt = n.word("cheat", "truth");
  const hundredAt = n.word("cheat", "hundred");
  const fiftyAt = n.word("cheat", "fifty");
  const averageAt = n.word("miss", "average");
  const closeAt = n.word("miss", "Close");

  const muX = sx(X, KNOWN.mu);
  const barX = sx(X, KNOWN.xBar);
  const tick = ease(frame, averageAt - 4, 12);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={parameterAt - 6} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Parameters stay put.
        </Ink>
        <Ink at={movesAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          Statistics move.
        </Ink>
      </div>

      <Card
        x={160}
        at={parameterAt}
        name="Parameter"
        what="Describes the population"
        how="Fixed, but you can't see it"
        howAt={fixedAt - 2}
        symbol={<Mu />}
        symbolAt={muAt - 4}
        symbolNote="mu, its mean"
        color={INK}
      />
      <Card
        x={1000}
        at={statisticAt}
        name="Statistic"
        what="Computed from the sample"
        how="You can see it, but it moves"
        howAt={movesAt - 4}
        symbol={<XBar />}
        symbolAt={xBarAt - 4}
        symbolNote="x-bar, its mean"
        color={STAT_INK}
      />

      {/* ── Fig. 4: a population we know, and one sample from it ── */}
      <FigLabel
        n="4"
        title={`One sample of ${KNOWN.n}, from a population whose mean is ${KNOWN.mu}`}
        at={truthAt - 4}
        x={160}
        y={y(FIG_Y)}
      />
      <Axis scale={X} base={y(BASE)} ticks={[50, 75, 100, 125, 150]} at={truthAt - 2} />
      <TruthLine x={muX} bottom={y(BASE)} top={y(LABEL_Y + 34)} at={hundredAt - 4} />
      <Note at={hundredAt} x={muX - 14} y={y(LABEL_Y)} align="right">
        <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          <Mu /> = {KNOWN.mu}
        </span>
      </Note>

      <Svg>
        {KNOWN.values.map((v, j) => {
          const a = ease(frame, fiftyAt - 6 + j * 0.45, 6);
          if (a <= 0) return null;
          return (
            <circle
              key={j}
              cx={sx(X, v)}
              cy={y(STRIP) + h((JITTER[j] - 0.5) * 2 * JIT)}
              r={7 * a}
              fill={DOT}
              stroke={PAPER}
              strokeWidth={1.2}
            />
          );
        })}
        {tick > 0 ? (
          <line
            x1={barX}
            x2={barX}
            y1={y(STRIP) - h(44) * tick}
            y2={y(STRIP) + h(44)}
            stroke={STAT}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <Note at={averageAt} x={barX + 14} y={y(LABEL_Y)}>
        <span style={{ ...note(25, STAT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          <XBar /> = {fmt(KNOWN.xBar)}
        </span>
      </Note>

      {/* "Close, but not on it." */}
      <Bracket x0={muX} x1={barX} y={y(STRIP) + h(58)} at={closeAt - 2} up color={STAT} tick={10} width={2.6} />
      <Note at={closeAt + 2} x={barX + 16} y={y(STRIP) + h(44)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          off by <b style={{ color: STAT_INK }}>{fmt(KNOWN.error)}</b>, the estimation error
        </span>
      </Note>
    </AbsoluteFill>
  );
};
