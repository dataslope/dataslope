import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, body, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CAT_OVER_DOG, DRAWS_T1, LOGITS, pct, row, signed, TOKENS } from "./data";
import { Arrow, FILL, Headline, Kicker, Marked, Mono, Spot, Svg, TEXT, TINT, Tok, X0 } from "./kit";

/** Rows of Fig. 1, in layout y. */
const ROW_Y = (i: number) => 420 + i * 76;
const BAR_H = 42;
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
 * Hook, logits, softmax, share, picker: the score the last layer gives each
 * candidate (Unit 2 ends there), what softmax makes of the scores, and the
 * draw that picks one. The lesson's own four tokens and scores, after
 * LlmTemperature's PromptScene.
 */
export const ScoreScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("hook").from;
  const scoreAt = n.word("hook", "score");
  const everyAt = n.word("hook", "every token");
  const logitAt = n.word("hook", "logit");
  const pickAt = n.word("hook", "pick one");
  const sentenceAt = n.word("logits", "sentence");
  const catAt = n.word("logits", "Cat scores");
  const rockAt = n.word("logits", "rock scores");
  const softAt = n.word("softmax", "Softmax");
  const raisesAt = n.word("softmax", "raises");
  const dividesAt = n.word("softmax", "divides");
  const catGetsAt = n.word("share", "Cat gets");
  const threeAt = n.word("share", "three times");
  const gapAt = n.word("share", "gap");
  const rockGetsAt = n.word("share", "Rock gets");
  const pickingAt = n.word("picker", "picking");
  const codeAt = n.word("picker", "lines of code");
  const diffAt = n.word("picker", "different answers");

  const top = y(ROW_Y(0)) - 14;
  const bottom = y(ROW_Y(TOKENS.length - 1)) + h(BAR_H) + 14;
  const mid = (top + bottom) / 2;
  const rowMid = (i: number) => y(ROW_Y(i)) + h(BAR_H) / 2;
  // A band behind the row the narration reads out: cat, then rock.
  const bandRow = frame < rockAt - 4 ? 0 : 3;
  const band =
    ease(frame, catAt - 4, 10) *
    (1 - ease(frame, softAt - 8, 10)) *
    (bandRow === 0 ? 1 - ease(frame, rockAt - 6, 4) : ease(frame, rockAt - 4, 8));

  // "Three times dog's share": a bracket at the right of the cat and dog bars.
  const catEnd = P0 + (P1 - P0) * AT_T1.probs[0];
  const ratioX = catEnd + 120;
  // "A gap of one point one": between the ends of dog's and cat's score bars.
  const gapX = [ZERO + LOGITS[1] * UNIT, ZERO + LOGITS[0] * UNIT] as const;
  const gapY = rowMid(0) - h(BAR_H) / 2 - 12;
  const drawY = y(806);

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the jar, the arrow, the draws ── */}
      {TOKENS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={scoreAt + i * 4} level={-30} />
      ))}
      <Sfx name="el-pop" at={start} level={-31} />
      <Sfx name="el-pencil" at={softAt} level={-35} />
      <Sfx name="el-whoosh" at={dividesAt} level={-36} />
      {[0, 1, 2].map((k) => (
        <Sfx key={k} name="el-tap" at={diffAt + k * 6} level={-29} />
      ))}

      <Kicker at={start - 6}>Sampling</Kicker>
      <Headline lead="Every token gets a score." turn="Something has to pick one." at={start - 4} turnAt={pickAt - 10} out={sentenceAt - 8} size={54} />
      {/* The sentence the scores continue, once the narration gives it. */}
      <Ink at={sentenceAt - 2} dur={20} style={{ left: X0 - 6, top: y(136), ...headline(78), whiteSpace: "nowrap" }}>
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
            transform: `scaleX(${ease(frame, sentenceAt + 8, 16)})`,
          }}
        />
      </Ink>
      {/* The picker: a jar of slips, sized by their odds. */}
      <Spot id="llm-generation-jar" at={start} left={1590} top={y(70)} width={250} height={h(250)} />

      <FigLabel n="1" title="A score for each candidate token, and what softmax makes of it" at={everyAt - 4} x={X0} y={y(330)} />

      {/* Column heads. */}
      <Ink at={logitAt - 2} dur={14} style={{ left: ZERO - 80, top: y(380) }}>
        <span style={label(21)}>Score, or logit</span>
      </Ink>
      <Ink at={softAt + 6} dur={14} style={{ left: P0, top: y(380) }}>
        <span style={label(21)}>Probability</span>
      </Ink>

      {/* The band behind the row being read out. */}
      <div
        style={{
          position: "absolute",
          left: X0,
          width: 920,
          top: y(ROW_Y(bandRow)) - 12,
          height: h(BAR_H) + 24,
          background: HIGHLIGHT,
          opacity: band * 0.5,
        }}
      />

      {/* The zero line of the scores. */}
      <Svg opacity={ease(frame, scoreAt, 12)}>
        <line x1={ZERO} x2={ZERO} y1={top} y2={top + (bottom - top) * ease(frame, scoreAt, 18)} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Note at={scoreAt + 6} x={ZERO} y={bottom + 8} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={note(20, INK_SOFT)}>0</span>
      </Note>
      <Note at={scoreAt + 18} x={160} y={bottom + 24}>
        <span style={note(20, INK_SOFT)}>…and every other token in the vocabulary</span>
      </Note>

      {TOKENS.map((_, i) => {
        const cy = y(ROW_Y(i));
        const grow = ease(frame, scoreAt + i * 4, 18);
        const v = LOGITS[i];
        const x0 = v >= 0 ? ZERO : ZERO + v * UNIT * grow;
        const w = Math.abs(v) * UNIT * grow;
        const p = AT_T1.probs[i];
        const pGrow = ease(frame, dividesAt + i * 4, 20);
        const pw = (P1 - P0) * p * pGrow;
        const markAt = i === 0 ? catGetsAt : i === TOKENS.length - 1 ? rockGetsAt : undefined;
        const scoreMark = i === 0 ? catAt : i === TOKENS.length - 1 ? rockAt : undefined;
        return (
          <React.Fragment key={i}>
            <Ink at={everyAt + i * 4} dur={12} style={{ left: 160, top: rowMid(i) - 24, height: 48, display: "flex", alignItems: "center" }}>
              <Tok i={i} />
            </Ink>
            <Svg>
              <rect x={x0} y={cy} width={w} height={h(BAR_H)} fill={FILL[i]} />
              <rect x={P0} y={cy} width={pw} height={h(BAR_H)} fill={FILL[i]} />
            </Svg>
            <Note
              at={scoreAt + i * 4 + 12}
              x={v >= 0 ? ZERO + v * UNIT + 14 : ZERO + v * UNIT - 14}
              align={v >= 0 ? "left" : "right"}
              y={rowMid(i) - 15}
            >
              <span style={{ ...note(23, TEXT[i]), fontWeight: 650 }}>
                {scoreMark === undefined ? signed(v) : <Marked at={scoreMark + 2}>{signed(v)}</Marked>}
              </span>
            </Note>
            <Note at={dividesAt + i * 4 + 14} x={P0 + (P1 - P0) * p + 14} y={rowMid(i) - 15}>
              <span style={{ ...note(23, TEXT[i]), fontWeight: 650 }}>
                {markAt === undefined ? pct(p) : <Marked at={markAt - 2}>{pct(p)}</Marked>}
              </span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* "A gap of one point one", over the ends of the two score bars. */}
      <Svg opacity={ease(frame, gapAt - 4, 10)}>
        <path
          d={`M${gapX[0]},${gapY + 8} V${gapY} H${gapX[1]} V${gapY + 8}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
        />
      </Svg>
      <Note at={gapAt - 2} x={(gapX[0] + gapX[1]) / 2} y={gapY - 32} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(21, INK), fontWeight: 650 }}>gap {signed(LOGITS[0] - LOGITS[1])}</span>
      </Note>

      {/* "Three times dog's share": a bracket beside the cat and dog bars. */}
      <Svg opacity={ease(frame, threeAt - 4, 10)}>
        <path
          d={`M${ratioX - 10},${rowMid(0)} H${ratioX} V${rowMid(1)} H${ratioX - 10}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
        />
      </Svg>
      <Note at={threeAt - 2} x={ratioX + 14} y={(rowMid(0) + rowMid(1)) / 2 - 16}>
        <span style={{ ...note(23, INK), fontWeight: 700 }}>{CAT_OVER_DOG.toFixed(1)}×</span>
      </Note>

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

      {/* "A few lines of code", and the different answers it draws. */}
      <Ink at={codeAt - 2} dur={16} style={{ left: X0, top: drawY - 6 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            padding: "10px 20px",
            background: `color-mix(in srgb, ${INK} 5%, ${PAPER})`,
            borderTop: `2px solid ${INK}`,
            ...note(26, INK),
            whiteSpace: "nowrap",
          }}
        >
          <Mono weight={500}>sample(probabilities, settings)</Mono>
        </div>
      </Ink>
      <Ink at={pickingAt - 4} dur={12} style={{ left: X0, top: drawY - 42 }}>
        <span style={label(20)}>The picker, three runs</span>
      </Ink>
      {DRAWS_T1.slice(0, 3).map((tok, k) => (
        <Note key={k} at={diffAt + k * 6} x={X0 + 590 + k * 150} y={drawY - 2} from="up">
          <span
            style={{
              display: "inline-block",
              minWidth: 110,
              textAlign: "center",
              padding: "6px 14px",
              background: TINT[tok],
              borderBottom: `4px solid ${FILL[tok]}`,
              ...note(26, TEXT[tok]),
              fontWeight: 650,
            }}
          >
            {TOKENS[tok]}
          </span>
        </Note>
      ))}
      <Arrow from={[X0 + 506, drawY + 26]} to={[X0 + 572, drawY + 26]} at={diffAt - 6} dur={10} />

      <Note at={softAt + 8} x={X0} y={y(888)}>
        <span style={note(20, INK_SOFT)}>
          Illustrative scores: the lesson&apos;s own four-token example, not a real model&apos;s output.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
