import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CACHE_FRACTION, SHEET } from "./data";
import {
  CACHED,
  CACHED_SOFT,
  Drift,
  FIG_Y,
  Hairline,
  HBar,
  Headline,
  INPUT,
  INPUT_INK,
  Marked,
  OUTPUT,
  OUTPUT_INK,
  pulse,
  CACHED_INK,
  RULE,
  Spot,
  TAGS,
  X0,
} from "./parts";

const NAME_X = X0;
const WHAT_X = 430;
const REL_X = 910;
const BAR_X = 1380;
const HEAD_Y = 352;
const ROW_Y0 = 414;
const ROW_DY = 86;
const RIGHT = 1800;
/** Input's bar, the unit every other bar is drawn against. */
const UNIT = 70;
const BAR_H = 30;

/**
 * The five numbers on every price sheet, the lesson's table verbatim, each
 * row arriving as it is named, with a bar against input beside it: output
 * five times as long, a cache hit a sliver, batch half. Then every price
 * falls together while the ratios stay put.
 */
export const SheetScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const sheetFrom = n.beat("sheet").from;
  const sameAt = n.word("sheet", "same way");
  const fiveAt = n.word("sheet", "five numbers");
  const millionAt = n.word("sheet", "million");
  const rowAt = [
    n.word("rows", "Input", { nth: 1 }),
    n.word("rows", "Output"),
    n.word("rows", "Cached"),
    n.word("rows", "Writing"),
    n.word("rows", "batch"),
  ];
  const fallingAt = n.word("ratios", "falling");
  const ratiosAt = n.word("ratios", "ratios");
  const moveAt = n.word("ratios", "move");
  const end = n.beat("why").from;

  // Every price falls together: the bars shrink, the ratios between them stay.
  const fall = 1 - 0.45 * ease(frame, fallingAt - 4, 30);
  const unit = UNIT * fall;
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_DY);
  const barY = (i: number) => rowY(i) + 4;
  const bh = h(BAR_H);

  const colors = [INPUT_INK, OUTPUT_INK, CACHED_INK, CACHED_INK, INK];

  return (
    <AbsoluteFill>
      {/* ── Sound: the header, each row's bar, the fall ── */}
      <Sfx name="el-pencil" at={fiveAt - 2} level={-35} />
      {rowAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={-27} />
      ))}
      <Sfx name="el-whoosh" at={fallingAt - 4} level={-34} />

      <Headline at={sheetFrom - 6} second={millionAt - 4} italic="per million tokens.">
        Five numbers,
      </Headline>
      {/* The tags from the opening, still hanging: already settled at the cut. */}
      <Spot id="tags" at={sheetFrom - 60} left={TAGS.left} top={y(TAGS.top)} width={TAGS.width} height={TAGS.height} />

      <Drift from={sheetFrom} to={end} amount={0.014} origin="40% 60%">
        <FigLabel n="2" title="The five numbers on every price sheet" at={sameAt - 6} x={X0} y={y(FIG_Y)} />

        {/* Header and rules. */}
        {[
          ["Number", NAME_X],
          ["What it is", WHAT_X],
          ["Typical relationship", REL_X],
          ["Against input", BAR_X],
        ].map(([t, x], k) => (
          <Ink key={t} at={fiveAt - 4 + k * 3} dur={12} style={{ left: x as number, top: y(HEAD_Y), whiteSpace: "nowrap" }}>
            <span style={label(21, INK_SOFT)}>{t}</span>
          </Ink>
        ))}
        <Hairline x={X0} y={y(HEAD_Y) + 40} w={RIGHT - X0} at={fiveAt} color={INK_SOFT} />
        {SHEET.map((_, i) => (
          <Hairline key={i} x={X0} y={rowY(i) + h(ROW_DY) - 16} w={RIGHT - X0} at={fiveAt + 4 + i * 4} color={RULE} />
        ))}

        {SHEET.map((row, i) => {
          const at = rowAt[i];
          return (
            <React.Fragment key={row.name}>
              {/* The five names arrive with "five numbers"; each swells as it is read. */}
              <Ink at={fiveAt + i * 4} dur={12} style={{ left: NAME_X, top: rowY(i) - 2, whiteSpace: "nowrap" }}>
                <span
                  style={{
                    ...label(30, colors[i]),
                    fontWeight: 700,
                    display: "inline-block",
                    transformOrigin: "0 60%",
                    transform: `scale(${1 + pulse(frame, at - 4, 20) * 0.08})`,
                  }}
                >
                  {row.name}
                </span>
              </Ink>
              <Ink at={at - 2} dur={14} style={{ left: WHAT_X, top: rowY(i) + 2, whiteSpace: "nowrap" }}>
                <span style={note(24, INK_SOFT)}>{row.what}</span>
              </Ink>
              <Ink at={at} dur={14} style={{ left: REL_X, top: rowY(i), whiteSpace: "nowrap" }}>
                <span style={{ ...note(27, INK), fontWeight: 600 }}>
                  <Marked at={ratiosAt + i * 4}>{row.relation}</Marked>
                </span>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* Bars against input. A dashed outline is input's length, for the
            rows that come in under it. */}
        {/* Input */}
        <HBar x={BAR_X} y={barY(0)} w={unit} h={bh} at={rowAt[0] + 2} fill={INPUT} />
        {/* Output: five times, and sometimes more (the faint run past it). */}
        <HBar x={BAR_X} y={barY(1)} w={unit * 5} h={bh} at={rowAt[1] + 2} dur={20} fill={OUTPUT} />
        <HBar
          x={BAR_X + unit * 5}
          y={barY(1)}
          w={unit * 0.9}
          h={bh}
          at={rowAt[1] + 18}
          fill={`repeating-linear-gradient(90deg, ${OUTPUT} 0 6px, transparent 6px 12px)`}
          opacity={0.45}
          radius={0}
        />
        {/* Cached input: the usual tenth, against input's outline. */}
        <Outline x={BAR_X} y={barY(2)} w={unit} h={bh} at={rowAt[2]} />
        <HBar x={BAR_X} y={barY(2)} w={Math.max(3, unit * CACHE_FRACTION.haiku)} h={bh} at={rowAt[2] + 6} fill={CACHED} radius={1} />
        {/* Cache write: input's length, and a little more. */}
        <HBar x={BAR_X} y={barY(3)} w={unit} h={bh} at={rowAt[3] + 2} fill={CACHED_SOFT} outline={CACHED} />
        <Note at={rowAt[3] + 10} x={BAR_X + unit + 8} y={barY(3) + bh / 2 - 19}>
          <span style={{ ...label(28, CACHED_INK), fontWeight: 700 }}>+</span>
        </Note>
        {/* Batch: about half of the rate it is applied to. */}
        <Outline x={BAR_X} y={barY(4)} w={unit} h={bh} at={rowAt[4]} />
        <HBar x={BAR_X} y={barY(4)} w={unit * 0.5} h={bh} at={rowAt[4] + 6} fill={INPUT} />

        <Note at={fallingAt + 4} x={BAR_X} y={barY(4) + h(ROW_DY) - 6}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            Lower prices,{" "}
            <span style={{ opacity: ease(frame, moveAt - 6, 12), color: INK, fontWeight: 600 }}>same ratios.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** A dashed box the length of input's bar, drawn on `at`. */
const Outline: React.FC<{ x: number; y: number; w: number; h: number; at: number }> = ({ x, y, w, h, at }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        borderRadius: 3,
        border: `2px dashed color-mix(in srgb, ${INK} 45%, transparent)`,
        opacity: ease(frame, at, 12),
      }}
    />
  );
};
