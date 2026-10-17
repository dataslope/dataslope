import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MTM } from "./data";
import { Caption, DbTable, Drift, HEAD_H, Head, KEY_INK, Kicker, MARK, MARK_KEY, Pulse, Tag, tableGeometry } from "./parts";

const ERD_Y = 330;
const ROWS_Y = 572;
/** The rows' height here, before `h()`: a little tighter, so four fit under the diagram. */
const ROW_H = 50;

/**
 * The resolution: a third table, one row per pairing, its two foreign keys
 * pointing out at the two parents, so the many-to-many becomes two
 * one-to-manys.
 */
export const JunctionScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("pairing").from;
  const pairingAt = n.word("pairing", "every pairing");
  const thirdAt = n.word("pairing", "third table");
  const enrollAt = n.word("pairing", "enrollments");
  const adaMathAt = n.word("rows", "Ada in Math");
  const adaHistAt = n.word("rows", "Ada in History");
  const keysAt = n.word("rows", "two foreign keys");
  const twoAt = n.word("two", "two plain");
  const otmAt = n.word("two", "one-to-manys");
  const junctionAt = n.word("named", "junction table");
  const nameAt = n.word("named", "a name");

  const students = useEntityLayout({
    x: 120,
    y: y(ERD_Y),
    width: 320,
    name: "students",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const enrollments = useEntityLayout({
    x: 760,
    y: y(ERD_Y),
    width: 400,
    name: "enrollments",
    columns: [
      { name: "student_id", type: "integer", key: "PK, FK" },
      { name: "course_id", type: "integer", key: "PK, FK" },
    ],
  });
  const courses = useEntityLayout({
    x: 1480,
    y: y(ERD_Y),
    width: 320,
    name: "courses",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "title", type: "text" },
    ],
  });
  const sId = students.anchor("right", "id");
  const eS = enrollments.anchor("left", "student_id");
  const cId = courses.anchor("left", "id");
  const eC = enrollments.anchor("right", "course_id");
  const midR = (cId[0] + eC[0]) / 2;

  // Ada's and Grace's pairings, as the enrollments rows that hold them.
  const shownPairs = MTM.pairs.filter((p) => p.name === "Ada" || p.name === "Grace");
  const cols = ["student_id", "course_id"];
  const rows = shownPairs.map((p) => [String(p.studentId), String(p.courseId)]);
  const g = tableGeometry({ x: 760, top: y(ROWS_Y), cols, rows, headH: h(HEAD_H), rowH: h(ROW_H), minWidths: [200, 200] });
  const rowAt = [adaMathAt, adaHistAt, adaHistAt + 18, adaHistAt + 24];

  return (
    <AbsoluteFill>
      {/* ── Sound: the third box, each row, the two lines ── */}
      <Sfx name="el-tap" at={thirdAt} level={-28} />
      {rowAt.slice(0, 2).map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={-30} />
      ))}
      <Sfx name="el-pencil" at={twoAt} level={-33} />
      <Sfx name="el-pencil" at={otmAt} level={-33} />
      <Sfx name="el-pop" at={junctionAt} level={-30} />

      <Kicker at={from - 10}>Many to many</Kicker>
      <Head lead="Every pairing gets a row:" leadAt={from - 6} turn="a junction table." turnAt={junctionAt - 2} />

      <Drift from={pairingAt} to={nameAt + 50} scale={0.016} origin={[960, y(560)]}>
        <Entity layout={students} at={from - 4} />
        <Entity layout={courses} at={from + 2} />
        <Entity
          layout={enrollments}
          at={thirdAt - 2}
          rowAt={{ student_id: enrollAt, course_id: enrollAt + 6 }}
          marks={{ student_id: { at: keysAt, tone: "key" }, course_id: { at: keysAt + 5, tone: "key" } }}
        />
        <Relation name="students has enrollments" points={[sId, eS]} from="exactly-one" to="zero-or-many" at={twoAt} dur={18} label="has" />
        <Relation
          name="courses has enrollments"
          points={[cId, [midR, cId[1]], [midR, eC[1]], eC]}
          from="exactly-one"
          to="zero-or-many"
          at={otmAt}
          dur={18}
          label="has"
          labelPos={[midR + 12, cId[1] - 34]}
        />
        <Tag at={twoAt + 8} x={(sId[0] + eS[0]) / 2} y={sId[1] + 30} color={KEY_INK} align="center">
          one to many
        </Tag>
        <Tag at={otmAt + 8} x={midR} y={eC[1] + 30} color={KEY_INK} align="center">
          one to many
        </Tag>

        {/* ── The rows: one per pairing ── */}
        <Caption at={adaMathAt - 6} x={g.x} y={g.top - 44}>
          enrollments, one row per pairing
        </Caption>
        <DbTable
          g={g}
          cols={cols}
          rows={rows.map((cells, i) => ({ cells, at: rowAt[i] }))}
          at={adaMathAt - 4}
          numeric={[0, 1]}
          colInk={{ 0: KEY_INK, 1: KEY_INK }}
          marks={rows.flatMap((_, i) => [
            { row: i, col: 0, at: keysAt + i * 3, color: MARK_KEY },
            { row: i, col: 1, at: keysAt + 4 + i * 3, color: MARK_KEY },
          ])}
          bands={[
            { row: 0, at: adaMathAt + 2, out: adaHistAt, color: MARK },
            { row: 1, at: adaHistAt + 2, out: keysAt, color: MARK },
          ]}
        />
        {shownPairs.map((p, i) => (
          <Tag key={i} at={rowAt[i] + 4} x={g.x + g.width + 28} y={g.rowMid(i) - 14} size={22}>
            {p.name} in {p.title}
          </Tag>
        ))}
        <Tag at={nameAt - 10} x={g.x} y={g.rowTop(rows.length) + 18} italic size={22}>
          all {MTM.enrollments} pairings, {MTM.enrollments} rows
        </Tag>
        <Pulse x={enrollments.x + enrollments.width / 2} y={enrollments.top + enrollments.head / 2} at={nameAt} r={46} color={KEY_INK} />
      </Drift>
    </AbsoluteFill>
  );
};
