import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EVAL } from "./data";
import { artBox, Box, Chip, Clear, Cross, Drift, Flow, line, Listing, listingHeight, listingWidth, Mark, MARK_GREEN, OK_INK, Spot, Wash, X0 } from "./parts";

const SIZE = 19;
const GAP = 60;

/** A golden set, drawn as a two-column table: the question, and what the
 *  answer must be. Rows ink in on their own cues. */
const Golden: React.FC<{
  x: number;
  top: number;
  rowH: number;
  at: number;
  rows: readonly { q: string; a: string; at: number; aColor?: string }[];
  colW: readonly [number, number];
  head?: [React.ReactNode, React.ReactNode];
}> = ({ x, top, rowH, at, rows, colW, head = ["Question", "Verified result"] }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const width = colW[0] + colW[1];
  const shown = rows.map((r) => ease(frame, r.at - 2, 10));
  const bottom = top + rowH * (1 + shown.reduce((a, b) => a + b, 0));
  return (
    <>
      <div style={{ position: "absolute", left: x, top, width: width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: x, top: top + rowH - 1, width: width * p, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: x, top: bottom - 1, width: width * p, height: 1.5, background: INK }} />
      <Ink at={at + 2} dur={12} style={{ left: x, top, width, height: rowH }}>
        <div style={{ position: "relative", width, height: rowH, display: "flex", alignItems: "center" }}>
          <span style={{ ...label(21, INK_SOFT), width: colW[0], paddingLeft: 14, whiteSpace: "nowrap" }}>{head[0]}</span>
          <span style={{ ...label(21, INK_SOFT), width: colW[1], paddingLeft: 14, whiteSpace: "nowrap" }}>{head[1]}</span>
        </div>
      </Ink>
      {rows.map((r, i) => (
        <Ink key={r.q} at={r.at} dur={12} style={{ left: x, top: top + rowH * (1 + i), width, height: rowH }}>
          <div style={{ position: "relative", width, height: rowH, display: "flex", alignItems: "center", fontSize: 24 }}>
            <span style={{ ...note(24, INK), width: colW[0], paddingLeft: 14, whiteSpace: "nowrap" }}>{r.q}</span>
            <span style={{ ...note(24, r.aColor ?? INK), fontWeight: 500, width: colW[1], paddingLeft: 14, whiteSpace: "nowrap" }}>{r.a}</span>
          </div>
        </Ink>
      ))}
    </>
  );
};

/**
 * Question 4. A golden set of real questions with verified answers, of every
 * kind; store the result, not only a query. Three answers to "what was net
 * revenue?", run on the page's tables, scored three ways: by text the right
 * second one fails, by running the wrong third one passes, by result set
 * (execution accuracy) both are scored right. Then questions to decline,
 * scores sliced, and the set run on every change.
 */
