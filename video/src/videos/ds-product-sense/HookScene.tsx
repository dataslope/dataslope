import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HOOK, num } from "./data";
import { Clear, DATA, Drift, Headline, Kicker, madeUp, Mark, pulse, Spot, X0 } from "./parts";

const TILE = { top: 300, w: 520, h: 270, gap: 40 };
const SQUARES = { top: 700, size: 54, gap: 14, small: 40 };

/** A dashboard tile: its name, its number, the change, and a small line. */
const Tile: React.FC<{
  x: number;
  top: number;
  at: number;
  name: string;
  value: string;
  delta: React.ReactNode;
  deltaAt: number;
  line: readonly number[];
  lineAt: number;
  lit?: number;
  dim?: number;
}> = ({ x, top, at: from, name, value, delta, deltaAt, line, lineAt, lit, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const l = lit === undefined ? 0 : ease(frame, lit, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const draw = ease(frame, lineAt, 24);
  if (p <= 0) return null;
  const sw = TILE.w - 60;
  const sh = 60;
  const lo = Math.min(...line);
  const hi = Math.max(...line);
  const pts = line.map((v, i) => [30 + (i / (line.length - 1)) * sw, TILE.h - 26 - ((v - lo) / (hi - lo || 1)) * sh] as const);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: TILE.w,
        height: TILE.h,
        boxSizing: "border-box",
        border: `2px solid ${INK}`,
        borderRadius: 14,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${l * 45}%, ${PAPER})`,
        opacity: p * (1 - d),
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <div style={{ position: "absolute", left: 30, top: 22, ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "absolute", left: 28, top: 54, ...note(64, INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ position: "absolute", left: 30, top: 136, opacity: ease(frame, deltaAt, 10), ...TABULAR, whiteSpace: "nowrap" }}>{delta}</div>
      <svg width={TILE.w} height={TILE.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ")}
          fill="none"
          stroke={DATA}
          strokeWidth={3.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${draw} 1`}
        />
      </svg>
    </div>
  );
};

