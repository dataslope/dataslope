import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NEGATIONS, RESET, RESET_EXAMPLE, signed, traceOf, type Trace } from "./data";
import { Chip, ChipRow, CHIP_LINE, FIG_Y, Headline, INK, INK_SOFT, Kicker, Mark, NEG, NEG_INK, POS, POS_INK, Strike, TokenCol, TokenRow, X0 } from "./parts";
import { ds } from "../../theme/brand";

const RULE_ON_Y = 334;
const RULE_OFF_Y = 398;
const RULE_CHIPS_X = 420;
/** The reset example, under the rule, with the flag's lamp under each token. */
const EX_Y = 462;
const FIG17_Y = 574;
const ROW_Y = [628, 742, 856];
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
 * sentiment word flips its sign, punctuation and "but" switch it off. The
 * reset runs on "Not really, it was good" (the video's own sentence: none of
 * the lesson's examples needs it), with a lamp showing the flag after each
 * token. Then three of the lesson's reviews, token by token: "not good" now
 * negative, "not bad at all" positive, and the mixed review netting to
 * neutral.
 */
export const FlagScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const start = n.beat("flag").from;
  const negationAt = n.word("flag", "A negation");
  const spokenAt = [n.word("flag", "not"), n.word("flag", "no"), n.word("flag", "never")];
  const onAt = n.word("flag", "switches it on");
  const flipsAt = n.word("flag", "flips its sign");
  const resetAt = { comma: n.word("reset", "A comma"), stop: n.word("reset", "full stop"), but: n.word("reset", "the word but") };
  const offAt = n.word("reset", "switches it off");
  const reachAt = n.word("reset", "can't reach");
  const clauseAt = n.word("reset", "next clause");
  const exAt = n.word("reset-ex", "Not really");
  const exGoodAt = n.word("reset-ex", "it was good");
  const commaAt = n.word("reset-ex", "comma clears");
  const plusOneAt = n.word("reset-ex", "plus one");
  const rowAt = [n.word("fixed", "it is not good"), n.word("fixed", "this is not bad at all"), n.word("mixed", "The plot was good")];
  const verdictAt = [n.word("fixed", "negative"), n.word("fixed", "positive"), n.word("mixed", "neutral")];
  const plusAt = n.word("mixed", "Plus one");
  const minusAt = n.word("mixed", "minus one");

  return (
    <AbsoluteFill>
      {/* ── Sound: the rule's two rows, each review, each verdict ── */}
      <Sfx name="el-pencil" at={negationAt - 4} level={-36} />
      <Sfx name="el-pencil" at={resetAt.comma - 4} level={-36} />
      <Sfx name="el-tap" at={exAt - 2} level={-30} />
      <Sfx name="el-tap" at={plusOneAt + 2} level={-28} />
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
          return <Chip key={w} text={w} size={28} at={k >= 0 ? spokenAt[k] - 2 : spokenAt[2] + 8} bump={[onAt + 2 * NEG_ORDER.indexOf(w), reachAt + 8]} />;
        })}
      </ChipRow>
      <Ink at={resetAt.comma - 4} dur={14} style={{ left: X0, top: y(RULE_OFF_Y) + 8, ...label(23, INK), whiteSpace: "nowrap" }}>
        <Mark at={offAt - 2}>Flag off</Mark>
      </Ink>
      <ChipRow x={RULE_CHIPS_X} y={y(RULE_OFF_Y)}>
        {RESET.map((w, k) => {
          const spoken = RESET_SPOKEN[w];
          return (
            <Chip
              key={w}
              text={w}
              size={28}
              at={spoken ? resetAt[spoken] - 2 : resetAt.stop + 4 + k}
              mono={w.length === 1}
              bump={[offAt + k * 2, reachAt + k * 2, ...(w === "but" ? [clauseAt] : [])]}
            />
          );
        })}
      </ChipRow>
      {/* The reset, run on a sentence: the lamp under each token is the flag after it. */}
      <Ink at={exAt - 4} dur={12} style={{ left: X0, top: y(EX_Y) + 52, ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
        flag
      </Ink>
      <TraceRow
        trace={RESET_EXAMPLE}
        x={RULE_CHIPS_X}
        top={y(EX_Y)}
        at={exAt - 2}
        stagger={k => (k < 2 ? 0 : exGoodAt - exAt + (k - 2) * 2)}
        verdictAt={plusOneAt + 4}
        badgeAt={[plusOneAt]}
        lamps
        bumpComma={commaAt}
      />
      <Note at={plusOneAt + 14} x={VERDICT_X} y={y(EX_Y) + 48}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          with no reset: {signed(RESET_EXAMPLE.scoreWithoutReset)}, {RESET_EXAMPLE.labelWithoutReset}
        </span>
      </Note>

      {/* ── Fig. 17: three reviews, token by token ── */}
      {/* The first review demonstrates the rule as the flag beat describes it,
          and gets its verdict in the "fixed" beat with the second. */}
      <FigLabel n="17" title="Three of the lesson’s reviews, token by token" at={negationAt + 2} x={X0} y={y(FIG17_Y)} />
      {ROWS.map((r, i) => (
        <TraceRow
          key={r.text}
          trace={r}
          top={y(ROW_Y[i])}
          at={i === 0 ? negationAt - 2 : rowAt[i]}
          verdictAt={verdictAt[i]}
          badgeAt={i === 2 ? [plusAt, minusAt] : i === 0 ? [flipsAt] : undefined}
          markAt={i === 0 ? onAt - 2 : undefined}
          bump={i === 0 ? rowAt[0] : undefined}
        />
      ))}
    </AbsoluteFill>
  );
};

