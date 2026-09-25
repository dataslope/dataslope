/**
 * Single-query SQL challenges over the school dataset.
 *
 * What these have in common is that a transcript is full of values that look
 * comparable and are not. A letter grade is text, so `B+` sorts after `B`. A
 * grade is worth more in a 4-credit course than in a 3-credit one. An
 * in-progress enrollment is a row with a NULL grade, which belongs in a count
 * of who is enrolled and nowhere near a GPA. And a student who retook a course
 * appears twice, which is right for a transcript and wrong for a head count.
 *
 * Each challenge is built around one of those, plus the two shapes a college
 * catalogue brings with it: a prerequisite graph to walk recursively, and
 * "passed every course in the department", which is relational division.
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { SCHOOL } from "./dataset-school";
import type { Challenge } from "./types";

export const SQL_SCHOOL: Challenge[] = [
  sqlChallenge(
    {
      slug: "students-per-course",
      title: "Students per Course",
      difficulty: "Beginner",
      topic: "Outer joins",
      dataset: SCHOOL,
      description:
        "Count the different students in each course, including the course nobody has taken.",
      solutionNote:
        "`COUNT(DISTINCT e.student_id)` answers how many students, not how many enrollments, so the three students who retook a course count once. It also skips NULLs, which is what scores the course nobody took at 0: its only row is the one the `LEFT JOIN` invented, and `COUNT(*)` would count that row as 1.",
    },
    {
      prompt: [
        "How many different students have enrolled in each course? Count every enrollment, including the ones still in progress, but count a student who took the same course twice only once.",
        "Every course belongs in the answer, including one that nobody has taken, at 0.",
        "Most students first, ties by `course_code`.",
      ],
      columns: [
        { name: "course_code", type: "text" },
        { name: "title", type: "text" },
        { name: "students", type: "integer" },
      ],
      starter: `SELECT c.course_code, c.title
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.title
`,
      solution: `SELECT c.course_code, c.title, COUNT(DISTINCT e.student_id) AS students
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.title
ORDER BY students DESC, c.course_code`,
      tests: resultShape(
        ["course_code", "title", "students"],
        12,
        "Machine Learning appears at 0, and a retake does not count its student twice.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "entry-level-courses",
      title: "Entry-Level Courses",
      difficulty: "Beginner",
      topic: "Anti joins",
      dataset: SCHOOL,
      description: "Find the courses a student can take in their very first term.",
      solutionNote:
        "An anti join keeps the rows that have no partner, and `NOT EXISTS` says so directly: keep a course when no prerequisite row names it as the course being taken. The direction is the trap. Matching on `requires_id` instead finds the courses nothing builds on, which is a different question that happens to return the same number of rows.",
    },
    {
      prompt: [
        "Which courses have no prerequisites at all? Those are the ones a new student can take in their first term.",
        "`prerequisites` holds one row per requirement: the course in `course_id` requires the course in `requires_id`. A course with no row under its own `course_id` has no prerequisites.",
        "Sort by `course_code`.",
      ],
      columns: [
        { name: "course_code", type: "text" },
        { name: "title", type: "text" },
        { name: "department", type: "text" },
        { name: "credits", type: "integer" },
      ],
      starter: `SELECT c.course_code, c.title, c.department, c.credits
FROM courses c
-- Keep only the courses that require nothing.
ORDER BY c.course_code
`,
      solution: `SELECT c.course_code, c.title, c.department, c.credits
FROM courses c
WHERE NOT EXISTS (
  SELECT 1
  FROM prerequisites p
  WHERE p.course_id = c.course_id
)
ORDER BY c.course_code`,
      tests: resultShape(
        ["course_code", "title", "department", "credits"],
        4,
        "Filter on the course that has the requirement, not on the course being required.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "current-course-load",
      title: "Current Course Load",
      difficulty: "Beginner",
      topic: "NULL as a predicate",
      dataset: SCHOOL,
      description: "Total the courses and credits each student is taking this term.",
      solutionNote:
        "`grade = NULL` is never true, not even for a missing grade, because any comparison with NULL yields NULL. `IS NULL` is the only test that finds the enrollments still in progress, and once they are the only rows left the count and the sum are ordinary aggregates.",
    },
    {
      prompt: [
        "Grades for the current term have not been posted yet, so an enrollment that is still in progress has a NULL `grade`.",
        "For each student taking something right now, count their in-progress courses and add up those courses' credits. Students with nothing in progress do not appear.",
        "Heaviest load first (by credits), ties by `full_name`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "courses", type: "integer" },
        { name: "credits", type: "integer" },
      ],
      starter: `SELECT s.full_name
FROM enrollments e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
-- Keep only the enrollments still in progress.
GROUP BY s.student_id, s.full_name
`,
      solution: `SELECT s.full_name, COUNT(*) AS courses, SUM(c.credits) AS credits
FROM enrollments e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
WHERE e.grade IS NULL
GROUP BY s.student_id, s.full_name
ORDER BY credits DESC, s.full_name`,
      tests: resultShape(
        ["full_name", "courses", "credits"],
        8,
        "Only enrollments with no grade yet count toward the current load.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "credit-weighted-gpa",
      title: "Credit-Weighted GPA",
      difficulty: "Intermediate",
      topic: "Weighted averages",
      dataset: SCHOOL,
      description:
        "Compute each student's GPA, weighting every grade by the course's credits.",
      solutionNote:
        "`AVG(points)` lets a 3-credit course count as much as a 4-credit one; a GPA sums `points * credits` and divides by the credits. The inner join to `grade_points` is what keeps in-progress courses out of both halves of that ratio. Summing credits over every enrollment while the NULL grades drop out of the numerator quietly drags down the GPA of everyone mid-term.",
    },
    {
      prompt: [
        "A GPA weights each grade by the course's credits: multiply the grade's `points` (from `grade_points`) by the course's `credits`, add those up, and divide by the total credits graded.",
        "Only graded enrollments count. An in-progress enrollment has no grade yet, and its credits must stay out of the denominator too. A failed course does count: an F is 0 points over real credits. Both attempts of a retaken course count.",
        "Return every student with at least one graded enrollment, their graded `credits`, and `gpa` rounded to 2 decimal places. Highest GPA first, ties by `full_name`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "credits", type: "integer" },
        { name: "gpa", type: "real" },
      ],
      starter: `SELECT s.full_name, AVG(g.points) AS gpa
FROM enrollments e
JOIN students s          ON s.student_id = e.student_id
JOIN courses  c          ON c.course_id  = e.course_id
LEFT JOIN grade_points g ON g.grade      = e.grade
GROUP BY s.student_id, s.full_name
`,
      solution: `SELECT s.full_name,
       SUM(c.credits) AS credits,
       ROUND(SUM(g.points * c.credits) / SUM(c.credits), 2) AS gpa
FROM enrollments e
JOIN students s     ON s.student_id = e.student_id
JOIN courses  c     ON c.course_id  = e.course_id
JOIN grade_points g ON g.grade      = e.grade
GROUP BY s.student_id, s.full_name
ORDER BY gpa DESC, s.full_name`,
      tests: resultShape(
        ["full_name", "credits", "gpa"],
        9,
        "Weighted by credits, with in-progress courses out of both the numerator and the denominator.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "top-grade-per-course",
      title: "Top Grade per Course",
      difficulty: "Intermediate",
      topic: "Ranking with ties",
      dataset: SCHOOL,
      description:
        "Name the best student in each course, keeping everyone who shares the top grade.",
      solutionNote:
        "`RANK()` gives tied rows the same number, so filtering on rank 1 keeps every student who shares the top grade, where `ROW_NUMBER()` would keep one of them at random. Ranking by `points` rather than by the letter matters as much, and so does the inner join to `grade_points`: with a `LEFT JOIN`, a course whose only student is mid-term would crown them with a NULL grade.",
    },
    {
      prompt: [
        "Who earned the best grade in each course? When several students share the best grade, list all of them.",
        "Letter grades do not sort the way they rank: alphabetically `B+` comes after `B`, and `A-` after `A`. Rank by `points` from `grade_points` instead.",
        "Only graded enrollments compete, so a course whose only enrollments are still in progress has no top grade yet and does not appear. Sort by `course_code`, then `full_name`.",
      ],
      columns: [
        { name: "course_code", type: "text" },
        { name: "full_name", type: "text" },
        { name: "grade", type: "text" },
      ],
      starter: `SELECT c.course_code, s.full_name, e.grade
FROM enrollments e
JOIN courses  c ON c.course_id  = e.course_id
JOIN students s ON s.student_id = e.student_id
ORDER BY c.course_code, s.full_name
`,
      solution: `WITH ranked AS (
  SELECT c.course_code, s.full_name, e.grade,
         RANK() OVER (PARTITION BY e.course_id ORDER BY g.points DESC) AS grade_rank
  FROM enrollments e
  JOIN grade_points g ON g.grade      = e.grade
  JOIN courses  c     ON c.course_id  = e.course_id
  JOIN students s     ON s.student_id = e.student_id
)
SELECT course_code, full_name, grade
FROM ranked
WHERE grade_rank = 1
ORDER BY course_code, full_name`,
      tests: resultShape(
        ["course_code", "full_name", "grade"],
        14,
        "Ties at the top are all kept: three students share an A in Calculus I.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "grade-distribution",
      title: "Grade Distribution",
      difficulty: "Intermediate",
      topic: "Pivoting",
      dataset: SCHOOL,
      description:
        "Turn each course's grades into one row of counts, one column per grade band.",
      solutionNote:
        "Conditional aggregation turns rows into columns: every band counts the same rows under a different condition, so one pass fills the whole table. The trap is the course nobody took. The `LEFT JOIN` gives it one invented row with every column NULL, so `COUNT(*)` under a `grade IS NULL` condition reports it as one student in progress; counting `e.enrollment_id` instead leaves it at 0.",
    },
    {
      prompt: [
        "Build a grade distribution with one row per course and one column per grade band.",
        "`a_grades` counts A and A-, `b_grades` counts B+, B and B-, `c_grades` counts C+ and C, and `d_or_f` counts D and F. `in_progress` counts enrollments with no grade yet.",
        "Every course appears, including one nobody has taken, with a zero in every column. Sort by `course_code`.",
      ],
      columns: [
        { name: "course_code", type: "text" },
        { name: "a_grades", type: "integer" },
        { name: "b_grades", type: "integer" },
        { name: "c_grades", type: "integer" },
        { name: "d_or_f", type: "integer" },
        { name: "in_progress", type: "integer" },
      ],
      starter: `SELECT c.course_code, COUNT(e.enrollment_id) AS enrollments
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_code
ORDER BY c.course_code
`,
      solution: `SELECT c.course_code,
       COUNT(e.enrollment_id) FILTER (WHERE e.grade IN ('A', 'A-'))       AS a_grades,
       COUNT(e.enrollment_id) FILTER (WHERE e.grade IN ('B+', 'B', 'B-')) AS b_grades,
       COUNT(e.enrollment_id) FILTER (WHERE e.grade IN ('C+', 'C'))       AS c_grades,
       COUNT(e.enrollment_id) FILTER (WHERE e.grade IN ('D', 'F'))        AS d_or_f,
       COUNT(e.enrollment_id) FILTER (WHERE e.grade IS NULL)              AS in_progress
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_code
ORDER BY c.course_code`,
      tests: resultShape(
        ["course_code", "a_grades", "b_grades", "c_grades", "d_or_f", "in_progress"],
        12,
        "Machine Learning's row is all zeros, in_progress included.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "retaken-courses",
      title: "Retaken Courses",
      difficulty: "Intermediate",
      topic: "First and last per group",
      dataset: SCHOOL,
      description:
        "For every course a student took more than once, compare the first grade with the latest.",
      solutionNote:
        "`MIN(grade)` and `MAX(grade)` compare letters, not time, so they report the alphabetically first grade rather than the first attempt. Ordering by `term` inside a window ties each grade to its attempt, and `FIRST_VALUE` over a descending order reads the latest one. That sidesteps `LAST_VALUE`, whose default frame stops at the current row and so returns the row's own grade.",
    },
    {
      prompt: [
        "Some students have taken the same course more than once. For each student and course with two or more enrollments, show the number of attempts, the grade on the first attempt and the grade on the latest one.",
        "Terms are named by the month they start (`'2023-09'`, `'2024-01'`, ...), so they sort chronologically as text. When the latest attempt is still in progress, its grade is NULL, and so is `latest_grade`.",
        "Sort by `full_name`, then `course_code`.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "course_code", type: "text" },
        { name: "attempts", type: "integer" },
        { name: "first_grade", type: "text" },
        { name: "latest_grade", type: "text" },
      ],
      starter: `SELECT s.full_name, c.course_code, COUNT(*) AS attempts
FROM enrollments e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
GROUP BY e.student_id, e.course_id, s.full_name, c.course_code
ORDER BY s.full_name, c.course_code
`,
      solution: `WITH attempts AS (
  SELECT e.student_id, e.course_id,
         COUNT(*)             OVER w                         AS attempts,
         FIRST_VALUE(e.grade) OVER (w ORDER BY e.term)      AS first_grade,
         FIRST_VALUE(e.grade) OVER (w ORDER BY e.term DESC) AS latest_grade
  FROM enrollments e
  WINDOW w AS (PARTITION BY e.student_id, e.course_id)
)
SELECT DISTINCT s.full_name, c.course_code, a.attempts, a.first_grade, a.latest_grade
FROM attempts a
JOIN students s ON s.student_id = a.student_id
JOIN courses  c ON c.course_id  = a.course_id
WHERE a.attempts > 1
ORDER BY s.full_name, c.course_code`,
      tests: resultShape(
        ["full_name", "course_code", "attempts", "first_grade", "latest_grade"],
        3,
        "Dev Raman went from C to B+, which MIN and MAX on the letters would report backwards.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "courses-below-average",
      title: "Courses Below Average",
      difficulty: "Intermediate",
      topic: "HAVING with a subquery",
      dataset: SCHOOL,
      description:
        "Find the courses that grade harder than the college as a whole.",
      solutionNote:
        "`HAVING` filters groups after they are formed, so it can compare each course's `AVG` with a scalar subquery that computes the overall one. Which overall average is the real decision: averaging the nine course averages gives a one-student course the same vote as a nine-student one, lifts the bar to about 3.29, and pulls Academic Writing (3.27) into the list although it grades above the true overall average of 3.17.",
    },
    {
      prompt: [
        "Which courses grade harder than the college as a whole? Compare each course's average grade `points` with the overall average.",
        "The overall figure is one average over every graded enrollment, not an average of the course averages: a course with nine graded students should weigh more than a course with one.",
        "Ignore in-progress enrollments. Return each below-average course with `avg_points` rounded to 2 decimal places, lowest first, ties by `course_code`.",
      ],
      columns: [
        { name: "course_code", type: "text" },
        { name: "title", type: "text" },
        { name: "avg_points", type: "real" },
      ],
      starter: `SELECT c.course_code, c.title, ROUND(AVG(g.points), 2) AS avg_points
FROM enrollments e
JOIN grade_points g ON g.grade     = e.grade
JOIN courses c      ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.title
`,
      solution: `SELECT c.course_code, c.title, ROUND(AVG(g.points), 2) AS avg_points
FROM enrollments e
JOIN grade_points g ON g.grade     = e.grade
JOIN courses c      ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.title
HAVING AVG(g.points) < (
  SELECT AVG(g2.points)
  FROM enrollments e2
  JOIN grade_points g2 ON g2.grade = e2.grade
)
ORDER BY avg_points, c.course_code`,
      tests: resultShape(
        ["course_code", "title", "avg_points"],
        4,
        "Measured against one average over all 35 graded enrollments.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "prerequisite-chain",
      title: "Prerequisite Chain",
      difficulty: "Advanced",
      topic: "Recursive CTEs",
      dataset: SCHOOL,
      description:
        "Walk the prerequisite graph back from Machine Learning to every course it depends on.",
      solutionNote:
        "Each pass of the recursive member joins the rows found so far back to `prerequisites`, one course further back, and the walk ends when a pass finds nothing (the graph has no cycles). Linear Algebra is both a direct prerequisite of Machine Learning and a prerequisite of Algorithms, so it and everything beneath it are reached twice: nine rows for six courses. `GROUP BY` with `MIN(steps)` collapses them to the shortest route.",
    },
    {
      prompt: [
        "A student wants to take Machine Learning (`CS310`). List every course they must pass first, directly or through a chain: a prerequisite's own prerequisites count too.",
        "`prerequisites` holds one row per requirement: `course_id` requires `requires_id`. Walk it with a recursive CTE that starts from `CS310`'s direct prerequisites and moves one step further back on each pass.",
        "Some courses can be reached along more than one path. Report each course once, with `steps` as the length of its shortest path back from `CS310` (a direct prerequisite is 1 step). Sort by `steps`, then `course_code`.",
      ],
      columns: [
        { name: "course_code", type: "text" },
        { name: "title", type: "text" },
        { name: "steps", type: "integer" },
      ],
      starter: `WITH RECURSIVE chain(course_id, steps) AS (
  SELECT p.requires_id, 1
  FROM prerequisites p
  JOIN courses c ON c.course_id = p.course_id
  WHERE c.course_code = 'CS310'
  -- Add the recursive step: each course's own prerequisites, one step further.
)
SELECT c.course_code, c.title, ch.steps
FROM chain ch
JOIN courses c ON c.course_id = ch.course_id
ORDER BY ch.steps, c.course_code
`,
      solution: `WITH RECURSIVE chain(course_id, steps) AS (
  SELECT p.requires_id, 1
  FROM prerequisites p
  JOIN courses c ON c.course_id = p.course_id
  WHERE c.course_code = 'CS310'
  UNION ALL
  SELECT p.requires_id, ch.steps + 1
  FROM chain ch
  JOIN prerequisites p ON p.course_id = ch.course_id
)
SELECT c.course_code, c.title, MIN(ch.steps) AS steps
FROM chain ch
JOIN courses c ON c.course_id = ch.course_id
GROUP BY c.course_id, c.course_code, c.title
ORDER BY steps, c.course_code`,
      tests: resultShape(
        ["course_code", "title", "steps"],
        6,
        "Six courses, each listed once at its shortest distance.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "department-completers",
      title: "Department Completers",
      difficulty: "Advanced",
      topic: "Relational division",
      dataset: SCHOOL,
      description:
        "Find the students who have passed every course a department offers.",
      solutionNote:
        "\"Passed every course\" has no direct SQL spelling, so it is written as its double negative: there is no course in the department for which no passing enrollment exists. The inner `NOT EXISTS` is also where \"passed\" is defined, and it has to exclude in-progress rows as well as F: Bruno and Hana are each enrolled in the last course they need, and neither has passed it yet.",
    },
    {
      prompt: [
        "For each department, which students have passed every one of its courses? Passing means a grade other than F; an in-progress enrollment has not been passed yet.",
        "This is relational division: a student qualifies for a department when there is no course in it that they have not passed. Two nested `NOT EXISTS` say exactly that.",
        "A department with a course nobody has passed has no completers at all. Sort by `department`, then `full_name`.",
      ],
      columns: [
        { name: "department", type: "text" },
        { name: "full_name", type: "text" },
      ],
      starter: `SELECT d.department, s.full_name
FROM (SELECT DISTINCT department FROM courses) d
CROSS JOIN students s
-- Keep the pairs where no course in the department is missing a pass.
ORDER BY d.department, s.full_name
`,
      solution: `SELECT d.department, s.full_name
FROM (SELECT DISTINCT department FROM courses) d
CROSS JOIN students s
WHERE NOT EXISTS (
  SELECT 1
  FROM courses c
  WHERE c.department = d.department
    AND NOT EXISTS (
      SELECT 1
      FROM enrollments e
      WHERE e.student_id = s.student_id
        AND e.course_id  = c.course_id
        AND e.grade IS NOT NULL
        AND e.grade <> 'F'
    )
)
ORDER BY d.department, s.full_name`,
      tests: resultShape(
        ["department", "full_name"],
        3,
        "An enrollment still in progress is not a pass.",
        true,
      ),
    },
  ),
];
