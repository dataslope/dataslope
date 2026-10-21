import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WALLET } from "./data";
import { Drift, FIG_Y, Headline, Mark, Spot, Strike, Svg } from "./parts";

/** The timeline, 1938 to 1943, on the right of the wallet: Fig. 6, its
 *  label at FIG_Y and the top of its dot cloud clear of it. */
const T0 = 900;
const T1 = 1640;
const LINE_Y = 474;
/** Under the chart: its credit, then what broke, then the moral. */
const SOURCE_Y = 668;
const UNIQUE_Y = 690;
const PERMANENT_Y = 762;
const MORAL_Y = 836;
const DOTS = 64;

/** mulberry32: a tiny seeded PRNG, for laying the dots out. */
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** People taking up the number, thicker toward 1943: positions along the
 *  line (0 to 1), and a height above it. */
const DOT_AT = (() => {
  const r = rng(1938);
  return Array.from({ length: DOTS }, () => ({ t: Math.sqrt(r()), up: r() }))
    .sort((a, b) => a.t - b.t);
})();

/**
 * The lesson's cautionary tale, from the Social Security Administration's
 * history page: a sample card in every wallet from a Lockport, New York
 * maker in 1938, carrying one real person's number; 5,755 people using it at
 * the 1943 peak; the number cancelled and its owner given a new one.
 */
