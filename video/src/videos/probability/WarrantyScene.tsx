import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { normalPdf } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { BINOM, num, pct, WARRANTY } from "./data";
import { Count, DATA, Headline, Held, lerp, Spot, STAT_INK, Svg, Sweep, VBracket } from "./parts";

const RIGHT = 1150;
/** The closing band: three named shapes, small. */
const SHAPES = { x: [160, 470, 780], w: 250, base: 910, h: 88 } as const;
const OK_INK = inkOf.green;

/**
 * Part 5's close: the lesson's $80 warranty, its expected payout and the
 * store's expected profit, a million simulated sales, the caveat for a gamble
 * faced once, and the bridge to Unit 4's named distributions.
 */
export const WarrantyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const warrantyFrom = n.beat("warranty").from;
  const eightyAt = n.word("warranty", "eighty-dollar warranty");
  const paysAt = n.word("warranty", "three hundred");
  const failsAt = n.word("warranty", "fails");
  const fifteenAt = n.word("warranty", "fifteen percent");
  const payoutAt = n.word("expect", "expected payout");
  const ofAt = n.word("expect", "of three hundred");
  const fortyFiveAt = n.word("expect", "forty-five dollars");
  const keepAt = n.word("expect", "keep thirty-five");
  const millionAt = n.word("million", "a million");
  const profitAt = n.word("million", "thirty-five dollars and five cents");
  const storeAt = n.word("million", "Good for the store");
  const buyerAt = n.word("million", "losing bet");
  const onAverageAt = n.word("million", "on average");
  const anAverageAt = n.word("once", "an average");
  const onceFrom = n.beat("once").from;
  const oneLossAt = n.word("once", "one loss");
  const spreadAt = n.word("once", "spread matters");
  const manyAt = n.word("once", "many times");
  const surviveAt = n.word("once", "couldn't survive");
  const moreAt = n.word("once", "MORE");
  const insuranceAt = n.word("once", "insurance");
  const nextFrom = n.beat("next").from;
  const sumAt = n.word("next", "sum up");
  const shapesAt = n.word("next", "familiar shapes");
  const namedAt = n.word("next", "named distributions");
  const evAt = n.word("next", "expected value");
  const varAt = n.word("next", "variance");
  const manyRvAt = n.word("next", "many random variables");
  const lastEnd = n.word("next", "distributions", { edge: "end" });

  // The warranty sets back for the bridge, and further once it has been said.
  const dim = ease(frame, nextFrom - 4, 18) * 0.5 + ease(frame, lastEnd + 16, 20) * 0.35;
  const rows = [
    { name: "Device fails", p: WARRANTY.pFail, pays: WARRANTY.payout, at: failsAt - 4, pAt: fifteenAt - 2 },
    { name: "Device works", p: 1 - WARRANTY.pFail, pays: 0, at: fifteenAt + 4, pAt: fifteenAt + 8 },
  ];

  // The three shapes: the lesson's binomial, a bell, an exponential decay.
  const shape = (k: number, at: number) => {
    const p = ease(frame, at, 18);
    if (p <= 0) return null;
    const x0 = SHAPES.x[k];
    const base = y(SHAPES.base);
    const H = h(SHAPES.h);
    const fill = ease(frame, lastEnd + 48 + k * 6, 12);
    if (k === 0) {
      const max = Math.max(...BINOM);
      const bw = SHAPES.w / BINOM.length;
      return BINOM.map((q, i) => (
        <rect key={i} x={x0 + i * bw + 2} y={base - (H * q * ease(frame, at + i, 10)) / max} width={bw - 4} height={(H * q * ease(frame, at + i, 10)) / max} fill={DATA} opacity={lerp(0.8, 0.45, fill)} />
      ));
    }
    const pts = Array.from({ length: 81 }, (_, i) => {
      const t = i / 80;
      const v = k === 1 ? normalPdf(t, 0.5, 0.14) / normalPdf(0.5, 0.5, 0.14) : Math.exp(-t * 4.5);
      return [x0 + t * SHAPES.w, base - H * v] as const;
    }).slice(0, Math.max(2, Math.round(81 * p)));
    const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
    return (
      <g>
        {fill > 0 ? <path d={`${d} L${pts[pts.length - 1][0]},${base} L${x0},${base} Z`} fill={DATA} opacity={fill * 0.3} /> : null}
        <path d={d} fill="none" stroke={DATA} strokeWidth={3.5} strokeLinecap="round" />
      </g>
    );
  };

  return (
    <AbsoluteFill>
      {/* ── Sound: the payout, the profit, the million, the caveat, the bridge ── */}
      <Sfx name="el-pop" at={eightyAt - 4} level={-30} />
      <Sfx name="el-tap" at={fortyFiveAt - 4} level={-29} />
      <Sfx name="el-tap" at={keepAt - 2} level={-28} />
      <Sfx name="el-sprinkle" at={millionAt - 2} level={-34} />
      <Sfx name="el-pencil" at={surviveAt - 4} level={-34} />
      <Sfx name="el-pencil" at={shapesAt - 4} level={-34} />

      <div style={{ opacity: 1 - dim }}>
        <Headline top={y(150)} first="An $80 warranty." second="Who comes out ahead?" firstAt={warrantyFrom - 6} secondAt={paysAt - 4} />
        {/* The warranty itself, small, in the middle of the empty right half
            while the outcomes are worked out on the left; it leaves before the
            million sales take that half. */}
        <Spot id="probability-warranty" at={eightyAt - 2} out={millionAt - 14} left={1395} top={y(434)} width={200} height={187} />
        {/* A list of outcomes rather than a chart, so a plain label, not a
            numbered figure. */}
        <Ink at={eightyAt - 6} dur={14} style={{ left: 160, top: y(268), whiteSpace: "nowrap" }}>
          <span style={label(24, INK_SOFT)}>One warranty, from the store&apos;s side</span>
        </Ink>

        {/* ── The two outcomes ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, onceFrom - 2, 14) * 0.5 }}>
        <Ink at={eightyAt - 2} dur={14} style={{ left: 160, top: y(330), whiteSpace: "nowrap" }}>
          <span style={note(28, INK)}>
            The store takes <b>${WARRANTY.price}</b> up front.
          </span>
        </Ink>
        <VBracket x={190} y0={y(420)} y1={y(510)} at={failsAt - 6} color={INK_SOFT} right />
        {rows.map((r, i) => (
          <React.Fragment key={r.name}>
            {/* One line, one size: the chance stands out by color and weight. */}
            <Ink at={r.at} dur={14} style={{ left: 220, top: y(400 + i * 90), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18, ...note(28, INK) }}>
              <span style={{ width: 210, display: "inline-block" }}>{r.name}</span>
              <span style={{ color: i === 0 ? STAT_INK : INK_SOFT, fontWeight: 500, opacity: ease(frame, r.pAt, 10), width: 90, display: "inline-block" }}>
                {pct(r.p)}
              </span>
              <span style={{ color: INK_SOFT }}>
                store pays <b style={{ color: INK }}>${num(r.pays)}</b>
              </span>
            </Ink>
          </React.Fragment>
        ))}

        {/* ── The expected payout, and what the store keeps ── */}
        <Ink at={payoutAt - 4} dur={16} style={{ left: 160, top: y(596), whiteSpace: "nowrap" }}>
          <span style={note(28, INK)}>
            Expected payout = <span style={{ opacity: ease(frame, ofAt - 6, 10) }}>{WARRANTY.pFail} × ${WARRANTY.payout}</span>
            <span style={{ opacity: ease(frame, fortyFiveAt - 4, 10) }}>
              {" "}
              = <b style={{ color: STAT_INK }}>${fmt(WARRANTY.ePayout, 0)}</b>
            </span>
          </span>
        </Ink>
        <Ink at={keepAt - 4} dur={16} style={{ left: 160, top: y(652), whiteSpace: "nowrap" }}>
          {/* One line, one size: the store's gain is the line's own Inter, in
              the green it has on the right too, and bold. */}
          <span style={note(28, INK)}>
            Expected profit = ${WARRANTY.price} − ${fmt(WARRANTY.ePayout, 0)} ={" "}
            <span style={{ color: OK_INK, fontWeight: 500 }}>
              <Sweep at={keepAt + 4}>${fmt(WARRANTY.eProfit, 0)}</Sweep>
            </span>
          </span>
        </Ink>

        </div>

        {/* A hairline between the two columns, from their first line to the
            last of the sums, inking in with the column on the right. */}
        <div style={{ position: "absolute", left: 964, top: y(330), width: 1, height: y(652) - y(330) + 36, background: HAIRLINE, opacity: ease(frame, millionAt - 4, 14) }} />

        {/* ── A million in code ── */}
        <Ink at={millionAt - 4} dur={14} style={{ left: RIGHT, top: y(330), whiteSpace: "nowrap" }}>
          <span style={note(28, INK)}>
            <Count at={millionAt - 2} dur={26} to={WARRANTY.sold} format={num} /> sold in code:
          </span>
          <span style={{ ...note(28, INK), opacity: ease(frame, profitAt - 4, 10) }}>
            {" "}
            average profit <b style={{ color: STAT_INK }}>${fmt(WARRANTY.simProfit)}</b>
          </span>
        </Ink>
        {/* Each side's average on one line at one size, the amount in its
            color and bold. */}
        <Ink at={storeAt - 4} dur={14} style={{ left: RIGHT, top: y(392), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 16, ...note(28, INK) }}>
          <span style={{ width: 140, display: "inline-block" }}>The store</span>
          <span style={{ color: OK_INK, fontWeight: 500, width: 76, display: "inline-block" }}>+${fmt(WARRANTY.eProfit, 0)}</span>
          <span style={{ color: INK_SOFT }}>a warranty, on average</span>
        </Ink>
        <Ink at={onAverageAt - 4} dur={14} style={{ left: RIGHT, top: y(448), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 16, ...note(28, INK) }}>
          <span style={{ width: 140, display: "inline-block" }}>The buyer</span>
          <span style={{ color: STAT_INK, fontWeight: 500, width: 76, display: "inline-block" }}>
            <Sweep at={buyerAt - 2}>−${fmt(WARRANTY.eProfit, 0)}</Sweep>
          </span>
          <span style={{ color: INK_SOFT, opacity: ease(frame, buyerAt - 2, 10) }}>a losing bet</span>
        </Ink>

        {/* ── When the average isn't the whole story ── */}
        <div style={{ position: "absolute", left: RIGHT, top: y(528), whiteSpace: "nowrap", ...body(34, true), color: INK }}>
          <Held at={anAverageAt - 4}>Faced many times,</Held> <Held at={manyAt - 2}>the average decides.</Held>
        </div>
        <div style={{ position: "absolute", left: RIGHT, top: y(584), whiteSpace: "nowrap", ...body(34, true), color: INK }}>
          <Held at={oneLossAt - 4}>Faced once, and ruinous,</Held>{" "}
          <Held at={spreadAt - 4}>
            <Sweep at={moreAt - 2}>the spread</Sweep> does.
          </Held>
        </div>
        {/* The spread itself, from the buyer's side: a 15% chance of paying
            $300, or $80 for certain. */}
        <div
          style={{
            position: "absolute",
            left: RIGHT,
            top: y(652),
            display: "grid",
            gridTemplateColumns: "auto auto auto auto auto",
            columnGap: 16,
            rowGap: h(14),
            alignItems: "baseline",
            whiteSpace: "nowrap",
            ...note(28, INK),
          }}
        >
          <Held at={oneLossAt + 2}>No warranty</Held>
          <Held at={oneLossAt + 6}>
            <b>{pct(1 - WARRANTY.pFail)}</b>
          </Held>
          <Held at={oneLossAt + 6}>pay $0,</Held>
          <Held at={oneLossAt + 10}>
            <b style={{ color: STAT_INK }}>{pct(WARRANTY.pFail)}</b>
          </Held>
          <Held at={oneLossAt + 10}>
            pay{" "}
            <b style={{ color: STAT_INK }}>
              <Sweep at={surviveAt - 2}>${WARRANTY.payout}</Sweep>
            </b>
          </Held>
          <Held at={oneLossAt + 16}>Warranty</Held>
          <Held at={oneLossAt + 20}>
            <b>{pct(1)}</b>
          </Held>
          <Held at={oneLossAt + 20}>pay ${WARRANTY.price}</Held>
        </div>
        <Note at={insuranceAt - 2} x={RIGHT} y={y(752)}>
          <span style={{ ...body(28), color: INK_SOFT, whiteSpace: "nowrap" }}>Insurance is paying to avoid the spread.</span>
        </Note>
      </div>

      {/* ── The bridge: one variable's summary, and the shapes many share ── */}
      <div style={{ position: "absolute", left: 160, top: y(770), display: "flex", alignItems: "baseline", gap: "0.3em", whiteSpace: "nowrap", ...label(28, INK) }}>
        <Held at={evAt - 2}>E[X]</Held>
        <Held at={varAt - 2}>and Var(X)</Held>
        <Held at={sumAt - 2}>sum up one variable.</Held>
        <Held at={manyRvAt - 2} style={{ color: INK_SOFT }}>
          Many share a shape:
        </Held>
      </div>
      {/* Each name as its shape is drawn, while the bridge is still speaking. */}
      {(["binomial", "normal", "exponential"] as const).map((t, k) => (
        <Note key={t} at={[manyRvAt + 8, shapesAt + 8, namedAt + 4][k]} x={SHAPES.x[k]} y={y(SHAPES.base) + 10}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>{t}</span>
        </Note>
      ))}
      <Svg>
        {shape(0, manyRvAt - 2)}
        {shape(1, shapesAt - 2)}
        {shape(2, namedAt - 6)}
        {[0, 1, 2].map((k) => (
          <line
            key={k}
            x1={SHAPES.x[k]}
            x2={lerp(SHAPES.x[k], SHAPES.x[k] + SHAPES.w, ease(frame, [manyRvAt - 4, shapesAt - 4, namedAt - 8][k], 12))}
            y1={y(SHAPES.base) + 1}
            y2={y(SHAPES.base) + 1}
            stroke={INK}
            strokeWidth={1.4}
          />
        ))}
      </Svg>
      <NextLine at={namedAt - 4} x={RIGHT} y={y(846)} width={620}>
        the shapes randomness takes.
      </NextLine>
    </AbsoluteFill>
  );
};
