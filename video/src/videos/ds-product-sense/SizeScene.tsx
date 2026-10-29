import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { IMPACT, MARKET, num, pct } from "./data";
import { at, Bracket, DATA, DATA_LIGHT, Drift, madeUp, Mark, OK, OK_INK, type Scale, Strike, Svg, X0 } from "./parts";

const CHAIN = { top: 380, w: 270, h: 150, gap: 76 };
const AXIS = { x1: 1700, y: 640 };

/** One factor of the estimate: its value large, what it assumes under it. */
const Factor: React.FC<{ x: number; top: number; w: number; at: number; out: number; value: string; text: string; result?: boolean }> = ({
  x,
  top,
  w,
  at: from,
  out,
  value,
  text,
  result = false,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: w,
        height: CHAIN.h,
        boxSizing: "border-box",
        border: `2.4px solid ${result ? OK_INK : INK}`,
        borderRadius: 14,
        background: result ? `color-mix(in srgb, ${OK} 10%, ${PAPER})` : PAPER,
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 16}px)`,
        padding: "18px 20px",
      }}
    >
      <div style={{ ...note(40, result ? OK_INK : INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ ...label(21, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

/**
 * Questions 10 and 11. The on-the-spot estimate as a chain of factors, each an
 * assumption said out loud, multiplying the made-up app's two million monthly
 * users down to about 500,000 searches a day, then sanity-checked: one search
 * a day for each user of the feature. Then a feature bounded before it is
 * built: 120,000 weekly users reach it, 1 to 3 in every 100 of them becoming
 * weekly cooks gives 1,200 to 3,600 extra, drawn against a 20,000 goal, and
 * the best case is under a fifth of it, so it waits.
 */
export const SizeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("market").from;
  const qAt = n.word("market", "Question");
  const textAt = n.word("market", "How would you estimate");
  const factorsAt = n.word("market", "Break it into factors");
  const loudAt = n.word("market", "say every assumption out loud");
  const searchesAt = n.word("market", "Daily searches");
  const mauAt = n.word("market", "two million monthly users");
  const quarterAt = n.word("market", "a quarter of them use it");
  const halfAt = n.word("market", "half a session a day");
  const twoAt = n.word("market", "two searches a session");
  const resultAt = n.word("market", "About five hundred thousand");
  const sanityCheckAt = n.word("market-sanity", "sanity-check it");
  const eachAt = n.word("market-sanity", "one search a day each");
  const plausibleAt = n.word("market-sanity", "Plausible");
  const structureAt = n.word("market-grade", "the structure");
  const sanityAt = n.word("market-grade", "the sanity check");
  const notAt = n.word("market-grade", "not the number");
  const q11At = n.word("impact", "Question eleven");
  const q11TextAt = n.word("impact", "How do you size");
  const boundAt = n.word("impact", "Bound it");
  const reachAt = n.word("impact", "A hundred and twenty thousand weekly users");
  const similarAt = n.word("impact-lift", "Similar launches turned");
  const hundredAt = n.word("impact-lift", "one to three in every hundred");
  const rangeAt = n.word("impact-range", "twelve hundred to thirty-six hundred");
  const goalAt = n.word("impact-range", "against a goal of twenty thousand");
  const fifthAt = n.word("impact-verdict", "under a fifth of it");
  const deprioritizeAt = n.word("impact-verdict", "deprioritize it");
  const cheapestAt = n.word("impact-cheap", "The cheapest experiment");
  const end = n.beat("impact-cheap").to;

  const out10 = q11At - 4;
  const xOf = (i: number) => X0 + i * (CHAIN.w + CHAIN.gap);
  const factors = [
    { at: mauAt, value: num(MARKET.mau), text: "monthly users" },
    { at: quarterAt, value: pct(MARKET.share), text: "use the feature" },
    { at: halfAt, value: `${MARKET.sessionsPerDay}`, text: "sessions a day each" },
    { at: twoAt, value: `${MARKET.searchesPerSession}`, text: "searches a session" },
  ];
  const running = [
    { at: quarterAt + 10, text: `${num(MARKET.users)} users` },
    { at: halfAt + 10, text: `${num(MARKET.sessionsDaily)} sessions a day` },
    { at: twoAt + 10, text: `${num(MARKET.daily)} searches a day` },
  ];

  const xs: Scale = { lo: 0, hi: IMPACT.goal, a: X0 + 40, b: AXIS.x1 };
  const axis = ease(frame, rangeAt - 8, 20);
  const band = ease(frame, rangeAt, 16);

  return (
    <AbsoluteFill>
      {factors.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={resultAt + 2} level={-32} />
      <Sfx name="el-pencil" at={structureAt} level={-34} />
      <Sfx name="el-scratch" at={notAt + 4} level={-34} />
      <Sfx name="el-tap" at={reachAt} level={-34} />
      <Sfx name="slide" at={rangeAt} level={-32} />
      <Sfx name="el-pop" at={fifthAt} level={-32} />

      {/* One slow push per question: a single push over both eases in so
          slowly that Question 10's card is read over a still page. */}
      <Drift from={from} to={q11At + 10}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} out={out10} size={60}>
          How would you estimate the size of something on the spot?
        </QuestionCard>

        {/* ── Question 10: a chain of assumptions ── */}
        <Note at={factorsAt} x={X0} y={y(CHAIN.top) - h(76)} out={out10}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            break it into factors
            <span style={{ opacity: ease(frame, loudAt, 10) }}>, every assumption out loud</span>
            <span style={{ ...note(26, BLUE_INK), fontWeight: 650, opacity: ease(frame, searchesAt, 10) }}>: daily searches by ingredient</span>
          </span>
        </Note>
        {factors.map((f, i) => (
          <React.Fragment key={f.text}>
            <Factor x={xOf(i)} top={y(CHAIN.top)} w={CHAIN.w} at={f.at - 2} out={out10} value={f.value} text={f.text} />
            <Note at={f.at + 4} x={xOf(i) + CHAIN.w + 14} y={y(CHAIN.top) + h(52)} out={out10}>
              <span style={{ ...note(40, INK_SOFT), whiteSpace: "nowrap" }}>{i < factors.length - 1 ? "×" : "="}</span>
            </Note>
          </React.Fragment>
        ))}
        <Factor x={xOf(4)} top={y(CHAIN.top)} w={1824 - xOf(4)} at={resultAt - 2} out={out10} value={`≈ ${num(MARKET.daily)}`} text="searches a day" result />
        {running.map((r, i) => (
          <Note key={r.text} at={r.at} x={xOf(i + 1)} y={y(CHAIN.top) + h(CHAIN.h) + h(18)} out={out10}>
            <span style={{ ...label(21, BLUE_INK), ...TABULAR, whiteSpace: "nowrap" }}>= {r.text}</span>
          </Note>
        ))}
        <Note at={mauAt} x={X0} y={y(CHAIN.top) + h(CHAIN.h) + h(18)} out={out10}>
          <span style={madeUp()}>assumptions for the made-up app</span>
        </Note>

        {/* The sanity check: what the answer says each feature user does. */}
        <Note at={sanityCheckAt} x={1824} align="right" y={y(604)} out={out10}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>sanity check:</b>{" "}
            <span style={{ color: BLUE_INK, fontWeight: 600, opacity: ease(frame, sanityCheckAt + 10, 10) }}>
              {num(MARKET.daily)} searches ÷ {num(MARKET.users)} users
            </span>
            <span style={{ color: BLUE_INK, fontWeight: 600, opacity: ease(frame, eachAt, 10) }}> = {MARKET.perUserDaily} search a day each</span>
            <span style={{ color: OK_INK, fontWeight: 650, opacity: ease(frame, plausibleAt, 10) }}>, plausible</span>
          </span>
        </Note>

        {/* What's graded. */}
        <Note at={structureAt - 4} x={X0} y={y(680)} out={out10}>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <span style={{ ...note(29, INK), fontWeight: 650, whiteSpace: "nowrap" }}>graded:</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Tick at={structureAt + 4} size={30} />
              <span style={{ ...note(29, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the structure</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, sanityAt - 2, 10) }}>
              <Tick at={sanityAt + 4} size={30} />
              <span style={{ ...note(29, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the sanity check</span>
            </span>
            <span style={{ ...note(29, ACCENT_INK), whiteSpace: "nowrap", opacity: ease(frame, notAt - 2, 10) }}>
              <Strike at={notAt + 6}>the number</Strike>
            </span>
          </div>
        </Note>
      </Drift>

      <Drift from={q11At - 8} to={end + 40}>
        {/* ── Question 11: bound it ── */}
        <QuestionCard n={11} at={q11At} textAt={q11TextAt - 2} size={60}>
          How do you size a feature&apos;s impact before building it?
        </QuestionCard>
        <Note at={boundAt} x={X0} y={y(330)}>
          <span style={{ ...note(32, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Bound it.</span>
        </Note>
        <Note at={reachAt} x={X0} y={y(400)}>
          <span style={{ ...note(30, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            <b>{num(IMPACT.reach)}</b> weekly users reach its screen
            <span style={{ opacity: ease(frame, similarAt, 10) }}>
              {" "}
              × <b style={{ opacity: ease(frame, hundredAt, 10) }}>
                {IMPACT.perHundredLo} to {IMPACT.perHundredHi} in 100
              </b>{" "}
              become new weekly cooks <span style={{ color: INK_SOFT }}>(similar launches)</span>
            </span>
          </span>
        </Note>
        <Note at={rangeAt} x={X0} y={y(460)}>
          <span style={{ ...note(30, BLUE_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            = {num(IMPACT.extraLo)} to {num(IMPACT.extraHi)} extra weekly cooks
          </span>
        </Note>
        <Svg opacity={axis}>
          <line x1={at(xs, 0)} x2={at(xs, 0) + (AXIS.x1 - at(xs, 0)) * axis} y1={y(AXIS.y)} y2={y(AXIS.y)} stroke={INK} strokeWidth={1.8} />
          {[0, 5_000, 10_000, 15_000, 20_000].map((v) => (
            <g key={v}>
              <line x1={at(xs, v)} x2={at(xs, v)} y1={y(AXIS.y)} y2={y(AXIS.y) + 8} stroke={INK} strokeWidth={1.4} />
              <text x={at(xs, v)} y={y(AXIS.y) + 34} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), ...TABULAR })}>
                {num(v)}
              </text>
            </g>
          ))}
        </Svg>
        <Svg opacity={band}>
          <rect x={at(xs, 0)} y={y(AXIS.y) - h(56)} width={(at(xs, IMPACT.goal) - at(xs, 0)) * axis} height={h(48)} fill={DATA_LIGHT} opacity={0.35} />
          <rect
            x={at(xs, IMPACT.extraLo)}
            y={y(AXIS.y) - h(56)}
            width={(at(xs, IMPACT.extraHi) - at(xs, IMPACT.extraLo)) * band}
            height={h(48)}
            fill={DATA}
            rx={3}
          />
        </Svg>
        <Note at={goalAt + 4} x={at(xs, IMPACT.goal)} align="right" y={y(AXIS.y) - h(100)}>
          <span style={{ ...label(22, INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>goal: {num(IMPACT.goal)} ▾</span>
        </Note>
        <Bracket x0={at(xs, 0)} x1={at(xs, IMPACT.extraHi)} y={y(AXIS.y) + h(70)} at={fifthAt} color={ACCENT_INK}>
          <span style={{ ...label(23, ACCENT_INK), fontWeight: 700, ...TABULAR }}>best case: {pct(IMPACT.shareOfGoal)} of the goal</span>
        </Bracket>
        <Note at={deprioritizeAt} x={980} y={y(AXIS.y) + h(84)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>→ deprioritize it before anyone builds it</span>
        </Note>
        <Note at={cheapestAt} x={980} y={y(AXIS.y) + h(140)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={cheapestAt + 8}>the cheapest experiment is the arithmetic</Mark>
          </span>
        </Note>
        <Note at={reachAt} x={X0} y={y(AXIS.y) + h(150)}>
          <span style={madeUp()}>made up for this video</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