export const WalletScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("wallet").from;
  const yearAt = n.word("wallet", "nineteen thirty-eight");
  const lockportAt = n.word("wallet", "Lockport");
  const sampleAt = n.word("wallet", "sample");
  const everyAt = n.word("wallet", "every wallet");
  const realAt = n.word("real", "real person's");
  const adoptedAt = n.word("real", "adopted");
  const fortyThreeAt = n.word("real", "nineteen forty-three");
  const fiveAt = n.word("real", "five thousand");
  const usingAt = n.word("real", "using it");
  const uniqueAt = n.word("broke", "unique");
  const sharedAt = n.word("broke", "shared");
  const permanentAt = n.word("broke", "permanent");
  const cancelledAt = n.word("broke", "cancelled");
  const betsAt = n.word("broke", "bets");
  const controlAt = n.word("broke", "control");
  const end = n.beat("broke").to;

  const line = ease(frame, yearAt - 4, 20) * 0.04 + ease(frame, adoptedAt, fortyThreeAt + 6 - adoptedAt) * 0.96;
  const count = Math.round(WALLET.peak * ease(frame, fiveAt - 4, 34));
  const dotSpan = Math.max(12, fortyThreeAt + 4 - adoptedAt);

  return (
    <AbsoluteFill>
      {/* ── Sound: the wallet, the people taking the number up, the count, the strikes ── */}
      <Sfx name="el-pop" at={yearAt - 2} level={-30} />
      <Sfx name="el-sprinkle" at={adoptedAt} level={-33} />
      <Sfx name="el-tap" at={fiveAt - 4} level={-27} />
      <Sfx name="el-scratch" at={uniqueAt + 2} level={-30} />
      <Sfx name="el-scratch" at={permanentAt + 2} level={-30} />

      <Drift from={from} to={end + 50} origin="40% 50%">
        <Headline lead="One number," turn="thousands of people." at={from - 6} turnAt={fiveAt - 4} />
        {/* The wallet arrives with the year, so 1938 never stands alone. */}
        <Spot id="db-keys-wallet" at={yearAt - 4} left={100} top={y(300)} width={640} height={427} />

        {/* ── 1938 to 1943 ── */}
        <FigLabel n="6" title="One Social Security number, 1938 to 1943" at={yearAt - 6} x={T0} y={y(FIG_Y)} />
        <Svg>
          <line
            x1={T0}
            x2={T0 + (T1 - T0) * line}
            y1={y(LINE_Y)}
            y2={y(LINE_Y)}
            stroke={INK}
            strokeWidth={2}
            opacity={line > 0 ? 1 : 0}
          />
          {[T0, T1].map((x, i) => {
            const p = ease(frame, i ? fortyThreeAt - 4 : yearAt - 4, 10);
            return p > 0 ? <line key={x} x1={x} x2={x} y1={y(LINE_Y) - 12 * p} y2={y(LINE_Y) + 12 * p} stroke={INK} strokeWidth={2.4} /> : null;
          })}
          {/* Everyone who took the number up: more of them every year. */}
          {DOT_AT.map((d, i) => {
            const at = adoptedAt + d.t * dotSpan;
            const p = ease(frame, at, 8);
            if (p <= 0) return null;
            return (
              <circle
                key={i}
                cx={T0 + 40 + d.t * (T1 - T0 - 60)}
                cy={y(LINE_Y) - h(26) - d.up * h(70)}
                r={6 * p}
                fill={`color-mix(in srgb, ${ACCENT_INK} ${Math.round(45 + d.t * 40)}%, transparent)`}
              />
            );
          })}
        </Svg>
        {/* What a dot is, at the cloud's thin end. */}
        <Ink at={adoptedAt} dur={14} style={{ left: T0 + 30, top: y(LINE_Y) - h(26) - h(70) - 46, whiteSpace: "nowrap" }}>
          <span style={{ ...note(20, INK_SOFT) }}>people using the number</span>
        </Ink>
        <Ink at={yearAt - 4} dur={14} style={{ left: T0 - 4, top: y(LINE_Y) + 22, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(44) }}>1938</span>
        </Ink>
        <Note at={lockportAt - 2} x={T0} y={y(LINE_Y) + 84}>
          <div style={{ ...note(22, INK_SOFT), lineHeight: 1.45, whiteSpace: "nowrap" }}>
            <div>{WALLET.town}</div>
            <div style={{ opacity: ease(frame, sampleAt, 10) }}>
              a sample card in <Mark at={everyAt}>every wallet</Mark>
            </div>
            <div style={{ opacity: ease(frame, realAt - 2, 10), color: INK }}>
              carrying <Mark at={realAt + 4}>one real person&apos;s number</Mark>
            </div>
          </div>
        </Note>
        <Ink at={fortyThreeAt - 4} dur={14} style={{ left: T1 - 50, top: y(LINE_Y) + 22, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(44) }}>{WALLET.peakYear}</span>
        </Ink>
        <Note at={fiveAt - 6} x={T1 + 60} y={y(LINE_Y) + 96} align="right">
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <div style={{ ...headline(68), color: ACCENT_INK, ...TABULAR }}>
              {count.toLocaleString("en-US")}
            </div>
            <div style={{ ...note(22, INK), opacity: ease(frame, usingAt - 4, 10) }}>people using it, that year</div>
          </div>
        </Note>

        {/* ── What broke ── */}
        <Note at={uniqueAt - 4} x={T0} y={y(UNIQUE_Y)}>
          <div style={{ ...body(36), color: INK, whiteSpace: "nowrap" }}>
            <Strike at={uniqueAt + 2}>Unique</Strike>
            <span style={{ opacity: ease(frame, sharedAt - 2, 10), color: ACCENT_INK, fontStyle: "italic" }}> shared by thousands</span>
          </div>
        </Note>
        <Note at={permanentAt - 4} x={T0} y={y(PERMANENT_Y)}>
          <div style={{ ...body(36), color: INK, whiteSpace: "nowrap" }}>
            <Strike at={permanentAt + 2}>Permanent</Strike>
            <span style={{ opacity: ease(frame, cancelledAt - 2, 10), color: ACCENT_INK, fontStyle: "italic" }}> cancelled</span>
          </div>
        </Note>
        <Ink at={betsAt - 6} dur={20} style={{ left: 120, top: y(MORAL_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...body(40, true), color: INK }}>
            A natural key bets on <Mark at={controlAt - 6}>promises you don&apos;t control.</Mark>
          </span>
        </Ink>
        <Ink at={fiveAt + 10} dur={14} style={{ right: 1920 - 1824, top: y(SOURCE_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...label(19, INK_SOFT), fontWeight: 500 }}>Figures: {WALLET.source}</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
