import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, body, halo, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { IDS, ORDER, SPACE, spaceWord, thousands } from "./data";
import {
  clamp01,
  DATA,
  DATA_SOFT,
  DATA_TINT,
  Drift,
  Fade,
  FAINT,
  FIG_Y,
  Headline,
  Kicker,
  lerp,
  LINE,
  Mark,
  POINT,
  POINT_INK,
  pulse,
  Spot,
  Svg,
  Tag,
  TokenChip,
  VectorCells,
  X0,
} from "./parts";

// ═══ Scene 1: an id is a label, so it is swapped for a vector ═══════════════

const LINE_X1 = 1800;
/** Where an id sits on the vocabulary's number line. */
const idX = (id: number) => X0 + (id / IDS.vocab) * (LINE_X1 - X0);
/** The zoomed stretch of ids around berry. */
const ZOOM = { lo: 19766, hi: 19778, x0: X0, x1: 1000 };
const zoomX = (id: number) => ZOOM.x0 + ((id - ZOOM.lo) / (ZOOM.hi - ZOOM.lo)) * (ZOOM.x1 - ZOOM.x0);
const TICKS = [0, 50_000, 100_000, 150_000, 200_000];

/** A token pinned above a line: its chip, its id, and a leader to its dot. */
const Pin: React.FC<{ x: number; base: number; text: string; id: number; at: number; glow?: number; tone?: string }> = ({
  x,
  base,
  text,
  id,
  at,
  glow = 0,
  tone = INK,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: base - 128,
          transform: `translate(-50%, ${(1 - p) * 14}px) scale(${1 + 0.06 * glow})`,
          opacity: p,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <TokenChip text={text} size={28} border={glow > 0.05 ? POINT : INK} />
        <span style={{ ...note(24, tone), fontWeight: 650, ...TABULAR }}>{id}</span>
      </div>
      <Svg opacity={p}>
        <line x1={x} x2={x} y1={base - 34} y2={base - 6} stroke={INK_SOFT} strokeWidth={1.6} />
        <circle cx={x} cy={base} r={7} fill={DATA} />
      </Svg>
    </>
  );
};

/** A bracket under (or over) a stretch of a line, with its label. */
const Span: React.FC<{ x0: number; x1: number; y: number; at: number; up?: boolean; children: React.ReactNode }> = ({
  x0,
  x1,
  y,
  at,
  up = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const s = up ? -1 : 1;
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * p;
  return (
    <>
      <Svg>
        <path
          d={`M${mid - half},${y - s * 10} L${mid - half},${y} L${mid + half},${y} L${mid + half},${y - s * 10}`}
          fill="none"
          stroke={POINT}
          strokeWidth={2.4}
        />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: mid,
          top: up ? y - 44 : y + 10,
          transform: "translateX(-50%)",
          opacity: ease(frame, at + 8, 12),
          ...note(24, POINT_INK),
          fontWeight: 650,
          whiteSpace: "nowrap",
          ...TABULAR,
        }}
      >
        {children}
      </div>
    </>
  );
};

const CELLS = 26;
const CELL_W = 36;
const CELLS_X = 560;

/** A row of an embedding table: the id, its token, and a strip of cells that
 *  fills from the left on `fillAt`. The cells carry no numbers: no real
 *  model's table is on screen. */
const TableRow: React.FC<{ top: number; id: number; text: string; at: number; fillAt: number; strong?: boolean; dim?: number }> = ({
  top,
  id,
  text,
  at,
  fillAt,
  strong = false,
  dim,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: X0, top, opacity: p * (1 - d), display: "flex", alignItems: "center" }}>
      <span style={{ ...note(26, INK), fontWeight: 650, width: 130, ...TABULAR }}>{id}</span>
      <span style={{ width: CELLS_X - X0 - 130 }}>
        <TokenChip text={text} size={26} border={strong ? DATA : INK} />
      </span>
      <span style={{ display: "flex" }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const f = ease(frame, fillAt + i * 0.9, 8);
          return (
            <span
              key={i}
              style={{
                width: CELL_W - 4,
                height: 42,
                marginRight: 4,
                borderRadius: 4,
                border: `1.5px solid ${strong ? DATA : DATA_SOFT}`,
                background: f > 0 ? `color-mix(in srgb, ${DATA} ${Math.round(f * (strong ? 34 : 18))}%, ${PAPER})` : PAPER,
              }}
            />
          );
        })}
      </span>
      <span style={{ ...note(28, INK_SOFT), marginLeft: 10, opacity: ease(frame, fillAt + CELLS, 10) }}>…</span>
    </div>
  );
};

