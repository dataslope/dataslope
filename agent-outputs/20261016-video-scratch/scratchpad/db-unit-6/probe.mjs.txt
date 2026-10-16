import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec(`CREATE TABLE t (id SERIAL PRIMARY KEY, price NUMERIC NOT NULL CHECK (price >= 0));`);
try { await db.query(`INSERT INTO t (price) VALUES (-3.00)`); } catch (e) { console.log(Object.keys(e), e.message, e.detail, e.code, e.constraint, e.table); console.log(e); }
const r = await db.query(`INSERT INTO t (price) VALUES (1.00)`); console.log(r);
const x = await db.query(`SELECT 0.1 + 0.2 AS n, 0.1::float8 + 0.2::float8 AS f, (0.1::float8 + 0.2::float8)::text AS ft`); console.log(x.rows, x.fields);
