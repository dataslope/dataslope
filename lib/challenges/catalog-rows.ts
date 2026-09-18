/**
 * Catalog rows with no workspace behind them yet.
 *
 * These exist to exercise the list's filtering, sorting and pagination at a
 * realistic size; they are not a real problem set. Each one becomes a proper
 * challenge module in this directory when it is written, and its tuple is
 * deleted from here — so this file should shrink to nothing over time.
 *
 * Tuples rather than objects because the column order is fixed and there are
 * fifty of them; `toEntry` names the fields.
 */

import type { ChallengeIndexEntry, ChallengeStatus, IndexLanguage } from "./types";

export type CatalogRow = [string, string, number, IndexLanguage[], number, ChallengeStatus, number];

export const CATALOG_ONLY: CatalogRow[] = [
  ["Second Highest Salary", "Subqueries", 1, ["postgres", "sqlite"], 1, "solved", 74],
  ["Customer Retention Cohorts", "Date math, self joins", 3, ["postgres", "duckdb"], 4, "attempted", 31],
  ["Running Total of Deposits", "Window functions", 2, ["postgres", "sqlite", "duckdb"], 1, "solved", 66],
  ["Merge Intervals", "Sorting", 2, ["python", "javascript", "typescript"], 1, "solved", 62],
  ["Gaps in Sequential IDs", "Gaps and islands", 3, ["postgres"], 2, "new", 29],
  ["Daily Active Users", "Aggregation", 1, ["postgres", "sqlite", "duckdb"], 1, "new", 79],
  ["Parse Log Lines", "Regular expressions", 2, ["python"], 2, "new", 55],
  ["Consecutive Login Streaks", "Gaps and islands", 3, ["postgres", "duckdb"], 3, "new", 27],
  ["Group Anagrams", "Hash maps", 1, ["python", "javascript"], 1, "new", 77],
  ["Median Order Value", "Percentiles", 2, ["postgres", "duckdb"], 1, "new", 48],
  ["Deduplicate Customer Records", "Window functions", 2, ["postgres", "sqlite"], 2, "new", 52],
  ["Flatten Nested JSON", "Recursion", 2, ["python", "javascript", "typescript"], 1, "new", 59],
  ["Year-over-Year Growth", "LAG, date math", 2, ["postgres", "duckdb"], 2, "new", 50],
  ["Moving Average Over a Stream", "Queues", 2, ["python"], 1, "new", 61],
  ["Employees Earning More Than Managers", "Self joins", 1, ["postgres", "sqlite"], 1, "new", 83],
  ["Balanced Brackets", "Stacks", 1, ["python", "javascript"], 1, "new", 85],
  ["Pivot Monthly Sales", "Conditional aggregation", 2, ["postgres", "duckdb"], 2, "new", 44],
  ["LRU Cache", "Linked lists, hash maps", 3, ["python", "typescript"], 3, "new", 33],
  ["Sessionize Click Events", "Window functions", 3, ["postgres", "duckdb"], 3, "new", 26],
  ["Validate ISBN Numbers", "String parsing", 1, ["python", "javascript"], 1, "new", 72],
  ["Late Shipments by Carrier", "Joins, filtering", 1, ["postgres", "sqlite"], 1, "new", 76],
  ["Longest Substring Without Repeats", "Sliding window", 2, ["python", "javascript"], 1, "new", 46],
  ["First Purchase per Customer", "DISTINCT ON, ranking", 1, ["postgres", "duckdb"], 1, "new", 70],
  ["CSV to Nested Dict", "Parsing", 1, ["python"], 2, "new", 68],
  ["Inventory Below Reorder Point", "Joins, HAVING", 1, ["postgres", "sqlite", "duckdb"], 1, "new", 80],
  ["Rate Limiter", "Sliding window", 3, ["python", "typescript"], 3, "new", 30],
  ["Average Time to Resolve Tickets", "Interval math", 2, ["postgres"], 1, "new", 57],
  ["Debounce Function", "Closures, timers", 2, ["javascript", "typescript"], 1, "new", 54],
  ["Products Never Ordered", "Anti joins", 1, ["postgres", "sqlite", "duckdb"], 1, "new", 84],
  ["Deep Clone Object", "Recursion", 2, ["javascript", "typescript"], 1, "new", 51],
  ["Percent Change Week over Week", "LAG, date_trunc", 2, ["postgres", "duckdb"], 2, "new", 47],
  ["Event Emitter", "Classes", 2, ["javascript", "typescript"], 2, "new", 56],
  ["Funnel Conversion Rates", "Conditional aggregation", 3, ["postgres", "duckdb"], 4, "new", 24],
  ["Binary Search Tree Insert", "Trees", 2, ["python"], 1, "new", 63],
  ["Nth Highest Rating", "DENSE_RANK", 2, ["postgres", "sqlite"], 1, "new", 60],
  ["Reverse a Linked List", "Linked lists", 1, ["python", "javascript"], 1, "new", 78],
  ["Overlapping Reservations", "Range overlap", 3, ["postgres"], 2, "new", 28],
  ["Spiral Order Matrix", "Arrays", 2, ["python", "javascript"], 1, "new", 49],
  ["Fill Missing Dates", "generate_series", 2, ["postgres", "duckdb"], 2, "new", 42],
  ["Count Islands", "Graph search", 2, ["python", "typescript"], 1, "new", 53],
  ["Top Referrers per Page", "Ranking", 2, ["postgres", "duckdb"], 2, "new", 45],
  ["Shortest Path with Dijkstra", "Graphs, heaps", 3, ["python"], 3, "new", 25],
  ["Churned Subscribers", "Date math, anti joins", 2, ["postgres", "sqlite"], 2, "new", 43],
  ["Sudoku Validator", "Sets", 1, ["python", "javascript"], 1, "new", 71],
  ["Kth Largest Element", "Heaps", 2, ["python", "typescript"], 1, "new", 58],
  ["Summarise Survey Responses", "dplyr, tidyr", 1, ["r"], 1, "new", 73],
  ["Trie Autocomplete", "Tries", 3, ["python", "typescript"], 3, "new", 32],
  ["Reshape Wide to Long", "tidyr", 2, ["r"], 1, "new", 61],
  ["Roman Numerals", "String parsing", 1, ["python", "javascript"], 1, "new", 82],
  ["Linear Regression by Group", "purrr, broom", 3, ["r"], 2, "new", 35],
];

/** Name the tuple's fields. */
export function toEntry(row: CatalogRow): ChallengeIndexEntry {
  const [title, topic, level, langs, steps, status, acceptance] = row;
  return { title, topic, level, langs, steps, status, acceptance };
}
