import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ACROSS, BALANCE, CLOSING, CLOSING_TOTAL, money, OVER_TIME, VISITS_BOTH, VISITS_PER_DAY } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK_BAD, MARK_OK, Mono, OK_INK, Strike, TableName, Verdict, X0 } from "./parts";

const R_X = 680;
const OPTS = { headH: 46, rowH: 50, bodySize: 24, headSize: 21 } as const;
/** Who visited on each day: the video's own rows, counted in DuckDB. */
const WHO: Record<string, readonly string[]> = { Mon: ["Ada", "Ben", "Cy"], Tue: ["Ben", "Cy", "Di"] };

/** A kind of measure, lit while the narration is on it. */
const Kind: React.FC<{ at: number; litFrom: number; litTo: number; x: number; y: number; name: string; eg: string }> = ({
  at,
  litFrom,
  litTo,
  x,
  y,
  name,
  eg,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const lit = Math.min(ease(frame, litFrom, 10), 1 - ease(frame, litTo, 10));
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: p, whiteSpace: "nowrap" }}>
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
      <span style={{ position: "relative", ...label(25, INK), fontWeight: 700 }}>{name}</span>
      <span style={{ position: "relative", ...note(23, INK_SOFT), marginLeft: 12 }}>{eg}</span>
    </div>
  );
};

/** A visitor, as a small chip. */
const Who: React.FC<{ name: string; at: number; both?: number }> = ({ name, at, both }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 14));
  const b = both === undefined ? 0 : ease(frame, both, 10);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 14px 4px",
        borderRadius: 999,
        border: `2px solid ${BAR}`,
        background: b > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${b * 100}%, ${PAPER})` : PAPER,
        ...label(22, BLUE_INK),
        fontWeight: 700,
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
 * on Tuesday are four people.
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
  const partsAt = n.word("nonadd", "Store the parts");
  const computeAt = n.word("nonadd", "compute the ratio in the query");
  const end = n.beat("nonadd").to;

  const bg = geoOf(BALANCE, X0, y(446), h, OPTS);
  const bal = BALANCE.cols.indexOf("balance");
  const lastMonth = BALANCE.rows.reduce((m, r) => (r[0] > m ? r[0] : m), "");
  const march = BALANCE.rows.map((r, i) => (r[0] === lastMonth ? i : -1)).filter((i) => i >= 0);
  const perDay = Object.fromEntries(VISITS_PER_DAY.rows.map((r) => [r[0], r[1]]));
  const both = new Set(WHO.Mon.filter((p) => WHO.Tue.includes(p)));
  const everyone = [...new Set([...WHO.Mon, ...WHO.Tue])];
  const closing = CLOSING.rows.map((r) => money(r[1])).join(" + ");
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
      <Sfx name="el-chime" at={partsAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is the difference between additive, semi-additive, and non-additive measures?
        </QuestionCard>

        {/* ── The three kinds, lit in turn ── */}
        <Kind at={kindAt[0]} litFrom={amountAt} litTo={semiAt} x={X0} y={y(318)} name="additive" eg="an amount" />
        <Kind at={kindAt[1]} litFrom={semiAt} litTo={nonAt} x={X0 + 440} y={y(318)} name="semi-additive" eg="a balance" />
        <Kind at={kindAt[2]} litFrom={nonAt} litTo={end + 60} x={X0 + 960} y={y(318)} name="non-additive" eg="a ratio, a distinct count" />
        <Note at={everyAt} x={X0} y={y(318) + h(44)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>sums across every dimension</span>
        </Note>

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
        <Verdict at={nonsenseAt} x={R_X} y={y(492)} label="across the quarter's month-ends" value={money(OVER_TIME)} tone="bad" strikeAt={neverAt} />
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
          size={27}
        />
        <Note at={averageAt} x={R_X} y={y(652)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>or the average over the period</span>
        </Note>

        {/* ── A distinct count: never summed ── */}
        {(["Mon", "Tue"] as const).map((d, k) => {
          const at = d === "Mon" ? monAt : tueAt;
          return (
            <div key={d} style={{ position: "absolute", left: R_X, top: y(732) + k * h(54), display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...label(23, INK_SOFT), fontWeight: 700, width: 64, opacity: ease(frame, at - 2, 10) }}>{d}</span>
              {WHO[d].map((p, i) => (
                <Who key={p} name={p} at={at + 2 + i * 3} both={both.has(p) ? fourAt : undefined} />
              ))}
              <span style={{ ...note(24, INK), fontWeight: 700, marginLeft: 12, opacity: ease(frame, at + 10, 10) }}>
                <Num>{perDay[d]}</Num>
              </span>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: R_X, top: y(732) + 2 * h(54), display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, fourAt - 2, 10) }}>
          <span style={{ ...label(23, INK_SOFT), fontWeight: 700, width: 64 }}>both</span>
          {everyone.map((p, i) => (
            <Who key={p} name={p} at={fourAt + i * 2} />
          ))}
          <span style={{ ...note(26, OK_INK), fontWeight: 800, marginLeft: 12 }}>
            <Num>{VISITS_BOTH}</Num> people,
          </span>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 700, opacity: ease(frame, sixAt - 2, 10) }}>
            not <Strike at={sixAt + 4}>{sumOfDays}</Strike>
          </span>
        </div>
        <Note at={ratiosAt} x={X0} y={bg.rowTop(BALANCE.rows.length) + h(30)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>ratios and distinct counts don&apos;t sum</span>
        </Note>
        <Note at={partsAt} x={X0} y={bg.rowTop(BALANCE.rows.length) + h(74)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Store the parts;
            <br />
            <span style={{ opacity: ease(frame, computeAt - 2, 10) }}>compute the ratio in the query.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
