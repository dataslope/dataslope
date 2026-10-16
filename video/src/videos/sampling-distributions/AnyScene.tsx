import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  body,
  fmt,
  HAIRLINE,
  halo,
  headline,
  INK,
  INK_SOFT,
  label,
  note,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { ANY_N, ANY_SAMPLES, LOPSIDED, peak, STATS } from "./data";
import { Bracket, POP_FILL, Rule } from "./parts";

/** One axis for the population and all three statistics. */
const X: XScale = { lo: 0, hi: 300, x0: 330, x1: 1490 };
const TICKS = [0, 50, 100, 150, 200, 250, 300];
const ROW_X = 118;
const COL_CENTER = 1540;
const COL_SPREAD = 1670;

const POP_ROW = { base: 470, height: 110 };
const STAT_ROWS = [610, 750, 890];
const STAT_H = 100;
/** Where a bell is one standard deviation wide, as a share of its peak. */
const AT_SD = Math.exp(-0.5);

/**
 * Every statistic has a sampling distribution: the mean, the median and the
 * maximum of samples of sixty from a lopsided population, on one axis. Ends
 * by naming the width the standard error.
 */
export const AnyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const anyFrom = n.beat("any").from;
  const meanFirstAt = n.word("any", "mean");
  const everyAt = n.word("any", "Every statistic");
  const lopsidedAt = n.word("kinds", "lopsided");
  const statAt = [n.word("kinds", "mean"), n.word("kinds", "median"), n.word("kinds", "maximum")];
  const centerAt = n.word("own", "center");
  const widthAt = n.word("own", "width");
  const farAt = n.word("own", "far");
  const nameAt = n.word("name", "name");
  const seAt = n.word("name", "standard error");

  const named = ease(frame, seAt - 2, 14);

  return (
    <AbsoluteFill>
      <Ink at={anyFrom - 12} dur={20} style={{ left: 112, top: y(112), ...headline(64), whiteSpace: "nowrap" }}>
        Every statistic has
      </Ink>
      <Ink
        at={everyAt + 4}
        dur={18}
        style={{ left: 112, top: y(188), ...headline(64, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        a sampling distribution.
      </Ink>

      {/* The name, at the end. */}
      <Note at={nameAt - 2} x={1180} y={y(118)} width={640}>
        <span style={label(22, INK_SOFT)}>That width has a name</span>
      </Note>
      <Ink at={seAt - 4} dur={20} style={{ left: 1176, top: y(156), ...headline(64, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
        the standard error.
      </Ink>

      <FigLabel
        n="7"
        title={`Samples of ${ANY_N} from a lopsided population, ${ANY_SAMPLES.toLocaleString("en-US")} of each`}
        at={meanFirstAt}
        x={X.x0}
        y={y(290)}
      />

      {/* Column heads. */}
      <Note at={centerAt - 2} x={COL_CENTER} y={y(338)}>
        <span style={label(20, INK_SOFT)}>Center</span>
      </Note>
      <Note at={widthAt - 2} x={COL_SPREAD} y={y(338)}>
        <span style={{ ...label(20, INK_SOFT), opacity: 1 - named }}>Spread</span>
      </Note>
      <div style={{ position: "absolute", left: COL_SPREAD, top: y(338), opacity: named }}>
        <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>Standard error</span>
      </div>

      {/* The population. */}
      <Ink at={lopsidedAt - 4} dur={14} style={{ left: ROW_X, top: y(POP_ROW.base - 44) }}>
        <span style={{ ...body(32, true), color: INK }}>Population</span>
      </Ink>
      <Bars
        counts={LOPSIDED.hist.counts}
        lo={LOPSIDED.hist.lo}
        bin={LOPSIDED.hist.bin}
        scale={X}
        base={y(POP_ROW.base)}
        unit={h(POP_ROW.height / peak(LOPSIDED.hist))}
        color={POP_FILL}
        grow={(i) => ease(frame, lopsidedAt - 4 + i * 0.4, 12)}
      />
      <Axis scale={X} base={y(POP_ROW.base)} ticks={[]} at={meanFirstAt + 2} />
      <Note at={lopsidedAt + 6} x={sx(X, 120)} y={y(POP_ROW.base - 62)}>
        <span style={{ ...note(22, INK_SOFT), ...halo }}>a long tail to the right, like incomes</span>
      </Note>

      {STATS.map((s, r) => {
        const base = STAT_ROWS[r];
        const at = statAt[r];
        const last = r === STATS.length - 1;
        const unit = STAT_H / peak(s.hist);
        const mid = s.center;
        const bracketY = y(base - STAT_H * AT_SD);
        return (
          <React.Fragment key={s.key}>
            <Ink at={meanFirstAt + 6 + r * 6} dur={14} style={{ left: ROW_X, top: y(base - 44) }}>
              <span style={{ ...body(32, true), color: INK }}>{s.name}</span>
            </Ink>
            <Bars
              counts={s.hist.counts}
              lo={s.hist.lo}
              bin={s.hist.bin}
              scale={X}
              base={y(base)}
              unit={h(unit)}
              color={ACCENT}
              gap={1.5}
              grow={(i) => ease(frame, at - 2 + Math.abs(s.hist.lo + (i + 0.5) * s.hist.bin - mid) * 0.12, 12)}
            />
            <Axis
              scale={X}
              base={y(base)}
              ticks={last ? TICKS : []}
              at={meanFirstAt + 8 + r * 6}
              size={20}
            />
            <Rule
              x={sx(X, s.center)}
              y0={y(base)}
              y1={y(base - STAT_H - 12)}
              at={centerAt - 2 + r * 3}
              color={INK}
              width={1.8}
              dash="5 5"
            />
            <Bracket
              x0={sx(X, s.center - s.sd)}
              x1={sx(X, s.center + s.sd)}
              y={bracketY}
              at={widthAt - 2 + r * 3}
              color={named > 0 ? ACCENT_INK : INK}
              width={2.4 + named}
              tick={8}
            />
            <Note at={centerAt + r * 3} x={COL_CENTER} y={y(base - 58)}>
              <span style={{ ...note(26, INK), fontWeight: 600 }}>{fmt(s.center, 1)}</span>
            </Note>
            <Note at={widthAt + r * 3} x={COL_SPREAD} y={y(base - 58)}>
              <span style={{ ...note(26, ACCENT_INK), fontWeight: 700 }}>{fmt(s.sd)}</span>
            </Note>
            <div
              style={{
                position: "absolute",
                left: COL_CENTER,
                top: y(base + 12),
                width: COL_SPREAD + 110 - COL_CENTER,
                height: 1,
                background: HAIRLINE,
                opacity: ease(frame, centerAt, 12),
              }}
            />
          </React.Fragment>
        );
      })}

      {/* "The maximum lands far out, wide and lopsided." */}
      <Note at={farAt} x={sx(X, 175)} y={y(STAT_ROWS[2] - 92)}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, ...halo }}>far out, wide, and lopsided</span>
      </Note>
    </AbsoluteFill>
  );
};
