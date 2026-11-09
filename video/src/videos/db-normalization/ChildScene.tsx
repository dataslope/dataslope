import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHILD_COUNTS, CHILD_PHONES, CHILD_SEARCH, CHILD_STUDENTS, CHILD_TWICE } from "./data";
import {
  BODY_Y,
  DbTable,
  ErrorBox,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  KEY_INK,
  KeyArrow,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { Drift, Fade, Reply } from "./parts";

const ENTITY_Y = 340;
const DATA_Y = 566;
const PHONES_X = 640;
const RIGHT = 1180;
const LIST_SIZE = 21;

/**
 * The 1NF fix (the lesson's students and student_phones): one row per
 * number, each pointing back at its student. A search becomes an equality,
 * a student can have no phone at all, and the UNIQUE constraint refuses a
 * number listed twice.
 */
export const ChildScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("child").from;
  const childAt = n.word("child", "child table");
  const ownAt = n.word("child", "own row");
  const pointingAt = n.word("child", "pointing back");
  const searchAt = n.word("plain", "a search");
  const equalsAt = n.word("plain", "plain equals");
  const linusAt = n.word("plain", "Linus");
  const noneAt = n.word("plain", "none");
  const uniqueAt = n.word("plain", "unique constraint");
  const adaAt = n.word("plain", "Ada's number");
  const twiceAt = n.word("plain", "twice");
  const dependFrom = n.beat("depend-in").from;
  const valueAt = n.word("depend-in", "one value");
  const dependAt = n.word("depend-in", "depend");
  const end = n.beat("depend-in").to;

  const students = useEntityLayout({
    x: X0,
    y: y(ENTITY_Y),
    width: 300,
    name: "students",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const phones = useEntityLayout({
    x: PHONES_X,
    y: y(ENTITY_Y),
    width: 460,
    name: "student_phones",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "student_id", type: "integer", key: "FK" },
      { name: "phone_number", type: "text" },
    ],
  });
  const s = students.anchor("right", "id");
  const p = phones.anchor("left", "student_id");
  const mid = (s[0] + p[0]) / 2;

  const sg = tableGeometry({ x: X0, top: y(DATA_Y), cols: CHILD_STUDENTS.cols, rows: CHILD_STUDENTS.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const pg = tableGeometry({
    x: PHONES_X,
    top: y(DATA_Y),
    cols: CHILD_PHONES.cols,
    rows: [...CHILD_PHONES.rows, CHILD_TWICE.row],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const studentRow = (id: string | null) => CHILD_STUDENTS.rows.findIndex((r) => r[0] === id);
  const sought = CHILD_SEARCH.lines.at(-1)!.match(/'([^']+)'/)![1];
  const found = CHILD_PHONES.rows.findIndex((r) => r[2] === sought);
  const linus = CHILD_STUDENTS.rows.findIndex((r) => r[1] === "Linus");
  const linusPhones = CHILD_COUNTS.rows.find((r) => r[0] === "Linus")?.[1] ?? "";
  const first = CHILD_PHONES.rows.findIndex((r) => r[1] === CHILD_TWICE.row[1] && r[2] === CHILD_TWICE.row[2]);
  const ghost = CHILD_PHONES.rows.length;
  const listH = listingHeight(CHILD_SEARCH.lines.length, LIST_SIZE);
  // "a plain equals": the comparison in the WHERE line, not the whole line.
  const last = CHILD_SEARCH.lines.length - 1;
  const equalsFrom = CHILD_SEARCH.lines[last].indexOf("p.phone_number");
  const equalsTo = CHILD_SEARCH.lines[last].lastIndexOf("'") + 1;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={childAt - 4} level={-30} />
      <Sfx name="el-pencil" at={pointingAt} level={-34} />
      <Sfx name="el-sprinkle" at={pointingAt + 4} level={-35} />
      <Sfx name="el-tap" at={equalsAt + 10} level={-28} />
      <Sfx name="el-pop" at={adaAt} level={-30} />
      <Sfx name="el-tap" at={twiceAt - 2} level={-28} />

      <Headline kicker="First normal form" lead="Many values," turn="many rows." at={from - 6} turnAt={ownAt - 6} underlineAt={pointingAt} />

      <Drift from={from} to={end + 40} amount={0.012} origin="35% 55%">
        <Fig n="5" at={from + 2} y={y(FIG_Y)}>
          A child table, one row per number
        </Fig>
        <Entity layout={students} at={childAt - 6} marks={{ id: { at: dependAt + 6, tone: "key" } }} />
        <Entity layout={phones} at={childAt + 2} marks={{ student_id: { at: dependAt, tone: "key" } }} />
        <Relation
          name="students has student_phones"
          points={[s, [mid, s[1]], [mid, p[1]], p]}
          from="exactly-one"
          to="zero-or-many"
          at={pointingAt}
          label="has"
        />

        <DbTable
          g={sg}
          cols={CHILD_STUDENTS.cols}
          rows={CHILD_STUDENTS.rows.map((cells, i) => ({ cells, at: childAt + 4 + i * 4 }))}
          at={childAt}
          numeric={[0]}
          colInk={{ 0: KEY_INK }}
          bands={[{ row: linus, at: linusAt, out: dependFrom }]}
        />
        <DbTable
          g={pg}
          cols={CHILD_PHONES.cols}
          rows={[
            ...CHILD_PHONES.rows.map((cells, i) => ({ cells, at: ownAt - 4 + i * 6 })),
            // The refused row stays as long as its error does.
            { cells: CHILD_TWICE.row, at: adaAt + 2, ghost: true, grow: true, collapseAt: dependAt - 4 },
          ]}
          at={ownAt - 8}
          numeric={[0, 1]}
          colInk={{ 1: KEY_INK }}
          marks={[
            { row: found, col: 2, at: equalsAt + 4, out: linusAt },
            { row: first, col: 2, at: adaAt, out: dependFrom },
            { row: ghost, col: 2, at: twiceAt, color: MARK_BAD },
            // "each cell holds one value": every number, one after another.
            ...CHILD_PHONES.rows.map((_, i) => ({ row: i, col: 2, at: valueAt - 4 + i * 5, out: valueAt + 24 + i * 5, color: MARK })),
          ]}
        />
        {/* Each number names its student's row. */}
        {CHILD_PHONES.rows.map((r, i) => (
          <KeyArrow key={i} from={[pg.x - 10, pg.rowMid(i)]} to={[sg.x + sg.width + 10, sg.rowMid(studentRow(r[1]))]} at={pointingAt + 4 + i * 5} />
        ))}
        <Note at={noneAt - 2} x={sg.x + sg.width + 24} y={sg.rowMid(linus) - 15}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>{linusPhones} phones</span>
        </Note>

        {/* A plain equality finds Ada now: the wash marks just the comparison. */}
        <Fade out={valueAt - 6}>
          <Listing
            lines={CHILD_SEARCH.lines}
            x={RIGHT}
            top={y(BODY_Y)}
            width={650}
            size={LIST_SIZE}
            at={searchAt - 6}
            lineAt={CHILD_SEARCH.lines.map((_, i) => searchAt - 2 + i * 4)}
            marks={[{ line: last, at: equalsAt, from: equalsFrom, to: equalsTo }]}
            dim={uniqueAt}
          />
          <Reply at={equalsAt + 10} x={RIGHT} y={y(BODY_Y) + listH + 16} color={INK}>
            {CHILD_SEARCH.found.join(", ")}
          </Reply>
        </Fade>
        {/* The refusal stays up through "one value", until the new question. */}
        <ErrorBox
          x={RIGHT}
          top={y(BODY_Y) + listH + 90}
          width={640}
          at={twiceAt - 2}
          out={dependAt}
          message={CHILD_TWICE.message}
          detail={CHILD_TWICE.detail}
        />
        {/* In the listing's place once it has gone. */}
        <Note at={valueAt + 8} x={RIGHT} y={y(BODY_Y) + 40}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Every cell holds one value.</div>
        </Note>
        <Note at={dependAt + 4} x={RIGHT} y={y(BODY_Y) + 82}>
          <div style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>What does each one depend on?</div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
