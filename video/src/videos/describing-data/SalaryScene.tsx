import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SALARIES } from "./data";
import { Arrow, AxisBreak, Bracket, Mark, DATA, Drift, Kicker, lerp, Pulse, Spot, STAT, STAT_INK, Svg, Tag } from "./parts";

/** Before the CEO: the ten salaries spread across the page. */
const NEAR = { lo: 38, hi: 70, x0: 220, x1: 1700 };
/** After: room for the mean's jump, and a broken axis out to the CEO. */
const FAR = { lo: 35, hi: 150, x0: 220, x1: 1440 };
const BREAK_X = 1490;
const CEO_X = 1630;
const BASE = 700;
const R = 11;
/** The dots shrink as the axis tightens, so neighbours never touch. */
const R_FAR = 8;

const at = (s: { lo: number; hi: number; x0: number; x1: number }, v: number) => s.x0 + ((v - s.lo) / (s.hi - s.lo)) * (s.x1 - s.x0);

/**
 * Part 1 opens: ten salaries whose mean and median agree, then the CEO who
 * walks in at a million. The axis makes room, the mean leaps up the page and
 * the median moves one step; the mean as a balance point, the median as the
 * middle person.
 */
export const SalaryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const typicalAt = n.word("hook", "typical");
  const takeAt = n.word("hook", "So take");
  const tenAt = n.word("hook", "ten salaries");
  const fortyAt = n.word("hook", "forty-two");
  const sixtyAt = n.word("hook", "sixty-five");
  const jumpSevenAt = n.word("jump", "seven");
  const roomAt = n.word("nobody", "room");
  const meanAt = n.word("centers", "mean");
  const sevenAt = n.word("centers", "seven");
  const middleValueAt = n.word("centers", "middle value");
  const medianWordAt = n.word("centers", "median");
  const thousandAt = n.word("centers", "thousand");
  const medianFiftyAt = n.word("centers", "fifty-three", { nth: 2 });
  const halfAt = n.word("centers", "half");
  const almostAt = n.word("centers", "Almost");
  const ceoAt = n.word("ceo", "CEO");
  const millionAt = n.word("ceo", "million");
  const jumpFrom = n.beat("jump").from;
  const leapsAt = n.word("jump", "leaps");
  const fiftyFiveAt = n.word("jump", "fifty-five");
  const medianMovesAt = n.word("jump", "median");
  const tenOfAt = n.word("nobody", "Ten");
  const lessAt = n.word("nobody", "less");
  const nobodyAt = n.word("nobody", "nobody");
  const balanceAt = n.word("balance", "balance point");
  const heavyAt = n.word("balance", "heavy");
  const slidesAt = n.word("balance", "slides");
  const middleFrom = n.beat("middle").from;
  const middleAt = n.word("middle", "middle");
  const medianAsksAt = n.word("middle", "median");
  const ceoSitsAt = n.word("middle", "CEO");
  const moneyAt = n.word("tail-in", "money");
  const tailAt = n.word("tail-in", "tail");

  // The axis makes room for the CEO.
  const room = ease(frame, ceoAt - 2, 26);
  const xOf = (v: number) => lerp(at(NEAR, v), at(FAR, v), room);

  const dotsIn = (j: number) => ease(frame, tenAt - 2 + j * 4, 8);
  const ceoDrop = ease(frame, millionAt - 8, 14);

  // The mean and the median: where they stand, and when they move.
  const meanV = lerp(lerp(SALARIES.values[0], SALARIES.mean, ease(frame, meanAt - 4, 44)), SALARIES.ceoMean, ease(frame, leapsAt, 30));
  const medianV = lerp(SALARIES.median, SALARIES.ceoMedian, ease(frame, fiftyFiveAt - 6, 16));
  const meanIn = ease(frame, meanAt - 4, 12);
  const medianIn = ease(frame, middleValueAt - 4, 12);
  const medianLabel = ease(frame, halfAt - 6, 12);

  // The balance: a fulcrum under the plank. It starts back where the mean
  // was, the plank tips toward the CEO, then the fulcrum slides out to the
  // new mean and the plank comes level.
  const fulcrumIn = ease(frame, balanceAt - 4, 12);
  const back = ease(frame, balanceAt - 4, 4) * (1 - ease(frame, slidesAt - 4, 34));
  const fulcrumV = lerp(SALARIES.ceoMean, SALARIES.mean, back);
  const tilt = 3.2 * ease(frame, heavyAt - 2, 14) * (1 - ease(frame, slidesAt + 6, 24));
  const fx = xOf(fulcrumV);
  /** The plank's labels step back while it tips, so nothing level sits on a tilted line. */
  const level = 1 - tilt / 3.2;
  const meanLine = 1 - ease(frame, balanceAt - 4, 10) + ease(frame, slidesAt + 26, 12);
  const medianDim = 1 - 0.75 * (ease(frame, balanceAt - 4, 10) - ease(frame, slidesAt + 20, 12));

  // Each salary's figure, until the axis is too tight for them.
  const valuesIn = ease(frame, fortyAt - 6, 14) * (1 - ease(frame, ceoAt - 4, 10));

  const r = lerp(R, R_FAR, room);
  const all = [...SALARIES.values, SALARIES.ceo];
  const xs = all.map((v, i) => (i === SALARIES.values.length ? lerp(CEO_X + 120, CEO_X, ceoDrop) : xOf(v)));
  const base = y(BASE);
  const sixth = [...all].sort((a, b) => a - b)[5];

  const leftmost = xOf(SALARIES.values[0]);
  const rightmost = xOf(SALARIES.values[SALARIES.values.length - 1]);
  const gapBand = ease(frame, nobodyAt - 4, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the salaries, the CEO, the mean's leap, the fulcrum ── */}
      <Sfx name="el-sprinkle" at={tenAt - 2} level={-33} />
      <Sfx name="el-tap" at={meanAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={ceoAt - 2} level={-33} />
      <Sfx name="el-pop" at={millionAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={leapsAt} level={-34} />
      <Sfx name="el-tap" at={slidesAt - 4} level={-29} />

      <Kicker at={hookFrom - 10}>Mean and median</Kicker>

      {/* ── Headlines ── */}
      <Ink at={hookFrom - 8} dur={20} out={jumpFrom - 6} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Is the average <Mark at={typicalAt - 2}>typical</Mark>?
      </Ink>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={jumpFrom - 4} dur={18} out={middleFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          One salary,
        </Ink>
        <Ink
          at={leapsAt - 2}
          dur={18}
          out={middleFrom - 6}
          style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          and the mean leaps.
        </Ink>
      </div>
      <Ink at={middleFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        The median finds the middle.
      </Ink>

      <Spot id="describing-data-seesaw" at={balanceAt - 6} left={1500} top={y(150)} width={330} height={169} />

      <FigLabel n="1" title="Salaries at a small company, in thousands" at={takeAt - 4} x={160} y={y(330)} />

      <Drift from={tenAt} to={tailAt + 40} scale={0.022} origin={[960, base]}>
        {/* The empty stretch the mean ends up in. */}
        {gapBand > 0 ? (
          <Svg opacity={gapBand * (1 - ease(frame, balanceAt - 6, 12) * 0.6)}>
            <rect
              x={rightmost + 22}
              y={base - h(150)}
              width={(FAR.x1 + 20 - rightmost - 22) * gapBand}
              height={h(150)}
              fill={HIGHLIGHT}
              opacity={0.45}
            />
          </Svg>
        ) : null}
        <Tag x={(rightmost + FAR.x1) / 2 + 20} y={base - h(150) - 34} opacity={ease(frame, nobodyAt + 4, 12) * (1 - ease(frame, balanceAt - 6, 12))} color={INK_SOFT} size={21}>
          nobody earns anything near here
        </Tag>

        {/* The plank: the axis, and every salary sitting on it. */}
        <Svg>
          <g transform={`rotate(${tilt} ${fx} ${base})`}>
            <line
              x1={NEAR.x0 - 30}
              x2={lerp(NEAR.x1 + 30, FAR.x1 + 20, room)}
              y1={base}
              y2={base}
              stroke={INK}
              strokeWidth={2.4}
              opacity={ease(frame, takeAt - 2, 14)}
            />
            {room > 0 ? (
              <line x1={1530} x2={1730} y1={base} y2={base} stroke={INK} strokeWidth={2.4} opacity={room} />
            ) : null}
            {all.map((v, i) => {
              const a = i === SALARIES.values.length ? ceoDrop : dotsIn(i);
              if (a <= 0) return null;
              const drop = i === SALARIES.values.length ? (1 - ceoDrop) * -140 : (1 - a) * -24;
              return (
                <circle key={i} cx={xs[i]} cy={base - r - 1.5 + drop} r={r} fill={DATA} stroke={PAPER} strokeWidth={1.6} opacity={Math.min(1, a * 1.4)} />
              );
            })}
          </g>
        </Svg>
        {room > 0 ? <AxisBreak x={BREAK_X} y={base} opacity={room * level} /> : null}

        {/* Each salary's value, while there is room to print it. */}
        {SALARIES.values.map((v, i) => (
          <Tag key={v} x={xs[i]} y={base - 62} opacity={valuesIn * ease(frame, fortyAt - 6 + i * 3, 8)} color={INK_SOFT} size={21}>
            {v}
          </Tag>
        ))}

        {/* The new axis' ticks, once it has made room. */}
        {[50, 100, 150].map((v) => (
          <Tag key={v} x={at(FAR, v)} y={base + 14} opacity={ease(frame, ceoAt + 14, 12) * level} color={INK_SOFT} size={20}>
            {v}
          </Tag>
        ))}
        <Tag x={CEO_X} y={base + 14} opacity={ease(frame, millionAt + 4, 12) * level} color={INK_SOFT} size={20}>
          1,000
        </Tag>
        <Tag x={CEO_X} y={base - 70} opacity={ease(frame, millionAt + 2, 12) * level} color={INK} size={22} bold>
          The CEO
        </Tag>

        {/* The ten below the mean. */}
        <Bracket x0={leftmost - 14} x1={rightmost + 14} y={base - h(70)} at={lessAt - 6} out={balanceAt - 6} up />
        <Tag x={(leftmost + rightmost) / 2} y={base - h(70) - 44} opacity={ease(frame, lessAt - 2, 12) * (1 - ease(frame, balanceAt - 6, 10))} size={21}>
          {SALARIES.below} of {SALARIES.count} earn less than the mean
        </Tag>
        {SALARIES.values.map((v, i) => (
          <Pulse key={v} x={xs[i]} y={base - r - 1.5} at={tenOfAt + i * 2} color={DATA} r={r} />
        ))}

        <Pulse x={xOf(meanV)} y={base - h(118)} at={sevenAt} color={STAT} r={6} />
        <Pulse x={xOf(meanV)} y={base - h(118)} at={jumpSevenAt} color={STAT} r={6} />
        <Pulse x={xOf(meanV)} y={base - h(118)} at={thousandAt} color={STAT} r={6} />
        <Pulse x={xOf(meanV)} y={base - h(118)} at={roomAt - 2} color={STAT} r={6} />
        <Pulse x={xs[0]} y={base - r - 1.5} at={fortyAt} color={DATA} r={r} />
        <Pulse x={xs[SALARIES.values.length - 1]} y={base - r - 1.5} at={sixtyAt} color={DATA} r={r} />
        {[4, 5].map((i) => {
          const ring = ease(frame, medianWordAt - 4, 10) * (1 - ease(frame, ceoAt - 6, 10));
          return ring > 0 ? (
            <Svg key={i} opacity={ring}>
              <circle cx={xs[i]} cy={base - r - 1.5} r={r + 6} fill="none" stroke={INK} strokeWidth={2.2} />
            </Svg>
          ) : null;
        })}
        <Pulse x={xOf(medianV)} y={base + h(64)} at={medianMovesAt} color={INK} r={5} />
        <Pulse x={xOf(medianV)} y={base + h(64)} at={medianFiftyAt} color={INK} r={5} />
        <Pulse x={xOf(medianV)} y={base + h(64)} at={medianAsksAt} color={INK} r={5} />

        {/* The median, in ink, below the plank. */}
        {medianIn > 0 ? (
          <Svg opacity={medianIn * medianDim}>
            <line x1={xOf(medianV)} x2={xOf(medianV)} y1={base + 4} y2={base + h(64)} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          </Svg>
        ) : null}
        <Tag x={xOf(medianV)} y={base + h(72)} opacity={medianLabel * medianDim} size={23} bold>
          Median {fmt(medianV, 1)}k
        </Tag>

        {/* The mean, in red, above it. */}
        {meanIn > 0 ? (
          <Svg opacity={meanIn * Math.min(1, meanLine)}>
            <line x1={xOf(meanV)} x2={xOf(meanV)} y1={base - h(118)} y2={base - 2} stroke={STAT} strokeWidth={3.6} strokeLinecap="round" />
          </Svg>
        ) : null}
        <Tag x={xOf(meanV)} y={base - h(118) - 36} opacity={meanIn * Math.min(1, meanLine)} color={STAT_INK} size={23} bold knockout>
          Mean {fmt(meanV, 1)}k
        </Tag>

        {/* The balance point. */}
        {fulcrumIn > 0 ? (
          <Svg opacity={fulcrumIn}>
            <path d={`M${fx},${base + 3} L${fx - 26},${base + 46} L${fx + 26},${base + 46} Z`} fill={STAT} />
          </Svg>
        ) : null}
        <Tag x={fx} y={base + 56} opacity={ease(frame, slidesAt + 24, 12) * (1 - ease(frame, middleFrom, 12))} color={STAT_INK} size={21}>
          balance point
        </Tag>

        {/* The middle person: sixth of eleven. */}
        <Pulse x={xOf(sixth)} y={base - r - 1.5} at={middleAt - 2} color={INK} r={r} />
        {ease(frame, middleAt - 2, 12) > 0 ? (
          <Svg opacity={ease(frame, middleAt - 2, 12)}>
            <circle cx={xOf(sixth)} cy={base - r - 1.5} r={r + 6} fill="none" stroke={INK} strokeWidth={2.4} />
          </Svg>
        ) : null}
        <Tag x={xOf(sixth)} y={base - 74} opacity={ease(frame, middleAt + 2, 12)} size={21}>
          6th of 11
        </Tag>
        <Pulse x={CEO_X} y={base - r - 1.5} at={ceoSitsAt - 2} color={DATA} r={r} />
      </Drift>

      {/* What the two said before the CEO came in. */}
      <Ink at={almostAt - 4} dur={16} out={ceoAt - 6} style={{ left: 160, top: y(830), whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK_SOFT), ...halo }}>Almost the same: {fmt(SALARIES.mean, 1)}k and {fmt(SALARIES.median, 1)}k</span>
      </Ink>
      {/* The tail the next figure is about. */}
      <Arrow from={[FAR.x1 - 760, y(BASE) + h(124)]} to={[CEO_X - 30, y(BASE) + h(124)]} at={tailAt - 8} dur={22} color={INK_SOFT} width={2.4} />
      <Tag x={FAR.x1 - 760} y={y(BASE) + h(124) - 13} opacity={ease(frame, moneyAt - 2, 12)} color={INK_SOFT} size={21} align="right">
        a long tail&nbsp;&nbsp;
      </Tag>
    </AbsoluteFill>
  );
};
