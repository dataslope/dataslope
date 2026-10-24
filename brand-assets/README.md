# Brand source assets

Master/source artwork for the DataSlope logo, kept under version control but
**deliberately outside `public/`** so it is never deployed or served by the
web host.

| Folder | Format | Purpose |
| --- | --- | --- |
| `logo-files/EPS/` | Encapsulated PostScript (~17 MB) | Print / vector master |
| `logo-files/AI/` | Adobe Illustrator | Editable source |

## Why these are not in `public/`

Anything under `public/` is published as a static asset and is publicly
fetchable on every deploy. These print/source files (~17 MB) are never
referenced by the app, so serving them only adds deploy size and a hotlink /
crawl bandwidth liability with zero user benefit.

The **web-facing** logo assets the app actually uses stay in `public/`:

- `public/logo-files/SVG/*.svg`, referenced by the home page
  (`app/_components/home/BeamSection.tsx`, `HomeFooter.tsx`)
- `public/logo-files/4x/*.png`, `public/dataslope-logo-blue.svg`,
  `public/dataslope-blue@4x.png`

If you need a logo in a new format on the site, export it into `public/`
rather than moving these source files back.

## YouTube channel art

`youtube/` holds the channel's banner and profile picture, the blue mark on
white, generated from `public/dataslope-logo-blue.svg` by
`npm run build:youtube-art` (`scripts/build-youtube-art.mjs`, which documents
the sizing).

| File | Size | Upload as |
| --- | --- | --- |
| `dataslope-youtube-banner.png` | 2560 × 1440 | Banner image: mark and wordmark |
| `dataslope-youtube-banner-mark-only.png` | 2560 × 1440 | Banner image: mark alone |
| `dataslope-youtube-profile.png` | 800 × 800 | Profile picture |

The banner's artwork sits inside YouTube's 1546 × 423 centre safe area, the
part every device shows. The wordmark is set in Inter SemiBold, which the
script reads from an installed copy (`INTER_FONT=<path>` to point at one).
