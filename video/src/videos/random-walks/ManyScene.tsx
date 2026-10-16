import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, Bars, sx } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, halo, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { BIN, dec, HIST, LO, LONG_STEPS, pct, R_WALKS, SHARE, STEPS } from "./data";
import { COLOR, Headline, HIST_BASE, HIST_TALL, HIST_X, Key, Layer, leaveAt, prose } from "./parts";

const TICKS = [-1, -0.5, 0, 0.5, 1];
/** Bins past plus or minus a half: [-1, -0.5) and [0.5, 1). */
const beyond = (i: number, cut: number) => {
  const lo = LO + i * BIN;
  return lo + BIN <= -cut + 1e-9 || lo >= cut - 1e-9;
};
const TABLE_X = 1410;
const TABLE_W = 400;

/**
 * Many, spread, longer: ten thousand independent pairs, and the
 * correlation of each. A third of the frame's width on either side holds
 * two pairs in five.
 */
export const ManyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("many").from;
  const pairsAt = n.word("many", "Here are");
  const leave = leaveAt(n.beat("why").from);
  const overAt = n.word("spread", "all over");
  const fiveAt = n.word("spread", "Two in five");
  const longAt = n.word("longer", "ten times");
  const wideAt = n.word("longer", "just as wide");

  const base = y(HIST_BASE);
  const unit = h(HIST_TALL) / Math.max(...HIST.walks);
  const top = base - h(HIST_TALL);
  const tail = ease(frame, fiveAt - 4, 14);
  const long = ease(frame, longAt - 2, 22);

  // The featured pair's bar, and a label above every bar.
  const mx = sx(HIST_X, R_WALKS);
  const barTop = base - HIST.walks[Math.floor((R_WALKS - LO) / BIN)] * unit;
  const labelTop = top - 46;

  // The 3,000-flip histogram as an outline over the bars.
  const outline = (() => {
    let d = `M${sx(HIST_X, LO)},${base}`;
    HIST.long.forEach((c, i) => {
      d += ` V${(base - c * unit).toFixed(1)} H${sx(HIST_X, LO + (i + 1) * BIN).toFixed(1)}`;
    });
    return `${d} V${base}`;
  })();

  const row = (i: number) => y(330) + i * 82;

  return (
    <AbsoluteFill>
      <Headline first="Ten thousand independent pairs," second="correlated all over the place." at={start - 4} secondAt={overAt - 2} out={leave} />
      <FigLabel n="3" title="Correlation of each pair of walks, 10,000 pairs" at={start - 2} x={120} y={y(196)} out={leave} />

      <Bars
        counts={HIST.walks}
        lo={LO}
        bin={BIN}
        scale={HIST_X}
        base={base}
        unit={unit}
        color={COLOR.a}
        grow={() => ease(frame, pairsAt - 4, 20)}
      />
      <Bars
        counts={HIST.walks.map((c, i) => (beyond(i, 0.5) ? c : 0))}
        lo={LO}
        bin={BIN}
        scale={HIST_X}
        base={base}
        unit={unit}
        color={ACCENT}
        opacity={tail}
      />
      <Axis scale={HIST_X} base={base} ticks={TICKS} format={(v) => (v === 0 ? "0" : dec(v, v % 1 ? 1 : 0))} at={start - 4} size={20} />
      <Note at={start} x={(HIST_X.x0 + HIST_X.x1) / 2} y={base + 48} style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>Correlation of the two walks in a pair, r</span>
      </Note>

      <Layer opacity={tail}>
        {[-0.5, 0.5].map((c) => (
          <line
            key={c}
            x1={sx(HIST_X, c)}
            x2={sx(HIST_X, c)}
            y1={base}
            y2={base - (base - top + 10) * tail}
            stroke={ACCENT}
            strokeWidth={2}
            strokeDasharray="6 6"
          />
        ))}
      </Layer>
      <Layer opacity={long}>
        <path d={outline} fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      </Layer>

      {/* The pair from Fig. 2, found among the ten thousand. */}
      <Note at={pairsAt + 20} x={mx} y={labelTop} align="left" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(20, INK), whiteSpace: "nowrap", ...halo }}>
          Fig. 2’s pair, <b style={{ fontWeight: 650 }}>{dec(R_WALKS)}</b>
        </span>
      </Note>
      <Leader points={[[mx, labelTop + 34], [mx, barTop - 8]]} at={pairsAt + 22} dur={12} color={INK} />

      {/* The share past a half, for these walks and for walks ten times longer. */}
      <Note at={fiveAt} x={TABLE_X} y={row(0) - 62}>
        <span style={label(20, INK_SOFT)}>Pairs past ±0.5</span>
      </Note>
      <Layer opacity={ease(frame, fiveAt, 12)}>
        <line x1={TABLE_X} x2={TABLE_X + TABLE_W} y1={row(0) - 16} y2={row(0) - 16} stroke={INK} strokeWidth={1.6} />
        <line
          x1={TABLE_X}
          x2={TABLE_X + TABLE_W}
          y1={row(1) - 16}
          y2={row(1) - 16}
          stroke={HAIRLINE}
          strokeWidth={1}
          opacity={long}
        />
      </Layer>
      {[
        { at: fiveAt + 4, key: <Key color={COLOR.a} kind="box" />, name: `${STEPS} flips`, value: SHARE.walks50, ink: ACCENT_INK },
        {
          at: longAt,
          key: <Key color={INK} kind="outline" />,
          name: `${LONG_STEPS.toLocaleString("en-US")} flips`,
          value: SHARE.long50,
          ink: INK,
        },
      ].map((r, i) => (
        <Note key={r.name} at={r.at} x={TABLE_X} y={row(i)} width={TABLE_W}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {r.key}
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>{r.name}</span>
            <span style={{ ...headline(56), color: r.ink, marginLeft: "auto" }}>{pct(r.value)}</span>
          </div>
        </Note>
      ))}
      <Note at={wideAt} x={TABLE_X} y={row(2) + 6} width={TABLE_W}>
        <span style={prose(20)}>Ten times the data, the same spread.</span>
      </Note>
    </AbsoluteFill>
  );
};
