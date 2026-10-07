# Tools Competition 2027: Application Strategy

**Date:** 2026-10-04
**Builds on:** `agent-outputs/20261004-0456-tools-competition-fit-assessment.md` (the fit assessment: postsecondary track, Catalyst level, AI hints built for learning as the core).
**Evidence:** every past winner in the competition's own directory (171 in total, 37 of them in the postsecondary/adult tracks, each winner page read for level, team, AI use and partners); the 2025 and 2026 postsecondary finalist and winner pages; the 2027 rules, track page and Phase I guidance; and the organizers' published reasons abstracts did not advance.

## The strategy in one paragraph

Submit **one** abstract to *Navigating Postsecondary Learning and Work* at **Catalyst**, scoped tightly: AI hints for Python and SQL challenges that are **checked by running code before a learner sees them** and **judged by what the learner can then do without help**, for US adults moving into data work. Lead with the learner's problem (AI help that becomes a crutch), not with AI. The record says Catalyst winners in this track are almost never solo and almost always research-grounded, and that weak demand evidence sinks abstracts; those are Dataslope's two real gaps, so spend this week closing them as far as nine days allow. Submit by Monday 12 October, a day early.

---

## 1. What the record says

### 1.1 The odds

| Postsecondary track | Abstracts | Finalists (Catalyst) | Winners (Catalyst) |
| --- | --- | --- | --- |
| 2025 | 290 | 15 (2) | 6 (**0**) |
| 2026 | ~350-360 | 16 (6) | 7 (**2**) |

Across all tracks, "typically around 20% of Phase I abstracts" advance to Phase II. So: **reaching Phase II is a realistic goal; winning at Catalyst is a long shot** (zero and two winners in the last two cycles). Phase II is worth reaching on its own account: every Phase II competitor can get reviewer feedback, and a proposal written to that standard is reusable next cycle and for other funders.

### 1.2 Who wins Catalyst in this track

Twelve Catalyst winners since the adult track began:

- **8 of 12 were led by a university or college.** The three startups each brought a research tie: a Stanford advisor (HVAC Hero), an EPFL lab (Scholé), a dataset promised to researchers (Botter).
- **None was a solo founder.** Every page lists two to four people, except one professor-led entry.
- **The two most recent are the clearest signal.** In 2026: *ARISE Cyber Labs* (George Mason with CMU learning engineers: browser-based, no-install IT labs that run on almost any laptop or phone) and *QTAO* (Arizona State with Penn State, built on two decades of Quality Talk research).
- **Catalyst is a door, not a destination.** At least one Catalyst winner (Unlocked Labs, 2022) came back at Growth (2024), and winning researchers recur across cycles.

Two encouraging precedents for Dataslope specifically: *ARISE* shows reviewers value exactly the no-install, any-device delivery Dataslope already has; and Catalyst winners rarely show users or outcome data, so a small base is not disqualifying.

### 1.3 The closest prior winners

| Winner | Cycle, level | What it is | What it means for Dataslope |
| --- | --- | --- | --- |
| **Ocobox** (My Code Kit, UK) | 2023 K-12, Catalyst | "an AI learning assistant and Python editor" that promotes "productive failure" | The nearest thing to this proposal has already won. The abstract must say what is new beyond it. |
| **Scholé** | 2024 postsecondary, Catalyst | LLM tutor ("Olé") for job-relevant data-science upskilling | Same learners, same subject. Also already funded. |
| **Codesafe** (UC Irvine) | 2024 postsecondary, Catalyst | Software-engineering and security challenges with an AI assistant | AI help on coding challenges, funded. |
| **Caselet** (UMBC) | 2023 postsecondary, Catalyst | Bite-sized data-science cases, positioned as the reasoning ChatGPT-written code does not replace | The "AI can't do your thinking" framing has worked before. |
| **QuantHub Challenge** | 2024 postsecondary, Growth | AI-driven data-science assessments with feedback | Data-skills assessment, funded. |
| **OATutor-GenAI** (UC Berkeley) | 2024 postsecondary, Growth | Open-source tutor with LLM-generated help | Open, research-backed AI help; its lab's evidence is citable (§3.3). |

