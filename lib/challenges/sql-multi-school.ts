/**
 * Multi-step SQL challenges over the school dataset.
 *
 * Both are documents a registrar actually produces, and both go wrong in the
 * last step if the first one was sloppy. The transcript's cumulative GPA is a
 * ratio of running sums, which averaging the term GPAs gets close to and
 * wrong; the degree audit has to start from what each major requires, or the
 * students who have passed nothing drop out of the one report that should
 * flag them.
 *
 * Shared constants carry each step's accepted query into the next step's
 * starter and CTE, so a fix in step 1 cannot leave step 3 quoting a version
 * that no longer exists. `__tests__/challengeSolutions` runs every step's
 * solution against node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { SCHOOL } from "./dataset-school";
import type { Challenge } from "./types";

// ─── Student transcript ──────────────────────────────────────────────

const QUALITY_BODY = `SELECT s.full_name, e.term, c.course_code, c.credits, e.grade,
       ROUND(g.points * c.credits, 1) AS quality_points
FROM enrollments e
JOIN students s     ON s.student_id = e.student_id
JOIN courses  c     ON c.course_id  = e.course_id
JOIN grade_points g ON g.grade      = e.grade`;

const QUALITY_POINTS = `${QUALITY_BODY}
ORDER BY s.full_name, e.term, c.course_code`;

const GRADED_CTE = `WITH graded AS (
${indentSql(QUALITY_BODY)}
)`;

const TERMS_CTE = `${GRADED_CTE}, terms AS (
  SELECT full_name, term,
         SUM(credits)        AS term_credits,
         SUM(quality_points) AS term_quality
  FROM graded
  GROUP BY full_name, term
)`;

const STUDENT_TRANSCRIPT = sqlSteps(
  {
    slug: "student-transcript",
    title: "Student Transcript",
    difficulty: "Intermediate",
    topic: "Running ratios",
    dataset: SCHOOL,
    description:
      "Build a transcript from grades to term GPA to a cumulative GPA that is weighted correctly.",
    solutionNote:
      "A GPA is a ratio of sums at every level: quality points over credits for a term, and running quality points over running credits for the cumulative figure. Every shortcut that averages averages, grade points per course or GPAs per term, quietly reweights the transcript toward light terms and small courses.",
  },
  [
    {
      title: "Quality points per course",
      short: "Points",
      solutionNote:
        "The inner join to `grade_points` does two jobs: it turns each letter into points, and it drops the ten in-progress enrollments, whose NULL grade matches nothing. A `LEFT JOIN` would keep them as rows of NULL quality points that every later sum would have to step around.",
      prompt: [
        "A transcript is built from quality points: a grade's `points` (from `grade_points`) times the course's `credits`. An A (4.0) in a 3-credit course is worth 12.",
        "List every graded enrollment with its credits, grade and `quality_points` rounded to 1 decimal place. In-progress enrollments have no grade yet and stay off the transcript.",
        "Sort by `full_name`, `term`, then `course_code`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "term", type: "text" },
        { name: "course_code", type: "text" },
        { name: "credits", type: "integer" },
        { name: "grade", type: "text" },
        { name: "quality_points", type: "real" },
      ],
      starter: `SELECT s.full_name, e.term, c.course_code, c.credits, e.grade
FROM enrollments e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
ORDER BY s.full_name, e.term, c.course_code
`,
      solution: QUALITY_POINTS,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, term, course_code, credits, grade and quality_points",
          expectedColumns: [
            "full_name",
            "term",
            "course_code",
            "credits",
            "grade",
            "quality_points",
          ],
        },
        {
          id: "rowcount",
          name: "Thirty-five graded enrollments",
          description: "The ten enrollments still in progress are not on the transcript.",
          expectedRowCount: 35,
        },
        {
          id: "ordered",
          name: "Quality points match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Term GPA",
      short: "Terms",
      solutionNote:
        "A term GPA is a ratio of two sums, `SUM(quality_points) / SUM(credits)`, not an average of anything: `AVG` of the grade points would let a 3-credit course count as much as a 4-credit one. Keeping the two sums apart rather than only their ratio is also what the next step needs.",
      prompt: [
        "Roll the transcript up to one row per student per term: `term_credits`, the credits graded that term, and `term_gpa`, the term's quality points divided by those credits.",
        "Round `term_gpa` to 2 decimal places. Sort by `full_name`, then `term`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "term", type: "text" },
        { name: "term_credits", type: "integer" },
        { name: "term_gpa", type: "real" },
      ],
      starter: `${GRADED_CTE}
SELECT full_name, term
FROM graded
GROUP BY full_name, term
ORDER BY full_name, term
`,
      solution: `${GRADED_CTE}
SELECT full_name, term,
       SUM(credits) AS term_credits,
       ROUND(SUM(quality_points) / SUM(credits), 2) AS term_gpa
FROM graded
GROUP BY full_name, term
ORDER BY full_name, term`,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, term, term_credits and term_gpa",
          expectedColumns: ["full_name", "term", "term_credits", "term_gpa"],
        },
        {
          id: "rowcount",
          name: "Nineteen student terms",
          expectedRowCount: 19,
        },
        {
          id: "ordered",
          name: "Term GPAs match the reference result",
          description: "Weighted by credits: an unweighted average of points is off for most terms.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Cumulative GPA",
      short: "Running",
      solutionNote:
        "With an `ORDER BY` in the window, `SUM(...) OVER` runs from the student's first term to the current one, so one running sum divided by the other is exactly the cumulative GPA. Averaging term GPAs weighs a 3-credit term like an 11-credit one: Bruno's cumulative GPA goes 3.50, 3.31, 3.43, where averaging his term GPAs would claim 3.53 after a final term of a single 3-credit A.",
      prompt: [
        "A transcript also shows the cumulative GPA after each term: every quality point earned so far divided by every credit graded so far.",
        "Averaging the term GPAs gets this wrong whenever terms carry different loads. Keep each term's quality points and credits (the `terms` CTE below does), then divide a running sum of one by a running sum of the other, using window functions ordered by `term`.",
        "Return each student's terms with `term_gpa` and `cumulative_gpa`, both rounded to 2 decimal places. Sort by `full_name`, then `term`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "term", type: "text" },
        { name: "term_gpa", type: "real" },
        { name: "cumulative_gpa", type: "real" },
      ],
      starter: `${TERMS_CTE}
SELECT full_name, term,
       ROUND(term_quality / term_credits, 2) AS term_gpa
       -- cumulative_gpa: everything earned so far over everything graded so far
FROM terms
ORDER BY full_name, term
`,
      solution: `${TERMS_CTE}
SELECT full_name, term,
       ROUND(term_quality / term_credits, 2) AS term_gpa,
       ROUND(SUM(term_quality) OVER w / SUM(term_credits) OVER w, 2) AS cumulative_gpa
FROM terms
WINDOW w AS (PARTITION BY full_name ORDER BY term)
ORDER BY full_name, term`,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, term, term_gpa and cumulative_gpa",
          expectedColumns: ["full_name", "term", "term_gpa", "cumulative_gpa"],
        },
        {
          id: "rowcount",
          name: "Still nineteen student terms",
          expectedRowCount: 19,
        },
        {
          id: "ordered",
          name: "Cumulative GPAs match the reference result",
          description:
            "Running quality points over running credits, not a running average of term GPAs.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Degree audit ────────────────────────────────────────────────────

const EARNED_BODY = `SELECT s.student_id, s.full_name, c.department, SUM(c.credits) AS credits
FROM (
  SELECT DISTINCT student_id, course_id
  FROM enrollments
  WHERE grade IS NOT NULL AND grade <> 'F'
) p
JOIN students s ON s.student_id = p.student_id
JOIN courses  c ON c.course_id  = p.course_id
GROUP BY s.student_id, s.full_name, c.department`;

const EARNED = `${EARNED_BODY}
ORDER BY s.full_name, c.department`;

const EARNED_CTE = `WITH earned AS (
${indentSql(EARNED_BODY)}
)`;

const AUDIT_BODY = `SELECT s.full_name, s.major, r.department,
       r.min_credits AS required,
       COALESCE(er.credits, 0) AS earned,
       CASE WHEN COALESCE(er.credits, 0) >= r.min_credits THEN 1 ELSE 0 END AS met
FROM students s
JOIN requirements r ON r.major = s.major
LEFT JOIN earned er ON er.student_id = s.student_id
                   AND er.department = r.department`;

const AUDIT = `${EARNED_CTE}
${AUDIT_BODY}
ORDER BY s.full_name, r.department`;

const AUDIT_CTE = `${EARNED_CTE}, audit AS (
${indentSql(AUDIT_BODY)}
)`;

const DEGREE_AUDIT = sqlSteps(
  {
    slug: "degree-audit",
    title: "Degree Audit",
    difficulty: "Advanced",
    topic: "Requirement gaps",
    dataset: SCHOOL,
    description:
      "Check every student's earned credits against their major's requirements and list what is still missing.",
    solutionNote:
      "An audit compares achievements with targets, so the targets have to drive the query: start from what is required and left-join what was earned. Built from the achievements instead, as step 1 alone would be, the report can only describe what students have done, and the three students who have passed nothing, the ones an adviser most needs to see, are not in it.",
  },
  [
    {
      title: "Credits earned per department",
      short: "Credits",
      solutionNote:
        "`SELECT DISTINCT student_id, course_id` over the passing enrollments is the deduplication: a course passed twice is still one course. Without it Dev Raman's Mathematics total doubles to 8, exactly his major's requirement, and the audit would sign off a requirement he has not met.",
      prompt: [
        "A course earns its credits once it is passed, meaning any grade except F. In-progress enrollments have earned nothing yet.",
        "A course passed twice still earns its credits once, so reduce the enrollments to distinct passed (student, course) pairs before adding anything up.",
        "Return each student's earned `credits` per department, for the departments where they have earned some. Sort by `full_name`, then `department`.",
      ],
      columns: [
        { name: "student_id", type: "integer" },
        { name: "full_name", type: "text" },
        { name: "department", type: "text" },
        { name: "credits", type: "integer" },
      ],
      starter: `SELECT s.student_id, s.full_name, c.department, SUM(c.credits) AS credits
FROM enrollments e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
GROUP BY s.student_id, s.full_name, c.department
ORDER BY s.full_name, c.department
`,
      solution: EARNED,
      tests: [
        {
          id: "columns",
          name: "Returns student_id, full_name, department and credits",
          expectedColumns: ["student_id", "full_name", "department", "credits"],
        },
        {
          id: "rowcount",
          name: "Twenty-one student and department pairs",
          description: "A failed or in-progress course earns nothing, so it adds no row.",
          expectedRowCount: 21,
        },
        {
          id: "ordered",
          name: "Credits match the reference result",
          description: "Dev Raman passed Calculus I twice; its 4 credits count once.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Compare with the requirements",
      short: "Compare",
      solutionNote:
        "The requirements decide which rows exist and the earned credits only fill them in, which is why `students` joined to `requirements` comes first and the totals are left-joined on. Joined the other way round, a requirement with nothing earned against it has no row, and a student with no passed courses vanishes from the audit altogether.",
      prompt: [
        "`requirements` lists, for each major, the minimum credits a student must earn in each department. Every student is held to their own major's rows.",
        "Return one row per student per requirement: the credits `required`, the credits `earned` (0 when they have earned none in that department), and `met`, which is 1 when earned reaches the minimum and 0 otherwise.",
        "Start from `students` joined to `requirements` and left-join the step 1 totals onto that, so a student with no credits still gets a row for every requirement. Sort by `full_name`, then `department`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "major", type: "text" },
        { name: "department", type: "text" },
        { name: "required", type: "integer" },
        { name: "earned", type: "integer" },
        { name: "met", type: "integer" },
      ],
      starter: `${EARNED_CTE}
SELECT s.full_name, s.major, r.department, r.min_credits AS required
FROM students s
JOIN requirements r ON r.major = s.major
ORDER BY s.full_name, r.department
`,
      solution: AUDIT,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, major, department, required, earned and met",
          expectedColumns: ["full_name", "major", "department", "required", "earned", "met"],
        },
        {
          id: "rowcount",
          name: "Thirty-three requirements, three per student",
          description: "Students with no credits in a department still get a row for it, at 0.",
          expectedRowCount: 33,
        },
        {
          id: "ordered",
          name: "The audit matches the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "What is still missing",
      short: "Missing",
      solutionNote:
        "`GROUP_CONCAT` skips NULLs, so feeding it `CASE WHEN met = 0 THEN department END` lists only the shortfalls, and a student with none gets NULL rather than an empty string. The `ORDER BY` inside the aggregate makes the list deterministic; without it the departments come out in whatever order the engine reads them.",
      prompt: [
        "Summarise the audit per student: their major, `requirements_met` (how many of their requirements are met), and `missing`, the departments where they are still short, in alphabetical order and separated by a comma and a space.",
        "A student who has met everything has nothing missing: leave `missing` NULL for them. Every student appears, including the ones with no credits at all.",
        "Most requirements met first, ties by `full_name`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "major", type: "text" },
        { name: "requirements_met", type: "integer" },
        { name: "missing", type: "text" },
      ],
      starter: `${AUDIT_CTE}
SELECT full_name, major, SUM(met) AS requirements_met
FROM audit
GROUP BY full_name, major
ORDER BY requirements_met DESC, full_name
`,
      solution: `${AUDIT_CTE}
SELECT full_name, major,
       SUM(met) AS requirements_met,
       GROUP_CONCAT(CASE WHEN met = 0 THEN department END, ', ' ORDER BY department) AS missing
FROM audit
GROUP BY full_name, major
ORDER BY requirements_met DESC, full_name`,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, major, requirements_met and missing",
          expectedColumns: ["full_name", "major", "requirements_met", "missing"],
        },
        {
          id: "rowcount",
          name: "All eleven students",
          description: "The three students who have passed nothing are the ones the audit exists for.",
          expectedRowCount: 11,
        },
        {
          id: "ordered",
          name: "Shortfalls match the reference result",
          description: "Only Chloe Nakamura has met every requirement, so only her missing is NULL.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI_SCHOOL: Challenge[] = [STUDENT_TRANSCRIPT, DEGREE_AUDIT];
