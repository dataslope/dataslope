/**
 * John Snow's other chart, and the one that actually proved it.
 *
 * Everybody remembers the Broad Street map: the dot for each death, the ring
 * of them around the pump, the handle coming off. It is a wonderful picture
 * and it is not the evidence. A cluster of deaths around a pump is also what
 * you would see if the bad thing were in the air over that block, which was
 * the theory Snow was arguing against, and he knew it.
 *
 * The evidence is this table. South of the Thames, two water companies had
 * spent years selling to the same streets, house by house, in no pattern
 * anybody had designed: the same neighbourhoods, the same trades, the same
 * rents, often the same terrace. In 1852 one of them, Lambeth, moved its
 * intake upstream of London's sewage. The other did not. Snow walked the
 * district asking each household who supplied its water, and the 1854 epidemic
 * did the rest.
 *
 * The design that makes this work was not Snow's and was not deliberate: two
 * suppliers had scrambled themselves across one population, so the only thing
 * that differed between the groups was the water. It is a randomised trial
 * that nobody ran, which is why it is still taught.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Snow's own counts of houses and cholera deaths in the first seven weeks of
 * the 1854 epidemic, from the 1855 second edition of *On the Mode of
 * Communication of Cholera*. The rates here are computed from those counts
 * rather than copied from his rate column, which was rounded differently.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Cholera deaths per 10,000 houses in London in 1854, by water supplier. Houses supplied by Southwark and Vauxhall, which drew from the sewage-polluted Thames, died at roughly 315 per 10,000; houses supplied by Lambeth, which had moved its intake upstream in 1852, at 38 per 10,000, below even the rest of London.";

/** Snow's counts for the first seven weeks of the 1854 epidemic. */
const SUPPLY = [
  {
    key: "Southwark & Vauxhall",
    houses: 40_046,
    deaths: 1263,
    note: "intake below the sewers",
    accent: true,
  },
  {
    key: "Rest of London",
    houses: 256_423,
    deaths: 1422,
    note: "every other supply, mixed",
    accent: false,
  },
  {
    key: "Lambeth",
    houses: 26_107,
    deaths: 98,
    note: "intake moved upstream, 1852",
    accent: false,
  },
];

const rows = SUPPLY.map((d) => ({ ...d, rate: (d.deaths / d.houses) * 10_000 }));
const worst = rows[0];
const best = rows.at(-1);
const RATIO = Math.round(worst.rate / best.rate);
const MAX = Math.max(...rows.map((d) => d.rate));

export const caption = `The Broad Street map is the famous picture, but it is not what settled the argument: a ring of deaths around a pump is equally what you would see if the cause were in the air over that block, which is exactly what Snow's opponents believed. This table is the proof. Two companies had been selling water house by house into the same south London streets for years, in no pattern anyone designed, and in 1852 one of them moved its intake upstream of the city's sewage. Snow went door to door asking who supplied each house. Same neighbourhoods, same trades, same rents, one difference: ${RATIO} times the death rate. It is a randomised experiment that nobody ran, and it is still the reason this story is taught.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 158,
    marginRight: 176,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Cholera deaths per 10,000 houses",
      labelAnchor: "center",
      domain: [0, MAX * 1.06],
      ticks: 4,
    },
    y: { label: null, domain: rows.map((d) => d.key), padding: 0.34, grid: false },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x: "rate",
        fill: (d) => (d.accent ? ACCENT : PRIMARY),
        fillOpacity: (d) => (d.accent ? 0.85 : 0.55),
      }),
      Plot.text(rows, {
        y: "key",
        x: "rate",
        text: (d) =>
          `${Math.round(d.rate)} per 10,000\n${d.deaths.toLocaleString()} deaths in ${Math.round(d.houses / 1000)}k houses\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
