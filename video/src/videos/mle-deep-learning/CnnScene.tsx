import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CNN } from "./data";
import { Art, BAR, Box, Drift, Fade, Flow, INK, INK_SOFT, int, Line, LOOK, Mark, OK_INK, pixelFill, Pow10, Svg } from "./parts";

const CELL = 40;
const IMG_X = 120;
const FIL_X = 506;
const FIL_CELL = 46;
const MAP_X = 720;
const PROPS_X = 1130;
const MAP_MAX = Math.max(...CNN.map.flat().map(Math.abs));

/** A feature map's cell: blue for magnitude, the sign written in it (blue
 *  against red would read as right against wrong). */
const MapGrid: React.FC<{ map: number[][]; x: number; top: number; cell: number; shown: (r: number, c: number) => number; dx?: number; opacity?: number; signs?: boolean }> = ({
  map,
  x,
  top,
  cell,
  shown,
  dx = 0,
  opacity = 1,
  signs = true,
}) => (
  <>
    <Svg opacity={opacity}>
      {map.map((row, r) =>
        row.map((v, c) => {
          const s = shown(r, c);
          return s > 0 ? <rect key={`${r}-${c}`} x={x + c * cell + dx} y={top + r * cell} width={cell - 2} height={cell - 2} rx={3} fill={pixelFill(Math.abs(v) / MAP_MAX)} opacity={s} /> : null;
        }),
      )}
    </Svg>
    {signs
      ? map.map((row, r) =>
          row.map((v, c) =>
            Math.abs(v) >= 0.75 && shown(r, c) > 0 ? (
              <div
                key={`${r}-${c}`}
                style={{
                  position: "absolute",
                  left: x + c * cell + dx,
                  top: top + r * cell,
                  width: cell - 2,
                  height: cell - 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(22, Math.abs(v) / MAP_MAX > 0.55 ? "var(--ds-white)" : INK),
                  fontWeight: 600,
                  opacity: shown(r, c) * opacity,
                }}
              >
                {v > 0 ? "+" : "−"}
              </div>
            ) : null,
          ),
        )
      : null}
  </>
);

/** An 8x8 image given as rows. */
const ImageGrid: React.FC<{ image: number[][]; x: number; top: number; cell: number; dx?: number; opacity?: number }> = ({ image, x, top, cell, dx = 0, opacity = 1 }) => (
  <Svg opacity={opacity}>
    {image.map((row, r) => row.map((v, c) => <rect key={`${r}-${c}`} x={x + c * cell + dx} y={top + r * cell} width={cell - 2} height={cell - 2} rx={3} fill={pixelFill(v)} />))}
  </Svg>
);

/**
 * Questions 10 and 11. The digit 0 as an 8x8 grid, a 3x3 window sliding
 * across it with Sobel's vertical-edge filter, and the feature map filling in
 * cell by cell (magnitude in blue, sign written in): it lights up on the 0's
 * two vertical strokes. Shift the digit two pixels right and the map shifts
 * with it; 2x2 pooling halves it. Then Question 11 counts weights: a dense
 * layer from a 224-pixel color image to a thousand units against the page's
 * first convolution, on a log axis; the page's whole listing, 5,418; and the
 * catch, 21.7 million multiply-adds in that first layer.
 */
