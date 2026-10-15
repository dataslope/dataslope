import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { AGG, ILLUSTRATIONS, PIECES, pieceOf, ROWS, VIDEO } from "./data";
import {
  A_X,
  Arrow,
  CARD_W,
  Code,
  D_HEADER,
  D_ROW0,
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
  RH,
  ROW0,
  RowCard,
} from "./kit";

/** The pieces, stacked with clear paper between them. */
const B_X = 610;
const B_TOP = 376;
const PIECE_GAP = 32;
/** The apply column: a bracket on each piece, an arrow, the piece's answer. */
const BRACKET_X = B_X + CARD_W + 22;
const ARROW_X0 = BRACKET_X + 14;
const ARROW_X1 = ARROW_X0 + 82;
const C_X = ARROW_X1 + 18;

/** Top of slot `s` of piece `k`, in layout units. */
const pieceTop = (k: number, s: number) => {
  const before = PIECES.slice(0, k).reduce((a, p) => a + p.rows.length, 0);
  return B_TOP + before * RH + k * PIECE_GAP + s * RH;
};
const pieceBottom = (k: number) => pieceTop(k, PIECES[k].rows.length - 1) + RH - GAP;
const pieceMid = (k: number) => (pieceTop(k, 0) + pieceBottom(k)) / 2;

