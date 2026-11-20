import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { ColumnRule, NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { COST, FILTER, LATE, REFRESH, thousands } from "./data";
import { Cell, type CellTone, Count, costScale, CostChart, Drift, Mark, X0 } from "./parts";

const TL = 330;
const P = 46;
const X = (id: number) => TL + (id - 0.5) * P;
const COL2 = 800;
const CH = { x0: 230, x1: 860 };
const SPLIT_X = 1200;
const SPLIT_W = 520;
/** Layout values (through `y()`). */
const ROW_C = { cols: 286, follow: 382, answer: 418, fct: 486, raw: 546, note1: 606, note2: 642, chartLabel: 296, chartTop: 352, chartBot: 580, split: 340, rule: 680, rule2: 720, next: 778, fixes: 574 };

/**
 * Question 7. A normal run filters and merges; --full-refresh skips the
 * check and rebuilds from every row. Why refreshes are still needed: the
 * strict filter's table from question 2 (25 of 27), event 3 deleted
 * upstream; the next normal run finds nothing, and the table is wrong in
 * three rows (25 and 26 missing, 3 extra). The full refresh reads all 26 and
 * matches. Then its price, on the hook's chart: the last refresh is
 * 5,960,000 rows at day 720, and the twelve refreshes are 87% of the
 * incremental model's two years. The rule, and the bridge into Part 5.
 */
export const RefreshScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("refresh").from;
  const qAt = n.word("refresh", "Question seven");
  const textAt = n.word("refresh", "What is the difference");
  const normalAt = n.word("refresh", "A normal run filters");
  const mergesAt = n.word("refresh", "merges them in");
  const fullAt = n.word("refresh", "A full refresh ignores");
  const everyAt = n.word("refresh", "from every source row");

  const whyAt = n.word("refresh-why", "So why are periodic full refreshes");
  const becauseAt = n.word("refresh-why", "Because incremental logic");

  const takeAt = n.word("refresh-drift", "Take the strict filter's table");
  const deleteAt = n.word("refresh-drift", "delete event three upstream");
  const nothingAt = n.word("refresh-drift", "The next normal run finds nothing");
  const wrongAt = n.word("refresh-drift", "wrong in three rows");
  const missingAt = n.word("refresh-drift", "two events missing");
  const existsAt = n.word("refresh-drift", "one that no longer exists");

  const readsAt = n.word("refresh-fix", "A full refresh reads all twenty-six");
  const exactlyAt = n.word("refresh-fix", "matches the source exactly");
  const schemaAt = n.word("refresh-fix", "a schema change");

  const costAt = n.word("refresh-cost", "But it's the expensive run");
  const chartAt = n.word("refresh-cost", "On the chart's table");
  const lastAt = n.word("refresh-cost", "the last refresh reprocesses");
  const sixAt = n.word("refresh-cost", "almost six million rows");
  const twoYearsAt = n.word("refresh-cost", "over two years");
  const twelveAt = n.word("refresh-cost", "the twelve refreshes");
  const shareAt = n.word("refresh-cost", "eighty-seven percent");

  const ruleAt = n.word("refresh-rule", "So treat incremental");
  const optAt = n.word("refresh-rule", "an optimization over a correct full rebuild");
  const standAt = n.word("refresh-rule", "don't let a refresh schedule stand in");
  const largestAt = n.word("refresh-rule", "for the largest models");

  const fixesAt = n.word("next", "Every fix here came down to a query");
  const filterAt = n.word("next", "a filter");
  const dedupAt = n.word("next", "a deduplication");
  const mergeAt = n.word("next", "a merge on a key");
  const nextAt = n.word("next", "Next: advanced SQL");

  const row = (k: keyof typeof ROW_C) => y(ROW_C[k]);
  const phase1Out = costAt - 6;

  // ── The strict run's table, then event 3 deleted upstream ─────────────────
  const loaded = [...Array.from({ length: FILTER.after.target }, (_, i) => i + 1), ...LATE.strict];
  const sourceIds = Array.from({ length: REFRESH.afterStrict.source }, (_, i) => i + 1);
  const extra = REFRESH.extra;
  const missing = REFRESH.missing;
  const rawTones = (id: number): { at: number; tone: CellTone }[] => (extra.includes(id) ? [{ at: deleteAt + 2, tone: "bad" }] : []);
  const fctTones = (id: number): { at: number; tone: CellTone }[] => (extra.includes(id) ? [{ at: existsAt, tone: "bad" }] : []);
  // The refresh: every source row, read again, in green.
  const refreshed = sourceIds.filter((id) => !extra.includes(id));

  // ── The price: the hook's chart, the refreshes' share ─────────────────────
  const top = row("chartTop");
  const bottom = row("chartBot");
  const s = costScale(CH.x0, CH.x1, top, bottom);
  const refreshShare = COST.refreshShare;
  const dailyRows = COST.incrementalTotal - COST.refreshTotal;
  const dailyShare = 100 - refreshShare;
  const bars = [
    { name: `Its ${COST.refreshDays.length} full refreshes`, rows: COST.refreshTotal, share: refreshShare, color: ds("yellow", 500), ink: inkOf.yellow, at: twelveAt },
    { name: `Its ${COST.days - COST.refreshDays.length} daily runs`, rows: dailyRows, share: dailyShare, color: BAR, ink: BLUE_INK, at: twelveAt + 10 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={normalAt} level={-37} />
      <Sfx name="el-pencil" at={fullAt} level={-37} />
      <Sfx name="el-sprinkle" at={takeAt} level={-36} />
      <Sfx name="el-scratch" at={deleteAt + 2} level={-34} />
      <Sfx name="el-tap" at={missingAt} level={-34} />
      <Sfx name="el-tap" at={existsAt} level={-34} />
      <Sfx name="el-sprinkle" at={readsAt + 4} level={-35} />
      <Sfx name="el-chime" at={exactlyAt} level={-33} />
      <Sfx name="el-whoosh" at={costAt} level={-37} />
      <Sfx name="el-tap" at={sixAt} level={-33} />
      <Sfx name="el-pencil" at={twelveAt} level={-36} />
      <Sfx name="el-tap" at={shareAt} level={-32} />
      <Sfx name="el-pencil" at={nextAt - 4} level={-36} />

      <Drift from={from} to={n.beat("next").to + 60}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={52}>
          What is the difference between <span style={{ whiteSpace: "nowrap" }}><QMono>dbt run --full-refresh</QMono></span> and a normal incremental run?
        </QuestionCard>

        {/* ── Two runs, side by side ── */}
        <div style={{ opacity: 1 - ease(frame, phase1Out, 10) }}>
          <Note at={normalAt - 2} x={X0} y={row("cols")}>
            <div style={{ ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>A normal run</div>
            <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginTop: 8 }}>
              filters to new rows<span style={{ opacity: ease(frame, mergesAt, 10) }}>, and merges them in</span>
            </div>
          </Note>
          <ColumnRule x={COL2 - 125} top={row("cols")} height={70} at={fullAt - 2} />
          <Note at={fullAt - 2} x={COL2} y={row("cols")}>
            <div style={{ ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 600 }}>--full-refresh</span>
            </div>
            <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginTop: 8 }}>
              skips the check, drops the table<span style={{ opacity: ease(frame, everyAt, 10) }}>, rebuilds from every source row</span>
            </div>
          </Note>

          <Note at={whyAt - 2} x={X0} y={row("follow")}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
              Follow-up: <span style={{ color: INK }}>Why are periodic full refreshes still needed with incremental models?</span>
            </span>
          </Note>
          <Note at={becauseAt - 2} x={X0} y={row("answer")}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              Incremental logic only sees <Mark at={becauseAt + 10}>what passes its filter</Mark>
            </span>
          </Note>

          {/* The strict filter's table, and its source. */}
          <Note at={takeAt} x={X0} y={row("fct") + 6}>
            <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>fct_events</span>
          </Note>
          <Note at={takeAt} x={X0} y={row("raw") + 6}>
            <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>raw_events</span>
          </Note>
          {sourceIds.map((id, i) => (
            <Cell key={`r${id}`} x={X(id)} y={row("raw")} at={takeAt + 4 + i * 0.6} label={id} tones={rawTones(id)} out={extra.includes(id) ? nothingAt : undefined} />
          ))}
          {extra.map((id) => (
            <Cell key={`gone${id}`} x={X(id)} y={row("raw")} at={nothingAt} label={id} dashed tones={[{ at: nothingAt, tone: "bad" }]} opacity={0.6} />
          ))}
          {loaded.map((id, i) => (
            <Cell key={`f${id}`} x={X(id)} y={row("fct")} at={takeAt + 8 + i * 0.6} out={readsAt} label={id} tones={fctTones(id)} />
          ))}
          {missing.map((id) => (
            <Cell key={`m${id}`} x={X(id)} y={row("fct")} at={missingAt} out={readsAt} label={id} dashed tones={[{ at: missingAt, tone: "bad" }]} />
          ))}
          {refreshed.map((id, i) => (
            <Cell
              key={`n${id}`}
              x={X(id)}
              y={row("raw") + (row("fct") - row("raw")) * ease(frame, readsAt + 2 + i * 0.6, 14)}
              at={readsAt + 2 + i * 0.6}
              label={id}
              tones={[{ at: exactlyAt, tone: "ok" }]}
            />
          ))}
          <Count
            x={X(27) + 40}
            y={row("fct") + 6}
            at={takeAt + 10}
            size={22}
            steps={[
              { at: takeAt, text: <><Num>{REFRESH.afterStrict.target}</Num> rows</>, color: INK_SOFT },
              { at: readsAt + 10, text: <><Num>{REFRESH.refreshed.target}</Num> rows</>, color: OK_INK },
            ]}
          />
          <Count
            x={X(27) + 40}
            y={row("raw") + 6}
            at={takeAt + 6}
            size={22}
            steps={[
              { at: takeAt, text: <><Num>{REFRESH.afterStrict.source}</Num> rows</>, color: INK_SOFT },
              { at: deleteAt + 6, text: <><Num>{REFRESH.drift.source}</Num> rows</>, color: INK_SOFT },
            ]}
          />
          <Note at={nothingAt} x={X0} y={row("note1")} out={readsAt - 4}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              The next normal run finds <Num>{REFRESH.normalFinds}</Num> rows
              <span style={{ color: ACCENT_INK, opacity: ease(frame, wrongAt, 10) }}>
                <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
                <span style={{ opacity: ease(frame, missingAt, 10) }}>
                  {missing.join(" and ")} missing
                </span>
                <span style={{ opacity: ease(frame, existsAt, 10) }}>, {extra.join(", ")} no longer exists</span>
              </span>
            </span>
          </Note>
          <Note at={exactlyAt} x={X0} y={row("note1")}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              Full refresh: every source row,{" "}
              <b style={{ color: OK_INK }}>
                <Num>{REFRESH.refreshed.target}</Num> rows, nothing missing, nothing extra
              </b>
            </span>
          </Note>
          <Note at={schemaAt} x={X0} y={row("note2")}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>It&apos;s also how a schema change gets applied</span>
          </Note>
        </div>

        {/* ── The price ── */}
        <Note at={chartAt - 2} x={X0} y={row("chartLabel")}>
          <span style={{ ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Rows one run processes
            <span style={{ ...label(22, INK_SOFT), fontWeight: 500 }}>
              {" "}
              · the same model, <Num>{thousands(COST.daily)}</Num> rows a day
            </span>
          </span>
        </Note>
        <CostChart x0={CH.x0} x1={CH.x1} top={top} bottom={bottom} at={costAt + 4} fullAt={costAt + 4} fullDur={20} incAt={costAt + 10} incDur={24} lastAt={lastAt} />
        <Note at={lastAt} x={CH.x1 + 26} y={s.ly(COST.lastRefresh.rows) - 16}>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            Last refresh, day <Num>{COST.lastRefresh.day}</Num>
          </div>
          <div style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, sixAt - 4, 10) }}>
            <Num>{thousands(COST.lastRefresh.rows)}</Num> rows
          </div>
        </Note>
        <Note at={costAt + 24} x={CH.x1 + 26} y={s.ly(COST.daily) - 15}>
          <span style={{ ...note(22, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            A day: <Num>{thousands(COST.daily)}</Num>
          </span>
        </Note>
        <Note at={twoYearsAt} x={SPLIT_X} y={row("split")}>
          <span style={{ ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Two years, incremental: <Num>{thousands(COST.incrementalTotal)}</Num> rows
          </span>
        </Note>
        {bars.map((b, i) => {
          const p = ease(frame, b.at, 22);
          if (p <= 0) return null;
          const barTop = row("split") + 56 + i * 96;
          return (
            <div key={b.name} style={{ position: "absolute", left: SPLIT_X, top: barTop, opacity: Math.min(1, p * 2) }}>
              <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
                {b.name}: <Num>{thousands(b.rows)}</Num>
              </div>
              <div style={{ marginTop: 10, height: 30, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: (b.share / 100) * SPLIT_W * p, height: 30, background: b.color, borderRadius: 3 }} />
                <span style={{ ...label(26, b.ink), fontWeight: 600, ...TABULAR, opacity: ease(frame, i === 0 ? shareAt : shareAt + 8, 10) }}>{b.share}%</span>
              </div>
            </div>
          );
        })}

        {/* ── The rule, and the bridge ── */}
        <Note at={ruleAt} x={X0} y={row("rule")}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            Incremental: <Mark at={optAt}>an optimization over a correct full rebuild</Mark>
          </span>
        </Note>
        <Note at={standAt} x={X0} y={row("rule2")}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            A refresh schedule is no substitute for a correct filter
            <span style={{ opacity: ease(frame, largestAt, 10) }}>, and the largest models may not afford one</span>
          </span>
        </Note>
        <Note at={fixesAt} x={SPLIT_X} y={row("fixes")}>
          <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Every fix here was a query:</div>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 6 }}>
            <span style={{ opacity: ease(frame, filterAt, 8) }}>a filter</span>
            <span style={{ opacity: ease(frame, dedupAt, 8) }}>, a deduplication</span>
            <span style={{ opacity: ease(frame, mergeAt, 8) }}>, a merge on a key</span>
          </div>
        </Note>
        <NextLine at={nextAt} x={X0} y={row("next")} width={860}>
          Advanced SQL
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