const VDots: React.FC<{ top: number; at: number }> = ({ top, at }) => (
  <Fade at={at} style={{ left: X0 + 40, top, ...note(30, FAINT), lineHeight: 1 }}>
    ⋮
  </Fade>
);

export const IdsScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const hookFrom = n.beat("hook").from;
  const berryAt = n.word("hook", "berry");
  const nineteenAt = n.word("hook", "nineteen");
  const teethAt = n.word("teeth", "teeth");
  const downAt = n.word("teeth", "down");
  const cherryAt = n.word("teeth", "cherry");
  const sixtyAt = n.word("teeth", "sixty");
  const numbersAt = n.word("label", "numbers");
  const likeTeethAt = n.word("label", "teeth");
  const nonsenseAt = n.word("label", "nonsense");
  const labelAt = n.word("label", "labels");
  const firstAt = n.word("vector", "first");
  const swapAt = n.word("vector", "swap");
  const vectorAt = n.word("vector", "vector");
  const fewAt = n.word("vector", "few");
  const embeddingAt = n.word("embedding", "embedding");
  const tableAt = n.word("embedding", "table");
  const learnedAt = n.word("embedding", "learned");
  const end = n.beat("geometry").from;

  const LY = y(522);
  const ZY = y(790);
  const bx = idX(IDS.berry);
  const cx = idX(IDS.cherry);
  const fig1Out = firstAt;
  const zoomP = ease(frame, downAt - 4, 16);

  // Fig. 2's rows, in page coordinates.
  const rowA = y(430);
  const rowB = y(590);
  const rowC = y(750);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={hookFrom + 4} level={-31} />
      <Sfx name="el-tap" at={nineteenAt} level={-24} />
      <Sfx name="el-pencil" at={downAt - 4} level={-35} />
      <Sfx name="el-tap" at={teethAt} level={-25} />
      <Sfx name="el-tap" at={sixtyAt} level={-25} />
      <Sfx name="el-pencil" at={numbersAt} level={-34} />
      <Sfx name="el-whoosh" at={firstAt} level={-34} />
      <Sfx name="el-tap" at={swapAt + 2} level={-25} />
      <Sfx name="el-pencil" at={fewAt - 2} level={-35} />
      <Sfx name="el-pencil" at={tableAt} level={-35} />

      <Kicker at={hookFrom - 10}>Embeddings</Kicker>
      <Headline lead="Every token is a number." turn="The number means nothing." at={hookFrom} turnAt={nonsenseAt - 2} out={firstAt - 6} />
      <Headline lead="So swap each id" turn="for a vector." at={swapAt - 4} turnAt={vectorAt - 2} />

      {/* ── Fig. 1: three ids on the vocabulary's number line ── */}
      <Fade at={hookFrom - 4} out={fig1Out} dur={8} dy={0} style={{ inset: 0 }}>
        <FigLabel n="1" title={`Three token ids, in ${IDS.encoding}`} at={hookFrom} x={X0} y={y(FIG_Y)} />
        <Svg>
          <line x1={X0} x2={X0 + (LINE_X1 - X0) * ease(frame, hookFrom, 20)} y1={LY} y2={LY} stroke={INK} strokeWidth={2} />
          {TICKS.map((t, i) => (
            <g key={t} opacity={ease(frame, hookFrom + 6 + i * 3, 10)}>
              <line x1={idX(t)} x2={idX(t)} y1={LY} y2={LY + 8} stroke={INK} strokeWidth={1.4} />
              <text x={idX(t)} y={LY + 34} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT }}>
                {thousands(t)}
              </text>
            </g>
          ))}
        </Svg>
        <Pin x={bx} base={LY} text="berry" id={IDS.berry} at={berryAt - 4} glow={pulse(frame, likeTeethAt - 14, 30)} />
        <Pin x={cx} base={LY} text=" cherry" id={IDS.cherry} at={cherryAt - 2} />
        <Span x0={bx} x1={cx} y={LY - 150} at={numbersAt + 2} up>
          {thousands(IDS.cherry - IDS.berry)} apart
        </Span>

        {/* The zoom: the stretch of ids around berry, drawn out wide. */}
        <Svg opacity={zoomP}>
          <path
            d={`M${bx - 4},${LY + 6} L${ZOOM.x0},${ZY - 140} M${bx + 4},${LY + 6} L${ZOOM.x1},${ZY - 140}`}
            stroke={FAINT}
            strokeWidth={1.4}
            strokeDasharray="5 6"
            fill="none"
          />
          <rect x={bx - 5} y={LY - 7} width={10} height={14} fill="none" stroke={INK_SOFT} strokeWidth={1.4} />
          <line x1={ZOOM.x0} x2={ZOOM.x0 + (ZOOM.x1 - ZOOM.x0) * zoomP} y1={ZY} y2={ZY} stroke={INK} strokeWidth={2} />
          {Array.from({ length: ZOOM.hi - ZOOM.lo + 1 }, (_, k) => (
            <line key={k} x1={zoomX(ZOOM.lo + k)} x2={zoomX(ZOOM.lo + k)} y1={ZY} y2={ZY + 9} stroke={INK} strokeWidth={1.2} />
          ))}
        </Svg>
        <Pin x={zoomX(IDS.teeth)} base={ZY} text=" teeth" id={IDS.teeth} at={teethAt - 4} glow={pulse(frame, likeTeethAt, 30)} />
        {zoomP > 0 ? <Pin x={zoomX(IDS.berry)} base={ZY} text="berry" id={IDS.berry} at={downAt + 4} /> : null}
        <Span x0={zoomX(IDS.teeth)} x1={zoomX(IDS.berry)} y={ZY + 22} at={numbersAt + 10}>
          {IDS.berry - IDS.teeth} apart
        </Span>
        <Note at={labelAt - 2} x={1040} y={ZY - 60}>
          <div style={{ ...body(34), color: INK, whiteSpace: "nowrap" }}>Ids are just labels.</div>
        </Note>
      </Fade>
      <Spot id="llm-meaning-fruit" at={hookFrom + 6} out={fig1Out} left={1380} top={y(580)} width={400} height={267} />

      {/* ── Fig. 2: the embedding table, one row per id ── */}
      <Drift from={swapAt} to={end} amount={0.014} origin="30% 60%">
        <FigLabel n="2" title="An embedding table, one row per token id" at={swapAt} x={X0} y={y(FIG_Y)} />
        <Fade at={tableAt} style={{ left: X0, top: y(360) }}>
          <div style={{ display: "flex", ...label(21, INK_SOFT) }}>
            <span style={{ width: 130 }}>Id</span>
            <span style={{ width: CELLS_X - X0 - 130 }}>Token</span>
            <span>Embedding</span>
          </div>
        </Fade>
        <TableRow top={rowA} id={IDS.teeth} text=" teeth" at={tableAt + 4} fillAt={tableAt + 8} />
        <VDots top={rowA + 66} at={tableAt + 8} />
        <TableRow top={rowB} id={IDS.berry} text="berry" at={swapAt + 2} fillAt={vectorAt} strong />
        <VDots top={rowB + 66} at={tableAt + 12} />
        <TableRow top={rowC} id={IDS.cherry} text=" cherry" at={tableAt + 10} fillAt={tableAt + 14} />
        <Fade at={fewAt} style={{ left: CELLS_X, top: rowB - 22, width: CELLS * CELL_W - 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, height: 10, borderTop: `2px solid ${DATA}`, borderLeft: `2px solid ${DATA}`, borderRight: `2px solid ${DATA}` }} />
          </div>
        </Fade>
        <Note at={fewAt + 4} x={CELLS_X + CELLS * CELL_W + 50} y={rowB + 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={fewAt + 6}>a few thousand numbers</Mark>
          </span>
        </Note>
        <Note at={embeddingAt - 2} x={CELLS_X} y={rowB - 62}>
          <span style={{ ...label(22, BLUE_INK) }}>Berry&apos;s embedding</span>
        </Note>
        <Note at={learnedAt - 2} x={CELLS_X + CELLS * CELL_W + 50} y={y(360)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Learned in training</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};


// ═══ Scene 2: the lesson's tiny space, as a table and as points ════════════

const COLS = { word: X0, a: 330, s: 470, d: 610, dist: 790 };
const ROW_H = 66;
const VEC_X = [COLS.a, COLS.s, COLS.d];

type V3 = readonly [number, number, number];
/** The cube's projection: yaw about the vertical (size) axis, a fixed
 *  elevation, centred on (cx, cy). */
const project = (p: V3, yaw: number, cx: number, cy: number, side: number) => {
  const [a, s, d] = [p[0] - 0.5, p[1] - 0.5, p[2] - 0.5];
  const el = 0.42;
  const X = a * Math.cos(yaw) - d * Math.sin(yaw);
  const Z = a * Math.sin(yaw) + d * Math.cos(yaw);
  return [cx + X * side, cy - s * side * Math.cos(el) - Z * side * Math.sin(el)] as const;
};
const CUBE: [V3, V3][] = [];
for (const a of [0, 1] as const)
  for (const b of [0, 1] as const) {
    CUBE.push([[0, a, b], [1, a, b]], [[a, 0, b], [a, 1, b]], [[a, b, 0], [a, b, 1]]);
  }

export const SpaceScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("geometry").from;
  const geometryAt = n.word("geometry", "geometry");
  const closeAt = n.word("geometry", "close");
  const farAt = n.word("geometry", "far");
  const tinyAt = n.word("toy", "tiny");
  const threeAt = n.word("toy", "three");
  const measureAt = n.word("nearest", "Measure");
  const kittenAt = n.word("nearest", "Kitten's");
  const dogAt = n.word("nearest", "dog");
  const wolfAt = n.word("nearest", "Wolf's");
  const truckAt = n.word("nearest", "truck's");
  const nobodyAt = n.word("learned", "Nobody");
  const pushesAt = n.word("learned", "pushes");
  const catSatAt = n.word("generalize", "cat");
  const dogSatAt = n.word("generalize", "dog");
  const halfAt = n.word("generalize", "half");
  const catchAt = n.word("axes", "catch");
  const namedAt = n.word("axes", "named");
  const realAt = n.word("axes", "Real");
  const noNamesAt = n.word("axes", "no");
  const dimensionAt = n.word("nameless", "Dimension");
  const pointAt = n.word("nameless", "point");
  const arrangementAt = n.word("nameless", "arrangement");
  const distAt: Record<string, number> = { cat: measureAt, kitten: kittenAt, dog: dogAt, wolf: wolfAt, truck: truckAt };
  const rowAt = (i: number) => tinyAt + i * 5;
  const top0 = y(420);
  const rowTop = (i: number) => top0 + i * ROW_H;

  // The cube: it turns slowly all scene long, so the space is never still.
  const yaw = -2.1 + 0.28 * Math.sin(((frame - from) / 30) * 0.3);
  const CX = 1420;
  const CY = y(644);
  const SIDE = 380;
  const P = (v: V3) => project(v, yaw, CX, CY, SIDE);
  const cubeP = ease(frame, geometryAt - 4, 20);
  const unnamed = ease(frame, noNamesAt, 16);
  const cat = spaceWord("cat").vec as unknown as V3;

  const notesOut = catchAt - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={geometryAt - 4} level={-35} />
      {SPACE.words.map((w, i) => (
        <Sfx key={w.word} name="el-tap" at={rowAt(i)} level={-28} />
      ))}
      {SPACE.nearest.map((w) => (
        <Sfx key={w} name="el-tap" at={distAt[w]} level={-25} />
      ))}
      <Sfx name="el-whoosh" at={pushesAt} level={-35} />
      <Sfx name="el-scratch" at={noNamesAt} level={-33} />
      <Sfx name="el-pop" at={dimensionAt} level={-31} />

      <Kicker at={from - 10}>Embeddings</Kicker>
      <Headline lead="Nearby means related." turn="Nobody wrote it down." at={from} turnAt={nobodyAt - 2} out={catchAt - 8} />
      <Headline lead="Real dimensions" turn="have no names." at={realAt - 4} turnAt={noNamesAt} />

      {/* ── Fig. 3: the lesson's table ── */}
      <FigLabel n="3" title="The lesson's tiny embedding space" at={tinyAt - 6} x={X0} y={y(FIG_Y)} />
      <Fade at={tinyAt - 2} style={{ left: 0, top: y(366), width: 1000 }}>
        <div style={{ position: "relative", height: 30, ...label(21, INK_SOFT) }}>
          {SPACE.axes.map((ax, i) => (
            <span key={ax} style={{ position: "absolute", left: VEC_X[i] - 12, opacity: 1 - unnamed * 0.75 }}>
              <Mark at={namedAt + i * 4} out={noNamesAt}>
                {ax}
              </Mark>
            </span>
          ))}
          <span style={{ position: "absolute", left: COLS.dist, opacity: ease(frame, measureAt - 4, 12) }}>Distance from cat</span>
        </div>
      </Fade>
      <Svg opacity={ease(frame, tinyAt, 14)}>
        <line x1={X0} x2={1000} y1={top0 - 10} y2={top0 - 10} stroke={INK} strokeWidth={1.6} />
      </Svg>
      {SPACE.words.map((w, i) => {
        const at = rowAt(i);
        const p = ease(frame, at, 12);
        if (p <= 0) return null;
        const dAt = distAt[w.word];
        const near = SPACE.nearest.indexOf(w.word);
        const glow = w.word === "cat" ? pulse(frame, catSatAt, 30) : w.word === "dog" ? pulse(frame, dogSatAt, 30) : 0;
        return (
          <div key={w.word} style={{ position: "absolute", left: 0, top: rowTop(i), width: 1000, height: ROW_H, opacity: p }}>
            <div style={{ position: "absolute", left: X0, top: 8 }}>
              <TokenChip text={w.word} size={24} border={glow > 0.05 ? POINT : w.word === "cat" ? DATA : INK} />
            </div>
            {w.vec.map((v, j) => (
              <span key={j} style={{ position: "absolute", left: VEC_X[j], top: 14, fontFamily: MONO, fontWeight: 600, fontSize: 26, color: INK }}>
                {v.toFixed(1)}
              </span>
            ))}
            <span
              style={{
                position: "absolute",
                left: COLS.dist,
                top: 14,
                opacity: ease(frame, dAt - 2, 10),
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 26,
                color: w.word === "cat" ? INK_SOFT : near === 0 ? POINT_INK : INK,
                ...TABULAR,
              }}
            >
              {w.dist.toFixed(3)}
            </span>
            {near >= 0 ? (
              <span style={{ position: "absolute", left: COLS.dist + 110, top: 17, opacity: ease(frame, dAt + 4, 10) }}>
                <Tag size={20}>{["nearest", "next", "further", "furthest"][near]}</Tag>
              </span>
            ) : null}
          </div>
        );
      })}
      <Svg opacity={ease(frame, rowAt(4) + 4, 12)}>
        <line x1={X0} x2={1000} y1={rowTop(5) + 4} y2={rowTop(5) + 4} stroke={LINE} strokeWidth={1.4} />
      </Svg>

      {/* Under the table: the sentence that generalizes, then dimension 1,847. */}
      <Fade at={catSatAt - 6} out={notesOut} style={{ left: X0, top: y(800) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, ...body(32), color: INK, whiteSpace: "nowrap" }}>
          <span>
            the <Mark at={catSatAt}>cat</Mark> sat on the mat
          </span>
          <Tag size={21}>seen in training</Tag>
        </div>
      </Fade>
      <Fade at={dogSatAt - 4} out={notesOut} style={{ left: X0, top: y(860) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, ...body(32), color: INK, whiteSpace: "nowrap" }}>
          <span>
            the <Mark at={dogSatAt}>dog</Mark> sat on the mat
          </span>
          <span style={{ opacity: ease(frame, halfAt - 2, 10) }}>
            <Tag size={21} color={POINT_INK}>
              half handled already
            </Tag>
          </span>
        </div>
      </Fade>
      <Fade at={dimensionAt - 4} style={{ left: X0, top: y(800) }}>
        <div style={{ ...label(21, INK_SOFT), marginBottom: 12 }}>A real model&apos;s vector</div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {Array.from({ length: 22 }, (_, i) => {
            const hot = i === 13;
            return (
              <span
                key={i}
                style={{
                  width: 32,
                  height: 36,
                  marginRight: 4,
                  borderRadius: 4,
                  border: `1.5px solid ${hot ? POINT : DATA_SOFT}`,
                  background: hot ? `color-mix(in srgb, ${POINT} ${Math.round(18 + 30 * pulse(frame, pointAt, 30))}%, ${PAPER})` : DATA_TINT,
                }}
              />
            );
          })}
          <span style={{ ...note(26, INK_SOFT), marginLeft: 8 }}>…</span>
        </div>
      </Fade>
      <Note at={dimensionAt + 6} x={X0 + 13 * 36 - 30} y={y(800) + 112} from="up">
        <span style={{ ...note(22, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>dimension 1,847: no name</span>
      </Note>

      {/* ── Fig. 4: the same five words as points in the cube ── */}
      <FigLabel n="4" title="The same words, as points" at={geometryAt} x={1060} y={y(FIG_Y)} />
      <Svg opacity={cubeP}>
        {CUBE.map(([a, b], i) => {
          const [x1, y1] = P(a);
          const [x2, y2] = P(b);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={LINE} strokeWidth={1.6} />;
        })}
        {(
          [
            [[0, 0, 0], [1, 0, 0], 0],
            [[0, 0, 0], [0, 1, 0], 1],
            [[0, 0, 0], [0, 0, 1], 2],
          ] as const
        ).map(([a, b, k]) => {
          const [x1, y1] = P(a as V3);
          const [x2, y2] = P(b as V3);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK_SOFT} strokeWidth={2} />;
        })}
        {SPACE.axes.map((ax, k) => {
          const end3: V3 = k === 0 ? [1.12, 0, 0] : k === 1 ? [0, 1.1, 0] : [0, 0, 1.14];
          const [tx, ty] = P(end3);
          return (
            <g key={ax}>
              <text x={tx} y={ty + 7} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 650, fill: INK_SOFT, opacity: 1 - unnamed }}>
                {ax}
              </text>
              <text x={tx} y={ty + 8} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 26, fontWeight: 700, fill: POINT_INK, opacity: unnamed }}>
                ?
              </text>
            </g>
          );
        })}
        {/* From cat to each word, in the order the narration measures. */}
        {SPACE.nearest.map((w) => {
          const [x1, y1] = P(cat);
          const [x2, y2] = P(spaceWord(w).vec as unknown as V3);
          const p = ease(frame, distAt[w] - 2, 14);
          if (p <= 0) return null;
          return (
            <line
              key={w}
              x1={x1}
              y1={y1}
              x2={lerp(x1, x2, p)}
              y2={lerp(y1, y2, p)}
              stroke={POINT}
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={0.85 * (1 - 0.6 * ease(frame, nobodyAt, 20))}
            />
          );
        })}
      </Svg>
      <Svg>
        {SPACE.words.map((w, i) => {
          const [x, yy] = P(w.vec as unknown as V3);
          const near = ["cat", "kitten", "dog"].includes(w.word);
          const glow =
            w.word === "cat" ? pulse(frame, catSatAt, 30) : w.word === "dog" ? pulse(frame, dogSatAt, 30) : 0;
          const ringAt = near ? arrangementAt : undefined;
          const g = ringAt === undefined ? 0 : pulse(frame, ringAt + i * 3, 30);
          const p = ease(frame, rowAt(i) + 2, 12);
          if (p <= 0) return null;
          return (
            <g key={w.word} opacity={p}>
              {glow + g > 0 ? <circle cx={x} cy={yy} r={11 + 12 * (glow + g)} fill="none" stroke={POINT} strokeWidth={2.4} opacity={glow + g} /> : null}
              <circle cx={x} cy={yy} r={10} fill={w.word === "cat" ? POINT : DATA} />
            </g>
          );
        })}
      </Svg>
      {SPACE.words.map((w, i) => {
        const [x, yy] = P(w.vec as unknown as V3);
        const p = ease(frame, rowAt(i) + 4, 12);
        if (p <= 0) return null;
        return (
          <div
            key={w.word}
            style={{
              position: "absolute",
              left: x + 18,
              top: yy - 16,
              opacity: p,
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 22,
              lineHeight: 1.2,
              color: INK,
              whiteSpace: "nowrap",
              background: PAPER,
              padding: "0 4px",
              borderRadius: 4,
            }}
          >
            {w.word}
          </div>
        );
      })}
      {/* "Pushes ... toward similar vectors": the three that share sentences are drawn together. */}
      <Svg opacity={ease(frame, pushesAt, 14) * (1 - ease(frame, catchAt, 14))}>
        {(() => {
          const pts = ["cat", "kitten", "dog"].map((w) => P(spaceWord(w).vec as unknown as V3));
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 60;
          const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 30;
          const s = 0.9 + 0.1 * clamp01((frame - pushesAt) / 20);
          return <ellipse cx={cx + 36} cy={cy} rx={rx * s + 36} ry={ry * s} fill="none" stroke={DATA} strokeWidth={2} strokeDasharray="7 7" />;
        })()}
      </Svg>
      <Note at={closeAt} out={tinyAt - 6} x={1060} y={y(840)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          Close together, or <span style={{ opacity: ease(frame, farAt - 2, 10) }}>far apart.</span>
        </span>
      </Note>
      <Note at={threeAt} out={measureAt - 4} x={1060} y={y(840)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Three numbers per word, so three axes.</span>
      </Note>
    </AbsoluteFill>
  );
};

