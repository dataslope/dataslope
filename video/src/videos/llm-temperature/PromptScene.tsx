import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ILLUSTRATIONS, LOGITS, pct, row, signed, TOKENS, VIDEO } from "./data";
import { Arrow, FILL, Marked, Mono, TEXT, Tok } from "./kit";

/** Rows of Fig. 1, in layout y. */
const ROW_Y = (i: number) => 450 + i * 82;
const BAR_H = 46;
/** The score bars: zero at this x, this many px per unit of score. */
const ZERO = 600;
const UNIT = 80;
/** The probability bars run 0 to 100% across this span. */
const P0 = 1140;
const P1 = 1760;
/** The softmax arrow between the two columns. */
const ARROW_X = [962, 1084] as const;

const AT_T1 = row(1);

/**
 * Hook, logits, softmax: the prompt, a score for each candidate token, and
 * the probabilities softmax makes of them (T = 1, so no temperature yet).
 */
export const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const blankAt = n.word("hook", "finish");
  const figAt = n.word("logits", "every candidate");
  const scoreAt = n.word("logits", "score called");
  const catAt = n.word("logits", "cat scores");
  const rockAt = n.word("logits", "rock scores");
  const softAt = n.word("softmax", "Softmax");
  const raisesAt = n.word("softmax", "raises");
  const dividesAt = n.word("softmax", "divides");
  const catGetsAt = n.word("softmax", "Cat gets");
  const rockGetsAt = n.word("softmax", "Rock gets");
  const wheel = pop(frame, n.word("hook", "language model") - 4, fps, 16);

  const top = y(ROW_Y(0)) - 14;
  const bottom = y(ROW_Y(TOKENS.length - 1)) + h(BAR_H) + 14;
  const mid = (top + bottom) / 2;
  // A band behind the row the narration reads out: cat, then rock.
  const bandRow = frame < rockAt - 4 ? 0 : 3;
  const band =
    ease(frame, catAt - 4, 10) * (1 - ease(frame, softAt - 8, 10)) *
    (bandRow === 0 ? 1 - ease(frame, rockAt - 6, 4) : ease(frame, rockAt - 4, 8));

  return (
    <AbsoluteFill>
      <Ink at={2} dur={14} style={{ left: 120, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Picking the next token</span>
      </Ink>
      <Ink at={4} dur={20} style={{ left: 114, top: y(150), ...headline(88), whiteSpace: "nowrap" }}>
        Her new pet is a
        {/* The blank, sized in em so it sits after the words in any face. */}
        <span
          style={{
            display: "inline-block",
            width: "2.4em",
            height: "0.8em",
            marginLeft: "0.3em",
            borderBottom: `6px solid ${ACCENT}`,
            transformOrigin: "left center",
            transform: `scaleX(${ease(frame, blankAt - 4, 16)})`,
          }}
        />
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="llm-temperature-wheel"
          style={{
            position: "absolute",
            left: 1380,
            top: y(92),
            width: 420,
            height: h(250),
            opacity: wheel,
            transform: `translateY(${bob(frame, 5, 110) + (1 - wheel) * 30}px)`,
          }}
        />
      ) : null}

      <FigLabel n="1" title="A score for each candidate, and what softmax makes of it" at={figAt - 8} x={120} y={y(340)} />

      {/* Column heads. */}
      <Ink at={figAt} dur={14} style={{ left: ZERO - 80, top: y(398) }}>
        <span style={label(21)}>Score, or logit</span>
      </Ink>
      <Ink at={softAt + 6} dur={14} style={{ left: P0, top: y(398) }}>
        <span style={label(21)}>Probability</span>
      </Ink>

      {/* The band behind the row being read out. */}
      <div
        style={{
          position: "absolute",
          left: 120,
          width: 920,
          top: y(ROW_Y(bandRow)) - 12,
          height: h(BAR_H) + 24,
          background: HIGHLIGHT,
          opacity: band * 0.5,
        }}
      />

      {/* The zero line of the scores. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, figAt, 12) }}>
        <line
          x1={ZERO}
          x2={ZERO}
          y1={top}
          y2={top + (bottom - top) * ease(frame, figAt, 18)}
          stroke={INK}
          strokeWidth={1.6}
        />
      </svg>
      <Note at={figAt + 6} x={ZERO} y={bottom + 8} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={note(20, INK_SOFT)}>0</span>
      </Note>

      {TOKENS.map((_, i) => {
        const cy = y(ROW_Y(i));
        const at = figAt + i * 5;
        const grow = ease(frame, scoreAt + i * 4, 18);
        const v = LOGITS[i];
        const x0 = v >= 0 ? ZERO : ZERO + v * UNIT * grow;
        const w = Math.abs(v) * UNIT * grow;
        const p = AT_T1.probs[i];
        const pGrow = ease(frame, dividesAt + i * 4, 20);
        const pw = (P1 - P0) * p * pGrow;
        const markAt = i === 0 ? catGetsAt : i === TOKENS.length - 1 ? rockGetsAt : undefined;
        return (
          <React.Fragment key={i}>
            <Ink at={at - 4} dur={12} style={{ left: 160, top: cy + h(BAR_H) / 2 - 24, height: 48, display: "flex", alignItems: "center" }}>
              <Tok i={i} />
            </Ink>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              <rect x={x0} y={cy} width={w} height={h(BAR_H)} fill={FILL[i]} />
              <rect x={P0} y={cy} width={pw} height={h(BAR_H)} fill={FILL[i]} />
            </svg>
            <Note
              at={scoreAt + i * 4 + 12}
              x={v >= 0 ? ZERO + v * UNIT + 14 : ZERO + v * UNIT - 14}
              align={v >= 0 ? "left" : "right"}
              y={cy + h(BAR_H) / 2 - 15}
            >
              <span style={{ ...note(23, TEXT[i]), fontWeight: 650 }}>{signed(v)}</span>
            </Note>
            <Note at={dividesAt + i * 4 + 14} x={P0 + (P1 - P0) * p + 14} y={cy + h(BAR_H) / 2 - 15}>
              <span style={{ ...note(23, TEXT[i]), fontWeight: 650 }}>
                {markAt === undefined ? pct(p) : <Marked at={markAt - 2}>{pct(p)}</Marked>}
              </span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* Softmax: from the scores to the probabilities. */}
      <Ink at={softAt - 4} dur={14} style={{ left: ARROW_X[0], width: ARROW_X[1] - ARROW_X[0], top: mid - 56, textAlign: "center" }}>
        <span style={{ ...note(28, INK), fontWeight: 600 }}>
          <Mono>softmax</Mono>
        </span>
      </Ink>
      <Arrow from={[ARROW_X[0], mid]} to={[ARROW_X[1], mid]} at={softAt} />
      <Ink at={raisesAt - 2} dur={16} style={{ left: ARROW_X[0] - 30, width: ARROW_X[1] - ARROW_X[0] + 60, top: mid + 18, textAlign: "center" }}>
        <span style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
          e<sup style={{ fontSize: "0.68em" }}>score</sup> ÷ total
        </span>
      </Ink>

      <Note at={softAt + 8} x={120} y={y(800)}>
        <span style={note(20, INK_SOFT)}>
          Illustrative scores: the lesson&apos;s own four-token example, not a real model&apos;s output.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
