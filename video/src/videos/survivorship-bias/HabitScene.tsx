import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { useMergedPart } from "../sampling/merged";
import { ILLUSTRATIONS, VIDEO } from "./data";

const ROWS = [
  { key: "planes", here: "The planes that made it home", gone: "the planes that went down" },
  { key: "funds", here: "The funds still open", gone: "the funds that closed" },
  { key: "customers", here: "The customers who stayed", gone: "the customers who left" },
] as const;
const ROW_Y = (i: number) => 330 + i * 126;
const HERE_X = 120;
const GONE_X = 780;

/**
 * The habit: every dataset of survivors, and the column it is missing. Ends
 * on the question to ask of any of them.
 */
export const HabitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  // In the merged Unit 5 video the spoken bridge leads straight on: no "Next" line.
  const merged = useMergedPart();
  const { y } = useLayout();

  const start = n.beat("habit").from;
  const hereAt = n.word("ask", "still here");
  const askAt = n.word("ask", "ask");
  const missingAt = n.word("ask", "missing");
  const whyAt = n.word("ask", "why");
  const nextAt = n.word("next", "how far");
  const drawer = pop(frame, start + 4, fps, 16);
  const rowAt = [n.word("habit", "planes"), n.word("habit", "funds"), n.word("habit", "customers")];

  return (
    <AbsoluteFill>
      <Ink at={start - 10} dur={20} style={{ left: 116, top: y(104), ...headline(56), whiteSpace: "nowrap" }}>
        Survivors make a biased sample.
      </Ink>

      {/* Column heads. */}
      <Ink at={start - 2} dur={14} style={{ left: HERE_X, top: y(222) }}>
        <span
          style={{
            ...label(22, INK),
            padding: "2px 8px",
            marginLeft: -8,
            background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(ease(frame, hereAt - 2, 10) * 100)}%, transparent)`,
          }}
        >
          In the data
        </span>
      </Ink>
      <Ink at={missingAt - 4} dur={14} style={{ left: GONE_X, top: y(222) }}>
        <span style={label(22, ACCENT_INK)}>Missing from it</span>
      </Ink>

      {ROWS.map((r, i) => {
        const at = rowAt[i];
        return (
          <React.Fragment key={r.key}>
            <Ink at={at - 4} dur={16} style={{ left: HERE_X, top: y(ROW_Y(i)) }}>
              <span style={{ ...body(40), color: INK, whiteSpace: "nowrap" }}>{r.here}</span>
            </Ink>
            <Ink at={missingAt + i * 5} dur={16} style={{ left: GONE_X - 16, top: y(ROW_Y(i)) - 8 }}>
              <span
                style={{
                  ...body(40, true),
                  color: INK_SOFT,
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  padding: "4px 14px 8px",
                  border: `1.6px dashed ${INK_SOFT}`,
                  borderRadius: 4,
                }}
              >
                {r.gone}
              </span>
            </Ink>
          </React.Fragment>
        );
      })}

      {/* The question, in two inks. */}
      <div style={{ position: "absolute", left: 116, top: y(728), display: "flex", gap: "0.26em", ...headline(84) }}>
        <Ink at={askAt - 2} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Ask what's missing,
        </Ink>
        <Ink at={whyAt - 4} dur={16} style={{ position: "relative", ...headline(84, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          and why.
        </Ink>
      </div>

      {merged ? null : (
        <NextLine at={nextAt} x={120} y={y(850)} width={1000}>
          how far a fair sample can miss.
        </NextLine>
      )}

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="survivorship-bias-drawer"
          style={{
            position: "absolute",
            left: 1440,
            top: y(232),
            width: 340,
            height: 483,
            opacity: drawer,
            transform: `translateY(${(1 - drawer) * 40 + bob(frame, 5, 130)}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
