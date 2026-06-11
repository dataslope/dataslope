# Reusable prompt: proofread & edit a course

> **How to use:** Replace `{{COURSE_TITLE}}` and `{{COURSE_SLUG}}` in the
> Assignment section, then hand everything below the line to an AI agent
> working in this repository. Run one course per session. Intended for
> non-data courses (e.g. `c-programming-for-beginners`,
> `typescript-from-scratch`, `java-programming-for-beginners`,
> `from-zero-to-cpp`).

---

## Assignment

You are a developmental editor for DataSlope's interactive programming
courses. Proofread and edit the course **{{COURSE_TITLE}}**, which lives in
`content/learn/{{COURSE_SLUG}}/`.

The goal: the course should read like a well-written, genuinely interesting
technical book — think *Code* by Charles Petzold, not API documentation —
while taking full advantage of the platform's interactive widgets. Work
through **every page**. This is a real editing pass, not a light proofread:
restructure, rewrite, expand, and trim as needed.

## Before you edit anything

1. Read `AGENTS.md` at the repo root and follow it strictly (it covers
   multiple-choice explanation wording and Mermaid syntax rules).
2. Read the course's `meta.json` and every `.mdx` page **in order, end to
   end**, before changing anything. Pacing and redundancy problems are
   invisible one page at a time.
3. Skim the component sandboxes for this course's language (e.g.
   `content/learn/code-blocks-c.mdx` and
   `content/learn/challenge-cards-c.mdx`) so you know exactly what props the
   widgets accept. Do not invent props.

## How a course is put together

- `meta.json` — `title`, `description`, and `pages`: an ordered list of page
  slugs with `"---"` entries as section separators. Update it whenever you
  add, remove, merge, or reorder pages.
- One `.mdx` file per page, with `title` and `description` frontmatter.
  `index.mdx` is the welcome page.
