import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
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
 * Why a bigger n is not better, measured on Emma: of the n-grams as read,
 * the share whose n-gram appears again somewhere in the book (what a model
 * counting them can reuse), from 98% for single words to 1.5% for runs of
 * five, against the words of order each keeps; sparsity; bigrams, and
 * trigrams given plenty of text, as the sweet spot; and the bridge to Unit 4.
 */
export const SparseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("sparse").from;
  const notAt = n.word("sparse", "Usually not");
  const ngramAt = n.word("sparse", "n-gram");
  const takeAt = n.word("sparse", "Take");
  const elseAt = n.word("sparse", "anywhere else");
  const shareAts = [
    n.word("shares", "almost always"),
    n.word("shares", "seven times"),
    n.word("shares", "one in four"),
    n.word("shares", "one in fifteen"),
    n.word("shares", "almost never"),
  ];
  const oneAt = n.word("sparsity", "seen only once");
  const sightingAt = n.word("sparsity", "one sighting");
  const sparsityAt = n.word("sparsity", "sparsity");
  const accidentAt = n.word("sparsity", "accident");
  const sweetAt = n.word("sweet", "sweet spot");
  const plentyAt = n.word("sweet", "plenty");
  const orderAt = n.word("sweet", "enough order");
  const commonAt = n.word("sweet", "common enough");
  const numbersAt = n.word("next", "numbers");
  const listsAt = n.word("next", "lists");
  const butAt = n.word("next", "But");
  const nextAt = n.word("next", "next");
  const featuresAt = n.word("next", "features");
  const biSaid = n.word("sweet", "bigrams");
  const triSaid = n.word("sweet", "trigrams");
  // Once the bridge is spoken, the chart steps back behind the next line.
  const back = 1 - 0.55 * ease(frame, n.beat("next").to + 2, 30);

  const base = y(BASE);
  const tall = h(TALL);
  const barX = (i: number) => X0 + i * PITCH;
  const top = (i: number) => base - EMMA.sparsity[i].recur * tall;
  const pct = (v: number) => (v * 100 >= 10 ? `${Math.round(v * 100)}%` : `${(v * 100).toFixed(1)}%`);
  // A bar too short to hold its number carries it above.
  const inside = (i: number) => EMMA.sparsity[i].recur > 0.15;

  return (
    <AbsoluteFill>
      {/* ── Sound: each bar, the sweet spot, the bridge ── */}
      <Sfx name="el-sprinkle" at={ngramAt - 2} level={-34} />
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
        <FigLabel n="15" title="How often an n-gram you read in Emma appears again" at={takeAt - 4} x={X0 - 50} y={y(286)} />
        <Svg>
          <line x1={X0 - 40} x2={X0 - 40 + PITCH * 5 * ease(frame, takeAt - 2, 16)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
          <line
            x1={X0 - 40}
            x2={X0 - 40 + PITCH * 5 * ease(frame, elseAt - 2, 16)}
            y1={base - tall}
            y2={base - tall}
            stroke={HAIRLINE}
            strokeWidth={1.4}
            strokeDasharray="5 6"
          />
          {EMMA.sparsity.map((s, i) => {
            const ghost = ease(frame, ngramAt - 2 + i * 3, 10);
            const p = ease(frame, shareAts[i] - 4, 14);
            const hgt = s.recur * tall * p;
            const lit = i === 1 ? ease(frame, sweetAt - 2, 10) : i === 2 ? ease(frame, plentyAt - 2, 10) : 0;
            return (
              <g key={s.n}>
                {/* Where each bar will stand, from the moment n-grams are named. */}
                <rect x={barX(i)} y={base - tall} width={BAR_W} height={tall} fill="none" stroke={HAIRLINE} strokeWidth={1.2} strokeDasharray="4 6" opacity={ghost * (1 - p) * 0.8} />
                {p > 0 ? <rect x={barX(i)} y={base - hgt} width={BAR_W} height={hgt} fill={DATA} /> : null}
                {/* "from an accident": the room above each bar, the n-grams seen once. */}
                {p > 0 ? (
                  <rect x={barX(i)} y={base - tall} width={BAR_W} height={tall - hgt} fill={ACCENT} opacity={0.16 * pulse(frame, accidentAt - 4 + i * 3, 30)} />
                ) : null}
                {lit > 0 ? (
                  <rect
                    x={barX(i) - 6}
                    y={base - hgt - 6}
                    width={BAR_W + 12}
                    height={hgt + 6}
                    fill="none"
                    stroke={INK}
                    strokeWidth={2.4}
                    strokeDasharray={i === 2 ? "8 6" : undefined}
                    opacity={lit}
                    rx={4}
                  />
                ) : null}
                {/* The words of order each n-gram keeps: one square a word. */}
                {Array.from({ length: s.n }, (_, k) => (
                  <rect
                    key={k}
                    x={barX(i) + BAR_W / 2 - (s.n * 16 - 4) / 2 + k * 16}
                    y={base + 50}
                    width={12}
                    height={12}
                    rx={2}
                    fill={INK_SOFT}
                    opacity={ease(frame, orderAt - 2 + i * 3, 10)}
                  />
                ))}
              </g>
            );
          })}
        </Svg>
        <Note at={elseAt} x={X0 - 40} y={base - tall - 34}>
          <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>every one appears again</div>
        </Note>
        {EMMA.sparsity.map((s, i) => (
          <React.Fragment key={s.n}>
            <Note at={shareAts[i] + 4} x={barX(i)} y={inside(i) ? top(i) + 12 : top(i) - 40} width={BAR_W} from="up">
              <div style={{ ...numStyle(28, inside(i) ? PAPER : INK), textAlign: "center" }}>{pct(s.recur)}</div>
            </Note>
            <Ink at={ngramAt - 2 + i * 3} dur={12} style={{ left: barX(i) - 30, width: BAR_W + 60, top: base + 12, textAlign: "center" }}>
              <div style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
                {i === 1 ? <Marked at={biSaid - 2}>{NAMES[i]}</Marked> : i === 2 ? <Marked at={triSaid - 2}>{NAMES[i]}</Marked> : NAMES[i]}
              </div>
            </Ink>
          </React.Fragment>
        ))}
        <Note at={orderAt + 6} x={barX(4) + BAR_W + 20} y={base + 44}>
          <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>a square for each word of order</div>
        </Note>
        <Bracket x0={barX(1) - 6} x1={barX(2) + BAR_W + 6} y={base + 84} at={sweetAt - 4} color={INK} up />
        <Note at={sweetAt} x={barX(1) - 6} y={base + 94} width={barX(2) + BAR_W + 12 - barX(1)}>
          <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap", textAlign: "center" }}>
            <Marked at={sweetAt + 2}>the sweet spot</Marked>
          </div>
        </Note>

        {/* What a one-off is worth; set back as the bridge begins. */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.5 * ease(frame, butAt - 2, 14) }}>
          <Note at={oneAt - 2} x={NOTE_X} y={y(300)} from="right">
            <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>Seen only once,</div>
            <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>it tells you almost nothing:</div>
          </Note>
          <Note at={sightingAt - 2} x={NOTE_X} y={y(300) + 92} from="right">
            <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>one sighting can&apos;t tell a pattern</div>
            <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 2 }}>from an accident</div>
          </Note>
          <Note at={sparsityAt - 2} x={NOTE_X} y={y(300) + 160} from="right">
            <div style={{ ...body(34, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>That&apos;s sparsity.</div>
          </Note>
          <Note at={sweetAt - 2} x={NOTE_X} y={y(300) + 240} from="right">
            <div style={{ ...label(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
              bigrams<span style={{ opacity: ease(frame, plentyAt - 2, 10) }}>, and trigrams with plenty of text:</span>
            </div>
            <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, orderAt - 2, 10) }}>enough order to help,</div>
            <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, commonAt - 2, 10) }}>
              still common enough to count
            </div>
          </Note>
        </div>
        <Note at={numbersAt - 2} x={NOTE_X} y={y(300) + 370} from="right">
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
