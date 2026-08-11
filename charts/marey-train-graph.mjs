/**
 * The train graph: a timetable that you read with a ruler instead of a finger.
 *
 * Étienne-Jules Marey published this form in *La Méthode Graphique* (1878),
 * crediting the engineer Charles Ibry, and it is still how railways plan
 * track. Time runs across, distance from Paris runs down the page, and each
 * train is one line. Every property of the line is a fact about the train, and
 * none of them has to be looked up:
 *
 *   • the *slope* is the speed, so the steepest line is the fastest train;
 *   • a *flat* stretch is a train standing at a platform;
 *   • a *crossing* is two trains in the same place at the same time, which on
 *     a single-track section is a thing that must be arranged and on a double
 *     one is simply where they wave;
 *   • the *vertical gap* between two lines going the same way is how much
 *     track is between them, which is the number the signalling exists to
 *     keep above zero.
 *
 * A printed timetable holds exactly the same information and answers none of
 * those questions. "Where will the 19:00 express be when the 18:20 stopping
 * train leaves Dijon" is a page of arithmetic in a table and a glance here.
 * That is the whole argument for drawing data, made about eighty years before
 * anyone wrote it down as a principle.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Station distances are the real ones on the Paris-Lyon-Méditerranée main
 * line. The services are a plausible 1880s evening timetable in Marey's
 * manner, not a transcription of his plate: average speeds around 60 km/h for
 * an express and 40 for an all-stations train are what the PLM was running
 * then. The point of the figure is the geometry, and the geometry is exact.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "A Marey train graph of an evening on the Paris to Lyon main line: time runs left to right from 18:00 to 08:00, distance from Paris runs down, and each train is a line whose slope is its speed. Fast expresses cut steeply across slow stopping trains, flat segments are station stops, and the lines cross where trains pass each other.";

/** Kilometres from Paris on the PLM main line. */
const STATIONS = [
  { name: "Paris", km: 0 },
  { name: "Melun", km: 44 },
  { name: "Sens", km: 112 },
  { name: "Laroche", km: 156 },
  { name: "Tonnerre", km: 198 },
  { name: "Dijon", km: 315 },
  { name: "Chalon", km: 390 },
  { name: "Mâcon", km: 440 },
  { name: "Lyon", km: 512 },
];

const KM = Object.fromEntries(STATIONS.map((s) => [s.name, s.km]));
const END = STATIONS.at(-1).km;

/**
 * Walk a train down (or up) the line at a constant average speed, pausing at
 * the stations it calls at. Every vertex in the returned path is a real event:
 * an arrival or a departure. Nothing between two vertices is invented, which
 * is why a straight segment can be read as a speed.
 */
function service({ name, depart, kmh, calls, down = true, color }) {
  const order = down ? STATIONS : [...STATIONS].reverse();
  const points = [];
  let t = depart;
  order.forEach((station, i) => {
    if (i > 0) t += Math.abs(station.km - order[i - 1].km) / kmh;
    points.push({ t, km: station.km, name });
    const dwell = calls[station.name];
    if (dwell) {
      t += dwell / 60;
      points.push({ t, km: station.km, name });
    }
  });
  return { name, color, down, points, arrive: t };
}

/** Long enough to be visible as a flat segment at this width, and entirely
 *  ordinary for an overnight all-stations train at a junction: engine change,
 *  mail transfer, the buffet. */
const DIJON_DWELL = 35;

const TRAINS = [
  service({
    name: "Express 3\nParis to Lyon",
    depart: 19,
    kmh: 62,
    calls: { Laroche: 3, Dijon: 8, Mâcon: 4 },
    color: SERIES[0],
  }),
  service({
    name: "Omnibus 21\nall stations",
    depart: 18.33,
    kmh: 41,
    calls: {
      Melun: 4,
      Sens: 5,
      Laroche: 6,
      Tonnerre: 4,
      Dijon: DIJON_DWELL,
      Chalon: 5,
      Mâcon: 4,
    },
    color: SERIES[2],
  }),
  service({
    name: "Express 4\nLyon to Paris",
    depart: 20.25,
    kmh: 62,
    down: false,
    calls: { Mâcon: 4, Dijon: 8, Laroche: 3 },
    color: ACCENT,
  }),
  service({
    name: "Mail 12\nLyon to Paris",
    depart: 21.5,
    kmh: 47,
    down: false,
    calls: { Mâcon: 3, Chalon: 3, Dijon: 10, Tonnerre: 3, Laroche: 4, Sens: 3, Melun: 3 },
    color: SERIES[3],
  }),
];

const ENDS = TRAINS.map((tr) => ({
  ...tr.points.at(-1),
  color: tr.color,
  down: tr.down,
  label: tr.name,
}));

/** The omnibus's own arrival at Dijon, so the annotation cannot drift. */
const DIJON_STOP = {
  t: TRAINS[1].points.find((p) => p.km === KM.Dijon).t,
  minutes: DIJON_DWELL,
};

