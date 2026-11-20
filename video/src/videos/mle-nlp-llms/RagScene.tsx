import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RETRIEVAL } from "./data";
import { ACCENT_INK, Box, Dim, Drift, Flow, INK, INK_SOFT, Line, Mark, MARK_BAD, MARK_OK, OK_INK, Q_SIZE, Spot, X0 } from "./parts";

const STEPS = ["Query", "Embed", "Vector Search", "Top Passages", "Prompt", "Answer"];
const BW = 214;
const STEP = 282;
/** The question's words the search can match on (results.json queryTerms). */
const termsIn = (q: string, terms: readonly string[]) =>
  q.split(/(\s+)/).map((w, i) => {
    const key = w.toLowerCase().replace(/[^a-z]/g, "");
    return { w, i, hit: terms.includes(key) };
  });

/**
 * Question 13. The page's flow as outlined boxes inked in order (query,
 * embed, vector search, top passages, prompt, answer), the card catalog
 * under the search, and the three reasons ticked. Then the miss: the track's
 * 167 answers ranked by shared words (results.json retrieval) for the
 * question in plain words; the hallucination answer scores 0.000, below 13
 * others, sharing none of the words (red). The word counts stand in for an
 * embedding model, and the screen says so.
 */
export const RagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q13").from;
  const qAt = n.word("q13", "Question thirteen");
  const textAt = n.word("q13", "What is retrieval-augmented generation");
  const embedAt = n.word("q13-a", "Embed the query");
  const fetchAt = n.word("q13-a", "fetch the most similar passages");
  const storeAt = n.word("q13-a", "a vector store");
  const putAt = n.word("q13-a", "put them in the prompt");
  const answerAt = n.word("q13-a", "to answer from");
  const groundsAt = n.word("q13-a", "It grounds answers");
  const freshAt = n.word("q13-a", "fresh or private knowledge");
  const citeAt = n.word("q13-a", "cite sources");
  const goodAt = n.word("q13-miss", "only as good as the retrieval");
  const searchAt = n.word("q13-miss", "Search this track's");
  const stopAt = n.word("q13-miss", "how to stop an LLM making things up");
  const hallAt = n.word("q13-miss", "the hallucination answer scores zero");
  const noneAt = n.word("q13-miss", "sharing none of those words");
  const meaningAt = n.word("q13-miss", "Retrieval has to match meaning");
  const keywordAt = n.word("q13-miss", "keyword search for exact names");
  const end = n.beat("q13-miss").to;

  const R = RETRIEVAL;
  const flowTop = y(300);
  const BH = h(56);
  const stepAt = [embedAt - 4, embedAt + 4, fetchAt, fetchAt + 14, putAt, answerAt];
  const boxX = (i: number) => X0 + i * STEP;

  const listTop = y(606);
  const ROW = h(40);
  const rowY = [listTop + h(56), listTop + h(56) + ROW, listTop + h(56) + 2 * ROW];
  const gapY = listTop + h(56) + 3 * ROW;
  const hallY = gapY + ROW;
  const scoreX = 1420;

  return (
    <AbsoluteFill>
      {STEPS.map((s, i) => (
        <Sfx key={s} name="el-tap" at={stepAt[i]} level={-34} />
      ))}
      <Sfx name="el-pop" at={storeAt} level={-30} />
      <Sfx name="el-pencil" at={groundsAt} level={-37} />
      <Sfx name="el-pencil" at={freshAt} level={-37} />
      <Sfx name="el-pencil" at={citeAt} level={-37} />
      <Sfx name="el-sprinkle" at={searchAt + 6} level={-35} />
      <Sfx name="el-tap" at={hallAt + 4} level={-30} />
      <Sfx name="el-chime" at={keywordAt + 30} level={-33} />

      <Drift from={from} to={end + 40} scale={0.012}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is retrieval-augmented generation, RAG, and why use it?
        </QuestionCard>

        {/* The flow, inked in order. */}
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <Box x={boxX(i)} y={flowTop} w={BW} h={BH} at={stepAt[i]} tone={i === 2 ? "data" : "plain"}>
              {s}
            </Box>
            {i > 0 ? <Flow points={[[boxX(i - 1) + BW + 6, flowTop + BH / 2], [boxX(i) - 8, flowTop + BH / 2]]} at={stepAt[i] - 4} dur={10} head={12} width={2.2} color={INK} /> : null}
          </React.Fragment>
        ))}
        <Spot id="drawers" at={storeAt} out={goodAt - 4} x={boxX(2) + 38} y={flowTop + BH + 84} w={136} />

        {/* Why use it. */}
        <Dim at={goodAt} to={0.4}>
          {[
            { t: "Grounds answers", at: groundsAt },
            { t: "Adds fresh or private knowledge, no retraining", at: freshAt },
            { t: "Lets you cite sources", at: citeAt },
          ].map((r, i) => {
            const p = ease(frame, r.at, 12);
            if (p <= 0) return null;
            return (
              <div key={r.t} style={{ position: "absolute", left: 1000, top: y(420) + i * h(50), display: "flex", alignItems: "center", gap: 14, opacity: p }}>
                <Tick at={r.at + 2} size={26} />
                <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>{r.t}</span>
              </div>
            );
          })}
        </Dim>

        {/* The miss: ranked by shared words. */}
        <Line at={searchAt} x={X0} y={listTop} size={26}>
          {termsIn(R.query, R.queryTerms).map((t) =>
            t.hit ? (
              <Mark key={t.i} at={stopAt + 4 + t.i}>
                {t.w}
              </Mark>
            ) : (
              <React.Fragment key={t.i}>{t.w}</React.Fragment>
            ),
          )}
        </Line>
        <Line at={searchAt + 8} x={RIGHT_X} y={listTop - h(30)} size={20} color={INK_SOFT} align="right" width={600}>
          Shared-word score over <Num>{R.passages}</Num> answers
        </Line>
        {R.top.map((r, i) => (
          <React.Fragment key={r.question}>
            <Line at={searchAt + 10 + i * 4} x={X0} y={rowY[i]} size={23} color={INK_SOFT}>
              <Num>{i + 1}</Num>
            </Line>
            <Line at={searchAt + 10 + i * 4} x={X0 + 44} y={rowY[i]} size={23}>
              {r.question}
            </Line>
            <Line at={searchAt + 12 + i * 4} x={scoreX} y={rowY[i]} size={23} align="right" width={140}>
              <Num>{r.score.toFixed(3)}</Num>
            </Line>
          </React.Fragment>
        ))}
        <Line at={searchAt + 24} x={X0 + 44} y={gapY} size={21} color={INK_SOFT}>
          <Num>{R.target.above}</Num> answers score above it
        </Line>
        <Line at={hallAt} x={X0 + 44} y={hallY} size={23} color={ACCENT_INK} weight={600}>
          <Mark at={hallAt + 6} color={MARK_BAD}>
            {R.target.question}
          </Mark>
        </Line>
        <Line at={hallAt + 4} x={scoreX} y={hallY} size={23} align="right" width={140} color={ACCENT_INK} weight={600}>
          <Num>{R.target.score.toFixed(3)}</Num>
        </Line>
        <Line at={noneAt} x={scoreX + 30} y={hallY} size={21} color={ACCENT_INK}>
          shares none of the words
        </Line>
        <Line at={meaningAt} x={X0} y={hallY + h(62)} size={26} color={OK_INK} weight={600}>
          <Mark at={meaningAt + 6} color={MARK_OK}>
            Match meaning: embeddings, plus keyword search for exact names
          </Mark>
        </Line>
        <Line at={searchAt + 14} x={RIGHT_X} y={listTop + 4} size={20} color={INK_SOFT} align="right" width={600}>
          Word counts stand in for an embedding model here
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};

const RIGHT_X = 1800;
