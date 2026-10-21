# Stats-4-Distributions (0-452 s, whole video)

## Verdict
- The video is solid overall. Every number matches measurements.json and the lessons, and the charts are clean. Most scenes end on a readable finished figure with a 1.3 s or longer hold.
- The biggest content risk is in Part 1. Fig. 1's Bernoulli at 0.3 stays on screen beside a binomial built on 0.03, under headlines that say "count the yeses". A viewer will try to connect the two and the numbers don't fit.
- Part 2 is the weakest stretch. The uniform at 0.1 is a 19 px sliver, so the area argument has no visible area. Three dense beats run back to back with breaths of 0.30 to 0.45 s. Fig. 7's title goes stale after the squeeze. The quantile scene says "the area, read backwards" over a CDF that never shows an area.
- New notation and plot types are asserted rather than built: mu/sigma in the z formula, the CDF, the Q-Q plot, and "many small effects add up" (shown only as an empty axis).
- Pacing is mostly comfortable, at 2.3 to 3.0 words/s. The rushed spots are the cast names at the end of the hook (flashed for under 1 s), the uniform/slice/squeeze run, and the Q-Q intro. Several scenes open on empty axes for 5 to 7 s.

## Findings

### 1. [P1] confusion: The Bernoulli's 0.3 sits beside a binomial built on 0.03
- When: 25.7-44.4 s, beats `binomial`, `six`, `ten` (element-050.jpeg, element-086.jpeg)
- What: Fig. 1 shows no 0.7 / yes 0.3 ("a chance of, say, point three"). The headline then goes from "One yes or no: Bernoulli." to "Count the yeses: binomial.", which says Fig. 2 counts Fig. 1's yeses. But Fig. 2 is binom(200, 0.03). The narration says "point three" and then, 10 s later at 3.37 w/s, "three in a hundred". Nothing marks the change, and Fig. 1 stays up until 43.9 s. At 0.3, 200 visitors would center near 60, not 6.
- Why it matters: The one idea that links the two distributions (a binomial counts Bernoulli trials) is shown with numbers that contradict each other.
- Cause: `video/src/videos/distributions/CastScene.tsx:133` (`bernoulliOut = holdsAt - 10` keeps Fig. 1 up through the whole binomial). The values are BERNOULLI.p 0.3 and BINOMIAL.p 0.03 in `data.ts`, and the `binomial` beat is in `script.ts`.
- Fix: Fade Fig. 1 at `hundredAt`, not `holdsAt - 10`. Say the switch aloud: "Now a rarer yes: show the page to two hundred visitors, each with a chance of three in a hundred". Raise `bernoulli` pauseAfter to 0.7.

### 2. [P2] pacing: The seven named shapes flash for under a second
- When: 14.0-15.6 s, end of `hook` (element-029.jpeg, element-030.jpeg, element-031.jpeg)
- What: The narration promises "those shapes have names" but never reads them. The names ink in from about 14.1 s, staggered by 3 frames each. The whole row starts fading at 15.1 s, so "Normal" finishes inking just as the fade begins. Reading the 7 names takes about 3.5 s. The Counts / Measurements split, which Part 2 later relies on ("Measuring, not counting"), is never mentioned.
- Why it matters: The hook's payoff is gone before anyone can read it.
- Cause: `CastScene.tsx:112` (`castOut = ease(frame, startAt - 6, 14)`) and `CastScene.tsx:262` (names at `namesAt - 4 + i * 3`).
- Fix: Give `hook` a pauseAfter of 2.5 (instead of 0.5) so the finished row holds for at least 2.5 s. Optionally add "Some count, some measure" to the narration.

### 3. [P2] spacing: The Bernoulli opens on a blank page, then sits in the left third for 10 s
- When: 15.1-26.6 s, beat `bernoulli` (element-032.jpeg, element-034.jpeg, element-040.jpeg, element-044.jpeg)
- What: From 15.1 to 16.7 s only the kicker is on screen. After that, Fig. 1 fills x 160-590 while x 600-1800 stays empty until Fig. 2 arrives at 26.6 s. There is no headline until "One yes or no:" at 22.9 s.
- Why it matters: The first counting distribution plays to 8 s of near-empty page.
- Cause: `CastScene.tsx:57-60` (NO_X 270, YES_X 480, dots from x 182) and `CastScene.tsx:173` (headline at `yesNoAt - 6`).
- Fix: Center Fig. 1 during `bernoulli` (bars at about x 820 and 1100, dots centered) and slide it into the left column at `hundredAt`. Bring "One yes or no:" in at `startAt`.

