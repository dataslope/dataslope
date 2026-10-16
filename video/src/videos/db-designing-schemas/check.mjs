// Runs every statement the db-designing-schemas video shows in PGlite
// (Postgres in WASM), including the ones Postgres refuses, and writes what
// came back to results.json, which data.ts reads. From the repo root, where
// @electric-sql/pglite is installed:
//
//   node video/src/videos/db-designing-schemas/check.mjs
//
// Each figure gets a fresh database built from its lesson's own initSql:
//   - store: case-study-ecommerce.mdx, "Create an online store schema"
//     (customers, products, categories, product_categories, orders,
//     order_items, and their sample rows, unchanged);
//   - quantity: the same lesson's "A line item must have positive quantity";
//   - tasks: evolving-schemas-safely.mdx, "Add a required column in safe
//     steps" (two tasks, then add, backfill, verify, tighten);
//   - assignees: the same lesson's "Before and after a relationship change",
//     which has diagrams and no SQL. Its three shapes (one owner, expanded,
//     contracted) are built here as DDL so the diagram on screen is a schema
//     Postgres accepts; the rows are the video's own, two tasks and two users.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

const STORE_SETUP = `
CREATE TABLE customers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL
);

CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    current_price NUMERIC(10, 2) NOT NULL CHECK (current_price >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE product_categories (
    product_id INT NOT NULL REFERENCES products(id),
    category_id INT NOT NULL REFERENCES categories(id),
    PRIMARY KEY (product_id, category_id)
);

CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    ordered_at TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('placed', 'paid', 'shipped', 'cancelled'))
);

CREATE TABLE order_items (
    order_id INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);

INSERT INTO customers (email, full_name) VALUES
    ('ana@example.com', 'Ana Rivera'),
    ('ben@example.com', 'Ben Cho');

INSERT INTO products (sku, name, current_price) VALUES
    ('MUG-001', 'Postgres Mug', 12.00),
    ('TEE-001', 'Schema T-Shirt', 24.00);

INSERT INTO categories (name) VALUES
    ('drinkware'),
    ('apparel'),
    ('featured');

INSERT INTO product_categories (product_id, category_id) VALUES
    (1, 1),
    (1, 3),
    (2, 2),
    (2, 3);

INSERT INTO orders (customer_id, ordered_at, status) VALUES
    (1, '2025-04-10 14:00', 'paid');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 2, 10.00),
    (1, 2, 1, 24.00);
`;

const QUANTITY_SETUP = `
CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE order_items (
    order_id INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);

INSERT INTO orders DEFAULT VALUES;
INSERT INTO products (name) VALUES ('Postgres Mug');
`;

const TASKS_SETUP = `
CREATE TABLE tasks (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'done'))
);

INSERT INTO tasks (title, status) VALUES
    ('Draft design', 'open'),
    ('Review keys', 'done');
`;

const ASSIGNEES_SETUP = `
CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE tasks (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id INT REFERENCES users(id),
    title TEXT NOT NULL
);

INSERT INTO users (email) VALUES ('ana@example.com'), ('ben@example.com');
INSERT INTO tasks (owner_id, title) VALUES (1, 'Draft design'), (2, 'Review keys');
`;

const fresh = async (setup) => {
  const db = new PGlite();
  await db.exec(setup);
  return db;
};

/** What one statement returned: its rows, or Postgres's error. */
const run = async (db, sql) => {
  try {
    const r = await db.query(sql);
    return { ok: true, fields: r.fields.map((f) => f.name), rows: r.rows, affected: r.affectedRows ?? null };
  } catch (e) {
    return {
      ok: false,
      error: { message: e.message, code: e.code ?? null, detail: e.detail ?? null, constraint: e.constraint ?? null },
    };
  }
};

/** The columns of a table, as the catalog lists them. */
const columns = (db, table) =>
  run(
    db,
    `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position;`,
  );

const out = { results: {} };
const R = out.results;

// ── The store (case-study-ecommerce) ───────────────────────────────────────
{
  const db = await fresh(STORE_SETUP);
  out.version = (await db.query("SELECT version()")).rows[0].version;
  for (const t of ["customers", "products", "categories", "product_categories", "orders", "order_items"]) {
    R[`columns_${t}`] = await columns(db, t);
  }
  R.customers = await run(db, "SELECT id, email, full_name FROM customers ORDER BY id;");
  R.products = await run(db, "SELECT id, sku, name, current_price, active FROM products ORDER BY id;");
  R.categories = await run(db, "SELECT id, name FROM categories ORDER BY id;");
  R.productCategories = await run(db, "SELECT product_id, category_id FROM product_categories ORDER BY product_id, category_id;");
  R.orders = await run(db, "SELECT id, customer_id, status FROM orders ORDER BY id;");
  R.orderItems = await run(db, "SELECT order_id, product_id, quantity, unit_price FROM order_items ORDER BY order_id, product_id;");
  // The lesson's own query: the order's lines, joined across the design.
  R.lines = await run(
    db,
    `SELECT o.id AS order_id, c.full_name AS customer, p.name AS product, oi.quantity, oi.unit_price, p.current_price,
       oi.quantity * oi.unit_price AS line_total
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
ORDER BY o.id, p.name;`,
  );
  // The challenge's solution: the total from the price charged...
  R.totalCharged = await run(
    db,
    `SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_total
FROM orders o JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id ORDER BY order_id;`,
  );
  // ...and the same total from today's catalog, which the lesson warns would
  // "silently rewrite history".
  R.totalCatalog = await run(
    db,
    `SELECT o.id AS order_id, SUM(oi.quantity * p.current_price) AS order_total
FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
GROUP BY o.id ORDER BY order_id;`,
  );
  // The order's customer, and the same product on one order twice.
  R.orderCustomer = await run(db, "SELECT c.full_name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = 1;");
  R.duplicateLine = await run(db, "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (1, 1, 1, 12.00);");
  // A status the design doesn't know.
  R.badStatus = await run(db, "INSERT INTO orders (customer_id, ordered_at, status) VALUES (1, '2025-04-11 09:00', 'lost');");
  await db.close();
}

