import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { histogram, SPREADS, WAIT_SD } from "./data";
import { useLayout } from "../../editorial/layout";
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
  label,
} from "../../editorial/style";
import { FigLabel, Ink, Leader, NextLine, Note } from "../../editorial/ui";

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
  const { y: Y, h, pts } = useLayout();
  const start = n.beat("spread").from;
  const spreadAt = n.word("spread", "spread");
  const tenAt = n.word("spread", "ten");
  const tighterAt = n.word("spread", "tighter");
  const numbersFrom = n.beat("numbers").from;
  const sayAt = [n.word("numbers", "five"), n.word("numbers", "Thirty"), n.word("numbers", "hundred")];
  const ruleFrom = n.beat("rule").from;
  const rootAt = n.word("rule", "square root");
  const fourAt = n.word("rule", "Four times");
  const nextAt = n.word("next", "standard error");

  return (
    <AbsoluteFill>
      {/* One line in two inks: the second half follows the first in the flow,
          so it sits a word space after it in any face. */}
      <div style={{ position: "absolute", left: 116, top: Y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          The bigger the sample,
        </Ink>
        <Ink
          at={spreadAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          the tighter the pile.
        </Ink>
      </div>
      <FigLabel n="5" title="Average wait, samples of 5, 30 and 100" at={start - 8} x={120} y={Y(196)} />

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
            <Ink at={at - 4} dur={14} style={{ left: 120, top: Y(r.base - ROW_H - 18) }}>
              <span style={{ ...body(34, true), color: INK }}>
                n = {r.n}
              </span>
            </Ink>
            <Bars
              counts={r.counts}
              lo={0}
              bin={BIN}
              scale={X}
              base={Y(r.base)}
              unit={h(r.unit)}
              grow={(k) => ease(frame, at + Math.abs(k * BIN - 10) * 0.9, 12)}
            />
            <Axis
              scale={X}
              base={Y(r.base)}
              ticks={i === 2 ? TICKS : []}
              format={(v) => (v === 25 ? "25 min" : String(v))}
              at={at - 2}
              size={20}
            />
            {b > 0 ? (
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
                <g stroke={said > 0 ? ACCENT : INK} strokeWidth={2 + said * 1.2}>
                  <line x1={x0} x2={x0 + (x1 - x0) * b} y1={Y(y)} y2={Y(y)} />
                  <line x1={x0} x2={x0} y1={Y(y) - 8} y2={Y(y) + 8} />
                  {b >= 1 ? <line x1={x1} x2={x1} y1={Y(y) - 8} y2={Y(y) + 8} /> : null}
                </g>
              </svg>
            ) : null}
            <Note at={bracketAt + 8} x={x1 + 12} y={Y(y) - 13}>
              <span style={{ ...note(22, said > 0 ? ACCENT_INK : INK_SOFT), ...halo }}>± {fmt(r.spread)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      <Leader
        points={pts([
          [sx(X, 10), BASES[2]],
          [sx(X, 10), BASES[0] - ROW_H - 10],
        ])}
        at={tenAt - 4}
        dur={16}
        dot={false}
        color={ACCENT}
        width={2}
        dash="7 6"
      />
      <Note at={tenAt + 2} x={sx(X, 10) + 10} y={Y(BASES[0] - ROW_H - 22)}>
        <span style={note(21, ACCENT_INK)}>10 min</span>
      </Note>

      {/* The table: simulated spread beside the theorem's prediction. */}
      <Ink at={start + 14} dur={16} style={{ left: TABLE_X, top: Y(TABLE_TOP), width: 530 }}>
        <div style={{ position: "relative", height: 34 }}>
          <span style={{ ...label(19, INK_SOFT), position: "absolute", left: 0 }}>Sample size</span>
          <span style={{ ...label(19, INK_SOFT), position: "absolute", left: COLS[1] - TABLE_X }}>
            Simulated spread
          </span>
          <span
            style={{
              position: "absolute",
              left: COLS[2] - TABLE_X,
              top: -10,
              ...body(28, true),
              color: INK,
              whiteSpace: "nowrap",
            }}
          >
            σ ÷ √n
          </span>
        </div>
        <div style={{ height: 2, background: INK }} />
      </Ink>
      {ROWS.map((r, i) => {
        const y = TABLE_TOP + 44 + i * ROW_STEP;
        const top = (dy: number) => Y(y + dy);
        const rowIn = ease(frame, start + 20 + i * 5, 12);
        const said = ease(frame, sayAt[i] - 2, 10);
        const theory = ease(frame, rootAt + i * 6, 10);
        return (
          <React.Fragment key={r.n}>
            <div
              style={{
                position: "absolute",
                left: TABLE_X,
                top: top(0),
                width: 530,
                height: h(ROW_STEP),
                borderBottom: `1px solid ${HAIRLINE}`,
                opacity: rowIn,
              }}
            />
            <div style={{ position: "absolute", left: COLS[0], top: top(8), opacity: rowIn, ...headline(40) }}>
              {r.n}
            </div>
            <div
              style={{
                position: "absolute",
                left: COLS[1] - 8,
                top: top(12),
                width: 150 * said,
                height: 40,
                background: HIGHLIGHT,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: COLS[1],
                top: top(8),
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
                top: top(8),
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
      <Note at={numbersFrom + 10} x={TABLE_X} y={Y(TABLE_TOP + 44 + 3 * ROW_STEP + 12)} width={530}>
        <span style={note(20, INK_SOFT)}>
          Standard deviation of 2,000 averages, in minutes.
        </span>
      </Note>

      {/* The rule. */}
      <Ink at={ruleFrom - 4} dur={18} style={{ left: TABLE_X, top: Y(548), width: 530 }}>
        <div style={{ height: 1, background: INK, marginBottom: 18 }} />
        <div style={label(20, ACCENT_INK)}>The rule</div>
        <div style={{ ...body(30), color: INK, marginTop: 10 }}>
          Spread of the average
        </div>
        <div style={{ ...headline(76, true), marginTop: 6 }}>
          = σ ÷ √<span style={{ fontStyle: "italic" }}>n</span>
        </div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 8 }}>
          σ, the population&apos;s spread, is {fmt(WAIT_SD)} min.
        </div>
      </Ink>
      <Ink at={fourAt - 2} dur={16} style={{ left: TABLE_X, top: Y(800), width: 530 }}>
        <span style={{ ...body(30, true), color: ACCENT_INK }}>Four times the data, half the spread.</span>
      </Ink>
      <NextLine at={nextAt} x={TABLE_X} y={Y(858)} width={530}>
        the standard error.
      </NextLine>
    </AbsoluteFill>
  );
};
