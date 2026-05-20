# SQL IDE Analyze & Explain Features: Ecosystem Research Report

**Date:** 2026-05-12
**Purpose:** Design reference for best-in-class Analyze/Explain features in browser-based SQLite and PostgreSQL playgrounds.

---

## Executive Summary

### Main Patterns Across the Ecosystem

After surveying 30+ tools ranging from desktop IDEs (DBeaver, DataGrip, pgAdmin) to cloud SQL editors (Supabase, Neon, MotherDuck), browser playgrounds (sqlime, DB Fiddle), BI tools (Metabase, Mode, Redash), and AI-native platforms (Chat2DB, Beekeeper AI Shell), several consistent patterns emerge:

1. **EXPLAIN visualization is a differentiator, not a commodity.** Most tools still show raw text. Only a handful—pev2, pgAdmin 4, DBeaver's graph view, and DataGrip—offer polished graphical plans. The gap is wide enough that even a basic visual tree would be best-in-class for a browser playground.

2. **Color heatmaps on exclusive duration are the single most useful UX idea.** pev2, pgAdmin, and depesz.com all converge on the same thresholds: >10% → yellow, >40% → orange, >90% → red. This instantly surfaces the bottleneck.

3. **The planner row estimation error is the most important diagnostic signal.** Under/over-estimates cascade through the plan tree and are the #1 cause of bad plans. Every serious tool highlights when estimates are off by 10x, 100x, 1000x.

4. **AI features are rapidly becoming standard for SQL error fixing and query generation.** Error inline-fix (MotherDuck FixIt, DBeaver Fix SQL) feels universally useful. Schema-aware AI (no data rows sent to LLM) is the emerging best practice.

5. **SQLite's EXPLAIN QUERY PLAN is structurally limited** — no costs, no timing, no actual row counts. No browser-based SQLite tool currently compensates with visual rendering. The opportunity is open.

6. **Progressive disclosure is the UX pattern that reconciles beginners and experts.** Compact node cards with expand-on-click, top-level stats bar, and per-node detail panels let each user see what they need.

### Most Useful UX Ideas

- Per-node progress bars with global metric switcher (pev2)
- Exclusive vs inclusive time distinction
- Row estimation factor display with direction (over/under)
- Collapsed node cards — click to expand full properties
- Top-level stats bar: execution time, planning time, JIT, triggers
- Never-executed node badges
- CTE/subplan cross-reference links
- AI one-click error fix inline in editor
- Column profiler / explorer after running queries (MotherDuck)
- Instant SQL / live preview as you type (MotherDuck)

### Biggest Gaps and Opportunities

| Gap | Opportunity |
|---|---|
| No browser SQLite tool renders EQP visually | Build first-in-class SQLite EQP tree renderer |
| No browser tool shows execution time per EQP node | Simulate via wall-clock wrapping of each statement |
| AI features nearly absent from SQLite playgrounds | Beginner-friendly natural language plan explanation |
| Row estimation error: almost never shown in beginner tools | Even a simple "planner was off by Nx" badge is high value |
| Supabase/Neon show raw PG EXPLAIN text | Embedding pev2 or equivalent would be a step-change |

---

## Feature Comparison Table

| Product | Analyze Features | Explain Visualization | AI Features | SQLite Support | PostgreSQL Support | Beginner Friendly | Power User Depth | Notable UX Ideas |
|---|---|---|---|---|---|---|---|---|
| **pev2 / explain.dalibo.com** | ✓ (all metrics) | ✓✓ Graphical tree + table + stats | ✗ | ✗ | ✓✓ Best-in-class | △ | ✓✓ | Exclusive time, progress bars, CTE nav |
| **depesz.com** | △ | △ Table view, color coding | ✗ | ✗ | ✓ | △ | ✓ | Blog post links per node type |
| **pgAdmin 4** | ✓ | ✓ Graphical + table + stats | ✓ AI Insights tab | ✗ | ✓✓ | △ | ✓✓ | AI plan insights, SVG export |
| **DBeaver** | ✓ | ✓ Tree + graph (advanced) | ✓✓ Full AI suite | ✓ (limited) | ✓✓ | △ | ✓✓ | Graph view, hide irrelevant nodes |
| **DataGrip** | ✓ | ✓ Tree + flame graph | ✓ JetBrains AI | △ | ✓✓ | △ | ✓✓ | Flame graph view (unique) |
| **Supabase SQL Editor** | △ | △ Raw text EXPLAIN | ✓✓ AI Assistant v2 | ✗ | ✓ | ✓ | △ | Persistent AI sidebar, data insights |
| **Neon SQL Editor** | △ | △ Raw text EXPLAIN | △ | ✗ | ✓ | △ | △ | Time Travel, saved queries |
| **PlanetScale Insights** | ✓✓ | ✗ | ✗ | ✗ | ✗ (MySQL) | ✓ | ✓✓ | p50/p99/p99.9 graphs, scatter warning icons |
| **MotherDuck** | ✓ | △ (DuckDB EXPLAIN text) | ✓✓ FixIt + Edit | ✗ | ✗ (DuckDB) | ✓ | ✓✓ | Instant SQL, Column Explorer |
| **DuckDB UI** | ✓ | △ | ✗ | ✗ | ✗ (DuckDB) | ✓ | ✓ | Local native execution |
| **Beekeeper Studio** | △ | ✗ | ✓ AI Shell (BYOM) | ✓ | ✓ | ✓ | △ | Agentic, transparent AI |
| **TablePlus** | △ | ✗ | ✗ | △ | ✓ | ✓ | △ | Code review panel, safe mode |
| **DB Browser for SQLite** | ✗ | ✗ (raw text only) | ✗ | ✓✓ | ✗ | ✓ | △ | Simple, spreadsheet-like |
| **SQLiteStudio** | ✗ | ✗ (raw text only) | ✗ | ✓✓ | ✗ | ✓ | △ | Plugin architecture |
| **Chat2DB** | △ | ✗ | ✓✓ Full AI | ✓ | ✓ | ✓ | △ | One-click fix, auto charts |
| **Hex** | △ | ✗ | ✓✓ Magic AI | △ | ✓ | △ | ✓ | Agentic analysis, Threads |
| **Mode** | △ | ✗ | △ | ✗ | ✓ | △ | ✓ | Notebook + dashboard |
| **Metabase** | ✗ | ✗ | △ | ✓ | ✓ | ✓✓ | △ | Question builder |
| **Redash** | ✗ | ✗ | ✗ | △ | ✓ | ✓ | △ | Rich visualizations |
| **PopSQL** | ✗ | ✗ | △ | △ | ✓ | ✓ | △ | Collaborative, shared queries |
| **sqlime.org** | △ (wall-clock time) | ✗ (raw text) | ✗ | ✓✓ | ✗ | ✓ | ✗ | Share via GitHub Gist |
| **DB Fiddle** | ✗ | ✗ (raw text) | ✗ | ✓ | ✓ | ✓ | ✗ | Multi-engine in one URL |
| **LeetCode SQL** | △ (execution time) | ✗ | ✗ | ✓ (hidden) | ✗ | ✓✓ | ✗ | Expected vs actual output diff |
| **HackerRank SQL** | △ | ✗ | ✗ | ✗ | ✗ (MySQL) | ✓✓ | ✗ | Test case framework |
| **DataCamp SQL** | ✗ | ✗ | △ AI hints | △ | ✓ | ✓✓ | ✗ | Step-by-step exercises |
| **Observable** | ✗ | ✗ (raw text) | △ | ✗ | ✗ (DuckDB) | ✓ | ✓ | Reactive cells, D3 integration |
| **Jupyter / JupySQL** | ✗ | ✗ (raw text) | △ (JupyterAI) | △ | ✓ | △ | ✓ | `%sqlplot` charts |
| **SQLTools (VS Code)** | ✗ | ✗ | ✗ (Copilot via IDE) | ✓ | ✓ | △ | △ | Pluggable drivers |
| **VS Code MSSQL** | △ | △ Query Profiler | △ Copilot | ✗ | ✗ (SQL Server) | △ | ✓ | Schema Designer + AI |
| **pgHero** | ✓ (slow queries) | ✗ | ✗ | ✗ | ✓✓ | △ | ✓ | Unused index analysis |
| **pganalyze** | ✓✓ | ✓ (plan history) | ✓ Index Advisor | ✗ | ✓✓ | △ | ✓✓ | Historical plan comparison |
| **Azure Data Studio** | △ | △ | △ Copilot | ✗ | ✗ (SQL Server) | △ | △ | **⚠ Retired Feb 2026** |
| **Turso / libSQL** | ✗ | ✗ (EQP text) | ✗ | ✓✓ (SQLite-compat) | ✗ | △ | △ | Edge-native SQLite |

