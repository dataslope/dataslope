import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, body, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HERO } from "./data";
import { Drift, Headline, Kicker, OK_INK, Spot, X0 } from "./parts";

/** The hero at most half its pixels, as a 4K render needs: 1373x1022 → 620x462. */
const HERO_W = 620;
const HERO_H = Math.round((HERO_W * HERO.h) / HERO.w);

/**
 * The opening, on Part 2's bridge: a fast query starts with tables shaped
 * for it. The starfish (a block at its center and one on each arm) arrives
 * as the star is named, the two kinds of table are named beside it, and
 * then the round: fifteen questions, ten drawn and five quick.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const startAt = n.word("hook", "A fast query");
  const shapedAt = n.word("hook", "shaped for it");
  const starAt = n.word("hook", "is a star");
  const longAt = n.word("hook", "one long table of events");
  const middleAt = n.word("hook", "in the middle");
  const smallAt = n.word("hook", "small tables");
  const words = [
    { w: "who", at: n.word("hook", "who") },
    { w: "what", at: n.word("hook", "what") },
    { w: "where", at: n.word("hook", "where") },
    { w: "when", at: n.word("hook", "when") },
  ];
  const fifteenAt = n.word("plan", "Fifteen questions");
  const dimAt = n.word("plan", "dimensional modeling");
  const tenAt = n.word("plan", "Ten are worked through");
  const drawnAt = n.word("plan", "tables drawn");
  const fiveAt = n.word("plan", "five quick ones");
  const end = n.beat("plan").to;

  const LIST_Y = 380;
  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={shapedAt} level={-36} />
      <Sfx name="el-pop" at={starAt + 2} level={-32} />
      {words.map((w) => (
        <Sfx key={w.w} name="el-tap" at={w.at} level={-37} />
      ))}
      <Sfx name="el-chime" at={fifteenAt} level={-36} />

      <Drift from={0} to={end + 30}>
        <Kicker at={startAt}>Data engineer interview prep · Data modeling I</Kicker>
        <Headline lead="Tables shaped" turn="for the question." at={startAt + 2} turnAt={shapedAt - 2} size={72} />
        <Spot id={HERO.id} at={starAt - 4} left={1180} top={y(300)} width={HERO_W} height={HERO_H} />

        {/* The star, named beside it. */}
        <Note at={starAt} x={X0} y={y(LIST_Y)}>
          <span style={{ ...body(44), color: INK, whiteSpace: "nowrap" }}>In a warehouse, a star:</span>
        </Note>
        <Note at={longAt} x={X0} y={y(LIST_Y + 80)}>
          <span style={{ display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap" }}>
            <span style={{ width: 30, height: 30, borderRadius: 4, background: BAR, transform: `scale(${pop(frame, longAt, fps, 12)})` }} />
            <span style={{ ...note(30, INK) }}>
              one long table of events
              <span style={{ opacity: ease(frame, middleAt, 10), color: BLUE_INK }}>, in the middle</span>
            </span>
          </span>
        </Note>
        <Note at={smallAt} x={X0} y={y(LIST_Y + 146)}>
          <span style={{ display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap" }}>
            <span style={{ width: 30, display: "flex", justifyContent: "center" }}>
              <span style={{ width: 18, height: 18, borderRadius: 3, border: `3px solid ${BAR}`, background: PAPER }} />
            </span>
            <span style={{ ...note(30, INK) }}>small tables around it, that say</span>
          </span>
        </Note>
        <div style={{ position: "absolute", left: X0 + 48, top: y(LIST_Y + 206), display: "flex", gap: 16 }}>
          {words.map((w) => {
            const p = pop(frame, w.at - 2, fps, 14);
            return (
              <span
                key={w.w}
                style={{
                  ...label(26, BLUE_INK),
                  fontWeight: 700,
                  padding: "4px 16px 6px",
                  border: `2px solid ${BAR}`,
                  borderRadius: 999,
                  background: PAPER,
                  opacity: Math.min(1, p),
                  transform: `scale(${0.7 + 0.3 * Math.min(1, p)})`,
                }}
              >
                {w.w}
              </span>
            );
          })}
        </div>

        {/* The round. */}
        <Note at={fifteenAt - 2} x={X0} y={y(LIST_Y + 330)}>
          <span style={{ ...note(32, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <span style={{ color: BLUE_INK }}>
              <Num>15</Num> questions
            </span>
            <span style={{ opacity: ease(frame, dimAt, 12) }}> on dimensional modeling</span>
          </span>
        </Note>
        <Note at={tenAt - 2} x={X0} y={y(LIST_Y + 392)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>10</Num>
            </b>{" "}
            worked through
            <span style={{ opacity: ease(frame, drawnAt - 2, 10), color: INK_SOFT }}>, tables drawn</span>
          </span>
        </Note>
        <Note at={fiveAt - 2} x={X0 + 470} y={y(LIST_Y + 392)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>
              <Num>5</Num>
            </b>{" "}
            quick ones to close
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
