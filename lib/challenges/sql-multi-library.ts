/**
 * Multi-step SQL challenges over the library dataset.
 *
 * Both of these build toward an answer that the obvious query gets subtly
 * wrong. The overdue report has to count books still out, which have no
 * return date; the collaboration report has to count an author on both sides
 * of a pair, which a single self join only ever does once. Splitting them
 * into steps is what makes the wrong answer visible — step 1 looks right, and
 * step 3 is where it stops being enough.
 *
 * `__tests__/challengeSolutions` runs every step's solution against
 * node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { LIBRARY } from "./datasets";
import type { Challenge } from "./types";

/** The day the loan book was exported; a book still out runs to here. */
const AS_OF = "2024-03-31";
/** The library's lending period, in days. */
const LOAN_DAYS = 21;

// ─── Overdue report ──────────────────────────────────────────────────

const DAYS_OUT = `julianday(COALESCE(l.returned_on, '${AS_OF}'))
            - julianday(l.borrowed_on)`;

const LOAN_SPANS = `SELECT l.loan_id, m.full_name, b.title,
       CAST(${DAYS_OUT} AS INTEGER) AS days_out
FROM loans l
JOIN members m ON m.member_id = l.member_id
JOIN books   b ON b.book_id   = l.book_id
ORDER BY l.loan_id`;

const LOAN_FLAGGED = `SELECT l.loan_id, m.full_name, b.title,
       CAST(${DAYS_OUT} AS INTEGER) AS days_out,
       CASE WHEN ${DAYS_OUT} > ${LOAN_DAYS} THEN 1 ELSE 0 END AS late
FROM loans l
JOIN members m ON m.member_id = l.member_id
JOIN books   b ON b.book_id   = l.book_id
ORDER BY l.loan_id`;

const SCORED_CTE = `WITH scored AS (
${indentSql(`SELECT l.member_id,
       CASE WHEN ${DAYS_OUT} > ${LOAN_DAYS} THEN 1 ELSE 0 END AS late
FROM loans l`)}
)`;

