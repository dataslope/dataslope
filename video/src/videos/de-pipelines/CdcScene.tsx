import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CDC } from "./data";
import { colsOf, DataTable, Drift, Flow, geoOf, Listing, MARK, MARK_BAD, Node, OK_INK, TableName, X0 } from "./parts";

const TOP = 360;
const POLL_X = 780;
const LOG_Y = 785;
const ENTRY_W = 232;

/** One change as the log records it: Debezium's op code, then what changed. */
const Entry: React.FC<{ at: number; x: number; y: number; op: string; text: string }> = ({ at, x, y, op, text }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: ENTRY_W,
        height: 76,
        boxSizing: "border-box",
        border: `2px solid ${BAR}`,
        borderRadius: 10,
        background: `color-mix(in srgb, ${BAR} 9%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        opacity: p,
        transform: `translateX(${(1 - p) * -14}px)`,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: BLUE_INK }}>{op}</span>
      <span style={{ ...note(20, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

/**
 * Question 4. The source table changes three ways between two polls (order 2
 * ships, order 4 is placed, order 3 is deleted). The poll on updated_at,
 * run in DuckDB, returns 2 and 4: the delete leaves nothing to select. Then
 * the write-ahead log, which already holds all three in order, streamed
 * through Kafka to the warehouse, deletes included.
 */
export const CdcScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cdc").from;
  const qAt = n.word("cdc", "Question four");
  const textAt = n.word("cdc", "What is change data capture");
  const pollingAt = n.word("cdc", "The simple alternative is polling");
  const updatedAt = n.word("cdc", "whose updated at is later");
  const lastRunAt = n.word("cdc", "the last run");
  const sinceAt = n.word("cdc-poll", "Since the last run");
  const shippedAt = n.word("cdc-poll", "order two shipped");
  const placedAt = n.word("cdc-poll", "order four was placed");
  const deletedAt = n.word("cdc-poll", "order three was deleted");
  const findsAt = n.word("cdc-poll", "The poll finds two and four");
  const notThereAt = n.word("cdc-poll", "The deleted row isn't there to select");
  const neverAt = n.word("cdc-poll", "never reaches the warehouse");
  const logAt = n.word("cdc-log", "reads the database's write-ahead log");
  const everyAt = n.word("cdc-log", "every insert, update and delete");
  const orderAt = n.word("cdc-log", "recorded in order");
  const passesAt = n.word("cdc-log", "passes each change downstream");
  const kafkaAt = n.word("cdc-log", "often through Kafka");
  const whenAt = n.word("cdc-when", "Use it for low-latency replication");
  const noPollAt = n.word("cdc-when", "without polling the source table");
  const deletesAt = n.word("cdc-when", "whenever deletes must arrive");
  const end = n.beat("cdc-when").to;

  // The source table: the three rows before, then each change as it is named.
  const [r1, r2, r3] = CDC.before.rows;
  const r4 = CDC.after.rows.find((r) => r[0] === "4");
  const shipped = CDC.after.rows.find((r) => r[0] === "2");
  if (!r4 || !shipped) throw new Error("the CDC figure lost a row");
  const tableTop = y(TOP);
  const g = geoOf({ cols: CDC.before.cols, rows: [r1, r2, r3, r4] }, X0, tableTop, h, { bodySize: 22, extra: [shipped] });
  const cols = colsOf(CDC.before);

  // The poll and what it returned.
  const pollLines = CDC.pollSql.split("\n");
  const pollTop = tableTop;
  const resultTop = y(560);
  const rg = geoOf(CDC.poll, POLL_X, resultTop, h, { bodySize: 21, headH: 40, rowH: 44 });

  // The log, along the bottom: three entries in the order they happened.
  const logTop = y(LOG_Y);
  const ENTRIES = [
    { op: "u", text: "order 2: shipped", at: everyAt + 4 },
    { op: "c", text: "order 4: new", at: everyAt + 10 },
    { op: "d", text: "order 3: deleted", at: everyAt + 16 },
  ];
  const ex = (i: number) => X0 + i * (ENTRY_W + 18);
  const kafkaX = ex(3) + 50;
  const whX = kafkaX + 250;
  const midY = logTop + 38;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={pollingAt} level={-34} />
      <Sfx name="el-tap" at={shippedAt} level={-32} />
      <Sfx name="el-tap" at={placedAt} level={-32} />
      <Sfx name="el-scratch" at={deletedAt + 2} level={-31} />
      <Sfx name="el-tap" at={findsAt + 4} level={-31} />
      {ENTRIES.map((e) => (
        <Sfx key={e.op} name="el-tap" at={e.at} level={-33} />
      ))}
      <Sfx name="el-whoosh" at={passesAt} level={-32} />
      <Sfx name="el-chime" at={deletesAt + 8} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is change data capture (CDC), and when do you use it?
        </QuestionCard>

        {/* The source table, changing. */}
        <TableName g={g} at={pollingAt - 4}>
          <span style={{ fontFamily: MONO }}>orders</span>, in the source database
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={pollingAt - 4}
          rows={[
            { cells: r1, at: pollingAt },
            { cells: r2, at: pollingAt + 3 },
            { cells: r3, at: pollingAt + 6, strikeAt: deletedAt + 2, collapseAt: deletedAt + 20 },
            { cells: r4, at: placedAt, grow: true },
          ]}
          swaps={[
            { row: 1, col: 1, at: shippedAt + 2, value: shipped[1] },
            { row: 1, col: 2, at: shippedAt + 6, value: shipped[2] },
          ]}
          marks={[
            { row: 1, col: 2, at: updatedAt, out: sinceAt, color: MARK },
            { row: 1, col: 2, at: findsAt + 2, color: MARK },
            { row: 3, col: 2, at: findsAt + 6, color: MARK },
          ]}
        />

        {/* The poll. */}
        <Note at={pollingAt} x={POLL_X} y={pollTop - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Polling, since the last run</span>
        </Note>
        <Listing lines={pollLines} x={POLL_X} top={pollTop} width={580} size={21} at={pollingAt + 2} lineAt={pollLines.map((_, i) => (i === 1 ? updatedAt : pollingAt + 4 + i * 4))} marks={[{ line: 1, at: lastRunAt, out: sinceAt }]} />
        <TableName g={rg} at={findsAt}>
          The poll returns
        </TableName>
        <DataTable g={rg} cols={colsOf(CDC.poll)} at={findsAt} rows={CDC.poll.rows.map((cells, i) => ({ cells, at: findsAt + 4 + i * 4 }))} />
        <Note at={notThereAt} x={rg.right + 28} y={resultTop + h(6)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", background: MARK_BAD, padding: "2px 6px" }}>order 3's delete:</span>
          <br />
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>no row left to select</span>
        </Note>
        <Note at={neverAt} x={rg.right + 28} y={resultTop + h(92)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>
            so it never reaches
            <br />
            the warehouse
          </span>
        </Note>

        {/* The write-ahead log, streamed downstream. */}
        <Note at={logAt} x={X0} y={logTop - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            The database's write-ahead log<span style={{ color: INK_SOFT, fontWeight: 600, opacity: ease(frame, orderAt, 10) }}>, in order</span>
          </span>
        </Note>
        {ENTRIES.map((e, i) => (
          <Entry key={e.op} at={e.at} x={ex(i)} y={logTop} op={e.op} text={e.text} />
        ))}
        <Flow points={[[ex(3) - 6, midY], [kafkaX - 8, midY]]} at={passesAt} color={BAR} />
        <Node x={kafkaX} y={logTop} w={210} h={76} at={kafkaAt} tone="plain" title="Kafka" sub="a distributed log" size={24} subSize={19} />
        <Flow points={[[kafkaX + 216, midY], [whX - 8, midY]]} at={kafkaAt + 10} color={BAR} />
        <Node x={whX} y={logTop} w={210} h={76} at={kafkaAt + 16} title="warehouse" size={24} />
        <Note at={kafkaAt + 22} x={whX + 230} y={logTop + 6}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            all three changes,
            <br />
            the delete included
          </span>
        </Note>

        {/* When to use it. */}
        <Note at={whenAt} x={X0} y={logTop + 76 + h(24)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>Use it for</b> low-latency replication of transactional data
            <span style={{ opacity: ease(frame, noPollAt, 10) }}>, with no polling of the source</span>
            <span style={{ opacity: ease(frame, deletesAt, 10), color: OK_INK, fontWeight: 700 }}>, and whenever deletes must arrive</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
