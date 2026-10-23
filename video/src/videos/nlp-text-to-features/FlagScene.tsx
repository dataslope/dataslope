import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NEGATIONS, RESET, signed, traceOf, type Trace } from "./data";
import { Chip, ChipRow, FIG_Y, Headline, INK, INK_SOFT, Kicker, Mark, NEG, NEG_INK, POS, POS_INK, Strike, TokenCol, TokenRow, X0 } from "./parts";

const RULE_ON_Y = 340;
const RULE_OFF_Y = 412;
const RULE_CHIPS_X = 420;
const FLIP_NOTE_Y = 478;
const FIG17_Y = 540;
const ROW_Y = [598, 712, 826];
const SUM_X = 1170;
const VERDICT_X = 1290;
const CHIP = 26;

/** The negations in the order the narration names them, then the rest. */
const SPOKEN = ["not", "no", "never"];
const NEG_ORDER = [...SPOKEN.filter((w) => NEGATIONS.includes(w)), ...NEGATIONS.filter((w) => !SPOKEN.includes(w))];
/** The reset tokens, the way the narration reads them: comma, full stop, but. */
const RESET_SPOKEN: Record<string, "comma" | "stop" | "but"> = { ",": "comma", ".": "stop", but: "but" };

const ROWS = ["It is not good", "This is not bad at all", "The plot was good but the acting was awful"].map(traceOf);

const inkFor = (l: string) => (l === "positive" ? POS_INK : l === "negative" ? NEG_INK : INK_SOFT);

/**
 * The lesson's negation handling: a negation switches a flag on, the next
 * sentiment word flips its sign, punctuation and "but" switch it off. Then
 * three of the lesson's reviews, token by token: "not good" now negative,
 * "not bad at all" positive, and the mixed review netting to neutral.
 */
export const FlagScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const start = n.beat("flag").from;
  const negationAt = n.word("flag", "A negation");
  const spokenAt = [n.word("flag", "not"), n.word("flag", "no"), n.word("flag", "never")];
  const onAt = n.word("flag", "switches it on");
  const nextAt = n.word("flag", "next sentiment word");
  const flipsAt = n.word("flag", "flips its sign");
  const resetAt = { comma: n.word("reset", "A comma"), stop: n.word("reset", "full stop"), but: n.word("reset", "the word but") };
  const offAt = n.word("reset", "switches it off");
  const rowAt = [n.word("fixed", "it is not good"), n.word("fixed", "this is not bad at all"), n.word("mixed", "The plot was good")];
  const verdictAt = [n.word("fixed", "negative"), n.word("fixed", "positive"), n.word("mixed", "neutral")];
  const plusAt = n.word("mixed", "Plus one");
  const minusAt = n.word("mixed", "minus one");

  return (
    <AbsoluteFill>
      {/* ── Sound: the rule's two rows, each review, each verdict ── */}
      <Sfx name="el-pencil" at={negationAt - 4} level={-36} />
      <Sfx name="el-pencil" at={resetAt.comma - 4} level={-36} />
      {rowAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 4} level={-30} />
      ))}
      {verdictAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-27} />
      ))}

      <Kicker at={start - 10}>Rule-based sentiment</Kicker>
      <Headline at={start - 4} second={start + 10} italic="flips the next word.">
        One flag
      </Headline>

      {/* ── Fig. 16: the rule ── */}
      <FigLabel n="16" title="The lesson’s negation rule" at={negationAt - 4} x={X0} y={y(FIG_Y)} />
      <Ink at={negationAt - 2} dur={14} style={{ left: X0, top: y(RULE_ON_Y) + 8, ...label(23, INK), whiteSpace: "nowrap" }}>
        <Mark at={onAt - 2}>Flag on</Mark>
      </Ink>
      <ChipRow x={RULE_CHIPS_X} y={y(RULE_ON_Y)}>
        {NEG_ORDER.map((w) => {
          const k = SPOKEN.indexOf(w);
          return <Chip key={w} text={w} size={28} at={k >= 0 ? spokenAt[k] - 2 : spokenAt[2] + 8} />;
        })}
      </ChipRow>
      <Ink at={resetAt.comma - 4} dur={14} style={{ left: X0, top: y(RULE_OFF_Y) + 8, ...label(23, INK), whiteSpace: "nowrap" }}>
        <Mark at={offAt - 2}>Flag off</Mark>
      </Ink>
      <ChipRow x={RULE_CHIPS_X} y={y(RULE_OFF_Y)}>
        {RESET.map((w, k) => {
          const spoken = RESET_SPOKEN[w];
          return <Chip key={w} text={w} size={28} at={spoken ? resetAt[spoken] - 2 : resetAt.stop + 4 + k} mono={w.length === 1} />;
        })}
      </ChipRow>
      <Note at={nextAt - 2} x={X0} y={y(FLIP_NOTE_Y)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          While it is on, the next sentiment word <Mark at={flipsAt - 2}>flips its sign</Mark>, and the flag goes off.
        </span>
      </Note>

      {/* ── Fig. 17: three reviews, token by token ── */}
      <FigLabel n="17" title="Three of the lesson’s reviews, token by token" at={rowAt[0] - 8} x={X0} y={y(FIG17_Y)} />
      {ROWS.map((r, i) => (
        <TraceRow
          key={r.text}
          trace={r}
          top={y(ROW_Y[i])}
          at={rowAt[i]}
          verdictAt={verdictAt[i]}
          badgeAt={i === 2 ? [plusAt, minusAt] : undefined}
        />
      ))}
    </AbsoluteFill>
  );
};

/** One review, token by token: a negation marked, a flipped word showing its
 *  sign before and after, then the sum and the verdict. */
const TraceRow: React.FC<{ trace: Trace; top: number; at: number; verdictAt: number; badgeAt?: number[] }> = ({
  trace,
  top,
  at,
  verdictAt,
  badgeAt,
}) => {
  const frame = useCurrentFrame();
  let scored = 0;
  return (
    <>
      <TokenRow x={X0} top={top}>
        {trace.steps.map((s, k) => {
          const polar = s.polarity !== 0;
          const badge = polar ? (badgeAt ? badgeAt[scored++] - 2 : at + k * 2 + 10) : 0;
          const flipped = s.role === "flipped";
          return (
            <TokenCol
              key={k}
              chip={
                <Chip
                  text={s.token}
                  size={CHIP}
                  at={at + k * 2}
                  mark={s.role === "negation" ? at + k * 2 + 4 : undefined}
                  tone={polar ? (s.polarity > 0 ? POS : NEG) : undefined}
                  toneAt={badge}
                  style={{ marginRight: 0 }}
                />
              }
              below={
                polar ? (
                  <span style={{ ...note(22, s.polarity > 0 ? POS_INK : NEG_INK), ...TABULAR, fontWeight: 700, opacity: ease(frame, badge, 10) }}>
                    {flipped ? (
                      <>
                        <span style={{ color: s.polarity > 0 ? NEG_INK : POS_INK }}>
                          <Strike at={badge + 6}>{signed(-s.polarity)}</Strike>
                        </span>{" "}
                        {signed(s.polarity)}
                      </>
                    ) : (
                      signed(s.polarity)
                    )}
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
        {trace.label}
      </div>
    </>
  );
};