The domain is fundable: coding and data-skills tools have won at Catalyst four times, three of them with AI help. The flip side is that **"AI tutor for coding" is not new to these reviewers**, and nothing in this space has won since 2024.

### 1.4 AI is no longer enough by itself

AI was central to 10 of 12 postsecondary winners in 2023-24 and 6 of 6 in 2024-25, when it was an explicit priority, and to only 2 of 7 in 2025-26. The 2027 overview asks for something narrower: "The strongest proposals will show not only what AI can enable, but how it can be responsibly used, trusted, and sustained", and calls for "tools steeped in evidence that people can trust". That favours this proposal, **if** it leads with the trust and evidence parts rather than with "AI".

### 1.5 Why abstracts fail, mapped to Dataslope

The organizers' own list for 2026, with Dataslope's exposure:

| Reason given | Exposure | Why |
| --- | --- | --- |
| Team capacity or relevant expertise | **High** | Solo, no research affiliation, proposing "advanced technologies". §3.1. |
| Evidence of demand | **High** | ~100 members, ~50 visits a day. §3.2. |
| Evidence of effectiveness | **High** | No outcome data. Lean on published evidence. §3.3. |
| Innovation, novelty, or use of funds | Medium | Crowded space, but a real differentiator exists. §2.2. |
| Scale and sustainability | Medium | AI is the one per-learner cost. §3.4. |
| Focus on learning engineering | Low, if written well | The design is a study. §4. |
| Alignment with track goals or audiences | Low | Good fit; name the learner. §2.4. |
| Detail, focus, or clarity | Controllable | Scope narrowly; have someone proofread. |
| Multiple abstract submission | None | Submit one. Only a team's strongest abstract advances. |

## 2. Positioning

### 2.1 The one line

> Free AI hints for adults learning Python and SQL that must prove they work before a learner sees them, and are judged by whether the learner can then solve the next problem without help.

### 2.2 What is new, against the winners above

Say it in the abstract, plainly and without naming competitors:

- **The AI is held to account by execution.** With every hint, the model writes a hidden fix; the learner's own browser runs it against the challenge's tests; no pass, no hint. The winner pages for Ocobox, Scholé and Codesafe describe assistants; none describes a check that the help is right. For code, running the tests is a stronger and cheaper check than the self-consistency voting the OATutor lab used for maths.
- **Success is measured on unassisted work.** The design target is the crutch effect: help that raises practice scores and lowers what learners can do alone. None of the comparable winner pages describes measuring what learners can do once the assistant is gone.
- **It costs almost nothing to run the code.** Execution happens on the learner's device, so the only per-learner cost is the model call, and that falls with caching (§3.4).
- **The data is released.** Attempts, hints, verification results and later unassisted outcomes, de-identified, which AI-tutoring research rarely gets to see.

### 2.3 Turn the removed AI into evidence of judgment

Dataslope built and shipped a general "Ask AI" chat and an AI autocomplete, with per-user caps and a global spending ceiling, then removed both because they were not designed for learning. Told plainly, that is two things reviewers look for: proof the team can build and operate an AI system, and the judgment to remove one that does not serve learners. This proposal is the learning-first version. Do **not** cite the old usage numbers; they were tiny and say nothing about this design.

### 2.4 Lane and learner

- **Lane:** *Teaching, Learning and Skill Development*, which asks for "technical, and AI-related skills". Learning to use AI help without depending on it is itself an AI-related skill; say so once.
- **Learner:** name one group. 22 of the 37 past postsecondary winners name a specific group. Suggested: *US adults trying to move into data work (community-college students, working adults and career changers) who study on their own time, on whatever device they have, without paid tools or a tutor.* Then say why existing approaches fail them: paid courses cost money, free AI chat gives answers and builds dependence, and the evidence says unguarded AI help lowers what they can do alone.

