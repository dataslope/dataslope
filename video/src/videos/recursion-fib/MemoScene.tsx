import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, MEMO_TABLE, MEMO_WRITES, TREE_N, VIDEO } from "./data";
import { Fig, Listing, listingHeight, MEMO, MEMO_INK, Mono } from "./kit";

export const MEMO_LINES = [
  "long long fibMemo(int n, std::vector<long long> &memo) {",
  "  if (n <= 1)",
  "    return n;",
  "  if (memo[n] != -1)",
  "    return memo[n];",
  "  return memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);",
  "}",
] as const;
const SIZE = 30;
const LIST_X = 120;
const LIST_W = 1250;
const LIST_TOP = 352;
/** The memo vector, drawn as a column of cells to the right. */
const TABLE_X = 1440;
const INDEX_W = 130;
const CELL_W = 120;
const CELL_H = 56;

/**
 * The fix: the lesson's memoized fibMemo, the two lines that check the table
 * and the one that fills it, and the table itself after fibMemo(5).
 */
export const MemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("fix").from;
  const writeAt = n.word("fix", "write each answer");
  const checkAt = n.word("fix", "Check");
  const tableAt = n.word("fix", "table");
  const storeAt = n.word("fix", "store");
  const afterAt = n.word("fix", "after");
  const notebook = pop(frame, writeAt - 4, fps, 16);

  const top = y(LIST_TOP);
  const listingBottom = top + listingHeight(MEMO_LINES.length, SIZE);
  const cellH = h(CELL_H);
  const tableTop = top + 54;
  const writeStep = Math.max(4, (afterAt - storeAt + 10) / MEMO_WRITES.length);

  return (
    <AbsoluteFill>
      <Ink at={start - 12} dur={14} style={{ left: 124, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>The fix</span>
      </Ink>
      <Ink at={start - 10} dur={22} style={{ left: 118, top: y(150), ...headline(84), whiteSpace: "nowrap" }}>
        Write each answer <span style={headline(84, true)}>down.</span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="recursion-fib-notebook"
          style={{
            position: "absolute",
            left: 1510,
            top: y(84),
            width: 270,
            height: 230,
            opacity: notebook,
            transform: `translateY(${bob(frame, 4, 110) + (1 - notebook) * 26}px) rotate(${(1 - notebook) * -10}deg)`,
          }}
        />
      ) : null}

      <Fig n="4" at={start - 6} x={LIST_X} y={y(296)}>
        The lesson&apos;s <Mono>fibMemo</Mono>: the same recursion, with a table
      </Fig>
      <Listing
        lines={MEMO_LINES}
        x={LIST_X}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={start - 4}
        lineAt={[start, start + 3, start + 6, start + 9, start + 12, start + 15, start + 18]}
        marks={[
          { line: 3, at: checkAt - 2 },
          { line: 4, at: checkAt + 4 },
          { line: 5, at: storeAt - 2, from: 9, chars: 9, color: `color-mix(in srgb, ${MEMO} 26%, transparent)` },
        ]}
      />
      <Note at={checkAt + 8} x={LIST_X} y={listingBottom + 22} from="up">
        <span style={note(21, INK_SOFT)}>
          Lines 4 and 5 check the table before computing. Line 6 stores the result after.
        </span>
      </Note>

      {/* The memo vector after fibMemo(5): -1 means nothing stored yet. */}
      <Ink at={tableAt - 6} dur={14} style={{ left: TABLE_X, top: top, whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>
          <Mono color={MEMO_INK}>memo</Mono> during <Mono color={INK}>{`fibMemo(${TREE_N})`}</Mono>
        </span>
      </Ink>
      {MEMO_TABLE.map((final, i) => {
        const appear = ease(frame, tableAt - 2 + i * 2, 10);
        if (appear <= 0) return null;
        const w = MEMO_WRITES.findIndex((m) => m.n === i);
        const written = w < 0 ? 0 : ease(frame, storeAt + w * writeStep, 10);
        const shown = written >= 0.5 ? final : -1;
        const rowTop = tableTop + i * (cellH + 6);
        return (
          <div key={i} style={{ position: "absolute", left: TABLE_X, top: rowTop, height: cellH, display: "flex", alignItems: "center", opacity: appear }}>
            <span style={{ fontFamily: MONO, fontSize: 22, color: INK_SOFT, width: INDEX_W }}>memo[{i}]</span>
            <div
              style={{
                width: CELL_W,
                height: cellH,
                boxSizing: "border-box",
                border: `2px ${w < 0 ? "dashed" : "solid"} ${w < 0 ? HAIRLINE : MEMO}`,
                background: written > 0 ? `color-mix(in srgb, ${MEMO} ${Math.round(16 * written)}%, ${PAPER})` : PAPER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 600,
                color: shown === -1 ? INK_SOFT : MEMO_INK,
                position: "relative",
              }}
            >
              {written > 0 && written < 1 ? (
                <span style={{ position: "absolute", inset: -6, background: HIGHLIGHT, opacity: 1 - written, zIndex: -1 }} />
              ) : null}
              {shown}
            </div>
          </div>
        );
      })}
      <Note at={afterAt + 8} x={TABLE_X} y={tableTop + MEMO_TABLE.length * (cellH + 6) + 14} from="up" width={380}>
        <span style={note(20, INK_SOFT)}>0 and 1 never go in: line 2 answers them first.</span>
      </Note>
    </AbsoluteFill>
  );
};
