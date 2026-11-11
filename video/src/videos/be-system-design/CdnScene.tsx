import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, halo } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DISTANCE, LADDER } from "./data";
import { Drift, int, Line, OK, OK_INK, X0 } from "./parts";
import { LAND, WORLD } from "./world";

const MAP_X = X0;
const PX_PER_DEG = WORLD.w / 360;
const RX = 1360;
/** Where the bars start, and how many pixels a millisecond takes. */
const BAR_X = 520;
const BAR_END = 1560;

/** Longitude and latitude to map pixels (the projection world.ts was drawn in). */
const project = (lon: number, lat: number): [number, number] => {
  const d = ((((lon - WORLD.lonCentre) % 360) + 540) % 360) - 180;
  return [WORLD.w / 2 + d * PX_PER_DEG, (WORLD.latTop - lat) * PX_PER_DEG];
};

/** The angle of (x, y) from the x axis, in radians, in all four quadrants
 *  (a longitude from a unit vector). */
const bearing = (y: number, x: number) => {
  if (x === 0) return y >= 0 ? Math.PI / 2 : -Math.PI / 2;
  const a = Math.atan(y / x);
  return x > 0 ? a : y >= 0 ? a + Math.PI : a - Math.PI;
};

/** The great circle from a to b, as points along it. */
const greatCircle = (a: { lat: number; lon: number }, b: { lat: number; lon: number }, steps = 96) => {
  const rad = Math.PI / 180;
  const v = (p: { lat: number; lon: number }) => [Math.cos(p.lat * rad) * Math.cos(p.lon * rad), Math.cos(p.lat * rad) * Math.sin(p.lon * rad), Math.sin(p.lat * rad)];
  const [p, q] = [v(a), v(b)];
  const omega = Math.acos(p[0] * q[0] + p[1] * q[1] + p[2] * q[2]);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const s0 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s1 = Math.sin(t * omega) / Math.sin(omega);
    const [x, yv, z] = [0, 1, 2].map((k) => s0 * p[k] + s1 * q[k]);
    return project(bearing(yv, x) / rad, Math.asin(Math.max(-1, Math.min(1, z))) / rad);
  });
};

/** A few edge locations, for "close to your users": any big city works. */
const EDGES = [
  { lon: 151.21, lat: -33.87 },
  { lon: 139.69, lat: 35.69 },
  { lon: 103.82, lat: 1.35 },
  { lon: -118.24, lat: 34.05 },
  { lon: -46.63, lat: -23.55 },
  { lon: -0.13, lat: 51.51 },
  { lon: -99.13, lat: 19.43 },
];

/**
 * Question 5: what a CDN is, and the floor distance sets. A Pacific-centred
 * world (world.ts, Natural Earth), an origin in Ashburn, Virginia and a user
 * in Sydney, the great circle between them. Light in fiber covers about 200
 * km a millisecond, so the round trip is at least 157 ms (check.mjs), over a
 * hundred times the millisecond a redirect spends inside the data center
 * (Question three); an edge server across town is under a millisecond. The
 * bars are drawn to one scale, so the data center and the edge are slivers.
 */
