import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { HYBRID } from "./data";
import { Drift, head, madeUp, Mark, MARK_OK, math, OK, OK_INK, X0 } from "./parts";

const COLS = [X0, 700, 1290];
const COL_W = 540;
const LIST_TOP = 430;
const ROW = 50;
const CODE = "#3310";

const tickets = HYBRID.tickets as Record<string, string>;

/** One ticket in a ranked list: its rank, its id and its title. `lit`
 *  washes it in the highlighter; `ok` inks it green, the one that wins. */
const Row: React.FC<{ x: number; y: number; rank: number; id: string; at: number; lit?: number; ok?: number; children?: React.ReactNode }> = ({
  x,
  y,
  rank,
  id,
  at: from,
  lit,
  ok,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 10);
  const l = lit === undefined ? 0 : ease(frame, lit, 10);
  const g = ok === undefined ? 0 : ease(frame, ok, 10);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 8,
        top: y,
        width: COL_W,
        height: ROW - 8,
        boxSizing: "border-box",
        padding: "0 8px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * l * (1 - g)}%, color-mix(in srgb, ${OK} ${16 * g}%, ${PAPER}))`,
        border: `2px solid color-mix(in srgb, ${OK} ${100 * g}%, transparent)`,
        opacity: p,
        transform: `translateX(${(1 - p) * -10}px)`,
      }}
    >
      <span style={{ ...label(21, INK_SOFT), ...TABULAR, fontWeight: 700, width: 22, textAlign: "right" }}>{rank}</span>
      <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: INK, fontVariantLigatures: "none" }}>{id}</span>
      <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>{children ?? tickets[id]}</span>
    </div>
  );
};

/**
 * Question 9. What embeddings blur, then one search for an error code:
 * the vector side's five (by meaning) with the code's ticket fourth, the
 * keyword side's five (BM25) with it first, and why: TF-IDF's idf on the
 * eight made-up tickets, "error" in four of them (0.69) and E-4031 in one
 * (2.08). Then reciprocal rank fusion with the page's k = 60, worked for the
 * top three (check.mjs): the code's ticket wins by being high in both.
 */
