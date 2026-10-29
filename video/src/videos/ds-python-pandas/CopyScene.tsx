import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COPY } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK_INK,
  TableName,
  Tag,
  X0,
} from "./parts";

const TOP = 350;
const SIZE = 24;
const FRAME_Y = 530;
const SEL_X = 600;
const RIGHT_X = 1060;

/**
 * Question 8 on DA Part 2's frame, so the two series agree. The chained
 * assignment is one line in two steps, bracketed under the listing: select,
 * then set. The set lands on the selection (drawn as its own small frame,
 * dashed: a copy), never on df, which pandas 3 leaves as it was while it
 * warns ChainedAssignmentError. The fix writes through one .loc and both
 * North amounts turn to 0; a deliberate .copy() sits beside it.
 */
export const CopyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("copy").from;
  const qAt = n.word("copy", "Question");
  const textAt = n.word("copy", "What is the setting with copy warning");
  const asked = n.beat("copy").to;
  const chainAt = n.word("copy-chain", "It warns about chained assignment");
  const selectAt = n.word("copy-chain", "select the North rows");
  const setAt = n.word("copy-chain", "then set their amount");
  const secondAt = n.word("copy-chain", "The second step writes to the selection");
  const copyMayAt = n.word("copy-chain", "which may be a copy");
  const origAt = n.word("copy-chain", "the original may not change");
  const threeAt = n.word("copy-three", "In pandas three");
  const neverAt = n.word("copy-three", "it never changes");
  const nowAt = n.word("copy-error", "the warning is now called chained assignment error");
  const olderAt = n.word("copy-error", "Older versions said setting with copy");
  const fixAt = n.word("copy-fix", "Write in one step");
  const locAt = n.word("copy-fix", "with lock, the mask and the column");
  const zeroAt = n.word("copy-fix", "both North amounts become zero");
  const subsetAt = n.word("copy-fix", "When you want a separate subset");
  const purposeAt = n.word("copy-fix", "take a copy on purpose");
  const sideAt = n.word("reshape-in", "turning a frame on its side");
  const end = n.beat("reshape-in").to;
  const outChain = fixAt - 4;

  const F = COPY.frame;
  const g = geoOf(F, X0, y(FRAME_Y), h, { rowH: 52 });
  const amount = F.cols.indexOf("amount");
  const region = F.cols.indexOf("region");
  const north = F.rows.flatMap((r, i) => (r[region] === "North" ? [i] : []));
  const S = COPY.subset;
  // The selection before its set: the North rows as df holds them.
  const sel = { cols: F.cols, rows: north.map((i) => F.rows[i]) };
  const sg = geoOf(sel, SEL_X, y(FRAME_Y), h, { rowH: 52 });
  const L = COPY.loc;

  // The two steps of the chained line, bracketed by character.
  const line = COPY.chained.lines[0];
  const adv = SIZE * 0.6;
  const padX = Math.round(SIZE * 0.8);
  const split = line.indexOf('["amount"]');
  const eq = line.length;
  const bx = (c: number) => X0 + padX + c * adv;
  const brY = y(TOP) + listingHeight(1, SIZE) + h(10);
  const step1 = ease(frame, selectAt, 12);
  const step2 = ease(frame, setAt, 12);
  const brOut = 1 - ease(frame, outChain, 10);

  // The bridge's frame, turned on its side as it is named.
  const turn = ease(frame, sideAt, 22);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={selectAt + 4} level={-34} />
      <Sfx name="el-pencil" at={secondAt + 6} level={-34} />
      <Sfx name="el-scratch" at={nowAt + 4} level={-32} />
      <Sfx name="el-pencil" at={locAt + 6} level={-34} />
      <Sfx name="el-pop" at={zeroAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={sideAt + 4} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the SettingWithCopyWarning, and how do you avoid it?
        </QuestionCard>

        {/* ── The chained line, in two steps ── */}
        <Listing lines={COPY.chained.lines} x={X0} top={y(TOP)} width={760} size={SIZE} at={chainAt - 4} out={outChain} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: brOut }}>
          <path
            d={`M${bx(0) + 2},${brY} v10 H${bx(split) - 6} v-10`}
            fill="none"
            stroke={BAR}
            strokeWidth={2.4}
            pathLength={1}
            strokeDasharray={`${step1} 1`}
          />
          <path
            d={`M${bx(split) + 6},${brY} v10 H${bx(eq) - 2} v-10`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.4}
            pathLength={1}
            strokeDasharray={`${step2} 1`}
          />
        </svg>
        <Note at={selectAt + 4} x={bx(0)} y={brY + h(18)} out={outChain}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 650 }}>1 select</span>
        </Note>
        <Note at={setAt + 4} x={bx(split) + 8} y={brY + h(18)} out={outChain}>
          <span style={{ ...label(22, ACCENT), fontWeight: 650 }}>2 set</span>
        </Note>

        {/* ── df, and the selection the set lands on ── */}
        <TableName g={g} at={asked - 6}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(F, { amount: { ink: BLUE_INK } })}
          at={asked - 6}
          rows={F.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          bands={north.map((row) => ({ row, at: selectAt + 2, out: secondAt, color: MARK }))}
          marks={[
            ...north.map((row) => ({ row, col: amount, at: origAt + 4, out: fixAt, color: MARK_BAD })),
            ...north.map((row) => ({ row, col: amount, at: zeroAt + 6, color: MARK_OK })),
          ]}
          swaps={north.map((row, k) => ({ row, col: amount, at: zeroAt + k * 4, value: L.rows[row][amount], color: OK_INK }))}
        />
        <TableName g={sg} at={selectAt + 6} out={neverAt + 10}>
          the selection, <Mark at={copyMayAt}>a copy</Mark>
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(sel, { amount: { ink: BLUE_INK } })}
          at={selectAt + 6}
          out={neverAt + 10}
          rows={sel.rows.map((cells, i) => ({ cells, at: selectAt + 10 + i * 3, outline: { at: copyMayAt + 4 } }))}
          swaps={sel.rows.map((_, row) => ({ row, col: amount, at: secondAt + 8 + row * 4, value: S.rows[row][amount], color: INK }))}
        />

        {/* ── pandas 3 ── */}
        <Note at={threeAt} x={RIGHT_X} y={y(FRAME_Y) - h(4)} out={outChain}>
          <Tag size={22} mono>
            pandas {COPY.version}
          </Tag>
          <span style={{ ...note(24, INK_SOFT), marginLeft: 14, whiteSpace: "nowrap" }}>copy-on-write: every selection acts as a copy</span>
        </Note>
        <ErrorBox
          x={RIGHT_X}
          top={y(FRAME_Y) + h(56)}
          width={740}
          at={nowAt - 2}
          kind={COPY.chained.warning.kind}
          message={COPY.chained.warning.message}
          size={20}
          out={outChain}
        />
        <Note at={olderAt} x={RIGHT_X} y={y(FRAME_Y) + h(220)} out={outChain}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            older pandas: <Mono>SettingWithCopyWarning</Mono>
          </span>
        </Note>

        {/* ── The fix ── */}
        <Listing lines={L.lines} x={X0} top={y(TOP)} width={760} size={SIZE - 2} at={locAt - 4} marks={[{ line: 0, at: locAt + 6, color: MARK_OK }]} />
        <Listing lines={S.lines} x={RIGHT_X} top={y(FRAME_Y)} width={740} size={SIZE - 4} at={subsetAt} marks={[{ line: 0, at: purposeAt + 2, color: MARK_OK }]} />

        {/* ── Bridge: a frame turned on its side ── */}
        <div
          style={{
            position: "absolute",
            left: 1560,
            top: y(760),
            width: 150,
            height: 90,
            opacity: ease(frame, sideAt - 6, 10),
            transform: `rotate(${-90 * turn}deg)`,
            transformOrigin: "50% 50%",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            border: `2px solid ${INK}`,
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ border: `1px solid ${HAIRLINE}`, background: i < 3 ? `color-mix(in srgb, ${BAR} 18%, transparent)` : "transparent" }} />
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
