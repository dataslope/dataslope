# Trim brief: far fewer spot images in the eight finished videos

The typography and spot-art pass added 7 to 16 small watercolor images to
each of eight videos. The owner looked at stills and found it **more than
they want**: "I don't want to flood the videos with watercolor images." You
are trimming the art in your videos to the revised rule. **Typography stays
as it is** (it was reviewed and is right); no narration, script or timing
changes.

Read `agent-outputs/20261106-typography-and-spot-art/BRIEF.md` first: its
"How to work" section (private entry, checks, disk, no commits, no shared
files) applies unchanged, and its section 2, "A few small spot images, only
where they earn it", is the rule you are trimming to.

## The rule, in short

**The layout comes first.** The owner: images go in "only when there is
enough whitespace, and adding the image does not hurt the aesthetics of the
beautiful layout you previously had". So judge each image against the page
without it: if the page looked better, or as good, without it, leave it out.
When in doubt, leave it out.

- **At most one image per scene, counting the art that was there before
  today.** A scene that already had art (a hero, an older spot) keeps that
  and gets none of today's. Many scenes end with none.
- **Except side-by-side comparisons:** a scene of two or three panels or
  columns compared side by side may keep one image per panel, matched in
  size and position, so the comparison reads at a glance.
- **Only an image that shows the thing the scene is about.** Not decoration
  for a word said in passing.
- **Only in clearly open space**: at least 80px clear of every word, figure,
  chart, arrow and other image, and 80px from the page's edges, for its whole
  time on screen. Never in a strip left over below or beside text or a
  figure; never tight against a box.
- **Small**: about 140 to 200px on the 1920x1080 page. An older spot that
  sits beside a figure and dominates it is shrunk into that range too.

## What the owner pointed at

- **Stats-3, the warranty scene:** the store, tucked under the warranty sums
  at the bottom of the page, "leaves too little whitespace". Remove it. The
  scene keeps its one image, the warranty (phone and certificate), if it
  meets the rule.
- **Stats-1, "You asked 500.":** "there should not be two images". Remove
  the clipboard. The apple barrel stays, and "should be smaller": shrink it
  into the 140 to 200px range.
- **Data Engineer overview, the "AI has changed this interview" page:** the
  card cabinet "is placed tightly with no whitespace", and "there should also
  only be one image". Remove the cabinet; keep at most one image on that page.

- **Database Design 1, "Even a type is a rule.":** the Mars Climate Orbiter
  (the satellite and planet, older art) "should also be smaller and allow
  more whitespace". Shrink it well into the small range and give it 80px or
  more of white on every side.
- **In general**, the owner reads older spots that run large beside a figure
  the same way: shrink them so the page breathes.

## How to trim

For each image you remove: delete its `<Spot>` (or `<Illustration>`), its
`<Sfx>` pop if it has one, any frame constant only it used, its prompt in the
video's `illustrations.json`, and its file in `public/images/<dir>/`. Never
remove art that was there before today except to shrink it as above (git
shows which: `git log --diff-filter=A --format=%ad -- public/images/<dir>/<file>`).

Then run, through your private entry: `check:frames` (`CHECK_SCALE=1`, every
line ✓), `check:mix` (then delete its three WAVs), `check:cues`, eslint and
tsc for the folder. Render stills of every scene that kept or lost an image,
at the frames where the image is on screen, and look at each: is there
plenty of white around it?

## Report

Per video: each scene and the image it keeps (or none), what you removed,
what you shrank (old and new size), and the last `check:frames` summary.
Under 40 lines per video.
