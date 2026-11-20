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
import { ADDITIVE } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK_BAD, MARK_OK, money, Mono, OK_INK, Strike, TableName, Verdict, X0 } from "./parts";

const R_X = 680;
/** The remedy's column, right of the visitors. */
const FIX_X = 1360;
const OPTS = { headH: 46, rowH: 50, bodySize: 24, headSize: 21 } as const;
/** Who visited on each day: Data Engineer Part 3's rows, counted in Postgres. */
const WHO: Record<string, readonly string[]> = { Mon: ["Ada", "Ben", "Cy"], Tue: ["Ben", "Cy", "Di"] };

const KINDS_Y = 318;
const KIND_GAP = 64;

/** A kind of measure, lit while the narration is on it, its note under it.
 *  It holds its place before it inks, so the row never reflows. */
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
        <span style={{ position: "absolute", left: -12, right: -12, top: -4, bottom: -6, background: HIGHLIGHT, borderRadius: 6, opacity: lit * 0.8 }} />
        <span style={{ position: "relative", ...label(25, INK), fontWeight: 500 }}>{name}</span>
        <span style={{ position: "relative", ...note(23, INK_SOFT), marginLeft: 12 }}>{eg}</span>
      </div>
      {under ? <div style={{ marginTop: 12, opacity: q, transform: `translateX(${(1 - q) * -18}px)` }}>{under}</div> : null}
    </div>
  );
};

/** The house's hairline between two kinds, centred in the gap. */
const RULE_H = 72;
const Gap: React.FC<{ at: number }> = ({ at }) => (
  <div style={{ position: "relative", width: 1, flex: "none" }}>
    <ColumnRule x={0} top={0} height={RULE_H} at={at + 2} />
  </div>
);

/** A visitor as the house's blue badge; one who came on both days turns
 *  the highlighter's yellow on `both`. */
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
 * Question 6, on Data Engineer Part 3's re-run rows. Revenue sums across
 * anything; a balance (Ada's and Ben's month-ends) sums across accounts,
 * 1,600.00 at the end of March, but not across time, 4,800.00 over the
 * quarter's month-ends, money nobody had: over time it takes the closing
 * balance, 900.00 and 700.00, or the average. A distinct count sums across
 * nothing: three users on Monday and three on Tuesday are four people, and
 * are recounted from the rows at the grain.
 */