**Key:** ✓✓ = exceptional, ✓ = present, △ = partial/limited, ✗ = absent

---

## Deep Dives Per Tool

### pev2 (Postgres Explain Visualizer 2) — Gold Standard Reference

**Overview:** Vue.js 3 + Bootstrap 5 open-source component (⭐3,468 on GitHub). Hosted at `explain.dalibo.com`. Available as an npm package for embedding. Runs as a self-contained `pev2.html` with no network dependency.

**Recommended input:**
```sql
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) SELECT ...;
```

**Three view modes:**

| Component | Purpose |
|---|---|
| Diagram view (`Diagram.vue` + `DiagramRow.vue`) | D3-powered graphical tree layout |
| Grid view (`Grid.vue` + `GridRow.vue`) | Tabular, modeled after depesz.com |
| Stats view (`Stats.vue` + `StatsTableItem.vue`) | Aggregated statistics by node type |

**Metrics tracked (from `src/enums.ts` — NodePropBase enum):**

*From PostgreSQL JSON output:*
- `ACTUAL_ROWS`, `PLAN_ROWS`, `PLAN_WIDTH`
- `ROWS_REMOVED_BY_FILTER`, `ROWS_REMOVED_BY_JOIN_FILTER`, `ROWS_REMOVED_BY_INDEX_RECHECK`
- `ACTUAL_STARTUP_TIME`, `ACTUAL_TOTAL_TIME`, `ACTUAL_LOOPS`
- `STARTUP_COST`, `TOTAL_COST`
- `JOIN_TYPE`, `INDEX_NAME`, `HASH_CONDITION`, `SCAN_DIRECTION`
- `PARALLEL_AWARE`, `WORKERS`, `WORKERS_PLANNED`, `WORKERS_LAUNCHED`
- `IO_READ_TIME`, `IO_WRITE_TIME` (plus Local/Shared/Temp variants)
- `WAL_RECORDS`, `WAL_BYTES`, `WAL_FPI`
- `SORT_METHOD`, `SORT_SPACE_TYPE`, `SORT_SPACE_USED`
- `JIT` section, `SERIALIZATION` section

*Computed internally (prefixed `*`):*
- `*Duration (exclusive)` — this node's own time minus all children
- `*Cost (exclusive)` — cost attributable to this node alone
- `*Actual Rows Revised` — rows × loops for accurate multi-loop display
- `*Planner Row Estimate Factor` — how far off the planner was (e.g., "100x over")
- `*Planner Row Estimate Direction` — over / under / correct
- `*Shared/Temp/Local ...Blocks (exclusive)` — buffer usage excluding children
- `*I/O Read/Write Speed` — transfer rate derived from time + block counts

**Color coding (from `src/node.ts`):**
- Duration thresholds: `c-2` (>10%), `c-3` (>40%), `c-4` (>90%) → yellow/orange/red
- Cost: same thresholds
- Estimation error: `c-2` (>10×), `c-3` (>100×), `c-4` (>1000×)
- Rows removed: `c-3` (>50%), `c-4` (>90%)
- Progress bars: `numberToColorHsl(barWidth)` — smooth green→red HSL gradient
- Bar width: percentage of maximum metric value across all nodes

**Interactive features (`PlanNode.vue`):**
- Click node header → toggles `showDetails` → reveals `PlanNodeDetail`
- Hover → highlights node with animated edge glow
- Click node ID → selects node, centers view
- CTE/subplan references → click navigates to the CTE definition node
- Never-executed nodes: `never-executed` CSS class + "Never executed" badge
- Parallel workers shown as stacked card layers (offset 2–3 px per worker)

**PlanStats bar (`PlanStats.vue`):**
- Execution time (N/A + info icon if `ANALYZE` not used)
- Planning time — colored alert if large relative to execution time
- Serialization time dropdown (with buffer detail)
- JIT time dropdown (per-phase: Generation, Inlining, Optimization, Emission)
- Trigger timing dropdown
- PG Settings dropdown (non-default planner settings)
- I/O average read/write speeds

**Highlight mode toggle:** `NONE | DURATION | ROWS | COST` — switches all progress bars simultaneously

**Strengths:**
- Most complete metric coverage of any open-source tool
- Excellent progressive disclosure (compact cards → expand for details)
- Open source, embeddable as npm package
- Works offline as standalone HTML

**Weaknesses:**
- Requires `EXPLAIN ... FORMAT JSON` — plain text is not accepted
- No beginner explanation layer ("what is a Hash Join?")
- No AI assistance

---

### depesz.com/s/explain

**Overview:** The oldest PG explain tool (>230,000 plans stored; ~220 plans/day). Pure table/text view — no graphical tree.

**What it does:**
- Color codes by exclusive/inclusive time % (same thresholds later adopted by pgAdmin)
- Links from each node type name to the "Explaining the unexplainable" blog post series
- Anonymization mode for scrubbing sensitive table/column names before sharing
- Share via URL

**Color thresholds:**
- Exclusive time > 90% → red
- Exclusive time > 50% → orange  
- Exclusive time > 10% → yellow
- Row estimate 10× off → yellow; 100× → orange; 1000× → red