const rows = TRAINS.flatMap((tr) => tr.points.map((p) => ({ ...p, color: tr.color })));

/**
 * Where the two expresses pass, found by scanning both paths rather than
 * asserted, so the annotation cannot drift if a departure time is edited.
 */
const MEETING = (() => {
  const [a, b] = [TRAINS[0], TRAINS[2]];
  const at = (train, t) => {
    const p = train.points;
    for (let i = 1; i < p.length; i++) {
      if (t >= p[i - 1].t && t <= p[i].t) {
        const span = p[i].t - p[i - 1].t;
        if (span === 0) return p[i].km;
        return p[i - 1].km + ((t - p[i - 1].t) * (p[i].km - p[i - 1].km)) / span;
      }
    }
    return null;
  };
  let best = null;
  for (let t = 20.25; t <= 28; t += 1 / 600) {
    const ka = at(a, t);
    const kb = at(b, t);
    if (ka == null || kb == null) continue;
    const gap = Math.abs(ka - kb);
    if (!best || gap < best.gap) best = { gap, t, km: (ka + kb) / 2 };
  }
  return best;
})();

const clock = (t) => {
  const h = Math.floor(((t % 24) + 24) % 24);
  const m = Math.round((t - Math.floor(t)) * 60);
  return `${String(m === 60 ? h + 1 : h).padStart(2, "0")}:${String(m === 60 ? 0 : m).padStart(2, "0")}`;
};

const NEAREST = STATIONS.reduce((a, b) =>
  Math.abs(b.km - MEETING.km) < Math.abs(a.km - MEETING.km) ? b : a,
);
const EXPRESS_HOURS = TRAINS[0].arrive - 19;
const OMNIBUS_HOURS = TRAINS[1].arrive - 18.33;

export const caption = `Marey published this form in 1878, crediting the engineer Charles Ibry, and railways still plan track with it. Time runs across, distance from Paris runs down, one line per train, and every property of the line is a fact you would otherwise have to compute. Slope is speed: the express covers the ${END} km in ${EXPRESS_HOURS.toFixed(1)} hours and the all-stations train takes ${OMNIBUS_HOURS.toFixed(1)}, which is visible before you read either number. A flat segment is a train standing at a platform. A crossing is two trains in the same place at the same time, so the up and down expresses pass near ${NEAREST.name} at about ${clock(MEETING.t)}, a fact no printed timetable states anywhere. The vertical gap between two lines running the same way is how much track is between them, which is the quantity the whole signalling system exists to keep above zero.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 24,
    marginLeft: 78,
    marginRight: 168,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: null,
      domain: [18, 32.4],
      ticks: [18, 20, 22, 24, 26, 28, 30, 32],
      tickFormat: clock,
    },
    y: {
      label: null,
      domain: [END + 14, -14],
      ticks: STATIONS.map((s) => s.km),
      tickFormat: (km) => STATIONS.find((s) => s.km === km).name,
      grid: false,
    },
    marks: [
      Plot.ruleY(
        STATIONS.map((s) => s.km),
        { stroke: "currentColor", strokeOpacity: 0.1 },
      ),
      Plot.ruleX([24], { stroke: GUIDE, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 24,
        y: -14,
        text: () => "midnight",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -2,
        ...HALO,
      }),
      Plot.line(rows, {
        x: "t",
        y: "km",
        z: "name",
        stroke: "color",
        strokeWidth: 2,
        clip: true,
      }),
      Plot.dot([MEETING], { x: "t", y: "km", r: 5, fill: "none", stroke: MUTED, strokeWidth: 1.5 }),
      Plot.text([MEETING], {
        x: "t",
        y: "km",
        text: () => `the two expresses pass\nhere, ${clock(MEETING.t)}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        dy: -16,
        ...HALO,
      }),
      // A stop is a flat stretch, which is the reading that surprises people.
      // Anchored to the omnibus's own arrival at Dijon rather than a typed
      // time, so the label always points at the segment it describes.
      Plot.text([{ t: DIJON_STOP.t, km: KM.Dijon }], {
        x: "t",
        y: "km",
        text: () => `flat means stopped:\n${DIJON_STOP.minutes} minutes at Dijon`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        dy: 20,
        ...HALO,
      }),
      // Down trains finish at the bottom of the frame and up trains at the
      // top, so each set needs its label nudged the other way. `dy` is a
      // constant option in Plot, not a channel, so that is two marks.
      ...[true, false].map((down) =>
        Plot.text(
          ENDS.filter((d) => d.down === down),
          {
            x: "t",
            y: "km",
            text: "label",
            fill: "color",
            fontSize: 10.5,
            fontWeight: 700,
            lineHeight: 1.35,
            textAnchor: "start",
            dx: 8,
            dy: down ? -8 : 8,
            ...HALO,
          },
        ),
      ),
    ],
  });
}
