import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DELIVERY, stack } from "./data";
import { Bracket, DATA, Drift, Kicker, Mark, Pulse, Spot, STAT, STAT_INK, Svg, Tag, counted } from "./parts";

const X: XScale = { lo: 0, hi: 60, x0: 330, x1: 1700 };
const STEADY = 470;
const ERRATIC = 600;
const AXIS = 680;
const R = 10;
/** The working, under the chart. */
const ROW_Y = 780;
const CELL = 64;
const CELL_X = 520;

/** "−2", "+1", "0": a deviation the way the working prints it. */
const signed = (v: number) => (v === 0 ? "0" : `${v < 0 ? "−" : "+"}${Math.abs(v)}`);

/**
 * Part 2 opens: two delivery services with the same average and very
 * different spread, then the standard deviation built step by step on the
 * steady one: distances from the mean, their squares, the sum, the divisor
 * and the root.
 */
export const DeliveryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const deliveryFrom = n.beat("delivery").from;
  const twoAt = n.word("delivery", "Two delivery");
  const thirtyAt = n.word("delivery", "thirty");
  const steadyAt = n.word("swing", "twenty-eight");
  const swingsAt = n.word("swing", "swings");
  const erraticAt = n.word("swing", "five minutes");
  const sameAt = n.word("same", "Same center");
  const spreadAt = n.word("same", "spread");
  const devFrom = n.beat("deviations").from;
  const distanceAt = n.word("deviations", "distance");
  const minusAt = n.word("deviations", "minus two");
  const plusAt = n.word("deviations", "plus two");
  const zeroAt = n.word("deviations", "zero");
  const squareAt = n.word("square", "square");
  const twelveAt = n.word("square", "twelve");
  const nineAt = n.word("variance", "nine");
  const varianceAt = n.word("variance", "variance");
  const rootAt = n.word("variance", "square root");
  const sdAt = n.word("variance", "standard deviation");
  const onePointAt = n.word("variance", "one point two");
  const eighteenAt = n.word("erratic", "eighteen");

  const steadyRows = stack(DELIVERY.steady);
  const erraticRows = stack(DELIVERY.erratic);
  const meanX = sx(X, DELIVERY.mean);

  const dot = (v: number, row: number, base: number, a: number, key: number, color = DATA) =>
    a > 0 ? (
      <circle key={key} cx={sx(X, v)} cy={y(base) - row * 2 * (R + 1)} r={R * a} fill={color} stroke={PAPER} strokeWidth={1.6} />
    ) : null;

  // The working: each distance arrives with its stick, then turns into its square.
  const devIn = (i: number) => ease(frame, distanceAt + 4 + i * 3, 8);
  const sq = ease(frame, squareAt - 2, 14);
  const sqIn = (i: number) => ease(frame, squareAt + i * 2, 10);
  const steadyBand = ease(frame, onePointAt - 4, 16);
  const erraticBand = ease(frame, eighteenAt - 6, 18);
  const sticksOut = ease(frame, nineAt - 6, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the deliveries, the ranges, the working, the bands ── */}
      <Sfx name="el-sprinkle" at={twoAt - 2} level={-33} />
      <Sfx name="el-pencil" at={thirtyAt - 4} level={-34} />
      <Sfx name="el-tap" at={erraticAt - 4} level={-28} />
      <Sfx name="el-pencil" at={distanceAt + 4} level={-34} />
      <Sfx name="el-pop" at={twelveAt - 2} level={-30} />
      <Sfx name="el-whoosh" at={eighteenAt - 6} level={-33} />

      <Kicker at={deliveryFrom - 10}>Spread</Kicker>

      {/* ── Headlines ── */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={deliveryFrom - 6} dur={20} out={devFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Same average.
        </Ink>
        <Ink
          at={spreadAt - 6}
          dur={18}
          out={devFrom - 6}
          style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          Different spread.
        </Ink>
      </div>
      <Ink at={devFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Square, average, root.
      </Ink>

      <Spot id="describing-data-scooter" at={twoAt - 4} left={1600} top={y(96)} width={240} height={238} />

      <FigLabel n="3" title="Ten deliveries from each service, in minutes" at={twoAt - 6} x={160} y={y(330)} />

      <Drift from={deliveryFrom} to={eighteenAt + 50} scale={0.02} origin={[960, y(AXIS)]}>
        {/* Each service's standard deviation, as a band around the mean. */}
        {steadyBand > 0 ? (
          <Svg opacity={steadyBand * 0.9}>
            <rect
              x={sx(X, DELIVERY.mean - DELIVERY.steadySd)}
              y={y(STEADY) - 80}
              width={sx(X, DELIVERY.mean + DELIVERY.steadySd) - sx(X, DELIVERY.mean - DELIVERY.steadySd)}
              height={104}
              fill={STAT}
              opacity={0.18}
            />
          </Svg>
        ) : null}
        {erraticBand > 0 ? (
          <Svg>
            <rect
              x={meanX - (meanX - sx(X, DELIVERY.mean - DELIVERY.erraticSd)) * erraticBand}
              y={y(ERRATIC) - 40}
              width={(sx(X, DELIVERY.mean + DELIVERY.erraticSd) - sx(X, DELIVERY.mean - DELIVERY.erraticSd)) * erraticBand}
              height={64}
              fill={STAT}
              opacity={0.16}
            />
          </Svg>
        ) : null}

        {(["Steady", "Erratic"] as const).map((g, i) => (
          <Ink key={g} at={twoAt - 4 + i * 6} dur={12} style={{ left: 160, top: y(i ? ERRATIC : STEADY) - 15 }}>
            <span style={label(23, INK)}>{g}</span>
          </Ink>
        ))}

        {/* The shared average. */}
        {ease(frame, thirtyAt - 4, 16) > 0 ? (
          <Svg>
            <line
              x1={meanX}
              x2={meanX}
              y1={y(AXIS)}
              y2={y(AXIS) - (y(AXIS) - y(STEADY - 80)) * ease(frame, thirtyAt - 4, 16)}
              stroke={INK}
              strokeWidth={2}
              strokeDasharray="7 6"
            />
          </Svg>
        ) : null}

        {/* The steady service's distances from the mean, and their squares. */}
        <Svg opacity={1 - sticksOut * 0.75}>
          {DELIVERY.steady.map((v, i) => {
            const a = devIn(i);
            if (a <= 0 || v === DELIVERY.mean) return null;
            const cy = y(STEADY) - steadyRows[i] * 2 * (R + 1);
            const x0 = meanX;
            const x1 = meanX + (sx(X, v) - meanX) * a;
            const side = Math.abs(sx(X, v) - meanX) * sqIn(i) * sq;
            return (
              <g key={i}>
                {side > 0 ? (
                  <rect
                    x={Math.min(meanX, sx(X, v))}
                    y={cy - side}
                    width={side}
                    height={side}
                    transform={v < DELIVERY.mean ? `translate(${Math.abs(sx(X, v) - meanX) - side} 0)` : undefined}
                    fill={STAT}
                    opacity={0.22}
                    stroke={STAT}
                    strokeWidth={1.4}
                  />
                ) : null}
                <line x1={x0} x2={x1} y1={cy} y2={cy} stroke={STAT} strokeWidth={4} strokeLinecap="round" />
              </g>
            );
          })}
        </Svg>

        <Svg>
          {DELIVERY.steady.map((v, i) => dot(v, steadyRows[i], STEADY, ease(frame, twoAt - 2 + i * 1.5, 8), i))}
          {DELIVERY.erratic.map((v, i) => dot(v, erraticRows[i], ERRATIC, ease(frame, twoAt + 8 + i * 1.5, 8), 100 + i))}
        </Svg>
        <Axis scale={X} base={y(AXIS)} ticks={[0, 10, 20, 30, 40, 50, 60]} at={twoAt - 4} />
        <Tag x={meanX} y={y(STEADY - 80) - 34} opacity={ease(frame, thirtyAt, 12)} size={21}>
          both average {fmt(DELIVERY.mean, 1)}
        </Tag>

        {/* The ranges. */}
        <Bracket x0={sx(X, DELIVERY.steadyMin)} x1={sx(X, DELIVERY.steadyMax)} y={y(STEADY) + 26} at={steadyAt - 4} out={devFrom - 6} up />
        <Tag x={sx(X, DELIVERY.steadyMax) + 16} y={y(STEADY) + 30} opacity={ease(frame, steadyAt, 12) * (1 - ease(frame, devFrom - 6, 10))} size={21} align="left">
          {DELIVERY.steadyMin} to {DELIVERY.steadyMax}
        </Tag>
        <Bracket x0={sx(X, DELIVERY.erraticMin)} x1={sx(X, DELIVERY.erraticMax)} y={y(ERRATIC) - 34} at={erraticAt - 4} out={devFrom - 6} up />
        <Tag x={sx(X, DELIVERY.erraticMax) + 16} y={y(ERRATIC) - 52} opacity={ease(frame, erraticAt, 12) * (1 - ease(frame, devFrom - 6, 10))} size={21} align="left">
          {DELIVERY.erraticMin} to {DELIVERY.erraticMax}
        </Tag>
        {DELIVERY.erratic.map((v, i) => (
          <Pulse key={i} x={sx(X, v)} y={y(ERRATIC) - erraticRows[i] * 2 * (R + 1)} at={swingsAt + i * 2} color={DATA} r={R} />
        ))}

        <Pulse x={meanX} y={y(STEADY - 80)} at={sameAt - 2} color={INK} r={6} />

        {/* The standard deviations, beside their bands. */}
        <Tag x={sx(X, DELIVERY.steadyMax) + 22} y={y(STEADY) - 14} opacity={ease(frame, onePointAt + 2, 12)} color={STAT_INK} size={22} bold align="left">
          SD {fmt(DELIVERY.steadySd, 2)} min
        </Tag>
        <Tag x={sx(X, DELIVERY.mean + DELIVERY.erraticSd)} y={y(ERRATIC) - 76} opacity={ease(frame, eighteenAt, 12)} color={STAT_INK} size={22} bold align="right">
          SD {counted(frame, eighteenAt - 6, 0, DELIVERY.erraticSd, 1, 14)} min
        </Tag>
      </Drift>

      {/* ── The working ── */}
      <Ink at={distanceAt - 2} dur={14} style={{ left: 160, top: y(ROW_Y) + 4, whiteSpace: "nowrap" }}>
        <span style={label(22, INK)}>
          <Mark at={squareAt - 4} out={nineAt - 6}>{sq < 0.5 ? "Distance" : "Squared"}</Mark>
        </span>
      </Ink>
      {DELIVERY.deviations.map((d, i) => {
        const a = devIn(i);
        if (a <= 0) return null;
        const flip = sqIn(i) * sq;
        const x = CELL_X + i * CELL;
        const isMinus = i === DELIVERY.deviations.indexOf(Math.min(...DELIVERY.deviations));
        const isPlus = i === DELIVERY.deviations.indexOf(Math.max(...DELIVERY.deviations));
        const lift = isMinus ? ease(frame, minusAt - 2, 8) * (1 - ease(frame, minusAt + 12, 10)) : isPlus ? ease(frame, plusAt - 2, 8) * (1 - ease(frame, plusAt + 12, 10)) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y(ROW_Y) - lift * 10,
              width: CELL,
              textAlign: "center",
              opacity: a,
              ...note(30, lift > 0 ? STAT_INK : INK),
              fontWeight: 600,
            }}
          >
            <span style={{ position: "absolute", left: 0, right: 0, opacity: 1 - flip }}>{signed(d)}</span>
            <span style={{ position: "absolute", left: 0, right: 0, opacity: flip, transform: `translateY(${(1 - flip) * 8}px)` }}>
              {DELIVERY.squares[i]}
            </span>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: CELL_X + DELIVERY.deviations.length * CELL + 16,
          top: y(ROW_Y),
          whiteSpace: "nowrap",
          ...note(30, STAT_INK),
          fontWeight: 700,
        }}
      >
        <span style={{ opacity: ease(frame, zeroAt - 2, 10) * (1 - sq), position: "absolute" }}>sum 0</span>
        <span style={{ opacity: ease(frame, twelveAt - 2, 10), position: "absolute" }}>sum {fmt(DELIVERY.sumSquares, 0)}</span>
      </div>

      {/* Divide, then root. */}
      <Ink at={nineAt - 4} dur={16} style={{ left: 160, top: y(ROW_Y + 80), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, INK), fontWeight: 600 }}>
          {fmt(DELIVERY.sumSquares, 0)} ÷ {DELIVERY.divisor} = {fmt(DELIVERY.variance, 2)}{" "}
          <span style={{ ...note(24, INK_SOFT) }}>
            square minutes, the <Mark at={varianceAt - 2}>variance</Mark>
          </span>
        </span>
      </Ink>
      <Ink at={rootAt - 2} dur={16} style={{ left: 1010, top: y(ROW_Y + 80), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, STAT_INK), fontWeight: 700 }}>
          √{fmt(DELIVERY.variance, 2)} = {fmt(DELIVERY.steadySd, 2)}{" "}
          <span style={{ ...note(24, INK_SOFT), fontWeight: 500 }}>
            minutes, the <Mark at={sdAt - 2}>standard deviation</Mark>
          </span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
