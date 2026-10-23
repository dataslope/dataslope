import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOGITS, pct, probsAt, signed, TOKENS } from "./data";
import { Drift, FILL, Headline, Kicker, Marked, Mono, Svg, TEXT, Tok, X0 } from "./kit";

/** The bar chart, in layout y: its baseline and the height of 100%. */
const BASE = 770;
const FULL = 400;
const BAR_W = 140;
const BX = (i: number) => 320 + i * 220;
const GRID_X = [200, 1060] as const;
const STOPS = [0, 0.25, 0.5, 0.75, 1];

/** The right-hand panel: the temperature and its slider, 0 to 2. */
const PANEL = 1230;
const TRACK = [1240, 1760] as const;
const T_MAX = 2;
const TICKS = [0, 0.5, 1, 1.5, 2];
const tx = (t: number) => TRACK[0] + ((TRACK[1] - TRACK[0]) * t) / T_MAX;

/** "1.0", "0.2", and plain "0" once the dial is all the way down. */
const tLabel = (t: number) => (t < 0.005 ? "0" : t.toFixed(1));

/**
 * Divide, low, greedy, high: one bar chart whose temperature moves to each
 * stop the narration names, after LlmTemperature's TempScene. Every bar
 * height comes from measure.py's grid.
 */
export const TempScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("divide").from;
  const beforeAt = n.word("divide", "before the softmax");
  const orderAt = n.word("divide", "order never changes");
  const shapeAt = n.word("divide", "shape");
  const belowAt = n.word("low", "Below one");
  const pointTwoAt = n.word("low", "zero point two");
  const ninetyAt = n.word("low", "ninety-nine percent");
  const zeroAt = n.word("greedy", "At zero");
  const greedyAt = n.word("greedy", "greedy decoding");
  const aboveAt = n.word("high", "Above one");
  const rockAt = n.word("high", "rock climbs");

  // The temperature, eased from stop to stop on the narration's words.
  const stops: { at: number; t: number; dur: number }[] = [
    { at: belowAt, t: 0.7, dur: 22 },
    { at: pointTwoAt - 4, t: 0.2, dur: 22 },
    { at: zeroAt, t: 0, dur: 18 },
    { at: aboveAt, t: 1.5, dur: 54 },
  ];
  const t = stops.reduce((acc, s) => acc + (s.t - acc) * ease(frame, s.at, s.dur), 1);
  const probs = probsAt(t);
  const scaledIn = Math.min(1, Math.max(0, (t - 0.05) / 0.1));

  const base = y(BASE);
  const full = h(FULL);
  const chart = ease(frame, start - 6, 16);
  const noteY = y(720);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={orderAt - 4} level={-36} />
      <Sfx name="el-whoosh" at={pointTwoAt - 4} level={-35} />
      <Sfx name="el-tap" at={zeroAt} level={-29} />
      <Sfx name="el-whoosh" at={aboveAt} level={-35} />

      <Drift from={start} to={n.beat("topp").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Sampling</Kicker>
      <Headline lead="Temperature divides the scores" turn="before the softmax." at={start - 4} turnAt={beforeAt - 2} />
      <FigLabel n="2" title="Probability of each token at temperature T" at={start} x={X0} y={y(236)} />

      {/* Faint rules at 0, 25, 50, 75 and 100%, the baseline in ink. */}
      <Svg opacity={chart}>
        {STOPS.map((s) => (
          <line
            key={s}
            x1={GRID_X[0]}
            x2={GRID_X[0] + (GRID_X[1] - GRID_X[0]) * chart}
            y1={base - full * s}
            y2={base - full * s}
            stroke={s === 0 ? INK : HAIRLINE}
            strokeWidth={s === 0 ? 1.6 : 1}
            strokeDasharray={s === 0 ? undefined : "2 5"}
          />
        ))}
        {TOKENS.map((_, i) => {
          const hgt = full * probs[i] * ease(frame, start - 2 + i * 3, 16);
          return <rect key={i} x={BX(i) - BAR_W / 2} y={base - hgt} width={BAR_W} height={hgt} fill={FILL[i]} />;
        })}
      </Svg>
      {STOPS.map((s) => (
        <div
          key={s}
          style={{ position: "absolute", right: 1920 - GRID_X[0] + 14, top: base - full * s - 13, opacity: chart, ...note(20, INK_SOFT) }}
        >
          {Math.round(s * 100)}%
        </div>
      ))}

      {TOKENS.map((_, i) => {
        const p = probs[i];
        const markAt = i === 0 ? ninetyAt : i === TOKENS.length - 1 ? rockAt : undefined;
        const markOut = i === 0 ? zeroAt - 4 : undefined;
        return (
          <React.Fragment key={i}>
            {/* The probability, riding on its bar. */}
            <div
              style={{
                position: "absolute",
                left: BX(i) - 110,
                width: 220,
                top: base - full * p - 40,
                textAlign: "center",
                opacity: ease(frame, start + 8 + i * 3, 12),
                ...note(24, TEXT[i]),
                fontWeight: 650,
              }}
            >
              {markAt === undefined ? pct(p) : <Marked at={markAt - 2} out={markOut}>{pct(p)}</Marked>}
            </div>
            <Ink at={start - 4 + i * 3} dur={12} style={{ left: BX(i) - 110, width: 220, top: base + 14, textAlign: "center" }}>
              <Tok i={i} size={30} />
            </Ink>
            {/* The score after division: the gaps grow below 1 and shrink above. */}
            <div
              style={{
                position: "absolute",
                left: BX(i) - 110,
                width: 220,
                top: base + 62,
                textAlign: "center",
                opacity: ease(frame, orderAt - 6 + i * 2, 12) * scaledIn,
                ...note(22, INK),
              }}
            >
              {signed(LOGITS[i] / Math.max(t, 1e-6))}
            </div>
          </React.Fragment>
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 1920 - (BX(0) - BAR_W / 2) + 18,
          top: base + 62,
          whiteSpace: "nowrap",
          opacity: ease(frame, orderAt - 8, 12) * scaledIn,
          ...label(20),
        }}
      >
        Score ÷ T
      </div>

      {/* The temperature, its formula and its dial. */}
      <Ink at={start} dur={16} style={{ left: PANEL, top: y(316) }}>
        <span style={{ ...note(30, INK), fontWeight: 500 }}>
          <Mono>softmax(logits / T)</Mono>
        </span>
      </Ink>
      <Ink at={start + 4} dur={14} style={{ left: PANEL, top: y(390) }}>
        <span style={label(21)}>Temperature</span>
      </Ink>
      <Ink at={start + 6} dur={16} style={{ left: PANEL - 4, top: y(424) }}>
        <span style={{ ...headline(100), fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap" }}>T = {tLabel(t)}</span>
      </Ink>
      <Svg opacity={ease(frame, start + 8, 14)}>
        <line x1={TRACK[0]} x2={TRACK[1]} y1={y(612)} y2={y(612)} stroke={INK} strokeWidth={1.6} />
        {TICKS.map((v) => (
          <line key={v} x1={tx(v)} x2={tx(v)} y1={y(612) - 8} y2={y(612) + 8} stroke={INK} strokeWidth={1.4} />
        ))}
        <circle cx={tx(t)} cy={y(612)} r={14} fill={ACCENT} stroke={PAPER} strokeWidth={3} />
      </Svg>
      {TICKS.map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            left: tx(v),
            top: y(612) + 22,
            transform: "translateX(-50%)",
            opacity: ease(frame, start + 10, 12),
            ...note(20, INK_SOFT),
          }}
        >
          {v}
        </div>
      ))}

      {/* What each stretch of the dial does, one note at a time. */}
      <Ink at={orderAt - 4} out={belowAt - 6} dur={16} style={{ left: PANEL, top: noteY, width: 570 }}>
        <div style={{ ...body(32), color: INK, textWrap: "balance" }}>
          The order never changes. <span style={{ opacity: ease(frame, shapeAt - 6, 12) }}>Only the shape does.</span>
        </div>
      </Ink>
      <Ink at={belowAt + 2} out={zeroAt - 6} dur={16} style={{ left: PANEL, top: noteY, width: 570 }}>
        <div style={{ ...body(32), color: INK, textWrap: "balance" }}>Below 1, the gaps between scores grow.</div>
      </Ink>
      <Ink at={zeroAt + 2} out={aboveAt - 6} dur={16} style={{ left: PANEL, top: noteY, width: 570 }}>
        <div style={{ ...body(32), color: INK, textWrap: "balance" }}>
          At 0, always the top token.{" "}
          <span style={{ color: ACCENT_INK, opacity: ease(frame, greedyAt - 4, 12) }}>Greedy decoding.</span>
        </div>
      </Ink>
      <Ink at={aboveAt + 2} dur={16} style={{ left: PANEL, top: noteY, width: 570 }}>
        <div style={{ ...body(32), color: INK, textWrap: "balance" }}>Above 1, the gaps shrink.</div>
      </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
