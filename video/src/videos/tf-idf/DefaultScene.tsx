import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, body, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { CAT, COUNTS, DEFAULT_IDF, DEFAULT_ROWS, DF, IDF, N, num, THE, VOCAB } from "./data";
import { Frac, V } from "./parts";

/** The comparison, left; Doc 1's scores under the default, right. Layout units. */
const WORD_X = 120;
const COL_A = 330;
const COL_B = 650;
const HEAD_Y = 266;
const FORMULA_Y = 312;
const RULE_Y = 432;
const ROW_Y = [452, 530];
const ROW_H = 64;

const CHART_X = 1150;
const STEP = 132;
const BAR_W = 84;
const BASE_Y = 604;
const MAX_H = 250;

/** Doc 1's words, in table order, with their scores under the default. */
const DOC1 = VOCAB.map((w, j) => ({ w, j, v: DEFAULT_ROWS[0][j] })).filter((d) => COUNTS[0][d.j] > 0);
const TOP_V = Math.max(...DOC1.map((d) => d.v));
/** Does "the" top every row under the default? measure.py checks it too. */
const THE_TOPS = DEFAULT_ROWS.every((row) => row[THE] === Math.max(...row));

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: "0.95em", color: INK }}>{children}</span>
);

/**
 * sklearn: the lesson's textbook idf against scikit-learn's default, which
 * smooths and adds one, so "the" never reaches zero and, on three documents,
 * still scores highest.
 */
