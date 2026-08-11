/**
 * A word cloud, and the same twenty counts as bars.
 *
 * The cloud is not a bad chart because it is popular. It is a bad chart
 * because of what it does with the encoding it chose. Frequency is mapped to
 * *font size*, which the eye reads as area, and area is already a weak
 * channel. Then two other visual properties, *position* and *rotation*, are
 * assigned at random by the layout algorithm, and both of them look like
 * encodings to a reader who does not know that. A word near the middle looks
 * important. A word set sideways looks deliberate. Neither is.
 *
 * Font size makes it worse than a plain area encoding, because a word's ink is
 * proportional to size squared *and* to how many letters it has. At the same
 * count, a long word occupies far more of the canvas than a short one, so the
 * cloud is partly a chart of word length.
 *
 * The bars are the same twenty numbers, sorted, on a common baseline. They
 * answer "which is most common", "by how much", and "where does the tail
 * start", none of which the cloud can answer.
 *
 * There is one thing the cloud does better, and it is worth saying: it is
 * *inviting*. People look at it. If the goal is to get a room to notice that a
 * corpus exists at all, it works, and no bar chart of twenty tokens has ever
 * been put on a poster. Use it as an illustration, and put the bars next to it
 * when somebody has to decide something.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelSpace } from "./_panels.mjs";

export const title =
  "The twenty most frequent content words in a corpus, drawn as a word cloud and as a sorted bar chart. In the cloud, size carries the count while position and rotation are random; in the bars the counts are on a common baseline and the ranking is immediate.";

/** Token counts from a support-ticket corpus, in descending order. */
const WORDS = [
  ["password", 412],
  ["account", 388],
  ["login", 341],
  ["error", 296],
  ["reset", 244],
  ["email", 231],
  ["invoice", 198],
  ["billing", 176],
  ["refund", 162],
  ["upgrade", 151],
  ["cancel", 140],
  ["export", 128],
  ["import", 121],
  ["timeout", 114],
  ["licence", 106],
  ["seat", 98],
  ["quota", 91],
  ["token", 84],
  ["proxy", 77],
  ["cache", 71],
].map(([word, n]) => ({ word, n }));

const N = WORDS.length;
const TOP = WORDS[0];
const MIN = WORDS.at(-1);

/** The longest and shortest words at similar counts, so the length effect can
 *  be pointed at rather than asserted. */
const LENGTH_PAIR = (() => {
  let best = null;
  for (const a of WORDS) {
    for (const b of WORDS) {
      if (a === b) continue;
      const close = Math.abs(a.n - b.n) / a.n < 0.12;
      const gap = a.word.length - b.word.length;
      if (close && gap > 0 && (!best || gap > best.gap)) best = { long: a, short: b, gap };
    }
  }
  return best;
})();

// Stacked rather than side by side: twenty words and twenty bars both need
// the full width, and a cloud squeezed into half of it would be unreadable for
// a reason that has nothing to do with the point being made.
const FULL = panel(0, { y: [0, 1] });
const CLOUD = { left: FULL.left, right: FULL.right, bottom: 0.5, top: 0.89 };
const BARS = {
  left: FULL.left,
  right: FULL.right,
  py: (v) => 0.1 + (0.28 * v) / 440,
  band: (i, n) => FULL.left + ((FULL.right - FULL.left) * (i + 0.5)) / n,
  bandWidth: (n) => (FULL.right - FULL.left) / n,
};

// Font size from the count, on the square root so that ink is roughly linear
// in the count rather than quadratic. Real cloud implementations mostly do not
// bother, which makes them worse than this one.
const sizeFor = (n) => 11 + 15 * Math.sqrt((n - MIN.n) / (TOP.n - MIN.n));

/** Four rows of five, with the counts dealt out so that neighbouring words are
 *  not neighbouring in frequency: position is noise here, and dealing them in
 *  order would accidentally make it mean something. */
const COLS = 5;
const place = (() => {
  const u = rng(2_207);
  const dealt = WORDS.map((d, i) => ({ d, slot: (i * 7) % WORDS.length }));
  return dealt.map(({ d, slot }) => {
    const row = Math.floor(slot / COLS);
    const col = slot % COLS;
    const rows = WORDS.length / COLS;
    return {
      ...d,
      x: CLOUD.left + ((CLOUD.right - CLOUD.left) * (col + 0.5)) / COLS + (u() - 0.5) * 0.03,
      y: CLOUD.top - ((CLOUD.top - CLOUD.bottom) * (row + 0.5)) / rows,
      // Only the small ones turn: a 26px word set sideways is 110px tall and
      // would leave the row it is in, which is a fact about this figure's
      // height rather than anything about clouds.
      rotate: u() < 0.3 && sizeFor(d.n) < 17 ? -90 : 0,
      size: sizeFor(d.n),
    };
  });
})();

const BAR = 0.66;
const bars = WORDS.map((d, i) => ({
  ...d,
  x1: BARS.band(i, N) - (BARS.bandWidth(N) * BAR) / 2,
  x2: BARS.band(i, N) + (BARS.bandWidth(N) * BAR) / 2,
  y: BARS.py(d.n),
}));

export const caption = `The same twenty counts as a cloud and as bars. Frequency is mapped to font size, which the eye reads as area, and "${LENGTH_PAIR.long.word}" at ${LENGTH_PAIR.long.n} covers far more canvas than "${LENGTH_PAIR.short.word}" at ${LENGTH_PAIR.short.n}, so the cloud is partly a chart of word length.`;

export function render() {
  return plot({
    height: 420,
    marginTop: 26,
    marginLeft: 34,
    marginRight: 18,
    marginBottom: 30,
    ariaLabel: title,
    ...panelSpace(1),
    marks: [
      Plot.text([{}], {
        x: (FULL.left + FULL.right) / 2,
        y: 0.985,
        text: () => "As a word cloud",
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (FULL.left + FULL.right) / 2,
        y: 0.4,
        text: () => "The same twenty counts, sorted",
        fill: PRIMARY,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),

      // Rotation is a constant option in Plot, so the two orientations are two
      // marks, which is also a fair picture of what the layout is doing.
      ...[0, -90].map((rotate) =>
        Plot.text(
          place.filter((d) => d.rotate === rotate),
          {
            x: "x",
            y: "y",
            text: "word",
            fill: MUTED,
            fontSize: "size",
            fontWeight: 600,
            rotate,
            textAnchor: "middle",
            ...HALO,
          },
        ),
      ),

      Plot.link(
        [0, 100, 200, 300, 400].map((v) => ({ v, y: BARS.py(v) })),
        {
          x1: BARS.left,
          x2: BARS.right,
          y1: "y",
          y2: "y",
          stroke: "currentColor",
          strokeOpacity: 0.1,
        },
      ),
      Plot.text(
        [0, 200, 400].map((v) => ({ v, y: BARS.py(v) })),
        {
          x: BARS.left,
          y: "y",
          text: (d) => String(d.v),
          fill: "currentColor",
          fillOpacity: 0.6,
          fontSize: 10,
          textAnchor: "end",
          dx: -7,
        },
      ),
      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.7,
      }),
      Plot.text([bars[0]], {
        x: (d) => (d.x1 + d.x2) / 2,
        y: "y",
        text: (d) => `${d.word}, ${d.n}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (BARS.left + BARS.right) / 2,
        y: BARS.py(0),
        text: () => "twenty words, most frequent to least",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 16,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (CLOUD.left + CLOUD.right) / 2,
        y: 0.47,
        text: () => "size is the count; position and rotation are noise",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
