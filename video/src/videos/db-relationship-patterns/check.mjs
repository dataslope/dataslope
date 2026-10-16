// Runs every statement the "Relationship patterns" video shows in PGlite
// (Postgres in WASM), against each lesson's own tables and rows, and writes
// what came back to results.json, which data.ts reads. From the repo root,
// where @electric-sql/pglite is installed:
//
//   node video/src/videos/db-relationship-patterns/check.mjs
//
// The setup SQL is not copied: it is read out of the lessons themselves
// (content/courses/database-design-postgresql/*.mdx), the `initSql` and
// `starterCode` of the <SqlCodeBlock> or <SqlChallengeCard> with the given
// title, so every run uses exactly what the page runs. Each lesson gets a
// fresh database. Statements that fail are caught, and Postgres's own error
// (message, detail, SQLSTATE code, constraint) is recorded as the result.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";

const LESSONS = new URL("../../../../content/courses/database-design-postgresql/", import.meta.url);

/** The template-literal value of `prop` in the component titled `title`. */
function lessonSql(file, title, prop) {
  const src = readFileSync(new URL(file, LESSONS), "utf8");
  const at = src.indexOf(`title="${title}"`);
  if (at < 0) throw new Error(`${file}: no block titled "${title}"`);
  const open = src.indexOf(`${prop}={\``, at);
  if (open < 0) throw new Error(`${file}: "${title}" has no ${prop}`);
  const start = open + prop.length + 3;
  const end = src.indexOf("`}", start);
  return src.slice(start, end);
}

const out = { version: "", lessons: {}, sql: {}, results: {} };

/** Runs one statement; a failure is recorded as Postgres reported it. */
async function run(db, key, sql) {
  out.sql[key] = sql;
  try {
    const r = await db.query(sql);
    out.results[key] = {
      command: r.command ?? null,
      affectedRows: r.affectedRows ?? 0,
      fields: r.fields.map((f) => f.name),
      rows: r.rows,
    };
  } catch (e) {
    out.results[key] = {
      error: { message: e.message, detail: e.detail ?? null, code: e.code, constraint: e.constraint ?? null },
    };
  }
  return out.results[key];
}

async function fresh(lesson, file, title) {
  const db = new PGlite();
  const init = lessonSql(file, title, "initSql");
  out.lessons[lesson] = { file, title, initSql: init };
  await db.exec(init);
  if (!out.version) out.version = (await db.query("SELECT version()")).rows[0].version;
  return db;
}

// ── One to many: one-to-many.mdx, "Customers and their orders" ─────────────
{
  const file = "one-to-many.mdx";
  const title = "Customers and their orders";
  const db = await fresh("oneToMany", file, title);
  await run(db, "otmCounts", "SELECT (SELECT count(*) FROM customers)::int AS customers, (SELECT count(*) FROM orders)::int AS orders;");
  await run(
    db,
    "otmOrdersPer",
    `SELECT n AS orders_each, count(*)::int AS customers
FROM (SELECT c.id, count(o.id)::int AS n FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id) t
GROUP BY n ORDER BY n;`,
  );
  // The parent as the lesson's "bad idea" would store it: a list in a cell.
  await run(
    db,
    "otmList",
    `SELECT c.id, c.name, string_agg(o.id::text, ', ' ORDER BY o.id) AS order_ids
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.id IN (1, 2)
GROUP BY c.id, c.name
ORDER BY c.id;`,
  );
  // The "good idea": the link on the many side.
  await run(
    db,
    "otmOrders",
    "SELECT id, customer_id, placed_on::text AS placed_on, total::text AS total FROM orders WHERE customer_id IN (1, 2) ORDER BY id;",
  );
  // The lesson's own query, as its starterCode spells it.
  const join = lessonSql(file, title, "starterCode");
  out.lessons.oneToMany.starterCode = join;
  await run(db, "otmJoin", join.replace("o.placed_on,", "o.placed_on::text AS placed_on,").replace("o.total", "o.total::text AS total"));
  out.sql.otmJoinAsWritten = join;
  // Every new order changes the parent's list.
  await run(db, "otmNewOrder", "INSERT INTO orders (customer_id, placed_on, total) VALUES (1, DATE '2025-02-09', 25.00) RETURNING id;");
  await run(
    db,
    "otmListAfter",
    `SELECT c.id, c.name, string_agg(o.id::text, ', ' ORDER BY o.id) AS order_ids
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.id = 1
GROUP BY c.id, c.name;`,
  );
  // An orphan: an order whose customer does not exist. Run after the new
  // order, since a failed insert still uses up a value of the id sequence.
  await run(db, "otmOrphan", "INSERT INTO orders (customer_id, placed_on, total) VALUES (99, DATE '2025-02-09', 25.00);");
  await db.close();
}

