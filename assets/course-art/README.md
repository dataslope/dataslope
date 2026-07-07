# Course art (raster illustrations)

Drop the Recraft-generated **transparent PNGs** here, one per image, named
`<slug>.png`. The build step optimizes them and wires them into the pages that
reference each `slug`.

## How it works

1. Add a source PNG, e.g. `assets/course-art/panda.png`.
2. Run `npm run build:course-art` (also runs automatically on `dev`, `build`,
   and `postinstall`). It:
   - crushes each PNG and writes an optimized `.png` + `.webp` pair to
     `public/course-art/` (both gitignored — regenerated from these sources),
   - records each image's intrinsic size in `lib/generated/course-art.js`.
3. Any `<Illustration slug="panda" … />` in the content then renders the image.
   Until a slug's PNG exists, that placement shows a small hint in `next dev`
   and renders nothing in production — so a page can reference art before it's
   drawn.

Source images should be drawn to read on both the light (`#ffffff`) and dark
(`#121212`) backgrounds — the served `<img>` is not swapped per theme.

The longest edge is capped at 1600px on optimization; larger sources are scaled
down (smaller ones are left as-is).

## Slugs referenced by the content

These slugs are already placed in the pages below. Add the matching
`<slug>.png` to light them up. Rename freely — the slug is just the filename;
update the `<Illustration slug="…">` call to match.

| Slug           | Image                                   | Placed on |
| -------------- | --------------------------------------- | --------- |
| `panda`        | Panda in sunglasses (pandas mascot)     | `courses/data-analysis-python-pandas` · `interview-prep/data-analyst` |
| `conversation` | People talking / speech bubbles         | `courses/natural-language-processing-python` · `interview-prep` (landing) |
| `penguins`     | Penguin family (Palmer Penguins vibe)   | `courses/seaborn-foundations` |
| `us-map`       | US map with plotted points              | `courses/intro-data-viz-plotly` |
| `playground`   | Playground (slide, swings)              | `courses/python-basics` |

To add more, drop `<slug>.png` here and place an `<Illustration slug="<slug>" alt="…" />`
wherever it fits.