// ── A line item must have positive quantity (case-study-ecommerce) ─────────
{
  const db = await fresh(QUANTITY_SETUP);
  R.zeroQuantity = await run(db, "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (1, 1, 0, 12.00);");
  await db.close();
}

// ── A required column, in one step and in safe steps (evolving-schemas-safely)
{
  const db = await fresh(TASKS_SETUP);
  R.tasksBefore = await run(db, "SELECT id, title, status FROM tasks ORDER BY id;");
  // The common mistake: required in one step, with old rows that have no value.
  R.oneStep = await run(db, "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL;");
  R.oneStepColumns = await columns(db, "tasks");
  await db.close();
}
{
  const db = await fresh(TASKS_SETUP);
  R.addNullable = await run(db, "ALTER TABLE tasks ADD COLUMN priority TEXT;");
  R.afterAdd = await run(db, "SELECT id, title, status, priority FROM tasks ORDER BY id;");
  R.backfill = await run(db, "UPDATE tasks SET priority = 'normal' WHERE priority IS NULL;");
  R.afterBackfill = await run(db, "SELECT id, title, status, priority FROM tasks ORDER BY id;");
  R.verify = await run(db, "SELECT COUNT(*) AS missing FROM tasks WHERE priority IS NULL;");
  R.tighten = await run(db, "ALTER TABLE tasks ALTER COLUMN priority SET NOT NULL;");
  R.check = await run(db, "ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'normal', 'high'));");
  R.tasksAfter = await run(db, "SELECT id, title, status, priority FROM tasks ORDER BY id;");
  R.tasksAfterColumns = await columns(db, "tasks");
  // The rule now holds for new rows too.
  R.newWithout = await run(db, "INSERT INTO tasks (title, status) VALUES ('Write tests', 'open');");
  await db.close();
}

// ── One owner becomes many assignees: expand, move, contract ───────────────
{
  const db = await fresh(ASSIGNEES_SETUP);
  R.assigneesBefore = await columns(db, "tasks");
  // Expand: the new table beside the old column; both shapes work.
  R.expand = await run(
    db,
    `CREATE TABLE task_assignees (
    task_id INT NOT NULL REFERENCES tasks(id),
    user_id INT NOT NULL REFERENCES users(id),
    PRIMARY KEY (task_id, user_id)
);`,
  );
  // Move: every owner becomes that task's first assignee.
  R.move = await run(db, "INSERT INTO task_assignees (task_id, user_id) SELECT id, owner_id FROM tasks WHERE owner_id IS NOT NULL;");
  R.bothShapes = await run(
    db,
    `SELECT t.id, t.owner_id, a.user_id AS assignee FROM tasks t JOIN task_assignees a ON a.task_id = t.id ORDER BY t.id;`,
  );
  // Contract: only now does the old column go.
  R.contract = await run(db, "ALTER TABLE tasks DROP COLUMN owner_id;");
  R.assigneesAfter = await columns(db, "tasks");
  await db.close();
}

// ── The task tracker grows (why-schemas-change) ────────────────────────────
{
  // v1, the lesson's initSql; v2's due_on is the "New attributes" diagram;
  // v3 is the lesson's own "Evolve tasks by adding projects" starter.
  const db = await fresh(`
CREATE TABLE tasks (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'done'))
);
INSERT INTO tasks (title, status) VALUES ('Draft schema', 'open'), ('Review constraints', 'done');
`);
  R.trackerV1 = await columns(db, "tasks");
  R.trackerDue = await run(db, "ALTER TABLE tasks ADD COLUMN due_on DATE;");
  R.trackerProjects = await run(db, "CREATE TABLE projects (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL UNIQUE);");
  await run(db, "INSERT INTO projects (name) VALUES ('Database course');");
  R.trackerLink = await run(db, "ALTER TABLE tasks ADD COLUMN project_id INT REFERENCES projects (id);");
  R.trackerFill = await run(db, "UPDATE tasks SET project_id = 1;");
  R.trackerJoin = await run(db, "SELECT t.title, p.name AS project FROM tasks AS t JOIN projects AS p ON p.id = t.project_id ORDER BY t.id;");
  R.trackerV3 = await columns(db, "tasks");
  R.trackerV3Projects = await columns(db, "projects");
  await db.close();
}

