# 266 candidate spots for the next wave of risograph bands

> **Superseded, 2026-09-01:** generation now asks `gpt-image-2` for
> `background: "transparent"` and writes the cut-out itself, so the
> background-removal command below is gone along with
> `scripts/remove-background-kie.mjs`. Everything else here still applies.

**Date:** 2026-08-10
**Status:** queued, not drawn. The prompts are in
`data/illustration-prompts.json`; no art exists for any of them yet.
**For:** whoever runs the next generation batch.

---

## What was added, and what it does to the site right now

266 new `course-inline` prompts, spread across all 32 courses, one per section
that has no band and is explaining something. Nothing on any page changes:

- `place-inline-figures.mjs` places a band only when its image exists
  (`drawn.has(p.id)`), so an undrawn prompt is skipped and the 1,671 bands
  already on the page are untouched. `npm run check:mdx`, `check:prose` and
  the figure-slug suite all pass unchanged.
- The admin gallery shows each of them as **Not generated yet**, which is the
  state `CutoutImage` already renders for a prompt with no art.

So this is a work list in the one place every pipeline script already reads,
rather than a document that has to be transcribed into one.

## How the spots were chosen

A section is a candidate when all of the following hold. The picks came out of
`content/` mechanically and were then written by hand, one subject each.

1. **It has no band.** 1,671 bands sit across 752 lessons; 3,450 teaching
   sections have none.
