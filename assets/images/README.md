# Content images (optimized raster art)

Drop raster source images here, one per image, named `<slug>.<ext>`. Supported
sources: `.png`, `.jpg`/`.jpeg`, `.webp`, `.avif`, `.tif`/`.tiff`. Not
supported: SVG (vector — author it inline in the MDX instead) and GIF (the
encoder reads only the first frame, so animation would be silently dropped —
convert to PNG/WebP first). The build step optimizes each source and the
`<Figure>` component wires it into the pages that reference its `slug`.

The Recraft topic art is transparent PNG, but this folder takes any raster:
photos, diagrams, screenshots, etc.

## How it works

1. Add a source, e.g. `assets/images/panda.png`.
2. Run `npm run build:images` (also runs automatically on `dev`, `build`, and
   `postinstall`). For each source it:
   - writes an optimized `.webp` plus a raster fallback to `public/images/` —
     `.png` when the source is transparent, otherwise `.jpg`,
   - records the source hash, intrinsic size, and formats in
     `lib/generated/images.js`.
3. **Commit** the generated `public/images/*` and the updated manifest
   alongside the source. Unlike the repo's other generated assets these are
   committed on purpose — the script only re-encodes a source whose content
   hash changed, so deploys serve the committed outputs with no rebuild and no
   per-commit re-encoding. If nothing changed the script is a no-op.
4. Any `<Figure slug="panda" alt="…" />` in the content then renders the image.
   Until a slug's source exists, that placement shows a small hint in `next dev`
   and renders nothing in production — so a page can reference art before it's
   added.

> **Keep the sources in git.** The build runs on every deploy and prunes any
> optimized file whose source is gone, so a source that isn't committed would
> cause its served image to be deleted on the next build.

Transparent sources (the Recraft art) should read on both the light (`#ffffff`)
and dark (`#121212`) backgrounds — the served `<img>` is not swapped per theme.

The longest edge is capped at 1600px on optimization; larger sources are scaled
down (smaller ones are left as-is).

## Slugs referenced by the content

These slugs are placed in the pages below, and each has a matching
`<slug>.png` source in this folder. A slug can be reused on more than one page.
Rename freely — the slug is just the filename; update the `<Figure slug="…">`
call to match.

| Slug                 | Image                                   | Placed on |
| -------------------- | --------------------------------------- | --------- |
| `panda`              | Panda in sunglasses (pandas mascot)     | `courses/data-analysis-python-pandas` · `interview-prep/data-analyst` |
| `conversation`       | People talking / speech bubbles         | `courses/natural-language-processing-python` · `interview-prep` (landing) |
| `penguins`           | Penguin family (Palmer Penguins vibe)   | `courses/seaborn-foundations` |
| `us-map`             | US map with plotted points              | `courses/intro-data-viz-plotly` |
| `playground`         | Playground (slide, swings)              | `courses/python-basics` |
| `programmer-duck`    | Programmer duck (rubber-duck debugging) | `courses/beginners-javascript` · `courses/java-programming-for-beginners` |
| `control-flow`       | Branching control-flow arrows           | `courses/c-programming-for-beginners` · `courses/typescript-from-scratch` |
| `calculator`         | Calculator                              | `courses/scientific-computing-python` |
| `cpu`                | CPU chip                                | `courses/systems-programming-c` |
| `ram`                | Stick of RAM (memory)                   | `courses/from-zero-to-cpp` |
| `stack`              | Stack data structure (LIFO)             | `courses/mastering-dsa-cpp` · `courses/java-collections-and-generics-deep-dive` |
| `gpu`                | GPU                                     | `courses/machine-learning-scikit-learn` · `interview-prep/machine-learning-engineer` |
| `box-plot`           | Minimal box plot                        | `courses/statistics-for-data-science-python` |
| `line-chart`         | Minimal line chart                      | `courses/time-series-analysis-python` |
| `data-visualization` | Assortment of charts                    | `courses/mastering-ggplot2` · `interview-prep/data-scientist` |
| `bi-dashboard`       | Business-intelligence dashboard         | `courses/sql-analytics-duckdb` · `interview-prep/analytics-engineer` |
| `a-risograph-of-a-blueprint`                  | Architectural blueprint (class as a plan) | `courses/oop-blueprint-java` |
| `a-risograph-of-a-gardener-stemming`          | Gardener pruning stems                     | `courses/natural-language-processing-python` (`stemming-and-lemmatization`) |
| `a-risograph-of-a-linked-list-data-structure` | Linked list                                | `courses/mastering-dsa-cpp` (`linked-lists`) |
| `a-risograph-of-a-pipeline`                   | Data pipeline                              | `interview-prep/data-engineer` (`pipelines`) |
| `a-risograph-of-a-queue-data-structure`       | Queue (FIFO)                               | `courses/mastering-dsa-cpp` (`queues`) |
| `a-risograph-of-a-string-data-structure`      | String of characters                       | `courses/python-basics` (`strings`) |
| `a-risograph-of-a-warehouse`                  | Warehouse (data warehouse)                 | `interview-prep/analytics-engineer` (`dimensional-modeling`) |
| `a-risograph-of-beautiful-sea`                | Calm sea                                    | `courses/seaborn-foundations` (`visual-storytelling`) |
| `a-risograph-of-inside-a-data-center`         | Inside a data center                       | `courses/intro-sql-postgres` (`what-is-a-database`) |
| `a-risograph-of-sorting`                      | Sorting into order                         | `courses/mastering-dsa-cpp` (`sorting-basic`) |
| `a-risograph-of-the-boolean-data-type`        | Boolean (true / false)                     | `courses/python-basics` (`booleans`) |
| `a-risograph-of-the-dictionary-data-type`     | Dictionary (key → value)                   | `courses/python-basics` (`dictionaries`) |

To add more, drop `<slug>.<ext>` here and place a `<Figure slug="<slug>" alt="…" />`
wherever it fits.
