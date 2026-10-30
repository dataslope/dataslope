import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BDAY, pct } from "./data";
import { at, Axes, DATA, DATA_LIGHT, Drift, math, OK, OK_INK, Person, pulse, type Scale, Svg } from "./parts";

const RING = { cx: 470, cy: 590, r: 230 };
const PLOT = { left: 1000, right: 1780, top: 400, base: 800 };

/** Every pair of the room's people, in the order they are drawn. */
const PAIRS = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < BDAY.people; i++) for (let j = i + 1; j < BDAY.people; j++) out.push([i, j]);
  return out;
})();

/** The complement's working, over the chart: where it starts, and its two
 *  rows, spaced evenly between the question and the chart's axis title. */
const WORK = { x: 940, noMatch: 240, match: 300 };

/**
 * Question 12, the opening's room. Its 23 people around a ring, every one
 * of their 253 pairs drawn as a chord, which is what can collide; then the
 * answer worked through the complement, each new person missing everyone
 * before them (364/365 down to 343/365, 49.3% with no match), and the exact
 * curve against room size, crossing a half at 23 (50.7%), the page's 50,000
 * simulated rooms on the same spot, and 99% at 57.
 */
export const BdayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("bday").from;
  const qAt = n.word("bday", "Question");
  const textAt = n.word("bday", "Twenty-three people");
  const yesAt = n.word("bday-pairs", "Yes, just");
  const pairsAt = n.word("bday-pairs", "pairs do");
  const countAt = n.word("bday-pairs", "two hundred and fifty-three pairs");
  const complementAt = n.word("bday-exact", "the complement");
  const firstAt = n.word("bday-exact", "three sixty-four");
  const secondAt = n.word("bday-exact", "then three sixty-three");
  const lastAt = n.word("bday-exact", "down to three forty-three");
  const exactAt = n.word("bday-exact", "Multiply them");
  const noneAt = n.word("bday-exact", "forty-nine point three percent");
  const fiftyAt = n.word("bday-match", "fifty point seven percent");
  const roomsAt = n.word("bday-match", "fifty thousand simulated rooms");
  const fiftySevenAt = n.word("bday-curve", "By fifty-seven people");
  const end = n.beat("bday-curve").to;

  const cy = y(RING.cy);
  const spot = (i: number) => {
    const a = -Math.PI / 2 + (i / BDAY.people) * Math.PI * 2;
    return [RING.cx + RING.r * Math.cos(a), cy + RING.r * Math.sin(a)] as const;
  };
  const drawn = ease(frame, pairsAt, Math.max(12, countAt - pairsAt + 8));
  const chords = Math.round(PAIRS.length * drawn);

  const xs: Scale = { lo: 0, hi: 60, a: PLOT.left, b: PLOT.right };
  const ys: Scale = { lo: 0, hi: 1, a: y(PLOT.base), b: y(PLOT.top) };
  const curveP = ease(frame, exactAt, 26);
  const shown = BDAY.curve.slice(0, Math.max(1, Math.round(BDAY.curve.length * curveP)));
  const path = shown.map((v, i) => `${i ? "L" : "M"}${at(xs, i + 1)},${at(ys, v)}`).join(" ");
  const p23 = ease(frame, fiftyAt, 12);
  const p57 = ease(frame, fiftySevenAt, 12);
  const pRooms = ease(frame, roomsAt, 12);
  const at23 = [at(xs, 23), at(ys, BDAY.exact)] as const;
  const at57 = [at(xs, BDAY.over99), at(ys, BDAY.curve[BDAY.over99 - 1])] as const;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={yesAt + 2} level={-32} />
      <Sfx name="fill-roll" at={pairsAt} level={-34} />
      <Sfx name="el-pencil" at={complementAt + 2} level={-34} />
      <Sfx name="el-tap" at={firstAt + 2} level={-36} />
      <Sfx name="el-tap" at={secondAt + 2} level={-36} />
      <Sfx name="el-tap" at={lastAt + 2} level={-36} />
      <Sfx name="el-pencil" at={exactAt + 2} level={-34} />
      <Sfx name="el-pop" at={fiftyAt + 4} level={-32} />
      <Sfx name="el-tap" at={roomsAt + 4} level={-34} />
      <Sfx name="el-pop" at={fiftySevenAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={60}>
          Twenty-three people: is a shared birthday more likely than not?
        </QuestionCard>

        {/* ── The room, and every pair in it ── */}
        <Svg>
          {PAIRS.slice(0, chords).map(([i, j], k) => {
            const [x0, y0] = spot(i);
            const [x1, y1] = spot(j);
            return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={DATA} strokeWidth={1} opacity={0.32} />;
          })}
          {Array.from({ length: BDAY.people }, (_, i) => {
            const p = ease(frame, textAt + i * 0.8, 10);
            const [x, py] = spot(i);
            return p > 0 ? (
              <g key={i}>
                <circle cx={x} cy={py} r={22 * p} fill={PAPER} />
                <Person x={x} y={py + 4} size={34 * p} color={DATA} />
              </g>
            ) : null;
          })}
        </Svg>
        <Note at={yesAt} x={90} y={y(320)}>
          <span style={{ ...note(40, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Yes, just.</span>
        </Note>
        <Note at={pairsAt + 4} x={RING.cx - 170} width={340} y={cy - 26} from="up" style={{ textAlign: "center" }}>
          <span
            style={{
              ...label(34 + 6 * pulse(frame, countAt + 4, 20), INK),
              ...TABULAR,
              background: PAPER,
              padding: "4px 14px",
              borderRadius: 8,
              whiteSpace: "nowrap",
            }}
          >
            {Math.min(BDAY.pairs, chords)} pairs
          </span>
        </Note>
        <Note at={countAt + 12} x={RING.cx - 170} width={340} y={cy + 30} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...math(28, INK), background: PAPER, padding: "2px 10px", borderRadius: 6 }}>
            {BDAY.people} × {BDAY.people - 1} ÷ 2
          </span>
        </Note>

        {/* ── The complement: each new person misses everyone before them ── */}
        <Note at={complementAt} x={WORK.x} y={y(WORK.noMatch)}>
          <span style={math(32, INK)}>
            P(no match) ={" "}
            <Late at={firstAt}>
              {365 - 1}/365
            </Late>
            <Late at={secondAt}>
              {" "}× {365 - 2}/365
            </Late>
            <Late at={lastAt}>
              {" "}× ⋯ × {BDAY.lastFactor}/365
            </Late>
            <Late at={noneAt}>
              {" "}= {pct(BDAY.noMatch, 1)}
            </Late>
          </span>
        </Note>
        <Note at={fiftyAt} x={WORK.x} y={y(WORK.match)}>
          <span style={math(32, OK_INK)}>
            P(match) = 1 − {pct(BDAY.noMatch, 1)} = {pct(BDAY.exact, 1)}
          </span>
        </Note>

        {/* ── The chance, against the size of the room ── */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 10, 20, 30, 40, 50, 60]}
          yTicks={[0, 0.5, 1]}
          yFormat={(v) => pct(v)}
          xTitle="people in the room"
          yTitle="chance two share a birthday"
          at={exactAt - 6}
        />
        <Svg>
          <line
            x1={PLOT.left}
            x2={PLOT.right}
            y1={at(ys, 0.5)}
            y2={at(ys, 0.5)}
            stroke={INK_SOFT}
            strokeWidth={1.6}
            strokeDasharray="6 6"
            opacity={ease(frame, fiftyAt - 4, 10)}
          />
          <path d={path} fill="none" stroke={DATA} strokeWidth={4} />
          <line x1={at23[0]} x2={at23[0]} y1={y(PLOT.base)} y2={at23[1]} stroke={OK} strokeWidth={2.4} opacity={p23} />
          <circle cx={at23[0]} cy={at23[1]} r={10 * p23} fill={OK} />
          <circle cx={at23[0]} cy={at(ys, BDAY.simulated)} r={20 * pRooms} fill="none" stroke={DATA_LIGHT} strokeWidth={5} opacity={pRooms} />
          <circle cx={at57[0]} cy={at57[1]} r={9 * p57} fill={DATA} />
        </Svg>
        <Note at={fiftyAt + 2} x={at23[0] + 22} y={at23[1] + 10}>
          <span style={{ ...label(28, OK_INK), ...TABULAR, whiteSpace: "nowrap" }}>23 people: {pct(BDAY.exact, 1)}</span>
        </Note>
        <Note at={roomsAt + 4} x={at23[0] + 22} y={at23[1] + 52}>
          <span style={{ ...label(22, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
            {BDAY.rooms.toLocaleString("en-US")} simulated rooms: {pct(BDAY.simulated, 1)}
          </span>
        </Note>
        <Note at={fiftySevenAt + 4} x={at57[0]} y={at57[1] - 50} align="right">
          <span style={{ ...label(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            {BDAY.over99} people: over 99%
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** Words that ink in later than the rest of their line. */
const Late: React.FC<{ at: number; children: React.ReactNode }> = ({ at: from, children }) => {
  const frame = useCurrentFrame();
  return <span style={{ opacity: ease(frame, from, 10) }}>{children}</span>;
};
