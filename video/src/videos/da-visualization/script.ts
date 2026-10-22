import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Data visualization" (16:9), Part 6 of the Data Analyst
 * interview prep videos (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md),
 * after content/interview/data-analyst/data-visualization.mdx. It answers all
 * twenty-two of the page's questions: seventeen drawn the wrong way and the
 * right way, numbered aloud, then five quick ones (numbered 18 to 22 on
 * screen only).
 *
 *   1. choosing a chart ("choose").
 *   2. line or bar; 3. pie charts ("line").
 *   4. histogram or bar chart; 5. bin width ("hist").
 *   6. a truncated axis; 7. a non-zero baseline ("axis").
 *   8. log scales ("log").
 *   9. dual axes; 10. other ways charts mislead ("dual").
 *   11. an effective dashboard; 12. a dashboard or a report ("dash").
 *   13. telling a story; 14. annotations ("story").
 *   15. a palette; 16. capping the categories; 17. accessibility ("palette").
 *   Quick ones ("rapid-in"): 3D and area; the data-ink ratio; Tableau, Power
 *   BI and Looker; scatter plots and overplotting; part to whole over time.
 *
 * The opening is its own, not an earlier part's (asked for on 2026-10-22):
 * one set of numbers drawn as a pie and then redrawn as a line, and its own
 * words for how the video is split and for the quick round.
 *
 * Every abbreviation is spelled out the first time it is spoken (asked for on
 * 2026-10-22): BI is business intelligence.
 *
 * No series intro yet (decided 2026-10-21): the first scene opens at frame 0.
 *
 * Facts. Every number is the page's own chart data, computed by check.mjs into
 * results.json, which data.ts reads:
 *   - the encoding ranking: color about 3 times the error of position.
 *   - five shares, 31, 24, 22.5, 14 and 8.5 percent: SUV and truck 1.5
 *     points apart.
 *   - 420 tickets: by channel, Email 149 down to Social 41; by hours to
 *     resolve, in two-hour bins.
 *   - a bimodal sample of 1,000 in bins 5, 1 and 0.25 wide.
 *   - five scores from 94.1 to 99.0: 5.2% apart, and 50 times as tall on an
 *     axis from 94.
 *   - twelve monthly scores from 94.2 to 97.6 on an axis from 92: a 3.6% rise,
 *     the last bar 2.55 times the first.
 *   - two series: 4,000 growing 6% a period and 40 growing 35%.
 *   - a dual axis over two unrelated series with correlation 0.12.
 *   - a decade with no net change, and a four-month window in it up 25%;
 *     a series rising 61% drawn upside down; a four-day gap filled with zeros.
 *   - a dashboard grid where the top-left slot gets 8 times the attention of
 *     the bottom-right; a dashboard grown to 41 panels with 6 opened.
 *   - revenue falling 12% the month after a price rise.
 *   - signups growing about 4 times faster after a June pricing change (the
 *     page's chart title says "doubled"; its own slopes, 1.1 and 4.3 a month,
 *     say four).
 *   - 4,333 points in two clusters and a bridge; web orders flat at 64 and 65.
 */
