# Coding Exercise Block Research Report

*Generated: 2026-05-21*

## Overview

This report compares the technical architecture, testing methodology, UI/UX patterns, SQL-specific behaviour, and business models of 10+ online coding exercise platforms. Research was drawn from official documentation pages, GitHub repositories, open-source tools, and platform wikis.

---

## 1. LeetCode (leetcode.com)

### Testing Methodology
LeetCode's execution infrastructure is **proprietary and not publicly documented**, but through community knowledge and observable behaviour:

- **Python/general code**: User code is injected into a function stub template. The submission is wrapped with hidden test harnesses that call the user's function with various inputs. The system compares the return value of the user's function against expected output. Tests run server-side on isolated machines.
- **SQL problems**: User SQL is executed against an actual database (primarily **MySQL 8.x** for most problems, with some PostgreSQL problems). The result set is compared against the expected result, typically **order-independent** unless the problem description explicitly states an `ORDER BY` is required. The comparison is result-set based, not AST-based.
- Hidden test cases exist; users only see a subset during "Run." The full suite runs only on "Submit."
- LeetCode uses a custom **online judge** system. Submissions run in sandboxed containers.

### UI/UX Patterns
- ✅ Separate **"Run Code"** (tests against visible sample cases) and **"Submit"** (full hidden test suite) buttons.
- Code editor uses **Monaco editor** (same as VS Code).
- Hints: Community-contributed editorial solutions visible after solving. **No built-in hint button**; premium users get official solutions.
- **AI debugging assistance**: LeetCode launched an AI chatbot ("LEET AI") for premium subscribers to ask questions about problems (2023+).
- **No multi-file editing** for most problems; single editor window.
- Supports code formatting for some languages.

### SQL-Specific Details
- Tables/schema presented as a static text description in the problem statement, along with sample data shown in a table format.
- **No ERD view**; schemas shown in bullet/column format or as images.
- SQL dialect: Primarily **MySQL** (most problems), with some designated PostgreSQL problems.
- Data is pre-loaded into a shared database snapshot per problem. Datasets are small (typically < 1,000 rows) for teaching purposes. No 100k+ row exercises found.
- Data is **server-side**, loaded from pre-built database snapshots.

### Business Model
- Free: Access to ~1,800 of ~2,700+ problems, basic features.
- **LeetCode Premium** (~$35/month or ~$159/year): Unlocks all problems, company-filtered problem sets, official editorial solutions, AI chatbot (LEET AI), mock interviews, premium stats.

**Sources**: https://leetcode.com/explore/

---

## 2. HackerRank (hackerrank.com)

### Testing Methodology
HackerRank's infrastructure is **very well documented** at https://www.hackerrank.com/environment:

- **General code**: Code is compiled/interpreted and run against test case inputs piped via **stdin**. Expected output is compared to **stdout** output. This is a classic competitive-programming-style IO checker.
- **SQL challenges**: SQL is executed against a live database. The result set is compared to a reference answer result set. Comparison is **order-independent by default** for most SQL problems.
- Code runs on **Ubuntu LTS** instances in isolated containers.
- Max submission size: **50 KB**.
- SQL time limit: **60 seconds** for MySQL, PostgreSQL, Oracle, Microsoft SQL, DB2.
- Supports: MySQL 8.0.33, PostgreSQL 14.3, Microsoft SQL Server 2022, Oracle 11g Express (PL/SQL supported), DB2 v10.5.
- Python 3 supported with extensive library support including numpy, pandas, scipy, scikit-learn, pyspark, matplotlib.

### UI/UX Patterns
- ✅ Separate **"Run Code"** (with custom test inputs) and **"Submit Code"** buttons.
- Users can define **custom test cases** for the Run step.
- Code editor with syntax highlighting.
- Hints: Paid features include editorial solutions. Some challenges have discussion boards.
- **AI Tutor** ("SkillUp" product) available for hint/learning assistance.
- **Multi-file project questions**: Supported (listed as a Starter plan feature).

### SQL-Specific Details
- Schema presented as an **image** of the table structure (e.g., column name + type as a diagram).
- Sample data rows shown in the problem statement as text.
- **No ERD view** in the public practice platform.
- SQL dialects: MySQL, PostgreSQL, Microsoft SQL, Oracle, DB2 (user selects dialect per problem).
- Datasets are small to medium (designed for interview-prep, not big data).
- Data is **pre-loaded server-side** in the database for each problem.

### Business Model
- **Community (developers)**: Free. Practice challenges, certifications (free), AI mock interviewer.
- **Hire (employers)**: Subscription-based.
  - Starter: $1,990/yr (120 attempts, 1 user)
  - Pro: $4,490/yr (300 attempts, unlimited users, AI proctoring, integrations)
  - Enterprise: Custom pricing

**Sources**: https://www.hackerrank.com/environment, https://www.hackerrank.com/pricing, https://www.hackerrank.com/domains/sql

---

## 3. Codecademy (codecademy.com)

### Testing Methodology
Codecademy is a **step-by-step, lesson-based** platform rather than a competitive/assessment platform:

- Exercises are structured with **guided fill-in-the-blank** or **write-from-scratch** tasks.
- Code is run in-browser via **server-side sandboxed execution** environments. The result of running user code is checked against expected outcomes.
- For SQL: User SQL is executed against an embedded database. The result table is shown, but checking appears to be pattern-based (e.g., "does the output table have the right columns/rows").
- Codecademy uses its own proprietary checking infrastructure; no open-source SCT library publicly documented.
- The platform features an **AI learning assistant** (powered by OpenAI) that explains errors inline.

### UI/UX Patterns
- ✅ Has a **"Run" button** to execute code.
- Has a **"Check Work"** (equivalent to Submit) button that validates correctness.
- **AI error explanation**: Animated GIF on their course page shows AI providing inline error explanations in the editor — a first-class feature.
- **AI-generated hints** visible in the instructions panel.
- Code editor is embedded in a split-pane layout: instructions left, editor right.
- **No multi-file editing** in the standard lesson editor.

### SQL-Specific Details
- Tables shown as visual table renders within the lesson instructions.
- Uses **SQLite** for most SQL exercises (embedded, in-browser compatible).
- Projects like "Analyze Hacker News Trends" and "New York Restaurants" use real-world-themed datasets.
- Datasets are small and educational (not 100k+ rows).
- Data is embedded server-side per exercise context.
- No ERD viewer in the learn interface.

### Business Model
- **Free tier**: Access to some beginner courses (e.g., Learn Python 3, basic SQL).
- **Plus plan**: All courses and skill paths. ~$17.49/mo annually.
- **Pro plan**: Everything including career paths, interview prep, professional certifications, AI job-readiness checker. ~$34.99/mo or ~$17.49/mo annually.

**Sources**: https://www.codecademy.com/learn/learn-sql, https://www.codecademy.com/pro/membership

---

## 4. DataCamp (datacamp.com)

### Testing Methodology — *Most Technically Detailed / Best Documented*

DataCamp has the **best-documented open-source testing infrastructure** of any platform, via its SCT (Submission Correctness Test) libraries:

**Architecture**:
- DataCamp Light (`datacamp/datacamp-light` GitHub, 1.4k⭐) enables embedding exercises in any blog/website.
- Exercises follow a strict template: `pre-exercise-code` → `sample-code` → `solution` → `sct` → `hint`.
- SCT code runs alongside user code on DataCamp servers.
- Sessions are **stateful server-side sessions** (R or Python kernel maintained per user on DataCamp servers).

**Python SCT (`pythonwhat`)** — `datacamp/pythonwhat`:
```python
from pythonwhat.test_exercise import setup_state
setup_state(stu_code = "x = 5", sol_code = "x = 4")
Ex().check_object('x').has_equal_value()
# TestFail: Did you correctly define `x`? Expected `4`, but got `5`.
```
- Compares student and solution variable values, function calls, output, imports.

