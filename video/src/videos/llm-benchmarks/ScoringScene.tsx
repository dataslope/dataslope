import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TICKETS } from "./data";
import { A_INK, B, Check, Drift, FAINT, Headline, Marked, OK, PANEL, pulse, Svg, TRAP_INK, X0 } from "./parts";

const COL_X = [X0, 700, 1280];
const COL_W = 520;
const TITLE_Y = 360;
const GLYPH_Y = 440;

/**
 * Scoring answers with no exact match (Fig. 14): the lesson's three
 * approaches in its order of preference. Make the output checkable (the
 * first harness ticket's queue as a field), score properties (the two the
 * narration names), or a model as judge against a rubric, with its taste for
 * longer answers.
 */
export const ScoringScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("freetext").from;
  const harderAt = n.word("freetext", "harder");
  const firstAt = n.word("freetext", "First choice");
  const checkableAt = n.word("freetext", "checkable");
  const fieldsAt = n.word("freetext", "fields");
  const compareAt = n.word("freetext", "compare");
  const nextAt = n.word("props", "Next");
  const propertiesAt = n.word("props", "properties");
  const factsAt = n.word("props", "three facts");
  const limitAt = n.word("props", "limit");
  const lastAt = n.word("judge", "Last");
  const strongAt = n.word("judge", "strong model");
  const rubricAt = n.word("judge", "rubric");
  const favorAt = n.word("judge", "favor");
  const longerAt = n.word("judge", "longer answers");
  const end = n.beat("cost").from;

  // The first harness ticket, its queue as a field to check.
  const ticket = TICKETS[0];
  const titles = [
    { text: "Make it checkable", at: firstAt - 2 },
    { text: "Score properties", at: nextAt - 2 },
    { text: "A model as judge", at: lastAt - 2 },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: each approach, and the marks that land in it ── */}
      {titles.map((t, i) => (
        <Sfx key={i} name="el-pop" at={t.at + 2} level={-31} />
      ))}
      <Sfx name="el-tap" at={compareAt} level={-28} />
      <Sfx name="el-tap" at={factsAt + 4} level={-28} />
      <Sfx name="el-tap" at={limitAt + 2} level={-28} />
      <Sfx name="el-pencil" at={longerAt - 2} level={-34} />

      <Headline at={from - 6} second={harderAt - 2} italic="is harder to score.">
        Free text
      </Headline>
      <FigLabel n="14" title="Three ways to score it, best first" at={from} x={X0} y={y(282)} />

      <Drift from={from} to={end} amount={0.012} origin="50% 60%">
        {titles.map((t, i) => (
          <React.Fragment key={t.text}>
            <Svg opacity={ease(frame, from + 2 + i * 4, 14) * (0.45 + 0.55 * ease(frame, t.at, 10))}>
              <rect x={COL_X[i]} y={y(TITLE_Y) - 30} width={COL_W} height={h(450)} rx={14} fill={PANEL} stroke={FAINT} strokeWidth={1.6} />
            </Svg>
            <Ink at={t.at} dur={14} style={{ left: COL_X[i] + 30, top: y(TITLE_Y) - 4, whiteSpace: "nowrap" }}>
              <span style={{ ...label(28, A_INK), fontWeight: 700, marginRight: 14 }}>{i + 1}</span>
              <span style={{ ...label(28, INK), fontWeight: 700 }}>{t.text}</span>
            </Ink>
          </React.Fragment>
        ))}

        {/* 1. Structured output: fields compared exactly. */}
        <Ink at={checkableAt} dur={14} style={{ left: COL_X[0] + 30, top: y(GLYPH_Y) + 10, width: COL_W - 60 }}>
          <div style={{ background: PAPER, border: `1.6px solid ${FAINT}`, borderRadius: 10, padding: "18px 22px", fontFamily: MONO, fontSize: 26, lineHeight: 1.7, color: INK }}>
            <div>{"{"}</div>
            <div style={{ paddingLeft: 26 }}>
              <span style={{ color: INK_SOFT }}>&quot;queue&quot;:</span> <Marked at={fieldsAt - 2}>&quot;{ticket.expected}&quot;</Marked>
            </div>
            <div>{"}"}</div>
          </div>
        </Ink>
        <Svg>
          <Check x={COL_X[0] + 430} y={y(GLYPH_Y) + 10 + 82} at={compareAt} size={34} />
        </Svg>
        <Ink at={compareAt - 2} dur={12} style={{ left: COL_X[0] + 30, top: y(GLYPH_Y) + 236, width: COL_W - 60 }}>
          <span style={{ ...note(24, INK) }}>fields you can compare exactly</span>
        </Ink>

        {/* 2. Properties of the text, each a yes or no. */}
        {[
          { text: "names the three facts", at: factsAt },
          { text: "stays under the limit", at: limitAt },
        ].map((p, i) => (
          <React.Fragment key={p.text}>
            <Ink at={p.at - 4} dur={12} style={{ left: COL_X[1] + 84, top: y(GLYPH_Y) + 24 + i * 96, whiteSpace: "nowrap" }}>
              <span style={{ ...note(28, INK), fontWeight: 600 }}>{p.text}</span>
            </Ink>
            <Svg opacity={ease(frame, propertiesAt - 2, 12)}>
              <rect x={COL_X[1] + 30} y={y(GLYPH_Y) + 22 + i * 96} width={36} height={36} rx={7} fill={PAPER} stroke={INK_SOFT} strokeWidth={2} />
              <Check x={COL_X[1] + 49} y={y(GLYPH_Y) + 40 + i * 96} at={p.at + 6} size={26} />
            </Svg>
          </React.Fragment>
        ))}

        {/* 3. A judge with a rubric, and its taste for length. */}
        <Svg opacity={ease(frame, strongAt - 2, 12)}>
          <rect x={COL_X[2] + 30} y={y(GLYPH_Y) + 6} width={180} height={128} rx={10} fill={PAPER} stroke={INK} strokeWidth={2} />
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={COL_X[2] + 52} y={y(GLYPH_Y) + 30 + k * 26} width={[130, 110, 136, 90][k]} height={9} rx={4} fill={B} opacity={ease(frame, rubricAt - 4 + k * 2, 8) * 0.8} />
          ))}
        </Svg>
        <Ink at={rubricAt - 2} dur={12} style={{ left: COL_X[2] + 230, top: y(GLYPH_Y) + 54, whiteSpace: "nowrap" }}>
          <span style={note(22, INK_SOFT)}>a rubric</span>
        </Ink>
        {[
          { w: 160, size: 22 },
          { w: 360, size: 34 },
        ].map((a, i) => {
          const ry = y(GLYPH_Y) + 186 + i * 56;
          const swell = i === 1 ? pulse(frame, longerAt + 6, 20) : 0;
          return (
            <Svg key={i} opacity={ease(frame, favorAt - 6 + i * 3, 12)}>
              <rect x={COL_X[2] + 30} y={ry} width={a.w} height={22} rx={4} fill={B} />
              <Check x={COL_X[2] + 30 + a.w + 32} y={ry + 11} at={favorAt + i * 6} size={a.size * (1 + swell * 0.15)} color={i === 1 ? OK : B} />
            </Svg>
          );
        })}
        <Ink at={longerAt - 2} dur={14} style={{ left: COL_X[2] + 30, top: y(GLYPH_Y) + 316, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, TRAP_INK), fontWeight: 600 }}>favors longer answers</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
