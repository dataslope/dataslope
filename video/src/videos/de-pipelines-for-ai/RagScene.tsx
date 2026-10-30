import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Box, Chip, DATA, DATA_TINT, Drift, head, LineArrow, Mark, MARK_OK, OK_INK, PathArrow, say, X0 } from "./parts";

const COL_W = 232;
const STEP = 294;
const BOX_H = 84;
const OFF_Y = 330;
const ON_Y = 500;
const NOTES_Y = 640;
const ROW = 62;

const OFFLINE = ["Sources", "Parse and clean", "Chunk", "Attach metadata", "Embed", "Upsert into vector index"];
const ONLINE = ["User query", "Embed query", "Search with metadata filter", "Rerank", "Prompt the LLM"];

/**
 * Question 2. The page's diagram built as it is read: the offline row
 * (sources to the vector index) and the online row (a question embedded,
 * searched with a filter, reranked, put in the prompt), joined by the
 * index. Then the offline steps are walked through, each box lit as it is
 * named with its detail below: extract incrementally, parse and clean, the
 * metadata every chunk carries and what it makes possible, and the upsert
 * keyed by a stable chunk id, so a retry overwrites rather than duplicates.
 */
export const RagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("rag").from;
  const qAt = n.word("rag", "Question");
  const textAt = n.word("rag", "Walk through the ingestion pipeline");
  const ragAt = n.word("rag", "RAG is retrieval-augmented generation");
  const findAt = n.word("rag", "find the passages");
  const answerAt = n.word("rag", "then answer from them");
  const offAt = n.word("rag-halves", "Offline");
  const buildsAt = n.word("rag-halves", "builds the index");
  const onAt = n.word("rag-halves", "Online");
  const onSteps = [
    n.word("rag-halves", "each question"),
    n.word("rag-halves", "is embedded"),
    n.word("rag-halves", "searched with a filter"),
    n.word("rag-halves", "reranked"),
    n.word("rag-halves", "the best hits fill the prompt"),
  ];
  const workAt = n.word("rag-extract", "Most of the work is offline");
  const extractAt = n.word("rag-extract", "Extract incrementally");
  const cdcAt = n.word("rag-extract", "change data capture");
  const wmAt = n.word("rag-extract", "an updated-at watermark");
  const parseAt = n.word("rag-extract", "Parse and clean");
  const cleanBits = [
    { text: "strip boilerplate", at: n.word("rag-extract", "strip boilerplate") },
    { text: "keep headings and tables", at: n.word("rag-extract", "keep headings and tables") },
    { text: "drop duplicates", at: n.word("rag-extract", "drop duplicates") },
  ];
  const chunkAt = n.word("rag-meta", "Chunk");
  const metaAt = n.word("rag-meta", "attach metadata to each chunk");
  const fields = [
    { text: "doc_id", at: n.word("rag-meta", "document id") },
    { text: "section", at: n.word("rag-meta", "section") },
    { text: "updated_at", at: n.word("rag-meta", "timestamps") },
    { text: "allowed_readers", at: n.word("rag-meta", "who may read it") },
  ];
  const makesAt = n.word("rag-meta", "That makes filters, citations and deletes possible");
  const embedAt = n.word("rag-upsert", "embed and upsert");
  const keyAt = n.word("rag-upsert", "keyed by a stable chunk id");
  const retryAt = n.word("rag-upsert", "a retried batch overwrites");
  const dupAt = n.word("rag-upsert", "instead of duplicating");
  const end = n.beat("rag-upsert").to;

  const offAts = OFFLINE.map((_, i) => offAt + 4 + i * 5);
  const lits = [extractAt, parseAt, chunkAt, metaAt, embedAt, embedAt + 6];
  const litOuts = [parseAt, chunkAt, metaAt, embedAt, undefined, undefined];
  const colX = (i: number) => X0 + i * STEP;
  const offMid = y(OFF_Y) + BOX_H / 2;
  const onMid = y(ON_Y) + BOX_H / 2;
  const noteY = (i: number) => y(NOTES_Y) + i * ROW * 1.14;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={offAt} level={-36} />
      <Sfx name="el-whoosh" at={onAt} level={-36} />
      {[extractAt, parseAt, metaAt, embedAt].map((t) => (
        <Sfx key={t} name="el-tap" at={t} level={-35} />
      ))}
      {fields.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-37} />
      ))}
      <Sfx name="el-pencil" at={retryAt + 4} level={-36} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={56}>
          Walk through the ingestion pipeline for a RAG assistant.
        </QuestionCard>
        <Note at={ragAt} x={X0} y={y(236)}>
          <span style={say(24, INK)}>
            <b>RAG</b>, retrieval-augmented generation:{" "}
            <span style={{ opacity: ease(frame, findAt - 2, 10) }}>find the passages</span>
            <span style={{ opacity: ease(frame, answerAt - 2, 10) }}>, then answer from them</span>
          </span>
        </Note>

        {/* The two halves. */}
        <Note at={offAt} x={X0} y={y(OFF_Y) - 40}>
          <span style={head(22, INK)}>
            Offline ingestion<span style={{ ...head(22, INK_SOFT), opacity: ease(frame, buildsAt, 10) }}>: builds the index</span>
          </span>
        </Note>
        {OFFLINE.map((t, i) => (
          <Box
            key={t}
            x={colX(i)}
            y={y(OFF_Y)}
            w={COL_W}
            h={BOX_H}
            at={offAts[i]}
            lit={lits[i]}
            litOut={litOuts[i]}
            tone={i === 5 ? DATA : undefined}
            fill={i === 5 ? DATA_TINT : undefined}
            size={22}
          >
            {i === 5 ? <span style={{ color: BLUE_INK }}>{t}</span> : t}
          </Box>
        ))}
        {OFFLINE.slice(1).map((t, i) => (
          <LineArrow key={t} from={[colX(i) + COL_W + 8, offMid]} to={[colX(i + 1) - 8, offMid]} at={offAts[i + 1] - 2} dur={8} />
        ))}

        <Note at={onAt} x={X0} y={y(ON_Y) - 40} dim={workAt}>
          <span style={head(22, INK)}>Online query</span>
        </Note>
        {ONLINE.map((t, i) => (
          <Box key={t} x={colX(i)} y={y(ON_Y)} w={COL_W} h={BOX_H} at={onSteps[i] - 2} dim={workAt} size={22}>
            {t}
          </Box>
        ))}
        {ONLINE.slice(1).map((t, i) => (
          <LineArrow key={t} from={[colX(i) + COL_W + 8, onMid]} to={[colX(i + 1) - 8, onMid]} at={onSteps[i + 1] - 4} dur={8} dim={workAt} />
        ))}
        {/* The index serves the search. */}
        <div style={{ opacity: 1 - ease(frame, workAt, 12) * 0.6 }}>
          <PathArrow
            points={[
              [colX(5) + COL_W / 2, y(OFF_Y) + BOX_H + 8],
              [colX(5) + COL_W / 2, (y(OFF_Y) + BOX_H + y(ON_Y)) / 2],
              [colX(2) + COL_W / 2, (y(OFF_Y) + BOX_H + y(ON_Y)) / 2],
              [colX(2) + COL_W / 2, y(ON_Y) - 8],
            ]}
            radius={22}
            at={onSteps[2]}
            dur={16}
            color={DATA}
            width={2.4}
          />
        </div>

        {/* The offline steps, walked through. */}
        <Note at={extractAt - 2} x={X0} y={noteY(0)}>
          <span style={say(25, INK)}>
            <b>Extract</b> incrementally:{" "}
            <span style={{ opacity: ease(frame, cdcAt - 2, 10) }}>change data capture</span>
            <span style={{ opacity: ease(frame, wmAt - 2, 10) }}>, or an updated-at watermark</span>
          </span>
        </Note>
        <Note at={parseAt - 2} x={X0} y={noteY(1)}>
          <span style={say(25, INK)}>
            <b>Parse and clean</b>:{" "}
            {cleanBits.map((b, i) => (
              <span key={b.text} style={{ opacity: ease(frame, b.at - 2, 10) }}>
                {i ? " · " : ""}
                {b.text}
              </span>
            ))}
          </span>
        </Note>
        <Note at={metaAt - 2} x={X0} y={noteY(2)}>
          <span style={say(25, INK)}>
            <b>Chunk</b>, then <b>attach metadata</b>:
          </span>
        </Note>
        {fields.map((f, i) => (
          <Chip key={f.text} x={X0 + 400 + [0, 150, 290, 470][i]} y={noteY(2) - 8} at={f.at - 2} size={22} ink={BLUE_INK}>
            <span style={{ fontFamily: MONO, fontVariantLigatures: "none" }}>{f.text}</span>
          </Chip>
        ))}
        <Note at={makesAt - 2} x={X0 + 1180} y={noteY(2)}>
          <span style={say(24, INK)}>
            → <Mark at={makesAt + 6}>filters, citations, deletes</Mark>
          </span>
        </Note>
        <Note at={embedAt - 2} x={X0} y={noteY(3) + 10}>
          <span style={say(25, INK)}>
            <b>Embed and upsert</b>,{" "}
            <span style={{ opacity: ease(frame, keyAt - 2, 10) }}>
              keyed by a stable chunk id (<span style={{ fontFamily: MONO, fontSize: "0.9em" }}>doc1#0</span>)
            </span>
          </span>
        </Note>
        <Note at={retryAt - 2} x={X0 + 760} y={noteY(3) + 10}>
          <span style={say(25, OK_INK, 600)}>
            <Mark at={retryAt + 6} color={MARK_OK}>a retried batch overwrites</Mark>
            <span style={{ color: INK_SOFT, opacity: ease(frame, dupAt - 2, 10), fontWeight: 500 }}>, never a second copy</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

