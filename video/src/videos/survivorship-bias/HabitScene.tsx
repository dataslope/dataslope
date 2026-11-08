import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { badgeStyle, ColumnRule, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Bridge } from "../sampling/Bridge";
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
/** The hairline between the columns: centred between the end of the longest
 *  row on the left ("The planes that made it home", ~626) and the tint of
 *  the missing column's badges (GONE_X - 22). */
const RULE_X = 692;

/**
 * The habit: every dataset of survivors, and the column it is missing. Ends
 * on the question to ask of any of them.
 */
export const HabitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  // In the merged Unit 5 video the bridge's question is left out (the next
  // part opens by asking it), so the page shows the bridge's statement.
  const merged = useMergedPart();
  const { y } = useLayout();

  const start = n.beat("habit").from;
  const hereAt = n.word("ask", "still here");
  const askAt = n.word("ask", "ask");
  const missingAt = n.word("ask", "missing");
  const whyAt = n.word("ask", "why");
  const nextAt = n.word("far", "how far");
  // The bridge turns from missing data to fair samples: the habit eases back
  // a piece at a time as it is spoken, the table, the drawer, the headline,
  // the question.
  const fairAt = n.word("next", "fair sample");
  const everyoneAt = n.word("next", "drawn from everyone");
  const truthAt = n.word("next", "truth");
  // The question eases back as the next one has been asked, so the page is
  // still settling into its last frame as the voice ends; in the merged
  // video, which never asks it, as the statement ends.
  const beAt = merged ? n.word("next", "exactly") : n.beat("far").to;
  const back = (at: number) => 1 - 0.62 * ease(frame, at, 22);
  const drawerOut = ease(frame, everyoneAt, 24);
  const drawer = pop(frame, start + 4, fps, 16);
  const rowAt = [n.word("habit", "planes"), n.word("habit", "funds"), n.word("habit", "customers")];

  return (
    <AbsoluteFill>
      {/* ── Sound: the drawer, each row, the column of what is missing ── */}
      <Sfx name="el-pop" at={start + 4} level={-30} />
      {rowAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at - 4} level={-29} />
      ))}
      <Sfx name="el-pencil" at={missingAt} level={-34} />

      <Ink at={start - 10} dur={20} style={{ left: 116, top: y(104), ...headline(56), whiteSpace: "nowrap", opacity: back(truthAt) }}>
        Survivors make a biased sample.
      </Ink>

      <div style={{ position: "absolute", inset: 0, opacity: back(fairAt) }}>
        {/* Column heads. */}
        <Ink at={start - 2} dur={14} style={{ left: HERE_X, top: y(222) }}>
          <span
            style={{
              ...label(24, INK),
              padding: "2px 8px",
              marginLeft: -8,
              background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(ease(frame, hereAt - 2, 10) * 100)}%, transparent)`,
            }}
          >
            In the data
          </span>
        </Ink>
        <Ink at={missingAt - 4} dur={14} style={{ left: GONE_X, top: y(222) }}>
          <span style={label(24, ACCENT_INK)}>Missing from it</span>
        </Ink>

        {ROWS.map((r, i) => {
          const at = rowAt[i];
          return (
            <React.Fragment key={r.key}>
              <Ink at={at - 4} dur={16} style={{ left: HERE_X, top: y(ROW_Y(i)) }}>
                <span style={{ ...body(40), color: INK, whiteSpace: "nowrap" }}>{r.here}</span>
              </Ink>
              {/* What is missing, as a gray house badge: its text in the soft
                  ink and on a lighter tint than a badge's, for something absent
                  (the dashed outline it had says this no more). */}
              <Ink at={missingAt + i * 5} dur={16} style={{ left: GONE_X - 22, top: y(ROW_Y(i)) - 6 }}>
                <span
                  style={{
                    ...body(40, true),
                    ...badgeStyle("gray", 40),
                    fontWeight: 400,
                    color: INK_SOFT,
                    background: "color-mix(in srgb, var(--ds-gray-400) 13%, transparent)",
                  }}
                >
                  {r.gone}
                </span>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* The two columns, side by side: a hairline in the gap, from the
            heads to the last row, inking in with the column it introduces. */}
        <ColumnRule x={RULE_X} top={y(224)} height={y(ROW_Y(ROWS.length - 1)) + 50 - y(224)} at={missingAt - 4} />

      </div>

      {/* The question, in two inks. */}
      <div style={{ position: "absolute", left: 116, top: y(728), display: "flex", gap: "0.26em", ...headline(84), opacity: back(beAt) }}>
        <Ink at={askAt - 2} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Ask what's missing,
        </Ink>
        <Ink at={whyAt - 4} dur={16} style={{ position: "relative", ...headline(84, true), color: INK, whiteSpace: "nowrap" }}>
          and why.
        </Ink>
      </div>

      <Bridge
        x={120}
        y={y(850)}
        width={1000}
        next={{ at: nextAt, text: "how far a fair sample can miss." }}
        merged={[{ at: fairAt - 4, text: "Even a fair sample won't hit the truth exactly." }]}
      />

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
            opacity: drawer * (1 - drawerOut),
            transform: `translateY(${(1 - drawer) * 40 + drawerOut * 24 + bob(frame, 5, 130)}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
