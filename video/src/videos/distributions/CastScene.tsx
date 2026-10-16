import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BERNOULLI, BINOMIAL } from "./data";
import { Mini, type MiniKind } from "./Mini";
import {
  Arrow,
  ASK,
  askNote,
  Bracket,
  Centered,
  code,
  Count,
  DIST,
  Drift,
  Head,
  KBars,
  Kicker,
  lerp,
  pulse,
  Strike,
  Svg,
  Sweep,
  VRule,
} from "./parts";

/** The unit's cast, in the order the video meets them. */
const CAST: readonly { kind: MiniKind; name: string }[] = [
  { kind: "bernoulli", name: "Bernoulli" },
  { kind: "binomial", name: "Binomial" },
  { kind: "poisson", name: "Poisson" },
  { kind: "geometric", name: "Geometric" },
  { kind: "uniform", name: "Uniform" },
  { kind: "exponential", name: "Exponential" },
  { kind: "normal", name: "Normal" },
];
const SLOT_W = 190;
const SLOT_GAP = 40;
const SLOT_X0 = 175;
const SLOT_TOP = 470;
const SLOT_H = 150;
const slotX = (i: number) => SLOT_X0 + i * (SLOT_W + SLOT_GAP);
/** The binomial's silhouette, large, before it takes its place in the row. */
const SOLO = { x: 660, top: 330, w: 600, h: 330 };

/** The binomial figure: 0 to 20 yeses. */
const X: XScale = { lo: -0.5, hi: 20.5, x0: 740, x1: 1740 };
const BASE = 780;
const TALL = 360;
/** The Bernoulli figure. */
const NO_X = 270;
const YES_X = 480;
const BAR_W = 130;
const DOTS_Y = 372;

/**
 * Part 1 opens on Unit 3's bridge: one random variable summed up by a mean
 * and a spread, then the unit's seven named shapes. Then the smallest of
 * them, one visitor's yes or no, and two hundred of them counted: the
 * binomial, its likeliest count and its tail, and the assumption that
 * quietly fails.
 */
