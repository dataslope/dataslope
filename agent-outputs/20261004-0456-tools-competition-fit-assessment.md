# Tools Competition: Is Dataslope a Candidate?

**Date:** 2026-10-04 (revised the same day with the owner's answers: US-based, ~100 members, ~50 unique visits a day, willing to log research data and update the privacy policy; revised again after the owner asked whether re-adding AI could be the new feature)
**Question:** Could Dataslope apply to the Tools Competition (<https://tools-competition.org/>), and with what?
**Next:** the application strategy, built from past winners, is `agent-outputs/20261004-2210-tools-competition-application-strategy.md`.
**Method:** the competition's public pages for the 2027 cycle (overview, official rules, FAQ, the four track pages, the learning-engineering page), read against what this repository says Dataslope is and does.

**Short answer:** yes. Enter the **Navigating Postsecondary Learning and Work** track at the **Catalyst** level ($50,000).

- **Eligible.** The track is open to entrants "based in the United States and serving U.S. learners", which Dataslope is.
- **Catalyst is the right level.** The rules define it to include "Entrants with an existing tool with a non-existent or limited user base", and the track page says "There is no minimum number of users required at this level." About 100 members and 50 visits a day is a limited user base; Growth asks for "some users and scale" and would invite a demand question the numbers cannot answer yet.
- **No partner is required.** Not a community college, not an employer, not a researcher, at any level, in any track (§3.1). A partner helps the equity and demand scores; its absence does not disqualify.
- **The research-data condition is met** by the owner's willingness to add opt-in logging and change the privacy policy.

What is left is **novelty**. A Catalyst proposal "must detail how funding will be used to create or develop the tool", so the money has to build something that does not exist yet. §6 works through the candidate ideas. The recommendation is to **re-add AI, rebuilt as hints designed for learning**: offered only after a failed attempt, checked by running a hidden fix in the learner's browser before they are shown, and judged by what learners can then do without them (§6.3). AI autocomplete stays out. Work-sample skill checks (§6.4) remain the alternative.

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
- **How it teaches.** ~3,900 runnable code blocks, ~3,270 multiple-choice checks with per-choice explanations, and roughly a thousand auto-graded challenges (§7). 14 language runtimes execute in WebAssembly on the learner's device, plus Git and Bash playgrounds.
- **The SQL workbench.** Not a query box: a schema tree with tables, views, indexes and triggers; multiple query tabs; a sortable, filterable, editable result grid; `EXPLAIN`; import and export; three real engines (PostgreSQL via PGlite, DuckDB, SQLite) with sample databases loaded (`README.md`, "SQL workbench"; `app/playground/{postgres,duckdb,sqlite}`).
- **Price.** Free with or without an account; the terms commit that free content stays free. A Pro tier exists in code but is hidden (`SHOW_PRO_PLAN = false`).
- **AI.** None today. An "Ask AI" chat (signed-in only, answering with the lesson page as context) and a Pro-only AI autocomplete were built, then removed on 2026-09-25 in #696; at removal their usage tables held 14 + 14 daily counter rows and 2 rated answers (`DEVELOPMENT.md`, `migrations/auth/0011_drop_ai_tables.sql`).
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

The postsecondary track targets learners who "are often working or raising families, are the first in their families to attend college, and have limited financial resources", including people "transitioning between education and work", and wants them to build "durable, technical, and AI-related skills". It has three lanes: *Teaching, Learning and Skill Development*; *Assessment and Skills Recognition* (formative assessment, portfolios, digital credentials, competency-based education); and *Learner Success and Pathways*. Dataslope's content sits in the first, and so does the recommended proposal (§6.3); the alternative (§6.4) sits in the second.

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
| Novelty | Low. A strong free course site in a crowded category; its real differentiators (14 runtimes client-side, the SQL workbench, no login) already exist, so a grant cannot fund them. | Medium. AI coding help is crowded, so novelty rests on hints checked by execution and on measuring unassisted learning (§6.3). |
| Impact | Unknown. No efficacy evidence. | To be measured; the proposal should say how. |
| Equity | Medium. Free and account-free; but English only, heavy first downloads, no outreach. | Medium to high with a named learner group and a low-bandwidth plan. |
| Demand | Low: ~100 members, ~50 visits a day. Acceptable at Catalyst, which needs no users. | Strengthen with learner interviews or a waitlist before Phase II. |
| Learning engineering | Low today, by design. | High: a randomized study of hint designs with an unassisted outcome is learning engineering in the competition's own terms. |
| Scalability | High. Edge-served, client-executed, near-zero marginal cost, open licences. | Still high for practice. AI hints add the one per-learner cost, which §6.3 bounds. |

## 5. Remaining gaps, most expensive first

1. ~~US eligibility.~~ Resolved: US-based.
2. **Novelty.** The central question now; see §6.
3. **Learning engineering.** Committed in principle. The proposal needs to name what will be logged, the consent flow, how researchers get access, and two or three research questions.
4. **Demand.** Low but adequate for Catalyst. Anything that shows learners want the new thing helps: a waitlist, a short survey of current members, a few quotes.
5. **Equity targeting.** Name the learners, address bandwidth (a service worker that caches runtimes; steering a first visit to the lighter runtimes), and say how the work reaches people who would not find it on their own.
6. **AI cost and trust** (if §6.3). The only per-learner cost in the product, and learner code sent to a model provider. §6.3 covers both; the abstract should too.
7. **Content licence (minor).** CC BY-NC supports the public-goods argument and allows classroom use, but bars commercial reuse. Worth one sentence.

## 6. Making it new

### 6.1 The rule to write by

The competition funds what the money creates, and judges its novelty against what already exists in the field. Features Dataslope already has are not the proposal; they are the reason the proposal is credible and cheap. Put them in the "why us" paragraph, and put the new thing in the first sentence.

### 6.2 The candidate ideas

| Idea | Exists? | As the novelty | Where it belongs in the proposal |
| --- | --- | --- | --- |
| WASM runtimes: unlimited execution, no login | Yes | No. In-browser runtimes are established (Pyodide, JupyterLite, DuckDB-WASM), and the grant cannot fund what is built. | **The enabler.** It is the scalability and equity argument: practice costs nothing to serve, and nobody has to sign up. It is also what makes the hint check in §6.3 free. |
| Embedded exercises, including SQL | Yes | No. Embedded auto-graded exercises are the norm. Reviewers from the learning-engineering community will also know Runestone Academy: free, open-source interactive CS textbooks with runnable code, an instructor side, and its own Learning Engineering and Analytics Portal. "Free interactive textbook with research data" is taken. | The raw material: ~1,000 challenges with tests and reference solutions (§7). |
| Full-IDE SQL workbench, three engines | Yes, and unusual | Not on its own: it is built, and browser SQL tools exist outside education. | The environment for §6.4, and a strong "why us". |
| Programmatic videos with Remotion | No | Weak as the centerpiece. It changes how lessons are produced, not what a learner can do, and video is a passive format the rubric's "likelihood to improve learning" will not favour over practice. | A later experiment arm (video vs. text worked examples), not the pitch. |
| **Ask AI and AI autocomplete, re-added for learning** | Removed | **Yes, if rebuilt as a different feature** (§6.3). AI coding help as such is the most crowded idea in the category; the novelty has to come from how the help is checked and from measuring what learners can do without it. Leave autocomplete out. | **The recommended core.** |

### 6.3 Recommended: AI hints built for learning

**Verdict.** Re-adding AI can be the new feature, and the 2027 cycle invites it. The overview says "The strongest proposals will show not only what AI can enable, but how it can be responsibly used, trusted, and sustained in real learning environments", asks entrants to "Embed safety, privacy, and responsibility into tool design and implementation", and calls this "a critical moment to build tools steeped in evidence that people can trust". Three conditions decide whether a re-added AI counts as new.

**1. It must be a different feature from the one removed.** The old Ask AI (removed 2026-09-25 in #696) was a general chat that answered questions with the lesson page as context, for signed-in users only; the autocomplete was Pro-only ghost text. Neither was designed around learning, and when they were removed the usage tables held 14 + 14 daily counter rows and 2 rated answers. Re-adding either as it was would read as a feature, not a tool, and the old usage cannot be offered as demand.

**2. Leave AI autocomplete out.** The evidence runs against it for beginners:

- Prather et al. (ICER 2024) observed 21 novices programming with generative AI. Those already doing well went faster; those who were struggling picked up new metacognitive difficulties on top of the old ones: interruption from frequent AI suggestions, misleading code suggestions, and a false sense of progress. Ghost-text autocomplete is the form that delivers all three.
- Bastani et al. (PNAS 2025), a field experiment with nearly a thousand high-school maths students: unrestricted GPT-4 raised practice performance by 48% and lowered exam performance by 17% once access was removed. A version with guardrails raised practice performance by 127% and left exam performance about where the control group's was. **The guardrails removed the harm; they did not produce a gain.**

The language autocomplete that is not AI (clang, Roslyn, the TypeScript service, the static lists) is unaffected and stays.

**3. The novelty must come from what only Dataslope can do, and from the evidence.** Pedagogically guarded chat already exists (CS50's duck, presented at SIGCSE 2024), and generating hints from failing tests and then validating them is published work (Phung et al., LAK 2024, validate hints with a simulated student model). What Dataslope adds:

- **Hints checked by execution.** With each hint the model also writes a hidden candidate fix. The learner's own browser runs that fix against the challenge's tests in the runtime already loaded, and the hint is shown only if the fix passes. Help that is confidently wrong, Prather's "misleading code suggestions", is filtered out before the learner sees it, in all 14 runtimes, at no server cost for the check. Model-written code runs in the same sandbox as the learner's own.
- **Grounded in what actually happened.** The hint is written from the challenge, the learner's code, and the real test results and errors of the run they just made, not from the model's guess at what the code would do.
- **Measured on work done without it.** Courses revisit skills, so tagging challenges by skill turns a later one into a ready-made unassisted post-test. That puts Bastani's question to a population with much less evidence behind it: self-directed adults learning on their own, outside a classroom. Most of the published studies are classroom studies.

**What the $50,000 builds:**

- **Help after an attempt, on that attempt.** A "Get a hint" button on a failing test, not a chat box. Nothing before the first run.
- **A ladder, one rung at a time:** what the failing test expected and what it got; which concept is involved, posed as a question; which line to look at; a worked example on a different problem. Never the solution code: the existing "Reveal solution?" button stays the separate, explicit way out.
- **A line of self-explanation** before the third rung: the learner writes what they think is wrong.
- **Fading:** fewer rungs offered as a learner shows mastery of a skill.
- **A fallback:** if no verified fix can be found, say so and offer the first rung only, rather than an unchecked hint.
- **Opt-in logging:** attempt, rung shown, verified or rejected, next edit, pass or fail, and the later unassisted result.

**The study (the learning-engineering core).** Randomize consenting learners, per skill, between no AI hints, AI hints, and execution-verified AI hints. Measure practice success, success on the later same-skill challenge with no help available, and return within seven days. Leave out an unrestricted-chat arm: Bastani has already shown it harms, and an ethics board will ask why it is there. The question, in one line: **can AI help be designed to improve what learners can do without it, not merely avoid harming it?**

**Running cost: the part reviewers will probe hardest.** Everything else in Dataslope costs nothing per learner; AI does not, and the competition's word is "sustained".

- Hints only after a failed attempt, short, from a small model, under per-user daily caps and a global daily ceiling. Both caps were designed and built before (`agent-outputs/20260701-1107-ask-ai-cloudflare-implementation.md`).
- **Cache by failure signature.** Learners fail the same test the same way. Key verified hints on challenge, failing test and error signature, and reuse them. Every new learner raises the hit rate, so the cost per learner should fall as use grows. That is a hypothesis to measure, and a good one to state.
- Pre-generate and verify hints offline for the most common failures, starting with the biggest courses.
- Keep "no sign-up": guests get a few hints a day behind Cloudflare Turnstile, which the old design also covered.

**Trust and privacy.** Learner code goes to a model provider, so the privacy policy, a consent step, and a provider whose terms exclude training on and retaining the data all need to be in place. The old design's rule that code, program output and lesson text are data, never instructions, carries over.

**Public goods.** The hint system, released under MIT like the rest of the code, and a de-identified dataset of challenge, code, failing test, rung shown, verification result, outcome and later unassisted result. Real attempts paired with the hints given and what happened next are scarce, and AI-tutoring research needs them. This meets the public-goods rule without the benchmark (§7).

**Draft pitch paragraph.** The abstract form's questions and word limit are not on the public pages, so this is a starting point to cut to fit:

> AI makes beginners faster at practice and, without guardrails, worse on their own: in a field experiment, students who practised with unrestricted GPT-4 scored 17% lower once it was taken away, and guardrails only brought them back to even. Dataslope, a free platform where Python, SQL and a dozen other languages run entirely in the learner's browser, will build AI hints designed to leave career changers able to code without them. Help is offered only after a failed attempt, one step at a time, and never as the answer. Each hint is backed by a hidden fix that the learner's own browser runs against the challenge's tests before the hint is shown, so wrong help never reaches the learner, at no server cost. With consent, we will randomize hint designs and measure what matters: whether learners then solve a later problem on the same skill with no help at all. The hint system and a de-identified dataset of attempts, hints and outcomes will be released openly.

### 6.4 Alternative: work-sample skill checks for entry-level data jobs

Still sound, and the better choice if AI's running cost or the provider question is a dealbreaker. **One sentence:** free, browser-based work-sample assessments for entry-level data roles, done in the SQL and Python workbench, auto-scored, verifiable, and instrumented for research.

1. **Authentic tasks, not exercises.** A short, realistic job task in the full workbench: a messy table to clean, a stakeholder question to answer with a query, a slow query to diagnose with `EXPLAIN`, a CSV to import and join. Scored on the result. One role first (data analyst), mapped to a published competency list.
2. **AI-era tasks.** The learner is handed an AI-written query or analysis with a subtle error and must find and fix it. The flawed artefacts are generated once, offline, so nothing runs per learner. These fit inside §6.3 too, as one more kind of challenge.
3. **Results others can verify.** Claiming a result re-runs the final submission once, server-side, against hidden tests, reusing the headless runners in `scripts/lib/block-runners.mjs` (PGlite and DuckDB also run under Node). This is the *Assessment and Skills Recognition* lane.
4. **A research instrument underneath.** The same opt-in logging, plus workbench actions (tables browsed, tabs opened, `EXPLAIN` used).

It costs nothing per learner to run, but needs new tasks written, and its research question is less sharp than §6.3's.

## 7. The public benchmark (set aside)

The owner is not pursuing this. For reference: a benchmark is a fixed, versioned set of tasks plus an automatic scorer, published so others can compare their systems on the same tasks. Dataslope's challenges would be most of one: ~300 in the catalog (`lib/challenges/`), ~640 code and ~57 SQL challenge cards in lessons, all with tests and reference solutions, which an end-to-end sweep already checks (`e2e/challenge-solutions.spec.ts`). The competition does not require a benchmark; §6.3's dataset and open-source hint system meet the public-goods rule.

## 8. Before 13 October

- [x] Confirm the applicant's base: US. Track: Navigating Postsecondary Learning and Work.
- [x] Choose the level: Catalyst.
- [ ] Decide between §6.3 (AI hints, recommended) and §6.4 (work-sample checks).
- [ ] Take the eligibility quiz to confirm: <https://toolscompetition.fillout.com/27-eligibility-quiz>.
- [ ] Read the abstract form's actual questions, word limit and deadline time zone: <https://tools-competition.org/27-submissions/>.
- [ ] Write the abstract around the chosen concept, stating the research intention, the public goods, and (for §6.3) how cost and privacy are handled. State the current numbers plainly; Catalyst does not penalise a small base.
- [ ] Optional but useful: book office hours (<https://toolscompetition.fillout.com/office-hours>) and ask whether a second entry in Building Better Datasets is allowed.
- [ ] After submitting: find a research partner (the competition's researcher database), who will also carry the ethics review the study in §6.3 needs, and gather some evidence of demand, both for Phase II in January.

## Caveats

- Competition facts come from its own pages, read on 2026-10-04. Some fetches returned text from the previous cycle ("Phase II is now closed"); the dates above come from the homepage, the 2027 official rules and the 2027 track pages, which agree with each other. Confirm on the site.
- The postsecondary page mentions a supplemental Open edX Deployment Prize (up to $100,000) that was not corroborated elsewhere. Dataslope is not built on Open edX, so it is unlikely to apply.
- Challenge counts are from grepping this repository and are approximate.
- The research findings in §6.3 are summarised from the papers' abstracts and coverage; read the papers before quoting their numbers in a proposal.
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
- Bastani et al., "Generative AI without guardrails can harm learning: Evidence from high school mathematics", PNAS 2025: <https://papers.ssrn.com/abstract=4895486>
- Prather et al., "The Widening Gap: The Benefits and Harms of Generative AI for Novice Programmers", ICER 2024: <https://arxiv.org/abs/2405.17739>
- Liu et al., "Teaching CS50 with AI", SIGCSE 2024: <https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf>
- Phung et al., "Automating Human Tutor-Style Programming Feedback: Leveraging GPT-4 Tutor Model for Hint Generation and GPT-3.5 Student Model for Hint Validation", LAK 2024: <https://arxiv.org/abs/2310.03780>
- The PR that removed both AI features: <https://github.com/dataslope/dataslope/pull/696>
- Announcement (third party, dated 2026-09-11): <https://opportunitiesforyouth.org/2026/09/11/2027-tools-competition-multi-million-dollar-funding-opportunity-for-innovative-education-technology-ai-tools-and-learning-datasets/>