**Strengths:**
- Educational: node type links to plain-English blog posts
- Anonymization for team collaboration
- Simple, fast

**Weaknesses:**
- Text-only; no graphical visualization
- No AI features
- No interactive exploration

---

### pgAdmin 4

**Overview:** Official PostgreSQL management tool. Browser-based (runs locally or as hosted service). The most comprehensive free PostgreSQL GUI.

**Query Tool layout:**
- Upper panel: SQL Editor | History | Scratch Pad | AI Assistant
- Lower panel: Data Output | Explain | Messages | Notifications

**EXPLAIN — Three tabs on Explain panel:**

**1. Graphical tab:**
- Tree visualization of execution plan
- Click node icon → popup panel appears on right with full node properties
- JIT statistics, triggers, summary accessible via top-right button
- Download as SVG
- Generates plan from JSON internally (`EXPLAIN ... FORMAT JSON`)
- `EXPLAIN VERBOSE` is *not* displayable graphically

**2. Table tab (modeled after depesz.com):**
- Each row = one plan node
- Columns: Node info, Exclusive timing, Inclusive timing, Actual vs Planned row diff, Actual rows, Planned rows, Loops
- Color thresholds:
  - Exclusive/inclusive timing: >90% red, >50% orange, >10% yellow
  - Row estimation error: 10× yellow, 100× orange, 1000× red

**3. Statistics tab:**
- Table 1: Statistics per Plan Node Type
- Table 2: Statistics per Table

**AI Insights tab (new — requires AI provider configured):**
- On-demand AI analysis of the execution plan
- Identifies performance bottlenecks:
  - Sequential scans on large tables that could benefit from indexes
  - Significant actual vs estimated row count differences
  - Expensive sort or hash operations
  - Nested loops with high iteration counts
- Provides recommendations:
  - `CREATE INDEX` statements with copy/insert buttons
  - `ANALYZE` commands
  - Configuration parameter adjustments
  - Query restructuring suggestions
- Regenerate button for fresh analysis

**AI Assistant panel (upper panel tab):**
- Chat-style natural language → SQL generation
- Analyzes schema automatically
- Insert/Replace/Copy action buttons for generated SQL
- Maintains conversation context for iterative refinement
- Supports SELECT, INSERT, UPDATE, DELETE, DDL

**Query History:**
- Per-database, per-user, persistent across sessions
- Shows: date/time, query text, rows returned, execution time, server messages, source icon
- Copy to clipboard or Copy to Query Editor
- Remove single / Remove All
- Default: last 20 queries (configurable via `MAX_QUERY_HIST_STORED`)

**Strengths:**
- Only free tool with an AI "insights" tab on the explain plan itself
- Three-view explain (graphical + table + stats) is the most complete non-pev2 offering
- Free, open source

**Weaknesses:**
- Graphical explain doesn't support `VERBOSE`
- AI Insights requires external AI provider configuration
- UI is dense — less beginner-friendly than commercial alternatives
- No equivalent for SQLite

---

### DBeaver

**Overview:** Cross-platform database GUI, available in Community (free) and Enterprise editions. Supports 80+ databases.

**Query Execution Plan:**
- **Simple plan view:** Tree in a results tab (Ctrl+Shift+E or toolbar button)
  - Click row → details panel below/right
  - Reevaluate and View Source buttons
- **Advanced (graph) plan view:**
  - Graphical node-and-edge layout
  - Highlights most expensive (cost-based) nodes visually
  - "Hide irrelevant nodes" toggle
  - Horizontal or vertical layout options
  - Export to image
  - Export/save as JSON for sharing

**AI Smart Assistance:**

Supported providers: OpenAI, GitHub Copilot, Azure OpenAI, Google Gemini, Ollama, Anthropic Claude, Amazon Bedrock

Features:
- **AI Chat** — natural language Q&A about data
- **Speech recognition** — voice → SQL
- **AI Functions** — AI can open internal tools/wizards
- **Query suggestion** — inline SQL suggestions as you type
- **Explain query** — plain English explanation of any SQL
- **Fix SQL errors** — one-click error analysis and fix
- **AI command** — type `@ai show films starring Grace Mostel` in the SQL editor
- **Describe object** — AI explains the purpose of any table/view/object
- **Open file as table** — upload file in AI Chat
- **Map with AI** — automatically map source→target tables for migration

**SQL Editor extras:**
- Outline panel (Alt+Shift+Q,O) — tree of query structure, bidirectionally synced with cursor
- Hyperlinks (Ctrl+hover) → jump to table/view definition
- Error indication with icon + tooltip
- Semantic error detection (optional)
- Spell checker for SQL
- Charts from query results

**Strengths:**
- Only free tool with both graphical plan AND "hide irrelevant nodes" toggle
- Best-in-class AI provider breadth (including Ollama for private/local models)
- "Explain query" in plain English is unique

**Weaknesses:**
- Community edition has limited AI features; Enterprise required for full depth
- Graph plan view can be cluttered for complex queries
- SQLite support limited compared to Postgres

---

### DataGrip (JetBrains)

**Overview:** Paid commercial IDE from JetBrains. The highest-end desktop SQL IDE.

**Query Execution Plan:**
- Interactive tree visualization with timing annotations
- Shows actual vs estimated rows with mismatch highlighting
- Index usage annotations on each node
- **Flame graph view** — unique feature in the desktop IDE space, borrowed from profiling tools

**AI Integration (JetBrains AI):**
- Schema-aware SQL completion
- Natural language → SQL generation
- Inline suggestions as you type
- Error explanation and fix suggestions
- Query refactoring with AI

**Query History:**
- Persistent with execution time tracking
- Searchable

**Strengths:**
- Flame graph provides a completely different mental model for query bottleneck identification
- Deep IDE integration (refactoring, VCS, schema comparison)
- Full PostgreSQL EXPLAIN ANALYZE JSON parsing

**Weaknesses:**
- Paid subscription required
- No beginner-friendly explanation layer
- Overkill for playground use cases

---

### Supabase SQL Editor + AI Assistant v2

**Overview:** Browser-based PostgreSQL editor embedded in the Supabase Dashboard. Focus on schema management and rapid query iteration.

**SQL Editor:**
- Standard code editor with syntax highlighting (CodeMirror-based)
- Results panel below editor with tabular results
- **Explain button:** runs raw `EXPLAIN` (no ANALYZE — estimates only, query not executed)
- **Analyze button:** runs raw `EXPLAIN ANALYZE` (query executed, actual row counts and timing)
- Output: raw PostgreSQL text — **no graphical visualization**

**AI Assistant v2 (cmd+i, persistent global panel):**
- Context-aware — automatically detects current page/table/schema
- Multi-tool AI system:
  1. **Schema design** — guides database structure, generates DDL SQL
  2. **Write SQL** — generates queries with contextual understanding
  3. **Debug queries** — analyzes errors from SQL Editor or within panel
  4. **Data insights** — runs `SELECT` queries automatically; shows results in tabular/chart form inside conversation; **no actual data sent to LLM** (schema only)
  5. **SQL → supabase-js** — converts SQL to client library code
  6. **RLS Policies** — create/modify Row Level Security policies
  7. **Functions/Triggers** — suggest, create, or update
