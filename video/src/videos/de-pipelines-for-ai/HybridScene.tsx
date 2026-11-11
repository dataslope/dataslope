import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { badgeStyle, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { HYBRID } from "./data";
import { Drift, head, madeUp, Mark, MARK_OK, math, OK_INK, QUIET, X0 } from "./parts";

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
        // A highlight behind the row, never an outline: yellow while the
        // narration is on it, green once it is the right answer.
        background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * l * (1 - g)}%, color-mix(in srgb, ${MARK_OK} ${100 * g}%, transparent))`,
        opacity: p,
        transform: `translateX(${(1 - p) * -10}px)`,
      }}
    >
      <span style={{ ...label(21, INK_SOFT), ...TABULAR, fontWeight: 500, width: 22, textAlign: "right" }}>{rank}</span>
      <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, fontVariantLigatures: "none" }}>{id}</span>
      <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>{children ?? tickets[id]}</span>
    </div>
  );
};

/**
 * Question 9. What embeddings blur, then one search, "E-4031 error", set up
 * with its three empty column heads as the blur is named: the vector side's
 * five (by meaning, made up) with the code's ticket fourth, the keyword
 * side's five (BM25 over the eight made-up tickets, in check.mjs) with it
 * first and the four that say "error" after it, and why: TF-IDF's idf,
 * "error" in four tickets (0.69) and E-4031 in one (2.08). Then reciprocal
 * rank fusion with the page's k = 60, worked for the top three (check.mjs),
 * fusing ranks because the two kinds of score don't compare: the code's
 * ticket wins by being high in both.
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
  /** A column head, sketched in grey as the blur is named, inked on its cue. */
  const headInk = (color: string, at: number) => `color-mix(in srgb, ${color} ${100 * ease(frame, at - 2, 10)}%, ${QUIET})`;
  const setupAt = blurAt + 6;
  const fusedTop = HYBRID.fused.slice(0, 3);
  const idf = HYBRID.idf;

  return (
    <AbsoluteFill>
      {kinds.map((k) => (
        <Sfx key={k.text} name="el-tap" at={k.at} level={-36} />
      ))}
      <Sfx name="el-pencil" at={setupAt + 4} level={-36} />
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
            Embeddings capture meaning
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
        <Note at={setupAt} x={X0} y={y(312)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            Search the tickets for{" "}
            {/* The query as a house badge in the mono face; the highlighter's
                yellow lays over its tint while the search is said. */}
            <span
              style={{
                ...badgeStyle("gray", 25),
                fontFamily: MONO,
                fontSize: 23,
                fontVariantLigatures: "none",
                background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * ease(frame, searchAt, 10) * (1 - ease(frame, fourthAt, 12))}%, ${badgeStyle("gray").background})`,
              }}
            >
              {HYBRID.query}
            </span>
          </span>
        </Note>

        {/* Where the figure's data comes from, set apart at the right
            margin rather than run on from the search in a smaller size. */}
        <Note at={setupAt} x={COLS[2] - 8 + COL_W} y={y(312) + 4} align="right">
          <span style={madeUp(19)}>Tickets and the vector ranking made up; BM25 run on them</span>
        </Note>

        {/* The vector side. */}
        <Note at={setupAt + 4} x={COLS[0]} y={y(LIST_TOP) - 44}>
          <span style={head(22, headInk(BLUE_INK, vectorAt))}>
            Vector search<span style={{ opacity: ease(frame, vectorAt - 2, 10) }}>, by meaning</span>
          </span>
        </Note>
        {HYBRID.vector.map((id, i) => (
          <Row key={id} x={COLS[0]} y={rowY(i)} rank={i + 1} id={id} at={vectorAt + 2 + i * 3} lit={id === CODE ? fourthAt : undefined} />
        ))}

        <Note at={generalAt - 2} x={COLS[0]} y={rowY(5) + 24}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>1 to 3: tickets about errors in general</span>
        </Note>

        {/* The three rankings side by side: a hairline centred in each gap,
            from the heads to the notes under them, inking in with the
            column to its right. */}
        {[1, 2].map((c) => (
          <div
            key={c}
            style={{
              position: "absolute",
              left: (COLS[c - 1] - 8 + COL_W + COLS[c] - 8) / 2,
              top: y(LIST_TOP) - 44,
              width: 1,
              height: rowY(5) + 130 - (y(LIST_TOP) - 44),
              background: HAIRLINE,
              opacity: ease(frame, setupAt + 4 + 4 * c, 14),
            }}
          />
        ))}

        {/* The keyword side. */}
        <Note at={setupAt + 8} x={COLS[1]} y={y(LIST_TOP) - 44}>
          <span style={head(22, headInk(INK, addsAt))}>
            Keyword search<span style={{ opacity: ease(frame, bm25At - 2, 10) }}>, BM25</span>
          </span>
        </Note>
        {HYBRID.keyword.map((id, i) => (
          <Row key={id} x={COLS[1]} y={rowY(i)} rank={i + 1} id={id} at={bm25At + 2 + i * 3} lit={id === CODE ? oneAt : undefined} />
        ))}
        <Note at={tfidfAt - 2} x={COLS[1]} y={rowY(5) + 24}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            like TF-IDF&apos;s{" "}
            {/* The formula in the line's own face and size: one line, one face. */}
            <span style={{ ...note(22, INK), fontWeight: 500 }}>
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
        <Note at={setupAt + 12} x={COLS[2]} y={y(LIST_TOP) - 44}>
          <span style={head(22, headInk(OK_INK, fuseAt))}>
            Fused<span style={{ opacity: ease(frame, rrfAt - 2, 10) }}>: reciprocal rank fusion</span>
          </span>
        </Note>
        <Note at={fuseAt + 2} x={COLS[2]} y={rowY(5) + 24}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", lineHeight: 1.45 }}>
            <b style={{ color: INK }}>Ranks, not scores</b>: a BM25 score
            <br />
            and a similarity aren&apos;t on one scale
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
            Each list gives{" "}
            <span style={{ ...note(23, INK), ...TABULAR }}>
              1 / ({HYBRID.k} + <i>rank</i>)
            </span>
            <span style={{ opacity: ease(frame, summedAt - 2, 10) }}>, summed</span>
          </span>
        </Note>
        <Note at={bothAt} x={COLS[2]} y={rowY(3) + 52}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Mark at={winsAt + 4} color={MARK_OK}>
              4th by meaning, 1st by keyword: it wins
            </Mark>
          </span>
        </Note>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, cheapAt - 4, 10) }}>
          <line x1={X0} x2={1800} y1={y(850)} y2={y(850)} stroke={HAIRLINE} />
        </svg>
        <Note at={cheapAt} x={X0} y={y(850) + 29}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            Cheap to add
            <span style={{ opacity: ease(frame, helpsAt - 2, 10) }}>, and it usually helps on technical content</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