## 3. Closing the gaps before 13 October

### 3.1 Team and research tie (the highest-leverage week of work)

Every comparable Catalyst winner had a university, a lab or a named advisor. In order of value:

1. **A named research advisor**, ideally faculty in CS education or learning analytics, willing to be listed on the team for an hour a month and to co-design the study in Phase II. Even a "yes, list me as an advisor" by email changes how the team reads.
2. **A community-college CS or data instructor** as an advisor or prospective pilot site. This also helps equity and demand.
3. **If neither lands by the 12th:** say who you will partner with and how (the competition's researcher database, the networking event). At Catalyst, 2027 asks only that you "demonstrate an intention to support research at scale". It is acceptable, but it is the weakest version.

Where to look, this week:

- **Email `ToolsCompetition@the-learning-agency.com`** today for the researcher database; there is no portal, they share it on request.
- **Learning Engineering Networking Event, Wednesday 7 October** (first Wednesday of every month): <https://www.tickettailor.com/events/thelearningagency/1305131>.
- **Authors of the work this proposal builds on**: the OATutor lab at Berkeley (AI hint quality and learning gains), the CMU learning-engineering groups behind ARISE and QuickTA, and the researchers publishing on generative AI and novice programmers at ICER and SIGCSE. A short, specific ask (one paragraph on the design, one on what you need from them) beats a general request.

Whatever happens with partners, **make your own capacity concrete**. "Built solo" reads as a risk; the list reads as a track record: 32 courses (~850 pages), 14 language runtimes running in the browser, ~3,900 runnable examples, ~1,000 auto-graded challenges, 600+ merged pull requests, and an AI system previously built, capped and operated in production.

### 3.2 Demand evidence in a week

Small, honest, specific numbers beat large vague ones.

- **Your own data on the need for help.** How often do signed-in learners attempt a challenge and never solve it? Read-only, against production:

  ```bash
  npx wrangler d1 execute dataslope-auth --remote --command \
    "SELECT COUNT(DISTINCT user_id) AS learners,
            SUM(attempted) AS attempted,
            SUM(solved) AS solved,
            SUM(CASE WHEN attempted = 1 AND solved = 0 THEN 1 ELSE 0 END) AS stuck
       FROM challenge_progress"
  ```

  "Of N challenges our learners attempted, X% were abandoned unsolved" is a direct measure of the problem. It covers signed-in learners only (guests keep progress in the browser), so present it as an early signal.
- **Ask the ~100 members.** Three questions by email: do you use ChatGPT or similar when stuck; did it help you learn, or just get you past the problem; would you use hints that never give the answer. Three to five quotes are enough.
- **Cite the competition's own framing**: the 2027 overview reports that 51% of Gen Z use generative AI weekly and 44% use it to complete assignments more efficiently. That *is* the problem statement.
- **Traffic, stated plainly.** About 50 unique visitors a day, from Cloudflare Web Analytics. Catalyst needs no users; hiding the number would cost more than stating it.

### 3.3 Evidence the approach will work

There are no outcome data yet, so borrow published evidence, and cite it accurately:

- **The crutch effect.** Bastani et al. (PNAS 2025): unrestricted GPT-4 raised practice performance by 48% and lowered exam performance by 17%; a guardrailed tutor raised practice by 127% and left exam performance level with control.
- **Wrong AI help is common, and checking it works.** Pardos and Bhandari (PLOS ONE 2024): ChatGPT help "failed quality checks on 32% of problems"; self-consistency cut that to "nearly 0% for algebra problems and 13% for statistics problems"; and the hints produced learning gains equivalent to human-tutor hints.
- **Novices are misled by suggestions.** Prather et al. (ICER 2024): struggling novices showed new difficulties with generative AI, including "misleading code suggestions" and false progress.
- **Validating hints is a recognised research direction.** Phung et al. (LAK 2024).

Optional, only if it does not eat writing time: a working prototype of the verified hint on a handful of Python Basics challenges, so the abstract can say "prototype working". It is far more valuable as Phase II evidence (§6).

### 3.4 Sustainability, answered before it is asked

Three sentences in the abstract cover it: hints only after a failed attempt, from a small model, under per-user and global caps (already designed and operated); verified hints cached by failure signature (challenge, failing test, error), so cost per learner should fall as use grows; and code execution, the usual expensive part, costs nothing because it runs on the learner's device.

## 4. The abstract

The 2027 word limit is not published; the 2025 and 2026 cycles used **750 words**. Draft to 750 and confirm at office hours. The official tips are: say what is "meaningfully new"; "Start with a specific learner need"; describe "the core experience from the user's perspective"; connect to learning science and data; give existing evidence; show "why yours is the right team"; avoid jargon; submit early. A structure that follows them and covers all six criteria:

| Section | Words | Covers |
| --- | --- | --- |
| 1. The learner and the need (§2.4, §3.2 numbers) | ~120 | Alignment, demand, equity |
| 2. What is new (§2.2) | ~110 | Novelty |
| 3. What the learner experiences: fail a test, ask, get one rung of help, never the answer, solve | ~110 | Impact, clarity |
| 4. Why it should work (§3.3) | ~90 | Evidence of effectiveness |
| 5. Learning engineering and public goods: what is logged, three research questions, the randomized comparison, the released dataset and MIT code | ~130 | Learning engineering, public goods |
| 6. Reach, scale, sustainability (§3.4, no install, no account) | ~90 | Scale, equity |
| 7. Team (§3.1, §2.3) | ~100 | Team capacity |

**Scope it narrowly.** One learner group; two courses for the first build: Python Basics (68 challenge cards) and Intro SQL with PostgreSQL (24), plus the catalog's SQL challenges; one feature; one study. "Too broad" is a published reason for rejection.

**Three research questions**, ready to paste:

1. Do execution-verified hints improve unassisted success on later same-skill challenges, compared with unverified hints and with no hints?
2. Which rung of help (expected-vs-actual, concept question, line pointer, worked example) leads to an unassisted fix most often, and for whom?
3. Does help fade appropriately: do learners request fewer and lower rungs as a skill is mastered?

**Leave out:** the 14-language list, WebAssembly by name (say "runs in the learner's browser"), the SQL workbench, videos, the benchmark, the hidden Pro tier, and anything that reads as a feature tour.

## 5. The next nine days

| Day | Do |
| --- | --- |
| **Sun 4 Oct** | Decide. Email the organizers for the researcher database. Draft the member survey. |
| **Mon 5** | Send the survey. Run the D1 query. Send 5-10 short researcher and instructor emails (§3.1). Draft abstract v1 from the structure in §4. |
| **Tue 6** | **Office hours, 4-5pm ET.** Ask: the word limit; whether a solo entrant with an advisor but no institution is competitive at Catalyst; whether an advisor who has agreed informally can be listed; where the email backup template is. |
| **Wed 7** | **Learning Engineering Networking Event.** Follow up on replies. |
| **Thu 8** | Office hours, 9:30-10:30am ET (if anything is still open). Abstract v2 with survey quotes and the D1 number. |
| **Fri 9 - Sat 10** | Tighten to the limit. Have someone outside the project read it for jargon and typos. |
| **Sun 11** | Final team list (every member must be named, plus a Team Lead). Final read. |
| **Mon 12** | Office hours, 1-2pm ET, for last questions. **Submit.** |
| Tue 13 | Deadline, 11:59:59pm ET. Buffer only. |

## 6. If invited to Phase II (24 November → 21 January)

- **A confirmed research partner**, with a route to ethics review for the randomized study.
- **A working prototype and a small pilot**: verified hints on part of Python Basics, with the logging on, run with consenting learners. Even a few dozen learners turn "intends to" into "has measured".
- **Two or three letters** from community-college instructors who would point students at it.
- **A budget and milestones you can meet by Product Review Day (fall 2027)**: the second half of the prize depends on "substantial progress towards their milestones". Rubrics are published when Phase II opens; write to them.
- **Privacy and consent**: the updated policy, the consent flow, and the model provider's data terms, written up.

## 7. Risks and honest odds

- **Most likely outcome:** not advancing, mainly on team and demand. Mitigation: §3.1 and §3.2 this week. The draft still becomes a better proposal next cycle.
- **Second most likely:** advancing and losing in Phase II to a university-led entry with pilot data. Mitigation: the prototype and pilot in §6.
- **The novelty read as "another AI tutor".** Mitigation: the first two sentences of §2.2 have to carry it, and the word "tutor" is best avoided.
- **AI cost and privacy.** Mitigation: §3.4 and the consent plan, stated, not implied.

## 8. Questions only you can answer

1. Is anyone else on the team, even part-time? Every member is named on the form.
2. What is your own background (teaching, research, industry)? The "right team" paragraph needs it.
3. Do you know any CS or data instructors, at a community college or elsewhere?
4. Could you build a rough verified-hint prototype before January if invited?

## Sources

- Winners directory: <https://tools-competition.org/winners/>
- 2026 postsecondary finalists and winners: <https://tools-competition.org/26-postsecondary-finalists/>, <https://tools-competition.org/26-postsecondary-winners/>
- 2025 postsecondary finalists and winners: <https://tools-competition.org/25-enhancing-post-secondary-learning-finalists/>, <https://tools-competition.org/25-post-secondary-learning-winners/>
- Winner pages cited: [ARISE](https://tools-competition.org/winner/arise/), [QTAO](https://tools-competition.org/winner/qtao/), [Ocobox](https://tools-competition.org/winner/ocobox/), [Scholé](https://tools-competition.org/winner/schole/), [Codesafe](https://tools-competition.org/winner/codesafe/), [Caselet](https://tools-competition.org/winner/caselet/), [QuantHub Challenge](https://tools-competition.org/winner/quanthub-challenge/), [OATutor-GenAI](https://tools-competition.org/winner/oatutor-genai/), [HVAC Hero](https://tools-competition.org/winner/hvac-hero/), [Botter](https://tools-competition.org/winner/botter/)
- 2027 overview: <https://tools-competition.org/27-overview/>
- 2027 postsecondary track: <https://tools-competition.org/27-postsecondary/>
- 2027 official rules: <https://tools-competition.org/27-official-rules/>
- Phase I abstract tips (2027): <https://tools-competition.org/phase-i-crafting-your-abstract/>
- Phase I resources, office hours, networking event: <https://tools-competition.org/phase-i-resources-2027-tools-competition/>
- Why 2026 abstracts did not advance: <https://tools-competition.org/2026-tools-competition-phase-i-non-advancing-supports/>
- How proposals are evaluated: <https://tools-competition.org/how-are-proposals-evaluated/>
- Learning engineering plan guidance: <https://tools-competition.org/your-learning-engineering-plan/>
- 2026 postsecondary track page (750-word abstract, older cycle): <https://tools-competition.org/26-postsecondary/>
- Bastani et al., PNAS 2025: <https://papers.ssrn.com/abstract=4895486>
- Pardos and Bhandari, "ChatGPT-generated help produces learning gains equivalent to human tutor-authored help on mathematics skills", PLOS ONE 2024: <https://pmc.ncbi.nlm.nih.gov/articles/PMC11125466/>
- Prather et al., ICER 2024: <https://arxiv.org/abs/2405.17739>
- Phung et al., LAK 2024: <https://arxiv.org/abs/2310.03780>
- Renaissance Philanthropy on the competition's history: <https://www.renaissancephilanthropy.org/insights/the-origins-and-impact-of-the-tools-competition-how-to-use-competitions-to-spur-innovation>
