# Lesson illustrations

Decorative and informative vector illustrations for `/learn` courses. Art is
generated externally (e.g. with [Recraft](https://www.recraft.ai/)) as SVG,
committed under `public/illustrations/<course>/…`, and placed in lessons with
the `<Illustration>` MDX component.

This started as a pilot in **`c-programming-for-beginners`**: every lesson has
prompt-bearing placeholders ready to be turned into artwork.

## The `<Illustration>` component

Registered globally in `mdx-components.tsx`, so no import is needed in MDX.

```mdx
<Illustration
  prompt="Flat abstract vector illustration of a row of numbered mailboxes, each a small rounded rectangle, a few holding tiny digit glyphs. Soft, friendly, no outlines."
  alt="RAM pictured as a row of numbered, byte-sized boxes"
  caption="Memory is just a long row of numbered cells."
  ratio="16 / 9"
/>
```

| Prop      | Required | Purpose                                                                 |
| --------- | :------: | ----------------------------------------------------------------------- |
| `prompt`  |   yes    | Generation prompt. Shown in the placeholder; ignored once `src` is set. |
| `src`     |    no    | Path to the generated SVG (served from `/public`). Swaps in the artwork. |
| `alt`     |    no    | Alt text for the final image. Omit / `""` for purely decorative art.    |
| `caption` |    no    | Visible caption (`<figcaption>`).                                       |
| `ratio`   |    no    | CSS `aspect-ratio` of the frame. Default `16 / 9`.                       |

### Workflow

1. Author places `<Illustration prompt="…" />` where art helps. The site shows
   a dashed placeholder frame that surfaces the prompt.
2. Generate the SVG from that prompt and save it, e.g.
   `public/illustrations/c-programming-for-beginners/memory-mailboxes.svg`.
3. Add `src="/illustrations/c-programming-for-beginners/memory-mailboxes.svg"`
   to the placeholder. The real artwork replaces the frame; the prompt stays in
   the source as a record of how the art was made.

## Prompt / art-direction guidelines

These constraints keep the set coherent and legible on both themes.

- **Style** — flat vector; abstract, artistic, or lightly informative. Decorative
  is fine; not everything needs to teach.
- **No borders/strokes on shapes.** Let fills carry the form.
- **Dual-mode.** Must read on **both** light and dark backgrounds. Avoid pure
  white or pure black fills and large solid backgrounds; prefer transparent
  backgrounds and mid-tone, saturated brand colors that hold up either way.
- **Palette.** Use mainly the brand 500s:
  - blue `#148CFF`, green `#20C621`, yellow `#FFDD6C`, red `#FF4F59`.
  - Other shades (100–900) only when genuinely necessary.
  - Teal / purple / orange: rare, decorative accents only.
- **Text.** Avoid text in the artwork unless it is very simple (a single digit,
  a `+`, a short label).

The four-dot swatch on each placeholder frame is a reminder of the core palette.
