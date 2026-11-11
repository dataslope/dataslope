import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { badgeStyle, ColumnRule, FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TICKETS } from "./data";
import { B, Check, Drift, FAINT, Headline, Marked, OK, pulse, Spot, Svg, TRAP_INK, X0 } from "./parts";

/** The three approaches as three columns of plain text and pictures, no
 *  cards: each column's left edge and the width its widest piece (the JSON
 *  listing) takes, spread across the page with a hairline centred in each
 *  gap. */
const COL_X = [X0, 730, 1340];
const COL_W = 460;
const TITLE_Y = 360;
const GLYPH_Y = 440;

/** The judge's rubric, painted (llm-benchmarks-rubric, 760x1008): a
 *  clipboard whose sheet is left blank for the rubric's four lines, which
 *  ink in over it on "rubric". The lines are placed as fractions of the
 *  painting, inside the sheet (x 0.11 to 0.90, y 0.20 under the clip to
 *  0.92). */
const RUBRIC_H = 168;
const RUBRIC_W = Math.round((RUBRIC_H * 760) / 1008);
const RUBRIC_TOP = 6;
const RUBRIC_LINES = [
  { y: 0.35, w: 0.56 },
  { y: 0.49, w: 0.47 },
  { y: 0.63, w: 0.58 },
  { y: 0.77, w: 0.38 },
] as const;
const RUBRIC_LINE_X = 0.22;
/** The two answers the judge grades, well clear of the rubric above them,
 *  and the note under them. */
const ANSWERS_Y = RUBRIC_TOP + RUBRIC_H + 54;
const LONGER_Y = ANSWERS_Y + 130;
/** Where the deepest column's text ("favors longer answers") ends, in px
 *  under GLYPH_Y: where the hairlines stop. */