**SQL SCT (`sqlwhat`)** — `datacamp/sqlwhat`:
- Uses **sqlalchemy** to run both student and solution SQL queries.
- Compares result sets (column-by-column) and/or AST structure.
- Can check for specific SQL clauses (WHERE, ORDER BY, JOIN) using AST comparison.
- `has_equal_value(ordered=True/False)` controls whether column order matters.
- Example checks:
```python
# Check result set column value
Ex().check_correct(
    check_column('title').has_equal_value(),
    check_node('SelectStmt').multi(
        check_edge('target_list', 0).has_equal_ast(),
        check_edge('from_clause').has_equal_ast()
    )
)
# ORDER BY check (ordered=True)
check_column('name').has_equal_value(ordered=True)
```
- SQL parsers: `antlr-tsql`, `antlr-psql` (DataCamp repos)

### UI/UX Patterns
- ✅ Separate **"Run Code"** and **"Submit Answer"** buttons.
- Hint system: Explicit `<hint>` block shown per exercise; shown when user clicks "Give Hint".
- **AI Tutor** integrated into exercises (2023+).
- Code editor with syntax highlighting.
- **No multi-file editing** in standard exercises; cloud-hosted notebooks for projects.
- DataCamp "Data Projects": Cloud-hosted Python notebooks for take-home-style project work.

### SQL-Specific Details
- SQL courses connect to an embedded database (SQLite or PostgreSQL backend).
- Schema shown in the exercise instructions as text.
- SQL courses cover PostgreSQL primarily.
- Data is **pre-loaded on DataCamp servers** via the `pre-exercise-code` block.
- No explicit 100k+ row exercise datasets found in public documentation.
- The `sqlwhat` library runs student SQL against the same pre-loaded database used by the solution.

### Business Model
- **Free**: Some introductory content, limited exercise access.
- **Individual plans** (approx. $25–$39/month annually): Full course library, unlimited exercises, certificates.
- **Teams/Enterprise**: Custom pricing.

**Sources**: `github.com/datacamp/datacamp-light` (README), `github.com/datacamp/pythonwhat` (README), `github.com/datacamp/sqlwhat` (README + GitHub page), https://sqlwhat.readthedocs.io/en/stable/glossary.html

---

## 5. SQLZoo (sqlzoo.net)

### Testing Methodology — *Best Documented of Any SQL-Only Platform*

SQLZoo's source is **completely transparent** — it's a MediaWiki installation with custom extensions. The technical architecture is documented at https://sqlzoo.net/wiki/SQLZOO:About:

**How exercises work**:
```html
<div class='qu'>
  <source lang='sql' class='def'>
    SELECT name, continent, population FROM world
  </source>
  <source lang='sql' class='ans'>
    SELECT name, continent, population FROM world
  </source>
</div>
```
- A `div.qu` contains a `source.def` (the starting/hint SQL shown to users) and a `source.ans` (the correct answer SQL, hidden from users but "not well hidden").
- When user submits, **both the user SQL and the answer SQL are executed** against the live database. The result sets are compared.
- By default: **order-independent** comparison (result rows can be in any order).
- To require ORDER BY: `<span class='params respectorder'></span>` inside the question div.
- Score is calculated based on how closely the user's result matches the answer result.

**Hints**: Revealed via a click-to-expand `<div class='hint' title='Click here to see the hint'>` pattern.

**Supported SQL engines**: MySQL, Oracle, SQL Server (MSSQL), PostgreSQL, MS Access. Users can often switch between engines for the same tutorial.

### Data / Schema
- Sample data is shown at the top of each tutorial page as a visible table preview (e.g., the world table with country rows).
- All datasets available for download as SQL scripts:
  - `http://sqlzoo.net/world.sql` — World table (MySQL format)
  - Similar for Nobel, Movies, EURO2012, General Election, Covid, Buses, Teachers
- These are **server-side databases** (the site runs MySQL on a server).
- Datasets are educational scale (hundreds to a few thousand rows), not 100k+.

### UI/UX Patterns
- Each question has an **embedded code editor** (SQL textarea).
- Single **"Run SQL"** button — no separate Submit; each attempt is evaluated immediately.
- Result table shown inline below the query.
- Hints in expandable format.
- No AI assistance.
- No multi-file editing (SQL only).

### Business Model
- **Completely free**. No paid tier.
- Ad-supported (Google Ads, plus banner deals with DataWars and Channel).
- Maintained by a single developer (Andrew Cumming) — a personal/academic project.

**Sources**: https://sqlzoo.net/wiki/SQLZOO:About, https://sqlzoo.net/wiki/SELECT_basics, https://sqlzoo.net/wiki/SELECT_from_WORLD_Tutorial

---

## 6. Mode Analytics SQL Tutorial (mode.com/sql-tutorial)

> ⚠️ **Platform Status**: Mode Analytics was **acquired by ThoughtSpot**. The URL `mode.com/sql-tutorial` now redirects to ThoughtSpot's product pages. The Mode SQL tutorial appears to have been **deprecated or migrated** and no longer functions as an interactive SQL learning platform.

**What Mode SQL Tutorial was** (based on archived knowledge):
- Mode provided an interactive SQL workbench where users could run SQL against Mode's public datasets in a browser-based editor.
- It was PostgreSQL-based.
- The tutorial exercises were structured as guided lessons with a live SQL editor connected to actual PostgreSQL datasets (including some larger datasets like flight data).
- Results were shown as tables; no automated pass/fail checking — it was exploratory/tutorial style, not test-based.
- Free to use.

**Source**: https://mode.com/sql-tutorial/ (now redirects to ThoughtSpot)

---

## 7. StrataScratch (stratascratch.com)

### Testing Methodology
StrataScratch is focused on **data science interview prep** with real company questions:

- SQL and Python exercises run in a **real execution environment** server-side.
- SQL: User writes SQL which is executed against the relevant database. Result set is compared against expected output. Supports 4 SQL dialects.
- Python: User writes Python (pandas, PySpark, Polars) code. Output is compared to expected result.
- **AI StrataTools**: "Run your code in real environment" — validates and optimizes Python and SQL.
- Mock interview mode: Timed execution, AI evaluation of code quality, correctness, and communication.

### UI/UX Patterns
- ✅ **"Run"** button to execute code.
- **AI Evaluator**: For conceptual interview questions, AI scores on completeness, accuracy, depth, structure.
- **AI StrataTools**: "Optimize Code" — fixes and optimizes SQL and Python code.
- **AI Mock Interviewer**: Simulates interview conditions with timed sessions.
- "Sample Dataset" tool: Generates sample dataset to test your code.
- Cloud-hosted Python notebooks for data project portfolio building.
- No multi-file editing indicated.

### SQL-Specific Details
- SQL dialects: **PostgreSQL, MySQL, MS SQL Server, Oracle** (all four available per exercise).
- Python libraries: **Pandas, PySpark, Polars, R** — library switching per exercise.
- Questions tagged with real companies (Google, Meta, Amazon, Airbnb, etc.).
- 1,000+ real coding challenges.
- Datasets reflect real-world interview data (typically medium-scale, not 100k+ rows for most exercises).
- Free structured learning paths for SQL and Python (36 lessons, 160+ questions per path).

### Business Model
- **Free**: Access to free questions, learning paths (SQL + Python with 160+ questions each).
- **Premium**: ~$9–15/month (approx.) — full problem library, AI mock interviews, full solution access.
- 750,000+ members worldwide.

**Sources**: https://stratascratch.com/

---

## 8. Execute Program (executeprogram.com)

### Testing Methodology
Execute Program is built around **spaced-repetition learning** for programming languages (TypeScript, JavaScript, SQL, Python, regular expressions):

- The platform's model is **interactive lessons** where users write code directly in the page and it executes live. The results are shown immediately.
- For SQL: Likely uses an in-browser **SQLite WebAssembly** execution (sql.js or similar) or server-side execution.
- The spaced-repetition system resurfaces previously-seen exercises after a delay (forgetting curve algorithm — similar to Anki).

### UI/UX Patterns
- No "Submit" button in the traditional sense — exercises **auto-evaluate** when code is entered.
- Results shown inline with the lesson content.
- Spaced repetition system automatically schedules review.
- No separate "Run" vs "Submit" distinction — it's a continuous learn/verify loop.

