import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, Bars, sx } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { BIN, dec, DIFFS_PAST_25, HIST, LO, PAIRS, pct, R_DIFFS, R_WALKS, SHARE } from "./data";
import { COLOR, COLOR_INK, Headline, HIST_BASE, HIST_TALL, HIST_X, Key, Layer, leaveAt, prose } from "./parts";

const TICKS = [-1, -0.5, 0, 0.5, 1];
const CUT = 0.25;
const beyond = (i: number) => {
  const lo = LO + i * BIN;
  return lo + BIN <= -CUT + 1e-9 || lo >= CUT - 1e-9;
};
/** The walks' histogram, faded behind the differences'. */
const GHOST = ds("blue", 200);
const TABLE_X = 1370;
const COL = [TABLE_X, TABLE_X + 180, TABLE_X + 290];
const TABLE_W = 440;

/**
 * Collapse: the same ten thousand pairs, differenced. The wide spread of
 * Fig. 3 shrinks to a spike at zero, drawn on the same axis.
 */
export const CollapseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("collapse").from;
  const sameAt = n.word("collapse", "same pairs");
  const zeroAt = n.word("collapse", "nearly zero");
  const sevenAt = n.word("collapse", "seven in ten");
  const twoAt = n.word("collapse", "two in ten thousand");
  const leave = leaveAt(n.beat("rule").from);

  const base = y(HIST_BASE);
  const top = base - h(HIST_TALL);
  // The walks' bars start at Fig. 3's scale and shrink to the scale that
  // fits the differences' spike, so both are on one count axis.
  const wideUnit = h(HIST_TALL) / Math.max(...HIST.walks);
  const narrowUnit = h(HIST_TALL) / Math.max(...HIST.diffs);
  const k = ease(frame, sameAt - 2, 26);
  const unit = wideUnit + (narrowUnit - wideUnit) * k;
  const cut = ease(frame, sevenAt - 4, 14);
  const row = (i: number) => y(340) + i * 80;

  return (
    <AbsoluteFill>
      <Headline first="Difference each walk," second="and the correlation is gone." at={start - 4} secondAt={zeroAt - 2} out={leave} />
      <FigLabel n="5" title="Correlation of the same 10,000 pairs, after differencing" at={start - 2} x={120} y={y(196)} out={leave} />

      <Bars
        counts={HIST.walks}
        lo={LO}
        bin={BIN}
        scale={HIST_X}
        base={base}
        unit={unit}
        color={`color-mix(in srgb, ${COLOR.a} ${Math.round((1 - k) * 100)}%, ${GHOST})`}
        opacity={ease(frame, start - 2, 10)}
      />
      <Bars
        counts={HIST.walks.map((c, i) => (beyond(i) ? c : 0))}
        lo={LO}
        bin={BIN}
        scale={HIST_X}
        base={base}
        unit={unit}
        color={ACCENT}
        opacity={cut}
      />
      <Bars
        counts={HIST.diffs}
        lo={LO}
        bin={BIN}
        scale={HIST_X}
        base={base}
        unit={narrowUnit}
        color={COLOR.a}
        grow={() => k}
      />
      <Axis scale={HIST_X} base={base} ticks={TICKS} format={(v) => (v === 0 ? "0" : dec(v, v % 1 ? 1 : 0))} at={start - 2} size={20} />
      <Note at={start - 2} x={(HIST_X.x0 + HIST_X.x1) / 2} y={base + 48} style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>Correlation of the two series in a pair, r</span>
      </Note>

      <Layer opacity={cut}>
        {[-CUT, CUT].map((c) => (
          <line
            key={c}
            x1={sx(HIST_X, c)}
            x2={sx(HIST_X, c)}
            y1={base}
            y2={base - (base - top + 10) * cut}
            stroke={ACCENT}
            strokeWidth={2}
            strokeDasharray="6 6"
          />
        ))}
      </Layer>

      {/* Before and after, as a small table. */}
      <Note at={start} x={COL[1]} y={row(0) - 58}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>Walks</span>
      </Note>
      <Note at={sameAt} x={COL[2]} y={row(0) - 58}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>Differences</span>
      </Note>
      <Layer opacity={ease(frame, start, 12)}>
        <line x1={TABLE_X} x2={TABLE_X + TABLE_W} y1={row(0) - 18} y2={row(0) - 18} stroke={INK} strokeWidth={1.6} />
        <line
          x1={TABLE_X}
          x2={TABLE_X + TABLE_W}
          y1={row(1) - 18}
          y2={row(1) - 18}
          stroke={HAIRLINE}
          strokeWidth={1}
          opacity={ease(frame, sevenAt, 12)}
        />
      </Layer>

      <Note at={start} x={COL[0]} y={row(0)}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, ...prose(21, INK), whiteSpace: "nowrap" }}>
          Fig. 2’s pair
        </span>
      </Note>
      <Note at={start} x={COL[1]} y={row(0) - 6}>
        <span style={{ ...headline(44), color: INK_SOFT }}>{dec(R_WALKS)}</span>
      </Note>
      <Note at={zeroAt} x={COL[2]} y={row(0) - 6}>
        <span style={{ ...headline(44), color: COLOR_INK.a }}>{dec(R_DIFFS)}</span>
      </Note>

      <Note at={sevenAt} x={COL[0]} y={row(1)}>
        <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>Past ±{CUT}</span>
      </Note>
      <Note at={sevenAt + 2} x={COL[1]} y={row(1) - 6}>
        <span style={{ ...headline(44), color: ACCENT_INK }}>{pct(SHARE.walks25)}</span>
      </Note>
      <Note at={twoAt} x={COL[2]} y={row(1) - 6}>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(44), color: COLOR_INK.a }}>{DIFFS_PAST_25}</span>
          <span style={note(20, INK_SOFT)}>of {PAIRS.toLocaleString("en-US")}</span>
        </span>
      </Note>

      <Note at={sameAt + 20} x={TABLE_X} y={row(2) + 10} width={TABLE_W}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, ...prose(20) }}>
          <Key color={GHOST} kind="box" />
          the walks, from Fig. 3
          <span style={{ width: 8 }} />
          <Key color={COLOR.a} kind="box" />
          differenced
        </span>
      </Note>
    </AbsoluteFill>
  );
};
