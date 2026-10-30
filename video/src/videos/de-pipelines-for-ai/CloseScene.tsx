import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HERO, PRACTICE } from "./data";
import { Chip, Drift, Headline, Kicker, OK_INK, Spot, X0 } from "./parts";

/**
 * The close of the series: the three habits every answer came back to, as
 * chips, then the practice the track holds (a concept check on every topic
 * page and the 110-question bank, both counted by check.mjs), with the
 * llama back on the page. No "Next": this is the last part.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("close").from;
  const elevenAt = n.word("close", "Eleven questions");
  const habitsAt = n.word("close", "the same habits under all of them");
  const habits = [
    { text: "load incrementally", at: n.word("close", "load incrementally") },
    { text: "write idempotently", at: n.word("close", "write idempotently") },
    { text: "make a delete really delete", at: n.word("close", "make a delete really delete") },
  ];
  const seriesAt = n.word("close-practice", "That closes the series");
  const practice = [
    { text: `concept checks on every topic page (${PRACTICE.withChecks} of ${PRACTICE.topics})`, at: n.word("close-practice", "Every topic page has concept checks") },
    { text: `${PRACTICE.bank} multiple-choice questions`, at: n.word("close-practice", "a bank of a hundred and ten multiple-choice questions") },
  ];
  const workAt = n.word("close-practice", "which rounds need work");
  const end = n.beat("close-practice").to;

  return (
    <AbsoluteFill>
      {habits.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-35} />
      ))}
      <Sfx name="el-whoosh" at={seriesAt} level={-37} />
      {practice.map((p) => (
        <Sfx key={p.text} name="el-tap" at={p.at} level={-35} />
      ))}
      <Sfx name="el-chime" at={workAt + 4} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>Data engineer interview prep</Kicker>
        <Headline lead="Eleven questions," turn="the same habits." at={elevenAt - 2} turnAt={habitsAt - 2} size={68} />

        {habits.map((c, i) => (
          <Chip key={c.text} x={X0} y={y(320) + i * h(74)} at={c.at - 2} size={30} ink={OK_INK}>
            {c.text}
          </Chip>
        ))}

        <Note at={seriesAt} x={X0} y={y(570)}>
          <span style={{ ...note(30, INK_SOFT), whiteSpace: "nowrap" }}>the end of the Data Engineer series</span>
        </Note>
        <Note at={practice[0].at - 6} x={X0} y={y(640)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700 }}>to practice</span>
        </Note>
        {practice.map((p, i) => (
          <Chip key={p.text} x={X0} y={y(690) + i * h(74)} at={p.at - 2} size={28} ink={BLUE_INK} lit={i === 1 ? workAt : undefined}>
            {p.text}
          </Chip>
        ))}
        <Note at={workAt - 2} x={X0} y={y(860)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap", opacity: 0.4 + 0.6 * ease(frame, workAt, 12) }}>
            to see which rounds need work
          </span>
        </Note>
        <Spot id={HERO.id} at={elevenAt + 6} left={1250} top={y(330)} width={490} height={Math.round((490 * HERO.h) / HERO.w)} />
      </Drift>
    </AbsoluteFill>
  );
};
