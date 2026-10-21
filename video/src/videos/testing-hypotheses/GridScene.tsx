import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DATA_INK, DATA_WASH, Greek, H0, Head, Kicker, Label, pulse, STAT_INK, STAT_WASH, Tick } from "./parts";

const COL_X = [620, 1200];
const COL_W = 560;
const ROW_Y = [400, 610];
const ROW_H = 190;
const ROW_LABEL_X = 160;
/** Where a cell's tick sits, from the cell's left edge: just past its word. */
const TICK_AFTER = { correct: 212, power: 196 };

/**
 * The truth crossed with the decision: four outcomes, a false alarm at rate
 * alpha, a miss at rate beta, and power in the cell beside the miss.
 */
export const GridScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const gridFrom = n.beat("grid").from;
  const trueAt = n.word("grid", "what's true");
  const decideAt = n.word("grid", "decide");
  const fourAt = n.word("grid", "four outcomes");
  const rejectAt = n.word("typeone", "Reject");
  const alarmAt = n.word("typeone", "false alarm");
  const typeOneAt = n.word("typeone", "Type One");
  const alphaAt = n.word("typeone", "alpha");
  const missAt = n.word("typetwo", "Miss");
  const typeTwoAt = n.word("typetwo", "Type Two");
  const betaAt = n.word("typetwo", "beta");
  const powerAt = n.word("power", "power");
  const catchingAt = n.word("power", "catching");
  const thereAt = n.word("power", "really there");

  const cellY = (r: number) => y(ROW_Y[r]);
  const cellH = h(ROW_H);
  const frameIn = (k: number) => ease(frame, fourAt - 4 + k * 4, 12);

  /** One cell of the grid, its wash coming in on `at`. */
  const cell = (r: number, c: number, k: number, wash: string | null, at: number, glowAt: number) => {
    const f = frameIn(k);
    if (f <= 0) return null;
    const w = wash ? ease(frame, at, 14) : 0;
    const g = pulse(frame, glowAt, 26);
    return (
      <div
        style={{
          position: "absolute",
          left: COL_X[c] + 8,
          top: cellY(r) + 8,
          width: COL_W - 16,
          height: cellH - 16,
          border: `2px solid ${HAIRLINE}`,
          borderRadius: 10,
          opacity: f,
          transform: `scale(${(0.96 + 0.04 * f) * (1 + 0.012 * g)})`,
        }}
      >
        {wash ? <div style={{ position: "absolute", inset: 0, background: wash, opacity: w, borderRadius: 8 }} /> : null}
      </div>
    );
  };

  const text = (r: number, c: number, line: number, at: number, node: React.ReactNode) => (
    <Ink at={at} dur={14} style={{ left: COL_X[c] + 40, top: cellY(r) + 36 + line * 52, whiteSpace: "nowrap" }}>
      {node}
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the four cells, then each named outcome ── */}
      <Sfx name="el-pop" at={fourAt - 4} level={-30} />
      <Sfx name="el-tap" at={alarmAt - 4} level={-28} />
      <Sfx name="el-tap" at={missAt - 4} level={-29} />
      <Sfx name="el-tap" at={powerAt - 4} level={-28} />
      <Sfx name="el-pencil" at={thereAt} level={-35} />

      <Kicker at={gridFrom - 10}>Errors and power</Kicker>
      <Head a="Two ways" b="to be wrong." at={gridFrom - 6} bAt={rejectAt - 4} />

      {/* ── The axes: what's true, what you decide ── */}
      {/* On the column headers' baseline: 22px set 6px lower than their 28px. */}
      <Ink at={trueAt - 4} dur={14} style={{ left: ROW_LABEL_X, top: y(340) + 6, whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>What&apos;s true</span>
      </Ink>
      <Ink at={decideAt - 4} dur={14} style={{ left: COL_X[0] + 8, top: y(290), whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>What you decide</span>
      </Ink>
      {[
        <>
          Fail to reject <H0 />
        </>,
        <>
          Reject <H0 />
        </>,
      ].map((t, c) => (
        <Ink key={c} at={decideAt + c * 6} dur={14} style={{ left: COL_X[c] + 40, top: y(340), whiteSpace: "nowrap" }}>
          <Label size={28}>{t}</Label>
        </Ink>
      ))}
      {[
        <>
          <H0 /> is true
        </>,
        <>There is a real effect</>,
      ].map((t, r) => (
        <Ink key={r} at={trueAt + r * 6} dur={14} style={{ left: ROW_LABEL_X, top: cellY(r) + cellH / 2 - 22, width: 420 }}>
          <span style={{ ...body(36, true), color: INK }}>{t}</span>
        </Ink>
      ))}

      {/* ── The four cells ── */}
      {cell(0, 0, 0, null, 0, thereAt + 4)}
      {cell(0, 1, 1, STAT_WASH, alarmAt - 4, alphaAt)}
      {cell(1, 0, 2, STAT_WASH, missAt - 4, betaAt)}
      {cell(1, 1, 3, DATA_WASH, powerAt - 4, catchingAt + 6)}

      {text(0, 1, 0, alarmAt - 4, <span style={{ ...body(40, true), color: STAT_INK }}>A false alarm</span>)}
      {text(0, 1, 1, typeOneAt - 4, <Label size={26}>Type I error</Label>)}
      {text(
        0,
        1,
        2,
        alphaAt - 4,
        <Label size={26} color={STAT_INK}>
          its rate: <Greek>α</Greek>
        </Label>,
      )}

      {text(1, 0, 0, missAt - 4, <span style={{ ...body(40, true), color: STAT_INK }}>A missed effect</span>)}
      {text(1, 0, 1, typeTwoAt - 4, <Label size={26}>Type II error</Label>)}
      {text(
        1,
        0,
        2,
        betaAt - 4,
        <Label size={26} color={STAT_INK}>
          its rate: <Greek>β</Greek>
        </Label>,
      )}

      {text(1, 1, 0, powerAt - 4, <span style={{ ...body(40, true), color: DATA_INK }}>Power</span>)}
      {text(1, 1, 1, catchingAt - 4, <Label size={26}>the chance of catching it</Label>)}
      {text(
        1,
        1,
        2,
        catchingAt + 8,
        <Label size={26} color={DATA_INK}>
          1 − <Greek>β</Greek>
        </Label>,
      )}

      {text(0, 0, 0, thereAt - 2, <span style={{ ...body(40, true), color: INK_SOFT }}>Correct</span>)}
      {/* Each tick just after its cell's word, the same way in both cells. */}
      <Tick x={COL_X[0] + TICK_AFTER.correct} y={cellY(0) + 36 + 26} at={thereAt + 2} size={30} />
      <Tick x={COL_X[1] + TICK_AFTER.power} y={cellY(1) + 36 + 26} at={thereAt + 8} size={30} color={DATA_INK} />
    </AbsoluteFill>
  );
};