export const AdditiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("additive").from;
  const qAt = n.word("additive", "Question six");
  const textAt = n.word("additive", "What is the difference between additive");
  const kindAt = [
    n.word("additive", "additive", { nth: 1 }),
    n.word("additive", "semi-additive"),
    n.word("additive", "non-additive measures"),
  ];
  const revenueAt = n.word("additive", "Revenue is additive");
  const everyAt = n.word("additive", "it sums across every dimension");
  const semiAt = n.word("semi", "A balance is semi-additive");
  const acrossAt = n.word("semi", "Across accounts on one day");
  const fineAt = n.word("semi", "it sums fine");
  const sixteenAt = n.word("semi", "sixteen hundred dollars");
  const timeAt = n.word("semi", "Across time, it doesn't");
  const fortyAt = n.word("semi", "add up to forty-eight hundred");
  const nobodyAt = n.word("semi", "money nobody ever had");
  const closingAt = n.word("semi-fix", "take the closing balance");
  const averageAt = n.word("semi-fix", "or the average");
  const nonAt = n.word("nonadd", "Non-additive measures");
  const nothingAt = n.word("nonadd", "sum across nothing");
  const monAt = n.word("nonadd", "Three users on Monday");
  const tueAt = n.word("nonadd", "three on Tuesday");
  const fourAt = n.word("nonadd", "were four people");
  const recountAt = n.word("nonadd", "Recount them from the rows at the grain");
  const end = n.beat("nonadd").to;

  const B = ADDITIVE.balance;
  const bg = geoOf(B, X0, y(446), h, OPTS);
  const bal = B.cols.indexOf("balance");
  const lastMonth = B.rows.reduce((m, r) => (r[0] > m ? r[0] : m), "");
  const march = B.rows.map((r, i) => (r[0] === lastMonth ? i : -1)).filter((i) => i >= 0);
  const perDay = Object.fromEntries(ADDITIVE.visitsPerDay.rows.map((r) => [r[0], r[1]]));
  const both = new Set(WHO.Mon.filter((p) => WHO.Tue.includes(p)));
  const everyone = [...new Set([...WHO.Mon, ...WHO.Tue])];
  if (String(everyone.length) !== ADDITIVE.visitsBoth) throw new Error("the drawn visitors must be the counted ones");
  const closing = ADDITIVE.closing.rows.map((r) => money(r[1])).join(" + ");
  const monthEnds = ADDITIVE.monthEnds.rows.map((r) => money(r[1]));
  if (ADDITIVE.monthEnds.rows.reduce((t, r) => t + Number(r[1]), 0) !== Number(ADDITIVE.overTime)) throw new Error("the month-ends must add to the quarter's sum");
  const sumOfDays = Number(perDay.Mon) + Number(perDay.Tue);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={revenueAt} level={-29} />
      <Sfx name="el-tap" at={semiAt} level={-29} />
      <Sfx name="el-pop" at={sixteenAt} level={-30} />
      <Sfx name="el-scratch" at={nobodyAt} level={-34} />
      <Sfx name="el-pop" at={closingAt + 6} level={-30} />
      <Sfx name="el-sprinkle" at={monAt} level={-33} />
      <Sfx name="el-scratch" at={fourAt + 8} level={-35} />
      <Sfx name="el-chime" at={recountAt + 4} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is the difference between additive, semi-additive, and non-additive measures?
        </QuestionCard>

        {/* ── The three kinds, lit in turn ── */}
        <div style={{ position: "absolute", left: X0, top: y(KINDS_Y), display: "flex", alignItems: "flex-start", gap: KIND_GAP }}>
          <Kind
            at={kindAt[0]}
            litFrom={revenueAt}
            litTo={semiAt}
            name="Additive"
            eg="revenue"
            noteAt={everyAt}
            note={<span style={{ ...note(22, OK_INK), fontWeight: 500 }}>Sums across every dimension</span>}
          />
          <Gap at={kindAt[1]} />
          <Kind
            at={kindAt[1]}
            litFrom={semiAt}
            litTo={nonAt}
            name="Semi-additive"
            eg="a balance"
            noteAt={timeAt}
            note={<span style={{ ...note(22, INK), fontWeight: 500 }}>Sums across accounts, not time</span>}
          />
          <Gap at={kindAt[2]} />
          <Kind
            at={kindAt[2]}
            litFrom={nonAt}
            litTo={end + 60}
            name="Non-additive"
            eg="a ratio, a distinct count"
            noteAt={nothingAt}
            note={<span style={{ ...note(22, INK), fontWeight: 500 }}>Sums across nothing</span>}
          />
        </div>

        {/* ── A balance: month-end snapshots of two accounts ── */}
        <TableName g={bg} at={semiAt}>
          <Mono>fact_balance</Mono>
        </TableName>
        <DataTable
          g={bg}
          cols={colsOf(B)}
          at={semiAt}
          rows={B.rows.map((cells, i) => ({ cells, at: semiAt + 6 + i * 3 }))}
          marks={[
            ...march.map((r, k) => ({ row: r, col: bal, at: acrossAt + 4 + k * 4, color: MARK_OK, out: timeAt })),
            ...B.rows.map((_, i) => ({ row: i, col: bal, at: timeAt + 4 + i * 3, color: MARK_BAD, out: closingAt })),
            ...march.map((r, k) => ({ row: r, col: bal, at: closingAt + 4 + k * 4, color: MARK_OK })),
          ]}
        />
        <Verdict at={fineAt} x={R_X} y={y(440)} label={`Across accounts, ${lastMonth}`} value={money(ADDITIVE.acrossAccounts)} tone="ok" />
        <Verdict
          at={fortyAt}
          x={R_X}
          y={y(502)}
          label={
            <>
              The quarter&apos;s month-ends,{" "}
              {monthEnds.map((v, i) => (
                <React.Fragment key={v + i}>
                  {i ? " + " : ""}
                  <Num>{v}</Num>
                </React.Fragment>
              ))}{" "}
              =
            </>
          }
          value={money(ADDITIVE.overTime)}
          tone="bad"
          strikeAt={nobodyAt + 4}
        />
        <Note at={nobodyAt} x={R_X} y={y(552)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Money nobody ever had</span>
        </Note>
        <Verdict
          at={closingAt}
          x={R_X}
          y={y(612)}
          label="Closing balance per account"
          value={
            <>
              {closing} = <span style={{ color: OK_INK }}>{money(ADDITIVE.closingTotal)}</span>
            </>
          }
        />
        <Note at={averageAt} x={R_X} y={y(664)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>or the average over the period</span>
        </Note>

        {/* ── A distinct count: never summed ── */}
        {(["Mon", "Tue"] as const).map((d, k) => {
          const at = d === "Mon" ? monAt : tueAt;
          return (
            <div key={d} style={{ position: "absolute", left: R_X, top: y(742) + k * h(54), display: "flex", alignItems: "center", gap: 10, fontSize: 24 }}>
              <span style={{ ...label(23, INK_SOFT), fontWeight: 500, width: 64, opacity: ease(frame, at - 2, 10) }}>{d}</span>
              {WHO[d].map((p, i) => (
                <Who key={p} name={p} at={at + 2 + i * 3} both={both.has(p) ? fourAt : undefined} />
              ))}
              <span style={{ ...note(24, INK), fontWeight: 500, marginLeft: 12, opacity: ease(frame, at + 10, 10) }}>
                <Num>{perDay[d]}</Num>
              </span>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: R_X,
            top: y(742) + 2 * h(54),
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 24,
            opacity: ease(frame, fourAt - 2, 10),
          }}
        >
          <span style={{ ...label(23, INK_SOFT), fontWeight: 500, width: 64 }}>Both</span>
          {everyone.map((p, i) => (
            <Who key={p} name={p} at={fourAt + i * 2} />
          ))}
          <span style={{ ...note(25, OK_INK), fontWeight: 500, marginLeft: 12 }}>
            <Num>{ADDITIVE.visitsBoth}</Num> people
          </span>
          <span style={{ ...note(25, ACCENT_INK), marginLeft: 18, opacity: ease(frame, fourAt + 6, 10) }}>
            <Strike at={fourAt + 8}>
              <Num>
                {perDay.Mon} + {perDay.Tue} = {sumOfDays}
              </Num>
            </Strike>
          </span>
        </div>
        <Note at={recountAt} x={FIX_X} y={y(742) - h(6)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Recount them
            <br />
            from the rows at the grain
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
