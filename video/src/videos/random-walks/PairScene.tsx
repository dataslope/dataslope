import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, halo, headline, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { dec, R_WALKS, STEPS, WALK_A, WALK_B } from "./data";
import {
  COLOR,
  COLOR_INK,
  Headline,
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

/**
 * Pair, corr: a second walk from its own coin draws itself over the first,
 * and the two turn out to be strongly correlated.
 */
export const PairScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const yOf = useValueY(WALK_Y);
  const start = n.beat("pair").from;
  const secondAt = n.word("pair", "second walk");
  const nothingAt = n.word("pair", "nothing to do");
  const corrAt = n.word("corr", "correlation");
  const numberAt = n.word("corr", "zero point");
  const leave = leaveAt(n.beat("many").from);

  const drawnB = STEPS * ease(frame, secondAt - 4, n.beat("pair").to - secondAt);
  const [tipX, tipY] = walkTip(WALK_B, WALK_X, yOf, drawnB);
  const end = (w: readonly number[]) => yOf(w[w.length - 1]);

  return (
    <AbsoluteFill>
      <Headline first="Two coins, nothing shared," second={`correlated at ${dec(R_WALKS)}.`} at={start - 4} secondAt={corrAt - 2} out={leave} />
      <FigLabel n="2" title="Two independent random walks, 300 flips each" at={start - 2} x={120} y={y(196)} out={leave} />

      <ValueGrid scale={WALK_X} spec={WALK_Y} at={start - 30} title="Steps from the start" />
      <Axis
        scale={WALK_X}
        base={yOf(WALK_Y.lo)}
        ticks={[0, 100, 200, 300]}
        format={(v) => (v === 300 ? "300 flips" : String(v))}
        at={start - 30}
        size={20}
      />

      <Layer>
        <path
          d={walkD(WALK_A, WALK_X, yOf)}
          fill="none"
          stroke={COLOR.a}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={walkD(WALK_B, WALK_X, yOf, drawnB)}
          fill="none"
          stroke={COLOR.b}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {drawnB > 0 && drawnB < STEPS ? (
          <circle cx={tipX} cy={tipY} r={6} fill={COLOR.b} stroke={PAPER} strokeWidth={2} />
        ) : null}
      </Layer>

      {/* Each line named at its end, in its own ink. */}
      <Note at={start - 20} x={WALK_X.x1 + 16} y={end(WALK_A) - 16}>
        <span style={{ ...note(21, COLOR_INK.a), fontWeight: 650, ...halo }}>Walk a</span>
      </Note>
      <Note at={n.beat("pair").to - 6} x={WALK_X.x1 + 16} y={end(WALK_B) - 12}>
        <span style={{ ...note(21, COLOR_INK.b), fontWeight: 650, ...halo }}>Walk b</span>
      </Note>

      <Ink at={corrAt - 4} dur={14} style={{ left: 1470, top: y(380) }}>
        <span style={label(21, INK_SOFT)}>Their correlation, r</span>
      </Ink>
      <Ink at={numberAt - 2} dur={18} style={{ left: 1464, top: y(380) + 44 }}>
        <span style={{ ...headline(120), color: ACCENT_INK }}>{dec(R_WALKS)}</span>
      </Ink>
      <Note at={numberAt + 14} x={1470} y={y(380) + 186} width={350}>
        <span style={prose(20)}>0 means no linear relation, 1 means a perfect one.</span>
      </Note>

      <Spot
        id="random-walks-balloons"
        at={nothingAt - 4}
        box={{ left: 1440, top: y(660), width: 380, height: y(890) - y(660) }}
      />
    </AbsoluteFill>
  );
};
