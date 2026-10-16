import { PGlite } from "/home/user/dataslope/node_modules/@electric-sql/pglite/dist/index.js";
const db = new PGlite();
await db.exec(`CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  status      TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  placed_on   DATE NOT NULL
);`);
try { await db.query("INSERT INTO orders VALUES (101, 'placed', 0, DATE '2025-02-01')"); console.log("placed: accepted"); }
catch (e) { console.log("placed:", e.code, e.message); }
