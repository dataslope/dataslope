import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { inkOf } from "../../theme/brand";
import { BORDER_BOX, BOX, CONTENT_BOX, FILLED, ILLUSTRATIONS, ROW, UNIVERSAL, VIDEO } from "./data";
import { Dim, DimLabel, Fig, Listing, listingHeight, Mono } from "./kit";
import { CODE, column, Column, LINES, LIST_TOP, LIST_W, ROW_X, RowFrame, rowGeometry } from "./row";

const RULE_X = 1180;
const RULE_W = 580;
const RULE_CODE = 28;
const RULE = ["*, *::before, *::after {", `  box-sizing: ${UNIVERSAL.col};`, "}"] as const;
const OK_INK = inkOf.green;

/**
 * Fix, shrink, rule: the same row under border-box. Each 50% now measures to
 * the outer edge, the content gives up the room, and both columns sit on one
 * line, exactly as Chromium laid them out. Then the one rule that sets it
 * for every element.
 */
export const FixScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const layout = useLayout();
  const { y } = layout;
  const g = rowGeometry(layout);

  const start = n.beat("fix").from;
  const bbAt = n.word("fix", "border box");
  const includesAt = n.word("fix", "includes");
  const shrinkAt = n.word("shrink", "content shrinks");
  const twoFiftyAt = n.word("shrink", "two hundred and fifty");
  const exactlyAt = n.word("shrink", "exactly");
  const fitAt = n.word("shrink", "both fit");
  const everyAt = n.word("rule", "every element");
  const topAt = n.word("rule", "top of your stylesheet");
  const onceAt = n.word("rule", "once");
  const seeAt = n.word("rule", "width you see");

  const [cb1, cb2] = g.contentBox;
  const [bb1, bb2] = g.borderBox;
  const [m1, m2] = BORDER_BOX.cols;
  // The content gives up the padding and border's room...
  const shrink = ease(frame, shrinkAt - 2, 18);
  const contentW = cb1.content + (bb1.content - cb1.content) * shrink;
  // ...and the second column comes back: along line 2, then up into line 1.
  const move = ease(frame, exactlyAt - 6, 30);
  const along = interpolate(move, [0, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const up = interpolate(move, [0.5, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x2 = cb2.x + (bb2.x - cb2.x) * along;
  const line2 = cb2.line + (bb2.line - cb2.line) * up;
  const frameH = g.colH * (CONTENT_BOX.lines + (BORDER_BOX.lines - CONTENT_BOX.lines) * up);

  const split = ease(frame, includesAt - 2, 12);
  const halfY = g.top - 26;
  const ruleBottom = y(LIST_TOP) + listingHeight(RULE.length, RULE_CODE);
  const seen = ease(frame, seeAt - 2, 10);
  const art = pop(frame, onceAt - 4, fps, 16);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          With border-box,
        </Ink>
        <Ink
          at={includesAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          width includes padding and border.
        </Ink>
      </div>
      <Fig n="4" at={start - 8} x={ROW_X} y={y(196)}>
        The same row, with <Mono>box-sizing: border-box</Mono>
      </Fig>
      <Listing
        lines={LINES}
        x={ROW_X}
        top={y(LIST_TOP)}
        width={LIST_W}
        size={CODE}
        at={start - 40}
        lineAt={[start - 40, start - 40]}
      />

      {/* The fix, set once at the top of the stylesheet. */}
      <Note at={topAt - 2} x={RULE_X} y={y(LIST_TOP) - 46}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>At the top of the stylesheet</span>
      </Note>
      <Listing
        lines={RULE}
        x={RULE_X}
        top={y(LIST_TOP)}
        width={RULE_W}
        size={RULE_CODE}
        at={bbAt - 8}
        lineAt={[bbAt - 4, bbAt, bbAt - 4]}
        marks={[
          { line: 1, at: bbAt + 6, out: shrinkAt },
          { line: 0, at: everyAt - 2 },
        ]}
      />
      <Note at={everyAt + 4} x={RULE_X} y={ruleBottom + 20}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          Every element gets it, and <Mono>::before</Mono> and <Mono>::after</Mono> too
        </span>
      </Note>

      <RowFrame g={g} height={frameH} opacity={1} />
      <Dim x0={ROW_X} x1={ROW_X + g.width} y={halfY} at={start - 40} out={includesAt - 10}>
        <DimLabel value={String(ROW.width)}>the row</DimLabel>
      </Dim>
      {/* What 50% means now: half the row, to each column's outer edge. */}
      {[bb1, bb2].map((b, i) => (
        <Dim key={i} x0={b.x} x1={b.x + b.w} y={halfY} at={includesAt + 2 + i * 6}>
          <span style={{ padding: "0 6px", background: seen > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${seen * 100}%, transparent)` : undefined }}>
            <DimLabel value={String(BORDER_BOX.cols[i].width)}>
              {ROW.pct}% of the row
            </DimLabel>
          </span>
        </Dim>
      ))}
      <Column
        shape={column(g, cb1.x, g.top, contentW)}
        value={CONTENT_BOX.cols[0].content}
        next={m1.content}
        swapAt={twoFiftyAt - 2}
      />
      <Column
        shape={column(g, x2, g.top + line2 * g.colH, contentW)}
        value={CONTENT_BOX.cols[1].content}
        next={m2.content}
        swapAt={twoFiftyAt - 2}
      />

      {/* Where each column now has to end, until the columns shrink to it. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: split * (1 - ease(frame, shrinkAt + 14, 10)) }}>
        <line
          x1={bb1.x + bb1.w}
          x2={bb1.x + bb1.w}
          y1={halfY + 12}
          y2={g.top + g.colH * CONTENT_BOX.lines + 10}
          stroke={ACCENT}
          strokeWidth={3}
          strokeDasharray="8 5"
        />
      </svg>

      <Dim
        x0={ROW_X}
        x1={ROW_X + g.width}
        y={g.top + g.colH + 26}
        at={fitAt - 2}
        side="below"
        color={OK_INK}
      >
        <DimLabel value={String(FILLED)} color={OK_INK}>
          both columns, on one line
        </DimLabel>
      </Dim>

      <Note at={exactlyAt - 2} x={RULE_X} y={g.top + 20}>
        <div style={{ ...label(22, INK) }}>Each column</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>
          {m1.content} + {2 * BOX.padding} + {2 * BOX.border} = <b style={{ color: INK }}>{m1.width}px</b>
        </div>
      </Note>

      {/* The framed picture again: a box is the size you see it. */}
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="box-sizing-frame"
          style={{
            position: "absolute",
            left: 1500,
            top: y(640),
            width: 230,
            height: 300,
            opacity: art,
            transform: `translateY(${bob(frame, 5, 110) + (1 - art) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
