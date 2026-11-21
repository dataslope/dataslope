import { Clock, Coins } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ColHead, Drift, INK, INK_SOFT, Line, Mark, MARK_OK, OK_INK, Q_SIZE, X0 } from "./parts";

const COLS = [X0, 1000];
const COL_W = [760, 780];

/**
 * Question 14. Two columns under their own headings: RAG for knowledge
 * (facts that change, private, too many), fine-tuning for behavior (a style,
 * a vocabulary, an output format), and across both, in green, the rule that
 * they compose. Then the bill under each, with a clock and coins drawn
 * small: per request against up front and at each retrain, neither colored,
 * since it is a trade-off.
 */
export const ChooseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q14").from;
  const qAt = n.word("q14", "Question fourteen");
  const textAt = n.word("q14", "When would you choose RAG");
  const ragAt = n.word("q14-a", "RAG for knowledge");
  const changeAt = n.word("q14-a", "facts that change");
  const privateAt = n.word("q14-a", "are private");
  const manyAt = n.word("q14-a", "too many to memorize");
  const storeAt = n.word("q14-a", "updating the store needs no training");
  const ftAt = n.word("q14-a", "Fine-tuning for behavior");
  const styleAt = n.word("q14-a", "a style");
  const vocabAt = n.word("q14-a", "a vocabulary");
  const formatAt = n.word("q14-a", "an output format");
  const composeAt = n.word("q14-a", "They compose");
  const ruleAt = n.word("q14-a", "fine-tune for behavior, retrieve for facts");
  const billAt = n.word("q14-cost", "count the bill");
  const everyAt = n.word("q14-cost", "every request");
  const tokensAt = n.word("q14-cost", "prompt tokens");
  const upAt = n.word("q14-cost", "pays up front");
  const againAt = n.word("q14-cost", "again each time");
  const retrainAt = n.word("q14-cost", "retrained");
  const end = n.beat("q14-cost").to;

  const headY = y(320);
  const itemY = (i: number) => y(414) + i * h(56);
  const COLUMNS = [
    { head: "RAG: knowledge", at: ragAt, items: [{ t: "Facts that change", at: changeAt }, { t: "Private facts", at: privateAt }, { t: "Too many to memorize", at: manyAt }], note: { t: "Updating the store needs no training", at: storeAt } },
    { head: "Fine-tuning: behavior", at: ftAt, items: [{ t: "A style", at: styleAt }, { t: "A vocabulary", at: vocabAt }, { t: "An output format", at: formatAt }], note: null },
  ];
  const billY = y(810);
  const Icon: React.FC<{ I: typeof Clock; at: number }> = ({ I, at }) => (
    <span style={{ display: "inline-flex", opacity: ease(frame, at, 10), transform: `translateY(${(1 - ease(frame, at, 10)) * 6}px)` }}>
      <I size={28} color={INK} strokeWidth={1.9} />
    </span>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={ragAt} level={-32} />
      <Sfx name="el-tap" at={ftAt} level={-32} />
      <Sfx name="el-pencil" at={ruleAt} level={-35} />
      <Sfx name="el-tap" at={everyAt} level={-34} />
      <Sfx name="el-tap" at={upAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={14} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          When would you choose RAG over fine-tuning, and vice versa?
        </QuestionCard>

        {COLUMNS.map((c, ci) => (
          <React.Fragment key={c.head}>
            <ColHead at={c.at} x={COLS[ci]} y={headY} w={COL_W[ci]} size={30}>
              {c.head}
            </ColHead>
            {c.items.map((it, i) => (
              <Line key={it.t} at={it.at} x={COLS[ci]} y={itemY(i)} size={26}>
                {it.t}
              </Line>
            ))}
            {c.note ? (
              <Line at={c.note.at} x={COLS[ci]} y={itemY(3) + h(6)} size={22} color={INK_SOFT}>
                {c.note.t}
              </Line>
            ) : null}
          </React.Fragment>
        ))}

        {/* They compose. */}
        <Line at={composeAt} x={X0} y={y(676)} size={30} color={OK_INK} weight={600}>
          They compose:{" "}
          <span style={{ opacity: ease(frame, ruleAt - 2, 10) }}>
            <Mark at={ruleAt + 6} color={MARK_OK}>
              fine-tune for behavior, retrieve for facts
            </Mark>
          </span>
        </Line>

        {/* The bill. */}
        <Line at={billAt} x={X0} y={billY - h(48)} size={22} color={INK_SOFT}>
          The bill
        </Line>
        <div style={{ position: "absolute", left: COLS[0], top: billY, display: "flex", alignItems: "center", gap: 12, fontSize: 26, opacity: ease(frame, everyAt, 12) }}>
          <Icon I={Clock} at={everyAt + 4} />
          <Icon I={Coins} at={tokensAt} />
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Every request: retrieval time<span style={{ opacity: ease(frame, tokensAt, 10) }}>, prompt tokens</span>
          </span>
        </div>
        <div style={{ position: "absolute", left: COLS[1], top: billY, display: "flex", alignItems: "center", gap: 12, fontSize: 26, opacity: ease(frame, upAt, 12) }}>
          <Icon I={Coins} at={upAt + 4} />
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Up front<span style={{ opacity: ease(frame, againAt, 10) }}>
              , <Mark at={retrainAt + 4}>and at each retrain</Mark>
            </span>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
