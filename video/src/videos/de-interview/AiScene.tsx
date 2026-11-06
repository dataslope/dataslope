import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Num } from "../../editorial/ui";
import { PARTS, partOf } from "./data";
import { Drift, Flow, Headline, Kicker, Mark, Spot, X0 } from "./parts";

/** The RAG ingestion pipeline across the top: its four steps, left to right. */
const FLOW_Y = 330;
const STEP_X = 560;
const STEP_W = 210;
const STEP_H = 78;
const STEP_GAP = 84;
/** The three cards under it. */
const CARD_Y = 580;
const CARD_W = 540;
const CARD_GAP = 30;
const CARD_H = 250;
/** The small spots: a card index right of the row's last step, and one spot
 *  at a time in the empty slot right of the newest card, gone before the next
 *  card inks in there. */
const INDEX_X = 1706;

/** A card that inks in on `at`, its title, then its lines. */
const Card: React.FC<{ i: number; at: number; title: string; children: React.ReactNode }> = ({ i, at, title, children }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at - 2, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: X0 + i * (CARD_W + CARD_GAP),
        top: y(CARD_Y),
        width: CARD_W,
        height: h(CARD_H),
        boxSizing: "border-box",
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 12,
        background: PAPER,
        padding: "24px 28px",
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div style={{ ...note(29, INK), fontWeight: 650, marginBottom: 14, whiteSpace: "nowrap" }}>{title}</div>
      {children}
    </div>
  );
};

/** One of a card's lines, inked in on `at`. */
const Line: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const q = ease(frame, at - 2, 12);
  return (
    <div style={{ ...note(24, INK_SOFT), lineHeight: 1.3, marginBottom: 12, opacity: q, transform: `translateX(${(1 - q) * -10}px)` }}>
      {children}
    </div>
  );
};

