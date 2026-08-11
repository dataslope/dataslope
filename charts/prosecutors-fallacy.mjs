/**
 * The same evidence, two conditionals, four orders of magnitude apart.
 *
 * A forensic match has a stated false-positive rate: the chance that an
 * innocent person matches by accident. Here it is one in ten thousand, which
 * sounds like near-certainty, and the sentence "the chance of this match
 * occurring if the defendant is innocent is one in ten thousand" is true.
 *
 * The fallacy is reading it backwards, as "the chance the defendant is innocent
 * given the match is one in ten thousand". Those are different conditionals and
 * they are not interchangeable, which is the whole content of Bayes's rule.
 *
 * The arithmetic is drawn. In a database of a million people with one guilty
 * party, a one-in-ten-thousand false-positive rate produces about a hundred
 * innocent matches, plus the one guilty match. Given a match and nothing else,
 * the chance of guilt is one in a hundred and one, which is under one per cent.
 * The evidence is genuinely strong (it took the field from one in a million to
 * one in a hundred) and it is nowhere near proof.
 *
 * The thing that makes it strong or weak is the *prior*, which is the part the
 * courtroom version leaves out. If the same match is found on a suspect already
 * placed at the scene by other evidence, the pool is not a million people, it
 * is a handful, and the posterior is close to certainty. Same test, same false
 * positive rate, completely different conclusion, entirely because of how the
 * suspect came to be tested.
 *
 * This has convicted people. The name comes from the courtroom, and the same
 * error appears in medical screening, fraud detection and every alerting system
 * with a low base rate.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "A database of a million people with one guilty party and a forensic test that falsely matches one innocent person in ten thousand. About a hundred innocent people match, so the chance of guilt given a match is under one per cent, not the 99.99 per cent the false-positive rate suggests.";

const POOL = 1_000_000;
const FPR = 1 / 10_000;
const GUILTY = 1;
const FALSE_MATCHES = Math.round((POOL - GUILTY) * FPR);
const MATCHES = FALSE_MATCHES + GUILTY;
const P_GUILTY_GIVEN_MATCH = GUILTY / MATCHES;

/** The same test on a suspect already placed at the scene, where the pool is
 *  small. Same evidence, different prior. */
const NARROW_POOL = 20;
const NARROW_FALSE = (NARROW_POOL - 1) * FPR;
const P_NARROW = 1 / (1 + NARROW_FALSE);

const LEFT = panel(0, { y: [0, 1] });
const RIGHT = panel(1, { y: [0, 1] });

/** A hundred and one matched people as a grid: one guilty, a hundred not. */
const COLS = 12;
const grid = Array.from({ length: MATCHES }, (_, i) => ({
  i,
  guilty: i === 0,
  col: i % COLS,
  row: Math.floor(i / COLS),
}));
const ROWS = Math.ceil(MATCHES / COLS);
const CELL = 0.055;
const GAP = 0.012;
const ORIGIN_X = (RIGHT.left + RIGHT.right) / 2 - (COLS * (CELL + GAP)) / 2;
const ORIGIN_Y = 0.72;
const tiles = grid.map((d) => ({
  ...d,
  x1: ORIGIN_X + d.col * (CELL + GAP),
  x2: ORIGIN_X + d.col * (CELL + GAP) + CELL,
  y1: ORIGIN_Y - d.row * (CELL * 0.62 + GAP) - CELL * 0.62,
  y2: ORIGIN_Y - d.row * (CELL * 0.62 + GAP),
}));

export const caption = `A forensic test with a false-positive rate of one in ten thousand, applied to a pool of a million and to a pool of ${NARROW_POOL}. The same match means a ${(P_GUILTY_GIVEN_MATCH * 100).toFixed(1)}% chance of guilt in the first and ${(P_NARROW * 100).toFixed(1)}% in the second.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 26,
    marginRight: 20,
    marginBottom: 30,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(LEFT, "What the lab said", { fill: MUTED }),
      panelTitle(RIGHT, "What follows from it", { fill: ACCENT }),

      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: 0.66,
        text: () =>
          "P(match | innocent)\n= 1 in 10,000\n= 0.01%",
        fill: MUTED,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.6,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: 0.38,
        text: () =>
          `P(innocent | match)\n= ${FALSE_MATCHES} in ${MATCHES}\n= ${((1 - P_GUILTY_GIVEN_MATCH) * 100).toFixed(1)}%`,
        fill: ACCENT,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.6,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: 0.13,
        text: () => "the same evidence, read\nthe two possible ways",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "middle",
        ...HALO,
      }),

      Plot.rect(tiles, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: (d) => (d.guilty ? ACCENT : MUTED),
        fillOpacity: (d) => (d.guilty ? 0.95 : 0.28),
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: 0.82,
        text: () => `${MATCHES} people in a million match`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: tiles[0].x1,
        y: tiles[0].y2,
        text: () => "one of them did it",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: 0.2,
        text: () =>
          `Same test on ${NARROW_POOL} suspects already placed\nat the scene: P(guilty | match) = ${(P_NARROW * 100).toFixed(1)}%`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.45,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: 0.05,
        text: () => "the prior is doing all of the work",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
