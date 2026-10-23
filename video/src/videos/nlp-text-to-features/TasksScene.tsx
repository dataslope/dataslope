import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Card, CHIP_LINE, Drift, FIG_Y, Headline, INK, INK_SOFT, Kicker, Mark, Reveal, Svg, SURFACE, X0 } from "./parts";

/**
 * The lesson's task-by-task table (choosing-your-pipeline.mdx, "Task by
 * task"), its two columns the narration reads: four of its five rows, as the
 * lesson words each cell.
 */
const TASKS = [
  { task: "Search indexing", stop: "yes", stem: "stem" },
  { task: "Topics and keywords", stop: "yes", stem: "lemmatize" },
  { task: "Sentiment analysis", stop: "no, keep negation", stem: "light, if any" },
  { task: "Authorship attribution", stop: "no, it’s the signal", stem: "no" },
] as const;

const COLS = [
  { x: X0, w: 440, head: "Task" },
  { x: 600, w: 480, head: "Remove stopwords?" },
  { x: 1100, w: 440, head: "Stem or lemmatize?" },
];
const HEAD_ROW_Y = 334;
const ROW_Y0 = 384;
const ROW_STEP = 62;
const TABLE_RIGHT = 1540;

/** Fig. 5, the ablation, in layout units. */
const FIG5_Y = 650;
const FLOW_Y = 704;
const FLOW_H = 120;
const DEFAULT_Y = 868;

/**
 * Every task chooses differently: the lesson's table read row by row, the
 * spoken cell marked in each; then an ablation, one step changed and
 * measured on the task; then the lesson's safe default.
 */
