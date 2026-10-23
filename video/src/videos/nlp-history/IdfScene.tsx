import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { IDF } from "./data";
import { DATA, DATA_INK, Headline, Kicker, Mark } from "./parts";

/** mulberry32, for which documents hold each word: layout only, seeded. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `k` distinct document indices out of `n`, the same on every frame. */
const pick = (n: number, k: number, seed: number, avoid: ReadonlySet<number> = new Set()) => {
  const r = mulberry32(seed);
  const out = new Set<number>();
  while (out.size < k) {
    const i = Math.floor(r() * n);
    if (!avoid.has(i)) out.add(i);
  }
  return out;
};

const COMMON_INK = ds("gray", 500);

/**
 * Part 6, 1972: Spärck Jones sees that a match on a common word counted as
 * much as a match on a rare one, and weights words by how few documents they
 * appear in. Her own example (Fig. 10): two hundred documents, a word in
 * ninety of them weighs 2 and a word in three weighs 7, by her rule
 * (measure.py). Then its name, the IDF in TF-IDF.
 */
export const IdfScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("sparck").from;
  const searchAt = n.word("sparck", "search matched words");
  const commonAt = n.word("flaw", "common word");
  const muchAt = n.word("flaw", "just as much");
  const rareAt = n.word("flaw", "rare one");
  const fixAt = n.word("fix", "Her fix");
  const fewerAt = n.word("fix", "fewer documents");
  const worthAt = n.word("fix", "worth");
  const twoHundredAt = n.word("example", "two hundred documents");
  const ninetyAt = n.word("example", "ninety");
  const weighsTwoAt = n.word("example", "weighs two");
  const threeAt = n.word("example", "just three");
  const sevenAt = n.word("example", "weighs seven");
  const inverseAt = n.word("idf", "inverse document frequency");
  const tfidfAt = n.word("idf", "TF-IDF");
  const searchEnginesAt = n.word("idf", "search engines");
  const lastAt = n.word("sparck-out", "last story");
  const decadesAt = n.word("sparck-out", "four decades");

  // ── The collection: 200 documents, 20 by 10 ──
  const COLS = 20;
  const DW = 28;
  const DH = 36;
  const GAP_X = 9;
  const GAP_Y = 12;
  const GX = 96;
  const GY = y(380);
  const common = pick(IDF.N, IDF.common.docs, 7);
  const rare = pick(IDF.N, IDF.rare.docs, 11, common);

  // ── The two words' worth ──
  const RX = 1010;
  const BAR_X = 1010;
  const UNIT = 88;
  const ROW_A = y(410);
  const ROW_B = y(600);
  const commonW = 1 + (IDF.common.weight - 1) * ease(frame, weighsTwoAt - 2, 18);
  const rareW = 1 + (IDF.rare.weight - 1) * ease(frame, sevenAt - 2, 24);
  const settle = ease(frame, lastAt - 2, 30);

  const row = (top: number, at: number, name: string, color: string, inkColor: string, w: number, docs: React.ReactNode, docsAt: number) => {
    const bar = ease(frame, at, 14);
    return (
      <>
        <Ink at={at - 4} style={{ left: RX, top, whiteSpace: "nowrap" }}>
          <div style={{ ...label(27, INK) }}>
            a match on <span style={{ color: inkColor }}>{name}</span>
          </div>
        </Ink>
        <Ink at={docsAt} style={{ left: RX, top: top + 38, whiteSpace: "nowrap" }}>
          <div style={{ ...label(22, INK_SOFT), fontWeight: 560 }}>{docs}</div>
        </Ink>
        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: top + 78,
            width: UNIT * w * bar,
            height: 40,
            borderRadius: 5,
            background: color,
            opacity: bar > 0 ? 1 : 0,
          }}
        />
        <Ink at={at + 6} style={{ left: BAR_X + UNIT * w + 18, top: top + 74, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(44), ...TABULAR, color: INK }}>{Math.round(w)}</span>
        </Ink>
      </>
    );
  };

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={from + 6} level={-32} />
      <Sfx name="el-sprinkle" at={from + 46} level={-34} />
      <Sfx name="el-pop" at={commonAt - 2} level={-31} />
      <Sfx name="el-pop" at={rareAt - 2} level={-31} />
      <Sfx name="el-sprinkle" at={ninetyAt - 2} level={-33} />
      <Sfx name="el-tap" at={weighsTwoAt} level={-28} />
      <Sfx name="el-tap" at={threeAt} level={-29} />
      <Sfx name="el-whoosh" at={sevenAt - 2} level={-34} />
      <Sfx name="el-tap" at={tfidfAt} level={-28} />

      <Kicker at={from - 6}>1972: Karen Spärck Jones, Cambridge</Kicker>
      <Headline at={searchAt - 4} lead="Every match counted" turn="the same." turnAt={searchAt + 8} out={fixAt - 6} />
      <Headline at={fixAt - 2} lead="The rarer the word," turn="the more it's worth." turnAt={worthAt - 8} out={lastAt - 8} />
      <Headline at={lastAt - 4} lead="The last story:" turn="four decades on." turnAt={decadesAt - 4} />

      {/* ── Fig. 10, her example collection ── */}
      <FigLabel n="10" title="Her example: a collection of 200 documents" at={from + 2} x={96} y={y(290)} />
      <div style={{ opacity: 1 - settle * 0.3 }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: IDF.N }, (_, i) => {
            const c = i % COLS;
            const r = Math.floor(i / COLS);
            const x = GX + c * (DW + GAP_X);
            const top = GY + r * (DH + GAP_Y);
            const p = Math.min(1, pop(frame, from + 6 + (c + r) * 3, fps, 16));
            if (p <= 0.001) return null;
            const isCommon = common.has(i);
            const isRare = rare.has(i);
            const tc = isCommon ? ease(frame, ninetyAt - 2 + (i % 9), 10) : 0;
            const tr = isRare ? ease(frame, threeAt - 2, 10) : 0;
            const fill = tr > 0 ? DATA : tc > 0 ? COMMON_INK : PAPER;
            const fillOpacity = tr > 0 ? tr : tc > 0 ? tc * 0.55 : 1;
            return (
              <g key={i} opacity={p} transform={`translate(${x} ${top + (1 - p) * 8})`}>
                <rect width={DW} height={DH} rx={3} fill={PAPER} stroke={ds("gray", 400)} strokeWidth={1.4} />
                {fill !== PAPER ? <rect width={DW} height={DH} rx={3} fill={fill} opacity={fillOpacity} /> : null}
                {[9, 16, 23].map((ly) => (
                  <line key={ly} x1={6} x2={DW - 6} y1={ly} y2={ly} stroke={tr > 0 ? PAPER : ds("gray", 300)} strokeWidth={1.4} />
                ))}
              </g>
            );
          })}
        </svg>
        <Ink at={twoHundredAt - 2} style={{ left: GX, top: GY + 10 * (DH + GAP_Y) + 10, whiteSpace: "nowrap" }}>
          <div style={{ ...label(23, INK_SOFT) }}>
            <span style={{ color: COMMON_INK, fontWeight: 700 }}>{IDF.common.docs}</span> hold the common word,{" "}
            <span style={{ color: DATA_INK, fontWeight: 700 }}>{IDF.rare.docs}</span> hold the rare one
          </div>
        </Ink>

        {row(
          ROW_A,
          commonAt,
          "a common word",
          COMMON_INK,
          COMMON_INK,
          commonW,
          <>
            in <Mark at={ninetyAt}>{IDF.common.docs} of {IDF.N}</Mark> documents
          </>,
          ninetyAt - 2,
        )}
        {row(
          ROW_B,
          rareAt,
          "a rare word",
          DATA,
          DATA_INK,
          rareW,
          <>
            in <Mark at={threeAt}>{IDF.rare.docs} of {IDF.N}</Mark> documents
          </>,
          threeAt - 2,
        )}
        <Ink at={muchAt} out={fewerAt - 6} style={{ left: RX, top: y(800), whiteSpace: "nowrap" }}>
          <div style={{ ...headline(36, true), color: ACCENT_INK }}>one match, one point, either way</div>
        </Ink>
      </div>
      <div style={{ position: "absolute", left: RX, top: y(800), display: "flex", gap: "0.3em", ...headline(36, true), whiteSpace: "nowrap" }}>
        <Ink at={inverseAt - 2} style={{ position: "relative", color: INK }}>
          <Mark at={inverseAt + 4}>inverse document frequency</Mark>,
        </Ink>
        <Ink at={tfidfAt - 2} style={{ position: "relative", color: DATA_INK }}>
          the IDF in TF-IDF
        </Ink>
      </div>
      <Ink at={searchEnginesAt} style={{ left: RX, top: y(860), whiteSpace: "nowrap" }}>
        <div style={{ ...label(23, INK_SOFT) }}>still weighting search results, half a century on</div>
      </Ink>
    </AbsoluteFill>
  );
};
