# Tools Competition: Is Dataslope a Candidate?

**Date:** 2026-10-04 (revised the same day with the owner's answers: US-based, ~100 members, ~50 unique visits a day, willing to log research data and update the privacy policy)
**Question:** Could Dataslope apply to the Tools Competition (<https://tools-competition.org/>), and with what?
**Method:** the competition's public pages for the 2027 cycle (overview, official rules, FAQ, the four track pages, the learning-engineering page), read against what this repository says Dataslope is and does.

**Short answer:** yes. Enter the **Navigating Postsecondary Learning and Work** track at the **Catalyst** level ($50,000).

- **Eligible.** The track is open to entrants "based in the United States and serving U.S. learners", which Dataslope is.
- **Catalyst is the right level.** The rules define it to include "Entrants with an existing tool with a non-existent or limited user base", and the track page says "There is no minimum number of users required at this level." About 100 members and 50 visits a day is a limited user base; Growth asks for "some users and scale" and would invite a demand question the numbers cannot answer yet.
- **No partner is required.** Not a community college, not an employer, not a researcher, at any level, in any track (§3.1). A partner helps the equity and demand scores; its absence does not disqualify.
- **The research-data condition is met** by the owner's willingness to add opt-in logging and change the privacy policy.

What is left is **novelty**. A Catalyst proposal "must detail how funding will be used to create or develop the tool", so the money has to build something that does not exist yet. §6 works through the candidate ideas and recommends one.

The Phase I abstract is due **Tuesday 13 October 2026**. Phase II (the full proposal, by invitation) is due 21 January 2027.

---

## 1. The competition, 2027 cycle

| | |
| --- | --- |
| Run by | The Learning Agency, as a program of Renaissance Philanthropy |
| Launched | 10 September 2026 |
| Pool | $4.5M+ across four tracks |
| Phase I: abstract | due 13 October 2026 |
| Phase II: invited proposal | invitations 24 November 2026; due 21 January 2027 |
| Phase III: virtual pitch | finalists invited 18 March 2027; pitches April 2027 |
| Winners | June 2027 |
| Payment | 50% on winning, 50% after a "Product Review Day" on "substantial progress towards their milestones" |

**Prize levels** (the same three in every tool track):

| Level | Award | Rules' definition |
| --- | --- | --- |
| **Catalyst** | $50,000 | "new Entrants with early stage ideas or products. This may also include Entrants with an existing tool with a non-existent or limited user base" |
| Growth | $150,000 | "at least a minimum viable product with some users and scale" |
| Transform | $300,000 | "established platforms with 10,000 or more users" |

**Who can enter:** anyone 18 or over, alone or in a team, with or without a company. Winners need to be able to receive US-dollar payments. Everything is in English.

**What every entry is judged on** (the same six criteria on each track page):

1. Novelty of the tool and technology
2. Potential impact and likelihood to improve learning
3. Attention to equity, for historically marginalized populations
4. Demand from learners, families and educators
5. Ability to support learning engineering
6. Ability to scale to more users and/or domains

**Two obligations on every entry:**

- **Learning engineering.** At Catalyst, the team must "describe the tool's potential to contribute to learning science research and demonstrate an intention to support research at scale". The learning-engineering page says what that looks like in practice: describe the data the tool collects, know the research questions it can answer, partner with researchers, share data with them, and build infrastructure for experimentation. The competition keeps a database of researchers for finding a partner.
- **Public goods.** Entrants must "detail how their tool or technology will generate public goods and shared infrastructure, such as datasets, benchmarks, and evaluation frameworks."

The rules also give the competition the right to "publish and communicate to the public" submitted content, so nothing in an abstract should be confidential.

## 2. Dataslope, as this repository describes it

- **What it is.** "Courses and coding playgrounds that run entirely in your browser. No install, no setup, no sign-up, no paywall." (`README.md`). 32 courses (~850 pages across Python and data science, SQL, R, JavaScript/TypeScript/React/CSS, C, C++, Java, C#, and `how-llms-work`) and 6 role-based interview tracks (data analyst, data scientist, data engineer, analytics engineer, ML engineer, backend engineer).
- **How it teaches.** ~3,900 runnable code blocks, ~3,270 multiple-choice checks with per-choice explanations, and roughly a thousand auto-graded challenges (§7.1). 14 language runtimes execute in WebAssembly on the learner's device, plus Git and Bash playgrounds.
- **The SQL workbench.** Not a query box: a schema tree with tables, views, indexes and triggers; multiple query tabs; a sortable, filterable, editable result grid; `EXPLAIN`; import and export; three real engines (PostgreSQL via PGlite, DuckDB, SQLite) with sample databases loaded (`README.md`, "SQL workbench"; `app/playground/{postgres,duckdb,sqlite}`).
- **Price.** Free with or without an account; the terms commit that free content stays free. A Pro tier exists in code but is hidden (`SHOW_PRO_PLAN = false`).
- **AI.** None. An assistant and AI autocomplete were built and removed (`DEVELOPMENT.md`).
- **Learner data.** Deliberately minimal: signed-in users sync only a verdict per challenge (`migrations/auth/0010_create_challenge_progress.sql`, "Only the verdicts are stored, not the learner's code"); analytics are cookieless and aggregate.
- **Educators.** No teacher or classroom features.
- **Licensing.** Code MIT; learning content CC BY-NC 4.0, classroom use explicitly allowed (`LICENSE`, `LICENSE-CONTENT`).
- **Traction (from the owner).** About 100 members and about 50 unique visits a day.
- **Reach limits.** English only; some runtimes are large first downloads (~35 MB for .NET, ~18 MB for Java's `tools.jar`); no offline mode.

## 3. Track by track

| Track | Audience | Open to | Fit |
| --- | --- | --- | --- |
| **Navigating Postsecondary Learning and Work** | Postsecondary and workforce | US-based, serving US learners | **Good. Enter here.** |
| Building Better Datasets | K-12 and postsecondary data | Worldwide | Possible second entry, if allowed (§3.2) |
| Reimagining K-12 Assessment | Primarily K-12 | Worldwide | Weak |
| Strengthening K-12 Teaching | K-12 educators | Worldwide | None |

The postsecondary track targets learners who "are often working or raising families, are the first in their families to attend college, and have limited financial resources", including people "transitioning between education and work", and wants them to build "durable, technical, and AI-related skills". It has three lanes: *Teaching, Learning and Skill Development*; *Assessment and Skills Recognition* (formative assessment, portfolios, digital credentials, competency-based education); and *Learner Success and Pathways*. Dataslope's content sits in the first, and the recommended proposal (§6) puts the new work in the second.

### 3.1 Without a community-college partner

**No category requires one, and neither does this track.** Checked three ways:

- **The postsecondary track page** names no required partner at any level. It says tools "should be designed for use in workforce and/or postsecondary education settings, including support for learners transitioning between education and work", which covers a free tool used directly by self-directed adults moving into data work. Institutions are where the track expects most of its learners to be, not a condition of entry.
- **The official rules** set no partner requirement for any track or level. The only track-specific condition here is being US-based and serving US learners.
- **The other three tracks** do not require partners either. The two K-12 tracks are ruled out by audience ("Tools should primarily target K-12 educators or students…"), not by partnerships. *Building Better Datasets* is open to "teams or individuals from all backgrounds", worldwide.

So switching category to avoid a partner buys nothing: the best-fit track already accepts a solo entrant with no partner.

What a partner would still buy is score, mainly on **equity** and **demand**. Without one, the abstract should name the learners concretely (career changers, working adults, community-college students studying on their own) and how they will be reached. A partner can be added later: Phase II is not until January, and a research partner (from the competition's database) is worth more there than an institutional one, because it carries the learning-engineering criterion.

### 3.2 A second entry in Building Better Datasets

This track funds "data collection and processing, limiting product development", is open worldwide, and has a competitive priority for engagement data, naming "log data, keystrokes, interaction traces". The logging the main proposal needs (§6) produces exactly that kind of data. Neither the rules nor the FAQ say whether one entrant may enter two tracks; **ask at office hours before submitting twice**, and if in doubt, enter only the postsecondary track.

## 4. Against the rubric

| Criterion | Dataslope today | With the proposal in §6 |
| --- | --- | --- |
| Novelty | Low. A strong free course site in a crowded category; its real differentiators (14 runtimes client-side, the SQL workbench, no login) already exist, so a grant cannot fund them. | Medium to high: authentic, workplace-realistic skill checks with verifiable results are not what free coding sites offer. |
| Impact | Unknown. No efficacy evidence. | To be measured; the proposal should say how. |
| Equity | Medium. Free and account-free; but English only, heavy first downloads, no outreach. | Medium to high with a named learner group and a low-bandwidth plan. |
| Demand | Low: ~100 members, ~50 visits a day. Acceptable at Catalyst, which needs no users. | Strengthen with learner interviews or a waitlist before Phase II. |
| Learning engineering | Low today, by design. | High: browser execution makes rich process data cheap to capture, and the owner has committed to collecting it. |
| Scalability | High. Edge-served, client-executed, near-zero marginal cost, open licences. | Unchanged. |

## 5. Remaining gaps, most expensive first

1. ~~US eligibility.~~ Resolved: US-based.
2. **Novelty.** The central question now; see §6.
3. **Learning engineering.** Committed in principle. The proposal needs to name what will be logged, the consent flow, how researchers get access, and two or three research questions.
4. **Demand.** Low but adequate for Catalyst. Anything that shows learners want the new thing helps: a waitlist, a short survey of current members, a few quotes.
5. **Equity targeting.** Name the learners, address bandwidth (a service worker that caches runtimes; steering a first visit to the lighter runtimes), and say how the work reaches people who would not find it on their own.
6. **Content licence (minor).** CC BY-NC supports the public-goods argument and allows classroom use, but bars commercial reuse. Worth one sentence; see §7.4 for the case where it matters.

## 6. Making it new

### 6.1 The rule to write by

The competition funds what the money creates, and judges its novelty against what already exists in the field. Features Dataslope already has are not the proposal; they are the reason the proposal is credible and cheap. Put them in the "why us" paragraph, and put the new thing in the first sentence.

### 6.2 The candidate ideas

| Idea | Exists? | As the novelty | Where it belongs in the proposal |
| --- | --- | --- | --- |
| WASM runtimes: unlimited execution, no login | Yes | No. In-browser runtimes are established (Pyodide, JupyterLite, DuckDB-WASM), and the grant cannot fund what is built. | **The enabler.** It is the scalability and equity argument: practice costs nothing to serve, and nobody has to sign up. |
| Embedded exercises, including SQL | Yes | No. Embedded auto-graded exercises are the norm. Reviewers from the learning-engineering community will also know Runestone Academy: free, open-source interactive CS textbooks with runnable code, an instructor side, and its own Learning Engineering and Analytics Portal. "Free interactive textbook with research data" is taken. | The raw material: ~1,000 tasks with tests and reference solutions (§7.1). |
| Full-IDE SQL workbench, three engines | Yes, and unusual | Not on its own: it is built, and browser SQL tools exist outside education. But **it is the best foundation for something that is new** (§6.3): it is the difference between a query box and the environment a junior analyst actually works in. | The assessment environment. |
| Programmatic videos with Remotion | No | Weak as the centerpiece. It changes how lessons are produced, not what a learner can do, and video is a passive format the rubric's "likelihood to improve learning" will not favour over practice. | **The experiment.** Generating a worked-example video for every task is what makes a large randomized comparison (video vs. text vs. none) affordable. Phase 2 material, not the pitch. |

### 6.3 Recommended: work-sample skill checks for entry-level data jobs

**One sentence:** free, browser-based work-sample assessments for entry-level data roles, done in a real SQL and Python workbench, auto-scored, verifiable, and instrumented for research, so a career changer can prove they can do the job without paying for a bootcamp or a certificate.

**What is new**, each piece something Dataslope does not have today:

1. **Authentic tasks, not exercises.** A "skill check" is a short, realistic job task in the full workbench: a messy table to clean, a stakeholder question to answer with a query, a slow query to diagnose with `EXPLAIN`, a CSV to import and join. Scored on the result, not on matching a reference query. Starts with one role (data analyst), mapped to a published competency list.
2. **AI-era tasks.** A family of checks where the learner is handed an AI-written query or analysis with a subtle error and must find and fix it. Checking AI output is a core skill for "an increasingly AI-driven world", the track's own phrase. The flawed artefacts are generated once, offline, so no model runs per learner and the zero-marginal-cost property survives.
3. **Results others can verify.** Practice stays in the browser and free. Claiming a result re-runs the learner's final submission once, server-side, against hidden tests. The pieces exist: the repo already runs lesson code headlessly for prepopulated outputs (`scripts/lib/block-runners.mjs`), and PGlite and DuckDB run under Node. The learner gets a shareable record (task, date, evidence) that an advisor or employer can check, which is the *Assessment and Skills Recognition* lane exactly.
4. **A research instrument underneath.** Opt-in, consented logging of every run, error, test result and workbench action (tables browsed, tabs opened, `EXPLAIN` used); de-identified releases in an open format (ProgSnap2 is the established one for programming-process data); and an A/B hook. Research questions it can answer: which errors predict a learner giving up; whether worked examples help adult career changers more than hints; how learners debug AI-written code, and whether that is teachable.

**Why Dataslope can do it for $50,000:** the runtimes, the workbench, the grading harnesses and ~1,000 validated tasks already exist, and serving a learner costs nothing. The grant pays for task design, the verification service, the logging and consent work, and a first study.

**Public goods:** the task bank with its scoring harness (§7), the de-identified process dataset, and the competency map.

### 6.4 A draft pitch paragraph

The abstract form's questions and word limit are not on the public pages, so this is a starting point to cut to fit, not a finished answer:

> Career changers trying to move into data work have two ways to show they are ready: a paid certificate that tests recall, or a portfolio nobody verifies. Dataslope will build free work-sample skill checks for entry-level data roles: short, realistic tasks done in a full SQL and Python workbench that runs entirely in the learner's browser, with no install, no account and no cost to serve. Tasks include checking and correcting AI-generated analyses, a core skill in AI-assisted workplaces. Results are verified by re-running the final submission server-side and can be shared with advisors and employers. With learner consent, every run, error and workbench action is logged and released de-identified, together with the task bank and its scoring harness, so researchers can study how adults learn to do authentic technical work, and test which feedback helps them.

## 7. Publishing the challenge set as a public benchmark

### 7.1 What a benchmark is

A benchmark is a **fixed, versioned set of tasks plus an automatic scorer**, published so that anyone can run their own system on the same tasks and compare results. The tasks are the questions; the scorer turns an attempt into a number with no human in the loop; and the version freezes both, so a number reported in 2027 still means the same thing in 2029. Well-known examples in code are HumanEval (164 Python problems with unit tests) and MBPP (about 1,000 short Python problems); researchers use them to measure code-generation models.

Dataslope already has the expensive half. Counted in this repository:

| Source | Count | Has tests | Has a reference solution |
| --- | --- | --- | --- |
| Challenge catalog (`lib/challenges/`) | ~300 | yes | yes (`solutionCode`, per language) |
| In-lesson code challenge cards (`content/`) | ~640 | yes | yes (`solutionCode`) |
| In-lesson SQL challenge cards | ~57 | yes | yes (`solutionSql`) |

The reference solutions are already submitted and checked against their own tests by an end-to-end sweep (`e2e/challenge-solutions.spec.ts` for the lesson cards), which is the property a benchmark most needs and most often gets wrong.

### 7.2 Why it matters to this competition

The official rules ask every entrant for "public goods and shared infrastructure, such as datasets, benchmarks, and evaluation frameworks". A published task bank answers that directly. It is also more useful to education researchers than another "can a model solve it" set, because frontier models already solve beginner problems. Two more useful uses:

- **An item bank for assessment research.** Once learners attempt the tasks, each one gets a measured difficulty and a list of common wrong answers. Calibrated, open, auto-scored items are reusable by anyone building an assessment.
- **A benchmark for AI feedback.** Pair each task with real wrong attempts from consenting learners and their test results, and the question becomes: given this learner's broken code, does a tutor's hint lead them to a fix without giving the answer away? That is a question AI-tutoring researchers need answered and have few open datasets for, and it only exists if the logging in §6.3 exists.

### 7.3 How to publish it

1. **Export.** A script that walks `lib/challenges/` and the challenge cards in `content/` and writes one JSON record per task: id, language or SQL dialect, instructions, starter code, reference solution, tests, setup data (`initSql`, datasets), difficulty, skill tags, and the source lesson's URL.
2. **Scorer.** A command-line harness that runs a submission against a task's tests headlessly, reusing the runners and harnesses the site already has, packaged as a container so results reproduce.
3. **Validate.** Every reference solution passes and every starter fails; drop or fix the tasks that do not.
4. **Split.** Publish most tasks openly and hold a test split back, scoring it on request; anything public ends up in model training data, which quietly inflates scores. Add a canary string to the released files so model builders can filter them out.
5. **Document.** A datasheet: what the tasks are, where they came from, who wrote them, intended uses, known limits.
6. **Host and cite.** A GitHub repository for the code, a Hugging Face dataset for the tasks, and a Zenodo DOI so papers can cite a specific version.
7. **Baselines.** Run a few open models and report the scores, so the first user has something to compare against.

### 7.4 The licence question

The content is CC BY-NC 4.0. Fine for academic research; but whether evaluating a commercial model counts as commercial use is unclear, and that ambiguity alone stops some labs and companies from using an NC benchmark. If wide use matters more than the restriction, release the benchmark subset under CC BY 4.0 and keep the course content as it is. That is a decision for the owner, not something the competition requires.

## 8. Before 13 October

- [x] Confirm the applicant's base: US. Track: Navigating Postsecondary Learning and Work.
- [x] Choose the level: Catalyst.
- [ ] Take the eligibility quiz to confirm: <https://toolscompetition.fillout.com/27-eligibility-quiz>.
- [ ] Read the abstract form's actual questions, word limit and deadline time zone: <https://tools-competition.org/27-submissions/>.
- [ ] Write the abstract around §6.3, with the learning-engineering intention and the public goods (§7) stated explicitly. State the current numbers plainly; Catalyst does not penalise a small base.
- [ ] Optional but useful: book office hours (<https://toolscompetition.fillout.com/office-hours>) and ask whether a second entry in Building Better Datasets is allowed.
- [ ] After submitting: start on a research partner (the competition's researcher database) and some evidence of demand, both for Phase II in January.

## Caveats

- Competition facts come from its own pages, read on 2026-10-04. Some fetches returned text from the previous cycle ("Phase II is now closed"); the dates above come from the homepage, the 2027 official rules and the 2027 track pages, which agree with each other. Confirm on the site.
- The postsecondary page mentions a supplemental Open edX Deployment Prize (up to $100,000) that was not corroborated elsewhere. Dataslope is not built on Open edX, so it is unlikely to apply.
- Challenge counts in §7.1 are from grepping this repository and are approximate.
- Nothing here measures Dataslope's efficacy; there is no data on it yet.

## Sources

- Tools Competition home: <https://tools-competition.org/>
- 2027 overview: <https://tools-competition.org/27-overview/>
- 2027 official rules: <https://tools-competition.org/27-official-rules/>
- FAQ: <https://tools-competition.org/faq/>
- Navigating Postsecondary Learning and Work: <https://tools-competition.org/27-postsecondary/>
- Building Better Datasets: <https://tools-competition.org/27-datasets/>
- Reimagining K-12 Assessment: <https://tools-competition.org/27-assessment/>
- Strengthening K-12 Teaching: <https://tools-competition.org/27-teaching/>
- Learning engineering: <https://tools-competition.org/learning-engineering/>
- Runestone Academy, Learning Engineering and Analytics Portal: <https://guide.runestone.academy/Introduction.html>
- Announcement (third party, dated 2026-09-11): <https://opportunitiesforyouth.org/2026/09/11/2027-tools-competition-multi-million-dollar-funding-opportunity-for-innovative-education-technology-ai-tools-and-learning-datasets/>
