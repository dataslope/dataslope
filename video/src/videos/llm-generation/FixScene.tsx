import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, INK, INK_SOFT, label, note, PAPER, svgText } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, GOOD, GOOD_INK, Headline, Kicker, Marked, Mono, pulse, Spot, Svg, tint, X0 } from "./kit";

const LEFT_W = 740;
const RIGHT_X = 960;
const ROW_Y = (k: number) => 340 + k * 120;
const ITEM_Y = (k: number) => 330 + k * 96;
/** The lesson's reason under each of the first three fixes ("What actually reduces it"). */
const GLOSS = [
  "the fact is in the context, not the weights",
  "a query you can run beats a number you must trust",
  "a schema leaves no field to invent",
] as const;

/** A round badge: a tick, a cross, or a number. */
const Badge: React.FC<{ kind: "yes" | "no" | number; at: number; x: number; y: number }> = ({ kind, at, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, at, fps, 14);
  if (s <= 0.001) return null;
  const color = kind === "yes" ? GOOD : kind === "no" ? ACCENT : BAR;
  const r = 22;
  return (
    <Svg opacity={Math.min(1, s)}>
      <g transform={`translate(${x}, ${y}) scale(${0.6 + 0.4 * Math.min(1.1, s)})`}>
        <circle r={r} fill={typeof kind === "number" ? tint(BAR, 22) : color} stroke={typeof kind === "number" ? BAR : "none"} strokeWidth={2} />
        {kind === "yes" ? (
          <path d="M-9,1 L-3,8 L10,-7" fill="none" stroke={PAPER} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        ) : kind === "no" ? (
          <path d="M-7,-7 L7,7 M7,-7 L-7,7" fill="none" stroke={PAPER} strokeWidth={4} strokeLinecap="round" />
        ) : (
          <text y={8} textAnchor="middle" style={svgText({ ...label(23, BLUE_INK), fontWeight: 700 })}>
            {kind}
          </text>
        )}
      </g>
    </Svg>
  );
};

/**
 * Hedge, hedge-why, works, exit, ctx-in: why "tell me if you don't know"
 * changes the phrasing and not what is wrong, and the lesson's four fixes in
 * its order, the last its own NOT_FOUND example.
 */