2. **It teaches.** Assessment and wrap-up sections are excluded by the same
   `ASSESSMENT` list `place-inline-figures.mjs` now uses, and so are the
   course-chrome sections ("How to study this course", "Books to read in
   order") and the `index` and `next-steps` lessons entirely. A band under a
   reading list is decoration.
3. **It has enough prose to be explaining a mechanism** (240 characters of
   body text, discounting code, lists and tables).
4. **It is not the section that opens the lesson**, which belongs to the
   lesson's own illustration.
5. **Its course is not already over-represented.** The picks round-robin
   across courses, so the spread is 5 to 9 per course rather than 40 in
   whichever course is longest.

Sections on a page carrying no band at all were taken first.

## What was checked before writing them

- **No repeats.** Every new subject was compared against all 1,671 existing
  ones and against every other new one; the closest pair after review is under
  0.72 similarity. One pair *did* collide: two courses both got a layered
  architecture drawn as supports running one way. The second was cut rather
  than reworded, which is what "check the set for repeats before adding one"
  is for.
- **No volume language.** Risograph is flat; "thick", "solid", "chunky",
  "sphere" belong to the isometric style and are rejected outright.
- **No lettering, and no digits.** `__tests__/illustrationPrompt.test.ts`
  catches the second: five subjects reached for "a numbered rail" or "numbered
  doors" meaning *unmarked*, which is the exact failure that test documents.
  All five were reworded to "identical".
- **4 subjects carry a creature** (the Palmer penguins in two courses), and
  their `mascot` flag is set to match, which the pipeline's own checker
  asserts.

## Drawing them

```bash
# 266 images at 1536x768, batch API, low quality: roughly $0.40
OPENAI_API_KEY=... node scripts/generate-illustrations.mjs run \
  --category course-inline --sink r2 --run riso-2026-08 --only "$(node -e '…')"
node scripts/promote-illustrations.mjs --run riso-2026-08
node scripts/place-inline-figures.mjs --write        # places only what exists
```

Then **audit where they landed**. Placement is keyword scoring, and the whole
of the previous commit in this branch was repairing where that scoring went
wrong. The section named in the table below is the section each subject was
written for; if a band comes to rest somewhere else, that is the thing to look
at. `--only <id>` reflows one.

Each also needs a caption when it lands: one sentence, 50 to 110 characters,
naming the concept rather than describing the picture.

## The spots

### `beginners-javascript` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `javascript-beyond-the-browser` | What stays the same across all of these | `js-javascript-beyond-the-browser-stays-same-across-all-inline` |
| `maintainable-code` | Consistent style | `js-maintainable-code-consistent-style-inline` |
| `nested-data` | Reading deep paths | `js-nested-data-reading-deep-paths-inline` |
| `problem-solving` | Worked example: shopping cart total with discount | `js-problem-solving-worked-example-shopping-cart-inline` |
| `problem-solving` | When you are stuck | `js-problem-solving-stuck-inline` |
| `problem-solving` | Why refine matters | `js-problem-solving-refine-matters-inline` |
| `scope-and-scope-chain` | Lexical scope | `js-scope-and-scope-chain-lexical-scope-inline` |
| `scripting-and-glue` | A scripting language in action | `js-scripting-and-glue-scripting-language-action-inline` |
| `scripting-and-glue` | The two-language pattern | `js-scripting-and-glue-two-language-pattern-inline` |

### `c-programming-for-beginners` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `how-computers-execute-programs` | The fetch-decode-execute cycle | `c-how-computers-execute-programs-fetch-decode-execute-cycle-inline` |
| `how-computers-execute-programs` | Memory as a row of mailboxes | `c-how-computers-execute-programs-memory-as-row-mailboxes-inline` |
| `how-computers-execute-programs` | A worked example, on paper | `c-how-computers-execute-programs-worked-example-on-paper-inline` |
| `how-computers-execute-programs` | Programming, then, is just… | `c-how-computers-execute-programs-programming-then-just-inline` |
| `how-computers-execute-programs` | What "running a program" actually means | `c-how-computers-execute-programs-running-program-actually-means-inline` |
| `reading-code` | Identify common patterns | `c-reading-code-identify-common-patterns-inline` |
| `reading-code` | Follow the types | `c-reading-code-follow-types-inline` |
| `reading-code` | Make the code obvious *to yourself* | `c-reading-code-make-code-obvious-yourself-inline` |
| `reading-code` | A worked example | `c-reading-code-worked-example-inline` |

### `csharp-linq-functional` (7)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `functional-design-patterns` | Pattern 6: Combinators | `cs-functional-design-patterns-pattern-6-combinators-inline` |
| `functional-design-patterns` | Pattern 4: Currying and partial application | `cs-functional-design-patterns-pattern-4-currying-partial-inline` |
| `functional-design-patterns` | Pattern 5: Pipeline as data, discriminated unions | `cs-functional-design-patterns-pattern-5-pipeline-as-inline` |
| `functional-design-patterns` | Pattern 2: Result / Either | `cs-functional-design-patterns-pattern-2-result-either-inline` |
| `functional-design-patterns` | Pattern 3: Railway-oriented programming | `cs-functional-design-patterns-pattern-3-railway-oriented-inline` |
| `generic-abstractions` | Building a generic key-grouped histogram | `cs-generic-abstractions-building-generic-key-grouped-inline` |
| `modern-csharp-functional` | Pattern matching and switch expressions (C# 7/8) | `cs-modern-csharp-functional-pattern-matching-switch-expressions-inline` |

### `data-analysis-python-pandas` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `deep-history-of-data` | Codd's relational model, in a little more depth | `pandas-deep-history-of-data-codd-s-relational-model-inline` |
| `deep-history-of-data` | What "big data" actually means | `pandas-deep-history-of-data-big-data-actually-means-inline` |
| `missing-values` | A real audit: the penguins | `pandas-missing-values-real-audit-penguins-inline` |
| `notebooks-and-environments` | What a Python "environment" is | `pandas-notebooks-and-environments-python-environment-inline` |
| `project-organization` | Git, the missing tool | `pandas-project-organization-git-missing-tool-inline` |
| `project-organization` | Documentation lives with the code | `pandas-project-organization-documentation-lives-code-inline` |
| `reproducible-analysis` | The core habits | `pandas-reproducible-analysis-core-habits-inline` |
| `statistical-summaries` | Correlation | `pandas-statistical-summaries-correlation-inline` |
| `what-is-data-analysis` | An end-to-end example, slowly | `pandas-what-is-data-analysis-end-end-example-slowly-inline` |

### `data-wrangling-python-polars` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `a-complete-analysis` | Step 4: control for the confounder properly | `pl-a-complete-analysis-step-4-control-confounder-inline` |
| `a-complete-analysis` | Step 3: form a hypothesis and test it | `pl-a-complete-analysis-step-3-form-hypothesis-inline` |
| `a-complete-analysis` | Step 6: write it as one pipeline | `pl-a-complete-analysis-step-6-write-as-inline` |
| `a-complete-analysis` | Step 5: quantify it | `pl-a-complete-analysis-step-5-quantify-inline` |
| `polars-vs-pandas` | 2. You write expressions, not slices | `pl-polars-vs-pandas-2-write-expressions-not-inline` |
| `polars-vs-pandas` | 3. Null is null, and NaN is a number | `pl-polars-vs-pandas-3-null-null-nan-inline` |
| `polars-vs-pandas` | 5. Nothing mutates in place | `pl-polars-vs-pandas-5-nothing-mutates-place-inline` |
| `polars-vs-pandas` | 4. Types are strict, and that is a feature | `pl-polars-vs-pandas-4-types-strict-feature-inline` |
| `reading-and-writing-data` | Writing files back out | `pl-reading-and-writing-data-writing-files-back-out-inline` |

### `database-design-postgresql` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `from-ingres-to-postgresql` | Two grad students and a rename | `db-from-ingres-to-postgresql-two-grad-students-rename-inline` |
| `reading-er-diagrams` | Read a real schema: the Chinook music store | `db-reading-er-diagrams-read-real-schema-chinook-inline` |
| `referential-integrity` | Delete behavior is a design choice | `db-referential-integrity-delete-behavior-design-choice-inline` |
| `the-relational-revolution` | IBM's lukewarm reception | `db-the-relational-revolution-ibm-s-lukewarm-reception-inline` |
| `the-relational-revolution` | The race IBM lost | `db-the-relational-revolution-race-ibm-lost-inline` |
| `what-is-database-design` | The schema shapes everything built on it | `db-what-is-database-design-schema-shapes-everything-built-inline` |
| `what-is-database-design` | Three levels of design | `db-what-is-database-design-three-levels-design-inline` |
| `why-normalization` | The three anomalies | `db-why-normalization-three-anomalies-inline` |

### `from-zero-to-cpp` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `encapsulation-and-abstraction` | When the interface leaks: Hyrum's Law | `cpp-encapsulation-and-abstraction-interface-leaks-hyrum-s-inline` |
| `encapsulation-and-abstraction` | Abstraction: same interface, different implementations | `cpp-encapsulation-and-abstraction-abstraction-same-interface-different-inline` |
| `variables-and-memory` | Always initialize | `cpp-variables-and-memory-always-initialize-inline` |
| `variables-and-memory` | `const`: variables that don't vary | `cpp-variables-and-memory-const-variables-don-t-inline` |
| `variables-and-memory` | Implicit conversions and a famous footgun | `cpp-variables-and-memory-implicit-conversions-famous-footgun-inline` |
| `variables-and-memory` | `auto`: let the compiler infer the type | `cpp-variables-and-memory-auto-let-compiler-infer-inline` |
| `variables-and-memory` | Lifetime: when a variable lives and dies | `cpp-variables-and-memory-lifetime-variable-lives-dies-inline` |
| `variables-and-memory` | Scope: where a variable is visible | `cpp-variables-and-memory-scope-where-variable-visible-inline` |
| `variables-and-memory` | Types are promises about memory | `cpp-variables-and-memory-types-promises-about-memory-inline` |

### `functional-programming-typescript` (5)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `generic-abstractions-and-type-classes` | Type-class hierarchies (briefly) | `fp-generic-abstractions-and-type-classes-type-class-hierarchies-briefly-inline` |
| `generic-abstractions-and-type-classes` | Why bother? | `fp-generic-abstractions-and-type-classes-bother-inline` |
| `typescript-meets-fp` | Immutability through `readonly` and `as const` | `fp-typescript-meets-fp-immutability-through-readonly-as-inline` |
| `typescript-meets-fp` | Generics: types as parameters | `fp-typescript-meets-fp-generics-types-as-parameters-inline` |
| `typescript-meets-fp` | A multi-file preview: separating "what" from "how" | `fp-typescript-meets-fp-multi-file-preview-separating-inline` |

### `how-llms-work` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `reasoning-models` | What it costs | `llm-reasoning-models-costs-inline` |
| `reasoning-models` | Where it helps and where it does not | `llm-reasoning-models-where-helps-where-does-inline` |
| `similarity` | Where this breaks | `llm-similarity-where-breaks-inline` |
| `tokens` | What this explains | `llm-tokens-explains-inline` |
| `what-a-language-model-is` | Where the knowledge lives | `llm-what-a-language-model-is-where-knowledge-lives-inline` |
| `why-models-hallucinate` | Why there is no "I do not know" signal | `llm-why-models-hallucinate-there-no-i-do-inline` |
| `why-models-hallucinate` | What actually reduces it | `llm-why-models-hallucinate-actually-reduces-inline` |
| `why-models-hallucinate` | Where the risk concentrates | `llm-why-models-hallucinate-where-risk-concentrates-inline` |
| `why-models-hallucinate` | Why "just tell me if you don't know" fails | `llm-why-models-hallucinate-just-tell-me-if-inline` |

### `intro-data-viz-plotly` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `interesting-discussions` | The dashboard era, a good idea, executed badly | `viz-interesting-discussions-dashboard-era-good-idea-inline` |
| `interesting-discussions` | D3, SVG, and the engine under the interactivity | `viz-interesting-discussions-d3-svg-engine-under-inline` |
| `interesting-discussions` | The decade of the spreadsheet | `viz-interesting-discussions-decade-spreadsheet-inline` |
| `loading-data-with-pandas` | "Tidy" data: the secret to easy plotting | `viz-loading-data-with-pandas-tidy-data-secret-easy-inline` |
| `what-is-data-visualization` | A live example: same data, different visualizations | `viz-what-is-data-visualization-live-example-same-data-inline` |
| `what-is-data-visualization` | What is *not* a data visualization? | `viz-what-is-data-visualization-not-data-visualization-inline` |
| `why-charts-exist` | Charts as cognitive offloading | `viz-why-charts-exist-charts-as-cognitive-offloading-inline` |
| `why-plotly-express` | Three design choices that make it different | `viz-why-plotly-express-three-design-choices-make-inline` |

### `intro-modern-csharp` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `java-and-managed-runtimes` | The killer idea: a virtual machine | `mcs-java-and-managed-runtimes-killer-idea-virtual-machine-inline` |
| `java-and-managed-runtimes` | What a managed program *feels* like | `mcs-java-and-managed-runtimes-managed-program-feels-like-inline` |
| `java-and-managed-runtimes` | What "managed" means | `mcs-java-and-managed-runtimes-managed-means-inline` |
| `java-and-managed-runtimes` | Why this terrified Microsoft | `mcs-java-and-managed-runtimes-terrified-microsoft-inline` |
| `rise-of-oop` | Smalltalk: everything is an object | `mcs-rise-of-oop-smalltalk-everything-object-inline` |
| `rise-of-oop` | What an "object" actually is | `mcs-rise-of-oop-object-actually-inline` |
| `rise-of-oop` | Why OOP became dominant | `mcs-rise-of-oop-oop-became-dominant-inline` |
| `software-organization` | Namespaces | `mcs-software-organization-namespaces-inline` |
| `software-organization` | Projects and solutions | `mcs-software-organization-projects-solutions-inline` |

### `intro-sql-postgres` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `inner-joins` | The same pattern on a real database | `sql-inner-joins-same-pattern-on-real-inline` |
| `what-is-a-database` | Where the database hides in an app | `sql-what-is-a-database-where-database-hides-app-inline` |
| `what-is-a-database` | A tiny mental model to carry with you | `sql-what-is-a-database-tiny-mental-model-carry-inline` |
| `what-is-a-database` | What the stored data looks like | `sql-what-is-a-database-stored-data-looks-like-inline` |
| `why-sql-exists` | SEQUEL, the trademark, and the race IBM lost | `sql-why-sql-exists-sequel-trademark-race-ibm-inline` |
| `working-with-null` | Filling in NULLs with COALESCE | `sql-working-with-null-filling-nulls-coalesce-inline` |
| `working-with-null` | When NULL escapes into the real world | `sql-working-with-null-null-escapes-into-real-inline` |
| `working-with-null` | Why allow NULL at all? | `sql-working-with-null-allow-null-at-all-inline` |

### `intro-web-development` (6)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `css-getting-started` | A stylesheet in its own file | `web-css-getting-started-stylesheet-own-file-inline` |
| `css-responsive-design` | Media queries: different rules at different sizes | `web-css-responsive-design-media-queries-different-rules-inline` |
| `how-the-web-works` | The three languages, one page | `web-how-the-web-works-three-languages-one-page-inline` |
| `html-semantic-accessibility` | Headings are an outline, not sizes | `web-html-semantic-accessibility-headings-outline-not-sizes-inline` |
| `js-forms-and-validation` | Reading values | `web-js-forms-and-validation-reading-values-inline` |
| `react-first-components` | State, the scoreboard, the React way | `web-react-first-components-state-scoreboard-react-way-inline` |

### `java-collections-and-generics-deep-dive` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `maps` | How HashMap actually works | `jcol-maps-hashmap-actually-works-inline` |
| `performance-tradeoffs` | Big-O is not the whole story: cache locality | `jcol-performance-tradeoffs-big-o-not-whole-inline` |
| `the-collections-framework` | Iterator: a real walking protocol | `jcol-the-collections-framework-iterator-real-walking-protocol-inline` |
| `the-collections-framework` | The Collections utility class | `jcol-the-collections-framework-collections-utility-class-inline` |
| `the-collections-framework` | A first multi-file example: programming to interfaces | `jcol-the-collections-framework-first-multi-file-example-inline` |
| `the-collections-framework` | Programming to the interface | `jcol-the-collections-framework-programming-interface-inline` |
| `the-collections-framework` | The default implementations | `jcol-the-collections-framework-default-implementations-inline` |
| `the-collections-framework` | The interface hierarchy | `jcol-the-collections-framework-interface-hierarchy-inline` |
| `the-tyranny-of-arrays` | What we'd need to fix this | `jcol-the-tyranny-of-arrays-we-d-need-fix-inline` |

### `java-programming-for-beginners` (7)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `encapsulation-and-abstraction` | Common mistakes beginners make | `java-encapsulation-and-abstraction-common-mistakes-beginners-make-inline` |
| `encapsulation-and-abstraction` | Why does this matter? | `java-encapsulation-and-abstraction-does-matter-inline` |
| `problem-solving` | Step 4: Look back | `java-problem-solving-step-4-look-back-inline` |
| `problem-solving` | A method for getting unstuck | `java-problem-solving-method-getting-unstuck-inline` |
| `software-organization` | Architecture is the *outline* of the code | `java-software-organization-architecture-outline-code-inline` |
| `software-organization` | Layered architecture | `java-software-organization-layered-architecture-inline` |
| `what-is-a-program` | Imperative vs declarative | `java-what-is-a-program-imperative-vs-declarative-inline` |

### `machine-learning-scikit-learn` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `features-and-targets` | Reading X.shape | `ml-features-and-targets-reading-x-shape-inline` |
| `hierarchical-clustering` | Seeing the tree: a dendrogram on a small sample | `ml-hierarchical-clustering-seeing-tree-dendrogram-on-inline` |
| `hyperparameter-tuning` | `GridSearchCV`: try every combination, automatically | `ml-hyperparameter-tuning-gridsearchcv-try-every-combination-inline` |
| `k-means-clustering` | You must standardize first | `ml-k-means-clustering-must-standardize-first-inline` |
| `k-means-clustering` | Inertia, and the hard question of choosing `k` | `ml-k-means-clustering-inertia-hard-question-choosing-inline` |
| `k-nearest-neighbors` | The make-or-break issue: feature scaling | `ml-k-nearest-neighbors-make-break-issue-feature-inline` |
| `model-interpretation-and-importance` | Permutation importance, model-agnostic and harder to fool | `ml-model-interpretation-and-importance-permutation-importance-model-agnostic-inline` |
| `pipelines-and-columntransformer` | ColumnTransformer: different transforms for different columns | `ml-pipelines-and-columntransformer-columntransformer-different-transforms-different-inline` |
| `what-is-machine-learning` | Three words you will use on every page: model, training, prediction | `ml-what-is-machine-learning-three-words-will-use-inline` |

### `mastering-dsa-cpp` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `recursion` | Naive Fibonacci | `dsa-recursion-naive-fibonacci-inline` |
| `searching` | The bug that hid for decades | `dsa-searching-bug-hid-decades-inline` |
| `shortest-paths` | When Dijkstra fails | `dsa-shortest-paths-dijkstra-fails-inline` |
| `trees` | Calculating tree properties | `dsa-trees-calculating-tree-properties-inline` |
| `union-find` | Union by rank or size | `dsa-union-find-union-by-rank-size-inline` |
| `why-cpp-for-dsa` | The STL is your algorithm toolbox | `dsa-why-cpp-for-dsa-stl-algorithm-toolbox-inline` |
| `why-cpp-for-dsa` | Closeness to memory makes DSA visible | `dsa-why-cpp-for-dsa-closeness-memory-makes-dsa-inline` |
| `why-cpp-for-dsa` | A small end-to-end example | `dsa-why-cpp-for-dsa-small-end-end-example-inline` |
| `why-cpp-for-dsa` | Language landscape | `dsa-why-cpp-for-dsa-language-landscape-inline` |

### `mastering-ggplot2` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `a-complete-workflow` | Stage 2: bring in the grouping variable | `gg-a-complete-workflow-stage-2-bring-grouping-inline` |
| `a-complete-workflow` | Stage 4: refine into a final figure | `gg-a-complete-workflow-stage-4-refine-into-inline` |
| `interesting-discussions` | Anscombe's quartet: the case for plotting at all | `gg-interesting-discussions-anscombe-s-quartet-case-inline` |
| `interesting-discussions` | The penguins you have been plotting | `gg-interesting-discussions-penguins-have-been-plotting-inline` |
| `interesting-discussions` | A little more on the "2" | `gg-interesting-discussions-little-more-on-2-inline` |
| `interesting-discussions` | ggplot2 and the tidyverse | `gg-interesting-discussions-ggplot2-tidyverse-inline` |
| `plotting-systems-that-dont-scale` | What we actually want | `gg-plotting-systems-that-dont-scale-we-actually-want-inline` |
| `themes-and-styling` | Theme inheritance | `gg-themes-and-styling-theme-inheritance-inline` |
| `what-is-a-geom` | A line needs an order; a scatter does not | `gg-what-is-a-geom-line-needs-order-scatter-inline` |

### `modern-css-layout` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `modern-css-toolbox` | Logical properties | `css-modern-css-toolbox-logical-properties-inline` |
| `modern-css-toolbox` | Native CSS nesting | `css-modern-css-toolbox-native-css-nesting-inline` |
| `positioning-and-stacking` | relative + absolute: the anchor pattern | `css-positioning-and-stacking-relative-absolute-anchor-pattern-inline` |
| `pseudo-classes-and-elements` | Pseudo-elements | `css-pseudo-classes-and-elements-pseudo-elements-inline` |
| `selectors-and-combinators` | Combinators: reaching across the tree | `css-selectors-and-combinators-combinators-reaching-across-tree-inline` |
| `the-cascade-and-specificity` | Source order and inheritance | `css-the-cascade-and-specificity-source-order-inheritance-inline` |
| `the-cascade-and-specificity` | Specificity, counted | `css-the-cascade-and-specificity-specificity-counted-inline` |
| `transforms` | A hover interaction | `css-transforms-hover-interaction-inline` |
| `transitions-and-animations` | Animations: scripted, repeatable motion | `css-transitions-and-animations-animations-scripted-repeatable-motion-inline` |

### `natural-language-processing-python` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `rule-based-sentiment` | Adding negation handling | `nlp-rule-based-sentiment-adding-negation-handling-inline` |
| `rule-based-sentiment` | The limits of rules, and when to graduate to learning | `nlp-rule-based-sentiment-limits-rules-graduate-learning-inline` |
| `rule-based-sentiment` | A naive first attempt (and why it fails) | `nlp-rule-based-sentiment-naive-first-attempt-fails-inline` |
| `the-nlp-pipeline` | The two families of steps: cleaning vs. analysis | `nlp-the-nlp-pipeline-two-families-steps-cleaning-inline` |
| `the-nlp-pipeline` | Order matters: a concrete example | `nlp-the-nlp-pipeline-order-matters-concrete-example-inline` |
| `what-is-nlp` | Why this is hard: ambiguity everywhere | `nlp-what-is-nlp-hard-ambiguity-everywhere-inline` |
| `what-is-nlp` | Where NLP shows up in the real world | `nlp-what-is-nlp-where-nlp-shows-up-inline` |
| `what-is-nlp` | Rules versus learning (a brief orientation) | `nlp-what-is-nlp-rules-versus-learning-brief-inline` |
| `what-is-nlp` | A first look: why `.split()` is not enough | `nlp-what-is-nlp-first-look-split-not-inline` |

### `oop-blueprint-java` (7)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `capstone-library-system` | Step 1, find the objects | `oopj-capstone-library-system-step-1-find-objects-inline` |
| `capstone-library-system` | Step 6, read your own design | `oopj-capstone-library-system-step-6-read-own-inline` |
| `capstone-library-system` | Step 3, sketch the relationships | `oopj-capstone-library-system-step-3-sketch-relationships-inline` |
| `gang-of-four` | A small responsibility puzzle | `oopj-gang-of-four-small-responsibility-puzzle-inline` |
| `packages-and-architecture` | A tiny "many-classes" example, flat for the playground | `oopj-packages-and-architecture-tiny-many-classes-example-inline` |
| `responsibility-driven-design` | A worked modeling example | `oopj-responsibility-driven-design-worked-modeling-example-inline` |
| `responsibility-driven-design` | CRC cards: a 5-minute design tool | `oopj-responsibility-driven-design-crc-cards-5-minute-inline` |

### `practical-r-for-beginners` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `mini-project-walkthrough` | Step 7, Interpret | `rlang-mini-project-walkthrough-step-7-interpret-inline` |
| `reproducible-analysis` | R Markdown and Quarto: weaving prose, code, and results | `rlang-reproducible-analysis-r-markdown-quarto-weaving-inline` |
| `rise-of-statistical-computing` | What was different about S | `rlang-rise-of-statistical-computing-was-different-about-s-inline` |
| `rise-of-statistical-computing` | The first specialized statistical software | `rlang-rise-of-statistical-computing-first-specialized-statistical-software-inline` |
| `statistics-before-computers` | Tables, slides, and human computers | `rlang-statistics-before-computers-tables-slides-human-computers-inline` |
| `the-age-of-data` | What changed in science | `rlang-the-age-of-data-changed-science-inline` |
| `uncertainty-and-variability` | Signal vs. noise: when does a difference matter? | `rlang-uncertainty-and-variability-signal-vs-noise-does-inline` |
| `why-r-matters-today` | What R is unusually good at | `rlang-why-r-matters-today-r-unusually-good-at-inline` |

### `python-basics` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `hello-world` | The Zen of Python | `python-hello-world-zen-python-inline` |
| `syntax-and-indentation` | Blocks are indentation | `python-syntax-and-indentation-blocks-indentation-inline` |
| `syntax-and-indentation` | Continuation lines | `python-syntax-and-indentation-continuation-lines-inline` |
| `syntax-and-indentation` | The four-space rule (PEP 8) | `python-syntax-and-indentation-four-space-rule-pep-inline` |
| `syntax-and-indentation` | Semicolons (please do not) | `python-syntax-and-indentation-semicolons-please-do-not-inline` |
| `virtual-environments` | Activating the environment | `python-virtual-environments-activating-environment-inline` |
| `virtual-environments` | Modern alternatives: `uv`, `poetry`, `hatch`, `pdm` | `python-virtual-environments-modern-alternatives-uv-poetry-inline` |
| `virtual-environments` | Why virtual environments? | `python-virtual-environments-virtual-environments-inline` |

### `react-from-the-ground-up` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `conditional-rendering` | Pulling logic out with variables and early returns | `rx-conditional-rendering-pulling-logic-out-variables-inline` |
| `context-for-shared-state` | Three pieces: create, provide, consume | `rx-context-for-shared-state-three-pieces-create-provide-inline` |
| `handling-events` | The event object | `rx-handling-events-event-object-inline` |
| `props` | Props are read-only | `rx-props-props-read-only-inline` |
| `rendering-lists` | Why `key` matters | `rx-rendering-lists-key-matters-inline` |
| `state-and-immutability` | Objects: copy, then override | `rx-state-and-immutability-objects-copy-then-override-inline` |
| `state-with-usestate` | Updating objects and arrays without mutating | `rx-state-with-usestate-updating-objects-arrays-without-inline` |
| `thinking-in-react` | 3. Data flows one way (down) | `rx-thinking-in-react-3-data-flows-one-inline` |

### `scientific-computing-python` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `capstone-simulation` | A phase portrait | `scipy-capstone-simulation-phase-portrait-inline` |
| `capstone-simulation` | Quantifying sensitivity | `scipy-capstone-simulation-quantifying-sensitivity-inline` |
| `reproducible-experiments` | Notebooks vs scripts | `scipy-reproducible-experiments-notebooks-vs-scripts-inline` |
| `reproducible-experiments` | Pillar 1: Pin the environment | `scipy-reproducible-experiments-pillar-1-pin-environment-inline` |
| `reproducible-experiments` | Pillar 3: Record inputs and outputs | `scipy-reproducible-experiments-pillar-3-record-inputs-inline` |
| `reproducible-experiments` | Pillar 2: Seed everything stochastic | `scipy-reproducible-experiments-pillar-2-seed-everything-inline` |
| `reproducible-experiments` | Parameter sweeps the disciplined way | `scipy-reproducible-experiments-parameter-sweeps-disciplined-way-inline` |
| `signal-processing` | The Discrete Fourier Transform (and FFT) | `scipy-signal-processing-discrete-fourier-transform-fft-inline` |

### `seaborn-foundations` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `eda-capstone` | Step 5, All pairs at once | `sns-eda-capstone-step-5-all-pairs-inline` |
| `eda-capstone` | Step 6, Communicate the finding | `sns-eda-capstone-step-6-communicate-finding-inline` |
| `eda-capstone` | Step 3, Comparing groups | `sns-eda-capstone-step-3-comparing-groups-inline` |
| `eda-capstone` | Step 2, One variable at a time | `sns-eda-capstone-step-2-one-variable-inline` |
| `eda-capstone` | Step 4, Relationships between pairs | `sns-eda-capstone-step-4-relationships-between-inline` |
| `the-eda-workflow` | A running example: getting to know penguins | `sns-the-eda-workflow-running-example-getting-know-inline` |
| `themes-and-context` | Context: scaling everything for the medium | `sns-themes-and-context-context-scaling-everything-medium-inline` |
| `visual-storytelling` | Guide the reader's eye | `sns-visual-storytelling-guide-reader-s-eye-inline` |

### `sql-analytics-duckdb` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `building-business-metrics` | Revenue per user: averages that do not lie | `duck-building-business-metrics-revenue-per-user-averages-inline` |
| `olap-vs-oltp` | What the analyst is really doing | `duck-olap-vs-oltp-analyst-really-doing-inline` |
| `olap-vs-oltp` | Vectorized execution: the second half of the speed | `duck-olap-vs-oltp-vectorized-execution-second-half-inline` |
| `profiling-a-dataset` | The shortcut: `SUMMARIZE()` | `duck-profiling-a-dataset-shortcut-summarize-inline` |
| `running-totals-and-moving-averages` | The window frame, moving averages | `duck-running-totals-and-moving-averages-window-frame-moving-averages-inline` |
| `sorting-and-top-n` | Per-group top-N with `QUALIFY` | `duck-sorting-and-top-n-per-group-top-n-inline` |
| `subqueries-in-analytics` | Correlated subquery: one per outer row | `duck-subqueries-in-analytics-correlated-subquery-one-per-inline` |
| `thinking-in-datasets` | The loop: question → query → look → next question | `duck-thinking-in-datasets-loop-question-query-look-inline` |
| `why-window-functions` | The `OVER` clause is what makes it a window | `duck-why-window-functions-over-clause-makes-window-inline` |

### `sqlite-for-beginners` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `grouping-data` | One result row per group | `lite-grouping-data-one-result-row-per-inline` |
| `many-to-many` | Junction tables can hold facts about the relationship | `lite-many-to-many-junction-tables-can-hold-inline` |
| `query-execution-order` | Tracing a full query | `lite-query-execution-order-tracing-full-query-inline` |
| `tables-rows-columns` | The grain: what does one row mean? | `lite-tables-rows-columns-grain-does-one-row-inline` |
| `what-is-a-database` | SQL: the language part | `lite-what-is-a-database-sql-language-part-inline` |
| `what-is-a-database` | One radical paper: the relational model | `lite-what-is-a-database-one-radical-paper-relational-inline` |
| `what-is-a-database` | Structure: facts a computer can actually use | `lite-what-is-a-database-structure-facts-computer-can-inline` |
| `why-sqlite` | Why this makes SQLite ideal for learning | `lite-why-sqlite-makes-sqlite-ideal-learning-inline` |
| `why-sqlite` | The honest tradeoff | `lite-why-sqlite-honest-tradeoff-inline` |

### `statistics-for-data-science-python` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `p-values` | What a p-value is NOT | `stat-p-values-p-value-not-inline` |
| `random-variables` | pmf vs pdf: the intuition | `stat-random-variables-pmf-vs-pdf-intuition-inline` |
| `sampling-and-bias` | Survivorship bias: the most famous trap | `stat-sampling-and-bias-survivorship-bias-most-famous-inline` |
| `statistical-fallacies` | Regression to the mean | `stat-statistical-fallacies-regression-mean-inline` |
| `statistical-fallacies` | Cherry-picking and the Texas sharpshooter | `stat-statistical-fallacies-cherry-picking-texas-sharpshooter-inline` |
| `statistical-thinking` | Signal vs. noise | `stat-statistical-thinking-signal-vs-noise-inline` |
| `statistical-thinking` | The data-generating process | `stat-statistical-thinking-data-generating-process-inline` |
| `t-tests` | Two-sample t-test: comparing two independent groups | `stat-t-tests-two-sample-t-test-inline` |
| `the-bootstrap` | The payoff: a CI for the median, which has no easy formula | `stat-the-bootstrap-payoff-ci-median-which-inline` |

### `systems-programming-c` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `c-toolchain` | Stage 4: linking | `sysc-c-toolchain-stage-4-linking-inline` |
| `data-types-and-memory` | Endianness: which byte comes first? | `sysc-data-types-and-memory-endianness-which-byte-comes-inline` |
| `heap-and-dynamic-allocation` | Building a dynamic array (mini `std::vector`) | `sysc-heap-and-dynamic-allocation-building-dynamic-array-mini-inline` |
| `memory-bugs` | 4. Buffer overflow | `sysc-memory-bugs-4-buffer-overflow-inline` |
| `pointers` | NULL: the "points to nothing" pointer | `sysc-pointers-null-points-nothing-pointer-inline` |
| `structs-and-unions` | Flexible array members | `sysc-structs-and-unions-flexible-array-members-inline` |
| `structs-and-unions` | Unions | `sysc-structs-and-unions-unions-inline` |
| `structs-and-unions` | Memory layout and padding | `sysc-structs-and-unions-memory-layout-padding-inline` |
| `why-c-for-systems` | "Portable assembly" | `sysc-why-c-for-systems-portable-assembly-inline` |

### `time-series-analysis-python` (8)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `capstone-forecasting-pipeline` | Step 5-7, Split, fit, and forecast (honestly) | `tsa-capstone-forecasting-pipeline-step-5-7-split-inline` |
| `rolling-and-expanding-windows` | The moving average: `rolling()` | `tsa-rolling-and-expanding-windows-moving-average-rolling-inline` |
| `stationarity` | Testing for it: the Augmented Dickey-Fuller (ADF) test | `tsa-stationarity-testing-augmented-dickey-fuller-inline` |
| `the-pandas-timeline` | The quiet hero: automatic alignment | `tsa-the-pandas-timeline-quiet-hero-automatic-alignment-inline` |
| `what-makes-time-series-unique` | A first, honest forecast baseline | `tsa-what-makes-time-series-unique-first-honest-forecast-baseline-inline` |
| `what-makes-time-series-unique` | Real-world stakes | `tsa-what-makes-time-series-unique-real-world-stakes-inline` |
| `what-makes-time-series-unique` | Why shuffling is sabotage (and where it sneaks in) | `tsa-what-makes-time-series-unique-shuffling-sabotage-where-sneaks-inline` |
| `what-makes-time-series-unique` | The defining property: temporal dependence | `tsa-what-makes-time-series-unique-defining-property-temporal-dependence-inline` |

### `typescript-from-scratch` (9)

| Lesson | Section it belongs under | Prompt id |
| --- | --- | --- |
| `scalable-architecture` | Dependency Inversion in TypeScript | `tsx-scalable-architecture-dependency-inversion-typescript-inline` |
| `scalable-architecture` | Monorepo Type Sharing (Teaser) | `tsx-scalable-architecture-monorepo-type-sharing-teaser-inline` |
| `scalable-architecture` | Application Layer: Use Cases | `tsx-scalable-architecture-application-layer-use-cases-inline` |
| `setup-and-tsconfig` | Essential compiler options | `tsx-setup-and-tsconfig-essential-compiler-options-inline` |
| `setup-and-tsconfig` | When to use strict mode (always) | `tsx-setup-and-tsconfig-use-strict-mode-always-inline` |
| `static-analysis-in-action` | Exhaustiveness Checking | `tsx-static-analysis-in-action-exhaustiveness-checking-inline` |
| `static-analysis-in-action` | Null Safety with `strictNullChecks` | `tsx-static-analysis-in-action-null-safety-strictnullchecks-inline` |
| `static-analysis-in-action` | The Pipeline, Revisited | `tsx-static-analysis-in-action-pipeline-revisited-inline` |
| `static-analysis-in-action` | Refactor Safety | `tsx-static-analysis-in-action-refactor-safety-inline` |
