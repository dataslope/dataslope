import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONTEXT, SARCASM, signed, UNKNOWN, type Trace } from "./data";
import { Chip, FIG_Y, Headline, INK, INK_SOFT, Kicker, LOST_INK, Mark, NEG, NEG_INK, POS, POS_INK, Reveal, Spot, Strike, TokenCol, TokenRow, X0 } from "./parts";

const ROW_Y = { sarcasm: 342, context: 462, missing: 582 } as const;
const ROW_LABEL_W = 210;
const CHIPS_X = X0 + ROW_LABEL_W;
const SUM_X = 1100;
const VERDICT_X = 1200;
const CHIP = 26;
const BASELINE_Y = 690;
const LEARN_Y = 748;
const DATES_Y = 806;
const NEXT_Y = 858;

const inkFor = (l: string) => (l === "positive" ? POS_INK : l === "negative" ? NEG_INK : INK_SOFT);

/**
 * Where the rules run out, from the lesson's limits list: sarcasm scored on
 * its words, a word whose sense depends on context (put in the negative list
 * for brakes, it sinks a thriller), and a word in neither list. Then why a rule-based baseline is still worth building, what learned
 * models keep from this unit, and the bridge to Unit 5: these ideas are old.
 */
export const LimitsScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const start = n.beat("limits").from;
  const ceilingsAt = n.word("limits", "ceilings");
  const sarcasmAt = n.word("limits", "sarcasm");
  const ohAt = n.word("limits", "oh great");
  const scoresAt = n.word("limits", "scores positive");
  const winkAt = n.word("limits", "the wink");
  const contextAt = n.word("context", "Context");
  const unpredAt = n.word("context", "unpredictable");
  const brakesAt = n.word("context", "bad in brakes");
  const thrillerAt = n.word("context", "good in a thriller");
  const missingAt = n.word("context", "missing from the lists");
  const nothingAt = n.word("context", "counts for nothing");
  const baselineAt = n.word("baseline", "rule-based baseline");
  const fastAt = n.word("baseline", "fast");
  const dataAt = n.word("baseline", "no training data");
  const beatAt = n.word("baseline", "score to beat");
  const labeledAt = n.word("learn", "labeled examples");
  const stillAt = n.word("learn", "still tokenize");
  const cleanAt = n.word("learn", "clean");
  const countAt = n.word("learn", "count");
  const olderAt = n.word("next", "much older");
  const idfAt = n.word("next", "IDF dates");
  const pairsAt = n.word("next", "counting word pairs");
  const nextEnd = n.beat("next").to;

  const rowLabel = (text: string, at: number, top: number) => (
    <Ink at={at} dur={12} style={{ left: X0, top: y(top) + 8, ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
      {text}
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: each case, the strike, the baseline's three points, the dates, the close ── */}
      <Sfx name="el-pencil" at={ohAt - 4} level={-36} />
      <Sfx name="el-scratch" at={winkAt} level={-32} />
      <Sfx name="el-tap" at={brakesAt - 2} level={-30} />
      <Sfx name="el-tap" at={thrillerAt - 2} level={-30} />
      <Sfx name="el-scratch" at={thrillerAt + 10} level={-33} />
      <Sfx name="el-tap" at={nothingAt - 2} level={-29} />
      <Sfx name="el-pop" at={ceilingsAt} level={-31} />
      {[fastAt, dataAt, beatAt].map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-31} />
      ))}
      <Sfx name="el-pencil" at={idfAt - 6} level={-36} />
      <Sfx name="el-chime" at={nextEnd + 8} level={-33} />

      <Kicker at={start - 10}>Rule-based sentiment</Kicker>
      <Headline at={start - 4} second={ceilingsAt - 4} italic="ceilings.">
        Rules have
      </Headline>
      <FigLabel n="18" title="Where the rules run out" at={start - 2} x={X0} y={y(FIG_Y)} />
      <Spot id="gauge" at={ceilingsAt} left={1490} top={y(312)} width={300} height={300} />

      {/* Sarcasm: scored on its words. */}
      {rowLabel("Sarcasm", sarcasmAt - 2, ROW_Y.sarcasm)}
      <TraceRow trace={SARCASM} top={y(ROW_Y.sarcasm)} at={ohAt - 2} verdictAt={scoresAt} struck={winkAt} />
      <Note at={winkAt + 4} x={VERDICT_X} y={y(ROW_Y.sarcasm) + 48}>
        <span style={{ ...note(21, LOST_INK), fontWeight: 600, whiteSpace: "nowrap" }}>it can’t see the wink</span>
      </Note>

      {/* Context: one word, two senses. Put "unpredictable" in the negative
          list, as the brakes would want, and the thriller pays for it. */}
      {rowLabel("Context", contextAt - 2, ROW_Y.context)}
      <TraceRow
        trace={CONTEXT}
        top={y(ROW_Y.context)}
        at={unpredAt - 4}
        scoreAt={brakesAt}
        verdictAt={thrillerAt}
        struck={thrillerAt + 10}
      />
      <Note at={brakesAt + 2} x={CHIPS_X} y={y(ROW_Y.context) + 50}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          with <i>{CONTEXT.added}</i> added to the negative list, as brakes would want
        </span>
      </Note>
      <Note at={thrillerAt + 14} x={VERDICT_X} y={y(ROW_Y.context) + 48}>
        <span style={{ ...note(21, LOST_INK), fontWeight: 600, whiteSpace: "nowrap" }}>a good thriller</span>
      </Note>

      {/* Missing words: in neither list, so worth nothing. */}
      {rowLabel("Missing words", missingAt - 4, ROW_Y.missing)}
      <TraceRow trace={UNKNOWN} top={y(ROW_Y.missing)} at={missingAt - 2} verdictAt={nothingAt} />
      <Note at={nothingAt + 4} x={CHIPS_X} y={y(ROW_Y.missing) + 50}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          in the lesson’s lists, <i>unpredictable</i> is in neither
        </span>
      </Note>

      {/* Why build one anyway, and what learned models keep. */}
      <Note at={baselineAt - 2} x={X0} y={y(BASELINE_Y)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={{ ...label(23, INK_SOFT), marginRight: 16 }}>A baseline first</span>
          <Reveal at={fastAt - 2}>fast</Reveal>
          <Reveal at={dataAt - 2}>{", no training data"}</Reveal>
          <Reveal at={beatAt - 2}>{", a score to beat"}</Reveal>
        </span>
      </Note>
      <Note at={labeledAt - 4} x={X0} y={y(LEARN_Y)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={{ ...label(23, INK_SOFT), marginRight: 16 }}>Learned models</span>
          <Reveal at={stillAt - 2}>still </Reveal>
          <Mark at={stillAt + 2}>tokenize</Mark>
          <Reveal at={cleanAt - 2}>{", "}</Reveal>
          <Mark at={cleanAt - 2}>clean</Mark>
          <Reveal at={countAt - 2}>{" and "}</Reveal>
          <Mark at={countAt - 2}>count</Mark>
        </span>
      </Note>

      {/* The bridge: two dates, then the next video. */}
      <Note at={olderAt} x={X0} y={y(DATES_Y)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <span style={{ ...label(23, INK_SOFT), marginRight: 16 }}>Older than they look</span>
          <Reveal at={idfAt - 2}>IDF, 1972</Reveal>
          <Reveal at={pairsAt - 2}>{"  ·  counting word pairs, 1948"}</Reveal>
        </span>
      </Note>
      <NextLine at={pairsAt + 10} x={X0} y={y(NEXT_Y)} width={760}>
        how the field got here
      </NextLine>
    </AbsoluteFill>
  );
};

/** One review, token by token, then its sum and verdict; `scoreAt` holds
 *  the scored words' tones back to a cue, and `struck` crosses the verdict out. */
const TraceRow: React.FC<{ trace: Trace; top: number; at: number; verdictAt: number; scoreAt?: number; struck?: number }> = ({
  trace,
  top,
  at,
  verdictAt,
  scoreAt,
  struck,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      <TokenRow x={CHIPS_X} top={top}>
        {trace.steps.map((s, k) => {
          const polar = s.polarity !== 0;
          const toneAt = scoreAt ?? at + k * 2 + 6;
          return (
            <TokenCol
              key={k}
              chip={
                <Chip
                  text={s.token}
                  size={CHIP}
                  at={at + k * 2}
                  tone={polar ? (s.polarity > 0 ? POS : NEG) : undefined}
                  toneAt={toneAt}
                  mono={s.token.length === 1}
                  style={{ marginRight: 0 }}
                />
              }
              below={
                polar ? (
                  <span style={{ ...note(22, s.polarity > 0 ? POS_INK : NEG_INK), ...TABULAR, fontWeight: 700, opacity: ease(frame, toneAt + 2, 10) }}>
                    {signed(s.polarity)}
                  </span>
                ) : null
              }
            />
          );
        })}
      </TokenRow>
      <div style={{ position: "absolute", left: SUM_X, top: top + 2, ...note(30, INK), ...TABULAR, fontWeight: 700, opacity: ease(frame, verdictAt - 6, 10) }}>
        {signed(trace.score)}
      </div>
      <div style={{ position: "absolute", left: VERDICT_X, top: top + 2, ...note(30, inkFor(trace.label)), fontWeight: 650, opacity: ease(frame, verdictAt - 2, 10) }}>
        {struck !== undefined ? <Strike at={struck}>{trace.label}</Strike> : trace.label}
      </div>
    </>
  );
};
