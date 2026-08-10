# Handoff: roll figcaptions and acronym expansion across the remaining courses

**Date:** 2026-08-10
**For:** whoever picks this up next
**Status:** the method is proven on one course (`time-series-analysis-python`, PR #637). Everything else is untouched.
**Two jobs:** (1) a caption on every inline risograph figure, (2) acronyms expanded before first use.

---

## 1. What is already done

`time-series-analysis-python` is the pilot and the reference. Read
`content/courses/time-series-analysis-python/acf-and-pacf.mdx` before starting:
it is the file both problems were reported against, and it shows the target
state for both.

Also done in that pilot, and **not** part of this handoff: parentheses on
function references (`pd.to_datetime()`), which was a third request and is
complete for that course only. If you extend it, the method is in §4.

## 2. Job one: figcaptions

**Scope: 1,585 figures across 31 courses.** 26 are done (the pilot).

```
93  data-analysis-python-pandas        68  data-wrangling-python-polars
88  machine-learning-scikit-learn      68  beginners-javascript
78  database-design-postgresql         65  intro-data-viz-plotly
73  statistics-for-data-science-python 64  python-basics
71  practical-r-for-beginners          63  typescript-from-scratch
…and 21 more. Full list: the counting script in §5.
```

### What counts

Only `<Figure slug="*-inline-cutout">`. Those are the risograph concept bands
added by PR #636. The lesson-opening illustration (`slug="<course>-<topic>-cutout"`,
no `-inline-`) and the course thumbnail are a different style and are **out of
scope** — the request was specifically about the risograph images.

`<Figure>` already supports `caption`. Nothing else is needed:

```mdx
<Figure
  slug="tsa-differencing-inline-cutout"
  alt="A rising line of blocks on the left, and on the right the gaps between consecutive blocks drawn as short bars around a flat centre"
  caption="Differencing measures gaps, not heights, so a steady rise flattens to a level line."
/>
```

### What makes a good caption here

The complaint that started this was precise: *"it's unclear how they're
relevant."* A caption that describes the picture again is useless — the `alt`
already does that, and the reader can see it. **The caption's job is to connect
the picture's metaphor to the paragraph it sits in.**

- **One sentence. 50 to 110 characters.** The first pass wrote 180 to 300 and
  was sent back as "too long for the learner to read". Current pilot: 48 to
  102, average 78.
- **Name the concept, not the drawing.** "Autocorrelation: slide a copy of the
  series k steps along, and measure how well the two still line up" — not "a
  wave laid over a shifted copy of itself".
- **No straight double quotes.** The attribute is double-quoted; a `"` inside
  breaks the MDX parse. `npm run check:mdx` catches it.
- Prose rules apply: no em dashes, no filler. `npm run check:prose`.

### Where the material comes from

`data/illustration-prompts.json` holds a `subject` for every image, which is
what the artwork actually depicts. Join it to the surrounding heading and the
paragraph above the figure, and the caption more or less writes itself. The
extraction script that produced the pilot's inputs is in §5.

### One judgement call you will hit

Some bands sit under a heading they do not match — the wiring script placed one
per page, so a figure about the log transform can land under "Check your
understanding". **Caption the image, not the heading.** In the pilot, two
figures in `acf-and-pacf.mdx` were also reordered so the one explaining what
autocorrelation *is* came before the one about matching shapes. Reordering is
fair game where it obviously helps; do not make it a project.

## 3. Job two: acronyms

The rule from the review: **avoid acronyms by default, unless the acronym is
universal and known even to beginners.** The concrete failure was using ACF and
PACF in the opening paragraphs and only expanding them further down.

### Scope

A scan finds ~506 distinct domain acronyms over ~4,610 occurrences in prose
across the courses. **Do not treat that as a work list** — it over-reports
badly, and the fix is per-lesson judgement, not search-and-replace.

Highest-value targets, by volume and by how opaque they are to a beginner:

| | |
| --- | --- |
| `LINQ` 149, `JVM` 139, `.NET` 122, `OOP` 87, `FP` 61 | language courses |
| `AUC` 80, `KNN` 69, `MAE`/`RMSE` 65, `ROC` 48 | machine-learning-scikit-learn |
| `IQR` 68, `EDA` 68, `CLT` 81, `SD` 81, `ANOVA` 63 | statistics, pandas, R |
| `TF`/`IDF` 130, `NLP` 65 | natural-language-processing-python |
| `KDE` 69, `ECDF` 58 | seaborn, ggplot2 |

