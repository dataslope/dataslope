/**
 * School: a small college's students, courses and grades.
 *
 * What this dataset is for is the arithmetic of a transcript, which goes
 * wrong in quiet ways. A GPA is weighted by credits, so an unweighted average
 * of grade points is off by a little for almost everyone. Letter grades are
 * text, so sorting them alphabetically puts `B+` after `B`. And an enrollment
 * that is still in progress has a NULL grade, which has to stay out of the
 * numerator *and* the denominator of every ratio.
 *
 * The edge cases are there on purpose:
 *
 *  - The current term (`'2025-01'`) has no grades yet: ten in-progress
 *    enrollments, including the last course two students need to finish a
 *    department.
 *  - Three retakes: Dev Raman passed Calculus I twice (so counting credits
 *    per enrollment double-counts it, and flips one of his degree
 *    requirements to "met"), Elif Demir failed Calculus II and then passed
 *    it, and Isaac Mbeki failed Intro to Programming and is taking it again.
 *  - Ties: three students share the top grade in Calculus I, three in Intro
 *    to Programming, and two in Calculus II.
 *  - Lena Moreau has deferred and has no enrollments at all; Kiri Tane has
 *    only in-progress ones. Machine Learning (`CS310`) has never been taken.
 *  - `prerequisites` chains four courses deep, and Linear Algebra is
 *    reachable from Machine Learning along two paths, so a recursive walk
 *    finds it twice.
 *  - Terms are named by the month they start (`'2023-09'`, `'2024-01'`, ...),
 *    so they sort chronologically as text.
 *
 * `requirements` holds each major's minimum credits per department, for the
 * degree-audit challenge.
 */

import type { ChallengeDataset } from "./datasets";

