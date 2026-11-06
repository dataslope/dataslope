import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COST, thousands } from "./data";
import { Clear, Console, DATA_LIGHT, Drift, line, lineOf, Listing, Mark, X0 } from "./parts";

const LIST_SIZE = 20;
const LIST_Y = 340;
const RIGHT_X = 1100;
/** The day's bill as a bar: where it first sits beside the listing, and
 *  where it moves once the listing has gone. */
const BAR_A = { x: RIGHT_X, v: 520, px: 0.2 };
const BAR_B = { x: X0, v: 372, px: 0.36 };
const BAR_H = 58;
const HALF_P = 650;
const HALF_A = 768;
const NEXT_X = 1430;

/** A day's bill as one bar: input then output, each labelled inside. */
const Bill: React.FC<{
  x: number;
  top: number;
  px: number;
  input: number;
  output: number;
  at: number;
  height: number;
  /** The part of the original bill this one no longer pays, drawn dashed. */
  saved?: { from: number; width: number };
  litInput?: number;
}> = ({ x, top, px, input, output, at, height, saved, litInput }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const q = ease(frame, at + 10, 18);
  const lit = litInput === undefined ? 0 : ease(frame, litInput, 12);
  if (p <= 0) return null;
  const seg = (left: number, width: number, fill: string, ink: string, text: React.ReactNode, show: number) => (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: width * show,
        height,
        background: fill,
        display: "flex",
        alignItems: "center",
        paddingLeft: 14,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <span style={{ ...label(22, ink), fontWeight: 700, whiteSpace: "nowrap", opacity: ease(frame, at + 16, 10) }}>{text}</span>
    </div>
  );
  return (
    <>
      {lit > 0 ? (
        <div style={{ position: "absolute", left: x - 8, top: top - 8, width: input * px + 16, height: height + 16, borderRadius: 8, background: HIGHLIGHT, opacity: lit }} />
      ) : null}
      {seg(
        x,
        input * px,
        BAR,
        PAPER,
        <>
          input <Num>{thousands(input)}</Num>
        </>,
        p,
      )}
      {seg(
        x + input * px + 3,
        output * px,
        DATA_LIGHT,
        INK,
        <>
          output <Num>{thousands(output)}</Num>
        </>,
        q,
      )}
      {saved ? (
        <div
          style={{
            position: "absolute",
            left: saved.from,
            top,
            width: saved.width * ease(frame, at + 14, 14),
            height,
            boxSizing: "border-box",
            border: `2px dashed ${HAIRLINE}`,
            borderLeft: "none",
          }}
        />
      ) : null}
    </>
  );
};

