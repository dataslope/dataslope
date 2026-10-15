import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, label } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { AGG, ROWS, TOTAL_INDEX, TOTALS } from "./data";
import {
  A_X,
  CARD_W,
  Code,
  D_HEADER,
  D_ROW0,
  D_W,
  D_X,
  Fig,
  fly,
  FRAME_COLS,
  GAP,
  Header,
  HEADER_Y,
  KEY_COLS,
  KeyCard,
  LABEL_Y,
  Mono,
  RH,
  ROW0,
  RowCard,
  T_W,
  T_X,
  ValueCell,
} from "./kit";

/** "7 rows in": a count in the headline face, then what it counts. */
export const Count: React.FC<{ value: number; text: string }> = ({ value, text }) => (
  <span style={{ display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
    <span style={headline(44)}>{value}</span>
    <span style={body(28)}>{text}</span>
  </span>
);

/**
 * "The part most people miss": the same sum, two shapes. `.agg` is the
 * three-row result the last scene built; `.transform` hands each of those
 * totals back to every row of its department, so the answer has the frame's
 * seven rows, in the frame's order.
 */
export const ShapesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const start = n.beat("miss").from;
  const groupAt = n.word("miss", "one row per group");
  const transAt = n.word("transform", "Transform");
  const handsAt = n.word("transform", "hands each total back");
  const inAt = n.word("transform", "Seven rows in");
  const outAt = n.word("transform", "seven rows out");
  const orderAt = n.word("transform", "original order");

  const cardH = h(RH - GAP);
  const showIndex = ease(frame, orderAt - 2, 12);

  return (
    <AbsoluteFill>
      <Ink at={start - 12} dur={14} style={{ left: 124, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>The part most people miss</span>
      </Ink>
      {/* One line in two inks; the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 118, top: y(146), display: "flex", gap: "0.26em", ...headline(66) }}>
        <Ink at={groupAt - 6} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          One row per group,
        </Ink>
        <Ink at={transAt - 2} dur={18} style={{ position: "relative", ...headline(66, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          or one per row.
        </Ink>
      </div>

      <Fig n="2" at={start - 8} x={124} y={y(250)}>
        The same sum, through <Mono>agg</Mono> and through <Mono>transform</Mono>
      </Fig>

      {/* ── the frame, where the last scene left it ── */}
      <Ink at={start - 14} dur={10} style={{ left: A_X, top: y(LABEL_Y) }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>df</span>
      </Ink>
      <Header x={A_X} top={y(HEADER_Y)} width={CARD_W} at={start - 14} cols={FRAME_COLS} />
      {ROWS.map((r, i) => (
        <RowCard key={r.index} row={r} height={cardH} pose={{ x: A_X, top: y(ROW0 + i * RH) }} />
      ))}
      <Note at={inAt - 2} x={A_X} y={y(ROW0 + 7 * RH + 14)}>
        <Count value={ROWS.length} text="rows in" />
      </Note>

      {/* ── agg: three rows ── */}
      <Ink at={start - 10} dur={12} style={{ left: D_X, top: y(LABEL_Y) }}>
        <Code parts={[{ text: '.agg("sum")', mark: { at: groupAt - 2, out: transAt - 4 } }]} size={24} />
      </Ink>
      <Header x={D_X} top={y(D_HEADER)} width={D_W} at={start - 14} cols={KEY_COLS} />
      {AGG.map((a, k) => (
        <KeyCard key={a.dept} dept={a.dept} value={a.salary} height={cardH} pose={{ x: D_X, top: y(D_ROW0 + k * RH) }} />
      ))}
      <Note at={groupAt + 4} x={D_X} y={y(D_ROW0 + AGG.length * RH + 14)}>
        <Count value={AGG.length} text="rows, one per group" />
      </Note>

      {/* ── transform: every row gets its group's total back ── */}
      <Ink at={transAt - 4} dur={12} style={{ left: T_X, top: y(LABEL_Y) }}>
        <Code parts={[{ text: '.transform("sum")', mark: { at: transAt, out: outAt + 20 } }]} size={24} />
      </Ink>
      <Header
        x={T_X}
        top={y(HEADER_Y)}
        width={T_W}
        at={transAt}
        cols={[{ text: "group total", right: 18 }]}
      />
      {ROWS.map((r, i) => {
        const p = ease(frame, handsAt + i * 5, 24);
        if (p <= 0) return null;
        const k = AGG.findIndex((a) => a.dept === r.dept);
        // Each copy leaves from the value half of its department's agg row.
        const pose = fly(p, [D_X + D_W - T_W, y(D_ROW0 + k * RH)], [T_X, y(ROW0 + i * RH)], 46);
        return (
          <ValueCell
            key={r.index}
            dept={r.dept}
            index={r.index}
            showIndex={showIndex}
            text={String(TOTALS[i])}
            pose={pose}
            width={T_W}
            height={cardH}
          />
        );
      })}
      <Note at={outAt - 2} x={T_X} y={y(ROW0 + 7 * RH + 14)}>
        <Count value={TOTALS.length} text="rows out" />
      </Note>
      <Note at={orderAt + 2} x={T_X + 190} y={y(ROW0 + 7 * RH + 22)}>
        <span style={{ ...body(26, true), whiteSpace: "nowrap" }}>indexed {TOTAL_INDEX[0]} to {TOTAL_INDEX[TOTAL_INDEX.length - 1]}, like the frame</span>
      </Note>
    </AbsoluteFill>
  );
};
