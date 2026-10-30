import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { JOIN } from "./data";
import {
  colsOf,
  Console,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK_INK,
  TableName,
  X0,
} from "./parts";

const TOP = 330;
const SIZE = 21;
const ORDERS_X = 540;
const OUT_X = 1120;
const LOW = 612;

/**
 * Question 9, the page's join: a dict built from the smaller side (users),
 * then each order looks its user up, row by row, and the three joined rows
 * print. A hash join is O(n + m), against O(n × m) for every pair. Then the
 * follow-up: the video's own order 13, for a user who isn't there, raises
 * KeyError: 3 under square brackets, and .get() keeps it with None.
 */
export const JoinScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("join").from;
  const qAt = n.word("join", "Question nine");
  const textAt = n.word("join", "How do you join two datasets");
  const asked = n.beat("join").to;
  const buildAt = n.word("join-build", "Build a dict from the smaller side");
  const keyedAt = n.word("join-build", "keyed on the join column");
  const nameAt = n.word("join-build", "user ID to name");
  const scanAt = n.word("join-build", "scan the larger side");
  const lookAt = n.word("join-build", "look up each order's user");
  const hashAt = n.word("join-cost", "That's a hash join");
  const plusAt = n.word("join-cost", "order n plus m");
  const everyAt = n.word("join-cost", "Comparing every order with every user");
  const timesAt = n.word("join-cost", "order n times m");
  const missAt = n.word("join-miss", "an order whose user isn't there");
  const squareAt = n.word("join-miss", "Square brackets raise a key error");
  const getAt = n.word("join-miss", "Get returns none");
  const leftAt = n.word("join-miss", "as a left join would");
  const end = n.beat("batch-in").to;
  const outBuild = missAt - 4;

  const U = JOIN.users;
  const ug = geoOf(U, X0, y(TOP), h, { rowH: 54 });
  const O = JOIN.after;
  const og = geoOf(O, ORDERS_X, y(TOP), h, { rowH: 54 });
  const uid = O.cols.indexOf("user_id");
  const B = JOIN.build.lines;
  // The comprehension, down to its closing bracket (the print loop after it
  // is what the console beside it shows).
  const P = JOIN.probe.lines.slice(0, JOIN.probe.lines.findIndex((l) => l.trim() === "]") + 1);
  const low = y(LOW);
  const probeTop = low + listingHeight(B.length, SIZE) + h(30);
  const userRow = (i: number) => U.rows.findIndex((r) => r[U.cols.indexOf("user_id")] === O.rows[i][uid]);
  const M = JOIN.missing.lines;
  const mH = listingHeight(M.length, SIZE);
  const L = JOIN.left.lines;
  const newRow = O.rows.length - 1;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={buildAt + 4} level={-36} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={lookAt + i * 14} level={-37} />
      ))}
      <Sfx name="el-pop" at={plusAt} level={-34} />
      <Sfx name="el-scratch" at={squareAt + 4} level={-33} />
      <Sfx name="el-pop" at={getAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you join two datasets in memory without a database?
        </QuestionCard>

        {/* ── The two sides ── */}
        <TableName g={ug} at={asked - 6}>
          <Mono>users</Mono> <span style={{ color: INK_SOFT, fontWeight: 500 }}>the smaller side</span>
        </TableName>
        <DataTable
          g={ug}
          cols={colsOf(U, { user_id: { ink: BLUE_INK } })}
          at={asked - 6}
          rows={U.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          bands={[0, 1, 2].map((i) => ({ row: userRow(i), at: lookAt + i * 14, out: lookAt + i * 14 + 13, color: MARK }))}
          marks={U.rows.map((_, row) => ({ row, col: 0, at: keyedAt + row * 2, out: scanAt, color: MARK }))}
        />
        <TableName g={og} at={asked - 2}>
          <Mono>orders</Mono>
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(O, { user_id: { ink: BLUE_INK } })}
          at={asked - 2}
          rows={O.rows.map((cells, i) =>
            i === newRow ? { cells, at: missAt, grow: true } : { cells, at: asked + 2 + i * 2 },
          )}
          bands={[0, 1, 2].map((i) => ({ row: i, at: lookAt + i * 14, out: lookAt + i * 14 + 13, color: MARK }))}
          marks={[{ row: newRow, col: uid, at: missAt + 8, color: MARK_BAD }]}
        />

        {/* ── Build, then probe ── */}
        <Listing
          lines={B}
          x={X0}
          top={low}
          width={700}
          size={SIZE}
          at={buildAt}
          dim={outBuild}
          marks={[{ line: 0, at: nameAt, color: MARK_OK }]}
        />
        <Console lines={[JOIN.build.value]} x={X0 + 730} top={low} width={330} size={21} at={nameAt} dim={outBuild} />
        <Listing
          lines={P}
          x={X0}
          top={probeTop}
          width={1160}
          size={20}
          at={scanAt - 2}
          out={outBuild}
          marks={[{ line: lineOf(P, "by_id[o"), at: lookAt, color: MARK_OK }]}
        />
        <Console
          lines={JOIN.probe.out}
          x={OUT_X}
          top={y(TOP)}
          width={640}
          size={20}
          at={lookAt}
          lineAt={JOIN.probe.out.map((_, i) => lookAt + i * 14 + 6)}
        />

        {/* ── The cost ── */}
        <Note at={hashAt} x={1340} y={probeTop + h(4)} out={outBuild}>
          <span style={{ ...note(30, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            hash join{" "}
            <Mark at={plusAt} color={MARK_OK}>
              <i>O</i>(<i>n</i> + <i>m</i>)
            </Mark>
          </span>
        </Note>
        <Note at={everyAt} x={1340} y={probeTop + h(62)} out={outBuild}>
          <span style={{ ...note(30, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            every pair{" "}
            <Mark at={timesAt} color={MARK_BAD}>
              <i>O</i>(<i>n</i> × <i>m</i>)
            </Mark>
          </span>
        </Note>

        {/* ── The follow-up: a user who isn't there ── */}
        <Listing lines={M} x={X0} top={probeTop} width={1000} size={SIZE} at={missAt + 4} marks={[{ line: lineOf(M, "by_id[o"), at: squareAt, color: MARK_BAD }]} />
        <ErrorBox x={X0 + 1030} top={probeTop} width={360} at={squareAt + 6} kind={JOIN.missing.kind} message={JOIN.missing.message} size={24} />
        <Listing
          lines={L}
          x={X0}
          top={probeTop + mH + h(26)}
          width={1000}
          size={SIZE}
          at={getAt - 2}
          marks={[{ line: 0, at: getAt + 6, color: MARK_OK }]}
        />
        <Console lines={[JOIN.left.value]} x={X0 + 1030} top={probeTop + mH + h(26)} width={460} size={21} at={getAt + 4} marks={[{ line: 0, at: leftAt, color: MARK_OK }]} />
      </Drift>
    </AbsoluteFill>
  );
};
