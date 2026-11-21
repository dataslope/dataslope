import { Bot, BrainCircuit, Search, Ticket } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, label } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { RAG, RECALL_FOLLOW, SOURCES } from "./data";
import {
  Arrow,
  BAD,
  BAD_INK,
  Box,
  Clear,
  Cross,
  DATA,
  DATA_LIGHT,
  Drift,
  Fade,
  GOOD_INK,
  Line,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK,
  pct,
  type Rect,
  Strike,
  X0,
} from "./parts";

/** The two halves: their left edges and the rule between. */
const GEN_X = 1040;
const RULE_X = 960;
/** The three queries' rows of five ranked slots. */
const SLOT_X = 250;
const SLOT_W = 50;
const SLOT_H = 38;
const SLOT_GAP = 10;
const QUERY_Y = [584, 640, 696] as const;
/** An empty slot: a light grey block, no outline. */
const EMPTY = ds("gray", 200);

/**
 * Question 3. The assistant split into its two halves, retrieval feeding
 * passages to generation, with a hairline between their columns, and each
 * half measured on its own. Retrieval: recall@k and MRR, then three queries
 * as rows of five ranked slots with the right document green at rank 1, at
 * rank 3 and nowhere, so recall@5 is 2/3 and MRR 0.44. Generation:
 * faithfulness, relevance and citations, then a true claim the passages
 * don't support failing faithfulness. The follow-up on a clean page:
 * recall@5 of 0.45 (red, on the retrieval side), a prompt rewrite struck on
 * the generation side, the fixes in green where they belong; and under both,
 * a long context whose middle is paler than its ends.
 */