// ── The unit's other lessons' claims, checked for the report (not shown) ───
{
  // the-design-process: "The example rejects waiting".
  const db = await fresh(`
CREATE TABLE attendees (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL);
CREATE TABLE events (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title TEXT NOT NULL, starts_at TIMESTAMP NOT NULL);
CREATE TABLE registrations (
    attendee_id INT NOT NULL REFERENCES attendees(id),
    event_id INT NOT NULL REFERENCES events(id),
    status TEXT NOT NULL CHECK (status IN ('reserved', 'cancelled')),
    registered_at TIMESTAMP NOT NULL,
    PRIMARY KEY (attendee_id, event_id)
);
INSERT INTO attendees (email, full_name) VALUES ('ana@example.com', 'Ana Rivera'), ('ben@example.com', 'Ben Cho');
INSERT INTO events (title, starts_at) VALUES ('Schema Design Night', '2025-05-01 18:00'), ('PostgreSQL Practice', '2025-05-08 18:00');
INSERT INTO registrations (attendee_id, event_id, status, registered_at) VALUES (1, 1, 'reserved', '2025-04-01 09:00');
`);
  R.lessonWaiting = await run(db, "INSERT INTO registrations (attendee_id, event_id, status, registered_at) VALUES (1, 2, 'waiting', '2025-04-02 10:00');");
  await db.close();
}
{
  // case-study-blog: the duplicate tag is refused; comments per post are 2 and 0.
  const db = await fresh(`
CREATE TABLE users (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL);
CREATE TABLE posts (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, author_id INT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
    body TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('draft', 'published')), published_at TIMESTAMP);
CREATE TABLE comments (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, post_id INT NOT NULL REFERENCES posts(id),
    user_id INT NOT NULL REFERENCES users(id), parent_comment_id INT REFERENCES comments(id), body TEXT NOT NULL, created_at TIMESTAMP NOT NULL);
CREATE TABLE tags (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE post_tags (post_id INT NOT NULL REFERENCES posts(id), tag_id INT NOT NULL REFERENCES tags(id), PRIMARY KEY (post_id, tag_id));
INSERT INTO users (email, display_name) VALUES ('ana@example.com', 'Ana'), ('ben@example.com', 'Ben'), ('cam@example.com', 'Cam');
INSERT INTO posts (author_id, title, body, status, published_at) VALUES
    (1, 'Designing Tables', 'Start with entities.', 'published', '2025-03-01 09:00'), (1, 'Draft Notes', 'Still thinking.', 'draft', NULL);
INSERT INTO comments (post_id, user_id, parent_comment_id, body, created_at) VALUES
    (1, 2, NULL, 'This helped me see why keys matter.', '2025-03-02 10:00'), (1, 3, 1, 'The comment thread example helped too.', '2025-03-02 11:00');
INSERT INTO tags (name) VALUES ('postgres'), ('design'), ('beginner');
INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (1, 2), (1, 3);
`);
  R.lessonDuplicateTag = await run(db, "INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1);");
  R.lessonCommentCounts = await run(
    db,
    "SELECT p.title, COUNT(c.id) AS comment_count FROM posts p LEFT JOIN comments c ON c.post_id = p.id GROUP BY p.id, p.title ORDER BY p.title;",
  );
  R.lessonPublished = await run(
    db,
    `SELECT p.title, u.display_name AS author, string_agg(t.name, ', ' ORDER BY t.name) AS tags
FROM posts AS p JOIN users AS u ON u.id = p.author_id JOIN post_tags AS pt ON pt.post_id = p.id JOIN tags AS t ON t.id = pt.tag_id
WHERE p.status = 'published' GROUP BY p.id, p.title, u.display_name;`,
  );
  await db.close();
}
{
  // evolving-schemas-safely's challenge: add, backfill, tighten category.
  const db = await fresh(TASKS_SETUP);
  await run(db, "ALTER TABLE tasks ADD COLUMN category TEXT;");
  await run(db, "UPDATE tasks SET category = 'general' WHERE category IS NULL;");
  R.lessonCategory = await run(db, "ALTER TABLE tasks ALTER COLUMN category SET NOT NULL;");
  R.lessonCategoryCount = await run(db, "SELECT COUNT(*) AS n FROM tasks WHERE category = 'general';");
  await db.close();
}

const failures = Object.entries(R).filter(([, v]) => !v.ok);
console.log(out.version);
for (const [k, v] of failures) console.log(`refused  ${k}: ${v.error.code} ${v.error.message}`);
console.log(`charged total ${R.totalCharged.rows[0].order_total}, catalog total ${R.totalCatalog.rows[0].order_total}`);
console.log(`verify missing ${R.verify.rows[0].missing}, backfill ${R.backfill.affected} rows, move ${R.move.affected} rows`);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
