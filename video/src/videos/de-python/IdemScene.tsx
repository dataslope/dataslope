import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { IDEM } from "./data";
import { Code, Console, Drift, FadeIn, lineOf, Mark, MARK_BAD, MARK_OK, OK_INK, Strike, Tag, Title, X0 } from "./parts";

const TOP = 322;
const CODE = 22;
const OUT_X = 1180;
const ROW = 138;

/** One way to write the batch: its title, its write line, "run twice", and
 *  what the store holds after the second run. */
const Way: React.FC<{
  top: number;
  at: number;
  title: string;
  color: string;
  line: string;
  out: readonly string[];
  outAt: number;
  mark: string;
  h: (v: number) => number;
}> = ({ top, at, title, color, line, out, outAt, mark, h }) => (
  <>
    <Note at={at} x={X0} y={top}>
      <span style={{ display: "flex", gap: 16, alignItems: "baseline", whiteSpace: "nowrap" }}>
        <Title color={color}>{title}</Title>
        <Tag color={INK_SOFT}>run twice</Tag>
      </span>
    </Note>
    <Note at={at + 4} x={X0} y={top + h(44)}>
      <Code line={line} size={CODE} />
    </Note>
    <Console lines={out} x={OUT_X} top={top + h(30)} width={560} size={22} at={outAt - 4} marks={[{ line: 0, at: outAt + 4, color: mark }]} />
  </>
);

/**
 * Question 12. The definition, then three ways to write the same batch, each
 * run twice: a blind append leaves four rows for two events; the page's
 * keyed upsert leaves {1: 'new', 2: 'new'}; and a keyed write that adds
 * instead of setting doubles every total (40 and 25 become 80 and 50).
 */
export const IdemScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("idem").from;
  const qAt = n.word("idem", "Question twelve");
  const textAt = n.word("idem", "What makes a transform idempotent");
  const sameAt = n.word("idem-def", "the same state");
  const manyAt = n.word("idem-def", "however many times it runs");
  const safeAt = n.word("idem-def", "retries and backfills safe");
  const appendAt = n.word("idem-append", "Append a batch");
  const rerunAt = n.word("idem-append", "rerun it after a failure");
  const fourAt = n.word("idem-append", "four rows record two events");
  const keyAt = n.word("idem-upsert", "Write by key instead");
  const upsertAt = n.word("idem-upsert", "The page's upsert sets each ID's status");
  const nothingAt = n.word("idem-upsert", "the second run changes nothing");
  const enoughAt = n.word("idem-add", "Keyed isn't enough on its own");
  const addAt = n.word("idem-add", "Add each payment into its key");
  const doublesAt = n.word("idem-add", "every total doubles");
  const setAt = n.word("idem-add", "Set values");
  const end = n.beat("clean-in").to;

  const top = y(TOP);
  const A = IDEM.append.lines;
  const U = IDEM.upsert.lines;
  const D = IDEM.adds.lines;
  const rows = top + h(110);
  const addLine = D[lineOf(D, "totals[e[")].trim();

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sameAt + 2} level={-36} />
      <Sfx name="el-scratch" at={fourAt + 4} level={-33} />
      <Sfx name="el-pop" at={nothingAt + 4} level={-34} />
      <Sfx name="el-scratch" at={doublesAt + 4} level={-33} />
      <Sfx name="el-tap" at={setAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={60}>
          What makes a transform idempotent, and how do you write one in Python?
        </QuestionCard>

        <Note at={sameAt - 2} x={X0} y={top}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <Mark at={sameAt + 4}>the same final state</Mark>
            <FadeIn at={manyAt}>, however many times it runs</FadeIn>
          </span>
        </Note>
        <Note at={safeAt} x={X0} y={top + h(48)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>so a retry or a backfill is safe</span>
        </Note>

        <Way
          top={rows}
          at={appendAt}
          title="a blind append"
          color={ACCENT_INK}
          line={A[lineOf(A, "log.append")].trim()}
          out={IDEM.append.out}
          outAt={fourAt}
          mark={MARK_BAD}
          h={h}
        />
        <Note at={rerunAt} x={OUT_X} y={rows - h(4)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the same two events, sent twice</span>
        </Note>

        <Way
          top={rows + h(ROW)}
          at={keyAt}
          title="the page's keyed upsert"
          color={OK_INK}
          line={U[lineOf(U, 'state[e["id"]] =')].trim()}
          out={IDEM.upsert.out}
          outAt={nothingAt}
          mark={MARK_OK}
          h={h}
        />
        <Note at={upsertAt + 6} x={OUT_X} y={rows + h(ROW) - h(4)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>sets each ID&apos;s status</span>
        </Note>

        <Way
          top={rows + 2 * h(ROW)}
          at={enoughAt}
          title="keyed, but adding"
          color={ACCENT_INK}
          line={addLine}
          out={IDEM.adds.out}
          outAt={doublesAt}
          mark={MARK_BAD}
          h={h}
        />
        <Note at={addAt} x={OUT_X} y={rows + 2 * h(ROW) - h(4)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>payments of {IDEM.amounts.join(" and ")}</span>
        </Note>
        <Note at={setAt} x={X0} y={rows + 3 * h(ROW) - h(10)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={setAt + 6} color={MARK_OK}>set values</Mark>;{" "}
            <Strike at={setAt + 14}>add to them</Strike>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