const TEXT_END = LONGER_Y + 30;

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
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("freetext").from;
  const harderAt = n.word("freetext", "harder");
  const firstAt = n.word("freetext", "First choice");
  const checkableAt = n.word("freetext", "checkable");
  const fieldsAt = n.word("freetext", "fields");
  const compareAt = n.word("freetext", "compare");
  const nextAt = n.word("props", "Next");
  const propertiesAt = n.word("props", "properties");
  const summaryAt = n.word("props", "summary");
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
            {/* A hairline in each gap, inking in with the column to its right. */}
            {i > 0 ? (
              <ColumnRule
                x={(COL_X[i - 1] + COL_W + COL_X[i]) / 2}
                top={y(TITLE_Y) - 4}
                height={y(GLYPH_Y) + TEXT_END - (y(TITLE_Y) - 4)}
                at={t.at}
              />
            ) : null}
            <Ink at={t.at} dur={14} style={{ left: COL_X[i], top: y(TITLE_Y) - 4, whiteSpace: "nowrap" }}>
              {/* The approach's number on a tinted disc, 26px beside the 28px title. */}
              <span
                style={{
                  ...badgeStyle("blue", 26),
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  padding: 0,
                  borderRadius: 20,
                  marginRight: 14,
                  verticalAlign: "middle",
                }}
              >
                {i + 1}
              </span>
              <span style={{ ...label(28, INK), fontWeight: 500 }}>{t.text}</span>
            </Ink>
          </React.Fragment>
        ))}

        {/* 1. Structured output: fields compared exactly. */}
        <Ink at={checkableAt} dur={14} style={{ left: COL_X[0], top: y(GLYPH_Y) + 10, width: COL_W }}>
          <div style={{ background: PAPER, border: `1.6px solid ${FAINT}`, borderRadius: 8, padding: "18px 22px", fontFamily: MONO, fontSize: 26, lineHeight: 1.7, color: INK }}>
            <div>{"{"}</div>
            <div style={{ paddingLeft: 26 }}>
              <span style={{ color: INK_SOFT }}>&quot;queue&quot;:</span> <Marked at={fieldsAt - 2}>&quot;{ticket.expected}&quot;</Marked>
            </div>
            <div>{"}"}</div>
          </div>
        </Ink>
        <Svg>
          <Check x={COL_X[0] + 400} y={y(GLYPH_Y) + 10 + 82} at={compareAt} size={34} />
        </Svg>
        <Ink at={compareAt - 2} dur={12} style={{ left: COL_X[0], top: y(GLYPH_Y) + 236, width: COL_W }}>
          <span style={{ ...note(24, INK) }}>Fields you can compare exactly</span>
        </Ink>

        {/* 2. Properties of the text, each a yes or no: here, of a summary. */}
        <Ink at={summaryAt - 2} dur={12} style={{ left: COL_X[1], top: y(TITLE_Y) + 46, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK_SOFT) }}>of a summary</span>
        </Ink>
        {[
          { text: "Names the three facts", at: factsAt },
          { text: "Stays under the length limit", at: limitAt },
        ].map((p, i) => (
          <React.Fragment key={p.text}>
            <Ink at={p.at - 4} dur={12} style={{ left: COL_X[1] + 54, top: y(GLYPH_Y) + 24 + i * 96, whiteSpace: "nowrap" }}>
              <span style={{ ...note(28, INK), fontWeight: 500 }}>{p.text}</span>
            </Ink>
            <Svg opacity={ease(frame, propertiesAt - 2, 12)}>
              <rect x={COL_X[1]} y={y(GLYPH_Y) + 22 + i * 96} width={36} height={36} rx={5} fill={PAPER} stroke={INK_SOFT} strokeWidth={2} />
              <Check x={COL_X[1] + 19} y={y(GLYPH_Y) + 40 + i * 96} at={p.at + 6} size={26} />
            </Svg>
          </React.Fragment>
        ))}

        {/* 3. A judge with a rubric, and its taste for length. */}
        <Spot id="llm-benchmarks-rubric" at={strongAt - 4} left={COL_X[2]} top={y(GLYPH_Y) + RUBRIC_TOP} width={RUBRIC_W} height={RUBRIC_H}>
          <svg width={RUBRIC_W} height={RUBRIC_H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {RUBRIC_LINES.map((l, k) => (
              <rect
                key={k}
                x={RUBRIC_LINE_X * RUBRIC_W}
                y={l.y * RUBRIC_H - 4}
                width={l.w * RUBRIC_W}
                height={8}
                rx={4}
                fill={B}
                opacity={ease(frame, rubricAt - 4 + k * 2, 8) * 0.85}
              />
            ))}
          </svg>
        </Spot>
        <Ink at={rubricAt - 2} dur={12} style={{ left: COL_X[2] + RUBRIC_W + 40, top: y(GLYPH_Y) + RUBRIC_TOP + RUBRIC_H / 2 - 14, whiteSpace: "nowrap" }}>
          <span style={note(22, INK_SOFT)}>a rubric</span>
        </Ink>
        {[
          { w: 160, size: 22 },
          { w: 360, size: 34 },
        ].map((a, i) => {
          const ry = y(GLYPH_Y) + ANSWERS_Y + i * 56;
          const swell = i === 1 ? pulse(frame, longerAt + 6, 20) : 0;
          return (
            <Svg key={i} opacity={ease(frame, favorAt - 6 + i * 3, 12)}>
              <rect x={COL_X[2]} y={ry} width={a.w} height={22} rx={4} fill={B} />
              <Check x={COL_X[2] + a.w + 32} y={ry + 11} at={favorAt + i * 6} size={a.size * (1 + swell * 0.15)} color={i === 1 ? OK : B} />
            </Svg>
          );
        })}
        <Ink at={longerAt - 2} dur={14} style={{ left: COL_X[2], top: y(GLYPH_Y) + LONGER_Y, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, TRAP_INK), fontWeight: 500 }}>Favors longer answers</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
