// Every row, count, key and error the video shows, read from results.json:
// what PGlite 0.5.8 (PostgreSQL 18.3) returned when check.mjs ran each
// lesson's own initSql and starterCode (read out of the MDX) and the few
// statements of the video's own. No value here is typed by hand. Pure (no
// Remotion, no DOM).
//
// Lessons, under content/courses/database-design-postgresql/:
//   one-to-many.mdx                      "Customers and their orders"
//   many-to-many.mdx                     "Resolving students and courses"
//   junction-tables.mdx                  "A junction table with relationship
//                                        attributes", and its challenge
//                                        "Enroll Linus in Math"
//   one-to-one.mdx                       "A unique foreign key enforces
//                                        one-to-one"
//   self-referencing-relationships.mdx   "Employees and their managers"

import results from "./results.json";

export const VIDEO = "db-relationship-patterns";

/**
 * Whether public/images/db-relationship-patterns/ holds the four watercolors
 * from illustrations.json. Every frame is laid out with room for them either
 * way.
 */
export const ILLUSTRATIONS = false;

/** A value as PGlite hands it back (dates and numerics cast to text). */
export type Value = string | number | null;
/** A cell as the tables print it: null is SQL NULL. */
export type Cell = string | null;

type Ok = { command: string | null; affectedRows: number; fields: string[]; rows: Record<string, Value>[] };
type Failed = { error: { message: string; detail: string | null; code: string; constraint: string | null } };
const R = results.results as unknown as Record<string, Ok & Failed>;

const ok = (k: string): Ok => {
  const r = R[k];
  if (!r || r.error) throw new Error(`results.json: ${k} did not succeed`);
  return r;
};
const failed = (k: string): Failed["error"] => {
  const r = R[k];
  if (!r?.error) throw new Error(`results.json: ${k} was expected to fail`);
  return r.error;
};
const cell = (v: Value): Cell => (v === null ? null : String(v));
/** A result as rows of cells, in the order of its fields (or of `fields`). */
const cells = (k: string, fields?: readonly string[]): Cell[][] => {
  const r = ok(k);
  const f = fields ?? r.fields;
  return r.rows.map((row) => f.map((name) => cell(row[name])));
};
const one = <T extends Value>(k: string, field: string) => ok(k).rows[0][field] as T;
/** "UPDATE 1", "INSERT 0 1": the command tag Postgres sends back. */
const tag = (k: string) => {
  const r = ok(k);
  return r.command === "INSERT" ? `INSERT 0 ${r.affectedRows}` : `${r.command} ${r.affectedRows}`;
};
const sqlLines = (k: string) => (results.sql as Record<string, string>)[k].split("\n");

// ── 1. One to many (one-to-many.mdx) ─────────────────────────────────────────

export const OTM = {
  customers: one<number>("otmCounts", "customers"),
  orders: one<number>("otmCounts", "orders"),
  /** The lesson's "bad idea": each customer's order ids as one list in a cell. */
  listCols: ["id", "name", "order_ids"] as const,
  list: cells("otmList", ["id", "name", "order_ids"]),
  /** Ada's list once her next order (id NEW_ORDER) is in. */
  listAfter: cells("otmListAfter", ["order_ids"])[0][0] as string,
  newOrder: one<number>("otmNewOrder", "id"),
  /** The "good idea": each order stores one customer id. Ada's and Grace's orders. */
  orderCols: ["id", "customer_id", "placed_on", "total"] as const,
  orderRows: cells("otmOrders", ["id", "customer_id", "placed_on", "total"]),
  /** Ada's order ids, "one and twenty-five". */
  adaOrders: ok("otmOrders").rows.filter((r) => r.customer_id === 1).map((r) => String(r.id)),
  /** The lesson's join, as its starterCode runs: Ada on its first two rows. */
  joinCols: ok("otmJoin").fields,
  joinRows: cells("otmJoin"),
};

// ── 2. Many to many (many-to-many.mdx) ──────────────────────────────────────

