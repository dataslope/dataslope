import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHURN, EXCL, pct } from "./data";
import { Clear, DATA, DATA_LIGHT, DieFace, Drift, Given, lerp, Mark, math, Svg, V, X0 } from "./parts";

const BARS = { top: 360, height: 420, w: 230, xs: [1010, 1370] };
const DISC = { y: 560, r: 150, xs: [300, 640] };
/** Question 5's column of formulas: where each starts, how wide a formula's
 *  column is (so the note after it lines up row to row), and the rows. */
const COL = { x: 1040, w: 470, prod: 330, zero: 400, two: 500, twoGiven: 565, far: 660, never: 716 };
/** Question 4's product line, under P(A | B) = P(A), behind "equivalently". */
const PROD4 = { y: 460, lead: 190 };

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <span>P({children})</span>;

/**
 * Questions 4 and 5. Independence drawn as area: the Statistics course's
 * thousand users split by plan, where independence would break both bars at
 * 15% and the data breaks them at 6% and 24%. Then mutually exclusive: a one
 * and a two can't share a roll, so learning one sends the other to zero.
 */
export const IndepScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("indep").from;
  const qAt = n.word("indep", "Question");
  const textAt = n.word("indep", "What does it mean");
  const knowAt = n.word("indep", "Knowing one");
  const ruleAt = n.word("indep", "the probability of A given B");
  const justAt = n.word("indep", "is just the probability of A");
  const splitAt = n.word("indep-bars", "Split a thousand users");
  const ifAt = n.word("indep-bars", "If churn didn't depend");
  const sameAt = n.word("indep-bars", "the same height");
  const theseAt = n.word("indep-bars", "These break at");
  const twentyFourAt = n.word("indep-bars", "twenty-four");
  const dependentAt = n.word("indep-bars", "are dependent");
  const claimAt = n.word("indep-claim", "a claim to justify");
  const visitsAt = n.word("indep-claim", "Repeat visits");
  const networkAt = n.word("indep-claim", "network effects");
  const q5At = n.word("excl", "Question five");
  const q5TextAt = n.word("excl", "How is that different");
  const cantAt = n.word("excl", "can't happen together");
  const zeroAt = n.word("excl", "the probability of both is zero");
  const oneAt = n.word("excl-die", "Roll a one");
  const twoAt = n.word("excl-die", "you didn't roll a two");
  const dropsAt = n.word("excl-die", "drops the second");
  const toZeroAt = n.word("excl-die", "to zero");
  const farAt = n.word("excl-die", "as far from independent");
  const neverAt = n.word("excl-never", "never independent");
  const clearAt = n.word("expect-in", "random variable");
  const end = n.beat("expect-in").to;

  const out4 = q5At - 4;

  // Each bar's churned share: drawn at the overall rate first, as
  // independence would have it, then moved to what the data says.
  const guess = ease(frame, ifAt + 6, 16);
  const actual = ease(frame, theseAt + 2, 20);
  const shares = [CHURN.pPaid, CHURN.pFree].map((s) => lerp(CHURN.pAll * guess, s, actual));
  const barTop = y(BARS.top);
  const barH = h(BARS.height);
  const splitY = (s: number) => barTop + s * barH;
  const barsIn = ease(frame, splitAt, 14);

  // The product form moves from under Question 4's definition to the top of
  // Question 5's column, so the two conditions end up one above the other.
  const move = ease(frame, q5At, 20);
  const quiet = ease(frame, toZeroAt, 14);

  const disjoint = ease(frame, cantAt, 16);
  const oneLit = ease(frame, oneAt, 12);
  const twoGone = ease(frame, twoAt + 4, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={ruleAt + 2} level={-34} />
      <Sfx name="el-pop" at={splitAt + 4} level={-32} />
      <Sfx name="slide" at={theseAt + 2} level={-30} />
      <Sfx name="el-tap" at={visitsAt} level={-34} />
      <Sfx name="el-tap" at={networkAt} level={-34} />
      <Sfx name="el-pop" at={cantAt + 4} level={-32} />
      <Sfx name="pip-1" at={oneAt + 2} level={-30} />
      {/* The scratch goes with the cross through the two, the one mark that is a strike. */}
      <Sfx name="el-scratch" at={twoAt + 6} level={-32} />
      <Sfx name="el-pencil" at={justAt + 8} level={-36} />
      <Sfx name="el-tap" at={neverAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={out4} size={60}>
          What does it mean for two events to be independent?
        </QuestionCard>

        {/* ── Question 4 ── */}
        <Note at={knowAt} x={X0} y={y(320)} out={out4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>Knowing one tells you nothing about the other.</span>
        </Note>
        <Ink at={ruleAt} dur={18} out={out4} style={{ left: X0, top: y(390) }}>
          <span style={math(58)}>
            <P>
              <V>A</V>
              <Given />
              <V>B</V>
            </P>{" "}
            ={" "}
            <P>
              <V>A</V>
            </P>
          </span>
        </Ink>
        {/* Equivalently, the product rule: it stays on into Question 5. */}
        <Ink
          at={justAt + 6}
          dur={20}
          out={clearAt}
          style={{
            left: lerp(X0, COL.x - PROD4.lead, move),
            top: lerp(y(PROD4.y), y(COL.prod), move),
            display: "flex",
            alignItems: "baseline",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ ...note(26, INK_SOFT), display: "inline-block", width: PROD4.lead, opacity: 1 - move }}>equivalently</span>
          <span style={{ ...math(46), display: "inline-block", width: COL.w }}>
            <P>
              <V>A</V> and <V>B</V>
            </P>{" "}
            ={" "}
            <P>
              <V>A</V>
            </P>{" "}
            <P>
              <V>B</V>
            </P>
          </span>
          <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, q5At + 14, 12) }}>independent</span>
        </Ink>
        <Note at={claimAt} x={X0} y={y(540)} out={out4}>
          <span style={{ ...note(30, INK), fontWeight: 600, whiteSpace: "nowrap" }}>A claim to justify. These break it:</span>
        </Note>
        <Note at={visitsAt} x={X0 + 24} y={y(600)} out={out4}>
          <span style={{ ...note(28, ACCENT_INK), whiteSpace: "nowrap" }}>repeat visits by the same user</span>
        </Note>
        <Note at={networkAt} x={X0 + 24} y={y(650)} out={out4}>
          <span style={{ ...note(28, ACCENT_INK), whiteSpace: "nowrap" }}>network effects</span>
        </Note>

        {/* A thousand users, split by plan, as area. */}
        <Svg opacity={barsIn * (1 - ease(frame, out4, 10))}>
          {BARS.xs.map((x, i) => (
            <g key={x}>
              <rect x={x} y={barTop} width={BARS.w} height={barH} fill={DATA_LIGHT} />
              <rect x={x} y={barTop} width={BARS.w} height={Math.max(0, splitY(shares[i]) - barTop)} fill={DATA} />
              <rect x={x} y={barTop} width={BARS.w} height={barH} fill="none" stroke={INK} strokeWidth={1.5} />
            </g>
          ))}
          {/* Where independence would break them. */}
          <line
            x1={BARS.xs[0] - 30}
            x2={lerp(BARS.xs[0] - 30, BARS.xs[1] + BARS.w + 30, ease(frame, sameAt, 16))}
            y1={splitY(CHURN.pAll)}
            y2={splitY(CHURN.pAll)}
            stroke={INK}
            strokeWidth={2.4}
            strokeDasharray="9 7"
            opacity={guess}
          />
          {/* The step between them is the association. */}
          <line
            x1={BARS.xs[0] + BARS.w}
            x2={BARS.xs[1]}
            y1={splitY(shares[0])}
            y2={splitY(shares[1])}
            stroke={HIGHLIGHT}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={ease(frame, dependentAt - 2, 12)}
          />
        </Svg>
        {BARS.xs.map((x, i) => (
          <Note key={x} at={splitAt + 6 + i * 3} x={x} width={BARS.w} y={barTop + barH + 14} out={out4} from="up" style={{ textAlign: "center" }}>
            <span style={{ ...label(24, INK) }}>{i === 0 ? "paid" : "free"}</span>
          </Note>
        ))}
        <Note at={splitAt + 12} x={BARS.xs[1] + BARS.w + 20} y={barTop + 4} out={out4}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ color: DATA }}>■</span> churned
          </span>
        </Note>
        {/* The reference the argument rests on keeps its name while the bars move off it. */}
        <Note at={sameAt + 6} x={BARS.xs[0] - 30} y={splitY(CHURN.pAll) - 2} align="right" out={out4}>
          <span style={{ ...label(24, INK), whiteSpace: "nowrap", paddingRight: 10 }}>
            <span style={TABULAR}>{pct(CHURN.pAll)}</span> if independent
          </span>
        </Note>
        {[CHURN.pPaid, CHURN.pFree].map((s, i) => (
          <Note
            key={i}
            at={i === 0 ? theseAt + 8 : twentyFourAt}
            x={i === 0 ? BARS.xs[0] - 12 : BARS.xs[1] + BARS.w + 14}
            align={i === 0 ? "right" : "left"}
            y={splitY(s) - 16}
            out={out4}
          >
            <span style={{ ...label(26, INK), ...TABULAR, whiteSpace: "nowrap" }}>{pct(s)}</span>
          </Note>
        ))}

        {/* ── Question 5: can't happen together, cleared on the bridge ── */}
        <Clear at={clearAt}>
          <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={60}>
            How is that different from mutually exclusive?
          </QuestionCard>
          <Svg opacity={ease(frame, cantAt - 6, 14)}>
            {DISC.xs.map((x, i) => {
              // The discs start overlapping and move apart as "can't happen together" is said.
              const cx = lerp((DISC.xs[0] + DISC.xs[1]) / 2 + (i === 0 ? -90 : 90), x, disjoint);
              const lit = i === 0 ? oneLit : 0;
              return (
                <circle
                  key={x}
                  cx={cx}
                  cy={y(DISC.y)}
                  r={DISC.r}
                  fill={`color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, color-mix(in srgb, ${DATA} 12%, ${PAPER}))`}
                  stroke={i === 1 ? `color-mix(in srgb, ${INK_SOFT} ${twoGone * 100}%, ${DATA})` : DATA}
                  strokeWidth={2.5}
                  opacity={i === 1 ? 1 - 0.55 * twoGone : 1}
                />
              );
            })}
          </Svg>
          {DISC.xs.map((x, i) => (
            <DieFace
              key={x}
              value={i + 1}
              x={x - 55}
              y={y(DISC.y) - 55}
              size={110}
              at={cantAt + 8 + i * 4}
              opacity={i === 1 ? 1 - 0.6 * twoGone : 1}
              ink={i === 1 && twoGone > 0.5 ? INK_SOFT : INK}
            />
          ))}
          {/* Mutually exclusive, directly under the product it never equals. */}
          <Note at={zeroAt} x={COL.x} y={y(COL.zero)} style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span style={{ ...math(46), display: "inline-block", width: COL.w }}>
              <P>
                <V>A</V> and <V>B</V>
              </P>{" "}
              = 0
            </span>
            <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, zeroAt + 10, 12) }}>mutually exclusive</span>
          </Note>
          {/* The die: P(two) stays 1/6; given a one, it is 0. Both are true. */}
          <Note at={dropsAt} x={COL.x} y={y(COL.two)} style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span style={{ ...math(42, `color-mix(in srgb, ${INK_SOFT} ${quiet * 100}%, ${INK})`), display: "inline-block", width: COL.w }}>
              <P>two</P> = {EXCL.pTwo}
            </span>
            <span style={{ ...note(24, INK_SOFT), opacity: quiet }}>out of all six faces</span>
          </Note>
          <Note at={toZeroAt - 2} x={COL.x} y={y(COL.twoGiven)} style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span style={{ ...math(42, INK), display: "inline-block", width: COL.w }}>
              <P>
                two
                <Given />
                one
              </P>{" "}
              = {EXCL.pTwoGivenOne}
            </span>
            <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, toZeroAt + 8, 12) }}>out of the one face left</span>
          </Note>
          <Note at={farAt} x={COL.x} y={y(COL.far)}>
            <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>as far from independent as it gets</span>
          </Note>
          <Note at={neverAt - 8} x={COL.x} y={y(COL.never)}>
            <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              <Mark at={neverAt}>exclusive, and each possible: never independent</Mark>
            </span>
          </Note>
          <Svg opacity={ease(frame, twoAt + 6, 10)}>
            <g stroke={ACCENT} strokeWidth={6} strokeLinecap="round">
              <line x1={DISC.xs[1] - 70} y1={y(DISC.y) - 70} x2={DISC.xs[1] + 70} y2={y(DISC.y) + 70} />
              <line x1={DISC.xs[1] + 70} y1={y(DISC.y) - 70} x2={DISC.xs[1] - 70} y2={y(DISC.y) + 70} />
            </g>
          </Svg>
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