### 4. [P2] spacing: The curve runs through the label "short waits, common"
- When: 154.0-173.0 s, beats `exact` to `zero` (element-340.jpeg)
- What: The blue exponential curve crosses the "s" of "short".
- Why it matters: It's an obvious text/mark collision on a figure held for 19 s.
- Cause: `AreaScene.tsx:131` (the label is anchored at `sx(X, 0.8)`, `py(f(0.8)) - 10`, which is on the curve itself).
- Fix: Move the label to `x={sx(X, 1.5)}`, `y={py(f(0.8)) - 40}`, so it sits clear to the right of the curve.

### 5. [P2] confusion: The quantile tracer dot runs ahead of its curve, and its readout contradicts 599
- When: 230.5-233.5 s, beat `across` (element-462.jpeg)
- What: The dot and its readout "by 608 ms: 95%" float on the dashed 95% line while the drawn curve has only reached about 535 ms. Three seconds later the answer is given as "599 ms".
- Why it matters: The dot looks detached from the line, and a viewer sees two different times for 95%.
- Cause: `QuantileScene.tsx:50` moves the cursor linearly in x, but `parts.tsx:384` reveals the curve by arc length (`pathLength={1}`). The steep start makes the stroke lag behind the dot.
- Fix: Reveal Fig. 8's curve with the x-clip branch (`parts.tsx:374`, clipPath at `sx(X, cursor)`), or move the cursor by arc length. Hide the readout once `f(cursor) > 0.9`.

### 6. [P2] confusion: Fig. 7's title still says "from 0 to 10" after the squeeze
- When: 203.0-223.5 s, beats `squeeze`, `density`, `quantile-in` (element-436.jpeg)
- What: The block now spans 0 to 0.5 and the code reads `uniform(loc=0, scale=0.5)`, but the title still reads "A value spread evenly from 0 to 10". The dashed line at density 1.0 (it appears at "climb") has no label and the narration never mentions it.
- Why it matters: The figure's own caption contradicts what it shows during the key "density can exceed 1" moment.
- Cause: `HeightScene.tsx:89` (static title) and `HeightScene.tsx:101-104` (unlabelled reference line).
- Fix: Retitle at `squeezeAt` to "The same probability, squeezed into 0 to 0.5", or use a neutral title. Label the dashed line "1: the most a probability can be".

### 7. [P2] spacing: The uniform at 0.1 is a 19 px sliver, so "area" has no visible area
- When: 189.8-202.7 s, beats `uniform`, `slice` (element-403.jpeg)
- What: The y axis runs to 2.0 from the first frame, so the 0-10 block stands 19 px tall. The 3-to-7 slice is a red stripe that cannot be read as a rectangle, while the narration says it "holds four tenths of the probability".
- Why it matters: The idea that area is the probability needs a visible width × height, and here there isn't one.
- Cause: `HeightScene.tsx:16` (`PER = 190`) and `HeightScene.tsx:95` (ticks to 2 from `uniformFrom`).
- Fix: Start the y axis at 0-0.25 (PER about 1500, so 0.1 stands about 150 px) and animate the scale to 0-2 during the squeeze, re-labelling the ticks.

### 8. [P2] pacing: Three dense density beats with 0.3-0.45 s breaths, and the area formula is up for about 1 s
- When: 189.8-209.2 s: `uniform` 3.03 w/s then a 0.30 s gap, `slice` 3.24 w/s then 0.40 s, `squeeze` 3.34 w/s then 0.45 s. "area = 4 × 0.1 = 0.4" is visible about 201.5-202.8 s (element-404.jpeg, element-406.jpeg).
- What: Three distinct ideas arrive back to back at the fastest sustained rate in the video: a flat density of 0.1, a slice's area of 0.4, and a squeeze to height 2. The only on-screen equation that links height × width to probability is gone in about a second.
- Why it matters: This is the conceptual core of Part 2, and it outruns the viewer.
- Cause: `script.ts` pauseAfter values (0.3 on `uniform`, 0.4 on `slice`) and `HeightScene.tsx:147` (`out={squeezeAt - 6}`).
- Fix: Set pauseAfter to 0.8 on `uniform` and 1.0 on `slice`. Keep the area label until `keepAt` and re-set it as "width × height = 4 × 0.1 = 0.4" so it matches the squeeze panel's "width × height".

