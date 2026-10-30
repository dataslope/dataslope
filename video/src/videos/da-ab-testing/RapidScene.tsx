import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  Axes,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Headline,
  Kicker,
  Line,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  rowsAt,
  type Scale,
  Spot,
  Svg,
  VLine,
  X0,
  at,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 740;
const TOP = 330;
const LIST_TOP = 300;
const ROW = 46;
const SIZE = 18;
/** The charts' plot box, shared by the three curve answers. */
const PLOT = { x0: 850, x1: 1560, top: 380, base: 740 };

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

const xOf = (weeks: number): Scale => ({ lo: 0, hi: weeks, a: PLOT.x0, b: PLOT.x1 });
const yOf = (c: Ctx, hi: number): Scale => ({ lo: 0, hi, a: c.y(PLOT.base), b: c.y(PLOT.top) });
const pts = (values: readonly number[], first = 0) => values.map((v, i) => [first + i, v] as const);

// ── 16. A conversion rate in SQL ────────────────────────────────────────────

/**
 * The query check.mjs ran, its one long line broken in two after
 * `'purchase'` so it fits beside the table. Whitespace only: the statement
 * is the same.
 */
const wrap = (lines: readonly string[]) =>
  lines.flatMap((l) => {
    const cut = l.indexOf(" THEN ");
    if (cut < 0) return [l];
    const indent = " ".repeat(l.indexOf("CASE"));
    return [l.slice(0, cut), indent + l.slice(cut + 1)];
  });

