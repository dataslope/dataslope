import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR, fmt } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ZIPF } from "./data";
import { DATA, DATA_INK, DATA_WASH, drift, Headline, Kicker, Mark, Svg, Tag } from "./parts";

/** The log-log frame: rank 1 to 10,000 across, count about 0.6 to 12,000 up. */
const CX0 = 880;
const CX1 = 1760;
const RANK_DECADES = 4;
const LO = -0.22;
const HI = 4.08;
const lx = (rank: number) => CX0 + (Math.log10(rank) / RANK_DECADES) * (CX1 - CX0);
const TICKS = [1, 10, 100, 1000, 10000];
/** Where the "appear once" note ends: left of the tail, under the curve. */
const HAPAX_LABEL = 1560;

/**
 * Part 1, the 1930s: Zipf counted words. The lesson's own count of Emma
 * builds as a table (Fig. 2), then every one of its 7,079 words on log scales
 * (Fig. 3) beside a line of one over the rank. The top two words almost tie,
 * which the line does not promise; but the top hundred are 60% of the book,
 * and the long flat run at the bottom is every word that appears once.
 */
export const ZipfScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("zipf").from;
  const countedAt = n.word("zipf", "counted words");
  const rankAt = n.word("law", "Rank", { nth: 1 });
  const overAt = n.word("law", "one over the rank");
  const lawAt = n.word("law", "Zipf's law");
  const emmaAt = n.word("emma", "Emma");
  const roughAt = n.word("emma", "rough");
  const tieAt = n.word("emma", "almost tie");
  const hundredAt = n.word("tail", "a hundred words");
  const sixtyAt = n.word("tail", "sixty percent");
  const sevenAt = n.word("tail", "seven thousand");
  const onceAt = n.word("tail", "just once");
  const nextAt = n.word("zipf-out", "Next");

  const CY0 = y(380);
  const CY1 = y(840);
  const ly = (count: number) => CY1 - ((Math.log10(count) - LO) / (HI - LO)) * (CY1 - CY0);

  // ── The table ──
  const TX0 = 96;
  const TTOP = y(366);
  const ROW = 54;
  const COLS = [
    { title: "rank", w: 80, align: "right" as const },
    { title: "word", w: 170, align: "left" as const },
    { title: "count", w: 140, align: "right" as const },
  ];
  const colX = COLS.map((_, i) => TX0 + COLS.slice(0, i).reduce((s, c) => s + c.w + 24, 0));

  // ── The curve ──
  const path = ZIPF.curve.map(([r, c], i) => `${i ? "L" : "M"}${lx(r).toFixed(1)},${ly(c).toFixed(1)}`).join(" ");
  const drawn = ease(frame, rankAt, 46);
  const lineFrom = ZIPF.lineC / 10 ** HI;
  const guide = ease(frame, overAt - 2, 30);
  const band = ease(frame, hundredAt - 2, 18);
  const tail = ease(frame, onceAt - 6, 16);
  const hapax0 = lx(ZIPF.firstHapaxRank);
  const hapax1 = lx(ZIPF.distinct);
  const settle = drift(frame, nextAt, 1, 120);
  const bandX1 = lx(100);

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, the curve, the line, the band, the tail ── */}
      <Sfx name="el-sprinkle" at={from + 10} level={-33} />
      <Sfx name="el-pencil" at={rankAt} level={-34} />
      <Sfx name="el-pencil" at={overAt - 2} level={-35} />
      <Sfx name="el-tap" at={lawAt} level={-28} />
      <Sfx name="el-pencil" at={roughAt} level={-35} />
      <Sfx name="el-whoosh" at={hundredAt - 2} level={-34} />
      <Sfx name="el-tap" at={sixtyAt} level={-28} />
      <Sfx name="el-tap" at={onceAt - 4} level={-28} />

      <Kicker at={from - 6}>The 1930s: George Zipf</Kicker>
      <Headline at={from + 2} lead="Zipf" turn="counted words." turnAt={countedAt - 4} out={rankAt - 8} />
      <Headline at={rankAt - 2} lead="Rank them, and the counts" turn="fall away." turnAt={overAt - 4} out={hundredAt - 6} />
      <Headline at={hundredAt - 2} lead="A few words do" turn="most of the work." turnAt={sixtyAt - 4} />

      {/* ── Fig. 2, the lesson's table ── */}
      <FigLabel n="2" title="A novel's most common words" at={from} x={96} y={y(290)} out={emmaAt - 8} />
      <FigLabel n="2" title="Emma's most common words" at={emmaAt - 2} x={96} y={y(290)} />
      <div style={{ opacity: 1 - settle * 0.25 }}>
        {COLS.map((c, i) => (
          <Ink key={c.title} at={from + 4 + i * 3} dur={12} style={{ left: colX[i], top: TTOP, width: c.w, textAlign: c.align }}>
            <span style={{ ...label(21, INK_SOFT) }}>{c.title}</span>
          </Ink>
        ))}
        <Svg opacity={ease(frame, from + 6, 12)}>
          <line x1={TX0} x2={colX[2] + COLS[2].w} y1={TTOP + 40} y2={TTOP + 40} stroke={INK} strokeWidth={1.4} />
        </Svg>
        {ZIPF.top.map((row, i) => {
          const at = from + 10 + i * 4;
          const top = TTOP + 54 + i * ROW;
          const isTop = i < 2; // the two that almost tie
          const cell = (k: number, children: React.ReactNode, extra?: React.CSSProperties) => (
            <Ink at={at} dur={12} style={{ left: colX[k], top, width: COLS[k].w, textAlign: COLS[k].align, ...extra }}>
              {children}
            </Ink>
          );
          return (
            <React.Fragment key={row.word}>
              {cell(0, <span style={{ ...note(26, INK_SOFT), ...TABULAR }}>{row.rank}</span>)}
              {cell(1, <span style={{ ...note(28, INK), fontWeight: 600 }}>{row.word}</span>)}
              {cell(
                2,
                <span style={{ ...note(28, DATA_INK), ...TABULAR, fontWeight: 600 }}>
                  {isTop ? <Mark at={tieAt - 2 + i * 4}>{fmt(row.count, 0)}</Mark> : fmt(row.count, 0)}
                </span>,
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Fig. 3, every word on log scales ── */}
      <FigLabel n="3" title="Every word in the book, ranked, on log scales" at={rankAt - 4} x={CX0 - 70} y={y(290)} />
      <Svg opacity={ease(frame, rankAt - 4, 14)}>
        {/* The top hundred ranks, as a band behind the curve. */}
        <rect x={lx(1)} y={CY0} width={(bandX1 - lx(1)) * band} height={CY1 - CY0} fill={DATA_WASH} />
        <line x1={CX0} x2={CX1} y1={CY1} y2={CY1} stroke={INK} strokeWidth={1.6} />
        <line x1={CX0} x2={CX0} y1={CY0} y2={CY1} stroke={INK} strokeWidth={1.6} />
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={lx(t)} x2={lx(t)} y1={CY1} y2={CY1 + 8} stroke={INK} strokeWidth={1.3} />
            <line x1={CX0 - 8} x2={CX0} y1={ly(t)} y2={ly(t)} stroke={INK} strokeWidth={1.3} />
          </g>
        ))}
        {/* Every word that appears once: the flat run along the bottom. */}
        <line
          x1={hapax0}
          x2={hapax0 + (hapax1 - hapax0) * tail}
          y1={ly(1)}
          y2={ly(1)}
          stroke={HIGHLIGHT}
          strokeWidth={16}
          strokeLinecap="round"
          opacity={tail > 0 ? 1 : 0}
        />
        {/* One over the rank, through the middle of ranks 1 to 1,000. */}
        <line
          x1={lx(lineFrom)}
          y1={ly(10 ** HI)}
          x2={lx(lineFrom) + (lx(10000) - lx(lineFrom)) * guide}
          y2={ly(10 ** HI) + (ly(ZIPF.lineC / 10000) - ly(10 ** HI)) * guide}
          stroke={INK_SOFT}
          strokeWidth={2}
          strokeDasharray="8 7"
        />
        <path d={path} fill="none" stroke={DATA} strokeWidth={3.2} strokeLinejoin="round" pathLength={1} strokeDasharray={`${drawn} 1`} />
        {/* The top two, almost level. */}
        <ellipse
          cx={(lx(1) + lx(2)) / 2}
          cy={ly(5220)}
          rx={52}
          ry={26}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2.6}
          pathLength={1}
          strokeDasharray={`${ease(frame, tieAt - 4, 14)} 1`}
        />
      </Svg>
      {TICKS.map((t) => (
        <React.Fragment key={t}>
          <div style={{ position: "absolute", left: lx(t), top: CY1 + 14, transform: "translateX(-50%)", opacity: ease(frame, rankAt, 14), ...note(20, INK_SOFT), ...TABULAR }}>
            {fmt(t, 0)}
          </div>
          <div style={{ position: "absolute", left: CX0 - 16, top: ly(t), transform: "translate(-100%, -50%)", opacity: ease(frame, rankAt, 14), ...note(20, INK_SOFT), ...TABULAR }}>
            {fmt(t, 0)}
          </div>
        </React.Fragment>
      ))}
      <Tag x={(CX0 + CX1) / 2} y={CY1 + 46} at={rankAt + 4} align="center" size={20} weight={600}>
        rank
      </Tag>
      <Tag x={CX0 - 6} y={CY0 - 50} at={rankAt + 4} size={20} weight={600}>
        times it appears
      </Tag>
      <Tag x={lx(1500)} y={ly(ZIPF.lineC / 1500) - 66} at={overAt + 6} size={21} color={INK_SOFT} weight={600} style={{ background: PAPER }}>
        one over the rank
      </Tag>
      <Tag x={lx(1500)} y={ly(ZIPF.lineC / 1500) - 98} at={lawAt - 2} size={22} color={INK} weight={700} style={{ background: PAPER }}>
        Zipf's law
      </Tag>
      <Tag x={lx(1) + 18} y={ly(14)} at={sixtyAt - 4} size={22} color={DATA_INK} weight={650}>
        top 100 words:
      </Tag>
      <Tag x={lx(1) + 18} y={ly(14) + 30} at={sixtyAt - 2} size={22} color={DATA_INK} weight={650}>
        {fmt(ZIPF.top100Share * 100, 0)}% of the book
      </Tag>
      {/* Left of the run, where the plot is empty, with a short lead to it. */}
      <Svg opacity={ease(frame, onceAt, 12)}>
        <line x1={HAPAX_LABEL + 12} x2={hapax0 - 14} y1={ly(1) - 14} y2={ly(1)} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Tag x={HAPAX_LABEL} y={ly(1) - 64} at={sevenAt} align="right" size={22} color={INK} weight={650}>
        <span style={TABULAR}>{fmt(ZIPF.hapaxes, 0)}</span> of <span style={TABULAR}>{fmt(ZIPF.distinct, 0)}</span> words
      </Tag>
      <Tag x={HAPAX_LABEL} y={ly(1) - 34} at={onceAt - 2} align="right" size={22} color={INK} weight={650}>
        appear once
      </Tag>
    </AbsoluteFill>
  );
};
