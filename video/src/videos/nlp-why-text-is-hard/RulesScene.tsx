import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { STOPWORDS } from "./data";
import { Drift, FIG_Y, Headline, Kicker, MARK, X0 } from "./parts";

const COL_X = [560, 1220];
const COL_W = 600;
const HEAD_Y = 340;
const ROW_Y = [430, 560, 670];

/**
 * Part 2, rules against learning, briefly: the lesson's table, two columns,
 * each cell inked as the narration reaches it, a real rule (NLTK's stopword
 * list, its first words and its length) under "rules", and the course's side
 * marked at the end.
 */
export const RulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("rules").from;
  const rulesAt = n.word("rules", "rules");
  const knowAt = n.word("rules", "already know");
  const stopAt = n.word("rules", "stopwords");
  const noDataAt = n.word("readable", "no training data");
  const readAt = n.word("readable", "read");
  const learnedAt = n.word("learning", "learned");
  const examplesAt = n.word("learning", "labeled examples");
  const powerfulAt = n.word("learning", "powerful");
  const courseAt = n.word("course", "This course");
  const countsAt = n.word("course", "rules and counts");
  const pipelineAt = n.word("pipe-in", "pipeline");
  const end = n.beat("pipeline").from;

  const band = ease(frame, courseAt, 16);
  const rows = [
    { head: "Built from", headAt: knowAt - 6, cells: [{ text: "what people already know", at: knowAt - 2 }, { text: "labeled examples", at: examplesAt - 2 }] },
    { head: "Training data", headAt: noDataAt - 6, cells: [{ text: "none", at: noDataAt }, { text: "lots of it", at: examplesAt + 6 }] },
    { head: "You get", headAt: readAt - 6, cells: [{ text: "reasons you can read", at: readAt }, { text: "powerful, but opaque", at: powerfulAt - 2 }] },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-tap" at={rulesAt - 2} level={-30} />
      <Sfx name="el-pop" at={stopAt} level={-32} />
      <Sfx name="el-tap" at={learnedAt - 2} level={-30} />
      <Sfx name="el-pencil" at={courseAt} level={-34} />

      <Kicker at={from - 10}>Rules or learning</Kicker>
      <Headline lead="Write the rules," turn="or learn them." at={from - 6} turnAt={learnedAt - 6} />

      <Drift from={from} to={end} amount={0.012} origin="50% 50%">
        <FigLabel n="8" title="Two ways to build a step" at={from + 2} x={X0} y={y(FIG_Y)} />

        {/* The course's side: a wash behind the rules column. */}
        <div
          style={{
            position: "absolute",
            left: COL_X[0] - 24,
            top: y(HEAD_Y) - 18,
            width: (COL_W - 20) * band,
            height: y(ROW_Y[2] + 74) - y(HEAD_Y) + 18,
            background: `color-mix(in srgb, ${MARK} 38%, transparent)`,
            borderRadius: 10,
          }}
        />
        <Ink at={countsAt} dur={14} style={{ left: COL_X[0], top: y(ROW_Y[2] + 92), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 700 }}>This course: rules and counts</span>
        </Ink>

        {/* Column heads */}
        <Ink at={rulesAt - 4} dur={14} style={{ left: COL_X[0], top: y(HEAD_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...body(44), color: INK, fontWeight: 600 }}>Rules</span>
        </Ink>
        <Ink at={learnedAt - 4} dur={14} style={{ left: COL_X[1], top: y(HEAD_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...body(44), color: INK, fontWeight: 600 }}>Learning</span>
        </Ink>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(HEAD_Y) + 66,
            width: 1680 * ease(frame, rulesAt, 16),
            height: 2,
            background: INK,
          }}
        />

        {rows.map((r, i) => (
          <React.Fragment key={r.head}>
            <Ink at={r.headAt} dur={14} style={{ left: X0, top: y(ROW_Y[i]) + 4, whiteSpace: "nowrap" }}>
              <span style={{ ...label(24, INK_SOFT) }}>{r.head}</span>
            </Ink>
            {r.cells.map((c, j) => (
              <Ink key={j} at={c.at} dur={16} style={{ left: COL_X[j], top: y(ROW_Y[i]), whiteSpace: "nowrap" }}>
                <span style={{ ...body(34), color: INK }}>{c.text}</span>
              </Ink>
            ))}
            {i > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top: y(ROW_Y[i]) - 26,
                  width: 1680 * ease(frame, r.headAt, 14),
                  height: 1,
                  background: HAIRLINE,
                  opacity: 0.5,
                }}
              />
            ) : null}
          </React.Fragment>
        ))}

        {/* A real rule: NLTK's stopword list. */}
        <Ink at={stopAt - 2} dur={16} style={{ left: COL_X[0], top: y(ROW_Y[0]) + 52, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT) }}>like NLTK's stopword list, {STOPWORDS.count} words:</span>
        </Ink>
        <Ink at={stopAt + 4} dur={16} style={{ left: COL_X[0], top: y(ROW_Y[0]) + 84, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>{STOPWORDS.first.slice(0, 4).join(", ")}, …</span>
        </Ink>
        {/* As the narration turns to the pipeline, learning steps back. */}
        <div
          style={{
            position: "absolute",
            left: COL_X[1] - 20,
            top: y(HEAD_Y) - 18,
            width: COL_W + 40,
            height: y(ROW_Y[2] + 74) - y(HEAD_Y) + 18,
            background: PAPER,
            opacity: 0.55 * ease(frame, pipelineAt - 4, 18),
          }}
        />
      </Drift>
    </AbsoluteFill>
  );
};
