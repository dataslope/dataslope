import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Headline, Kicker, Mark, X0 } from "./parts";

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
 * index) in a row, each boxed as it is said, and the loop back that keeps the
 * index fresh incrementally. The other three are cards that fill line by
 * line: vector search's trade-offs, governance for AI data, and AI-written
 * pipeline code, which ends on asking the recruiter about each round.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ai").from;
  const fourAt = n.word("ai", "in four ways");
  // "RAG" reaches the screen only once the narration has said what it
  // stands for: the title inks "Ingestion" first, "for RAG" on "or RAG".
  const ingestAt = n.word("ai-rag", "Ingestion");
  const ragAt = n.word("ai-rag", "or RAG");
  const promptAt = n.word("ai-rag", "a system design prompt");
  const steps = [
    { text: "parse", at: n.word("ai-rag", "parse") },
    { text: "chunk", at: n.word("ai-rag", "chunk") },
    { text: "embed", at: n.word("ai-rag", "embed") },
    { text: "index", at: n.word("ai-rag", "index") },
  ];
  const freshAt = n.word("ai-rag", "keep it fresh incrementally");
  const likeAt = n.word("ai-rag", "like any other pipeline");
  const vecAt = n.word("ai-vector", "Vector search trade-offs");
  const govAt = n.word("ai-gov", "Governance for AI data");
  const codeAt = n.word("ai-code", "AI-written pipeline code");
  const end = n.beat("ai-code").to;

  const stepX = (i: number) => STEP_X + i * (STEP_W + STEP_GAP);
  const top = y(FLOW_Y);
  const mid = top + h(STEP_H) / 2;
  const bottom = top + h(STEP_H);
  // The loop back: down from under "index", left beneath the row, and up into
  // "parse", so its head sits on a straight, vertical last leg.
  const loopY = bottom + h(52);
  const loop: [number, number][] = [
    [stepX(3) + STEP_W / 2, bottom + 4],
    [stepX(3) + STEP_W / 2, loopY],
    [stepX(0) + STEP_W / 2, loopY],
    [stepX(0) + STEP_W / 2, bottom + 4],
  ];

  return (
    <AbsoluteFill>
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-32} />
      ))}
      <Sfx name="el-pencil" at={freshAt} level={-35} />
      {[vecAt, govAt, codeAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-31} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What AI has changed</Kicker>
        <Headline lead="AI has changed this interview" turn="in four ways." at={from + 2} turnAt={fourAt} size={62} />

        <div style={{ position: "absolute", left: X0, top: top - 4, width: STEP_X - X0 - 40, opacity: ease(frame, ingestAt - 2, 12) }}>
          <div style={{ ...note(30, INK), fontWeight: 650 }}>
            Ingestion <span style={{ opacity: ease(frame, ragAt - 2, 12) }}>for RAG</span>
          </div>
          <div style={{ ...note(24, INK_SOFT), marginTop: 6, opacity: ease(frame, promptAt - 2, 12) }}>a system design prompt</div>
        </div>

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
        <Flow points={loop} at={freshAt} dur={22} color={BLUE_INK} />
        <div
          style={{
            position: "absolute",
            left: stepX(0) + STEP_W / 2 + 24,
            width: stepX(3) - stepX(0) - 48,
            top: loopY + 12,
            textAlign: "center",
            ...note(24, INK),
            opacity: ease(frame, freshAt + 6, 12),
          }}
        >
          keep it fresh, incrementally, <span style={{ opacity: ease(frame, likeAt - 2, 12) }}>like any other pipeline</span>
        </div>

        <Card i={0} at={vecAt} title="Vector search trade-offs">
          <Line at={n.word("ai-vector", "exact or approximate")}>exact or approximate</Line>
          <Line at={n.word("ai-vector", "Postgres or a dedicated store")}>Postgres or a dedicated store</Line>
          <Line at={n.word("ai-vector", "metadata filters")}>metadata filters</Line>
          <Line at={n.word("ai-vector", "hybrid keyword search")}>hybrid keyword search</Line>
        </Card>
        <Card i={1} at={govAt} title="Governance for AI data">
          <Line at={n.word("ai-gov", "permissions checked at query time")}>permissions checked at query time</Line>
          <Line at={n.word("ai-gov", "deletions that reach the vectors")}>deletions that reach the vectors</Line>
          <Line at={n.word("ai-gov", "personal data kept from")}>personal data kept from outside embedding APIs</Line>
        </Card>
        <Card i={2} at={codeAt} title="AI-written pipeline code">
          <Line at={n.word("ai-code", "needs review for idempotency")}>reviewed for idempotency, time zones and schema drift</Line>
          <Line at={n.word("ai-code", "Some coding rounds now allow an assistant")}>some coding rounds allow an assistant</Line>
          <div style={{ ...note(24, INK), lineHeight: 1.3, opacity: ease(frame, n.word("ai-code", "ask the recruiter") - 2, 12) }}>
            <Mark at={n.word("ai-code", "ask the recruiter") + 4}>ask the recruiter about each one</Mark>
          </div>
        </Card>
      </Drift>
    </AbsoluteFill>
  );
};
