import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOW, BOW_THE } from "./data";
import { Chip, CHIP_LINE, FIG_Y, Headline, INK, INK_SOFT, Kicker, LOST_INK, Mark, NumCell, pulse, Reveal, tint, X0 } from "./parts";

/** The three panels of Fig. 9, in layout units. */
const PANEL_X = [X0, 700, 1280];
const HEAD_Y = 338;
const SENT_Y = 392;
const MINI = { x0: 210, w: 96, headY: 506, rowY: 550, step: 60, h: 50 };
const STRIP_Y = 470;
const COMMON_Y = 824;

const ORDER = BOW.order;
const MEANING = BOW.meaning;
const MEANING_X0 = 1320;
const MEANING_W = 140;
const DOC1 = BOW.rows[0];
/** The long, mostly empty row: doc1's nine counts at the front, its non-zero
 *  cells kept where they are, then column after empty column. */
const STRIP_CELLS = 104;
const STRIP_W = 5;
/** Every other word's largest count in any bag-of-words row: "the" tops each row only if this is smaller. */
const OTHER_MAX = Math.max(...BOW.rows.flatMap((r) => r.filter((_, j) => j !== BOW_THE)));
const THE_COUNTS = [...new Set(BOW.rows.map((r) => r[BOW_THE]))];
if (Math.min(...THE_COUNTS) <= OTHER_MAX) throw new Error("\"the\" no longer has the biggest count in every row");

/**
 * The bag's blind spots, the lesson's three limitations: order (dog bites
 * man), size (a real vocabulary makes every row mostly zeros) and meaning
 * (great and excellent as unrelated columns). Then the turn to TF-IDF: the
 * commonest word has the biggest count in every row.
 */
