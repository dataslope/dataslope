import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { COUNTS, LENGTHS, spell, THE } from "./data";
import { colMid, colX, DocTable, TABLE_BOTTOM } from "./parts";

const THE_COUNT = COUNTS[0][THE];
const SAME = COUNTS.every((row) => row[THE] === THE_COUNT);
/** The counts of every other word where it appears: here, only ever 1. */
const OTHER_COUNTS = [...new Set(COUNTS.flatMap((row) => row.filter((c, j) => j !== THE && c > 0)))];
const LENGTH = LENGTHS.every((l) => l === LENGTHS[0]) ? LENGTHS[0] : null;

/** Notes under the table, in layout units. */
const NOTE_Y = TABLE_BOTTOM + 52;
const VERDICT_Y = NOTE_Y + 84;

/**
 * Counts: the document-term table of the bag-of-words lesson, built from the
 * three documents. "the" leads every row and never changes.
 */
export const CountsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("counts").from;
  const rowsAt = n.word("counts", "counts");
  const twoAt = n.word("counts", "scores two");
  const moreAt = n.word("counts", "more than");
  const sameAt = n.word("counts", "same in every row");

  return (
    <AbsoluteFill>
      {/* One line in two inks; the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          By raw count,
        </Ink>
        <Ink
          at={twoAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          “the” wins every row.
        </Ink>
      </div>
      <FigLabel n="2" title="Term counts, one row per document" at={start - 8} x={120} y={y(196)} />

      <DocTable at={rowsAt - 6} frame={ease(frame, twoAt - 2, 16)} />

      <Leader
        points={[
          [colMid(THE), y(NOTE_Y) - 6],
          [colMid(THE), y(TABLE_BOTTOM) + 16],
        ]}
        at={twoAt + 6}
        color={ACCENT}
        dot={false}
        width={2}
      />
      <Note at={twoAt + 8} x={colX(THE) + 4} y={y(NOTE_Y)}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          {THE_COUNT} in every row
        </span>
      </Note>
      <Note at={moreAt + 2} x={colX(2) + 4} y={y(NOTE_Y)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Every other word: {OTHER_COUNTS.join(" or ")} where it appears, 0 elsewhere
        </span>
      </Note>

      {SAME ? (
        <Ink at={sameAt - 2} dur={20} style={{ left: 120, top: y(VERDICT_Y), width: 1300 }}>
          <div style={{ ...body(36, true), color: INK, lineHeight: 1.25 }}>
            The same in all three rows, so this column cannot tell Doc 1 from Doc 3.
          </div>
          <div style={{ ...note(21, INK_SOFT), marginTop: 18 }}>
            Counts of the lesson&apos;s <span style={{ fontFamily: MONO, color: INK }}>.split()</span> tokens.
            {LENGTH ? ` Every document is ${spell(LENGTH)} words long.` : null}
          </div>
        </Ink>
      ) : null}
    </AbsoluteFill>
  );
};
