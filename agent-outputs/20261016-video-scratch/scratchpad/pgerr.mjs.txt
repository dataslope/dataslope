import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec("CREATE TABLE t (id int primary key, name text not null); INSERT INTO t VALUES (1,'a');");
try { await db.query("INSERT INTO t VALUES (1,'b')"); } catch (e) { console.log(Object.keys(e), e.constructor.name); console.log({message:e.message, detail:e.detail, code:e.code, constraint:e.constraint, table:e.table, column: e.column, schema: e.schema}); }
const r = await db.query("INSERT INTO t VALUES (2,'b')"); console.log(r);
