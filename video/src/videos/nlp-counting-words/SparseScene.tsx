import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA } from "./data";
import { Bracket, DATA, Headline, Kicker, Marked, numStyle, pulse, Svg } from "./parts";

const X0 = 170;
const PITCH = 210;
const BAR_W = 128;
const BASE = 700;
const TALL = 330;
const NAMES = ["single words", "bigrams", "trigrams", "four in a row", "five in a row"];
const NOTE_X = 1300;

/**
 * Why a bigger n is not better, measured on Emma: the share of distinct
 * n-grams that appear only once, from 39% for single words to 99% for runs
 * of five; sparsity; bigrams and trigrams as the sweet spot; and the bridge
 * to Unit 4.
 */
export const SparseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("sparse").from;
  const notAt = n.word("sparse", "Usually not");
  const countAt = n.word("sparse", "Count");
  const onceAt = n.word("sparse", "only once");
  const shareAts = [
    n.word("shares", "thirty-nine"),
    n.word("shares", "seventy-three"),
    n.word("shares", "ninety", { nth: 1 }),
    n.word("shares", "five in a row") - 10,
    n.word("shares", "ninety-nine"),
  ];
  const nameAts = [
    n.word("shares", "single words"),
    n.word("shares", "bigrams"),
    n.word("shares", "Trigrams"),
    n.word("shares", "five in a row") - 12,
    n.word("shares", "five in a row"),
  ];
  const oneAt = n.word("sparsity", "count of one");
  const sparsityAt = n.word("sparsity", "sparsity");
  const worseAt = n.word("sparsity", "worse");
  const sweetAt = n.word("sweet", "sweet spot");
  const orderAt = n.word("sweet", "enough order");
  const commonAt = n.word("sweet", "common enough");
  const numbersAt = n.word("next", "numbers");
  const listsAt = n.word("next", "lists");
  const butAt = n.word("next", "But");
  const nextAt = n.word("next", "next");
  const featuresAt = n.word("next", "features");
  const everyAt = n.word("sparsity", "every word");
  const biSaid = n.word("sweet", "bigrams");
  const triSaid = n.word("sweet", "trigrams");
  // Once the bridge is spoken, the chart steps back behind the next line.
  const back = 1 - 0.55 * ease(frame, n.beat("next").to + 2, 30);

  const base = y(BASE);
  const tall = h(TALL);
  const barX = (i: number) => X0 + i * PITCH;
  const top = (i: number) => base - EMMA.sparsity[i].share * tall;

  return (
    <AbsoluteFill>
      {/* ── Sound: each bar, the sweet spot, the bridge ── */}
      {shareAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 4} level={-28} />
      ))}
      <Sfx name="el-pencil" at={sweetAt - 4} level={-34} />
      <Sfx name="el-chime" at={n.beat("sweet").to + 6} level={-33} />
      <Sfx name="el-pencil" at={featuresAt - 6} level={-35} />

      <Kicker at={from - 10}>Counting word pairs</Kicker>
      <Headline at={from - 6} second={notAt - 2} italic="Usually not.">
        Five in a row?
      </Headline>

      <div style={{ position: "absolute", inset: 0, opacity: back }}>
      <FigLabel n="15" title="Emma's n-grams that appear only once" at={countAt - 4} x={X0 - 50} y={y(286)} />
      <Svg>
        <line x1={X0 - 40} x2={X0 - 40 + (PITCH * 5) * ease(frame, countAt - 2, 16)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
        <line
          x1={X0 - 40}
          x2={X0 - 40 + PITCH * 5 * ease(frame, onceAt - 2, 16)}
          y1={base - tall}
          y2={base - tall}
          stroke={HAIRLINE}
          strokeWidth={1.4}
          strokeDasharray="5 6"
        />
        {EMMA.sparsity.map((s, i) => {
          const p = ease(frame, shareAts[i] - 4, 14);
          if (p <= 0) return null;
          const hgt = s.share * tall * p;
          const lit = i === 1 || i === 2 ? ease(frame, sweetAt - 2, 10) : 0;
          return (
            <g key={s.n}>
              <rect x={barX(i)} y={base - hgt} width={BAR_W} height={hgt} fill={DATA} />
              {/* "every word you add to the window": the longer windows swell in turn. */}
              {i >= 2 ? <rect x={barX(i)} y={base - hgt} width={BAR_W} height={hgt} fill={PAPER} opacity={0.4 * pulse(frame, everyAt - 2 + (i - 2) * 8, 22)} /> : null}
              {lit > 0 ? <rect x={barX(i) - 6} y={base - hgt - 6} width={BAR_W + 12} height={hgt + 6} fill="none" stroke={INK} strokeWidth={2.4} opacity={lit} rx={4} /> : null}
            </g>
          );
        })}
      </Svg>
      <Note at={onceAt} x={X0 - 40} y={base - tall - 34}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>every one of them seen once</div>
      </Note>
      {EMMA.sparsity.map((s, i) => (
        <React.Fragment key={s.n}>
          <Note at={shareAts[i] + 4} x={barX(i)} y={top(i) + 12} width={BAR_W} from="up">
            <div style={{ ...numStyle(28, PAPER), textAlign: "center" }}>{Math.round(s.share * 100)}%</div>
          </Note>
          <Ink at={nameAts[i] - 4} dur={12} style={{ left: barX(i) - 30, width: BAR_W + 60, top: base + 12, textAlign: "center" }}>
            <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
              {i === 1 ? <Marked at={biSaid - 2}>{NAMES[i]}</Marked> : i === 2 ? <Marked at={triSaid - 2}>{NAMES[i]}</Marked> : NAMES[i]}
            </div>
            <div style={{ ...label(20, INK_SOFT), fontWeight: 500, marginTop: 4, ...{ fontVariantNumeric: "lining-nums" } }}>n = {s.n}</div>
          </Ink>
        </React.Fragment>
      ))}
      <Bracket x0={barX(1) - 6} x1={barX(2) + BAR_W + 6} y={base + 84} at={sweetAt - 4} color={INK} up />
      <Note at={sweetAt} x={barX(1) - 6} y={base + 94} width={barX(2) + BAR_W + 12 - barX(1)}>
        <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap", textAlign: "center" }}>
          <Marked at={sweetAt + 2}>the sweet spot</Marked>
        </div>
      </Note>

      {/* What the tall bars mean; set back as the bridge begins. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.5 * ease(frame, butAt - 2, 14) }}>
      <Note at={oneAt - 2} x={NOTE_X} y={y(300)} from="right">
        <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>A count of one</div>
        <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>tells you almost nothing.</div>
      </Note>
      <Note at={sparsityAt - 2} x={NOTE_X} y={y(300) + 100} from="right">
        <div style={{ ...body(34, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>That&apos;s sparsity,</div>
      </Note>
      <Note at={worseAt - 2} x={NOTE_X} y={y(300) + 148} from="right">
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>and it grows with every word in the window</div>
      </Note>
      <Note at={orderAt - 2} x={NOTE_X} y={y(300) + 230} from="right">
        <div style={{ ...label(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>bigrams and trigrams:</div>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 6 }}>enough order to help,</div>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, commonAt - 2, 10) }}>common enough to count</div>
      </Note>
      </div>
      <Note at={numbersAt - 2} x={NOTE_X} y={y(300) + 360} from="right">
        <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>A model wants numbers,</div>
        <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap", opacity: ease(frame, listsAt - 2, 12) }}>not lists of words.</div>
      </Note>

      </div>

      <NextLine at={nextAt - 8} x={X0 - 50} y={y(870)} width={1680}>
        turning text into <Marked at={featuresAt - 2}>features</Marked>
      </NextLine>
    </AbsoluteFill>
  );
};
