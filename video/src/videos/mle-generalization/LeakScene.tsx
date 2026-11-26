import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LEAK } from "./data";
import { DataBlock, GRID } from "./HookScene";
import { Drift, Fade, line, OK, OK_INK, pct, Q_SIZE, Say, Spot, X0 } from "./parts";

/** Columns the leaky pick lights, and the different ones each fold's own pick
 *  finds: a corner of the block standing for 20 of 10,000. */
const LEAKY_COLS = [3, 8, 14, 19, 26];
const HONEST_COLS = [5, 11, 17, 22, 27];
/** The held-out fold: the last fifth of the rows drawn. */
const HELD = [11, 14] as const;

/**
 * Question 6 finds the opening's eighty-five. The same block: the twenty
 * columns picked on every row, lit down every row including the fold held
 * out (those cells red), 85%. The pick redone inside the fold's training rows
 * (green): 54%, about what always guessing the commoner label gets. The
 * page's own example, a scaler, which moves nothing; and the fixes, with two
 * features that saw the label.
 */
export const LeakScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("leak").from;
  const qAt = n.word("leak", "Question six");
  const textAt = n.word("leak", "What is data leakage");
  const leakWordAt = n.word("leak", "data leakage");
  const infoAt = n.word("leak", "It's information");
  const riseAt = n.word("leak", "offline scores rise");
  const collapseAt = n.word("leak", "production ones collapse");
  const hereAt = n.word("leak-hook", "Here's the eighty-five");
  const pickedAt = n.word("leak-hook", "it picked the twenty columns");
  const everyAt = n.word("leak-hook", "using every row");
  const heldAt = n.word("leak-hook", "each fold then held out");
  const insideAt = n.word("leak-fold", "inside each fold");
  const trainRowsAt = n.word("leak-fold", "on its training rows");
  const fiftyFourAt = n.word("leak-fold", "fifty-four");
  const guessAt = n.word("leak-fold", "always guessing");
  const scalerAt = n.word("leak-forms", "a scaler fitted on every row");
  const eightyAt = n.word("leak-forms", "eighty percent either way");
  const hardAt = n.word("leak-forms", "What leaks hard");
  const fitAt = n.word("leak-fix", "fit every transform");
  const auditAt = n.word("leak-fix", "audit features for proxies");
  const refundAt = n.word("leak-fix", "a refund flag");
  const totalAt = n.word("leak-fix", "a total computed");
  const end = n.beat("leak-fix").to;

  const BX = X0;
  const BTOP = y(440);
  const pitchY = h(GRID.ch) + GRID.gap;
  const blockOut = fitAt - 6;
  const RX = 1060;
  // The commoner label: 109 of the 200 rows are ones.
  const majority = Math.max(LEAK.positives / LEAK.rows, 1 - LEAK.positives / LEAK.rows);

  const cols = [
    ...LEAKY_COLS.map((col) => ({ col, at: pickedAt + 4, color: ds("yellow", 400), out: insideAt })),
    ...LEAKY_COLS.map((col) => ({ col, at: heldAt + 4, color: `color-mix(in srgb, ${ACCENT} 90%, transparent)`, rows: HELD, out: insideAt })),
    ...HONEST_COLS.map((col) => ({ col, at: trainRowsAt, color: `color-mix(in srgb, ${OK} 60%, transparent)`, rows: [0, HELD[0]] as const })),
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={leakWordAt} level={-30} />
      <Sfx name="el-tap" at={hereAt} level={-30} />
      <Sfx name="el-sprinkle" at={pickedAt + 4} level={-36} />
      <Sfx name="el-pencil" at={heldAt} level={-35} />
      <Sfx name="el-sprinkle" at={trainRowsAt} level={-36} />
      <Sfx name="el-tap" at={fiftyFourAt} level={-28} />
      <Sfx name="el-tap" at={eightyAt} level={-32} />
      <Sfx name="el-whoosh" at={fitAt - 4} level={-37} />
      <Sfx name="el-tap" at={refundAt} level={-32} />
      <Sfx name="el-tap" at={totalAt} level={-32} />
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={1400}>
          What is data leakage, and how do you prevent it?
        </QuestionCard>
        <Spot id="mle-generalization-faucet" at={leakWordAt} x={1610} y={y(116)} w={150} />
        <Say at={infoAt - 2} x={X0} y={y(262)}>
          <span style={line(30, INK, 400)}>Information the model won’t have at prediction time, getting into training</span>
        </Say>
        <Say at={riseAt - 2} x={X0} y={y(262) + h(50)}>
          <span style={line(30, INK, 400)}>
            Offline scores rise<span style={{ opacity: ease(frame, collapseAt - 2, 10) }}>, and production ones <b style={{ color: ACCENT_INK, fontWeight: 500 }}>collapse</b></span>
          </span>
        </Say>

        {/* ── The opening's block, and what the pick saw ── */}
        <Fade from={hereAt - 4} out={blockOut}>
          <Say at={hereAt - 2} x={BX} y={BTOP - h(48)}>
            <span style={line(24, INK_SOFT)}>The opening’s random data</span>
          </Say>
          <Say at={hereAt} x={BX + GRID.cols * (GRID.cw + GRID.gap) + 22 + 20} y={BTOP - h(44)} width={120} align="center">
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>label</span>
          </Say>
          <DataBlock
            x={BX}
            top={BTOP}
            at={hereAt - 6}
            labelAt={hereAt - 30}
            cols={cols}
            heldOut={{ from: HELD[0], to: HELD[1], at: heldAt - 2 }}
          />
          <Say at={heldAt + 4} x={BX} y={BTOP + GRID.rows * pitchY + h(16)}>
            <span style={line(23, INK)}>
              the fold held out
              <span style={{ opacity: ease(frame, insideAt - 2, 10), color: INK_SOFT }}>; the pick now never sees it</span>
            </span>
          </Say>
          <Say at={everyAt - 2} x={BX} y={BTOP + GRID.rows * pitchY + h(56)}>
            <span style={{ ...line(23, INK), opacity: 1 - ease(frame, insideAt, 10) }}>
              <span style={{ background: ds("yellow", 400), padding: "0 0.2em", margin: "0 0.2em 0 0", borderRadius: 4 }}>20 columns</span> picked using every row
            </span>
          </Say>
          <Say at={trainRowsAt + 2} x={BX} y={BTOP + GRID.rows * pitchY + h(56)}>
            <span style={line(23, OK_INK)}>The pick redone on each fold’s training rows only</span>
          </Say>
        </Fade>

        {/* ── The scores ── */}
        <Say at={hereAt - 2} x={RX} y={y(420)}>
          <span style={line(24, INK_SOFT)}>Picked on every row, then cross-validated</span>
        </Say>
        <Say at={hereAt} x={RX - 4} y={y(454)}>
          <span style={{ ...headline(92), color: ACCENT_INK, ...TABULAR, whiteSpace: "nowrap" }}>{pct(LEAK.leaky)}</span>
        </Say>
        <Say at={insideAt - 2} x={RX} y={y(586)}>
          <span style={line(24, INK_SOFT)}>Picked inside each fold</span>
        </Say>
        <Say at={fiftyFourAt - 2} x={RX - 4} y={y(620)}>
          <span style={{ ...headline(92), color: OK_INK, ...TABULAR, whiteSpace: "nowrap" }}>{pct(LEAK.honest)}</span>
        </Say>
        <Say at={guessAt - 2} x={RX} y={y(722)}>
          <span style={line(24, INK)}>
            <span style={TABULAR}>{pct(majority, 1)}</span>: always guess the commoner label
          </span>
        </Say>
        <Say at={scalerAt - 2} x={RX} y={y(792)}>
          <span style={line(24, INK)}>
            The page’s scaler, fitted on every row:{" "}
            <span style={{ opacity: ease(frame, eightyAt - 2, 10) }}>
              <span style={TABULAR}>{pct(LEAK.scalerLeaky)}</span> either way
            </span>
          </span>
        </Say>
        <Say at={hardAt - 2} x={RX} y={y(838)}>
          <span style={line(24, ACCENT_INK)}>What leaks hard: anything that saw the label</span>
        </Say>

        {/* ── The fixes, where the block was ── */}
        {[
          { text: "Fit every transform inside the training split, as one pipeline", at: fitAt, color: OK_INK, top: y(430), rule: true },
          { text: "Audit features for proxies of the label, such as", at: auditAt, color: INK, top: y(540), rule: true },
          { text: "a refund flag, in a fraud model", at: refundAt, color: ACCENT_INK, top: y(540) + h(56), rule: false },
          { text: "a total computed with data from after the prediction", at: totalAt, color: ACCENT_INK, top: y(540) + h(104), rule: false },
        ].map((f) => (
          <React.Fragment key={f.text}>
            {f.rule ? (
              <div style={{ position: "absolute", left: X0, top: f.top, width: 860 * ease(frame, f.at - 6, 14), height: 1, background: `color-mix(in srgb, ${INK} 55%, transparent)` }} />
            ) : null}
            <Say at={f.at - 2} x={X0 + (f.rule ? 0 : 36)} y={f.top + (f.rule ? 28 : 28)}>
              <span style={line(f.rule ? 28 : 26, f.color)}>{f.text}</span>
            </Say>
          </React.Fragment>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
