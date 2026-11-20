import { Bot, FileText, Ticket } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import {
  Arrow,
  Box,
  boundary,
  Clear,
  Cross,
  DATA,
  Disc,
  Drift,
  GOOD_INK,
  BAD_INK,
  Headline,
  InlineArrow,
  Kicker,
  Line,
  Mark,
  POINT_INK,
  type Rect,
  Spot,
  Tag,
  X0,
} from "./parts";

/** The pelican, right of everything: 320 by 479, under half its 684 by 1024
 *  pixels, so it stays sharp at 4K. There from the first frame (the video's
 *  poster) to the cut. */
const BIRD = { left: 1450, top: 300, w: 320, h: 479 };
/** The two panels of hook-hard: their left edges and the rule between. */
const PANEL_A = X0;
const PANEL_B = 720;

/**
 * The opening. The page's design prompt as the headline, and the assistant
 * drawn as it is named: a user's question into the assistant, the company's
 * documents feeding it, the ticket tool beside it, and an answer coming out.
 * Fast and cheap get their ticks (what serving it bought); "any good" gets
 * the yellow question mark. Then why that is hard to measure, as two panels
 * side by side: a classifier's one right label against the assistant's many
 * answers, two good and one wrong. The six questions close it.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const promptAt = n.word("hook", "design prompt");
  const assistantAt = n.word("hook", "an assistant that answers");
  const docsAt = n.word("hook", "company's documents");
  const ticketAt = n.word("hook", "file a support ticket");
  const fastAt = n.word("hook", "fast now");
  const cheapAt = n.word("hook", "cheap");
  const goodAt = n.word("hook", "Is it any good");
  const classAt = n.word("hook-hard", "A classifier");
  const labelAt = n.word("hook-hard", "one right label");
  const thisAt = n.word("hook-hard", "This has many good answers");
  const badAt = n.word("hook-hard", "more bad ones");
  const designAt = n.word("hook-hard", "a design problem");
  const sixAt = n.word("hook-hard", "Six questions");
  const end = n.beat("hook-hard").to;

  // The assistant's diagram, in screen pixels.
  const docs: Rect = { cx: 760, cy: y(372), w: 250, h: 70 };
  const bot: Rect = { cx: 760, cy: y(520), w: 250, h: 76 };
  const tool: Rect = { cx: 1170, cy: y(520), w: 250, h: 76 };
  const askEnd = 524;
  const answerTop = y(624);
  const out = classAt - 8;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={promptAt} level={-36} />
      <Sfx name="el-tap" at={assistantAt + 2} level={-30} />
      <Sfx name="el-tap" at={docsAt + 2} level={-31} />
      <Sfx name="el-tap" at={ticketAt + 2} level={-31} />
      <Sfx name="el-tap" at={fastAt + 2} level={-32} />
      <Sfx name="el-tap" at={cheapAt + 2} level={-32} />
      <Sfx name="el-pop" at={goodAt + 4} level={-30} />
      <Sfx name="el-whoosh" at={classAt - 6} level={-36} />
      <Sfx name="el-tap" at={labelAt + 6} level={-31} />
      <Sfx name="el-tap" at={thisAt + 10} level={-32} />
      <Sfx name="el-scratch" at={badAt + 4} level={-34} />
      <Sfx name="el-chime" at={sixAt + 10} level={-33} />

      <Drift from={0} to={end + 40}>
        {/* Inked before frame 0, so the first frame (the poster) is not a
            blank page. */}
        <Kicker at={-14}>Machine learning engineer interview questions</Kicker>
        <Headline lead="Design an assistant" turn="over our documents." at={promptAt - 4} turnAt={promptAt + 10} size={64} />
        <Spot id="mle-llm-evals-pelican" at={-24} left={BIRD.left} top={y(BIRD.top)} width={BIRD.w} height={BIRD.h} amp={4} />

        {/* The assistant, drawn as it is named. */}
        <Clear at={out}>
          <Line x={X0} y={bot.cy - 18} at={assistantAt} size={26} color={INK_SOFT} weight={500}>
            Can I expense a monitor?
          </Line>
          <Arrow points={[[askEnd, bot.cy], boundary(bot, [0, bot.cy], 8)]} at={assistantAt + 4} />
          <Box r={bot} at={assistantAt + 2} title="Assistant" icon={Bot} />
          <Box r={docs} at={docsAt} title="Documents" icon={FileText} tone="data" />
          <Arrow points={[boundary(docs, [docs.cx, bot.cy], 8), boundary(bot, [bot.cx, docs.cy], 8)]} at={docsAt + 6} color={DATA} />
          <Box r={tool} at={ticketAt + 2} title="File a Ticket" icon={Ticket} />
          <Arrow points={[boundary(bot, [tool.cx, bot.cy], 8), boundary(tool, [bot.cx, tool.cy], 8)]} at={ticketAt + 4} />
          <Arrow points={[[bot.cx, bot.cy + bot.h / 2 + 8], [bot.cx, answerTop - 10]]} at={fastAt - 10} />
          <Line x={bot.cx} width={520} align="center" y={answerTop} at={fastAt - 4} size={26}>
            Yes, up to $300, with a receipt.
          </Line>

          {/* What serving it bought, and what it didn't. */}
          <div style={{ position: "absolute", left: X0, top: y(780), display: "flex", alignItems: "center", gap: 18, fontSize: 28 }}>
            {[
              { at: fastAt, text: "Fast" },
              { at: cheapAt, text: "Cheap" },
            ].map((c) => (
              <span key={c.text} style={{ display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, c.at - 2, 10) }}>
                <Tick at={c.at + 2} size={26} />
                <span style={{ ...note(28, INK), fontWeight: 500 }}>{c.text}</span>
                <span style={{ width: 22 }} />
              </span>
            ))}
            <span style={{ display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, goodAt - 2, 10) }}>
              <span style={{ ...note(28, POINT_INK), fontWeight: 600, width: 26, textAlign: "center" }}>?</span>
              <span style={{ ...note(28, INK), fontWeight: 500 }}>
                <Mark at={goodAt + 4}>Any good</Mark>
              </span>
            </span>
          </div>
        </Clear>

        {/* Why it is hard to measure: one right label, or many answers. */}
        <Line x={PANEL_A} y={y(330)} at={classAt} size={28} weight={600}>
          Classifier
        </Line>
        <Line x={PANEL_A} y={y(330) + 66} at={classAt + 6} size={26}>
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: INK_SOFT }}>An email</span>
            <InlineArrow at={classAt + 10} />
            <Tag at={labelAt} size={26}>
              spam
            </Tag>
            <Tick at={labelAt + 6} size={26} />
          </span>
        </Line>
        <Line x={PANEL_A} y={y(330) + 132} at={labelAt + 2} size={24} color={INK_SOFT}>
          One right label per example
        </Line>

        <ColumnRule x={(PANEL_A + 470 + PANEL_B) / 2} top={y(330)} height={y(560) - y(330)} at={thisAt} />
        <Line x={PANEL_B} y={y(330)} at={thisAt} size={28} weight={600}>
          Assistant
        </Line>
        <Line x={PANEL_B} y={y(330) + 66} at={thisAt + 4} size={26} color={INK_SOFT}>
          Can I expense a monitor?
        </Line>
        {[
          { text: "Yes, up to $300, with a receipt.", ok: true, at: thisAt + 12 },
          { text: "Yes: log it as equipment, $300 at most.", ok: true, at: thisAt + 20 },
          { text: "No, equipment isn't covered.", ok: false, at: badAt },
        ].map((a, i) => (
          <Line key={a.text} x={PANEL_B} y={y(330) + 126 + i * 48} at={a.at} size={26} color={a.ok ? GOOD_INK : BAD_INK}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {a.ok ? <Tick at={a.at + 4} size={24} /> : <Cross at={a.at + 4} size={24} />}
              {a.text}
            </span>
          </Line>
        ))}

        <Line x={PANEL_A} y={y(640)} at={designAt - 6} size={32}>
          Measuring it is <Mark at={designAt + 4}>a design problem</Mark> of its own
        </Line>
        <div style={{ position: "absolute", left: PANEL_A, top: y(740), display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <span style={{ ...note(28, INK), fontWeight: 500, opacity: ease(frame, sixAt - 2, 10) }}>
            Six questions
          </span>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <span key={k} style={{ opacity: ease(frame, sixAt + 4 + k * 3, 8) }}>
              <Disc n={k} size={44} text={26} tone="green" />
            </span>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