- Persistent sidebar across entire Dashboard
- "Edit with Assistant" in policy/function/trigger lists

**Strengths:**
- AI integrates across all Supabase features (not just SQL editor)
- "Data insights" in AI conversation (charts auto-generated) is unique
- Privacy-preserving: schema only, no data rows sent to LLM

**Weaknesses:**
- EXPLAIN output is raw text only — no visualization
- AI plan analysis not yet available
- No SQLite support

---

### Neon SQL Editor

**Overview:** Browser-based PostgreSQL editor with branch-aware database features.

**Features:**
- Branch and database selector
- Multiple result sets in numbered tabs (execution order)
- **Explain button:** runs `EXPLAIN` — estimates only
- **Analyze button:** runs `EXPLAIN ANALYZE` — actual row counts + timing
- Output: **raw PostgreSQL text** — not graphical
- Query history (left pane "History" list)
- Saved queries (left pane "Saved" list, with rename/delete)
- **Time Travel:** switch to a historical snapshot for point-in-time queries
- Export: CSV, JSON, XLSX + copy as JSON to clipboard
- psql meta-commands: `\dt`, `\d table`, `\l`, `\?`, `\h [NAME]`

**Strengths:**
- Time Travel is unique among SQL editors
- Saved queries with rename/delete
- Branch-aware (queries against database branches)

**Weaknesses:**
- EXPLAIN is raw text only — no visualization
- No AI features in SQL editor currently
- No SQLite support

---

### PlanetScale Insights

**Overview:** MySQL-focused production query analytics dashboard (not a SQL editor per se). Best-in-class production query monitoring UX.

**Performance Graphs (visual):**
- Query latency: p50, p95, p99, p99.9 lines (toggle-able)
- Queries/second over time
- Rows read/second
- Rows written/second
- Click-drag to zoom into time range
- Deploy Request overlays with links (correlate deploys with query regressions)

**Queries Overview Table:**
Customizable columns:
- Query text (normalized, with `:v1` placeholders for PII scrubbing)
- % of total runtime, count, total time (s)
- p50 / p99 / Max latency
- Rows returned, Rows read, Rows read ÷ Rows returned (inefficiency ratio)
- Rows affected, Tablet calls per query, Last run

**Warning icons on queries:**
- 🔷 Shard icon → multi-shard scatter-gather query
- ⚠️ Exclamation → full table scan, no index used
- Tooltips explain each warning icon

**Schema Recommendations:** Auto-generated from production traffic patterns
**Anomalies page:** Queries running significantly slower than baseline

**Strengths:**
- Best production query monitoring UX (p50/p99/p99.9 graphs)
- Warning icons make anti-patterns immediately visible to beginners
- "Rows read ÷ Rows returned" as an explicit inefficiency ratio is excellent
- Automatic schema recommendations from traffic

**Weaknesses:**
- MySQL only (not PostgreSQL or SQLite)
- Not a query editor — production analytics tool
- No EXPLAIN visualization

---

### MotherDuck (DuckDB Cloud)

**Overview:** Cloud-hosted DuckDB service with a polished browser UI.

**Editor modes:** Notebook (multiple cells) or worksheet (single cell), toggled with Ctrl+E

**Instant SQL:**
- Results update as you type (debounced)
- Dual execution: local DuckDB parse first → immediate preview → cloud results in background
- Caching indicator in cell header
- Toggle per cell (Ctrl+Shift+.)
- Works with: WHERE filters, multi-statement cells, window functions

**AI features:**
- **FixIt:** Analyzes query errors, suggests inline fix automatically on every error, or via "Suggest fix" button
- **Edit (Ctrl+Shift+E):** Describe change in natural language → SQL rewrite with diff preview; iterative refinement; "Apply edit" button

**Results exploration:**
- Interactive data grid: sort, filter, pivot
- **Column Explorer (Ctrl+I):** Per-column stats — value frequencies, NULL%, histograms for numbers, time-series for timestamps
- **Cell Content Pane:** Full cell content with JSON expansion (node collapse, copy keypath)
- Expand to full-screen

**Developer UX:**
- Autocomplete: SQL syntax, table names, column names, functions
- Inline docs on hover: function description + parameter types + return type + docs link
- Format SQL: Ctrl+Alt+O
- Running Queries page: status, start time, elapsed, cancel button
- Command menu: Ctrl+K

**Strengths:**
- Instant SQL is a genuinely transformative interaction model
- Column Explorer bridges the gap between query results and data profiling
- FixIt error workflow is the smoothest AI-error experience in the market
- Inline function docs on hover is excellent for discovery

**Weaknesses:**
- DuckDB-only (not SQLite or Postgres)
- No graphical EXPLAIN visualization
- Cloud-hosted (privacy concerns for sensitive data)

---

### Beekeeper Studio

**Overview:** Open-source SQL client for MySQL, Postgres, SQLite, SQL Server, and more.

**AI Shell (open source):**
- Self-guided: autonomously explores schema, columns, relations
- Can write and execute SQL with explicit user permission
- Bring your own model: Claude, OpenAI, Gemini, OpenAI API-compatible
- No usage fees (direct to provider)
- Source code + prompts open on GitHub (`beekeeper-studio/bks-ai-shell/`)
- Asks permission before executing any SQL
- Transparent: user can see what AI is doing at each step

**Strengths:**
- Most transparent AI agent in any SQL tool
- BYOM (bring your own model) with no fees
- Open source AI shell — can be studied and adapted

**Weaknesses:**
- No graphical EXPLAIN visualization
- AI Shell is an add-on, not deeply integrated with query editor

---

### DB Browser for SQLite (DB4S)

**Overview:** Qt-based, cross-platform, open-source SQLite GUI (`github.com/sqlitebrowser/sqlitebrowser`).

**Features:**
- Spreadsheet-like interface for table browsing
- Create/modify tables, indexes, browse/edit records
- SQL Editor tab with basic syntax highlighting
- SQL log panel showing all executed SQL
- Simple chart from query data
- CSV/SQL import and export

**EXPLAIN:**
- `EXPLAIN QUERY PLAN` runs as raw SQL and shows text tree in results table
- **No dedicated EXPLAIN visualization panel**
- No AI features

**Strengths:**
- Most accessible SQLite GUI for non-developers
- Completely free and open source

**Weaknesses:**
- No EXPLAIN visualization
- No AI features
- Raw EQP text is confusing for beginners

---

### Chat2DB

**Overview:** AI-native database tool, Apache 2.0 license, 1M+ users. Supports 16+ databases.

**Features:**
- Intelligent SQL Generation — AI-driven from natural language
- One-click SQL Error Fix
- Context-Aware AI Chatbot (10+ LLM providers)
- Text-to-SQL in SQL Console
- Intelligent Dashboard — auto-generate charts from AI queries
- Chain reasoning for complex analysis
- Customize business terms in column comments for better AI understanding
- SQL Audit for admins
- Data encryption (AES + RSA)

