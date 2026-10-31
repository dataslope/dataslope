import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Box, DATA, DATA_TINT, Drift, head, LineArrow, madeUp, Mark, MARK_BAD, MARK_OK, OK, OK_INK, X0 } from "./parts";

const CARD = { x: X0, w: 640, h: 54, top: 420, gap: 12 };
const RIGHT_X = 1000;

/** Made-up chunks, each with who may read it. */
const CHUNKS = [
  { title: "Refund policy, section 2", readers: "everyone" },
  { title: "Salary bands for 2026", readers: "hr" },
  { title: "Ticket #3310, the thread", readers: "support" },
  { title: "Incident review, May", readers: "eng, support" },
  { title: "Board deck, third quarter", readers: "exec" },
];
const USER_TEAM = "support";
const allowed = (r: string) => r === "everyone" || r.split(", ").includes(USER_TEAM);

/**
 * Question 10. Left, five made-up chunks, each carrying who may read it,
 * and a user from support: at query time the filter keeps the three she
 * could open and sets the rest back. Right, a chunk redacted before it goes
 * to an outside embedding API. Below it, deletion made real: one erasure
 * request reaching the vectors, the cached chunks and the copies in
 * evaluation sets, each ticked as it is named, and the source row alone
 * marked as the trap.
 */
