import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHUNK, num, pct } from "./data";
import { ChunkBracket, Doc, type DocRow, Drift, head, Mark, MARK_OK, OK_INK, X0 } from "./parts";
import { ds } from "../../theme/brand";

const COL = 340;
const DOC_W = 196;
const DOC_Y = 330;
const BR = DOC_W + 16;

/** Three sections, each a heading and its lines, each about its own topic. */
const ROWS: DocRow[] = [
  { kind: "h", w: 0.55 },
  { kind: "t", w: 0.95, topic: 0 },
  { kind: "t", w: 0.85, topic: 0 },
  { kind: "t", w: 0.92, topic: 0 },
  { kind: "t", w: 0.6, topic: 0 },
  { kind: "h", w: 0.45 },
  { kind: "t", w: 0.9, topic: 1 },
  { kind: "t", w: 0.95, topic: 1 },
  { kind: "t", w: 0.8, topic: 1 },
  { kind: "t", w: 0.7, topic: 1 },
  { kind: "h", w: 0.5 },
  { kind: "t", w: 0.92, topic: 2 },
  { kind: "t", w: 0.88, topic: 2 },
  { kind: "t", w: 0.95, topic: 2 },
  { kind: "t", w: 0.85, topic: 2 },
  { kind: "t", w: 0.5, topic: 2 },
];

/**
 * Question 3. Five copies of one document, three sections about three
 * topics. First the trade: a small chunk (two lines) matches precisely and
 * loses context; a large one (the whole page) keeps context but one vector
 * covers three topics, and costs more of the context window. Then the three
 * common strategies, each as brackets beside its own copy: fixed size with
 * the overlap lit (300 to 500 tokens, about 1,800 characters at 400, from
 * llm-tokens' measured prose rate), structure-aware cuts at the headings,
 * and small-to-big (retrieve a small chunk, send its section). Last, the
 * answer: measure recall on labeled questions, and version the settings.
 */
