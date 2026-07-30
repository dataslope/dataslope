# Content images (optimized raster sources)

**This folder is currently empty of sources, and that is the expected state.**

Every image the site serves is now produced by the illustration pipeline
(`gpt-image-2` → Recraft background removal → `promote-illustrations.mjs`),
which encodes once at quality 92 and writes the served file **straight into
`public/images/<slug>.webp`**. Nothing is committed twice. See the
"Illustrations" section of `AGENTS.md` for that workflow.

This folder exists for the other case: a raster image that does *not* come from
the pipeline and needs the build step to optimize it — a photo, a screenshot, a
scanned diagram, a logo someone hands you. It stays supported and tested; there
just isn't one in the repo right now.

## When you do add a source here

Supported: `.png`, `.jpg`/`.jpeg`, `.webp`, `.avif`, `.tif`/`.tiff`. Not
supported: SVG (retired repo-wide — use the illustration pipeline instead) and
GIF (the encoder reads only the first frame, so animation would be silently
dropped; convert first).

1. Add `assets/images/<slug>.<ext>`.
2. Run `npm run build:images` (also runs on `dev`, `build`, and `postinstall`).
   For each source it writes an optimized `.webp` **plus a raster fallback**
   (`.png` when the source has transparency, else `.jpg`) to `public/images/`,
   and records the source hash, intrinsic size, and formats in
   `lib/generated/images.js`.
3. Commit the source, the generated `public/images/*`, and the manifest. These
   generated files are committed on purpose: the script only re-encodes a
   source whose content hash changed, so deploys serve committed bytes with no
   rebuild. If nothing changed it is a true no-op.
4. `<Figure slug="<slug>" alt="…" />` in any MDX then renders it.

> **Keep any source you add in git.** The build prunes optimized files whose
> source is gone, so an uncommitted source would have its served image deleted
> on the next build. Pipeline illustrations are exempt: they have no source
> here, and `build-images` *adopts* them from `public/images` instead of
> pruning them.

The longest edge is capped at 1600px; larger sources are scaled down, smaller
ones left as-is. Transparent sources must read on both the light (`#ffffff`)
and dark (`#121212`) backgrounds — the served `<img>` is not swapped per theme.

## Pending slugs

`__tests__/figureSlugs.test.ts` fails a `<Figure>` whose slug has no image,
because in production such a placement renders nothing at all — a silent
missing image. To land a placement *before* its artwork, list the slug in the
table below and the test will accept it as deliberately pending.

Keep this table empty unless something is genuinely in flight. A stale row is
worse than no row: it whitelists a slug that will never resolve, so a typo
matching it ships an invisible image with no test failure.

| Slug | Image | Placed on |
| ---- | ----- | --------- |
