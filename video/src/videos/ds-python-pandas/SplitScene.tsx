import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SPLIT } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  KeyArrow,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_KEY,
  Mono,
  TableName,
  Tag,
  X0,
} from "./parts";

const TOP = 340;
const SPLIT_X = 560;
const APPLY_X = 900;
const COMBINE_X = 1300;
const HEAD_Y = 290;
const SIZE = 20;

/**
 * Question 2 on the page's six rows. First as three columns: split (one
 * small frame per region, the rows banded as they leave), apply (a sum beside
 * each), combine (the sums as one Series, East 50, North 240, South 150).
 * Then what groupby returns: on its own a DataFrameGroupBy that has computed
 * nothing, one column summed a Series, named aggregates a DataFrame, the
 * regions as the index of both.
 */
export const SplitScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("split").from;
  const qAt = n.word("split", "Question");
  const textAt = n.word("split", "What is split");
  const asked = n.beat("split").to;
  const splitAt = n.word("split-steps", "Split sorts the rows");
  const applyAt = n.word("split-steps", "Apply runs a function");
  const sumAt = n.word("split-steps", "here a sum");
  const combineAt = n.word("split-steps", "Combine puts the answers together");
  const namesAt = [
    n.word("split-steps", "East fifty"),
    n.word("split-steps", "North two forty"),
    n.word("split-steps", "South one fifty"),
  ];
  const aloneAt = n.word("split-returns", "On its own");
  const objAt = n.word("split-returns", "a data frame group by object");
  const nothingAt = n.word("split-returns", "nothing is computed yet");
  const oneAt = n.word("split-returns", "Sum one column");
  const seriesAt = n.word("split-returns", "a Series");
  const nameAt = n.word("split-returns", "Name several aggregates");
  const frameAt = n.word("split-returns", "you get a data frame");
  const indexAt = n.word("split-returns", "the regions are the index");
  const resetAt = n.word("split-returns", "until you reset it");
  const end = n.beat("split-returns").to;
  const out1 = aloneAt - 4;

  // ── The three columns ──
  const F = SPLIT.frame;
  const fg = geoOf(F, X0, y(TOP), h, { rowH: 50 });
  const region = F.cols.indexOf("region");
  const amount = F.cols.indexOf("amount");
  const keys = SPLIT.one.rows.map((r) => r[0]);
  const groups = keys.map((k) => F.rows.flatMap((r, i) => (r[region] === k ? [i] : [])));
  const pieceTops: number[] = [];
  let cursor = y(TOP) + h(28);
  for (const rows of groups) {
    pieceTops.push(cursor);
    cursor += h(36) + rows.length * h(44) + h(64);
  }
  const pieces = groups.map((rows, k) => {
    const t = { cols: ["", "amount"], rows: rows.map((i) => [F.rows[i][0], F.rows[i][amount]]) };
    return { t, g: geoOf(t, SPLIT_X, pieceTops[k], h, { headH: 36, rowH: 44, bodySize: 24, headSize: 20 }) };
  });
  const splitTimes = groups.map((_, k) => splitAt + 4 + k * 8);
  const S = SPLIT.one;
  const cg = geoOf(S, COMBINE_X, y(TOP) + h(28), h, { rowH: 54 });

  // ── What groupby returns ──
  const objTop = y(TOP);
  const oneX = 620;
  const oneTop = y(TOP);
  const og = geoOf(S, oneX, oneTop + listingHeight(1, SIZE) + h(54), h, { rowH: 52 });
  const N = SPLIT.named;
  const namedX = 1180;
  const ng = geoOf(N, namedX, y(TOP) + listingHeight(N.lines.length, SIZE) + h(54), h, { rowH: 52 });
  const header = (text: string, x: number, at: number) => (
    <Note at={at} x={x} y={y(HEAD_Y)} out={out1}>
      <span style={{ ...label(22, INK_SOFT), fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{text}</span>
    </Note>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={splitAt + 4} level={-34} />
      <Sfx name="el-tap" at={sumAt + 2} level={-32} />
      <Sfx name="el-pop" at={combineAt + 6} level={-32} />
      <Sfx name="el-pencil" at={oneAt + 4} level={-34} />
      <Sfx name="el-pencil" at={nameAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is split, apply, combine, and what does <QMono>groupby</QMono> return?
        </QuestionCard>

        {/* ── Split, apply, combine ── */}
        <DataTable
          g={fg}
          cols={colsOf(F, { amount: { ink: BLUE_INK } })}
          at={asked - 6}
          out={out1}
          rows={F.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          bands={groups.flatMap((rows, k) => rows.map((row) => ({ row, at: splitTimes[k], out: applyAt, color: MARK_KEY })))}
        />
        {header("split", SPLIT_X, splitAt)}
        {header("apply", APPLY_X, applyAt)}
        {header("combine", COMBINE_X, combineAt)}
        {pieces.map(({ t, g }, k) => (
          <React.Fragment key={keys[k]}>
            <TableName g={g} at={splitTimes[k]} out={out1}>
              {keys[k]}
            </TableName>
            <DataTable
              g={g}
              cols={colsOf(t, { amount: { ink: BLUE_INK } })}
              at={splitTimes[k]}
              out={out1}
              rows={t.rows.map((cells, i) => ({ cells, at: splitTimes[k] + 4 + i * 2 }))}
            />
            <KeyArrow
              from={[g.right + 12, g.rowMid(Math.floor((t.rows.length - 1) / 2))]}
              to={[APPLY_X - 10, g.rowMid(Math.floor((t.rows.length - 1) / 2))]}
              at={applyAt + 4 + k * 4}
              out={out1}
            />
            <Note at={sumAt + k * 5} x={APPLY_X} y={g.rowMid(Math.floor((t.rows.length - 1) / 2)) - h(18)} out={out1}>
              <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
                sum = <span style={{ color: BLUE_INK, fontWeight: 650 }}>{S.rows[k][1]}</span>
              </span>
            </Note>
            <KeyArrow
              from={[APPLY_X + 190, g.rowMid(Math.floor((t.rows.length - 1) / 2))]}
              to={[COMBINE_X - 14, cg.rowMid(k)]}
              at={combineAt + 4 + k * 4}
              out={out1}
            />
          </React.Fragment>
        ))}
        <DataTable
          g={cg}
          cols={colsOf(S, { amount: { ink: BLUE_INK } })}
          at={combineAt + 2}
          out={out1}
          rows={S.rows.map((cells, i) => ({ cells, at: combineAt + 10 + i * 4 }))}
          bands={S.rows.map((_, row) => ({ row, at: namesAt[row], color: MARK }))}
        />

        {/* ── What groupby returns ── */}
        <Listing lines={['df.groupby("region")']} x={X0} top={objTop} width={420} size={SIZE} at={aloneAt} />
        <Note at={objAt} x={X0} y={objTop + listingHeight(1, SIZE) + h(30)}>
          <Tag size={24} mono>
            {SPLIT.grouped}
          </Tag>
        </Note>
        <Note at={nothingAt} x={X0} y={objTop + listingHeight(1, SIZE) + h(96)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mark at={nothingAt + 6}>nothing computed yet</Mark>
          </span>
        </Note>

        <Listing lines={S.lines} x={oneX} top={oneTop} width={500} size={SIZE} at={oneAt - 4} />
        <DataTable
          g={og}
          cols={colsOf(S, { amount: { ink: BLUE_INK } })}
          at={seriesAt - 4}
          rows={S.rows.map((cells, i) => ({ cells, at: seriesAt + i * 2 }))}
          marks={S.rows.map((_, row) => ({ row, col: 0, at: indexAt + row * 3 }))}
        />
        <Note at={seriesAt + 4} x={oneX} y={og.rowTop(S.rows.length) + h(22)}>
          <Tag size={22}>Series</Tag>
        </Note>

        <Listing lines={N.lines} x={namedX} top={y(TOP)} width={520} size={SIZE} at={nameAt - 4} />
        <DataTable
          g={ng}
          cols={colsOf(N)}
          at={frameAt - 4}
          rows={N.rows.map((cells, i) => ({ cells, at: frameAt + i * 2 }))}
          marks={N.rows.map((_, row) => ({ row, col: 0, at: indexAt + 4 + row * 3 }))}
        />
        <Note at={frameAt + 4} x={namedX} y={ng.rowTop(N.rows.length) + h(22)}>
          <Tag size={22}>DataFrame</Tag>
        </Note>
        <Note at={resetAt} x={oneX} y={y(744)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            the regions are the index, until <Mono color={BLUE_INK}>.reset_index()</Mono>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
