import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK } from "../../editorial/style";
import { FigLabel, type Pt } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { courseId, MTM, studentId } from "./data";
import {
  Caption,
  Chip,
  DbTable,
  Drift,
  FIG_ABOVE,
  HEAD_H,
  Head,
  KEY_INK,
  Kicker,
  Link,
  MARK,
  MARK_BAD,
  MARK_OK,
  OK_INK,
  Pulse,
  ROW_H,
  Spot,
  Mark,
  Tag,
  tableGeometry,
} from "./parts";

const STUDENT_X = 160;
const STUDENT_W = 170;
const COURSE_X = 580;
const COURSE_W = 190;
const STUDENT_Y: Record<string, number> = { Ada: 480, Grace: 650 };
const COURSE_Y: Record<string, number> = { Math: 450, History: 565, Art: 680 };
/** The column titles over the chips, before `y()`. */
const NAMES_Y = 380;
const RIGHT_X = 980;
const SLOT_Y = 440;
const FLIP_Y = 690;
/** A table cell's side padding (parts.tsx), to set a tag flush with a number. */
const CELL_PAD = 20;

/** Where segments a-b and c-d cross. */
const cross = (a: Pt, b: Pt, c: Pt, d: Pt): Pt => {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
};

/**
 * Part 2 opens: students and courses, many on both sides, as crossing links.
 * Then the one slot a single foreign key gives, tried from each side.
 */
