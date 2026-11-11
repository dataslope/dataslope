import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Illustration } from "../../components/Illustration";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { MathRun } from "../../editorial/math";
import { HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DIE, HATS, pct, VIDEO } from "./data";
import { Clear, DATA, DATA_LIGHT, DieFace, Drift, Frac, Mark, math, OK, OK_INK, Person, PERSON, pulse, Svg, V, X0 } from "./parts";

const BEAM = { x0: 170, pitch: 150, y: 540, face: 92 };
const SQ = { x0: 1150, pitch: 108, w: 72, base: 780, unit: 46 };
/** The row of painted people: `y` is where their feet stand, each is
 *  `person` tall, and the pitch leaves 35px between two neighbors' hats and
 *  about 20px between the match's ring and the next hat. */
const HATS_ROW = { x0: 150, pitch: 100, y: 636, person: 100 };
/** The painted hat (ds-probability-hat, 1287x1024): its crown (0.52 of its
 *  width) about as wide as the painted head under it, how far down it the
 *  baseline of its number sits, on the crown, and where it sits on the head:
 *  its lowest point, the front of the brim, `seat` of the way down the head,
 *  so the head shows under the brim. */
const HAT = { w: 68, h: Math.round((68 * 1024) / 1287), number: 23, seat: 0.38 } as const;
/** Where a person standing at `foot` has their head, and their hat's top
 *  once it has landed. */
const headTop = (foot: number) => foot - HATS_ROW.person * (1 - PERSON.head.top);
const headH = HATS_ROW.person * (PERSON.head.neck - PERSON.head.top);
const hatTop = (foot: number) => headTop(foot) + HAT.seat * headH - HAT.h;
/** The match's ring: an oval round the person and the hat on their head,
 *  9px clear of the hat's crown and of their feet. */
const RING = { rx: 46, pad: 9 } as const;
const HIST = { x0: 1160, pitch: 104, w: 76, base: 780, unit: 760 };
/** Who gets whose hat in the one shuffle drawn: person 5 gets their own. */
const SHUFFLE = [3, 7, 0, 9, 4, 1, 8, 2, 6, 5];

const E: React.FC<{ children: React.ReactNode }> = ({ children }) => <span>E[{children}]</span>;

/**
 * Questions 6 and 7. A fair die as six weights on a beam, balancing at 3.5
 * where no face is, and its squared distances averaging 35/12. Then
 * linearity: ten hats handed back at random, each person's chance one in
 * ten, so one match on average, and the video's own 100,000 shuffles agree.
 */
