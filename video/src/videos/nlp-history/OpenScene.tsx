import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { IDEAS, NOW, storyYear } from "./data";
import { DATA, DATA_INK, drift, Headline, Mark, pulse, Svg } from "./parts";
import { TimelineAxis, tx, YearDot } from "./timeline";

/** An idea from the course as a card on the timeline: its year over its
 *  name, dropping onto its dot with a stem down to it. */
const IdeaCard: React.FC<{
  year: number;
  text: React.ReactNode;
  top: number;
  axis: number;
  at: number;
  swell?: number;
  dim?: number;
}> = ({ year, text, top, axis, at, swell = 0, dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 15));
  const stem = ease(frame, at + 6, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0.001) return null;
  const x = tx(year);
  const H = 78;
  return (
    <>
      <Svg opacity={1 - d}>
        <line x1={x} x2={x} y1={top + H} y2={top + H + (axis - top - H) * stem} stroke={HAIRLINE} strokeWidth={1.6} />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: x - 20,
          top,
          height: H,
          boxSizing: "border-box",
          padding: "8px 18px",
          border: `2px solid ${DATA}`,
          borderRadius: 10,
          background: PAPER,
          opacity: p * (1 - d),
          transform: `translateY(${(1 - p) * -28}px) scale(${1 + swell * 0.05})`,
          transformOrigin: "20px 100%",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ ...label(21, DATA_INK), fontWeight: 700, ...TABULAR }}>{year}</div>
        <div style={{ ...label(25, INK), fontWeight: 600, marginTop: 2 }}>{text}</div>
      </div>
    </>
  );
};

/** A bracket under the axis from one year to another, with its span in years
 *  written beneath, drawing on `at` and its number inking on `numAt`. */
const Span: React.FC<{ from: number; to: number; y: number; at: number; numAt: number; dim?: number }> = ({ from, to, y, at, numAt, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const t = ease(frame, numAt, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0) return null;
  const x0 = tx(from);
  const x1 = tx(to);
  const xe = x1 - (x1 - x0) * p;
  return (
    <>
      <Svg opacity={1 - d}>
        <path d={`M${x1},${y - 12} L${x1},${y} L${xe},${y} ${p >= 1 ? `L${x0},${y - 12}` : ""}`} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: (x0 + x1) / 2,
          top: y + 12,
          transform: `translate(-50%, ${(1 - t) * 6}px)`,
          opacity: t * (1 - d),
          ...note(25, INK),
          fontWeight: 600,
          background: PAPER,
          padding: "0 10px",
        }}
      >
        {to - from} years
      </div>
    </>
  );
};

/**
 * The opening, on Unit 4's bridge: three of the course's ideas land on a
 * timeline at the years they appeared (Fig. 1), today is marked, and the
 * youngest and oldest are measured against it. Then the figure leans in on
 * the oldest, where the story starts.
 */
export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const countingAt = n.word("hook", "Counting");
  const guessingAt = n.word("hook", "Guessing");
  const rareAt = n.word("hook", "Giving rare words");
  const olderAt = n.word("hook", "much older");
  const weightAt = n.word("hook", "extra weight");
  const theseAt = n.word("hook", "These ideas");
  const lookAt = n.word("hook", "look");
  const youngestAt = n.word("age", "youngest");
  const fiftyAt = n.word("age", "over fifty");
  const oldestAt = n.word("age", "oldest");
  const hundredAt = n.word("age", "over ninety");
  const soAt = n.word("order", "So");
  const firstAt = n.word("order", "oldest first");

  const AXIS = y(640);
  const TIER_A = y(410);
  const TIER_B = y(500);
  const cards = [
    { ...IDEAS[0], at: countingAt - 2, top: TIER_A },
    { ...IDEAS[1], at: guessingAt - 2, top: TIER_B },
    { ...IDEAS[2], at: rareAt - 2, top: TIER_A },
  ];
  const zipfYear = storyYear("zipf");
  const youngest = storyYear("sparck");

  // The figure leans in on the oldest card as the story turns to it.
  const zoom = ease(frame, firstAt - 4, 70);
  const lean = drift(frame, lookAt + 10, 1, 240);

  return (
    <AbsoluteFill>
      {/* ── Sound: the axis, the three cards landing, the spans, the turn ── */}
      <Sfx name="el-pencil" at={hookFrom} level={-35} />
      <Sfx name="el-pop" at={countingAt - 2} level={-30} />
      <Sfx name="el-pop" at={guessingAt - 2} level={-30} />
      <Sfx name="el-pop" at={rareAt - 2} level={-30} />
      <Sfx name="el-tap" at={youngestAt - 4} level={-29} />
      <Sfx name="el-pencil" at={youngestAt} level={-35} />
      <Sfx name="el-tap" at={fiftyAt} level={-28} />
      <Sfx name="el-pencil" at={oldestAt} level={-35} />
      <Sfx name="el-tap" at={hundredAt} level={-28} />
      <Sfx name="el-whoosh" at={firstAt - 4} level={-34} />

      <Headline
        at={theseAt - 2}
        lead="Older than"
        turn={<Mark at={lookAt}>they look.</Mark>}
        turnAt={olderAt + 6}
      />

      <FigLabel n="1" title="Three ideas from this course, by the year they appeared" at={hookFrom - 2} x={96} y={y(290)} />
      <AbsoluteFill
        style={{
          transform: `translateX(${-lean * 14}px) scale(${1 + zoom * 0.06})`,
          transformOrigin: `${tx(zipfYear)}px ${AXIS}px`,
        }}
      >
        <TimelineAxis y={AXIS} at={hookFrom} todayAt={youngestAt - 4} />
        {cards.map((c) => {
          const year = storyYear(c.story);
          const isOldest = c.story === "zipf";
          return (
            <React.Fragment key={c.story}>
              <YearDot
                year={year}
                y={AXIS}
                at={c.at + 8}
                color={DATA}
                swell={isOldest ? pulse(frame, firstAt - 2, 24) : 0}
              />
              <IdeaCard
                year={year}
                text={isOldest ? <Mark at={firstAt}>{c.text}</Mark> : c.text}
                top={c.top}
                axis={AXIS}
                at={c.at}
                swell={isOldest ? pulse(frame, firstAt - 2, 24) : c.story === "sparck" ? pulse(frame, weightAt - 2, 22) : 0}
                dim={isOldest ? undefined : soAt - 2}
              />
            </React.Fragment>
          );
        })}
        <Span from={youngest} to={NOW} y={y(730)} at={youngestAt} numAt={fiftyAt - 2} dim={soAt - 2} />
        <Span from={zipfYear} to={NOW} y={y(820)} at={oldestAt} numAt={hundredAt - 2} dim={soAt - 2} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