export const RagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "How do you evaluate a RAG system");
  const halvesAt = n.word("q3", "two halves");
  const eachAt = n.word("q3", "measure each one");

  const retrAt = n.word("q3-retrieval", "Retrieval comes first");
  const labeledAt = n.word("q3-retrieval", "a labeled set of queries");
  const recallAt = n.word("q3-retrieval", "Recall at k");
  const mrrAt = n.word("q3-retrieval", "And MRR");

  const threeAt = n.word("q3-example", "Take three queries");
  const ranksAt = [n.word("q3-example", "ranks first"), n.word("q3-example", "third", { nth: 1 }), n.word("q3-example", "and nowhere")];
  const recall5At = n.word("q3-example", "Recall at five is two in three");
  const avgAt = n.word("q3-example", "MRR averages");
  const pointAt = n.word("q3-example", "point four four");

  const genAt = n.word("q3-generation", "Then generation");
  const faithAt = n.word("q3-generation", "Faithfulness");
  const relevAt = n.word("q3-generation", "Answer relevance");
  const citeAt = n.word("q3-generation", "citation accuracy");

  const judgedAt = n.word("q3-faith", "Faithfulness is judged");
  const rightAt = n.word("q3-faith", "a right answer");
  const supportAt = n.word("q3-faith", "the passages don't support");
  const failsAt = n.word("q3-faith", "still fails");
  const checkAt = n.word("q3-faith", "you can't check");

  const followAt = n.word("q3-follow", "The follow-up");
  const p45At = n.word("q3-follow", "point four five");
  const promptAt = n.word("q3-follow", "Rewriting the prompt");
  const helpAt = n.word("q3-follow", "won't help");
  const halfAt = n.word("q3-follow", "more than half the time");
  const fixAt = n.word("q3-follow", "Fix retrieval first");
  const fixes = [
    { text: "better chunking", at: n.word("q3-follow", "better chunking") },
    { text: "hybrid keyword search", at: n.word("q3-follow", "hybrid keyword search") },
    { text: "a reranker", at: n.word("q3-follow", "a reranker") },
  ];

  const fiftyAt = n.word("q3-middle", "the top fifty");
  const insteadAt = n.word("q3-middle", "instead");
  const startEndAt = n.word("q3-middle", "the start and end");
  const middleAt = n.word("q3-middle", "better than the middle");
  const fewAt = n.word("q3-middle", "a few well-ranked passages");
  const earnsAt = n.word("q3-middle", "earns its latency");
  const actAt = n.word("q4-in", "Filing the ticket");
  const end = n.beat("q4-in").to;

  const retr: Rect = { cx: X0 + 150, cy: y(312), w: 300, h: 68 };
  const gen: Rect = { cx: GEN_X + 160, cy: y(312), w: 320, h: 68 };
  const slot = (q: number, r: number) => ({ x: SLOT_X + r * (SLOT_W + SLOT_GAP), y: y(QUERY_Y[q]) - SLOT_H / 2 });
  const clearAt = followAt - 6;

  // The long context: 50 passages, the ends used well and the middle less.
  const CTX_X = X0;
  const CTX_W = 980;
  const CTX_N = 50;
  const ctxY = y(752);
  const pale = ease(frame, middleAt, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={halvesAt + 2} level={-31} />
      <Sfx name="el-pop" at={halvesAt + 10} level={-33} />
      <Sfx name="el-tap" at={recallAt} level={-31} />
      <Sfx name="el-tap" at={mrrAt + 4} level={-31} />
      <Sfx name="el-sprinkle" at={labeledAt + 6} level={-36} />
      <Sfx name="el-tap" at={threeAt + 2} level={-33} />
      {ranksAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t + 4} level={-32} />
      ))}
      <Sfx name="el-pop" at={pointAt + 2} level={-30} />
      <Sfx name="el-tap" at={faithAt} level={-31} />
      <Sfx name="el-tap" at={relevAt} level={-32} />
      <Sfx name="el-tap" at={citeAt} level={-32} />
      <Sfx name="el-scratch" at={supportAt + 6} level={-35} />
      <Sfx name="el-whoosh" at={clearAt} level={-37} />
      <Sfx name="el-pop" at={p45At + 2} level={-31} />
      <Sfx name="el-scratch" at={helpAt + 2} level={-33} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-32} />
      ))}
      <Sfx name="el-sprinkle" at={fiftyAt} level={-37} />
      <Sfx name="el-scratch" at={insteadAt + 2} level={-34} />
      <Sfx name="el-chime" at={earnsAt + 14} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you evaluate a RAG system?
        </QuestionCard>

        {/* The two halves, retrieval handing passages to generation. */}
        <Box
          r={retr}
          at={halvesAt}
          title="Retrieval"
          icon={Search}
          size={26}
          tones={[
            { at: retrAt, tone: "lit" },
            { at: genAt, tone: "plain" },
            { at: followAt, tone: "lit" },
            { at: fiftyAt, tone: "plain" },
          ]}
        />
        <Arrow points={[[retr.cx + retr.w / 2 + 8, retr.cy], [gen.cx - gen.w / 2 - 8, gen.cy]]} at={halvesAt + 6} color={DATA} />
        <Line x={(retr.cx + retr.w / 2 + gen.cx - gen.w / 2) / 2} width={300} align="center" y={retr.cy - 50} at={halvesAt + 10} size={21} color={DATA}>
          passages
        </Line>
        <Box
          r={gen}
          at={halvesAt + 8}
          title="Generation"
          icon={BrainCircuit}
          size={26}
          tones={[
            { at: genAt, tone: "lit" },
            { at: followAt, tone: "plain" },
          ]}
        />
        <Line x={(retr.cx + retr.w / 2 + gen.cx - gen.w / 2) / 2} width={460} align="center" y={retr.cy + 14} at={eachAt} size={22} color={INK_SOFT}>
          Measure each one
        </Line>
        <ColumnRule x={RULE_X} top={y(380)} height={y(650) - y(380)} at={retrAt} />

        <Clear at={clearAt}>
          {/* Retrieval's two metrics. */}
          <Line x={X0} y={y(388)} at={labeledAt} size={22} color={INK_SOFT}>
            Over labeled queries and their relevant documents
          </Line>
          <Line x={X0} y={y(388) + 50} at={recallAt} size={26}>
            <b>Recall@k:</b> did the right documents make the top{" "}
            <MathRun>
              <I>k</I>
            </MathRun>
            ?
          </Line>
          <Line x={X0} y={y(388) + 100} at={mrrAt} size={26}>
            <b>MRR:</b> how high did the first relevant one rank?
          </Line>

          {/* Three queries, five ranked slots each, one right document. */}
          {[1, 2, 3, 4, 5].map((r) => (
            <div
              key={r}
              style={{
                position: "absolute",
                left: slot(0, r - 1).x,
                width: SLOT_W,
                top: slot(0, 0).y - 32,
                textAlign: "center",
                ...label(19, INK_SOFT),
                opacity: ease(frame, recallAt + r, 10),
              }}
            >
              {r}
            </div>
          ))}
          {RAG.ranks.map((rank, q) => (
            <React.Fragment key={q}>
              <Line x={X0} y={y(QUERY_Y[q]) - 13} at={labeledAt + 4 + q * 4} size={21} color={frame >= threeAt + q * 3 ? INK : INK_SOFT}>
                Query {q + 1}
              </Line>
              {[0, 1, 2, 3, 4].map((r) => {
                const s = slot(q, r);
                const p = ease(frame, labeledAt + 4 + q * 4 + r * 2, 8);
                const hit = rank === r + 1 ? ease(frame, ranksAt[q] + 4, 10) : 0;
                return (
                  <div
                    key={r}
                    style={{
                      position: "absolute",
                      left: s.x,
                      top: s.y,
                      width: SLOT_W,
                      height: SLOT_H,
                      borderRadius: 4,
                      background: hit > 0 ? `color-mix(in srgb, ${OK} ${Math.round(hit * 100)}%, ${EMPTY})` : EMPTY,
                      opacity: p,
                      transform: `scale(${0.8 + 0.2 * p})`,
                    }}
                  />
                );
              })}
              <Line x={SLOT_X + 5 * (SLOT_W + SLOT_GAP) + 20} y={y(QUERY_Y[q]) - 15} at={ranksAt[q] + 4} size={24} color={rank ? GOOD_INK : BAD_INK}>
                {rank ? `rank ${rank}` : "nowhere"}
                <span style={{ color: INK_SOFT }}>
                  {" "}
                  · <Fade at={avgAt + q * 6}>{rank ? <MathRun>1/{rank}</MathRun> : <MathRun>0</MathRun>}</Fade>
                </span>
              </Line>
            </React.Fragment>
          ))}
          <Line x={X0} y={y(760)} at={recall5At} size={28}>
            Recall@5 ={" "}
            <MathRun>
              <Num>2/3</Num>
            </MathRun>
          </Line>
          <Line x={X0} y={y(760) + 52} at={avgAt} size={28}>
            MRR ={" "}
            <MathRun>
              (1 + 1/3 + 0) / 3 ={" "}
              <span style={{ opacity: ease(frame, pointAt - 2, 10) }}>
                <Mark at={pointAt + 4}>{RAG.mrr.toFixed(2)}</Mark>
              </span>
            </MathRun>
          </Line>

          {/* Generation's three. */}
          <Line x={GEN_X} y={y(388) + 50} at={faithAt} size={26}>
            <b>Faithfulness:</b> is every claim supported by the passages?
          </Line>
          <Line x={GEN_X} y={y(388) + 100} at={relevAt} size={26}>
            <b>Answer relevance:</b> does it address the question?
          </Line>
          <Line x={GEN_X} y={y(388) + 150} at={citeAt} size={26}>
            <b>Citation accuracy</b>
          </Line>

          {/* A true claim the passages don't support. */}
          <Line x={GEN_X} y={y(640)} at={judgedAt} size={24} color={INK_SOFT}>
            Judged against the passages, not the truth
          </Line>
          <Line x={GEN_X} y={y(640) + 50} at={rightAt - 4} size={26}>
            Monitors are covered up to $300
          </Line>
          <div style={{ position: "absolute", left: GEN_X, top: y(640) + 100, display: "flex", alignItems: "center", gap: 12, fontSize: 24 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, rightAt, 10) }}>
              <Tick at={rightAt + 2} size={24} />
              <span style={{ ...label(24, GOOD_INK) }}>true</span>
            </span>
            <span style={{ width: 24 }} />
            <span style={{ display: "flex", alignItems: "center", gap: 10, opacity: ease(frame, supportAt, 10) }}>
              <Cross at={supportAt + 4} size={22} />
              <span style={{ ...label(24, BAD_INK) }}>not in the passages</span>
            </span>
          </div>
          <Line x={GEN_X} y={y(640) + 150} at={failsAt} size={26} color={BAD_INK} weight={600}>
            <Mark at={failsAt + 6} color={MARK_BAD}>
              Fails faithfulness
            </Mark>
          </Line>
          <Line x={GEN_X} y={y(640) + 200} at={checkAt} size={24} color={INK_SOFT}>
            A claim you can&apos;t check
          </Line>
        </Clear>

        {/* The follow-up, on the half it belongs to. */}
        <Line x={X0} y={y(400)} at={followAt} size={24} color={INK_SOFT}>
          Answers are wrong, and
        </Line>
        <Line x={X0} y={y(400) + 44} at={p45At - 4} size={34} color={BAD_INK} weight={600}>
          Recall@5 = <Num>{RECALL_FOLLOW.recallAt5.toFixed(2)}</Num>
        </Line>
        <Line x={X0} y={y(400) + 106} at={halfAt} size={26}>
          The right passage is missing <Num>{pct(RECALL_FOLLOW.missing)}</Num> of the time
        </Line>
        <Line x={X0} y={y(400) + 176} at={fixAt} size={26} color={GOOD_INK} weight={600}>
          <Mark at={fixAt + 6} color={MARK_OK}>
            Fix retrieval first
          </Mark>
        </Line>
        <Line x={X0} y={y(400) + 226} at={fixes[0].at - 2} size={26} color={GOOD_INK}>
          {fixes.map((f, i) => (
            <Fade key={f.text} at={f.at}>
              {i ? ", " : ""}
              {f.text}
            </Fade>
          ))}
        </Line>
        <Line x={GEN_X} y={y(400) + 44} at={promptAt} size={34} color={BAD_INK} weight={600}>
          <Strike at={helpAt + 2} color={BAD}>
            Rewrite the prompt
          </Strike>
        </Line>
        <Line x={GEN_X} y={y(400) + 106} at={helpAt + 6} size={26}>
          Won&apos;t help: the passage never reached the model
        </Line>

        {/* Under both: a long context, used well at its ends. */}
        <Line x={CTX_X} y={ctxY - 62} at={fiftyAt - 2} size={26}>
          <Strike at={insteadAt + 2} color={BAD}>
            Top <Num>50</Num> passages
          </Strike>
          <span style={{ color: INK_SOFT }}> in one long context</span>
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: CTX_N }, (_, i) => {
            const p = ease(frame, fiftyAt + i * 0.4, 8);
            if (p <= 0) return null;
            const t = i / (CTX_N - 1);
            const middle = Math.min(1, Math.max(0, 1 - Math.abs(t - 0.5) / 0.32));
            const lightness = middle * pale;
            const w = CTX_W / CTX_N;
            return (
              <rect
                key={i}
                x={CTX_X + i * w}
                y={ctxY}
                width={w - 3}
                height={34 * p}
                rx={2}
                fill={lightness > 0 ? `color-mix(in srgb, ${DATA_LIGHT} ${Math.round(lightness * 100)}%, ${DATA})` : DATA}
              />
            );
          })}
        </svg>
        <Line x={CTX_X} y={ctxY + 46} at={startEndAt} size={20} color={INK_SOFT}>
          start
        </Line>
        <Line x={CTX_X + CTX_W / 2} width={300} align="center" y={ctxY + 46} at={middleAt} size={20} color={INK_SOFT}>
          middle
        </Line>
        <Line x={CTX_X + CTX_W - 3} align="right" y={ctxY + 46} at={startEndAt + 6} size={20} color={INK_SOFT}>
          end
        </Line>
        <Line x={CTX_X} y={ctxY + 88} at={middleAt + 8} size={20} color={INK_SOFT}>
          Lost in the middle ({SOURCES.lostInTheMiddle})
        </Line>
        <Line x={1240} y={ctxY - 62} at={fewAt} size={26} color={GOOD_INK} weight={600}>
          A few well-ranked
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: 5 }, (_, i) => {
            const p = ease(frame, fewAt + 4 + i * 2, 8);
            if (p <= 0) return null;
            return <rect key={i} x={1240 + i * (CTX_W / CTX_N)} y={ctxY} width={CTX_W / CTX_N - 3} height={34 * p} rx={2} fill={DATA} />;
          })}
        </svg>
        {/* The turn: the hook's assistant, small in the corner, its ticket
            tool lit. */}
        <Box r={{ cx: 1290, cy: y(190), w: 210, h: 54 }} at={actAt - 6} title="Assistant" icon={Bot} size={22} />
        <Arrow points={[[1403, y(190)], [1497, y(190)]]} at={actAt - 2} head={11} />
        <Box r={{ cx: 1630, cy: y(190), w: 250, h: 54 }} at={actAt} title="File a Ticket" icon={Ticket} size={22} tones={[{ at: actAt + 6, tone: "lit" }]} />
        <Line x={1240} y={ctxY + 46} at={earnsAt - 4} size={26}>
          <Mark at={earnsAt + 4}>A reranker earns its latency</Mark>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