### SQL-Specific Details
- SQL course teaches SQL using interactive exercises.
- Likely small, embedded datasets for teaching concepts (no indication of large datasets).
- Specific SQL dialect not publicly documented (SQLite most probable for in-browser support).

### Business Model
- **Free trial**: Some content accessible.
- **Paid subscription**: Required for full access. Publicly reported as ~$19/month or ~$99/year.

**Sources**: https://executeprogram.com/, https://executeprogram.com/blog/feed.rss

---

## 9. Exercism (exercism.org)

### Testing Methodology — *Most Architecturally Transparent*

Exercism has the **most publicly documented and open-source execution architecture**:

**Test Runners**:
- Each language has its own **Test Runner** (`exercism/<track>-test-runner` repos on GitHub).
- Python: `exercism/python-test-runner` (actively maintained).
- Execution: Docker containers, 100% CPU, **3GB RAM, 20-second timeout** per solution.
- The test runner receives: exercise slug, path to solution, path to output dir.
- Writes a standardized **`results.json`**:

```json
{
  "version": 2,
  "status": "fail",
  "tests": [
    {
      "name": "Test that the thing works",
      "status": "fail",
      "message": "Expected 42 but got 123123",
      "output": "Debugging information output by the user",
      "test_code": "assert_equal 42, answerToTheUltimateQuestion()"
    }
  ]
}
```

- Tests **must** be returned in the order specified in the test file (since only the first failure is shown to students).
- Output is limited to **500 characters** per test.

**Exercise Structure** (tracked in `exercism/<language>` repos):
```
exercises/
└── practice/
    └── leap/
        ├── .docs/instructions.md
        ├── .meta/config.json
        ├── Leap.cs          (stub implementation)
        └── LeapTests.cs     (test suite)
```
- Tests are the **authoritative check** — student must make the tests pass.
- Python test runner runs `pytest` against the student's solution.

**Automated Feedback + Human Mentors**:
- **Analyzers** (`exercism/<track>-analyzer`): Static analysis providing immediate feedback on style/approach.
- **Human mentors**: Volunteer mentors give free code review.

### UI/UX Patterns
- **Online editor**: "Run Tests" button triggers Docker container execution server-side; results shown on right.
- **CLI**: `exercism download --exercise=... --track=...` + local test running + `exercism submit`.
- No separate "Run" vs "Submit" in the traditional sense — "Run Tests" IS the evaluation.
- **No AI debugging assistance** (core philosophy is human mentoring).
- Hints available in `.docs/hints.md` per exercise.
- **Multi-file editing**: Yes, via CLI (local); online editor shows primary files.
- Approaches section: Shows different valid solutions with explanations.

### SQL-Specific Details
- **No dedicated SQL track** on Exercism as of current research. Exercism focuses on general programming languages.

### Business Model
- **Completely free** for learners (all exercises, mentoring, online editor).
- Funded by donations and philanthropic foundations.

**Sources**: `github.com/exercism/python-test-runner` (README), https://exercism.org/docs/building/tooling/test-runners, https://exercism.org/docs/using/solving-exercises/using-the-online-editor

---

## 10. Codewars (codewars.com)

### Testing Methodology — *Well-Documented Open-Source Runner*

Codewars uses a code runner called **CodeRunner**, documented at `github.com/codewars/runner`:

**Architecture**:
```bash
# Create a container
C=$(docker container create --rm -w $WORKDIR language-image cmd args)
# Copy files (preprocess = file layout, code modifications for backward compat)
files | preprocess | docker container cp - $C:$WORKDIR
# Run (postprocess = transforms output, e.g. JSON)
docker container start --attach $C | postprocess
```
- Docker images available on DockerHub under `qualified` organization.
- `preprocess` handles: file layout, code concatenation, backwards compatibility.
- `postprocess` transforms test output (e.g., from JSON format to Codewars format).

**Two test sets per kata**:
1. **Sample tests** (visible): Users can modify and add to these. Run with "Test" button. State saved in browser localStorage.
2. **Submission tests** (hidden): Full test suite, only revealed after solving. "ATTEMPT" button runs these.

**Python testing** (`docs.codewars.com/languages/python/codewars-test`):
```python
import codewars_test as test

@test.describe('Fixed Tests')
def example_tests():
    @test.it('Example Test Case')
    def example_test_case():
        test.assert_equals(add(1, 1), 2, 'Optional Message on Failure')
```
- Custom `codewars_test` framework (available on GitHub: `codewars/python-test-framework`).
- Python versions: **3.8, 3.10, 3.11**.
- Timeout: **12 seconds**.
- Available services: SQLite, Redis, MongoDB.

**SQL testing** (`docs.codewars.com/languages/sql`):
- Versions: **SQLite3, Postgres 9.6, Postgres 13.0**.
- Test framework: **RSpec** (Ruby-based).
- Timeout: **14 seconds**.
- Kata authors write RSpec tests that set up schema/data, run user SQL, and compare results.

### UI/UX Patterns
- Separate **"Test"** (sample tests) and **"Attempt"** (hidden submission tests) buttons.
- Code editor with syntax highlighting.
- No built-in hint button — hints via kata description or discussion section.
- No AI debugging assistance (community-driven, discussion-based).
- User can add as many sample tests as desired for debugging.
- Gamification: Honor points, rank progression (8 kyu → 1 dan), leaderboards.

### SQL-Specific Details
- Kata authors write **schema setup + test assertions in RSpec**.
- SQL dialects available: SQLite3, PostgreSQL 9.6, PostgreSQL 13.
- Datasets are author-defined — typically small for teaching/kata purposes.
- No ERD viewer.
- Data is loaded by the kata author's setup code within the Docker container.

### Business Model
- **Free for all training**. All kata available without payment.
- Revenue model tied to Qualified.io (B2B, paid assessment platform).
- No "premium tier" for individual learners.

**Sources**: `github.com/codewars/runner` (README), https://docs.codewars.com/languages/python/codewars-test/, https://docs.codewars.com/languages/sql/

---

## Summary Comparison Tables

### Testing Methodology

| Platform | Execution Model | SQL Result Comparison | Python Testing |
|---|---|---|---|
| **LeetCode** | Server-side sandboxed containers | Result set comparison (MySQL/PostgreSQL), order-independent by default | Function return value vs. expected |
| **HackerRank** | Ubuntu LTS containers, stdin/stdout for general; DB for SQL | Result set comparison, order-independent | stdin/stdout OR function-based |
| **Codecademy** | Server-side sandboxed (proprietary) | Output table matching (proprietary) | SCT-style (proprietary) |
| **DataCamp** | Stateful server sessions (sqlwhat/pythonwhat) | AST + result set comparison, `ordered=True/False` | Variable/function/output comparison via pythonwhat |
| **SQLZoo** | Server-side MySQL/Oracle/PostgreSQL/MSSQL | Both user SQL + answer SQL run; result sets compared | N/A (SQL only) |
| **StrataScratch** | Real server-side execution | Result set comparison | Pandas/PySpark output comparison |
| **Execute Program** | Likely client-side (WASM) or server-side | Immediate evaluation | Code output / expression value |
| **Exercism** | Docker (per-language test runner), 20s/3GB | N/A (no SQL track) | pytest against student code |
| **Codewars** | Docker (CodeRunner), 12–14s | RSpec compares result sets | codewars_test assert_equals |
| **Mode SQL** | ⚠️ Deprecated (acquired by ThoughtSpot) | Was PostgreSQL result set | N/A |

### SQL Dialect Support

| Platform | MySQL | PostgreSQL | SQLite | MSSQL | Oracle | DB2 |
|---|---|---|---|---|---|---|
| HackerRank | ✅ 8.0 | ✅ 14.3 | ❌ | ✅ 2022 | ✅ 11g | ✅ 10.5 |
| LeetCode | ✅ (default) | ✅ (some problems) | ❌ | ❌ | ❌ | ❌ |
| SQLZoo | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Codewars | ❌ | ✅ 9.6 + 13.0 | ✅ | ❌ | ❌ | ❌ |
| DataCamp | ❌ | ✅ (primary) | ❌ | ❌ | ❌ | ❌ |
| StrataScratch | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Codecademy | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### UI/UX Key Features

