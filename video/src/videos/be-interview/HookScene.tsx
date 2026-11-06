import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { partOf } from "./data";
import { Chip, Drift, Headline, Kicker, Mark, Spot } from "./parts";

/** The stack of probes: its left and right edges, each band's top (layout
 *  units, through y()), height and step, and the backend band set apart
 *  below the four everyone gets, under the caption they share. */
const STACK_X = 96;
const STACK_R = 1250;
const BAND_TOP = 280;
const BAND_H = 74;
const BAND_STEP = 88;
const CAPTION_Y = 630;
const BACKEND_TOP = 680;
const BACKEND_H = 150;
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

/** One of the four probes everyone gets: a blue band, its name on the left
 *  and the part that answers it on the right, inked as its name is said. */
const Band: React.FC<{ i: number; at: number; name: string; part: React.ReactNode; partColor?: string }> = ({
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
  return (
    <div
      style={{
        position: "absolute",
        left: STACK_X,
        top: y(BAND_TOP) + i * h(BAND_STEP),
        width: STACK_R - STACK_X,
        height: h(BAND_H),
        boxSizing: "border-box",
        border: `1.5px solid ${BAR}`,
        borderRadius: 12,
        background: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        opacity: p,
        transform: `translateY(${(1 - p) * -12}px)`,
      }}
    >
      <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{name}</span>
      <span style={{ ...label(22, partColor), whiteSpace: "nowrap", opacity: ease(frame, at + 10, 12) }}>{part}</span>
    </div>
  );
};

/**
 * The opening. The two follow-ups the AI page quotes, "Why this approach?"
 * and "What breaks under load?", inked one after the other as the headline,
 * with the capybara, this video's hero, sitting beside them: they are the
 * questions every later part trains for. Then the page's five probes as a
 * stack of bands, the four everyone gets in blue and the backend one below
 * them, set apart in yellow, its four topics as chips. Each band carries,
 * small, the part that answers it, so the map of the series starts here:
 * Part 8 on the first three, the Python page (which the series leaves out)
 * on language fundamentals, Parts 1 to 5 on the backend band.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

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
  const chips = [
    { text: "system and API design", at: n.word("probe", "system and API design") },
    { text: "SQL", at: n.word("probe", "SQL") },
    { text: "caching", at: n.word("probe", "caching") },
    { text: "concurrency", at: n.word("probe", "concurrency") },
  ];
  const end = n.beat("probe").to;
  // The hook's words give way to the probes' headline before it inks.
  const hookOut = probeFrom - 12;

  const algorithms = partOf("be-algorithms");
  const backendBand = ease(frame, addAt - 4, 14);
  const backendTop = y(BACKEND_TOP);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={moreAt} level={-35} />
      {bands.map((b) => (
        <Sfx key={b.name} name="el-tap" at={b.at} level={-31} />
      ))}
      <Sfx name="el-tap" at={addAt} level={-31} />
      {chips.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-35} />
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
        <Ink at={seriesAt} dur={16} out={hookOut} style={{ left: 96, top: y(HOOK_Y) + 302, whiteSpace: "nowrap", ...note(30, INK) }}>
          This series is about answering them.
        </Ink>

        <Headline lead="The ground," turn="and what backend adds." at={groundAt} turnAt={addAt} size={62} />

        {/* The capybara is there from the first frame (the video's poster),
            beside the questions, and stays to the cut. */}
        <Spot id="be-interview-capybara" at={-24} left={CAPY_X} top={y(CAPY_TOP)} width={CAPY_W} height={CAPY_H} amp={4} />

        {bands.map((b, i) => (
          <Band
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
            left: STACK_X + 28,
            top: y(CAPTION_Y),
            ...note(24, INK_SOFT),
            fontStyle: "italic",
            whiteSpace: "nowrap",
            opacity: ease(frame, liveAt - 2, 12),
          }}
        >
          all four usually in live coding
        </div>

        {/* The backend band, set apart below in the highlighter's yellow:
            its name and parts on one row, its four topics under them. */}
        {backendBand > 0 ? (
          <div
            style={{
              position: "absolute",
              left: STACK_X,
              top: backendTop,
              width: STACK_R - STACK_X,
              height: h(BACKEND_H),
              boxSizing: "border-box",
              border: `1.5px solid ${ds("yellow", 600)}`,
              borderRadius: 12,
              background: `color-mix(in srgb, ${HIGHLIGHT} 40%, ${PAPER})`,
              padding: "18px 28px 0",
              opacity: backendBand,
              transform: `translateY(${(1 - backendBand) * -12}px)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap" }}>Backend roles add</span>
              <span style={{ ...label(22, BLUE_INK), whiteSpace: "nowrap", opacity: ease(frame, addAt + 12, 12) }}>
                Parts <Num>{partOf("be-system-design")}</Num> to <Num>{partOf("be-concurrency")}</Num>
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 22, fontSize: 26 }}>
              {chips.map((c) => (frame >= c.at - 2 ? <Chip key={c.text} at={c.at} size={26}>{c.text}</Chip> : null))}
            </div>
          </div>
        ) : null}

      </Drift>
    </AbsoluteFill>
  );
};
