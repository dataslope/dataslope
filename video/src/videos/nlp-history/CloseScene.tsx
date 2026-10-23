import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, HIGHLIGHT, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NOW, STORIES, storyYear } from "./data";
import { DATA, DATA_INK, drift, Headline, Mark, pulse, Svg } from "./parts";
import { Stem, TimelineAxis, tx, YearDot } from "./timeline";

/** The four counting ideas the course taught; the rest are the goal and the hype. */
const COUNTING = new Set(["zipf", "shannon", "sparck", "w2v"]);

/** Where each story's label sits above the axis: its tier (1 is lowest) and
 *  which side of its stem it hangs, so no stem runs through another label. */
const PLACE: Record<string, { tier: number; side: "left" | "right" }> = {
  zipf: { tier: 1, side: "left" },
  shannon: { tier: 4, side: "left" },
  turing: { tier: 3, side: "left" },
  georgetown: { tier: 2, side: "left" },
  eliza: { tier: 1, side: "right" },
  sparck: { tier: 1, side: "left" },
  w2v: { tier: 2, side: "left" },
};

/**
 * The close: Fig. 1 returns with all seven stories on it, and the counting
 * thread runs from Zipf to today. Then the lesson's two lists, each line
 * pulsing the year it comes from: what still sits underneath (tokens, IDF,
 * the next-word guess), and the two warnings (a demo is not a system, fluent
 * text is not understanding). The course's last video: no NextLine.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { durationInFrames } = n;
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("close").from;
  const lineAt = n.word("close", "one line");
  const threadAt = n.word("close", "thread");
  const keptAt = n.word("close", "kept");
  const beneathAt = n.word("close", "beneath");
  const vectorsAt = n.word("layers", "Word vectors");
  const tokensAt = n.word("layers", "tokens");
  const searchAt = n.word("layers", "Search");
  const idfAt = n.word("layers", "IDF");
  const modelsAt = n.word("layers", "Language models");
  const nextAt = n.word("layers", "next word");
  const warningsAt = n.word("warnings", "two warnings");
  const demoAt = n.word("warnings", "a demo");
  const fluentAt = n.word("warnings", "fluent text");
  const groundAt = n.word("end", "ground");
  const soAt = n.word("end", "So");
  const behindAt = n.word("end", "left behind");

  const AXIS = y(560);
  const tierTop = (tier: number) => AXIS - 22 - tier * 44;
  const dotAt = (i: number) => lineAt - 4 + i * 5;

  // Each list line, the story it points back to, and when it is said.
  const still = [
    { story: "w2v", at: vectorsAt, mark: tokensAt, text: "word2vec still starts from tokens", markText: "tokens" },
    { story: "sparck", at: searchAt, mark: idfAt, text: "search still leans on IDF", markText: "IDF" },
    { story: "shannon", at: modelsAt, mark: nextAt, text: "language models still guess the next word", markText: "the next word" },
  ];
  const warn = [
    { story: "georgetown", at: demoAt, text: "a demo isn't a system" },
    { story: "eliza", at: fluentAt, text: "fluent text isn't understanding" },
  ];
  const swellOf = (id: string) => {
    const s = still.find((l) => l.story === id) ?? warn.find((l) => l.story === id);
    const m = still.find((l) => l.story === id);
    return s ? pulse(frame, s.at, 26) + (m ? pulse(frame, m.mark, 22) : 0) : 0;
  };
  const thread = ease(frame, threadAt - 2, 34);
  const LIST = y(680);
  const ROW = 56;
  const hold = drift(frame, soAt, 1, 200);
  // A light runs the counting thread from Zipf to today under the last line,
  // and each story's dot swells as it passes.
  const runFrom = soAt;
  const runTo = durationInFrames - 24;
  const run = Math.min(1, Math.max(0, (frame - runFrom) / (runTo - runFrom)));
  const runX = tx(storyYear("zipf")) + (tx(NOW) - tx(storyYear("zipf"))) * run;
  const passing = (year: number) => (frame < runFrom ? 0 : Math.max(0, 1 - Math.abs(runX - tx(year)) / 34) * 0.9);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pencil" at={from} level={-35} />
      <Sfx name="el-sprinkle" at={lineAt - 4} level={-32} />
      <Sfx name="el-pencil" at={threadAt - 2} level={-34} />
      {still.map((l) => (
        <Sfx key={l.story} name="el-tap" at={l.at} level={-29} />
      ))}
      {warn.map((l) => (
        <Sfx key={l.story} name="el-tap" at={l.at} level={-29} />
      ))}
      <Sfx name="el-chime" at={n.beat("end").to + 8} level={-32} />

      <Headline at={keptAt - 6} lead="Each idea kept" turn="the one beneath it." turnAt={beneathAt - 6} out={soAt - 6} />
      <Headline at={soAt - 2} lead="Not a stage" turn="the field left behind." turnAt={behindAt - 8} out={groundAt - 8} />
      <Headline at={groundAt - 4} lead="The ground" turn="everything since is built on." turnAt={groundAt + 8} size={68} />

      <div style={{ transform: `translateY(${-hold * 6}px)` }}>
        <FigLabel n="1" title="How the field got here" at={from - 2} x={96} y={y(290)} />
        <TimelineAxis y={AXIS} at={from} todayAt={from + 8} />
        {/* The counting thread, from Zipf to today. */}
        <Svg>
          <line
            x1={tx(storyYear("zipf"))}
            x2={tx(storyYear("zipf")) + (tx(NOW) - tx(storyYear("zipf"))) * thread}
            y1={AXIS}
            y2={AXIS}
            stroke={DATA}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={thread > 0 ? 0.85 : 0}
          />
        </Svg>
        <Svg opacity={frame >= runFrom ? ease(frame, runFrom, 10) * (1 - ease(frame, runTo, 12)) : 0}>
          <circle cx={runX} cy={AXIS} r={16} fill={HIGHLIGHT} />
        </Svg>
        {STORIES.map((s, i) => {
          const place = PLACE[s.id];
          const top = tierTop(place.tier);
          const counting = COUNTING.has(s.id);
          const isWarn = warn.some((l) => l.story === s.id);
          const color = counting ? DATA : isWarn && frame >= warn.find((l) => l.story === s.id)!.at ? ACCENT : INK;
          const at = dotAt(i);
          const x = tx(s.year);
          return (
            <React.Fragment key={s.id}>
              <Stem year={s.year} from={AXIS - 10} to={top + 30} at={at + 2} />
              <YearDot year={s.year} y={AXIS} at={at} color={color} swell={swellOf(s.id) + passing(s.year)} />
              <Ink
                at={at + 4}
                dur={14}
                style={{
                  left: place.side === "left" ? x - 8 : undefined,
                  right: place.side === "right" ? 1920 - x - 8 : undefined,
                  top,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ ...label(24, counting ? DATA_INK : INK), fontWeight: 650 }}>{s.name}</span>
                <span style={{ ...label(21, INK_SOFT), fontWeight: 500, ...TABULAR }}> {s.year}</span>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* ── What still sits underneath ── */}
        {still.map((l, i) => (
          <Ink key={l.story} at={l.at - 2} dur={16} style={{ left: 96, top: LIST + i * ROW, whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span style={{ ...label(24, DATA_INK), fontWeight: 700, ...TABULAR }}>{storyYear(l.story)}</span>
              <span style={{ ...headline(34), color: INK }}>
                {l.text.slice(0, l.text.lastIndexOf(l.markText))}
                <Mark at={l.mark - 2}>{l.markText}</Mark>
              </span>
            </div>
          </Ink>
        ))}
        {/* ── And the two warnings ── */}
        <Ink at={warningsAt - 2} dur={14} style={{ left: 1100, top: LIST - 4, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, INK_SOFT) }}>two warnings</span>
        </Ink>
        {warn.map((l, i) => (
          <Ink key={l.story} at={l.at - 2} dur={16} style={{ left: 1100, top: LIST + 40 + i * ROW, whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span style={{ ...label(24, ACCENT_INK), fontWeight: 700, ...TABULAR }}>{storyYear(l.story)}</span>
              <span style={{ ...headline(34, true), color: ACCENT_INK }}>{l.text}</span>
            </div>
          </Ink>
        ))}
        <Svg opacity={ease(frame, warningsAt - 2, 14)}>
          <line x1={1080} x2={1080} y1={LIST - 8} y2={LIST + 40 + 2 * ROW} stroke={ACCENT} strokeWidth={3} />
        </Svg>
      </div>
    </AbsoluteFill>
  );
};