export const ChunkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("chunk").from;
  const qAt = n.word("chunk", "Question");
  const textAt = n.word("chunk", "How do you choose a chunking strategy");
  const tradeAt = n.word("chunk", "precision against context");
  const smallAt = n.word("chunk", "Small chunks match precisely");
  const loseAt = n.word("chunk", "can lose the context");
  const largeAt = n.word("chunk-large", "Large chunks keep context");
  const topicsAt = n.word("chunk-large", "one vector must cover several topics");
  const fuzzAt = n.word("chunk-large", "retrieval gets fuzzier");
  const windowAt = n.word("chunk-large", "takes more of the context window");
  const choicesAt = n.word("chunk-fixed", "Common choices");
  const fixedAt = n.word("chunk-fixed", "a fixed size");
  const sizeAt = n.word("chunk-fixed", "three to five hundred tokens");
  const overlapAt = n.word("chunk-fixed", "overlapping ten to twenty percent");
  const wholeAt = n.word("chunk-fixed", "is whole in one chunk");
  const structAt = n.word("chunk-struct", "Structure-aware");
  const headingsAt = n.word("chunk-struct", "split on headings and paragraphs");
  const mergeAt = n.word("chunk-struct", "merge toward the target");
  const s2bAt = n.word("chunk-struct", "small-to-big");
  const retrieveAt = n.word("chunk-struct", "retrieve small chunks");
  const sendAt = n.word("chunk-struct", "send the parent section");
  const bestAt = n.word("chunk-measure", "No universal best");
  const recallAt = n.word("chunk-measure", "measure retrieval recall");
  const storeAt = n.word("chunk-measure", "store the chunk settings");
  const rebuildAt = n.word("chunk-measure", "changing them means a rebuild");
  const end = n.beat("chunk-measure").to;

  const docY = y(DOC_Y);
  const cx = (i: number) => X0 + i * COL;
  const labelY = docY + ROWS.length * 22 + 40;
  const OVERLAP = `color-mix(in srgb, ${ds("yellow", 400)} 70%, transparent)`;

  const Caption: React.FC<{ i: number; at: number; dim?: number; children: React.ReactNode }> = ({ i, at, dim, children }) => (
    <Note at={at} x={cx(i)} y={labelY} width={COL - 24} dim={dim}>
      <div style={{ ...note(22, INK), lineHeight: 1.35 }}>{children}</div>
    </Note>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={smallAt + 4} level={-36} />
      <Sfx name="el-pencil" at={largeAt + 4} level={-36} />
      <Sfx name="el-sprinkle" at={topicsAt + 6} level={-36} />
      <Sfx name="el-pencil" at={fixedAt + 4} level={-36} />
      <Sfx name="el-tap" at={overlapAt + 4} level={-35} />
      <Sfx name="el-pencil" at={headingsAt + 2} level={-36} />
      <Sfx name="el-pencil" at={retrieveAt + 2} level={-36} />
      <Sfx name="el-chime" at={recallAt + 6} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you choose a chunking strategy?
        </QuestionCard>
        <Note at={tradeAt} x={X0} y={y(240)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={tradeAt + 4}>precision against context</Mark>
          </span>
        </Note>

        {/* The trade: one small chunk, one large. */}
        {[
          { i: 0, title: "small chunk", at: smallAt, r0: 2, r1: 3 },
          { i: 1, title: "large chunk", at: largeAt, r0: 0, r1: ROWS.length - 1 },
        ].map((c) => (
          <React.Fragment key={c.title}>
            <Note at={c.at - 2} x={cx(c.i)} y={docY - 44} dim={choicesAt}>
              <span style={head(22, INK)}>{c.title}</span>
            </Note>
            <Doc x={cx(c.i)} y={docY} w={DOC_W} rows={ROWS} at={c.at - 2} tint={c.i === 1 ? topicsAt : undefined} dim={choicesAt} />
            <ChunkBracket x={cx(c.i) + BR} docY={docY} r0={c.r0} r1={c.r1} at={c.at + 4} dim={choicesAt} />
          </React.Fragment>
        ))}
        <Caption i={0} at={smallAt + 2} dim={choicesAt}>
          matches precisely
          <br />
          <span style={{ color: ACCENT_INK, opacity: ease(frame, loseAt - 2, 10) }}>can lose the context the answer needs</span>
        </Caption>
        <Caption i={1} at={largeAt + 2} dim={choicesAt}>
          keeps context
          <br />
          <span style={{ color: ACCENT_INK, opacity: ease(frame, topicsAt - 2, 10) }}>one vector, three topics</span>
          <span style={{ color: ACCENT_INK, opacity: ease(frame, fuzzAt - 2, 10) }}>: fuzzier</span>
          <br />
          <span style={{ color: ACCENT_INK, opacity: ease(frame, windowAt - 2, 10) }}>more of the context window per hit</span>
        </Caption>

        {/* Fixed size, with the overlap lit. */}
        <Note at={fixedAt - 2} x={cx(2)} y={docY - 44}>
          <span style={head(22, INK)}>fixed size, overlapping</span>
        </Note>
        <Doc x={cx(2)} y={docY} w={DOC_W} rows={ROWS} at={fixedAt - 2} />
        {[
          { r0: 0, r1: 6, dx: 0 },
          { r0: 6, r1: 12, dx: 16 },
          { r0: 12, r1: 15, dx: 0 },
        ].map((c, k) => (
          <ChunkBracket key={k} x={cx(2) + BR + c.dx} docY={docY} r0={c.r0} r1={c.r1} at={fixedAt + 4 + k * 5} />
        ))}
        {[6, 12].map((r) => (
          <ChunkBracket
            key={r}
            x={cx(2) + BR + 34}
            docY={docY}
            r0={r}
            r1={r}
            at={overlapAt + 4}
            color={ds("yellow", 600)}
            band={{ x: cx(2) + 8, w: DOC_W - 16, color: OVERLAP }}
          />
        ))}
        <Caption i={2} at={sizeAt - 2}>
          {CHUNK.low} to {CHUNK.high} tokens
          <span style={{ opacity: ease(frame, overlapAt - 2, 10) }}>
            , {pct(CHUNK.overlapLow)} to {pct(CHUNK.overlapHigh)} shared
          </span>
          <br />
          <span style={{ color: INK_SOFT, fontSize: 20 }}>
            400 tokens ≈ {num(Math.round(CHUNK.chars400 / 100) * 100)} characters of prose
          </span>
          <br />
          <span style={{ opacity: ease(frame, wholeAt - 2, 10) }}>
            <Mark at={wholeAt + 4}>a cut sentence stays whole</Mark>
          </span>
        </Caption>

        {/* Structure-aware. */}
        <Note at={structAt - 2} x={cx(3)} y={docY - 44}>
          <span style={head(22, INK)}>structure-aware</span>
        </Note>
        <Doc x={cx(3)} y={docY} w={DOC_W} rows={ROWS} at={structAt - 2} />
        {[
          { r0: 0, r1: 4 },
          { r0: 5, r1: 9 },
          { r0: 10, r1: 15 },
        ].map((c, k) => (
          <ChunkBracket key={k} x={cx(3) + BR} docY={docY} r0={c.r0} r1={c.r1} at={headingsAt + 2 + k * 5} />
        ))}
        <Caption i={3} at={headingsAt}>
          split at headings and paragraphs
          <br />
          <span style={{ opacity: ease(frame, mergeAt - 2, 10) }}>then merge toward the target</span>
        </Caption>

        {/* Small-to-big. */}
        <Note at={s2bAt - 2} x={cx(4)} y={docY - 44}>
          <span style={head(22, INK)}>small-to-big</span>
        </Note>
        <Doc x={cx(4)} y={docY} w={DOC_W} rows={ROWS} at={s2bAt - 2} />
        <ChunkBracket
          x={cx(4) + BR}
          docY={docY}
          r0={7}
          r1={8}
          at={retrieveAt + 2}
          band={{ x: cx(4) + 8, w: DOC_W - 16, color: `color-mix(in srgb, ${ds("blue", 300)} 45%, transparent)` }}
        />
        <ChunkBracket x={cx(4) + BR + 20} docY={docY} r0={5} r1={9} at={sendAt + 2} color={OK_INK} />
        <Caption i={4} at={retrieveAt - 2}>
          <span style={{ color: BLUE_INK }}>retrieve the small chunk</span>
          <br />
          <span style={{ color: OK_INK, opacity: ease(frame, sendAt - 2, 10) }}>send its parent section</span>
        </Caption>

        {/* No universal best. */}
        <Note at={bestAt} x={X0} y={y(820)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            no universal best:{" "}
            <span style={{ opacity: ease(frame, recallAt - 2, 10), color: OK_INK, fontWeight: 650 }}>
              <Mark at={recallAt + 6} color={MARK_OK}>
                measure retrieval recall on labeled questions
              </Mark>
            </span>
          </span>
        </Note>
        <Note at={storeAt - 2} x={X0} y={y(820) + 46}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            and store the chunk settings with the index version
            <span style={{ opacity: ease(frame, rebuildAt - 2, 10), color: INK_SOFT }}>: a change means a rebuild</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