export const TasksScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const start = n.beat("tasks").from;
  const choosesAt = n.word("tasks", "chooses differently");
  const rowAt = [n.word("tasks", "Search wants"), n.word("tasks", "Topics want"), n.word("tasks-sent", "Sentiment keeps"), n.word("author", "who wrote")];
  const cellAt = [
    { col: 2, at: n.word("tasks", "stems") },
    { col: 2, at: n.word("tasks", "lemmas") },
    { col: 1, at: n.word("tasks-sent", "keeps its negations") },
    { col: 1, at: n.word("author", "signal itself") },
  ];
  const wordsAt = n.word("author-why", "words like");
  const fingerprintAt = n.word("author-why", "fingerprint");
  const changeAt = n.word("ablate", "Change one step");
  const measureAt = n.word("ablate", "measure");
  const ablationAt = n.word("ablate", "ablation");
  const safeAt = n.word("default", "safe default");
  const keepAt = n.word("default", "keep the stopwords");
  const untilAt = n.word("default", "until a measurement");
  const end = n.beat("count-in").to;

  const rowTop = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const flowTop = y(FLOW_Y);
  const flowH = h(FLOW_H);
  const mid = flowTop + flowH / 2;
  const half = h(52);
  const b = { x: 560, w: 300 };
  const c = { x: 960, w: 380 };

  return (
    <AbsoluteFill>
      {/* ── Sound: each row, the ablation's cards, the default ── */}
      {rowAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 4} level={-29} />
      ))}
      <Sfx name="el-pop" at={changeAt - 4} level={-31} />
      <Sfx name="el-tap" at={measureAt - 2} level={-29} />
      <Sfx name="el-pencil" at={safeAt - 2} level={-36} />

      <Kicker at={start - 10}>Choosing the pipeline</Kicker>
      <Headline at={start - 4} second={choosesAt - 2} italic="chooses differently.">
        Every task
      </Headline>

      <Drift from={start} to={end} amount={0.012} origin="40% 40%">
        {/* ── Fig. 4: the lesson's table, row by row ── */}
        <FigLabel n="4" title="Task by task, from the lesson’s table" at={start - 2} x={X0} y={y(FIG_Y)} />
        {COLS.map((col) => (
          <Ink key={col.head} at={start + 2} dur={14} style={{ left: col.x, top: y(HEAD_ROW_Y), ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            {col.head}
          </Ink>
        ))}
        <Svg>
          <line x1={X0} x2={TABLE_RIGHT} y1={y(HEAD_ROW_Y) + 38} y2={y(HEAD_ROW_Y) + 38} stroke={HAIRLINE} strokeWidth={1.2} />
        </Svg>
        {TASKS.map((t, i) => {
          const cells = [t.task, t.stop, t.stem];
          return (
            <React.Fragment key={t.task}>
              {cells.map((text, k) => (
                <Ink
                  key={k}
                  at={rowAt[i] - 4 + k * 3}
                  dur={14}
                  style={{ left: COLS[k].x, top: rowTop(i), ...(k === 0 ? label(25, INK) : note(25, INK)), whiteSpace: "nowrap" }}
                >
                  {k === cellAt[i].col ? <Mark at={cellAt[i].at - 2}>{text}</Mark> : text}
                </Ink>
              ))}
            </React.Fragment>
          );
        })}

        {/* The authorship row's reason, from the lesson: the rate of function words. */}
        <Note at={wordsAt - 2} x={COLS[1].x} y={rowTop(3) + 40}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            how often <i>the</i>, <i>of</i>, <i>that</i> appear: <Reveal at={fingerprintAt - 2}>a fingerprint</Reveal>
          </span>
        </Note>

        {/* ── Fig. 5: an ablation ── */}
        <FigLabel n="5" title="One step at a time" at={changeAt - 6} x={X0} y={y(FIG5_Y)} />
        <Card at={changeAt - 4} x={X0} y={flowTop} w={340} h={flowH} fill={SURFACE} line={INK}>
          <span style={label(24, INK)}>change one step</span>
        </Card>
        <Arrow from={[X0 + 346, mid - 14]} to={[b.x - 10, flowTop + half / 2 + 4]} at={changeAt + 4} dur={10} color={INK_SOFT} width={2} head={11} />
        <Arrow from={[X0 + 346, mid + 14]} to={[b.x - 10, flowTop + flowH - half / 2 - 4]} at={changeAt + 6} dur={10} color={INK_SOFT} width={2} head={11} />
        <Card at={changeAt + 8} x={b.x} y={flowTop} w={b.w} h={half} line={CHIP_LINE}>
          <span style={note(23, INK)}>with it</span>
        </Card>
        <Card at={changeAt + 12} x={b.x} y={flowTop + flowH - half} w={b.w} h={half} line={CHIP_LINE}>
          <span style={note(23, INK)}>without it</span>
        </Card>
        <Arrow from={[b.x + b.w + 8, flowTop + half / 2 + 4]} to={[c.x - 10, mid - 14]} at={measureAt - 4} dur={10} color={INK_SOFT} width={2} head={11} />
        <Arrow from={[b.x + b.w + 8, flowTop + flowH - half / 2 - 4]} to={[c.x - 10, mid + 14]} at={measureAt - 2} dur={10} color={INK_SOFT} width={2} head={11} />
        <Card at={measureAt} x={c.x} y={flowTop} w={c.w} h={flowH} fill={SURFACE} line={INK}>
          <span style={label(24, INK)}>measure on your own task</span>
        </Card>
        <Note at={ablationAt - 2} x={c.x + c.w + 40} y={mid - 22}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            That’s an <Mark at={ablationAt + 2}>ablation</Mark>.
          </span>
        </Note>

        {/* The lesson's safe default, under the ablation. */}
        <Note at={safeAt - 2} x={X0} y={y(DEFAULT_Y)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <span style={{ ...label(23, INK_SOFT), marginRight: 14 }}>A safe default</span>
            tokenize, lowercase, and <Mark at={keepAt - 2}>keep the stopwords</Mark>
            <Reveal at={untilAt - 2} style={{ color: INK_SOFT }}>
              {" until a measurement says to drop them"}
            </Reveal>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