export const CdnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "What is a CDN");
  const cdnAt = n.word("q5", "a content delivery network");
  const edgesAt = n.word("q5", "edge servers close to your users");
  const originAt = n.word("q5", "caching what your origin serves");
  const floorAt = n.word("q5-light", "Distance sets a floor");
  const lightAt = n.word("q5-light", "Light in fiber");
  const sydneyAt = n.word("q5-light", "a user in Sydney");
  const msAt = n.word("q5-light", "a hundred and fifty-seven milliseconds");
  const virginiaAt = n.word("q5-light", "a server in Virginia");
  const hundredAt = n.word("q5-light", "over a hundred times the millisecond");
  const edgeAt = n.word("q5-light", "An edge server across town");
  const underAt = n.word("q5-light", "under a millisecond away");
  const end = n.beat("q5-light").to;

  const top = y(296);
  const P = DISTANCE.places;
  const [ux, uy] = project(P.sydney.lon, P.sydney.lat);
  const [ox, oy] = project(P.virginia.lon, P.virginia.lat);
  const arc = greatCircle(P.virginia, P.sydney);
  const arcP = ease(frame, sydneyAt, 40);
  const arcD = arc.map(([x, yv], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yv.toFixed(1)}`).join(" ");
  const mid = arc[Math.round(arc.length * 0.52)];
  const mapIn = ease(frame, textAt, 20);

  const kmShown = Math.round(DISTANCE.km / 100) * 100;
  const pxPerMs = (BAR_END - BAR_X) / DISTANCE.roundTripMs;
  const rows = [
    { at: msAt, text: "Sydney to Virginia, round trip", ms: DISTANCE.roundTripMs, value: <>at least <Num>{Math.round(DISTANCE.roundTripMs)}</Num> ms</>, color: BAR },
    { at: hundredAt, text: "Inside the data center", ms: LADDER.path.hitMs, value: <>≈ <Num>{LADDER.path.hitMs}</Num> ms</>, color: BAR },
    { at: edgeAt, text: "An edge server across town", ms: DISTANCE.edgeRoundTripMs, value: <>under <Num>1</Num> ms</>, color: OK },
  ];
  const rowY = (i: number) => y(712) + i * 54;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={textAt + 6} level={-38} />
      <Sfx name="el-sprinkle" at={edgesAt + 4} level={-35} />
      <Sfx name="el-tap" at={originAt + 4} level={-35} />
      <Sfx name="el-pencil" at={sydneyAt} level={-35} />
      <Sfx name="el-tap" at={msAt + 6} level={-34} />
      <Sfx name="el-tap" at={hundredAt + 6} level={-35} />
      <Sfx name="el-pop" at={edgeAt + 4} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4}>
          What is a CDN, and when do you use one?
        </QuestionCard>

        {/* The world. */}
        <svg
          width={WORLD.w}
          height={WORLD.h}
          viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
          style={{ position: "absolute", left: MAP_X, top, overflow: "hidden", opacity: mapIn }}
        >
          <path d={LAND} fill={ds("gray", 100)} stroke={ds("gray", 300)} strokeWidth={1} />
          {/* The great circle, Virginia to Sydney. */}
          <path d={arcD} fill="none" stroke={BAR} strokeWidth={3.2} strokeDasharray="1 0" pathLength={1} style={{ strokeDasharray: `${arcP} 1` }} />
          {EDGES.map((e, i) => {
            const [x, yv] = project(e.lon, e.lat);
            const p = ease(frame, edgesAt + 4 + i * 3, 10) * (1 - ease(frame, floorAt, 12) * 0.6);
            return <circle key={i} cx={x} cy={yv} r={7 * p} fill={OK} opacity={p > 0 ? 0.9 : 0} />;
          })}
          <circle cx={ox} cy={oy} r={10 * ease(frame, originAt, 10)} fill={BLUE_INK} stroke={PAPER} strokeWidth={2.5} />
          <circle cx={ux} cy={uy} r={10 * ease(frame, sydneyAt, 10)} fill={INK} stroke={PAPER} strokeWidth={2.5} />
          {/* The edge server across town: west of the user, clear of the arc,
              which leaves Sydney to the north-east. */}
          <circle cx={ux - 18} cy={uy - 12} r={8 * ease(frame, edgeAt + 4, 10)} fill={OK} stroke={PAPER} strokeWidth={2} />
        </svg>
        <Line x={MAP_X + ox + 18} y={top + oy - 14} at={originAt + 2} size={21} weight={500} color={BLUE_INK} style={halo}>
          origin
          <span style={{ opacity: ease(frame, virginiaAt, 10) }}>, Virginia</span>
        </Line>
        <Line x={MAP_X + ux - 34} y={top + uy + 22} at={sydneyAt + 2} size={21} weight={500} style={halo} align="right">
          user, Sydney
        </Line>
        <Line x={MAP_X + mid[0]} y={top + mid[1] + 18} at={msAt + 4} size={24} weight={500} color={BLUE_INK} style={halo}>
          ≥ <Num>{Math.round(DISTANCE.roundTripMs)}</Num> ms round trip
        </Line>
        <Line x={MAP_X + ux - 34} y={top + uy - 56} at={underAt} size={21} weight={500} color={OK_INK} style={halo} align="right">
          edge
        </Line>

        {/* What it is, and the arithmetic. */}
        <Line x={RX} y={top} at={cdnAt} size={27} weight={500}>
          Content delivery network
        </Line>
        <Line x={RX} y={top + 58} at={edgesAt} size={23} color={INK_SOFT} width={440}>
          <span style={{ color: OK_INK, fontWeight: 500 }}>Edge servers</span> close to your users, caching what your{" "}
          <span style={{ color: BLUE_INK, fontWeight: 500, opacity: ease(frame, originAt, 10) }}>origin</span>
          <span style={{ opacity: ease(frame, originAt, 10) }}> serves</span>
        </Line>
        <Line x={RX} y={top + 190} at={lightAt} size={24} weight={500}>
          Light in fiber: about <Num>{DISTANCE.kmPerMs}</Num> km per ms
        </Line>
        <Line x={RX} y={top + 236} at={msAt} size={24} weight={500} color={BLUE_INK}>
          <Num>{int(kmShown)}</Num> km ÷ <Num>{DISTANCE.kmPerMs}</Num> km/ms × <Num>2</Num> ≈ <Num>{Math.round(DISTANCE.roundTripMs)}</Num> ms
        </Line>
        <Line x={RX} y={top + 282} at={floorAt} size={21} color={INK_SOFT}>
          <span style={{ opacity: ease(frame, msAt + 10, 10) }}>A floor set by physics, not a measurement</span>
        </Line>

        {/* One scale: the trip, the data center, the edge. */}
        {rows.map((r, i) => {
          const p = ease(frame, r.at + 4, 20);
          const w = Math.max(2, r.ms * pxPerMs) * p;
          return (
            <React.Fragment key={r.text}>
              <Line x={BAR_X - 20} y={rowY(i) - 15} at={r.at} size={22} weight={500} align="right">
                {r.text}
              </Line>
              <div style={{ position: "absolute", left: BAR_X, top: rowY(i) - 13, width: w, height: 26, background: r.color, borderRadius: 2, opacity: p > 0 ? 0.9 : 0 }} />
              <Line x={BAR_X + Math.max(2, r.ms * pxPerMs) + 16} y={rowY(i) - 15} at={r.at + 14} size={22} weight={500} color={i === 2 ? OK_INK : BLUE_INK}>
                {r.value}
              </Line>
            </React.Fragment>
          );
        })}
        <Line x={BAR_END} y={rowY(2) + 34} at={hundredAt + 10} size={21} color={INK_SOFT} align="right">
          All three drawn to one scale
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
