import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DELIVERY, stack } from "./data";
import { Bracket, DATA, Drift, Kicker, lerp, Mark, Pulse, Spot, STAT, STAT_INK, Svg, Tag } from "./parts";

/** Both services on one axis, 0 to 60 minutes. */
const FULL: XScale = { lo: 0, hi: 60, x0: 330, x1: 1700 };
/** The steady service up close, 100 px a minute, centered on the same mean. */
const ZOOM: XScale = { lo: 26, hi: 34, x0: 615, x1: 1415 };
const STEADY = 470;
const ERRATIC = 600;
const AXIS = 680;
/** Where the axis sits while the steady service is zoomed in. */
const AXIS_ZOOM = 722;
const R = 10;
/** Zoomed in, one delivery to a row, sorted: the first row's center and the step. */
const ROWS_TOP = 418;
const ROW_STEP = 24;
/** The column of distances (then squares) beside the rows. */
const COL_X = 1560;
/** The divide-and-root working, under the chart. */
const WORK_Y = 820;

/** "−2", "+1", "0": a deviation the way the working prints it. */
const signed = (v: number) => (v === 0 ? "0" : `${v < 0 ? "−" : "+"}${Math.abs(v)}`);

const mix = (a: XScale, b: XScale, t: number): XScale => ({
  lo: lerp(a.lo, b.lo, t),
  hi: lerp(a.hi, b.hi, t),
  x0: lerp(a.x0, b.x0, t),
  x1: lerp(a.x1, b.x1, t),
});

/**
 * Part 2 opens: two delivery services with the same average and very
 * different spread. Then the steady one is zoomed in, a delivery to a row, so
 * the working can be seen: each distance from the mean drawn and written
 * beside its row, squared, summed, divided by nine and rooted. Each service's
 * standard deviation is a bracket from the mean, one SD long.
 */
