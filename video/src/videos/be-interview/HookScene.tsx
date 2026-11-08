import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { partOf } from "./data";
import { Drift, Headline, Kicker, Mark, Spot } from "./parts";

/** The list of probes: its left and right edges, each row's top (layout
 *  units, through y()) and step, and the backend row set apart below the
 *  four everyone gets, under the caption they share. Rows are plain text
 *  ruled off by a hairline, not boxes. */
const STACK_X = 96;
const STACK_R = 1250;
const ROW_TOP = 280;
const ROW_STEP = 88;
const CAPTION_Y = 658;
const BACKEND_TOP = 722;
/** The hook's two questions, set level with the capybara's middle, so the
 *  opening page is one centred composition rather than a headline over an
 *  empty half. */
const HOOK_Y = 350;
/** The capybara, right of everything: 360 by 471, under half its 781 by
 *  1022 pixels, so it stays sharp at 4K. */
const CAPY_X = 1370;
const CAPY_TOP = 276;
const CAPY_W = 360;
const CAPY_H = 471;

/** One of the four probes everyone gets: a row of plain text, its name on
 *  the left and the part that answers it right-aligned, over a hairline
 *  that draws in under it as its name is said. */
const Row: React.FC<{ i: number; at: number; name: string; part: React.ReactNode; partColor?: string }> = ({
  i,
  at,
  name,
  part,
  partColor = BLUE_INK,
}) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at - 4, 14);
  if (p <= 0) return null;
  const top = y(ROW_TOP) + i * h(ROW_STEP);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: STACK_X,
          top,
          width: STACK_R - STACK_X,
          height: h(ROW_STEP),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: p,
          transform: `translateY(${(1 - p) * -10}px)`,
        }}
      >
        <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{name}</span>
        <span style={{ ...label(22, partColor), whiteSpace: "nowrap", opacity: ease(frame, at + 10, 12) }}>{part}</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: STACK_X,
          top: top + h(ROW_STEP),
          width: (STACK_R - STACK_X) * ease(frame, at - 2, 18),
          height: 1,
          background: HAIRLINE,
        }}
      />
    </>
  );
};

