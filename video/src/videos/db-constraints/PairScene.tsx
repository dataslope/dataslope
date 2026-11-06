import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ONE_TO_ONE, PAIR, PRICE, STATUS } from "./data";
import {
  DbTable,
  ErrorBox,
  Head,
  HEAD_H,
  Kicker,
  MARK_BAD,
  Pill,
  ROW_H,
  RuleTags,
  tableGeometry,
  Tick,
  X0,
} from "./parts";

const MID_X = 490;
const TABLE_AT = 1400;
/** Profiles' rows, right of the profiles card and its UNIQUE tag. */
const PROFILES_AT = 1300;
/** The closing recap's left edge: the group centred on the page. */
const RECAP_X = 760;
/** Each figure's "Fig. N" line, 50px over its highest box: students for the
 *  first, profiles (y 480 less a row) for the second. */
const FIG_A_Y = 320;
const FIG_B_Y = 384;

/**
 * Part 4, pairs: enrollments between students and courses, where each id
 * repeats but the pair may not; then UNIQUE on profiles' foreign key, which
 * is how one to one is built (Unit 5's pattern), and a second profile for
 * user 1 refused. The figure then clears for the recap: missing and repeated
 * are covered, wrong values are next.
 */
export const PairScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("pair").from;
  const studentAt = n.word("pair", "A student");
  const takesAt = n.word("pair", "takes");
  const coursesAt = n.word("pair", "many courses");
  const courseAt = n.word("pair", "a course");
  const hasAt = n.word("pair", "has");
  const studentsAt = n.word("pair", "many students");
  const bothAt = n.word("pair", "both");
  const soAt = n.word("pair", "So");
  const repeatAt = n.word("pair", "repeat");
  const eachPairAt = n.word("pair", "each pair");
  const enrollAt = n.word("again", "Enroll");
  const oneAt = n.word("again", "one");
  const tenAt = n.word("again", "ten");
  const secondAt = n.word("again", "second time");
  const bouncesAt = n.word("again", "bounces");
  const putAt = n.word("oneone", "Put");
  const fkAt = n.word("oneone", "foreign key");
  const eachUserAt = n.word("oneone", "each user");
  const mostAt = n.word("oneone", "at most");
  const profileAt = n.word("second", "second profile");
  const userOneAt = n.word("second", "user one");
  const bouncedAt = n.word("second", "bounces");
  const oneToOneAt = n.word("second", "one to one");
  const coversAt = n.word("check-in", "covers");
  const missingAt = n.word("check-in", "missing");
  const repeatedAt = n.word("check-in", "repeated");
  const valuesAt = n.word("check-in", "values");
  const wrongAt = n.word("check-in", "wrong");

  // ── Students and courses, many to many through enrollments ──
  const students = useEntityLayout({
    x: X0,
    y: y(370),
    width: 300,
    name: "students",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const courses = useEntityLayout({
    x: X0,
    y: y(600),
    width: 300,
    name: "courses",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "title", type: "text" },
    ],
  });
  const enrollments = useEntityLayout({
    x: 560,
    y: y(460),
    width: 390,
    name: "enrollments",
    columns: [
      { name: "student_id", type: "integer", key: "FK" },
      { name: "course_id", type: "integer", key: "FK" },
      { name: "enrolled_on", type: "date" },
    ],
  });
  const s0 = students.anchor("right", "id");
  const s1 = enrollments.anchor("left", "student_id");
  const c0 = courses.anchor("right", "id");
  const c1 = enrollments.anchor("left", "course_id");

  const rows = [...PAIR.rows, PAIR.attempt];
  const g = tableGeometry({ x: TABLE_AT, top: y(370), cols: PAIR.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = PAIR.rows.length;
  // Rows that hold student 1, and rows that hold course 10.
  const s1Rows = PAIR.rows.map((r, i) => (r[0] === PAIR.attempt[0] ? i : -1)).filter((i) => i >= 0);
  const c10Rows = PAIR.rows.map((r, i) => (r[1] === PAIR.attempt[1] ? i : -1)).filter((i) => i >= 0);
  const same = PAIR.rows.findIndex((r) => r[0] === PAIR.attempt[0] && r[1] === PAIR.attempt[1]);

  // ── Users and profiles, one to one ──
  const users = useEntityLayout({
    x: X0,
    y: y(480),
    width: 340,
    name: "users",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "email", type: "text" },
    ],
  });
  const profiles = useEntityLayout({
    x: 720,
    y: y(480) - h(46),
    width: 420,
    name: "profiles",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "user_id", type: "integer", key: "FK" },
      { name: "display_name", type: "text" },
    ],
  });

  const gp = tableGeometry({
    x: PROFILES_AT,
    top: profiles.top,
    cols: ONE_TO_ONE.cols,
    rows: [...ONE_TO_ONE.rows, ONE_TO_ONE.attempt],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  const outA = putAt - 2;
  const outB = coversAt;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={studentAt - 4} level={-30} />
      <Sfx name="el-pencil" at={takesAt + 4} level={-34} />
      <Sfx name="el-pencil" at={hasAt} level={-34} />
      <Sfx name="el-tap" at={enrollAt - 2} level={-28} />
      <Sfx name="el-scratch" at={bouncesAt + 2} level={-30} />
      <Sfx name="el-whoosh" at={outA} level={-34} />
      <Sfx name="el-pencil" at={eachUserAt} level={-34} />
      <Sfx name="el-tap" at={profileAt - 2} level={-28} />
      <Sfx name="el-scratch" at={bouncedAt + 2} level={-30} />
      <Sfx name="el-whoosh" at={outB} level={-34} />

      <Kicker at={open - 10}>No repeats</Kicker>
      <Head lead="Many to many." at={open - 6} turn="Each pair, only once." turnAt={eachPairAt - 4} out={outA} />
      <Head lead="Unique on a foreign key." at={fkAt - 4} turn="One to one." turnAt={oneToOneAt - 4} out={outB} />
      <Head lead="Missing and repeated: covered." at={outB + 8} turn="Wrong values?" turnAt={valuesAt - 4} />

      {/* ── Fig. 9: many to many ── */}
      <FigLabel n="9" title="Students and courses, each pair enrolled once" at={studentAt - 6} x={X0} y={y(FIG_A_Y)} out={outA} />
      <Entity layout={students} at={studentAt - 4} out={outA} />
      <Entity
        layout={enrollments}
        at={takesAt - 2}
        marks={{ student_id: { at: soAt, out: eachPairAt + 8 }, course_id: { at: soAt + 5, out: eachPairAt + 8 } }}
        out={outA}
      />
      <Entity layout={courses} at={courseAt - 4} out={outA} />
      <Relation
        name="students in enrollments"
        points={[s0, [MID_X, s0[1]], [MID_X, s1[1]], s1]}
        from="exactly-one"
        to="zero-or-many"
        at={takesAt + 4}
        out={outA}
      />
      <Relation
        name="courses in enrollments"
        points={[c0, [MID_X, c0[1]], [MID_X, c1[1]], c1]}
        from="exactly-one"
        to="zero-or-many"
        at={hasAt}
        out={outA}
      />
      <RuleTags
        layout={enrollments}
        row="student_id"
        span="course_id"
        chips={[{ code: "UNIQUE (student_id, course_id)", at: eachPairAt - 2, pulses: [bouncesAt + 4] }]}
        out={outA}
      />
      <DbTable
        g={g}
        cols={PAIR.cols}
        at={coursesAt - 6}
        numeric={[0, 1]}
        rows={[
          ...PAIR.rows.map((cells, i) => ({ cells, at: [coursesAt, coursesAt + 7, studentsAt][i] ?? studentsAt })),
          { cells: PAIR.attempt, at: enrollAt - 2, ghost: true, grow: true, strikeAt: bouncesAt + 2 },
        ]}
        marks={[
          ...s1Rows.map((row, k) => ({ row, col: 0, at: bothAt + k * 4, out: eachPairAt })),
          ...c10Rows.map((row, k) => ({ row, col: 1, at: repeatAt + k * 4, out: eachPairAt })),
          { row: ghost, col: 0, at: oneAt, color: MARK_BAD },
          { row: ghost, col: 1, at: tenAt, color: MARK_BAD },
        ]}
        bands={[{ row: same, at: secondAt, out: outA }]}
        out={outA}
      />
      <ErrorBox
        x={560}
        top={courses.bottom + h(40)}
        width={1824 - 560}
        at={bouncesAt}
        message={PAIR.refusal.message}
        detail={PAIR.refusal.detail}
        name={PAIR.refusal.constraint}
        nameAt={bouncesAt + 10}
        out={outA}
      />

      {/* ── Fig. 10: one to one ── */}
      <FigLabel n="10" title="Users and profiles, one to one" at={fkAt - 10} x={X0} y={y(FIG_B_Y)} out={outB} />
      <Entity layout={users} at={fkAt - 8} out={outB} />
      <Entity layout={profiles} at={fkAt - 4} marks={{ user_id: { at: fkAt + 2, tone: "key" } }} out={outB} />
      <RuleTags
        layout={profiles}
        row="user_id"
        chips={[{ code: "UNIQUE", at: fkAt + 4, pulses: [mostAt, bouncedAt + 4] }]}
        out={outB}
      />
      <Relation
        name="users have profiles"
        points={[users.anchor("right", "id"), profiles.anchor("left", "user_id")]}
        from="exactly-one"
        to="zero-or-one"
        at={eachUserAt}
        label="at most one"
        labelAt={mostAt}
        labelPos={[users.right + 40, users.anchor("right", "id")[1] - 40]}
        out={outB}
      />
      <DbTable
        g={gp}
        cols={ONE_TO_ONE.cols}
        at={eachUserAt - 6}
        numeric={[0, 1]}
        rows={[
          ...ONE_TO_ONE.rows.map((cells) => ({ cells, at: eachUserAt })),
          { cells: ONE_TO_ONE.attempt, at: profileAt - 2, ghost: true, grow: true, strikeAt: bouncedAt + 2 },
        ]}
        marks={[
          { row: 0, col: 1, at: userOneAt, out: outB },
          { row: ONE_TO_ONE.rows.length, col: 1, at: userOneAt + 4, color: MARK_BAD },
        ]}
        out={outB}
      />
      <ErrorBox
        x={720}
        top={profiles.bottom + h(36)}
        width={1824 - 720}
        at={bouncedAt}
        message={ONE_TO_ONE.refusal.message}
        detail={ONE_TO_ONE.refusal.detail}
        name={ONE_TO_ONE.refusal.constraint}
        nameAt={bouncedAt + 10}
        out={outB}
      />

      {/* ── Missing and repeated are covered; wrong values are next ── */}
      <Pill x={RECAP_X} y={y(480)} at={missingAt - 2} size={26}>
        NOT NULL
      </Pill>
      <Pill x={RECAP_X + 250} y={y(480)} at={repeatedAt - 2} size={26}>
        UNIQUE
      </Pill>
      <Tick x={RECAP_X + 170} y={y(480)} at={missingAt + 6} size={22} />
      <Tick x={RECAP_X + 386} y={y(480)} at={repeatedAt + 6} size={22} />
      {/* ── What about values that are just wrong? ── */}
      {(
        [
          [PRICE.failing[2], valuesAt],
          [`'${STATUS.failing[3]}'`, wrongAt],
        ] as const
      ).map(([v, at], i) => (
        <Ink key={String(v)} at={at - 2} dur={12} style={{ left: RECAP_X + i * 250, top: y(560), whiteSpace: "nowrap" }}>
          <span
            style={{
              ...note(34, ACCENT_INK),
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: 8,
              border: `2px dashed ${INK_SOFT}`,
              fontWeight: 600,
            }}
          >
            <span style={{ fontFamily: MONO }}>{v}</span>
          </span>
        </Ink>
      ))}
    </AbsoluteFill>
  );
};
