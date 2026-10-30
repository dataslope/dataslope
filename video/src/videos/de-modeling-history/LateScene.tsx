import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LATE } from "./data";
import { colsOf, DataTable, Drift, geoOf, lineOf, Listing, listingHeight, MARK_BAD, MARK_KEY, MARK_OK, OK_INK, TableName, X0 } from "./parts";

const ROW1 = 330;
const ROW2 = 580;
const SIZE = 20;
const SIDE_SIZE = 19;
const ROWS = { headH: 38, rowH: 42, bodySize: 21, headSize: 19 } as const;

/** "1110.00" as "1,110.00". */
const dollars = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Question 5, on the video's own three staged orders: order 203 is for
 * customer 77, who is not in dim_customer yet. The inner-join lookup loads
 * two rows (700.00 of 1,110.00) with no error. A placeholder row for 77
 * (key 2002, city Unknown, inferred) lets all three load; when the customer
 * arrives, an UPDATE fills the placeholder in place, and the report shows
 * Tulsa while the fact row still holds the same key. Then the alternative:
 * one shared unknown row, which leaves facts to re-key.
 */
export const LateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("late").from;
  const qAt = n.word("late", "Question five");
  const textAt = n.word("late", "How do you handle late-arriving");
  const orderAt = n.word("late", "an order for customer seventy-seven");
  const beforeAt = n.word("late", "before customer seventy-seven does");
  const lookAt = n.word("late-drop", "Look up its key with an inner join");
  const vanishAt = n.word("late-drop", "the order simply vanishes");
  const sevenAt = n.word("late-drop", "seven hundred dollars loaded");
  const errorAt = n.word("late-drop", "No error");
  const insteadAt = n.word("late-fix", "insert a placeholder row");
  const unknownAt = n.word("late-fix", "its city unknown");
  const inferredAt = n.word("late-fix", "flagged inferred");
  const againstAt = n.word("late-fix", "load the order against that key");
  const arrivesAt = n.word("late-arrive", "When the real customer arrives");
  const placeAt = n.word("late-arrive", "update the placeholder in place");
  const pointsAt = n.word("late-arrive", "The order already points at it");
  const tulsaAt = n.word("late-arrive", "it reports Tulsa");
  const touchedAt = n.word("late-arrive", "the fact table is never touched");
  const sharedAt = n.word("late-shared", "One shared unknown row");
  const minusAt = n.word("late-shared", "key minus one");
  const rekeyAt = n.word("late-shared", "re-keyed later");
  const end = n.beat("late-shared").to;

  // ── Row 1: what arrived, and the dimension it needs ──
  const S = LATE.staged;
  const gs = geoOf(S, X0, y(ROW1) + h(40), h, ROWS);
  const D = LATE.dimAfter;
  const before = LATE.dimBefore.rows;
  const gd = geoOf(D, gs.right + 70, y(ROW1) + h(40), h, { ...ROWS, extra: [["2002", "77", "Unknown", "false"]] });
  const dCity = D.cols.indexOf("city");
  const dInf = D.cols.indexOf("inferred");
  const placeholder = LATE.dimMid.rows[2];
  const sideX = gd.right + 50;
  const sideW = 1824 - sideX;

  // ── Row 2: the lookup, and what it loaded ──
  const Lq = LATE.load;
  const loadTop = y(ROW2) + h(40);
  const loadW = 560;
  const F = LATE.facts;
  const gf = geoOf(F, X0 + loadW + 50, loadTop, h, ROWS);
  const fKey = F.cols.indexOf("customer_key");
  const R = LATE.reportAfter;
  const gr = geoOf(R, gf.right + 50, loadTop, h, { ...ROWS, extra: LATE.report.rows });
  const rCity = R.cols.indexOf("city");

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={orderAt + 4} level={-35} />
      <Sfx name="el-pencil" at={lookAt + 2} level={-36} />
      <Sfx name="el-scratch" at={vanishAt + 4} level={-35} />
      <Sfx name="el-pencil" at={insteadAt + 2} level={-36} />
      <Sfx name="el-tap" at={insteadAt + 10} level={-35} />
      <Sfx name="el-pop" at={againstAt + 4} level={-35} />
      <Sfx name="el-pencil" at={placeAt + 2} level={-36} />
      <Sfx name="el-pop" at={tulsaAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you handle late-arriving dimension members?
        </QuestionCard>

        {/* ── Row 1 ── */}
        <TableName g={gs} at={orderAt - 4}>
          staged_orders
        </TableName>
        <DataTable
          g={gs}
          cols={colsOf(S)}
          at={orderAt - 4}
          rows={S.rows.map((cells, i) => ({ cells, at: orderAt + i * 3 }))}
          marks={[
            { row: 2, col: S.cols.indexOf("customer_id"), at: orderAt + 10, out: vanishAt },
            { row: 2, col: S.cols.indexOf("customer_id"), at: vanishAt + 2, out: againstAt, color: MARK_BAD },
          ]}
          bands={[{ row: 2, at: vanishAt + 2, out: againstAt, color: `color-mix(in srgb, ${ACCENT_INK} 10%, transparent)` }]}
        />
        <TableName g={gd} at={beforeAt - 4}>
          dim_customer
        </TableName>
        <DataTable
          g={gd}
          cols={colsOf(D)}
          at={beforeAt - 4}
          rows={[
            { cells: before[0], at: beforeAt },
            { cells: before[1], at: beforeAt + 3 },
            { cells: placeholder, at: insteadAt + 8, grow: true },
          ]}
          swaps={[
            { row: 2, col: dCity, at: placeAt + 6, value: D.rows[2][dCity] },
            { row: 2, col: dInf, at: placeAt + 12, value: D.rows[2][dInf] },
          ]}
          marks={[
            { row: 2, col: dCity, at: unknownAt, out: arrivesAt },
            { row: 2, col: dInf, at: inferredAt, out: arrivesAt },
            { row: 2, col: D.cols.indexOf("customer_key"), at: againstAt, out: placeAt, color: MARK_KEY },
            { row: 2, col: dCity, at: placeAt + 8, color: MARK_OK },
          ]}
        />
        <Note at={beforeAt + 8} x={gd.x} y={gd.rowTop(2) + h(10)} out={insteadAt + 4}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            no customer <Num>77</Num> yet
          </span>
        </Note>

        {/* The two statements that fix it, beside the table they change. */}
        <Listing
          lines={LATE.placeholder.lines}
          x={sideX}
          top={y(ROW1) + h(40)}
          width={sideW}
          size={SIDE_SIZE}
          at={insteadAt - 2}
          out={arrivesAt - 2}
          title="placeholder"
          marks={[{ line: lineOf(LATE.placeholder.lines, "'Unknown'"), at: unknownAt + 2 }]}
        />
        <Listing
          lines={LATE.arrive.lines}
          x={sideX}
          top={y(ROW1) + h(40)}
          width={sideW}
          size={SIDE_SIZE}
          at={arrivesAt}
          title="when 77 arrives"
          marks={[{ line: lineOf(LATE.arrive.lines, "'Tulsa'"), at: placeAt + 2 }]}
        />

        {/* ── Row 2: the lookup ── */}
        <Listing
          lines={Lq.lines}
          x={X0}
          top={loadTop}
          width={loadW}
          size={SIZE}
          at={lookAt - 2}
          title="the load's key lookup"
          marks={[{ line: lineOf(Lq.lines, "JOIN dim_customer"), at: lookAt + 8, out: againstAt }]}
        />
        <TableName g={gf} at={lookAt + 6}>
          fact_orders, as loaded
        </TableName>
        <DataTable
          g={gf}
          cols={colsOf(F)}
          at={lookAt + 6}
          rows={[
            { cells: F.rows[0], at: lookAt + 12 },
            { cells: F.rows[1], at: lookAt + 15 },
            { cells: F.rows[2], at: againstAt + 4, grow: true },
          ]}
          marks={[
            { row: 2, col: fKey, at: againstAt + 10, out: pointsAt, color: MARK_OK },
            { row: 2, col: fKey, at: pointsAt + 2, color: MARK_KEY },
          ]}
        />
        <Note at={sevenAt} x={gf.x} y={gf.rowTop(2) + h(14)} out={againstAt}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            $<Num>{dollars(LATE.loaded)}</Num> of $<Num>{dollars(LATE.stagedSum)}</Num>
            <span style={{ opacity: ease(frame, errorAt, 10) }}>, and no error</span>
          </span>
        </Note>
        <Note at={againstAt + 10} x={gf.x} y={gf.rowTop(3) + h(14)} out={touchedAt - 2}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>all three loaded</span>
        </Note>

        {/* The report, once the customer is real. */}
        <TableName g={gr} at={pointsAt}>
          the report
        </TableName>
        <DataTable
          g={gr}
          cols={colsOf(R)}
          at={pointsAt}
          rows={R.rows.map((cells, i) => ({ cells, at: pointsAt + 4 + i * 3 }))}
          marks={[{ row: 2, col: rCity, at: tulsaAt + 2, color: MARK_OK }]}
        />
        <Note at={touchedAt + 4} x={gf.x} y={gf.rowTop(3) + h(14)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            the fact still holds <Num>{F.rows[2][fKey]}</Num>: never touched
          </span>
        </Note>

        {/* The other way. */}
        <Note at={sharedAt} x={X0} y={loadTop + listingHeight(Lq.lines.length, SIZE) + h(40)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            or one shared unknown row
            <span style={{ opacity: ease(frame, minusAt, 10) }}>
              , key <b style={{ color: INK }}>−1</b>:
            </span>
            <br />
            <span style={{ opacity: ease(frame, rekeyAt - 4, 10) }}>every fact re-keyed later</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
