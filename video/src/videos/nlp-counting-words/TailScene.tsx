import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, fmt, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA } from "./data";
import { DATA, Headline, Kicker, Marked, Mono, numStyle, pulse, Svg } from "./parts";

/** Fig. 4: the vocabulary as a hundred squares, on the left. */
const WX = 130;
const WY = 350;
const CELL = 26;
const CELL_GAP = 4;
/** Fig. 5: every one of Emma's words, ranked by count, on a linear rank axis,
 *  so the tail is drawn as long as it is: the top ten take the first 1.5 px. */
const X0 = 640;
const X1 = 1790;
const BASE = 612;
const TALL = 236;
const RANK_TICKS = [1, 1000, 2000, 3000, 4000, 5000, 6000, 7000];
/** Fig. 6: vocabulary growth, under Fig. 5. */
const GX0 = 640;
const GX1 = 1560;
const GBASE = 900;
const GTALL = 142;

/**
 * The long tail, on Emma: 161,600 words and 7,079 distinct ones; the top ten
 * words are over a fifth of the book; 2,739 words appear once (hapaxes),
 * 38.7% of the vocabulary; and the vocabulary is still growing on the last
 * page (188 new words in the last 10,000).
 */
export const TailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("book").from;
  const wordsAt = n.word("book", "hundred and sixty-one thousand");
  const sevenAt = n.word("book", "seven thousand");
  const differentAt = n.word("book", "different");
  const rankAt = n.word("giants", "Rank");
  const topTenAt = n.word("giants", "top ten");
  const fifthAt = n.word("giants", "fifth");
  const otherEndAt = n.word("hapax", "other end");
  const onceAt = n.word("hapax", "once");
  const hapaxAt = n.word("hapax", "hapaxes");
  const twoInFiveAt = n.word("zipf", "two in five");
  const giantsAt = n.word("zipf", "giants");
  const zipfAt = n.word("zipf", "Zipf's");
  const closesAt = n.word("grows", "never closes");
  const lastAt = n.word("grows", "last ten thousand");
  const newAt = n.word("grows", "hundred and eighty-eight");
  const topAt = n.word("top-in", "top");
  const twoThousandAt = n.word("hapax", "two thousand seven hundred");
  const longAt = n.word("zipf", "long");
  const almostAt = n.word("zipf", "almost");
  const tailGrowsAt = n.word("grows", "tail");
  const beforeAt = n.word("grows", "before");
  const tellAt = n.word("top-in", "tell");
  const bookAt = n.word("top-in", "book");
  // As each figure is done with, it steps back for the next.
  const fig6Back = 1 - 0.6 * ease(frame, tellAt - 2, 14);
  const fig4Back = 1 - 0.6 * ease(frame, bookAt - 2, 14);

  // ── Fig. 5 geometry: rank 1 at X0, rank 7,079 at X1 ──
  const base = y(BASE);
  const unit = h(TALL) / EMMA.ranked[0];
  const V = EMMA.ranked.length;
  const rx = (rank: number) => X0 + ((rank - 1) / (V - 1)) * (X1 - X0);
  const curve = EMMA.ranked
    .map((c, i) => [rx(i + 1), base - c * unit] as const)
    .filter((_, i) => i < 400 || i % 10 === 0 || i === V - 1);
  const curvePts = curve.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  // The curve draws left to right as the words are ranked.
  const drawn = ease(frame, rankAt - 2, 40);
  const top = base - h(TALL);
  // The hapaxes are the last 2,739 ranks: all of them at a count of one.
  const onceFrom = rx(V - EMMA.hapaxes + 1);
  const onceP = ease(frame, otherEndAt - 2, 20);

  // ── Fig. 5: a hundred squares, the last 39 for the words used once ──
  const onceCells = Math.round(EMMA.hapaxShare * 100);
  // The squares sprinkle in from "a hundred and sixty-one thousand" to "different".
  const cellSpread = Math.max(20, differentAt - wordsAt);
  const cellAt = (k: number) => wordsAt - 2 + Math.round((((k * 37) % 100) / 100) * cellSpread);
  const cellTop = y(WY);
  const waffleSide = 10 * CELL + 9 * CELL_GAP;

  // ── Fig. 6: distinct words against words read ──
  const gBase = y(GBASE);
  const gTall = h(GTALL);
  const gx = (read: number) => GX0 + ((GX1 - GX0) * read) / EMMA.total;
  const gy = (v: number) => gBase - (gTall * v) / EMMA.distinct;
  const drawP = ease(frame, closesAt - 4, 40);
  const pts = [[0, 0] as const, ...EMMA.growth];
  const shown = pts.filter(([r]) => r <= drawP * EMMA.total);
  const path = shown.map(([r, v], i) => `${i ? "L" : "M"}${gx(r).toFixed(1)},${gy(v).toFixed(1)}`).join(" ");
  const lastFrom = EMMA.total - EMMA.last;
  const lastPts = pts.filter(([r]) => r >= lastFrom - 1);
  const lastPath = lastPts.map(([r, v], i) => `${i ? "L" : "M"}${gx(r).toFixed(1)},${gy(v).toFixed(1)}`).join(" ");
  const lastP = ease(frame, lastAt - 2, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the squares, the bars, the bracket, the hapaxes, the curve ── */}
      <Sfx name="el-sprinkle" at={wordsAt - 2} level={-32} />
      <Sfx name="el-whoosh" at={rankAt - 2} level={-34} />
      <Sfx name="el-pencil" at={topTenAt - 2} level={-34} />
      <Sfx name="el-sprinkle" at={twoThousandAt} level={-31} />
      <Sfx name="el-pencil" at={closesAt - 4} level={-35} />
      <Sfx name="el-tap" at={newAt - 2} level={-27} />

      <Kicker at={from - 10}>Counting words</Kicker>
      <Headline at={wordsAt - 4} second={sevenAt - 2} italic={`only ${fmt(EMMA.distinct, 0)} different.`}>
        {`${fmt(EMMA.total, 0)} words,`}
      </Headline>

      {/* Fig. 4: the vocabulary, a square for each hundredth of it. */}
      <div style={{ position: "absolute", inset: 0, opacity: fig4Back }}>
      <FigLabel n="4" title={`Emma's ${fmt(EMMA.distinct, 0)} different words`} at={sevenAt - 4} x={WX - 6} y={y(286)} />
      <Svg>
        {Array.from({ length: 100 }, (_, k) => {
          const r = Math.floor(k / 10);
          const c = k % 10;
          const p = ease(frame, cellAt(k), 8);
          if (p <= 0) return null;
          const once = k >= 100 - onceCells;
          // The hapaxes turn one square at a time as the count is read out.
          const turn = once ? ease(frame, twoThousandAt + (k - (100 - onceCells)) * 2, 6) : 0;
          return (
            <rect
              key={k}
              x={WX + c * (CELL + CELL_GAP) + (CELL * (1 - p)) / 2}
              y={cellTop + r * (CELL + CELL_GAP) + (CELL * (1 - p)) / 2}
              width={CELL * p}
              height={CELL * p}
              rx={3}
              fill={turn > 0.5 ? ACCENT : DATA}
              opacity={0.9}
            />
          );
        })}
      </Svg>
      <Note at={differentAt} x={WX} y={cellTop + waffleSide + 14}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>each square: a hundredth of them</div>
      </Note>
      <Note at={onceAt} x={WX} y={cellTop + waffleSide + 50}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 3, background: ACCENT }} />
          <span style={numStyle(22, ACCENT_INK)}>{fmt(EMMA.hapaxes, 0)}</span>
          <span>used just once</span>
          <span style={{ opacity: ease(frame, twoInFiveAt - 2, 10), ...numStyle(22, INK_SOFT) }}>
            · <Marked at={twoInFiveAt}>{Math.round(EMMA.hapaxShare * 100)}%</Marked>
          </span>
        </div>
      </Note>
      <Note at={hapaxAt - 2} x={WX} y={cellTop + waffleSide + 88}>
        <div style={{ ...body(28, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>the hapaxes</div>
      </Note>
      </div>

      {/* Fig. 5: all 7,079 words, ranked by count, on a linear rank axis. */}
      <FigLabel n="5" title={`All ${fmt(V, 0)} of Emma's words, ranked by count`} at={rankAt - 4} x={X0 - 10} y={y(286)} />
      <Svg>
        {/* "a long, thin tail": a wash over it as it is named. */}
        <rect x={rx(60)} y={base - h(60)} width={X1 - rx(60)} height={h(60)} fill={ACCENT} opacity={0.14 * pulse(frame, longAt - 2, 36)} />
        <g style={{ clipPath: `inset(0 ${(1 - drawn) * 100}% 0 0)` }}>
          <polygon points={`${curvePts} ${X1},${base} ${X0},${base}`} fill={DATA} />
          <polyline points={curvePts} fill="none" stroke={DATA} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <line x1={X0} x2={X0 + (X1 - X0) * ease(frame, rankAt - 4, 16)} y1={base + 2.5} y2={base + 2.5} stroke={INK_SOFT} strokeWidth={1.2} />
        <g opacity={ease(frame, rankAt + 10, 12)}>
          {RANK_TICKS.map((r) => (
            <line key={r} x1={rx(r)} x2={rx(r)} y1={base + 3} y2={base + 9} stroke={INK_SOFT} strokeWidth={1.2} />
          ))}
        </g>
        {/* The words used once, the last 39% of the ranks. */}
        <rect x={onceFrom} y={base + 12} width={(X1 - onceFrom) * onceP} height={7} rx={2} fill={ACCENT} />
      </Svg>
      {RANK_TICKS.map((r) => (
        <Ink key={r} at={rankAt + 10} dur={12} style={{ left: rx(r) - 40, width: 80, top: base + 22, textAlign: "center" }}>
          <span style={{ ...label(19, INK_SOFT), fontWeight: 500, ...{ fontVariantNumeric: "lining-nums" } }}>{fmt(r, 0)}</span>
        </Ink>
      ))}
      <Note at={rankAt + 16} x={X1} y={base + 50} align="right">
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>rank, most common first</div>
      </Note>
      <Note at={rankAt + 4} x={X0 + 12} y={top - 12}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={numStyle(20, INK)}>{fmt(EMMA.ranked[0], 0)}</span> uses of the top word
        </div>
      </Note>
      {/* The top ten, too narrow to see apart: named beside the spike. */}
      <Note at={topTenAt - 2} x={X0 + 60} y={top + 40}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          the top ten
          <span style={{ opacity: ease(frame, fifthAt - 2, 10) }}>
            : <span style={numStyle(22, ACCENT_INK)}>{Math.round(EMMA.top10Share * 100)}%</span> of all the words
          </span>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 10, whiteSpace: "nowrap" }}>
          {EMMA.top10.map(([w], i) => (
            <Mono key={w} size={20} color={INK_SOFT}>
              {i < 6 ? <Marked at={topAt - 2 + i * 3}>{w}</Marked> : w}
            </Mono>
          ))}
        </div>
      </Note>
      <Leader points={[[X0 + 54, top + 56], [X0 + 4, top + 40]]} at={topTenAt} color={INK_SOFT} width={1.4} />
      <Note at={twoThousandAt - 2} x={onceFrom} y={base - 40}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          <span style={numStyle(22, ACCENT_INK)}>{fmt(EMMA.hapaxes, 0)}</span> used just once
        </div>
      </Note>
      <Note at={giantsAt - 6} x={1260} y={top + 70}>
        <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
          <Marked at={giantsAt}>A few giants</Marked>
          <span style={{ opacity: ease(frame, longAt - 2, 12) }}>, a long tail:</span>
        </div>
        <div style={{ ...body(30), color: ACCENT_INK, whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, zipfAt - 2, 12) }}>Zipf&apos;s law</div>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 8, opacity: ease(frame, almostAt - 2, 12) }}>
          and almost every text has it
        </div>
      </Note>

      {/* Fig. 6: the vocabulary still growing at the last page. */}
      <div style={{ position: "absolute", inset: 0, opacity: fig6Back }}>
      <FigLabel n="6" title="New words keep arriving" at={tailGrowsAt - 4} x={GX0 - 10} y={y(GBASE - GTALL - 64)} />
      <Svg>
        <line x1={GX0} x2={GX0 + (GX1 - GX0) * ease(frame, tailGrowsAt - 4, 16)} y1={gBase + 0.5} y2={gBase + 0.5} stroke={INK} strokeWidth={1.6} />
        {drawP > 0 ? <path d={path} fill="none" stroke={DATA} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {lastP > 0 ? (
          <>
            <rect
              x={gx(lastFrom)}
              y={gBase - gTall - 14}
              width={(gx(EMMA.total) - gx(lastFrom)) * lastP}
              height={gTall + 14}
              fill={`color-mix(in srgb, ${ACCENT} ${Math.round(12 + 18 * pulse(frame, beforeAt - 2, 30))}%, ${PAPER})`}
            />
            <path d={lastPath} fill="none" stroke={ACCENT} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${lastP} 1`} />
          </>
        ) : null}
      </Svg>
      <Note at={closesAt + 10} x={GX0} y={gBase + 10}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>words read, from the first page</div>
      </Note>
      <Note at={closesAt + 30} x={GX1} y={gBase + 10} align="right">
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>to the last</div>
      </Note>
      <Note at={closesAt + 20} x={GX0 + 10} y={gBase - gTall - 6}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>different words so far</div>
      </Note>
      <Note at={newAt - 2} x={GX1 + 18} y={gy(EMMA.distinct) - 4}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          <span style={numStyle(24, ACCENT_INK)}>+{EMMA.newAtEnd}</span> new
        </div>
      </Note>
      <Note at={lastAt} x={GX1 + 18} y={gy(EMMA.distinct) + 28}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>in the last {fmt(EMMA.last, 0)}</div>
      </Note>
      <div
        style={{
          position: "absolute",
          left: GX0,
          top: gBase - gTall,
          width: 1,
          height: gTall,
          background: HAIRLINE,
          opacity: ease(frame, tailGrowsAt - 4, 12) * 0.6,
        }}
      />
      </div>
    </AbsoluteFill>
  );
};
