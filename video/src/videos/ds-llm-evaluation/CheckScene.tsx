import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { NOTEBOOK, num, pct } from "./data";
import { Drift, madeUp, Mark, MARK_OK, OK_INK, X0 } from "./parts";

const NB = { x: X0, top: 360, w: 720, cellH: 76, gap: 16 };
const LIST_X = 960;
const LIST_TOP = 330;
const LIST_ROW = 82;

/** One notebook cell: its code, and the row count it leaves behind. */
const Cell: React.FC<{ y: number; at: number; code: string; rows?: string; rowsAt?: number; bad?: number }> = ({
  y,
  at: from,
  code,
  rows,
  rowsAt,
  bad,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const r = rowsAt === undefined ? 0 : ease(frame, rowsAt, 12);
  const b = bad === undefined ? 0 : ease(frame, bad, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: NB.x,
        top: y,
        width: NB.w,
        height: NB.cellH,
        boxSizing: "border-box",
        padding: "0 20px",
        borderRadius: 10,
        border: `2px solid color-mix(in srgb, ${ACCENT} ${100 * b}%, ${INK_SOFT})`,
        background: `color-mix(in srgb, ${ACCENT} ${8 * b}%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: p,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>{code}</span>
      {rows ? (
        <span style={{ ...label(20, b > 0.5 ? ACCENT_INK : BLUE_INK), fontWeight: 700, ...TABULAR, opacity: r, whiteSpace: "nowrap" }}>{rows}</span>
      ) : null}
    </div>
  );
};

/**
 * Question 7. An assistant's notebook, three cells with their row counts: the
 * join leaves 6,700 of 10,000 rows, a third gone without a word (made up for
 * this video). Down the right, the checks in the order they are read, each
 * ticked, the twenty uncorrected tests carrying their 64%, and the last one,
 * reproducing the headline number another way, in green.
 */
export const CheckScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("check").from;
  const qAt = n.word("check", "Question");
  const textAt = n.word("check", "How do you check an analysis");
  const juniorAt = n.word("check", "a junior colleague's notebook");
  const slipAt = n.word("check", "where assistants slip");
  const lossAt = n.word("check", "silent data loss");
  const dropsAt = n.word("check", "quietly drops a third of the rows");
  const countAt = n.word("check", "Count rows at every step");
  const items = [
    { text: "silent data loss: count rows at every step", at: lossAt },
    { text: "leakage: a scaler fit before the split", at: n.word("check-list", "Then leakage") },
    { text: "the wrong test", at: n.word("check-test", "The wrong test") },
    { text: "columns or functions that don't exist", at: n.word("check-rest", "Columns or functions") },
    { text: "causal claims it can't support", at: n.word("check-rest", "causal claims") },
  ];
  const skewAt = n.word("check-test", "a t-test on skewed revenue");
  const twentyAt = n.word("check-test", "twenty segments tested at five percent each");
  const sixtyAt = n.word("check-test", "sixty-four percent chance");
  const reproAt = n.word("check-rest", "reproduce the headline number another way");
  const end = n.beat("check-rest").to;

  const cellY = (i: number) => y(NB.top) + i * h(NB.cellH + NB.gap);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={juniorAt} level={-36} />
      <Sfx name="el-scratch" at={dropsAt + 6} level={-32} />
      {items.map((it) => (
        <Sfx key={it.text} name="el-tap" at={it.at + 4} level={-34} />
      ))}
      <Sfx name="el-pop" at={sixtyAt + 2} level={-34} />
      <Sfx name="el-chime" at={reproAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you check an analysis an AI assistant wrote?
        </QuestionCard>

        {/* The notebook. */}
        <Note at={juniorAt} x={NB.x} y={y(NB.top - 46)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            read it like a junior colleague&apos;s notebook
            <span style={{ opacity: ease(frame, slipAt - 2, 10), color: ACCENT_INK }}>, with extra suspicion</span>
          </span>
        </Note>
        <Cell y={cellY(0)} at={juniorAt + 4} code={'orders = pd.read_csv("orders.csv")'} rows={`${num(NOTEBOOK.rows)} rows`} rowsAt={countAt} />
        <Cell
          y={cellY(1)}
          at={juniorAt + 8}
          code={'df = orders.merge(users, on="user_id")'}
          rows={`${num(NOTEBOOK.afterJoin)} rows`}
          rowsAt={dropsAt}
          bad={dropsAt + 6}
        />
        <Cell y={cellY(2)} at={juniorAt + 12} code={'df.groupby("segment")["revenue"].mean()'} />
        <Note at={dropsAt + 8} x={NB.x} y={cellY(3) + h(4)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            a third of the rows, gone without a word (−{pct(NOTEBOOK.lost)})
          </span>
        </Note>
        <Note at={dropsAt + 12} x={NB.x} y={cellY(3) + h(52)}>
          <span style={madeUp()}>made up for this video</span>
        </Note>

        {/* The checks. */}
        {items.map((it, i) => (
          <Note key={it.text} at={it.at - 2} x={LIST_X} y={y(LIST_TOP) + i * h(LIST_ROW) + (i > 2 ? h(36) : 0)}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Tick at={it.at + 6} size={26} />
              <span style={{ ...note(27, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{it.text}</span>
            </div>
          </Note>
        ))}
        <Note at={skewAt} x={LIST_X + 40} y={y(LIST_TOP) + 2 * h(LIST_ROW) + h(38)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
            a t-test on skewed revenue
            <br />
            <span style={{ opacity: ease(frame, twentyAt - 2, 10) }}>
              {NOTEBOOK.segments} segments at {pct(NOTEBOOK.alpha)} each, no correction:{" "}
              <b style={{ color: ACCENT_INK, opacity: ease(frame, sixtyAt - 2, 10) }}>{pct(NOTEBOOK.anyFalse)} chance of at least one false alarm</b>
            </span>
          </span>
        </Note>
        <Note at={reproAt - 2} x={LIST_X} y={y(LIST_TOP) + 5 * h(LIST_ROW) + h(60)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Tick at={reproAt + 6} size={30} />
            <span style={{ ...note(30, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              <Mark at={reproAt + 8} color={MARK_OK}>
                reproduce the headline number another way
              </Mark>
            </span>
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
