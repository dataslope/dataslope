import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { H, Ink, Note, W } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { BOX, ILLUSTRATIONS, VIDEO } from "./data";
import { BORDER_INK, BoxDrawing, boxAt, CONTENT_INK, Fig, MARGIN_INK, PADDING_INK } from "./kit";

/** Fig. 1 is the box at twice its CSS size. */
const K = 2;
/** The left edge of the margin, and the top of it before `y()`. */
const LEFT = 140;
const TOP = 470;
/** The callouts' text column, and each callout's row before `y()`. */
const LABEL_X = 1010;
const ROWS = { content: 575, padding: 654, border: 733, margin: 808 } as const;

type Layer = keyof typeof ROWS;

/**
 * Hook and layers: one box, drawn to scale from the inside out (content,
 * padding, border, margin), each layer named as the narration names it.
 */
export const LayersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = Math.max(0, n.beat("hook").from - 13);
  const fourAt = n.word("hook", "four layers");
  const at: Record<Layer, number> = {
    content: n.word("layers", "content"),
    padding: n.word("layers", "padding"),
    border: n.word("layers", "border"),
    margin: n.word("layers", "margin"),
  };
  const awayAt = n.word("layers", "keeps other boxes away");

  // The box's content height is any height; its layers are drawn at true
  // scale on all four sides, so only the content stretches with the page.
  const m = BOX.margin * K;
  const shape = boxAt(
    LEFT + m,
    y(TOP) + m,
    BOX.content * K,
    h(BOX.contentHeight * K),
    BOX.padding * K,
    BOX.border * K,
    m,
  );
  const c = shape.content;
  const grow = (layer: Layer) => ease(frame, at[layer] - 4, 16);

  // Where each callout lands: inside its own layer, on the box's right side.
  const right = c.x + c.w;
  const target: Record<Layer, number> = {
    content: right - 64,
    padding: right + shape.padding / 2,
    border: right + shape.padding + shape.border / 2,
    margin: right + shape.padding + shape.border + m / 2,
  };
  const frameArt = pop(frame, open + 10, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>The CSS box model</span>
      </Ink>
      <Ink at={open + 2} dur={20} style={{ left: 92, top: y(150), ...headline(88), whiteSpace: "nowrap" }}>
        Every element is a box,
      </Ink>
      <Ink
        at={fourAt - 6}
        dur={20}
        style={{ left: 92, top: y(242), ...headline(88, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        built in four layers.
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="box-sizing-frame"
          style={{
            position: "absolute",
            left: 1430,
            top: y(92),
            width: 330,
            height: 430,
            opacity: frameArt,
            transform: `translateY(${bob(frame, 5, 110) + (1 - frameArt) * 30}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={fourAt} x={LEFT} y={y(384)}>
        One box, from the inside out
      </Fig>

      <BoxDrawing
        shape={shape}
        content={ease(frame, at.content - 4, 12)}
        padding={grow("padding")}
        border={grow("border")}
        margin={grow("margin")}
      />

      <Callout
        at={at.content}
        x={LABEL_X}
        y={y(ROWS.content)}
        tx={target.content}
        title="Content"
        color={CONTENT_INK}
        text="the text or image itself"
      />
      <Callout
        at={at.padding}
        x={LABEL_X}
        y={y(ROWS.padding)}
        tx={target.padding}
        title="Padding"
        color={PADDING_INK}
        text="space inside, in the box's own background"
      />
      <Callout
        at={at.border}
        x={LABEL_X}
        y={y(ROWS.border)}
        tx={target.border}
        title="Border"
        color={BORDER_INK}
        text="the line around the padding"
      />
      <Callout
        at={at.margin}
        textAt={awayAt - 2}
        x={LABEL_X}
        y={y(ROWS.margin)}
        tx={target.margin}
        title="Margin"
        color={MARGIN_INK}
        text="clear space that keeps other boxes away"
        emphasis
      />
    </AbsoluteFill>
  );
};

/**
 * A layer's name and what it is, with a hairline running left into the
 * layer and ending on a ringed dot, so the dot still shows on the ink border.
 */
const Callout: React.FC<{
  at: number;
  textAt?: number;
  x: number;
  y: number;
  tx: number;
  title: string;
  color: string;
  text: string;
  emphasis?: boolean;
}> = ({ at, textAt, x, y, tx, title, color, text, emphasis }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at + 2, 14);
  if (p <= 0) return null;
  const x0 = x - 18;
  const end = x0 - (x0 - tx) * p;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={x0} x2={end} y1={y} y2={y} stroke={INK} strokeWidth={1.6} />
        <circle cx={tx} cy={y} r={5} fill={INK} stroke={PAPER} strokeWidth={2.5} opacity={ease(frame, at + 12, 6)} />
      </svg>
      <Note at={at} x={x} y={y - 17}>
        <div style={{ ...label(26, color), lineHeight: "34px", whiteSpace: "nowrap" }}>{title}</div>
      </Note>
      <Note at={textAt ?? at + 6} x={x} y={y + 24}>
        <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          {emphasis ? (
            <span style={{ borderBottom: `3px solid ${ACCENT}`, paddingBottom: 2 }}>{text}</span>
          ) : (
            text
          )}
        </div>
      </Note>
    </>
  );
};
