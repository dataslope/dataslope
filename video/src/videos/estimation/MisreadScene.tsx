import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, USERS } from "./data";
import { Bracket, DATA, EST, FADED, IntervalBar, Marked, Mu, pulse, Rule, Strike, Svg, XBar } from "./parts";

const LEFT = 160;
const QUOTE_W = 760;
/** The mini figures, right of the quotes. */
const NARROW: XScale = { lo: 40, hi: 60, x0: 1000, x1: 1760 };
const WIDE: XScale = { lo: 10, hi: 90, x0: 1000, x1: 1760 };
const ROWS = [170, 410, 650];

const JIT = jitter(61, USERS.n);
const money = (v: number) => `$${fmt(v)}`;

/**
 * Part 1's close: three misreadings, each struck through as the narration
 * answers it, beside a small figure of what is actually true, all on the
 * fifty users from the scene before.
 */
export const MisreadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const misreadFrom = n.beat("misread").from;
  const chanceAt = n.word("misread", "chance");
  const thisAt = n.word("misread", "this interval");
  const neverAt = n.word("fixed", "never");
  const movesAt = n.word("fixed", "moves");
  const drawnAt = n.word("fixed", "drawn");
  const randomAt = n.word("fixed", "random");
  const inAt = n.word("fixed", "in");
  const outAt = n.word("fixed", "out");
  const dataFrom = n.beat("data").from;
  const dataAt = n.word("data", "data");
  const backAt = n.word("data", "Back");
  const onlyAt = n.word("eleven", "Only");
  const elevenAt = n.word("eleven", "eleven");
  const averageAt = n.word("eleven", "average");
  const personAt = n.word("eleven", "person");
  const saferFrom = n.beat("safer").from;
  const isntAt = n.word("safer", "isn't");
  const preciseAt = n.word("safer", "precise");

  const quote = (at: number, strike: number, text: React.ReactNode, top: number) => (
    <Ink at={at} dur={20} style={{ left: LEFT, top: y(top), width: QUOTE_W }}>
      <span style={{ ...body(38, true), color: INK, lineHeight: 1.3 }}>
        <Strike at={strike} top="0.62em">
          {text}
        </Strike>
      </span>
    </Ink>
  );

  const inside = (v: number) => v >= USERS.lo && v <= USERS.hi;
  const sort = ease(frame, onlyAt - 2, 14);
  const muX = sx(NARROW, USERS.mu);

  return (
    <AbsoluteFill>
      {/* ── Sound: three strike-throughs, the eleven inside, the spread of the fifty ── */}
      <Sfx name="el-scratch" at={neverAt - 2} level={-30} />
      <Sfx name="el-tap" at={inAt - 2} level={-29} />
      <Sfx name="el-scratch" at={onlyAt - 2} level={-30} />
      <Sfx name="el-pencil" at={averageAt - 2} level={-34} />
      <Sfx name="el-scratch" at={isntAt - 2} level={-30} />

      {/* ── 1. "A 95% chance the true mean is in this interval" ── */}
      <Ink at={misreadFrom - 8} dur={12} style={{ left: LEFT, top: y(ROWS[0] - 40) }}>
        <span style={label(21, INK_SOFT)}>Misreading 1</span>
      </Ink>
      {quote(
        misreadFrom - 4,
        neverAt - 2,
        <>
          “There’s a 95%{" "}
          <Marked at={chanceAt - 2} color={HIGHLIGHT} out={neverAt}>
            chance
          </Marked>{" "}
          the true mean is in this interval.”
        </>,
        ROWS[0],
      )}
      <Note at={movesAt - 2} x={LEFT} y={y(ROWS[0] + 108)}>
        <span style={{ ...note(25, INK) }}>
          The true mean never moves. Once the interval is drawn,{" "}
          <span style={{ opacity: ease(frame, inAt - 2, 10) }}>it’s in</span>
          <span style={{ opacity: ease(frame, outAt - 2, 10) }}>, or it’s out.</span>
        </span>
      </Note>
      <Axis scale={NARROW} base={y(ROWS[0] + 130)} ticks={[40, 45, 50, 55, 60]} format={(v) => `$${v}`} at={misreadFrom} />
      <IntervalBar x0={sx(NARROW, USERS.lo)} x1={sx(NARROW, USERS.hi)} y={y(ROWS[0] + 70)} at={thisAt - 4} color={INK} width={4} tick={13} />
      <Svg>
        <circle cx={sx(NARROW, USERS.xBar)} cy={y(ROWS[0] + 70)} r={6.5 * ease(frame, thisAt, 10) * (1 + 0.4 * pulse(frame, drawnAt - 2, 16))} fill={EST} />
      </Svg>
      <Rule x={muX} y0={y(ROWS[0] + 130)} y1={y(ROWS[0] + 20)} at={neverAt} dur={16} color={INK} width={2.4} dash="7 6" />
      <Note at={movesAt} x={muX - 12} y={y(ROWS[0] + 2)} align="right" from="right">
        <span style={{ ...note(22, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>
          here <Mu /> is {money(USERS.mu)}: fixed
        </span>
      </Note>
      <Note at={randomAt - 2} x={sx(NARROW, USERS.hi) + 18} y={y(ROWS[0] + 56)}>
        <span style={{ ...note(22, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>nothing random left</span>
      </Note>
      <Note at={inAt - 2} x={muX + 12} y={y(ROWS[0] + 84)}>
        <span style={{ ...note(22, INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>in</span>
      </Note>

      <div style={{ position: "absolute", left: LEFT, right: 160, top: y(ROWS[1] - 50), height: 1, background: HAIRLINE, opacity: 0.6 * ease(frame, dataFrom - 6, 12) }} />

      {/* ── 2. "95% of the data falls inside" ── */}
      <Ink at={dataFrom - 6} dur={12} style={{ left: LEFT, top: y(ROWS[1] - 26) }}>
        <span style={label(21, INK_SOFT)}>Misreading 2</span>
      </Ink>
      {quote(dataFrom - 2, onlyAt - 2, <>“95% of the {<Marked at={dataAt - 2} color={HIGHLIGHT} out={onlyAt}>data</Marked>} falls inside.”</>, ROWS[1] + 6)}
      <Note at={elevenAt - 2} x={LEFT} y={y(ROWS[1] + 72)}>
        <span style={{ ...note(25, INK) }}>
          Only <b>{USERS.insideCi}</b> of the {USERS.n} users spend inside it.
        </span>
      </Note>
      <Note at={averageAt - 2} x={LEFT} y={y(ROWS[1] + 112)}>
        <span style={{ ...note(25, INK) }}>It pins down their average, not any one person.</span>
      </Note>
      <Axis scale={WIDE} base={y(ROWS[1] + 140)} ticks={[10, 30, 50, 70, 90]} format={(v) => `$${v}`} at={backAt - 6} />
      <Svg>
        <rect
          x={sx(WIDE, USERS.lo)}
          y={y(ROWS[1] + 52)}
          width={(sx(WIDE, USERS.hi) - sx(WIDE, USERS.lo)) * ease(frame, dataAt - 2, 12)}
          height={y(ROWS[1] + 128) - y(ROWS[1] + 52)}
          fill={HIGHLIGHT}
          opacity={0.6}
        />
        {USERS.values.map((v, j) => {
          const a = ease(frame, backAt - 4 + j * 0.3, 6);
          if (a <= 0) return null;
          const keep = inside(v);
          return (
            <circle
              key={j}
              cx={sx(WIDE, v)}
              cy={y(ROWS[1] + 90) + (JIT[j] - 0.5) * 50}
              r={(keep ? 5.5 + 1.5 * sort : 5.5) * a}
              fill={keep ? DATA : sort > 0 ? FADED : DATA}
              stroke={PAPER}
              strokeWidth={1}
              opacity={keep ? 1 : 1 - 0.25 * sort}
            />
          );
        })}
      </Svg>
      <IntervalBar x0={sx(WIDE, USERS.lo)} x1={sx(WIDE, USERS.hi)} y={y(ROWS[1] + 36)} at={dataAt - 4} color={INK} width={3.4} tick={10} />
      <Note at={elevenAt} x={sx(WIDE, USERS.hi) + 16} y={y(ROWS[1] + 20)}>
        <span style={{ ...note(22, INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          the interval: {USERS.insideCi} of {USERS.n} inside
        </span>
      </Note>
      <Bracket x0={sx(WIDE, USERS.twoSdLo)} x1={sx(WIDE, USERS.twoSdHi)} y={y(ROWS[1] + 186)} at={averageAt} color={DATA} up width={2.4} />
      <Note at={personAt - 4} x={(sx(WIDE, USERS.twoSdLo) + sx(WIDE, USERS.twoSdHi)) / 2} y={y(ROWS[1] + 194)} from="up">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          where the people are: <XBar /> ± 2s holds {USERS.insideTwoSd} of {USERS.n}
        </span>
      </Note>

      <div style={{ position: "absolute", left: LEFT, right: 160, top: y(ROWS[2] - 26), height: 1, background: HAIRLINE, opacity: 0.6 * ease(frame, saferFrom - 6, 12) }} />

      {/* ── 3. "A wider interval is safer" ── */}
      <Ink at={saferFrom - 6} dur={12} style={{ left: LEFT, top: y(ROWS[2] - 2) }}>
        <span style={label(21, INK_SOFT)}>Misreading 3</span>
      </Ink>
      {quote(saferFrom - 2, isntAt - 2, <>“A wider interval is safer.”</>, ROWS[2] + 30)}
      <Note at={preciseAt - 6} x={LEFT} y={y(ROWS[2] + 96)}>
        <span style={{ ...note(25, INK) }}>Wider just means less precise.</span>
      </Note>
      <Axis scale={NARROW} base={y(ROWS[2] + 140)} ticks={[40, 45, 50, 55, 60]} format={(v) => `$${v}`} at={saferFrom} />
      <IntervalBar x0={sx(NARROW, USERS.lo)} x1={sx(NARROW, USERS.hi)} y={y(ROWS[2] + 56)} at={saferFrom + 2} color={INK} width={3.4} tick={10} />
      <Note at={saferFrom + 6} x={sx(NARROW, USERS.lo) - 14} y={y(ROWS[2] + 56) - 14} align="right">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>95%</span>
      </Note>
      <IntervalBar x0={sx(NARROW, USERS.vagueLo)} x1={sx(NARROW, USERS.vagueHi)} y={y(ROWS[2] + 100)} at={isntAt} dur={20} color={EST} width={3.4} tick={10} />
      <Note at={isntAt + 6} x={sx(NARROW, USERS.vagueLo) - 14} y={y(ROWS[2] + 100) - 14} align="right">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>99.99%</span>
      </Note>
      <Note at={preciseAt - 2} x={sx(NARROW, USERS.vagueHi) + 14} y={y(ROWS[2] + 100) - 14}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          {money(USERS.vagueLo)} to {money(USERS.vagueHi)}
        </span>
      </Note>
    </AbsoluteFill>
  );
};