// ═══ Scene 3: embeddings can't see order; position is mixed in ═════════════

const SLOT_X = [300, 620, 940];
const SUM_X = 1240;

/** A token card: the chip over its vector, the vector's values able to
 *  change (from `vec` to `to`, inked on `swapAt`). */
const Card: React.FC<{
  x: number;
  top: number;
  word: string;
  vec: readonly number[];
  to?: readonly number[];
  swapAt?: number;
  ring?: number;
  opacity?: number;
  dx?: number;
}> = ({ x, top, word, vec, to, swapAt, ring = 0, opacity = 1, dx = 0 }) => {
  const frame = useCurrentFrame();
  const s = swapAt === undefined || !to ? 0 : ease(frame, swapAt, 10);
  const shown = s > 0.5 && to ? to : vec;
  const changed = to ? to.map((v, i) => (Math.abs(v - vec[i]) > 1e-9 ? 1 : 0)) : [];
  const flash = swapAt === undefined ? 0 : pulse(frame, swapAt, 26);
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top,
        transform: "translateX(-50%)",
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <TokenChip text={word} size={28} border={ring > 0.05 ? POINT : INK} />
      <div style={{ borderRadius: 8, boxShadow: ring > 0.02 ? `0 0 0 ${3 + 3 * ring}px color-mix(in srgb, ${POINT} ${Math.round(ring * 100)}%, transparent)` : undefined }}>
        <VectorCells values={shown} size={24} highlight={changed.map((c) => c * flash)} />
      </div>
    </div>
  );
};

