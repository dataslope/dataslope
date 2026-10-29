import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AA, CAP, pct, STRATA } from "./data";
import { Drift, Headline, Kicker, Mark, MARK_OK, OK, OK_INK, Spot, WARM, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 320;
const ROW = 56;
const DOT_GAP = 44;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 12. Sensitive or robust ─────────────────────────────────────────────────

const Sensitive: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const sensAt = c.w("r-sensitive", "A sensitive metric moves reliably");
  const smallAt = c.w("r-sensitive", "detect small effects");
  const robustAt = c.w("r-sensitive", "A robust one");
  const outlierAt = c.w("r-sensitive", "thrown by outliers");
  const revenueAt = c.w("r-sensitive", "Revenue per user is long-tailed");
  const capAt = c.w("r-sensitive", "capping it at the ninety-ninth percentile");
  const cutAt = c.w("r-sensitive", "forty-eight percent");
  const smallerAt = c.w("r-sensitive-gain", "can detect a smaller effect");
  const swingAt = c.w("r-sensitive-gain", "no longer swing it");
  const W = 560;
  const rows = [
    { text: "revenue per user", v: 1, at: revenueAt, color: BAR, ink: BLUE_INK, label: "its variance" },
    { text: "capped at the 99th percentile", v: 1 - CAP.cut, at: capAt, color: OK, ink: OK_INK, label: `−${pct(CAP.cut)}` },
  ];
  return (
    <>
      <Note at={sensAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          <b>sensitive</b>: moves reliably when the treatment works
        </span>
      </Note>
      <Note at={smallAt} x={R_X + 64} y={c.y(370)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>so it can detect small effects</span>
      </Note>
      <Note at={robustAt - 2} x={R_X + 40} y={c.y(418)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          <b>robust</b>: hard to game
          <span style={{ opacity: ease(frame, outlierAt - 4, 10) }}>, not thrown by outliers</span>
        </span>
      </Note>
      {rows.map((r, i) => {
        const p = ease(frame, r.at - 2, 14);
        if (p <= 0) return null;
        const top = c.y(490) + i * c.h(96);
        return (
          <React.Fragment key={r.text}>
            <div style={{ position: "absolute", left: R_X + 40, top, ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: p }}>{r.text}</div>
            <div style={{ position: "absolute", left: R_X + 40, top: top + c.h(36), width: W * r.v * p, height: c.h(34), background: r.color, opacity: 0.85, borderRadius: 3 }} />
            <Note at={i === 0 ? r.at + 6 : cutAt} x={R_X + 40 + W * r.v + 14} y={top + c.h(36)}>
              <span style={{ ...note(26, r.ink), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{r.label}</span>
            </Note>
          </React.Fragment>
        );
      })}
      <Note at={smallerAt - 2} x={R_X + 40} y={c.y(690)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          capped: more sensitive<span style={{ opacity: ease(frame, swingAt - 4, 10) }}>, and more robust</span>
        </span>
      </Note>
    </>
  );
};

// ── 13. Stratified randomization ────────────────────────────────────────────

/** Twenty users in a row, the first six heavy users, each in the arm it drew. */
const Users: React.FC<{ arms: readonly number[]; top: number; at: number }> = ({ arms, top, at: from }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {arms.map((a, i) => {
        const p = ease(frame, from + i * 0.8, 8);
        if (p <= 0) return null;
        const heavy = i < STRATA.heavy;
        const cx = R_X + 60 + i * DOT_GAP + (heavy ? 0 : 20);
        return (
          <g key={i}>
            {heavy ? <circle cx={cx} cy={top} r={21 * p} fill="none" stroke={WARM} strokeWidth={3.4} /> : null}
            <circle cx={cx} cy={top} r={(heavy ? 15 : 12) * p} fill={a ? OK : BAR} />
          </g>
        );
      })}
    </svg>
  );
};

const Strata: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const splitsAt = c.w("r-strata", "splits users into groups first");
  const likeAt = c.w("r-strata", "like country or device");
  const insideAt = c.w("r-strata", "randomizes inside each one");
  const sixAt = c.w("r-strata", "With six heavy users among twenty");
  const coinAt = c.w("r-strata", "a coin per user");
  const fiveAt = c.w("r-strata", "five or six of them in one arm");
  const oneInFiveAt = c.w("r-strata", "about one time in five");
  const stratAt = c.w("r-strata", "Stratifying puts three in each");
  const varAt = c.w("r-strata-var", "lowers variance when the groups differ");
  const smallAt = c.w("r-strata-var", "matters most in small tests");
  // Stratified: three heavy users in each arm, and the other fourteen seven and seven.
  const stratified = Array.from({ length: STRATA.users }, (_, i) => (i % 2 === 0 ? 1 : 0));
  const heavyB = STRATA.coin.slice(0, STRATA.heavy).reduce((a, b) => a + b, 0);
  return (
    <>
      <Note at={splitsAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          group first<span style={{ ...note(24, INK_SOFT), opacity: ease(frame, likeAt, 10) }}> (country, device)</span>
          <span style={{ opacity: ease(frame, insideAt - 2, 10) }}>, then randomize within each</span>
        </span>
      </Note>
      <Note at={sixAt} x={R_X + 40} y={c.y(390)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
          twenty users, <b style={{ color: WARM }}>six heavy users</b> ringed · <b style={{ color: BLUE_INK }}>A</b> or <b style={{ color: OK_INK }}>B</b>
        </span>
      </Note>
      <Note at={coinAt - 2} x={R_X + 40} y={c.y(444)}>
        <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>a coin per user</span>
      </Note>
      <Users arms={STRATA.coin} top={c.y(510)} at={coinAt} />
      <Note at={fiveAt} x={R_X + 40} y={c.y(546)}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
          {heavyB} of {STRATA.heavy} heavy users in B
        </span>
      </Note>
      <Note at={oneInFiveAt - 2} x={R_X + 40} y={c.y(580)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
          a coin puts 5 or 6 in one arm about 1 time in 5 ({pct(STRATA.lopsided, 1)})
        </span>
      </Note>
      <Note at={stratAt - 2} x={R_X + 40} y={c.y(636)}>
        <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>stratified</span>
      </Note>
      <Users arms={stratified} top={c.y(700)} at={stratAt} />
      <Note at={stratAt + 10} x={R_X + 40} y={c.y(736)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>three heavy users in each arm</span>
      </Note>
      <Note at={varAt - 2} x={R_X + 40} y={c.y(796)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          also: lower variance when groups differ
          <span style={{ opacity: ease(frame, smallAt - 4, 10) }}>, most useful in small tests</span>
        </span>
      </Note>
    </>
  );
};

// ── 14. The A/A test ────────────────────────────────────────────────────────

const AaTest: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const sameAt = c.w("r-aa", "the same experience");
  const platformAt = c.w("r-aa", "to test the platform itself");
  const codeAt = c.w("r-aa", "The page's code runs a thousand");
  const fiveAt = c.w("r-aa", "five percent come out significant");
  const shouldAt = c.w("r-aa", "as they should");
  const bugAt = c.w("r-aa", "Far more than that means a bug");
  return (
    <>
      <Note at={sameAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          <span style={{ padding: "0 10px", borderRadius: 5, background: BAR, color: PAPER, fontWeight: 700 }}>A</span>{" "}
          <span style={{ padding: "0 10px", borderRadius: 5, background: BAR, color: PAPER, fontWeight: 700 }}>A</span> the same experience in both groups
        </span>
      </Note>
      <Note at={platformAt} x={R_X + 40} y={c.y(390)}>
        <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>it tests the platform, not a feature</span>
      </Note>
      <Note at={codeAt - 2} x={R_X + 40} y={c.y(470)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>the page&apos;s code: {AA.tests.toLocaleString("en-US")} A/A tests</span>
      </Note>
      <Note at={fiveAt} x={R_X + 40} y={c.y(520)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ ...note(40, OK_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            <Mark at={shouldAt} color={MARK_OK}>
              {pct(AA.rate, 1)} significant
            </Mark>
          </span>
          <span style={{ opacity: ease(frame, shouldAt, 10) }}>
            <Tick at={shouldAt + 2} size={34} />
          </span>
        </div>
      </Note>
      <Note at={bugAt} x={R_X + 40} y={c.y(610)}>
        <span style={{ ...note(27, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>far more than 5%: a bug</span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 12 to 14: the numbered list on the left, ticked
 * as the round goes, each answer on the right. Then the bridge into Part 7:
 * three ways a well-designed test still goes wrong once it is live.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "Three questions remain");
  const shortAt = n.word("rapid-in", "a short answer");
  const liveAt = n.word("next", "still go wrong once it's live");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;
  const troubles = [
    { text: "the split comes back uneven", at: n.word("next", "the split comes back uneven") },
    { text: "the effect fades", at: n.word("next", "the effect fades") },
    { text: "ten metrics read at once", at: n.word("next", "ten metrics get read at once") },
  ];

  const items: RapidItem[] = [
    { n: 12, label: "Sensitive or robust", beat: "r-sensitive", body: <Sensitive c={c} /> },
    { n: 13, label: "Stratified randomization", beat: "r-strata", body: <Strata c={c} /> },
    { n: 14, label: "The A/A test", beat: "r-aa", body: <AaTest c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      {troubles.map((t) => (
        <Sfx key={t.text} name="el-tap" at={t.at} level={-38} />
      ))}
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 12 to 14</Kicker>
        <Headline lead="Three questions remain," turn="each one short." at={threeAt - 4} turnAt={shortAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP) + h(40)} rowH={h(ROW)} width={600} at={shortAt} end={end} />

        {/* The bridge: what can still go wrong once the test is live. */}
        <Note at={liveAt} x={R_X + 40} y={y(340)}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>once it&apos;s live, it can still go wrong:</span>
        </Note>
        {troubles.map((t, i) => (
          <Note key={t.text} at={t.at - 2} x={R_X + 70} y={y(410) + i * h(60)}>
            <span style={{ ...note(27, ACCENT_INK), whiteSpace: "nowrap" }}>· {t.text}</span>
          </Note>
        ))}
        <NextLine at={nextAt} x={R_X + 40} y={y(720)} width={900}>
          experiments in practice
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
