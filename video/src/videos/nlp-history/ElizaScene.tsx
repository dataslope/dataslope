import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, HIGHLIGHT, INK, INK_SOFT } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ELIZA, SECRETARY } from "./data";
import { Headline, Kicker, LISTING_PAPER, Mark, Quote, Spot, Tag } from "./parts";

/** The first rule's two halves: the phrase it spots, and what it reflects. */
const KEY = "I need";

/**
 * Part 5, 1966: Weizenbaum's ELIZA. The course's own version runs its four
 * lines (Fig. 9): the first rule spots "I need", reflects the rest back as a
 * question, and the last line, matching nothing, gets the fallback. No
 * understanding anywhere; and yet his secretary asked him to leave the room.
 * The effect named after it closes the part.
 */
export const ElizaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("eliza").from;
  const wroteAt = n.word("eliza", "wrote");
  const therapistAt = n.word("eliza", "played a therapist");
  const needAt = n.word("rules", "I need");
  const handAt = n.word("rules", "hand it back");
  const questionAt = n.word("rules", "question");
  const noAt = n.word("confided", "no understanding");
  const yetAt = n.word("confided", "Yet");
  const secretaryAt = n.word("confided", "secretary");
  const roomAt = n.word("confided", "leave the room");
  const seeingAt = n.word("effect", "Seeing");
  const effectAt = n.word("effect", "Eliza effect");
  const meanwhileAt = n.word("eliza-out", "Meanwhile");

  // ── Fig. 9, the course's ELIZA, line by line ──
  const PX = 640;
  const PW = 1130;
  const PTOP = y(360);
  const PAD = 30;
  const LINE = 44;
  const PAIR = LINE * 2 + 22;
  const PH = PAD * 2 + ELIZA.length * PAIR - 22;
  const pairAt = (i: number) => (i === 0 ? wroteAt : questionAt + 10 + (i - 1) * 14);
  const panel = ease(frame, from - 2, 14);
  const settle = ease(frame, meanwhileAt - 2, 30);

  const first = ELIZA[0];
  const captured = first.you.slice(KEY.length).trim();
  const reply = first.eliza;
  const at = reply.indexOf(captured);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={from} level={-30} />
      <Sfx name="el-tap" at={wroteAt} level={-30} />
      <Sfx name="el-pencil" at={needAt - 2} level={-34} />
      <Sfx name="el-pencil" at={handAt} level={-34} />
      {ELIZA.slice(1).map((_, i) => (
        <Sfx key={i} name="el-tap" at={pairAt(i + 1)} level={-31} />
      ))}
      <Sfx name="el-pop" at={secretaryAt - 2} level={-35} />
      <Sfx name="el-tap" at={effectAt} level={-28} />

      <Kicker at={from - 6}>1966: Joseph Weizenbaum, MIT</Kicker>
      <Headline at={from} lead="ELIZA" turn={<>played a <Mark at={therapistAt}>therapist.</Mark></>} turnAt={from + 12} out={noAt - 6} />
      <Headline at={noAt - 2} lead="No understanding," turn="and yet." turnAt={yetAt - 2} out={effectAt - 8} />
      <Headline at={effectAt - 4} lead="The ELIZA" turn="effect." turnAt={effectAt + 4} />

      <Spot id="teletype" at={from + 2} left={110} top={y(370)} width={420} height={346} />

      {/* ── Fig. 9 ── */}
      <FigLabel n="9" title="The course's ELIZA: four lines in, four replies out" at={from + 4} x={PX} y={y(290)} />
      <div
        style={{
          position: "absolute",
          left: PX,
          top: PTOP,
          width: PW,
          height: PH,
          background: LISTING_PAPER,
          borderRadius: 10,
          opacity: panel * (1 - settle * 0.3),
          transform: `translateY(${(1 - panel) * 12}px)`,
        }}
      >
        {ELIZA.map((pair, i) => {
          const t = pairAt(i);
          const top = PAD + i * PAIR;
          const isFirst = i === 0;
          const youLine = isFirst ? (
            <>
              <Mark at={needAt - 2}>{KEY}</Mark>{" "}
              <span style={{ color: frame >= handAt ? ACCENT_INK : INK }}>{captured}</span>
            </>
          ) : (
            pair.you
          );
          const elizaLine = isFirst ? (
            <>
              {reply.slice(0, at)}
              <span style={{ color: frame >= handAt ? ACCENT_INK : INK }}>{captured}</span>
              {reply.slice(at + captured.length)}
            </>
          ) : (
            pair.eliza
          );
          return (
            <React.Fragment key={i}>
              <Ink at={t} dur={12} style={{ left: PAD, top, whiteSpace: "pre" }}>
                <div style={{ fontFamily: MONO, fontSize: 30, color: INK_SOFT }}>
                  You:{"   "}
                  <span style={{ color: INK }}>{youLine}</span>
                </div>
              </Ink>
              <Ink at={isFirst ? handAt - 2 : t + 6} dur={14} style={{ left: PAD, top: top + LINE, whiteSpace: "pre" }}>
                <div style={{ fontFamily: MONO, fontSize: 30, color: INK, fontWeight: 600 }}>
                  ELIZA: <span style={{ fontWeight: 400 }}>{elizaLine}</span>
                </div>
              </Ink>
            </React.Fragment>
          );
        })}
      </div>
      {/* The reflected words, carried from the input into the reply. */}
      <Tag x={PX + PW - 24} y={PTOP + PAD + 6} at={handAt + 2} align="right" size={21} color={ACCENT_INK} weight={650} dim={questionAt + 30}>
        reflected back
      </Tag>
      <div
        style={{
          position: "absolute",
          left: PX,
          top: PTOP + PH + 14,
          width: PW,
          height: 4,
          background: ACCENT,
          borderRadius: 2,
          transformOrigin: "0 50%",
          transform: `scaleX(${ease(frame, noAt - 2, 18)})`,
          opacity: 0.9 * (1 - settle * 0.3),
        }}
      />
      <Tag x={PX} y={PTOP + PH + 30} at={noAt} size={23} color={ACCENT_INK} weight={650}>
        just patterns and canned replies
      </Tag>

      {/* The secretary, in his own words. */}
      <Quote
        x={96}
        top={y(740)}
        width={460}
        at={secretaryAt - 2}
        creditAt={roomAt + 4}
        size={32}
        credit="Weizenbaum, Computer Power and Human Reason, 1976"
      >
        &ldquo;{SECRETARY}&rdquo;
      </Quote>
      <div style={{ position: "absolute", left: PX, top: y(840), display: "flex", gap: "0.3em", ...headline(36, true), whiteSpace: "nowrap" }}>
        <Ink at={seeingAt - 2} style={{ position: "relative", color: INK }}>
          Reading real understanding
        </Ink>
        <Ink at={seeingAt + 22} style={{ position: "relative", color: INK }}>
          into a <span style={{ background: HIGHLIGHT, padding: "0 0.1em" }}>simple text trick</span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