export const ExpectScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("expect").from;
  const qAt = n.word("expect", "Question");
  const textAt = n.word("expect", "Define expectation");
  const asked = n.beat("expect").to;
  const weightedAt = n.word("expect-mean", "probability-weighted average");
  const halfAt = n.word("expect-mean", "three and a half");
  const balanceAt = n.word("expect-mean", "the faces balance");
  const noFaceAt = n.word("expect-mean", "no face shows it");
  const squaredAt = n.word("expect-var", "expected squared distance");
  const quarterSixAt = n.word("expect-var", "six and a quarter");
  const quarterAt = n.word("expect-var", "a quarter for a three");
  const averagedAt = n.word("expect-var", "Averaged");
  const q7At = n.word("linear", "Question seven");
  const q7TextAt = n.word("linear", "What is linearity");
  const sumAt = n.word("linear", "The expectation of a sum");
  const evenWhenAt = n.word("linear", "even when the parts depend");
  const tenAt = n.word("linear-hats", "Ten people");
  const randomAt = n.word("linear-hats", "at random");
  const indicatorAt = n.word("linear-each", "an indicator");
  const ownAt = n.word("linear-each", "their own hat");
  const chanceAt = n.word("linear-each", "one in ten chance");
  const dependAt = n.word("linear-each", "depend on each other");
  const oneAt = n.word("linear-each", "exactly one does");
  const shufflesAt = n.word("linear-sim", "A hundred thousand shuffles");
  const varAt = n.word("linear-var", "Variance only adds up");
  const uncorrAt = n.word("linear-var", "uncorrelated");
  const nowAt = n.word("dist-in", "Now");
  const nameAt = n.word("dist-in", "asked to name");
  const end = n.beat("dist-in").to;

  const out6 = q7At - 4;
  const beamX = (v: number) => BEAM.x0 + (v - 1) * BEAM.pitch;
  const beamY = y(BEAM.y);
  const beamP = ease(frame, asked - 4, 16);
  const fulcrum = ease(frame, balanceAt - 2, 14);
  const gone6 = ease(frame, out6, 10);
  const row = ease(frame, tenAt - 4, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={weightedAt} level={-34} />
      <Sfx name="el-pop" at={halfAt + 2} level={-32} />
      <Sfx name="el-tap" at={quarterSixAt + 2} level={-34} />
      <Sfx name="el-tap" at={quarterAt + 2} level={-34} />
      <Sfx name="el-pop" at={averagedAt + 4} level={-32} />
      <Sfx name="el-pencil" at={sumAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={randomAt} level={-34} />
      <Sfx name="el-pop" at={oneAt + 2} level={-30} />
      <Sfx name="el-tap" at={shufflesAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out6} size={60}>
          Define expectation and variance.
        </QuestionCard>

        {/* ── Question 6: the die on a beam ── */}
        <Svg opacity={beamP * (1 - gone6)}>
          <line x1={beamX(1) - 70} x2={beamX(6) + 70} y1={beamY} y2={beamY} stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path
            d={`M${beamX(3.5)},${beamY + 4} L${beamX(3.5) - 34},${beamY + 4 + 56 * fulcrum} L${beamX(3.5) + 34},${beamY + 4 + 56 * fulcrum} Z`}
            fill={OK}
            opacity={fulcrum}
          />
          <circle cx={beamX(3.5)} cy={beamY - 24} r={10 + 6 * pulse(frame, noFaceAt, 22)} fill={HIGHLIGHT} opacity={ease(frame, noFaceAt - 2, 10)} />
        </Svg>
        {[1, 2, 3, 4, 5, 6].map((v, i) => (
          <DieFace
            key={v}
            value={v}
            x={beamX(v) - BEAM.face / 2}
            y={beamY - BEAM.face - 6}
            size={BEAM.face}
            at={asked + i * 3}
            opacity={1 - gone6}
          />
        ))}
        <Note at={weightedAt} x={X0} y={y(320)} out={out6}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>The probability-weighted average:</span>
          <MathRun style={{ ...math(40), marginLeft: 14 }}>
            <E>
              <V>X</V>
            </E>{" "}
            = Σ <V>x</V> P(<V>x</V>)
          </MathRun>
        </Note>
        <Note at={halfAt} x={beamX(3.5) - 120} width={240} y={beamY + 72} out={out6} from="up" style={{ textAlign: "center" }}>
          <MathRun style={{ ...math(40, OK_INK) }}>
            <E>
              <V>X</V>
            </E>{" "}
            = {DIE.mean}
          </MathRun>
        </Note>

        {/* The squared distances, and their average. */}
        <Svg opacity={1 - gone6}>
          {DIE.squares.map((s, i) => {
            const p = ease(frame, squaredAt + 4 + i * 2, 16);
            const lit = i === 0 || i === 5 ? pulse(frame, quarterSixAt, 24) : i === 2 || i === 3 ? pulse(frame, quarterAt, 24) : 0;
            const hh = h(s * SQ.unit) * p;
            const x = SQ.x0 + i * SQ.pitch;
            return (
              <g key={i}>
                <rect x={x - 4 * lit} y={y(SQ.base) - hh} width={SQ.w + 8 * lit} height={hh} rx={3} fill={lit > 0.05 ? DATA : DATA_LIGHT} />
              </g>
            );
          })}
          <line
            x1={SQ.x0 - 20}
            x2={SQ.x0 - 20 + (5 * SQ.pitch + SQ.w + 40) * ease(frame, averagedAt, 16)}
            y1={y(SQ.base) - h(DIE.varFloat * SQ.unit)}
            y2={y(SQ.base) - h(DIE.varFloat * SQ.unit)}
            stroke={OK}
            strokeWidth={3.5}
            strokeDasharray="10 7"
          />
          <line x1={SQ.x0 - 20} x2={SQ.x0 + 5 * SQ.pitch + SQ.w + 20} y1={y(SQ.base)} y2={y(SQ.base)} stroke={INK} strokeWidth={1.6} opacity={ease(frame, squaredAt, 12)} />
        </Svg>
        {DIE.squares.map((s, i) => (
          <React.Fragment key={i}>
            <Note at={squaredAt + 8 + i * 2} x={SQ.x0 + i * SQ.pitch} width={SQ.w} y={y(SQ.base) + 10} out={out6} from="up" style={{ textAlign: "center" }}>
              <span style={{ ...label(22, INK_SOFT), ...TABULAR }}>{i + 1}</span>
            </Note>
            {/* A bar whose top sits just under the variance line (2.25) takes
                its value inside, so the dashed line crosses no figure. */}
            <Note
              at={i === 0 || i === 5 ? quarterSixAt + 2 : i === 2 || i === 3 ? quarterAt + 2 : averagedAt - 6}
              x={SQ.x0 + i * SQ.pitch - 20}
              width={SQ.w + 40}
              y={y(SQ.base) - h(s * SQ.unit) + (s > 1 && s < DIE.varFloat ? 8 : -34)}
              out={out6}
              from="up"
              style={{ textAlign: "center" }}
            >
              <span style={{ ...label(21, INK), ...TABULAR }}>{fmt(s)}</span>
            </Note>
          </React.Fragment>
        ))}
        {/* The definition the bars compute, in both forms the page gives. */}
        <Ink at={squaredAt + 2} dur={22} out={out6} style={{ left: X0, top: y(760) }}>
          <MathRun style={math(36)}>
            Var(<V>X</V>) ={" "}
            <E>
              (<V>X</V> −{" "}
              <E>
                <V>X</V>
              </E>
              )²
            </E>{" "}
            ={" "}
            <E>
              <V>X</V>²
            </E>{" "}
            −{" "}
            <E>
              <V>X</V>
            </E>
            ²
          </MathRun>
        </Ink>
        <Note at={squaredAt} x={SQ.x0 - 20} y={y(360)} out={out6}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>squared distance from 3.5</span>
        </Note>
        <Note at={averagedAt + 6} x={SQ.x0 + 2 * SQ.pitch - 40} y={y(SQ.base) - h(DIE.varFloat * SQ.unit) - 64} out={out6}>
          <MathRun style={math(36, OK_INK)}>
            Var(<V>X</V>) = {DIE.var} ≈ {fmt(DIE.varFloat)}
          </MathRun>
        </Note>

        {/* ── Question 7: linearity, and ten hats, cleared on the bridge ── */}
        <Clear at={nameAt}>
          <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={60}>
            What is linearity of expectation, and why is it so useful?
          </QuestionCard>
          <Ink at={sumAt} dur={18} style={{ left: X0, top: y(320) }}>
            <MathRun style={math(54)}>
              <E>
                <V>X</V> + <V>Y</V>
              </E>{" "}
              ={" "}
              <E>
                <V>X</V>
              </E>{" "}
              +{" "}
              <E>
                <V>Y</V>
              </E>
            </MathRun>
          </Ink>
          <Note at={evenWhenAt} x={X0 + 640} y={y(334)}>
            <span style={{ ...note(28, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
              <Mark at={dependAt}>even when the parts depend on each other</Mark>
            </span>
          </Note>
          {/* Each person is an indicator: the count of matches is their sum. */}
          <Note at={indicatorAt} x={X0} y={y(418)}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
              Each person is an indicator: <span style={TABULAR}>1</span> if they get their own hat, <span style={TABULAR}>0</span> if not
            </span>
          </Note>

          <Svg opacity={row}>
            {SHUFFLE.map((hat, i) => {
              const x = HATS_ROW.x0 + i * HATS_ROW.pitch;
              const foot = y(HATS_ROW.y);
              const ring = hat === i ? ease(frame, ownAt, 12) : 0;
              const top = hatTop(foot) - RING.pad;
              const bottom = foot + RING.pad;
              return (
                <g key={i}>
                  {ring > 0 ? (
                    <ellipse cx={x} cy={(top + bottom) / 2} rx={RING.rx} ry={(bottom - top) / 2} fill="none" stroke={OK} strokeWidth={4} opacity={ring} />
                  ) : null}
                  {/* Clear of the match's ring, which reaches foot + 11. */}
                  <text x={x} y={foot + 40} textAnchor="middle" style={{ ...label(20, INK_SOFT), fontWeight: 500, fill: INK_SOFT }}>
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </Svg>
          {SHUFFLE.map((_, i) => (
            <Person
              key={i}
              x={HATS_ROW.x0 + i * HATS_ROW.pitch}
              y={y(HATS_ROW.y) - HATS_ROW.person / 2}
              height={HATS_ROW.person}
              opacity={row}
            />
          ))}
          {/* The hats, painted, dropping on "at random" onto the painted
              heads. Each carries its number on its crown, since the number is
              the evidence (who got whose hat): 21px ink in a paper halo, which
              reads on the red crown and leaves the hat a hat. The match's hat
              takes a green edge, inside the match's ring. */}
          {SHUFFLE.map((hat, i) => {
            const drop = ease(frame, randomAt + i * 2, 12);
            if (drop <= 0) return null;
            const x = HATS_ROW.x0 + i * HATS_ROW.pitch;
            const ring = hat === i ? ease(frame, ownAt, 12) : 0;
            const top = hatTop(y(HATS_ROW.y)) - (1 - drop) * 60;
            const edge = (d: number) => `drop-shadow(${d}px 0 0 ${OK}) drop-shadow(${-d}px 0 0 ${OK}) drop-shadow(0 ${d}px 0 ${OK}) drop-shadow(0 ${-d}px 0 ${OK})`;
            return (
              <React.Fragment key={i}>
                <Illustration
                  video={VIDEO}
                  id="ds-probability-hat"
                  style={{
                    position: "absolute",
                    left: x - HAT.w / 2,
                    top,
                    width: HAT.w,
                    height: HAT.h,
                    opacity: drop * row,
                    filter: ring > 0 ? edge(2.5 * ring) : undefined,
                  }}
                />
                <Svg opacity={drop * row}>
                  <text
                    x={x}
                    y={top + HAT.number}
                    textAnchor="middle"
                    stroke={PAPER}
                    strokeWidth={6}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    style={{ ...label(21, INK), fontWeight: 500, fill: INK, ...TABULAR }}
                  >
                    {hat + 1}
                  </text>
                </Svg>
              </React.Fragment>
            );
          })}
          {SHUFFLE.map((_, i) => (
            <Note key={i} at={chanceAt + i} x={HATS_ROW.x0 + i * HATS_ROW.pitch - 40} width={80} y={y(HATS_ROW.y) + 60} from="up" style={{ textAlign: "center" }}>
              <MathRun style={{ ...math(28, INK) }}>
                <Frac top="1" bottom="10" gap={2} />
              </MathRun>
            </Note>
          ))}
          <Note at={oneAt} x={X0} y={y(HATS_ROW.y + 152)}>
            <MathRun style={{ ...math(40, OK_INK) }}>
              <Mark at={nowAt + 2}>10 × 1/10 = 1 match, on average</Mark>
            </MathRun>
          </Note>

          {/* The video's own 100,000 shuffles. */}
          <Svg opacity={ease(frame, shufflesAt, 12)}>
            {HATS.share.map((s, k) => {
              const p = ease(frame, shufflesAt + 2 + k * 2, 14);
              const hh = h(s * HIST.unit) * p;
              return <rect key={k} x={HIST.x0 + k * HIST.pitch} y={y(HIST.base) - hh} width={HIST.w} height={hh} rx={3} fill={DATA} opacity={0.85} />;
            })}
            <line x1={HIST.x0 - 16} x2={HIST.x0 + 5 * HIST.pitch + HIST.w + 16} y1={y(HIST.base)} y2={y(HIST.base)} stroke={INK} strokeWidth={1.6} />
            <line
              x1={HIST.x0 + HATS.mean * HIST.pitch + HIST.w / 2}
              x2={HIST.x0 + HATS.mean * HIST.pitch + HIST.w / 2}
              y1={y(HIST.base) + 4}
              y2={y(HIST.base) - h(0.47 * HIST.unit) * ease(frame, shufflesAt + 14, 16)}
              stroke={OK}
              strokeWidth={3.5}
            />
          </Svg>
          {HATS.share.map((s, k) => (
            <React.Fragment key={k}>
              <Note at={shufflesAt + 4 + k * 2} x={HIST.x0 + k * HIST.pitch} width={HIST.w} y={y(HIST.base) + 10} from="up" style={{ textAlign: "center" }}>
                <span style={{ ...label(22, INK_SOFT), ...TABULAR }}>{k}</span>
              </Note>
              {s > 0.05 ? (
                <Note at={shufflesAt + 10 + k * 2} x={HIST.x0 + k * HIST.pitch - 20} width={HIST.w + 40} y={y(HIST.base) - h(s * HIST.unit) - 32} from="up" style={{ textAlign: "center" }}>
                  {/* The average's line stands at 0.997, through bar 1's label; the
                      paper behind the label carries the line under it. */}
                  <span style={{ ...label(20, INK), ...TABULAR, background: PAPER, padding: "0 4px" }}>{pct(s)}</span>
                </Note>
              ) : null}
            </React.Fragment>
          ))}
          <Note at={shufflesAt + 2} x={HIST.x0 - 16} y={y(HIST.base) + 46}>
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>matches in a shuffle</span>
          </Note>
          <Note at={shufflesAt + 18} x={HIST.x0 + HATS.mean * HIST.pitch + HIST.w / 2 + 14} y={y(HIST.base) - h(0.47 * HIST.unit) - 4}>
            <span style={{ ...label(23, OK_INK), ...TABULAR, whiteSpace: "nowrap" }}>average {HATS.mean}</span>
          </Note>

          <Note at={varAt} x={X0} y={y(HATS_ROW.y + 226)}>
            <MathRun style={{ ...math(32, INK) }}>
              Var(<V>X</V> + <V>Y</V>) = Var(<V>X</V>) + Var(<V>Y</V>)
            </MathRun>
            <span style={{ ...note(26, INK), fontWeight: 500, marginLeft: 16, whiteSpace: "nowrap" }}>
              only when <Mark at={uncorrAt}>uncorrelated</Mark>
            </span>
          </Note>
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