export const BlindScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const start = n.beat("order").from;
  const blindAt = n.word("order", "blind spots");
  const dogAt = n.word("order", "Dog bites man");
  const manAt = n.word("order", "man bites dog");
  const sameAt = n.word("order", "same bag");
  const realAt = n.word("sparse", "Real vocabularies");
  const tensAt = n.word("sparse", "tens of thousands");
  const zeroAt = n.word("sparse", "zero");
  const greatAt = n.word("meaning", "great");
  const excellentAt = n.word("meaning", "excellent");
  const unrelatedAt = n.word("meaning", "two unrelated columns");
  const meaningAt = n.word("meaning", "about meaning");
  const commonAt = n.word("common-in", "most common words");
  const biggestAt = n.word("common-in", "biggest counts");
  const leastAt = n.word("common-in", "say the least");

  const fixAt = n.word("common-in", "neat fix");
  // The strip keeps running out to the right until "zero" is said.
  const stripGrow = ease(frame, tensAt - 2, Math.max(30, zeroAt - tensAt));
  // At "neat fix", the three panels step back for the turn line.
  const back = 1 - 0.55 * ease(frame, fixAt - 4, 18);
  const px = PANEL_X;

  return (
    <AbsoluteFill>
      {/* ── Sound: each panel arriving, the strip running out, the turn ── */}
      <Sfx name="el-pencil" at={dogAt - 4} level={-36} />
      <Sfx name="el-tap" at={sameAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={tensAt - 2} level={-34} />
      <Sfx name="el-tap" at={greatAt - 4} level={-30} />
      <Sfx name="el-tap" at={excellentAt - 4} level={-30} />
      <Sfx name="el-pop" at={commonAt - 4} level={-31} />

      <Kicker at={start - 10}>Bag of words</Kicker>
      <Headline at={start - 4} second={blindAt - 4} italic="blind spots.">
        The bag has
      </Headline>
      <FigLabel n="9" title="What the bag throws away" at={start - 2} x={X0} y={y(FIG_Y)} />

      <div style={{ position: "absolute", inset: 0, opacity: back }}>
      {/* ── (a) Order: two sentences, one bag ── */}
      <Ink at={dogAt - 8} dur={12} style={{ left: px[0], top: y(HEAD_Y), ...label(24, INK), whiteSpace: "nowrap" }}>
        Order
      </Ink>
      {ORDER.sentences.map((s, i) => (
        <Ink
          key={s}
          at={(i === 0 ? dogAt : manAt) - 4}
          dur={14}
          style={{ left: px[0], top: y(SENT_Y + i * 50), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}
        >
          <span style={{ ...label(21, INK_SOFT), width: 22 }}>{"AB"[i]}</span>
          <span style={{ ...body(34), color: INK }}>{s}</span>
        </Ink>
      ))}
      {ORDER.vocab.map((w, j) => (
        <Ink key={w} at={manAt + 6 + j * 2} dur={10} style={{ left: MINI.x0 + j * MINI.w, width: MINI.w, top: y(MINI.headY), textAlign: "center", ...label(22, INK) }}>
          {w}
        </Ink>
      ))}
      {ORDER.rows.map((row, i) => (
        <React.Fragment key={i}>
          <Ink at={manAt + 8 + i * 4} dur={10} style={{ left: px[0], top: y(MINI.rowY + i * MINI.step) + h(MINI.h) / 2 - 15, ...label(21, INK_SOFT) }}>
            {"AB"[i]}
          </Ink>
          {row.map((c, j) => (
            <NumCell
              key={j}
              value={c}
              at={manAt + 8 + i * 4 + j}
              x={MINI.x0 + j * MINI.w + 4}
              y={y(MINI.rowY + i * MINI.step)}
              w={MINI.w - 8}
              h={h(MINI.h)}
              heat={0.6 + pulse(frame, sameAt + i * 4, 20) * 0.6}
              size={28}
            />
          ))}
        </React.Fragment>
      ))}
      <Note at={sameAt - 2} x={px[0]} y={y(MINI.rowY + 2 * MINI.step) + 14}>
        <span style={{ ...note(26, LOST_INK), fontWeight: 600, whiteSpace: "nowrap" }}>The same bag</span>
      </Note>

      {/* ── (b) Mostly zeros: doc1's row against a real vocabulary ── */}
      <Ink at={realAt - 6} dur={12} style={{ left: px[1], top: y(HEAD_Y), ...label(24, INK), whiteSpace: "nowrap" }}>
        Mostly zeros
      </Ink>
      <Note at={realAt - 2} x={px[1]} y={y(SENT_Y)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>doc1’s row, from Fig. 7</span>
      </Note>
      {DOC1.map((c, j) => (
        <NumCell
          key={j}
          value={c}
          at={realAt + j}
          x={px[1] + j * 54}
          y={y(SENT_Y + 44)}
          w={48}
          h={h(48)}
          heat={c / 2}
          size={24}
          faint={c === 0}
        />
      ))}
      <Note at={tensAt - 2} x={px[1]} y={y(STRIP_Y + 56)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          the same row, against <Mark at={tensAt}>tens of thousands</Mark> of words
        </span>
      </Note>
      <div style={{ position: "absolute", left: px[1], top: y(STRIP_Y + 100), display: "flex", gap: 0 }}>
        {Array.from({ length: STRIP_CELLS }, (_, k) => {
          const shown = k / STRIP_CELLS < stripGrow;
          const c = k < DOC1.length ? DOC1[k] : 0;
          return (
            <span
              key={k}
              style={{
                width: STRIP_W,
                height: h(60),
                boxSizing: "border-box",
                borderRight: `1px solid ${CHIP_LINE}`,
                background: c > 0 ? tint(1) : "transparent",
                opacity: shown ? 1 - (k / STRIP_CELLS) * 0.55 : 0,
              }}
            />
          );
        })}
      </div>
      <Note at={zeroAt - 2} x={px[1]} y={y(STRIP_Y + 188)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Almost every cell: 0</span>
      </Note>

      {/* ── (c) Meaning: two near-synonyms, two unrelated columns ── */}
      <Ink at={greatAt - 8} dur={12} style={{ left: px[2], top: y(HEAD_Y), ...label(24, INK), whiteSpace: "nowrap" }}>
        No meaning
      </Ink>
      {/* Two reviews that mean the same thing, counted the lesson's way. */}
      {MEANING.sentences.map((t, i) => (
        <Ink
          key={t}
          at={(i === 0 ? greatAt : excellentAt) - 4}
          dur={14}
          style={{ left: px[2], top: y(SENT_Y + i * 50), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}
        >
          <span style={{ ...label(21, INK_SOFT), width: 22 }}>{"CD"[i]}</span>
          <span style={{ ...body(34), color: INK }}>{t}</span>
        </Ink>
      ))}
      {MEANING.vocab.map((w, j) => (
        <Ink
          key={w}
          at={excellentAt + 6 + j * 2}
          dur={10}
          style={{ left: MEANING_X0 + j * MEANING_W, width: MEANING_W, top: y(MINI.headY), textAlign: "center", ...label(22, INK) }}
        >
          {w}
        </Ink>
      ))}
      {MEANING.rows.map((row, i) => (
        <React.Fragment key={i}>
          <Ink at={excellentAt + 8 + i * 4} dur={10} style={{ left: px[2], top: y(MINI.rowY + i * MINI.step) + h(MINI.h) / 2 - 15, ...label(21, INK_SOFT) }}>
            {"CD"[i]}
          </Ink>
          {row.map((c, j) => {
            const shared = MEANING.shared.includes(MEANING.vocab[j]);
            const glow = shared ? pulse(frame, meaningAt + i * 4, 22) : pulse(frame, unrelatedAt + j * 3 + i * 3, 20);
            return (
              <NumCell
                key={j}
                value={c}
                at={excellentAt + 8 + i * 4 + j}
                x={MEANING_X0 + j * MEANING_W + 4}
                y={y(MINI.rowY + i * MINI.step)}
                w={MEANING_W - 8}
                h={h(MINI.h)}
                heat={c * 0.6 + glow * 0.6}
                size={28}
                faint={c === 0}
              />
            );
          })}
        </React.Fragment>
      ))}
      <Note at={unrelatedAt - 2} x={px[2]} y={y(MINI.rowY + 2 * MINI.step) + 14}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <i>great</i> and <i>excellent</i>: two unrelated columns
        </span>
      </Note>
      <Note at={meaningAt - 2} x={px[2]} y={y(MINI.rowY + 2 * MINI.step) + 58}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          The two reviews share only <i>{MEANING.shared.join(", ")}</i>.
        </span>
      </Note>

      </div>

      {/* ── The turn: the commonest word wins every row ── */}
      <div style={{ position: "absolute", left: X0, top: y(COMMON_Y), display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap" }}>
        <Chip text="the" size={30} at={commonAt - 2} mark={biggestAt - 2} />
        <span style={{ ...note(26, INK) }}>
          <Reveal at={biggestAt - 4}>{`${THE_COUNTS.join(" or ")} in every row, the biggest count,`}</Reveal>{" "}
          <Reveal at={leastAt - 2} style={{ color: LOST_INK, fontStyle: "italic" }}>
            and the least telling.
          </Reveal>
        </span>
      </div>
    </AbsoluteFill>
  );
};