export const HybridScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hybrid").from;
  const qAt = n.word("hybrid", "Question");
  const textAt = n.word("hybrid", "What is hybrid search");
  const meaningAt = n.word("hybrid", "Embeddings capture meaning");
  const blurAt = n.word("hybrid", "blur exact tokens");
  const kinds = [
    { text: "error codes", at: n.word("hybrid", "error codes") },
    { text: "product codes", at: n.word("hybrid", "product codes") },
    { text: "names", at: n.word("hybrid", "names") },
    { text: "rare jargon", at: n.word("hybrid", "rare jargon") },
  ];
  const searchAt = n.word("hybrid-code", "Search the tickets for E four oh three one");
  const vectorAt = n.word("hybrid-code", "the vector side");
  const fourthAt = n.word("hybrid-code", "fourth");
  const generalAt = n.word("hybrid-code", "behind general errors");
  const addsAt = n.word("hybrid-bm25", "adds a keyword search");
  const bm25At = n.word("hybrid-bm25", "usually BM25");
  const tfidfAt = n.word("hybrid-bm25", "Like TF-IDF");
  const rarityAt = n.word("hybrid-bm25", "weighs words by rarity");
  const oneAt = n.word("hybrid-bm25", "a code in one ticket counts for a lot");
  const fuseAt = n.word("hybrid-rrf", "fuse the rankings");
  const rrfAt = n.word("hybrid-rrf", "reciprocal rank fusion");
  const sixtyAt = n.word("hybrid-rrf", "one over sixty plus its rank");
  const summedAt = n.word("hybrid-rrf", "summed");
  const bothAt = n.word("hybrid-rrf", "Fourth by meaning and first by keyword");
  const winsAt = n.word("hybrid-rrf", "the code's ticket wins");
  const cheapAt = n.word("hybrid-cheap", "It's cheap to add");
  const helpsAt = n.word("hybrid-cheap", "usually helps on technical content");
  const end = n.beat("hybrid-cheap").to;

  const rowY = (i: number) => y(LIST_TOP) + i * ROW;
  const fusedTop = HYBRID.fused.slice(0, 3);
  const idf = HYBRID.idf;

  return (
    <AbsoluteFill>
      {kinds.map((k) => (
        <Sfx key={k.text} name="el-tap" at={k.at} level={-36} />
      ))}
      <Sfx name="el-pencil" at={searchAt + 4} level={-36} />
      <Sfx name="el-tap" at={fourthAt + 2} level={-34} />
      <Sfx name="el-pop" at={bm25At + 2} level={-34} />
      <Sfx name="el-pencil" at={sixtyAt + 2} level={-36} />
      <Sfx name="el-chime" at={winsAt + 4} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is hybrid search, and when do embeddings alone fail?
        </QuestionCard>
        <Note at={meaningAt} x={X0} y={y(240)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            embeddings capture meaning
            <span style={{ opacity: ease(frame, blurAt - 2, 10) }}>
              , but <Mark at={blurAt + 4}>blur exact tokens</Mark>:
            </span>
            {kinds.map((k, i) => (
              <span key={k.text} style={{ opacity: ease(frame, k.at - 2, 10), color: INK_SOFT }}>
                {i ? "," : ""} {k.text}
              </span>
            ))}
          </span>
        </Note>

        {/* The search. */}
        <Note at={searchAt} x={X0} y={y(312)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            search the tickets for{" "}
            <span style={{ fontFamily: MONO, fontWeight: 700, padding: "2px 10px", border: `2px solid ${INK}`, borderRadius: 8, fontVariantLigatures: "none" }}>
              E-4031
            </span>
            <span style={{ ...madeUp(19), marginLeft: 22 }}>tickets and rankings made up for this video</span>
          </span>
        </Note>

        {/* The vector side. */}
        <Note at={vectorAt - 2} x={COLS[0]} y={y(LIST_TOP) - 44}>
          <span style={head(22, BLUE_INK)}>vector search, by meaning</span>
        </Note>
        {HYBRID.vector.map((id, i) => (
          <Row key={id} x={COLS[0]} y={rowY(i)} rank={i + 1} id={id} at={vectorAt + 2 + i * 3} lit={id === CODE ? fourthAt : i < 3 ? generalAt : undefined} />
        ))}

        {/* The keyword side. */}
        <Note at={addsAt - 2} x={COLS[1]} y={y(LIST_TOP) - 44}>
          <span style={head(22, INK)}>
            keyword search<span style={{ opacity: ease(frame, bm25At - 2, 10) }}>, BM25</span>
          </span>
        </Note>
        {HYBRID.keyword.map((id, i) => (
          <Row key={id} x={COLS[1]} y={rowY(i)} rank={i + 1} id={id} at={bm25At + 2 + i * 3} lit={id === CODE ? oneAt : undefined} />
        ))}
        <Note at={tfidfAt - 2} x={COLS[1]} y={rowY(5) + 24}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
            like TF-IDF&apos;s{" "}
            <span style={{ ...math(24, INK), fontWeight: 500 }}>
              idf = ln(<i>N</i> / <i>df</i>)
            </span>
          </span>
        </Note>
        <Note at={rarityAt} x={COLS[1]} y={rowY(5) + 66}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", lineHeight: 1.5 }}>
            “error”: in {idf.error.df} of {idf.N} tickets → <b style={TABULAR}>{idf.error.idf.toFixed(2)}</b>
            <br />
            <span style={{ opacity: ease(frame, oneAt - 2, 10) }}>
              “E-4031”: in {idf.code.df} of {idf.N} →{" "}
              <Mark at={oneAt + 4}>
                <b style={TABULAR}>{idf.code.idf.toFixed(2)}</b>
              </Mark>
            </span>
          </span>
        </Note>

        {/* Fused. */}
        <Note at={fuseAt - 2} x={COLS[2]} y={y(LIST_TOP) - 44}>
          <span style={head(22, OK_INK)}>
            fused<span style={{ opacity: ease(frame, rrfAt - 2, 10) }}>: reciprocal rank fusion</span>
          </span>
        </Note>
        {fusedTop.map((f, i) => {
          const parts = [f.vectorRank, f.keywordRank].filter((r): r is number => r !== null);
          return (
            <Row key={f.ticket} x={COLS[2]} y={rowY(i)} rank={i + 1} id={f.ticket} at={summedAt + 4 + i * 4} ok={f.ticket === CODE ? winsAt : undefined}>
              <span style={{ ...math(23, INK), ...TABULAR }}>
                {parts.map((r) => `1/${HYBRID.k + r}`).join(" + ")} = {f.score.toFixed(4)}
              </span>
            </Row>
          );
        })}
        <Note at={sixtyAt - 2} x={COLS[2]} y={rowY(3) + 6}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            each list gives{" "}
            <span style={{ ...math(25, INK) }}>
              1 / ({HYBRID.k} + rank)
            </span>
            <span style={{ opacity: ease(frame, summedAt - 2, 10) }}>, summed</span>
          </span>
        </Note>
        <Note at={bothAt} x={COLS[2]} y={rowY(3) + 52}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={winsAt + 4} color={MARK_OK}>
              4th by meaning, 1st by keyword: it wins
            </Mark>
          </span>
        </Note>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, cheapAt - 4, 10) }}>
          <line x1={X0} x2={1800} y1={y(850)} y2={y(850)} stroke={HAIRLINE} />
        </svg>
        <Note at={cheapAt} x={X0} y={y(850) + 18}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            cheap to add
            <span style={{ opacity: ease(frame, helpsAt - 2, 10) }}>, and it usually helps on technical content</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