export const FixScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("hedge").from;
  const hedgesAt = n.word("hedge-why", "more hedges");
  const landAt = n.word("hedge-why", "land");
  const alikeAt = n.word("hedge-why", "alike");
  const wrongAt = n.word("hedge-why", "wrong answers");
  const insideAt = n.word("hedge-why", "nothing inside");
  const worksAt = n.word("works", "What works");
  const taskAt = n.word("works", "changing the task");
  const itemAt = [
    n.word("works", "Paste in the source"),
    n.word("works", "Ask for something"),
    n.word("works", "Constrain the shape"),
    n.word("works", "give it an exit"),
  ];
  const eitherAt = n.word("exit", "either way");
  const easyAt = n.word("exit", "easy");
  const pastingAt = n.word("ctx-in", "Pasting in the source");
  const windowAt = n.word("ctx-in", "context window");
  const limitsAt = n.word("ctx-in", "limits");

  const items = [
    <>Paste in the source.</>,
    <>Ask for something you can check.</>,
    <>Constrain the shape.</>,
    <>
      Give it an exit: reply <Mono color={INK}>NOT_FOUND</Mono>.
    </>,
  ];
  const dimLeft = ease(frame, worksAt, 14) * 0.45;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={hedgesAt - 2} level={-31} />
      <Sfx name="el-scratch" at={wrongAt} level={-34} />
      {itemAt.map((t, k) => (
        <Sfx key={k} name="el-tap" at={t - 2} level={-30} />
      ))}
      <Sfx name="el-pencil" at={easyAt - 2} level={-35} />

      <Drift from={start} to={n.beat("window").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Why models hallucinate</Kicker>
      <Headline lead="“Tell me if you don’t know.”" at={start - 4} out={worksAt - 8} />
      <Headline lead="What works:" turn="change the task." at={worksAt - 4} turnAt={taskAt - 2} out={pastingAt - 8} />
      <Headline lead="Pasting in the source" turn="fills the context window." at={pastingAt - 4} turnAt={windowAt - 2} />

      {/* Fig. 10: what the instruction changes, and what it can't. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - dimLeft }}>
        <FigLabel n="10" title="What the instruction gets you" at={hedgesAt - 8} x={X0} y={y(250)} />
        <Badge kind="yes" at={hedgesAt - 2} x={X0 + 22} y={y(ROW_Y(0)) + 22} />
        <Ink at={hedgesAt - 2} dur={14} style={{ left: X0 + 64, top: y(ROW_Y(0)), width: LEFT_W - 64 }}>
          <div style={{ ...body(34), color: INK }}>
            More hedges, like <span style={{ fontStyle: "italic" }}>“I’m not certain.”</span>
          </div>
        </Ink>
        <Badge kind="no" at={wrongAt - 2} x={X0 + 22} y={y(ROW_Y(1)) + 22} />
        <Ink at={landAt - 2} dur={14} style={{ left: X0 + 64, top: y(ROW_Y(1)), width: LEFT_W - 64 }}>
          <div style={{ ...body(34), color: INK }}>
            Hedges that pick out the <span style={{ color: ACCENT_INK }}>wrong answers</span>.
          </div>
        </Ink>
        <Note at={alikeAt - 2} x={X0 + 64} y={y(ROW_Y(1)) + 50} width={LEFT_W - 64}>
          <div style={{ ...body(28, true), color: INK }}>They land on right and wrong answers alike.</div>
        </Note>
        <Note at={insideAt - 2} x={X0 + 64} y={y(ROW_Y(2)) + 4} width={LEFT_W - 64}>
          <div style={{ ...body(30, true), color: INK_SOFT }}>Nothing inside knows which answers are wrong.</div>
        </Note>
      </div>

      {/* The parrot again, hedging away, until the fixes take its place. */}
      <Spot id="llm-generation-parrot" at={start - 2} out={worksAt - 14} left={1380} top={y(300)} width={400} height={h(440)} />

      {/* Fig. 11: what reduces it, the lesson's four in its order. */}
      <FigLabel n="11" title="What reduces it" at={worksAt - 2} x={RIGHT_X} y={y(250)} />
      {items.map((it, k) => {
        const swell = k === 0 ? pulse(frame, pastingAt - 2, 22) : 0;
        return (
          <React.Fragment key={k}>
            <Badge kind={k + 1} at={itemAt[k] - 4} x={RIGHT_X + 22} y={y(ITEM_Y(k)) + 22} />
            <Ink at={itemAt[k] - 2} dur={14} style={{ left: RIGHT_X + 64, top: y(ITEM_Y(k)), width: 800 }}>
              <div style={{ ...body(34), color: INK, whiteSpace: "nowrap", transform: `scale(${1 + swell * 0.05})`, transformOrigin: "0 50%" }}>
                {k === 3 ? (
                  <Marked at={eitherAt - 2} out={pastingAt - 4}>
                    {it}
                  </Marked>
                ) : k === 0 ? (
                  <Marked at={pastingAt}>{it}</Marked>
                ) : (
                  it
                )}
              </div>
            </Ink>
            {/* The lesson's reason for each fix, held until the cut. */}
            {k < GLOSS.length ? (
              <Note at={itemAt[k] + 8} x={RIGHT_X + 64} y={y(ITEM_Y(k)) + 48}>
                <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>{GLOSS[k]}</span>
              </Note>
            ) : null}
          </React.Fragment>
        );
      })}
      <Note at={easyAt - 2} x={RIGHT_X + 64} y={y(ITEM_Y(4)) + 6} width={760}>
        <div style={{ ...body(30, true), color: GOOD_INK }}>An easy, honest continuation to pick instead.</div>
      </Note>
      <Note at={limitsAt - 2} x={RIGHT_X + 64} y={y(ITEM_Y(5)) + 6} width={760}>
        <div style={{ ...body(30, true), color: ACCENT_INK }}>And the window has limits of its own.</div>
      </Note>
      </Drift>
    </AbsoluteFill>
  );
};