export const CnnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q10").from;
  const qAt = n.word("q10", "Question ten");
  const textAt = n.word("q10", "How does a convolutional");
  const slidesAt = n.word("q10-a", "It slides small learned filters");
  const localAt = n.word("q10-a", "a local weighted sum");
  const thisAt = n.word("q10-a", "This three-by-three filter");
  const edgesAt = n.word("q10-a", "vertical edges");
  const patchAt = n.word("q10-props", "a small patch");
  const sharedAt = n.word("q10-props", "one shared filter");
  const anywhereAt = n.word("q10-props", "found anywhere");
  const shiftAt = n.word("q10-props", "shift the digit two pixels right");
  const withAt = n.word("q10-props", "the map shifts with it");
  const poolAt = n.word("q10-props", "Pooling then shrinks it");
  const tolerAt = n.word("q10-props", "tolerating small shifts");
  const q11At = n.word("q11", "Question eleven");
  const q11TextAt = n.word("q11", "Why are CNNs well suited");
  const countAt = n.word("q11-a", "Count weights");
  const colorAt = n.word("q11-a", "For a color image");
  const denseAt = n.word("q11-a", "a dense layer to a thousand units");
  const hundredAt = n.word("q11-a", "a hundred and fifty million");
  const convAt = n.word("q11-a", "the page's first convolution");
  const fourAt = n.word("q11-a", "four hundred and forty-eight");
  const wholeAt = n.word("q11-cost", "The page's whole network");
  const fiveAt = n.word("q11-cost", "five thousand four hundred and eighteen");
  const reusesAt = n.word("q11-cost", "reuses each weight");
  const twentyTwoAt = n.word("q11-cost", "twenty-two million multiply-adds");
  const cheapAt = n.word("q11-cost", "cheap to store");
  const biasAt = n.word("q11-bias", "That built-in assumption");
  const nearbyAt = n.word("q11-bias", "nearby pixels belong together");
  const lessAt = n.word("q11-bias", "far less data");
  const end = n.beat("q11-bias").to;
  const leaveAt = q11At - 6;

  // ── The slide: 64 positions, raster order, between "slides" and "This" ──
  const top = y(340);
  const slideFrom = slidesAt + 10;
  const slideTo = Math.max(slideFrom + 64, edgesAt);
  const pos = Math.min(63, Math.max(0, Math.floor(((frame - slideFrom) / (slideTo - slideFrom)) * 64)));
  const sliding = frame >= slideFrom - 4 && frame < slideTo + 10;
  const wr = Math.floor(pos / 8);
  const wc = pos % 8;
  const filled = (r: number, c: number) => (frame < slideFrom ? 0 : r * 8 + c <= ((frame - slideFrom) / (slideTo - slideFrom)) * 64 ? 1 : 0);

  // ── The shift ──
  const slide = ease(frame, shiftAt, 18);
  const swap = ease(frame, shiftAt + 16, 10);

  // ── Pooling: 2x2 max over the shifted map ──
  const pooled = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => {
      const vals = [CNN.shiftedMap[2 * r][2 * c], CNN.shiftedMap[2 * r][2 * c + 1], CNN.shiftedMap[2 * r + 1][2 * c], CNN.shiftedMap[2 * r + 1][2 * c + 1]];
      return Math.max(...vals);
    }),
  );
  const poolP = ease(frame, poolAt, 14);

  // ── Question 11: counts on a log axis ──
  const LOG_X = 120;
  const LOG_W = 1180;
  const logW = (v: number) => (Math.log10(v) / 9) * LOG_W;
  const layers = [
    { name: "Conv2d(3, 16, 3)", count: CNN.conv1 },
    { name: "Conv2d(16, 32, 3)", count: CNN.conv2 },
    { name: "Linear(32, 10)", count: CNN.head },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={slidesAt} level={-30} />
      <Sfx name="el-sprinkle" at={slideFrom} level={-35} />
      <Sfx name="el-tap" at={edgesAt} level={-30} />
      <Sfx name="el-whoosh" at={shiftAt} level={-35} />
      <Sfx name="el-pop" at={poolAt} level={-31} />
      <Sfx name="el-pop" at={hundredAt} level={-34} />
      <Sfx name="el-pop" at={fourAt} level={-31} />
      <Sfx name="el-tap" at={fiveAt} level={-30} />
      <Sfx name="el-tap" at={twentyTwoAt} level={-30} />
      <Sfx name="el-chime" at={lessAt + 20} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} out={leaveAt}>
          How does a convolutional neural network (CNN) work?
        </QuestionCard>
        <QuestionCard n={11} at={q11At - 2} textAt={q11TextAt - 4} size={60}>
          Why are CNNs well suited to images compared to a fully-connected net?
        </QuestionCard>

        {/* ── Question 10: a filter sliding over a digit ── */}
        <Fade at={slidesAt - 6} out={leaveAt}>
          <Line at={slidesAt - 6} x={IMG_X} y={y(296)} size={22} color={INK_SOFT}>
            A handwritten 0, <Num>8</Num> × <Num>8</Num>
          </Line>
          <ImageGrid image={CNN.image} x={IMG_X} top={top} cell={CELL} dx={slide * 2 * CELL} opacity={1 - swap} />
          <ImageGrid image={CNN.shiftedImage} x={IMG_X} top={top} cell={CELL} opacity={swap} />
          <Svg>
            {sliding ? (
              <rect x={IMG_X + (wc - 1) * CELL - 2} y={top + (wr - 1) * CELL - 2} width={3 * CELL + 2} height={3 * CELL + 2} rx={4} fill="none" stroke={LOOK} strokeWidth={4} />
            ) : null}
          </Svg>

          {/* A filter looks at one small patch at a time. */}
          <Art name="magnifier" at={slidesAt} out={leaveAt} left={210} top={y(690)} h={170} />

          <Line at={localAt - 4} x={FIL_X} y={y(296)} size={22} color={INK_SOFT}>
            Filter
          </Line>
          {CNN.kernel.map((row, r) =>
            row.map((v, c) => (
              <Box key={`${r}${c}`} x={FIL_X + c * FIL_CELL} y={top + r * FIL_CELL} w={FIL_CELL - 4} h={FIL_CELL - 4} at={localAt + (r * 3 + c)} size={22} mono radius={5} hue="yellow" hueAt={thisAt} hueOut={patchAt}>
                {v < 0 ? `−${-v}` : v}
              </Box>
            )),
          )}
          <Flow points={[[FIL_X + 3 * FIL_CELL + 8, top + 1.5 * FIL_CELL], [MAP_X - 12, top + 1.5 * FIL_CELL]]} at={localAt + 10} width={2.4} head={13} />

          <Line at={slideFrom - 4} x={MAP_X} y={y(296)} size={22} color={INK_SOFT}>
            Feature map
          </Line>
          <MapGrid map={CNN.map} x={MAP_X} top={top} cell={CELL} shown={filled} dx={slide * 2 * CELL} opacity={1 - swap} />
          <MapGrid map={CNN.shiftedMap} x={MAP_X} top={top} cell={CELL} shown={() => 1} opacity={swap} />
          {/* Pooling: the map in 2x2 blocks. */}
          <Svg opacity={poolP}>
            {[2, 4, 6].map((k) => (
              <React.Fragment key={k}>
                <line x1={MAP_X + k * CELL - 1} x2={MAP_X + k * CELL - 1} y1={top - 4} y2={top + 8 * CELL + 2} stroke={INK} strokeWidth={2.4} />
                <line y1={top + k * CELL - 1} y2={top + k * CELL - 1} x1={MAP_X - 4} x2={MAP_X + 8 * CELL + 2} stroke={INK} strokeWidth={2.4} />
              </React.Fragment>
            ))}
          </Svg>
          <Line at={edgesAt} x={MAP_X} y={top + 8 * CELL + h(22)} size={24} color={INK}>
            <Mark at={edgesAt + 2}>Strong on the vertical edges</Mark>
          </Line>

          {/* What a convolution assumes, and what it buys. */}
          {[
            { t: "Local: each output sees a 3 × 3 patch", at: patchAt },
            { t: "Shared: one filter, every position", at: sharedAt },
            { t: "So a pattern is found anywhere", at: anywhereAt },
          ].map((l, i) => (
            <Line key={l.t} at={l.at} x={PROPS_X} y={top + i * h(46)} size={24}>
              {l.t}
            </Line>
          ))}
          <Line at={withAt} x={PROPS_X} y={top + 3 * h(46) + h(20)} size={24} color={OK_INK}>
            Shift the digit <Num>2</Num> right: the map shifts too
          </Line>
          <Line at={poolAt} x={PROPS_X} y={top + 5 * h(46)} size={22} color={INK_SOFT}>
            <Num>2</Num> × <Num>2</Num> max pooling: <Num>8</Num> × <Num>8</Num> to <Num>4</Num> × <Num>4</Num>
          </Line>
          <MapGrid map={pooled} x={PROPS_X} top={top + 5 * h(46) + h(46)} cell={CELL} shown={(r, c) => ease(frame, poolAt + 6 + (r * 4 + c) * 0.8, 8)} />
          <Line at={tolerAt} x={PROPS_X + 4 * CELL + 30} y={top + 5 * h(46) + h(46) + 1.5 * CELL} size={22} color={INK_SOFT}>
            Tolerates small shifts
          </Line>
        </Fade>

        {/* ── Question 11: count the weights ── */}
        <Fade at={countAt - 4}>
          <Line at={countAt - 2} x={LOG_X} y={y(300)} size={22} color={INK_SOFT}>
            Weights to learn, first layer
            <span style={{ opacity: ease(frame, colorAt, 10) }}>
              , for a color image <Num>224</Num> × <Num>224</Num> × <Num>3</Num> = <Num>{int(CNN.imageInputs)}</Num> inputs
            </span>
          </Line>
          {[
            { name: `A dense layer to ${int(CNN.denseUnits)} units`, v: CNN.dense, at: denseAt, valAt: hundredAt, color: BAR, ink: INK, top: y(350) },
            { name: "The page's first convolution", v: CNN.conv1, at: convAt, valAt: fourAt, color: OK, ink: OK_INK, top: y(440) },
          ].map((b) => {
            const p = ease(frame, b.at, 20);
            return (
              <React.Fragment key={b.name}>
                <div style={{ position: "absolute", left: LOG_X, top: b.top, ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, b.at - 2, 10) }}>{b.name}</div>
                <div style={{ position: "absolute", left: LOG_X, top: b.top + h(36), width: logW(b.v) * p, height: h(26), background: b.color, borderRadius: 3 }} />
                <div
                  style={{
                    position: "absolute",
                    left: LOG_X + logW(b.v) * p + 14,
                    top: b.top + h(36) + h(13) - 16,
                    ...note(24, b.ink),
                    fontWeight: 600,
                    ...TABULAR,
                    whiteSpace: "nowrap",
                    opacity: ease(frame, b.valAt, 10),
                  }}
                >
                  {int(b.v)}
                </div>
              </React.Fragment>
            );
          })}
          <Svg opacity={ease(frame, denseAt, 12)}>
            <line x1={LOG_X} x2={LOG_X + LOG_W} y1={y(530)} y2={y(530)} stroke={INK} strokeWidth={1.4} />
            {[0, 3, 6, 9].map((e) => (
              <g key={e}>
                <line x1={LOG_X + (e / 9) * LOG_W} x2={LOG_X + (e / 9) * LOG_W} y1={y(530)} y2={y(530) + 7} stroke={INK} strokeWidth={1.2} />
                <text x={LOG_X + (e / 9) * LOG_W} y={y(530) + 32} textAnchor="middle" style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
                  <Pow10 e={e} />
                </text>
              </g>
            ))}
            <text x={LOG_X + LOG_W} y={y(530) + 60} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT }}>
              log scale
            </text>
          </Svg>

          {/* The page's listing, as boxes with their counts. */}
          <Line at={wholeAt - 2} x={LOG_X} y={y(610)} size={22} color={INK_SOFT}>
            {"The page's whole network"}
          </Line>
          {layers.map((l, i) => (
            <React.Fragment key={l.name}>
              <Box x={LOG_X + i * 300} y={y(650)} w={260} h={h(52)} at={wholeAt + i * 4} size={22} mono hue={i === 0 ? "yellow" : undefined} hueAt={reusesAt}>
                {l.name}
              </Box>
              <div style={{ position: "absolute", left: LOG_X + i * 300, width: 260, top: y(650) + h(60), textAlign: "center", ...note(24, INK), ...TABULAR, opacity: ease(frame, wholeAt + i * 4 + 6, 10) }}>
                {int(l.count)}
              </div>
            </React.Fragment>
          ))}
          <div style={{ position: "absolute", left: LOG_X + 3 * 300, top: y(650) + h(10), ...note(28, OK_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, fiveAt, 10) }}>
            = <span style={TABULAR}>{int(CNN.total)}</span> in all
          </div>
          <Line at={reusesAt} x={LOG_X} y={y(770)} size={26}>
            First layer: each weight used at <Num>{int(CNN.conv1Positions)}</Num> positions
          </Line>
          <Line at={twentyTwoAt} x={LOG_X} y={y(818)} size={26}>
            <Mark at={twentyTwoAt + 2}>
              <Num>21.7</Num> million multiply-adds
            </Mark>
            <span style={{ color: INK_SOFT, opacity: ease(frame, cheapAt, 10) }}>: cheap to store, not to compute</span>
          </Line>
          <Line at={biasAt} x={LOG_X} y={y(880)} size={28} color={INK}>
            Built in: <Mark at={nearbyAt}>nearby pixels belong together</Mark>
            <span style={{ opacity: ease(frame, lessAt, 10) }}>, so far less data</span>
          </Line>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
