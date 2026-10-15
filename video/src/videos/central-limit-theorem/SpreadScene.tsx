import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Axis, Bars, sx, type XScale } from "./charts";
import { histogram, SPREADS, WAIT_SD } from "./data";
import { SERIF } from "./fonts";
import {
  ACCENT,
  ACCENT_INK,
  body,
  fmt,
  HAIRLINE,
  headline,
  halo,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  note,
  smallCaps,
} from "./style";
import { FigLabel, Ink, Leader, Note } from "./ui";

const X: XScale = { lo: 0, hi: 25, x0: 120, x1: 1160 };
const BIN = 0.5;
const ROW_H = 150;
const BASES = [432, 640, 848];
const TICKS = [0, 5, 10, 15, 20, 25];

/** Each row is scaled to its own peak, ridgeline style: the comparison is
 *  of widths, which the brackets and the table carry in numbers. */
const ROWS = SPREADS.map((s, i) => {
  const counts = histogram(s.means, 0, 25, BIN);
  return { ...s, counts, unit: ROW_H / Math.max(...counts), base: BASES[i] };
});

const TABLE_X = 1270;
const COLS = [TABLE_X, TABLE_X + 170, TABLE_X + 380];
const TABLE_TOP = 196;
const ROW_STEP = 64;

/**
 * Same population, three sample sizes: every pile centers on ten, and the
 * spread falls like one over root n. The table puts the simulated spread
 * beside the theorem's prediction.
 */
