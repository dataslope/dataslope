/**
 * Monty Hall, settled by running it rather than by arguing about it.
 *
 * The argument never convinces anyone, because the intuition it has to
 * dislodge ("two doors left, so it is even money") is genuinely reasonable if
 * the host opened a door at random. He does not. He knows where the car is and
 * he never opens it, so his choice carries the information that makes the
 * remaining door worth 2/3.
 *
 * The chart is ten thousand games of each strategy, plotted as a running win
 * rate. Both lines are wild for the first few dozen games and then settle onto
 * 1/3 and 2/3 and stay there, which is the honest shape of a frequentist
 * claim: the probability is not a promise about any one game, it is where the
 * average goes and how long it takes to get there.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Running win rate over ten thousand simulated Monty Hall games for the stay and switch strategies. Both are erratic for the first few dozen games, then settle onto one third and two thirds and stay there.";

const GAMES = 10_000;
const u = rng(31337);

/**
 * One game. The host's constraint is the whole problem, so it is written out
 * rather than shortcut: he opens a door that is neither the player's pick nor
 * the car.
 */
function play() {
  const car = Math.floor(u() * 3);
  const pick = Math.floor(u() * 3);
  const openable = [0, 1, 2].filter((d) => d !== pick && d !== car);
  const opened = openable[Math.floor(u() * openable.length)];
  const switched = [0, 1, 2].find((d) => d !== pick && d !== opened);
  return { stayWins: pick === car, switchWins: switched === car };
}

const rows = [];
let stay = 0;
let swap = 0;
for (let i = 1; i <= GAMES; i++) {
  const g = play();
  if (g.stayWins) stay++;
  if (g.switchWins) swap++;
  // Sampled on a log-ish schedule: 10,000 points per line is 20x the bytes and
  // draws the same picture, since the interesting part is all at the left.
  if (i <= 60 || i % 25 === 0) {
    rows.push({ key: "Stay", i, rate: stay / i });
    rows.push({ key: "Switch", i, rate: swap / i });
  }
}

const FINAL_STAY = stay / GAMES;
const FINAL_SWITCH = swap / GAMES;

export const caption = `${GAMES.toLocaleString()} games of each strategy. Switching won ${(FINAL_SWITCH * 100).toFixed(1)}% and staying won ${(FINAL_STAY * 100).toFixed(1)}%. The intuition that says "two doors left, so it is even money" is not stupid, it is answering a different question: it would be right if the host opened a door at random. He does not. He knows where the car is and never opens it, so which door he leaves shut is information, and the door you did not pick inherits all of it. Note also how long the lines take to settle: a probability is not a promise about one game, it is where the average goes.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 96,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Games played",
      labelAnchor: "center",
      type: "log",
      domain: [1, GAMES],
      ticks: [1, 10, 100, 1000, 10_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: "Win rate so far", domain: [0, 1], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.ruleY([1 / 3, 2 / 3], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.line(rows.filter((d) => d.key === "Stay"), {
        x: "i",
        y: "rate",
        stroke: ACCENT,
        strokeWidth: 1.7,
      }),
      Plot.line(rows.filter((d) => d.key === "Switch"), {
        x: "i",
        y: "rate",
        stroke: PRIMARY,
        strokeWidth: 1.7,
      }),
      Plot.text([{}], {
        x: GAMES,
        y: FINAL_SWITCH,
        text: () => "Switch",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: GAMES,
        y: FINAL_STAY,
        text: () => "Stay",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text(
        [
          { y: 2 / 3, label: "2/3" },
          { y: 1 / 3, label: "1/3" },
        ],
        {
          x: 1.2,
          y: "y",
          text: "label",
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dy: -8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 6,
        y: 0.06,
        text: () => "a probability is where the average goes,\nnot a claim about any one game",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
