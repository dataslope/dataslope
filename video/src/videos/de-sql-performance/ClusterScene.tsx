import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { CLUSTER, thousands } from "./data";
import { DataTable, Drift, KeyArrow, Listing, OK_INK, PageStrip, TableName, tableGeometry, X0 } from "./parts";

const TOP = 330;
const HEAD_H = 46;
const ROW_H = 50;
const INDEX_X = X0 + 470;
const R_X = 1150;
const R_W = 660;

/**
 * Question 5. Left: Data Analyst Part 1's figure for the same question
 * (da-sql's IndexFigure, copied and re-cued, on its users table and email
 * index): the table stored in id order, then a separate index on email,
 * each entry pointing back at its row. Right: what Postgres does instead. It
 * keeps no clustered index; CLUSTER rewrites the table once in an index's
 * order. Customer 42's twenty rows, on twenty pages before (their real page
 * numbers, from ctid), glide onto the one page they share after, and an
 * order inserted afterwards lands on the table's last page.
 */
export const ClusterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cluster").from;
  const qAt = n.word("cluster", "Question five");
  const textAt = n.word("cluster", "What is the difference");
  const tableAt = n.word("cluster", "A clustered index sets");
  const storedAt = n.word("cluster", "stored in");
  const oneAt = n.word("cluster", "a table gets one");
  const indexAt = n.word("cluster-many", "A non-clustered index");
  const lookupAt = n.word("cluster-many", "separate lookup");
  const manyAt = n.word("cluster-many", "you can have many");
  const pgAt = n.word("cluster-pg", "Postgres has no clustered index");
  const commandAt = n.word("cluster-pg", "Its cluster command");
  const twentyAt = n.word("cluster-pg", "sat on twenty pages");
  const afterAt = n.word("cluster-pg", "after cluster");
  const shareAt = n.word("cluster-pg", "they share one");
  const keptAt = n.word("cluster-decay", "the order isn't kept");
  const lastAt = n.word("cluster-decay", "the table's last page");
  const end = n.beat("cluster-decay").to;

  // ── Left: Data Analyst Part 1's figure ──
  const users = CLUSTER.users.rows;
  const index = CLUSTER.emailIndex.rows;
  const ug = tableGeometry({ x: X0, top: y(TOP), cols: [{ name: "id" }, { name: "email" }], rows: users, headH: h(HEAD_H), rowH: h(ROW_H), bodySize: 24 });
  const ig = tableGeometry({ x: INDEX_X, top: y(TOP), cols: [{ name: "email" }, { name: "id" }], rows: index, headH: h(HEAD_H), rowH: h(ROW_H), bodySize: 24 });
  const rowOf = (id: string) => users.findIndex((r) => r[0] === id);
  const leftDim = pgAt;

  // ── Right: CLUSTER in Postgres ──
  const stripY = y(TOP) + h(190);
  const page = CLUSTER.pagesAfter[0];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={tableAt} level={-34} />
      <Sfx name="el-pencil" at={lookupAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={twentyAt + 4} level={-33} />
      <Sfx name="el-whoosh" at={afterAt + 2} level={-34} />
      <Sfx name="el-tap" at={lastAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is the difference between a clustered and a non-clustered index?
        </QuestionCard>

        {/* ── Left: the users table, stored in id order, and an email index ── */}
        <TableName g={ug} at={tableAt} dim={leftDim}>
          users, clustered on id
        </TableName>
        <DataTable
          g={ug}
          cols={[{ name: "id", numeric: true }, { name: "email" }]}
          at={tableAt}
          rows={users.map((cells, i) => ({ cells, at: tableAt + 4 + i * 2 }))}
          dim={leftDim}
        />
        <Note at={storedAt} x={X0} y={ug.rowTop(users.length) + h(18)} dim={leftDim}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>clustered:</span> the rows themselves,
          </div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, oneAt, 10) }}>in id order (one per table)</div>
        </Note>
        <TableName g={ig} at={indexAt} dim={leftDim}>
          an index on email
        </TableName>
        <DataTable
          g={ig}
          cols={[{ name: "email" }, { name: "id", numeric: true }]}
          at={indexAt}
          rows={index.map((cells, i) => ({ cells, at: indexAt + 4 + i * 2 }))}
          dim={leftDim}
        />
        {index.map((r, i) => (
          <KeyArrow key={i} from={[ig.x - 6, ig.rowMid(i)]} to={[ug.right + 8, ug.rowMid(rowOf(r[1]))]} at={lookupAt + i * 3} width={2} dim={leftDim} />
        ))}
        <Note at={lookupAt + 6} x={ig.x} y={ig.rowTop(index.length) + h(18)} dim={leftDim}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>non-clustered:</span> a separate lookup
          </div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, manyAt, 10) }}>(many per table)</div>
        </Note>

        {/* ── Right: Postgres keeps none; CLUSTER sorts once ── */}
        <Note at={pgAt} x={R_X} y={y(TOP) - h(6)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Postgres: no clustered index</span>
        </Note>
        <Listing lines={CLUSTER.sql} x={R_X} top={y(TOP) + h(40)} width={R_W} size={21} at={commandAt - 2} marks={[{ line: "CLUSTER", at: commandAt + 8 }]} />
        <PageStrip
          x={R_X}
          y={stripY}
          width={R_W}
          pages={CLUSTER.tablePages}
          at={twentyAt - 8}
          ticks={[
            { pages: CLUSTER.pagesBefore, at: twentyAt, moveTo: { page, at: afterAt + 2 } },
            { pages: [CLUSTER.newPage], at: lastAt, color: inkOf.red },
          ]}
        />
        <div style={{ position: "absolute", left: R_X, top: stripY + h(64), ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, twentyAt - 6, 12) }}>
          orders, page by page: customer 42&rsquo;s rows
        </div>
        <Note at={twentyAt + 6} x={R_X} y={stripY + h(104)} out={afterAt + 2}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            before: on <b>{CLUSTER.pagesBefore.length}</b> pages
          </span>
        </Note>
        <Note at={shareAt} x={R_X} y={stripY + h(104)}>
          <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap" }}>
            after: all <Num>20</Num> on page <Num>{page}</Num>
          </span>
        </Note>
        <Note at={keptAt} x={R_X} y={stripY + h(150)}>
          <div style={{ ...note(24, ACCENT_INK), width: R_W, opacity: ease(frame, lastAt, 10) }}>
            a new order for 42 lands on page <Num>{thousands(CLUSTER.newPage)}</Num>, the last
          </div>
          <div style={{ ...note(22, INK_SOFT), width: R_W, marginTop: h(10) }}>
            CLUSTER runs once; Postgres doesn&rsquo;t keep the order
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