export const script: NarrationScript = {
  id: "da-visualization",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every chart is an argument about the numbers under it. Here are six weeks of tickets, as a pie. Nothing on it is false, and it tells you nothing. Draw the same six numbers as a line, and the story is there before you read a label.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "That's what these interviews test: choosing the chart, not misleading anyone, and telling the story. There are twenty-two questions. We'll draw seventeen of them twice, the wrong way and the right way, and finish with five short ones.",
      pauseAfter: 0.7,
    },
    { id: "choose-in", text: "First, how to pick." },

    // ── 1. Choosing a chart ───────────────────────────────────────────────
    {
      id: "choose",
      scene: true,
      text: "Question one. How do you choose the right chart for a question?",
      pauseAfter: 0.6,
    },
    {
      id: "choose-map",
      text: "Start from the question, not the chart. Change over time is a line. Comparing categories is a bar. A part of a whole is a stacked bar. A distribution is a histogram or a box plot. And a relationship is a scatter.",
      pauseAfter: 0.7,
    },
    {
      id: "choose-rank",
      text: "Under all of it is how accurately people read each encoding. Position comes first, then length, angle and area, and color last, at about three times the error of position.",
      pauseAfter: 0.7,
    },
    { id: "line-in", text: "Two choices come up in almost every interview." },

    // ── 2, 3. Line or bar, and pies ───────────────────────────────────────
    {
      id: "line",
      scene: true,
      text: "Question two. Line chart or bar chart?",
      pauseAfter: 0.6,
    },
    {
      id: "line-x",
      text: "It's a question about the x axis. A line says the value passed through everything in between, which is true of weeks. Bars work over weeks too.",
      pauseAfter: 0.6,
    },
    {
      id: "line-wrong",
      text: "But put six issue types on the axis, and a line draws a trend through categories that have no order. That's the one wrong chart of the four.",
      pauseAfter: 0.8,
    },
    {
      id: "pie",
      text: "Question three. When is a pie chart appropriate? For a few slices of one whole, two to four. Here are five shares. On the pie, SUV and truck look the same.",
      pauseAfter: 0.6,
    },
    {
      id: "pie-bar",
      text: "Sorted as bars, the one and a half point gap between them is plain. And never use pies to compare groups, or a share over time.",
      pauseAfter: 0.7,
    },
    { id: "hist-in", text: "Next, two charts that look alike and aren't." },

    // ── 4, 5. Histograms ──────────────────────────────────────────────────
    {
      id: "hist",
      scene: true,
      text: "Question four. What's the difference between a histogram and a bar chart?",
      pauseAfter: 0.6,
    },
    {
      id: "hist-bar",
      text: "A bar chart compares categories: here, four hundred twenty support tickets by channel. The bars have gaps, and you can sort them however you like.",
      pauseAfter: 0.6,
    },
    {
      id: "hist-hist",
      text: "A histogram bins a continuous number: the same tickets, by hours to resolve. The bars touch, and their order is fixed, because the axis is a number, not a list of names.",
      pauseAfter: 0.8,
    },
    {
      id: "bins",
      text: "Question five. How do you choose a histogram's bin width? Try several. Bins five wide fuse two peaks into one. Bins a quarter wide break the data into spikes. At one, both peaks are clear.",
      pauseAfter: 0.6,
    },
    {
      id: "bins-rule",
      text: "Rules of thumb like Sturges or Freedman Diaconis give you a place to start, not a verdict. Report the shape that survives all of them.",
      pauseAfter: 0.7,
    },
    { id: "axis-in", text: "Then the most common way a chart lies." },

    // ── 6, 7. Baselines ───────────────────────────────────────────────────
    {
      id: "axis",
      scene: true,
      text: "Question six. How can a truncated y axis mislead?",
      pauseAfter: 0.6,
    },
    {
      id: "axis-zero",
      text: "Five team scores, from ninety-four point one to ninety-nine. From zero, the bars look nearly equal, which is honest: the best is about five percent above the worst.",
      pauseAfter: 0.6,
    },
    {
      id: "axis-crop",
      text: "Start the axis at ninety-four, and the top bar is fifty times as tall as the bottom one. A bar's length is its value, so bars start at zero.",
      pauseAfter: 0.8,
    },
    {
      id: "baseline",
      text: "Question seven. So is a non-zero baseline always wrong? No. That rule is for bars. A line shows value by position, not length, so zooming in is fine, and often necessary.",
      pauseAfter: 0.6,
    },
    {
      id: "baseline-show",
      text: "Here's a year of scores on an axis from ninety-two. As bars, a rise of under four percent draws the last bar more than two and a half times as tall as the first. As a line, it's a slope you can read. Either way, label the axis.",
      pauseAfter: 0.7,
    },
    { id: "log-in", text: "One more choice of axis." },

    // ── 8. Log scales ─────────────────────────────────────────────────────
    {
      id: "log",
      scene: true,
      text: "Question eight. When does a log scale earn its place? When the question is about rates of change, or the values span orders of magnitude.",
      pauseAfter: 0.6,
    },
    {
      id: "log-linear",
      text: "One series starts at four thousand and grows six percent a period. The other starts at forty and grows thirty-five. On a linear axis, the small one is a flat line along the floor.",
      pauseAfter: 0.6,
    },
    {
      id: "log-log",
      text: "On a log axis, equal percentage changes are equal distances, so steady growth is a straight line, and the steeper line is the faster one. Label the scale, or readers will take it for linear.",
      pauseAfter: 0.7,
    },
    { id: "dual-in", text: "Now, the charts that mislead, on purpose or by accident." },

    // ── 9, 10. Misleading charts ──────────────────────────────────────────
    {
      id: "dual",
      scene: true,
      text: "Question nine. What is a dual-axis chart, and what's the risk?",
      pauseAfter: 0.6,
    },
    {
      id: "dual-show",
      text: "Two series on two y axes: revenue that climbs, and a metric that does nothing. Their correlation is point one two. Fit the right axis tightly, and the metric seems to rise with revenue. Start it at zero, and it lies flat.",
      pauseAfter: 0.7,
    },
    {
      id: "dual-fix",
      text: "The scales are arbitrary, so the relationship you see is too. Index both series to a common start, or put them in two aligned panels.",
      pauseAfter: 0.8,
    },
    {
      id: "other",
      text: "Question ten. What other ways do charts mislead? A cherry-picked window: ten years with no net change, and the four months someone shows you instead, up twenty-five percent.",
      pauseAfter: 0.6,
    },
    {
      id: "other-more",
      text: "An inverted axis, where a rise of sixty-one percent draws as a fall. And missing days filled with zeros, which draws a collapse that never happened.",
      pauseAfter: 0.7,
    },
    { id: "dash-in", text: "Next, the dashboards these charts end up on." },

    // ── 11, 12. Dashboards ────────────────────────────────────────────────
    {
      id: "dash",
      scene: true,
      text: "Question eleven. What makes a dashboard effective? Only the metrics people act on, grouped, with the most important number biggest and top left.",
      pauseAfter: 0.6,
    },
    {
      id: "dash-attn",
      text: "That's where eyes land, and attention fades down and to the right: the top left slot gets about eight times the attention of the bottom right. Keep scales and colors consistent, and say how fresh the data is.",
      pauseAfter: 0.6,
    },
    {
      id: "dash-creep",
      text: "And cut what doesn't earn its place, because panels only ever get added. Two years in, this one has forty-one panels, and six of them get opened.",
      pauseAfter: 0.8,
    },
    {
      id: "report",
      text: "Question twelve. What's the difference between a dashboard and a report? A dashboard is a living view for monitoring: what's happening now? A report answers one question, with narrative and context, and is read from top to bottom.",
      pauseAfter: 0.7,
    },
    { id: "story-in", text: "Which brings us to the story itself." },

    // ── 13, 14. Story and annotation ──────────────────────────────────────
    {
      id: "story",
      scene: true,
      text: "Question thirteen. How do you tell a story with data? Lead with the takeaway, then support it: the context, then the insight, then what to do about it.",
      pauseAfter: 0.6,
    },
    {
      id: "story-title",
      text: "One chart per point, titled with the conclusion. Revenue by month hands the reader a dataset. Revenue fell twelve percent the month after the price rise hands them a claim they can check.",
      pauseAfter: 0.8,
    },
    {
      id: "annot",
      text: "Question fourteen. How do annotations improve a chart? They put the takeaway on the chart itself. These signups look like steady growth. Mark the June pricing change, and the slope after it is about four times steeper.",
      pauseAfter: 0.6,
    },
    {
      id: "annot-travel",
      text: "A chart that says its own point survives being pasted into a document without you there to explain it.",
      pauseAfter: 0.7,
    },
    { id: "palette-in", text: "Last of the drawn ones: color." },

    // ── 15, 16, 17. Color ─────────────────────────────────────────────────
    {
      id: "palette",
      scene: true,
      text: "Question fifteen. How do you choose a color palette? Match it to the data. Categories get distinct hues. Ordered values get one hue, from light to dark. Values with a meaningful middle, like profit and loss, get two hues that meet at a neutral center.",
      pauseAfter: 0.6,
    },
    {
      id: "palette-accent",
      text: "And save one bold accent for the series you want them to see.",
      pauseAfter: 0.7,
    },
    {
      id: "cap",
      text: "Question sixteen. Why cap a categorical palette at six or eight colors? Because past that, the palette runs out and starts again, and two unrelated groups share a color. Fold the tail into other, or split the chart into small panels.",
      pauseAfter: 0.7,
    },
    {
      id: "access",
      text: "Question seventeen. How do you make a chart accessible? About eight percent of men have red-green color blindness, so don't carry meaning by color alone. Here are red and green as most people see them, and as a red-green colorblind reader sees them.",
      pauseAfter: 0.6,
    },
    {
      id: "access-fix",
      text: "Add a second cue, like a direct label, and check the chart in grayscale. If it still reads, it's robust.",
      pauseAfter: 0.7,
    },

    // ── The short ones ────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "The rest need only a sentence or two. Five to finish.",
      pauseAfter: 0.6,
    },
    {
      id: "r-3d",
      text: "Three D bars meet the axis twice, at the front edge and the back, and nothing says which to read. Size circles by radius, and every ratio is squared: five looks twenty-five times as big as one.",
    },
    {
      id: "r-ink",
      text: "The data-ink ratio is Tufte's idea: spend the ink on the data. Delete a mark, and if the reader loses nothing, it was clutter.",
    },
    {
      id: "r-tools",
      text: "Tableau, Power BI and Looker are all BI tools, for business intelligence. Tableau is built for exploring, Power BI fits the Microsoft stack, and Looker defines metrics as code. What transfers is framing the question and checking the numbers.",
    },
    {
      id: "r-scatter",
      text: "A scatter plot shows how two continuous variables relate. When the points pile up, lower the opacity: over four thousand points go from a blob to two clusters and a bridge.",
    },
    {
      id: "r-part",
      text: "And for a part of a whole over time, use a stacked area or bar, or a hundred percent stack for shares. To follow one segment, give it its own line: here, web orders are flat all year, which the stack hides.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A chart shows what happened. An experiment shows why. Next: A B testing and metrics.",
    },
  ],
};
