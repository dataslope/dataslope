import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, headline, INK, INK_SOFT } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { FIRST_DDL_LINE } from "./data";
import { Kicker, Spot, Strike, Underline } from "./parts";

/**
 * Part 1 opens on Unit 7's bridge: the rules are half of design, a process is
 * the other half, for applying them (Part 2) and for changing a live design
 * (Part 3). Then the store that wants a database, the table typed straight
 * away as a first guess, and (in StepsLayer, beside this) the eight steps.
 */
export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const openFrom = n.beat("open").from;
  const otherAt = n.word("open", "other half");
  const applyingAt = n.word("open", "applying");
  const changingAt = n.word("open", "changing");
  const liveAt = n.word("open", "live");
  const storeAt = n.word("guess", "online store");
  const typingAt = n.word("guess", "typing");
  const guessAt = n.word("guess", "first guess");
  const insteadAt = n.word("steps", "Instead");

  // The table typed straight away: the lesson's own first line, a key at a time.
  const typed = Math.floor(Math.max(0, Math.min(1, (frame - typingAt + 2) / 26)) * FIRST_DDL_LINE.length);
  const shown = FIRST_DDL_LINE.slice(0, typed);
  const caret = frame >= typingAt - 2 && frame < guessAt + 4 && Math.floor(frame / 8) % 2 === 0;
  // "Instead": the first guess steps back while the steps build.
  const back = 1 - ease(frame, insteadAt - 4, 18) * 0.7;

  const halves = [
    { at: applyingAt, text: "applying the rules" },
    { at: changingAt, text: "changing a live design" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={applyingAt - 4} level={-35} />
      <Sfx name="el-pencil" at={changingAt - 4} level={-35} />
      <Sfx name="el-pop" at={storeAt - 2} level={-30} />
      <Sfx name="el-tap" at={typingAt} level={-30} />
      <Sfx name="el-scratch" at={guessAt} level={-30} />

      <Kicker at={openFrom - 10}>The design process</Kicker>
      <Ink at={openFrom - 8} dur={20} style={{ left: 92, top: y(150), ...headline(72), whiteSpace: "nowrap" }}>
        The rules get you halfway.
      </Ink>
      <Ink at={otherAt - 4} dur={20} style={{ left: 92, top: y(236), ...headline(72, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
        The other half is a process,
      </Ink>
      {halves.map((h, i) => (
        <Ink key={h.text} at={h.at - 4} dur={16} style={{ left: 96, top: y(350 + i * 52), display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap" }}>
          <span style={{ width: 34, height: 2, background: HAIRLINE, display: "inline-block" }} />
          <span style={{ ...body(34, true), color: INK }}>
            for{" "}
            {i === 1 ? (
              <>
                changing a <Underline at={liveAt - 2}>live</Underline> design
              </>
            ) : (
              h.text
            )}
          </span>
        </Ink>
      ))}

      <div style={{ position: "absolute", inset: 0, opacity: back }}>
        <Spot id="db-designing-schemas-goods" at={storeAt - 4} left={110} top={y(500)} width={330} height={330} />
        {frame >= typingAt - 6 ? (
          <div
            style={{
              position: "absolute",
              left: 480,
              top: y(590),
              padding: "14px 22px",
              borderTop: `2px solid ${INK}`,
              borderBottom: `1px solid ${HAIRLINE}`,
              background: `color-mix(in srgb, ${ds("yellow", 200)} 34%, transparent)`,
              opacity: ease(frame, typingAt - 6, 10),
              fontFamily: MONO,
              fontSize: 30,
              whiteSpace: "pre",
              minWidth: 470,
            }}
          >
            <Strike at={guessAt} top="0.5em">
              <span>
                <span style={{ color: ds("purple", 700), fontWeight: 700 }}>{shown.slice(0, 12)}</span>
                <span style={{ color: INK }}>{shown.slice(12)}</span>
              </span>
            </Strike>
            <span style={{ display: "inline-block", width: 3, height: "1em", marginLeft: 2, verticalAlign: "-0.12em", background: caret ? INK : "transparent" }} />
          </div>
        ) : null}
        <Ink at={guessAt - 2} dur={16} style={{ left: 484, top: y(690), whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: ACCENT_INK }}>a first guess</span>
        </Ink>
        <Ink at={storeAt - 2} dur={14} style={{ left: 120, top: y(860), whiteSpace: "nowrap" }}>
          <span style={{ ...body(26, true), color: INK_SOFT }}>an online store</span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
