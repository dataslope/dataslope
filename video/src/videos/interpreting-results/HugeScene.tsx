import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, normalPdf, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, HAIRLINE, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HUGE } from "./data";
import { Bracket, Drift, GROUP_COLOR, GROUP_INK, Headline, Kicker, lerp, Marker, Ring, STAT_INK, Svg } from "./parts";

/** The scores: 40 to 160, about four standard deviations either side. */
const X: XScale = { lo: 40, hi: 160, x0: 160, x1: 1000 };
const BASE = 820;
const PEAK = 380;
/** The loupe: 99.85 to 100.25, enlarged to 320 px. */
const LX: XScale = { lo: 99.85, hi: 100.25, x0: 830, x1: 1150 };
const LOUPE = { top: 300, height: 196 };
const RIGHT = 1300;
const ROW1 = 330;
const ROW2 = 590;

const COLOR = [GROUP_COLOR.men, GROUP_COLOR.women] as const;
const COLOR_INK = [GROUP_INK.men, GROUP_INK.women] as const;


/**
 * Part 1 opens: a test says whether, not how big. Two groups of 300,000
 * whose curves cannot be told apart, a gap of a seventh of a point under a
 * loupe, a p-value that counts down to significant, and a d of 0.009.
 */
export const HugeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const hookFrom = n.beat("hook").from;

  // ── Cues ──
  const thereAt = n.word("hook", "there");
  const bigAt = n.word("hook", "how big");
  const groupsAt = n.word("huge", "two groups");
  const peopleAt = n.word("huge", "thousand");
  const scoreAt = n.word("huge", "score");
  const fifteenAt = n.word("huge", "fifteen");
  const averageAt = n.word("p", "average");
  const seventhAt = n.word("p", "seventh");
  const pAtWord = n.word("p", "p-value");
  const sigAt = n.word("p", "highly significant");
  const seventh2At = n.word("tiny", "seventh");
  const spreadAt = n.word("tiny", "spread");
  const percentAt = n.word("tiny", "one percent");
  const deviationAt = n.word("tiny", "standard deviation");
  const realAt = n.word("real", "real");
  const smallAt = n.word("real", "too small");
  const dataAt = n.word("why", "enough data");
  const passesAt = n.word("why", "passes");
  const passingAt = n.word("why", "passing");
  const careAt = n.word("why", "care");
  const sizeAt = n.word("d-in", "measure of size");
  const end = n.beat("d-in").to;

  const py = (v: number) => y(BASE) - h(PEAK) * (normalPdf(v, 100, HUGE.sd) / normalPdf(100, 100, HUGE.sd));
  const curve = (mu: number, p: number) => {
    const steps = 120;
    const pts = Array.from({ length: Math.round(steps * p) + 1 }, (_, i) => {
      const v = X.lo + ((X.hi - X.lo) * i) / steps;
      const yy = y(BASE) - h(PEAK) * (normalPdf(v, mu, HUGE.sd) / normalPdf(mu, mu, HUGE.sd));
      return `${i ? "L" : "M"}${sx(X, v).toFixed(1)},${yy.toFixed(1)}`;
    });
    return pts.join(" ");
  };
  const drawA = ease(frame, groupsAt - 4, 30);
  const drawB = ease(frame, peopleAt - 6, 30);
  const means = ease(frame, averageAt - 4, 12);
  const loupe = ease(frame, seventhAt - 6, 16);
  const spreadBold = ease(frame, spreadAt - 4, 10);
  const pDim = ease(frame, careAt - 4, 14) * 0.55;

  const peakY = py(100);
  const mx = [HUGE.meanA, HUGE.meanB];
  const loupeTop = y(LOUPE.top);
  const loupeBottom = loupeTop + LOUPE.height;

  return (
    <AbsoluteFill>
      {/* ── Sound: the two curves, the loupe, the count, the d ── */}
      <Sfx name="el-pencil" at={groupsAt - 4} level={-34} />
      <Sfx name="el-pencil" at={peopleAt - 6} level={-35} />
      <Sfx name="el-whoosh" at={seventhAt - 6} level={-33} />
      <Sfx name="el-tap" at={sigAt - 2} level={-28} />
      <Sfx name="el-tap" at={percentAt - 2} level={-29} />
      <Sfx name="el-pop" at={sizeAt - 4} level={-30} />

      <Kicker at={hookFrom - 10}>Significant isn&apos;t important</Kicker>

      <Headline
        top={y(150)}
        out={realAt - 8}
        parts={[
          { text: "There is an effect.", at: hookFrom - 6 },
          { text: "How big is it?", at: bigAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        parts={[
          { text: "Real,", at: realAt - 4 },
          { text: "and too small to matter.", at: smallAt - 6, italic: true },
        ]}
      />

      <Drift from={careAt} to={end + 40} amount={0.025} origin={[580, 640]}>
        <FigLabel n="1" title={`Two groups of ${HUGE.n.toLocaleString("en-US")}`} at={groupsAt - 8} x={160} y={y(258)} />

        {/* ── The two curves, one over the other ── */}
        <Svg>
          {drawA > 0 ? (
            <path d={curve(HUGE.meanA, drawA)} fill="none" stroke={COLOR[0]} strokeWidth={7} strokeLinejoin="round" opacity={0.75} />
          ) : null}
          {drawB > 0 ? (
            <path
              d={curve(HUGE.meanB, drawB)}
              fill="none"
              stroke={COLOR[1]}
              strokeWidth={3.5}
              strokeDasharray="14 9"
              strokeLinejoin="round"
            />
          ) : null}
          {means > 0
            ? mx.map((m, i) => (
                <line
                  key={i}
                  x1={sx(X, m)}
                  x2={sx(X, m)}
                  y1={y(BASE)}
                  y2={lerp(y(BASE), peakY, means)}
                  stroke={COLOR[i]}
                  strokeWidth={2}
                  opacity={0.8}
                />
              ))
            : null}
        </Svg>
        {/* The scale arrives with the first question, before the groups do. */}
        <Axis scale={X} base={y(BASE)} ticks={[40, 70, 100, 130, 160]} at={thereAt - 4} />
        {(["A", "B"] as const).map((g, i) => (
          <Note key={g} at={(i ? peopleAt : groupsAt) + 4} x={i ? sx(X, 121) + 18 : sx(X, 79) - 18} y={i ? py(121) - 30 : py(79) - 30} align={i ? "left" : "right"}>
            <span style={{ ...label(22, COLOR_INK[i]), ...halo, whiteSpace: "nowrap" }}>Group {g}</span>
          </Note>
        ))}

        <Note at={scoreAt - 2} x={X.x1} y={y(BASE) + 40} align="right">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>score</span>
        </Note>

        {/* One standard deviation, under the left half of the curves. */}
        <Bracket x0={sx(X, 100 - 15)} x1={sx(X, 100)} y={y(BASE) + 52} at={fifteenAt - 4} up width={lerp(2.2, 3.6, spreadBold)} />
        <Note at={fifteenAt} x={(sx(X, 85) + sx(X, 100)) / 2} y={y(BASE) + 62} from="up">
          <span style={{ ...note(21, INK), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
            spread: about 15 points
          </span>
        </Note>

        {/* ── The loupe: the top of the curves, enlarged ── */}
        {loupe > 0 ? (
          <Svg opacity={loupe}>
            <rect x={sx(X, 99.4) - 3} y={peakY - 14} width={sx(X, 100.6) - sx(X, 99.4) + 6} height={28} fill="none" stroke={INK} strokeWidth={1.6} />
            <rect x={LX.x0 - 20} y={loupeTop} width={LX.x1 - LX.x0 + 40} height={LOUPE.height} fill={PAPER} stroke={INK} strokeWidth={1.6} />
            {mx.map((m, i) => (
              <line
                key={i}
                x1={sx(LX, m)}
                x2={sx(LX, m)}
                y1={loupeBottom - 18}
                y2={lerp(loupeBottom - 18, loupeTop + 44, loupe)}
                stroke={COLOR[i]}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
          </Svg>
        ) : null}
        <Leader
          points={[
            [sx(X, 100.6) + 4, peakY - 6],
            [LX.x0 - 20, loupeBottom - 40],
          ]}
          at={seventhAt - 4}
          dur={10}
          dot={false}
          color={HAIRLINE}
        />
        <Note at={seventhAt + 2} x={LX.x0 - 6} y={loupeTop + 8}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>the two averages, enlarged</span>
        </Note>
        <Bracket x0={sx(LX, mx[0])} x1={sx(LX, mx[1])} y={loupeTop + 70} at={seventhAt + 6} up={false} tick={10} />
        <Note at={seventhAt + 8} x={(sx(LX, mx[0]) + sx(LX, mx[1])) / 2} y={loupeTop + 82} from="up">
          <span
            style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)", ...halo }}
          >
            {fmt(HUGE.gap, 2)}
          </span>
        </Note>
        <Ring x={(sx(LX, mx[0]) + sx(LX, mx[1])) / 2} y={loupeTop + 100} at={seventh2At - 2} r1={60} />
      </Drift>

      {/* ── The two questions, answered ── */}
      {(() => {
        const draw = ease(frame, passesAt - 4, 14);
        if (draw <= 0) return null;
        const move = ease(frame, sizeAt - 6, 16);
        const top = lerp(y(ROW1) - 22, y(ROW2) - 22, move);
        return (
          <Svg>
            <rect
              x={RIGHT - 26}
              y={top}
              width={540}
              height={lerp(232, 256, move)}
              rx={10}
              fill="none"
              stroke={INK}
              strokeWidth={2.6}
              pathLength={1}
              strokeDasharray={`${draw} 1`}
            />
          </Svg>
        );
      })()}
      <Ink at={thereAt - 6} dur={14} style={{ left: RIGHT, top: y(ROW1), whiteSpace: "nowrap" }}>
        <span style={label(24, INK)}>Is it there?</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: RIGHT,
          top: y(ROW1) + 46,
          opacity: ease(frame, pAtWord - 2, 12) * (1 - pDim),
          ...note(52, INK),
          ...TABULAR,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        p = {fmt(HUGE.p, 5)}
      </div>
      <Ring x={RIGHT + 170} y={y(ROW1) + 78} at={passingAt - 2} r0={40} r1={130} />
      <Note at={sigAt - 2} x={RIGHT} y={y(ROW1) + 126}>
        <span style={{ ...note(26, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", opacity: 1 - pDim }}>
          <Marker at={realAt - 2}>yes: significant</Marker>
        </span>
      </Note>
      <Note at={dataAt - 2} x={RIGHT} y={y(ROW1) + 172}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          and it shrinks as the sample <Marker at={passesAt - 2}>grows</Marker>
        </span>
      </Note>

      <Ink at={bigAt - 4} dur={14} style={{ left: RIGHT, top: y(ROW2), whiteSpace: "nowrap" }}>
        <span style={label(24, INK)}>
          <Marker at={sizeAt - 4}>Is it big?</Marker>
        </span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: RIGHT,
          top: y(ROW2) + 46,
          opacity: ease(frame, percentAt - 6, 12),
          ...note(52, INK),
          ...TABULAR,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        d = {fmt(HUGE.d, 3)}
      </div>
      <Note at={percentAt + 6} x={RIGHT} y={y(ROW2) + 126}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          the gap, {fmt(HUGE.gap, 2)}, over the spread, <Marker at={deviationAt - 2}>{fmt(HUGE.sd, 1)}</Marker>
        </span>
      </Note>
      <Note at={smallAt - 2} x={RIGHT} y={y(ROW2) + 166}>
        <span style={{ ...note(26, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>no: negligible</span>
      </Note>
    </AbsoluteFill>
  );
};
