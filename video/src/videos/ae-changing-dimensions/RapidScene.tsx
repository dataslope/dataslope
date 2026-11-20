import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { badgeStyle, NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { MINI } from "./data";
import { acme, Arrow, Axis, Band, Box, Drift, Headline, Kicker, OK_INK, QMono, Spot, X0, YEARS, Pill } from "./parts";

const R_X = 820;
const R_X1 = 1780;
const LIST_TOP = 340;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** A badge set inside a band, at its right end. */
const InBadge: React.FC<{ at: number; x1: number; top: number; h: number; children: React.ReactNode }> = ({ at, x1, top, h, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 1920 - x1 + 14, top, height: h, display: "flex", alignItems: "center", opacity: p, transform: `scale(${0.85 + 0.15 * p})` }}>
      <Pill size={21}>
        {children}
      </Pill>
    </div>
  );
};

// ── 8. SCD Type 0 ───────────────────────────────────────────────────────────

/** Acme's two versions on the recurring figure, and above them one
 *  attribute that is never versioned: written once, later loads ignored. */
const TypeZero: React.FC<{ c: Ctx; at: number }> = ({ c, at }) => {
  const frame = useCurrentFrame();
  const neverAt = c.w("r-t0", "A value that never changes once written");
  const dobAt = c.w("r-t0", "like a date of birth");
  const channelAt = c.w("r-t0", "the channel a customer first came through");
  const onceAt = c.w("r-t0", "Load it once");
  const ignoreAt = c.w("r-t0", "ignore whatever later loads say");
  const versionsAt = c.w("r-t0", "versions its region as Type two");
  const A = acme(R_X, R_X1);
  const [east, west] = A.versions;
  const bandH = c.h(52);
  const fixedTop = c.y(470);
  const verTop = c.y(570);
  const axisTop = verTop + bandH + c.h(12);
  return (
    <>
      <Note at={at} x={R_X} y={c.y(LIST_TOP - 4)}>
        <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>What is SCD Type 0?</span>
      </Note>
      <Note at={neverAt} x={R_X} y={c.y(LIST_TOP + 58)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          Never changes once written
          <span style={{ color: INK_SOFT }}>
            <span style={{ opacity: ease(frame, dobAt, 10) }}>: a date of birth</span>
            <span style={{ opacity: ease(frame, channelAt, 10) }}>, the first channel</span>
          </span>
        </span>
      </Note>
      <Band x0={A.x0} x1={A.x1} top={fixedTop} h={bandH} at={channelAt + 4} label={<QMono>first_channel</QMono>} />
      <InBadge at={onceAt} x1={A.x1} top={fixedTop} h={bandH}>
        Type 0: written once
      </InBadge>
      <Axis tl={A} top={axisTop} at={versionsAt - 6} years={YEARS} />
      <Band x0={east.x0} x1={east.x1} top={verTop} h={bandH} at={versionsAt - 4} label={<QMono>region · {east.region}</QMono>} />
      <Band x0={west.x0 + 3} x1={A.x1} top={verTop} h={bandH} at={versionsAt + 2} open label={<QMono>{west.region}</QMono>} />
      <InBadge at={versionsAt + 10} x1={A.x1} top={verTop} h={bandH}>
        Type 2
      </InBadge>
      <Note at={ignoreAt} x={R_X} y={axisTop + c.h(56)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Later loads: ignored for this column</span>
      </Note>
    </>
  );
};

// ── 9. Mini-dimension ───────────────────────────────────────────────────────

/** One band a value can take, as a gray badge in the mono face. */
const Chip: React.FC<{ children: React.ReactNode; at: number }> = ({ children, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <div style={{ ...badgeStyle("gray", 21), display: "block", fontFamily: MONO, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
      {children}
    </div>
  );
};

/** Age bands by income tiers, every combination a row of a small table; the
 *  fact carries its key beside the customer's. */
const Mini: React.FC<{ c: Ctx; at: number }> = ({ c, at }) => {
  const frame = useCurrentFrame();
  const fastAt = c.w("r-mini", "Fast-changing attributes");
  const bandsAt = c.w("r-mini", "like age band and income band");
  const everyAt = c.w("r-mini", "a small table of every combination");
  const twentyAt = c.w("r-mini", "twenty rows here");
  const keyAt = c.w("r-mini", "with its own key on the fact");
  const stopsAt = c.w("r-mini", "The customer dimension stops adding a version");
  const recordsAt = c.w("r-mini", "each order still records the bands");
  const groups = [
    { name: "age_band", values: MINI.ages, at: bandsAt },
    { name: "income_band", values: MINI.incomes, at: bandsAt + 10 },
  ];
  const top = c.y(440);
  const factTop = c.y(740);
  const keys = [
    { name: "order_id", w: 180, look: false },
    { name: "customer_sk", w: 230, look: true },
    { name: "demo_sk", w: 190, look: true },
  ];
  return (
    <>
      <Note at={at} x={R_X} y={c.y(LIST_TOP - 4)}>
        <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>What is a mini-dimension?</span>
      </Note>
      <Note at={fastAt} x={R_X} y={c.y(LIST_TOP + 58)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>Fast-changing attributes, in a table of their own</span>
      </Note>
      <div style={{ position: "absolute", left: R_X, top, display: "flex", alignItems: "flex-start", fontSize: 21 }}>
        {groups.map((g, i) => (
          <React.Fragment key={g.name}>
            {i ? <div style={{ ...note(34, INK_SOFT), margin: "50px 40px 0", opacity: ease(frame, g.at, 10) }}>×</div> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              <div style={{ ...label(21, INK_SOFT), opacity: ease(frame, g.at - 2, 10), whiteSpace: "nowrap", fontFamily: MONO }}>{g.name}</div>
              {g.values.map((v, j) => (
                <Chip key={v} at={g.at + 2 + j * 2}>
                  {v}
                </Chip>
              ))}
            </div>
          </React.Fragment>
        ))}
        <div style={{ ...note(40, INK_SOFT), margin: "40px 22px 0 50px", opacity: ease(frame, everyAt, 10) }}>=</div>
        <div style={{ marginTop: 36, opacity: ease(frame, twentyAt - 2, 10), whiteSpace: "nowrap" }}>
          <div style={{ ...note(46, BLUE_INK) }}>
            <Num>{MINI.rows}</Num>
          </div>
          <div style={{ ...note(25, INK), marginTop: 2 }}>
            rows in <QMono>dim_demographics</QMono>
          </div>
        </div>
      </div>
      <Note at={keyAt - 2} x={R_X} y={factTop - c.h(44)}>
        <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>A row of fact_orders</span>
      </Note>
      {keys.map((k, i) => (
        <Box
          key={k.name}
          x={R_X + keys.slice(0, i).reduce((s, o) => s + o.w + 12, 0)}
          y={factTop}
          w={k.w}
          h={c.h(54)}
          at={keyAt + i * 3}
          size={21}
          padding={0}
          tones={k.look ? [{ at: keyAt + 10, tone: "data" }] : []}
        >
          <QMono>{k.name}</QMono>
        </Box>
      ))}
      <Note at={stopsAt} x={R_X + 680} y={factTop - c.h(46)}>
        <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>No new customer version</span>
      </Note>
      <Note at={stopsAt + 6} x={R_X + 680} y={factTop - c.h(10)}>
        <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>when a band changes</span>
      </Note>
      <Note at={recordsAt} x={R_X} y={factTop + c.h(80)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Each order keeps the bands true when it was placed</span>
      </Note>
    </>
  );
};

/**
 * The quick round: two questions down the left, each read aloud and
 * answered on the right; then the bridge into dbt, with the crab back: the
 * order the tables are built in, as three outlined boxes, and the Next line.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const twoAt = n.word("rapid-in", "Two quick ones");
  const q8At = n.word("r-t0", "Question eight");
  const q9At = n.word("r-mini", "Question nine");
  const rebuiltAt = n.word("next", "Every table here is rebuilt each day");
  const snapAt = n.word("next", "the snapshot first");
  const dimsAt = n.word("next", "then the dimensions");
  const factsAt = n.word("next", "then the facts that look them up");
  const dbtAt = n.word("next", "Running that order is dbt's job");
  const nextAt = n.word("next", "Next:");
  const end = rebuiltAt - 4;

  const items: RapidItem[] = [
    { n: 8, label: "SCD Type 0", at: q8At, body: <TypeZero c={c} at={q8At} /> },
    { n: 9, label: "Mini-dimension", at: q9At, body: <Mini c={c} at={q9At} /> },
  ];
  const steps = [
    { text: "Snapshot", at: snapAt },
    { text: "Dimensions", at: dimsAt },
    { text: "Facts", at: factsAt },
  ];
  const boxW = 250;
  const gap = 105;
  const boxTop = y(420);
  const boxH = h(70);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={twoAt} level={-37} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-35} />
      ))}
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at + 2} level={-35} />
      ))}
      <Sfx name="el-pop" at={nextAt} level={-31} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={twoAt}>Quick round</Kicker>
        <Headline lead="Two quick ones to finish" at={twoAt + 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={twoAt + 6} end={end} />

        {/* ── The bridge: the order the tables are built in ── */}
        <Note at={rebuiltAt} x={R_X} y={y(LIST_TOP - 4)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>Rebuilt every day, in order</span>
        </Note>
        {steps.map((s, i) => (
          <Box key={s.text} x={R_X + i * (boxW + gap)} y={boxTop} w={boxW} h={boxH} at={s.at} size={25}>
            {s.text}
          </Box>
        ))}
        {steps.slice(1).map((s, i) => (
          <Arrow
            key={s.text}
            points={[
              [R_X + (i + 1) * boxW + i * gap + 12, boxTop + boxH / 2],
              [R_X + (i + 1) * (boxW + gap) - 12, boxTop + boxH / 2],
            ]}
            at={s.at - 4}
          />
        ))}
        <Note at={dbtAt} x={R_X} y={boxTop + boxH + h(40)}>
          <span style={{ ...note(28, OK_INK), whiteSpace: "nowrap" }}>Running that order is dbt&rsquo;s job</span>
        </Note>
        <NextLine at={nextAt} x={R_X} y={y(680)} width={700}>
          How dbt builds a project
        </NextLine>
        <Spot art="crab" at={nextAt} left={X0 + 20} top={y(610)} width={520} />
      </Drift>
    </AbsoluteFill>
  );
};
