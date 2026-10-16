import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { COMPARISONS, ILLUSTRATIONS, VIDEO } from "./data";
import { Code, Fig, LISTING_PAPER, Mono, TRUTH, truthKey, TruthWord, Underline, UNKNOWN_INK } from "./kit";

const LEFT = 120;
/** The grid: a column of row titles, then one column per comparison. */
const COL_X = 420;
const COL_W = 320;
const RIGHT = COL_X + COL_W * 3;
/** Layout rows, before `y()`. */
const FIG_Y = 322;
const ROW1 = 392;
const DIV1 = 502;
const ROW2 = 530;
const NOTE_Y = 614;
const DIV2 = 690;
const ROW3 = 722;
const ROW_H = 72;
/** The comparisons' code size. */
const EXPR = 42;

/** A row of a table, drawn small: the thing WHERE keeps or drops. */
const RowToken: React.FC<{ kept: number; dropped: number }> = ({ kept, dropped }) => {
  const w = 132;
  const hgt = 40;
  return (
    <svg width={w + 8} height={hgt + 8} style={{ overflow: "visible", flex: "none" }}>
      <g opacity={1 - dropped * 0.6}>
        <rect
          x={4}
          y={4}
          width={w}
          height={hgt}
          rx={3}
          fill={
            kept > 0
              ? `color-mix(in srgb, ${TRUTH.true.lamp} ${Math.round(kept * 30)}%, ${LISTING_PAPER})`
              : LISTING_PAPER
          }
          stroke={INK}
          strokeWidth={1.6}
        />
        {[1, 2].map((k) => (
          <line
            key={k}
            x1={4 + (w * k) / 3}
            x2={4 + (w * k) / 3}
            y1={4}
            y2={4 + hgt}
            stroke={HAIRLINE}
            strokeWidth={1.2}
          />
        ))}
      </g>
      {dropped > 0 ? (
        <line
          x1={-2}
          y1={4 + hgt + 4}
          x2={-2 + (w + 12) * dropped}
          y2={4 + hgt + 4 - (hgt + 8) * dropped}
          stroke={TRUTH.false.ink}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
};

/**
 * Three-valued logic: three comparisons and the value each returns, the
 * third against NULL, and what WHERE does with a row in each case.
 */
export const LogicScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("three").from;
  const threeAt = n.word("three", "three values");
  const wordAt = [n.word("three", "True"), n.word("three", "false"), n.word("three", "unknown")];
  const comparisonAt = n.word("compare", "Any comparison");
  const withNullAt = n.word("compare", "with NULL");
  const isUnknownAt = n.word("compare", "is unknown");
  const twoAt = n.word("compare", "Is two different");
  const whereAt = n.word("where", "WHERE keeps");
  const keptAt = n.word("where", "is true");
  const dropAt = [n.word("where", "False"), n.word("where", "unknown")];
  const exprAt = [comparisonAt - 2, comparisonAt + 6, withNullAt - 2];

  const light = pop(frame, threeAt - 6, fps, 16);
  const colLeft = (i: number) => COL_X + i * COL_W;
  const cellRow = (top: number): React.CSSProperties => ({
    top: y(top),
    height: ROW_H,
    display: "flex",
    alignItems: "center",
  });

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Three-valued logic</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: LEFT - 4,
          top: y(150),
          display: "flex",
          gap: "0.24em",
          whiteSpace: "nowrap",
          ...headline(88),
        }}
      >
        <Ink at={wordAt[0] - 4} dur={14} style={{ position: "relative" }}>
          True,
        </Ink>
        <Ink at={wordAt[1] - 4} dur={14} style={{ position: "relative" }}>
          false,
        </Ink>
        <Ink at={wordAt[2] - 6} dur={18} style={{ position: "relative", ...headline(88, true) }}>
          and{" "}
          <Underline at={wordAt[2] + 4} color={TRUTH.unknown.lamp}>
            unknown.
          </Underline>
        </Ink>
      </div>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="snt-traffic-light"
          style={{
            position: "absolute",
            left: 1470,
            top: y(130),
            width: 330,
            height: 470,
            opacity: light,
            transform: `translateY(${bob(frame, 4, 120) + (1 - light) * 28}px)`,
          }}
        />
      ) : null}

      <Fig n="2" at={start - 8} x={LEFT} y={y(FIG_Y)}>
        Three comparisons, and what <Mono>WHERE</Mono> does with each
      </Fig>

      {/* The comparison against NULL, marked while the narration dwells on it:
          sized in em of the code, so it spans the characters. */}
      <div
        style={{
          position: "absolute",
          left: colLeft(2) - 0.35 * EXPR,
          top: y(ROW1) + ROW_H * 0.14,
          height: ROW_H * 0.72,
          fontSize: EXPR,
          width: `${(COMPARISONS[2].expr.length * 0.6 + 0.7) * ease(frame, twoAt - 4, 14)}em`,
          background: HIGHLIGHT,
        }}
      />

      {/* Row titles. */}
      <Ink at={comparisonAt - 8} dur={14} style={{ left: LEFT, ...cellRow(ROW1) }}>
        <span style={label(22, INK_SOFT)}>Comparison</span>
      </Ink>
      <Ink at={wordAt[0] - 8} dur={14} style={{ left: LEFT, ...cellRow(ROW2) }}>
        <span style={label(22, INK_SOFT)}>What it returns</span>
      </Ink>
      <Ink at={whereAt - 6} dur={14} style={{ left: LEFT, ...cellRow(ROW3) }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label(22, INK_SOFT)}>
            Under <Mono color={INK}>WHERE</Mono>
          </span>
        </div>
      </Ink>

      {/* Rules between the rows, drawn across as each row arrives. */}
      {[
        { at: wordAt[0] - 6, top: DIV1 },
        { at: whereAt - 8, top: DIV2 },
      ].map((r) => (
        <div
          key={r.top}
          style={{
            position: "absolute",
            left: LEFT,
            top: y(r.top),
            width: (RIGHT - LEFT) * ease(frame, r.at, 16),
            height: 1,
            background: HAIRLINE,
          }}
        />
      ))}

      {COMPARISONS.map((c, i) => {
        const key = truthKey(c.value);
        const kept = key === "true";
        const decided = kept ? keptAt : dropAt[i - 1];
        return (
          <React.Fragment key={c.expr}>
            <Ink at={exprAt[i]} dur={14} style={{ left: colLeft(i), ...cellRow(ROW1) }}>
              <Code line={c.expr} size={EXPR} />
            </Ink>
            <Ink at={wordAt[i] - 2} dur={14} style={{ left: colLeft(i), ...cellRow(ROW2) }}>
              <TruthWord value={c.value} size={50} weight={680} />
            </Ink>
            <Ink at={whereAt + i * 4} dur={14} style={{ left: colLeft(i), ...cellRow(ROW3), gap: 18 }}>
              <RowToken
                kept={kept ? ease(frame, decided - 2, 12) : 0}
                dropped={kept ? 0 : ease(frame, decided - 2, 12)}
              />
              <span
                style={{
                  ...label(26, kept ? TRUTH.true.ink : INK_SOFT),
                  opacity: ease(frame, decided, 10),
                }}
              >
                {kept ? "kept" : "dropped"}
              </span>
            </Ink>
          </React.Fragment>
        );
      })}
      <Note at={isUnknownAt} x={colLeft(2)} y={y(NOTE_Y)} from="up" width={COL_W}>
        <span style={note(20, INK_SOFT)}>
          Postgres returns{" "}
          <Mono color={UNKNOWN_INK} weight={700}>
            NULL
          </Mono>
        </span>
      </Note>
      {/* A paper rule under the grid keeps its foot from floating. */}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(ROW3) + ROW_H + 18,
          width: (RIGHT - LEFT) * ease(frame, whereAt + 8, 16),
          height: 2,
          background: INK,
        }}
      />
    </AbsoluteFill>
  );
};
