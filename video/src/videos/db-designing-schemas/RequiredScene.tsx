import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO, SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { AFTER_ADD, BACKFILL_VALUE, BACKFILLED, MISSING, ONE_STEP, ONE_STEP_SQL, PRIORITY_REQUIRED, TASKS } from "./data";
import { DbTable, ErrorBox, Head, KEY, Kicker, Mark, MARK_BAD, Ping, type TableGeometry, tableGeometry } from "./parts";

const X = 120;
const STEPS_X = 900;
/** The statement tried in one step, set across the right of the page until the steps take over. */
const SQL_X = 1200;
/** ONE_STEP_SQL in two lines, its NOT NULL apart so it can be marked. */
const SQL = ONE_STEP_SQL.match(/^(ALTER TABLE \S+) (ADD COLUMN .* )(NOT NULL)(;)$/);
if (!SQL) throw new Error(`unexpected one-step SQL: ${ONE_STEP_SQL}`);

/**
 * A required column, after evolving-schemas-safely's "Add a required column
 * in safe steps": in one step Postgres refuses, because the two tasks already
 * there would hold nulls; in four steps (add it nullable, backfill, check,
 * tighten) it holds. The refused column is drawn dashed where it would go,
 * and the real one arrives in the same place.
 */
export const RequiredScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const priorityFrom = n.beat("priority").from;
  const priorityAt = n.word("priority", "priority");
  const requiredAt = n.word("priority", "required");
  const refusesAt = n.word("priority", "refuses");
  const alreadyAt = n.word("why", "already there");
  const noPriorityAt = n.word("why", "no priority");
  const brokenAt = n.word("why", "broken");
  const safeFrom = n.beat("safe").from;
  const stepsAt = n.word("safe", "steps");
  const emptyAt = n.word("safe", "empty");
  const backfillAt = n.word("safe", "Backfill");
  const normalAt = n.word("safe", "normal");
  const checkAt = n.word("safe", "Check");
  const missingAt = n.word("safe", "missing");
  const makeAt = n.word("safe", "required");
  const decisionAt = n.word("means", "design decision");
  const meanAt = n.word("means", "MEAN");
  const oldRowsAt = n.word("means", "old rows");

  // Columns 3 and 4 share one place: the priority Postgres refuses, then the
  // one added nullable.
  const cols = ["id", "title", "status", "priority", "priority"];
  const rows = TASKS.map((t, i) => [...t, null, AFTER_ADD[i][3]]);
  const g0 = tableGeometry({ x: X, top: y(330), cols, rows, extra: [["", "", "", BACKFILL_VALUE, BACKFILL_VALUE]], headH: h(52), rowH: h(62) });
  // Room after the title for the NOT NULL badge.
  const pw = g0.widths[3] + 128;
  const widths = [...g0.widths.slice(0, 3), pw, pw];
  const xs = [...g0.xs.slice(0, 4), g0.xs[3]];
  const g = { ...g0, widths, xs, width: widths.slice(0, 4).reduce((a, b) => a + b, 0) };

  const ghostOut = stepsAt - 2;
  const steps = [
    { at: emptyAt, title: "Add the column, nullable", detail: "old rows get null" },
    { at: backfillAt, title: "Backfill the old rows", detail: `${BACKFILLED} rows set to ${BACKFILL_VALUE}` },
    { at: checkAt, title: "Check none is missing", detail: `${MISSING} rows missing`, detailAt: missingAt },
    { at: makeAt, title: "Then make it required", detail: PRIORITY_REQUIRED ? "NOT NULL holds" : "" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={requiredAt - 4} level={-30} />
      <Sfx name="el-tap" at={refusesAt - 2} level={-27} />
      {steps.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s.at - 2} level={-29} />
      ))}
      <Sfx name="el-sprinkle" at={normalAt - 2} level={-34} />
      <Sfx name="el-chime" at={n.beat("means").from - 16} level={-33} />

      <Kicker at={priorityFrom - 10}>A required column</Kicker>
      <Head at={priorityFrom - 6} second={refusesAt} out={safeFrom - 6} italic="Refused.">
        Required, in one step?
      </Head>
      <Head at={safeFrom - 2} second={makeAt - 4} italic="then require it.">
        Add, backfill, check,
      </Head>
      <FigLabel n="4" title="The tasks table gets a priority" at={priorityFrom + 4} x={X} y={y(262)} />

      {/* "Add it as required, in one step": the statement tried, its NOT NULL marked as Postgres refuses it. */}
      <Ink at={requiredAt - 4} dur={18} out={ghostOut} style={{ left: SQL_X, top: g.top }}>
        <div
          style={{
            padding: "14px 22px",
            borderTop: `2px solid ${INK}`,
            borderBottom: `1px solid ${HAIRLINE}`,
            background: `color-mix(in srgb, ${ds("yellow", 200)} 34%, transparent)`,
            fontFamily: MONO,
            fontSize: 26,
            lineHeight: 1.5,
            color: INK,
            whiteSpace: "pre",
          }}
        >
          <div>{SQL[1]}</div>
          <div>
            {SQL[2]}
            <Mark at={refusesAt - 2} color={MARK_BAD}>
              {SQL[3]}
            </Mark>
            {SQL[4]}
          </div>
        </div>
      </Ink>

      <DbTable
        g={g}
        cols={cols}
        rows={rows.map((cells, i) => ({ cells, at: priorityFrom + 6 + i * 4 }))}
        at={priorityFrom}
        numeric={[0]}
        colAt={{ 3: requiredAt - 2, 4: emptyAt }}
        ghostCols={[3]}
        ghostOut={ghostOut}
        badges={[{ col: 4, at: makeAt, text: "NOT NULL" }]}
        marks={[
          ...TASKS.map((_, i) => ({ row: i, col: 3, at: noPriorityAt + i * 4, color: MARK_BAD })),
          ...TASKS.map((_, i) => ({ row: i, col: 4, at: decisionAt + i * 4 })),
        ]}
        swaps={TASKS.map((_, i) => ({ row: i, col: 4, at: normalAt + i * 4, value: BACKFILL_VALUE }))}
      />
      {/* "The tasks already there", and later "what the old rows mean": the rows lit across. */}
      {TASKS.map((_, i) => (
        <React.Fragment key={i}>
          <Band g={g} row={i} at={alreadyAt + i * 5} out={noPriorityAt + 10} />
          <Band g={g} row={i} at={oldRowsAt + i * 5} />
        </React.Fragment>
      ))}
      {/* "Priority": the new requirement, beside the table it lands on. */}
      <Ink at={priorityAt - 2} dur={14} out={stepsAt - 4} style={{ left: g.x + g.width + 30, top: g.top + 8, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK_SOFT }}>every task needs one</span>
      </Ink>
      <ErrorBox x={X} top={g.rowTop(TASKS.length) + 40} width={1000} at={refusesAt - 2} out={ghostOut} message={ONE_STEP.message} detail={ONE_STEP.detail} />
      <Ink at={brokenAt - 4} dur={14} out={ghostOut} style={{ left: X, top: g.rowTop(TASKS.length) + 150, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK }}>broken the moment it existed</span>
      </Ink>

      {/* ── The four steps ── */}
      {steps.map((s, i) => {
        const top = y(330) + i * h(86);
        const done = ease(frame, s.at + 8, 10);
        const lit = i === 1 ? ease(frame, decisionAt - 2, 12) : 0;
        return (
          <Ink key={s.title} at={s.at - 4} dur={14} style={{ left: STEPS_X, top, display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                boxSizing: "border-box",
                border: `2px solid ${KEY}`,
                background: `color-mix(in srgb, ${KEY} ${Math.round(done * 100)}%, ${PAPER})`,
                color: done > 0.5 ? PAPER : INK,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              {i + 1}
            </span>
            <span style={{ ...label(26, INK), fontWeight: 600, position: "relative" }}>
              <span style={{ position: "absolute", left: "-0.2em", right: "-0.2em", top: "0.05em", bottom: "-0.05em", background: HIGHLIGHT, borderRadius: "0.14em", opacity: lit }} />
              <span style={{ position: "relative" }}>{s.title}</span>
            </span>
            <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, (s.detailAt ?? s.at) + 4, 12) }}>{s.detail}</span>
          </Ink>
        );
      })}
      <Ping x={g.xs[4] + 60} y={g.top + g.headH / 2} at={makeAt + 2} color={KEY} r={34} />

      <Ink at={decisionAt - 2} dur={16} style={{ left: X, top: g.rowTop(TASKS.length) + 44, whiteSpace: "nowrap" }}>
        <span style={{ ...body(32, true), color: INK }}>
          A backfill decides what the old rows <Mark at={meanAt - 2}>mean</Mark>.
        </span>
      </Ink>
    </AbsoluteFill>
  );
};

/** A highlighter wash across one row of a table, multiplied in so its text stays dark. */
const Band: React.FC<{ g: TableGeometry; row: number; at: number; out?: number }> = ({ g, row, at, out }) => {
  const frame = useCurrentFrame();
  const w = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (w <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: g.x,
        top: g.rowTop(row) + 4,
        width: g.widths.slice(0, 4).reduce((a, b) => a + b, 0) * w,
        height: g.rowH - 8,
        background: HIGHLIGHT,
        mixBlendMode: "multiply",
        opacity: 1 - o,
      }}
    />
  );
};