/**
 * The opening. The two follow-ups the AI page quotes, "Why this approach?"
 * and "What breaks under load?", inked one after the other as the headline,
 * with the capybara, this video's hero, sitting beside them: they are the
 * questions every later part trains for. Then the page's five probes as a
 * ruled list of plain text: the four everyone gets, and the backend one set
 * apart below them, its name under the highlighter's yellow and its four
 * topics as a line of words. Each row carries, small and right-aligned, the
 * part that answers it, so the map of the series starts here: Part 8 on the
 * first three, the Python page (which the series leaves out) on language
 * fundamentals, Parts 1 to 5 on the backend row.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const whyAt = n.word("hook", "Why this approach");
  const breaksAt = n.word("hook", "what breaks under load");
  const backendAt = n.word("hook-more", "Backend interviews");
  const moreAt = n.word("hook-more", "more than they used to");
  const seriesAt = n.word("hook-more", "this series");
  const probeFrom = n.beat("probe").from;
  const groundAt = n.word("probe", "The ground");
  const bands = [
    { name: "Data structures", at: n.word("probe", "data structures") },
    { name: "Algorithms", at: n.word("probe", "and algorithms") },
    { name: "Complexity in Big-O", at: n.word("probe", "complexity in Big-O") },
    { name: "Language fundamentals", at: n.word("probe", "your language's fundamentals") },
  ];
  const liveAt = n.word("probe", "usually in live coding");
  const addAt = n.word("probe", "Backend roles add");
  const topics = [
    { text: "system and API design", at: n.word("probe", "system and API design") },
    { text: "SQL", at: n.word("probe", "SQL") },
    { text: "caching", at: n.word("probe", "caching") },
    { text: "concurrency", at: n.word("probe", "concurrency") },
  ];
  const end = n.beat("probe").to;
  // The hook's words give way to the probes' headline before it inks.
  const hookOut = probeFrom - 12;

  const algorithms = partOf("be-algorithms");
  const backendRow = ease(frame, addAt - 4, 14);
  const backendTop = y(BACKEND_TOP);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={moreAt} level={-35} />
      {bands.map((b) => (
        <Sfx key={b.name} name="el-tap" at={b.at} level={-31} />
      ))}
      <Sfx name="el-tap" at={addAt} level={-31} />
      {topics.map((t) => (
        <Sfx key={t.text} name="el-tap" at={t.at} level={-35} />
      ))}

      <Drift from={from} to={end + 40} scale={0.02}>
        {/* Inked before frame 0, so the video's first frame (its poster) is
            not a blank page. */}
        <Kicker at={-14}>Backend engineer interview questions</Kicker>

        {/* The two follow-ups, one line each, the second in the accent. */}
        <Ink at={whyAt} dur={20} out={hookOut} style={{ left: 92, top: y(HOOK_Y), whiteSpace: "nowrap", ...headline(92) }}>
          Why this approach?
        </Ink>
        <Ink
          at={breaksAt}
          dur={20}
          out={hookOut}
          style={{ left: 92, top: y(HOOK_Y) + 108, whiteSpace: "nowrap", ...headline(92, true), color: ACCENT_INK }}
        >
          What breaks under load?
        </Ink>
        <Ink at={backendAt} dur={16} out={hookOut} style={{ left: 96, top: y(HOOK_Y) + 252, whiteSpace: "nowrap", ...note(30, INK) }}>
          Backend interviews ask them <Mark at={moreAt + 2}>more than they used to.</Mark>
        </Ink>
        <Ink at={seriesAt} dur={16} out={hookOut} style={{ left: 96, top: y(HOOK_Y) + 316, whiteSpace: "nowrap", ...note(30, INK) }}>
          This series is about answering them.
        </Ink>

        <Headline lead="The ground," turn="and what backend adds." at={groundAt} turnAt={addAt} size={62} />

        {/* The capybara is there from the first frame (the video's poster),
            beside the questions, and stays to the cut. */}
        <Spot id="be-interview-capybara" at={-24} left={CAPY_X} top={y(CAPY_TOP)} width={CAPY_W} height={CAPY_H} amp={4} />

        {bands.map((b, i) => (
          <Row
            key={b.name}
            i={i}
            at={b.at}
            name={b.name}
            part={
              i < 3 ? (
                <>
                  Part <Num>{algorithms}</Num>
                </>
              ) : (
                "Python page: not in this series"
              )
            }
            partColor={i < 3 ? BLUE_INK : INK_SOFT}
          />
        ))}
        {/* What the four share: live coding. */}
        <div
          style={{
            position: "absolute",
            left: STACK_X,
            top: y(CAPTION_Y),
            ...note(24, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, liveAt - 2, 12),
          }}
        >
          all four usually in live coding
        </div>

        {/* The backend row, set apart below: its name under the
            highlighter's yellow and its parts on one line, its four topics
            under them as words, each as it is said. */}
        {backendRow > 0 ? (
          <div
            style={{
              position: "absolute",
              left: STACK_X,
              top: backendTop,
              width: STACK_R - STACK_X,
              opacity: backendRow,
              transform: `translateY(${(1 - backendRow) * -10}px)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap", marginLeft: "-0.14em" }}>
                <Mark at={addAt + 2}>Backend roles add</Mark>
              </span>
              <span style={{ ...label(22, BLUE_INK), whiteSpace: "nowrap", opacity: ease(frame, addAt + 12, 12) }}>
                Parts <Num>{partOf("be-system-design")}</Num> to <Num>{partOf("be-concurrency")}</Num>
              </span>
            </div>
            <div style={{ ...note(28, INK), marginTop: 22, whiteSpace: "nowrap" }}>
              {topics.map((t, k) => (
                <span key={t.text} style={{ opacity: ease(frame, t.at - 2, 10) }}>
                  {k ? <span style={{ color: INK_SOFT }}> · </span> : null}
                  {t.text}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Drift>
    </AbsoluteFill>
  );
};