**Strengths:**
- Most complete AI feature set of any single tool
- Auto-generates charts from AI query results
- Chain reasoning enables complex multi-step analysis

**Weaknesses:**
- No EXPLAIN visualization
- AI quality depends on provider and schema complexity
- Enterprise features behind paywall

---

### sqlime.org

**Overview:** Browser-based SQLite playground using sqlean.js (SQLite WASM with extensions).

**Features:**
- Simple 2-panel layout: editor + result
- Share query via URL (link copy)
- Status bar shows query wall-clock time
- No EXPLAIN visualization — `EXPLAIN QUERY PLAN` returns raw text in results
- No AI features

**Strengths:**
- Zero friction — open URL and start typing
- sqlean.js provides useful SQLite extensions (math, stats, regexp, etc.)
- Shareable URLs

**Weaknesses:**
- No EXPLAIN visualization
- No AI
- Minimal UX polish

---

### DB Fiddle / dbfiddle.uk

**Overview:** Online multi-database fiddle (PostgreSQL, MySQL, SQLite, MariaDB, etc.)

**Features:**
- Left pane: schema SQL; Right pane: query SQL; Bottom: results
- Share via URL
- Can run `EXPLAIN` and see raw text output
- Supports multiple DB engines

**Strengths:**
- Multi-engine comparison in same URL
- Zero-setup

**Weaknesses:**
- No graphical EXPLAIN
- No AI features
- Minimal UX

---

### LeetCode / HackerRank SQL Environments

**Overview:** Challenge-focused SQL editors for competitive programming and technical interviews.

**Features:**
- Submit SQL → compare against expected output
- Execution time shown (ms) for competitive analysis
- "Expected vs Actual" diff view for wrong answers
- No EXPLAIN visualization (would defeat the purpose)
- No AI assistance in standard mode (paid hints in some tiers)

**Notable UX Patterns:**
- Execution time as a competitive metric (optimize to beat other solutions)
- Test case framework with hidden test cases
- Expected vs actual output diff is a useful debugging pattern

---

## SQLite-Specific Behavior

### What SQLite EXPLAIN QUERY PLAN Provides (and Doesn't)

Source: `sqlite.org/eqp.html` (authoritative)

**What EQP provides:**
- High-level tree of query execution strategy
- Index usage (`SEARCH` vs `SCAN`)
- Covering index optimization annotations
- WHERE clause index coverage

**What EQP does NOT provide:**
| Missing Feature | PostgreSQL Equivalent |
|---|---|
| Cost estimates | `cost=0.00..445.00` |
| Actual row counts | `actual rows=10000` |
| Execution timing | `actual time=0.010..5.402 ms` |
| Memory usage | Sort space used, hash buckets |
| I/O statistics | Buffer hit/read/dirtied counts |
| JIT compilation info | JIT section in PG plan |
| Parallel execution | Workers Planned/Launched |
| Buffer statistics | Shared/Local/Temp blocks |

**Raw EQP output format:**
```
QUERY PLAN
|--SCAN t1
`--SEARCH t2 USING INDEX i1 (a=?)

`--SEARCH t1 USING COVERING INDEX i2 (a=? AND b>?)

`--USE TEMP B-TREE FOR ORDER BY

`--MULTI-INDEX OR
   |--SEARCH t1 USING COVERING INDEX i2 (a=?)
   `--SEARCH t1 USING INDEX i3 (b=?)

|--CO-ROUTINE qqq
|  `--SCAN t1 USING COVERING INDEX i2
|--SCAN qqq
`--USE TEMP B-TREE FOR GROUP BY
```

**Raw output columns (when queried directly):**
- `id` — node identifier
- `parent` — parent node id (tree structure)
- `unused_int` — not meaningful
- `detail_string` — the human-readable description

**Important caveat:** Output format is explicitly documented as **not stable for programmatic parsing**. Changed significantly in v3.24.0 (2018) and v3.36.0 (2021).

### How Current Browser Tools Handle SQLite EQP Limitations

| Tool | Approach | Quality |
|---|---|---|
| sqlime.org | Runs `EXPLAIN QUERY PLAN` as raw SQL text in results tab | Raw text, no rendering |
| DB Browser for SQLite | Same as sqlime — text in results table | Raw text, no rendering |
| SQLiteStudio | Same | Raw text, no rendering |
| SQL Fiddle / dbfiddle | Same | Raw text, no rendering |
| Observable/Jupyter | Kernel-dependent; typically raw text | Raw text, no rendering |
| dataslope | (Not yet implemented) | Gap |

**No current browser-based SQLite tool renders EQP visually.** This is a clear opportunity.

### Compensation Strategies Available

1. **Wall-clock timing at JS level** — `performance.now()` wrapping each statement; shown in status bar (all tools do this)
2. **Rows returned count** — from `rowsAffected` or result set length
3. **Parse EQP text into tree** — the `(id, parent, detail_string)` columns enable programmatic tree reconstruction
4. **Annotate nodes with semantic meaning** — detect "SCAN" (bad) vs "SEARCH" (good), "COVERING INDEX" (best) and add color coding
5. **Show index suggestions** — detect full table SCANs and suggest relevant CREATE INDEX statements
6. **Simulate cost proxy** — use actual wall-clock time as a performance proxy per-statement
7. **Natural language explanation** — use LLM to explain each EQP node in plain English

---

## PostgreSQL-Specific Behavior

### EXPLAIN Syntax and All Options

```sql
-- Basic plan (estimates only)
EXPLAIN SELECT * FROM orders WHERE user_id = 42;

-- Full analysis (actually runs the query)
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) 
  SELECT * FROM orders WHERE user_id = 42;
