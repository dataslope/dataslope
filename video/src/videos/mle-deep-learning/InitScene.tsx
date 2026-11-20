import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label, note, TABULAR } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { INIT, VANISH } from "./data";
import { ACCENT, ACCENT_INK, Art, atLog, Drift, INK, INK_SOFT, Line, Mark, OK_INK, Pixels, Pow10, type Scale, Svg } from "./parts";

const MINI_X0 = 200;
const MINI_X1 = 540;
const XAV_X = 700;
const HE_X = 1290;
const IMG_X = 440;
const IMG_CELL = 9;
const IMG_PITCH = 96;

/** A unit's 64 weights scaled to 0..1 against its row's range, for drawing. */
const scaled = (units: number[][]) => {
  const all = units.flat();
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  return units.map((u) => u.map((w) => (w - lo) / (hi - lo || 1)));
};

/**
 * Question 6. The explosion from Question 5, small: only the starting scale
 * differed. Xavier's and He's variances side by side, each over the
 * activations it is for. Then why a random start at all: sixteen hidden
 * units started at 0.01 train into exact copies (the first four's incoming
 * weights drawn as 8x8 images, identical) and score 38% on held-out digits;
 * from Xavier they come out sixteen different units, 98%.
 */
export const InitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "Why does weight initialization");
  const thatAt = n.word("q6-a", "That explosion");
  const scaleAt = n.word("q6-a", "the starting scale alone");
  const xavAt = n.word("q6-a", "Xavier sets the variance");
  const tanhAt = n.word("q6-a", "for tanh and sigmoid");
  const heAt = n.word("q6-a", "He, two over inputs");
  const halfAt = n.word("q6-a", "since ReLU zeroes half");
  const equalAt = n.word("q6-sym", "never start the weights equal");
  const sixteenAt = n.word("q6-sym", "Sixteen hidden units");
  const copiesAt = n.word("q6-sym", "exact copies");
  const oneUnitAt = n.word("q6-sym", "one unit in effect");
  const thirtyAt = n.word("q6-sym", "thirty-eight percent");
  const xavStartAt = n.word("q6-sym", "From Xavier's random start");
  const ninetyAt = n.word("q6-sym", "ninety-eight");
  const whyAt = n.word("q6-why", "Equal units get equal gradients");
  const tieAt = n.word("q6-why", "breaks the tie");
  const end = n.beat("norm-in").to;

  // ── Question 5's explosion, small ──
  const top = y(330);
  const bottom = y(490);
  const ys: Scale = { lo: 0.1, hi: 1e7, a: bottom, b: top };
  const mx = (layer: number) => MINI_X0 + ((20 - layer) / 19) * (MINI_X1 - MINI_X0);
  const mini = (vals: readonly number[]) => vals.map((_, i) => {
    const layer = 20 - i;
    return `${i ? "L" : "M"}${mx(layer).toFixed(1)},${atLog(ys, vals[layer - 1]).toFixed(1)}`;
  }).join(" ");
  const lit = ease(frame, scaleAt, 12);

  // ── Sixteen units, started equal or from Xavier ──
  const rows = [
    { name: "Started at 0.01", units: scaled(INIT.constantUnits), top: y(656), at: sixteenAt, acc: INIT.constantAcc, accAt: thirtyAt, ink: ACCENT_INK },
    { name: "From Xavier", units: scaled(INIT.xavierUnits), top: y(772), at: xavStartAt, acc: INIT.xavierAcc, accAt: ninetyAt, ink: OK_INK },
  ];
  const ring = ease(frame, copiesAt, 16);
  const imgW = 8 * IMG_CELL;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={thatAt} level={-36} />
      <Sfx name="el-tap" at={xavAt} level={-31} />
      <Sfx name="el-tap" at={heAt} level={-31} />
      <Sfx name="el-sprinkle" at={sixteenAt} level={-34} />
      <Sfx name="el-pencil" at={copiesAt} level={-34} />
      <Sfx name="el-pop" at={thirtyAt} level={-31} />
      <Sfx name="el-pop" at={ninetyAt} level={-31} />
      <Sfx name="el-chime" at={tieAt + 18} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4}>
          Why does weight initialization matter? Xavier vs He.
        </QuestionCard>

        {/* ── The explosion, small ── */}
        <Line at={thatAt - 4} x={MINI_X0 - 80} y={y(290)} size={22} color={INK_SOFT}>
          Question <Num>5</Num>, ReLU at twice He&apos;s spread
        </Line>
        <Svg>
          <g opacity={ease(frame, thatAt - 4, 12)}>
            {[0, 3, 6].map((e) => (
              <g key={e}>
                <line x1={MINI_X0} x2={MINI_X1} y1={atLog(ys, 10 ** e)} y2={atLog(ys, 10 ** e)} stroke={INK_SOFT} strokeDasharray="2 6" opacity={0.5} />
                <text x={MINI_X0 - 12} y={atLog(ys, 10 ** e) + 7} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
                  <Pow10 e={e} />
                </text>
              </g>
            ))}
            <line x1={MINI_X0} x2={MINI_X1} y1={bottom} y2={bottom} stroke={INK} strokeWidth={1.4} />
            <path d={mini(VANISH.byLayer.reluHe)} fill="none" stroke={OK} strokeWidth={3} />
            <path d={mini(VANISH.byLayer.reluTwiceHe)} fill="none" stroke={ACCENT} strokeWidth={3 + 2 * lit} />
            <text x={MINI_X0} y={bottom + 30} style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
              20
            </text>
            <text x={MINI_X1} y={bottom + 30} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
              layer 1
            </text>
          </g>
        </Svg>
        <Line at={scaleAt} x={MINI_X0 - 80} y={bottom + h(52)} size={24} color={INK}>
          <Mark at={scaleAt}>Only the starting scale</Mark> changed
        </Line>

        {/* ── Xavier and He ── */}
        <ColumnRule x={(XAV_X + 520 + HE_X) / 2 - 20} top={y(296)} height={y(470) - y(296)} at={heAt} />
        {[
          { x: XAV_X, name: "Xavier", at: xavAt, f: <>2 / (inputs + outputs)</>, use: "For tanh and sigmoid", useAt: tanhAt },
          { x: HE_X, name: "He", at: heAt, f: <>2 / inputs</>, use: "For ReLU, which zeroes half its inputs", useAt: halfAt },
        ].map((c) => (
          <React.Fragment key={c.name}>
            <Line at={c.at - 4} x={c.x} y={y(296)} size={26} color={INK}>
              {c.name}
            </Line>
            <Line at={c.at + 4} x={c.x} y={y(350)} size={32} color={INK}>
              <MathRun>
                Var(<I>w</I>) = {c.f}
              </MathRun>
            </Line>
            <Line at={c.useAt} x={c.x} y={y(420)} size={24} color={INK_SOFT}>
              {c.use}
            </Line>
          </React.Fragment>
        ))}

        {/* ── Equal starts stay equal ── */}
        <Line at={equalAt} x={MINI_X0 - 80} y={y(606)} size={22} color={INK_SOFT}>
          <Num>16</Num> hidden units after <Num>{INIT.steps.toLocaleString("en-US")}</Num> steps: the first four&apos;s <Num>64</Num> incoming weights
        </Line>
        {rows.map((r) => (
          <React.Fragment key={r.name}>
            <Line at={r.at} x={MINI_X0 - 80} y={r.top + h(26)} size={24} color={INK}>
              {r.name}
            </Line>
            {r.units.map((u, k) => (
              <Pixels key={k} values={u} x={IMG_X + k * IMG_PITCH} y={r.top} cell={IMG_CELL} gap={0} at={r.at + 4 + k * 3} />
            ))}
          </React.Fragment>
        ))}
        <Svg>
          {ring > 0 ? (
            <rect
              x={IMG_X - 12}
              y={rows[0].top - 12}
              width={3 * IMG_PITCH + imgW + 24}
              height={imgW + 24}
              rx={8}
              fill="none"
              stroke={ACCENT}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={`${ring} 1`}
            />
          ) : null}
        </Svg>
        <Line at={copiesAt + 4} x={IMG_X + 3 * IMG_PITCH + imgW + 44} y={rows[0].top + h(4)} size={24} color={ACCENT_INK}>
          All <Num>{INIT.hidden}</Num> identical
          <span style={{ opacity: ease(frame, oneUnitAt, 10) }}>: one unit in effect</span>
        </Line>
        <Line at={xavStartAt + 10} x={IMG_X + 3 * IMG_PITCH + imgW + 44} y={rows[1].top + h(4)} size={24} color={INK}>
          <Num>{INIT.xavierDistinctUnits}</Num> different units
        </Line>
        {rows.map((r) => (
          <div
            key={r.name}
            style={{
              position: "absolute",
              left: IMG_X + 3 * IMG_PITCH + imgW + 44,
              top: r.top + h(44),
              ...note(24, INK_SOFT),
              whiteSpace: "nowrap",
              opacity: ease(frame, r.accAt, 10),
            }}
          >
            Held-out digits: <span style={{ color: r.ink, fontWeight: 600, ...TABULAR }}>{Math.round(r.acc * 100)}%</span>
          </div>
        ))}

        {/* A random start: what breaks the tie. */}
        <Sfx name="el-pop" at={xavStartAt} level={-30} />
        <Art name="dice" at={xavStartAt} left={1490} top={y(660)} h={150} />

        <Line at={whyAt} x={MINI_X0 - 80} y={y(884)} size={28} color={INK}>
          Equal units, equal gradients
          <span style={{ opacity: ease(frame, tieAt - 4, 10) }}>: nothing ever breaks the tie</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