// ── Many to many: many-to-many.mdx, "Resolving students and courses" ────────
{
  const file = "many-to-many.mdx";
  const title = "Resolving students and courses";
  const db = await fresh("manyToMany", file, title);
  await run(
    db,
    "mtmCounts",
    "SELECT (SELECT count(*) FROM students)::int AS students, (SELECT count(*) FROM courses)::int AS courses, (SELECT count(*) FROM enrollments)::int AS enrollments;",
  );
  await run(db, "mtmStudents", "SELECT id, name FROM students WHERE id IN (1, 2, 3) ORDER BY id;");
  await run(db, "mtmCourses", "SELECT id, title FROM courses WHERE id IN (10, 11, 12, 13) ORDER BY id;");
  await run(
    db,
    "mtmPairs",
    `SELECT e.student_id, e.course_id, s.name, c.title
FROM enrollments e JOIN students s ON s.id = e.student_id JOIN courses c ON c.id = e.course_id
WHERE e.student_id IN (1, 2, 3)
ORDER BY e.student_id, e.course_id;`,
  );
  await run(
    db,
    "mtmPerCourse",
    "SELECT c.title, count(*)::int AS students FROM enrollments e JOIN courses c ON c.id = e.course_id GROUP BY c.id, c.title ORDER BY c.id;",
  );
  await run(db, "mtmPerStudent", "SELECT count(DISTINCT n)::int AS distinct_counts, min(n)::int AS fewest, max(n)::int AS most FROM (SELECT count(*) AS n FROM enrollments GROUP BY student_id) t;");
  const join = lessonSql(file, title, "starterCode");
  out.lessons.manyToMany.starterCode = join;
  await run(db, "mtmJoin", join);
  await db.close();
}

// ── Junction tables: junction-tables.mdx ────────────────────────────────────
{
  const file = "junction-tables.mdx";
  const title = "A junction table with relationship attributes";
  const db = await fresh("junction", file, title);
  const join = lessonSql(file, title, "starterCode");
  out.lessons.junction.starterCode = join;
  await run(db, "jtJoin", join.replace("e.enrolled_on,", "e.enrolled_on::text AS enrolled_on,"));
  await run(
    db,
    "jtRows",
    "SELECT student_id, course_id, enrolled_on::text AS enrolled_on, grade FROM enrollments WHERE student_id IN (1, 2) ORDER BY student_id, course_id;",
  );
  await run(
    db,
    "jtMath",
    "SELECT s.name, e.grade FROM enrollments e JOIN students s ON s.id = e.student_id WHERE e.course_id = 10 ORDER BY s.id;",
  );
  // The lesson's challenge, "Enroll Linus in Math": its solution, its row
  // count test, then the same insert again, as the page suggests.
  const challenge = "Enroll Linus in Math";
  const solution = lessonSql(file, challenge, "solutionSql");
  out.lessons.junctionChallenge = { title: challenge, solutionSql: solution };
  await run(db, "jtCountBefore", "SELECT COUNT(*)::int AS n FROM enrollments;");
  await run(db, "jtInsert", solution);
  await run(db, "jtCountAfter", "SELECT COUNT(*)::int AS n FROM enrollments;");
  await run(
    db,
    "jtLinus",
    "SELECT student_id, course_id, enrolled_on::text AS enrolled_on, grade FROM enrollments WHERE student_id = 3 AND course_id = 10;",
  );
  await run(db, "jtInsertAgain", solution);
  await run(db, "jtCountAgain", "SELECT COUNT(*)::int AS n FROM enrollments;");
  await db.close();
}

