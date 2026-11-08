import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { badgeStyle, ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { ACROSS, BALANCE, CLOSING, CLOSING_TOTAL, money, MONTH_ENDS, OVER_TIME, VISITS_BOTH, VISITS_PER_DAY } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK_BAD, MARK_OK, Mono, OK_INK, TableName, Verdict, X0 } from "./parts";

const R_X = 680;
/** The remedies' column, right of the visitors. */
const FIX_X = 1360;
const OPTS = { headH: 46, rowH: 50, bodySize: 24, headSize: 21 } as const;
/** Who visited on each day: the video's own rows, counted in Postgres. */
const WHO: Record<string, readonly string[]> = { Mon: ["Ada", "Ben", "Cy"], Tue: ["Ben", "Cy", "Di"] };

/** The three kinds side by side, a hairline centred in each gap. */
const KINDS_Y = 318;
const KIND_GAP = 64;

/** A kind of measure, lit while the narration is on it, with its note under
 *  it when it has one. It holds its place before it inks, so the row never
 *  reflows. */
const Kind: React.FC<{ at: number; litFrom: number; litTo: number; name: string; eg: string; note?: React.ReactNode; noteAt?: number }> = ({
  at,
  litFrom,
  litTo,
  name,
  eg,
  note: under,
  noteAt = at,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const lit = Math.min(ease(frame, litFrom, 10), 1 - ease(frame, litTo, 10));
  const q = ease(frame, noteAt, 14);
  return (
    <div style={{ whiteSpace: "nowrap" }}>
      <div style={{ position: "relative", opacity: p }}>
        <span
          style={{
            position: "absolute",
            left: -12,
            right: -12,
            top: -4,
            bottom: -6,
            background: HIGHLIGHT,
            borderRadius: 6,
            opacity: lit * 0.8,
          }}
        />
        <span style={{ position: "relative", ...label(25, INK), fontWeight: 600 }}>{name}</span>
        <span style={{ position: "relative", ...note(23, INK_SOFT), marginLeft: 12 }}>{eg}</span>
      </div>
      {under ? <div style={{ marginTop: 12, opacity: q, transform: `translateX(${(1 - q) * -18}px)` }}>{under}</div> : null}
    </div>
  );
};

/** The house's hairline between two kinds, set in the row's flow so it sits
 *  centred in the gap: as tall as a kind and the note under it, inking in
 *  with the kind to its right. */
const RULE_H = 72;
const Gap: React.FC<{ at: number }> = ({ at }) => (
  <div style={{ position: "relative", width: 1, flex: "none" }}>
    <ColumnRule x={0} top={0} height={RULE_H} at={at + 2} />
  </div>
);

/** A visitor, as the house's badge in the data blue, at 24px: within 12%
 *  of the day's 24px count and the 26px "people" beside the row. One who
 *  came on both days turns the highlighter's yellow on `both`. */
const BLUE_BADGE = badgeStyle("blue", 24);
const YELLOW_BADGE = badgeStyle("yellow", 24);
const Who: React.FC<{ name: string; at: number; both?: number }> = ({ name, at, both }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 14));
  const b = both === undefined ? 0 : ease(frame, both, 10);
  const mix = (a: unknown, c: unknown) => (b > 0 ? `color-mix(in srgb, ${String(a)} ${Math.round(b * 100)}%, ${String(c)})` : String(c));
  return (
    <span
      style={{
        ...BLUE_BADGE,
        fontFamily: SANS,
        background: mix(YELLOW_BADGE.background, BLUE_BADGE.background),
        color: mix(YELLOW_BADGE.color, BLUE_BADGE.color),
        opacity: p,
        transform: `scale(${0.7 + 0.3 * p})`,
      }}
    >
      {name}
    </span>
  );
};

/**
 * Question 10. An amount sums across anything; a balance (the video's own
 * month-end snapshot) sums across accounts, 1,600.00 on March 31, but not
 * across months, 4,800.00, where the last value per period gives 1,600.00
 * again; and a distinct count does not sum at all: three on Monday and three
 * on Tuesday are four people. Each non-additive kind gets its own remedy,
 * beside the visitors: recount a distinct count from the detail rows, and
 * store a ratio's two parts.
 */