export const CrossScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("cross").from;
  const studentAt = n.word("cross", "A student");
  const coursesAt = n.word("cross", "courses");
  const math1At = n.word("cross", "Math", { nth: 1 });
  const historyAt = n.word("cross", "History");
  const math2At = n.word("cross", "Math", { nth: 2 });
  const artAt = n.word("cross", "Art");
  const crossAt = n.word("tangle", "cross");
  const neitherAt = n.word("tangle", "neither");
  const giveAt = n.word("slot", "Give students");
  const adaRowAt = n.word("slot", "Ada's row");
  const roomAt = n.word("slot", "room for one");
  const fitsAt = n.word("slot", "Math fits");
  const whereAt = n.word("slot", "where does History");
  const flipAt = n.word("flip", "Flip it");
  const flipRoomAt = n.word("flip", "room for one student");
  const graceGoAt = n.word("flip", "Grace go");
  const forcesAt = n.word("one-side", "forces");
  const beOneAt = n.word("one-side", "be one");

  // ── The crossing links (many-to-many.mdx's first picture) ──
  const stud = (name: string): Pt => [STUDENT_X + STUDENT_W, y(STUDENT_Y[name])];
  const course = (title: string): Pt => [COURSE_X, y(COURSE_Y[title])];
  const pairs = MTM.pairs.filter((p) => p.name in STUDENT_Y && p.title in COURSE_Y);
  const linkAt = (name: string, title: string) =>
    name === "Ada" ? (title === "Math" ? math1At : historyAt) : title === "Math" ? math2At : artAt;
  const knot = cross(stud("Ada"), course("History"), stud("Grace"), course("Math"));

  // ── One slot, from each side ──
  const ada = MTM.studentRows.find((s) => s.name === "Ada")!;
  const math = MTM.courseRows.find((c) => c.title === "Math")!;
  const slotCols = ["id", "name", "course_id"];
  const slotRow = [String(ada.id), ada.name, String(courseId("Math"))];
  const sg = tableGeometry({ x: RIGHT_X, top: y(SLOT_Y), cols: slotCols, rows: [slotRow], headH: h(HEAD_H), rowH: h(ROW_H) });
  const flipCols = ["id", "title", "student_id"];
  const flipRow = [String(math.id), math.title, String(studentId("Ada"))];
  const fg = tableGeometry({ x: RIGHT_X, top: y(FLIP_Y), cols: flipCols, rows: [flipRow], headH: h(HEAD_H), rowH: h(ROW_H) });

  const leftDim = giveAt - 6;
  // Fig. 6 and Fig. 7 share one label line, over the higher of the two.
  const figY = Math.min(y(NAMES_Y), sg.top - 48) - FIG_ABOVE;
  const bounce = (at: number) => Math.sin(Math.min(1, Math.max(0, (frame - at - 14) / 16)) * Math.PI) * -10;

  return (
    <AbsoluteFill>
      {/* ── Sound: each link drawn, the knot, the slots, the two that don't fit ── */}
      <Sfx name="el-pencil" at={math1At} level={-35} />
      <Sfx name="el-pencil" at={math2At} level={-35} />
      <Sfx name="el-pop" at={crossAt} level={-30} />
      <Sfx name="el-tap" at={fitsAt} level={-28} />
      <Sfx name="el-whoosh" at={whereAt} level={-34} />
      <Sfx name="el-scratch" at={forcesAt} level={-31} />

      <Kicker at={from - 10}>Many to many</Kicker>
      <Head lead="Many on both sides," leadAt={from - 6} turn="so no parent." turnAt={neitherAt - 2} />
      <Spot id="db-relationship-patterns-books" at={coursesAt} left={1570} top={y(66)} width={250} height={250} />

      {/* ── Students and courses, linked as they are named. The label stays
          out of the drift, level with Fig. 7's, and steps back with its figure. ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, leftDim, 16) * 0.45 }}>
        <FigLabel n="6" title="Students linked to the courses they take" at={studentAt - 4} x={STUDENT_X} y={figY} />
      </div>
      <Drift from={from} to={giveAt} scale={0.02} origin={[480, y(560)]}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, leftDim, 16) * 0.45 }}>
          <Caption at={studentAt} x={STUDENT_X} y={y(NAMES_Y)}>
            students
          </Caption>
          <Caption at={coursesAt - 2} x={COURSE_X} y={y(NAMES_Y)}>
            courses
          </Caption>
          {pairs.map((p) => (
            <Link key={`${p.name}${p.title}`} a={stud(p.name)} b={course(p.title)} at={linkAt(p.name, p.title)} dur={12} />
          ))}
          {/* The chips arrive with the general claim; the links wait for
              the names, so the specific pairings still land on their words. */}
          {Object.keys(STUDENT_Y).map((name, k) => (
            <Chip
              key={name}
              x={STUDENT_X}
              y={y(STUDENT_Y[name])}
              width={STUDENT_W}
              at={studentAt + 6 + k * 5}
              name={name}
              tone={{ at: neitherAt, color: MARK }}
            />
          ))}
          {Object.keys(COURSE_Y).map((title, k) => (
            <Chip
              key={title}
              x={COURSE_X}
              y={y(COURSE_Y[title])}
              width={COURSE_W}
              at={coursesAt + 6 + k * 5}
              name={title}
              tone={{ at: neitherAt + 6, color: MARK }}
            />
          ))}
          <Pulse x={knot[0]} y={knot[1]} at={crossAt} r={8} />
          <Pulse x={knot[0]} y={knot[1]} at={crossAt + 10} r={8} />
        </div>
      </Drift>

      {/* ── A course id on students: one slot ── */}
      <FigLabel n="7" title="One foreign key, tried from each side" at={giveAt - 2} x={RIGHT_X} y={figY} />
      <Caption at={giveAt} x={RIGHT_X} y={sg.top - 48}>
        students, with a course_id
      </Caption>
      <DbTable
        g={sg}
        cols={slotCols}
        rows={[{ cells: slotRow, at: adaRowAt }]}
        at={giveAt + 4}
        numeric={[0, 2]}
        colInk={{ 0: KEY_INK, 2: KEY_INK }}
        marks={[
          { row: 0, col: 2, at: roomAt, color: MARK },
          { row: 0, col: 2, at: fitsAt, color: MARK_OK },
        ]}
        dim={beOneAt + 10}
      />
      {/* What the key names, set under the number it names (right-aligned, as the column is). */}
      <Tag at={fitsAt} x={sg.xs[2] + sg.widths[2] - CELL_PAD} y={sg.rowTop(1) + 12} color={OK_INK} size={22} align="right">
        Math
      </Tag>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${bounce(whereAt)}px)` }}>
        <Chip
          x={sg.x + sg.width + 34}
          fromX={sg.x + sg.width + 260}
          y={sg.rowMid(0)}
          width={200}
          at={whereAt}
          travel={16}
          name="History?"
          border={ACCENT}
          dashed
          tone={{ at: forcesAt, color: MARK_BAD }}
        />
      </div>

      {/* ── Flipped: a student id on courses, one slot again ── */}
      <Caption at={flipAt} x={RIGHT_X} y={fg.top - 48}>
        courses, with a student_id
      </Caption>
      <DbTable
        g={fg}
        cols={flipCols}
        rows={[{ cells: flipRow, at: flipAt + 6 }]}
        at={flipAt + 2}
        numeric={[0, 2]}
        colInk={{ 0: KEY_INK, 2: KEY_INK }}
        marks={[
          { row: 0, col: 2, at: flipRoomAt, color: MARK },
          { row: 0, col: 2, at: flipRoomAt + 8, color: MARK_OK },
        ]}
        dim={beOneAt + 10}
      />
      <Tag at={flipRoomAt + 4} x={fg.xs[2] + fg.widths[2] - CELL_PAD} y={fg.rowTop(1) + 12} color={OK_INK} size={22} align="right">
        Ada
      </Tag>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${bounce(graceGoAt - 8)}px)` }}>
        <Chip
          x={fg.x + fg.width + 34}
          fromX={fg.x + fg.width + 260}
          y={fg.rowMid(0)}
          width={200}
          at={graceGoAt - 8}
          travel={16}
          name="Grace?"
          border={ACCENT}
          dashed
          tone={{ at: forcesAt + 4, color: MARK_BAD }}
        />
      </div>

      <Tag at={forcesAt - 2} x={RIGHT_X} y={fg.rowTop(1) + 62} color={ACCENT_INK} size={24}>
        <Mark at={beOneAt} color={MARK_BAD}>one column, one value</Mark>
      </Tag>
    </AbsoluteFill>
  );
};