const SCHOOL_SQL = `
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  full_name  TEXT    NOT NULL,
  major      TEXT    NOT NULL,
  entry_year INTEGER NOT NULL
);
INSERT INTO students VALUES
  (1,  'Amara Osei',        'Computer Science', 2023),
  (2,  'Bruno Castellanos', 'Mathematics',      2023),
  (3,  'Chloe Nakamura',    'Physics',          2023),
  (4,  'Dev Raman',         'Computer Science', 2023),
  (5,  'Elif Demir',        'Mathematics',      2023),
  (6,  'Farah Haddad',      'Computer Science', 2024),
  (7,  'Gus Lindqvist',     'Physics',          2024),
  (8,  'Hana Kowalski',     'Mathematics',      2024),
  (9,  'Isaac Mbeki',       'Computer Science', 2024),
  (10, 'Kiri Tane',         'Mathematics',      2025),
  (11, 'Lena Moreau',       'Computer Science', 2025);

CREATE TABLE courses (
  course_id   INTEGER PRIMARY KEY,
  course_code TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  department  TEXT    NOT NULL,
  credits     INTEGER NOT NULL
);
INSERT INTO courses VALUES
  (1,  'MATH101', 'Calculus I',           'Mathematics',      4),
  (2,  'MATH102', 'Calculus II',          'Mathematics',      4),
  (3,  'MATH201', 'Linear Algebra',       'Mathematics',      3),
  (4,  'MATH301', 'Real Analysis',        'Mathematics',      3),
  (5,  'CS101',   'Intro to Programming', 'Computer Science', 4),
  (6,  'CS201',   'Data Structures',      'Computer Science', 4),
  (7,  'CS301',   'Algorithms',           'Computer Science', 3),
  (8,  'CS310',   'Machine Learning',     'Computer Science', 3),
  (9,  'PHYS101', 'Mechanics',            'Physics',          4),
  (10, 'PHYS201', 'Electromagnetism',     'Physics',          4),
  (11, 'WRIT101', 'Academic Writing',     'Humanities',       3),
  (12, 'HIST210', 'History of Science',   'Humanities',       3);

CREATE TABLE prerequisites (
  course_id   INTEGER NOT NULL REFERENCES courses(course_id),
  requires_id INTEGER NOT NULL REFERENCES courses(course_id),
  PRIMARY KEY (course_id, requires_id)
);
INSERT INTO prerequisites VALUES
  (2, 1), (3, 2), (4, 3),
  (6, 5), (7, 6), (7, 3), (8, 7), (8, 3),
  (10, 9), (10, 2),
  (12, 11);

CREATE TABLE grade_points (
  grade  TEXT PRIMARY KEY,
  points REAL NOT NULL
);
INSERT INTO grade_points VALUES
  ('A', 4.0), ('A-', 3.7), ('B+', 3.3), ('B', 3.0), ('B-', 2.7),
  ('C+', 2.3), ('C', 2.0), ('D', 1.0), ('F', 0.0);

CREATE TABLE enrollments (
  enrollment_id INTEGER PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES students(student_id),
  course_id     INTEGER NOT NULL REFERENCES courses(course_id),
  term          TEXT    NOT NULL,
  grade         TEXT    REFERENCES grade_points(grade)
);
INSERT INTO enrollments VALUES
  (1,  1,  5,  '2023-09', 'A'),
  (2,  1,  1,  '2023-09', 'B+'),
  (3,  1,  11, '2023-09', 'A-'),
  (4,  2,  1,  '2023-09', 'A'),
  (5,  2,  5,  '2023-09', 'B'),
  (6,  3,  9,  '2023-09', 'B+'),
  (7,  3,  1,  '2023-09', 'A'),
  (8,  4,  5,  '2023-09', 'B+'),
  (9,  4,  1,  '2023-09', 'C'),
  (10, 5,  1,  '2023-09', 'B'),
  (11, 5,  11, '2023-09', 'B+'),
  (12, 1,  6,  '2024-01', 'A'),
  (13, 1,  2,  '2024-01', 'B'),
  (14, 2,  2,  '2024-01', 'A-'),
  (15, 2,  11, '2024-01', 'C+'),
  (16, 3,  2,  '2024-01', 'A-'),
  (17, 3,  11, '2024-01', 'A'),
  (18, 4,  6,  '2024-01', 'B'),
  (19, 4,  1,  '2024-01', 'B+'),
  (20, 5,  2,  '2024-01', 'F'),
  (21, 5,  5,  '2024-01', 'A'),
  (22, 1,  3,  '2024-09', 'B+'),
  (23, 1,  12, '2024-09', 'A'),
  (24, 2,  3,  '2024-09', 'A'),
  (25, 3,  10, '2024-09', 'B'),
  (26, 3,  12, '2024-09', 'A-'),
  (27, 4,  11, '2024-09', 'B+'),
  (28, 5,  2,  '2024-09', 'B+'),
  (29, 6,  5,  '2024-09', 'A'),
  (30, 6,  1,  '2024-09', 'A'),
  (31, 7,  9,  '2024-09', 'A-'),
  (32, 7,  1,  '2024-09', 'B-'),
  (33, 8,  1,  '2024-09', 'D'),
  (34, 8,  11, '2024-09', 'B'),
  (35, 9,  5,  '2024-09', 'F'),
  (36, 1,  7,  '2025-01', NULL),
  (37, 2,  4,  '2025-01', NULL),
  (38, 5,  3,  '2025-01', NULL),
  (39, 6,  6,  '2025-01', NULL),
  (40, 6,  2,  '2025-01', NULL),
  (41, 7,  2,  '2025-01', NULL),
  (42, 8,  12, '2025-01', NULL),
  (43, 9,  5,  '2025-01', NULL),
  (44, 10, 1,  '2025-01', NULL),
  (45, 10, 11, '2025-01', NULL);

CREATE TABLE requirements (
  major       TEXT    NOT NULL,
  department  TEXT    NOT NULL,
  min_credits INTEGER NOT NULL,
  PRIMARY KEY (major, department)
);
INSERT INTO requirements VALUES
  ('Computer Science', 'Computer Science', 11),
  ('Computer Science', 'Mathematics',       8),
  ('Computer Science', 'Humanities',        3),
  ('Mathematics',      'Mathematics',      14),
  ('Mathematics',      'Computer Science',  4),
  ('Mathematics',      'Humanities',        3),
  ('Physics',          'Physics',           8),
  ('Physics',          'Mathematics',       8),
  ('Physics',          'Humanities',        3);
`;

export const SCHOOL: ChallengeDataset = {
  initSql: SCHOOL_SQL,
  schema: [
    {
      name: "enrollments",
      rows: "45",
      columns: [
        { name: "enrollment_id", type: "integer", key: "pk" },
        { name: "student_id", type: "integer", key: "fk" },
        { name: "course_id", type: "integer", key: "fk" },
        { name: "term", type: "text" },
        { name: "grade", type: "text", key: "fk" },
      ],
    },
    {
      name: "students",
      rows: "11",
      columns: [
        { name: "student_id", type: "integer", key: "pk" },
        { name: "full_name", type: "text" },
        { name: "major", type: "text" },
        { name: "entry_year", type: "integer" },
      ],
    },
    {
      name: "courses",
      rows: "12",
      columns: [
        { name: "course_id", type: "integer", key: "pk" },
        { name: "course_code", type: "text" },
        { name: "title", type: "text" },
        { name: "department", type: "text" },
        { name: "credits", type: "integer" },
      ],
    },
    {
      name: "prerequisites",
      rows: "11",
      columns: [
        { name: "course_id", type: "integer", key: "fk" },
        { name: "requires_id", type: "integer", key: "fk" },
      ],
    },
    {
      name: "grade_points",
      rows: "9",
      columns: [
        { name: "grade", type: "text", key: "pk" },
        { name: "points", type: "real" },
      ],
    },
    {
      name: "requirements",
      rows: "9",
      columns: [
        { name: "major", type: "text" },
        { name: "department", type: "text" },
        { name: "min_credits", type: "integer" },
      ],
    },
  ],
};