export const EvalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("eval").from;
  const qAt = n.word("eval", "Question four");
  const textAt = n.word("eval", "How do you evaluate");
  const goldenAt = n.word("eval", "a golden set");
  const realAt = n.word("eval", "real questions");
  const verifiedAt = n.word("eval", "an answer you've verified");
  const mixAt = [n.word("eval-mix", "easy lookups"), n.word("eval-mix", "multi-step comparisons"), n.word("eval-mix", "ambiguous phrasings")];
  const storeAt = n.word("eval-store", "Store the verified result");
  const refAt = n.word("eval-store", "not only a reference query");
  const manyAt = n.word("eval-store", "many different queries are correct");
  const runFrom = n.beat("eval-run").from;
  const oneQAt = n.word("eval-run", "what was net revenue");
  const firstAt = n.word("eval-run", "The first is the reference");
  const secondAt = n.word("eval-run", "The second uses a different join");
  const fortyAt = n.word("eval-run", "four hundred forty");
  const thirdAt = n.word("eval-run", "The third runs without an error");
  const ninetyAt = n.word("eval-run", "eleven hundred ninety");
  const textCmpAt = n.word("eval-score", "Compare the query text");
  const failsAt = n.word("eval-score", "fails");
  const countAt = n.word("eval-score", "Count whatever runs");
  const passesAt = n.word("eval-score", "passes");
  const setsAt = n.word("eval-score", "Compare result sets");
  const accuracyAt = n.word("eval-score", "execution accuracy");
  const bothAt = n.word("eval-score", "both are scored correctly");
  const declineRowAt = [n.word("eval-decline", "metrics nobody has modeled"), n.word("eval-decline", "data the user may not see"), n.word("eval-decline", "and nonsense")];
  const refusesAt = n.word("eval-decline", "how often it refuses");
  const carefullyAt = n.word("eval-decline", "as carefully as accuracy");
  const sliceAt = n.word("eval-slice", "Slice the scores");
  const domainAt = n.word("eval-slice", "difficulty and domain");
  const averageAt = n.word("eval-slice", "an average hides");
  const suiteAt = n.word("eval-regress", "a regression suite");
  const changeAt = n.word("eval-regress", "on every change");
  const partsAt = [n.word("eval-regress", "the models"), n.word("eval-regress", "the semantic layer"), n.word("eval-regress", "the prompt"), n.word("eval-regress", "the language model")];
  const growAt = n.word("eval-regress", "grow it");
  const prodAt = n.word("eval-regress", "the production questions");
  const end = n.beat("eval-regress").to;

  const top = y(296);
  const rowH = h(46);
  const reference = EVAL.candidates[0];
  const golden = artBox("ae-ai-semantic-layer-golden", 190);

  // The three answers, side by side.
  const listTop = top + h(96);
  const widths = EVAL.candidates.map((c) => listingWidth(c.lines, SIZE));
  const xs = widths.map((_, i) => X0 + widths.slice(0, i).reduce((a, b) => a + b, 0) + i * GAP);
  const tallest = Math.max(...EVAL.candidates.map((c) => listingHeight(c.lines.length, SIZE)));
  const valueTop = listTop + tallest + h(18);
  const valueAt = [firstAt + 10, fortyAt, ninetyAt];

  // The grid: rows A, B, C; a column per way of scoring.
  const gridTop = valueTop + h(78);
  const gridRow = h(44);
  const COLS = ["Same text", "Runs", "Same result"];
  const colX = (j: number) => X0 + 90 + j * 210;
  const colAt = [textCmpAt, countAt, setsAt];
  const verdict = (c: (typeof EVAL.candidates)[number], j: number) => (j === 0 ? c.sameText : j === 1 ? c.runs : c.sameResult);
  /** The two the cheap scores get wrong: a right answer failed, a wrong one
   *  passed. */
  const misjudged = (c: (typeof EVAL.candidates)[number], j: number) => j < 2 && verdict(c, j) !== c.sameResult;

  // The rest: what to decline, how to slice, when to run.
  const loopTop = y(706);
  const loopH = h(78);
  const BOXES = [
    { x: X0, w: 400, title: "Change" },
    { x: X0 + 480, w: 340, title: "Run the golden set" },
    { x: X0 + 900, w: 220, title: "Compare" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={goldenAt} level={-30} />
      <Sfx name="el-tap" at={realAt + 4} level={-32} />
      {mixAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-tap" at={valueAt[0]} level={-31} />
      <Sfx name="el-tap" at={valueAt[1]} level={-31} />
      <Sfx name="el-tap" at={valueAt[2]} level={-31} />
      {colAt.map((at, j) => (
        <Sfx key={`c${j}`} name="el-pencil" at={at + 4} level={-35} />
      ))}
      <Sfx name="el-chime" at={bothAt} level={-33} />
      {declineRowAt.map((at, i) => (
        <Sfx key={`d${i}`} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={changeAt} level={-35} />
      <Sfx name="el-whoosh" at={growAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you evaluate a natural-language analytics assistant?
        </QuestionCard>

        {/* A golden set: real questions, verified answers, of every kind. */}
        <Clear at={runFrom - 4}>
          <Ink at={goldenAt} dur={12} style={{ left: X0, top }}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>The golden set</span>
          </Ink>
          <Golden x={X0} top={top + h(44)} rowH={rowH} at={realAt} colW={[420, 260]} rows={[{ q: EVAL.question, a: reference.value ?? "", at: verifiedAt }]} />
          <div style={{ position: "absolute", left: X0, top: top + h(44) + 2 * rowH + h(30), display: "flex", gap: 14, fontSize: 22 }}>
            {["easy lookup", "multi-step comparison", "ambiguous phrasing"].map((t, i) => (
              <span key={t} style={{ opacity: ease(frame, mixAt[i], 10), transform: `translateY(${(1 - ease(frame, mixAt[i], 10)) * 8}px)` }}>
                <Chip tone="gray" size={22}>
                  {t}
                </Chip>
              </span>
            ))}
          </div>
          <Ink at={storeAt} dur={14} style={{ left: 940, top: top + h(44) }}>
            <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Stored with each question</span>
          </Ink>
          <Ink at={storeAt + 6} dur={14} style={{ left: 940, top: top + h(90) }}>
            <span style={{ ...line(30, INK), fontWeight: 500 }}>
              <Mark at={storeAt + 12}>The verified result</Mark>
            </span>
          </Ink>
          <Ink at={refAt} dur={14} style={{ left: 940, top: top + h(144) }}>
            <span style={line(24, INK_SOFT)}>not only a reference query</span>
          </Ink>
          <Ink at={manyAt} dur={14} style={{ left: 940, top: top + h(186) }}>
            <span style={line(24, INK_SOFT)}>Many different queries are correct</span>
          </Ink>
          <Spot id="ae-ai-semantic-layer-golden" at={goldenAt} left={X0 + 340 - golden.width / 2} top={y(566)} {...golden} />
        </Clear>

        {/* Three answers to one question, each run. */}
        <Clear at={declineRowAt[0]}>
          <Ink at={runFrom} dur={14} style={{ left: X0, top }}>
            <span style={line(28, INK_SOFT)}>
              One question:{" "}
              <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, oneQAt, 10) }}>{EVAL.question}</span>
            </span>
          </Ink>
          {EVAL.candidates.map((c, i) => {
            const at = i === 0 ? firstAt : i === 1 ? secondAt : thirdAt;
            return (
              <React.Fragment key={c.id}>
                <Ink at={at} dur={12} style={{ left: xs[i], top: listTop - h(40) }}>
                  <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
                    {c.id} <span style={{ color: INK_SOFT }}>· {c.label}</span>
                  </span>
                </Ink>
                <Listing lines={c.lines} x={xs[i]} top={listTop} width={widths[i]} size={SIZE} at={at + 2} step={2} />
                <Ink at={valueAt[i]} dur={12} style={{ left: xs[i], top: valueTop }}>
                  <span style={{ ...note(28, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                    <span style={{ color: INK_SOFT }}>→ </span>
                    <span style={{ color: c.sameResult ? `color-mix(in srgb, ${OK_INK} ${ease(frame, bothAt, 12) * 100}%, ${INK})` : `color-mix(in srgb, ${ACCENT_INK} ${ease(frame, bothAt, 12) * 100}%, ${INK})` }}>
                      {c.value ?? "error"}
                    </span>
                  </span>
                </Ink>
              </React.Fragment>
            );
          })}

          {/* Scored three ways. */}
          <Wash x={colX(2) - 70} y={gridTop - 6} w={140} h={gridRow * 4 + 8} at={accuracyAt} color={MARK_GREEN} />
          {COLS.map((col, j) => (
            <Ink key={col} at={colAt[j]} dur={12} style={{ left: colX(j) - 100, width: 200, top: gridTop, height: gridRow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ ...label(22, j === 2 && frame >= accuracyAt ? OK_INK : INK_SOFT), whiteSpace: "nowrap" }}>{col}</span>
            </Ink>
          ))}
          {EVAL.candidates.map((c, i) => (
            <React.Fragment key={c.id}>
              <Ink at={textCmpAt - 4} dur={12} style={{ left: X0, top: gridTop + (i + 1) * gridRow, height: gridRow, display: "flex", alignItems: "center" }}>
                <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>{c.id}</span>
              </Ink>
              {COLS.map((col, j) => {
                const at = colAt[j] + 6 + i * 4;
                const bad = misjudged(c, j);
                const color = bad ? ACCENT : INK;
                return frame >= at ? (
                  <div key={col} style={{ position: "absolute", left: colX(j) - 13, top: gridTop + (i + 1) * gridRow + gridRow / 2 - 13 }}>
                    {verdict(c, j) ? <Tick at={at} size={26} color={color} /> : <Cross at={at} size={26} color={color} />}
                  </div>
                ) : null;
              })}
            </React.Fragment>
          ))}
          <div style={{ position: "absolute", left: X0, top: gridTop + gridRow - 1, width: colX(2) + 100 - X0, height: 1, background: HAIRLINE, opacity: ease(frame, textCmpAt, 12) }} />
          <Ink at={failsAt} dur={12} style={{ left: colX(2) + 140, top: gridTop + 2 * gridRow + 6 }}>
            <span style={line(23, ACCENT_INK)}>B: right, failed by its text</span>
          </Ink>
          <Ink at={passesAt} dur={12} style={{ left: colX(2) + 140, top: gridTop + 3 * gridRow + 6 }}>
            <span style={line(23, ACCENT_INK)}>C: wrong, passed because it runs</span>
          </Ink>
          <Ink at={accuracyAt} dur={14} style={{ left: colX(2) + 140, top: gridTop + 6 }}>
            <span style={{ ...line(26, OK_INK), fontWeight: 500 }}>Same result: execution accuracy</span>
          </Ink>
        </Clear>

        {/* Questions to decline, scored as carefully. */}
        <Ink at={declineRowAt[0] + 4} dur={12} style={{ left: X0, top: top + h(4) }}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>The golden set, with questions to decline</span>
        </Ink>
        <Golden
          x={X0}
          top={top + h(48)}
          rowH={rowH}
          at={declineRowAt[0] + 4}
          colW={[420, 260]}
          head={["Question", "Expected"]}
          rows={[
            { q: EVAL.question, a: reference.value ?? "", at: declineRowAt[0] + 8 },
            { q: "A metric nobody modeled", a: "Decline", at: declineRowAt[0] + 14 },
            { q: "Data the user may not see", a: "Decline", at: declineRowAt[1] },
            { q: "Nonsense", a: "Decline", at: declineRowAt[2] },
          ]}
        />
        <RightBracket x={X0 + 700} y0={top + h(48) + 2 * rowH + 8} y1={top + h(48) + 5 * rowH - 8} at={refusesAt} />
        <Ink at={refusesAt + 4} dur={12} style={{ left: X0 + 730, top: top + h(48) + 3.5 * rowH - 16 }}>
          <span style={{ ...line(24, INK), fontWeight: 500 }}>Refusal rate</span>
        </Ink>
        <Ink at={carefullyAt} dur={12} style={{ left: X0 + 730, top: top + h(48) + rowH + 10 }}>
          <span style={{ ...line(24, INK), fontWeight: 500 }}>Accuracy</span>
        </Ink>

        <Ink at={sliceAt} dur={14} style={{ left: 1130, top: top + h(48) }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Slice the scores</span>
        </Ink>
        <Ink at={domainAt} dur={14} style={{ left: 1130, top: top + h(92) }}>
          <span style={{ ...line(30, INK), fontWeight: 500 }}>By difficulty × domain</span>
        </Ink>
        <Ink at={averageAt} dur={14} style={{ left: 1130, top: top + h(146) }}>
          <span style={line(24, INK_SOFT)}>An average hides the category</span>
        </Ink>
        <Ink at={averageAt + 20} dur={14} style={{ left: 1130, top: top + h(182) }}>
          <span style={line(24, INK_SOFT)}>that fails every time</span>
        </Ink>

        {/* A regression suite: every change runs the set again. */}
        <Ink at={suiteAt} dur={12} style={{ left: X0, top: loopTop - h(92) }}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>A regression suite</span>
        </Ink>
        <Box x={BOXES[0].x} y={loopTop} w={BOXES[0].w} h={loopH} at={changeAt} title="Change" size={24} align="top">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
            {["models", "semantic layer", "prompt", "LLM"].map((p, i) => (
              <span key={p} style={{ opacity: ease(frame, partsAt[i], 10) }}>
                {p}
                {i < 3 ? " · " : ""}
              </span>
            ))}
          </span>
        </Box>
        <Flow points={[[BOXES[0].x + BOXES[0].w + 8, loopTop + loopH / 2], [BOXES[1].x - 8, loopTop + loopH / 2]]} at={partsAt[3] + 6} />
        <Box x={BOXES[1].x} y={loopTop} w={BOXES[1].w} h={loopH} at={partsAt[3] + 10} title="Run the golden set" size={24} />
        <Flow points={[[BOXES[1].x + BOXES[1].w + 8, loopTop + loopH / 2], [BOXES[2].x - 8, loopTop + loopH / 2]]} at={partsAt[3] + 16} />
        <Box x={BOXES[2].x} y={loopTop} w={BOXES[2].w} h={loopH} at={partsAt[3] + 20} title="Compare" size={24} />
        <Flow
          points={[
            [BOXES[2].x + BOXES[2].w / 2, loopTop + loopH + 8],
            [BOXES[2].x + BOXES[2].w / 2, loopTop + loopH + h(46)],
            [BOXES[0].x + BOXES[0].w / 2, loopTop + loopH + h(46)],
            [BOXES[0].x + BOXES[0].w / 2, loopTop + loopH + 8],
          ]}
          at={partsAt[3] + 26}
          dur={22}
          color={INK_SOFT}
          width={2}
          head={11}
        />
        <Ink at={prodAt} dur={14} style={{ left: BOXES[2].x + BOXES[2].w + 60, top: loopTop - h(30) - 16 }}>
          <span style={{ ...line(24, INK), fontWeight: 500 }}>
            Production questions <span style={{ opacity: ease(frame, prodAt + 10, 10) }}>that went wrong</span>
          </span>
        </Ink>
        <Flow
          points={[
            [BOXES[2].x + BOXES[2].w + 46, loopTop - h(30)],
            [BOXES[1].x + BOXES[1].w / 2, loopTop - h(30)],
            [BOXES[1].x + BOXES[1].w / 2, loopTop - 8],
          ]}
          at={growAt + 4}
          dur={18}
          dash="7 6"
        />
      </Drift>
    </AbsoluteFill>
  );
};

/** A bracket down the right side of a run of rows, its ends turned left. */
const RightBracket: React.FC<{ x: number; y0: number; y1: number; at: number }> = ({ x, y0, y1, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const mid = (y0 + y1) / 2;
  const half = ((y1 - y0) / 2) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={`M${x - 12},${mid - half} H${x} V${mid + half} H${x - 12}`} fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
};
