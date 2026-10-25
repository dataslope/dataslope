import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { BIGRAM, SHANNON_PAPER, SHANNON_SAMPLE } from "./data";
import { DATA, DATA_INK, Headline, InlineArrow, Kicker, lerp, Mark, pulse, SOFT, Spot, Svg, Tick, Wire } from "./parts";

/** The paper's first page: the journal and the month, the title, the author,
 *  then lines of text setting themselves one after another. */
const PaperPage: React.FC<{ x: number; top: number; width: number; height: number; at: number; markAt: number; lineAt: number; out: number }> = ({
  x,
  top,
  width,
  height,
  at,
  markAt,
  lineAt,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const pad = 28;
  const lines = 8;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        opacity: p * (1 - o),
        transform: `translate(${(1 - p) * -30 - o * 40}px, 0) rotate(${(1 - p) * -1.5 + 0.6}deg)`,
        background: PAPER,
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 3,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", left: pad, right: pad, top: 20, display: "flex", justifyContent: "space-between", ...note(19, INK_SOFT), whiteSpace: "nowrap" }}>
        <span>{SHANNON_PAPER.journal}</span>
        <span style={{ color: ACCENT_INK, fontWeight: 650, opacity: ease(frame, at + 10, 10) }}>{SHANNON_PAPER.date}</span>
      </div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 52, height: 1.5, background: INK }} />
      <Ink at={at + 4} dur={20} style={{ left: pad, top: 70, width: width - 2 * pad }}>
        <div style={{ ...headline(32), lineHeight: 1.12 }}>
          <Mark at={markAt}>{SHANNON_PAPER.title}</Mark>
        </div>
      </Ink>
      <Ink at={at + 14} dur={14} style={{ left: pad, top: 168, whiteSpace: "nowrap" }}>
        <div style={label(21, INK)}>{SHANNON_PAPER.author}</div>
      </Ink>
      {Array.from({ length: lines }, (_, i) => {
        const w = ease(frame, at + 20 + i * 6, 12);
        const full = i === lines - 1 ? 0.5 : 0.88 + ((i * 37) % 10) / 100;
        // The passage the narration points into: two lines, lit in turn.
        const lit = i === 3 || i === 4 ? ease(frame, lineAt + (i - 3) * 8, 14) : 0;
        return (
          <React.Fragment key={i}>
            {lit > 0 ? (
              <div style={{ position: "absolute", left: pad - 6, top: 222 + i * 30 - 8, width: ((width - 2 * pad) * full + 12) * lit, height: 22, borderRadius: 4, background: HIGHLIGHT }} />
            ) : null}
            <div style={{ position: "absolute", left: pad, top: 222 + i * 30, width: (width - 2 * pad) * full * w, height: 6, borderRadius: 3, background: SOFT }} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Part I's first seven section titles, as the 1948 paper prints them. */
const PART_ONE = [
  "The Discrete Noiseless Channel",
  "The Discrete Source of Information",
  "The Series of Approximations to English",
  "Graphical Representation of a Markoff Process",
  "Ergodic and Mixed Sources",
  "Choice, Uncertainty and Entropy",
  "The Entropy of an Information Source",
];
/** The section the next-word model sits in. */
const TUCKED = 2;

/** The paper's contents, beside its first page: what "founded information
 *  theory" covered, with entropy marked on the phrase, and then the one
 *  section the narration says the next-word idea is tucked inside. */
const ContentsPage: React.FC<{ x: number; top: number; width: number; height: number; at: number; markAt: number; tuckAt: number; out: number }> = ({
  x,
  top,
  width,
  height,
  at,
  markAt,
  tuckAt,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const pad = 30;
  const tuck = ease(frame, tuckAt, 14);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        opacity: p * (1 - o),
        transform: `translate(${(1 - p) * 30 + o * 30}px, 0) rotate(${(1 - p) * 1.2 - 0.4}deg)`,
        background: PAPER,
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 3,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", left: pad, right: pad, top: 20, display: "flex", justifyContent: "space-between", ...note(19, INK_SOFT), whiteSpace: "nowrap" }}>
        <span>Contents</span>
        <span style={{ color: ACCENT_INK, fontWeight: 650, opacity: ease(frame, at + 8, 10) }}>Part I: Discrete Noiseless Systems</span>
      </div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 52, height: 1.5, background: INK }} />
      {PART_ONE.map((t, i) => {
        const isTucked = i === TUCKED;
        const lineTop = 78 + i * 56;
        return (
          <React.Fragment key={t}>
            {isTucked && tuck > 0 ? (
              <div style={{ position: "absolute", left: pad - 10, top: lineTop - 6, width: (width - 2 * pad + 20) * tuck, height: 46, borderRadius: 6, background: HIGHLIGHT }} />
            ) : null}
            <Ink at={at + 8 + i * 5} dur={12} style={{ left: pad, top: lineTop, right: pad, whiteSpace: "nowrap", opacity: isTucked ? 1 : 1 - tuck * 0.55 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "baseline", ...note(26, INK), fontWeight: isTucked && tuck > 0.5 ? 600 : 400 }}>
                <span style={{ ...TABULAR, color: INK_SOFT, width: 22, textAlign: "right" }}>{i + 1}.</span>
                <span>{i === 5 ? <>Choice, Uncertainty and <Mark at={markAt}>Entropy</Mark></> : t}</span>
              </div>
            </Ink>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** One word of the course's fifteen-word text, as a monospace chip. */
const WordChip: React.FC<{ x: number; y: number; w: number; text: string; at: number; tone?: string; toneAt?: number; lift?: number }> = ({
  x,
  y,
  w,
  text,
  at,
  tone,
  toneAt,
  lift = 0,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const t = tone && toneAt !== undefined ? ease(frame, toneAt, 10) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 24 - lift,
        width: w,
        height: 48,
        boxSizing: "border-box",
        border: `2px solid ${t > 0 ? tone : HAIRLINE}`,
        borderRadius: 8,
        background: PAPER,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 26,
        color: INK,
      }}
    >
      {t > 0 ? <div style={{ position: "absolute", inset: 0, background: tone, opacity: 0.16 * t, borderRadius: 6 }} /> : null}
      <span style={{ position: "relative" }}>{text}</span>
    </div>
  );
};

/**
 * Part 2, 1948: Shannon's paper, and inside it the next-word model. He made
 * text with it by hand, from a book opened at random: his own sample builds
 * word by word (Fig. 4) as the narration describes the method, and the first
 * ten words are read aloud. Then the course's tiny version (Fig. 5): its
 * fifteen-word text, the words that follow "the" tallied, and the guess.
 */
export const ShannonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("shannon").from;
  const theoryAt = n.word("shannon", "information theory");
  const guessAt = n.word("guess", "guess the next word");
  const tuckedAt = n.word("guess", "Tucked inside");
  const beforeAt = n.word("guess", "the one before");
  const howOftenAt = n.word("guess", "how often");
  const followsAt = n.word("guess", "follows another");
  const bookFrom = n.beat("book").from;
  const handAt = n.word("book", "by hand");
  const openAt = n.word("book", "open a book");
  const findAt = n.word("book", "find the word");
  const copyAt = n.word("book", "copy");
  const repeatAt = n.word("book", "repeat");
  const cameAt = n.word("sample", "came out");
  const headAt = n.word("sample", "head");
  const writerAt = n.word("sample", "writer");
  const englishAt = n.word("sample", "like English");
  const nothingAt = n.word("sample", "says nothing");
  const demoAt = n.word("demo", "tiny version");
  const afterAt = n.word("demo", "after the word");
  const catAt = n.word("demo", "cat comes");
  const dogAt = n.word("demo", "dog twice");
  const guessesAt = n.word("demo", "guesses cat");
  const ngramAt = n.word("ngram", "n-gram model");
  const todayAt = n.word("ngram", "Today's language models");
  const countsAt = n.word("ngram", "far more than counts");
  const butAt = n.word("shannon-out", "But");
  const conversationAt = n.word("shannon-out", "conversation");

  // ── Part A: the paper, then the book and the sample ──
  const SX = 640;
  const STOP = y(400);
  const SW = 1170;
  const sampleOut = demoAt - 6;
  // Words 1 and 2 on "guess"; 3 to 10 one per step of the method; the rest
  // typed out once the sample is introduced.
  const steps = [openAt + 6, findAt, copyAt, lerp(copyAt, repeatAt, 0.5), repeatAt, repeatAt + 8, repeatAt + 16, repeatAt + 24];
  const wordAt = (i: number) => {
    if (i === 0) return guessAt - 2;
    if (i === 1) return howOftenAt;
    if (i < 10) return steps[i - 2];
    return cameAt + 2 + (i - 10) * 2;
  };
  const SHOWN = 22;
  /** JetBrains Mono's advance at the sample's 34px. */
  const CHAR = 34 * 0.6;
  const read = SHANNON_SAMPLE.slice(0, 10).join(" ");
  // Word centres in the monospace line (the first ten words fit on one).
  const starts = SHANNON_SAMPLE.slice(0, 10).map((_, i) => SHANNON_SAMPLE.slice(0, i).join(" ").length + (i ? 1 : 0));
  const centre = (i: number) => (starts[i] + SHANNON_SAMPLE[i].length / 2) * CHAR;
  const hookAt = (k: number) => (k === 1 ? followsAt - 2 : steps[k - 2]);
  const hooks = Array.from({ length: 9 }, (_, j) => {
    const k = j + 1;
    return { x0: centre(k - 1), x1: centre(k), at: hookAt(k), out: k < 9 ? hookAt(k + 1) - 2 : cameAt };
  });
  const rest = SHANNON_SAMPLE.slice(10, SHOWN);

  // ── Part B: the course's next-word counts ──
  const text = BIGRAM.text;
  const CH = 15.6;
  const widths = text.map((w) => Math.round(w.length * CH + 30));
  const GAP = 12;
  const rowW = widths.reduce((s, w) => s + w, 0) + GAP * (text.length - 1);
  const RX = Math.round((1920 - rowW) / 2);
  const ROWY = y(440);
  const xs = widths.map((_, i) => RX + widths.slice(0, i).reduce((s, w) => s + w + GAP, 0));
  const theIdx = text.map((w, i) => (w === "the" && i < text.length - 1 ? i : -1)).filter((i) => i >= 0);
  const COLOR: Record<string, string> = { cat: DATA, dog: ds("purple", 500) };
  const INK_OF: Record<string, string> = { cat: DATA_INK, dog: ds("purple", 500) };
  const after = BIGRAM.following.the;
  const tallyOrder = Object.keys(after).sort((a, b) => after[b] - after[a]);
  const TALLY_X = 440;
  const TALLY_Y = y(580);
  const UNIT = 70;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-whoosh" at={from - 4} level={-34} />
      <Sfx name="el-pop" at={handAt - 4} level={-30} />
      <Sfx name="el-pencil" at={followsAt - 2} level={-35} />
      {steps.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s} level={-31} />
      ))}
      <Sfx name="el-sprinkle" at={cameAt + 2} level={-33} />
      <Sfx name="el-whoosh" at={demoAt - 4} level={-34} />
      {theIdx.map((i, k) => (
        <Sfx key={i} name="el-tap" at={afterAt + 4 + k * 5} level={-30} />
      ))}
      <Sfx name="el-pencil" at={guessesAt} level={-34} />
      <Sfx name="el-tap" at={ngramAt} level={-29} />

      <Kicker at={from - 6}>1948: Claude Shannon</Kicker>
      <Headline at={from + 2} lead="The paper that founded" turn="information theory." turnAt={from + 12} out={guessAt - 8} />
      <Headline at={guessAt - 2} lead="Guess the next word" turn="from the one before." turnAt={beforeAt - 2} out={ngramAt - 6} />
      <Headline at={ngramAt - 2} lead="Count what follows:" turn="an n-gram model." turnAt={ngramAt + 6} out={butAt - 6} />
      <Headline at={butAt - 2} lead="Could it ever" turn="hold a conversation?" turnAt={conversationAt - 8} />

      {/* ── The paper, then the book ── */}
      <PaperPage x={96} top={y(330)} width={470} height={500} at={from - 4} markAt={theoryAt - 2} lineAt={tuckedAt} out={bookFrom - 2} />
      <Spot id="book" at={handAt - 4} out={sampleOut} left={110} top={y(430)} width={440} height={347} />
      {/* Its contents, on the right until the sample takes the space. */}
      <ContentsPage x={SX} top={y(330)} width={820} height={500} at={from} markAt={theoryAt + 10} tuckAt={tuckedAt - 2} out={guessAt - 12} />

      {/* ── Fig. 4, Shannon's sample, word by word ── */}
      <FigLabel n="4" title="Shannon's sample, one word at a time, 1948" at={guessAt - 6} x={SX} y={y(290)} out={sampleOut} />
      <div
        style={{
          position: "absolute",
          left: SX,
          top: STOP,
          width: SW,
          opacity: 1 - ease(frame, sampleOut, 10),
          fontFamily: MONO,
          fontSize: 34,
          lineHeight: 1.75,
          color: INK,
        }}
      >
        <span style={{ position: "relative" }}>
          <Mark at={headAt - 4} out={nothingAt}>
            {read.split(" ").map((w, i) => (
              <span key={i} style={{ opacity: ease(frame, wordAt(i), 6), color: frame < wordAt(i) + 12 && i < 10 ? ACCENT_INK : INK }}>
                {w}{" "}
              </span>
            ))}
          </Mark>{" "}
          {rest.map((w, j) => (
            <span key={j} style={{ opacity: ease(frame, wordAt(10 + j), 6), color: INK_SOFT }}>
              {w}{" "}
            </span>
          ))}
          <span style={{ opacity: ease(frame, wordAt(SHOWN), 6), color: INK_SOFT }}>…</span>
        </span>
      </div>
      {/* Each step of the method: a hook from the last word copied to the one
          that followed it, replaced at the next step, gone once the rest arrives. */}
      {hooks.map((h, k) => (
        <Wire
          key={k}
          points={[
            [SX + h.x0, STOP + 50],
            [SX + h.x0, STOP + 70],
            [SX + h.x1, STOP + 70],
            [SX + h.x1, STOP + 48],
          ]}
          at={h.at}
          dur={12}
          out={h.out}
          color={ACCENT}
          width={2.4}
        />
      ))}
      <Ink at={englishAt - 2} out={sampleOut} style={{ left: SX, top: y(720), whiteSpace: "nowrap" }}>
        <div style={{ ...headline(42, true), color: INK }}>
          Reads like English, <span style={{ color: ACCENT_INK }}>says nothing.</span>
        </div>
      </Ink>
      <Ink at={writerAt + 6} out={sampleOut} style={{ left: SX, top: y(640), whiteSpace: "nowrap" }}>
        <div style={{ ...note(21, INK_SOFT) }}>Second-order word approximation, &ldquo;A Mathematical Theory of Communication&rdquo;, Part I</div>
      </Ink>

      {/* ── Fig. 5, the course's next-word counts, settling back on the turn ── */}
      <AbsoluteFill style={{ opacity: 1 - ease(frame, butAt - 2, 16) * 0.35 }}>
      <FigLabel n="5" title="The course's next-word counts" at={demoAt - 2} x={96} y={y(290)} />
      {text.map((w, i) => {
        const isThe = theIdx.includes(i);
        const isNext = theIdx.includes(i - 1);
        const k = isThe ? theIdx.indexOf(i) : isNext ? theIdx.indexOf(i - 1) : -1;
        return (
          <WordChip
            key={i}
            x={xs[i]}
            y={ROWY}
            w={widths[i]}
            text={w}
            at={demoAt + i * 2}
            tone={isThe ? ds("yellow", 500) : isNext ? COLOR[w] : undefined}
            toneAt={isThe || isNext ? afterAt + 4 + k * 5 : undefined}
            lift={isNext ? 4 * pulse(frame, afterAt + 6 + k * 5, 14) : 0}
          />
        );
      })}
      {/* Each "the" to the word after it. */}
      <Svg opacity={1}>
        {theIdx.map((i, k) => {
          const p = ease(frame, afterAt + 2 + k * 5, 10);
          if (p <= 0) return null;
          const x0 = xs[i] + widths[i] / 2;
          const x1 = xs[i + 1] + widths[i + 1] / 2;
          const top = ROWY - 24;
          const d = `M${x0},${top} C${x0},${top - 40} ${x1},${top - 40} ${x1},${top - 2}`;
          return <path key={i} d={d} fill="none" stroke={COLOR[text[i + 1]]} strokeWidth={2.4} pathLength={1} strokeDasharray={`${p} 1`} />;
        })}
      </Svg>

      {/* The tally after "the", and the guess. */}
      <Ink at={afterAt - 2} style={{ left: 96, top: TALLY_Y + 8, whiteSpace: "nowrap" }}>
        <div style={{ ...label(26, INK), display: "flex", alignItems: "center", gap: 14 }}>
          after <span style={{ fontFamily: MONO, fontWeight: 500, background: `color-mix(in srgb, ${ds("yellow", 500)} 30%, transparent)`, padding: "2px 10px", borderRadius: 6 }}>the</span>
        </div>
      </Ink>
      {tallyOrder.map((w, r) => {
        const at = w === "cat" ? catAt : dogAt;
        const grow = ease(frame, at - 2, 16);
        const top = TALLY_Y + r * 64;
        return (
          <React.Fragment key={w}>
            <Ink at={at - 4} style={{ left: TALLY_X - 140, top: top + 6, width: 110, textAlign: "right" }}>
              <span style={{ fontFamily: MONO, fontSize: 28, color: INK_OF[w] }}>{w}</span>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: TALLY_X,
                top: top + 8,
                width: after[w] * UNIT * grow,
                height: 34,
                background: COLOR[w],
                borderRadius: 4,
                opacity: grow > 0 ? 1 : 0,
              }}
            />
            <Ink at={at + 6} style={{ left: TALLY_X + after[w] * UNIT + 16, top: top + 6, whiteSpace: "nowrap" }}>
              <span style={{ ...note(28, INK), ...TABULAR, fontWeight: 650 }}>{after[w]}</span>
            </Ink>
          </React.Fragment>
        );
      })}
      <Ink at={guessesAt - 2} style={{ left: 900, top: TALLY_Y + 30, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, ...label(28, INK) }}>
          <InlineArrow at={guessesAt - 2} length={70} />
          guess:
          <span style={{ fontFamily: MONO, fontWeight: 500, color: DATA_INK, fontSize: 30 }}>{BIGRAM.guess.the}</span>
        </div>
      </Ink>
      <Tick x={1240} y={TALLY_Y + 52} at={guessesAt + 8} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: y(800), display: "flex", gap: "0.3em", ...headline(38, true), whiteSpace: "nowrap" }}>
        <Ink at={todayAt - 2} style={{ position: "relative" }}>
          Today&rsquo;s language models make the same guess,
        </Ink>
        <Ink at={countsAt - 2} style={{ position: "relative", color: ACCENT_INK }}>
          with far more than counts.
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
