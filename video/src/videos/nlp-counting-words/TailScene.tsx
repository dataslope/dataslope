import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, fmt, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA } from "./data";
import { Bracket, DATA, Headline, Kicker, Marked, numStyle, Svg } from "./parts";

/** Fig. 4: the vocabulary as a hundred squares, on the left. */
const WX = 130;
const WY = 350;
const CELL = 26;
const CELL_GAP = 4;
/** Fig. 5: Emma's top words as bars, then the rest of the ranks squeezed. */
const X0 = 640;
const BARS = 20;
const PITCH = 44;
const BAR_W = 32;
const BASE = 612;
const TALL = 236;
const TAIL_X0 = X0 + BARS * PITCH + 14;
const TAIL_X1 = 1790;
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
  const tailAt = n.word("zipf", "tail");
  const zipfAt = n.word("zipf", "Zipf's");
  const closesAt = n.word("grows", "never closes");
  const lastAt = n.word("grows", "last ten thousand");
  const newAt = n.word("grows", "hundred and eighty-eight");
  const topAt = n.word("top-in", "top");

  // ── Fig. 4 geometry ──
  const base = y(BASE);
  const unit = h(TALL) / EMMA.ranked[0];
  const barAt = (i: number) => rankAt - 2 + Math.round(i * 1.4);
  const tail = EMMA.ranked.slice(BARS);
  const tailPts = tail
    .map((c, i) => [TAIL_X0 + ((TAIL_X1 - TAIL_X0) * i) / (tail.length - 1), base - c * unit] as const)
    .filter((_, i) => i % 8 === 0 || i === tail.length - 1);
  const tailP = ease(frame, otherEndAt - 4, 24);
  const topTenRight = X0 + 9 * PITCH + BAR_W;
  const bracketY = base - h(TALL) - 18;

  // ── Fig. 5: a hundred squares, the last 39 for the words used once ──
  const onceCells = Math.round(EMMA.hapaxShare * 100);
  const cellAt = (k: number) => differentAt - 6 + Math.round(((k * 37) % 100) * 0.22);
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
      <Sfx name="el-sprinkle" at={differentAt - 6} level={-32} />
      <Sfx name="el-whoosh" at={rankAt - 2} level={-34} />
      <Sfx name="el-pencil" at={topTenAt - 2} level={-34} />
      <Sfx name="el-sprinkle" at={onceAt - 4} level={-31} />
      <Sfx name="el-pencil" at={closesAt - 4} level={-35} />
      <Sfx name="el-tap" at={newAt - 2} level={-27} />

      <Kicker at={from - 10}>Counting words</Kicker>
      <Headline at={wordsAt - 4} second={sevenAt - 2} italic={`only ${fmt(EMMA.distinct, 0)} different.`}>
        {`${fmt(EMMA.total, 0)} words,`}
      </Headline>

      {/* Fig. 5: the vocabulary, a square for each hundredth of it. */}
      <FigLabel n="4" title={`Emma's ${fmt(EMMA.distinct, 0)} different words`} at={sevenAt - 4} x={WX - 6} y={y(286)} />
      <Svg>
        {Array.from({ length: 100 }, (_, k) => {
          const r = Math.floor(k / 10);
          const c = k % 10;
          const p = ease(frame, cellAt(k), 8);
          if (p <= 0) return null;
          const once = k >= 100 - onceCells;
          const turn = once ? ease(frame, onceAt - 4 + (k - (100 - onceCells)) * 0.6, 8) : 0;
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

      {/* Fig. 4: ranked by count. */}
      <FigLabel n="5" title={`Emma's ${BARS} most common words, by count`} at={rankAt - 4} x={X0 - 10} y={y(286)} />
      <Svg>
        <line x1={X0 - 6} x2={X0 - 6 + (TAIL_X1 - X0 + 12) * ease(frame, rankAt - 4, 16)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
        {EMMA.ranked.slice(0, BARS).map((c, i) => {
          const p = ease(frame, barAt(i), 12);
          if (p <= 0) return null;
          const hgt = c * unit * p;
          return <rect key={i} x={X0 + i * PITCH} y={base - hgt} width={BAR_W} height={hgt} fill={DATA} />;
        })}
        {tailP > 0 ? (
          <polygon
            points={[...tailPts, [TAIL_X1, base] as const, [TAIL_X0, base] as const]
              .map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`)
              .join(" ")}
            fill={DATA}
            style={{ clipPath: `inset(0 ${(1 - tailP) * 100}% 0 0)` }}
          />
        ) : null}
        {tailP > 0 ? (
          <g opacity={ease(frame, otherEndAt - 4, 10)} stroke={INK_SOFT} strokeWidth={1.6}>
            <line x1={TAIL_X0 - 10} x2={TAIL_X0 - 2} y1={base + 8} y2={base - 8} />
            <line x1={TAIL_X0 - 4} x2={TAIL_X0 + 4} y1={base + 8} y2={base - 8} />
          </g>
        ) : null}
      </Svg>
      {EMMA.top10.map(([w], i) => (
        <Ink key={w} at={barAt(i) + 4} dur={10} style={{ left: X0 + i * PITCH - 7, width: BAR_W + 14, top: base + 8, textAlign: "center" }}>
          <span style={{ ...label(20, INK), fontWeight: 600 }}>{i < 6 ? <Marked at={topAt - 2 + i * 3}>{w}</Marked> : w}</span>
        </Ink>
      ))}
      <Bracket x0={X0} x1={topTenRight} y={bracketY} at={topTenAt - 2} color={ACCENT} />
      <Note at={fifthAt - 2} x={topTenRight + 22} y={bracketY - 16}>
        <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          the top ten: <span style={numStyle(22, ACCENT_INK)}>{Math.round(EMMA.top10Share * 100)}%</span> of all the words
        </div>
      </Note>
      <Note at={otherEndAt + 4} x={TAIL_X0} y={base + 10}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>the other {fmt(EMMA.distinct - BARS, 0)},</div>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>squeezed in</div>
      </Note>
      <Note at={tailAt - 2} x={X0 + 10 * PITCH + 10} y={bracketY + 44}>
        <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
          <Marked at={giantsAt - 2}>A few giants</Marked>, a long tail:
        </div>
        <div style={{ ...body(30), color: ACCENT_INK, whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, zipfAt - 2, 12) }}>Zipf&apos;s law</div>
      </Note>

      {/* Fig. 6: the vocabulary still growing at the last page. */}
      <FigLabel n="6" title="New words keep arriving" at={closesAt - 6} x={GX0 - 10} y={y(GBASE - GTALL - 64)} />
      <Svg>
        <line x1={GX0} x2={GX0 + (GX1 - GX0) * ease(frame, closesAt - 6, 16)} y1={gBase + 0.5} y2={gBase + 0.5} stroke={INK} strokeWidth={1.6} />
        {drawP > 0 ? <path d={path} fill="none" stroke={DATA} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {lastP > 0 ? (
          <>
            <rect
              x={gx(lastFrom)}
              y={gBase - gTall - 14}
              width={(gx(EMMA.total) - gx(lastFrom)) * lastP}
              height={gTall + 14}
              fill={`color-mix(in srgb, ${ACCENT} 12%, ${PAPER})`}
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
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>in the last {fmt(EMMA.last, 0)}</div>
      </Note>
      <div
        style={{
          position: "absolute",
          left: GX0,
          top: gBase - gTall,
          width: 1,
          height: gTall,
          background: HAIRLINE,
          opacity: ease(frame, closesAt - 6, 12) * 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
