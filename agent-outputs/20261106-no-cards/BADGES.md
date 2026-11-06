# Brief: put the small badges back

The owner, after seeing the no-cards restyle: "in the data engineer videos,
the little card-like badges look better. Can you restore these?", pointing at
Data Engineer 7's data-skew chips (`a null`, `a guest user`, `guest#0`), and
then "This one too" at Stats-9's ten outlined metric pills ("Conversion ·
Revenue · … · Scroll depth"). The no-cards pass went too far: it turned
**badges** into plain text along with the cards. Put the badges back.

`V` = `/home/user/dataslope/video`. Read `V/README.md`, "No cards unless the
layout needs one", which now says **small badges stay**.

## The style: no border (the owner, after the restore began)

Do not bring back the old outlined look. Every badge, restored or new, uses
the house badge: a light tint of its hue, the hue's ink, rounded corners,
**no border**: `Badge` / `badgeStyle(tone, size)` in `src/editorial/ui.tsx`
(tone: blue, green, red, yellow, teal, purple, orange or gray; size = the
line's text size). The owner's model is backend Part 9's prompt ingredients
(`context` `an interface` `constraints` `a way to check the result`), a
little lighter. A ringed or filled numeral becomes a tinted disc with no
ring. A badge that meant something by its outline style (dashed for
optional) keeps that meaning another way: a lighter tint or soft ink.

## What is a badge (restore) and what is a card (stays removed)

- **Badge, restore it:** a small tinted and/or outlined chip around one word,
  one value, a short tag of a few words, or a ringed / filled numeral.
  Examples: tag pills (`who` `what` `where`), value chips (`guest#0`, `card`
  `cash`), the outlined metric pills, `Pill` / `Chip` / `Tag` components,
  numbered discs and ringed step numbers, the `PK` / `FK` / `UNIQUE` tags,
  outlined status words (`allowed` / `banned`, `pass` / `fail`), outlined
  answer words (`CASCADE` `SET NULL` `RESTRICT`), the hook's question discs.
- **Card, leave it removed:** a box around a sentence, a paragraph, a group of
  lines, a panel, a column, a band or a stat block (question bands, layer
  bands, company or format cards, note and callout boxes, readout panels,
  two-line timeline cards).
- **Keep everything else the no-cards pass did:** column hairlines, the
  spacing rule, the typography fixes (one size per line, a space stays a
  space), highlights.

## How

1. `git -C /home/user/dataslope diff cff9f44 HEAD -- video/src/videos/<dir>`
   shows everything the no-cards pass changed in a folder (cff9f44 is the
   commit just before it started). Find each badge it turned into text and
   restore the badge's look (border, tint, radius, padding, and its ink-in or
   scale-in). Where a component was rewritten (a `Pill` or `Tag` made plain,
   a new plain `Tag`), restore the badge version and point the scenes back at
   it; delete helper files that only existed to replace a badge, if nothing
   else uses them.
2. **One size per line still holds.** A badge's text must be within 12% of
   the text beside it on the same line (that is what `[mixed]` checks). If
   the original badge was smaller, raise the badge's font or put the badge on
   a line of its own; never shrink the line around it below 19px. Keep at
   least 0.15em between a badge and the next word (`[crowded]`).
3. A row of badges separated by middle dots goes back to badges separated by
   their gap; drop the dots.
4. Do not touch narration, cues, `<Sfx>` or art. Do not edit a `parts.tsx` /
   `kit.tsx` another video imports unless every importer is in your list
   (`grep -rl "/<dir>/parts\|/<dir>/kit" V/src/videos`).
5. Checks per changed video, through the private entry and the render queue
   (`out/render-slot.sh`, run_in_background with timeout 7200000, one job of
   yours at a time, logs named with your composition id):
   `CHECK_SCALE=1 VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:frames -- <Id>`
   all ✓; eslint and `tsc` clean for the folder; `npm run check:cues`.
6. Stills of the restored scenes into `out/review/<Id>/badges/` at the same
   frames as the `before/` stills there (which show the original badges),
   and look at each pair: the badge should look like the original.
7. **Disk is tight (about 1.5 GB free).** Never copy `src` into a snapshot;
   the `before/` stills already exist. If a render dies with ENOSPC, stop and
   report. Delete nothing outside `out/review/<Id>/`.
8. Never commit, push, stash, checkout or reset. The lead commits.

## Report (under 15 lines per video)

Per video: the badges restored (scene, what), any size change made to keep
one size per line, the last `check:frames` summary line, and the stills
folder. Videos with no badges to restore: one line each.