```

**All options:**
| Option | Effect |
|---|---|
| `ANALYZE` | Actually executes; adds actual row counts and timing |
| `BUFFERS` | Adds shared/local/temp block hit/read/dirtied/written |
| `VERBOSE` | Output column list, schema-qualified names, table aliases |
| `FORMAT JSON/XML/YAML` | Machine-readable output (JSON recommended for tools) |
| `COSTS` | Include/exclude cost estimates (default on) |
| `SETTINGS` | Show non-default planner settings |
| `GENERIC_PLAN` | Show generic plan for parameterized query |
| `SERIALIZE` | Include data serialization time |

### Key Node Types

**Scan types:**
| Node | Description | Performance Signal |
|---|---|---|
| `Seq Scan` | Full table scan | 🔴 Slow for large tables |
| `Index Scan` | Index-ordered heap fetch | 🟡 Good |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | Two-step: bitmap then heap | 🟡 Good for medium selectivity |
| `Index Only Scan` | Covering index, no heap access | 🟢 Best |

**Join types:**
| Node | Description |
|---|---|
| `Nested Loop` | Outer row × one inner scan — good for small inner relations |
| `Hash Join` | Build hash table from inner, probe with outer — good for large unsorted sets |
| `Merge Join` | Requires both inputs sorted — good when inputs already sorted |

**Other important nodes:**
- `Sort`, `Incremental Sort` (uses pre-sorted prefix)
- `Hash`, `Aggregate`, `GroupAggregate`, `HashAggregate`
- `Materialize`, `Memoize`
- `Gather`, `Gather Merge` (parallel query coordination)

### What Tools Surface Well vs Poorly

| Feature | pev2 | pgAdmin | depesz | DBeaver | DataGrip |
|---|---|---|---|---|---|
| Execution time | ✓✓ | ✓✓ | ✓ | ✓ | ✓ |
| Planning time | ✓✓ | ✓ | ✗ | △ | △ |
| Exclusive time per node | ✓✓ | ✓✓ | ✓✓ | ✓ | ✓ |
| Row estimation factor | ✓✓ | ✓ | ✓ | ✓ | ✓ |
| Buffer stats (BUFFERS) | ✓✓ | △ | ✗ | △ | △ |
| JIT stats | ✓✓ | ✓ | ✗ | ✗ | ✗ |
| Parallel workers visual | ✓✓ | △ | ✗ | △ | △ |
| WAL metrics | ✓✓ | ✗ | ✗ | ✗ | ✗ |
| Never-executed nodes | ✓✓ | ✗ | ✗ | ✗ | △ |
| CTE navigation | ✓✓ | ✗ | ✗ | ✗ | △ |
| Beginner explanation | ✗ | △ | △ | △ (AI) | ✗ |

**Takeaway:** pev2 is the clear winner for completeness. All tools overwhelm users with parallel execution, JIT stats, and WAL metrics unless they know what to look for. Educational annotations are nearly absent.

### The Most Important PostgreSQL EXPLAIN Diagnostic

The **row estimation error** is the single most important diagnostic signal:

```
Seq Scan on orders (cost=0.00..1240.00 rows=10000 width=88)
                   (actual time=0.012..8.543 rows=847234 loops=1)
                           ↑ estimated 10,000 rows
                                                 ↑ actually 847,234 rows
                    → 84.7× under-estimation → planner chose a bad plan