export const AdditiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("additive").from;
  const qAt = n.word("additive", "Question ten");
  const textAt = n.word("additive", "What is the difference between additive");
  // The three kinds arrive as the question names them, then light in turn.
  const kindAt = [
    n.word("additive", "additive", { nth: 1 }),
    n.word("additive", "semi-additive"),
    n.word("additive", "non-additive measures"),
  ];
  const amountAt = n.word("additive", "An amount is additive");
  const everyAt = n.word("additive", "sums across every dimension");
  const semiAt = n.word("semi", "A balance is semi-additive");
  const acrossAt = n.word("semi", "Summed across accounts on one day");
  const rightAt = n.word("semi", "it's right");
  const sixteenAt = n.word("semi", "sixteen hundred dollars");
  const monthsAt = n.word("semi", "Summed across months");
  const nonsenseAt = n.word("semi", "it's nonsense");
  const fortyAt = n.word("semi", "forty-eight hundred");
  const neverAt = n.word("semi", "money that never existed");
  const lastAt = n.word("semi-fix", "take the last value in each period");
  const averageAt = n.word("semi-fix", "or the average");
  const nonAt = n.word("nonadd", "Non-additive measures");
  const ratiosAt = n.word("nonadd", "like ratios and distinct counts");
  const monAt = n.word("nonadd", "Three users on Monday");
  const tueAt = n.word("nonadd", "three on Tuesday");
  const fourAt = n.word("nonadd", "are four people");
  const sixAt = n.word("nonadd", "not six");
  const recountAt = n.word("nonadd-fix", "recount distinct users");
  const detailAt = n.word("nonadd-fix", "from the detail rows");
  const ratioAt = n.word("nonadd-fix", "For a ratio");
  const divideAt = n.word("nonadd-fix", "divide in the query");
  const end = n.beat("nonadd-fix").to;

  const bg = geoOf(BALANCE, X0, y(446), h, OPTS);
  const bal = BALANCE.cols.indexOf("balance");
  const lastMonth = BALANCE.rows.reduce((m, r) => (r[0] > m ? r[0] : m), "");
  const march = BALANCE.rows.map((r, i) => (r[0] === lastMonth ? i : -1)).filter((i) => i >= 0);
  const perDay = Object.fromEntries(VISITS_PER_DAY.rows.map((r) => [r[0], r[1]]));
  const both = new Set(WHO.Mon.filter((p) => WHO.Tue.includes(p)));
  const everyone = [...new Set([...WHO.Mon, ...WHO.Tue])];
  const closing = CLOSING.rows.map((r) => money(r[1])).join(" + ");
  // The quarter's sum, term by term: each month-end's total across both accounts.
  const monthEnds = MONTH_ENDS.rows.map((r) => money(r[1]));
  if (MONTH_ENDS.rows.reduce((t, r) => t + Number(r[1]), 0) !== Number(OVER_TIME)) throw new Error("the month-ends must add to the quarter's sum");
  const sumOfDays = Number(perDay.Mon) + Number(perDay.Tue);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={amountAt} level={-28} />
      <Sfx name="el-tap" at={semiAt} level={-28} />
      <Sfx name="el-pop" at={sixteenAt} level={-29} />
      <Sfx name="el-scratch" at={neverAt} level={-34} />
      <Sfx name="el-pop" at={lastAt + 6} level={-29} />
      <Sfx name="el-sprinkle" at={monAt} level={-32} />
      <Sfx name="el-scratch" at={sixAt} level={-35} />
      <Sfx name="el-chime" at={recountAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is the difference between additive, semi-additive, and non-additive measures?
        </QuestionCard>

        {/* ── The three kinds, lit in turn ── */}
        <div style={{ position: "absolute", left: X0, top: y(KINDS_Y), display: "flex", alignItems: "flex-start", gap: KIND_GAP }}>
          <Kind
            at={kindAt[0]}
            litFrom={amountAt}
            litTo={semiAt}
            name="additive"
            eg="an amount"
            noteAt={everyAt}
            note={<span style={{ ...note(22, OK_INK), fontWeight: 650 }}>sums across every dimension</span>}
          />
          <Gap at={kindAt[1]} />
          <Kind at={kindAt[1]} litFrom={semiAt} litTo={nonAt} name="semi-additive" eg="a balance" />
          <Gap at={kindAt[2]} />
          {/* Its note under it, as "sums across every dimension" sits under
              additive. */}
          <Kind
            at={kindAt[2]}
            litFrom={nonAt}
            litTo={end + 60}
            name="non-additive"
            eg="a ratio, a distinct count"
            noteAt={ratiosAt}
            note={<span style={{ ...note(22, INK), fontWeight: 650 }}>don&apos;t sum at all</span>}
          />
        </div>

        {/* ── A balance: month-end snapshots of two accounts ── */}
        <TableName g={bg} at={semiAt}>
          <Mono>fact_balance</Mono>
        </TableName>
        <DataTable
          g={bg}
          cols={colsOf(BALANCE)}
          at={semiAt}
          rows={BALANCE.rows.map((cells, i) => ({ cells, at: semiAt + 6 + i * 3 }))}
          marks={[
            ...march.map((r, k) => ({ row: r, col: bal, at: acrossAt + 4 + k * 4, color: MARK_OK, out: monthsAt })),
            ...BALANCE.rows.map((_, i) => ({ row: i, col: bal, at: monthsAt + 4 + i * 3, color: MARK_BAD, out: lastAt })),
            ...march.map((r, k) => ({ row: r, col: bal, at: lastAt + 4 + k * 4, color: MARK_OK })),
          ]}
        />
        <Verdict at={rightAt} x={R_X} y={y(430)} label={`across accounts, ${lastMonth}`} value={money(ACROSS)} tone="ok" />
        <Verdict
          at={nonsenseAt}
          x={R_X}
          y={y(492)}
          label={
            <>
              the quarter&apos;s month-ends,{" "}
              {monthEnds.map((v, i) => (
                <React.Fragment key={v + i}>
                  {i ? " + " : ""}
                  <Num>{v}</Num>
                </React.Fragment>
              ))}{" "}
              =
            </>
          }
          value={money(OVER_TIME)}
          tone="bad"
          strikeAt={neverAt}
        />
        <Note at={fortyAt + 4} x={R_X} y={y(540)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>money that never existed</span>
        </Note>
        <Verdict
          at={lastAt}
          x={R_X}
          y={y(600)}
          label="last value per account"
          value={
            <>
              {closing} = <span style={{ color: OK_INK }}>{money(CLOSING_TOTAL)}</span>
            </>
          }
        />
        <Note at={averageAt} x={R_X} y={y(652)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>or the average over the period</span>
        </Note>

        {/* ── A distinct count: never summed ── */}
        {(["Mon", "Tue"] as const).map((d, k) => {
          const at = d === "Mon" ? monAt : tueAt;
          return (
            <div key={d} style={{ position: "absolute", left: R_X, top: y(732) + k * h(54), display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...label(23, INK_SOFT), fontWeight: 600, width: 64, opacity: ease(frame, at - 2, 10) }}>{d}</span>
              {WHO[d].map((p, i) => (
                <Who key={p} name={p} at={at + 2 + i * 3} both={both.has(p) ? fourAt : undefined} />
              ))}
              <span style={{ ...note(24, INK), fontWeight: 600, marginLeft: 12, opacity: ease(frame, at + 10, 10) }}>
                <Num>{perDay[d]}</Num>
              </span>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: R_X,
            top: y(732) + 2 * h(54),
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: ease(frame, fourAt - 2, 10),
          }}
        >
          <span style={{ ...label(23, INK_SOFT), fontWeight: 600, width: 64 }}>both</span>
          {everyone.map((p, i) => (
            <Who key={p} name={p} at={fourAt + i * 2} />
          ))}
          <span style={{ ...note(26, OK_INK), fontWeight: 800, marginLeft: 12 }}>
            <Num>{VISITS_BOTH}</Num> people,{" "}
            <span style={{ color: ACCENT_INK, fontWeight: 600, opacity: ease(frame, sixAt - 2, 10) }}>
              not <Num>{sumOfDays}</Num>
            </span>
          </span>
        </div>
        {/* One remedy for each kind, beside the visitors they are about. */}
        <Note at={recountAt} x={FIX_X} y={y(732) - h(6)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            distinct counts: recount
            <br />
            <span style={{ opacity: ease(frame, detailAt, 10) }}>from the detail rows</span>
          </span>
        </Note>
        <Note at={ratioAt} x={FIX_X} y={y(732) + h(102)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            ratios: store both parts,
            <br />
            <span style={{ opacity: ease(frame, divideAt - 2, 10) }}>divide in the query</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