export const CastScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const meanAt = n.word("hook", "mean");
  const varianceAt = n.word("hook", "variance");
  const shapesAt = n.word("hook", "same few shapes");
  const namesAt = n.word("hook", "names");
  const startAt = n.word("bernoulli", "Start");
  const visitorAt = n.word("bernoulli", "One visitor");
  const signsAt = n.word("bernoulli", "signs up");
  const chanceAt = n.word("bernoulli", "chance");
  const threeAt = n.word("bernoulli", "point three");
  const yesNoAt = n.word("bernoulli", "One yes or no");
  const bernoulliAt = n.word("bernoulli", "Bernoulli");
  const hundredAt = n.word("binomial", "two hundred visitors");
  const inHundredAt = n.word("binomial", "three in a hundred");
  const countAt = n.word("binomial", "count the yeses");
  const yesesEnd = n.word("binomial", "yeses", { edge: "end" });
  const binomialAt = n.word("six", "binomial");
  const sixAt = n.word("six", "Six");
  const fallAt = n.word("six", "fall away");
  const tenAt = n.word("ten", "Ten or more");
  const eightAt = n.word("ten", "eight percent");
  const holdsAt = n.word("alone", "only holds");
  const aloneAt = n.word("alone", "decides alone");
  const sameAt = n.word("alone", "same chance");
  const crowdAt = n.word("alone", "crowd");
  const alikeAt = n.word("alone", "behaving alike");
  const widerAt = n.word("alone", "wider");
  const fixedAt = n.word("poisson-in", "fixed number");
  const rateAt = n.word("poisson-in", "rate");

  // ── The cast ──
  const solo = ease(frame, hookFrom - 6, 18);
  const settle = ease(frame, shapesAt - 8, 22);
  const castOut = ease(frame, startAt - 6, 14);
  const soloBox = {
    x: lerp(SOLO.x, slotX(1), settle),
    top: y(lerp(SOLO.top, SLOT_TOP, settle)),
    w: lerp(SOLO.w, SLOT_W, settle),
    h: h(lerp(SOLO.h, SLOT_H, settle)),
  };
  const soloStep = soloBox.w / 17;
  const soloMeanX = soloBox.x + (BINOMIAL.mean + 0.5) * soloStep;
  const soloSd = BINOMIAL.sd * soloStep;
  const soloMarks = ease(frame, meanAt - 4, 12) * (1 - ease(frame, shapesAt - 10, 8));

  // ── The binomial ──
  const unit = h(TALL) / Math.max(...BINOMIAL.pmf);
  const base = y(BASE);
  const barAt = (k: number) => lerp(hundredAt + 4, yesesEnd, k / 20);
  const askAt = (k: number) => tenAt - 2 + (k - BINOMIAL.atLeast) * 1.5;
  const sixX = sx(X, BINOMIAL.mode);
  const tailX0 = sx(X, BINOMIAL.atLeast) - 18;
  const tailX1 = sx(X, 17) + 18;
  const tailTop = base - BINOMIAL.pmf[BINOMIAL.atLeast] * unit - h(46);
  const bernoulliOut = holdsAt - 10;
  const dimBinomial = ease(frame, rateAt - 6, 14);

  // ── The Bernoulli ──
  const bUnit = h(420);
  const bBase = y(BASE);

  return (
    <AbsoluteFill>
      {/* ── Sound: the cast arriving, the binomial settling into its place,
           ten visitors, two bars, two hundred, the tail, the struck rule ── */}
      <Sfx name="el-pencil" at={meanAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={shapesAt - 8} level={-33} />
      <Sfx name="el-sprinkle" at={visitorAt - 2} level={-34} />
      <Sfx name="el-pop" at={chanceAt - 2} level={-30} />
      <Sfx name="el-sprinkle" at={hundredAt + 4} level={-34} />
      <Sfx name="el-tap" at={sixAt - 4} level={-28} />
      <Sfx name="el-pop" at={tenAt - 2} level={-30} />
      <Sfx name="el-scratch" at={crowdAt - 2} level={-30} />

      <Kicker at={hookFrom - 10}>Counting distributions</Kicker>

      {/* ── Headlines ── */}
      <Head parts={[{ text: "One variable, two numbers.", at: hookFrom - 6 }]} out={shapesAt - 10} />
      <Head
        parts={[
          { text: "The same few shapes,", at: shapesAt - 4 },
          { text: "with names.", at: namesAt - 6, italic: true },
        ]}
        out={startAt - 6}
      />
      <Head
        parts={[
          { text: "One yes or no:", at: yesNoAt - 6 },
          { text: "Bernoulli.", at: bernoulliAt - 6, italic: true },
        ]}
        out={countAt - 8}
      />
      <Head
        parts={[
          { text: "Count the yeses:", at: countAt - 4 },
          { text: "binomial.", at: binomialAt - 6, italic: true },
        ]}
      />

      {/* ── The cast: one variable's summary, then the seven shapes ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - castOut, transform: `translateY(${-castOut * 30}px)` }}>
        <Svg opacity={solo}>
          <Mini kind="binomial" x={soloBox.x} top={soloBox.top} w={soloBox.w} h={soloBox.h} p={ease(frame, hookFrom - 6, 26)} />
          {soloMarks > 0 ? (
            <g opacity={soloMarks}>
              <line
                x1={soloMeanX}
                x2={soloMeanX}
                y1={soloBox.top + soloBox.h}
                y2={soloBox.top - h(30)}
                stroke={INK}
                strokeWidth={2.4}
                strokeDasharray="7 6"
              />
              <path
                d={`M${soloMeanX - soloSd},${soloBox.top + soloBox.h + h(40)} l0,-10 L${soloMeanX + soloSd},${soloBox.top + soloBox.h + h(30)} l0,10`}
                fill="none"
                stroke={INK}
                strokeWidth={2.2}
                opacity={ease(frame, varianceAt - 4, 12)}
              />
            </g>
          ) : null}
        </Svg>
        <Centered x={soloMeanX} y={soloBox.top - h(30) - 34} opacity={soloMarks}>
          <span style={{ ...note(23, INK), fontWeight: 650 }}>a mean</span>
        </Centered>
        <Centered x={soloMeanX} y={soloBox.top + soloBox.h + h(52)} opacity={soloMarks * ease(frame, varianceAt - 4, 12)}>
          <span style={{ ...note(23, INK), fontWeight: 650 }}>a variance, its spread</span>
        </Centered>

        {/* The row: counts, then measurements. */}
        {[
          { text: "Counts", from: 0, to: 3, at: shapesAt },
          { text: "Measurements", from: 4, to: 6, at: shapesAt + 10 },
        ].map((g) => (
          <React.Fragment key={g.text}>
            <Ink at={g.at} dur={14} style={{ left: slotX(g.from), top: y(SLOT_TOP - 66), whiteSpace: "nowrap" }}>
              <span style={label(22, INK_SOFT)}>{g.text}</span>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: slotX(g.from),
                top: y(SLOT_TOP - 30),
                width: (slotX(g.to) + SLOT_W - slotX(g.from)) * ease(frame, g.at + 2, 18),
                height: 1,
                background: HAIRLINE,
              }}
            />
          </React.Fragment>
        ))}
        <Svg>
          {CAST.map((c, i) =>
            i === 1 ? null : (
              <Mini
                key={c.kind}
                kind={c.kind}
                x={slotX(i)}
                top={y(SLOT_TOP)}
                w={SLOT_W}
                h={h(SLOT_H)}
                p={ease(frame, shapesAt - 2 + i * 4, 16)}
              />
            ),
          )}
        </Svg>
        {CAST.map((c, i) => (
          <Ink key={c.name} at={namesAt - 4 + i * 3} dur={12} style={{ left: slotX(i), top: y(SLOT_TOP + SLOT_H + 22), whiteSpace: "nowrap" }}>
            <span style={{ ...body(32, true), color: INK }}>{c.name}</span>
          </Ink>
        ))}
      </div>

      <Drift from={startAt} to={n.beat("poisson-in").to + 30}>
        {/* ── Fig. 1: one visitor, then ten ── */}
        <FigLabel n="1" title="One visitor, yes or no" at={visitorAt - 6} x={160} y={y(300)} out={bernoulliOut} />
        <Svg opacity={1 - ease(frame, bernoulliOut, 12)}>
          {BERNOULLI.sample.map((s, i) => {
            const a = ease(frame, visitorAt + i * 1.6, 8);
            if (a <= 0) return null;
            const red = s === 1 ? ease(frame, signsAt - 2 + i, 8) : 0;
            return (
              <circle
                key={i}
                cx={182 + i * 40}
                cy={y(DOTS_Y)}
                r={12 * a}
                fill={red > 0 ? `color-mix(in srgb, ${ASK} ${red * 100}%, ${PAPER})` : PAPER}
                stroke={red > 0.5 ? ASK : INK_SOFT}
                strokeWidth={2.2}
              />
            );
          })}
        </Svg>
        <Note at={signsAt + 6} x={160} y={y(DOTS_Y + 24)} out={bernoulliOut}>
          <span style={note(20, INK_SOFT)}>ten simulated visitors: the red ones signed up</span>
        </Note>
        <Svg opacity={1 - ease(frame, bernoulliOut, 12)}>
          {[NO_X, YES_X].map((x, i) => {
            const g = ease(frame, chanceAt - 2 + i * 6, 16);
            if (g <= 0) return null;
            const v = BERNOULLI.pmf[i] * bUnit * g;
            const red = i === 1 ? ease(frame, threeAt - 4, 10) : 0;
            return (
              <rect
                key={x}
                x={x - BAR_W / 2}
                y={bBase - v}
                width={BAR_W}
                height={v}
                fill={red > 0 ? `color-mix(in srgb, ${ASK} ${red * 100}%, ${DIST})` : DIST}
                rx={2}
              />
            );
          })}
          <line x1={NO_X - 100} x2={YES_X + 100} y1={bBase + 0.5} y2={bBase + 0.5} stroke={INK} strokeWidth={1.6} opacity={ease(frame, chanceAt - 4, 12)} />
        </Svg>
        {[
          { x: NO_X, word: "no", v: BERNOULLI.pmf[0], at: chanceAt + 4 },
          { x: YES_X, word: "yes", v: BERNOULLI.pmf[1], at: threeAt },
        ].map((b) => (
          <React.Fragment key={b.word}>
            <Centered x={b.x} y={bBase + 12} opacity={ease(frame, chanceAt, 12) * (1 - ease(frame, bernoulliOut, 12))}>
              <span style={label(22, INK)}>{b.word}</span>
            </Centered>
            <Centered x={b.x} y={bBase - b.v * bUnit - 38} opacity={ease(frame, b.at, 10) * (1 - ease(frame, bernoulliOut, 12))}>
              <span style={b.word === "yes" ? askNote(24) : { ...note(24, INK), fontWeight: 650 }}>{fmt(b.v, 1)}</span>
            </Centered>
          </React.Fragment>
        ))}

        {/* ── The binomial's rules, once the Bernoulli has made way ── */}
        <Ink at={holdsAt - 4} dur={14} style={{ left: 160, top: y(330), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The binomial assumes</span>
        </Ink>
        {[
          { text: "a fixed number of visitors", at: holdsAt + 2 },
          { text: "each decides alone", at: aloneAt - 4, strike: crowdAt - 2 },
          { text: "the same chance for each", at: sameAt - 4 },
          { text: "just yes or no", at: sameAt + 10 },
        ].map((r, i) => (
          <Ink key={r.text} at={r.at} dur={14} style={{ left: 160, top: y(390 + i * 66), whiteSpace: "nowrap" }}>
            <span style={{ ...body(32), color: INK }}>
              {i === 0 ? (
                <Sweep at={fixedAt - 4}>{r.text}</Sweep>
              ) : r.strike !== undefined ? (
                <Strike at={r.strike}>{r.text}</Strike>
              ) : (
                r.text
              )}
            </span>
          </Ink>
        ))}
        <Note at={crowdAt + 4} x={160} y={y(390 + 4 * 66 + 10)}>
          <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>A crowd from one TV ad</span>
        </Note>
        <Note at={alikeAt} x={160} y={y(390 + 4 * 66 + 46)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>all behaving alike</span>
        </Note>

        {/* ── Fig. 2: two hundred visitors ── */}
        <FigLabel n="2" title={`Yeses among ${BINOMIAL.n} visitors, each with a chance of ${BINOMIAL.p}`} at={hundredAt - 4} x={740} y={y(300)} />
        <Note at={inHundredAt} x={1740} y={y(346)} align="right">
          <span style={{ ...code(21, INK_SOFT) }}>
            binom({BINOMIAL.n}, {BINOMIAL.p})
          </span>
        </Note>
        <Axis scale={X} base={base} ticks={[0, 5, 10, 15, 20]} at={hundredAt} opacity={1 - dimBinomial * 0.5} />
        <KBars
          ks={BINOMIAL.k}
          values={BINOMIAL.pmf}
          scale={X}
          base={base}
          unit={unit}
          opacity={1 - dimBinomial * 0.5}
          grow={(i) => ease(frame, barAt(i), 10)}
          fill={(i) => {
            const k = BINOMIAL.k[i];
            if (k >= BINOMIAL.atLeast) {
              const r = ease(frame, askAt(k), 10);
              if (r > 0) return `color-mix(in srgb, ${ASK} ${r * 100}%, ${DIST})`;
            }
            const wave = pulse(frame, fallAt - 2 + Math.abs(k - BINOMIAL.mode) * 2.2, 14);
            return wave > 0 ? `color-mix(in srgb, ${DIST} ${100 - wave * 55}%, ${PAPER})` : DIST;
          }}
        />
        <VRule x={sixX} bottom={base} top={base - h(TALL + 34)} at={sixAt - 4} opacity={1 - dimBinomial * 0.5} />
        <Note at={sixAt} x={sixX + 14} y={base - h(TALL + 40)} dim={tenAt}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{BINOMIAL.mode}, the likeliest</span>
        </Note>
        <Bracket x0={tailX0} x1={tailX1} y={tailTop} at={tenAt + 2} color={ASK} />
        <Note at={tenAt + 4} x={(tailX0 + tailX1) / 2 - 120} y={tailTop - h(86)}>
          <div style={{ ...askNote(26), whiteSpace: "nowrap" }}>
            {BINOMIAL.atLeast} or more: <Count at={eightAt - 6} dur={18} to={BINOMIAL.sfAtLeast * 100} suffix="%" />
          </div>
          <div style={{ ...code(20, INK_SOFT), marginTop: 6, opacity: ease(frame, eightAt + 6, 12) }}>.sf({BINOMIAL.atLeast - 1})</div>
        </Note>

        {/* Real counts swing wider than the binomial's spread. */}
        <Arrow from={[sixX - 8, base + h(64)]} to={[sx(X, 0.5), base + h(64)]} at={widerAt - 6} color={ASK} />
        <Arrow from={[sixX + 8, base + h(64)]} to={[sx(X, 11.5), base + h(64)]} at={widerAt - 6} color={ASK} />
        <Note at={widerAt} x={sx(X, 11.5) + 18} y={base + h(64) - 15}>
          <span style={{ ...askNote(22), whiteSpace: "nowrap" }}>real counts swing wider</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