export const DeliveryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const deliveryFrom = n.beat("delivery").from;
  const twoAt = n.word("delivery", "Two delivery");
  const thirtyAt = n.word("delivery", "thirty");
  const steadyAt = n.word("swing", "twenty-eight");
  const alwaysAt = n.word("swing", "always");
  const differentAt = n.word("same", "different");
  const steadyServiceAt = n.word("deviations", "steady");
  const countAt = n.word("variance", "count");
  const erraticFrom = n.beat("erratic").from;
  const erraticWordAt = n.word("erratic", "erratic");
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
  const rootAt = n.word("root", "square root");
  const sdAt = n.word("root", "standard deviation");
  const onePointAt = n.word("root", "one point two");
  const eighteenAt = n.word("erratic", "eighteen");

  // ── The zoom: in for the working, out again for the erratic service ──
  const zoom = ease(frame, devFrom - 4, 30) * (1 - ease(frame, erraticFrom - 6, 30));
  const X = mix(FULL, ZOOM, zoom);
  const base = lerp(y(AXIS), y(AXIS_ZOOM), zoom);
  const meanX = sx(X, DELIVERY.mean);

  const steadyRows = stack(DELIVERY.steady);
  const erraticRows = stack(DELIVERY.erratic);
  /** The steady deliveries in order, shortest first: row k of the zoomed view. */
  const order = DELIVERY.steady.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, i]) => i);
  const rank = DELIVERY.steady.map((_, i) => order.indexOf(i));
  const rowY = (k: number) => y(ROWS_TOP) + k * h(ROW_STEP);
  const steadyPos = (i: number) =>
    [sx(X, DELIVERY.steady[i]), lerp(y(STEADY) - steadyRows[i] * 2 * (R + 1), rowY(rank[i]), zoom)] as const;
  const erraticPos = (i: number) => [sx(X, DELIVERY.erratic[i]), y(ERRATIC) - erraticRows[i] * 2 * (R + 1)] as const;

  // The working: each distance arrives with its stick, then turns into its square.
  const devIn = (k: number) => ease(frame, distanceAt + 4 + k * 3, 8);
  const sq = ease(frame, squareAt - 2, 14);
  const sqIn = (k: number) => ease(frame, squareAt + k * 2, 10);
  const sticksDim = ease(frame, nineAt - 6, 14) * 0.45;
  const column = 1 - ease(frame, erraticFrom - 6, 16);

  // Each standard deviation, a bracket one SD long from the mean.
  const steadySdIn = ease(frame, onePointAt - 4, 16);
  const steadyBracketY = lerp(y(STEADY) + R + h(14), rowY(9) + R + h(14), zoom);
  const steadyEnd = sx(X, DELIVERY.mean + DELIVERY.steadySd);
  const erraticGrow = ease(frame, eighteenAt - 6, 18);
  const erraticBracketY = y(ERRATIC) + R + h(14);
  const erraticEnd = sx(X, DELIVERY.mean + DELIVERY.erraticSd);

  const dot = (x: number, cy: number, a: number, key: number, opacity = 1) =>
    a > 0 && opacity > 0 ? <circle key={key} cx={x} cy={cy} r={R * a} fill={DATA} stroke={PAPER} strokeWidth={1.6} opacity={opacity} /> : null;

  return (
    <AbsoluteFill>
      {/* ── Sound: the deliveries, the ranges, the zoom, the working, the brackets ── */}
      <Sfx name="el-sprinkle" at={twoAt - 2} level={-33} />
      <Sfx name="el-pencil" at={thirtyAt - 4} level={-34} />
      <Sfx name="el-tap" at={erraticAt - 4} level={-28} />
      <Sfx name="el-whoosh" at={devFrom - 4} level={-36} />
      <Sfx name="el-pencil" at={distanceAt + 4} level={-34} />
      <Sfx name="el-pop" at={twelveAt - 2} level={-30} />
      <Sfx name="el-whoosh" at={erraticFrom - 6} level={-36} />
      <Sfx name="el-pencil" at={eighteenAt - 6} level={-33} />

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
        Square, sum, divide, root.
      </Ink>

      <Spot id="describing-data-scooter" at={twoAt - 4} left={1600} top={y(96)} width={240} height={238} />

      <FigLabel n="3" title="Ten deliveries from each service, in minutes" at={twoAt - 6} x={160} y={y(330)} />

      <Drift from={deliveryFrom} to={eighteenAt + 50} scale={0.02} origin={[960, y(AXIS)]}>
        <Ink at={twoAt - 4} dur={12} style={{ left: 160, top: y(STEADY) - 15 }}>
          <span style={label(23, INK)}>Steady</span>
        </Ink>
        <Ink at={twoAt + 2} dur={12} style={{ left: 160, top: y(ERRATIC) - 15, opacity: 1 - zoom }}>
          <span style={label(23, INK)}>Erratic</span>
        </Ink>

        {/* The shared average. */}
        {ease(frame, thirtyAt - 4, 16) > 0 ? (
          <Svg>
            <line
              x1={meanX}
              x2={meanX}
              y1={base}
              y2={base - (base - (y(330) + 84)) * ease(frame, thirtyAt - 4, 16)}
              stroke={INK}
              strokeWidth={2}
              strokeDasharray="7 6"
            />
          </Svg>
        ) : null}

        <Svg>
          {DELIVERY.steady.map((_, i) => {
            const [x, cy] = steadyPos(i);
            return dot(x, cy, ease(frame, twoAt - 2 + i * 1.5, 8), i);
          })}
          {DELIVERY.erratic.map((_, i) => {
            const [x, cy] = erraticPos(i);
            return dot(x, cy, ease(frame, twoAt + 8 + i * 1.5, 8), 100 + i, 1 - zoom);
          })}
        </Svg>

        {/* Zoomed in: each steady delivery's distance from the mean, drawn
            over the dots so every stick can be seen. */}
        <Svg opacity={zoom * (1 - sticksDim)}>
          {DELIVERY.steady.map((v, i) => {
            const a = devIn(rank[i]);
            if (a <= 0 || v === DELIVERY.mean) return null;
            const [x, cy] = steadyPos(i);
            const end = x + (v < DELIVERY.mean ? R : -R);
            return (
              <line key={i} x1={meanX} x2={meanX + (end - meanX) * a} y1={cy} y2={cy} stroke={STAT} strokeWidth={4} strokeLinecap="round" />
            );
          })}
        </Svg>

        <Axis scale={X} base={base} ticks={[0, 10, 20, 30, 40, 50, 60]} at={twoAt - 4} opacity={1 - zoom} />
        <Axis scale={X} base={base} ticks={[26, 28, 30, 32, 34]} at={twoAt - 4} opacity={zoom} />
        <Tag x={meanX} y={y(330) + 50} opacity={ease(frame, thirtyAt, 12)} size={21}>
          both average {fmt(DELIVERY.mean, 1)}
        </Tag>

        {/* The ranges. */}
        <Bracket x0={sx(FULL, DELIVERY.steadyMin)} x1={sx(FULL, DELIVERY.steadyMax)} y={y(STEADY) + 26} at={steadyAt - 4} out={devFrom - 6} up />
        <Tag x={sx(FULL, DELIVERY.steadyMax) + 16} y={y(STEADY) + 30} opacity={ease(frame, steadyAt, 12) * (1 - ease(frame, devFrom - 6, 10))} size={21} align="left">
          {DELIVERY.steadyMin} to {DELIVERY.steadyMax}
        </Tag>
        <Bracket x0={sx(FULL, DELIVERY.erraticMin)} x1={sx(FULL, DELIVERY.erraticMax)} y={y(ERRATIC) - 34} at={erraticAt - 4} out={devFrom - 6} up />
        <Tag x={sx(FULL, DELIVERY.erraticMax) + 16} y={y(ERRATIC) - 52} opacity={ease(frame, erraticAt, 12) * (1 - ease(frame, devFrom - 6, 10))} size={21} align="left">
          {DELIVERY.erraticMin} to {DELIVERY.erraticMax}
        </Tag>
        {DELIVERY.steady.map((_, i) => {
          const [x, cy] = steadyPos(i);
          return (
            <React.Fragment key={`s${i}`}>
              <Pulse x={x} y={cy} at={alwaysAt + i} color={DATA} r={R} />
              <Pulse x={x} y={cy} at={steadyServiceAt + rank[i] * 2} color={STAT} r={R} />
            </React.Fragment>
          );
        })}
        {[DELIVERY.erraticMin, DELIVERY.erraticMax].map((v) => (
          <Pulse key={`e${v}`} x={sx(X, v)} y={y(ERRATIC)} at={differentAt} color={DATA} r={R} />
        ))}
        {DELIVERY.erratic.map((_, i) => {
          const [x, cy] = erraticPos(i);
          return (
            <React.Fragment key={`w${i}`}>
              <Pulse x={x} y={cy} at={erraticWordAt + 8 + i} color={STAT} r={R} />
              <Pulse x={x} y={cy} at={swingsAt + i * 2} color={DATA} r={R} />
            </React.Fragment>
          );
        })}

        <Pulse x={meanX} y={y(330) + 84} at={sameAt - 2} color={INK} r={6} />

        {/* The standard deviations: one SD out from the mean. */}
        <Bracket x0={meanX} x1={steadyEnd} y={steadyBracketY} at={onePointAt - 4} color={STAT} up />
        {/* Zoomed, the label sits under its bracket; zoomed out, beside the stack. */}
        <Tag
          x={lerp(sx(FULL, DELIVERY.steadyMax) + R + 14, meanX + 8, zoom)}
          y={lerp(y(STEADY) - 14, steadyBracketY + 8, zoom)}
          opacity={steadySdIn}
          color={STAT_INK}
          size={22}
          bold
          align="left"
        >
          SD <span style={TABULAR}>{fmt(DELIVERY.steadySd, 1)}</span> min
        </Tag>
        {erraticGrow > 0 ? (
          <Svg>
            <path
              d={`M${meanX},${erraticBracketY - 12} L${meanX},${erraticBracketY} L${meanX + (erraticEnd - meanX) * erraticGrow},${erraticBracketY} L${meanX + (erraticEnd - meanX) * erraticGrow},${erraticBracketY - 12}`}
              fill="none"
              stroke={STAT}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
        <Tag x={(meanX + erraticEnd) / 2} y={erraticBracketY + 8} opacity={ease(frame, eighteenAt + 10, 10)} color={STAT_INK} size={22} bold>
          SD <span style={TABULAR}>{fmt(DELIVERY.erraticSd, 1)}</span> min
        </Tag>
      </Drift>

      {/* ── The working, beside the zoomed rows: distances, then squares ── */}
      <div style={{ position: "absolute", inset: 0, opacity: column }}>
        <Ink at={distanceAt - 2} dur={14} style={{ left: COL_X - 60, top: rowY(0) - h(ROW_STEP) - 26, width: 120, textAlign: "center", whiteSpace: "nowrap" }}>
          <span style={label(22, INK)}>
            <Mark at={squareAt - 4} out={nineAt - 6}>{sq < 0.5 ? "Distance" : "Squared"}</Mark>
          </span>
        </Ink>
        {order.map((i, k) => {
          const a = devIn(k);
          if (a <= 0) return null;
          const d = DELIVERY.deviations[i];
          const flip = sqIn(k) * sq;
          const lift =
            k === 0
              ? ease(frame, minusAt - 2, 8) * (1 - ease(frame, minusAt + 12, 10))
              : k === order.length - 1
                ? ease(frame, plusAt - 2, 8) * (1 - ease(frame, plusAt + 12, 10))
                : 0;
          const side = Math.abs(d) * 11 * flip;
          return (
            <React.Fragment key={i}>
              {side > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: COL_X - 34 - side,
                    top: rowY(k) - side / 2,
                    width: side,
                    height: side,
                    background: `color-mix(in srgb, ${STAT} 35%, transparent)`,
                    border: `1.5px solid ${STAT}`,
                    boxSizing: "border-box",
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: COL_X - 30,
                  top: rowY(k) - 16 - lift * 4,
                  width: 60,
                  textAlign: "center",
                  opacity: a,
                  ...note(26, lift > 0 ? STAT_INK : INK),
                  ...TABULAR,
                  fontWeight: 600,
                }}
              >
                <span style={{ position: "absolute", left: 0, right: 0, opacity: 1 - flip }}>{signed(d)}</span>
                <span style={{ position: "absolute", left: 0, right: 0, opacity: flip, transform: `translateY(${(1 - flip) * 8}px)` }}>
                  {DELIVERY.squares[i]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: COL_X - 50,
            top: rowY(9) + h(22),
            width: 100,
            height: 1.5,
            background: HAIRLINE,
            opacity: ease(frame, zeroAt - 4, 10),
          }}
        />
        <div style={{ position: "absolute", left: COL_X - 60, top: rowY(9) + h(30), width: 120, textAlign: "center", whiteSpace: "nowrap", ...note(28, STAT_INK), fontWeight: 700 }}>
          <span style={{ opacity: ease(frame, zeroAt - 2, 10) * (1 - sq), position: "absolute", left: 0, right: 0 }}>sum 0</span>
          <span style={{ opacity: ease(frame, twelveAt - 2, 10), position: "absolute", left: 0, right: 0 }}>sum {fmt(DELIVERY.sumSquares, 0)}</span>
        </div>
      </div>

      {/* Divide, then root. */}
      <Ink at={countAt - 4} dur={14} style={{ left: 160, top: y(WORK_Y) + 44, whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT) }}>
          {DELIVERY.steady.length} deliveries, minus one
        </span>
      </Ink>
      <Ink at={nineAt - 4} dur={16} style={{ left: 160, top: y(WORK_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, INK), fontWeight: 600 }}>
          {fmt(DELIVERY.sumSquares, 0)} ÷ {DELIVERY.divisor} = {fmt(DELIVERY.variance, 2)}{" "}
          <span style={{ ...note(24, INK_SOFT) }}>
            square minutes, the <Mark at={varianceAt - 2}>variance</Mark>
          </span>
        </span>
      </Ink>
      <Ink at={rootAt - 2} dur={16} style={{ left: 1010, top: y(WORK_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, STAT_INK), fontWeight: 700 }}>
          √{fmt(DELIVERY.variance, 2)} ≈ {fmt(DELIVERY.steadySd, 1)}{" "}
          <span style={{ ...note(24, INK_SOFT), fontWeight: 500 }}>
            minutes, the <Mark at={sdAt - 2}>standard deviation</Mark>
          </span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