/**
 * The opening. Two tiles from one made-up dashboard: total signups, up again
 * as it is every day, and users still cooking four weeks in, down two points.
 * Only the second can say something is wrong. Then the round in one line, the
 * made-up app every number belongs to, and fourteen squares for the fourteen
 * questions: eleven with a figure, three in a sentence.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const twoAt = n.word("hook", "Two numbers");
  const sameAt = n.word("hook", "the same dashboard");
  const signupsAt = n.word("hook", "Total signups");
  const upAt = n.word("hook", "up again");
  const everyAt = n.word("hook", "every single day");
  const cookingAt = n.word("hook", "Users still cooking");
  const downAt = n.word("hook", "down two points");
  const onlyAt = n.word("hook", "Only one of them");
  const wrongAt = n.word("hook", "something is wrong");
  const senseAt = n.word("plan", "Product sense");
  const judgmentAt = n.word("plan", "is that judgment");
  const codeAt = n.word("plan", "no code in this round");
  const madeUpAt = n.word("plan", "one made-up recipe app");
  const elevenAt = n.word("plan", "Eleven questions");
  const threeAt = n.word("plan", "three close the round");
  const beginAt = n.word("north-in", "Begin with the number");
  const steersAt = n.word("north-in", "steers by");
  const end = n.beat("north-in").to;

  // Cumulative signups only climb; the cohort line holds, then slips.
  const signups = Array.from({ length: 24 }, (_, i) => 1 + i * 0.9 + (i % 3) * 0.12);
  const cooking = [31, 31.2, 30.9, 31.1, 31, 31.2, 30.8, 31, 31.1, 30.9, 31, 31.1, 30.9, 31, 30.8, 30.6, 30.2, 29.9, 29.6, 29.3, 29.1, 29, 29.1, 29];
  const sqIn = (i: number) => (i < 11 ? elevenAt + i * 1.5 : threeAt + (i - 11) * 3);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={signupsAt + 2} level={-32} />
      <Sfx name="el-pop" at={cookingAt + 2} level={-32} />
      <Sfx name="el-tap" at={downAt + 2} level={-32} />
      <Sfx name="el-pencil" at={wrongAt} level={-34} />
      <Sfx name="el-sprinkle" at={elevenAt} level={-36} />
      <Sfx name="el-whoosh" at={steersAt} level={-36} />

      <Drift from={0} to={end + 40}>
        <Kicker at={6}>Data scientist interview prep</Kicker>
        <Headline lead="Two numbers" turn="from the same dashboard." at={twoAt - 4} turnAt={sameAt - 4} out={senseAt - 6} size={68} />
        {/* Up until the cut, so the bridge never empties to the kicker. */}
        <Headline lead="Product sense" turn="is that judgment." at={senseAt - 2} turnAt={judgmentAt - 2} size={68} />

        <Clear at={steersAt}>
          <Tile
            x={X0}
            top={y(TILE.top)}
            at={signupsAt - 4}
            name="Total signups"
            value={num(HOOK.signups)}
            delta={<span style={{ ...note(26, INK_SOFT), fontWeight: 650 }}>▲ {num(HOOK.signupsToday)} today</span>}
            deltaAt={upAt}
            line={signups}
            lineAt={everyAt - 4}
            dim={onlyAt + 6}
          />
          <Tile
            x={X0 + TILE.w + TILE.gap}
            top={y(TILE.top)}
            at={cookingAt - 4}
            name="Still cooking 4 weeks after joining"
            value={`${HOOK.retentionNow}%`}
            delta={
              <span style={{ ...note(26, ACCENT_INK), fontWeight: 650 }}>
                ▼ 2 points, from {HOOK.retentionWas}%
              </span>
            }
            deltaAt={downAt}
            line={cooking}
            lineAt={downAt - 2}
            lit={onlyAt + 6}
          />
          <Note at={wrongAt} x={X0 + TILE.w + TILE.gap} y={y(TILE.top) + h(TILE.h) + h(22)}>
            <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              <Mark at={wrongAt + 4}>the one that can say something is wrong</Mark>
            </span>
          </Note>
          <Note at={madeUpAt} x={X0} y={y(TILE.top) - h(44)}>
            <span style={{ ...madeUp(21), opacity: 1 }}>one made-up recipe app: all its numbers are invented</span>
          </Note>
          <Note at={codeAt} x={X0 + 2 * TILE.w + TILE.gap} align="right" y={y(TILE.top) - h(44) - 5}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>no code in this round</span>
          </Note>

          {/* Fourteen questions: eleven with a figure, three in a sentence. */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {Array.from({ length: 14 }, (_, i) => {
              const p = ease(frame, sqIn(i), 8);
              if (p <= 0) return null;
              const small = i >= 11;
              const s = (small ? SQUARES.small : SQUARES.size) * p;
              const x0 = X0 + i * (SQUARES.size + SQUARES.gap) + (small ? 30 : 0);
              const cy = y(SQUARES.top) + SQUARES.size / 2;
              const glow = i === 0 ? pulse(frame, beginAt, 26) : 0;
              return (
                <rect
                  key={i}
                  x={x0 + ((small ? SQUARES.small : SQUARES.size) - s) / 2}
                  y={cy - s / 2}
                  width={s}
                  height={s}
                  rx={8}
                  fill={small ? PAPER : `color-mix(in srgb, ${HIGHLIGHT} ${glow * 100}%, ${DATA})`}
                  stroke={small ? DATA : "none"}
                  strokeWidth={2.4}
                  transform={glow ? `rotate(${glow * 6} ${x0 + SQUARES.size / 2} ${cy})` : undefined}
                />
              );
            })}
          </svg>
          <Note at={elevenAt + 8} x={X0} y={y(SQUARES.top) + SQUARES.size + h(14)}>
            <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>11 with a figure</span>
          </Note>
          <Note at={threeAt + 6} x={X0 + 11 * (SQUARES.size + SQUARES.gap) + 30} y={y(SQUARES.top) + SQUARES.size + h(14)}>
            <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>3 in a sentence</span>
          </Note>
          <Note at={beginAt + 4} x={X0} y={y(SQUARES.top) - 62}>
            <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
              <b style={{ color: INK }}>first:</b> the number a whole team steers by
            </span>
          </Note>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, beginAt + 8, 8) }}>
            <line
              x1={X0 + SQUARES.size / 2}
              x2={X0 + SQUARES.size / 2}
              y1={y(SQUARES.top) - 29}
              y2={y(SQUARES.top) - 6}
              stroke={INK_SOFT}
              strokeWidth={2}
            />
          </svg>

          <Spot id="ds-product-sense-squirrel" at={sameAt} left={1290} top={y(250)} width={500} height={430} />
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