const OVERDUE_REPORT = sqlSteps(
  {
    slug: "overdue-report",
    title: "Overdue Report",
    difficulty: "Intermediate",
    topic: "Open-ended spans",
    dataset: LIBRARY,
    description:
      "Score members on how often they return books late, counting the books they have not returned at all.",
    solutionNote: [
      "The trap is the four books still out. Measuring only returned loans makes the worst offenders look spotless, because the longer they keep a book the more certain it is to be excluded. ",
      { code: "COALESCE(returned_on, '" + AS_OF + "')" },
      " brings them back in and counts them as late from the day they cross the lending period.",
    ],
  },
  [
    {
      title: "How long was each book out",
      short: "Spans",
      prompt: [
        [
          "Work out how many days each loan has run. A book that has not been returned counts up to ",
          { code: "'" + AS_OF + "'" },
          " — it is still out, not excluded.",
        ],
        [
          "All twenty-five loans should appear. Sort by ",
          { code: "loan_id" },
          ".",
        ],
      ],
      columns: [
        { name: "loan_id", type: "integer" },
        { name: "full_name", type: "text" },
        { name: "title", type: "text" },
        { name: "days_out", type: "integer" },
      ],
      starter: `SELECT l.loan_id, m.full_name, b.title
FROM loans l
JOIN members m ON m.member_id = l.member_id
JOIN books   b ON b.book_id   = l.book_id
`,
      solution: LOAN_SPANS,
      tests: [
        {
          id: "columns",
          name: "Returns loan_id, full_name, title and days_out",
          expectedColumns: ["loan_id", "full_name", "title", "days_out"],
        },
        {
          id: "rowcount",
          name: "All twenty-five loans",
          description:
            "The four books still out must not drop for lacking a return date.",
          expectedRowCount: 25,
        },
        {
          id: "ordered",
          name: "Spans match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Flag the late ones",
      short: "Flag",
      prompt: [
        [
          "The lending period is ",
          { code: String(LOAN_DAYS) },
          " days. Add a ",
          { code: "late" },
          " column that is 1 when a loan ran longer than that and 0 otherwise.",
        ],
        "Keep all twenty-five rows — this step labels, it does not filter.",
      ],
      columns: [
        { name: "loan_id", type: "integer" },
        { name: "full_name", type: "text" },
        { name: "title", type: "text" },
        { name: "days_out", type: "integer" },
        { name: "late", type: "integer" },
      ],
      starter: `${LOAN_SPANS}
`,
      solution: LOAN_FLAGGED,
      tests: [
        {
          id: "columns",
          name: "Adds a late column",
          expectedColumns: ["loan_id", "full_name", "title", "days_out", "late"],
        },
        {
          id: "rowcount",
          name: "Still twenty-five loans",
          expectedRowCount: 25,
        },
        {
          id: "ordered",
          name: "The right loans are flagged",
          description: "A loan of exactly 21 days is on time, not late.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Score each member",
      short: "Score",
      prompt: [
        "Roll it up per member: how many loans they have taken, how many were late, and what percentage that is to 1 decimal place.",
        "Worst offender first, ties by name.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "loans", type: "integer" },
        { name: "late_loans", type: "integer" },
        { name: "late_pct", type: "real" },
      ],
      starter: `${SCORED_CTE}
SELECT m.full_name, COUNT(*) AS loans
FROM scored s
JOIN members m ON m.member_id = s.member_id
GROUP BY s.member_id, m.full_name
`,
      solution: `${SCORED_CTE}
SELECT m.full_name,
       COUNT(*) AS loans,
       SUM(s.late) AS late_loans,
       ROUND(100.0 * SUM(s.late) / COUNT(*), 1) AS late_pct
FROM scored s
JOIN members m ON m.member_id = s.member_id
GROUP BY s.member_id, m.full_name
ORDER BY late_pct DESC, m.full_name`,
      tests: [
        {
          id: "columns",
          name: "Returns full_name, loans, late_loans and late_pct",
          expectedColumns: ["full_name", "loans", "late_loans", "late_pct"],
        },
        {
          id: "rowcount",
          name: "All eight members",
          expectedRowCount: 8,
        },
        {
          id: "ordered",
          name: "Worst offender first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Author collaboration ────────────────────────────────────────────

const PAIRS = `SELECT ba1.book_id, ba1.author_id AS author_a, ba2.author_id AS author_b
FROM book_authors ba1
JOIN book_authors ba2
  ON ba2.book_id = ba1.book_id AND ba1.author_id < ba2.author_id
ORDER BY ba1.book_id`;

const PAIRS_CTE_BODY = PAIRS.replace("\nORDER BY ba1.book_id", "");

const PAIRS_CTE = `WITH pairs AS (
${indentSql(PAIRS_CTE_BODY)}
)`;

const BOTH_WAYS_CTE = `WITH pairs AS (
${indentSql(PAIRS_CTE_BODY)}
), both_ways AS (
  SELECT author_a AS author_id, author_b AS partner_id FROM pairs
  UNION ALL
  SELECT author_b, author_a FROM pairs
)`;

const AUTHOR_COLLABORATION = sqlSteps(
  {
    slug: "author-collaboration",
    title: "Author Collaboration",
    difficulty: "Advanced",
    topic: "Self joins",
    dataset: LIBRARY,
    description:
      "Find who writes with whom, then count each author's collaborators — including the ones who have none.",
    solutionNote: [
      "Two ideas, and the second is the one people miss. ",
      { code: "ba1.author_id < ba2.author_id" },
      " is what stops every pair appearing twice and every author pairing with themselves. But that same asymmetry means an author only ever shows up on one side, so counting partners needs the pairs flipped and stacked with ",
      { code: "UNION ALL" },
      " first — otherwise whoever sorts later alphabetically appears to have no collaborators at all.",
    ],
  },
  [
    {
      title: "Find the pairs",
      short: "Pairs",
      prompt: [
        [
          "Join ",
          { code: "book_authors" },
          " to itself to find every pair of authors who share a book. Return the book id and the two author ids.",
        ],
        [
          "Joining on the book alone pairs each author with themselves and lists every pair twice. ",
          { code: "ba1.author_id < ba2.author_id" },
          " fixes both at once. Sort by book id.",
        ],
      ],
      columns: [
        { name: "book_id", type: "integer" },
        { name: "author_a", type: "integer" },
        { name: "author_b", type: "integer" },
      ],
      starter: `SELECT ba1.book_id, ba1.author_id AS author_a, ba2.author_id AS author_b
FROM book_authors ba1
JOIN book_authors ba2
  ON ba2.book_id = ba1.book_id
`,
      solution: PAIRS,
      tests: [
        {
          id: "columns",
          name: "Returns book_id, author_a and author_b",
          expectedColumns: ["book_id", "author_a", "author_b"],
        },
        {
          id: "rowcount",
          name: "Three collaborations",
          description:
            "Not six, and not fifteen: each pair once, and nobody paired with themselves.",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "The right pairs, in book order",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Name them",
      short: "Names",
      prompt: [
        "Ids are no use in a report. Swap them for the book's title and the two authors' names.",
        "Sort by title.",
      ],
      columns: [
        { name: "title", type: "text" },
        { name: "author_a", type: "text" },
        { name: "author_b", type: "text" },
      ],
      starter: `${PAIRS_CTE}
SELECT b.title, p.author_a, p.author_b
FROM pairs p
JOIN books b ON b.book_id = p.book_id
`,
      solution: `${PAIRS_CTE}
SELECT b.title, a1.author_name AS author_a, a2.author_name AS author_b
FROM pairs p
JOIN books   b  ON b.book_id = p.book_id
JOIN authors a1 ON a1.author_id = p.author_a
JOIN authors a2 ON a2.author_id = p.author_b
ORDER BY b.title`,
      tests: [
        {
          id: "columns",
          name: "Returns title, author_a and author_b",
          expectedColumns: ["title", "author_a", "author_b"],
        },
        {
          id: "rowcount",
          name: "Still three collaborations",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Names match the reference result",
          description: "Joining twice to the same table needs two aliases.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Count each author's collaborators",
      short: "Count",
      prompt: [
        [
          "Now count how many distinct people each author has written with — every author, including the five who have written alone and the one who has written nothing.",
        ],
        [
          "The pairs from step 1 only list each author on one side, so stack them with their mirror image using ",
          { code: "UNION ALL" },
          " before you count. Then ",
          { code: "LEFT JOIN" },
          " from ",
          { code: "authors" },
          " so the solo writers still appear, at 0.",
        ],
        "Most collaborative first, ties alphabetically.",
      ],
      columns: [
        { name: "author_name", type: "text" },
        { name: "collaborators", type: "integer" },
      ],
      starter: `${BOTH_WAYS_CTE}
SELECT au.author_name
FROM authors au
LEFT JOIN both_ways bw ON bw.author_id = au.author_id
GROUP BY au.author_id, au.author_name
`,
      solution: `${BOTH_WAYS_CTE}
SELECT au.author_name, COUNT(DISTINCT bw.partner_id) AS collaborators
FROM authors au
LEFT JOIN both_ways bw ON bw.author_id = au.author_id
GROUP BY au.author_id, au.author_name
ORDER BY collaborators DESC, au.author_name`,
      tests: [
        {
          id: "columns",
          name: "Returns author_name and collaborators",
          expectedColumns: ["author_name", "collaborators"],
        },
        {
          id: "rowcount",
          name: "All eight authors",
          description: "Solo writers belong in the report at 0.",
          expectedRowCount: 8,
        },
        {
          id: "ordered",
          name: "Counts match the reference result",
          description:
            "Both halves of a pair score, so two authors have two collaborators each.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI_LIBRARY: Challenge[] = [
  OVERDUE_REPORT,
  AUTHOR_COLLABORATION,
];
