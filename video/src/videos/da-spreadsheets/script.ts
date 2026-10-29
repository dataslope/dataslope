import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Excel & spreadsheets" (16:9), Part 5 of the Data Analyst
 * interview prep videos
 * (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md), after
 * content/interview/data-analyst/excel-and-spreadsheets.mdx. It answers all
 * eighteen of the page's questions: ten worked on one small workbook,
 * numbered aloud, then eight one-formula answers (numbered 11 to 18 on
 * screen only).
 *
 *   1. pivot tables; 2. a revenue-by-region-and-month cross-tab ("pivot").
 *   3. VLOOKUP and its limits; 4. INDEX/MATCH; 5. XLOOKUP ("lookup").
 *   6. exact against approximate match ("approx").
 *   7. absolute, relative and mixed references ("refs").
 *   8. IFERROR, and the errors it should not hide ("iferror").
 *   9. a spreadsheet or SQL; 10. the risks of spreadsheet analysis ("tool").
 *   Rapid round ("rapid-in"): SUMIF/SUMIFS; COUNTIF/COUNTIFS; cleaning text;
 *   splitting and joining text; how dates are stored; conditional
 *   formatting; named ranges; duplicates.
 *
 * The opening, the rapid round's introduction and the bridge are written
 * fresh for this part, not in Parts 1 to 4's words, so the series doesn't
 * read as one template. No series intro yet (decided 2026-10-21).
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. The page shows formulas but runs none, and the site has no formula
 * engine, so every result ran in HyperFormula 3.5.0 (Excel's functions,
 * serial dates and reference rules) by check.mjs into results.json, which
 * data.ts reads. The workbook is the video's own: ten orders in three
 * regions over three months, four products, a discount table. The page's own
 * examples are used as given.
 *   - "pivot": North in 2024-03 sums to 290 from two orders; the grid is
 *     SUMIFS filled across with mixed references.
 *   - "lookup": VLOOKUP of P-102, column 3, is 9; looking up "Mug" in the SKU
 *     column is #N/A; after a category column is inserted, the same formula
 *     returns "Kitchen", while INDEX/MATCH still returns 9; INDEX/MATCH and
 *     XLOOKUP find the mug's SKU, P-102; XLOOKUP of P-109 is "Not found".
 *   - "approx": 640 lands in the 500 tier, 10%; P-105 without FALSE returns
 *     24, the lamp's price, where FALSE returns #N/A.
 *   - "refs": the page's $F$1 rate, 8%, on 100, 250 and 80: 8, 20 and 6.40;
 *     without dollar signs the second and third rows read F2 and F3: 0.
 *   - "iferror": P-109, "P-102 " with a trailing space and a fourth column of
 *     a three-column table all show "Unknown"; IFNA shows #REF! for the last.
 *   - "tool": with order 3's 150 typed as text, SUM gives 1,070, not 1,220.
 *   - rapid round: SUMIF North 560, SUMIFS North and 2024-03 290, COUNTIFS
 *     North over 100 is 3, AVERAGEIF North 140; the page's "  aVA smith "
 *     cleans to "Ava Smith"; the username before the @ is "ava.smith";
 *     2024-03-01 is serial 45352 and March 31 minus March 1 is 30; two orders
 *     are over 150; ava@example.com appears twice.
 *
 * Written for Drew's ear: function names as they are said ("V lookup",
 * "if NA", "sum ifs"), SKUs as "P one oh two", and #N/A as "NA".
 *
 * Abbreviations are spelled out the first time they are said (decided
 * 2026-10-22): "stock-keeping unit, its SKU", "NA: not available", and a
 * function whose name doesn't say what it is gets a phrase ("V lookup, short
 * for vertical lookup", "the newer lookup"). The scenes gloss the same terms
 * on screen where a label uses one (sku, #N/A, #REF!).
 */
export const script: NarrationScript = {
  id: "da-spreadsheets",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Nearly every analyst loop has a spreadsheet round, because that's where quick analysis still happens. The questions are rarely about menus. They're about what a formula does when you copy it, sort it, or point it at the wrong column.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Eighteen questions. We'll work the first ten on one small sheet of orders and a product list, then take the last eight a formula at a time.",
      pauseAfter: 0.7,
    },
    { id: "pivot-in", text: "First, the tool that answers a lot of them with no formula at all." },

    // ── 1, 2. Pivot tables ────────────────────────────────────────────────
    {
      id: "pivot",
      scene: true,
      text: "Question one. What is a pivot table, and when do you use one?",
      pauseAfter: 0.6,
    },
    {
      id: "pivot-what",
      text: "It summarizes a flat table: it groups the rows into categories and aggregates the values. It's GROUP BY that you can drag. Rows and columns hold the groups, values hold the sum, count or average, and filters narrow it down. Use it to explore, or to cross-tab in seconds.",
      pauseAfter: 0.8,
    },
    {
      id: "crosstab",
      text: "Question two. How would you build revenue by region and month? Region in rows, month in columns, revenue in values, summed. North in March is two ninety.",
      pauseAfter: 0.7,
    },
    {
      id: "crosstab-count",
      text: "It's the same matrix that sum of case when builds in SQL. Switch the summary to count, and that cell says two: two orders made up the two ninety.",
      pauseAfter: 0.7,
    },
    { id: "lookup-in", text: "Most of what comes next is about finding one value in another table." },

    // ── 3, 4, 5. Lookups ──────────────────────────────────────────────────
    {
      id: "lookup",
      scene: true,
      text: "Question three. What is V lookup, and what are its limits?",
      pauseAfter: 0.6,
    },
    {
      id: "lookup-what",
      text: "V lookup, short for vertical lookup, finds a key in the first column of a range and returns a value from a column to its right, by number. P one oh two, column three: nine dollars.",
      pauseAfter: 0.7,
    },
    {
      id: "lookup-limits",
      text: "It only looks right. Ask it for the mug's stock-keeping unit, its SKU, and it searches the SKU column for the word mug, and comes back NA: not available. And that column number is typed in. Insert a category column, and column three is now the category: the mug's price comes back as kitchen.",
      pauseAfter: 0.8,
    },
    {
      id: "index",
      text: "Question four. How does index match work, and why is it more robust?",
      pauseAfter: 0.6,
    },
    { id: "index-match", text: "Match finds the position of a value in one range." },
    { id: "index-second", text: "Mug is second, and the zero asks for an exact match." },
    {
      id: "index-left",
      text: "Index returns what sits at that position in another. So it can look left: find mug among the names, and return its SKU.",
    },
    {
      id: "index-ranges",
      text: "And it points at ranges, not a column number, so after the insert the price range moves with the data, and P one oh two still costs nine.",
      pauseAfter: 0.8,
    },
    {
      id: "xlookup",
      text: "Question five. What does X lookup improve over both?",
      pauseAfter: 0.6,
    },
    {
      id: "xlookup-newer",
      text: "It's the newer lookup, in Excel three sixty-five and twenty twenty-one or later; older versions don't have it.",
    },
    {
      id: "xlookup-what",
      text: "A lookup array and a return array, so any direction, in one function. Exact match by default. And a built-in if not found: P one oh nine says not found, with no if error around it.",
      pauseAfter: 0.7,
    },
    { id: "approx-in", text: "Which brings up the argument everyone forgets." },

    // ── 6. Exact and approximate match ────────────────────────────────────
    {
      id: "approx",
      scene: true,
      text: "Question six. What's the difference between exact and approximate match?",
      pauseAfter: 0.6,
    },
    {
      id: "approx-what",
      text: "Exact returns only a precise hit. Approximate assumes the first column is sorted, and returns the largest value that isn't above the key. That's right for tiers: an order of six hundred forty lands in the five hundred tier, ten percent off.",
      pauseAfter: 0.8,
    },
    { id: "approx-trap", text: "And it's silently wrong for codes like these." },
    {
      id: "approx-leave",
      text: "Leave off false, and V lookup falls back to approximate. Look up P one oh five, which doesn't exist.",
    },
    {
      id: "approx-lamp",
      text: "Instead of NA, you get the lamp's price: twenty-four dollars. On unsorted data, it gets worse.",
      pauseAfter: 0.8,
    },
    { id: "refs-in", text: "Then, what happens when you copy a formula." },

    // ── 7. References ─────────────────────────────────────────────────────
    {
      id: "refs",
      scene: true,
      text: "Question seven. Explain absolute, relative and mixed references.",
      pauseAfter: 0.6,
    },
    {
      id: "refs-fill",
      text: "A relative reference shifts when you copy it. An absolute one, with dollar signs, stays put. Fill down A two times dollar F dollar one, and every row uses the tax rate in F one. Leave the dollars off, and the next row multiplies by F two, an empty cell: zero tax.",
      pauseAfter: 0.8,
    },
    {
      id: "refs-mixed",
      text: "A mixed reference locks one side. The cross-tab formula locks the region's column and the month's row, so one formula fills the whole grid.",
      pauseAfter: 1.4,
    },

    // ── 8. IFERROR ────────────────────────────────────────────────────────
    {
      id: "iferror",
      text: "Question eight. What does if error do, and when should you avoid it?",
      pauseAfter: 0.6,
    },
    {
      id: "iferror-what",
      text: "It swaps an error for a fallback, so a report stays clean. P one oh nine isn't in the table, so unknown is honest.",
      pauseAfter: 0.7,
    },
    {
      id: "iferror-trap",
      text: "But it hides every error the same way. A key with a stray space, and a formula that asks for a fourth column the table doesn't have, both come back unknown. Fix the cause first, and catch only what you expect.",
    },
    {
      id: "iferror-ifna",
      text: "If NA catches only the not-available error: it takes the missing key, and lets the broken formula show.",
    },
    {
      id: "iferror-space",
      text: "But the stray space is a missing key too, so it stays hidden: trim it first.",
      pauseAfter: 0.8,
    },
    { id: "tool-in", text: "Two questions about when not to use a spreadsheet at all." },

    // ── 9, 10. Spreadsheet or SQL ─────────────────────────────────────────
    {
      id: "tool",
      scene: true,
      text: "Question nine. When should you use a spreadsheet, and when SQL or a database?",
      pauseAfter: 0.6,
    },
    {
      id: "tool-when",
      text: "A spreadsheet wins for quick exploration, small data, and something to hand a stakeholder. Move to SQL when the data outgrows it, well before a million rows, when the work has to be repeatable and audited, or when it joins several tables. If you redo the same manual steps every week, it belongs in SQL.",
      pauseAfter: 0.8,
    },
    {
      id: "risks",
      text: "Question ten. What are the main risks of analysis in a spreadsheet? Manual steps nobody can rerun. Formulas that break quietly when rows move. No schema: one revenue typed as text drops out of the sum, and the total reads ten seventy instead of twelve twenty. And big files that crawl, then crash.",
      pauseAfter: 0.8,
    },

    // ── Rapid round ───────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "The last eight each fit in a single cell.",
      pauseAfter: 0.6,
    },
    {
      id: "r-sumif",
      text: "Sum if adds the values that meet one condition, and sum ifs several. North sums to five sixty, and North in March to two ninety.",
    },
    {
      id: "r-countif",
      text: "Count if and count ifs count them instead: three North orders are over a hundred. Average if does means, and North averages one forty.",
    },
    {
      id: "r-clean",
      text: "Trim strips the extra spaces, and proper fixes the case: the messy name comes back as Ava Smith.",
    },
    { id: "r-clean-keys", text: "Tidy the keys before you look up, or they won't match." },
    {
      id: "r-split",
      text: "Left with find splits at a character: everything before the at sign is the username. Text join puts the pieces back, and skips the blanks.",
      pauseAfter: 1.5,
    },
    {
      id: "r-dates",
      text: "A date is stored as a serial number of days. March first, twenty twenty-four, is forty-five thousand three hundred fifty-two, so March thirty-first minus March first is thirty. A date stored as text won't sort or subtract until date value converts it.",
      pauseAfter: 1.5,
    },
    {
      id: "r-format",
      text: "Conditional formatting colors cells by a rule. Over a hundred fifty, and two orders light up. Use it to scan, not instead of a chart.",
    },
    {
      id: "r-named",
      text: "A named range gives a cell a name, so A two times tax rate reads as what it means, and still points at F one.",
      pauseAfter: 1.5,
    },
    {
      id: "r-dupes",
      text: "And to find duplicates, count each value against its own column: a count over one flags the repeated email.",
    },
    {
      id: "r-dupes-both",
      text: "It flags both copies, so check them before Remove Duplicates, which keeps the first.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A good table answers the question. A good chart gets someone to believe it. Next: data visualization.",
    },
  ],
};