```

When actual ≫ estimated → under-estimation → likely bad statistics → run `ANALYZE` on the table.
When actual ≪ estimated → over-estimation → likely stale statistics.

Formula: `estimate_factor = max(actual/planned, planned/actual)`; `direction = actual > planned ? "under" : "over"`

---

## Cross-Product UX Patterns

### Pattern 1: Color Heatmap on Exclusive Duration

**Used by:** pev2, pgAdmin, depesz  
**Mechanism:** Color-code each node's exclusive (self) time as a % of total execution time  
**Thresholds:** >10% yellow, >40-50% orange, >90% red  
**Why it works:** Instantly surfaces the single worst offender without requiring number comprehension

```
[Node: Hash Join]      ████████████████████ 87%  ← RED
[Node: Seq Scan]       ██████████           43%  ← ORANGE
[Node: Index Scan]     ███                  12%  ← YELLOW
[Node: Aggregate]      █                     3%  ← no color
```

### Pattern 2: Exclusive vs Inclusive Time

**Used by:** pev2, pgAdmin, depesz  
**Mechanism:** Always compute `exclusive = total_time - sum(children_times)`  
**Why it works:** Inclusive time always looks large for parent nodes (it includes all children). Exclusive time isolates what the node actually contributes.

### Pattern 3: Planner Row Estimation Factor

**Used by:** pev2, pgAdmin  
**Mechanism:** Show `max(actual/planned, planned/actual)` with direction arrow  
**Why it works:** Row estimation errors cascade and are the #1 cause of bad query plans. A "84.7× under-estimated" badge is instantly actionable.

### Pattern 4: Progress Bar Per Node with Metric Switcher

**Used by:** pev2  
**Mechanism:** Each node card has a horizontal progress bar (% of max across all nodes). Global toggle: Duration / Cost / Rows updates all bars simultaneously.  
**Why it works:** Spatial comparison without reading numbers; gestalt perception of bottlenecks; switcher lets different users inspect different dimensions

### Pattern 5: Collapsed Node Cards with Progressive Disclosure

**Used by:** pev2, DBeaver, pgAdmin  
**Mechanism:** Default: compact card showing node name, relation, one key metric. Click → expand to full property list  
**Why it works:** Beginners see a clean plan; experts can drill into any node without context switching

### Pattern 6: Top-Level Stats Bar

**Used by:** pev2 (`PlanStats`), pgAdmin  
**Mechanism:** Persistent bar above plan: Execution Time | Planning Time | JIT | Triggers | Settings | I/O. Dropdowns reveal detail.  
**Why it works:** Summary at-a-glance; Planning time and JIT are frequently overlooked

### Pattern 7: Workers as Visual Stack

**Used by:** pev2  
**Mechanism:** Parallel nodes rendered with N offset card layers behind (1 per planned worker). Dashed border for planned-but-not-launched workers.  
**Why it works:** Communicates parallelism depth visually without reading numbers

### Pattern 8: Never-Executed Node Badge

**Used by:** pev2  
**Mechanism:** Nodes with `ACTUAL_LOOPS = 0` styled distinctly + "Never executed" badge  
**Why it works:** Prevents confusion — these nodes are in the plan but didn't run (e.g., unreachable branches in conditional plans)

### Pattern 9: CTE/Subplan Cross-Reference Links

**Used by:** pev2  
**Mechanism:** CTE Scan nodes show a clickable link to jump to the CTE definition node  
**Why it works:** PostgreSQL plans split CTEs into separate sections; navigating between them without pev2 requires reading `Subplan Name` strings and searching manually

### Pattern 10: Instant SQL / Live Preview

**Used by:** MotherDuck  
**Mechanism:** Results update as you type (debounced); dual-execute: local DuckDB first → cloud in background; caching indicator  
**Why it works:** Dramatically reduces the edit→run→see iteration loop; makes filtering and exploration feel direct/immediate

### Pattern 11: AI Inline Error Fix

**Used by:** MotherDuck (FixIt), DBeaver (Fix SQL errors), Supabase (AI debug), pgAdmin (AI Insights)  
**Mechanism:** Error occurs → AI automatically or with one click suggests a fix inline → click to accept → auto re-run  
**Why it works:** Removes the friction of fixing common SQL mistakes; keeps the user in the editor context

### Pattern 12: Schema-Aware AI (No Data Leakage)

**Used by:** Supabase, DBeaver, Chat2DB, MotherDuck, pgAdmin  
**Mechanism:** AI receives schema structure only (table names, column names, types, indexes, constraints). No actual data rows sent to LLM. Stated explicitly as a privacy/security guarantee.  
**Why it works:** Enterprises and privacy-conscious users can use AI assistance without leaking production data

### Pattern 13: Column Explorer / Profiler

**Used by:** MotherDuck (Column Explorer, Ctrl+I)  
**Mechanism:** Toggle panel showing per-column statistics: value frequencies, NULL%, histograms for numbers, time-series for timestamps  
**Why it works:** Contextualizes query results; reveals data skew that explains why queries perform poorly; bridges query results and data profiling

### Pattern 14: Warning Icons on Anti-Patterns

**Used by:** PlanetScale Insights  
**Mechanism:** Warning icons with tooltips on query rows: 🔷 scatter-gather, ⚠️ full table scan  
**Why it works:** Non-expert users immediately know which queries need attention without understanding execution plans

### Pattern 15: Educational Links per Node Type

**Used by:** depesz.com  
**Mechanism:** Each node type name links to a plain-English blog post explaining what it is and when it's a problem  
**Why it works:** Turns expert-only technical output into a learning resource

---

## Opportunities for a Modern Playground

### Minimal MVP Features

These features have the highest value-to-effort ratio and should be implemented first:

| # | Feature | Description | Effort |
|---|---|---|---|
| 1 | **EQP Tree Renderer (SQLite)** | Parse `EXPLAIN QUERY PLAN` `(id, parent, detail)` rows into a visual tree. Color SCAN nodes red, SEARCH nodes green, COVERING INDEX nodes blue. | Medium |
| 2 | **PG EXPLAIN Text Parser** | Parse PostgreSQL text EXPLAIN output into a tree structure. Show node type, cost, rows, width. | Medium |
| 3 | **Exclusive Time Heatmap** | Compute and highlight exclusive duration per node. Use >10%/40%/90% color thresholds. | Low (given parser) |
| 4 | **Row Estimation Factor Badge** | For EXPLAIN ANALYZE, show `Nx over/under` on each node when estimation error > 5×. | Low (given parser) |
| 5 | **Run Time in Status Bar** | Show query wall-clock time below editor. Already partially implemented. | Trivial |
| 6 | **Rows Returned Count** | Show row count in status/results header. | Trivial |

### "Delight" Features

These polish the experience significantly but require more investment:

| # | Feature | Description |
|---|---|---|
| 7 | **Collapsible Node Cards** | Default: compact card. Click → expand to show full property list. Progressive disclosure. |
| 8 | **Top Stats Bar** | Pinned bar showing: Execution Time, Planning Time (PG only), scan type summary |
| 9 | **SCAN → INDEX Suggestion** | Detect full `SCAN` nodes on tables and auto-suggest `CREATE INDEX` statements |
| 10 | **Never-Executed Badge** | For PG EXPLAIN ANALYZE, mark nodes with 0 actual loops with a badge |
| 11 | **PEV2 Embedding** | Embed the pev2 npm package for Postgres EXPLAIN JSON visualization |
| 12 | **Column Profiler** | After running a query, Ctrl+I shows per-column value frequencies, NULL%, histogram |
| 13 | **Visual Progress Bars** | Per-node horizontal bars (% of max duration/cost across plan) |

### AI Opportunities

| # | Feature | Description | Pattern From |
|---|---|---|---|
| 14 | **Inline Error Fix** | On SQL parse/execution error, offer AI-suggested fix with one click | MotherDuck FixIt |
| 15 | **Plan Explanation (Beginner)** | Button: "Explain this query plan in plain English" → AI generates beginner-friendly narrative | pgAdmin AI Insights |
| 16 | **AI Optimization Suggestions** | After running EXPLAIN, AI suggests: add index, rewrite subquery, run ANALYZE, etc. | pgAdmin AI Insights |
| 17 | **EQP Node Explanation** | Click any EQP node → AI explains what `SCAN t1` or `USE TEMP B-TREE FOR ORDER BY` means | New |
| 18 | **AI Anti-Pattern Detection** | Detect N+1 patterns, SELECT *, unnecessary DISTINCT, missing indexes from query text | New |
| 19 | **Schema-Aware BYOK** | AI features that are BYOK (user supplies API key) with schema-only context, no data leakage | Supabase, Beekeeper |

### Beginner-Focused UX Ideas

| # | Idea | Description |
|---|---|---|
| 20 | **Color Semantic Guide** | Persistent legend: 🔴 SCAN (no index), 🟢 SEARCH (index used), 🔵 COVERING INDEX (most efficient) |
| 21 | **Anti-Pattern Tooltips** | Hover on SCAN node → tooltip: "This is a full table scan. All rows are read. Consider adding an index on the filtered column." |
| 22 | **Plain-English Node Labels** | Show human labels alongside technical ones: "Seq Scan" → "Full Table Scan (slow on large tables)" |
| 23 | **"Why is this slow?" Button** | One-click workflow: run `EXPLAIN ANALYZE`, detect worst node, show beginner-friendly explanation with fix suggestion |
| 24 | **Index Impact Preview** | After AI suggests a CREATE INDEX, show: "Estimated speedup: 10–100×" based on EQP changes |
| 25 | **Query Plan Diff** | Before/after comparison when adding an index or rewriting a query |

### Power-User UX Ideas

| # | Idea | Description |
|---|---|---|
| 26 | **PEV2 Full Integration** | Embed full pev2 for Postgres EXPLAIN JSON (all metrics, three view modes, buffer stats, JIT) |
| 27 | **EXPLAIN ANALYZE One-Click** | Single button that runs `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)` and passes to pev2 |
| 28 | **Query Plan History** | Save explain output alongside query history; compare plans across runs |
| 29 | **Node Type Docs Links** | Click any node type → opens PostgreSQL docs or authoritative explanation (like depesz.com approach) |
| 30 | **Highlight Mode Toggle** | Switch all progress bars between Duration / Cost / Rows mode simultaneously |
| 31 | **Export as JSON** | Export the explain plan as JSON for sharing or offline analysis |

### Differences Between SQLite and Postgres Implementations

| Aspect | SQLite | PostgreSQL |
|---|---|---|
| **Data source** | `EXPLAIN QUERY PLAN` output (text tree or `id/parent/detail` rows) | `EXPLAIN (FORMAT JSON)` output |
| **Available metrics** | Node type, index name, scan/search indicator only | Full: cost, actual rows, timing, buffers, workers, JIT, WAL |
| **Timing** | Wall-clock only (JavaScript `performance.now()`) | Actual per-node timing from `EXPLAIN ANALYZE` |
| **Cost estimates** | Not available | Always available |
| **Color heatmap basis** | Semantic type (SCAN=bad, SEARCH=good) | Exclusive duration % and row estimation error |
| **AI suggestions** | Must detect patterns from query text + EQP node types | Can analyze actual cost/rows discrepancies |
| **Row estimation error** | Not available | Core diagnostic signal |
| **Recommended AI input** | EQP node text + query text | EXPLAIN ANALYZE JSON + query text |
| **Beginner label** | "SCAN: reads all rows (slow)" / "SEARCH: uses index (fast)" | "Seq Scan: full table scan" + cost/rows context |

---

## Top 10 Ideas Worth Copying

### 1. 🥇 pev2 Progress Bars with Global Metric Switcher
**Source:** pev2 (`dalibo/pev2`)  
**What:** Each plan node has a horizontal progress bar (% of maximum metric across all nodes). Global toggle switches all bars between Duration / Cost / Rows simultaneously.  
**Why copy it:** Pure visual comparison of bottlenecks without reading any numbers. The global switcher lets users ask "where does time go?" vs "where is cost concentrated?" vs "where are the most rows processed?"

### 2. 🥈 Exclusive Time Heatmap (>10%/40%/90% thresholds)
**Source:** pev2, pgAdmin, depesz.com (all independently converged on this)  
**What:** Color each node by exclusive duration (self time minus children) as % of total. >10% = yellow, >40% = orange, >90% = red.  
**Why copy it:** Instantly identifies the real bottleneck. Inclusive time is misleading for parent nodes. This pattern is so universally validated it should be considered a standard.

### 3. 🥉 Planner Row Estimation Factor + Direction
**Source:** pev2, pgAdmin  
**What:** Show `max(actual/planned, planned/actual)` with "over-estimated by 84×" or "under-estimated by 12×" text. Color by severity.  
**Why copy it:** Row estimation errors are the #1 cause of bad query plans. Beginners never know to look for this; surfacing it automatically makes the tool educational.

### 4. MotherDuck FixIt — AI Inline Error Fix
**Source:** MotherDuck  
**What:** When a SQL error occurs, AI automatically (or with one click) suggests the fix inline. Click to accept → auto re-run.  
**Why copy it:** Completely eliminates the context-switch of copying an error, opening a new tab, searching Stack Overflow. Instant. The smoothest error-fix UX in any SQL tool.

### 5. PlanStats Bar — Execution + Planning Time Always Visible
**Source:** pev2 (`PlanStats.vue`), pgAdmin  
**What:** A persistent bar above the plan tree showing: Execution Time | Planning Time | JIT | Triggers | Settings. Clickable dropdowns for detail.  
**Why copy it:** Planning time is frequently ignored but can dominate execution time for complex queries. Surfacing it at the top level — not buried in JSON — makes a real difference.

### 6. Never-Executed Node Badge
**Source:** pev2  
**What:** Nodes with `actual loops = 0` get a distinct visual style + "Never executed" badge.  
**Why copy it:** Without this, users wonder why some nodes have no timing data. The badge prevents confusion and teaches users that query plans contain conditional branches.

### 7. depesz.com Educational Node Links
**Source:** depesz.com  
**What:** Each node type name is a link to a plain-English blog post explaining what the node does and when it's a problem.  
**Why copy it:** Turns expert-only technical output into a self-service learning resource. Zero additional engineering for enormous beginner value if linked to standard docs.

### 8. PlanetScale Warning Icons on Anti-Patterns
**Source:** PlanetScale Insights  
**What:** Warning icons directly on query rows: ⚠️ full table scan, 🔷 scatter-gather. Tooltip explains in plain English.  
**Why copy it:** Non-expert users can immediately see which queries need attention without any understanding of execution plans. Works perfectly for a playground where beginners are running learning exercises.

### 9. MotherDuck Column Explorer / Profiler
**Source:** MotherDuck  
**What:** After running a query, Ctrl+I reveals per-column statistics: value frequencies, NULL%, histograms, time-series.  
**Why copy it:** Contextualizes query results, reveals data skew that explains performance characteristics, and bridges the gap between "query results" and "data understanding." Especially valuable for a learning playground.

### 10. Beekeeper Studio Transparent AI Agent
**Source:** Beekeeper Studio AI Shell  
**What:** AI agent that shows what it's doing, asks permission before executing SQL, with open-source prompts on GitHub. BYOM (bring your own model).  
**Why copy it:** Transparency is the right default for an AI that can modify data. Users learn from watching the agent reason, which aligns with the educational mission of a playground. BYOM avoids hosting costs.

---

## Appendix: Source Citations

| Tool | Source | Status (as of 2026-05-12) |
|---|---|---|
| pev2 source (enums) | `github.com/dalibo/pev2:src/enums.ts` | Verified from source |
| pev2 source (node.ts) | `github.com/dalibo/pev2:src/node.ts` | Verified from source |
| pev2 source (PlanNode.vue) | `github.com/dalibo/pev2:src/components/PlanNode.vue` | Verified from source |
| pev2 source (PlanStats.vue) | `github.com/dalibo/pev2:src/components/PlanStats.vue` | Verified from source |
| explain.dalibo.com | `explain.dalibo.com` | Live |
| depesz.com | `depesz.com/s/explain` | Live |
| pgAdmin 4 docs | `pgadmin.org/docs/pgadmin4/latest/query_tool.html` | Verified live |
| DBeaver SQL Editor | `dbeaver.com/docs/dbeaver/SQL-Editor/` | Verified live |
| DBeaver Execution Plan | `dbeaver.com/docs/dbeaver/Query-Execution-Plan/` | Verified live |
| DBeaver AI Assistance | `dbeaver.com/docs/dbeaver/AI-Smart-Assistance/` | Verified live |
| Neon SQL Editor | `neon.tech/docs/get-started-with-neon/query-with-neon-sql-editor` | Verified live |
| PlanetScale Insights | `planetscale.com/docs/concepts/query-insights` | Verified live |
| Supabase AI v2 | `supabase.com/blog/supabase-ai-assistant-v2` | Verified live |
| MotherDuck Quick Tour | `motherduck.com/docs/getting-started/motherduck-quick-tour/` | Verified live |
| DuckDB UI Extension | `duckdb.org/docs/current/core_extensions/ui.html` | Verified live |
| SQLite EQP docs | `sqlite.org/eqp.html` | Verified live (authoritative) |
| PostgreSQL EXPLAIN docs | `postgresql.org/docs/current/using-explain.html` | Verified live (authoritative) |
| DB Browser for SQLite | `github.com/sqlitebrowser/sqlitebrowser` | Verified live |
| Beekeeper Studio AI | `beekeeperstudio.io/features/sql-ai` | Verified live |
| Chat2DB | `github.com/Chat2DB/Chat2DB` + `chat2db.ai` | Verified live |
| MotherDuck DuckDB UI | `duckdb.org/docs/current/core_extensions/ui.html` | Verified live |
| sqlime.org | HTML source | Verified live |
| TablePlus | `tableplus.com` | Verified live |
| Redash | `redash.io/product/` | Verified live |
| Hex Magic AI | `hex.tech/product/magic-ai` | Verified live |
| SQLTools for VSCode | `github.com/sqltools/vscode-sqltools` | Verified live |
| Turso/libSQL | `turso.tech/libsql` | Verified live |
| Azure Data Studio | `azure.microsoft.com/en-us/products/data-studio` | **⚠ RETIRED February 28, 2026** |
| DataGrip | `jetbrains.com/datagrip` | Features based on known product; direct docs blocked |
| Postico | `postico.app` | Product discontinued/rebranded; domain for sale |