/** One review, token by token: a negation marked, a flipped word showing its
 *  sign before and after, then the sum and the verdict. With `lamps`, a lamp
 *  under each token shows the flag after it: lit while on, hollow when off. */
const TraceRow: React.FC<{
  trace: Trace;
  top: number;
  at: number;
  verdictAt: number;
  x?: number;
  stagger?: (k: number) => number;
  badgeAt?: number[];
  markAt?: number;
  bump?: number;
  bumpComma?: number;
  lamps?: boolean;
}> = ({ trace, top, at, verdictAt, x = X0, stagger, badgeAt, markAt, bump, bumpComma, lamps }) => {
  const frame = useCurrentFrame();
  let scored = 0;
  return (
    <>
      <TokenRow x={x} top={top}>
        {trace.steps.map((s, k) => {
          const polar = s.polarity !== 0;
          const tokenAt = at + (stagger ? stagger(k) : k * 2);
          const badge = polar ? (badgeAt ? badgeAt[scored++] - 2 : tokenAt + 10) : 0;
          const flipped = s.role === "flipped";
          const sign = polar ? (
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
          ) : null;
          return (
            <TokenCol
              key={k}
              chip={
                <Chip
                  text={s.token}
                  size={CHIP}
                  at={tokenAt}
                  mark={s.role === "negation" ? (markAt ?? tokenAt + 4) : undefined}
                  bump={bumpComma !== undefined && s.role === "reset" ? bumpComma : bump === undefined ? undefined : bump + k * 2}
                  tone={polar ? (s.polarity > 0 ? POS : NEG) : undefined}
                  toneAt={badge}
                  mono={s.token.length === 1}
                  style={{ marginRight: 0 }}
                />
              }
              below={
                lamps ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Lamp on={Boolean(s.flag)} at={tokenAt + 4} />
                    {sign}
                  </span>
                ) : (
                  sign
                )
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

/** The flag after a token: a lit yellow lamp while it is on, hollow when off. */
const Lamp: React.FC<{ on: boolean; at: number }> = ({ on, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: 999,
        boxSizing: "border-box",
        border: `2px solid ${on ? ds("yellow", 700) : CHIP_LINE}`,
        background: on ? ds("yellow", 400) : "transparent",
        opacity: p,
        transform: `scale(${0.6 + 0.4 * p})`,
      }}
    />
  );
};
