import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OTM } from "./data";
import {
  Caption,
  DbTable,
  Drift,
  HEAD_H,
  Head,
  KEY_INK,
  KeyArrow,
  Kicker,
  MARK,
  MARK_BAD,
  MARK_KEY,
  Pulse,
  ROW_H,
  Tag,
  tableGeometry,
} from "./parts";

const TABLES_Y = 410;
const CUSTOMERS_X = 160;
const ORDERS_X = 760;

/**
 * Where the link lives: not as a list in the customer's row (the lesson's
 * bad idea), but as one customer id on each order, repeated, which is the
 * relationship itself.
 */
export const ListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("list").from;
  const notAt = n.word("list", "Not customers");
  const adaAt = n.word("list", "Ada's orders");
  const idsAt = n.word("list", "one and twenty-five");
  const cellAt = n.word("list", "one cell");
  const checkAt = n.word("cell", "Nothing can check");
  const newAt = n.word("cell", "new order");
  const editAt = n.word("cell", "editing");
  const fkAt = n.word("fk", "foreign key");
  const manyAt = n.word("fk", "many side");
  const eachAt = n.word("fk", "Each order");
  const storesAt = n.word("fk", "stores");
  const idAt = n.word("fk", "customer ID");
  const twiceAt = n.word("fk", "twice");
  const repAt = n.word("repeat", "repetition");
  const isAt = n.word("repeat", "IS");
  const relAt = n.word("repeat", "relationship");
  const bothAt = n.word("cross-in", "both sides");
  const crossManyAt = n.word("cross-in", "many");

  const headH = h(HEAD_H);
  const rowH = h(ROW_H);
  const top = y(TABLES_Y);
  // The lesson's bad idea: the parent holding a list of its children.
  const bad = tableGeometry({ x: CUSTOMERS_X, top, cols: OTM.listCols, rows: OTM.list, extra: [["", "", OTM.listAfter]], headH, rowH });
  // The same customers once the list is gone: the same two columns, so they stay put.
  const goodCols = OTM.listCols.slice(0, 2);
  const goodRows = OTM.list.map((r) => r.slice(0, 2));
  const good = tableGeometry({ x: CUSTOMERS_X, top, cols: goodCols, rows: goodRows, headH, rowH });
  const og = tableGeometry({ x: ORDERS_X, top, cols: OTM.orderCols, rows: OTM.orderRows, headH, rowH });
  const pointsAt = OTM.orderRows.map((r) => OTM.list.findIndex((c) => c[0] === r[1]));
  const ada = OTM.list[0][0];
  const adaRows = OTM.orderRows.flatMap((r, i) => (r[1] === ada ? [i] : []));
  const ID = 0;
  const LIST = 2;
  const FK = 1;

  const swapIn = ease(frame, fkAt - 4, 14);
  const dimAll = bothAt - 4;

  // The next shape, glimpsed: many on both ends.
  const students = useEntityLayout({ x: 760, y: y(780), width: 260, name: "students", columns: [] });
  const courses = useEntityLayout({ x: 1300, y: y(780), width: 260, name: "courses", columns: [] });

  return (
    <AbsoluteFill>
      {/* ── Sound: the list struck, the new id, the keys, the arrows ── */}
      <Sfx name="el-tap" at={idsAt} level={-29} />
      <Sfx name="el-scratch" at={checkAt + 2} level={-31} />
      <Sfx name="el-tap" at={newAt + 4} level={-28} />
      <Sfx name="el-whoosh" at={fkAt - 4} level={-34} />
      {OTM.orderRows.map((_, i) => (
        <Sfx key={i} name="el-pencil" at={storesAt + i * 5} level={-36} />
      ))}
      <Sfx name="el-pop" at={twiceAt} level={-30} />
      <Sfx name="el-pencil" at={crossManyAt} level={-34} />

      <Kicker at={from - 10}>One to many</Kicker>
      <Head lead="Not a list in a cell." leadAt={from - 6} out={fkAt - 6} />
      <Head lead="One key per order." leadAt={fkAt} turn="The repeat is the link." turnAt={relAt - 4} />

      <Drift from={fkAt} to={dimAll + 40} scale={0.018} origin={[960, y(600)]}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, dimAll, 16) * 0.6 }}>
          {/* ── The bad idea, then the same customers without it ── */}
          <Caption at={notAt} x={CUSTOMERS_X} y={top - 48}>
            customers
          </Caption>
          <DbTable
            g={bad}
            cols={OTM.listCols}
            rows={OTM.list.map((cells, i) => ({ cells, at: (i ? notAt + 8 : adaAt) + 2 }))}
            at={notAt}
            numeric={[ID]}
            colInk={{ [ID]: KEY_INK }}
            marks={[
              { row: 0, col: LIST, at: idsAt },
              { row: 0, col: LIST, at: checkAt, color: MARK_BAD },
              { row: 1, col: LIST, at: checkAt + 5, color: MARK_BAD },
            ]}
            swaps={[{ row: 0, col: LIST, at: newAt + 4, value: OTM.listAfter, color: ACCENT_INK }]}
            bands={[{ row: 0, at: editAt, color: MARK_BAD }]}
            out={fkAt - 4}
          />
          <Tag at={cellAt} x={CUSTOMERS_X} y={bad.rowTop(2) + 18} color={ACCENT_INK} size={22} out={fkAt - 4}>
            {OTM.adaOrders.length} orders in one cell
          </Tag>
          <Tag at={checkAt + 6} x={CUSTOMERS_X} y={bad.rowTop(2) + 52} italic size={22} out={fkAt - 4}>
            nothing can check what's in it
          </Tag>
          <div style={{ position: "absolute", inset: 0, opacity: swapIn }}>
            <DbTable
              g={good}
              cols={goodCols}
              rows={goodRows.map((cells) => ({ cells, at: notAt - 40 }))}
              at={notAt - 40}
              numeric={[ID]}
              colInk={{ [ID]: KEY_INK }}
              marks={[{ row: 0, col: ID, at: twiceAt + 4, color: MARK }]}
            />
          </div>

          {/* ── The good idea: the key on the many side ── */}
          <Caption at={manyAt - 4} x={ORDERS_X} y={top - 48}>
            orders
          </Caption>
          <DbTable
            g={og}
            cols={OTM.orderCols}
            rows={OTM.orderRows.map((cells, i) => ({ cells, at: eachAt + i * 4 }))}
            at={manyAt - 4}
            numeric={[0, FK]}
            colInk={{ [FK]: KEY_INK }}
            marks={OTM.orderRows.map((_, i) => ({ row: i, col: FK, at: idAt + i * 4, color: MARK_KEY }))}
            bands={adaRows.map((row, k) => ({ row, at: twiceAt + k * 6 }))}
          />
          {OTM.orderRows.map((_, i) => (
            <KeyArrow key={i} from={[og.x - 10, og.rowMid(i)]} to={[good.x + good.width + 8, good.rowMid(pointsAt[i])]} at={storesAt + i * 5} />
          ))}
          {adaRows.map((row, k) => (
            <Pulse key={row} x={og.xs[FK] + og.widths[FK] - 30} y={og.rowMid(row)} at={repAt + k * 6} r={16} />
          ))}
          <Tag at={isAt} x={og.x + og.width + 26} y={og.rowMid(adaRows[0]) - 14} color={KEY_INK} size={22}>
            Ada, once per order
          </Tag>
        </div>
      </Drift>

      {/* ── And if both sides can be many? ── */}
      <Entity layout={students} at={bothAt - 2} />
      <Entity layout={courses} at={bothAt + 4} />
      <Relation
        name="students to courses"
        points={[students.anchor("right"), courses.anchor("left")]}
        from="zero-or-many"
        to="zero-or-many"
        at={crossManyAt - 2}
        dur={16}
      />
    </AbsoluteFill>
  );
};
