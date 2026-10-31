import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DATA, DATA_TINT, Drift, head, lineOf, madeUp, Mark, MARK_OK, OK_INK, SqlListing, sqlListingHeight, X0 } from "./parts";

/** pgvector's nearest-neighbour search with an access filter and a join, in
 *  its own syntax (`<=>` is its cosine distance). Shown, not run: no vector
 *  extension runs in this package's engines. */
const QUERY = [
  "SELECT c.chunk_id, c.body",
  "FROM chunks AS c",
  "JOIN documents AS d USING (doc_id)",
  "WHERE d.team = 'support'",
  "ORDER BY c.embedding <=> $1",
  "LIMIT 10;",
];

const STRIP = { x0: X0, x1: 1800, top: 262 };
const RIGHT_X = 1050;

/**
 * Question 7. A strip from millions of vectors to billions, the left part
 * pgvector's and the right a dedicated database's. Left, pgvector, the
 * Postgres extension: its search as one SQL statement, with the join and the
 * access filter lit as the narration names them, and the four reasons
 * ticked. Right, what a dedicated vector database earns its cost with. Last,
 * the answer an interviewer wants: a lean, and the evidence that would move
 * it.
 */
export const PgScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("pg").from;
  const qAt = n.word("pg", "Question");
  const textAt = n.word("pg", "Should you use pgvector");
  const extAt = n.word("pg", "the Postgres extension");
  const defaultAt = n.word("pg", "a strong default");
  const inPgAt = n.word("pg", "the data's in Postgres");
  const millionsAt = n.word("pg", "millions of vectors");
  const billionsAt = n.word("pg", "not billions");
  const reasons = [
    { text: "one system", at: n.word("pg-why", "One system") },
    { text: "real transactions", at: n.word("pg-why", "real transactions") },
    { text: "joins against your relational data", at: n.word("pg-why", "joins against your relational data") },
    { text: "access filters in plain SQL", at: n.word("pg-why", "access filters in plain sequel") },
  ];
  const dedAt = n.word("pg-dedicated", "A dedicated vector database");
  const costAt = n.word("pg-dedicated", "earns its operational cost");
  const earns = [
    { text: "very large scale", at: n.word("pg-dedicated", "very large scale") },
    { text: "very high query rates", at: n.word("pg-dedicated", "very high query rates") },
    { text: "hybrid search and multi-tenancy built in", at: n.word("pg-dedicated", "hybrid search and multi-tenancy built in") },
  ];
  const leanAt = n.word("pg-lean", "Say which way you'd lean");
  const evidenceAt = n.word("pg-lean", "what evidence would change your mind");
  const end = n.beat("pg-lean").to;

  const stripY = y(STRIP.top);
  const split = STRIP.x0 + (STRIP.x1 - STRIP.x0) * 0.5;
  const grow = ease(frame, millionsAt - 2, 16);
  const listTop = y(420);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={millionsAt} level={-36} />
      {reasons.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at + 2} level={-35} />
      ))}
      {earns.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at + 2} level={-35} />
      ))}
      <Sfx name="el-chime" at={evidenceAt + 6} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={58}>
          Should you use pgvector or a dedicated vector database?
        </QuestionCard>

        {/* From millions of vectors to billions. */}
        <div
          style={{
            position: "absolute",
            left: STRIP.x0,
            top: stripY,
            width: (split - STRIP.x0) * grow,
            height: 46,
            borderRadius: "10px 0 0 10px",
            background: DATA_TINT,
            border: `2px solid ${DATA}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            overflow: "hidden",
            ...note(23, BLUE_INK),
            fontWeight: 650,
            whiteSpace: "nowrap",
            opacity: grow,
          }}
        >
          millions of vectors: pgvector
        </div>
        <div
          style={{
            position: "absolute",
            left: split,
            top: stripY,
            width: (STRIP.x1 - split) * ease(frame, billionsAt - 2, 16),
            height: 46,
            borderRadius: "0 10px 10px 0",
            background: PAPER,
            border: `2px solid ${INK_SOFT}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            overflow: "hidden",
            ...note(23, INK),
            fontWeight: 650,
            whiteSpace: "nowrap",
            opacity: ease(frame, billionsAt - 2, 12),
          }}
        >
          billions: a dedicated vector database
        </div>

        {/* pgvector. */}
        <Note at={extAt - 2} x={X0} y={listTop - 64}>
          <span style={head(23, INK)}>
            pgvector, the Postgres extension
            <span style={{ opacity: ease(frame, defaultAt - 2, 10), color: BLUE_INK }}>: a strong default</span>
          </span>
        </Note>
        <Note at={inPgAt - 2} x={X0} y={listTop - 30}>
          <span style={madeUp(19)}>its search is one more SQL statement (pgvector&apos;s syntax, shown, not run)</span>
        </Note>
        <SqlListing
          lines={QUERY}
          x={X0}
          top={listTop}
          width={760}
          size={24}
          at={inPgAt}
          marks={[
            { line: lineOf(QUERY, "JOIN documents"), at: reasons[2].at + 4 },
            { line: lineOf(QUERY, "WHERE d.team"), at: reasons[3].at + 4 },
          ]}
        />
        {reasons.map((r, i) => (
          <Note key={r.text} at={r.at - 2} x={X0} y={listTop + sqlListingHeight(QUERY.length, 24) + 26 + i * 44}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tick at={r.at + 4} size={24} />
              <span style={{ ...note(25, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{r.text}</span>
            </div>
          </Note>
        ))}

        {/* A dedicated vector database. */}
        <Note at={dedAt - 2} x={RIGHT_X} y={listTop - 64}>
          <span style={head(23, INK)}>a dedicated vector database</span>
        </Note>
        <Note at={costAt - 2} x={RIGHT_X} y={listTop - 18}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>earns its operational cost with</span>
        </Note>
        {earns.map((r, i) => (
          <Note key={r.text} at={r.at - 2} x={RIGHT_X} y={listTop + 30 + i * 52}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tick at={r.at + 4} size={24} />
              <span style={{ ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{r.text}</span>
            </div>
          </Note>
        ))}

        {/* What an interviewer wants. */}
        <Note at={leanAt - 2} x={RIGHT_X} y={y(700)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>the answer they want</span>
        </Note>
        <Note at={leanAt} x={RIGHT_X} y={y(700) + 40}>
          <span style={{ ...note(28, OK_INK), fontWeight: 650, whiteSpace: "nowrap", lineHeight: 1.5 }}>
            <Mark at={leanAt + 4} color={MARK_OK}>
              which way you&apos;d lean,
            </Mark>
            <br />
            <span style={{ opacity: ease(frame, evidenceAt - 2, 10) }}>
              <Mark at={evidenceAt + 4} color={MARK_OK}>
                and what evidence would change it
              </Mark>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