| Platform | Run + Submit Separate | Hints | AI Assistance | Multi-file | Code Formatter |
|---|---|---|---|---|---|
| LeetCode | ✅ | Editorial (premium) | ✅ (premium) | ❌ | Limited |
| HackerRank | ✅ | Discussion boards | ✅ (AI Tutor/SkillUp) | ✅ | ✅ |
| Codecademy | ✅ | Built-in hint block | ✅ (inline AI explanations) | ❌ | ❌ |
| DataCamp | ✅ | Built-in hint block | ✅ (AI Tutor) | ❌ | ❌ |
| SQLZoo | ❌ (single Run) | Click-to-reveal hints | ❌ | ❌ | ❌ |
| StrataScratch | ✅ | AI StrataTools | ✅ (AI Evaluator, Mock AI Interviewer) | ❌ | ✅ (AI optimizes) |
| Execute Program | ❌ (auto-eval) | Inline lesson content | ❌ | ❌ | ❌ |
| Exercism | ✅ (Run Tests + Submit) | .docs/hints.md | ❌ (human mentors) | ✅ (CLI) | ❌ |
| Codewars | ✅ (Test + Attempt) | Kata description | ❌ (discussion-based) | ❌ | ❌ |

### Business Model Summary

| Platform | Free Tier | Paid Tier | Price (approx.) |
|---|---|---|---|
| LeetCode | ~1,800 problems, no editorial | Premium: all problems, editorials, AI | ~$35/mo or $159/yr |
| HackerRank | Full practice (developer) | Hire tools (employer) | $1,990–$4,490+/yr |
| Codecademy | Some beginner courses | Plus/Pro: all courses + career | ~$17–35/mo |
| DataCamp | Very limited | Full library | ~$25–39/mo |
| SQLZoo | ✅ Fully free | None | Free (ad-supported) |
| Mode SQL | ⚠️ Deprecated | — | — |
| StrataScratch | Learning paths + some questions | Premium: full library + AI mock | ~$9–15/mo est. |
| Execute Program | Limited trial | Full access | ~$19/mo est. |
| Exercism | ✅ Fully free | Donations welcome | Free |
| Codewars | ✅ Fully free | None (tied to Qualified.io B2B) | Free |

---

## Special Focus: SQL Large Datasets & Data Loading

| Platform | Max Dataset Size Known | Data Loading Mechanism |
|---|---|---|
| HackerRank | Small–medium (interview-scale) | Pre-loaded in DB containers per problem |
| LeetCode | Small (< 1k rows typical) | Pre-built DB snapshots per problem |
| SQLZoo | Small (hundreds of rows) | SQL scripts loaded into server MySQL; downloadable at `sqlzoo.net/world.sql` etc. |
| DataCamp | Educational scale | `pre-exercise-code` block runs before each exercise; `sqlwhat` connects via sqlalchemy |
| StrataScratch | Varies (real company interview data) | Server-side pre-loaded per question |
| Codewars | Author-defined (typically tiny) | Docker container; author sets up schema in test code |

**None of the platforms researched explicitly support 100k+ row datasets for exercises** as a standard feature. DataCamp's `pre-exercise-code` block and DataCamp notebooks could theoretically load larger datasets. StrataScratch is the closest to real-world scale data given its "real interview questions from top companies" positioning.

---

## Key Questions — Direct Answers

### How is user code tested?
- **General languages (Python, etc.)**: Either (a) inject test code after the user's code that asserts on variable values and function return values (DataCamp's `pythonwhat`, Codewars' `codewars_test`), or (b) compare stdout against expected output (HackerRank's classic IO-based model), or (c) run a test framework like pytest against the user's code (Exercism).
- **SQL**: Run both user SQL and reference SQL against a database, compare result sets (row-by-row or as sets, with/without ordering). DataCamp's `sqlwhat` is the most sophisticated — it can also compare the SQL AST (was a `WHERE` clause used? Was there a `JOIN`?).

### Run vs. Check/Submit Buttons
Almost all platforms (LeetCode, HackerRank, DataCamp, Codecademy, StrataScratch, Codewars, Exercism) use **two separate buttons**:
- **Run / Test**: Executes against visible/sample test cases. Immediate feedback. Can be run many times.
- **Submit / Check Work / Attempt**: Executes against the full hidden test suite. Triggers grade/completion.
- **Exceptions**: SQLZoo has a single "Run SQL" button (always evaluates against the answer); Execute Program auto-evaluates on input.

### Hints
- **DataCamp and Codecademy**: First-class `<hint>` block baked into the exercise format. Shown on explicit "Give Hint" click.
- **SQLZoo**: Click-to-expand `<div class='hint'>` in the question HTML.
- **Exercism**: `.docs/hints.md` per exercise (shown in the UI on request).
- **LeetCode**: No in-line hint button; editorial solution only (premium).
- **HackerRank/Codewars**: Hints via community discussion sections, not embedded in the UI.

### Commonly Provided Features
| Feature | Platforms |
|---|---|
| Code formatting | HackerRank, StrataScratch (AI-assisted), LeetCode (partial) |
| AI debugging | LeetCode (premium), HackerRank, Codecademy, DataCamp, StrataScratch |
| Custom test inputs | HackerRank, Codewars (user can modify sample tests) |
| Progress tracking / XP | Codewars (Honor + kyu ranks), LeetCode (badges), Exercism (streaks) |
| Spaced repetition | Execute Program only |

### SQL Table Presentation
- **Image of schema**: HackerRank (e.g., `CITY.jpg`).
- **Static text description**: LeetCode (inline in problem description), DataCamp (in instruction text).
- **Live data preview table**: SQLZoo (shows first rows of the table at the top of each tutorial page). This is the most useful pattern for learners.
- **ERD**: None of the platforms surveyed provide a proper interactive ERD in the exercise view.

### SQL Exercises with Large Numbers of Rows
**No platform discovered provides 100k+ row SQL exercises.** All platforms keep datasets small (hundreds to a few thousand rows maximum) for teaching purposes. The primary reason is server-side database cost and query performance expectations for beginners.

### Loading Large Datasets from Remote Sources
**For a custom implementation targeting 100k+ rows**, the following approaches are viable:

1. **Fetch from remote URL (e.g., GitHub raw)**: DuckDB-Wasm natively supports reading Parquet and CSV from HTTP URLs:
   ```sql
   -- DuckDB can read directly from URL
   CREATE TABLE orders AS SELECT * FROM read_parquet('https://raw.githubusercontent.com/.../orders.parquet');
   ```
   This works in-browser with DuckDB-Wasm without a server. The file is streamed and can be very large (limited by browser memory).

2. **Deterministic random generation with seed**: Generate data programmatically in a `pre-exercise-code` block using a seeded PRNG. The seed ensures reproducibility. Example (Python):
   ```python
   import random, sqlite3
   rng = random.Random(42)  # seeded — always same data
   conn = sqlite3.connect(':memory:')
   conn.execute('CREATE TABLE orders (id INTEGER, amount REAL, ...)')
   conn.executemany('INSERT INTO orders VALUES (?,?,...)',
       [(i, rng.uniform(10, 1000)) for i in range(100_000)])
   ```
   This is **the most portable approach** for any runtime (SQLite, DuckDB, Postgres).

3. **DuckDB-specific**: DuckDB's `range()` and built-in functions allow generating large datasets inline:
   ```sql
   CREATE TABLE big_orders AS 
   SELECT i AS id, (random() * 1000)::INT AS amount 
   FROM range(100000) t(i);
   ```

4. **CDN-hosted compressed files**: Store Parquet files (100k rows compresses to ~1–5 MB) on GitHub Releases or CDN. Load via DuckDB `read_parquet()` or fetch+decompress for SQLite.

**Recommendation for dataslope**: DuckDB-Wasm is already in the codebase. Use approach #1 (remote Parquet via `read_parquet()`) for large pre-built datasets, and approach #3 (DuckDB `range()` + `random()` with seed via `setseed()`) for generated data. For SQLite exercises, approach #2 (Python PRNG seed) in `pre-exercise-code` works best.