export const DefaultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("sklearn").from;
  const textbookAt = n.word("sklearn", "textbook");
  const smoothsAt = n.word("sklearn", "smooths");
  const addsAt = n.word("sklearn", "adds one");
  const neverAt = n.word("sklearn", "never reaches zero");
  const theseAt = n.word("sklearn", "On these three");
  const topAt = n.word("sklearn", "stays on top");

  const a = ease(frame, start + 2, 14);
  const b = ease(frame, smoothsAt - 4, 14);
  const plusOne = ease(frame, addsAt - 2, 12);
  const bVals = ease(frame, addsAt + 8, 12);
  const mark = ease(frame, neverAt, 12);
  const top = ease(frame, topAt - 2, 12);

  const cell = (x: number, row: number, p: number, children: React.ReactNode) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y(ROW_Y[row]) + h(ROW_H) / 2,
        transform: `translateY(-50%) translateY(${(1 - p) * 8}px)`,
        opacity: p,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Scikit-learn&apos;s default
        </Ink>
        <Ink
          at={neverAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          never reaches zero.
        </Ink>
      </div>
      <FigLabel n="5" title="One corpus, two idf formulas" at={start - 8} x={120} y={y(196)} />

      {/* Column heads and formulas. */}
      <div style={{ position: "absolute", left: COL_A, top: y(HEAD_Y), opacity: a, ...label(21, INK_SOFT) }}>
        Textbook, as in the lesson
      </div>
      <div style={{ position: "absolute", left: COL_B, top: y(HEAD_Y), opacity: b, ...label(21, INK_SOFT) }}>
        <Code>TfidfVectorizer()</Code> default
      </div>
      <Ink at={start + 4} dur={18} style={{ left: COL_A, top: y(FORMULA_Y), ...headline(42), whiteSpace: "nowrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ marginRight: "0.12em" }}>ln</span>
          <Frac top={<V>N</V>} bottom={<V>df</V>} />
        </span>
      </Ink>
      <Ink at={smoothsAt - 2} dur={18} style={{ left: COL_B, top: y(FORMULA_Y), ...headline(42), whiteSpace: "nowrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ marginRight: "0.12em" }}>ln</span>
          <Frac
            top={
              <>
                1 + <V>N</V>
              </>
            }
            bottom={
              <>
                1 + <V>df</V>
              </>
            }
          />
          <span style={{ marginLeft: "0.25em", opacity: plusOne, color: ACCENT_INK }}>+ 1</span>
        </span>
      </Ink>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: a }}>
        <line x1={WORD_X} x2={WORD_X + (1000 - WORD_X) * a} y1={y(RULE_Y)} y2={y(RULE_Y)} stroke={HAIRLINE} strokeWidth={1.2} />
      </svg>

      {[THE, CAT].map((j, row) => (
        <React.Fragment key={j}>
          {cell(WORD_X, row, a, <span style={{ ...body(40, true), color: INK }}>{VOCAB[j]}</span>)}
          {cell(
            COL_A,
            row,
            a,
            <span style={{ ...headline(44), color: j === THE ? ACCENT_INK : INK }}>{num(IDF[j])}</span>,
          )}
          {cell(
            COL_B,
            row,
            bVals,
            <span
              style={{
                ...headline(44),
                color: INK,
                padding: "0 8px",
                marginLeft: -8,
                background: j === THE ? `linear-gradient(90deg, ${HIGHLIGHT} ${mark * 100}%, transparent ${mark * 100}%)` : undefined,
              }}
            >
              {DEFAULT_IDF[j].toFixed(2)}
            </span>,
          )}
        </React.Fragment>
      ))}
      <Note at={textbookAt + 8} x={WORD_X} y={y(ROW_Y[1] + ROW_H + 26)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          <V>N</V> is {N}. <i>{VOCAB[THE]}</i> is in {DF[THE]} documents, <i>{VOCAB[CAT]}</i> in {DF[CAT]}.
        </span>
      </Note>

      {/* Doc 1 under the default. */}
      <Note at={theseAt - 6} x={CHART_X - 20} y={y(HEAD_Y)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
          Doc 1 through <Code>TfidfVectorizer()</Code>
        </span>
      </Note>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, theseAt - 6, 10) }}>
        <line
          x1={CHART_X - 20}
          x2={CHART_X - 20 + (DOC1.length * STEP - STEP + BAR_W + 40) * ease(frame, theseAt - 6, 16)}
          y1={y(BASE_Y) + 0.5}
          y2={y(BASE_Y) + 0.5}
          stroke={INK}
          strokeWidth={1.6}
        />
        {DOC1.map((d, k) => {
          const bh = h(MAX_H) * (d.v / TOP_V) * ease(frame, theseAt + k * 3, 20);
          return (
            <React.Fragment key={d.w}>
              <rect x={CHART_X + k * STEP} y={y(BASE_Y) - bh} width={BAR_W} height={bh} fill={BAR} />
              {/* "the" turns to the accent from the baseline up as it is named. */}
              {d.j === THE && top > 0 ? (
                <rect x={CHART_X + k * STEP} y={y(BASE_Y) - bh * top} width={BAR_W} height={bh * top} fill={ACCENT} />
              ) : null}
            </React.Fragment>
          );
        })}
      </svg>
      {DOC1.map((d, k) => (
        <React.Fragment key={d.w}>
          <Note
            at={theseAt + 12 + k * 3}
            x={CHART_X + k * STEP + BAR_W / 2}
            y={y(BASE_Y) - h(MAX_H) * (d.v / TOP_V) - 40}
            style={{ transform: "translateX(-50%)" }}
          >
            <span style={{ ...note(22, d.j === THE && top > 0.5 ? ACCENT_INK : INK), fontWeight: 600 }}>
              {d.v.toFixed(2)}
            </span>
          </Note>
          <Note
            at={theseAt + k * 3}
            x={CHART_X + k * STEP + BAR_W / 2}
            y={y(BASE_Y) + 12}
            style={{ transform: "translateX(-50%)" }}
          >
            <span style={{ ...body(30, true), color: INK }}>{d.w}</span>
          </Note>
        </React.Fragment>
      ))}
      {THE_TOPS ? (
        <Note at={topAt} x={CHART_X - 20} y={y(BASE_Y + 76)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <i>{VOCAB[THE]}</i> still scores highest, in every row
          </span>
        </Note>
      ) : null}
      <Note at={theseAt + 16} x={CHART_X - 20} y={y(BASE_Y + 120)}>
        <span style={{ ...note(20, INK_SOFT), display: "block", width: 660 }}>
          Its defaults: raw counts for tf, then each row scaled to length one.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
