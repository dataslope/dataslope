import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, INK } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DATES, STATUS } from "./data";
import {
  CARD_Y,
  DbTable,
  ErrorBox,
  Head,
  HEAD_H,
  Kicker,
  MARK,
  MARK_BAD,
  ROW_H,
  RuleTags,
  TABLE_X,
  TABLE_Y,
  tableGeometry,
  Tick,
  X0,
} from "./parts";

/**
 * Part 5: CHECK, a true or false test every row must pass. 'banana' fails
 * the status list; a backwards conference fails a test across two columns.
 */
export const CheckScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("check").from;
  const checkAt = n.word("check", "check");
  const trueAt = n.word("check", "true or false");
  const everyRowAt = n.word("check", "every row");
  const passAt = n.word("check", "pass");
  const priceAt = n.word("check", "Price");
  const oneAt = n.word("check", "one");
  const statusAt = n.word("banana", "Status");
  const archivedAt = n.word("banana", "archived");
  const soAt = n.word("banana", "So");
  const bananaAt = n.word("banana", "banana");
  const nopeAt = n.word("banana", "Nope");
  const datesFrom = n.beat("dates").from;
  const compareAt = n.word("dates", "compare");
  const columnsAt = n.word("dates", "columns");
  const eventAt = n.word("dates", "An event");
  const endAt = n.word("dates", "end");
  const startsAt = n.word("dates", "starts");
  const neverAt = n.word("dates", "never");
  const backwardsAt = n.word("dates", "backwards");
  const getsAt = n.word("dates", "gets in");

  const card = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 380,
    name: "products",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "name", type: "text" },
      { name: "price", type: "numeric" },
      { name: "status", type: "text" },
    ],
  });
  const rows = [...STATUS.rows, STATUS.failing];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols: STATUS.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = STATUS.rows.length;

  const events = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 380,
    name: "events",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "name", type: "text" },
      { name: "start_date", type: "date" },
      { name: "end_date", type: "date" },
    ],
  });
  const gd = tableGeometry({ x: TABLE_X - 40, top: y(TABLE_Y), cols: DATES.cols, rows: [DATES.failing], headH: h(HEAD_H), rowH: h(ROW_H) });

  const outA = datesFrom - 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={checkAt - 4} level={-30} />
      <Sfx name="el-pencil" at={priceAt - 2} level={-34} />
      <Sfx name="el-pencil" at={statusAt - 2} level={-34} />
      <Sfx name="el-tap" at={soAt - 2} level={-28} />
      <Sfx name="el-scratch" at={nopeAt + 2} level={-30} />
      <Sfx name="el-whoosh" at={outA} level={-34} />
      <Sfx name="el-scratch" at={neverAt + 2} level={-30} />

      <Kicker at={open - 10}>Rules about values</Kicker>
      <Head lead="A test every row must pass." at={checkAt - 6} out={outA} />
      <Ink at={trueAt - 4} dur={16} out={outA} style={{ left: 96, top: y(252), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>true, and the row is stored; false, and it is refused</span>
      </Ink>
      <Head lead="It can compare columns, too." at={compareAt - 6} />

      {/* ── products: a price range and a list of statuses ── */}
      <Entity layout={card} at={checkAt - 2} out={outA} />
      <RuleTags layout={card} row="price" chips={[{ code: "CHECK (price >= 0)", at: priceAt - 2, pulses: [oneAt] }]} out={outA} />
      <RuleTags
        layout={card}
        row="status"
        chips={[
          {
            code: "CHECK (status IN (\n  'draft', 'active', 'archived'))",
            at: statusAt - 2,
            pulses: [archivedAt, nopeAt + 6],
          },
        ]}
        out={outA}
      />
      <DbTable
        g={g}
        cols={STATUS.cols}
        at={everyRowAt - 6}
        numeric={[0, 2]}
        rows={[
          { cells: STATUS.rows[0], at: everyRowAt },
          { cells: STATUS.failing, at: soAt - 2, ghost: true, grow: true, strikeAt: nopeAt + 2 },
        ]}
        marks={[
          { row: 0, col: 3, at: archivedAt - 8, out: soAt },
          { row: ghost, col: 3, at: bananaAt, color: MARK_BAD },
        ]}
        out={outA}
      />
      <Tick x={g.x + g.width + 18} y={g.rowMid(0)} at={passAt} out={outA} />
      <ErrorBox
        x={TABLE_X}
        top={g.rowTop(2) + h(36)}
        width={1824 - TABLE_X}
        at={nopeAt}
        message={STATUS.refusal.message}
        detail={STATUS.refusal.detail}
        name={STATUS.refusal.constraint}
        nameAt={nopeAt + 10}
        out={outA}
      />

      {/* ── events: two columns, one test ── */}
      <Entity layout={events} at={compareAt - 2} />
      <RuleTags
        layout={events}
        row="start_date"
        span="end_date"
        chips={[{ code: "CHECK (end_date > start_date)", at: columnsAt - 2, pulses: [neverAt + 4] }]}
      />
      <DbTable
        g={gd}
        cols={DATES.cols}
        at={eventAt - 6}
        numeric={[0]}
        rows={[{ cells: DATES.failing, at: eventAt, ghost: true, strikeAt: neverAt + 2 }]}
        marks={[
          { row: 0, col: 3, at: endAt, color: MARK_BAD },
          { row: 0, col: 2, at: startsAt, color: MARK },
          { row: 0, col: 1, at: backwardsAt },
        ]}
      />
      <ErrorBox
        x={gd.x}
        top={gd.rowTop(1) + h(36)}
        width={1824 - gd.x}
        at={neverAt}
        message={DATES.refusal.message}
        detail={DATES.refusal.detail}
        name={DATES.refusal.constraint}
        nameAt={getsAt}
      />
    </AbsoluteFill>
  );
};
