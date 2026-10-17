import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, HIGHLIGHT, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { BOX, BROWSER, TERMS, TERMS_SUM } from "./data";
import {
  BORDER_INK,
  BoxDrawing,
  boxAt,
  CONTENT_INK,
  Dim,
  DimLabel,
  Fig,
  Listing,
  listingHeight,
  Mono,
  outer,
  PADDING_INK,
} from "./kit";

/** Fig. 2 is the box at twice its CSS size, on the right of the listing. */
const K = 2;
const BOX_X = 1000;
const BOX_TOP = 330;
const LIST_X = 120;
const LIST_TOP = 290;
const LIST_W = 690;
const CODE = 30;
const LINES = [
  ".box {",
  `  width: ${BOX.width}px;`,
  `  padding: ${BOX.padding}px;`,
  `  border: ${BOX.border}px solid;`,
  `  /* box-sizing: ${BOX.boxSizing} */`,
  "}",
] as const;

/** The space either side of every sign in the sum. The terms flow at their own
 *  widths, so a three-digit number gets the same room as a one-digit one. */
const SUM_GAP = 22;

const LAYER_INK = { border: BORDER_INK, padding: PADDING_INK, content: CONTENT_INK } as const;

/**
 * Ask, default, sum: the listing's three numbers, the box they draw under the
 * default content-box, and the sum across it that the browser agrees with.
 */
