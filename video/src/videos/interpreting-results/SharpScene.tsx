import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { SHOTS } from "./data";
import { DATA, DATA_INK, Drift, Headline, Marker, Ring, Spot, STAT_INK, Svg } from "./parts";

const WX0 = 180;
const WALL_TOP = 320;
const WW = 930;
const PLANKS = 10;
const WOOD = `color-mix(in srgb, ${ds("red", 300)} 34%, ${PAPER})`;
const GRAIN = `color-mix(in srgb, ${ds("red", 700)} 30%, transparent)`;
const HOLE = `color-mix(in srgb, ${INK} 85%, transparent)`;
const RINGS = [ds("blue", 500), ds("yellow", 500), ds("blue", 500), ds("yellow", 500)];

/**
 * The Texas sharpshooter: forty holes in a wall, a target painted round the
 * tightest cluster afterwards, and a second volley that ignores it.
 */
export const SharpScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("sharp").from;

  // ── Cues ──
  const purposeAt = n.word("sharp", "on purpose");
  const fireAt = n.word("sharp", "Fire");
  const wallAt = n.word("sharp", "barn wall");
  const paintAt = n.word("sharp", "paint");
  const clusterAt = n.word("sharp", "tightest cluster");
  const againAt = n.word("again", "fire again");
  const goneAt = n.word("again", "gone");
  const aimedAt = n.word("again", "never aimed");
  const lookingAt = n.word("fresh", "by looking");
  const freshAt = n.word("fresh", "fresh data");
  const end = n.beat("fresh").to;

  const scale = WW / SHOTS.wall[0];
  const top = y(WALL_TOP);
  const wh = SHOTS.wall[1] * scale;
  const pos = ([sx_, sy_]: readonly [number, number]) => [WX0 + sx_ * scale, top + sy_ * scale] as const;
  const [cx, cy] = pos(SHOTS.target as unknown as readonly [number, number]);
  const R = SHOTS.radius * scale;
  const wall = ease(frame, fireAt - 10, 14);
  const firstDim = ease(frame, againAt - 2, 12) * 0.6;
  const targetDim = ease(frame, aimedAt - 2, 14) * 0.45;
  const volley = (k: number, at: number) => at + k * 0.9;

  return (
    <AbsoluteFill>
      {/* ── Sound: two volleys, the paint, the count ── */}
      <Sfx name="el-sprinkle" at={wallAt - 4} level={-32} />
      <Sfx name="el-pencil" at={paintAt - 2} level={-33} />
      <Sfx name="el-sprinkle" at={againAt} level={-33} />
      <Sfx name="el-tap" at={goneAt - 2} level={-29} />

      <Headline
        top={y(150)}
        out={lookingAt - 8}
        parts={[
          { text: "The target,", at: paintAt - 6 },
          { text: "painted after the shots.", at: clusterAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        parts={[
          { text: "Found by looking?", at: lookingAt - 4 },
          { text: "Test it fresh.", at: freshAt - 6, italic: true },
        ]}
      />

      <Spot id="interpreting-results-barn" at={purposeAt - 6} left={1440} top={y(300)} width={340} height={362} />

      <Drift from={freshAt - 10} to={end + 40} amount={0.025} origin={[645, 640]}>
        <FigLabel n="10" title="Forty shots at a barn wall" at={from - 4} x={160} y={y(262)} />
        <Svg opacity={wall}>
          <rect x={WX0} y={top} width={WW} height={wh} fill={WOOD} rx={4} />
          {Array.from({ length: PLANKS - 1 }, (_, i) => (
            <line key={i} x1={WX0 + ((i + 1) * WW) / PLANKS} x2={WX0 + ((i + 1) * WW) / PLANKS} y1={top} y2={top + wh} stroke={GRAIN} strokeWidth={2} />
          ))}
        </Svg>

        {/* The painted target: rings drawn round the densest cluster. */}
        <Svg opacity={1 - targetDim}>
          {RINGS.map((c, i) => {
            const p = ease(frame, paintAt - 2 + i * 5, 14);
            if (p <= 0) return null;
            const r = R * (1 - i * 0.24);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={c}
                strokeWidth={R * 0.2}
                pathLength={1}
                strokeDasharray={`${p} 1`}
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={0.85}
              />
            );
          })}
        </Svg>

        {/* The holes: the first volley, then the second. */}
        <Svg>
          {SHOTS.first.map((s, k) => {
            const a = pop(frame, volley(k, wallAt - 4), fps, 18);
            if (a <= 0.01) return null;
            const [hx, hy] = pos(s);
            return <circle key={k} cx={hx} cy={hy} r={7 * Math.min(1.2, a)} fill={HOLE} stroke={PAPER} strokeWidth={1.5} opacity={1 - firstDim} />;
          })}
          {SHOTS.second.map((s, k) => {
            const a = pop(frame, volley(k, againAt), fps, 18);
            if (a <= 0.01) return null;
            const [hx, hy] = pos(s);
            return <circle key={k} cx={hx} cy={hy} r={7 * Math.min(1.2, a)} fill={DATA} stroke={PAPER} strokeWidth={1.5} />;
          })}
        </Svg>
        <Ring x={cx} y={cy} at={clusterAt} r0={R} r1={R + 50} />

        <Note at={clusterAt + 4} x={WX0 + WW + 24} y={top + 20}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            {SHOTS.inside} of {SHOTS.first.length} in the target
          </span>
        </Note>
        <Note at={goneAt - 4} x={WX0 + WW + 24} y={top + 64}>
          <span style={{ ...note(24, DATA_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            then {SHOTS.insideAgain} of {SHOTS.second.length}
          </span>
        </Note>
        <Note at={aimedAt - 2} x={WX0 + WW + 24} y={top + 108}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>chance alone: about {fmt(SHOTS.expected, 1)}</span>
        </Note>
        <Note at={lookingAt - 2} x={160} y={top + wh + 30}>
          <span style={{ ...label(24, INK), whiteSpace: "nowrap", ...halo }}>
            a pattern you found has to hold up on <Marker at={freshAt - 2}>fresh data</Marker>
          </span>
        </Note>
        <Note at={purposeAt + 4} x={1460} y={y(300) + 400}>
          <span style={{ ...note(21, STAT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            cherry-picking, on purpose
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
