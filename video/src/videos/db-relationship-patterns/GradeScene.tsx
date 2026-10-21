import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { courseId, JT, studentId } from "./data";
import { Caption, DbTable, Drift, HEAD_H, Head, KEY_INK, Kicker, MARK, MARK_BAD, ROW_H, Tag, tableGeometry } from "./parts";

const LEFT_X = 120;
const RIGHT_X = 820;
const STUDENTS_Y = 400;
const COURSES_Y = 640;
/** The next shape, glimpsed under the junction rows: one table split in two. */
const PREVIEW_X = 820;
const PREVIEW_Y = 780;
const PREVIEW_W = 280;
const PREVIEW_GAP = 280;

/**
 * A grade is a fact about the pairing: it cannot sit on students (Ada has a
 * B and a C) or on courses (Math gave a B and a C), so it lives on the
 * junction row.
 */
export const GradeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("grade").from;
  const factsAt = n.word("grade", "facts");
  const gradeAt = n.word("grade", "a grade");
  const notStudentsAt = n.word("not-students", "Not on students");
  const bMathAt = n.word("not-students", "B in Math");
  const cHistAt = n.word("not-students", "C in History");
  const notCoursesAt = n.word("course", "Not on courses");
  const adaBAt = n.word("course", "Ada a B");
  const graceCAt = n.word("course", "Grace a C");
  const belongsAt = n.word("belongs", "belongs");
  const adaMathAt = n.word("belongs", "Ada in Math");
  const ownRowAt = n.word("belongs", "own row");
  const nextAt = n.word("one-in", "next shape");
  const splitsAt = n.word("one-in", "splits");
  const inTwoAt = n.word("one-in", "in two");

  // The junction's rows, joined to both parents (the lesson's own query).
  const COLS = JT.joinCols;
  const ROWS = JT.joinRows;
  const G = COLS.indexOf("grade");
  const rowOf = (name: string, title: string) => ROWS.findIndex((r) => r[0] === name && r[1] === title);
  const gradeOf = (name: string, title: string) => ROWS[rowOf(name, title)][G] as string;
  const adaMath = rowOf("Ada", "Math");
  const adaHist = rowOf("Ada", "History");
  const graceMath = rowOf("Grace", "Math");
  const jg = tableGeometry({ x: RIGHT_X, top: y(STUDENTS_Y), cols: COLS, rows: ROWS, headH: h(HEAD_H), rowH: h(ROW_H) });

  // Where a grade would sit if a parent had to hold it: one cell, two grades.
  const adaGrades = `${gradeOf("Ada", "Math")} or ${gradeOf("Ada", "History")}?`;
  const mathGrades = `${gradeOf("Ada", "Math")} or ${gradeOf("Grace", "Math")}?`;
  const sCols = ["id", "name", "grade"];
  const sRow = [String(studentId("Ada")), "Ada", gradeOf("Ada", "Math")];
  const sg = tableGeometry({ x: LEFT_X, top: y(STUDENTS_Y), cols: sCols, rows: [sRow], extra: [["", "", adaGrades]], headH: h(HEAD_H), rowH: h(ROW_H) });
  const cCols = ["id", "title", "grade"];
  const cRow = [String(courseId("Math")), "Math", gradeOf("Ada", "Math")];
  const cg = tableGeometry({ x: LEFT_X, top: y(COURSES_Y), cols: cCols, rows: [cRow], extra: [["", "", mathGrades]], headH: h(HEAD_H), rowH: h(ROW_H) });
  const leftDim = 1 - ease(frame, belongsAt, 14) * 0.5;

  // "Splits one thing in two": a users box, and a second box sliding out
  // from under it, the line between them drawn with the next part's ends.
  const whole = useEntityLayout({ x: PREVIEW_X, y: y(PREVIEW_Y), width: PREVIEW_W, name: "users", columns: [] });
  const part = useEntityLayout({ x: PREVIEW_X + PREVIEW_W + PREVIEW_GAP, y: y(PREVIEW_Y), width: PREVIEW_W, name: "user_profiles", columns: [] });
  const apart = ease(frame, inTwoAt - 6, 18);

  return (
    <AbsoluteFill>
      {/* ── Sound: each grade read, each parent that cannot hold it ── */}
      <Sfx name="el-tap" at={bMathAt} level={-29} />
      <Sfx name="el-tap" at={cHistAt} level={-29} />
      <Sfx name="el-scratch" at={cHistAt + 10} level={-31} />
      <Sfx name="el-tap" at={adaBAt} level={-29} />
      <Sfx name="el-scratch" at={graceCAt + 10} level={-31} />
      <Sfx name="el-pop" at={adaMathAt} level={-29} />
      <Sfx name="el-whoosh" at={inTwoAt - 6} level={-35} />
      <Sfx name="el-pencil" at={inTwoAt + 10} level={-34} />

      <Kicker at={from - 10}>Junction tables</Kicker>
      <Head lead="A fact about the pairing" leadAt={from - 6} turn="lives on its row." turnAt={ownRowAt - 6} />

      <Drift from={from} to={nextAt + 30} scale={0.016} origin={[960, y(560)]}>
      <Drift from={nextAt} to={n.beat("wide").from} scale={0.03} origin={[960, y(560)]}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, nextAt, 16) * 0.55 }}>
          {/* ── The junction's rows, with their grades ── */}
          <Caption at={from - 2} x={jg.x} y={jg.top - 48}>
            enrollments, joined to students and courses
          </Caption>
          <DbTable
            g={jg}
            cols={COLS}
            rows={ROWS.map((cells, i) => ({ cells, at: factsAt + i * 4 }))}
            at={from}
            headMarks={[{ col: G, at: gradeAt }]}
            marks={[
              { row: adaMath, col: G, at: bMathAt },
              { row: adaHist, col: G, at: cHistAt },
              { row: graceMath, col: G, at: graceCAt },
            ]}
            bands={[{ row: adaMath, at: adaMathAt, color: MARK }]}
          />
          <Tag at={adaMathAt + 6} x={jg.x + jg.width + 24} y={jg.rowMid(adaMath) - 14} color={KEY_INK} size={22}>
            Ada in Math
          </Tag>

          {/* ── Not on students ── */}
          <div style={{ position: "absolute", inset: 0, opacity: leftDim }}>
            <Caption at={notStudentsAt - 4} x={sg.x} y={sg.top - 48}>
              students
            </Caption>
            <DbTable
              g={sg}
              cols={sCols}
              rows={[{ cells: sRow, at: bMathAt - 4 }]}
              at={notStudentsAt}
              numeric={[0]}
              colInk={{ 0: KEY_INK }}
              marks={[
                { row: 0, col: 2, at: bMathAt },
                { row: 0, col: 2, at: cHistAt + 4, color: MARK_BAD },
              ]}
              swaps={[{ row: 0, col: 2, at: cHistAt + 4, value: adaGrades, color: ACCENT_INK }]}
            />
            <Tag at={cHistAt + 10} x={sg.x} y={sg.rowTop(1) + 14} color={ACCENT_INK} size={22}>
              one cell, two grades
            </Tag>

            {/* ── Nor on courses ── */}
            <Caption at={notCoursesAt - 4} x={cg.x} y={cg.top - 48}>
              courses
            </Caption>
            <DbTable
              g={cg}
              cols={cCols}
              rows={[{ cells: cRow, at: adaBAt - 4 }]}
              at={notCoursesAt}
              numeric={[0]}
              colInk={{ 0: KEY_INK }}
              marks={[
                { row: 0, col: 2, at: adaBAt },
                { row: 0, col: 2, at: graceCAt + 4, color: MARK_BAD },
              ]}
              swaps={[{ row: 0, col: 2, at: graceCAt + 4, value: mathGrades, color: ACCENT_INK }]}
            />
            <Tag at={graceCAt + 10} x={cg.x} y={cg.rowTop(1) + 14} color={ACCENT_INK} size={22}>
              one cell, two grades
            </Tag>
          </div>
        </div>
      </Drift>
      </Drift>

      {/* ── The next shape, glimpsed: one table splitting in two ── */}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(apart - 1) * (PREVIEW_W + PREVIEW_GAP)}px)` }}>
        <Entity layout={part} at={inTwoAt - 6} />
      </div>
      <Entity layout={whole} at={splitsAt - 4} />
      <Relation
        name="users to user_profiles"
        points={[whole.anchor("right"), part.anchor("left")]}
        from="exactly-one"
        to="zero-or-one"
        at={inTwoAt + 10}
        dur={14}
      />
    </AbsoluteFill>
  );
};
