# D1 migrations

One subfolder per database. Each is a `migrations_dir` in `wrangler.jsonc`, and
each database keeps its own `d1_migrations` bookkeeping table, so the numbering
restarts in every folder and the same `0001_` prefix appearing three times is
expected.

| Folder | Database | Binding | Apply with |
| --- | --- | --- | --- |
| `auth/` | `dataslope-auth` | `DB` | `npm run db:migrate[:remote]` |
| `illustrations/` | `dataslope-illustrations` | `ILLUSTRATIONS_DB` | `npm run db:migrate:illustrations[:remote]` |
| `search/` | `dataslope-search` | `SEARCH_DB` | `npm run db:migrate:search[:remote]` |

Three databases rather than one is deliberate, and the reasons differ:

- **`auth`** holds accounts, sessions, plans, AI usage counters, cloud-workspace
  metadata and custom content. It is the only one whose rows cannot be rebuilt
  from anything in this repository.
- **`illustrations`** holds authoring state: the illustration and chart review
  queues written from the admin galleries. Kept separate so a coding agent can
  read and wipe the whole queue without being anywhere near accounts or
  sessions.
- **`search`** holds the lesson full-text index. Separate because it is the only
  database containing an FTS5 *virtual table*, and `wrangler d1 export` refuses
  to export a database that has one (cloudflare/workers-sdk#9519). Every row is
  derived from `content/` and re-seeded on each deploy, so that limitation costs
  nothing here, and it would be unacceptable for the other two.

## Adding a migration

Add a new file; never edit one that has been applied. D1 records applied
migrations by **filename**, so a rename reads as a brand-new migration and a
re-edit of an applied file is silently ignored on databases that already have
it. Keep the `NNNN_snake_case.sql` shape and take the next free number *within
that folder*.

For Better Auth schema changes specifically, generate the delta with
`npx @better-auth/cli generate` and land it as a new file in `auth/`.