export const AccessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("access").from;
  const qAt = n.word("access", "Question");
  const textAt = n.word("access", "How do access control and deletion work");
  const permAt = n.word("access", "Put permissions on each chunk");
  const queryAt = n.word("access", "filter at query time");
  const identityAt = n.word("access", "by the user's identity");
  const onlyAt = n.word("access", "retrieves only what that user could open");
  const redactAt = n.word("access-redact", "Redact secrets and personal data");
  const beforeAt = n.word("access-redact", "before embedding");
  const apiAt = n.word("access-redact", "an outside API");
  const realAt = n.word("access-delete", "make deletion real");
  const requestAt = n.word("access-delete", "An erasure request or a removed document");
  const targets = [
    { text: "the vectors", at: n.word("access-delete", "deletes the vectors") },
    { text: "the cached chunks", at: n.word("access-delete", "the cached chunks") },
    { text: "copies in evaluation sets", at: n.word("access-delete", "copies in evaluation sets") },
  ];
  const notJustAt = n.word("access-delete", "not just the source row");
  const end = n.beat("access-delete").to;

  const cardY = (i: number) => y(CARD.top) + i * (CARD.h + CARD.gap);
  const filt = ease(frame, queryAt + 4, 14);
  const red = ease(frame, redactAt + 4, 16);
  const delTop = y(640);

  return (
    <AbsoluteFill>
      {CHUNKS.map((c, i) => (
        <Sfx key={c.title} name="el-tap" at={permAt + 4 + i * 4} level={-37} />
      ))}
      <Sfx name="el-whoosh" at={queryAt + 4} level={-36} />
      <Sfx name="el-scratch" at={redactAt + 6} level={-34} />
      {targets.map((t) => (
        <Sfx key={t.text} name="el-tap" at={t.at + 4} level={-34} />
      ))}
      <Sfx name="el-pencil" at={notJustAt + 4} level={-36} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={56}>
          How do access control and deletion work in a RAG pipeline?
        </QuestionCard>

        {/* Permissions on every chunk, and the filter at query time. */}
        <Note at={permAt} x={CARD.x} y={y(CARD.top) - 92}>
          <span style={head(22, INK)}>permissions on every chunk</span>
        </Note>
        <Note at={queryAt - 2} x={CARD.x} y={y(CARD.top) - 52}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            filtered at query time
            <span style={{ opacity: ease(frame, identityAt - 2, 10) }}>
              {" "}for{" "}
              <span style={{ padding: "1px 10px", borderRadius: 14, border: `2px solid ${INK}`, fontWeight: 650 }}>Dana, {USER_TEAM}</span>
            </span>
          </span>
        </Note>
        {CHUNKS.map((c, i) => {
          const p = ease(frame, permAt + 2 + i * 4, 10);
          const ok = allowed(c.readers);
          const keep = ok ? filt : 0;
          const drop = ok ? 0 : filt;
          return (
            <div
              key={c.title}
              style={{
                position: "absolute",
                left: CARD.x,
                top: cardY(i),
                width: CARD.w,
                height: CARD.h,
                boxSizing: "border-box",
                padding: "0 18px",
                borderRadius: 10,
                border: `2px solid color-mix(in srgb, ${OK} ${100 * keep}%, ${INK_SOFT})`,
                background: `color-mix(in srgb, ${OK} ${10 * keep}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: p * (1 - 0.6 * drop),
                transform: `translateX(${(1 - p) * -12 + drop * 24}px)`,
              }}
            >
              <span style={{ ...note(23, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{c.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 20, color: BLUE_INK, fontWeight: 600, whiteSpace: "nowrap", fontVariantLigatures: "none" }}>
                readers: {c.readers}
              </span>
            </div>
          );
        })}
        <Note at={onlyAt - 2} x={CARD.x} y={cardY(CHUNKS.length) + 8}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={onlyAt + 4} color={MARK_OK}>
              only what Dana could open herself
            </Mark>
          </span>
        </Note>
        <Note at={permAt + 30} x={CARD.x} y={cardY(CHUNKS.length) + 52}>
          <span style={madeUp(19)}>chunks and user made up for this video</span>
        </Note>

        {/* Redact before embedding. */}
        <Note at={redactAt - 2} x={RIGHT_X} y={y(CARD.top) - 92}>
          <span style={head(22, INK)}>redact before embedding</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: RIGHT_X,
            top: y(CARD.top) - 44,
            width: 470,
            boxSizing: "border-box",
            padding: "14px 18px",
            borderRadius: 10,
            border: `2px solid ${INK_SOFT}`,
            background: PAPER,
            ...note(22, INK),
            lineHeight: 1.6,
            opacity: ease(frame, redactAt - 2, 10),
          }}
        >
          <div style={{ whiteSpace: "nowrap" }}>Refund for order 8812 approved.</div>
          {[
            { k: "Customer:", v: "Jo Park, 07700 900123" },
            { k: "API key:", v: "sk-live-2f9a7c41" },
          ].map((r, i) => (
            <div key={r.k} style={{ whiteSpace: "nowrap", display: "flex", gap: 10 }}>
              <span>{r.k}</span>
              <span style={{ position: "relative", fontFamily: MONO, fontSize: 20, fontVariantLigatures: "none" }}>
                {r.v}
                <span
                  style={{
                    position: "absolute",
                    left: -4,
                    top: 3,
                    bottom: 3,
                    width: `calc((100% + 8px) * ${ease(frame, redactAt + 4 + i * 6, 12)})`,
                    background: INK,
                    borderRadius: 3,
                  }}
                />
              </span>
            </div>
          ))}
        </div>
        <LineArrow from={[RIGHT_X + 480, y(CARD.top) + 30]} to={[RIGHT_X + 590, y(CARD.top) + 30]} at={beforeAt} />
        <Box x={RIGHT_X + 600} y={y(CARD.top) - 14} w={200} h={88} at={beforeAt + 4} tone={DATA} fill={DATA_TINT} size={22}>
          <span style={{ color: BLUE_INK }}>embedding model</span>
        </Box>
        <Note at={apiAt - 2} x={RIGHT_X + 600} y={y(CARD.top) + 86}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", opacity: 0.4 + 0.6 * red }}>an outside API</span>
        </Note>

        {/* Deletion, made real. */}
        <Note at={realAt - 2} x={RIGHT_X} y={delTop - 50}>
          <span style={head(22, INK)}>
            <Mark at={realAt + 4}>deletion, made real</Mark>
          </span>
        </Note>
        <Box x={RIGHT_X} y={delTop} w={290} h={100} at={requestAt} tone={INK} size={22}>
          erasure request
          <br />
          or removed document
        </Box>
        {targets.map((t, i) => (
          <React.Fragment key={t.text}>
            <LineArrow from={[RIGHT_X + 300, delTop + 50]} to={[RIGHT_X + 382, delTop - 6 + i * 56 + 22]} at={t.at - 2} dur={8} />
            <Note at={t.at - 2} x={RIGHT_X + 396} y={delTop - 6 + i * 56}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Tick at={t.at + 6} size={26} />
                <span style={{ ...note(25, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{t.text}</span>
              </div>
            </Note>
          </React.Fragment>
        ))}
        <Note at={notJustAt - 2} x={RIGHT_X} y={delTop + 186}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={notJustAt + 4} color={MARK_BAD}>
              not just the source row
            </Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
