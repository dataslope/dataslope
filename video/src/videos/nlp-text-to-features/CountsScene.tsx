import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, label, note } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CORPUS, COUNTS, THE } from "./data";
import { FIG_Y, Headline, INK, INK_SOFT, Kicker, Mark, pulse, X0 } from "./parts";
import { colMid, colX, DocTable, tableBottom, tableGeo } from "./tfidf";

const SLIP_Y = 334;
const SLIP_X = [X0, 680, 1240];
const G = tableGeo(436);
const NOTE_Y = tableBottom(G) + 44;
const VERDICT_Y = NOTE_Y + 76;

const THE_COUNT = COUNTS[0][THE];
const SAME = COUNTS.every((row) => row[THE] === THE_COUNT);
/** The counts of every other word where it appears: here, only ever 1. */
const OTHER_COUNTS = [...new Set(COUNTS.flatMap((row) => row.filter((c, j) => j !== THE && c > 0)))];

/**
 * Part 3 opens, after the TfIdf video's HookScene and CountsScene: the
 * TF-IDF lesson's three documents, and their counts in the bag-of-words
 * layout. "the" leads every row and never changes, so its column cannot tell
 * the documents apart.
 */
export const CountsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const start = n.beat("counts").from;
  const newAt = n.word("counts", "three new documents");
  const docAt = [n.word("counts", "a cat on a mat"), n.word("counts", "a dog in a park"), n.word("counts", "a comet in the sky")];
  const rawAt = n.word("counts", "By raw count");
  const leadsAt = n.word("counts", "leads every row");
  const twoAt = n.word("counts", "with two");
  const sameAt = n.word("same", "same in every row");
  const cantAt = n.word("same", "can't tell");
  const apartAt = n.word("same", "apart");

  return (
    <AbsoluteFill>
      {/* ── Sound: each document, the table, the frame on "the" ── */}
      {docAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 4} level={-30} />
      ))}
      <Sfx name="el-pencil" at={rawAt - 6} level={-36} />
      <Sfx name="el-pencil" at={leadsAt - 2} level={-34} />

      <Kicker at={start - 10}>Weighting words</Kicker>
      <Headline at={rawAt - 6} second={leadsAt - 4} italic="“the” leads every row.">
        By raw count,
      </Headline>
      <FigLabel n="10" title="The TF-IDF lesson’s three documents, counted" at={newAt - 4} x={X0} y={y(FIG_Y)} />

      {CORPUS.map((d, i) => (
        <Ink key={i} at={docAt[i] - 4} dur={16} style={{ left: SLIP_X[i], top: y(SLIP_Y), display: "flex", alignItems: "baseline", gap: 16, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, INK_SOFT) }}>Doc {i + 1}</span>
          <span style={{ ...body(31), color: INK }}>{d}</span>
        </Ink>
      ))}

      <DocTable
        g={G}
        at={rawAt - 6}
        frame={ease(frame, leadsAt - 2, 16)}
        glow={(i, j) => (j === THE ? pulse(frame, sameAt + i * 5, 22) : COUNTS[i][j] > 0 ? pulse(frame, cantAt + i * 6 + j, 20) * 0.6 : 0)}
      />

      <Leader
        points={[
          [colMid(THE), y(NOTE_Y) - 6],
          [colMid(THE), y(tableBottom(G)) + 16],
        ]}
        at={twoAt}
        color={ACCENT}
        dot={false}
        width={2}
      />
      <Note at={twoAt + 2} x={colX(THE) + 4} y={y(NOTE_Y)}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>{THE_COUNT} in every row</span>
      </Note>
      <Note at={twoAt + 10} x={colX(2) + 4} y={y(NOTE_Y)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Every other word: {OTHER_COUNTS.join(" or ")} where it appears, 0 elsewhere
        </span>
      </Note>

      {SAME ? (
        <Ink at={sameAt - 2} dur={20} style={{ left: X0, top: y(VERDICT_Y), width: 1400 }}>
          <div style={{ ...body(36, true), color: INK, lineHeight: 1.25 }}>
            The same in all three rows, so this column can’t tell the documents <Mark at={apartAt - 2}>apart.</Mark>
          </div>
        </Ink>
      ) : null}
    </AbsoluteFill>
  );
};