### 9. [P2] explanation: "The area, read backwards" over a chart with no area
- When: 230.3-246.0 s, beats `across`, `cutoff` (element-492.jpeg)
- What: Fig. 8 switches from the density curves of Figs. 6-7 to a cumulative curve. Nothing says that its height at t is the area to the left of t. The headline nonetheless says "the area", and the cdf/ppf panel is never spoken.
- Why it matters: Without that link, the quantile is just a lookup on a new kind of chart, not "the area read backwards".
- Cause: `QuantileScene.tsx:66-70` (headline), `QuantileScene.tsx:101` (a bare CDF), and the `across` beat in `script.ts`.
- Fix: Add to `across`: "Its height at each moment is the area to the left under the density." Draw a small density inset whose shaded area sweeps in step with the tracer, reusing `areaD`.

### 10. [P2] explanation: z = (x − μ) / σ, with μ and σ never defined
- When: 315.0-338.1 s, beats `z`, `position` (element-664.jpeg)
- What: Greek symbols appear under the headline. The narration says "mean" and "standard deviations" but never connects them to μ and σ, and no earlier scene uses them.
- Why it matters: An undefined symbol is the first thing a beginner stumbles on.
- Cause: `ZScene.tsx:98-104`.
- Fix: Set it as "z = (score − mean) / SD = (130 − 100) / 15 = 2", or add "mu, the mean, and sigma, the standard deviation" to the `z` beat.

### 11. [P2] explanation: "Many small effects add up" is asserted over an empty axis
- When: 251.9-259.0 s, `bell` and the start of `penguins` (element-512.jpeg)
- What: For 7 s the screen shows a headline and a bare axis. The mechanism behind the normal (sums of small nudges become a bell), which the lesson illustrates, gets no visual. The penguin dots only start falling at "flippers".
- Why it matters: The reason the normal is everywhere is stated but not shown.
- Cause: `BellScene.tsx:57` (dots start at `flippersAt`) and `BellScene.tsx:90` (axis only).
- Fix: During `bell`, run a short seeded "nudges" demo: about 40 dots take ±1 steps down 10 rows and pile into a mound, using `mulberry32` from `data.ts`. Then hand over to the penguins.

### 12. [P2] explanation: The Q-Q plot is introduced in one sentence over empty axes
- When: 396.9-407.0 s, `qq` at 2.80 w/s then a 0.40 s gap (element-802.jpeg, element-810.jpeg, element-812.jpeg)
- What: "Lines up the data's quantiles against the model's" is spoken over empty axes (400-403 s). The points arrive between 403 and 405.5 s. Fig. 13 starts at 406 s, about half a second after Fig. 12 finishes. No single point is ever shown being built.
- Why it matters: It's a new plot type, and a viewer who doesn't know what one dot means can't read the bend.
- Cause: `QQScene.tsx:61-62` (normal points start at `pointsAt - 6`) and `script.ts` (`qq` pauseAfter 0.4).
- Fix: At "data's quantiles", highlight one point (for example the 90th percentile of both) with dotted guides to each axis and both values. Set pauseAfter to 1.2 on `qq`.

### 13. [P2] confusion: "And the lower tail, too" labels the wrong part of Fig. 13
- When: 410.0-415.5 s, beat `bend` (element-828.jpeg)
- What: The red lower-tail dots sit at the far left (theoretical −20 to 10). The label sits at data x 50, about 180 px to the right, under the middle of the line.
- Why it matters: The label points at the stretch that fits, not at the tail.
- Cause: `QQScene.tsx:161` (`x={sx(scaleFor(PANELS[1]), 50)}`, `y={yFor(PANELS[1])(12)}`).
- Fix: Anchor it at `sx(..., -15)` and `yFor(...)(32)`, just above the left tail (the costly-mistakes note follows at +36).