### What the scan gets wrong

It counts any all-caps run of 2 to 6 letters. That sweeps in SQL keywords
(`TEXT` 470, `TABLE` 440, `CREATE` 413, `INSERT`, `VALUES`, `SELECT`) and words
capitalised for emphasis, none of which are acronyms. The §5 script filters
those, but the filter list is not exhaustive — read what it prints before
acting on it.

### The method that worked

1. **Fix the ordering first.** Find each acronym's first prose use in the
   lesson and expand it there: *the **autocorrelation function** (ACF)*. After
   that, the short form is fine and often better.
2. **Then reduce density where the full phrase reads no worse.** Headings, key
   takeaways and the frontmatter `description` were where expansion helped
   most, because they are read out of order.
3. **Titles count.** A sidebar entry reading "Reading ACF and PACF Plots" is
   the problem at its most visible. Two lesson titles changed in the pilot.
4. **Keep the ones that are proper nouns in their field.** ARIMA stayed after
   one expansion; expanding it at every mention read worse, not better. Same
   judgement applies to LINQ, ANOVA, JVM.
5. **The frontmatter `description` and the course `meta.json` description are
   user-facing** (catalog cards, search, SEO). They were missed on the first
   pass of the pilot; do them.

Leave code untouched. `AUC` inside `roc_auc_score` is an identifier, not prose.

## 4. Optional third job: parentheses on function references

Complete for the pilot only, and mechanical enough to script. `pd.to_datetime`
became `pd.to_datetime()` in prose, 88 references. The mask-then-replace
approach in §5 is what made it safe. What must **not** get parentheses:
frequency codes (`min`, `ME`), types (`DatetimeIndex`, `Timestamp`), parameters
(`min_periods`, `center=True`), attributes (`.dt`, `.index`), and
learner-defined variables. Getting that list right per course is most of the
work.

## 5. Scripts

All three of these were written for the pilot and are in the PR's history if
you want them verbatim; they are short enough to rewrite.

**Count what is left, per course:** walk `content/`, match
`<Figure ... />` with `re.DOTALL`, keep slugs containing `-inline-cutout`,
bucket by the first two path segments, and count how many already contain
`caption=`.

**Extract the material for writing captions:** for each such figure, print the
lesson file, the nearest preceding `##`/`###` heading, the last non-empty line
before the tag, and `subject` from `data/illustration-prompts.json` keyed by
the slug with `-cutout` stripped.

**Mask code before touching prose.** This one matters and is the source of the
only near-miss in the pilot. Replace, with a function that preserves newlines
so line numbers stay meaningful:

```python
CODE_PROPS = re.compile(r'(initCode|starterCode|solutionCode|code)\s*[:=]\s*\{?`.*?`\}?', re.S)
FENCE = re.compile(r'```.*?```', re.S)
def mask(m): return re.sub(r'[^\n]', ' ', m.group(0))
```

Then apply edits by splicing at offsets in the **original** string, using the
masked copy only to decide *where*. Editing the masked copy loses the code.

Note that MDX component props escape backticks (`` \` ``), so inline code in a
`markdown={...}` or `instructions={...}` string is `` \`x\` ``, not `` `x` ``.
Every regex over prose needs `\\?` on both sides.

## 6. How to verify

```bash
npm run check:mdx      # attribute values closed, components at top level
npm run check:prose    # no em dashes, no spaced en dashes, no filler
npm run check:mcq      # multiple-choice structure, if you touched options
npm test               # includes the prose-style test
```

`check:mdx` is the one that catches a stray `"` inside a `caption`, and
`check:prose` runs over 1,626 files including these.

Then look at a page. `npm run dev`, open two or three edited lessons, and read
the captions in place — length is the thing that only reveals itself rendered,
and length is what got sent back the first time.

## 7. Suggested shape of the work

Course by course, not job by job: a course's captions and its acronyms want the
same context in your head at the same time. One course per commit keeps the
diffs reviewable, and `data-analysis-python-pandas` (93 figures) or
`python-basics` (64) are reasonable places to start — high traffic, and the
acronym load is light enough that job two will not dominate.