export type Pairing = { studentId: number; courseId: number; name: string; title: string };
export const MTM = {
  students: one<number>("mtmCounts", "students"),
  courses: one<number>("mtmCounts", "courses"),
  enrollments: one<number>("mtmCounts", "enrollments"),
  /** Ada, Grace and Linus by id. */
  studentRows: ok("mtmStudents").rows.map((r) => ({ id: r.id as number, name: r.name as string })),
  /** Math, History, Art and Biology by id. */
  courseRows: ok("mtmCourses").rows.map((r) => ({ id: r.id as number, title: r.title as string })),
  /** Every pairing of the first three students. */
  pairs: ok("mtmPairs").rows.map(
    (r): Pairing => ({
      studentId: r.student_id as number,
      courseId: r.course_id as number,
      name: r.name as string,
      title: r.title as string,
    }),
  ),
};
export const studentId = (name: string) => MTM.studentRows.find((s) => s.name === name)!.id;
export const courseId = (title: string) => MTM.courseRows.find((c) => c.title === title)!.id;

// ── 3. Junction tables (junction-tables.mdx) ────────────────────────────────

export const JT = {
  rowCols: ["student_id", "course_id", "enrolled_on", "grade"] as const,
  /** Ada's and Grace's enrollments. */
  rows: cells("jtRows", ["student_id", "course_id", "enrolled_on", "grade"]),
  /** The lesson's join (name, title, enrolled_on, grade), Ada's and Grace's rows. */
  joinCols: ok("jtJoin").fields,
  joinRows: cells("jtJoin").filter((r) => r[0] === "Ada" || r[0] === "Grace"),
  /** The challenge, "Enroll Linus in Math". */
  insertSql: sqlLines("jtInsert"),
  insertTag: tag("jtInsert"),
  before: one<number>("jtCountBefore", "n"),
  after: one<number>("jtCountAfter", "n"),
  again: failed("jtInsertAgain"),
  againCount: one<number>("jtCountAgain", "n"),
  /** The row the challenge adds, as the table holds it: no grade yet. */
  linusRow: ["3", "10", "2026-02-01", null] as Cell[],
};

// ── 4. One to one (one-to-one.mdx) ──────────────────────────────────────────

export const OTO = {
  users: one<number>("otoCounts", "users"),
  profiles: one<number>("otoCounts", "profiles"),
  without: one<number>("otoCounts", "without"),
  /** Users 1 to 4 with their profile columns beside them: the wide table. */
  wideCols: ok("otoWide").fields,
  wideRows: cells("otoWide"),
  profileCols: ok("otoProfiles").fields,
  profileRows: cells("otoProfiles"),
  secondSql: sqlLines("otoSecond"),
  /** The second profile for Ada, against the lesson's table. */
  second: failed("otoSecond"),
  /** The same insert with only the foreign key: accepted. */
  secondLoose: tag("otoSecondLoose"),
  looseAda: one<number>("otoLooseAda", "n"),
};

// ── 5. Self-reference (self-referencing-relationships.mdx) ───────────────────

export type Employee = { id: number; name: string; title: string; managerId: number | null };
const EMPLOYEES = ok("srRows").rows.map(
  (r): Employee => ({ id: r.id as number, name: r.name as string, title: r.title as string, managerId: r.manager_id as number | null }),
);
export const employee = (name: string) => EMPLOYEES.find((e) => e.name === name)!;
const depth = ok("srDepth").rows[0];
export const SR = {
  employees: EMPLOYEES.length,
  rowCols: ["id", "name", "title", "manager_id"] as const,
  /** The longest chain from the root down, and its length. */
  chain: (depth.path as unknown as string[]).map(employee),
  depth: depth.depth as number,
  joinCols: ok("srJoin").fields,
  joinRows: cells("srJoin"),
  updateSql: sqlLines("srSelf"),
  updateTag: tag("srSelf"),
  joinAfter: cells("srJoinAfter"),
};
