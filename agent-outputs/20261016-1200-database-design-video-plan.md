# Database Design with PostgreSQL: video plan

**Course:** `content/courses/database-design-postgresql/` (36 lessons in 11 sections)
**Format:** the editorial style, one video per unit, as the Statistics course's later units (`video/README.md`; the Statistics plan is `agent-outputs/20261016-0300-statistics-course-video-plan.md`).
**Estimate:** about **33 minutes in 9 videos**, about 26,000 characters of narration (Drew), sized from each unit's explanatory prose at the Statistics course's rate.

## Why this course

- **Its explanations are diagrams.** It carries 196 of them, more than any other course on the site: 54 ER diagrams and 142 flowcharts. On the page they are static; a video builds one as it is named, which is the "keep the picture moving" rule's natural shape.
- **Every claim can be run.** A constraint rejecting a row, an update anomaly, a junction table resolving many-to-many: each video's `check.mjs` runs the lesson's own SQL through PGlite (Postgres in WASM) and writes `results.json`, as the SQL videos already do.
- **It has a story.** Its last section, Codd's 1970 paper through Ingres to PostgreSQL, closes the course.

## The units

| # | Composition | Folder | Lessons | Target |
| --- | --- | --- | --- | --- |
| 1 | DbDesign-1-WhyDesign | db-why-design | what-is-database-design, design-and-data-quality | 2.5 to 3 min |
| 2 | DbDesign-2-Entities | db-entities | thinking-in-entities, attributes-and-domains, entity-relationship-diagrams | 2.5 to 3 min |
| 3 | DbDesign-3-Relationships | db-relationships | what-are-relationships, cardinality, reading-er-diagrams | 2.5 to 3 min |
| 4 | DbDesign-4-Keys | db-keys | primary-keys, natural-vs-surrogate-keys, foreign-keys, referential-integrity | 3.5 to 4 min |
| 5 | DbDesign-5-RelationshipPatterns | db-relationship-patterns | one-to-many, many-to-many, junction-tables, one-to-one, self-referencing-relationships | 3.5 to 4 min |
| 6 | DbDesign-6-Constraints | db-constraints | what-are-constraints, not-null-and-defaults, unique-constraints, check-constraints, choosing-data-types (the ideas; the syntax stays on the page) | 3.5 to 4.5 min |
| 7 | DbDesign-7-Normalization | db-normalization | why-normalization, first-normal-form, second-normal-form, third-normal-form, denormalization (the standalone WhyNormalization video can be drawn on) | 4.5 to 5 min |
| 8 | DbDesign-8-DesigningSchemas | db-designing-schemas | the-design-process, case-study-blog, case-study-ecommerce, why-schemas-change, evolving-schemas-safely, design-and-scale | 4.5 to 5 min |
| 9 | DbDesign-9-RelationalHistory | db-relational-history | the-relational-revolution, from-ingres-to-postgresql | 3 to 3.5 min |

**No video:** next-steps, and the syntax, practice and quiz material of every lesson.

## How the videos join up

Each ends on a bridge the next one opens with:

- **1 → 2:** a design starts by naming the things the data is about. "Next: the things your data is about."
- **2 → 3:** entities don't live alone; the lines between them carry as much meaning as the boxes. "Next: how entities relate."
- **3 → 4:** to draw a line between two rows, each row needs a name nothing else shares: a key. "Next: keys."
- **4 → 5:** with keys, every shape a relationship takes can be built. "Next: the shapes relationships take."
- **5 → 6:** keys guard the links between tables; constraints guard what goes in them. "Next: constraints."
- **6 → 7:** constraints stop bad values, not bad structure: one fact stored twice can still disagree with itself. "Next: normalization."
- **7 → 8:** knowing the rules is half of it; the other half is a process for applying them, and for changing a design once it's live. "Next: designing a schema, start to finish."
- **8 → 9:** none of this was obvious once; it started with one paper in 1970. "Next: where relational databases came from."
- **9** closes the course.

## What is shared

- **The ERD kit** (`video/src/editorial/erd.tsx`): `<Entity>`, a table box that builds itself row by row, and `<Relation>`, a relationship line that draws itself with crow's-foot ends (`video/src/components/crowsfoot.ts`: exactly one, zero or one, one or many, zero or many, many). Every unit draws its ERDs with it. `npm run check:frames` fails a marker built across a corner of its line, and the `ErdKit` composition under Assets shows the kit on one page.
- **The series intro** (`<SeriesIntro course="Database Design with PostgreSQL" unit="Unit N" title="…" />`), narration in takes on `eleven_v4_turbo`, the ElevenLabs sound set, and every rule in the Statistics plan's "Decisions".

## Decisions

- **Narrator: Drew** (decided 2026-10-16). One voice for the whole course; the Statistics course has Hope, so each course sounds like its own teacher. Every script sets `voice: "drew"`.
- **One video per unit, prefixed names** (decided 2026-10-16): `DbDesign-<unit>-<Name>`, in the Studio's `Database-Design` folder in course order.
