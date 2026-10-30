import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { BATCH } from "./data";
import { Bars, Console, Drift, lineOf, Listing, listingHeight, MARK, MARK_OK, OK, OK_INK, Title, X0 } from "./parts";

const TOP = 330;
const SIZE = 21;
const RIGHT_X = 1000;
const BLOCK = 54;
const PITCH = 66;
const GROUP_GAP = 40;

/**
 * Question 10. Why batch: a million single-row inserts are a million round
 * trips, a million rows in batches of 1,000 are 1,000 calls (counted by the
 * page's generator). Then the page's batched(): islice pulls three at a time
 * from one iterator, and seven items split into three, three and one, until
 * a pull comes back empty; itertools.batched does the same since 3.12.
 */
export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("batch").from;
  const qAt = n.word("batch", "Question ten");
  const textAt = n.word("batch", "How do you split");
  const perRowAt = n.word("batch-why", "An insert per row");
  const tripAt = n.word("batch-why", "a round trip per row");
  const callsAt = n.word("batch-why", "is a thousand calls");
  const pullAt = n.word("batch-slice", "Pull n items at a time");
  const sliceAt = n.word("batch-slice", "with i-slice");
  const emptyAt = n.word("batch-slice", "until a pull comes back empty");
  const sevenAt = n.word("batch-slice", "Seven items in threes");
  const groupAt = [
    n.word("batch-slice", "three, three", { nth: 1 }),
    n.word("batch-slice", "three, and a last"),
    n.word("batch-slice", "a last batch of one"),
  ];
  const sinceAt = n.word("batch-builtin", "Since Python three twelve");
  const exactlyAt = n.word("batch-builtin", "does exactly this");
  const end = n.beat("retry-in").to;

  const F = BATCH.fn;
  const fH = listingHeight(F.length, SIZE);
  const blocksTop = y(TOP) + h(176);
  const outTop = blocksTop + h(BLOCK) + h(56);
  const builtinTop = y(TOP) + fH + h(60);
  // The blocks open into their batches as each is named.
  const gap = (g: number) => (g === 0 ? 0 : GROUP_GAP * ease(frame, groupAt[g], 12));
  const blockX = (i: number) => {
    const g = Math.floor(i / 3);
    let x = RIGHT_X + i * PITCH;
    for (let k = 1; k <= g; k++) x += gap(k);
    return x;
  };
  const emptyX = blockX(6) + PITCH + GROUP_GAP;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={tripAt} level={-36} />
      <Sfx name="el-pop" at={callsAt} level={-34} />
      <Sfx name="el-sprinkle" at={sevenAt} level={-38} />
      {groupAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-35} />
      ))}
      <Sfx name="el-pencil" at={sinceAt + 4} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you split a large stream into fixed-size batches?
        </QuestionCard>

        {/* ── Why: calls per million rows ── */}
        <Note at={perRowAt} x={X0} y={y(TOP) - h(6)} out={pullAt - 4}>
          <Title>calls to write 1,000,000 rows</Title>
        </Note>
        <Bars
          x={X0}
          top={y(TOP) + h(40)}
          width={760}
          rowH={h(64)}
          nameW={340}
          out={pullAt - 4}
          bars={[
            { name: "an insert per row", value: 1_000_000, num: "1,000,000", color: ACCENT, ink: ACCENT_INK, at: tripAt },
            {
              name: "batches of 1,000",
              value: BATCH.calls,
              num: BATCH.calls.toLocaleString("en-US"),
              color: OK,
              ink: OK_INK,
              at: callsAt - 4,
            },
          ]}
        />

        {/* ── The page's batched() ── */}
        <Listing
          lines={F}
          x={X0}
          top={y(TOP)}
          width={760}
          size={SIZE}
          at={pullAt - 2}
          marks={[
            { line: lineOf(F, "it = iter(iterable)"), at: pullAt + 4, out: sliceAt },
            { line: lineOf(F, "islice(it, n)"), at: sliceAt, out: emptyAt },
            { line: lineOf(F, "if not chunk"), at: emptyAt, color: MARK_OK },
          ]}
        />

        {/* The stream, opening into batches of three. */}
        <Note at={sevenAt - 4} x={RIGHT_X} y={blocksTop - h(46)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontWeight: 600 }}>range(7)</span>, in threes
          </span>
        </Note>
        {Array.from({ length: 7 }, (_, i) => {
          const p = ease(frame, sevenAt + i * 2, 10);
          if (p <= 0) return null;
          const g = Math.floor(i / 3);
          const named = ease(frame, groupAt[g], 10);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: blockX(i),
                top: blocksTop,
                width: BLOCK,
                height: h(BLOCK),
                borderRadius: 5,
                boxSizing: "border-box",
                border: `2px solid ${BAR}`,
                background: `color-mix(in srgb, ${named > 0 ? OK : BAR} ${Math.round(18 + named * 30)}%, ${PAPER})`,
                opacity: p,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 600,
                color: BLUE_INK,
              }}
            >
              {i}
            </div>
          );
        })}
        {/* A bracket under each batch as it is named. */}
        {[0, 1, 2].map((g) => {
          const p = ease(frame, groupAt[g] + 2, 10);
          if (p <= 0) return null;
          const first = g * 3;
          const last = Math.min(6, first + 2);
          const x0 = blockX(first);
          const x1 = blockX(last) + BLOCK;
          return (
            <div
              key={g}
              style={{
                position: "absolute",
                left: x0,
                top: blocksTop + h(BLOCK) + h(8),
                width: (x1 - x0) * p,
                height: 10,
                borderLeft: `2px solid ${OK}`,
                borderRight: p > 0.95 ? `2px solid ${OK}` : undefined,
                borderBottom: `2px solid ${OK}`,
                boxSizing: "border-box",
              }}
            />
          );
        })}
        {/* The pull that comes back empty. */}
        <Note at={groupAt[2] + 12} x={emptyX} y={blocksTop}>
          <div
            style={{
              width: BLOCK + 20,
              height: h(BLOCK),
              border: `2px dashed ${HAIRLINE}`,
              borderRadius: 5,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 24,
              color: INK_SOFT,
            }}
          >
            []
          </div>
        </Note>
        <Console
          lines={BATCH.page.out}
          x={RIGHT_X}
          top={outTop}
          width={300}
          at={groupAt[0] - 4}
          lineAt={groupAt.map((at) => at + 2)}
        />

        {/* ── itertools.batched, since 3.12 ── */}
        <Listing lines={BATCH.builtin.lines} x={X0} top={builtinTop} width={760} size={SIZE} at={sinceAt} marks={[{ line: lineOf(BATCH.builtin.lines, "itertools.batched"), at: exactlyAt, color: MARK }]} />
        <Console lines={BATCH.builtin.out} x={RIGHT_X + 340} top={outTop} width={300} at={exactlyAt - 2} />
        <Note at={exactlyAt + 4} x={RIGHT_X + 340} y={outTop - h(40)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>batched gives tuples</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
