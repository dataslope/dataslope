import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, body, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WHERE } from "./data";
import {
  DataTable,
  Drift,
  ErrorBox,
  Listing,
  listingHeight,
  MARK_BAD,
  Mono,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const LIST_Y = 440;
const LIST_W = 760;
const SIZE = 26;
const TABLE_X = 1060;
const TABLE_Y = 470;

/**
 * Question 1, WHERE against HAVING, on the page's 24 orders: the two
 * definitions, the region totals as the groups HAVING filters, the sum put
 * in WHERE and DuckDB's refusal, then the same filter in HAVING and the two
 * regions it keeps.
 */
export const WhereScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("where").from;
  const qAt = n.word("where", "Question");
  const textAt = n.word("where", "What's");
  const rowsAt = n.word("where-rows", "WHERE filters");
  const havingAt = n.word("where-rows", "HAVING filters");
  const askAt = n.word("where-try", "regions");
  const sumAt = n.word("where-try", "put the sum");
  const refusesAt = n.word("where-try", "refuses");
  const errAt = n.word("where-try", "WHERE clause");
  const whyAt = n.word("where-why", "doesn't exist");
  const moveAt = n.word("where-fix", "Move");
  const twoAt = n.word("where-fix", "two regions");
  const end = n.beat("where-fix").to;

  const cols = [{ name: "region" }, { name: "revenue", numeric: true }];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols, rows: WHERE.totals.rows, headH: h(52), rowH: h(60) });
  // HAVING keeps the regions its result names; the rest are set back.
  const kept = new Set(WHERE.having.rows.map((r) => r[0]));
  const listH = listingHeight(WHERE.aggregate.lines.length, SIZE);
  const whereLine = WHERE.aggregate.lines.findIndex((l) => l.startsWith("WHERE"));
  const havingLine = WHERE.having.lines.findIndex((l) => l.startsWith("HAVING"));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={havingAt} level={-32} />
      <Sfx name="el-scratch" at={refusesAt + 2} level={-30} />
      <Sfx name="el-pencil" at={moveAt + 10} level={-34} />
      <Sfx name="el-pop" at={twoAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4}>
          What&apos;s the difference between <QMono>WHERE</QMono> and <QMono>HAVING</QMono>?
        </QuestionCard>

        {/* ── The two definitions ── */}
        <Note at={rowsAt - 4} x={X0} y={y(300)}>
          <span style={{ ...body(36), color: INK, whiteSpace: "nowrap" }}>
            <Mono>WHERE</Mono> filters rows, before anything is grouped.
          </span>
        </Note>
        <Note at={havingAt - 4} x={X0} y={y(356)}>
          <span style={{ ...body(36), color: INK, whiteSpace: "nowrap" }}>
            <Mono>HAVING</Mono> filters groups, after.
          </span>
        </Note>

        {/* ── The groups: revenue by region ── */}
        <TableName g={g} at={havingAt + 4}>
          SUM(amount) by region
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={havingAt + 4}
          rows={WHERE.totals.rows.map((cells, i) => ({
            cells,
            at: havingAt + 8 + i * 3,
            dimAt: kept.has(cells[0]) ? undefined : twoAt,
          }))}
          bands={WHERE.totals.rows.flatMap((cells, i) => (kept.has(cells[0]) ? [{ row: i, at: twoAt + 2 + i * 4 }] : []))}
        />
        <Note at={askAt} x={g.right + 24} y={g.top + g.headH + 2 * g.rowH - 16}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", fontWeight: 650 }}>&gt; 600?</span>
        </Note>

        {/* ── The sum in WHERE, and DuckDB's refusal ── */}
        <Listing
          lines={WHERE.aggregate.lines}
          x={X0}
          top={y(LIST_Y)}
          width={LIST_W}
          size={SIZE}
          at={askAt - 2}
          marks={[{ line: whereLine, at: sumAt + 6, color: MARK_BAD }]}
          out={moveAt - 2}
        />
        <ErrorBox
          x={X0}
          top={y(LIST_Y) + listH + 18}
          width={LIST_W}
          at={refusesAt}
          kind={WHERE.aggregate.kind}
          message={WHERE.aggregate.message}
          markAt={errAt + 4}
          out={moveAt - 2}
        />
        <Note at={whyAt - 6} x={X0} y={y(LIST_Y) + listH + 112} out={moveAt - 2}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            The sum doesn&apos;t exist yet when <Mono>WHERE</Mono> runs.
          </span>
        </Note>

        {/* ── The same filter, in HAVING ── */}
        <Listing
          lines={WHERE.having.lines}
          x={X0}
          top={y(LIST_Y)}
          width={LIST_W}
          size={SIZE}
          at={moveAt + 2}
          marks={[{ line: havingLine, at: moveAt + 12 }]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