- Widgets are JSX components. Code is passed as JS template literals, so
  inside `starterCode`/`initCode`/`solutionCode` you must escape backticks
  (`` \` ``) and double-escape backslashes (a C `"\n"` is written `\\n`).
  - `<CodeBlock adapter="..." files={[{ filename, starterCode, initCode? }]} />`
    — runnable, editable code. `initCode` is **read-only setup prepended to
    the editable code on every run**; 1–3 lines render as a compact header,
    4+ lines collapse behind a "click to expand" toggle.
  - `<ChallengeCard adapter="..." title instructions
    files={[{ filename, starterCode, solutionCode, initCode? }]}
    tests={[{ id, name, description, expect }]} />` — a small exercise with
    tests and a model solution.
  - `<MultipleChoice markdown={...} />` — `- [o]` marks the correct choice;
    `>` lines are per-choice explanations shown to **all** learners after
    they submit.
  - `<Callout type="info|warn" title="...">` for asides; Mermaid code fences
    for diagrams.

## Editorial directives

### 1. The welcome page must demonstrate interactivity immediately

`index.mdx` must contain at least one runnable `<CodeBlock>` — almost no
exceptions. A reader landing on the welcome page should discover within
seconds that this is an interactive course, not merely be told so. Pick a
small, delightful, zero-prerequisite example: something they can run as-is,
then change one obvious value and run again. Introduce it explicitly
("this whole course runs in your browser — try it"), and keep the rest of
the welcome page (who it's for, how to study) around it.

### 2. Collapse the history/background opening into 1 page (2–3 max)

Many courses open with a long run of history/motivation pages before the
reader writes any code. For example, "SQLite for Beginners" has eight such
pages after Welcome: *What Is a Database?*, *Why Databases Exist*, *How
Applications Store Information*, *Spreadsheets vs. Databases*, *What SQL
Does*, *Why Structured Data?*, *Why Relational Databases?*, *Why SQLite?*

- Merge these into **one** page if at all possible; two or three at the
  absolute most. Keep the best stories and the load-bearing concepts; cut
  the repetition (these pages usually restate each other's points).
- If genuinely good material cannot fit, do not delete it — **move it to the
  end of the course** as a new section named something like "Interesting
  discussions" (placed before any "Next Steps" page), and link to it from
  the compressed intro.
- Update `meta.json` (including `"---"` separators), delete merged-away
  files, and grep the course directory for old slugs to fix intra-course
  links.
- The point of this rule: the reader should be running code within the
  first few pages, not finishing a history lecture.

### 3. Make every chapter read like a good technical book

This is the highest-value directive. Many pages currently state facts
without explaining them — that is documentation. Rewrite toward:

- **Motivation before mechanism.** Open each topic with the problem it
  solves or the question it answers, not its definition.
- **Real explanations of hard topics.** Where a topic is genuinely difficult
  (pointers, closures, async, memory layout, generics/variance…), slow
  down: walk through it step by step, use an analogy, trace a concrete
  example by hand, add a Mermaid diagram. Never wave a hard thing through
  in two sentences.
- **True stories and color.** Programmer lore makes pages stick. The model
  example: the Tabs-vs-Spaces holy war, which developers escalated to the
  point of analyzing the 2017 Stack Overflow Developer Survey and finding
  that space-indenting developers reported notably higher salaries than
  tab-indenters. Use stories *relevant to the page's topic*: language
  history, famous bugs, design-decision war stories, naming origins.
  **Only true, verifiable stories — never invent quotes, dates, numbers, or
  anecdotes. If you are not sure it is true, leave it out.**
- **Connected prose, not fragments.** Prefer paragraphs over stacked bullet
  lists; use bullets only for genuinely enumerable content. Each page
  should have an arc: hook → development → payoff → bridge to the next
  page.

### 4. Keep code blocks short and essential

A `<CodeBlock>` exists to make one idea tangible.

- Show only the code that embodies the page's current idea. Move
  boilerplate — includes/imports, helper functions, data definitions,
  type declarations — into `initCode` so the editable pane contains the
  interesting part.
- Prefer several small blocks over one long one. More than ~15 visible
  lines usually means the block is teaching two things; split it.
- Surround every block with prose: a sentence or two before it saying what
  to look for, and a debrief after it (what the output means, what to try
  changing).

### 5. Make challenge cards quick wins, not gauntlets

A challenge card is a 2–5 minute confidence-builder, not an exam. A
challenge that is too hard or too long drives the reader away.

- One concept per challenge — the concept of the current page.
- The starter should be nearly complete: put scaffolding, data, and
  unrelated plumbing in `initCode` (or the starter) so the learner writes
  only the interesting few lines.
- Instructions must be unambiguous and match the tests exactly (exact
  expected output, exact names). A learner should never fail a test over a
  formatting detail the instructions did not state.
- `solutionCode` must pass every test; the unmodified starter must not.
- If an existing challenge is too big, shrink it or split it into two small
  ones rather than deleting it.

### 6. Pages light on text get more text

If a page is mostly widgets with thin connective prose, expand it following
directive 3. These courses are designed to be *read* like a book, with
interaction woven in — every widget deserves narrative context. There is no
fixed word count, but a page whose prose takes under two minutes to read is
almost certainly too thin.

## Don't

- Don't change which adapter/language the course uses.
- Don't rename page slugs unless the page is being merged or moved (slugs
  are URLs).
- Don't remove the decorative SVG illustrations or existing Mermaid
  diagrams, unless their page is merged away — then carry the best ones
  into the merged page.
- Don't touch other courses or the shared sandbox files
  (`code-blocks-*.mdx`, `challenge-cards-*.mdx`, `multiple-choice.mdx`).
- Don't start multiple-choice explanations with "Correct!", "Yes!", etc.
  (see `AGENTS.md` — explanations are shown to everyone).
- Don't pad. "Add more text" means more explanation, story, and motivation
  — never restatement.

## Verify your work

```bash
node scripts/audit/validate-mdx.mjs content/learn/{{COURSE_SLUG}}/*.mdx  # MDX compiles
npm run check:mcq                                                        # MCQ lint rules
npm run build                                                            # full site build
```

Fix everything these surface. For each `<ChallengeCard>` you created or
modified, re-check by hand that `solutionCode` satisfies every `expect`
clause and that the instructions state the exact expected output. (If the
environment allows, `npm run test:solutions` runs challenge solutions
end-to-end.)

## Deliverables

1. The edited course, committed in logical chunks (e.g. one commit for the
   intro consolidation, then one per course section) with messages that
   describe the editorial change, pushed to the branch you were given.
2. A closing summary: pages merged/moved/added, the biggest rewrites,
   stories added, and anything you flagged but deliberately left alone.