### 14. [P3] accuracy: "A variance" labels a bracket that spans ±1 SD
- When: 6.3-12.0 s, beat `hook` (element-018.jpeg)
- What: The bracket under the binomial runs from mean − sd to mean + sd, which is a length in the data's units, but it is captioned "a variance, its spread". A variance is in squared units.
- Why it matters: It plants a wrong picture of variance at the start of the unit.
- Cause: `CastScene.tsx:208-209` (bracket ±`soloSd`) and `CastScene.tsx:222`.
- Fix: Caption it "a variance: how far it spreads". Or bracket ±1 SD and caption "its spread (one SD each side)".

### 15. [P3] explanation: The overdispersion claims are said, not drawn
- When: 50.5-55.4 s, `alone` (element-120.jpeg); 87.1-99.2 s, `same` (element-198.jpeg)
- What: The "real counts swing wider" arrows run from the mode to 0.5 and 11.5, which is inside the binomial's own range, so they show nothing wider. "Mean and variance: both three" marks only the mean; the variance and "clumping" exist as text only.
- Why it matters: Each scene's caution is stated but has no visual to support it.
- Cause: `CastScene.tsx:394-397` and `PoissonScene.tsx:200-203` and `PoissonScene.tsx:230-240`.
- Fix: At `wider`, draw a dashed red outline of an overdispersed count (a negative binomial with the same mean and three times the variance) over Fig. 2. Do the same over Fig. 4 at `vary`.

### 16. [P3] explanation: Code and jargon labels the narration never touches
- When: `.sf(9)` beside "10 or more" (42.5 s, element-086.jpeg); `binom(200, 0.03)`, `poisson(3)`, `geom(0.2)`, `expon(scale=5)`; `cdf(8)` and `ppf` (182 s, 241 s); the y-axis "density" from 150 s, 60 s before density is defined at 209.7 s; "SD" on the rule axis at 284 s.
- What: `.sf(9)` next to "10 or more" looks like an off-by-one, and nothing on screen explains it.
- Why it matters: Each unexplained label is small, but together they add noise, and `.sf(9)` reads as a mistake.
- Cause: `CastScene.tsx:390`, `AreaScene.tsx:121-123`, `QuantileScene.tsx:142-154`.
- Fix: Drop `.sf(9)` or set it as "sf(9): more than 9". Label the exponential's y axis "height (density)". Keep the code captions only where the narration says "in code".

### 17. [P3] confusion: The rule's percentages count up far from their growing brackets
- When: 286.0-293.5 s, beats `rule`, `two` (element-586.jpeg: "62.04%" sits alone at x 1500 while its bracket spans ±0.6 SD)
- What: Each counter sits at the bracket's final right end and runs through wrong intermediate values (56.37%, 62.04%) while the bracket is still small.
- Why it matters: Wrong numbers float detached from the shape they describe.
- Cause: `RuleScene.tsx:131-132` (the label is fixed at `sx(X, b.k) + 14`, and the Count starts at `b.at + 4`).
- Fix: Place the label at the bracket's moving right end (`x1 + 14`), or start the Count once the bracket is complete (`b.at + 22`).

### 18. [P3] other: Headline fragments left hanging
- When: "A z-score is" stands alone from 313.6 to 327 s (element-646.jpeg). "Numbers back" stands alone from 389.5 to 393 s.
- What: Unfinished sentences headline the page for 13 s and 3.5 s. "Numbers back aren't proof of a fit." also reads awkwardly once complete.
- Why it matters: It looks like a typo or a render that didn't finish.
- Cause: `ZScene.tsx:92-97` and `FitScene.tsx:69-72`.
- Fix: Use "A z-score:" then "a position." Use "A fit always answers." then "That isn't proof it fits."

### 19. [P3] spacing: Labels crowd their marks
- When: 344-366 s, "median 35,718" sits 3-5 px above the tallest income bars (element-724.jpeg). 88-103 s, "mean 3" sits on the simulation tick at the top of bar 3 (element-198.jpeg).
- What: Both labels touch the marks they annotate.
- Why it matters: The house rule asks for clear space between text and marks.
- Cause: `SkewScene.tsx:108` (`y={base - h(TALL + 24)}`) and `PoissonScene.tsx:201` (`y={base - h(TALL + 22)}`).
- Fix: Raise both by `h(30)` and their VRule tops to match.