### Multi-file Editing
- **Supported**: Exercism (via CLI), HackerRank (multi-file project questions in enterprise tier).
- **Not supported**: LeetCode, Codecademy, DataCamp, SQLZoo, Codewars, StrataScratch.
- Multi-file is rare in exercise blocks — it's primarily useful for project-style exercises, not concept-level coding exercises.

---

## Common UI Patterns Across Platforms

1. **Split-pane layout**: Instructions/problem statement on left, code editor on right (Codecademy, LeetCode, DataCamp, Codewars). Some show result table in a third pane at bottom.
2. **Monaco editor**: Used by LeetCode, HackerRank, and most modern platforms. Provides VS Code-style editing experience.
3. **Inline result table**: SQL result rows shown immediately below or to the right of the editor after running.
4. **Test result indicator**: Pass/fail per test case shown as green checkmark / red X per row (DataCamp, Codewars, Exercism).
5. **Progress breadcrumb**: Lesson number out of total (e.g., "Exercise 3 of 10") shown in header.
6. **Hint reveal**: Progressive reveal — first hint text, then solution — to avoid spoilers.
7. **Schema panel**: Sidebar or tab showing table definitions (not universal, but common in SQL-focused tools).

---

## Relevance to dataslope/dataslope Project

Based on the research, the following implementation patterns are most relevant for building coding exercise blocks:

1. **DataCamp's SCT pattern** (sqlwhat/pythonwhat) is the richest model: `pre-exercise-code` sets up the environment, `sample-code` is the starting stub, `solution` is the reference, `sct` is the test logic. This separates data loading from testing cleanly.

2. **SQLZoo's `div.qu` + `source.ans`** model is the simplest for SQL: store both default and answer SQL in the exercise definition, run both, compare result sets. The `respectorder` flag is a clean way to handle ORDER BY exercises.

3. **For data loading in DuckDB**: The codebase already has DuckDB-Wasm support (`app/_components/runtime/duckdb.ts`). Use `read_parquet('https://...')` for remote datasets from GitHub raw URLs, or `setseed(0.42); SELECT * FROM range(100000)` for generated data.

4. **For large datasets**: Generate data with a seeded random function in `pre-exercise-code` (deterministic, no remote fetch needed), or load a compressed Parquet file from a GitHub Releases URL or CDN. DuckDB-Wasm is the best engine for 100k+ rows in-browser.

5. **Exercism's `results.json` interface** is an excellent, clean contract for a test runner: input = solution + test files in Docker, output = structured JSON with per-test status/message/output.

6. **SQLite for Python-adjacent exercises**: Codecademy and Execute Program use SQLite for in-browser SQL. The existing SQLite runtime in the codebase can be used for exercises that don't need large datasets.

7. **Recommended exercise block structure for dataslope**:
   - `language`: `python` | `sql-sqlite` | `sql-duckdb` | `sql-postgres`
   - `preExerciseCode`: Sets up tables/data before exercise
   - `starterCode`: What the user sees initially
   - `solutionCode`: Optional reference solution (shown on demand via "Show Solution" button)
   - `testCode`: SCT-style test code that runs after user code
   - `schemaPreview`: Table schema shown in sidebar
   - `runButton` / `checkButton`: Separate execution modes
   - *No `hints` field* — learners are expected to use LLMs for help

---

## Gaps and Uncertainties

- **LeetCode**: Blocked all direct access (403). Technical details drawn from community knowledge and observable behaviour.
- **DataCamp**: Direct website access blocked (403). All technical details from open-source GitHub repos (`datacamp/datacamp-light`, `datacamp/pythonwhat`, `datacamp/sqlwhat`, `datacamp/testwhat`).
- **Mode Analytics SQL Tutorial**: Confirmed deprecated/migrated post-ThoughtSpot acquisition.
- **Execute Program**: SPA architecture prevents content access; details are inferred from platform description and RSS blog topics.
- **StrataScratch pricing**: Exact pricing page returned 404; approximate pricing from secondary sources.
- **HackerRank SQL comparison ordering**: Not explicitly documented; observed to be order-independent from community reports.
- **LeetCode SQL ordering**: Not explicitly documented by LeetCode; community-reported as order-independent unless ORDER BY is in the answer.

---

## dataslope-Specific Design Decisions

This section documents design decisions specific to the dataslope exercise block implementation, covering business model, WebAssembly runtimes, SQL database initialisation, hint strategy, solution reveal, file structure, and input handling.

---

### Business Model and Access

dataslope's learning content is **completely free and requires no login.** All exercises, lessons, and reference material are accessible to guests without an account.

This has several direct consequences for the exercise block architecture:

- **No authentication checks.** Exercise blocks do not call an API to validate a session token before running code. All execution happens client-side via WASM runtimes, so there is nothing to gate behind a login wall.
- **No server-side progress tracking (initially).** Because users are guests, there is no user record to associate progress with. Progress state (e.g., which exercises have been completed) can be stored in `localStorage` for continuity within a single browser, but it is not synced to a server.
- **No per-user exercise quotas.** Server-based platforms (LeetCode, HackerRank) can limit submissions to control infrastructure costs. Because dataslope runs all code in the browser, there is no per-submission cost — learners can run exercises as many times as they like.
- **No email capture or upsell modals.** Guest access is a first-class experience, not a degraded free tier used to funnel sign-ups.

#### Future monetisation

Monetisation may be introduced later through two mechanisms, neither of which breaks the free-guest model:

