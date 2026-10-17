import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, INK } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ROSTER } from "./data";
import {
  DataTable,
  Drift,
  ErrorBox,
  Headline,
  KEY,
  KEY_INK,
  MARK,
  MARK_BAD,
  MARK_KEY,
  noteStyle,
  RIGHT,
  TableName,
  tableGeometry,
} from "./parts";

const ERD_Y = 296;
const TABLE_X = 560;
const TABLE_Y = 588;
const HEAD_H = 46;
const ROW_H = 52;
const ERR_X = 960;

/**
 * A key of two columns: the lesson's roster, where student 7 takes two
 * courses and course 42 has two students, so neither id is unique but the
 * pair is, and enrolling 7 in 42 again is refused. Then the turn: a key
 * should almost never change, because other tables point at it.
 */
export const RosterScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("roster").from;
  const twoColsAt = n.word("roster", "two columns");
  const rosterAt = n.word("roster", "roster");
  const sevenAt = n.word("roster", "student seven");
  const takesAt = n.word("roster", "takes");
  const coursesAt = n.word("roster", "two courses");
  const fortyTwoAt = n.word("roster", "course forty-two");
  const studentsAt = n.word("roster", "two students");
  const neitherAt = n.word("pair", "Neither");
  const pairAt = n.word("pair", "pair is");
  const onceAt = n.word("pair", "only once");
  const neverAt = n.word("stable", "never change");
  const pointAt = n.word("stable", "point at it");
  const whatAt = n.word("kinds-in", "what");
  const end = n.beat("kinds-in").to;

  const students = useEntityLayout({
    x: 120,
    y: y(ERD_Y),
    width: 330,
    name: "students",
    columns: [
      { name: "student_id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const enrollments = useEntityLayout({
    x: 760,
    y: y(ERD_Y),
    width: 420,
    name: "enrollments",
    columns: [
      { name: "student_id", type: "integer", key: "PK, FK" },
      { name: "course_id", type: "integer", key: "PK, FK" },
      { name: "enrolled_on", type: "date" },
    ],
  });
  const courses = useEntityLayout({
    x: 1440,
    y: y(ERD_Y),
    width: 330,
    name: "courses",
    columns: [
      { name: "course_id", type: "integer", key: "PK" },
      { name: "title", type: "text" },
    ],
  });
  const s = students.anchor("right", "student_id");
  const es = enrollments.anchor("left", "student_id");
  const c = courses.anchor("left", "course_id");
  const ec = enrollments.anchor("right", "course_id");
  const midX = (c[0] + ec[0]) / 2;
  const studentLine = [s, es] as const;
  const courseLine = [c, [midX, c[1]], [midX, ec[1]], ec] as const;

  // ── The rows, and the one Postgres refused ──
  const cols = [
    { name: "student_id", numeric: true, ink: KEY_INK },
    { name: "course_id", numeric: true, ink: KEY_INK },
  ];
  const rows = [...ROSTER.rows.rows, ROSTER.againKey];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = ROSTER.rows.rows.length;
  const sevens = ROSTER.rows.rows.flatMap((r, i) => (r[0] === ROSTER.againKey[0] ? [i] : []));
  const fortyTwos = ROSTER.rows.rows.flatMap((r, i) => (r[1] === ROSTER.againKey[1] ? [i] : []));
  const pairRow = ROSTER.rows.rows.findIndex((r) => r[0] === ROSTER.againKey[0] && r[1] === ROSTER.againKey[1]);

  return (
    <AbsoluteFill>
      {/* ── Sound: the entities, the two lines, the rows, the refusal ── */}
      <Sfx name="el-whoosh" at={rosterAt - 6} level={-34} />
      <Sfx name="el-pencil" at={takesAt} level={-34} />
      <Sfx name="el-pencil" at={studentsAt - 4} level={-34} />
      <Sfx name="el-tap" at={pairAt} level={-28} />
      <Sfx name="el-scratch" at={onceAt + 2} level={-30} />
      <Sfx name="el-pencil" at={pointAt - 2} level={-33} />

      <Drift from={from} to={end + 50}>
        <Headline lead="Two columns," turn="one key." at={twoColsAt - 6} turnAt={pairAt - 4} out={whatAt - 4} />
        <Ink at={whatAt - 2} dur={18} style={{ left: 92, top: y(150), whiteSpace: "nowrap" }}>
          <span style={{ ...body(60, true), color: INK }}>So what should a key be?</span>
        </Ink>

        {/* ── The roster's diagram ── */}
        <Entity
          layout={enrollments}
          at={rosterAt - 4}
          marks={{
            student_id: { at: pairAt, tone: "key", out: neverAt },
            course_id: { at: pairAt + 4, tone: "key", out: neverAt },
          }}
          dim={whatAt}
        />
        <Entity
          layout={students}
          at={sevenAt - 4}
          marks={{ student_id: { at: neverAt, tone: "key" } }}
          dim={whatAt}
        />
        <Entity
          layout={courses}
          at={fortyTwoAt - 4}
          marks={{ course_id: { at: neverAt + 6, tone: "key" } }}
          dim={whatAt}
        />
        <Relation name="students to enrollments" points={studentLine} from="exactly-one" to="zero-or-many" at={takesAt - 2} dim={whatAt} />
        <Relation name="courses to enrollments" points={courseLine} from="exactly-one" to="zero-or-many" at={studentsAt - 6} dim={whatAt} />
        {/* "Other tables point at it": the two lines again, in the key blue. */}
        <Relation name="students to enrollments, key" points={studentLine} from="exactly-one" to="zero-or-many" at={pointAt - 4} color={KEY} dim={whatAt} />
        <Relation name="courses to enrollments, key" points={courseLine} from="exactly-one" to="zero-or-many" at={pointAt + 2} color={KEY} dim={whatAt} />

        {/* ── The rows of enrollments ── */}
        <TableName g={g} at={sevenAt - 2} dim={neverAt}>
          enrollments, its key columns
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={sevenAt - 2}
          rows={[
            ...ROSTER.rows.rows.map((cells, i) => ({ cells, at: sevenAt + 4 + i * 5 })),
            { cells: ROSTER.againKey, at: onceAt - 6, ghost: true, grow: true, strikeAt: onceAt + 2 },
          ]}
          marks={[
            ...sevens.map((row, k) => ({ row, col: 0, at: coursesAt - 4 + k * 5, out: neitherAt + 6 })),
            ...fortyTwos.map((row, k) => ({ row, col: 1, at: studentsAt - 4 + k * 5, out: neitherAt + 6 })),
            { row: ghost, col: 0, at: onceAt, color: MARK_BAD },
            { row: ghost, col: 1, at: onceAt + 3, color: MARK_BAD },
          ]}
          bands={[{ row: pairRow, at: pairAt, color: MARK_KEY }]}
          dim={neverAt}
        />
        <Note at={neitherAt} x={120} y={g.rowTop(0) + 6} dim={neverAt}>
          <div style={{ ...noteStyle(22), lineHeight: 1.5 }}>
            <div>
              <span style={{ background: MARK, padding: "0 4px" }}>7</span> twice, <span style={{ background: MARK, padding: "0 4px" }}>42</span> twice:
            </div>
            <div>neither alone is unique.</div>
          </div>
        </Note>
        <ErrorBox
          x={ERR_X}
          top={g.rowTop(ghost) - 40}
          width={RIGHT - ERR_X}
          at={onceAt + 4}
          message={ROSTER.again.message}
          detail={ROSTER.again.detail}
          dim={neverAt}
        />
      </Drift>
    </AbsoluteFill>
  );
};