/**
 * Question 5: what an LLM feature costs. The formula in words, then the
 * page's block as a listing, each of its numbers marked as the narration
 * reads it, and what it printed when check.mjs ran it; the day's bill as a
 * bar, input and output. The bar then takes the page: the levers that act on
 * the input go on its input segment, the next two beside it. Then the step
 * the page now takes too: per token, output costs five times input, but
 * halving the prompt saves 1,000 a day and halving the answer 750, both
 * drawn against the original bill.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cost").from;
  const qAt = n.word("cost", "Question five");
  const textAt = n.word("cost", "How do you estimate");
  const tokAt = n.word("cost", "Tokens, not requests");
  const dailyAt = n.word("cost", "daily requests");
  const inOutAt = n.word("cost", "times the tokens in and out");
  const pricesAt = n.word("cost", "times their prices");
  const differAt = n.word("cost", "differ for input and output");
  const exampleAt = n.word("cost-run", "The page's example");
  const reqAt = n.word("cost-run", "a million requests a day");
  const tokensAt = n.word("cost-run", "two thousand input tokens");
  const illusAt = n.word("cost-run", "Its prices are illustrative");
  const dollarAt = n.word("cost-run", "a dollar per million");
  const checkAt = n.word("cost-run", "Check your own provider's");
  const inputAt = n.word("cost-result", "Input comes to two thousand dollars");
  const outputAt = n.word("cost-result", "and output to fifteen hundred");
  const totalAt = n.word("cost-result", "That's thirty-five hundred a day");
  const monthAt = n.word("cost-result", "about a hundred and five thousand a month");
  const leverAt = n.word("cost-lever", "The breakdown says which lever");
  const largerAt = n.word("cost-lever", "Input is the larger share");
  const levers = [
    { text: "trim the prompt", at: n.word("cost-lever", "trimming the prompt") },
    { text: "cache the shared prefix", at: n.word("cost-lever", "caching the shared prefix") },
    { text: "retrieve fewer documents", at: n.word("cost-lever", "retrieving fewer documents") },
  ];
  const afterAt = n.word("cost-lever", "After that");
  const nexts = [
    { text: "easy requests → a smaller model", at: n.word("cost-lever", "route easy requests to a smaller model") },
    { text: "offline work → a batch API", at: n.word("cost-lever", "send offline work") },
  ];
  const fiveAt = n.word("cost-past", "costs five times an input token");
  const fewerAt = n.word("cost-past", "far fewer of them to cut");
  const halvePAt = n.word("cost-past", "Halve the prompt");
  const savedPAt = n.word("cost-past", "a thousand dollars a day");
  const halveAAt = n.word("cost-past", "Halve the answer");
  const savedAAt = n.word("cost-past", "seven hundred and fifty");
  const end = n.beat("cost-past").to;

  const code = COST.code;
  const marks = [
    { line: lineOf(code, "requests_per_day ="), at: reqAt },
    { line: lineOf(code, "input_tokens, output_tokens ="), at: tokensAt },
    { line: lineOf(code, "# Illustrative prices"), at: illusAt },
    { line: lineOf(code, "price_in, price_out ="), at: dollarAt },
  ];
  // The bill moves from beside the listing to across the page.
  const move = ease(frame, leverAt, 26);
  const bx = interpolate(move, [0, 1], [BAR_A.x, BAR_B.x]);
  const btop = interpolate(move, [0, 1], [y(BAR_A.v), y(BAR_B.v)]);
  const bpx = interpolate(move, [0, 1], [BAR_A.px, BAR_B.px]);
  const barH = h(BAR_H);
  const fullW = COST.daily * BAR_B.px;
  const halfPInput = COST.input - COST.halvePromptSaves;
  const halfAOutput = COST.output - COST.halveAnswerSaves;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={exampleAt} level={-35} />
      {marks.map((m) => (
        <Sfx key={m.line} name="el-tap" at={m.at + 2} level={-36} />
      ))}
      <Sfx name="el-tap" at={inputAt} level={-31} />
      <Sfx name="el-tap" at={outputAt} level={-31} />
      <Sfx name="el-whoosh" at={leverAt} level={-36} />
      {[...levers, ...nexts].map((l) => (
        <Sfx key={l.text} name="el-tap" at={l.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={halvePAt + 4} level={-32} />
      <Sfx name="el-pop" at={halveAAt + 4} level={-32} />
      <Sfx name="el-chime" at={savedAAt + 14} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you estimate the cost of an LLM feature?
        </QuestionCard>

        {/* The unit, and the formula, in words. */}
        <Clear at={leverAt}>
          <Note at={tokAt} x={X0} y={y(262)}>
            <span style={line(26, INK)}>
              <b>Tokens, not requests:</b>
              <span style={{ opacity: ease(frame, dailyAt - 2, 10) }}> daily requests</span>
              <span style={{ opacity: ease(frame, inOutAt - 2, 10) }}> × tokens in and out</span>
              <span style={{ opacity: ease(frame, pricesAt - 2, 10) }}> × price per million tokens</span>
              <span style={{ opacity: ease(frame, differAt - 2, 10), color: INK_SOFT }}>, input and output priced apart</span>
            </span>
          </Note>

          {/* The page's block, and what it printed. */}
          <Listing lines={code} x={X0} top={y(LIST_Y)} width={930} size={LIST_SIZE} at={exampleAt} marks={marks} />
          <Note at={inputAt - 4} x={RIGHT_X} y={y(LIST_Y)}>
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>What it prints</span>
          </Note>
          <Console
            lines={COST.printed}
            x={RIGHT_X}
            top={y(LIST_Y) + 40}
            width={700}
            at={inputAt - 2}
            lineAt={[inputAt, outputAt, totalAt]}
            marks={[{ line: 2, at: monthAt + 4 }]}
          />
        </Clear>

        {/* The day's bill: beside the listing, then across the page. */}
        <Bill x={bx} top={btop} px={bpx} input={COST.input} output={COST.output} at={inputAt + 4} height={barH} litInput={largerAt} />
        <Note at={leverAt + 20} x={X0} y={y(BAR_B.v) - 44}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            As written: <Num>{thousands(COST.daily)}</Num> USD a day
          </span>
        </Note>

        {/* The levers on the input, under its segment; the next two beside the bar. */}
        {[levers.slice(0, 2), levers.slice(2)].map((row, r) => (
          <div
            key={r}
            style={{ position: "absolute", left: X0, top: y(BAR_B.v) + barH + h(20 + r * 40), display: "flex", alignItems: "baseline", gap: 14, fontSize: 23 }}
          >
            {row.map((l, i) => {
              const p = ease(frame, l.at - 2, 12);
              return (
                <React.Fragment key={l.text}>
                  {i > 0 ? <span style={{ ...note(23, INK_SOFT), opacity: p }}>·</span> : null}
                  <span style={{ ...note(23, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap", opacity: p }}>{l.text}</span>
                </React.Fragment>
              );
            })}
          </div>
        ))}
        <Note at={afterAt} x={NEXT_X} y={y(BAR_B.v) - 44}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>after that</span>
        </Note>
        {nexts.map((l, i) => (
          <Ink key={l.text} at={l.at} dur={12} style={{ left: NEXT_X, top: y(BAR_B.v) + h(4 + i * 40) }}>
            <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{l.text}</span>
          </Ink>
        ))}

        {/* Per token, and per request. */}
        <Note at={fiveAt - 2} x={X0 + COST.input * BAR_B.px + 3} y={y(BAR_B.v) + barH + h(22)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            per token, output costs <b>{COST.outputPerTokenRatio}×</b> input
          </span>
        </Note>
        <Note at={fewerAt - 2} x={X0 + COST.input * BAR_B.px + 3} y={y(BAR_B.v) + barH + h(62)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            but a request has <Num>{thousands(COST.inputTokens)}</Num> in, <Mark at={fewerAt + 6}><Num>{COST.outputTokens}</Num> out</Mark>
          </span>
        </Note>

        {/* Halve each side, against the original bill. */}
        <Note at={halvePAt - 2} x={X0} y={y(HALF_P) - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Halve the prompt</span>
        </Note>
        <Bill
          x={X0}
          top={y(HALF_P)}
          px={BAR_B.px}
          input={halfPInput}
          output={COST.output}
          at={halvePAt + 2}
          height={barH}
          saved={{ from: X0 + (halfPInput + COST.output) * BAR_B.px + 3, width: fullW - (halfPInput + COST.output) * BAR_B.px - 3 }}
        />
        <Note at={savedPAt - 2} x={X0 + fullW + 24} y={y(HALF_P) + barH / 2 - 17}>
          <span style={{ ...note(26, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            saves <Num>{thousands(COST.halvePromptSaves)}</Num> a day
          </span>
        </Note>
        <Note at={halveAAt - 2} x={X0} y={y(HALF_A) - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Halve the answer</span>
        </Note>
        <Bill
          x={X0}
          top={y(HALF_A)}
          px={BAR_B.px}
          input={COST.input}
          output={halfAOutput}
          at={halveAAt + 2}
          height={barH}
          saved={{ from: X0 + (COST.input + halfAOutput) * BAR_B.px + 3, width: fullW - (COST.input + halfAOutput) * BAR_B.px - 3 }}
        />
        <Note at={savedAAt - 2} x={X0 + fullW + 24} y={y(HALF_A) + barH / 2 - 17}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            saves <Num>{COST.halveAnswerSaves}</Num> a day
          </span>
        </Note>

        <Ink at={checkAt} dur={14} style={{ left: X0, top: y(862) }}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
            The page&apos;s illustrative prices: <Num>{COST.priceIn.toFixed(2)}</Num> and <Num>{COST.priceOut.toFixed(2)}</Num> USD per million input and output tokens. Check your
            provider&apos;s.
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