/**
 * What AI has changed, the page's four points. The first is a design prompt,
 * so it is drawn as one: RAG ingestion's four steps (parse, chunk, embed,
 * index) in a row, outlined as "Ingestion" is said and filled as each is
 * named, and fed from above by only the new and changed documents, which is
 * what keeping it fresh incrementally means. The other three are cards that
 * fill line by line: vector search's trade-offs, governance for AI data, and
 * AI-written pipeline code, which ends on asking the recruiter about each
 * round. Under them, the page's pointer: Part 11 covers all four.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ai").from;
  const fourAt = n.word("ai", "in four ways");
  // "RAG" reaches the screen only once the narration has said what it
  // stands for: "Ingestion for" first, its expansion under it, then "RAG".
  const ingestAt = n.word("ai-rag", "Ingestion");
  const expandAt = n.word("ai-rag", "retrieval-augmented generation");
  const ragAt = n.word("ai-rag", "or RAG");
  const promptAt = n.word("ai-rag", "a system design prompt");
  const steps = [
    { text: "parse", at: n.word("ai-rag", "parse") },
    { text: "chunk", at: n.word("ai-rag", "chunk") },
    { text: "embed", at: n.word("ai-rag", "embed") },
    { text: "index", at: n.word("ai-rag", "index") },
  ];
  const freshAt = n.word("ai-rag", "keep it fresh incrementally");
  const moreAt = n.word("ai-more", "Part eleven covers");
  const likeAt = n.word("ai-rag", "like any other pipeline");
  const vecAt = n.word("ai-vector", "Vector search trade-offs");
  const govAt = n.word("ai-gov", "Governance for AI data");
  const codeAt = n.word("ai-code", "AI-written pipeline code");
  const end = n.beat("ai-more").to;
  // On "search" itself, a word after the card's title and its tap, so the
  // spot's pop does not land on the same frame (stacked, the two sat 7 dB
  // under the voice).
  const searchAt = n.word("ai-vector", "search trade-offs");
  const lockAt = n.word("ai-gov", "permissions checked at query time");
  const aiPart = PARTS.find((p) => p.video === "de-pipelines-for-ai");

  const stepX = (i: number) => STEP_X + i * (STEP_W + STEP_GAP);
  const top = y(FLOW_Y);
  const mid = top + h(STEP_H) / 2;
  const bottom = top + h(STEP_H);
  // Keeping it fresh: only the new and changed documents come in, from above,
  // into "parse". Not a loop from "index" back to "parse", which would say
  // the index is parsed again: a full re-run, the opposite of incremental.
  const feedX = stepX(0) + STEP_W / 2;
  const feed: [number, number][] = [
    [feedX, top - 70],
    [feedX, top - 6],
  ];

  return (
    <AbsoluteFill>
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-32} />
      ))}
      <Sfx name="el-pencil" at={freshAt} level={-35} />
      {/* The small spots arrive the way the meerkat does in the opening. */}
      {[steps[3].at, searchAt, lockAt].map((at, i) => (
        <Sfx key={`spot-${i}`} name="el-pop" at={at} level={-31} />
      ))}
      <Sfx name="el-tap" at={moreAt} level={-33} />
      {[vecAt, govAt, codeAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-31} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What AI has changed</Kicker>
        <Headline lead="AI has changed this interview" turn="in four ways." at={from + 2} turnAt={fourAt} size={62} />

        <div style={{ position: "absolute", left: X0, top: top - 4, width: STEP_X - X0 - 40, opacity: ease(frame, ingestAt - 2, 12) }}>
          <div style={{ ...note(30, INK), fontWeight: 650 }}>
            Ingestion for <span style={{ opacity: ease(frame, ragAt - 2, 12) }}>RAG</span>
          </div>
          <div style={{ ...note(24, INK_SOFT), marginTop: 4, opacity: ease(frame, expandAt - 2, 12) }}>retrieval-augmented generation</div>
          {/* What RAG does, once, for a viewer who has not built one. */}
          <div style={{ ...note(22, INK_SOFT), fontStyle: "italic", marginTop: 2, textWrap: "balance", opacity: ease(frame, expandAt + 10, 12) }}>
            a model answers from documents it looks up
          </div>
          <div style={{ ...note(24, INK), marginTop: 10, opacity: ease(frame, promptAt - 2, 12) }}>
            <Mark at={promptAt + 4}>a system design prompt</Mark>
          </div>
        </div>

        {/* The row is there, empty, from "Ingestion", so the page is not
            blank while RAG is named; each box fills as its step is said. */}
        {steps.map((s, i) => {
          const q = ease(frame, ingestAt - 2, 14) * (1 - ease(frame, s.at - 3, 12));
          if (q <= 0) return null;
          return (
            <div
              key={`${s.text}-outline`}
              style={{
                position: "absolute",
                left: stepX(i),
                top,
                width: STEP_W,
                height: h(STEP_H),
                boxSizing: "border-box",
                border: `2px dashed ${HAIRLINE}`,
                borderRadius: 12,
                opacity: q * 0.5,
              }}
            />
          );
        })}
        {steps.map((s, i) => {
          const p = ease(frame, s.at - 3, 12);
          if (p <= 0) return null;
          return (
            <div
              key={s.text}
              style={{
                position: "absolute",
                left: stepX(i),
                top,
                width: STEP_W,
                height: h(STEP_H),
                boxSizing: "border-box",
                border: `2px solid ${BAR}`,
                borderRadius: 12,
                background: `color-mix(in srgb, ${BAR} 12%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(28, BLUE_INK),
                opacity: p,
                transform: `scale(${0.9 + 0.1 * p})`,
              }}
            >
              {s.text}
            </div>
          );
        })}
        {steps.slice(1).map((s, i) => (
          <Flow
            key={s.text}
            points={[
              [stepX(i) + STEP_W + 10, mid],
              [stepX(i + 1) - 10, mid],
            ]}
            at={s.at - 8}
            dur={8}
            color={INK_SOFT}
          />
        ))}
        <Flow points={feed} at={freshAt} dur={14} color={BLUE_INK} />
        <div
          style={{
            position: "absolute",
            left: feedX + 18,
            top: top - 84,
            ...note(24, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, freshAt + 4, 12),
          }}
        >
          only new and changed documents
        </div>
        <div
          style={{
            position: "absolute",
            left: stepX(0),
            width: stepX(3) + STEP_W - stepX(0),
            top: bottom + h(22),
            textAlign: "center",
            ...note(24, INK),
            opacity: ease(frame, freshAt + 10, 12),
          }}
        >
          keep it fresh, incrementally, <span style={{ opacity: ease(frame, likeAt - 2, 12) }}>like any other pipeline</span>
        </div>

        <Card i={0} at={vecAt} title="Vector search trade-offs">
          <Line at={n.word("ai-vector", "exact or approximate")}>exact or approximate</Line>
          <Line at={n.word("ai-vector", "Postgres with its vector extension")}>Postgres (pgvector) or a dedicated store</Line>
          <Line at={n.word("ai-vector", "metadata filters")}>metadata filters</Line>
          <Line at={n.word("ai-vector", "hybrid keyword search")}>hybrid keyword search</Line>
        </Card>
        <Card i={1} at={govAt} title="Governance for AI data">
          <Line at={n.word("ai-gov", "permissions checked at query time")}>permissions checked at query time</Line>
          <Line at={n.word("ai-gov", "deletions that reach the vectors")}>deletions that reach the vectors</Line>
          {/* The page's wording, which cannot be misread at its line break
              ("kept from outside" read as a whole phrase). */}
          <Line at={n.word("ai-gov", "personal data kept from")}>personal data kept away from external embedding APIs</Line>
        </Card>
        <Card i={2} at={codeAt} title="AI-written pipeline code">
          <Line at={n.word("ai-code", "needs review for idempotency")}>reviewed for idempotency, time zones and schema drift</Line>
          <Line at={n.word("ai-code", "Some coding rounds now allow an assistant")}>some coding rounds allow an assistant</Line>
          <div style={{ ...note(24, INK), lineHeight: 1.3, opacity: ease(frame, n.word("ai-code", "ask the recruiter") - 2, 12) }}>
            <Mark at={n.word("ai-code", "ask the recruiter") + 4}>ask the recruiter about each one</Mark>
          </div>
        </Card>

        {/* A card index, right of the row's "index" step, as it is said;
            1018 by 898. */}
        <Spot id="de-interview-card-index" at={steps[3].at} left={INDEX_X} top={mid - 66} width={150} height={132} phase={30} amp={3} />
        {/* One spot at a time in the empty slot right of the newest card,
            each gone before the next card inks in over its slot: a
            magnifying glass for vector search, then a padlock for the
            permissions governance checks. */}
        <Spot
          id="de-interview-magnifier"
          at={searchAt}
          out={govAt - 14}
          left={X0 + (CARD_W + CARD_GAP) + CARD_W / 2 - 85}
          top={y(CARD_Y) + h(CARD_H) / 2 - 85}
          width={170}
          height={170}
          phase={60}
          amp={3}
        />
        <Spot
          id="de-interview-padlock"
          at={lockAt}
          out={codeAt - 14}
          left={X0 + 2 * (CARD_W + CARD_GAP) + CARD_W / 2 - 65}
          top={y(CARD_Y) + h(CARD_H) / 2 - 85}
          width={130}
          height={170}
          phase={90}
          amp={3}
        />

        {/* The page's pointer: Part 11 works through all four. */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(CARD_Y) + h(CARD_H) + h(30),
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, moreAt - 2, 12),
            transform: `translateY(${(1 - ease(frame, moreAt - 2, 12)) * 8}px)`,
          }}
        >
          <span style={label(26, BLUE_INK)}>
            Part <Num>{partOf("de-pipelines-for-ai")}</Num>
          </span>
          , {aiPart?.title}, covers all four in depth.
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
