import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { END_A, FIRST_FLIPS, STEPS, TREND, WALK_A } from "./data";
import {
  COLOR,
  COLOR_INK,
  Headline,
  Key,
  Layer,
  leaveAt,
  prose,
  Spot,
  ValueGrid,
  WALK_X,
  WALK_Y,
  useValueY,
  walkD,
  walkTip,
} from "./parts";

/** Where the brackets and notes of the right-hand column start. */
const RIGHT = 1340;
const CHIP_W = 50;
const CHIP_GAP = 8;

/**
 * Hook, coin, wander: one random walk draws itself and looks like it is
 * heading up. Then the flips it is made of, and the straight line the eye
 * fits through it.
 */
export const WalkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const yOf = useValueY(WALK_Y);
  const hook = n.beat("hook");
  const coinFrom = n.beat("coin").from;
  const flipAt = n.word("coin", "coin flip");
  const stepAt = n.word("coin", "Each step");
  const upDownAt = n.word("coin", "one up");
  const wanderFrom = n.beat("wander").from;
  const upAt = n.word("wander", "twenty-six");
  const trendAt = n.word("wander", "trend");
  const leave = leaveAt(n.beat("pair").from);

  // The walk draws itself while the hook is spoken.
  const drawn = STEPS * ease(frame, hook.from - 4, coinFrom - hook.from);
  const [tipX, tipY] = walkTip(WALK_A, WALK_X, yOf, drawn);
  // The first flips, picked out on the line while they are spelled out.
  const first = ease(frame, upDownAt - 6, 14) * (1 - ease(frame, wanderFrom, 12));
  const bracket = ease(frame, upAt - 4, 14);
  const trend = ease(frame, trendAt - 6, 20);
  const x0 = sx(WALK_X, 0);
  const x1 = sx(WALK_X, STEPS);

  return (
    <AbsoluteFill>
      <Headline first="Going somewhere?" second="Three hundred coin flips." at={2} secondAt={flipAt - 2} out={leave} />
      <FigLabel n="1" title="One random walk, 300 flips of a coin" at={6} x={120} y={y(196)} out={leave} />

      {/* The first flips, spelled out as the narration describes a step. */}
      <Ink at={stepAt - 6} dur={14} style={{ left: 200, top: y(258) + 9, whiteSpace: "nowrap" }}>
        <span style={label(20, INK_SOFT)}>First {FIRST_FLIPS.length} flips</span>
      </Ink>
      {FIRST_FLIPS.map((f, i) => {
        const p = ease(frame, stepAt + i * 3, 10);
        const up = f > 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 380 + i * (CHIP_W + CHIP_GAP),
              top: y(258),
              width: CHIP_W,
              height: 42,
              boxSizing: "border-box",
              border: `1.5px solid ${up ? COLOR.a : ACCENT}`,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: p,
              transform: `translateY(${(1 - p) * (up ? 10 : -10)}px)`,
              ...note(21, up ? COLOR_INK.a : ACCENT_INK),
              fontWeight: 650,
            }}
          >
            {up ? "+1" : "−1"}
          </div>
        );
      })}

      <ValueGrid scale={WALK_X} spec={WALK_Y} at={4} title="Steps from the start" />
      <Axis
        scale={WALK_X}
        base={yOf(WALK_Y.lo)}
        ticks={[0, 100, 200, 300]}
        format={(v) => (v === 300 ? "300 flips" : String(v))}
        at={6}
        size={20}
      />

      <Layer>
        {/* The straight line the eye fits through it. */}
        <path
          d={`M${x0},${yOf(TREND.at(0))} L${x1},${yOf(TREND.at(STEPS))}`}
          fill="none"
          stroke={ACCENT}
          strokeWidth={3}
          strokeDasharray="10 8"
          style={{ clipPath: `inset(0 ${(1 - trend) * 100}% 0 0)` }}
          opacity={trend > 0 ? 1 : 0}
        />
        <path
          d={walkD(WALK_A, WALK_X, yOf, drawn)}
          fill="none"
          stroke={COLOR.a}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {first > 0 ? (
          <path
            d={walkD(WALK_A, WALK_X, yOf, FIRST_FLIPS.length)}
            fill="none"
            stroke={ACCENT}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={first}
          />
        ) : null}
        {drawn > 0 ? <circle cx={tipX} cy={tipY} r={6} fill={COLOR.a} stroke={PAPER} strokeWidth={2} /> : null}
        {/* Twenty-six steps up: a bracket from the start's level to the end. */}
        {bracket > 0 ? (
          <g stroke={INK} strokeWidth={2}>
            <line x1={x1 + 24} x2={x1 + 24} y1={yOf(0)} y2={yOf(0) + (yOf(END_A) - yOf(0)) * bracket} />
            <line x1={x1 + 16} x2={x1 + 32} y1={yOf(0)} y2={yOf(0)} />
            {bracket >= 1 ? <line x1={x1 + 16} x2={x1 + 32} y1={yOf(END_A)} y2={yOf(END_A)} /> : null}
          </g>
        ) : null}
      </Layer>

      <Note at={upAt + 2} x={RIGHT + 30} y={(yOf(0) + yOf(END_A)) / 2 - 52}>
        <div style={{ ...headline(64), color: COLOR_INK.a }}>+{END_A}</div>
        <div style={{ ...prose(21), marginTop: 6, whiteSpace: "nowrap" }}>steps after {STEPS} flips</div>
      </Note>
      <Note at={trendAt} x={RIGHT + 30} y={yOf(0) + 40}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, whiteSpace: "nowrap", ...prose(21, INK) }}>
          <Key color={ACCENT} kind="dash" />
          the trend the eye sees
        </span>
      </Note>

      <Spot id="random-walks-coin" at={flipAt - 4} box={{ left: 1490, top: y(130), width: 300, height: y(390) - y(130) }} />
    </AbsoluteFill>
  );
};