export const SumScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const start = n.beat("ask").from;
  const widthAt = n.word("ask", "three hundred pixels");
  const padAt = n.word("ask", "twenty pixels");
  const borderAt = n.word("ask", "five pixel border");
  const defaultAt = n.word("default", "By default");
  const contentBoxAt = n.word("default", "content box");
  const onlyAt = n.word("default", "only the content");
  const sidePadAt = n.word("default", "padding");
  const sideBorderAt = n.word("default", "border");
  const termAt = [
    n.word("sum", "Five", { nth: 1 }),
    n.word("sum", "twenty", { nth: 1 }),
    n.word("sum", "three hundred", { nth: 1 }),
    n.word("sum", "twenty", { nth: 2 }),
    n.word("sum", "five", { nth: 2 }),
  ];
  const totalAt = n.word("sum", "three hundred and fifty");

  const shape = boxAt(BOX_X, y(BOX_TOP), BOX.content * K, h(BOX.contentHeight * K), BOX.padding * K, BOX.border * K);
  const o = outer(shape);
  const c = shape.content;
  const listBottom = y(LIST_TOP) + listingHeight(LINES.length, CODE);

  // Left to right across the box: the strip each term of the sum measures.
  const edges = [o.x, o.x + shape.border, c.x, c.x + c.w, c.x + c.w + shape.padding, o.x + o.w];
  const strips = TERMS.map((_, i) => ({ x0: edges[i], x1: edges[i + 1] }));
  // The term being read out, from its word until the next one's.
  const reading = termAt.findLastIndex((t) => frame >= t - 3);
  const readingOn = reading >= 0 && frame < totalAt - 2;
  // "added on both sides": the padding, then the border, on the left and right.
  const sides = (which: "padding" | "border") =>
    ease(frame, (which === "padding" ? sidePadAt : sideBorderAt) - 2, 8) * (1 - ease(frame, termAt[0] - 8, 8));

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Ask for {BOX.width} pixels,
        </Ink>
        <Ink
          at={totalAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          get {BOX.rendered}.
        </Ink>
      </div>
      <Fig n="2" at={start - 8} x={LIST_X} y={y(196)}>
        One box under <Mono>box-sizing: content-box</Mono>, the default
      </Fig>

      <Listing
        lines={LINES}
        x={LIST_X}
        top={y(LIST_TOP)}
        width={LIST_W}
        size={CODE}
        at={start - 4}
        lineAt={[start, widthAt - 2, padAt - 2, borderAt - 2, defaultAt - 2, start]}
        marks={[
          { line: 4, at: contentBoxAt - 2, out: termAt[0] - 6 },
          { line: 1, at: onlyAt - 2, out: termAt[0] - 6 },
        ]}
      />

      <BoxDrawing
        shape={shape}
        content={ease(frame, widthAt - 4, 12)}
        padding={ease(frame, padAt - 4, 14)}
        border={ease(frame, borderAt - 4, 14)}
      >
        <span style={{ ...note(22, CONTENT_INK), fontWeight: 600 }}>content</span>
      </BoxDrawing>

      {/* Padding and border on both sides, then each strip as it is read. */}
      {(["padding", "border"] as const).map((which) => {
        const s = sides(which);
        if (s <= 0) return null;
        const pairs = which === "padding" ? [strips[1], strips[3]] : [strips[0], strips[4]];
        return pairs.map((st, i) => (
          <div
            key={`${which}${i}`}
            style={{
              position: "absolute",
              left: st.x0 - (which === "border" ? 3 : 0),
              width: st.x1 - st.x0 + (which === "border" ? 6 : 0),
              top: o.y - 14,
              height: o.h + 28,
              background: HIGHLIGHT,
              mixBlendMode: "multiply",
              opacity: s * 0.85,
            }}
          />
        ));
      })}
      {readingOn ? (
        <div
          style={{
            position: "absolute",
            left: strips[reading].x0 - (reading === 0 || reading === 4 ? 3 : 0),
            width: strips[reading].x1 - strips[reading].x0 + (reading === 0 || reading === 4 ? 6 : 0),
            top: o.y - 14,
            height: o.h + 28,
            background: HIGHLIGHT,
            mixBlendMode: "multiply",
            opacity: ease(frame, termAt[reading] - 3, 5) * 0.85,
          }}
        />
      ) : null}

      <Dim x0={c.x} x1={c.x + c.w} y={o.y - 26} at={onlyAt - 2}>
        <DimLabel value={String(BOX.content)} color={CONTENT_INK}>
          the content only
        </DimLabel>
      </Dim>
      <Dim x0={o.x} x1={o.x + o.w} y={o.y + o.h + 26} at={totalAt - 4} side="below" color={ACCENT_INK}>
        <DimLabel value={String(BOX.rendered)} color={ACCENT_INK} size={26}>
          the box as drawn
        </DimLabel>
      </Dim>

      {/* The sum, term by term in the layer's own ink, under the box. */}
      <div
        style={{ position: "absolute", left: o.x, top: y(730), display: "flex", alignItems: "baseline", gap: SUM_GAP }}
      >
        {TERMS.map((t, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <Op at={termAt[i] - 4} text="+" /> : null}
            <Term at={termAt[i] - 3} value={t.value} color={LAYER_INK[t.layer]} sub={t.layer} />
          </React.Fragment>
        ))}
        <Op at={totalAt - 4} text="=" />
        <Term at={totalAt - 2} value={TERMS_SUM} color={ACCENT_INK} sub="the box" />
      </div>

      <Note at={totalAt + 8} x={LIST_X} y={listBottom + 34} from="up">
        <div style={{ ...note(21, INK_SOFT), width: LIST_W }}>
          Read back in {BROWSER}: <Mono>getBoundingClientRect()</Mono> gives {BOX.rendered}, a child filling the content
          box gives {BOX.content}.
        </div>
      </Note>
    </AbsoluteFill>
  );
};

/** One number of the sum, with the layer it measures under it. */
const Term: React.FC<{ at: number; value: number; color: string; sub: string }> = ({ at, value, color, sub }) => (
  <Ink
    at={at}
    dur={12}
    style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}
  >
    <span style={{ ...headline(56), color, fontVariantNumeric: "tabular-nums lining-nums" }}>{value}</span>
    <span style={{ ...note(20, INK_SOFT), marginTop: 10 }}>{sub}</span>
  </Ink>
);

const Op: React.FC<{ at: number; text: string }> = ({ at, text }) => (
  <Ink at={at} dur={10} style={{ position: "relative" }}>
    <span style={{ ...headline(48), color: INK, opacity: 0.7 }}>{text}</span>
  </Ink>
);