/** "1  Split": a step's number in the accent and its name in ink. */
const Step: React.FC<{ n: number; text: string; at: number; x: number; top: number }> = ({ n, text, at, x, top }) => (
  <Ink at={at} dur={14} style={{ left: x, top, display: "flex", alignItems: "baseline", gap: 12, whiteSpace: "nowrap" }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>{n}</span>
    <span style={{ ...label(24, INK), fontWeight: 600 }}>{text}</span>
  </Ink>
);

/**
 * Hook to "Three came out": the lesson's frame splits into one piece per
 * department, each piece is summed, and the three answers are stacked into
 * the result. The rows physically lift off the frame and land in their
 * pieces; the answers then fly into the new, shorter table.
 */
export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = Math.max(0, n.beat("hook").from - 13);
  const sevenAt = n.word("hook", "seven employees");
  const payAt = n.word("hook", "pay in all");
  const groupbyAt = n.word("steps", "groupby");
  const splitAt = n.word("split", "split");
  const breakAt = n.word("split", "break apart");
  const engAt = n.word("split", "Engineering");
  const twoAt = n.word("split", "Ops and sales");
  const applyAt = n.word("apply", "apply");
  const runsAt = n.word("apply", "runs on each piece");
  const sumAt = n.word("apply", "a sum");
  const engSumAt = n.word("apply", "three hundred");
  const combineAt = n.word("combine", "combine");
  const stackedAt = n.word("combine", "stacked");
  const inAt = n.word("combine", "Seven rows went in");
  const outAt = n.word("combine", "Three came out");

  const cardH = h(RH - GAP);
  /** The pieces and the apply column step back once their answers leave. */
  const spent = 1 - 0.6 * ease(frame, stackedAt - 4, 14);
  const panda = pop(frame, sevenAt - 6, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: 124, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>pandas groupby</span>
      </Ink>
      <Ink at={open + 2} dur={22} style={{ left: 118, top: y(146), ...headline(66), whiteSpace: "nowrap" }}>
        What does each department{" "}
        <span style={{ position: "relative" }}>
          pay in all?
          <span
            style={{
              position: "absolute",
              left: "-0.08em",
              right: `calc(${1 - ease(frame, payAt - 2, 14)} * (100% + 0.16em) - 0.08em)`,
              top: "0.62em",
              height: "0.34em",
              background: HIGHLIGHT,
              zIndex: -1,
            }}
          />
        </span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="pandas-groupby-sorting-bowls"
          style={{
            position: "absolute",
            left: 1480,
            top: y(88),
            width: 330,
            height: 200,
            opacity: panda,
            transform: `translateY(${bob(frame, 4, 110) + (1 - panda) * 26}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={groupbyAt - 8} x={124} y={y(250)}>
        <Code
          parts={[
            { text: "df." },
            { text: 'groupby("dept")', mark: { at: splitAt - 2, out: applyAt - 6 } },
            { text: '["salary"].agg("sum")', mark: { at: applyAt - 2, out: combineAt - 6 } },
          ]}
        />
      </Fig>

      {/* ── the frame ── */}
      <Ink at={open + 4} dur={12} style={{ left: A_X, top: y(LABEL_Y) }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK }}>df</span>
      </Ink>
      <Header x={A_X} top={y(HEADER_Y)} width={CARD_W} at={open + 6} cols={FRAME_COLS} />
      {ROWS.map((r, i) => {
        const appear = ease(frame, sevenAt - 4 + i * 3, 12);
        // A row dims as its copy lifts off, and comes back when the narration
        // counts the rows that went in.
        const dim = ease(frame, breakAt + i * 4 - 2, 10) * (1 - ease(frame, inAt - 6, 12));
        return (
          <RowCard
            key={r.index}
            row={r}
            height={cardH}
            pose={{ x: A_X - (1 - appear) * 16, top: y(ROW0 + i * RH), opacity: appear * (1 - 0.7 * dim) }}
          />
        );
      })}
      <Note at={inAt - 2} x={A_X} y={y(ROW0 + 7 * RH + 14)}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
          <span style={headline(44)}>7</span>
          <span style={body(28)}>rows in</span>
        </span>
      </Note>

      {/* ── 1. split ── */}
      <Step n={1} text="Split" at={splitAt - 4} x={B_X} top={y(LABEL_Y)} />
      {ROWS.map((r, i) => {
        const p = ease(frame, breakAt + i * 4, 26);
        if (p <= 0) return null;
        const { piece, slot } = pieceOf(r.index);
        const pose = fly(p, [A_X, y(ROW0 + i * RH)], [B_X, y(pieceTop(piece, slot))]);
        return <RowCard key={r.index} row={r} height={cardH} pose={{ ...pose, opacity: spent }} />;
      })}
      {PIECES.map((pc, k) => (
        <Note
          key={pc.dept}
          at={(k === 0 ? engAt : twoAt + (k - 1) * 4) - 2}
          x={B_X - 18}
          y={y(pieceMid(k)) - 15}
          align="right"
          from="right"
          dim={stackedAt - 4}
        >
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>{pc.rows.length} rows</span>
        </Note>
      ))}

      {/* ── 2. apply ── */}
      <Step n={2} text="Apply" at={applyAt - 4} x={BRACKET_X} top={y(LABEL_Y)} />
      {PIECES.map((pc, k) => {
        const at = runsAt + k * 5;
        const b = ease(frame, at, 14);
        const top = y(pieceTop(k, 0)) + 3;
        const bottom = y(pieceBottom(k)) - 3;
        const mid = y(pieceMid(k));
        const chipAt = sumAt + 4 + k * 6;
        const a = ease(frame, chipAt, 12);
        const value = AGG[k];
        const go = ease(frame, stackedAt + k * 5, 24);
        const chipPose =
          go > 0
            ? fly(go, [C_X, mid - cardH / 2], [D_X, y(D_ROW0 + k * RH)], 40)
            : { x: C_X - (1 - a) * 18, top: mid - cardH / 2, opacity: a };
        const engMark = k === 0 ? ease(frame, engSumAt - 2, 12) * (1 - ease(frame, combineAt - 6, 10)) : 0;
        return (
          <React.Fragment key={pc.dept}>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: b > 0 ? spent : 0 }}>
              <path
                d={`M${BRACKET_X - 10},${top} L${BRACKET_X},${top} L${BRACKET_X},${bottom} L${BRACKET_X - 10},${bottom}`}
                fill="none"
                stroke={INK}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray={`${b} 1`}
              />
            </svg>
            <Note at={sumAt - 2 + k * 6} x={(ARROW_X0 + ARROW_X1) / 2} y={mid - 40} from="up" style={{ transform: "translateX(-50%)" }}>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK, opacity: spent }}>sum</span>
            </Note>
            <Arrow from={[ARROW_X0, mid]} to={[ARROW_X1, mid]} at={sumAt + k * 6} opacity={spent} />
            {/* Engineering's answer, while the narration reads it out. */}
            {engMark > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: C_X - 10,
                  top: mid - cardH / 2 - 8,
                  width: 280 * engMark,
                  height: cardH + 16,
                  background: HIGHLIGHT,
                }}
              />
            ) : null}
            {a > 0 ? <KeyCard dept={value.dept} value={value.salary} height={cardH} pose={chipPose} /> : null}
          </React.Fragment>
        );
      })}

      {/* ── 3. combine ── */}
      <Step n={3} text="Combine" at={combineAt - 4} x={D_X} top={y(LABEL_Y)} />
      <Header x={D_X} top={y(D_HEADER)} width={260} at={combineAt} cols={KEY_COLS} />
      <Note at={outAt - 2} x={D_X} y={y(D_ROW0 + 3 * RH + 14)}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
          <span style={headline(44)}>{AGG.length}</span>
          <span style={body(28)}>rows out</span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};