// ── One to one: one-to-one.mdx, "A unique foreign key enforces one-to-one" ──
{
  const file = "one-to-one.mdx";
  const title = "A unique foreign key enforces one-to-one";
  const db = await fresh("oneToOne", file, title);
  await run(
    db,
    "otoCounts",
    `SELECT (SELECT count(*) FROM users)::int AS users,
       (SELECT count(*) FROM user_profiles)::int AS profiles,
       (SELECT count(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id))::int AS without;`,
  );
  // The wide table the lesson starts from: the same facts in one row each.
  await run(
    db,
    "otoWide",
    "SELECT u.id, u.email, p.display_name, p.bio FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id <= 4 ORDER BY u.id;",
  );
  await run(db, "otoProfiles", "SELECT id, user_id, display_name FROM user_profiles ORDER BY id LIMIT 3;");
  const join = lessonSql(file, title, "starterCode");
  out.lessons.oneToOne.starterCode = join;
  await run(db, "otoJoin", join);
  // A second profile for Ada, against the lesson's table (UNIQUE on user_id)...
  const second = "INSERT INTO user_profiles\n  (user_id, display_name)\nVALUES (1, 'Ada');";
  await run(db, "otoSecond", second);
  // ...and against the same table with only the foreign key.
  await db.exec(`CREATE TABLE loose_profiles (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  display_name TEXT NOT NULL,
  bio          TEXT
);
INSERT INTO loose_profiles (user_id, display_name, bio) SELECT user_id, display_name, bio FROM user_profiles ORDER BY id;`);
  await run(db, "otoSecondLoose", second.replace("user_profiles", "loose_profiles").replace(";", "\nRETURNING id, user_id, display_name;"));
  await run(db, "otoLooseAda", "SELECT count(*)::int AS n FROM loose_profiles WHERE user_id = 1;");
  await db.close();
}

// ── Self-reference: self-referencing-relationships.mdx ──────────────────────
{
  const file = "self-referencing-relationships.mdx";
  const title = "Employees and their managers";
  const db = await fresh("selfRef", file, title);
  await run(db, "srRows", "SELECT id, name, title, manager_id FROM employees ORDER BY id;");
  const join = lessonSql(file, title, "starterCode");
  out.lessons.selfRef.starterCode = join;
  await run(db, "srJoin", join);
  // How deep the one table's hierarchy runs, and the longest chain in it.
  await run(
    db,
    "srDepth",
    `WITH RECURSIVE chain AS (
  SELECT id, name, title, ARRAY[name] AS path, 1 AS depth FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.title, c.path || e.name, c.depth + 1 FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT id, name, title, path, depth FROM chain ORDER BY depth DESC, id LIMIT 1;`,
  );
  await run(db, "srReports", "SELECT name FROM employees WHERE manager_id = 1 ORDER BY id;");
  // What the foreign key does not stop: a row managing itself, and a cycle.
  await run(db, "srSelf", "UPDATE employees SET manager_id = 1 WHERE id = 1;");
  await run(db, "srAdaAfter", "SELECT id, name, manager_id FROM employees WHERE id = 1;");
  await run(db, "srJoinAfter", join);
  await run(db, "srCycle", "UPDATE employees SET manager_id = 4 WHERE id = 2;");
  await db.close();
}

const errs = Object.entries(out.results).filter(([, r]) => r.error);
console.log(out.version);
for (const [k, r] of errs) console.log(`${k}: ERROR ${r.error.code} ${r.error.message} / ${r.error.detail}`);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