### 20. [P3] other: Irregular axis ticks
- When: Fig. 9 starts its axis at 172 and then goes 180, 190 (252-283 s, element-562.jpeg). Fig. 14 uses 40, 80, 100, 120, 160, 200 (415-452 s, element-896.jpeg).
- What: The tick spacing is uneven, which reads like a broken scale.
- Why it matters: It's a polish issue only.
- Cause: `BellScene.tsx:90` and `ExtentScene.tsx:131`.
- Fix: Use `[170, 180, 190, 200, 210]` and `[40, 60, 80, 100, 120, 140, 160, 180, 200]`.

### 21. [P3] pacing: Scenes that open on empty axes
- When: Geometric 103.7-109.5 s (element-216.jpeg). Quantile 223.5-230.3 s (element-458.jpeg). Q-Q 396.9-403 s (see 12). Bell 251.9-259 s (see 11).
- What: Each of these scenes holds only a headline, an empty frame and axis ticks for 5 to 7 s while the narration sets up the example.
- Why it matters: It's dead air while the example is being explained.
- Cause: `GeometricScene.tsx` `barAt` (bars cued to `geometric`) and `QuantileScene.tsx:49` (curve at `plotAt`).
- Fix: Grow the geometric bars from "Count the tries", and draw Fig. 8's curve from "response times" (the tracer can still run at "Plot").

### 22. [P3] confusion: Dot strips that say the wrong thing
- When: 108-122 s, "one call in five closes" fills the third of five dots (element-242.jpeg). 16-44 s, Fig. 1 is titled "One visitor, yes or no" but draws ten visitors.
- What: In a scene about the number of calls until the first sale, a red third dot reads as "the third call closes". Fig. 1's title doesn't match what it draws.
- Why it matters: A viewer can read the wrong fact from a simple icon strip.
- Cause: `GeometricScene.tsx:83` (`i === 2`) and `CastScene.tsx:270`.
- Fix: Replace the strip with a single 20% pie labelled "each call: a 1-in-5 chance". Retitle Fig. 1 "Visitors, each a yes or no".

### 23. [P3] other: Fig. 3's 24 hours are unrepresentative of Poisson(3)
- When: 63-103 s, beats `poisson` to `same` (element-154.jpeg)
- What: Four of the 24 hours show 7 tickets, though P(7) is 2.2%. This is right before "8 or more" is called a 1-in-84 spike, so 7 looks routine and 8 looks arbitrary.
- Why it matters: The sample on screen undercuts the rarity claim beside it.
- Cause: `measure.py:159` (`hours[:24]`).
- Fix: Use a 24-hour window from the same seeded draw whose counts track the pmf (at most one 7, no 8+), and say "24 of the simulated hours".

### 24. [P3] explanation: Figure labelling gaps
- When: 283-338 s (Rule and Z scenes) and 366-397 s (Fig. 11)
- What: The two charts in the Rule and Z scenes have no Fig. label, unlike every other chart. Fig. 11 says "500 measurements" with no quantity or unit. It also never shows the true mean 72 and SD 6 (from `measure.py`), which would show the fit recovering them as 71.9 and 5.75.
- Why it matters: The numbering is inconsistent, and the estimation point has no ground truth to compare against.
- Cause: `RuleScene.tsx` and `ZScene.tsx` (no FigLabel), and `FitScene.tsx:79`.
- Fix: Add "Fig. 10 Any normal, in standard deviations" and "Fig. 11 Test scores, mean 100, SD 15", then renumber. Retitle the fit figure "500 values drawn from a normal with mean 72, SD 6".

### 25. [P3] spacing: The middle of each Q-Q line washes out
- When: 404-415.5 s (element-828.jpeg)
- What: The densely overlapping middle points render pale and almost white, which looks like the middle is de-emphasized.
- Why it matters: It's visual noise in the panel that needs to read as "on the line".
- Cause: `QQScene.tsx:133-137` (a paper-colored stroke of 0.8 plus opacity 0.85 on 400 overlapping dots).
- Fix: Use `stroke="none"` and `opacity={1}`, or thin out to every second point in the middle 80%.
