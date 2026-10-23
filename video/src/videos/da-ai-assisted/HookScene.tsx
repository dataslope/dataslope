import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOUNDARY } from "./data";
import { Drift, Headline, Kicker, Listing, listingHeight, Spot, X0 } from "./parts";

const TOP = 330;
const SIZE = 22;
const WIDTH = 880;
/** The line of the assistant's query that carries the bug. */
const BUG_LINE = 3;

/**
 * The opening, in its own figure rather than the earlier parts' tiles or bar:
 * an assistant's January query, with the BETWEEN filter the page describes,
 * arrives line by line as if typed into a chat, then the narration's turn ("whether it's right") puts a question
 * mark against the BETWEEN line that question 3 takes apart. The split of
 * the round is two plain pills under it.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const draftAt = n.word("hook", "draft queries");
  const requestAt = n.word("hook", "a plain request");
  const rightAt = n.word("hook", "whether it's right");
  const nineAt = n.word("plan", "Nine questions");
  const sixAt = n.word("plan", "Six get a full answer");
  const threeAt = n.word("plan", "The last three are short");
  const firstAt = n.word("changed-in", "First");
  const end = n.beat("changed-in").to;

  const lines = BOUNDARY.assistant.lines;
  // Typed in from "draft queries" to "a plain request", one line at a time.
  const lineAt = lines.map((_, i) => draftAt + ((requestAt - draftAt + 10) * i) / lines.length);
  const listH = listingHeight(lines.length, SIZE);
  const bugY = y(TOP) + h(34) + Math.round(SIZE * 0.66) + BUG_LINE * Math.round(SIZE * 1.8);
  const pillsY = y(TOP) + h(34) + listH + h(36);
  const dim = ease(frame, firstAt, 14) * 0.5;

  const pills = [
    { at: sixAt, text: "6 in full", fill: BAR, ink: PAPER },
    { at: threeAt, text: "3 short", fill: ds("blue", 100), ink: INK },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={draftAt} level={-34} />
      <Sfx name="el-scratch" at={rightAt + 2} level={-32} />
      <Sfx name="el-pop" at={sixAt} level={-34} />
      <Sfx name="el-pop" at={threeAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="The assistant writes it." turn="Can you check it?" at={from + 4} turnAt={rightAt - 4} size={68} />

        <Spot id="da-ai-assisted-owl" at={from + 6} left={1150} top={y(290)} width={640} height={460} />

        {/* ── The assistant's reply ── */}
        <div style={{ position: "absolute", left: X0, top: y(TOP), opacity: ease(frame, draftAt - 6, 10) * (1 - dim) }}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>Assistant</span>
        </div>
        <Listing
          lines={lines}
          x={X0}
          top={y(TOP) + h(34)}
          width={WIDTH}
          size={SIZE}
          at={draftAt - 4}
          lineAt={lineAt}
          dim={firstAt}
          marks={[{ line: BUG_LINE, at: rightAt, color: `color-mix(in srgb, ${ds("red", 500)} 22%, transparent)` }]}
        />
        <Note at={rightAt + 4} x={X0 + WIDTH + 20} y={bugY - 4} dim={firstAt}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>right?</span>
        </Note>

        {/* ── Nine questions: six in full, three short ── */}
        <Note at={nineAt - 2} x={X0} y={pillsY} dim={firstAt + 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>9 questions:</span>
        </Note>
        {pills.map((p, i) => {
          const q = ease(frame, p.at - 2, 12);
          return (
            <div
              key={p.text}
              style={{
                position: "absolute",
                left: X0 + 190 + i * 180,
                top: pillsY - 4,
                padding: "6px 18px",
                borderRadius: 999,
                background: p.fill,
                color: p.ink,
                ...label(24, p.ink),
                whiteSpace: "nowrap",
                opacity: q * (1 - ease(frame, firstAt + 4, 14) * 0.5),
                transform: `scale(${0.9 + 0.1 * q})`,
              }}
            >
              {p.text}
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
