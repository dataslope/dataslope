import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FLAT, FLAT_AFTER, NORM_CUSTOMERS, NORM_ORDERS, UPDATE_ROWS, UPDATE_SQL } from "./data";
import { colsOf, DataTable, Drift, ElbowArrow, geoOf, KEY_INK, Mark, MARK, MARK_BAD, MARK_KEY, Mono, OK_INK, PanelHead, TableName, X0 } from "./parts";

const RIGHT_X = 1000;
const OPTS = { headH: 46, rowH: 50, bodySize: 24, headSize: 21 } as const;

/**
 * Question 5, on why-normalization's shop (re-run in DuckDB). Normalized,
 * Ada's email is one customers row that her orders reach through a join;
 * denormalized, it is copied onto each order, so reads need no join and a
 * rushed update leaves her two emails. Then where each one belongs.
 */
export const NormScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("norm").from;
  const qAt = n.word("norm", "Question five");
  const textAt = n.word("norm", "Normalization versus denormalization");
  const normWordAt = n.word("norm", "Normalization versus");
  const denormWordAt = n.word("norm", "denormalization");
  const onceAt = n.word("norm", "stores each fact once");
  const livesAt = n.word("norm", "Ada's email lives in one customers row");
  const joinAt = n.word("norm", "through a join");
  const copiesAt = n.word("denorm", "copies it onto each order");
  const fasterAt = n.word("denorm", "no join, so reads are faster");
  const priceAt = n.word("denorm", "The price is storage");
  const disagreeAt = n.word("denorm", "copies that can disagree");
  const rushedAt = n.word("denorm", "A rushed update fixes one row");
  const twoAt = n.word("denorm", "now Ada has two emails");
  const writesAt = n.word("norm-where", "normalize where writes are frequent");
  const readsAt = n.word("norm-where", "Denormalize where reads dominate");
  const warehouseAt = n.word("norm-where", "like a warehouse");
  const end = n.beat("norm-where").to;

  const cg = geoOf(NORM_CUSTOMERS, X0, y(380), h, OPTS);
  const og = geoOf(NORM_ORDERS, X0, y(584), h, OPTS);
  const fg = geoOf(FLAT, RIGHT_X, y(380), h, { ...OPTS, extra: FLAT_AFTER.rows });
  const cEmail = NORM_CUSTOMERS.cols.indexOf("email");
  const cId = NORM_CUSTOMERS.cols.indexOf("customer_id");
  const oCust = NORM_ORDERS.cols.indexOf("customer_id");
  const fEmail = FLAT.cols.indexOf("customer_email");
  const ada = FLAT.rows.map((r, i) => (r[FLAT.cols.indexOf("customer_name")] === "Ada" ? i : -1)).filter((i) => i >= 0);
  const newEmail = FLAT_AFTER.rows[0][fEmail];
  const loopX = Math.max(cg.right, og.right) + 46;
  const loop = (row: number) =>
    [
      [og.right + 8, og.rowMid(row)],
      [loopX, og.rowMid(row)],
      [loopX, cg.rowMid(0)],
      [cg.right + 8, cg.rowMid(0)],
    ] as const;
  const update = UPDATE_SQL.replace(/;$/, "").replace("UPDATE orders_flat SET ", "UPDATE … SET ").replace("customer_email", "email");
  const below = fg.rowTop(FLAT.rows.length);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={onceAt} level={-33} />
      <Sfx name="el-pencil" at={joinAt + 2} level={-35} />
      <Sfx name="el-tap" at={copiesAt} level={-33} />
      <Sfx name="el-pop" at={rushedAt + 8} level={-33} />
      <Sfx name="el-scratch" at={twoAt + 2} level={-34} />
      <Sfx name="el-chime" at={readsAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          <Mark at={normWordAt} out={onceAt}>
            Normalization
          </Mark>{" "}
          versus{" "}
          <Mark at={denormWordAt} out={onceAt}>
            denormalization
          </Mark>
          : what&apos;s the trade-off?
        </QuestionCard>

        {/* ── Normalized: each fact once ── */}
        <PanelHead at={onceAt - 4} x={X0} y={y(262)} width={760} sub="each fact stored once" subAt={onceAt + 4}>
          Normalized
        </PanelHead>
        <TableName g={cg} at={onceAt}>
          <Mono>customers</Mono>
        </TableName>
        <DataTable
          g={cg}
          cols={colsOf(NORM_CUSTOMERS, { customer_id: { ink: KEY_INK } })}
          at={onceAt}
          rows={NORM_CUSTOMERS.rows.map((cells, i) => ({ cells, at: onceAt + 4 + i * 3 }))}
          marks={[{ row: 0, col: cEmail, at: livesAt + 4 }, { row: 0, col: cId, at: joinAt, color: MARK_KEY }]}
        />
        <TableName g={og} at={onceAt + 6}>
          <Mono>orders</Mono>
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(NORM_ORDERS, { customer_id: { ink: KEY_INK } })}
          at={onceAt + 6}
          rows={NORM_ORDERS.rows.map((cells, i) => ({ cells, at: onceAt + 10 + i * 3 }))}
          marks={ada.map((r) => ({ row: r, col: oCust, at: joinAt + 2, color: MARK_KEY }))}
        />
        {ada.map((r, k) => (
          <ElbowArrow key={r} points={loop(r)} at={joinAt + 4 + k * 4} />
        ))}
        <Note at={joinAt + 10} x={loopX + 18} y={(og.rowMid(0) + cg.rowMid(0)) / 2 - 16}>
          <span style={{ ...note(23, KEY_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a join</span>
        </Note>

        {/* ── Denormalized: copied onto each order ── */}
        <PanelHead at={copiesAt - 4} x={RIGHT_X} y={y(262)} width={800} sub="copied onto every order" subAt={copiesAt + 4}>
          Denormalized
        </PanelHead>
        <TableName g={fg} at={copiesAt}>
          <Mono>orders_flat</Mono>
        </TableName>
        <DataTable
          g={fg}
          cols={colsOf(FLAT)}
          at={copiesAt}
          rows={FLAT.rows.map((cells, i) => ({ cells, at: copiesAt + 4 + i * 3 }))}
          marks={[
            ...ada.map((r, k) => ({ row: r, col: fEmail, at: copiesAt + 10 + k * 4, color: MARK, out: twoAt })),
            ...ada.map((r, k) => ({ row: r, col: fEmail, at: twoAt + k * 4, color: MARK_BAD })),
          ]}
          swaps={[{ row: 0, col: fEmail, at: rushedAt + 8, value: newEmail }]}
        />
        <Note at={fasterAt} x={RIGHT_X} y={below + h(20)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>no join: faster reads</span>
        </Note>
        <Note at={priceAt} x={RIGHT_X} y={below + h(62)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            costs: storage
            <span style={{ opacity: ease(frame, disagreeAt, 10) }}>, and copies that can disagree</span>
          </span>
        </Note>
        <Note at={rushedAt} x={RIGHT_X} y={below + h(118)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>{update}</Mono>
            <span style={{ opacity: ease(frame, rushedAt + 10, 10) }}>
              {" "}
              → {UPDATE_ROWS} row
            </span>
          </span>
        </Note>
        <Note at={twoAt + 6} x={RIGHT_X} y={below + h(160)}>
          <span style={{ ...note(30, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>Ada now has two emails.</span>
        </Note>

        {/* ── Where each belongs ── */}
        <Note at={writesAt} x={X0} y={og.rowTop(NORM_ORDERS.rows.length) + h(60)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Normalize: frequent writes
            <br />
            that must stay consistent
          </span>
        </Note>
        <Note at={readsAt} x={RIGHT_X} y={og.rowTop(NORM_ORDERS.rows.length) + h(60)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Denormalize: reads dominate,
            <br />
            <span style={{ color: INK, opacity: ease(frame, warehouseAt - 2, 10) }}>like a warehouse</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
