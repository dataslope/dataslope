# Tools Competition: Is Dataslope a Candidate?

**Date:** 2026-10-04
**Question:** Could Dataslope apply to the Tools Competition (<https://tools-competition.org/>)?
**Method:** the competition's public pages for the 2027 cycle (overview, official rules, FAQ, the four track pages, the learning-engineering page), read against what this repository says Dataslope is and does.

**Short answer:** yes, plausibly, but not as the site stands. The fit is the 2027 cycle's **Navigating Postsecondary Learning and Work** track, at the **Growth** level ($150k) if Dataslope can show real active users, or **Catalyst** ($50k) if it cannot. Three conditions decide whether that is a real application or a long shot:

1. **The applicant is based in the US.** That track is closed to everyone else. If that fails, the fallback is the worldwide **Building Better Datasets** track (§3.2); the two K-12 tracks are a poor fit.
2. **The proposal is a new capability built on Dataslope**, not Dataslope itself. The competition funds something "fresh, innovative, or original", and a free in-browser course site is not that on its own.
3. **Dataslope commits to research data infrastructure it deliberately does not have today.** Every entry is judged on its ability to "generate novel learning data that researchers can study", and the site currently stores only per-challenge verdicts for signed-in users.

The Phase I abstract is due **Tuesday 13 October 2026**, nine days from this report. An abstract is short and asks for the idea, not the evidence, so the deadline is reachable; Phase II (the full proposal, with a research plan) is due 21 January 2027.

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

| Level | Award | Who it is for |
| --- | --- | --- |
| Catalyst | $50,000 | New ideas, or tools with no or a limited user base |
| Growth | $150,000 | An existing MVP "with some users and scale", ready to expand |
| Transform | $300,000 | Established platforms with 10,000+ users (optional even then) |

"Active users" means "individuals who are currently using your tool regularly", not dormant accounts or pilot testers. Growth and Transform entries "must build off an existing platform".

**Who can enter:** anyone 18 or over, alone or in a team, with or without a company; companies (for-profit included), nonprofits, researchers and students. Winners need to be able to receive US-dollar payments. Everything is in English.

**What every entry is judged on** (identical six-point rubric on each track page):

1. Novelty of the tool and technology
2. Potential impact and likelihood to improve learning
3. Attention to equity, for historically marginalized populations
4. Demand from learners, families and educators
5. Ability to support learning engineering
6. Ability to scale to more users and/or domains

**Two obligations that apply to every entry:**

- **Learning engineering.** Catalyst entries must "describe the tool's potential to contribute to learning science research and demonstrate an intention to support research at scale". Growth and Transform entries must "include a plan to support learning science research" in Phase II. The learning-engineering page spells out what that looks like: describe the data the tool collects, know the research questions it can answer, partner with researchers, share data with them, and build infrastructure for experimentation (it cites UpGrade, Carnegie Learning's A/B platform, and ASSISTments' research partnerships). The competition runs a database of researchers to help find a partner.
- **Public goods.** The official rules require entrants to "detail how their tool or technology will generate public goods and shared infrastructure, such as datasets, benchmarks, and evaluation frameworks."

**One thing to know before submitting:** the rules give the competition the right to "publish and communicate to the public" submitted content. Nothing in an abstract should be confidential.

## 2. Dataslope, as this repository describes it

The facts the assessment rests on, each checked against the code:

- **What it is.** "Courses and coding playgrounds that run entirely in your browser. No install, no setup, no sign-up, no paywall." (`README.md`). 32 courses (~850 pages: Python and data science, SQL on Postgres/DuckDB/SQLite, R, JavaScript/TypeScript/React/CSS, C, C++, Java, C#, and a `how-llms-work` course) and 6 role-based interview tracks (data analyst, data scientist, data engineer, analytics engineer, ML engineer, backend engineer) under `content/`.
- **How it teaches.** ~3,900 runnable code blocks, ~830 auto-graded in-lesson challenges plus a separate catalog of ~300 (`lib/challenges/`), ~3,270 multiple-choice checks with per-choice explanations, ~740 charts. 14 language runtimes execute in WebAssembly on the learner's device, plus Git and Bash playgrounds.
- **Who it is for.** Never stated. The signals (beginner-to-intermediate courses, interview prep by job role) point to self-directed adults moving into data and software work. There is no K-12 or institutional positioning, and the privacy page says the service is not directed at children (`app/privacy/page.tsx`).
- **Price.** Free, with or without an account; a free account adds cloud saves and share links (`app/pricing/page.tsx`). A Pro tier exists in code but is hidden (`SHOW_PRO_PLAN = false`, `app/_components/home/PricingSection.tsx`). The terms commit that content free today stays free.
- **AI.** None. An "Ask AI" assistant and AI autocomplete were built and removed (`DEVELOPMENT.md`, "The site has no AI features"; `migrations/auth/0011_drop_ai_tables.sql`).
- **Learner data.** Deliberately minimal. Guests keep challenge progress in `localStorage`; signed-in users sync only the verdict per challenge (`passed_steps`, `solved`, `attempted`, `solved_at`) to D1, and "only the verdicts are stored, not the learner's code" (`migrations/auth/0010_create_challenge_progress.sql`). No attempt log, no event stream, no quiz answers, no lesson-completion tracking. Site analytics are cookieless and aggregate (Cloudflare Web Analytics). No research export.
- **Educators.** No teacher, classroom or institution features.
- **Licensing.** Code MIT (`LICENSE`); learning content, illustrations and charts CC BY-NC 4.0, classroom use explicitly allowed (`LICENSE-CONTENT`).
- **Traction.** No user counts anywhere in the repository; `scripts/build-home-stats.mjs` counts content, not people.
- **Reach limits.** English only. Some runtimes are large first-time downloads (~35 MB for .NET, ~18 MB for the Java `tools.jar`), and there is no offline mode or service worker. Once a runtime is cached, nothing runs on a server.

## 3. Track by track

| Track | Audience | Open to | Fit |
| --- | --- | --- | --- |
| Navigating Postsecondary Learning and Work | Postsecondary and workforce | **US-based, serving US learners** | **Good**, conditional on US base |
| Building Better Datasets ($100k) | K-12 and postsecondary data | Worldwide | Possible, as a dataset project |
| Reimagining K-12 Assessment | Primarily K-12 | Worldwide | Weak |
| Strengthening K-12 Teaching | K-12 educators | Worldwide | None |

### 3.1 Navigating Postsecondary Learning and Work: the fit

The track describes Dataslope's natural learner almost word for word. It targets community colleges, vocational-technical schools and broad-access universities, and learners who "are often working or raising families, are the first in their families to attend college, and have limited financial resources", including people "transitioning between education and work" and "navigating career changes". It wants learners to build "durable, technical, and AI-related skills" for "an increasingly AI-driven world".

It has three lanes, and Dataslope already sits in two of them:

- **Teaching, Learning and Skill Development:** technical skills in Python, SQL, statistics, machine learning, and how LLMs work.
- **Assessment and Skills Recognition** (formative assessment, portfolios, digital credentials, competency-based education): ~1,100 auto-graded challenges and six role-aligned interview tracks are raw material for exactly this, though nothing today turns them into recognised evidence of skill.
- **Learner Success and Pathways** (advising, career exploration, employment connections): only indirectly, through the interview tracks.

Two things the track rewards that Dataslope already has, and should lead with: it costs the learner nothing and asks for no account, which removes the two commonest barriers for working and low-income learners; and execution happens on the learner's device, so serving one more learner costs almost nothing, which is the scalability criterion answered by architecture rather than by a budget line.

The track page also mentions a supplemental **Open edX Deployment Prize** (up to $100k, with matching) for deploying in live courses. That was not corroborated anywhere else and is worth checking on the page directly; Dataslope is not built on Open edX, so it is probably not relevant.

### 3.2 Building Better Datasets: the fallback

This track funds "data collection and processing, limiting product development", is open worldwide, and has a competitive priority for data on "attention and engagement", naming "log data, keystrokes, interaction traces, behavioral data". A browser editor that already runs the learner's code is a natural instrument for programming-process data: every edit, run, error and test verdict across 14 languages, from adult self-directed learners rather than a single university course.

The catch is that Dataslope collects none of this today, so the entry would be a proposal to build the collection (with consent, de-identification and a release licence) and then collect. It is the right track if the applicant is not US-based, and a reasonable second entry if they are (the FAQ does not address entering two tracks; check before doing it).

### 3.3 The K-12 tracks

**Assessment** "primarily" targets K-12 and requires funded tools to be "made available for free or at cost", which Dataslope already meets. But nothing about the site is aimed at schools, the privacy policy says it is not directed at children, and a school-age audience brings student-data obligations the site is not set up for. A high-school pivot is conceivable (three Java courses sit close to AP Computer Science A), but it would be a different product with a different audience, and is not recommended on a nine-day clock. **Teaching** targets K-12 educators and has no overlap.

## 4. Against the rubric (postsecondary track)

| Criterion | Dataslope today | With the proposal in §6 |
| --- | --- | --- |
| Novelty | Low. A strong free course site, but the category is crowded. The genuine differentiators are architectural: 14 runtimes client-side, no login, no server compute. | Medium to high, if the new piece is skills evidence and a research instrument rather than more content. |
| Impact | Unknown. No efficacy evidence of any kind. | Still to be shown; the proposal should say how it will be measured (completion, challenge mastery, job-relevant outcomes). |
| Equity | Medium. Free and account-free is a real equity argument. Against it: no targeted outreach, English only, heavy first downloads on metered mobile data, no offline mode. | Medium to high with a community-college partner and a low-bandwidth plan. |
| Demand | **Unknown.** Nothing in the repository says how many people use the site. This is the number the tier choice hangs on. | Needs real numbers in the abstract. |
| Learning engineering | **Low.** By design the site keeps almost nothing about how a learner got to an answer. | **High potential.** Client-side execution makes rich process data cheap to capture; the gap is consent, logging, export and a research partner, not technology. |
| Scalability | **High.** Edge-served, client-executed, near-zero marginal cost; open licences. | Unchanged. |

## 5. The gaps, most expensive first

1. **US eligibility.** A gate, not a score. Unknown from the repository.
2. **Learning engineering.** The privacy-minimal design that is a feature for learners is the competition's weakest criterion for Dataslope. Closing it means an **opt-in** research consent flow, de-identified attempt-level logging (runs, errors, test results, optionally code snapshots), a documented export, an experimentation hook for A/B tests, a privacy-policy change, and a named research partner with ethics review by Phase II. For a Catalyst abstract, a credible stated intention is enough; for Growth it needs to be a plan.
3. **Demand evidence.** Pull what exists before writing: monthly visitors from Cloudflare Web Analytics, the account count and active accounts from D1, challenges solved from `challenge_progress`, plus any unsolicited learner or instructor feedback. Then pick the tier honestly against the "active users" definition.
4. **Novelty.** The abstract has to describe something that does not exist yet; "we built a great free course site" will read as a request to fund what is already done.
5. **Equity targeting.** Name the learners (community-college students, career changers, working adults), name a partner who reaches them, and address bandwidth: a service worker that caches runtimes, and steering first-time learners to the lighter runtimes, both strengthen the equity score cheaply.
6. **Educator surface.** Community colleges reach learners through instructors, and Dataslope has nothing for one. Even a minimal "class code plus aggregate progress" view changes the adoption story.
7. **Content licence (minor).** CC BY-NC already supports the public-goods argument and allows classroom use. It does bar commercial reuse, which some reviewers may weigh against "shared infrastructure"; worth a sentence, not a change.

## 6. What to propose

### Recommended: verifiable proof of skill, with a research instrument underneath

A free, competency-based skills record for data and software roles, built from Dataslope's auto-graded, in-browser challenges, aimed at community-college students and career changers.

- **For the learner.** Role skill maps (from the six interview tracks) broken into competencies; each competency evidenced by challenges solved in the browser; a shareable record an advisor, instructor or employer can verify. This puts it in the track's *Assessment and Skills Recognition* lane, with *Skill Development* (including the AI-related skills of the ML, NLP and LLM courses) underneath.
- **For the instructor.** Assign a path with a class code; see aggregate mastery; no grading load, because the challenges grade themselves.
- **For researchers.** Opt-in programming-process logging in an open format (ProgSnap2 is the established one for this kind of data), an A/B hook for testing feedback and hint designs, and periodic de-identified dataset releases with a research partner. Questions it can answer: which errors predict abandonment, whether worked examples or hints help adult learners more, how skill transfers between languages.
- **The public good.** The challenge set itself (prompts, tests, reference solutions across 14 languages) is a ready-made benchmark and evaluation framework, which is exactly the shared infrastructure the rules ask for. The released process data is the second.
- **Level.** Growth if the user numbers support it; Catalyst otherwise.

**AI is optional, and should stay so.** The competition wants AI used "responsibly, trusted, and sustained"; Dataslope removed its AI features, and reintroducing them adds a per-learner cost the rest of the architecture avoids. If it appears at all, it should be as a research question (does AI feedback beat static hints for these learners, measured by A/B) rather than as the product.

### Fallback: an open programming-process dataset

If the postsecondary track is unavailable, the same logging, collection and release, entered in *Building Better Datasets* ($100k, worldwide), pitched at the attention-and-engagement priority: interaction traces from adult learners across many languages, released with documentation and a privacy review.

## 7. Before 13 October

- [ ] Confirm the applicant's base (US or not) and pick the track accordingly.
- [ ] Take the eligibility quiz: <https://toolscompetition.fillout.com/27-eligibility-quiz>.
- [ ] Pull usage numbers (§5.3) and choose the level.
- [ ] Draft the abstract around the new capability (§6), stating the learning-engineering intention and the public goods explicitly. The public pages do not give the abstract's questions or word limit; read them on the submission form (<https://tools-competition.org/27-submissions/>), and check its time zone.
- [ ] Optional: book office hours (<https://toolscompetition.fillout.com/office-hours>).
- [ ] After submitting: start looking for a research partner (the competition's researcher database), needed for Phase II in January.

## 8. Questions only you can answer

1. Where would the applicant be based, as an individual or a company?
2. Roughly how many people use Dataslope in a typical month, and how many come back?
3. Are you willing to add opt-in research logging, and to change the privacy policy to describe it? The competition is built around this, so a "no" here is close to a "no" overall.
4. Do you have, or could you get within a few months, a community-college, workforce or university partner?

## Caveats

- Facts about the competition come from its own pages, read on 2026-10-04. One fetch of the overview page returned text from the previous cycle ("Phase II is now closed", a 2025 launch date); the dates above are from the homepage, the 2027 official rules and the 2027 track pages, which agree with each other. Confirm on the site before relying on them.
- The Open edX Deployment Prize is mentioned on the postsecondary track page only and was not corroborated.
- Nothing in this report measures Dataslope's traction or efficacy; the repository has no data on either.

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
- Announcement (third party, dated 2026-09-11): <https://opportunitiesforyouth.org/2026/09/11/2027-tools-competition-multi-million-dollar-funding-opportunity-for-innovative-education-technology-ai-tools-and-learning-datasets/>