const Conversion: React.FC<{ c: Ctx }> = ({ c }) => {
  const at0 = c.w("r-sql", "A conversion rate in SQL");
  const distinctAt = c.w("r-sql", "count distinct converted users");
  const oneAt = c.w("r-sql", "times one point zero");
  const overAt = c.w("r-sql", "over distinct users");
  const withoutAt = c.w("r-sql", "Without distinct");
  const twiceAt = c.w("r-sql", "counts twice");
  const fourAt = c.w("r-sql", "point four becomes");
  const sixAt = c.w("r-sql", "point six");
  const zeroAt = c.w("r-sql", "The one point zero stops");

  const E = RAPID.events;
  const g = geoOf(E, R_X, c.y(TOP), c.h, { headH: 40, rowH: 36, bodySize: 21, headSize: 19 });
  const stage = E.cols.indexOf("stage");
  const user = E.cols.indexOf("user_id");
  // A buyer's first purchase row counts them; any later one is a repeat.
  const firsts: number[] = [];
  const repeats: number[] = [];
  const buyers = new Set<string>();
  E.rows.forEach((r, i) => {
    if (r[stage] !== "purchase") return;
    (buyers.has(r[user]) ? repeats : firsts).push(i);
    buyers.add(r[user]);
  });
  const users = new Set(E.rows.map((r) => r[user])).size;

  const right = wrap(RAPID.right.lines);
  const wrong = wrap(RAPID.repeats.lines);
  const LX = g.right + 48;
  const top2 = c.y(TOP) + listingHeight(right.length, SIZE) + c.h(36);
  const valueX = LX + 600;
  const value = (t: { rows: string[][] }) => fmt(Number(t.rows[0][0]), 1);

  return (
    <>
      <DataTable
        g={g}
        cols={colsOf(E)}
        at={at0 - 2}
        rows={rowsAt(E.rows, at0 + 2, 1)}
        marks={[
          ...firsts.map((row, k) => ({ row, col: user, at: distinctAt + 6 + k * 4, color: MARK_OK })),
          ...repeats.map((row) => ({ row, col: user, at: twiceAt, color: MARK_BAD })),
        ]}
      />
      <Note at={distinctAt + 14} x={R_X} y={g.rowTop(E.rows.length) + c.h(16)}>
        <span style={{ ...note(22, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
          {firsts.length} buyers, {users} users
        </span>
      </Note>

      <Listing lines={right} x={LX} top={c.y(TOP)} width={580} size={SIZE} at={distinctAt - 4} marks={[{ line: 1, at: distinctAt + 2 }, { line: 2, at: oneAt }, { line: 3, at: overAt }]} />
      <Note at={fourAt - 2} x={valueX} y={c.y(TOP) + listingHeight(right.length, SIZE) / 2 - c.h(26)}>
        <span style={{ ...note(44, OK_INK), fontWeight: 650, ...TABULAR }}>{value(RAPID.right)}</span>
      </Note>

      <Listing lines={wrong} x={LX} top={top2} width={580} size={SIZE} at={withoutAt - 4} marks={[{ line: 1, at: withoutAt + 2, color: MARK_BAD }]} />
      <Note at={sixAt - 2} x={valueX} y={top2 + listingHeight(wrong.length, SIZE) / 2 - c.h(26)}>
        <span style={{ ...note(44, ACCENT_INK), fontWeight: 650, ...TABULAR }}>{value(RAPID.repeats)}</span>
      </Note>

      <Note at={zeroAt - 2} x={LX} y={top2 + listingHeight(wrong.length, SIZE) + c.h(24)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <QMono>* 1.0</QMono>: no whole-number division, where {firsts.length} / {users} would be 0
        </span>
      </Note>
    </>
  );
};

// ── 17. Novelty and primacy ─────────────────────────────────────────────────

const Novelty: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-novelty", "A novelty effect");
  const fadesAt = c.w("r-novelty", "and fades");
  const weekAt = c.w("r-novelty", "In week one");
  const fourteenAt = c.w("r-novelty", "fourteen percent against four");
  const primacyAt = c.w("r-novelty", "A primacy effect");
  const longAt = c.w("r-novelty", "run the test long enough");
  const checkAt = c.w("r-novelty-check", "check that the lift holds");

  const { novelty, durable } = RAPID.novelty;
  const weeks = novelty.length;
  const x: Scale = { lo: 1, hi: weeks, a: PLOT.x0, b: PLOT.x1 };
  const y = yOf(c, 15);
  const last = weeks;
  const p1 = ease(frame, weekAt + 2, 10);
  return (
    <>
      <Axes
        x={x}
        y={y}
        xTicks={Array.from({ length: weeks }, (_, i) => i + 1)}
        yTicks={[0, 5, 10, 15]}
        yFormat={(v) => `${v}%`}
        xTitle="week of the test"
        at={at0 - 2}
      />
      <Note at={at0 - 2} x={PLOT.x0 - 60} y={c.y(PLOT.top) - c.h(64)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>lift over the old version, each week</span>
      </Note>
      <Line points={pts(novelty, 1)} x={x} y={y} at={fadesAt - 6} dur={30} color={ACCENT} />
      <Line points={pts(durable, 1)} x={x} y={y} at={fadesAt + 4} dur={30} color={OK} />
      <Svg>
        <circle cx={at(x, 1)} cy={at(y, novelty[0])} r={9 * p1} fill={ACCENT} />
        <circle cx={at(x, 1)} cy={at(y, durable[0])} r={9 * p1} fill={OK} />
      </Svg>
      <Note at={fourteenAt - 2} x={at(x, 1) + 20} y={at(y, novelty[0]) - c.h(18)}>
        <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{fmt(novelty[0], 0)}%</span>
      </Note>
      <Note at={fourteenAt + 8} x={at(x, 1) + 20} y={at(y, durable[0]) + c.h(8)}>
        <span style={{ ...note(26, OK_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{fmt(durable[0], 0)}%</span>
      </Note>
      <Note at={fadesAt + 20} x={at(x, last) + 16} y={at(y, novelty[last - 1]) - c.h(16)}>
        <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap" }}>novelty</span>
      </Note>
      <Note at={fadesAt + 30} x={at(x, last) + 16} y={at(y, durable[last - 1]) - c.h(16)}>
        <span style={{ ...label(21, OK_INK), whiteSpace: "nowrap" }}>lasting</span>
      </Note>
      <Note at={primacyAt - 2} x={at(x, 3)} y={c.y(PLOT.top) + c.h(10)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b>primacy effect</b>: the reverse, a change resisted at first
        </span>
      </Note>
      <Note at={longAt - 2} x={at(x, 3)} y={c.y(PLOT.top) + c.h(56)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>run it long enough to settle</span>
      </Note>
      {/* Below the 10% gridline, clear of both curves. */}
      <Note at={checkAt - 2} x={at(x, 3)} y={c.y(PLOT.top) + c.h(162)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>and check it holds for users who never saw the old one</span>
      </Note>
    </>
  );
};

// ── 18. Cohort analysis ─────────────────────────────────────────────────────

/** The cohorts in a blue ramp, January lightest, so later reads darker. */
const COHORT_STEPS = [300, 400, 550, 700, 850] as const;

const Cohorts: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-cohort", "A cohort analysis");
  const monthAt = c.w("r-cohort", "like their sign-up month");
  const followAt = c.w("r-cohort", "follows each group");
  const moreAt = c.w("r-cohort", "keeps more than the last");
  const janAt = c.w("r-cohort", "twenty-six percent at week eight");
  const mayAt = c.w("r-cohort", "fifty-two for May");
  const blendedAt = c.w("r-cohort-why", "A single blended retention number");
  const acquisitionAt = c.w("r-cohort-why", "whenever acquisition does");

  const K = RAPID.cohorts;
  const weeks = K[0].rows.length - 1;
  const x = xOf(weeks);
  const y = yOf(c, 100);
  const W = 8;
  const jan = K[0];
  const may = K[K.length - 1];
  const dotP = (from: number) => ease(frame, from, 10);
  return (
    <>
      <Axes
        x={x}
        y={y}
        xTicks={[0, 2, 4, 6, 8, 10, 12]}
        yTicks={[0, 25, 50, 75, 100]}
        yFormat={(v) => `${v}%`}
        xTitle="weeks since sign-up"
        at={at0 - 2}
      />
      <Note at={at0 - 2} x={PLOT.x0 - 60} y={c.y(PLOT.top) - c.h(64)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>share of each sign-up month still active</span>
      </Note>
      {K.map((k, i) => (
        <Line key={k.key} points={pts(k.rows)} x={x} y={y} at={followAt - 4 + i * 4} dur={26} color={ds("blue", COHORT_STEPS[i])} />
      ))}
      {K.map((k, i) => (
        <Note key={k.key} at={monthAt + 10 + i * 4} x={at(x, weeks) + 14} y={at(y, k.rows[weeks]) - c.h(14)}>
          <span style={{ ...label(19, i < 2 ? INK_SOFT : INK), whiteSpace: "nowrap" }}>{k.key}</span>
        </Note>
      ))}
      <VLine x={at(x, W)} top={c.y(PLOT.top)} bottom={c.y(PLOT.base)} at={moreAt} color={INK_SOFT} dash="6 6" width={2} />
      <Svg>
        <circle cx={at(x, W)} cy={at(y, jan.rows[W])} r={9 * dotP(janAt)} fill={ds("blue", COHORT_STEPS[0])} stroke={INK} strokeWidth={1.5} />
        <circle cx={at(x, W)} cy={at(y, may.rows[W])} r={9 * dotP(mayAt)} fill={ds("blue", COHORT_STEPS[K.length - 1])} />
      </Svg>
      {/* Left of the dot, under the curve: to its right the curve runs on through the label. */}
      <Note at={janAt} x={at(x, W) - 16} y={at(y, jan.rows[W]) + c.h(6)} align="right">
        <span style={{ ...note(24, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
          {jan.key}: {fmt(jan.rows[W], 0)}%
        </span>
      </Note>
      <Note at={mayAt} x={at(x, W) + 16} y={at(y, may.rows[W]) - c.h(46)}>
        <span style={{ ...note(24, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
          {may.key}: {fmt(may.rows[W], 0)}%
        </span>
      </Note>
      <Note at={blendedAt - 2} x={PLOT.x0 - 60} y={c.y(PLOT.base) + c.h(96)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          one blended retention number hides this
          <span style={{ opacity: ease(frame, acquisitionAt - 4, 10) }}>: it moves whenever acquisition does</span>
        </span>
      </Note>
    </>
  );
};

// ── 19. Retention curves ────────────────────────────────────────────────────

const MATCH = 2;

const Retention: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-retention", "a retention curve");
  const healthyAt = c.w("r-retention", "A healthy one flattens");
  const plateauAt = c.w("r-retention", "onto a plateau");
  const matchAt = c.w("r-retention", "For two weeks these two match");
  const twelveAt = c.w("r-retention", "By week twelve");
  const thirtyAt = c.w("r-retention", "thirty-one percent");
  const twoAt = c.w("r-retention", "and the other two");

  const { core, leaky } = RAPID.retention;
  const weeks = core.length - 1;
  const x = xOf(weeks);
  const y = yOf(c, 100);
  const dot = (from: number) => 9 * ease(frame, from, 10);
  return (
    <>
      <Axes
        x={x}
        y={y}
        xTicks={[0, 2, 4, 6, 8, 10, 12]}
        yTicks={[0, 25, 50, 75, 100]}
        yFormat={(v) => `${v}%`}
        xTitle="weeks since sign-up"
        at={at0 - 2}
      />
      <Note at={at0 + 4} x={PLOT.x0 - 60} y={c.y(PLOT.top) - c.h(64)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>share of one cohort still active, each week</span>
      </Note>
      <Line points={pts(core)} x={x} y={y} at={healthyAt - 2} dur={30} color={OK} />
      <Note at={plateauAt} x={at(x, 7)} y={at(y, core[7]) - c.h(52)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a plateau</span>
      </Note>
      {/* The leaky one shares the healthy one's first two weeks, then falls away. */}
      <Line points={pts(leaky.slice(0, MATCH + 1))} x={x} y={y} at={matchAt - 2} dur={14} color={ACCENT} />
      <Line points={pts(leaky.slice(MATCH), MATCH)} x={x} y={y} at={twelveAt - 6} dur={26} color={ACCENT} />
      <VLine
        x={at(x, MATCH)}
        top={c.y(PLOT.top)}
        bottom={c.y(PLOT.base)}
        at={matchAt + 4}
        color={INK_SOFT}
        dash="6 6"
        width={2}
        labelY={at(y, 88)}
        label={
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>
            week {MATCH}: {fmt(core[MATCH], 0)}% and {fmt(leaky[MATCH], 0)}%
          </span>
        }
      />
      <Svg>
        <circle cx={at(x, weeks)} cy={at(y, core[weeks])} r={dot(thirtyAt - 2)} fill={OK} />
        <circle cx={at(x, weeks)} cy={at(y, leaky[weeks])} r={dot(twoAt - 2)} fill={ACCENT} />
      </Svg>
      <Note at={thirtyAt} x={at(x, weeks) + 18} y={at(y, core[weeks]) - c.h(18)}>
        <span style={{ ...note(26, OK_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{fmt(core[weeks], 0)}%</span>
      </Note>
      <Note at={twoAt} x={at(x, weeks) + 18} y={at(y, leaky[weeks]) - c.h(18)}>
        <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{fmt(leaky[weeks], 0)}%</span>
      </Note>
    </>
  );
};

/**
 * The rapid-fire round, questions 16 to 19, as in the earlier parts: the
 * numbered list on the left, ticked as the round goes, each answer on the
 * right. The SQL ran in DuckDB; the three curves are the page's own charts.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const fourAt = n.word("rapid-in", "Four short ones");
  const finishAt = n.word("rapid-in", "to finish");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 16, label: "A conversion rate in SQL", beat: "r-sql", body: <Conversion c={c} /> },
    { n: 17, label: "Novelty and primacy", beat: "r-novelty", body: <Novelty c={c} /> },
    { n: 18, label: "Cohort analysis", beat: "r-cohort", body: <Cohorts c={c} /> },
    { n: 19, label: "Retention curves", beat: "r-retention", body: <Retention c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-retention").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 16 to 19</Kicker>
        <Headline lead="Four short ones" turn="to finish." at={fourAt - 4} turnAt={finishAt - 2} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 19 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={540}
          at={finishAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Retention c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X} y={y(850)} width={1000}>
          AI-assisted analysis
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};
