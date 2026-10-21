import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, body, fmt, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BIN_HI, BIN_LO, BIN_W, COUNTS, countBelow, FUNDS, meanAbove } from "./data";
import { Swatch } from "./parts";
import { countTo, flash, swell } from "../sampling/emphasis";
import { useFigNumber } from "../sampling/merged";

const X: XScale = { lo: BIN_LO, hi: BIN_HI, x0: 160, x1: 1760 };
const BASE = 860;
const TALLEST = 430;
const MAX = Math.max(...COUNTS);
const TICKS = [-20, -10, 0, 10, 20, 30, 40];
/** A real minus sign, and the unit on the last tick only. */
const tick = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}${v === 40 ? "%" : ""}`;
/** Bins wholly below the lesson's cutoff: the ones the sweep closes. */
const CLOSED_BINS = Math.round((FUNDS.closedAt - BIN_LO) / BIN_W);
const LINE_TOP = 262;

/**
 * The lesson's 5,000 simulated funds. Close every fund below minus four
 * percent, bin by bin, and the average of what is left walks right: from the
 * true 6.04% to the survivors' 7.65%, with no fund's return changed.
 */
export const FundsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const fig = useFigNumber();
  const { y, h } = useLayout();

  const start = n.beat("funds").from;
  const averagingAt = n.word("funds", "averaging");
  const closeAt = n.word("close", "close");
  const databaseEnd = n.word("close", "database", { edge: "end" });
  const fifteenAt = n.word("gone", "five hundred");
  const goneAt = n.word("gone", "gone");
  const averageAt = n.word("left", "Average");
  const sevenAt = n.word("left", "seven");
  const deletedAt = n.word("deleted", "deleted");
  const betterAt = n.word("deleted", "better");
  // The funds build as they are named; the new average counts up as it is
  // read; the deleted funds are pointed at as "the losers".
  const takeAt = n.word("funds", "Take");
  const fundsAt = n.word("funds", "funds", { nth: 1 });
  const notOneAt = n.word("deleted", "Not one");
  const losersAt = n.word("deleted", "losers");
  const sixFiveEnd = n.word("left", "six five", { edge: "end" });
  const perBin = Math.max(0.4, (fundsAt - takeAt) / COUNTS.length);
  const losers = flash(frame, losersAt - 2, 30);

  // The sweep: one bin at a time, from the far left up to the cutoff.
  const sweepFrom = closeAt + 10;
  const sweepTo = Math.max(sweepFrom + 30, databaseEnd + 4);
  const swept = Math.max(0, Math.min(1, (frame - sweepFrom) / (sweepTo - sweepFrom)));
  const closedBins = frame < sweepFrom ? 0 : Math.round(swept * CLOSED_BINS);
  const cut = BIN_LO + closedBins * BIN_W;
  const live = meanAbove(cut);
  const closed = countBelow(cut);

  const unit = h(TALLEST) / MAX;
  const base = y(BASE);
  const ghost = 1 - 0.7 * ease(frame, deletedAt, 14);
  const allX = sx(X, FUNDS.trueAvg);
  const survX = sx(X, live.mean);
  const cutX = sx(X, FUNDS.closedAt);

  return (
    <AbsoluteFill>
      {/* ── Sound: the funds, the two lines, the sweep, the count, the new average ── */}
      <Sfx name="el-pop" at={takeAt} level={-30} />
      <Sfx name="el-pencil" at={averagingAt - 2} level={-34} />
      <Sfx name="el-pencil" at={closeAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={sweepFrom} level={-34} />
      <Sfx name="el-tap" at={fifteenAt} level={-28} />
      <Sfx name="el-tap" at={sevenAt - 2} level={-29} />

      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={closeAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Close the funds that lost,
        </Ink>
        <Ink
          at={sevenAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          and the average goes up.
        </Ink>
      </div>
      <FigLabel
        n={fig(2)}
        title={`Annual returns of ${FUNDS.n.toLocaleString("en-US")} simulated mutual funds`}
        at={start - 8}
        x={120}
        y={y(196)}
      />
      <Note at={closeAt} x={1800} y={y(196) + 2} align="right" from="right">
        <span style={{ ...note(21, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Swatch kind="open" /> still open
          <span style={{ width: 14 }} />
          <Swatch kind="closed" /> closed and deleted
        </span>
      </Note>

      {/* ── The histogram ── */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {COUNTS.map((c, i) => {
          const grow = ease(frame, takeAt + i * perBin, 16);
          if (c <= 0 || grow <= 0) return null;
          const x = sx(X, BIN_LO + i * BIN_W) + 1;
          const w = sx(X, BIN_LO + (i + 1) * BIN_W) - sx(X, BIN_LO + i * BIN_W) - 2;
          const hh = c * unit * grow;
          const isClosed = i < closedBins;
          // A bin of a fund or two is too short to draw dashes round.
          if (isClosed && hh < 8) {
            return <rect key={i} x={x + 2} y={base - 2} width={w - 4} height={1.6} fill={INK_SOFT} opacity={ghost * 0.6} />;
          }
          return isClosed ? (
            <rect
              key={i}
              x={x + 0.8}
              y={base - hh + 0.8}
              width={w - 1.6}
              height={hh - 1.6}
              fill="none"
              stroke={losers > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(losers * 100)}%, ${INK_SOFT})` : INK_SOFT}
              strokeWidth={1.4 + 1.2 * losers}
              strokeDasharray="4 3"
              opacity={ghost}
            />
          ) : (
            <rect key={i} x={x} y={base - hh} width={w} height={hh} fill={BAR} />
          );
        })}
      </svg>
      <Axis scale={X} base={base} ticks={TICKS} at={start - 4} format={tick} />

      {/* The cutoff. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={cutX}
          x2={cutX}
          y1={base}
          y2={base - (base - y(430)) * ease(frame, closeAt - 2, 14)}
          stroke={ACCENT}
          strokeWidth={2.2}
          strokeDasharray="7 6"
        />
      </svg>
      <Note at={closeAt + 4} x={cutX - 14} y={y(404)} align="right">
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 650 }}>Closed below −4%</span>
      </Note>

      {/* Counter: funds closed so far. */}
      <Note at={sweepFrom - 4} x={190} y={y(430)}>
        <div style={label(20, INK_SOFT)}>Closed and deleted</div>
        <div
          style={{
            ...headline(96),
            marginTop: 6,
            ...TABULAR,
            color: frame >= fifteenAt - 2 ? ACCENT_INK : INK,
            transformOrigin: "0% 60%",
            transform: `scale(${1 + 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, (frame - fifteenAt) / 14)))})`,
          }}
        >
          {closed.toLocaleString("en-US")}
        </div>
        <div style={{ ...body(28, true), marginTop: 4, opacity: ease(frame, goneAt - 4, 12) }}>funds, gone</div>
      </Note>

      {/* ── The two averages ── */}
      {/* The survivors' average under the true one, so the dashes stay
          visible while the two still coincide. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {closedBins > 0 ? (
          <line x1={survX} x2={survX} y1={base} y2={y(LINE_TOP)} stroke={ACCENT} strokeWidth={2.6} />
        ) : null}
        <line
          x1={allX}
          x2={allX}
          y1={base}
          y2={base - (base - y(LINE_TOP)) * ease(frame, averagingAt - 2, 16)}
          stroke={INK}
          strokeWidth={2.2}
          strokeDasharray="7 6"
        />
      </svg>
      <Note at={averagingAt + 2} x={allX - 16} y={y(LINE_TOP + 4)} align="right">
        <div style={label(20, INK_SOFT)}>All {FUNDS.n.toLocaleString("en-US")} funds</div>
        <div style={{ ...note(30, INK), fontWeight: 700 }}>{fmt(FUNDS.trueAvg)}%</div>
      </Note>
      {/* Named from the moment it appears, and riding along with it as the
          sweep moves it: red is the biased number, never "still open". */}
      <div
        style={{
          position: "absolute",
          left: survX + 16,
          top: y(LINE_TOP + 4),
          opacity: closedBins > 0 ? ease(frame, sweepFrom, 10) : 0,
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            ...label(20, ACCENT_INK),
            transformOrigin: "left center",
            transform: `scale(${swell(frame, averageAt - 2, 0.12, 22)})`,
          }}
        >
          Average of those left
        </div>
        <div
          style={{
            ...note(30, ACCENT_INK),
            fontWeight: 700,
            opacity: ease(frame, sevenAt - 2, 10),
          }}
        >
          {fmt(countTo(frame, sevenAt - 2, Math.max(10, sixFiveEnd - sevenAt + 2), FUNDS.trueAvg, FUNDS.survivorAvg))}%
        </div>
      </div>
      <Note at={notOneAt - 2} x={sx(X, FUNDS.survivorAvg) + 16} y={y(LINE_TOP + 86)}>
        <span style={note(21, INK_SOFT)}>
          <b style={{ color: ACCENT_INK }}>+{fmt(FUNDS.inflation)} points</b>
          <span style={{ opacity: ease(frame, betterAt - 2, 12) }}>, and not one fund did better</span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};