1. **Advertising**: Display ads shown to guests on exercise/lesson pages (analogous to SQLZoo's ad-supported model). Ad revenue funds infrastructure (CDN, domain, dataset hosting) without charging learners.

2. **Paid-member AI features**: Optional features that require an account and a subscription, such as:
   - **AI-assisted coding**: An AI copilot inside the exercise editor that can explain errors, suggest next steps, or generate code snippets on request.
   - **AI-assisted debugging**: An AI that analyses the learner's failing test output and provides a targeted explanation of what went wrong and how to fix it.
   - **AI code review**: After passing the tests, an AI that critiques the learner's solution for style, efficiency, or best practices.

   These features sit on top of the free exercise experience — they do not restrict access to exercises themselves. A non-paying guest can always run exercises and see test results; they just won't have the AI layer.

#### Comparison to other platforms

| Platform | Guest access | Login required | Free tier |
|---|---|---|---|
| **dataslope** | ✅ Full access | ❌ Never required | ✅ All content |
| SQLZoo | ✅ Full access | ❌ | ✅ Ad-supported |
| Exercism | ✅ Most content | ✅ For submission/mentoring | ✅ All exercises |
| LeetCode | ✅ ~1,800 problems | ✅ For submission | ⚠️ Limited |
| DataCamp | ⚠️ Very limited | ✅ Required | ⚠️ Very limited |
| Codecademy | ⚠️ Some courses | ✅ Required | ⚠️ Limited |

dataslope most closely resembles **SQLZoo** in its access model (fully free, guest-first, ad-supported), but with a broader language scope and a richer in-browser execution architecture.

---

### WebAssembly Runtimes for All Languages (Including SQL)

dataslope uses WebAssembly (WASM) runtimes for **every supported language** — including SQL. This is a deliberate architectural choice that has both advantages and challenges.

#### Current WASM runtimes in the codebase

| Language | WASM Runtime |
|---|---|
| Python | Pyodide |
| JavaScript / TypeScript | almostnode |
| C | browsercc (Emscripten-compiled Clang) |
| C++ | browsercc (Emscripten-compiled Clang) |
| C# | .NET WASM runtime (dotnet.wasm / Blazor WebAssembly) |
| Java | CheerpJ (WASM-compiled JVM) |
| SQL (SQLite) | @sqlite.org/sqlite-wasm |
| SQL (DuckDB) | @duckdb/duckdb-wasm |
| SQL (PostgreSQL) | PGlite (PostgreSQL compiled to WASM via Emscripten) |

#### Advantages of a universal WASM architecture

1. **Zero server cost for exercise execution.** Every exercise — regardless of language — runs entirely in the learner's browser. There are no sandboxed containers to provision, no per-execution cloud bills, and no request latency from a round-trip to a code-execution server (unlike LeetCode, HackerRank, DataCamp, Exercism, and Codewars, which all run user code server-side).

2. **Consistency across languages.** The exercise block component does not need to special-case "use a server for Python, use the browser for SQL." Every runtime conforms to the same interface: initialise, run code, return result. This simplifies the exercise block's architecture significantly.

3. **Deterministic, reproducible execution.** Because the runtime is bundled with the page (or loaded once from a CDN), every learner runs the same binary with the same behaviour. There is no "works on my judge, fails on yours" mismatch.

4. **Offline capability.** Once WASM binaries and any data files are cached (via service worker or browser cache), exercises can run offline. This is impossible with a server-side model.

5. **Existing codebase leverage.** The dataslope codebase already has fully working WASM runtimes for SQLite, DuckDB, PostgreSQL (PGlite), Python (Pyodide), C, C++, C# (.NET WASM), and Java (CheerpJ). Exercise blocks can reuse these runtimes directly with minimal glue code.

#### Technical challenges of the WASM approach

1. **Binary size and load time.** Each WASM runtime is large: Pyodide (~10 MB gzip), DuckDB-Wasm (~5 MB), PGlite (~8 MB), @sqlite.org/sqlite-wasm (~1 MB), .NET WASM (~3–10 MB depending on trimming), CheerpJ (~10+ MB). A page that eagerly loads all runtimes would be unusably slow. **Mitigation**: Lazy-load each runtime on first use; show a loading indicator. Cache aggressively using `Cache-Control: immutable` and service workers.

2. **Memory limits.** Browsers impose per-tab memory limits (typically 2–4 GB on desktop, significantly less on mobile). Generating very large datasets (100k+ rows) in-browser consumes real heap memory inside the WASM sandbox. A 100k-row table with 10 columns of mixed types can use 30–100 MB of WASM heap. **Mitigation**: Use DuckDB-Wasm (which is more memory-efficient than Pyodide for tabular data), limit dataset sizes, or stream from remote Parquet files.

3. **Pyodide package loading.** Pyodide must download Python packages (numpy, pandas, etc.) from its CDN on first use. This can add 5–30 seconds of load time for exercises that import heavy packages. **Mitigation**: Pre-warm Pyodide with a `micropip.install` list in `preExerciseCode`; cache packages via the Pyodide package cache.

4. **SQL dialect consistency.** SQLite (@sqlite.org/sqlite-wasm), DuckDB, and PGlite each have different SQL dialects, function sets, and type systems. An exercise written for DuckDB (e.g., using `read_parquet()` or `LIST` types) will not work in SQLite. **Mitigation**: Exercise definitions must specify their target SQL runtime explicitly (e.g., `language: "sql-duckdb"`). The exercise block renders the appropriate engine badge and initialises the correct runtime.

5. **Concurrency and shared WASM state.** If multiple exercises on the same page share a WASM runtime instance, one exercise's data could leak into another's. **Mitigation**: Each exercise block should own an isolated runtime instance (or, for PGlite, an isolated in-memory database). DuckDB-Wasm supports multiple isolated connections to the same bundle; PGlite creates a fresh in-memory Postgres instance per component mount.

6. **Compilation latency (compiled languages).** The browsercc runtime compiles C/C++ code via an Emscripten-compiled Clang in a Web Worker; this takes 1–5 seconds per run. C# requires the .NET WASM AOT or interpreter to JIT the IL; Java via CheerpJ must translate bytecode at runtime. **Mitigation**: Show a spinner during compilation. For C# and Java, pre-warm the runtime on component mount so the first learner-triggered run is faster.

7. **No native subprocess or file I/O.** WASM runtimes cannot spawn processes, open files from the host file system, or make arbitrary network requests. Any file system access must be virtualised (Emscripten's FS, Pyodide's in-memory FS). This is generally acceptable for exercises but must be documented for exercise authors.

#### Architecture summary

The universal WASM approach makes the exercise block architecture **simpler** overall: there is one code path, one run loop, and one result type regardless of language. The primary complexity shifts from "how do we run code" to "how do we load the right runtime efficiently." Given that the runtimes already exist in the codebase, the incremental work for exercise blocks is primarily around the exercise definition schema and the test harness, not the execution layer.

---

### SQL Exercise Database Initialisation

SQL exercises need a populated database before the learner writes their first query. Unlike Python or JavaScript exercises (where the starter code itself can define variables), SQL requires the tables and data to exist before the user's SQL runs. The following approaches are available.

#### Option A — Accept a JS/TS function (`initDb`) to create data from scratch

The exercise definition accepts an `initDb` async function. This function receives the engine instance and is responsible for creating tables and populating them. The exercise block calls `initDb(engine)` once before the learner's first run.

```typescript
// Exercise definition
const exercise: SqlExercise = {
  language: "sql-duckdb",
  initDb: async (engine: DuckDBEngine) => {
    // Create schema
    await engine.exec(`
      CREATE TABLE products (
        id      INTEGER PRIMARY KEY,
        name    VARCHAR,
        price   DECIMAL(10,2),
        category VARCHAR
      );
    `);

    // Populate with generated data — flexible, no remote fetch required
    await engine.exec(`
      INSERT INTO products
      SELECT
        i                                   AS id,
        'Product ' || i                     AS name,
        (random() * 990 + 10)::DECIMAL(10,2) AS price,
        CASE (i % 3)
          WHEN 0 THEN 'Electronics'
          WHEN 1 THEN 'Clothing'
          ELSE 'Food'
        END                                 AS category
      FROM range(1, 10001) t(i);
    `);
  },
  starterCode: "SELECT * FROM products LIMIT 10;",
  testCode: `...`,
};
```

This approach is maximally flexible:

- **Deterministic generation**: Use DuckDB's `setseed()` or a seeded JS PRNG to ensure every learner gets identical data.
- **Procedural generation with `numpy-ts`**: For exercises that benefit from NumPy-style distributions (normal, exponential, Poisson), use [`numpy-ts`](https://www.npmjs.com/package/numpy-ts) or [`jstat`](https://jstat.github.io/) in the `initDb` function to generate typed arrays and bulk-insert them via the engine's `insertRows` API. Example:

```typescript
import { normal } from "numpy-ts"; // hypothetical; actual API may vary

initDb: async (engine) => {
  const salaries = normal({ mean: 75000, std: 20000, size: 50000 });
  await engine.exec("CREATE TABLE employees (id INTEGER, salary REAL)");
  await engine.exec(
    `INSERT INTO employees SELECT i, salaries[i] FROM range(50000) t(i)`,
    // or batch-insert via Arrow / typed array binding
  );
},
```

- **Fetching remote data**: The `initDb` function can `fetch()` a remote CSV or Parquet file and insert it into the engine. For DuckDB, this can be as simple as `engine.exec("CREATE TABLE t AS SELECT * FROM read_parquet('https://...')")`.
- **Reusable helpers**: Common dataset generators (e.g., a `generateEcommerceDb(engine, rows)` helper) can be shared across multiple exercises without duplicating SQL.

#### Option B — SQL `initSql` string

For simpler exercises, accept a plain SQL string that is executed before the exercise. This is analogous to DataCamp's `pre-exercise-code` block and SQLZoo's pre-loaded datasets.

```typescript
const exercise: SqlExercise = {
  language: "sql-sqlite",
  initSql: `
    CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, amount REAL);
    INSERT INTO orders VALUES (1, 'Alice', 120.50), (2, 'Bob', 340.00), (3, 'Carol', 89.99);
  `,
  starterCode: "-- Write a query to find orders over $100\n",
};
```

This is the simplest approach and is sufficient for small, hand-authored datasets (dozens to a few hundred rows).

#### Option C — Remote Parquet/CSV fetch (DuckDB only)

For exercises that require realistic large datasets (10k–1M rows), `initDb` can call DuckDB's native HTTP fetch:

```typescript
initDb: async (engine) => {
  await engine.exec(`
    CREATE TABLE nyc_taxi AS
    SELECT * FROM read_parquet(
      'https://github.com/dataslope/datasets/releases/download/v1/nyc_yellow_2023_sample.parquet'
    );
  `);
},
```

The Parquet file is fetched once and cached in the browser. A 100k-row table compresses to ~1–5 MB in Parquet format — acceptable as a one-time CDN fetch.

#### Recommended initialisation strategy

| Dataset size | Recommended approach |
|---|---|
| < 100 rows | `initSql` string (hand-authored INSERT statements) |
| 100 – 100,000 rows | `initDb` JS/TS function with in-engine SQL generation (DuckDB `range()` + `random()` with `setseed()`) |
| > 100,000 rows | `initDb` fetching a Parquet file from GitHub Releases / CDN, or DuckDB remote `read_parquet()` |

---

### No Hints

Exercise blocks in dataslope **do not include a hint system.** This is an intentional design decision.

The rationale is that learners are expected — and encouraged — to use LLMs (ChatGPT, Claude, GitHub Copilot, etc.) when they are stuck. LLMs are dramatically more capable than static hint strings: they can explain the concept, show an example, diagnose the specific error in the learner's code, and suggest a next step tailored to what the learner has already written.

A static `hints` array (as used by DataCamp and Codecademy) made sense in 2015 when AI assistants did not exist. Today, a static hint competes poorly with "explain this SQL error to me" in a chat window. Shipping a hint system would add implementation complexity, create content-authoring burden (every exercise needs well-written hints), and ultimately be less useful to learners than the tools they already have.

**Implication for the exercise block UI**: There is no "Give Hint" button, no `hints` property in the exercise schema, and no hint-reveal animation. The UI is simpler as a result.

---

### Optional `solutionCode` Parameter

Each exercise definition may include an optional `solutionCode` field. If `solutionCode` is provided, the exercise block renders a **"Show Solution"** button. If `solutionCode` is absent, no button is rendered.

```typescript
interface ExerciseBlock {
  language: string;
  starterCode: string;
  testCode: string;
  solutionCode?: string; // optional
  // ...other fields
}
```

**UI behaviour when `solutionCode` is present**:
- A "Show Solution" button appears below the editor (or in the toolbar).
- Clicking it opens a modal or drawer that renders the solution code in a read-only code editor (same Monaco instance, read-only mode).
- The learner's current code in the editor is **not replaced** — they can view the solution and then return to their own attempt.
- A confirmation prompt ("Are you sure? Viewing the solution may reduce learning benefit") is optional but probably unnecessary — learners who click "Show Solution" have already decided they want to see it.

**Rationale**: Not all exercises need a solution. Exploratory exercises ("write any query that returns the top 10 products by revenue") have many valid answers and a `solutionCode` would be misleading. For concept-verification exercises ("write a query using a window function to compute running totals"), a canonical solution is helpful as a reference after the learner has attempted the exercise.

---

### File Structure: Single-File Default, Optional Multi-File Tabs

#### Default: single file

By default, every exercise block is a **single-file editor**. The learner sees one editor pane with no tab bar. This is the simplest, lowest-friction experience and matches the model used by LeetCode, DataCamp, Codecademy, and most other platforms.

#### Multi-file exercises

Some exercises — particularly those involving modules, header files (C/C++), or multi-component programs — benefit from a multi-file structure. When an exercise has more than one file, the editor renders a **tab bar** above the editor. Each tab corresponds to one file.

**Tab bar rules**:
- The tabs are **fixed and predefined** by the exercise author. Learners cannot create new tabs or remove existing tabs.
- Learners **can switch between tabs** and edit any of the files shown.
- Each file has a name (e.g., `main.py`, `helpers.py`, or `solution.sql`, `schema.sql`).
- Files that the learner should not modify (e.g., a test harness or read-only schema file) can be marked `readonly: true` in the exercise definition — they will appear as a non-editable tab.

```typescript
interface ExerciseFile {
  name: string;          // tab label and file name
  content: string;       // initial content shown to learner
  readonly?: boolean;    // if true, editor is read-only for this file
}

interface ExerciseBlock {
  language: string;
  files: ExerciseFile[]; // if length === 1, no tab bar rendered
  testCode: string;
  solutionCode?: string;
  // ...
}
```

**When to use multi-file**:
- C/C++ exercises with a header file (`types.h`) the learner must implement alongside a `main.c`.
- C# exercises that span multiple source files (e.g., `Program.cs` + `Helper.cs`).
- Java exercises with multiple classes spread across files (e.g., `Main.java` + `Node.java`).
- Python exercises that span a module and a usage file (`utils.py` + `main.py`).
- SQL exercises where the schema DDL is shown read-only in one tab and the learner writes queries in another.

**Consistency with the existing codebase**: The C and C++ runtimes already implement `prepareFileSystem` to stage multiple `.c`/`.h`/`.cpp`/`.hpp` files in memory and pass them to the browsercc worker as `extraFiles`. The multi-file exercise structure aligns directly with this existing model.

---

### Supporting Multiple Inputs Across Languages

Different languages use fundamentally different mechanisms for providing runtime inputs to code. The exercise block must accommodate all of them.

#### Categories of input

| Input type | Languages | Mechanism |
|---|---|---|
| **Function arguments** | Python, JS/TS, C, C++, C#, Java | Test harness calls the learner's function with typed arguments |
| **stdin** | C, C++, Python, C#, Java (some) | Input piped as a string to the program's standard input stream |
| **SQL query parameters** | SQL (all dialects) | Parameterised queries (`:param` or `$1` style) |
| **Database state** | SQL (all dialects) | Pre-populated tables created by `initDb` / `initSql` |
| **Environment variables** | Python, JS/TS | Set in the WASM sandbox before execution |
| **File system** | C, C++, Python, C#, Java | Files written to the virtualised WASM file system before execution |

#### Recommended input model

The exercise block should support a **typed `inputs` array** in the exercise definition. Each element describes one test case input:

```typescript
interface TestCase {
  label?: string;           // e.g. "Basic case", "Edge case: empty list"
  inputs: Record<string, unknown>; // named inputs passed to the test harness
  expectedOutput?: unknown; // optional; used by the test runner to auto-assert
}
```

The `testCode` (the SCT / test harness) receives these inputs via a well-known binding:

- **Python**: The test harness is injected after the learner's code. `inputs` are available as local variables (e.g., `__input_n = 5`). The harness calls `result = solution(n)` and asserts.
- **JS/TS (almostnode)**: The test harness is a JS module that imports the learner's code (executed via the almostnode runtime) and calls exported functions with the provided arguments.
- **C/C++**: The test harness compiles alongside the learner's code. Inputs can be passed as `argv` or as `#define` constants injected at compile time, or via stdin.
- **C#**: The test harness is a `.cs` file added as an extra source file. It calls the learner's class/method with typed arguments using standard xUnit-style assertions, compiled and run by the .NET WASM runtime.
- **Java**: The test harness is a `TestHarness.java` file compiled alongside the learner's source via CheerpJ. It invokes the learner's class/method and compares output to the expected value.
- **SQL**: Inputs are provided as table data (via `initDb`) or as query parameters. The test harness runs the learner's SQL and the reference SQL against the same database state, then compares result sets.

#### stdin support (C/C++, Python)

For exercises that use stdin (classic competitive-programming style, also used by HackerRank), the `inputs` field can include a `stdin` string:

```typescript
{
  label: "Single number",
  inputs: { stdin: "42\n" },
  expectedOutput: { stdout: "84\n" }
}
```

The WASM runtime sets up a virtual stdin before execution and captures stdout after.

#### SQL-specific: multiple test queries

SQL exercises may need to validate more than one query (e.g., "write a `SELECT` to find X" and "write an `UPDATE` to set Y"). In this case, `testCode` can be a sequence of SQL + assertion pairs, or a JS function that runs multiple checks against the engine after the learner's SQL has executed.

#### Practical recommendation

For the initial implementation, support:
1. **SQL exercises**: `initDb` / `initSql` for database state; single-query validation via result set comparison.
2. **Python exercises**: Function-call model — learner implements a function, test harness calls it with typed arguments.
3. **JS/TS exercises (almostnode)**: Same as Python — export a function, test harness imports and calls it.
4. **C/C++ exercises**: Stdin/stdout model (simplest) or multi-file with a provided test harness file.
5. **C# exercises**: Multi-file model — learner implements a class/method, provided `TestHarness.cs` calls it.
6. **Java exercises**: Multi-file model — learner implements a class, provided `TestHarness.java` calls it.

Defer environment-variable and file-system input types until there is a concrete exercise that requires them.

---

## Coding Agent Prompt

The following prompts can be used to instruct a coding agent to implement the two exercise block components. SQL exercises (SQLite, DuckDB, PostgreSQL) have unique database-initialisation requirements and a result-set comparison testing model, so they are split into a dedicated component separate from all other language exercises.

---

### Prompt A — `SqlExerciseBlock`

```
You are implementing a SQL coding exercise block component for the dataslope/dataslope Next.js application.

## Context

The repository is a Next.js 14+ app (TypeScript, Tailwind CSS). It already has fully working
WebAssembly SQL runtimes located in `app/_components/runtime/`:

- SQLite     → `sqlite.ts`   (@sqlite.org/sqlite-wasm)
- DuckDB     → `duckdb.ts`   (@duckdb/duckdb-wasm)
- PostgreSQL  → `postgres.ts` (PGlite — PostgreSQL compiled to WASM via Emscripten)

All SQL engines expose an async `exec(sql: string): Promise<QueryResult>` interface.

## Task

Implement a `SqlExerciseBlock` React component and its supporting types. The component is an
interactive SQL coding exercise block that:

1. Accepts a `SqlExerciseDefinition` (see schema below).
2. Initialises the appropriate SQL WASM runtime for the exercise dialect.
3. Before the first execution, calls `initDb(engine)` if provided, or runs `initSql` if provided.
4. Renders a Monaco editor with the starter SQL code (single file; no tab bar).
5. Provides a "Run" button that executes the learner's SQL against the initialised database,
   then runs the `testFn` validation function and displays pass/fail per test assertion.
6. If `solutionCode` is provided, renders a "Show Solution" button that opens the solution SQL
   in a read-only modal editor. Does NOT replace the learner's code in the main editor.
7. Does NOT include any hint system — no "Give Hint" button, no `hints` field.
8. Shows a loading indicator while the WASM runtime is initialising.
9. Is fully self-contained — no server requests for code execution.

## Type definitions to implement

```typescript
// Supported SQL dialects / engines
type SqlLanguage = "sql-sqlite" | "sql-duckdb" | "sql-postgres";

// A union of the three SQL engine types already in the codebase
type SqlEngine = SqliteEngine | DuckDBEngine | PostgresEngine;

// Result of a single test assertion
interface TestAssertionResult {
  label: string;
  passed: boolean;
  message?: string; // shown on failure
}

// The full SQL exercise definition
interface SqlExerciseDefinition {
  // Which SQL engine to use
  language: SqlLanguage;

  // Starter SQL shown to the learner in the editor
  starterCode: string;

  // Optional: async function to create tables and seed data before the first run.
  // Called once on mount. Mutually exclusive with initSql (prefer initDb for
  // programmatic/large datasets).
  initDb?: (engine: SqlEngine) => Promise<void>;

  // Optional: plain SQL string executed before the first run (alternative to
  // initDb; suitable for small hand-authored INSERT statements).
  initSql?: string;

  // Validation function called after the learner's SQL has run.
  // Receives the engine (so it can run follow-up queries) and the result of
  // the learner's SQL. Returns an array of assertion results.
  testFn: (
    engine: SqlEngine,
    result: QueryResult
  ) => Promise<TestAssertionResult[]>;

  // Optional canonical solution. If present, a "Show Solution" button appears.
  solutionCode?: string;
}
```

## Additional requirements

- Place the component in `app/_components/exercise/SqlExerciseBlock.tsx`.
- Place shared types in `app/_components/exercise/types.ts`.
- Reuse the existing Monaco editor integration from the codebase where possible.
- Reuse the existing DuckDB, SQLite (@sqlite.org/sqlite-wasm), and PGlite runtime classes directly.
- Do not add any new npm dependencies unless strictly necessary. If you add one, check it
  against the GitHub Advisory Database for known vulnerabilities first.
- Follow the existing TypeScript and Tailwind CSS patterns in the codebase.
- Run `npm run build` after implementation to confirm there are no type errors or build failures.
```

---

### Prompt B — `CodeExerciseBlock`

```
You are implementing a general-purpose coding exercise block component for the
dataslope/dataslope Next.js application, covering all non-SQL languages.

## Context

The repository is a Next.js 14+ app (TypeScript, Tailwind CSS). It already has fully working
WebAssembly runtimes for the following languages, located in `app/_components/runtime/`:

- Python          → `pyodide.ts`  (Pyodide)
- JavaScript / TS → `almostnode.ts` (almostnode — https://almostnode.dev/)
- C               → `c.tsx`        (browsercc / Emscripten-compiled Clang)
- C++             → `cpp.tsx`      (browsercc / Emscripten-compiled Clang)
- C#              → `csharp.ts`    (.NET WASM / dotnet.wasm)
- Java            → `java.ts`      (CheerpJ — WASM-compiled JVM)

All runtimes expose a common async `run(files: CodeFile[]): Promise<RunResult>` interface,
where `RunResult` contains stdout, stderr, and an exit code.

## Task

Implement a `CodeExerciseBlock` React component and its supporting types. The component is an
interactive coding exercise block for non-SQL languages that:

1. Accepts a `CodeExerciseDefinition` (see schema below).
2. Initialises the appropriate WASM runtime for the exercise language.
3. Renders a Monaco editor with the starter code. If `files` has more than one entry, renders
   a fixed tab bar above the editor — learners cannot add or remove tabs. Each tab corresponds
   to one `CodeFile`. Files marked `readonly: true` open in read-only mode.
4. Provides a "Run" button that executes all files through the runtime, then evaluates the
   `testFn` against the output and displays pass/fail per test assertion.
5. If `solutionCode` is provided, renders a "Show Solution" button that opens the solution in a
   read-only modal editor. Does NOT replace the learner's code.
6. Does NOT include any hint system — no "Give Hint" button, no `hints` field.
7. Shows a loading indicator while the WASM runtime is initialising.
8. Is fully self-contained — no server requests for code execution.

## Type definitions to implement

```typescript
// Supported non-SQL languages
type CodeLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "c"
  | "cpp"
  | "csharp"
  | "java";

// A single source file shown in the editor
interface CodeFile {
  name: string;       // tab label and file name (e.g. "main.py", "Helper.cs")
  content: string;    // initial content shown to the learner
  readonly?: boolean; // if true, the editor tab is non-editable
}

// Result of a single test assertion
interface TestAssertionResult {
  label: string;
  passed: boolean;
  message?: string; // shown on failure
}

// The standard run result returned by all code runtimes
interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// The full code exercise definition
interface CodeExerciseDefinition {
  // Which language / runtime to use
  language: CodeLanguage;

  // File(s) shown in the editor. If length === 1, no tab bar is rendered.
  files: CodeFile[];

  // Validation function called after the learner's code has run.
  // Receives the RunResult (stdout, stderr, exitCode).
  // Returns an array of assertion results.
  testFn: (result: RunResult) => Promise<TestAssertionResult[]>;

  // Optional canonical solution (shown in a read-only modal on request).
  solutionCode?: string;
}
```

## Additional requirements

- Place the component in `app/_components/exercise/CodeExerciseBlock.tsx`.
- Place shared types (CodeFile, TestAssertionResult, RunResult, etc.) in
  `app/_components/exercise/types.ts` — share with SqlExerciseBlock where applicable.
- Reuse the existing Monaco editor integration from the codebase where possible.
- Reuse the existing Pyodide, almostnode, browsercc, .NET WASM, and CheerpJ runtime classes
  directly — do not re-implement them.
- Do not add any new npm dependencies unless strictly necessary. If you add one, check it
  against the GitHub Advisory Database for known vulnerabilities first.
- Follow the existing TypeScript and Tailwind CSS patterns in the codebase.
- Run `npm run build` after implementation to confirm there are no type errors or build failures.
```
