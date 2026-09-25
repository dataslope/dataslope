/**
 * Single-query SQL challenges over the library dataset.
 *
 * What this dataset teaches that the others cannot is the many-to-many join.
 * A book has several authors and an author has several books, so every
 * question about either has to pass through `book_authors` — and the moment
 * it does, counting gets subtle: an inner join silently drops the author who
 * has written nothing, and a join that fans out will count the same loan
 * twice.
 *
 * The loans table adds the other half: open-ended records (`returned_on` is
 * NULL while a book is out) and date spans, which is where `julianday` and a
 * recursive date spine earn their place.
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { LIBRARY } from "./datasets";
import type { Challenge } from "./types";

/** The library's lending period; anything longer is late. */
const LOAN_DAYS = 21;

export const SQL_LIBRARY: Challenge[] = [
  sqlChallenge(
    {
      slug: "books-per-author",
      title: "Books per Author",
      difficulty: "Intermediate",
      topic: "Outer joins",
      dataset: LIBRARY,
      description:
        "Count each author's books without losing the author who has written none.",
      solutionNote: [
        "Two things have to be right together. ",
        { code: "LEFT JOIN" },
        " keeps the author with no rows in the junction table, and ",
        { code: "COUNT(ba.book_id)" },
        " counts non-NULL values, so that author scores 0. Writing ",
        { code: "COUNT(*)" },
        " instead counts the one all-NULL row the outer join manufactured, and reports 1.",
      ],
    },
    {
      prompt: [
        "Count how many books each author has written. Every author should appear, including one who has not written any.",
        [
          "That means a ",
          { code: "LEFT JOIN" },
          " through ",
          { code: "book_authors" },
          ", and counting a column from the joined side, not ",
          { code: "COUNT(*)" },
          ".",
        ],
        "Most prolific first, ties alphabetically.",
      ],
      columns: [
        { name: "author_name", type: "text" },
        { name: "books", type: "integer" },
      ],
      starter: `SELECT au.author_name
FROM authors au
LEFT JOIN book_authors ba ON ba.author_id = au.author_id
GROUP BY au.author_id, au.author_name
`,
      solution: `SELECT au.author_name, COUNT(ba.book_id) AS books
FROM authors au
LEFT JOIN book_authors ba ON ba.author_id = au.author_id
GROUP BY au.author_id, au.author_name
ORDER BY books DESC, au.author_name`,
      tests: resultShape(
        ["author_name", "books"],
        8,
        "All eight authors, and the one with no books scores 0.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "co-authored-books",
      title: "Co-Authored Books",
      difficulty: "Beginner",
      topic: "HAVING",
      dataset: LIBRARY,
      description: "Find the books written by more than one person.",
      solutionNote: [
        { code: "WHERE" },
        " filters rows before they are grouped; ",
        { code: "HAVING" },
        " filters the groups afterwards. \"More than one author\" is a fact about the group, not about any single row, so it can only be asked after the ",
        { code: "GROUP BY" },
        ".",
      ],
    },
    {
      prompt: [
        "Which books have more than one author? Show the title and how many authors it has.",
        "Sorted by title.",
      ],
      columns: [
        { name: "title", type: "text" },
        { name: "authors", type: "integer" },
      ],
      starter: `SELECT b.title, COUNT(*) AS authors
FROM books b
JOIN book_authors ba ON ba.book_id = b.book_id
GROUP BY b.book_id, b.title
`,
      solution: `SELECT b.title, COUNT(*) AS authors
FROM books b
JOIN book_authors ba ON ba.book_id = b.book_id
GROUP BY b.book_id, b.title
HAVING COUNT(*) > 1
ORDER BY b.title`,
      tests: resultShape(
        ["title", "authors"],
        3,
        "Three of the twelve books are collaborations.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "authors-of-each-book",
      title: "Authors of Each Book",
      difficulty: "Intermediate",
      topic: "String aggregation",
      dataset: LIBRARY,
      description: "Collapse each book's authors into a single readable cell.",
      solutionNote: [
        { code: "GROUP_CONCAT" },
        " is the aggregate that produces text instead of a number, which is how you turn a many-to-many join back into one row per book. It is a reporting convenience, not a data model: the moment you need to filter or join on an individual author again, you want the rows back.",
      ],
    },
    {
      prompt: [
        "Show every book with its authors listed in one cell, separated by a comma and a space.",
        [
          { code: "GROUP_CONCAT(expression, separator)" },
          " does the joining. Sort by title.",
        ],
      ],
      columns: [
        { name: "title", type: "text" },
        { name: "authors", type: "text" },
      ],
      starter: `SELECT b.title
FROM books b
JOIN book_authors ba ON ba.book_id = b.book_id
JOIN authors au      ON au.author_id = ba.author_id
GROUP BY b.book_id, b.title
`,
      solution: `SELECT b.title,
       GROUP_CONCAT(au.author_name, ', ') AS authors
FROM books b
JOIN book_authors ba ON ba.book_id = b.book_id
JOIN authors au      ON au.author_id = ba.author_id
GROUP BY b.book_id, b.title
ORDER BY b.title`,
      tests: resultShape(
        ["title", "authors"],
        12,
        "One row per book; the collaborations list both names.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "books-currently-out",
      title: "Books Currently Out",
      difficulty: "Beginner",
      topic: "NULL as a predicate",
      dataset: LIBRARY,
      description: "List the books nobody has brought back yet.",
      solutionNote: [
        "A loan with no return date is a book still on someone's shelf. Same shape as an unpaid invoice or a live subscription: the interesting rows are the ones where a column is missing, which is why ",
        { code: "IS NULL" },
        " turns up in every schema that records events rather than states.",
      ],
    },
    {
      prompt: [
        "Which books are on loan right now? A loan that has been returned carries a return date; one that has not is still out.",
        "Show the title, who has it, and when they borrowed it. Longest-held first.",
      ],
      columns: [
        { name: "title", type: "text" },
        { name: "full_name", type: "text" },
        { name: "borrowed_on", type: "text" },
      ],
      starter: `SELECT b.title, m.full_name, l.borrowed_on
FROM loans l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
`,
      solution: `SELECT b.title, m.full_name, l.borrowed_on
FROM loans l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
WHERE l.returned_on IS NULL
ORDER BY l.borrowed_on`,
      tests: resultShape(
        ["title", "full_name", "borrowed_on"],
        4,
        "Four books have never come back.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "longest-loans",
      title: "Longest Loans",
      difficulty: "Intermediate",
      topic: "Date arithmetic",
      dataset: LIBRARY,
      description: "Rank completed loans by how many days the book was out.",
      solutionNote: [
        { code: "julianday()" },
        " turns a date into a number, so the difference between two of them is a count of days. The ",
        { code: "CAST(... AS INTEGER)" },
        " is cosmetic but worth the habit: without it the result is a float, and a report that says a book was out 12.0 days invites the question of what the .0 means.",
      ],
    },
    {
      prompt: [
        "Of the loans that have been returned, which were out the longest?",
        [
          "Subtract the dates with ",
          { code: "julianday()" },
          " and return a whole number of days. Longest first, ties by title, top 5 only.",
        ],
      ],
      columns: [
        { name: "title", type: "text" },
        { name: "full_name", type: "text" },
        { name: "days_out", type: "integer" },
      ],
      starter: `SELECT b.title, m.full_name
FROM loans l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
`,
      solution: `SELECT b.title,
       m.full_name,
       CAST(julianday(l.returned_on) - julianday(l.borrowed_on) AS INTEGER) AS days_out
FROM loans l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
WHERE l.returned_on IS NOT NULL
ORDER BY days_out DESC, b.title
LIMIT 5`,
      tests: resultShape(
        ["title", "full_name", "days_out"],
        5,
        "Books still out have no duration and are excluded.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "overdue-returns",
      title: "Overdue Returns",
      difficulty: "Intermediate",
      topic: "Filtering on a computed span",
      dataset: LIBRARY,
      description: "Find the loans that came back after the lending period.",
      solutionNote: [
        "The filter is on something no column holds (a span you compute), so it goes in the ",
        { code: "WHERE" },
        " clause spelled out in full. SQLite will let you reference a ",
        { code: "SELECT" },
        " alias there, but most engines will not, so writing the expression twice is the portable habit.",
      ],
    },
    {
      prompt: [
        [
          "The library lends for ",
          { code: String(LOAN_DAYS) },
          " days. Find the loans that were returned later than that: strictly more than ",
          { code: String(LOAN_DAYS) },
          " days after they were borrowed.",
        ],
        "Show who had it, what it was, and both dates. Oldest loan first.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "title", type: "text" },
        { name: "borrowed_on", type: "text" },
        { name: "returned_on", type: "text" },
      ],
      starter: `SELECT m.full_name, b.title, l.borrowed_on, l.returned_on
FROM loans l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
WHERE l.returned_on IS NOT NULL
`,
      solution: `SELECT m.full_name, b.title, l.borrowed_on, l.returned_on
FROM loans l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
WHERE l.returned_on IS NOT NULL
  AND julianday(l.returned_on) - julianday(l.borrowed_on) > ${LOAN_DAYS}
ORDER BY l.borrowed_on`,
      tests: resultShape(
        ["full_name", "title", "borrowed_on", "returned_on"],
        3,
        "Three loans came back late.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "loans-by-genre",
      title: "Loans by Genre",
      difficulty: "Beginner",
      topic: "Counting through a join",
      dataset: LIBRARY,
      description: "Count how often each genre gets borrowed.",
      solutionNote: [
        "The genre is on the book, the borrowing is on the loan, so the count has to happen after the join. Two genres tie here, which is exactly why the sort has a second key: without it the order is whatever the engine happens to produce, and a report that reshuffles between runs is a report nobody trusts.",
      ],
    },
    {
      prompt: [
        "Which genres circulate most? Count the loans of each.",
        "Most borrowed first. Two genres tie, so break ties by genre name.",
      ],
      columns: [
        { name: "genre", type: "text" },
        { name: "loans", type: "integer" },
      ],
      starter: `SELECT b.genre
FROM loans l
JOIN books b ON b.book_id = l.book_id
`,
      solution: `SELECT b.genre, COUNT(*) AS loans
FROM loans l
JOIN books b ON b.book_id = l.book_id
GROUP BY b.genre
ORDER BY loans DESC, b.genre`,
      tests: resultShape(
        ["genre", "loans"],
        3,
        "Three genres; the tie is broken by name.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "never-borrowed-books",
      title: "Never Borrowed",
      difficulty: "Beginner",
      topic: "Set operations",
      dataset: LIBRARY,
      description: "Find the book that has never left the shelf, using EXCEPT.",
      solutionNote: [
        "This is an anti join written as arithmetic on result sets: every title, minus the titles that appear on a loan. ",
        { code: "EXCEPT" },
        " requires both sides to have the same columns in the same order, and it removes duplicates, which is convenient here, since a popular book appears on the right-hand side many times.",
      ],
    },
    {
      prompt: [
        "One book in the catalogue has never been borrowed. Find it.",
        [
          "Answer with ",
          { code: "EXCEPT" },
          " rather than a join: every title, minus the titles that have been loaned.",
        ],
      ],
      columns: [{ name: "title", type: "text" }],
      starter: `SELECT title FROM books
`,
      solution: `SELECT title FROM books
EXCEPT
SELECT b.title FROM books b JOIN loans l ON l.book_id = b.book_id
ORDER BY title`,
      tests: resultShape(["title"], 1, "Exactly one book has never circulated.", true),
    },
  ),

  sqlChallenge(
    {
      slug: "loans-per-member",
      title: "Loans per Member",
      difficulty: "Beginner",
      topic: "Aggregating dates",
      dataset: LIBRARY,
      description:
        "Summarise each member's borrowing: how many, and the window they span.",
      solutionNote: [
        { code: "MIN" },
        " and ",
        { code: "MAX" },
        " work on text dates because ISO dates sort the same way they compare, which is the whole reason to store dates as ",
        { code: "YYYY-MM-DD" },
        " rather than any friendlier format. Written as ",
        { code: "03/04/2024" },
        " this query would return nonsense.",
      ],
    },
    {
      prompt: [
        "For each member, count their loans and show the dates of their first and last.",
        "Busiest borrower first, ties by name.",
      ],
      columns: [
        { name: "full_name", type: "text" },
        { name: "loans", type: "integer" },
        { name: "first_loan", type: "text" },
        { name: "last_loan", type: "text" },
      ],
      starter: `SELECT m.full_name, COUNT(*) AS loans
FROM loans l
JOIN members m ON m.member_id = l.member_id
GROUP BY m.member_id, m.full_name
`,
      solution: `SELECT m.full_name,
       COUNT(*) AS loans,
       MIN(l.borrowed_on) AS first_loan,
       MAX(l.borrowed_on) AS last_loan
FROM loans l
JOIN members m ON m.member_id = l.member_id
GROUP BY m.member_id, m.full_name
ORDER BY loans DESC, m.full_name`,
      tests: resultShape(
        ["full_name", "loans", "first_loan", "last_loan"],
        8,
        "All eight members have borrowed something.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "february-loan-calendar",
      title: "February Loan Calendar",
      difficulty: "Advanced",
      topic: "Recursive CTEs",
      dataset: LIBRARY,
      description:
        "Report a loan count for every day of February, including the days with none.",
      solutionNote: [
        "A ",
        { code: "GROUP BY" },
        " can only return days that exist in the data, so the quiet days simply vanish, and a chart drawn from that silently closes the gaps. Generating the dates first and outer-joining the loans onto them is the fix: the spine decides which rows exist, and the data only fills them in. ",
        { code: "COUNT(l.loan_id)" },
        " rather than ",
        { code: "COUNT(*)" },
        " is what makes an empty day report 0.",
      ],
    },
    {
      prompt: [
        "Count the loans that started on each day of February 2024: all 29 of them, including the days when nothing was borrowed.",
        [
          "Build the dates with a recursive CTE: start at ",
          { code: "'2024-02-01'" },
          " and keep adding a day with ",
          { code: "date(day, '+1 day')" },
          " while the day is before ",
          { code: "'2024-02-29'" },
          ". Then left-join the loans onto it.",
        ],
      ],
      columns: [
        { name: "day", type: "text" },
        { name: "loans_started", type: "integer" },
      ],
      starter: `WITH RECURSIVE days(day) AS (
  SELECT '2024-02-01'
  -- Add a day at a time until the end of the month.
)
SELECT d.day
FROM days d
`,
      solution: `WITH RECURSIVE days(day) AS (
  SELECT '2024-02-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2024-02-29'
)
SELECT d.day, COUNT(l.loan_id) AS loans_started
FROM days d
LEFT JOIN loans l ON l.borrowed_on = d.day
GROUP BY d.day
ORDER BY d.day`,
      tests: resultShape(
        ["day", "loans_started"],
        29,
        "2024 is a leap year, and the quiet days report 0 rather than disappearing.",
        true,
      ),
    },
  ),
];