export const OrderScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("order").from;
  const orderAt = n.word("order", "order");
  const dogBitesAt = n.word("bites", "Dog", { nth: 1 });
  const manBitesAt = n.word("bites", "man", { nth: 2 });
  const shuffledAt = n.word("bites", "shuffled");
  const addAt = n.word("set", "Add");
  const sameAt = n.word("set", "same");
  const mixesAt = n.word("position", "mixes");
  const sitsAt = n.word("position", "sits");
  const firstAt = n.word("position", "first");
  const differentAt = n.word("position", "different");
  const lastAt = n.word("position", "last");
  const measureAt = n.word("order-in", "measure");
  const closeAt = n.word("order-in", "close", { nth: 1 });

  const row1 = y(430);
  const row2 = y(640);
  const posRow = y(810);
  const [s1, s2] = ORDER.vectors;
  const [p1, p2] = ORDER.positioned;
  const sumOut = mixesAt - 4;
  const addInAt = (i: number) => mixesAt + 10 + i * 8;

  // Row 2 starts as row 1's cards, then each slides to its shuffled slot.
  const shuffle = ease(frame, manBitesAt - 6, 22);
  const slotOf = (row: readonly { word: string }[], w: string) => row.findIndex((t) => t.word === w);

  return (
    <AbsoluteFill>
      {s1.map((_, i) => (
        <Sfx key={i} name="el-tap" at={dogBitesAt + i * 5} level={-26} />
      ))}
      <Sfx name="el-whoosh" at={manBitesAt - 6} level={-33} />
      <Sfx name="el-tap" at={addAt + 4} level={-24} />
      <Sfx name="el-tap" at={addAt + 10} level={-24} />
      <Sfx name="el-pencil" at={sameAt} level={-34} />
      {[0, 1, 2].map((i) => (
        <Sfx key={`p${i}`} name="el-tap" at={addInAt(i) + 6} level={-27} />
      ))}
      <Sfx name="el-pencil" at={measureAt} level={-35} />

      <Kicker at={from - 10}>Embeddings</Kicker>
      <Headline lead="Embeddings can't see order." at={from} out={mixesAt - 8} />
      <Headline lead="So each token" turn="gets its slot." at={mixesAt - 4} turnAt={sitsAt} />

      <FigLabel n="5" title="Dog bites man, and man bites dog" at={orderAt - 4} x={X0} y={y(FIG_Y)} />
      <Fade at={sitsAt - 4} style={{ left: 0, top: y(366), width: 1920 }}>
        {SLOT_X.map((x, i) => (
          <span key={i} style={{ position: "absolute", left: x, transform: "translateX(-50%)", ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            Slot {i + 1}
          </span>
        ))}
      </Fade>

      {/* Row 1: dog bites man. */}
      {s1.map((t, i) => {
        const p = ease(frame, dogBitesAt - 4 + i * 5, 12);
        if (p <= 0) return null;
        const ring = t.word === "dog" ? ease(frame, firstAt - 2, 12) : 0;
        return (
          <Card key={`a${i}`} x={SLOT_X[i]} top={row1} word={t.word} vec={t.vec} to={p1[i].vec} swapAt={addInAt(i) + 6} ring={ring} opacity={p} />
        );
      })}
      {/* Row 2: the same three cards, shuffled into man bites dog. */}
      {s2.map((t, i) => {
        if (shuffle <= 0) return null;
        const fromSlot = slotOf(s1, t.word);
        const x = lerp(SLOT_X[fromSlot], SLOT_X[i], shuffle);
        const top = lerp(row1, row2, Math.min(1, shuffle * 1.6));
        const ring = t.word === "dog" ? ease(frame, lastAt - 2, 12) : 0;
        return <Card key={`b${i}`} x={x} top={top} word={t.word} vec={t.vec} to={p2[i].vec} swapAt={addInAt(i) + 6} ring={ring} opacity={Math.min(1, shuffle * 3)} />;
      })}

      <Note at={shuffledAt - 2} out={addAt + 4} x={SUM_X - 60} y={row2 + 66}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>The same three vectors, shuffled.</span>
      </Note>
      {/* The order-blind sums, the same for both. */}
      {[row1, row2].map((top, r) => (
        <Fade key={r} at={addAt + 4 + r * 6} out={sumOut} style={{ left: SUM_X - 60, top: top + 62, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ ...note(30, INK_SOFT) }}>=</span>
          <VectorCells values={ORDER.sum[r]} size={24} border={INK} fill={PAPER} />
          <Tag size={20}>sum</Tag>
        </Fade>
      ))}
      <Fade at={sameAt - 2} out={sumOut} style={{ left: SUM_X + 230, top: row1 + 70 }}>
        <svg width={40} height={row2 - row1 + 10} style={{ overflow: "visible" }}>
          <path d={`M0,8 L18,8 L18,${row2 - row1} L0,${row2 - row1}`} fill="none" stroke={POINT} strokeWidth={2.4} />
        </svg>
      </Fade>
      <Note at={sameAt + 2} out={sumOut} x={SUM_X + 270} y={row1 + 70 + (row2 - row1) / 2 - 16}>
        <span style={{ ...note(26, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>exactly the same</span>
      </Note>

      {/* Where each token sits: the lesson's position signal, added slot by slot. */}
      <Fade at={mixesAt + 2} style={{ left: 0, top: posRow, width: 1920 }}>
        <span style={{ position: "absolute", left: X0, top: 12, ...label(21, INK_SOFT) }}>+ position</span>
        {ORDER.position.map((v, i) => (
          <span key={i} style={{ position: "absolute", left: SLOT_X[i], transform: "translateX(-50%)", opacity: ease(frame, addInAt(i), 10) }}>
            <VectorCells values={v} size={22} border={INK} fill={PAPER} />
          </span>
        ))}
      </Fade>
      <Note at={differentAt - 2} x={SUM_X - 40} y={row1 + 56}>
        <div style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={{ color: POINT_INK, fontWeight: 650 }}>Dog</span>, first: {p1[0].vec.map((v) => v.toFixed(1)).join(", ")}
        </div>
      </Note>
      <Note at={lastAt - 2} x={SUM_X - 40} y={row2 + 56}>
        <div style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={{ color: POINT_INK, fontWeight: 650 }}>Dog</span>, last: {p2[2].vec.map((v) => v.toFixed(1)).join(", ")}
        </div>
      </Note>
      <Svg opacity={ease(frame, measureAt - 2, 12) * 0.9}>
        {(() => {
          const x1 = SLOT_X[0];
          const x2 = SLOT_X[2];
          const y1 = row1 + 26;
          const y2 = row2 + 26;
          const p = ease(frame, measureAt - 2, 18);
          return (
            <line
              x1={x1 + 50}
              y1={y1}
              x2={lerp(x1 + 50, x2 - 60, p)}
              y2={lerp(y1, y2, p)}
              stroke={POINT}
              strokeWidth={2}
              strokeDasharray="6 7"
            />
          );
        })()}
      </Svg>
      <Note at={closeAt} x={SLOT_X[0] + 30} y={row1 + 150}>
        <span style={{ ...note(24, POINT_INK), fontWeight: 650, ...halo }}>how close?</span>
      </Note>
    </AbsoluteFill>
  );
};
