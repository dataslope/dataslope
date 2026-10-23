import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ALPAC, ALPAC_YEAR, DEMO, storyYear } from "./data";
import { Headline, Kicker, Mark, pulse, Spot, Svg, Tag, WARN_WASH } from "./parts";

const X: XScale = { lo: 1952, hi: 1968, x0: 150, x1: 1770 };
const TICKS = [1952, 1954, 1956, 1958, 1960, 1962, 1964, 1966, 1968];

/**
 * Part 4, 1954: Georgetown and IBM show Russian turned into English. The
 * demo in three numbers (Fig. 7), then what it set off (Fig. 8): the forecast
 * of five years, perhaps three, against the 1966 report that saw no prospect
 * of useful machine translation, and the lesson the course drew from it.
 */
export const GeorgetownScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("georgetown").from;
  const translatingAt = n.word("georgetown", "translating");
  const englishAt = n.word("georgetown", "English");
  const wordsAt = n.word("small", "two hundred and fifty");
  const rulesAt = n.word("small", "six grammar rules");
  const sixtyAt = n.word("small", "about sixty");
  const pickedAt = n.word("small", "hand-picked");
  const papersAt = n.word("hype", "papers");
  const predictedAt = n.word("hype", "predicted");
  const fiveAt = n.word("hype", "five years");
  const threeAt = n.word("hype", "perhaps three");
  const twelveAt = n.word("alpac", "Twelve years later");
  const reportAt = n.word("alpac", "government committee");
  const noAt = n.word("alpac", "no prospect");
  const fundingAt = n.word("alpac", "funding dried up");
  const polishedAt = n.word("moral", "polished demo");
  const systemAt = n.word("moral", "working system");
  const sameAt = n.word("georgetown-out", "same year");

  const demoYear = storyYear("georgetown");
  const AXIS = y(800);
  const lane = ease(frame, papersAt - 2, 24);
  const promised = ease(frame, fiveAt - 4, 18);
  const toAlpac = ease(frame, twelveAt - 2, 30);
  const settle = ease(frame, sameAt - 2, 30);

  const stat = (x: number, at: number, value: React.ReactNode, caption: React.ReactNode, swell = 0) => (
    <Ink at={at} dur={16} style={{ left: x, top: y(370), whiteSpace: "nowrap" }}>
      <div style={{ ...headline(92), ...TABULAR, transform: `scale(${1 + swell * 0.05})`, transformOrigin: "0 100%" }}>{value}</div>
      <div style={{ ...label(25, INK_SOFT), marginTop: 10 }}>{caption}</div>
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={from} level={-30} />
      <Sfx name="el-tap" at={wordsAt} level={-28} />
      <Sfx name="el-tap" at={rulesAt} level={-28} />
      <Sfx name="el-tap" at={sixtyAt} level={-28} />
      <Sfx name="el-pencil" at={papersAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={fiveAt - 4} level={-34} />
      <Sfx name="el-pencil" at={twelveAt - 2} level={-35} />
      <Sfx name="el-tap" at={reportAt} level={-28} />
      <Sfx name="el-scratch" at={fundingAt} level={-33} />

      <Kicker at={from - 6}>1954: Georgetown University and IBM</Kicker>
      <Headline at={translatingAt - 4} lead="Russian in," turn="English out." turnAt={englishAt - 4} out={polishedAt - 6} />
      <Headline at={polishedAt - 2} lead="A polished demo" turn="is not a working system." turnAt={systemAt - 6} />

      <Spot id="computer" at={from - 2} left={1260} top={y(300)} width={500} height={399} />

      {/* ── Fig. 7, the demo in numbers ── */}
      <FigLabel n="7" title={`The demo, ${DEMO.date}`} at={from + 4} x={96} y={y(290)} />
      <div style={{ opacity: 1 - ease(frame, twelveAt, 16) * 0.35 }}>
        {stat(96, wordsAt - 2, DEMO.words, "words")}
        {stat(400, rulesAt - 2, DEMO.rules, "grammar rules")}
        {stat(
          640,
          sixtyAt - 2,
          <>
            <span style={{ ...headline(46), color: INK_SOFT }}>about </span>
            {DEMO.sentences}
          </>,
          <Mark at={pickedAt}>hand-picked sentences</Mark>,
        )}
      </div>

      {/* ── Fig. 8, what was promised and what came ── */}
      <div style={{ opacity: 1 - settle * 0.3 }}>
        <FigLabel n="8" title="What was promised, and what came" at={papersAt - 4} x={96} y={y(600)} />
        <Svg>
          <line x1={X.x0} x2={X.x0 + (X.x1 - X.x0) * lane} y1={AXIS} y2={AXIS} stroke={INK} strokeWidth={1.8} />
          {TICKS.map((t) => (
            <line key={t} x1={sx(X, t)} x2={sx(X, t)} y1={AXIS} y2={AXIS + 8} stroke={INK} strokeWidth={1.3} opacity={lane} />
          ))}
          {/* Five years, perhaps three: 1957 to 1959. */}
          <rect
            x={sx(X, demoYear + 3)}
            y={AXIS - 16}
            width={(sx(X, demoYear + 5) - sx(X, demoYear + 3)) * promised}
            height={32}
            rx={6}
            fill={WARN_WASH}
            stroke={ACCENT}
            strokeWidth={2}
            strokeDasharray="6 5"
          />
          {/* From the demo to the report: twelve years. */}
          <line
            x1={sx(X, demoYear)}
            x2={sx(X, demoYear) + (sx(X, ALPAC_YEAR) - sx(X, demoYear)) * toAlpac}
            y1={AXIS}
            y2={AXIS}
            stroke={INK}
            strokeWidth={4}
            opacity={toAlpac > 0 ? 1 : 0}
          />
          <circle cx={sx(X, demoYear)} cy={AXIS} r={12 * ease(frame, papersAt, 10) * (1 + pulse(frame, twelveAt, 20) * 0.4)} fill={INK} stroke={PAPER} strokeWidth={2.5} />
          <circle cx={sx(X, ALPAC_YEAR)} cy={AXIS} r={12 * ease(frame, reportAt - 2, 10)} fill={ACCENT} stroke={PAPER} strokeWidth={2.5} />
        </Svg>
        {TICKS.map((t) => (
          <div key={t} style={{ position: "absolute", left: sx(X, t), top: AXIS + 16, transform: "translateX(-50%)", opacity: lane, ...note(20, INK_SOFT), ...TABULAR }}>
            {t}
          </div>
        ))}
        <Tag x={sx(X, demoYear)} y={AXIS - 62} at={papersAt} align="center" size={23} color={INK} weight={650}>
          the demo
        </Tag>
        <Tag x={sx(X, demoYear)} y={AXIS - 36} at={papersAt + 6} align="center" size={20} color={INK_SOFT}>
          front-page news
        </Tag>
        {/* Dostert's forecast, over the years it named. */}
        <Ink at={predictedAt} style={{ left: sx(X, demoYear + 3), top: AXIS - 128, whiteSpace: "nowrap" }}>
          <div style={{ ...headline(38, true), color: ACCENT_INK }}>
            &ldquo;{"\u2009"}<Mark at={fiveAt - 2}>five</Mark>, perhaps <Mark at={threeAt}>three</Mark>, years hence&rdquo;
          </div>
          <div style={{ ...label(20, INK_SOFT), marginTop: 6 }}>Leon Dostert, one of its leaders</div>
        </Ink>
        {/* The report, under its year. */}
        <Ink at={noAt - 4} style={{ left: sx(X, ALPAC_YEAR) + 120 - 1100, top: AXIS + 54, width: 1100, textAlign: "right" }}>
          <div style={{ ...label(21, INK_SOFT) }}>ALPAC report, {ALPAC_YEAR}</div>
          <div style={{ ...headline(30, true), color: INK, marginTop: 4, lineHeight: 1.15 }}>&ldquo;{ALPAC}&rdquo;</div>
        </Ink>
        <Tag x={sx(X, ALPAC_YEAR)} y={AXIS - 62} at={fundingAt - 2} align="center" size={23} color={ACCENT_INK} weight={700}>
          funding dried up
        </Tag>
      </div>
    </AbsoluteFill>
  );
};