export const SpreadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const start = n.beat("spread").from;
  const spreadAt = n.word("spread", "spread");
  const tenAt = n.word("spread", "ten");
  const tighterAt = n.word("spread", "tighter");
  const numbersFrom = n.beat("numbers").from;
  const sayAt = [n.word("numbers", "five"), n.word("numbers", "Thirty"), n.word("numbers", "hundred")];
  const ruleFrom = n.beat("rule").from;
  const rootAt = n.word("rule", "square root");
  const fourAt = n.word("rule", "Four times");

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={20} style={{ left: 116, top: 104, ...headline(56), whiteSpace: "nowrap" }}>
        The bigger the sample,
      </Ink>
      <Ink
        at={spreadAt - 4}
        dur={18}
        style={{ left: 600, top: 104, ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        the tighter the pile.
      </Ink>
      <FigLabel n="5" title="Average wait, samples of 5, 30 and 100" at={start - 8} x={120} y={186} size={23} />

      {ROWS.map((r, i) => {
        const at = start - 10 + i * 6;
        const said = ease(frame, sayAt[i] - 2, 10);
        const bracketAt = tighterAt - 2 + i * 4;
        const y = r.base - ROW_H * 0.52;
        const x0 = sx(X, r.center - r.spread);
        const x1 = sx(X, r.center + r.spread);
        const b = ease(frame, bracketAt, 14);
        return (
          <React.Fragment key={r.n}>
            <Ink at={at - 4} dur={14} style={{ left: 120, top: r.base - ROW_H - 18 }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 34, color: INK }}>
                n = {r.n}
              </span>
            </Ink>
            <Bars
              counts={r.counts}
              lo={0}
              bin={BIN}
              scale={X}
              base={r.base}
              unit={r.unit}
              grow={(k) => ease(frame, at + Math.abs(k * BIN - 10) * 0.9, 12)}
            />
            <Axis
              scale={X}
              base={r.base}
              ticks={i === 2 ? TICKS : []}
              format={(v) => (v === 25 ? "25 min" : String(v))}
              at={at - 2}
              size={16}
            />
            {b > 0 ? (
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
                <g stroke={said > 0 ? ACCENT : INK} strokeWidth={2 + said * 1.2}>
                  <line x1={x0} x2={x0 + (x1 - x0) * b} y1={y} y2={y} />
                  <line x1={x0} x2={x0} y1={y - 8} y2={y + 8} />
                  {b >= 1 ? <line x1={x1} x2={x1} y1={y - 8} y2={y + 8} /> : null}
                </g>
              </svg>
            ) : null}
            <Note at={bracketAt + 8} x={x1 + 12} y={y - 13}>
              <span style={{ ...note(18, said > 0 ? ACCENT_INK : INK_SOFT), ...halo }}>± {fmt(r.spread)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      <Leader
        points={[
          [sx(X, 10), BASES[2]],
          [sx(X, 10), BASES[0] - ROW_H - 10],
        ]}
        at={tenAt - 4}
        dur={16}
        dot={false}
        color={ACCENT}
        width={2}
        dash="7 6"
      />
      <Note at={tenAt + 2} x={sx(X, 10) + 10} y={BASES[0] - ROW_H - 22}>
        <span style={note(17, ACCENT_INK)}>10 min</span>
      </Note>

      {/* The table: simulated spread beside the theorem's prediction. */}
      <Ink at={start + 14} dur={16} style={{ left: TABLE_X, top: TABLE_TOP, width: 530 }}>
        <div style={{ position: "relative", height: 34 }}>
          <span style={{ ...smallCaps(14, INK_SOFT), position: "absolute", left: 0 }}>Sample size</span>
          <span style={{ ...smallCaps(14, INK_SOFT), position: "absolute", left: COLS[1] - TABLE_X }}>
            Simulated spread
          </span>
          <span
            style={{
              position: "absolute",
              left: COLS[2] - TABLE_X,
              top: -10,
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 26,
              color: INK,
            }}
          >
            σ ÷ √n
          </span>
        </div>
        <div style={{ height: 2, background: INK }} />
      </Ink>
      {ROWS.map((r, i) => {
        const y = TABLE_TOP + 44 + i * ROW_STEP;
        const rowIn = ease(frame, start + 20 + i * 5, 12);
        const said = ease(frame, sayAt[i] - 2, 10);
        const theory = ease(frame, rootAt + i * 6, 10);
        return (
          <React.Fragment key={r.n}>
            <div
              style={{
                position: "absolute",
                left: TABLE_X,
                top: y,
                width: 530,
                height: ROW_STEP,
                borderBottom: `1px solid ${HAIRLINE}`,
                opacity: rowIn,
              }}
            />
            <div style={{ position: "absolute", left: COLS[0], top: y + 8, opacity: rowIn, ...headline(40) }}>
              {r.n}
            </div>
            <div
              style={{
                position: "absolute",
                left: COLS[1] - 8,
                top: y + 12,
                width: 150 * said,
                height: 40,
                background: HIGHLIGHT,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: COLS[1],
                top: y + 8,
                opacity: said,
                ...headline(40),
                fontVariantNumeric: "tabular-nums lining-nums",
              }}
            >
              {fmt(r.spread)}
            </div>
            <div
              style={{
                position: "absolute",
                left: COLS[2],
                top: y + 8,
                opacity: theory,
                transform: `translateX(${(1 - theory) * 14}px)`,
                ...headline(40),
                color: ACCENT_INK,
                fontVariantNumeric: "tabular-nums lining-nums",
              }}
            >
              {fmt(r.theory)}
            </div>
          </React.Fragment>
        );
      })}
      <Note at={numbersFrom + 10} x={TABLE_X} y={TABLE_TOP + 44 + 3 * ROW_STEP + 12} width={530}>
        <span style={note(16, INK_SOFT)}>
          Standard deviation of 2,000 sample averages, in minutes.
        </span>
      </Note>

      {/* The rule. */}
      <Ink at={ruleFrom - 4} dur={18} style={{ left: TABLE_X, top: 548, width: 530 }}>
        <div style={{ height: 1, background: INK, marginBottom: 18 }} />
        <div style={smallCaps(15, ACCENT_INK)}>The rule</div>
        <div style={{ ...body(30), color: INK, marginTop: 10 }}>
          Spread of the average
        </div>
        <div style={{ ...headline(76, true), marginTop: 6 }}>
          = σ ÷ √<span style={{ fontStyle: "italic" }}>n</span>
        </div>
        <div style={{ ...note(17, INK_SOFT), marginTop: 8 }}>
          σ, the population&apos;s spread, is {fmt(WAIT_SD)} min.
        </div>
      </Ink>
      <Ink at={fourAt - 2} dur={16} style={{ left: TABLE_X, top: 800, width: 530 }}>
        <span style={{ ...body(30, true), color: ACCENT_INK }}>Four times the data, half the spread.</span>
      </Ink>
    </AbsoluteFill>
  );
};
