import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COMPOUND } from "./data";
import {
  DataTable,
  Drift,
  Listing,
  ListingTitle,
  listingWidth,
  MARK_GRAY,
  MARK_RED,
  resultGeometry,
  SmallMono,
  TableName,
  tableGeometry,
  TestResult,
  X0,
} from "./parts";

const FIG_Y = 340;
const SIZE = 20;
const TABLE_X = 1270;
/** A key's cells, picked out in the data blue. */
const MARK_KEY = `color-mix(in srgb, ${BAR} 20%, transparent)`;

/**
 * Question 5. The video's own seven order lines on the right, keyed by the
 * pair (order_id, line_number), so an order_id repeats by design. A unique
 * test on order_id alone, beside what it returns: orders 1 and 3, three
 * rows each, a failure; order 1's three lines are labelled a false alarm,
 * in neutral ink. Then the page's dbt_utils YAML, and the singular test that
 * groups by both, beside its one row: order 3's line 2, the real duplicate.
 * The table's caption becomes the grain.
 */
export const CompoundScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("compound").from;
  const qAt = n.word("compound", "Question five");
  const qTextAt = n.word("compound", "How do you test the uniqueness");
  const linesAt = n.word("compound", "Order lines have one row");
  const keyAt = n.word("compound", "per order and line number");
  const repeatsAt = n.word("compound", "an order ID repeats by design");
  const aloneAt = n.word("compound-wrong", "A unique test on the order ID alone");
  const failsAt = n.word("compound-wrong", "fails on orders one and three");
  const fineAt = n.word("compound-wrong", "Order one is fine");
  const threeLinesAt = n.word("compound-wrong", "it just has three lines");
  const pairAt = n.word("compound-pair", "Test the pair");
  const utilsAt = n.word("compound-pair", "unique combination of columns");
  const singularAt = n.word("compound-pair", "a singular test that groups by both");
  const onlyAt = n.word("compound-pair", "It returns only order three's line two");
  const realAt = n.word("compound-pair", "the real duplicate");
  const grainAt = n.word("compound-grain", "The test is the grain");
  const writtenAt = n.word("compound-grain", "one row per order and line number");
  const end = n.beat("compound-grain").to;

  const top = y(FIG_Y);

  // ── The order lines ──
  const t = COMPOUND.table;
  const tg = tableGeometry({
    x: TABLE_X,
    top,
    cols: t.cols.map((name) => ({ name, tag: name === "sku" ? undefined : { text: "key", at: 0 } })),
    rows: t.rows,
    headH: h(42),
    rowH: h(40),
    headSize: 20,
    bodySize: 22,
    pad: 20,
  });
  const rowsOf = (id: string) => t.rows.map((r, i) => (r[0] === id ? i : -1)).filter((i) => i >= 0);
  const repeated = t.cols.indexOf("order_id");
  const first = COMPOUND.orderOnly.result.rows[0][0];
  const dupRows = t.rows.map((r, i) => (r[0] === COMPOUND.pair.result.rows[0][0] && r[1] === COMPOUND.pair.result.rows[0][1] ? i : -1)).filter((i) => i >= 0);
  const firstRows = rowsOf(first);
  const firstMid = (tg.rowTop(firstRows[0]) + tg.rowTop(firstRows[firstRows.length - 1] + 1)) / 2;

  // ── unique on order_id alone ──
  const only = COMPOUND.orderOnly;
  const onlyW = listingWidth(only.sql, SIZE);
  const org = resultGeometry(X0 + onlyW + 28, top, only.result.cols, only.result.rows, h, 20);
  const wrongOut = pairAt - 4;

  // ── The pair: the page's YAML, and the singular test that groups by both ──
  const pair = COMPOUND.pair;
  // Clear of the YAML listing above: at least 40px between the two groups.
  const pairTop = y(600);
  const pairW = listingWidth(pair.sql, SIZE);
  const prg = resultGeometry(X0 + pairW + 28, pairTop, pair.result.cols, pair.result.rows, h, 20);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={linesAt} level={-34} />
      <Sfx name="el-tap" at={keyAt + 2} level={-34} />
      <Sfx name="el-pencil" at={repeatsAt + 2} level={-36} />
      <Sfx name="el-sprinkle" at={aloneAt} level={-35} />
      <Sfx name="el-tap" at={failsAt + 4} level={-32} />
      <Sfx name="el-pencil" at={fineAt + 2} level={-35} />
      <Sfx name="el-whoosh" at={pairAt - 4} level={-37} />
      <Sfx name="el-sprinkle" at={utilsAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={singularAt} level={-35} />
      <Sfx name="el-tap" at={onlyAt + 4} level={-32} />
      <Sfx name="el-chime" at={writtenAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={qTextAt - 4} size={58}>
          How do you test the uniqueness of a compound key?
        </QuestionCard>

        {/* ── Seven order lines, keyed by the pair ── */}
        <TableName g={tg} at={linesAt}>
          fct_order_lines
          <span style={{ color: INK_SOFT, opacity: ease(frame, keyAt, 10) }}>
            {" "}
            · key: (<SmallMono color={BLUE_INK}>order_id</SmallMono>, <SmallMono color={BLUE_INK}>line_number</SmallMono>)
          </span>
        </TableName>
        <DataTable
          g={tg}
          cols={t.cols.map((name) => ({
            name,
            numeric: name !== "sku",
            ink: name === "sku" ? INK : BLUE_INK,
            tag: name === "sku" ? undefined : { text: "key", at: keyAt + 4, color: BLUE_INK },
          }))}
          rows={t.rows.map((cells, i) => ({ cells, at: linesAt + 4 + i * 3 }))}
          at={linesAt}
          marks={t.rows.flatMap((r, i) =>
            rowsOf(r[0]).length > 1 ? [{ row: i, col: repeated, at: repeatsAt + 2 + i * 2, out: aloneAt, color: MARK_KEY }] : [],
          )}
          bands={[
            ...firstRows.map((row, k) => ({ row, at: fineAt + k * 3, out: pairAt, color: MARK_GRAY })),
            ...dupRows.map((row, k) => ({ row, at: onlyAt + 6 + k * 4, color: MARK_RED })),
          ]}
        />
        <Note at={fineAt + 6} x={tg.x - 26} y={firstMid - h(30)} align="right" out={pairAt}>
          <div style={{ ...note(22, INK), whiteSpace: "nowrap", textAlign: "right" }}>False alarm:</div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", textAlign: "right", opacity: ease(frame, threeLinesAt, 10) }}>three lines</div>
        </Note>
        <Note at={realAt} x={tg.x - 26} y={(tg.rowTop(dupRows[0]) + tg.rowTop(dupRows[dupRows.length - 1] + 1)) / 2 - h(15)} align="right">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>The real duplicate</span>
        </Note>
        <Note at={grainAt} x={tg.x} y={tg.rowTop(t.rows.length) + h(22)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            One row per (<SmallMono>order_id</SmallMono>, <SmallMono>line_number</SmallMono>)
          </span>
        </Note>
        <Note at={writtenAt + 4} x={tg.x} y={tg.rowTop(t.rows.length) + h(62)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>The grain, written down as a test</span>
        </Note>

        {/* ── unique on order_id alone: the wrong test ── */}
        <ListingTitle x={X0} top={top} at={aloneAt} out={wrongOut}>
          <SmallMono>unique</SmallMono> on <SmallMono>order_id</SmallMono> alone
        </ListingTitle>
        <Listing lines={only.sql} x={X0} top={top} size={SIZE} at={aloneAt} out={wrongOut} marks={[{ line: "GROUP BY", at: aloneAt + 12 }]} />
        <TestResult
          g={org}
          cols={only.result.cols.map((name) => ({ name, numeric: true }))}
          rows={only.result.rows}
          at={failsAt - 4}
          verdict={[{ at: failsAt, tone: "bad", text: `${only.result.rows.length} rows: fail` }]}
          bands={[{ row: 0, at: fineAt + 2, color: MARK_GRAY }]}
          out={wrongOut}
        />

        {/* ── The pair ── */}
        <ListingTitle x={X0} top={top} at={pairAt}>
          The page&rsquo;s YAML: <SmallMono>dbt_utils</SmallMono>
        </ListingTitle>
        <Listing lines={COMPOUND.yaml} lang="yaml" x={X0} top={top} size={SIZE} at={pairAt + 2} marks={[{ line: "combination_of_columns: [", text: "[order_id, line_number]", at: utilsAt + 4 }]} />
        <ListingTitle x={X0} top={pairTop} at={singularAt}>
          Or a singular test, grouped by both
        </ListingTitle>
        <Listing lines={pair.sql} x={X0} top={pairTop} size={SIZE} at={singularAt} marks={[{ line: "GROUP BY", at: singularAt + 14 }]} />
        <TestResult
          g={prg}
          cols={pair.result.cols.map((name) => ({ name, numeric: true }))}
          rows={pair.result.rows}
          at={onlyAt - 4}
          verdict={[{ at: onlyAt, tone: "bad", text: "1 row: fail" }]}
          bands={[{ row: 0, at: realAt, color: MARK_RED }]}
        />
        <Note at={onlyAt + 10} x={prg.x} y={prg.rowTop(1) + h(16)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>Order 3, line 2, twice</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

